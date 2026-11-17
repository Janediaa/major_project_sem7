"""FastAPI routes for doctor schedules, slot availability, and appointment booking."""

from fastapi import APIRouter, HTTPException, Query

from backend.database import get_db_connection
from backend.schemas import (
    AppointmentCreateRequest,
    AppointmentRescheduleRequest,
    AppointmentStatusUpdateRequest,
)
from src.services.appointment_service import (
    AppointmentConflictError,
    AppointmentNotFoundError,
    book_appointment,
    cancel_appointment,
    get_appointment_by_id,
    get_appointment_stats,
    get_available_slots,
    get_doctor_availability,
    get_doctor_schedule,
    list_appointments,
    reschedule_appointment,
)

router = APIRouter(prefix="/api", tags=["Appointments"])


@router.get("/appointments/stats")
def appointment_stats():
    conn = get_db_connection()
    try:
        return get_appointment_stats(conn)
    finally:
        conn.close()


@router.get("/doctors/{doctor_id}/schedule")
def doctor_schedule(doctor_id: int):
    conn = get_db_connection()
    try:
        return get_doctor_schedule(conn, doctor_id)
    except AppointmentNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    finally:
        conn.close()


@router.get("/doctors/{doctor_id}/availability")
def doctor_availability(
    doctor_id: int,
    start_date: str | None = Query(default=None),
    days: int = Query(default=7, ge=1, le=30),
):
    conn = get_db_connection()
    try:
        return get_doctor_availability(conn, doctor_id, start_date=start_date, days=days)
    except AppointmentNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    finally:
        conn.close()


@router.get("/doctors/{doctor_id}/slots")
def doctor_slots(
    doctor_id: int,
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
):
    conn = get_db_connection()
    try:
        return get_available_slots(conn, doctor_id, appointment_date=date)
    except AppointmentNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    finally:
        conn.close()


@router.get("/appointments")
def get_appointments(
    status: str | None = Query(default=None),
    doctor_id: int | None = Query(default=None),
    source: str | None = Query(default=None),
    search: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    conn = get_db_connection()
    try:
        return list_appointments(
            conn,
            status=status,
            doctor_id=doctor_id,
            source=source,
            search=search,
            limit=limit,
            offset=offset,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    finally:
        conn.close()


@router.get("/appointments/{appointment_id}")
def get_appointment(appointment_id: int):
    conn = get_db_connection()
    try:
        return get_appointment_by_id(conn, appointment_id)
    except AppointmentNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    finally:
        conn.close()


@router.post("/appointments", status_code=201)
def create_appointment(payload: AppointmentCreateRequest):
    conn = get_db_connection()
    try:
        appointment = book_appointment(
            conn,
            doctor_id=payload.doctor_id,
            appointment_date=payload.appointment_date,
            appointment_time=payload.appointment_time,
            patient_name=payload.patient_name,
            patient_phone=payload.patient_phone,
            patient_age=payload.patient_age,
            patient_sex=payload.patient_sex,
            reason=payload.reason,
        )
        return {
            "message": "Appointment confirmed successfully.",
            "appointment": appointment,
        }
    except AppointmentNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except AppointmentConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    finally:
        conn.close()


@router.patch("/appointments/{appointment_id}/cancel")
def cancel_existing_appointment(appointment_id: int):
    conn = get_db_connection()
    try:
        appointment = cancel_appointment(conn, appointment_id)
        return {
            "message": "Appointment cancelled.",
            "appointment": appointment,
        }
    except AppointmentNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    finally:
        conn.close()


@router.patch("/appointments/{appointment_id}/reschedule")
def reschedule_existing_appointment(
    appointment_id: int,
    payload: AppointmentRescheduleRequest,
):
    conn = get_db_connection()
    try:
        appointment = reschedule_appointment(
            conn,
            appointment_id=appointment_id,
            new_date=payload.appointment_date,
            new_time=payload.appointment_time,
        )
        return {
            "message": "Appointment rescheduled.",
            "appointment": appointment,
        }
    except AppointmentNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except AppointmentConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    finally:
        conn.close()


@router.patch("/appointments/{appointment_id}/status")
def update_existing_appointment_status(
    appointment_id: int,
    payload: AppointmentStatusUpdateRequest,
):
    conn = get_db_connection()
    try:
        norm_status = payload.status.strip().lower()
        db_status = norm_status
        if norm_status in ("rejected", "cancelled"):
            db_status = "cancelled"
        elif norm_status in ("completed", "attended"):
            db_status = "attended"
        elif norm_status in ("confirmed", "scheduled"):
            db_status = "scheduled"

        cursor = conn.execute(
            "SELECT appointment_id FROM appointments WHERE appointment_id = ?",
            (appointment_id,),
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail=f"Appointment {appointment_id} not found.")

        with conn:
            conn.execute(
                "UPDATE appointments SET status = ? WHERE appointment_id = ?",
                (db_status, appointment_id),
            )

        updated = get_appointment_by_id(conn, appointment_id)
        return {
            "message": f"Appointment status updated to {payload.status}.",
            "appointment": updated,
        }
    finally:
        conn.close()
