"""Seed merged Medscheduler schedules, slot baselines, and historical appointments."""

from __future__ import annotations

import sqlite3
from pathlib import Path

import pandas as pd


def _clean(value):
    return None if pd.isna(value) else value


def _get_doctor_lookup(conn: sqlite3.Connection) -> dict[str, tuple[int, int | None]]:
    rows = conn.execute(
        "SELECT composite_doctor_id, doctor_id, hospital_id FROM doctors"
    ).fetchall()
    return {
        comp_id: (doctor_id, hospital_id)
        for comp_id, doctor_id, hospital_id in rows
    }


def seed_doctor_schedules(
    conn: sqlite3.Connection,
    schedules_csv: str | Path,
) -> int:
    """Import merged weekly OPD schedules for doctors."""
    csv_path = Path(schedules_csv)
    if not csv_path.is_file():
        raise FileNotFoundError(f"Schedules CSV not found: {csv_path}")

    df = pd.read_csv(csv_path)
    doctor_map = _get_doctor_lookup(conn)

    rows = []
    for _, row in df.iterrows():
        match = doctor_map.get(str(row["composite_doctor_id"]))
        if match is None:
            continue
        doctor_id, _ = match
        rows.append((
            doctor_id,
            int(row["day_of_week"]),
            str(row["day_name"]),
            str(row["start_time"]),
            str(row["end_time"]),
            int(row["slot_duration_minutes"]),
            _clean(row.get("avg_waiting_minutes")),
            _clean(row.get("source_clinic_date")),
            str(row.get("source_dataset") or "medscheduler_2024"),
        ))

    conn.executemany(
        """
        INSERT OR IGNORE INTO doctor_schedules (
            doctor_id,
            day_of_week,
            day_name,
            start_time,
            end_time,
            slot_duration_minutes,
            avg_waiting_minutes,
            source_clinic_date,
            source_dataset
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        rows,
    )
    return conn.execute("SELECT COUNT(*) FROM doctor_schedules").fetchone()[0]


def seed_slot_baselines(
    conn: sqlite3.Connection,
    baselines_csv: str | Path,
) -> int:
    """Import baseline occupied slots derived from Medscheduler slots.csv."""
    csv_path = Path(baselines_csv)
    if not csv_path.is_file():
        raise FileNotFoundError(f"Slot baselines CSV not found: {csv_path}")

    df = pd.read_csv(csv_path, dtype={"source_slot_id": str})
    doctor_map = _get_doctor_lookup(conn)

    rows = []
    for _, row in df.iterrows():
        match = doctor_map.get(str(row["composite_doctor_id"]))
        if match is None:
            continue
        doctor_id, _ = match
        rows.append((
            doctor_id,
            int(row["day_of_week"]),
            str(row["slot_time"]),
            _clean(row.get("source_slot_id")),
        ))

    conn.executemany(
        """
        INSERT OR IGNORE INTO doctor_slot_baselines (
            doctor_id,
            day_of_week,
            slot_time,
            source_slot_id
        )
        VALUES (?, ?, ?, ?)
        """,
        rows,
    )
    return conn.execute("SELECT COUNT(*) FROM doctor_slot_baselines").fetchone()[0]


def seed_merged_appointments(
    conn: sqlite3.Connection,
    appointments_csv: str | Path,
) -> int:
    """Import merged historical appointments linked to doctors and hospitals."""
    csv_path = Path(appointments_csv)
    if not csv_path.is_file():
        raise FileNotFoundError(f"Merged appointments CSV not found: {csv_path}")

    df = pd.read_csv(
        csv_path,
        dtype={"external_appointment_id": str, "external_slot_id": str},
    )
    doctor_map = _get_doctor_lookup(conn)

    rows = []
    for _, row in df.iterrows():
        match = doctor_map.get(str(row["composite_doctor_id"]))
        if match is None:
            continue
        doctor_id, hospital_id = match
        rows.append((
            str(row["booking_reference"]),
            _clean(row.get("external_appointment_id")),
            _clean(row.get("external_slot_id")),
            doctor_id,
            hospital_id,
            str(row["patient_name"]),
            None,
            int(row["patient_age"]) if pd.notna(row.get("patient_age")) else None,
            _clean(row.get("patient_sex")),
            _clean(row.get("patient_insurance")),
            str(row["appointment_date"]),
            str(row["appointment_time"]),
            str(row["scheduling_date"]),
            str(row["status"]),
            "Merged outpatient visit record",
            float(row["waiting_time"]) if pd.notna(row.get("waiting_time")) else None,
            float(row["appointment_duration"]) if pd.notna(row.get("appointment_duration")) else None,
            str(row.get("source") or "medscheduler_merged"),
        ))

    conn.executemany(
        """
        INSERT OR IGNORE INTO appointments (
            booking_reference,
            external_appointment_id,
            external_slot_id,
            doctor_id,
            hospital_id,
            patient_name,
            patient_phone,
            patient_age,
            patient_sex,
            patient_insurance,
            appointment_date,
            appointment_time,
            scheduling_date,
            status,
            reason,
            waiting_time,
            appointment_duration,
            source
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        rows,
    )
    return conn.execute("SELECT COUNT(*) FROM appointments").fetchone()[0]


def seed_appointment_data(
    conn: sqlite3.Connection,
    schedules_csv: str | Path,
    baselines_csv: str | Path,
    appointments_csv: str | Path,
) -> dict[str, int]:
    """Seed schedules, slot baselines, and merged appointments in one transaction."""
    with conn:
        schedules_count = seed_doctor_schedules(conn, schedules_csv)
        baselines_count = seed_slot_baselines(conn, baselines_csv)
        appointments_count = seed_merged_appointments(conn, appointments_csv)

    return {
        "schedules": schedules_count,
        "baselines": baselines_count,
        "appointments": appointments_count,
    }
