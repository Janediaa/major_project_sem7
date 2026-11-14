
import sqlite3
import json
import re

from pathlib import Path
from datetime import datetime, timezone


# Store the Policy Finder database separately
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = DATA_DIR / "policy_finder.db"


def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_policy_finder_db():
    """Create separate tables for policies, facts and documents."""

    with get_connection() as conn:

        conn.execute("""
            CREATE TABLE IF NOT EXISTS insurance_policies (
                uin TEXT PRIMARY KEY,
                name TEXT,
                insurer TEXT,
                category TEXT,
                line TEXT,
                kind TEXT,
                status TEXT,
                analysis TEXT,
                url TEXT,
                api TEXT,
                summary TEXT,
                fetched_at TEXT
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS insurance_policy_facts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                uin TEXT NOT NULL,
                fact_key TEXT,
                label TEXT,
                section TEXT,
                status TEXT,
                value TEXT,
                display TEXT,
                note TEXT,
                quote TEXT,
                sources TEXT,
                law TEXT,
                FOREIGN KEY (uin)
                    REFERENCES insurance_policies(uin)
                    ON DELETE CASCADE
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS insurance_policy_documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                uin TEXT NOT NULL,
                kind TEXT,
                label TEXT,
                pages INTEGER,
                source_url TEXT,
                url TEXT,
                fetched_at TEXT,
                FOREIGN KEY (uin)
                    REFERENCES insurance_policies(uin)
                    ON DELETE CASCADE
            )
        """)


def save_policy_details(policy):
    """Save policy details, facts and documents."""

    uin = policy.get("uin")

    if not uin:
        raise ValueError("Policy UIN is missing")

    now = datetime.now(timezone.utc).isoformat()

    with get_connection() as conn:

        conn.execute("PRAGMA foreign_keys = ON")

        conn.execute("""
            INSERT INTO insurance_policies (
                uin, name, insurer, category, line,
                kind, status, analysis, url, api,
                summary, fetched_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(uin) DO UPDATE SET
                name = excluded.name,
                insurer = excluded.insurer,
                category = excluded.category,
                line = excluded.line,
                kind = excluded.kind,
                status = excluded.status,
                analysis = excluded.analysis,
                url = excluded.url,
                api = excluded.api,
                summary = excluded.summary,
                fetched_at = excluded.fetched_at
        """, (
            uin,
            policy.get("name"),
            policy.get("insurer", {}).get("name")
                if isinstance(policy.get("insurer"), dict)
                else policy.get("insurer"),
            policy.get("category"),
            policy.get("line"),
            policy.get("kind"),
            policy.get("status"),
            json.dumps(policy.get("analysis"), ensure_ascii=False),
            policy.get("url"),
            policy.get("api"),
            policy.get("summary"),
            now
        ))

        # Replace old facts when refreshing a policy
        conn.execute(
            "DELETE FROM insurance_policy_facts WHERE uin = ?",
            (uin,)
        )

        for fact in policy.get("facts", []):

            conn.execute("""
                INSERT INTO insurance_policy_facts (
                    uin, fact_key, label, section, status,
                    value, display, note, quote, sources, law
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                uin,
                fact.get("key"),
                fact.get("label"),
                fact.get("section"),
                fact.get("status"),
                json.dumps(fact.get("value"), ensure_ascii=False),
                fact.get("display"),
                fact.get("note"),
                fact.get("quote"),
                json.dumps(fact.get("sources", []), ensure_ascii=False),
                json.dumps(fact.get("law", []), ensure_ascii=False)
            ))

        # Replace old documents when refreshing a policy
        conn.execute(
            "DELETE FROM insurance_policy_documents WHERE uin = ?",
            (uin,)
        )

        for document in policy.get("documents", []):

            conn.execute("""
                INSERT INTO insurance_policy_documents (
                    uin, kind, label, pages,
                    source_url, url, fetched_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                uin,
                document.get("kind"),
                document.get("label"),
                document.get("pages"),
                document.get("source_url"),
                document.get("url"),
                document.get("fetched_at")
            ))


def get_cached_policies(limit=20, offset=0, category=None):
    """Read policies saved in the local database."""

    query = "SELECT * FROM insurance_policies"
    params = []

    if category:
        query += " WHERE category = ?"
        params.append(category)

    query += " ORDER BY name LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    with get_connection() as conn:
        rows = conn.execute(query, params).fetchall()

    return [dict(row) for row in rows]


def import_policies_to_database(batch_size=20, category=None):
    """Fetch policy listings and save their complete details locally."""

    from backend.policy_finder_service import (
        fetch_policies,
        fetch_policy_details
    )

    imported = 0
    failed = []
    offset = 0

    while True:
        batch = fetch_policies(
            limit=batch_size,
            offset=offset
        )

        policies = batch.get("results", [])

        if not policies:
            break

        for policy in policies:

            if category and policy.get("category") != category:
                continue

            try:
                uin = policy.get("uin")

                if not uin:
                    continue

                details = fetch_policy_details(uin)
                details["uin"] = uin

                save_policy_details(details)
                imported += 1

                print(f"Imported: {details.get('name', uin)}")

            except Exception as error:
                failed.append({
                    "uin": policy.get("uin"),
                    "error": str(error)
                })

                print(f"Failed: {policy.get('name')}")

        next_offset = batch.get("next_offset")

        if next_offset is None:
            break

        offset = next_offset

    return {
        "imported": imported,
        "failed": failed
    }


def check_fact_coverage():
    conn = get_connection()

    query = """
        SELECT
            fact_key,
            COUNT(DISTINCT uin) AS policy_count
        FROM insurance_policy_facts
        WHERE value IS NOT NULL
          AND TRIM(value) != ''
          AND LOWER(TRIM(value)) NOT IN (
              'null', '""', '[]', '{}'
          )
        GROUP BY fact_key
        ORDER BY policy_count DESC
    """

    rows = conn.execute(query).fetchall()

    print("\n========== FACT COVERAGE ==========")

    for row in rows:
        print(f"{row['fact_key']}: {row['policy_count']} policies")

    conn.close()


def parse_insurance_amounts(value):
    """
    Extract monetary amounts from policy text.
    Converts lakh, crore and thousand amounts into INR.

    Examples:
    5 lakh       -> 500000
    10 lakhs     -> 1000000
    1.5 crore    -> 15000000
    50000        -> 50000
    """

    if not value:
        return []

    text = str(value).lower()
    text = text.replace(",", "")

    pattern = (
        r'(?:₹|rs\.?|inr)?\s*'
        r'(\d+(?:\.\d+)?)\s*'
        r'(crores?|cr|lakhs?|lacs?|lac|thousands?|k)?'
    )

    multipliers = {
        "crore": 10000000,
        "crores": 10000000,
        "cr": 10000000,
        "lakh": 100000,
        "lakhs": 100000,
        "lac": 100000,
        "lacs": 100000,
        "thousand": 1000,
        "thousands": 1000,
        "k": 1000,
    }

    amounts = []

    for match in re.finditer(pattern, text):

        number = float(match.group(1))
        unit = match.group(2)

        if unit:
            amount = number * multipliers[unit]
            amounts.append(amount)

        else:
            # Only accept plain numbers when they have a currency marker.
            matched_text = match.group(0)

            if re.search(r'₹|rs\.?|inr', matched_text):
                amounts.append(number)

    return amounts



def matches_copay_filter(values, selected):
    """Match original co-payment facts against simplified filter categories."""

    selected = str(selected).lower()

    for value in values:
        text = str(value).lower()

        percentages = {
            float(match)
            for match in re.findall(r'(\d+(?:\.\d+)?)\s*%', text)
        }

        is_optional = (
            "unless opted" in text
            or "voluntary" in text
            or "optional co-payment" in text
        )

        is_conditional = any(term in text for term in [
            "except",
            "zone",
            "higher",
            "depending",
            "may apply",
            "outside",
            "specific",
            "variant",
            "if treated",
            "late intimation",
            "not for accidents"
        ])

        if selected == "no_copay":
            if (
                not percentages
                and not is_optional
                and not is_conditional
                and (
                    text.strip() in ["none", "no co-payment", "no copay"]
                    or "no co-payment" in text
                    or "no copay" in text
                )
            ):
                return True

        elif selected == "optional":
            if is_optional:
                return True

        elif selected == "5":
            if 5.0 in percentages:
                return True

        elif selected == "10":
            if 10.0 in percentages:
                return True

        elif selected == "20":
            if 20.0 in percentages:
                return True

        elif selected == "conditional":
            if is_conditional or any(
                percentage not in {5.0, 10.0, 20.0}
                for percentage in percentages
            ):
                return True

    return False

def matches_deductible_filter(values, selected):
    selected = str(selected).lower().strip()

    for value in values:
        text = str(value).lower().strip()

        is_none = (
            text == "none"
            or text == "none (na)"
            or text.startswith("none (na)")
        )

        is_optional = (
            "unless opted" in text
            or "voluntary" in text
            or "optional" in text
        )

        if selected == "no_deductible" and is_none:
            return True

        elif selected == "optional" and is_optional:
            return True

        elif selected == "has_deductible" and not is_none and not is_optional:
            return True

    return False



def get_finder_policies(
    category=None,
    search=None,
    filters=None
):
    """Get cached policies with search and filter support."""

    filter_keys = [
        "copay",
        "deductible",
        "initial_waiting",
        "ped_waiting"
    ]

    filters = filters or {}

    def get_fact_text(fact):

        if fact["display"] and fact["display"].strip():
            return fact["display"].strip()

        raw_value = fact["value"]

        if raw_value is None:
            return ""

        try:
            value = json.loads(raw_value)

            if isinstance(value, str):
                return value

            if isinstance(value, (dict, list)):
                return json.dumps(value, ensure_ascii=False)

            return str(value)

        except (TypeError, json.JSONDecodeError):
            return str(raw_value)

    with get_connection() as conn:

        policies = conn.execute(
            "SELECT * FROM insurance_policies ORDER BY name"
        ).fetchall()

        facts = conn.execute("""
            SELECT uin, fact_key, display, value
            FROM insurance_policy_facts
        """).fetchall()

    # Group fact values by policy UIN and fact key.
    policy_facts = {}

    # Build original filter options.
    filter_options = {key: set() for key in filter_keys}

    for fact in facts:

        key = fact["fact_key"]
        value = get_fact_text(fact)

        if not value:
            continue

        policy_facts.setdefault(fact["uin"], {})
        policy_facts[fact["uin"]].setdefault(key, [])
        policy_facts[fact["uin"]][key].append(value)

        if key in filter_options:
            filter_options[key].add(value)

    results = []

    # Read custom Sum Insured range.
    min_amount = filters.get("min_sum_insured")
    max_amount = filters.get("max_sum_insured")

    if min_amount not in (None, ""):
        min_amount = float(min_amount)
    else:
        min_amount = None

    if max_amount not in (None, ""):
        max_amount = float(max_amount)
    else:
        max_amount = None

    # Validate range.
    if (
        min_amount is not None
        and max_amount is not None
        and min_amount > max_amount
    ):
        raise ValueError(
            "Minimum Sum Insured cannot exceed Maximum Sum Insured."
        )

    for policy in policies:

        policy = dict(policy)

        # Category filter.
        if category and policy["category"] != category:
            continue

        # Search filter.
        if search:

            search_text = search.lower()

            searchable = " ".join([
                policy.get("name") or "",
                policy.get("insurer") or "",
                policy.get("uin") or ""
            ]).lower()

            if search_text not in searchable:
                continue

        current_facts = policy_facts.get(policy["uin"], {})

        matches = True

        # Custom Sum Insured range.
        if min_amount is not None or max_amount is not None:

            sum_insured_values = current_facts.get(
                "sum_insured_options", []
            )

            policy_amounts = []

            for value in sum_insured_values:
                policy_amounts.extend(
                    parse_insurance_amounts(value)
                )

            if not policy_amounts:
                matches = False

            else:

                min_limit = (
                    min_amount if min_amount is not None else 0
                )

                max_limit = (
                    max_amount
                    if max_amount is not None
                    else float("inf")
                )

                if not any(
                    min_limit <= amount <= max_limit
                    for amount in policy_amounts
                ):
                    matches = False

        # Co-payment, Deductible and Waiting Period filters.
        if matches:

            for key in filter_keys:

                selected = filters.get(key)

                if not selected:
                    continue

                available_values = current_facts.get(key, [])

                # Co-payment simplified matching.
                if key == "copay":

                    if not matches_copay_filter(
                        available_values, selected
                    ):
                        matches = False
                        break

                # Deductible simplified matching.
                elif key == "deductible":

                    if not matches_deductible_filter(
                        available_values, selected
                    ):
                        matches = False
                        break

                # Initial and PED waiting period matching.
                else:

                    if selected.lower() not in [
                        value.lower()
                        for value in available_values
                    ]:
                        matches = False
                        break

        # Add matching policies.
        if matches:

            policy["filter_values"] = {
                key: current_facts.get(key, [])
                for key in [
                    "sum_insured_options",
                    "copay",
                    "deductible",
                    "initial_waiting",
                    "ped_waiting"
                ]
            }

            results.append(policy)

    return {
        "results": results,
        "total": len(results),
        "filter_options": {
            key: sorted(values)
            for key, values in filter_options.items()
        }
    }
