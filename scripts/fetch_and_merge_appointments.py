"""Fetch and merge the Medscheduler outpatient dataset with the cleaned Indian doctors dataset."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import requests

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DOCTORS_CSV = PROJECT_ROOT / "data" / "processed" / "healthcare_professionals_clean.csv"
RAW_DIR = PROJECT_ROOT / "data" / "raw" / "medscheduler"

SCHEDULES_OUT = PROJECT_ROOT / "data" / "processed" / "doctor_schedules_merged.csv"
BASELINES_OUT = PROJECT_ROOT / "data" / "processed" / "doctor_slot_baselines.csv"
APPOINTMENTS_OUT = PROJECT_ROOT / "data" / "processed" / "appointments_merged.csv"
PROVENANCE_OUT = PROJECT_ROOT / "data" / "processed" / "appointment_dataset_provenance.json"

BASE_RAW_URL = "https://raw.githubusercontent.com/TwiTech/Personalized-Appointment-Reminders/main"
DATASET_FILES = ("slots.csv", "appointments.csv", "patients.csv")

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

# OPD session windows aligned with Medscheduler's 08:00-17:45 clinic calendar
OPD_PROFILES = [
    ("09:00", "13:00"),  # Morning OPD
    ("14:00", "17:30"),  # Afternoon / Evening OPD
    ("09:30", "16:30"),  # Full-day OPD
]

WEEKDAY_PATTERNS = [
    [0, 1, 2, 3, 4],     # Mon-Fri
    [0, 1, 2, 3, 4],     # Mon-Fri
    [0, 1, 2, 3, 4],     # Mon-Fri
    [0, 2, 3, 4],        # Mon, Wed, Thu, Fri
    [0, 1, 3, 4],        # Mon, Tue, Thu, Fri
]


def ensure_raw_files(raw_dir: Path = RAW_DIR) -> dict[str, Path]:
    """Download Medscheduler CSV files if not already cached locally."""
    raw_dir.mkdir(parents=True, exist_ok=True)
    paths: dict[str, Path] = {}

    for filename in DATASET_FILES:
        target = raw_dir / filename
        if not target.is_file():
            url = f"{BASE_RAW_URL}/{filename}"
            print(f"Downloading {url} -> {target} ...")
            resp = requests.get(url, timeout=60)
            resp.raise_for_status()
            target.write_bytes(resp.content)
        paths[filename] = target

    return paths


def _stable_index(key: str, mod: int) -> int:
    digest = hashlib.sha256(key.encode("utf-8")).hexdigest()
    return int(digest[:8], 16) % mod


def _generate_times(start_hhmm: str, end_hhmm: str, step_minutes: int) -> list[str]:
    sh, sm = map(int, start_hhmm.split(":"))
    eh, em = map(int, end_hhmm.split(":"))
    cur = sh * 60 + sm
    end = eh * 60 + em
    times = []
    while cur < end:
        times.append(f"{cur // 60:02d}:{cur % 60:02d}")
        cur += step_minutes
    return times


def merge_datasets(
    doctors_csv: Path = DOCTORS_CSV,
    raw_dir: Path = RAW_DIR,
) -> dict[str, int]:
    """Merge Indian doctors CSV with Medscheduler slots, appointments, and patients."""
    if not doctors_csv.is_file():
        raise FileNotFoundError(f"Doctors dataset not found: {doctors_csv}")

    raw_paths = ensure_raw_files(raw_dir)

    doctors_df = pd.read_csv(doctors_csv)
    slots_df = pd.read_csv(raw_paths["slots.csv"], dtype={"slot_id": str})
    appts_df = pd.read_csv(
        raw_paths["appointments.csv"],
        dtype={"appointment_id": str, "slot_id": str, "patient_id": str},
    )
    patients_df = pd.read_csv(raw_paths["patients.csv"], dtype={"patient_id": str})

    # Normalize HH:MM time strings from HH:MM:SS
    slots_df["slot_time"] = slots_df["appointment_time"].astype(str).str.slice(0, 5)
    slots_df["day_of_week"] = pd.to_datetime(slots_df["appointment_date"]).dt.dayofweek

    appts_df["slot_time"] = appts_df["appointment_time"].astype(str).str.slice(0, 5)
    appts_df["day_of_week"] = pd.to_datetime(appts_df["appointment_date"]).dt.dayofweek

    # Enrich appointments with patient names and insurance metadata
    appts_enriched = appts_df.merge(
        patients_df[["patient_id", "name", "insurance"]],
        on="patient_id",
        how="left",
    )

    # Filter to valid terminal/historical statuses for realistic clinic history
    valid_hist = appts_enriched[
        appts_enriched["status"].isin(["attended", "cancelled", "did not attend"])
    ].copy()
    valid_hist = valid_hist.reset_index(drop=True)

    # Compute per-date clinic statistics from 2024 Medscheduler data
    recent_slots = slots_df[slots_df["appointment_date"] >= "2024-01-01"].copy()
    clinic_dates = sorted(recent_slots["appointment_date"].unique())

    date_stats = (
        appts_df[appts_df["appointment_date"] >= "2024-01-01"]
        .groupby("appointment_date")
        .agg(
            avg_wait=("waiting_time", "mean"),
            med_dur=("appointment_duration", "median"),
        )
        .to_dict("index")
    )

    # Pre-index unavailable slots per (date, day_of_week) from recent_slots
    busy_by_date = (
        recent_slots[recent_slots["is_available"] == False]  # noqa: E712
        .groupby("appointment_date")[["slot_time", "slot_id"]]
        .apply(lambda g: list(zip(g["slot_time"], g["slot_id"])))
        .to_dict()
    )

    schedule_rows = []
    baseline_rows = []
    appointment_rows = []

    total_hist = len(valid_hist)

    for idx, doc in doctors_df.iterrows():
        comp_id = str(doc["composite_doctor_id"])
        hospital = str(doc["hospital"]) if pd.notna(doc["hospital"]) else ""
        city = str(doc["city"])

        seed_val = _stable_index(comp_id, 10**9)
        clinic_date = clinic_dates[seed_val % len(clinic_dates)]
        stats = date_stats.get(clinic_date, {})
        avg_wait = round(float(stats.get("avg_wait") or 12.5), 1)
        med_dur = float(stats.get("med_dur") or 18.0)

        # Choose 15-min or 30-min slot granularity based on empirical clinic duration
        slot_duration = 30 if med_dur >= 20.0 else 15
        start_time, end_time = OPD_PROFILES[seed_val % len(OPD_PROFILES)]
        active_days = WEEKDAY_PATTERNS[(seed_val // 3) % len(WEEKDAY_PATTERNS)]

        opd_times = _generate_times(start_time, end_time, slot_duration)
        date_busy_slots = busy_by_date.get(clinic_date, [])
        busy_slot_lookup = {t: sid for t, sid in date_busy_slots}

        for dow in active_days:
            schedule_rows.append({
                "composite_doctor_id": comp_id,
                "day_of_week": dow,
                "day_name": DAY_NAMES[dow],
                "start_time": start_time,
                "end_time": end_time,
                "slot_duration_minutes": slot_duration,
                "avg_waiting_minutes": avg_wait,
                "source_clinic_date": clinic_date,
                "source_dataset": "medscheduler_2024",
            })

            # Pick ~25% of OPD slots as baseline clinic busy slots grounded in slots.csv
            # while leaving ~75% open for live patient bookings.
            candidate_busy = [t for t in opd_times if t in busy_slot_lookup]
            stride = 4
            offset = (seed_val + dow) % stride
            selected_busy = [
                t for pos, t in enumerate(candidate_busy) if pos % stride == offset
            ]
            # Cap baseline busy slots so plenty of slots remain bookable
            max_busy = max(1, len(opd_times) // 4)
            for t in selected_busy[:max_busy]:
                baseline_rows.append({
                    "composite_doctor_id": comp_id,
                    "day_of_week": dow,
                    "slot_time": t,
                    "source_slot_id": busy_slot_lookup[t],
                })

        # Assign 6 real historical patient appointments per doctor from Medscheduler
        for k in range(6):
            rec_idx = (idx * 6 + k * 37 + (seed_val % 97)) % total_hist
            rec = valid_hist.iloc[rec_idx]

            # Snap historical appointment time into doctor's OPD window if needed
            rec_time = str(rec["slot_time"])
            if rec_time not in opd_times:
                rec_time = opd_times[(seed_val + k) % len(opd_times)]

            appointment_rows.append({
                "booking_reference": f"MS-{rec['appointment_id']}-{idx:03d}{k}",
                "external_appointment_id": rec["appointment_id"],
                "external_slot_id": rec["slot_id"],
                "composite_doctor_id": comp_id,
                "hospital": hospital,
                "city": city,
                "patient_name": rec["name"] if pd.notna(rec["name"]) else f"Patient {rec['patient_id']}",
                "patient_age": int(rec["age"]) if pd.notna(rec["age"]) else None,
                "patient_sex": str(rec["sex"]) if pd.notna(rec["sex"]) else None,
                "patient_insurance": str(rec["insurance"]) if pd.notna(rec["insurance"]) else None,
                "appointment_date": str(rec["appointment_date"]),
                "appointment_time": rec_time,
                "scheduling_date": str(rec["scheduling_date"]),
                "status": str(rec["status"]),
                "waiting_time": round(float(rec["waiting_time"]), 1) if pd.notna(rec["waiting_time"]) else None,
                "appointment_duration": round(float(rec["appointment_duration"]), 1) if pd.notna(rec["appointment_duration"]) else None,
                "source": "medscheduler_merged",
            })

    schedules_out_df = pd.DataFrame(schedule_rows)
    baselines_out_df = pd.DataFrame(baseline_rows)
    appointments_out_df = pd.DataFrame(appointment_rows)

    SCHEDULES_OUT.parent.mkdir(parents=True, exist_ok=True)
    schedules_out_df.to_csv(SCHEDULES_OUT, index=False)
    baselines_out_df.to_csv(BASELINES_OUT, index=False)
    appointments_out_df.to_csv(APPOINTMENTS_OUT, index=False)

    provenance = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "primary_doctors_dataset": {
            "path": "data/processed/healthcare_professionals_clean.csv",
            "doctor_count": int(len(doctors_df)),
            "hospital_count": int(doctors_df["hospital"].dropna().nunique()),
            "city_count": int(doctors_df["city"].dropna().nunique()),
        },
        "merged_appointment_dataset": {
            "name": "Medscheduler Outpatient Appointment Scheduling Dataset",
            "source_repo": "https://github.com/TwiTech/Personalized-Appointment-Reminders",
            "generator_project": "https://github.com/carogaltier/medscheduler",
            "raw_counts": {
                "slots_csv": int(len(slots_df)),
                "appointments_csv": int(len(appts_df)),
                "patients_csv": int(len(patients_df)),
            },
        },
        "merged_outputs": {
            "doctor_schedules_merged.csv": int(len(schedules_out_df)),
            "doctor_slot_baselines.csv": int(len(baselines_out_df)),
            "appointments_merged.csv": int(len(appointments_out_df)),
        },
    }
    PROVENANCE_OUT.write_text(json.dumps(provenance, indent=2), encoding="utf-8")

    return {
        "doctors": len(doctors_df),
        "schedules": len(schedules_out_df),
        "baselines": len(baselines_out_df),
        "appointments": len(appointments_out_df),
    }


def main() -> None:
    counts = merge_datasets()
    print("Appointment dataset merge complete:")
    for key, value in counts.items():
        print(f"  {key}: {value}")


if __name__ == "__main__":
    main()
