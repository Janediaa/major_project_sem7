
import json
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError


BASE_URL = "https://indiainsurances.com/api/v1"

def import_test_policies(count=2):
    """Import a small number of policies for testing."""

    from backend.policy_finder_database import save_policy_details

    batch = fetch_policies(limit=count, offset=0)
    imported = 0

    for policy in batch.get("results", []):
        uin = policy.get("uin")

        if not uin:
            continue

        details = fetch_policy_details(uin)
        details["uin"] = uin

        save_policy_details(details)
        imported += 1

        print(f"Saved: {details.get('name')}")

    return imported


def _make_api_request(url):
    """Send a GET request and return the JSON response."""

    request = Request(
        url,
        headers={
            "User-Agent": "HealthcareNavigator/1.0",
            "Accept": "application/json"
        }
    )

    try:
        with urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))

    except HTTPError as error:
        raise Exception(
            f"Insurance API returned HTTP {error.code}"
        ) from error

    except URLError as error:
        raise Exception(
            f"Could not connect to Insurance API: {error.reason}"
        ) from error

    except TimeoutError as error:
        raise Exception("Insurance API request timed out") from error

    except json.JSONDecodeError as error:
        raise Exception("Invalid JSON received from Insurance API") from error


def fetch_policies(limit=20, offset=0, category=None):
    """
    Fetch active health insurance policies.
    Supports pagination and optional category filtering.
    """

    params = {
        "line": "health",
        "status": "active",
        "limit": limit,
        "offset": offset
    }

    if category:
        params["category"] = category

    url = f"{BASE_URL}/policies?{urlencode(params)}"

    data = _make_api_request(url)

    return {
        "results": data.get("results", []),
        "next_offset": data.get("next_offset")
    }


def fetch_all_policies(category=None, batch_size=100):
    """Fetch policies in batches until pagination ends."""

    all_policies = []
    offset = 0

    while True:
        data = fetch_policies(
            limit=batch_size,
            offset=offset
        )

        policies = data.get("results", [])
        all_policies.extend(policies)

        next_offset = data.get("next_offset")

        if not policies or next_offset is None:
            break

        offset = next_offset

    if category:
        all_policies = [
            policy for policy in all_policies
            if policy.get("category") == category
        ]

    return all_policies


def fetch_policy_details(uin):
    """Fetch complete details of one policy using its UIN."""

    if not uin or not isinstance(uin, str):
        raise ValueError("A valid policy UIN is required")

    url = f"{BASE_URL}/policy/{uin.lower()}"

    return _make_api_request(url)


def import_policies_to_database(
    max_policies=30,
    batch_size=100,
    category="health-indemnity"
):
    """Import a limited number of policies of a selected category."""

    from backend.policy_finder_database import save_policy_details

    imported = 0
    processed = 0
    failed = []
    offset = 0

    print(f"\nStarting policy import...")
    print(f"Category: {category}")
    print(f"Maximum policies: {max_policies}\n")

    while processed < max_policies:

        batch = fetch_policies(
            limit=batch_size,
            offset=offset
        )

        policies = batch.get("results", [])

        if not policies:
            break

        for policy in policies:

            if processed >= max_policies:
                break

            if policy.get("category") != category:
                continue

            uin = policy.get("uin")

            if not uin:
                continue

            processed += 1

            try:
                details = fetch_policy_details(uin)
                details["uin"] = uin

                save_policy_details(details)
                imported += 1

                print(
                    f"[{processed}/{max_policies}] "
                    f"Imported: {details.get('name', uin)}"
                )

            except Exception as error:
                failed.append({
                    "uin": uin,
                    "name": policy.get("name"),
                    "error": str(error)
                })

                print(
                    f"[{processed}/{max_policies}] "
                    f"Failed: {policy.get('name')} - {error}"
                )

        next_offset = batch.get("next_offset")

        if next_offset is None:
            break

        offset = next_offset

    print("\n========== IMPORT SUMMARY ==========")
    print(f"Policies processed: {processed}")
    print(f"Successfully imported: {imported}")
    print(f"Failed: {len(failed)}")

    return {
        "processed": processed,
        "imported": imported,
        "failed": failed
    }
