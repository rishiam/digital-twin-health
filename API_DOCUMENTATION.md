# DigiTwin Health — REST API Reference Manual

The DigiTwin Health API provides production-grade endpoints for telemetry ingestion, digital twin simulation, multi-horizon glucose forecasting, hematology/ECG analysis, multi-disease risk evaluation, and clinical RAG assistance.

Interactive OpenAPI documentation is available via:
- **Swagger UI**: `https://your-api.railway.app/docs`
- **ReDoc**: `https://your-api.railway.app/redoc`
- **OpenAPI Schema**: `https://your-api.railway.app/openapi.json`

---

## 1. Authentication & Security

All protected endpoints require an HTTP `Authorization` header containing a valid JSON Web Token (JWT):
```http
Authorization: Bearer <your-access-token>
```

Tokens are valid for 60 minutes by default and encode the user's ID, role (`patient`, `doctor`, or `admin`), and email.

---

## 2. Authentication Endpoints

### 2.1 Register New Account
`POST /api/v1/auth/register`

Creates a new user account and automatically provisions a patient record and baseline profile if the role is `patient`.

**Request Body**:
```json
{
  "email": "jordan@example.com",
  "password": "StrongPassword123!",
  "full_name": "Jordan Hale",
  "role": "patient"
}
```

**Response (200 OK)**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "role": "patient",
  "full_name": "Jordan Hale",
  "email": "jordan@example.com",
  "patient_id": "b3f07a51-50e5-4f32-841f-846c2459b83b"
}
```

---

### 2.2 Login & Token Issue
`POST /api/v1/auth/login`

**Request Body**:
```json
{
  "email": "patient@digitwin.health",
  "password": "Demo1234!"
}
```

**Response (200 OK)**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "role": "patient",
  "full_name": "Jordan Hale",
  "email": "patient@digitwin.health",
  "patient_id": "848e10d2-9722-4876-bce7-d2c6c06df9a1"
}
```

---

### 2.3 Current User Info
`GET /api/v1/auth/me`

**Response (200 OK)**:
```json
{
  "id": "67a9c8b1-1cb2-47a8-8b9a-7a56a683ec10",
  "email": "patient@digitwin.health",
  "full_name": "Jordan Hale",
  "role": "patient",
  "is_active": true,
  "created_at": "2026-09-16T08:00:00Z"
}
```

---

## 3. Clinical Telemetry & Dashboard

### 3.1 Patient Dashboard Data
`GET /api/v1/dashboard`

Returns 24-hour continuous glucose monitoring (CGM) readings, metabolic KPIs (TIR, TBR, TAR, GMI, Mean Glucose), active clinical alerts, and AI recommendations.

**Response (200 OK)**:
```json
{
  "patient_id": "848e10d2-9722-4876-bce7-d2c6c06df9a1",
  "profile": {
    "age": 46,
    "weight_kg": 78.4,
    "hba1c": 7.4,
    "diabetes_type": "type2",
    "bmi": 27.8
  },
  "kpis": {
    "current_glucose": 142.0,
    "mean_glucose": 148.2,
    "time_in_range": 71.4,
    "time_below_range": 3.2,
    "time_above_range": 25.4,
    "gmi": 6.85
  },
  "cgm": [
    {
      "t": "2026-09-16T07:55:00Z",
      "glucose": 142.0,
      "trend": "flat"
    }
  ],
  "alerts": [
    {
      "id": "a-1",
      "severity": "moderate",
      "title": "Post-prandial excursion",
      "message": "Glucose rose above 180 mg/dL after lunch."
    }
  ],
  "recommendations": [
    {
      "id": "r-1",
      "title": "Flatten the lunch spike",
      "body": "Pair 15-20g of protein with carbohydrates and walk 10 minutes post-meal.",
      "priority": "high"
    }
  ]
}
```

---

## 4. Machine Learning & Forecasting Endpoints

### 4.1 Multi-Horizon Glucose Prediction
`POST /api/v1/glucose/predict`

Fuses the biophysical minimal model ODEs with the GRU sequence model to project glucose across 30, 60, 90, 120, 240, and 360-minute horizons.

**Request Body**:
```json
{
  "recent_glucose": [138, 142, 148, 156, 162, 165],
  "insulin": 1.5,
  "carbs": 45.0,
  "activity": 0.3,
  "age": 46,
  "weight": 78.4,
  "hba1c": 7.4,
  "diabetes_type": "type2"
}
```

**Response (200 OK)**:
```json
{
  "model_version": "hybrid-gru-phys-1.0.0",
  "alpha_gru_weight": 0.38,
  "alpha_physiology_weight": 0.62,
  "forecasts": [
    {
      "horizon_minutes": 30,
      "hybrid_mg_dl": 172.4,
      "gru_mg_dl": 174.1,
      "lstm_mg_dl": 171.8,
      "physiological_mg_dl": 171.2,
      "lower_bound": 151.7,
      "upper_bound": 193.1
    },
    {
      "horizon_minutes": 60,
      "hybrid_mg_dl": 181.2,
      "gru_mg_dl": 184.0,
      "lstm_mg_dl": 179.5,
      "physiological_mg_dl": 179.8,
      "lower_bound": 159.5,
      "upper_bound": 202.9
    },
    {
      "horizon_minutes": 90,
      "hybrid_mg_dl": 178.6,
      "gru_mg_dl": 180.2,
      "lstm_mg_dl": 177.1,
      "physiological_mg_dl": 177.5,
      "lower_bound": 157.2,
      "upper_bound": 200.0
    },
    {
      "horizon_minutes": 120,
      "hybrid_mg_dl": 164.5,
      "gru_mg_dl": 166.0,
      "lstm_mg_dl": 163.2,
      "physiological_mg_dl": 163.8,
      "lower_bound": 144.8,
      "upper_bound": 184.2
    },
    {
      "horizon_minutes": 240,
      "hybrid_mg_dl": 138.2,
      "gru_mg_dl": 139.5,
      "lstm_mg_dl": 136.8,
      "physiological_mg_dl": 137.4,
      "lower_bound": 121.6,
      "upper_bound": 154.8
    },
    {
      "horizon_minutes": 360,
      "hybrid_mg_dl": 124.8,
      "gru_mg_dl": 126.1,
      "lstm_mg_dl": 123.5,
      "physiological_mg_dl": 124.0,
      "lower_bound": 109.8,
      "upper_bound": 139.8
    }
  ]
}
```

---

### 4.2 Glucose Model Benchmarks
`GET /api/v1/glucose/metrics`

Returns comparative validation performance (RMSE, MAE, MAPE, $R^2$) comparing the primary GRU model against the secondary LSTM model.

**Response (200 OK)**:
```json
{
  "horizons": [30, 60, 90, 120, 240, 360],
  "comparison": {
    "primary": "GRU",
    "secondary": "LSTM",
    "gru": {
      "30": { "rmse": 10.4, "mae": 7.8, "mape": 5.6, "r2": 0.94 },
      "60": { "rmse": 13.8, "mae": 10.5, "mape": 7.9, "r2": 0.91 }
    },
    "lstm": {
      "30": { "rmse": 11.2, "mae": 8.4, "mape": 6.1, "r2": 0.93 },
      "60": { "rmse": 14.9, "mae": 11.4, "mape": 8.6, "r2": 0.89 }
    }
  }
}
```

---

### 4.3 Complete Blood Count (CBC) Analysis
`POST /api/v1/cbc/analyze`

**Request Body**:
```json
{
  "hemoglobin": 10.2,
  "hematocrit": 31.5,
  "rbc": 3.6,
  "wbc": 7.4,
  "platelets": 235000,
  "neutrophils": 58.0,
  "lymphocytes": 30.0,
  "monocytes": 7.0,
  "eosinophils": 2.5,
  "basophils": 0.5
}
```

**Response (200 OK)**:
```json
{
  "scores": {
    "anemia_risk": 0.882,
    "infection_risk": 0.084,
    "bleeding_risk": 0.015,
    "inflammation_score": 0.285
  },
  "flags": [
    "Possible anemia — correlate with ferritin/MCV."
  ],
  "model": "XGBoost",
  "version": "1.0.0"
}
```

---

### 4.4 ECG Arrhythmia & Cardiac Risk Analysis
`POST /api/v1/ecg/analyze`

**Request Body**:
```json
{
  "heart_rate": 118,
  "pr_interval_ms": 90,
  "qrs_duration_ms": 95,
  "qt_interval_ms": 360,
  "qtc_interval_ms": 440,
  "st_segment_mm": 0.0,
  "t_wave": "normal"
}
```

**Response (200 OK)**:
```json
{
  "predicted_rhythm": "Atrial Fibrillation",
  "findings": [
    "Atrial Fibrillation",
    "Tachycardia"
  ],
  "cardiac_risk_score": 0.35,
  "arrhythmia_risk": 0.70,
  "waveform": [
    { "time_ms": 0.0, "voltage_mv": 0.05 },
    { "time_ms": 4.0, "voltage_mv": 0.12 }
  ],
  "model": "1D-CNN+BiLSTM surrogate (gradient boosting classifier on ECG features)",
  "version": "1.0.0"
}
```

---

### 4.5 Multi-Disease Risk Prediction & SHAP
`POST /api/v1/risk/predict`

**Request Body**:
```json
{
  "age": 46,
  "bmi": 27.8,
  "hba1c": 7.4,
  "mean_glucose": 148,
  "time_below_range": 0.032,
  "time_above_range": 0.254,
  "glucose_cv": 0.31,
  "systolic_bp": 128,
  "ldl": 118,
  "activity_hours": 3.5
}
```

**Response (200 OK)**:
```json
{
  "scores": {
    "hypoglycemia_risk": 0.124,
    "hyperglycemia_risk": 0.442,
    "hospitalization_risk": 0.185,
    "cardiovascular_risk": 0.348,
    "complication_risk": 0.381
  },
  "overall_level": "moderate",
  "feature_importance": {
    "time_above_range": 0.24,
    "hba1c": 0.21,
    "mean_glucose": 0.18
  },
  "shap_explanations": [
    { "feature": "time_above_range", "impact": 0.106 },
    { "feature": "hba1c", "impact": 0.093 },
    { "feature": "activity_hours", "impact": -0.045 }
  ],
  "model_version": "risk-ensemble-1.0.0"
}
```

---

### 4.6 What-If Treatment Simulation
`POST /api/v1/twin/simulate`

**Request Body**:
```json
{
  "start_glucose": 145,
  "insulin_delta": 0.2,
  "carb_delta": -0.15,
  "exercise_delta": 0.2,
  "medication_effect": 0.1,
  "hours": 6
}
```

**Response (200 OK)**:
```json
{
  "summary": "Scenario changes 6h glucose from 168.2 to 124.5 mg/dL (Δ -43.7).",
  "baseline": [{ "minute": 0, "glucose": 145.0 }, { "minute": 5, "glucose": 146.2 }],
  "simulated": [{ "minute": 0, "glucose": 145.0 }, { "minute": 5, "glucose": 143.8 }],
  "treatment_response": {
    "baseline_end_mg_dl": 168.2,
    "simulated_end_mg_dl": 124.5,
    "delta_mg_dl": -43.7
  }
}
```

---

### 4.7 Grounded Clinical RAG Assistant
`POST /api/v1/assistant`

**Request Body**:
```json
{
  "message": "Explain how my Time in Range of 71.4% aligns with clinical goals.",
  "glucose": 142.0
}
```

**Response (200 OK)**:
```json
{
  "answer": "According to the American Diabetes Association (ADA) consensus: For most adults with Type 1 or Type 2 diabetes, the target Time in Range (TIR, 70–180 mg/dL) is >70%. Your current reading is 71.4%, successfully meeting this goal. Current live glucose reading: 142.0 mg/dL. Always consult with your attending endocrinologist or care team before changing insulin or therapy.",
  "citations": [
    {
      "id": "cgm-targets",
      "title": "ADA Clinical CGM Consensus Targets"
    }
  ],
  "provider": "local-rag"
}
```

---

## 5. Administration & Audit Endpoints

### 5.1 Platform Overview (Admin Only)
`GET /api/v1/admin/overview`

**Response (200 OK)**:
```json
{
  "users": 12,
  "patients": 8,
  "audit_events": 148,
  "roles": {
    "patient": 8,
    "doctor": 3,
    "admin": 1
  }
}
```

### 5.2 Immutable Security Audit Log (Admin Only)
`GET /api/v1/admin/audit?page=1&page_size=25`

**Response (200 OK)**:
```json
{
  "total": 148,
  "items": [
    {
      "id": "a-981",
      "action": "glucose_predict",
      "resource": "glucose_predictions",
      "actor_id": "patient-01",
      "created_at": "2026-09-16T08:15:00Z"
    }
  ]
}
```
