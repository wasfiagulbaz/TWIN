import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import Client, create_client

_root_env = Path(__file__).resolve().parent.parent / ".env"
_backend_env = Path(__file__).resolve().parent / ".env"
load_dotenv(_root_env)
load_dotenv(_backend_env)

_client: Client | None = None


def get_supabase() -> Client:
    global _client

    if _client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not url or not key:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set."
            )

        _client = create_client(url, key)

    return _client
