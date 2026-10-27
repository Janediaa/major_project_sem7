
import sqlite3

import pytest

from src.database.models import create_tables


def test_duplicate_composite_doctor_id_is_rejected():
    conn = sqlite3.connect(":memory:")

    try:
        create_tables(conn)

        # Use no hospital association for both records.
        doctor = (
            "DOC001",
            "Dr. A",
            "Cardiology",
            10,
            "Delhi",
            1000,
            "Delhi",
            None,
        )

        insert_sql = """
            INSERT INTO doctors (
                composite_doctor_id,
                doctor_name,
                doctor_type,
                experience_years,
                location,
                fees,
                city,
                hospital_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """

        conn.execute(insert_sql, doctor)

        # A second doctor with the same composite ID must fail.
        with pytest.raises(sqlite3.IntegrityError):
            conn.execute(insert_sql, doctor)

    finally:
        conn.close()


def test_doctor_can_have_null_hospital_id():
    conn = sqlite3.connect(":memory:")

    try:
        create_tables(conn)

        conn.execute(
            """
            INSERT INTO doctors (
                composite_doctor_id,
                doctor_name,
                doctor_type,
                experience_years,
                location,
                fees,
                city,
                hospital_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "DOC002",
                "Dr. B",
                "Neurology",
                5,
                "Mumbai",
                800,
                "Mumbai",
                None,
            ),
        )

        row = conn.execute(
            """
            SELECT hospital_id
            FROM doctors
            WHERE composite_doctor_id = ?
            """,
            ("DOC002",),
        ).fetchone()

        assert row is not None
        assert row[0] is None

    finally:
        conn.close()
