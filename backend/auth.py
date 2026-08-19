import os
from pathlib import Path

import requests
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from supabase_client import get_supabase

_root_env = Path(__file__).resolve().parent.parent / ".env"
_backend_env = Path(__file__).resolve().parent / ".env"
load_dotenv(_root_env)
load_dotenv(_backend_env)

security = HTTPBearer(auto_error=False)

FREE_SEARCH_LIMIT = 2

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")


def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    token = credentials.credentials
    
    # Validate token directly with Supabase Auth API
    response = requests.get(
        f"{SUPABASE_URL}/auth/v1/user",
        headers={
            "Authorization": f"Bearer {token}",
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
        }
    )
    
    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    user_data = response.json()
    return user_data["id"]


def get_user_profile(user_id: str) -> dict:
    supabase = get_supabase()
    
    # Query without .single() to avoid crashing on 0 rows
    response = (
        supabase.table("profiles")
        .select("*")
        .eq("id", user_id)
        .execute()
    )

    if response.data and len(response.data) > 0:
        return response.data[0]

    # Auto-create missing profile fallback
    default_profile = {
        "id": user_id,
        "subscription_status": "free",
        "search_count": 0
    }
    
    try:
        supabase.table("profiles").upsert(default_profile).execute()
    except Exception:
        pass

    return default_profile


def assert_search_allowed(profile: dict) -> None:
    if profile.get("subscription_status") == "premium":
        return

    if profile.get("search_count", 0) >= FREE_SEARCH_LIMIT:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "search_limit_reached",
                "message": "Free plan limit reached. Upgrade to Pro for unlimited searches.",
                "search_count": profile.get("search_count", 0),
                "limit": FREE_SEARCH_LIMIT,
            },
        )


def increment_search_count(user_id: str, current_count: int) -> None:
    supabase = get_supabase()
    supabase.table("profiles").update({"search_count": current_count + 1}).eq(
        "id", user_id
    ).execute()