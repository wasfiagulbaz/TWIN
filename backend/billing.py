import os
from pathlib import Path

import stripe
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from auth import get_current_user_id, get_user_profile
from supabase_client import get_supabase

_root_env = Path(__file__).resolve().parent.parent / ".env"
_backend_env = Path(__file__).resolve().parent / ".env"
load_dotenv(_root_env)
load_dotenv(_backend_env)

router = APIRouter(prefix="/billing", tags=["billing"])

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
PRICE_ID = os.getenv("STRIPE_PRICE_ID")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


class CheckoutResponse(BaseModel):
    url: str


@router.post("/create-checkout-session", response_model=CheckoutResponse)
def create_checkout_session(user_id: str = Depends(get_current_user_id)):
    if not stripe.api_key or not PRICE_ID:
        raise HTTPException(
            status_code=500,
            detail="Stripe is not configured on the server.",
        )

    profile = get_user_profile(user_id)

    if profile.get("subscription_status") == "premium":
        raise HTTPException(status_code=400, detail="You already have Pro access.")

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            client_reference_id=user_id,
            customer_email=profile.get("email"),
            line_items=[{"price": PRICE_ID, "quantity": 1}],
            success_url=f"{FRONTEND_URL}/dashboard/profile?upgraded=1",
            cancel_url=f"{FRONTEND_URL}/dashboard/new?upgrade_canceled=1",
            metadata={"user_id": user_id},
        )
    except stripe.StripeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return CheckoutResponse(url=session.url)


@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    signature = request.headers.get("stripe-signature")

    if not WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Webhook secret not configured.")

    try:
        event = stripe.Webhook.construct_event(payload, signature, WEBHOOK_SECRET)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid payload.") from exc
    except stripe.SignatureVerificationError as exc:
        raise HTTPException(status_code=400, detail="Invalid signature.") from exc

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("client_reference_id") or session.get("metadata", {}).get(
            "user_id"
        )

        if user_id:
            supabase = get_supabase()
            supabase.table("profiles").update({"subscription_status": "premium"}).eq(
                "id", user_id
            ).execute()

    return {"received": True}
