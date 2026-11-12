"""Tests for merged appointment schedules, slot availability, booking, and FastAPI routes."""

from __future__ import annotations

import sqlite3
from datetime import date, datetime, timedelta

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from backend import appointment_routes, healthcare_routes
from backend.main import app
from src.database.appointment_seed import seed_appointment_data
from src.database.models import create_tables
from src.services.appointment_service import (
    AppointmentConflictError,
    AppointmentNotFoundError,
    book_appointment,
    cancel_appointment,
    get_appointment_stats,
    get_available_slots,
    get_doctor_availability,
    get_doctor_schedule,
    list_appointments,
    reschedule_appointment,
)


def _next_weekday(target_dow: int = 0) -> date:
    """Return a future date matching target_dow (0=Monday .. 6=Sunday)."""
    d = date.today() + timedelta(days=1)
    while d.weekday() != target_dow:
        d += timedelta(days=1)
    return d


@pytest.fixture
def appt_conn():
    conn = sqlite3.connect(":memory:")
    conn.execute("PRAGMA foreign_keys = ON;")
    create_tables(conn)

    hosp_cur = conn.execute(
        "INSERT INTO hospitals (hospital_name, city) VALUES (?, ?)",
        ("apollo hospitals", "delhi"),
    )
    hospital_id = hosp_cur.lastrowid

    doc_cur = conn.execute(
        """
        INSERT INTO doctors (
            composite_doctor_id, doctor_name, doctor_type,
            experience_years, location, fees, city, hospital_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "DOC_TEST_1",
            "dr. ananya rao",
            "cardiologist",
            14,
            "sarita vihar, delhi",
            1000.0,
            "delhi",
            hospital_id,
        ),
    )
    doctor_id = doc_cur.lastrowid

    # Schedule: Mondays & Wednesdays 09:00-11:00, 30-min slots (09:00, 09:30, 10:00, 10:30)
    conn.executemany(
        """
        INSERT INTO doctor_schedules (
            doctor_id, day_of_week, day_name, start_time, end_time,
            slot_duration_minutes, avg_waiting_minutes, source_dataset
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            (doctor_id, 0, "Monday", "09:00", "11:00", 30, 12.5, "medscheduler_2024"),
            (doctor_id, 2, "Wednesday", "09:00", "11:00", 30, 12.5, "medscheduler_2024"),
        ],
    )

    # Mark Monday 09:30 as a baseline reserved clinic slot from slots.csv
    conn.execute(
        """
        INSERT INTO doctor_slot_baselines (doctor_id, day_of_week, slot_time, source_slot_id)
        VALUES (?, ?, ?, ?)
        """,
        (doctor_id, 0, "09:30", "0000010"),
    )
    conn.commit()

    try:
        yield conn, doctor_id
    finally:
        conn.close()


def test_get_doctor_schedule_returns_weekly_opd(appt_conn):
    conn, doctor_id = appt_conn
    res = get_doctor_schedule(conn, doctor_id)

    assert res["doctor"]["doctor_name"] == "dr. ananya rao"
    assert len(res["schedules"]) == 2
    assert [s["day_name"] for s in res["schedules"]] == ["Monday", "Wednesday"]


def test_get_available_slots_marks_reserved_and_closed_days(appt_conn):
    conn, doctor_id = appt_conn
    monday = _next_weekday(0).isoformat()
    sunday = _next_weekday(6).isoformat()

    mon_slots = get_available_slots(conn, doctor_id, monday)
    assert mon_slots["opd_open"] is True
    assert mon_slots["total_count"] == 4
    assert mon_slots["available_count"] == 3
    by_time = {s["time"]: s for s in mon_slots["slots"]}
    assert by_time["09:30"]["status"] == "reserved"
    assert by_time["09:30"]["available"] is False
    assert by_time["09:00"]["available"] is True

    sun_slots = get_available_slots(conn, doctor_id, sunday)
    assert sun_slots["opd_open"] is False
    assert sun_slots["slots"] == []


def test_book_prevent_double_booking_and_cancel_releases_slot(appt_conn):
    conn, doctor_id = appt_conn
    monday = _next_weekday(0).isoformat()

    booked = book_appointment(
        conn,
        doctor_id=doctor_id,
        appointment_date=monday,
        appointment_time="09:00",
        patient_name="Riya Sharma",
        patient_age=29,
        patient_sex="Female",
        reason="Chest checkup",
    )
    assert booked["booking_reference"].startswith("APT-")
    assert booked["status"] == "scheduled"
    assert booked["hospital_name"] == "apollo hospitals"

    # Double booking same slot must fail
    with pytest.raises(AppointmentConflictError):
        book_appointment(
            conn,
            doctor_id=doctor_id,
            appointment_date=monday,
            appointment_time="09:00",
            patient_name="Another Patient",
        )

    # Booking baseline reserved slot must fail
    with pytest.raises(AppointmentConflictError):
        book_appointment(
            conn,
            doctor_id=doctor_id,
            appointment_date=monday,
            appointment_time="09:30",
            patient_name="Another Patient",
        )

    # Cancel frees the slot
    cancelled = cancel_appointment(conn, booked["appointment_id"])
    assert cancelled["status"] == "cancelled"

    rebooked = book_appointment(
        conn,
        doctor_id=doctor_id,
        appointment_date=monday,
        appointment_time="09:00",
        patient_name="Aman Verma",
    )
    assert rebooked["status"] == "scheduled"
    assert rebooked["patient_name"] == "Aman Verma"


def test_reschedule_appointment_moves_slot(appt_conn):
    conn, doctor_id = appt_conn
    monday = _next_weekday(0).isoformat()
    wednesday = _next_weekday(2).isoformat()

    booked = book_appointment(
        conn,
        doctor_id=doctor_id,
        appointment_date=monday,
        appointment_time="10:00",
        patient_name="Karan Mehta",
    )

    moved = reschedule_appointment(
        conn,
        appointment_id=booked["appointment_id"],
        new_date=wednesday,
        new_time="10:30",
    )
    assert moved["appointment_date"] == wednesday
    assert moved["appointment_time"] == "10:30"

    # Old slot on Monday 10:00 is available again
    mon_slots = get_available_slots(conn, doctor_id, monday)
    assert any(s["time"] == "10:00" and s["available"] for s in mon_slots["slots"])


def test_book_rejects_past_date_and_unknown_doctor(appt_conn):
    conn, doctor_id = appt_conn
    yesterday = (date.today() - timedelta(days=1)).isoformat()

    with pytest.raises(ValueError, match="past"):
        book_appointment(conn, doctor_id, yesterday, "09:00", "Test User")

    with pytest.raises(AppointmentNotFoundError):
        book_appointment(conn, 99999, _next_weekday(0).isoformat(), "09:00", "Test User")


def test_seed_appointment_data_imports_csvs(tmp_path, appt_conn):
    conn, _ = appt_conn

    sched_csv = tmp_path / "schedules.csv"
    pd.DataFrame([
        {
            "composite_doctor_id": "DOC_TEST_1",
            "day_of_week": 4,
            "day_name": "Friday",
            "start_time": "14:00",
            "end_time": "16:00",
            "slot_duration_minutes": 30,
            "avg_waiting_minutes": 15.0,
            "source_clinic_date": "2024-12-20",
            "source_dataset": "medscheduler_2024",
        }
    ]).to_csv(sched_csv, index=False)

    base_csv = tmp_path / "baselines.csv"
    pd.DataFrame([
        {
            "composite_doctor_id": "DOC_TEST_1",
            "day_of_week": 4,
            "slot_time": "14:30",
            "source_slot_id": "0000123",
        }
    ]).to_csv(base_csv, index=False)

    appts_csv = tmp_path / "appointments.csv"
    pd.DataFrame([
        {
            "booking_reference": "MS-0001-TEST",
            "external_appointment_id": "0001",
            "external_slot_id": "0000123",
            "composite_doctor_id": "DOC_TEST_1",
            "hospital": "apollo hospitals",
            "city": "delhi",
            "patient_name": "Sample Patient",
            "patient_age": 42,
            "patient_sex": "Female",
            "patient_insurance": "Care Plus",
            "appointment_date": "2024-12-20",
            "appointment_time": "14:00",
            "scheduling_date": "2024-12-15",
            "status": "attended",
            "waiting_time": 11.2,
            "appointment_duration": 18.0,
            "source": "medscheduler_merged",
        }
    ]).to_csv(appts_csv, index=False)

    counts = seed_appointment_data(conn, sched_csv, base_csv, appts_csv)
    assert counts["schedules"] == 3
    assert counts["baselines"] == 2
    assert counts["appointments"] == 1

    stats = get_appointment_stats(conn)
    assert stats["merged_historical_records"] == 1
    listed = list_appointments(conn, source="medscheduler_merged")
    assert listed["total"] == 1
    assert listed["appointments"][0]["patient_name"] == "Sample Patient"


def test_fastapi_appointment_endpoints_end_to_end(tmp_path, monkeypatch):
    db_file = tmp_path / "test_api.db"
    conn = sqlite3.connect(db_file)
    conn.execute("PRAGMA foreign_keys = ON;")
    create_tables(conn)
    h_id = conn.execute(
        "INSERT INTO hospitals (hospital_name, city) VALUES (?, ?)",
        ("city care", "bangalore"),
    ).lastrowid
    d_id = conn.execute(
        """
        INSERT INTO doctors (
            composite_doctor_id, doctor_name, doctor_type,
            experience_years, location, fees, city, hospital_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        ("DOC_API_1", "dr. rao", "general physician", 12, "indiranagar", 700, "bangalore", h_id),
    ).lastrowid
    conn.execute(
        """
        INSERT INTO doctor_schedules (
            doctor_id, day_of_week, day_name, start_time, end_time,
            slot_duration_minutes, avg_waiting_minutes, source_dataset
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (d_id, 1, "Tuesday", "09:00", "11:00", 30, 10.0, "medscheduler_2024"),
    )
    conn.commit()
    conn.close()

    def _test_conn():
        c = sqlite3.connect(db_file)
        c.row_factory = sqlite3.Row
        c.execute("PRAGMA foreign_keys = ON;")
        return c

    monkeypatch.setattr(appointment_routes, "get_db_connection", _test_conn)
    monkeypatch.setattr(healthcare_routes, "get_db_connection", _test_conn)

    tuesday = _next_weekday(1).isoformat()

    with TestClient(app) as client:
        docs_res = client.get("/api/doctors")
        assert docs_res.status_code == 200
        assert docs_res.json()["total"] == 1

        avail_res = client.get(f"/api/doctors/{d_id}/availability?days=7")
        assert avail_res.status_code == 200
        assert len(avail_res.json()["days"]) == 7

        slots_res = client.get(f"/api/doctors/{d_id}/slots?date={tuesday}")
        assert slots_res.status_code == 200
        assert slots_res.json()["available_count"] == 4

        create_res = client.post(
            "/api/appointments",
            json={
                "doctor_id": d_id,
                "appointment_date": tuesday,
                "appointment_time": "09:30",
                "patient_name": "Neha Singh",
                "patient_age": 31,
                "patient_sex": "Female",
                "reason": "Annual checkup",
            },
        )
        assert create_res.status_code == 201
        appt_id = create_res.json()["appointment"]["appointment_id"]

        # Duplicate booking returns 409 Conflict
        dup_res = client.post(
            "/api/appointments",
            json={
                "doctor_id": d_id,
                "appointment_date": tuesday,
                "appointment_time": "09:30",
                "patient_name": "Other User",
            },
        )
        assert dup_res.status_code == 409

        # Reschedule to 10:00
        resched_res = client.patch(
            f"/api/appointments/{appt_id}/reschedule",
            json={"appointment_date": tuesday, "appointment_time": "10:00"},
        )
        assert resched_res.status_code == 200
        assert resched_res.json()["appointment"]["appointment_time"] == "10:00"

        # Cancel appointment
        cancel_res = client.patch(f"/api/appointments/{appt_id}/cancel")
        assert cancel_res.status_code == 200
        assert cancel_res.json()["appointment"]["status"] == "cancelled"

        # Stats endpoint works
        stats_res = client.get("/api/appointments/stats")
        assert stats_res.status_code == 200
        assert stats_res.json()["doctors"] == 1
