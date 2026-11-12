from fastapi import APIRouter, HTTPException
from backend.database import get_db_connection

router = APIRouter(prefix="/api", tags=["Doctors & Hospitals"])


@router.get("/doctors")
def get_doctors(
    city: str | None = None,
    specialization: str | None = None,
    search: str | None = None,
    hospital_id: int | None = None,
):
    conn = get_db_connection()

    try:
        query = """
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
            LEFT JOIN hospitals h
                ON d.hospital_id = h.hospital_id
            WHERE 1=1
        """

        params = []

        if city:
            query += " AND LOWER(d.city) LIKE LOWER(?)"
            params.append(f"%{city}%")

        if specialization:
            query += " AND LOWER(d.doctor_type) LIKE LOWER(?)"
            params.append(f"%{specialization}%")

        if hospital_id is not None:
            query += " AND d.hospital_id = ?"
            params.append(hospital_id)

        if search:
            query += """
                AND (
                    LOWER(d.doctor_name) LIKE LOWER(?)
                    OR LOWER(d.doctor_type) LIKE LOWER(?)
                    OR LOWER(h.hospital_name) LIKE LOWER(?)
                )
            """
            params.extend([f"%{search}%"] * 3)

        query += " ORDER BY d.doctor_name"

        rows = conn.execute(query, params).fetchall()

        return {
            "total": len(rows),
            "doctors": [dict(row) for row in rows],
        }

    finally:
        conn.close()


# ---------------- HOSPITAL APIs ----------------


@router.get("/hospitals")
def get_hospitals(
    city: str | None = None,
    search: str | None = None,
):
    conn = get_db_connection()

    try:
        query = """
            SELECT
                h.hospital_id,
                h.hospital_name,
                h.city,
                COUNT(d.doctor_id) AS doctor_count
            FROM hospitals h
            LEFT JOIN doctors d
                ON h.hospital_id = d.hospital_id
            WHERE 1=1
        """

        params = []

        if city:
            query += " AND LOWER(h.city) LIKE LOWER(?)"
            params.append(f"%{city}%")

        if search:
            query += " AND LOWER(h.hospital_name) LIKE LOWER(?)"
            params.append(f"%{search}%")

        query += """
            GROUP BY h.hospital_id, h.hospital_name, h.city
            ORDER BY h.hospital_name
        """

        rows = conn.execute(query, params).fetchall()

        return {
            "total": len(rows),
            "hospitals": [dict(row) for row in rows],
        }

    finally:
        conn.close()


# -------- DOCTORS BELONGING TO A HOSPITAL --------


@router.get("/hospitals/{hospital_id}/doctors")
def get_hospital_doctors(hospital_id: int):
    conn = get_db_connection()

    try:
        hospital = conn.execute(
            "SELECT * FROM hospitals WHERE hospital_id = ?",
            (hospital_id,),
        ).fetchone()

        if hospital is None:
            raise HTTPException(
                status_code=404,
                detail="Hospital not found",
            )

        rows = conn.execute(
            """
            SELECT doctor_id, composite_doctor_id, doctor_name, doctor_type,
                   experience_years, fees, city, location, hospital_id
            FROM doctors
            WHERE hospital_id = ?
            ORDER BY doctor_name
            """,
            (hospital_id,),
        ).fetchall()

        return {
            "hospital": dict(hospital),
            "total_doctors": len(rows),
            "doctors": [dict(row) for row in rows],
        }

    finally:
        conn.close()
