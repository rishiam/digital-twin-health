import pytest
from fastapi.testclient import TestClient

from app.db import SessionLocal, init_db
from app.main import app
from app.seed import seed_if_empty


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    init_db()
    db = SessionLocal()
    try:
        seed_if_empty(db)
    finally:
        db.close()


client = TestClient(app)


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_login_and_dashboard():
    res = client.post("/api/v1/auth/login", json={"email": "patient@digitwin.health", "password": "Demo1234!"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    dash = client.get("/api/v1/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert dash.status_code == 200
    assert "kpis" in dash.json()


def test_glucose_predict():
    res = client.post("/api/v1/auth/login", json={"email": "patient@digitwin.health", "password": "Demo1234!"})
    token = res.json()["access_token"]
    pred = client.post(
        "/api/v1/glucose/predict",
        headers={"Authorization": f"Bearer {token}"},
        json={"recent_glucose": [120, 128, 140, 151], "insulin": 1.1, "carbs": 40, "activity": 0.3},
    )
    assert pred.status_code == 200
    assert len(pred.json()["forecasts"]) == 6


def test_cbc_analyze():
    res = client.post("/api/v1/auth/login", json={"email": "patient@digitwin.health", "password": "Demo1234!"})
    token = res.json()["access_token"]
    cbc = client.post(
        "/api/v1/cbc/analyze",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "hemoglobin": 13.5,
            "hematocrit": 40.2,
            "rbc": 4.5,
            "wbc": 7.2,
            "platelets": 240000,
            "neutrophils": 58.0,
            "lymphocytes": 30.0,
            "monocytes": 7.0,
            "eosinophils": 2.5,
            "basophils": 0.6,
        },
    )
    assert cbc.status_code == 200
    data = cbc.json()
    assert "scores" in data
    assert "anemia_risk" in data["scores"]
    assert "infection_risk" in data["scores"]


def test_ecg_analyze():
    res = client.post("/api/v1/auth/login", json={"email": "patient@digitwin.health", "password": "Demo1234!"})
    token = res.json()["access_token"]
    ecg = client.post(
        "/api/v1/ecg/analyze",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "heart_rate": 75,
            "pr_interval_ms": 160,
            "qrs_duration_ms": 90,
            "qt_interval_ms": 390,
            "qtc_interval_ms": 420,
            "st_segment_mm": 0.1,
            "t_wave": "normal",
        },
    )
    assert ecg.status_code == 200
    data = ecg.json()
    assert "predicted_rhythm" in data
    assert "cardiac_risk_score" in data
    assert "arrhythmia_risk" in data


def test_risk_predict():
    res = client.post("/api/v1/auth/login", json={"email": "patient@digitwin.health", "password": "Demo1234!"})
    token = res.json()["access_token"]
    risk = client.post(
        "/api/v1/risk/predict",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "age": 46,
            "bmi": 27.8,
            "hba1c": 7.4,
            "mean_glucose": 148,
            "time_below_range": 0.03,
            "time_above_range": 0.25,
            "glucose_cv": 0.31,
            "systolic_bp": 128,
            "ldl": 118,
            "activity_hours": 3.5,
        },
    )
    assert risk.status_code == 200
    data = risk.json()
    assert "scores" in data
    assert "shap_explanations" in data


def test_twin_simulate():
    res = client.post("/api/v1/auth/login", json={"email": "patient@digitwin.health", "password": "Demo1234!"})
    token = res.json()["access_token"]
    sim = client.post(
        "/api/v1/twin/simulate",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "start_glucose": 140,
            "insulin_delta": 0.2,
            "carb_delta": -0.1,
            "exercise_delta": 0.2,
            "medication_effect": 0.1,
            "hours": 6,
        },
    )
    assert sim.status_code == 200
    data = sim.json()
    assert "baseline" in data
    assert "simulated" in data


def test_assistant_rag():
    res = client.post("/api/v1/auth/login", json={"email": "patient@digitwin.health", "password": "Demo1234!"})
    token = res.json()["access_token"]
    rag = client.post(
        "/api/v1/assistant",
        headers={"Authorization": f"Bearer {token}"},
        json={"message": "What does my hemoglobin level indicate?", "glucose": 140},
    )
    assert rag.status_code == 200
    data = rag.json()
    assert "answer" in data
    assert "citations" in data


def test_admin_overview():
    res = client.post("/api/v1/auth/login", json={"email": "admin@digitwin.health", "password": "Demo1234!"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    admin = client.get("/api/v1/admin/overview", headers={"Authorization": f"Bearer {token}"})
    assert admin.status_code == 200
    assert "users" in admin.json()
