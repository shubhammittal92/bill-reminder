# Deploying Bill & Subscription Reminder

Two free services: **Render** (backend API + Postgres) and **Vercel** (frontend).
No credit card required for the free tiers.

## 1. Backend + database on Render

1. Go to [render.com](https://render.com) and sign in with GitHub.
2. Click **New +** → **Blueprint**, and select the `bill-reminder` repository.
3. Render reads `render.yaml` and provisions:
   - a **Postgres** database (`bill-reminder-db`), and
   - the **API web service** (`bill-reminder-api`), wired to the DB via
     `DATABASE_URL`, with a strong `JWT_SECRET` auto-generated.
4. Click **Apply**. First build takes a few minutes.
5. When it's live, copy the API URL, e.g. `https://bill-reminder-api.onrender.com`.

> Free-tier note: the service sleeps after ~15 min idle, so the first request
> after a nap takes ~30s to wake. Fine for a demo.

### (Optional) enable real email

In the `bill-reminder-api` service → **Environment**, set:
- `GMAIL_USER` = your Gmail address
- `GMAIL_APP_PASSWORD` = a Google App Password
  (from https://myaccount.google.com/apppasswords)

## 2. Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. **Add New** → **Project**, import the `bill-reminder` repo.
3. Set **Root Directory** to `frontend`.
4. Add an **Environment Variable**:
   - `VITE_API_URL` = `https://bill-reminder-api.onrender.com/api`
     (your Render URL from step 1, with `/api` appended)
5. Click **Deploy**. You'll get a public URL like
   `https://bill-reminder.vercel.app`.

## 3. Connect the two (CORS)

Back in Render → `bill-reminder-api` → **Environment**, set:
- `CORS_ORIGIN` = your Vercel URL, e.g. `https://bill-reminder.vercel.app`

Save; Render redeploys. Done.

## 4. Use it

Open your Vercel URL, click **Sign up**, and you (or anyone) can create an
account, add subscriptions, and get reminders. Each user sees only their own data.
