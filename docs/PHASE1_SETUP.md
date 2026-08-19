# Phase 1 Setup — Supabase & Stripe

Follow these steps to activate authentication, search gating, and billing.

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the migration in `supabase/migrations/001_profiles.sql`.
3. Under **Authentication → Providers**, enable Email and (optionally) disable email confirmation for local dev.
4. Copy from **Project Settings → API**:
   - Project URL → `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - `anon` key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
   - JWT Secret → `SUPABASE_JWT_SECRET`

## 2. Stripe

1. Create a **one-time Price** in Stripe Dashboard (e.g. $29 "TWIN Pro Lifetime").
2. Copy the Price ID → `STRIPE_PRICE_ID`.
3. Copy Secret key → `STRIPE_SECRET_KEY`.
4. For local webhooks, run:
   ```bash
   stripe listen --forward-to localhost:8000/billing/webhook
   ```
   Copy the webhook signing secret → `STRIPE_WEBHOOK_SECRET`.

## 3. Environment files

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Fill in all values. Keep existing AI keys in `backend/.env`.

## 4. Install & run

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

## Freemium behavior

- New users get `subscription_status: free` and `search_count: 0`.
- Free users are limited to **2 searches** (enforced on backend + frontend).
- When the limit is hit, an upgrade modal appears.
- After Stripe Checkout completes, the webhook sets `subscription_status: premium` permanently.
