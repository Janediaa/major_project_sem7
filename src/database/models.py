import sqlite3


def create_tables(conn : sqlite3.Connection) -> None:
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

    

    conn.commit()