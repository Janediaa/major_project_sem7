import os
import shutil
import sqlite3
from pathlib import Path

SOURCE_DATABASE_PATH = Path(__file__).resolve().parent.parent / "data" / "healthcare.db"
TMP_DATABASE_PATH = Path("/tmp/healthcare.db")


def get_database_path() -> Path:
    """Use /tmp/healthcare.db on read-only serverless runtimes like Vercel."""
    if os.environ.get("VERCEL"):
        if not TMP_DATABASE_PATH.exists() and SOURCE_DATABASE_PATH.exists():
            TMP_DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(SOURCE_DATABASE_PATH, TMP_DATABASE_PATH)
        return TMP_DATABASE_PATH
    return SOURCE_DATABASE_PATH


DATABASE_PATH = get_database_path()


def get_db_connection():
    db_path = get_database_path()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn
