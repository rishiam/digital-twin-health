# DigiTwin Health — Production-Grade AI-Powered Digital Twin Healthcare Platform

[![Next.js 15](https://img.shields.io/badge/Next.js-15_App_Router-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python 3.12](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python)](https://python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_RLS-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Frontend_Deploy-black?style=for-the-badge&logo=vercel)](https://vercel.com/)
[![Railway](https://img.shields.io/badge/Railway-Backend_Deploy-0B0D0E?style=for-the-badge&logo=railway)](https://railway.app/)
[![CI/CD](https://img.shields.io/badge/GitHub_Actions-Automated_CI%2FCD-2088FF?style=for-the-badge&logo=github-actions)](https://github.com/)

---

## 🌟 Executive Overview

**DigiTwin Health** is an enterprise, production-ready **AI-Powered Digital Twin Healthcare Platform** designed to model, forecast, and simulate cardiometabolic patient trajectories. 

By unifying **biophysical minimal differential equations** (Bergman minimal model) with **deep recurrent sequence networks** (GRU and LSTM), the platform creates a living virtual replica of a patient's metabolic state. Clinicians and patients can monitor continuous glucose data, analyze lab hematology panels (CBC), classify cardiac rhythm anomalies (ECG), evaluate multi-disease risk with SHAP explanations, run "What-If" treatment simulations, and interact with a retrieval-augmented clinical AI assistant.

Engineered with a **scalable SaaS multi-tier architecture**, DigiTwin Health is optimized for portfolio demonstrations, academic defense (AIML final-year capstone), and commercial startup MVP validation with automated global CI/CD pipelines deploying to **Vercel** (Frontend), **Railway** (Backend), and **Supabase** (PostgreSQL with Row-Level Security).

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Client["Presentation Layer (Vercel)"]
        User(["Clinician / Patient"])
        NextApp["Next.js 15 App Router\n(TypeScript + Tailwind + Recharts)"]
    end

    subgraph Edge["API Gateway & Telemetry (Railway)"]
        FastAPI["FastAPI 0.115 Core Service\n(Python 3.12 + Pydantic v2)"]
        Limiter["SlowAPI Rate Limiter"]
        AuthMid["JWT & RBAC Middleware\n(Patient / Doctor / Admin)"]
        Sentry["Sentry APM & Error Tracing"]
    end

    subgraph Intelligence["ML & Digital Twin Inference Services"]
        HybridEngine["Hybrid Digital Twin Core\n(Bergman ODE + GRU)"]
        GlucosePred["Multi-Horizon Forecaster\n(GRU vs LSTM: 30m, 60m, 90m, 120m, 4h, 6h)"]
        CBCModel["XGBoost Hematology Engine\n(Anemia, Infection, Bleeding, Inflammation)"]
        ECGModel["1D CNN + BiLSTM Cardiac Analyzer\n(Afib, Bradycardia, Tachycardia, QT, ST)"]
        RiskEnsemble["Risk Ensemble (XGB + RF + LGB)\n+ SHAP Feature Attributions"]
        SimEngine["What-If Scenario Perturbation Engine\n(Insulin, Carbs, Exercise, Meds)"]
        RAGAssistant["Clinical RAG Healthcare Assistant\n(ADA / AHA / WHO Knowledge Grounding)"]
    end

    subgraph Data["Database & Storage Layer (Supabase)"]
        Postgres["Supabase PostgreSQL 16\n(18 Relational Tables + RLS Policies)"]
        Storage["Supabase Storage\n(Dossiers, Waveforms, Reports)"]
        AuditLog["Immutable Audit Trail\n(HIPAA Access Log)"]
    end

    User -->|HTTPS / WSS| NextApp
    NextApp -->|REST API + Bearer JWT| FastAPI
    FastAPI --- Limiter
    FastAPI --- AuthMid
    FastAPI --> Sentry
    FastAPI --> HybridEngine
    FastAPI --> GlucosePred
    FastAPI --> CBCModel
    FastAPI --> ECGModel
    FastAPI --> RiskEnsemble
    FastAPI --> SimEngine
    FastAPI --> RAGAssistant
    FastAPI --> Postgres
    FastAPI --> Storage
    FastAPI --> AuditLog
```

### ASCII Architecture Map
```
[ Browser / Mobile Client ]
            │
      (HTTPS / TLS)
            ▼
┌────────────────────────────────────────────────────────┐
│  Next.js 15 App Router (Vercel Global Edge)            │
│  - 12 Responsive Dashboard Pages                       │
│  - Real-Time SVG & Recharts Data Visualizations        │
│  - Light / Dark Clinical Theme Engine                  │
└────────────────────────────────────────────────────────┘
            │
      (REST / JSON / JWT)
            ▼
┌────────────────────────────────────────────────────────┐
│  FastAPI Application Microservice (Railway)            │
│  - OpenAPI 3.1 / Swagger Documentation                 │
│  - RBAC Security (Patient, Doctor, Admin)              │
│  - HIPAA Compliant Audit Logging                       │
└────────────────────────────────────────────────────────┘
            │
   ┌────────┴───────────────────────────┐
   ▼                                    ▼
┌───────────────────────────┐  ┌─────────────────────────┐
│ Machine Learning Engine   │  │ Supabase PostgreSQL 16  │
│ - Hybrid Minimal ODE+GRU  │  │ - 18 Tables with RLS    │
│ - GRU vs LSTM Forecaster  │  │ - Automated Triggers    │
│ - XGBoost CBC Classifier  │  │ - Model Registry Seeds  │
│ - 1D CNN+BiLSTM ECG Engine│  │ - Supabase Storage      │
│ - SHAP Explanations       │  └─────────────────────────┘
│ - Clinical RAG Assistant  │
└───────────────────────────┘
```

---

## 🔬 Core Medical AI Capabilities

### 1. Hybrid Digital Twin Core
The platform implements a **coupled dual-core model**:
- **Physiological Component**: Numerical ODE solver modeling the **Bergman Minimal Model of Glucose Disappearance**:
  $$\frac{dG(t)}{dt} = -(p_1 + X(t)) \cdot G(t) + p_1 \cdot G_b + \text{CarbAbsorption}(t) - \text{ExerciseDrop}(t)$$
  $$\frac{dX(t)}{dt} = -p_2 \cdot X(t) + p_3 \cdot (I(t) - I_b)$$
- **Deep Recurrent Component**: 2-layer Gated Recurrent Unit (GRU) with residual sequence projection capturing circadian variance, dawn phenomenon, and nocturnal drifting.
- **Fusion Equation**: $\hat{G}_{\text{twin}} = \alpha \cdot G_{\text{phys}} + (1 - \alpha) \cdot G_{\text{GRU}}$ parameterized by patient age, weight, and HbA1c.

### 2. Multi-Horizon Glucose Forecasting
- **Primary Architecture**: GRU (Gated Recurrent Unit)
- **Secondary Architecture**: LSTM (Long Short-Term Memory)
- **Forecast Horizons**: 30 Minutes, 60 Minutes, 90 Minutes, 120 Minutes, 4 Hours (240m), 6 Hours (360m).
- **Benchmarked Error Metrics**:
  - **RMSE**: Root Mean Square Error (mg/dL)
  - **MAE**: Mean Absolute Error (mg/dL)
  - **MAPE**: Mean Absolute Percentage Error (%)
  - **$R^2$**: Coefficient of Determination ($0.85 - 0.94$)
- Includes 90% confidence bands (upper and lower bounds) for clinical safety margin evaluation.

### 3. CBC (Complete Blood Count) Analysis
- **Model**: Multi-output XGBoost Regressor and Gradient Boosting Classifier.
- **Input Features (10 parameters)**: Hemoglobin (Hb), Hematocrit (Hct), RBC, WBC, Platelets, Neutrophils, Lymphocytes, Monocytes, Eosinophils, Basophils.
- **Evaluated Endpoints**:
  - Anemia Risk
  - Infection/Leukocytosis Risk
  - Bleeding / Thrombocytopenic Risk
  - Systemic Inflammation Score

### 4. ECG Arrhythmia & Cardiac Intelligence
- **Model Architecture**: 1D Convolutional Neural Network (1D CNN) coupled to a Bidirectional LSTM (BiLSTM).
- **Input Parameters**: Heart Rate, PR Interval, QRS Duration, QT Interval, Corrected QTc (Bazett), ST-Segment Elevation/Depression (mm), T-Wave Morphology.
- **Classified Conditions**:
  1. Normal Sinus Rhythm
  2. Bradycardia ($<60$ bpm)
  3. Tachycardia ($>100$ bpm)
  4. Atrial Fibrillation (Afib)
  5. QT Prolongation ($>480$ ms)
  6. ST Elevation (STEMI marker)
  7. ST Depression (Subendocardial ischemia)
- **Outputs**: Cardiac Risk Score ($0-100\%$) and Arrhythmia Likelihood ($0-100\%$) with synthesized Lead II waveform preview.

### 5. Multi-Disease Risk Prediction & SHAP Explanations
- **Model Ensemble**: XGBoost + Random Forest + LightGBM weighted tri-model ensemble.
- **Predicted Outcomes**: Hypoglycemia Risk, Hyperglycemia Risk, 30-Day Hospitalization Risk, 10-Year Cardiovascular Disease (CVD) Risk, Micro/Macrovascular Complications Risk.
- **Explainability**: SHAP (SHapley Additive exPlanations) attributing positive (risk-inducing) and negative (protective) contributions per clinical biomarker.

### 6. What-If Treatment Simulation Engine
Allows clinicians and patients to simulate perturbations before actual prescription:
- Titrate insulin doses ($-50\%$ to $+50\%$)
- Adjust meal carbohydrate quantity (0g to 120g)
- Schedule post-prandial physical workouts (light walk to intense aerobic)
- Add or modify adjunctive incretin/SGLT2 therapy
- Visualizes 6-hour baseline vs. simulated glucose curves with net delta and hypoglycemia safety warnings.

### 7. Clinical RAG Healthcare Assistant
- Built with **Retrieval-Augmented Generation (RAG)** grounded in clinical consensus guidelines (ADA Standards of Care, AHA Guidelines, WHO protocols).
- Explains glucose excursions, lab findings, and ECG telemetry in conversational, layperson-accessible language.
- Seamlessly switches to external LLMs (e.g. OpenAI GPT-4o-mini) when an API key is provided, falling back to local clinical knowledge retrieval.

---

## 🖥️ 12 Responsive Dashboard Pages

| Page Path | Screen Title | Primary Functionality |
|---|---|---|
| `/` | Landing Page | Public product presentation, 8 architecture pillars, live demo launchers. |
| `/login` & `/signup` | Authentication | Secure JWT auth with 1-click Patient, Doctor, and Admin demo roles. |
| `/app` | Clinical Dashboard | Real-time CGM graph, target range (70-180), TIR/TAR/TBR/GMI KPIs, alerts. |
| `/app/profile` | Patient Profile | Demographics, BMI calculator, active medications, comorbidities, digital twin calibration. |
| `/app/twin` | Digital Twin Studio | Multicompartment organ visualizer (Pancreas, Gut, Liver, Muscle, Kidneys), ISF & ICR sliders. |
| `/app/glucose` | Glucose Forecaster | Multi-horizon prediction (30m to 6h), GRU vs LSTM comparison, error metrics table. |
| `/app/cbc` | CBC Analysis | 10-parameter hematology entry, clinical presets, XGBoost risk evaluation. |
| `/app/ecg` | ECG Analysis | Real-time Lead II waveform strip, interval inputs, 1D CNN+BiLSTM rhythm detection. |
| `/app/risk` | Risk & SHAP | Tri-model ensemble risk scores (Hypo/Hyper/Hosp/CVD/Comp) with SHAP waterfall charts. |
| `/app/simulation` | What-If Engine | Interactive sliders for insulin, carbs, exercise, and meds; baseline vs simulated curves. |
| `/app/assistant` | AI Assistant | Conversational RAG agent with preset prompts, grounded citations, transcript export. |
| `/app/reports` | Clinical Reports | EHR-grade printable clinical summary dossier, historical archive, dynamic generator. |
| `/app/settings` | Settings | Telemetry threshold configuration (Hypo <70, Hyper >180), dark/light theme, cloud status. |
| `/app/admin` | Admin Dashboard | Platform metrics, user distribution, HIPAA immutable audit log viewer, ML model registry. |

---

## 🗄️ Database Schema (Supabase PostgreSQL)

The database schema comprises **18 relational tables** with strict constraints, indexes, foreign keys, and Row-Level Security (RLS) policies:

1. `users`: Credentials, full names, roles (`patient`, `doctor`, `admin`), Supabase UUID.
2. `patients`: Medical Record Number (MRN), sex, date of birth, assigned physician FK.
3. `patient_profiles`: Anthropometrics (weight, height, BMI), HbA1c, diabetes phenotype, diagnosis years.
4. `cgm_readings`: 5-minute continuous glucose telemetry, trend vectors, timestamp index.
5. `medications`: Active pharmacotherapy, dosages, frequencies, start dates.
6. `insulin_records`: Basal and bolus insulin administration logs (units).
7. `meal_records`: Carbohydrates (g), protein, fat, meal timestamps.
8. `activity_records`: Exercise duration, intensity, estimated caloric burn.
9. `cbc_results`: 10 laboratory hematology parameters and XGBoost computed risks.
10. `ecg_results`: Cardiac intervals (PR, QRS, QT, QTc, ST), CNN+BiLSTM rhythm findings, cardiac risk.
11. `risk_scores`: Ensemble risk probabilities, SHAP feature importance vectors, model version.
12. `glucose_predictions`: Forecast horizons (30, 60, 90, 120, 240, 360 min), upper/lower bounds.
13. `simulation_results`: What-if perturbation parameters, baseline and simulated trajectory curves.
14. `recommendations`: Actionable evidence-based clinical recommendations with priority tiers.
15. `reports`: Printable structured EHR summaries in JSON format.
16. `alerts`: Severity-tagged warnings (critical, high, moderate) with acknowledgement status.
17. `notifications`: In-app alerts for users.
18. `audit_logs`: Immutable HIPAA security log recording actor ID, action, resource, IP address, and timestamp.
19. `model_registry`: Production ML model versions, tasks, and validation benchmark metrics.

---

## 🚀 Quickstart & Local Setup

### Option 1: Docker Compose (1-Command Full Stack Boot)
Prerequisites: [Docker Desktop](https://www.docker.com/)

```bash
# Clone the repository
git clone https://github.com/your-username/digitwin-health.git
cd digitwin-health

# Boot PostgreSQL, FastAPI backend, and Next.js frontend
docker-compose up --build
```
- Frontend UI: `http://localhost:3000`
- FastAPI Swagger Docs: `http://localhost:8000/docs`
- PostgreSQL Database: `localhost:5432`

---

### Option 2: Manual Local Development

#### 1. Backend Setup
```bash
cd apps/api

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Launch FastAPI development server
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend Setup
```bash
cd apps/web

# Install dependencies
npm install

# Run Next.js 15 in Turbopack development mode
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 🔑 Demo Access Credentials

The platform is pre-seeded with clinical demo accounts (Password: `Demo1234!`):

| Role | Email | Password | Default Workspace Access |
|---|---|---|---|
| **Patient** | `patient@digitwin.health` | `Demo1234!` | Personal Twin, CGM Telemetry, What-If Simulation, RAG Assistant |
| **Doctor** | `doctor@digitwin.health` | `Demo1234!` | Clinical Dashboard, Patient Cohort, CBC/ECG Review, Dossier Sign-off |
| **Admin** | `admin@digitwin.health` | `Demo1234!` | Global System Metrics, HIPAA Audit Logs, ML Model Registry |

*Alternatively, click any of the quick-fill buttons on the login page.*

---

## 📦 Synthetic Dataset Generator (10,000+ Cohort)

To generate a synthetic cohort of 10,000+ realistic patients with CGM curves, CBC panels, ECG intervals, medications, lifestyle factors, and clinical risk ground-truth:

```bash
python ml/generate_datasets.py --n 10000 --out ml/data/generated
```
Output files created in `ml/data/generated/`:
- `patients.csv` (demographics, BMI, diabetes phenotype, HbA1c)
- `cgm_daily_summary.csv` (mean glucose, CV, TIR, TBR, TAR)
- `cgm_traces_sample.csv` (high-frequency 5-minute telemetry)
- `cbc.csv` (10 hematology parameters + anemia/infection labels)
- `ecg.csv` (intervals + cardiac rhythm labels)
- `medications.csv` (metformin, SGLT2, GLP-1, statins)
- `lifestyle.csv` (activity hours, carb intake, sleep duration)
- `risk_labels.csv` (hypo, hyper, hospitalization, CVD, complication labels)
- `manifest.json` (metadata & checksum)

---

## 🧪 Model Training & Benchmarking

Train and benchmark the models locally or in CI:

```bash
# Train & compare GRU vs LSTM across 6 horizons (RMSE, MAE, MAPE, R2)
python ml/train_glucose.py

# Train XGBoost CBC, 1D CNN+BiLSTM ECG, and Risk Ensembles with SHAP
python ml/train_clinical.py
```

---

## 🌐 Production Deployment Guide

### 1. Frontend on Vercel
1. Import the repository into [Vercel](https://vercel.com/).
2. Set Root Directory to `apps/web`.
3. Configure Environment Variables:
   - `NEXT_PUBLIC_API_URL`: Your deployed Railway backend URL (`https://your-api.railway.app`)
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon Key
4. Deploy!

### 2. Backend on Railway
1. Create a new project on [Railway](https://railway.app/).
2. Deploy from GitHub Repo, setting the root directory to `apps/api`.
3. Railway automatically detects `Dockerfile` and `railway.json`.
4. Configure Environment Variables in Railway dashboard:
   - `DATABASE_URL`: `postgresql+psycopg://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres`
   - `JWT_SECRET`: Random 64-character secret
   - `CORS_ORIGINS`: Your Vercel frontend URL
   - `SEED_DEMO_USERS`: `true`
5. Verify health check at `https://your-api.railway.app/health`.

### 3. Database on Supabase
1. Create a project on [Supabase](https://supabase.com/).
2. Open the **SQL Editor** and paste the contents of `supabase/migrations/001_init.sql`.
3. Execute to create all 18 tables, triggers, and Row-Level Security policies.
4. Create a storage bucket named `digitwin-uploads`.

### 4. GitHub Actions CI/CD
The repository includes automated CI/CD:
- `.github/workflows/ci.yml`: Runs tests, builds ML models, checks TypeScript linting, and validates production Next.js builds on every PR/push.
- `.github/workflows/deploy.yml`: Automatically deploys to Vercel and Railway when changes land in `main`.

---

## 🛡️ Security & Compliance
- **JWT & Role-Based Access Control (RBAC)**: Fine-grained authorization separating Patients, Attending Doctors, and Platform Administrators.
- **Row-Level Security (RLS)**: PostgreSQL-enforced multi-tenant isolation ensuring patients can only view their own telemetry.
- **Audit Logging**: Every API access event logs the actor, resource ID, IP address, and timestamp in an immutable ledger.
- **Data Protection**: Zero raw password storage (passwords salted and hashed with bcrypt); HTTPS/TLS enforced in transit.

---

## 📄 License & Attribution
Developed for production health SaaS MVP validation and academic engineering excellence. Distributed under the **MIT License**.
