"""Appointment scheduling, slot availability, and booking service."""

from __future__ import annotations

import sqlite3
import uuid
from datetime import date, datetime, timedelta


class AppointmentNotFoundError(LookupError):
    """Raised when a doctor or appointment record does not exist."""


class AppointmentConflictError(ValueError):
    """Raised when a requested slot is already booked or reserved."""


def _validate_positive_int(value: int, field_name: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        raise ValueError(f"{field_name} must be a positive integer.")
    return value


def _parse_date(date_str: str, field_name: str = "date") -> date:
    if not isinstance(date_str, str) or not date_str.strip():
        raise ValueError(f"{field_name} must be a non-empty YYYY-MM-DD string.")
    try:
        return datetime.strptime(date_str.strip(), "%Y-%m-%d").date()
    except ValueError as exc:
        raise ValueError(f"{field_name} must be in YYYY-MM-DD format.") from exc


def normalize_time_str(time_str: str) -> str:
    """Normalize 'HH:MM', 'HH:MM:SS', or '09:30 AM' to 24-hour 'HH:MM'."""
    if not isinstance(time_str, str) or not time_str.strip():
        raise ValueError("appointment_time must be a non-empty string.")
    cleaned = time_str.strip().upper()
    for fmt in ("%H:%M", "%H:%M:%S", "%I:%M %p", "%I:%M%p"):
        try:
            return datetime.strptime(cleaned, fmt).strftime("%H:%M")
        except ValueError:
            continue
    raise ValueError("appointment_time must be in HH:MM or HH:MM AM/PM format.")


def format_display_time(hhmm: str) -> str:
    """Format 'HH:MM' as '09:30 AM' for user-facing display."""
    return datetime.strptime(hhmm, "%H:%M").strftime("%I:%M %p")


def _generate_slot_times(start_hhmm: str, end_hhmm: str, step_minutes: int) -> list[str]:
    sh, sm = map(int, start_hhmm.split(":"))
    eh, em = map(int, end_hhmm.split(":"))
    cur = sh * 60 + sm
    end = eh * 60 + em
    slots: list[str] = []
    while cur < end:
        slots.append(f"{cur // 60:02d}:{cur % 60:02d}")
        cur += step_minutes
    return slots


def _get_doctor_row(conn: sqlite3.Connection, doctor_id: int) -> dict:
    _validate_positive_int(doctor_id, "doctor_id")
    cursor = conn.execute(
        """
        SELECT
            d.doctor_id,
            d.composite_doctor_id,
            d.doctor_name,
            d.doctor_type,
            d.experience_years,
            d.location,
            d.fees,
            d.city,
            d.hospital_id,
            h.hospital_name
        FROM doctors d
        LEFT JOIN hospitals h ON d.hospital_id = h.hospital_id
        WHERE d.doctor_id = ?
        """,
        (doctor_id,),
    )
    row = cursor.fetchone()
    if row is None:
        raise AppointmentNotFoundError(f"Doctor with ID {doctor_id} not found.")
    cols = [c[0] for c in cursor.description]
    return dict(zip(cols, row))


def get_doctor_schedule(conn: sqlite3.Connection, doctor_id: int) -> dict:
    """Return a doctor's details and weekly OPD schedule."""
    doctor = _get_doctor_row(conn, doctor_id)
    cursor = conn.execute(
        """
        SELECT
            schedule_id,
            day_of_week,
            day_name,
            start_time,
            end_time,
            slot_duration_minutes,
            avg_waiting_minutes,
            source_clinic_date,
            source_dataset
        FROM doctor_schedules
        WHERE doctor_id = ?
        ORDER BY day_of_week ASC, start_time ASC
        """,
        (doctor_id,),
    )
    cols = [c[0] for c in cursor.description]
    schedules = [dict(zip(cols, r)) for r in cursor.fetchall()]

    return {
        "doctor": doctor,
        "schedules": schedules,
    }


def _get_slots_for_date_internal(
    conn: sqlite3.Connection,
    doctor_id: int,
    target_date: date,
    now_dt: datetime | None = None,
) -> dict:
    dow = target_date.weekday()
    date_iso = target_date.isoformat()

    sched_cursor = conn.execute(
        """
        SELECT
            day_of_week,
            day_name,
            start_time,
            end_time,
            slot_duration_minutes,
            avg_waiting_minutes,
            source_dataset
        FROM doctor_schedules
        WHERE doctor_id = ? AND day_of_week = ?
        ORDER BY start_time ASC
        """,
        (doctor_id, dow),
    )
    sched_rows = sched_cursor.fetchall()

    if not sched_rows:
        return {
            "doctor_id": doctor_id,
            "date": date_iso,
            "day_of_week": dow,
            "day_name": target_date.strftime("%A"),
            "opd_open": False,
            "start_time": None,
            "end_time": None,
            "slot_duration_minutes": None,
            "avg_waiting_minutes": None,
            "available_count": 0,
            "total_count": 0,
            "slots": [],
        }

    # Combine all OPD sessions on this weekday (typically one session per day)
    all_times: list[str] = []
    seen_times: set[str] = set()
    for _, _, start_t, end_t, duration, _, _ in sched_rows:
        for t in _generate_slot_times(start_t, end_t, int(duration)):
            if t not in seen_times:
                seen_times.add(t)
                all_times.append(t)
    all_times.sort()

    baseline_busy = {
        row[0]
        for row in conn.execute(
            """
            SELECT slot_time
            FROM doctor_slot_baselines
            WHERE doctor_id = ? AND day_of_week = ?
            """,
            (doctor_id, dow),
        ).fetchall()
    }

    booked_times = {
        row[0]
        for row in conn.execute(
            """
            SELECT appointment_time
            FROM appointments
            WHERE doctor_id = ?
              AND appointment_date = ?
              AND status = 'scheduled'
            """,
            (doctor_id, date_iso),
        ).fetchall()
    }

    now_dt = now_dt or datetime.now()
    today_date = now_dt.date()
    current_hhmm = now_dt.strftime("%H:%M")

    slots = []
    available_count = 0

    for t in all_times:
        if target_date < today_date or (target_date == today_date and t <= current_hhmm):
            status = "past"
            is_available = False
        elif t in booked_times:
            status = "booked"
            is_available = False
        elif t in baseline_busy:
            status = "reserved"
            is_available = False
        else:
            status = "available"
            is_available = True
            available_count += 1

        slots.append({
            "time": t,
            "display_time": format_display_time(t),
            "status": status,
            "available": is_available,
        })

    first_row = sched_rows[0]
    return {
        "doctor_id": doctor_id,
        "date": date_iso,
        "day_of_week": dow,
        "day_name": first_row[1],
        "opd_open": True,
        "start_time": first_row[2],
        "end_time": sched_rows[-1][3],
        "slot_duration_minutes": int(first_row[4]),
        "avg_waiting_minutes": first_row[5],
        "available_count": available_count,
        "total_count": len(slots),
        "slots": slots,
    }


def get_available_slots(
    conn: sqlite3.Connection,
    doctor_id: int,
    appointment_date: str,
    now_dt: datetime | None = None,
) -> dict:
    """Return slot-by-slot availability for a doctor on a given YYYY-MM-DD date."""
    _get_doctor_row(conn, doctor_id)
    target_date = _parse_date(appointment_date, "appointment_date")
    return _get_slots_for_date_internal(conn, doctor_id, target_date, now_dt=now_dt)


def get_doctor_availability(
    conn: sqlite3.Connection,
    doctor_id: int,
    start_date: str | None = None,
    days: int = 7,
    now_dt: datetime | None = None,
) -> dict:
    """Return a multi-day availability summary for a doctor."""
    doctor = _get_doctor_row(conn, doctor_id)
    if isinstance(days, bool) or not isinstance(days, int) or not (1 <= days <= 30):
        raise ValueError("days must be an integer between 1 and 30.")

    now_dt = now_dt or datetime.now()
    base_date = _parse_date(start_date, "start_date") if start_date else now_dt.date()

    day_summaries = []
    for offset in range(days):
        cur_date = base_date + timedelta(days=offset)
        day_info = _get_slots_for_date_internal(conn, doctor_id, cur_date, now_dt=now_dt)
        day_summaries.append({
            "date": day_info["date"],
            "day_of_week": day_info["day_of_week"],
            "day_name": day_info["day_name"],
            "weekday_short": cur_date.strftime("%a"),
            "day_num": cur_date.day,
            "month_short": cur_date.strftime("%b"),
            "long_label": cur_date.strftime("%A, %d %B %Y"),
            "opd_open": day_info["opd_open"],
            "start_time": day_info["start_time"],
            "end_time": day_info["end_time"],
            "slot_duration_minutes": day_info["slot_duration_minutes"],
            "avg_waiting_minutes": day_info["avg_waiting_minutes"],
            "available_count": day_info["available_count"],
            "total_count": day_info["total_count"],
        })

    return {
        "doctor": doctor,
        "days": day_summaries,
    }


def _enrich_appointment(conn: sqlite3.Connection, appointment_id: int) -> dict:
    cursor = conn.execute(
        """
        SELECT
            a.appointment_id,
            a.booking_reference,
            a.external_appointment_id,
            a.external_slot_id,
            a.doctor_id,
            d.composite_doctor_id,
            d.doctor_name,
            d.doctor_type,
            d.fees,
            d.city,
            d.location,
            a.hospital_id,
            h.hospital_name,
            a.patient_name,
            a.patient_phone,
            a.patient_age,
            a.patient_sex,
            a.patient_insurance,
            a.appointment_date,
            a.appointment_time,
            a.scheduling_date,
            a.status,
            a.reason,
            a.waiting_time,
            a.appointment_duration,
            a.source,
            a.created_at
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.doctor_id
        LEFT JOIN hospitals h ON a.hospital_id = h.hospital_id
        WHERE a.appointment_id = ?
        """,
        (appointment_id,),
    )
    row = cursor.fetchone()
    if row is None:
        raise AppointmentNotFoundError(f"Appointment with ID {appointment_id} not found.")
    cols = [c[0] for c in cursor.description]
    record = dict(zip(cols, row))
    record["display_time"] = format_display_time(record["appointment_time"])
    return record


def get_appointment_by_id(conn: sqlite3.Connection, appointment_id: int) -> dict:
    """Return a single enriched appointment record by ID."""
    _validate_positive_int(appointment_id, "appointment_id")
    return _enrich_appointment(conn, appointment_id)


def book_appointment(
    conn: sqlite3.Connection,
    doctor_id: int,
    appointment_date: str,
    appointment_time: str,
    patient_name: str,
    patient_phone: str | None = None,
    patient_age: int | None = None,
    patient_sex: str | None = None,
    reason: str | None = None,
    now_dt: datetime | None = None,
) -> dict:
    """Validate slot availability and create a persisted appointment."""
    doctor = _get_doctor_row(conn, doctor_id)
    target_date = _parse_date(appointment_date, "appointment_date")
    norm_time = normalize_time_str(appointment_time)

    if not isinstance(patient_name, str) or not patient_name.strip():
        raise ValueError("patient_name is required.")
    clean_name = patient_name.strip()

    if patient_age is not None:
        if isinstance(patient_age, bool) or not isinstance(patient_age, int) or not (0 <= patient_age <= 120):
            raise ValueError("patient_age must be an integer between 0 and 120.")

    now_dt = now_dt or datetime.now()
    if target_date < now_dt.date():
        raise ValueError("Cannot book an appointment in the past.")

    day_slots = _get_slots_for_date_internal(conn, doctor_id, target_date, now_dt=now_dt)
    if not day_slots["opd_open"]:
        raise ValueError(f"Doctor does not hold OPD on {day_slots['day_name']}.")

    slot_match = next((s for s in day_slots["slots"] if s["time"] == norm_time), None)
    if slot_match is None:
        raise ValueError(
            f"Time {norm_time} is outside the doctor's OPD schedule ({day_slots['start_time']} - {day_slots['end_time']})."
        )

    if slot_match["status"] == "past":
        raise ValueError("Cannot book a time slot that has already passed.")
    if not slot_match["available"]:
        raise AppointmentConflictError(
            f"Slot {slot_match['display_time']} on {day_slots['date']} is already {slot_match['status']}."
        )

    booking_ref = f"APT-{target_date.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    today_iso = now_dt.date().isoformat()
    clean_phone = patient_phone.strip() if isinstance(patient_phone, str) and patient_phone.strip() else None
    clean_sex = patient_sex.strip() if isinstance(patient_sex, str) and patient_sex.strip() else None
    clean_reason = reason.strip() if isinstance(reason, str) and reason.strip() else None

    try:
        with conn:
            cursor = conn.execute(
                """
                INSERT INTO appointments (
                    booking_reference,
                    doctor_id,
                    hospital_id,
                    patient_name,
                    patient_phone,
                    patient_age,
                    patient_sex,
                    appointment_date,
                    appointment_time,
                    scheduling_date,
                    status,
                    reason,
                    waiting_time,
                    source
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, 'user_booking')
                """,
                (
                    booking_ref,
                    doctor_id,
                    doctor["hospital_id"],
                    clean_name,
                    clean_phone,
                    patient_age,
                    clean_sex,
                    day_slots["date"],
                    norm_time,
                    today_iso,
                    clean_reason,
                    day_slots["avg_waiting_minutes"],
                ),
            )
            appointment_id = cursor.lastrowid
    except sqlite3.IntegrityError as exc:
        raise AppointmentConflictError(
            f"Slot {slot_match['display_time']} on {day_slots['date']} was just booked by another patient."
        ) from exc

    return _enrich_appointment(conn, appointment_id)


def cancel_appointment(conn: sqlite3.Connection, appointment_id: int) -> dict:
    """Cancel an existing scheduled appointment and release its slot."""
    existing = get_appointment_by_id(conn, appointment_id)
    if existing["status"] != "scheduled":
        raise ValueError(
            f"Cannot cancel appointment with status '{existing['status']}'. Only scheduled appointments can be cancelled."
        )

    with conn:
        conn.execute(
            "UPDATE appointments SET status = 'cancelled' WHERE appointment_id = ?",
            (appointment_id,),
        )

    return _enrich_appointment(conn, appointment_id)


def reschedule_appointment(
    conn: sqlite3.Connection,
    appointment_id: int,
    new_date: str,
    new_time: str,
    now_dt: datetime | None = None,
) -> dict:
    """Move a scheduled appointment to a new available date and time."""
    existing = get_appointment_by_id(conn, appointment_id)
    if existing["status"] != "scheduled":
        raise ValueError("Only scheduled appointments can be rescheduled.")

    target_date = _parse_date(new_date, "new_date")
    norm_time = normalize_time_str(new_time)
    now_dt = now_dt or datetime.now()

    if target_date < now_dt.date():
        raise ValueError("Cannot reschedule an appointment to the past.")

    if existing["appointment_date"] == target_date.isoformat() and existing["appointment_time"] == norm_time:
        return existing

    day_slots = _get_slots_for_date_internal(conn, existing["doctor_id"], target_date, now_dt=now_dt)
    if not day_slots["opd_open"]:
        raise ValueError(f"Doctor does not hold OPD on {day_slots['day_name']}.")

    slot_match = next((s for s in day_slots["slots"] if s["time"] == norm_time), None)
    if slot_match is None:
        raise ValueError(f"Time {norm_time} is outside the doctor's OPD schedule.")
    if slot_match["status"] == "past":
        raise ValueError("Cannot reschedule to a time slot that has already passed.")
    if not slot_match["available"]:
        raise AppointmentConflictError(
            f"Slot {slot_match['display_time']} on {day_slots['date']} is already {slot_match['status']}."
        )

    try:
        with conn:
            conn.execute(
                """
                UPDATE appointments
                SET appointment_date = ?,
                    appointment_time = ?,
                    scheduling_date = ?
                WHERE appointment_id = ?
                """,
                (
                    day_slots["date"],
                    norm_time,
                    now_dt.date().isoformat(),
                    appointment_id,
                ),
            )
    except sqlite3.IntegrityError as exc:
        raise AppointmentConflictError(
            f"Slot {slot_match['display_time']} on {day_slots['date']} is already booked."
        ) from exc

    return _enrich_appointment(conn, appointment_id)


def list_appointments(
    conn: sqlite3.Connection,
    status: str | None = None,
    doctor_id: int | None = None,
    source: str | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict:
    """List appointments with optional status, doctor, source, and search filters."""
    if isinstance(limit, bool) or not isinstance(limit, int) or not (1 <= limit <= 200):
        raise ValueError("limit must be between 1 and 200.")
    if isinstance(offset, bool) or not isinstance(offset, int) or offset < 0:
        raise ValueError("offset must be non-negative.")

    where_clauses = ["1=1"]
    params: list = []

    if doctor_id is not None:
        _validate_positive_int(doctor_id, "doctor_id")
        where_clauses.append("a.doctor_id = ?")
        params.append(doctor_id)

    if source is not None and source.strip():
        where_clauses.append("a.source = ?")
        params.append(source.strip())

    if status is not None and status.strip() and status.strip().lower() != "all":
        norm_status = status.strip().lower()
        if norm_status == "upcoming":
            where_clauses.append("a.status = 'scheduled'")
        elif norm_status == "past":
            where_clauses.append("a.status IN ('attended', 'cancelled', 'did not attend')")
        else:
            where_clauses.append("LOWER(a.status) = ?")
            params.append(norm_status)

    if search is not None and search.strip():
        term = f"%{search.strip()}%"
        where_clauses.append(
            "(LOWER(a.patient_name) LIKE LOWER(?) OR LOWER(d.doctor_name) LIKE LOWER(?) "
            "OR LOWER(COALESCE(h.hospital_name, '')) LIKE LOWER(?) OR LOWER(a.booking_reference) LIKE LOWER(?))"
        )
        params.extend([term, term, term, term])

    where_sql = " AND ".join(where_clauses)

    total = conn.execute(
        f"""
        SELECT COUNT(*)
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.doctor_id
        LEFT JOIN hospitals h ON a.hospital_id = h.hospital_id
        WHERE {where_sql}
        """,
        params,
    ).fetchone()[0]

    order_sql = (
        "CASE WHEN a.status = 'scheduled' THEN 0 ELSE 1 END ASC, "
        "CASE WHEN a.source = 'user_booking' THEN 0 ELSE 1 END ASC, "
        "a.appointment_date DESC, a.appointment_time DESC, a.appointment_id DESC"
    )
    if status and status.strip().lower() in {"upcoming", "scheduled"}:
        order_sql = "a.appointment_date ASC, a.appointment_time ASC, a.appointment_id DESC"

    cursor = conn.execute(
        f"""
        SELECT
            a.appointment_id,
            a.booking_reference,
            a.external_appointment_id,
            a.external_slot_id,
            a.doctor_id,
            d.composite_doctor_id,
            d.doctor_name,
            d.doctor_type,
            d.fees,
            d.city,
            d.location,
            a.hospital_id,
            h.hospital_name,
            a.patient_name,
            a.patient_phone,
            a.patient_age,
            a.patient_sex,
            a.patient_insurance,
            a.appointment_date,
            a.appointment_time,
            a.scheduling_date,
            a.status,
            a.reason,
            a.waiting_time,
            a.appointment_duration,
            a.source,
            a.created_at
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.doctor_id
        LEFT JOIN hospitals h ON a.hospital_id = h.hospital_id
        WHERE {where_sql}
        ORDER BY {order_sql}
        LIMIT ? OFFSET ?
        """,
        [*params, limit, offset],
    )
    cols = [c[0] for c in cursor.description]
    rows = []
    for r in cursor.fetchall():
        item = dict(zip(cols, r))
        item["display_time"] = format_display_time(item["appointment_time"])
        rows.append(item)

    return {
        "total": total,
        "appointments": rows,
    }


def get_appointment_stats(conn: sqlite3.Connection) -> dict:
    """Return summary counts of doctors, schedules, and appointments."""
    doctors_count = conn.execute("SELECT COUNT(*) FROM doctors").fetchone()[0]
    hospitals_count = conn.execute("SELECT COUNT(*) FROM hospitals").fetchone()[0]
    schedules_count = conn.execute("SELECT COUNT(*) FROM doctor_schedules").fetchone()[0]
    scheduled_doctors = conn.execute(
        "SELECT COUNT(DISTINCT doctor_id) FROM doctor_schedules"
    ).fetchone()[0]
    upcoming_bookings = conn.execute(
        "SELECT COUNT(*) FROM appointments WHERE status = 'scheduled'"
    ).fetchone()[0]
    user_bookings = conn.execute(
        "SELECT COUNT(*) FROM appointments WHERE source = 'user_booking'"
    ).fetchone()[0]
    merged_records = conn.execute(
        "SELECT COUNT(*) FROM appointments WHERE source = 'medscheduler_merged'"
    ).fetchone()[0]

    return {
        "doctors": doctors_count,
        "hospitals": hospitals_count,
        "scheduled_doctors": scheduled_doctors,
        "schedule_rows": schedules_count,
        "upcoming_bookings": upcoming_bookings,
        "user_bookings": user_bookings,
        "merged_historical_records": merged_records,
    }
