import sqlite3


def create_tables(conn: sqlite3.Connection) -> None:
    """
    Create the necessary tables in the database.

    Args:
        conn (sqlite3.Connection): The SQLite connection object.
    """
    cursor = conn.cursor()

    # Create hospitals table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS hospitals (
            hospital_id INTEGER PRIMARY KEY AUTOINCREMENT,
            hospital_name TEXT NOT NULL,
            city TEXT NOT NULL,
            UNIQUE(hospital_name, city)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS doctors (
            doctor_id INTEGER PRIMARY KEY AUTOINCREMENT,
            composite_doctor_id TEXT NOT NULL UNIQUE,
            doctor_name TEXT NOT NULL,
            doctor_type TEXT,
            experience_years INTEGER NOT NULL,
            location TEXT NOT NULL,
            fees REAL,
            city TEXT NOT NULL,
            hospital_id INTEGER,
            FOREIGN KEY (hospital_id) REFERENCES hospitals (hospital_id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS doctor_schedules (
            schedule_id INTEGER PRIMARY KEY AUTOINCREMENT,
            doctor_id INTEGER NOT NULL,
            day_of_week INTEGER NOT NULL,
            day_name TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            slot_duration_minutes INTEGER NOT NULL DEFAULT 15,
            avg_waiting_minutes REAL,
            source_clinic_date TEXT,
            source_dataset TEXT NOT NULL DEFAULT 'medscheduler_2024',
            UNIQUE(doctor_id, day_of_week, start_time),
            FOREIGN KEY (doctor_id) REFERENCES doctors (doctor_id) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS doctor_slot_baselines (
            baseline_id INTEGER PRIMARY KEY AUTOINCREMENT,
            doctor_id INTEGER NOT NULL,
            day_of_week INTEGER NOT NULL,
            slot_time TEXT NOT NULL,
            source_slot_id TEXT,
            UNIQUE(doctor_id, day_of_week, slot_time),
            FOREIGN KEY (doctor_id) REFERENCES doctors (doctor_id) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS appointments (
            appointment_id INTEGER PRIMARY KEY AUTOINCREMENT,
            booking_reference TEXT NOT NULL UNIQUE,
            external_appointment_id TEXT,
            external_slot_id TEXT,
            doctor_id INTEGER NOT NULL,
            hospital_id INTEGER,
            patient_name TEXT NOT NULL,
            patient_phone TEXT,
            patient_age INTEGER,
            patient_sex TEXT,
            patient_insurance TEXT,
            appointment_date TEXT NOT NULL,
            appointment_time TEXT NOT NULL,
            scheduling_date TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'scheduled',
            reason TEXT,
            waiting_time REAL,
            appointment_duration REAL,
            source TEXT NOT NULL DEFAULT 'user_booking',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (doctor_id) REFERENCES doctors (doctor_id) ON DELETE CASCADE,
            FOREIGN KEY (hospital_id) REFERENCES hospitals (hospital_id)
        )
    """)

    cursor.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_active_slot
        ON appointments (doctor_id, appointment_date, appointment_time)
        WHERE status = 'scheduled'
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date
        ON appointments (doctor_id, appointment_date)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_appointments_status_source
        ON appointments (status, source, appointment_date)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_schedules_doctor_day
        ON doctor_schedules (doctor_id, day_of_week)
    """)

    conn.commit()
