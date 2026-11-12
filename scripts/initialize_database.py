import sys
from pathlib import Path

# Add the project root so the script can import the src package.
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.database.appointment_seed import seed_appointment_data
from src.database.connection import get_connection
from src.database.models import create_tables
from src.database.repository import get_doctor_count
from src.database.seed import seed_database


CSV_PATH = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "healthcare_professionals_clean.csv"
)
SCHEDULES_CSV = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "doctor_schedules_merged.csv"
)
BASELINES_CSV = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "doctor_slot_baselines.csv"
)
APPOINTMENTS_CSV = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "appointments_merged.csv"
)

DB_PATH = PROJECT_ROOT / "data" / "healthcare.db"


def main() -> None:
    if not CSV_PATH.is_file():
        raise FileNotFoundError(f"Dataset not found: {CSV_PATH}")

    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    conn = None
    try:
        conn = get_connection(DB_PATH)
        create_tables(conn)

        if get_doctor_count(conn) == 0:
            counts = seed_database(conn, CSV_PATH)
        else:
            counts = {
                "hospitals": conn.execute("SELECT COUNT(*) FROM hospitals").fetchone()[0],
                "doctors": get_doctor_count(conn),
            }

        appt_counts = {"schedules": 0, "baselines": 0, "appointments": 0}
        if SCHEDULES_CSV.is_file() and BASELINES_CSV.is_file() and APPOINTMENTS_CSV.is_file():
            appt_counts = seed_appointment_data(
                conn,
                schedules_csv=SCHEDULES_CSV,
                baselines_csv=BASELINES_CSV,
                appointments_csv=APPOINTMENTS_CSV,
            )

        print("Database initialized successfully.")
        print(f"Database: {DB_PATH}")
        print(f"Hospitals in database: {counts['hospitals']}")
        print(f"Doctors in database: {counts['doctors']}")
        print(f"Doctor schedules in database: {appt_counts['schedules']}")
        print(f"Slot baselines in database: {appt_counts['baselines']}")
        print(f"Appointments in database: {appt_counts['appointments']}")

    finally:
        if conn is not None:
            conn.close()


if __name__ == "__main__":
    main()
