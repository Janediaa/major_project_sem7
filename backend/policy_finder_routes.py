
from fastapi import APIRouter, HTTPException, Query
from backend.policy_finder_database import get_finder_policies

from backend.policy_finder_service import (
    fetch_policies,
    fetch_policy_details
)

router = APIRouter(
    prefix="/api/policy-finder",
    tags=["Policy Finder"]
)


@router.get("/policies")
def get_policies(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    category: str = Query(None)
):
    """Get health insurance policies with pagination."""

    try:
        return fetch_policies(
            limit=limit,
            offset=offset,
            category=category
        )

    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"Unable to fetch insurance policies: {str(error)}"
        )


@router.get("/policies/{uin}")
def get_policy_details(uin: str):
    """Get complete details of a policy using its UIN."""

    try:
        return fetch_policy_details(uin)

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"Unable to fetch policy details: {str(error)}"
        )



@router.get("/cached-policies")
def get_cached_finder_policies(
    category: str = Query(None),
    search: str = Query(None),

    # Custom Sum Insured range
    min_sum_insured: float = Query(None, ge=0),
    max_sum_insured: float = Query(None, ge=0),

    # Other filters
    copay: str = Query(None),
    deductible: str = Query(None),
    initial_waiting: str = Query(None),
    ped_waiting: str = Query(None)
):
    filters = {
        "min_sum_insured": min_sum_insured,
        "max_sum_insured": max_sum_insured,
        "copay": copay,
        "deductible": deductible,
        "initial_waiting": initial_waiting,
        "ped_waiting": ped_waiting
    }

    try:
        return get_finder_policies(
            category=category,
            search=search,
            filters=filters
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
