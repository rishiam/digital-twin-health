# DigiTwin Health — Global Production Deployment Guide

This step-by-step guide walks you through deploying **DigiTwin Health** to production globally with auto-deploying CI/CD pipelines.

---

## 📋 Architectural Prerequisite Checklist

Before beginning, ensure you have active accounts on:
1. [GitHub](https://github.com/) (Source control & CI/CD workflows)
2. [Supabase](https://supabase.com/) (Managed PostgreSQL database & Storage)
3. [Railway](https://railway.app/) (FastAPI backend container hosting)
4. [Vercel](https://vercel.com/) (Next.js 15 App Router global edge hosting)
5. [Sentry](https://sentry.io/) (Optional: error logging & APM tracing)

---

## 🗄️ Step 1: Provision Database on Supabase

1. **Create Supabase Project**:
   - Log into [database.new](https://database.new) and click **New project**.
   - Choose your project name (e.g. `digitwin-health-prod`), set a strong database password, and select the region closest to your users.
2. **Execute Database Schema Migration**:
   - In your Supabase dashboard, navigate to the **SQL Editor** tab on the left sidebar.
   - Click **New query**, open [supabase/migrations/001_init.sql](file:///c:/Users/rishi/digitwin-health/supabase/migrations/001_init.sql), and paste the complete content.
   - Click **Run**.
   - This creates all 18 tables, triggers for `updated_at`, custom enum types, model registry seeds, and Row-Level Security (RLS) policies.
3. **Set Up Supabase Storage**:
   - In the Supabase dashboard, click **Storage**.
   - Click **Create new bucket**, name it `digitwin-uploads`, and toggle **Public Bucket** to ON (or leave private if using signed URLs).
4. **Collect Connection Details**:
   - Go to **Project Settings** > **Database** > **Connection string** > **URI**.
   - Select **URI (psycopg / PostgreSQL)**. It will look like:
     ```
     postgresql+psycopg://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
     ```
   - Go to **Project Settings** > **API** and copy:
     - `Project URL`: `https://[PROJECT-REF].supabase.co`
     - `anon / public key`: `eyJ...`
     - `service_role key`: `eyJ...`
     - `JWT Secret`: `[JWT-SECRET]`

---

## 🚂 Step 2: Deploy Backend to Railway

1. **Create Railway Project**:
   - Log into [Railway.app](https://railway.app/).
   - Click **+ New Project** > **Deploy from GitHub repo**.
   - Select your `digitwin-health` repository.
2. **Configure Root Directory & Build**:
   - In Railway, click on the newly created service.
   - Go to **Settings** > **General** > **Root Directory**.
   - Set **Root Directory** to: `apps/api`.
   - Railway will automatically detect the `Dockerfile` and `railway.json`.
3. **Configure Environment Variables**:
   In the **Variables** tab of your Railway service, add the following:

   | Variable Name | Value | Description |
   |---|---|---|
   | `APP_ENV` | `production` | Environment mode |
   | `DATABASE_URL` | `postgresql+psycopg://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres` | Supabase URI |
   | `JWT_SECRET` | `generate-a-64-character-random-hex-key` | Token signature key |
   | `CORS_ORIGINS` | `https://your-frontend.vercel.app,http://localhost:3000` | Allowed origins |
   | `SEED_DEMO_USERS` | `true` | Pre-seeds demo accounts |
   | `RATE_LIMIT_PER_MINUTE` | `120` | Rate limiting |
   | `SUPABASE_URL` | `https://[PROJECT-REF].supabase.co` | Supabase URL |
   | `SUPABASE_ANON_KEY` | `your-anon-key` | Supabase Anon Key |
   | `PORT` | `8000` | Application port |

4. **Generate Public Domain**:
   - Go to **Settings** > **Networking** > **Generate Domain**.
   - You will receive a URL like: `https://digitwin-api-production.up.railway.app`.
5. **Verify Deployment**:
   - Open `https://your-api.railway.app/health` in your browser. It should respond with `{"status": "ok", "service": "digitwin-api"}`.
   - Open `https://your-api.railway.app/docs` to view the interactive OpenAPI / Swagger UI.

---

## ▲ Step 3: Deploy Frontend to Vercel

1. **Import Project into Vercel**:
   - Log into [Vercel](https://vercel.com/).
   - Click **Add New…** > **Project** and select your GitHub repository.
2. **Set Build & Project Settings**:
   - **Framework Preset**: Next.js (automatically detected).
   - **Root Directory**: Click *Edit* and select `apps/web`.
3. **Configure Environment Variables in Vercel**:
   Under **Environment Variables**, add:

   | Key | Value | Notes |
   |---|---|---|
   | `NEXT_PUBLIC_API_URL` | `https://your-api.railway.app` | Your Railway API URL (no trailing slash) |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://[PROJECT-REF].supabase.co` | Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your-anon-key` | Supabase Public Key |

4. **Deploy**:
   - Click **Deploy**. Vercel will run `npm run build` and produce a global edge deployment (e.g. `https://digitwin-health.vercel.app`).
5. **Update CORS in Railway**:
   - Return to your Railway service's `CORS_ORIGINS` variable and ensure your production Vercel domain is listed.

---

## 🔄 Step 4: Configure GitHub Actions Auto CI/CD

When you push code to GitHub, GitHub Actions will automatically test, build, and deploy your changes.

1. **Generate Vercel Token & IDs**:
   - Go to [Vercel Account Tokens](https://vercel.com/account/tokens) and click **Create Token**. Name it `GH_ACTIONS_VERCEL_TOKEN`.
   - In your local terminal inside `apps/web`, run:
     ```bash
     npx vercel link
     ```
     Inspect `.vercel/project.json` to get `orgId` and `projectId`.
2. **Generate Railway Token**:
   - Go to [Railway Account Tokens](https://railway.app/account/tokens) and click **Create Token**.
3. **Add GitHub Repository Secrets**:
   - In your GitHub repo, go to **Settings** > **Secrets and variables** > **Actions** > **New repository secret**.
   - Add the following secrets:
     - `VERCEL_TOKEN`: Your Vercel token
     - `VERCEL_ORG_ID`: Your Vercel Organization ID
     - `VERCEL_PROJECT_ID`: Your Vercel Project ID
     - `RAILWAY_TOKEN`: Your Railway personal access token
4. **Trigger Auto-Deploy**:
   - Push any commit to `main`. The `.github/workflows/deploy.yml` workflow will automatically trigger, build the frontend on Vercel, and update the API on Railway.

---

## 🔍 Step 5: Production Verification & Smoke Test Checklist

- [ ] **Health Endpoint**: `GET https://your-api.railway.app/health` returns `{"status": "ok"}`.
- [ ] **Swagger Documentation**: `GET https://your-api.railway.app/docs` loads without error.
- [ ] **Authentication**: Log into `https://your-frontend.vercel.app/login` with `patient@digitwin.health` / `Demo1234!`.
- [ ] **Dashboard Render**: Verify that the continuous glucose telemetry chart renders with 70–180 mg/dL target lines.
- [ ] **Digital Twin Simulation**: Navigate to `/app/simulation`, drag the insulin/carb sliders, and verify that the baseline and simulated curves update.
- [ ] **CBC Evaluation**: Navigate to `/app/cbc`, choose "Acute Infection / Leukocytosis" preset, and verify that the XGBoost risk evaluation displays.
- [ ] **ECG Arrhythmia**: Navigate to `/app/ecg`, choose "Atrial Fibrillation" preset, and check that the Lead II waveform strip animates and AFib is detected.
- [ ] **RAG Assistant**: Navigate to `/app/assistant`, send "Explain my glucose forecast", and verify that a grounded clinical answer with citations returns.
- [ ] **Audit Trail**: Log in as `admin@digitwin.health` / `Demo1234!`, go to `/app/admin`, and confirm that recent login and telemetry actions appear in the audit table.
