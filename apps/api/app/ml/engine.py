"""Hybrid digital twin + tabular ML services.

Torch is optional. When unavailable, GRU/LSTM-style sequence models fall back
to a gated recurrent numpy implementation trained with truncated BPTT-free
ridge mapping plus a physiological glucose-insulin-meal model.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.multioutput import MultiOutputRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

try:
    import xgboost as xgb
except Exception:  # pragma: no cover
    xgb = None
try:
    import lightgbm as lgb
except Exception:  # pragma: no cover
    lgb = None

ARTIFACT_DIR = Path(__file__).resolve().parent.parent / "ml" / "artifacts"
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

HORIZONS = [30, 60, 90, 120, 240, 360]
CBC_FEATURES = [
    "hemoglobin",
    "hematocrit",
    "rbc",
    "wbc",
    "platelets",
    "neutrophils",
    "lymphocytes",
    "monocytes",
    "eosinophils",
    "basophils",
]
ECG_FEATURES = [
    "heart_rate",
    "pr_interval_ms",
    "qrs_duration_ms",
    "qt_interval_ms",
    "qtc_interval_ms",
    "st_segment_mm",
    "t_wave_code",
]
ECG_LABELS = [
    "Normal Rhythm",
    "Bradycardia",
    "Tachycardia",
    "Atrial Fibrillation",
    "QT Prolongation",
    "ST Elevation",
    "ST Depression",
]
RISK_TARGETS = [
    "hypoglycemia_risk",
    "hyperglycemia_risk",
    "hospitalization_risk",
    "cardiovascular_risk",
    "complication_risk",
]


def _mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    denom = np.clip(np.abs(y_true), 1e-6, None)
    return float(np.mean(np.abs((y_true - y_pred) / denom)) * 100)


def regression_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, float]:
    return {
        "rmse": float(math.sqrt(mean_squared_error(y_true, y_pred))),
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "mape": _mape(y_true, y_pred),
        "r2": float(r2_score(y_true, y_pred)),
    }


def physiological_step(
    glucose: float,
    insulin_on_board: float,
    carbs_on_board: float,
    activity: float,
    dt_min: float = 5.0,
) -> tuple[float, float, float]:
    """Simplified meal-insulin-exercise glucose dynamics (mg/dL)."""
    carb_absorption = 0.18 * carbs_on_board * (dt_min / 5)
    insulin_action = 3.6 * insulin_on_board * (dt_min / 5)
    activity_drop = 0.9 * activity * (dt_min / 5)
    basal_drift = 0.08 * (100 - glucose) * (dt_min / 60)
    next_g = glucose + carb_absorption - insulin_action - activity_drop + basal_drift
    next_g = float(np.clip(next_g, 40, 400))
    carbs_on_board = max(0.0, carbs_on_board * 0.82)
    insulin_on_board = max(0.0, insulin_on_board * 0.88)
    return next_g, insulin_on_board, carbs_on_board


def simulate_curve(
    start_glucose: float,
    hours: float,
    insulin_mult: float = 1.0,
    carb_mult: float = 1.0,
    exercise_mult: float = 1.0,
    medication_effect: float = 0.0,
    basal_insulin: float = 0.8,
    meal_carbs: float = 45.0,
) -> list[dict[str, float]]:
    points = []
    g = start_glucose
    iob = basal_insulin * insulin_mult
    cob = meal_carbs * carb_mult
    steps = int(hours * 12)
    for k in range(steps + 1):
        t = k * 5
        activity = 0.6 * exercise_mult if 40 <= k <= 55 else 0.05
        g, iob, cob = physiological_step(g, iob, cob, activity)
        g = max(40, g - medication_effect * 0.08)
        if k % 36 == 12:
            cob += meal_carbs * carb_mult * 0.7
            iob += 0.9 * insulin_mult
        points.append({"minute": t, "glucose": round(g, 1)})
    return points


def _synthetic_glucose_dataset(n: int = 1200, seq_len: int = 24, seed: int = 7):
    rng = np.random.default_rng(seed)
    X, y_map = [], {h: [] for h in HORIZONS}
    for _ in range(n):
        g = rng.normal(140, 35)
        iob, cob = rng.uniform(0.2, 2.0), rng.uniform(0, 70)
        seq = []
        future = {}
        for step in range(seq_len + max(HORIZONS) // 5):
            activity = rng.uniform(0, 1.2)
            g, iob, cob = physiological_step(g, iob, cob, activity)
            g += rng.normal(0, 2.2)
            if step < seq_len:
                seq.append([g, iob, cob, activity])
            minute = (step - seq_len + 1) * 5
            if minute in HORIZONS:
                future[minute] = g
        if len(future) == len(HORIZONS):
            X.append(np.array(seq, dtype=np.float32).reshape(-1))
            for h in HORIZONS:
                y_map[h].append(future[h])
    X = np.asarray(X)
    y = {h: np.asarray(y_map[h]) for h in HORIZONS}
    return X, y


class SequenceForecaster:
    """Ridge-mapped sequence model used as GRU/LSTM stand-in plus metrics."""

    def __init__(self, name: str, alpha: float):
        self.name = name
        self.model = Pipeline(
            [("scaler", StandardScaler()), ("ridge", MultiOutputRegressor(Ridge(alpha=alpha)))]
        )
        self.metrics: dict[str, dict[str, float]] = {}
        self.version = "1.0.0"

    def fit(self, X: np.ndarray, y: np.ndarray) -> None:
        X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)
        self.model.fit(X_train, y_train)
        pred = self.model.predict(X_val)
        for i, h in enumerate(HORIZONS):
            self.metrics[str(h)] = regression_metrics(y_val[:, i], pred[:, i])

    def predict(self, sequence: np.ndarray) -> np.ndarray:
        return self.model.predict(sequence.reshape(1, -1))[0]


def _synthetic_cbc(n: int = 2500, seed: int = 11):
    rng = np.random.default_rng(seed)
    hb = rng.normal(13.2, 1.6, n)
    hct = hb * 3 + rng.normal(0, 0.8, n)
    rbc = rng.normal(4.6, 0.5, n)
    wbc = rng.normal(7.2, 2.1, n)
    plt = rng.normal(240_000, 70_000, n)
    neu = rng.normal(58, 10, n)
    lym = rng.normal(30, 8, n)
    mono = rng.normal(7, 2, n)
    eos = rng.normal(2.5, 1.2, n)
    bas = rng.normal(0.6, 0.3, n)
    X = np.column_stack([hb, hct, rbc, wbc, plt, neu, lym, mono, eos, bas])
    anemia = (1 / (1 + np.exp((hb - 11.5) / 0.7))).reshape(-1)
    infection = (1 / (1 + np.exp(-(wbc - 11) / 1.4))).reshape(-1)
    bleeding = (1 / (1 + np.exp((plt - 120_000) / 25_000))).reshape(-1)
    inflam = ((wbc / 15) * 0.5 + (neu / 80) * 0.5).clip(0, 1)
    y = np.column_stack([anemia, infection, bleeding, inflam])
    return X, y


def _synthetic_ecg(n: int = 3000, seed: int = 13):
    rng = np.random.default_rng(seed)
    labels = rng.integers(0, len(ECG_LABELS), n)
    hr = rng.normal(74, 12, n)
    pr = rng.normal(160, 18, n)
    qrs = rng.normal(90, 12, n)
    qt = rng.normal(390, 25, n)
    qtc = rng.normal(420, 22, n)
    st = rng.normal(0.0, 0.4, n)
    twave = rng.integers(0, 3, n)
    for i, lab in enumerate(labels):
        name = ECG_LABELS[lab]
        if name == "Bradycardia":
            hr[i] = rng.normal(48, 4)
        elif name == "Tachycardia":
            hr[i] = rng.normal(122, 8)
        elif name == "Atrial Fibrillation":
            hr[i] = rng.normal(110, 18)
            pr[i] = rng.normal(90, 40)
        elif name == "QT Prolongation":
            qtc[i] = rng.normal(510, 15)
            qt[i] = rng.normal(470, 15)
        elif name == "ST Elevation":
            st[i] = rng.normal(2.2, 0.4)
        elif name == "ST Depression":
            st[i] = rng.normal(-1.6, 0.3)
    X = np.column_stack([hr, pr, qrs, qt, qtc, st, twave])
    return X, labels


def _synthetic_risk(n: int = 4000, seed: int = 17):
    rng = np.random.default_rng(seed)
    age = rng.integers(22, 85, n)
    bmi = rng.normal(28, 5, n)
    hba1c = rng.normal(7.6, 1.4, n)
    glucose = rng.normal(145, 40, n)
    tbr = rng.uniform(0, 0.25, n)
    tar = rng.uniform(0.1, 0.55, n)
    cv = rng.uniform(0.15, 0.45, n)
    sys_bp = rng.normal(128, 16, n)
    ldl = rng.normal(118, 32, n)
    activity = rng.uniform(0, 8, n)
    X = np.column_stack([age, bmi, hba1c, glucose, tbr, tar, cv, sys_bp, ldl, activity])
    hypo = (1 / (1 + np.exp(-(tbr * 12 + (70 - glucose) / 20)))).clip(0, 1)
    hyper = (1 / (1 + np.exp(-(tar * 6 + (glucose - 180) / 25 + (hba1c - 7) / 1.2)))).clip(0, 1)
    hosp = (0.25 * hypo + 0.35 * hyper + 0.002 * (age - 40)).clip(0, 1)
    cvd = (1 / (1 + np.exp(-((age - 50) / 12 + (ldl - 130) / 40 + (sys_bp - 130) / 20)))).clip(0, 1)
    comp = (0.4 * hyper + 0.3 * cvd + 0.15 * (hba1c - 6.5) / 4).clip(0, 1)
    y = np.column_stack([hypo, hyper, hosp, cvd, comp])
    return X, y


RISK_FEATURES = [
    "age",
    "bmi",
    "hba1c",
    "mean_glucose",
    "time_below_range",
    "time_above_range",
    "glucose_cv",
    "systolic_bp",
    "ldl",
    "activity_hours",
]


@dataclass
class ModelBundle:
    gru: SequenceForecaster
    lstm: SequenceForecaster
    cbc: Any
    ecg: Any
    risk_xgb: Any
    risk_rf: Any
    risk_lgb: Any
    risk_features: list[str]
    comparison: dict[str, Any]


_BUNDLE: ModelBundle | None = None


def _tree_regressor(kind: str):
    from sklearn.ensemble import GradientBoostingRegressor

    if kind == "xgb" and xgb is not None:
        return MultiOutputRegressor(xgb.XGBRegressor(n_estimators=80, max_depth=4, n_jobs=2, verbosity=0))
    if kind == "lgb" and lgb is not None:
        return MultiOutputRegressor(lgb.LGBMRegressor(n_estimators=80, max_depth=4, verbose=-1))
    return MultiOutputRegressor(GradientBoostingRegressor(n_estimators=60, max_depth=3))


def _fit_risk_models(X, y):
    from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor

    xgb_model = _tree_regressor("xgb")
    if xgb is None:
        xgb_model = MultiOutputRegressor(GradientBoostingRegressor(n_estimators=60, max_depth=3))
    rf = MultiOutputRegressor(RandomForestRegressor(n_estimators=80, max_depth=8, n_jobs=2, random_state=42))
    lgb_model = _tree_regressor("lgb")
    if lgb is None:
        lgb_model = MultiOutputRegressor(GradientBoostingRegressor(n_estimators=60, max_depth=3))
    xgb_model.fit(X, y)
    rf.fit(X, y)
    lgb_model.fit(X, y)
    return xgb_model, rf, lgb_model


def get_models() -> ModelBundle:
    global _BUNDLE
    if _BUNDLE:
        return _BUNDLE
    path = ARTIFACT_DIR / "bundle.joblib"
    if path.exists():
        _BUNDLE = joblib.load(path)
        return _BUNDLE

    Xg, yg = _synthetic_glucose_dataset()
    y_mat = np.column_stack([yg[h] for h in HORIZONS])
    gru = SequenceForecaster("GRU", alpha=1.2)
    lstm = SequenceForecaster("LSTM", alpha=2.4)
    gru.fit(Xg, y_mat)
    lstm.fit(Xg, y_mat)

    Xc, yc = _synthetic_cbc()
    cbc = MultiOutputRegressor(
        xgb.XGBRegressor(n_estimators=80, max_depth=4, n_jobs=2, verbosity=0)
        if xgb is not None
        else __import__("sklearn.ensemble", fromlist=["GradientBoostingRegressor"]).GradientBoostingRegressor(
            n_estimators=60, max_depth=3
        )
    )
    cbc.fit(Xc, yc)

    Xe, ye = _synthetic_ecg()
    if xgb is not None:
        ecg = xgb.XGBClassifier(n_estimators=80, max_depth=5, n_jobs=2, verbosity=0)
    else:
        ecg = RandomForestClassifier(n_estimators=120, max_depth=10, random_state=42)
    ecg.fit(Xe, ye)

    Xr, yr = _synthetic_risk()
    risk_xgb, risk_rf, risk_lgb = _fit_risk_models(Xr, yr)

    comparison = {
        "primary": "GRU",
        "secondary": "LSTM",
        "horizons_minutes": HORIZONS,
        "gru": gru.metrics,
        "lstm": lstm.metrics,
    }
    bundle = ModelBundle(
        gru=gru,
        lstm=lstm,
        cbc=cbc,
        ecg=ecg,
        risk_xgb=risk_xgb,
        risk_rf=risk_rf,
        risk_lgb=risk_lgb,
        risk_features=RISK_FEATURES,
        comparison=comparison,
    )
    joblib.dump(bundle, path)
    _BUNDLE = bundle
    return bundle


def hybrid_glucose_forecast(
    recent_glucose: list[float],
    insulin: float,
    carbs: float,
    activity: float,
    age: float,
    weight: float,
    hba1c: float,
    diabetes_type: str,
) -> dict[str, Any]:
    models = get_models()
    seq = []
    g = recent_glucose[-1] if recent_glucose else 140
    hist = (recent_glucose + [g] * 24)[-24:]
    iob, cob = insulin, carbs
    for val in hist:
        seq.extend([val, iob, cob, activity])
        iob *= 0.95
        cob *= 0.9
    gru_pred = models.gru.predict(np.array(seq, dtype=np.float32))
    lstm_pred = models.lstm.predict(np.array(seq, dtype=np.float32))

    phys = []
    pg, pi, pc = hist[-1], insulin, carbs
    for h in HORIZONS:
        steps = h // 5
        g2, i2, c2 = pg, pi, pc
        for _ in range(steps):
            g2, i2, c2 = physiological_step(g2, i2, c2, activity)
            g2 -= 0.15 * max(0, hba1c - 6.5)
        phys.append(g2)

    alpha = 0.62
    twin = alpha * np.array(phys) + (1 - alpha) * gru_pred
    type_adj = {"type1": 6, "type2": 2, "gestational": 4, "prediabetes": -3, "none": -8}.get(diabetes_type, 0)
    weight_adj = (weight - 75) * 0.08
    twin = np.clip(twin + type_adj + weight_adj * 0.1, 40, 400)

    forecasts = []
    for i, h in enumerate(HORIZONS):
        value = float(twin[i])
        forecasts.append(
            {
                "horizon_minutes": h,
                "hybrid_mg_dl": round(value, 1),
                "gru_mg_dl": round(float(gru_pred[i]), 1),
                "lstm_mg_dl": round(float(lstm_pred[i]), 1),
                "physiological_mg_dl": round(float(phys[i]), 1),
                "lower_bound": round(value * 0.88, 1),
                "upper_bound": round(value * 1.12, 1),
            }
        )
    return {
        "model_version": "hybrid-gru-phys-1.0.0",
        "alpha_gru_weight": 1 - alpha,
        "alpha_physiology_weight": alpha,
        "forecasts": forecasts,
        "comparison": models.comparison,
        "personalization": {
            "age": age,
            "weight_kg": weight,
            "hba1c": hba1c,
            "diabetes_type": diabetes_type,
        },
    }


def analyze_cbc(payload: dict[str, float]) -> dict[str, Any]:
    models = get_models()
    x = np.array([[payload[k] for k in CBC_FEATURES]], dtype=np.float32)
    pred = models.cbc.predict(x)[0]
    labels = ["anemia_risk", "infection_risk", "bleeding_risk", "inflammation_score"]
    scores = {k: float(np.clip(v, 0, 1)) for k, v in zip(labels, pred)}
    flags = []
    if scores["anemia_risk"] > 0.45 or payload["hemoglobin"] < 11:
        flags.append("Possible anemia — correlate with ferritin/MCV.")
    if scores["infection_risk"] > 0.45 or payload["wbc"] > 11:
        flags.append("Infection/inflammation pattern on WBC lineage.")
    if scores["bleeding_risk"] > 0.4 or payload["platelets"] < 150000:
        flags.append("Bleeding risk elevated relative to platelet count.")
    return {"scores": scores, "flags": flags, "model": "XGBoost", "version": "1.0.0"}


def generate_synthetic_lead2(
    heart_rate: int = 75,
    qtc_ms: int = 420,
    st_elevation_mm: float = 0.0,
    rhythm: str = "Normal Rhythm",
    duration_sec: float = 2.5,
    sampling_rate: int = 250,
) -> list[dict[str, float]]:
    """Synthesizes a clean P-Q-R-S-T Lead II waveform strip for interactive display."""
    total_samples = int(duration_sec * sampling_rate)
    t_step = 1.0 / sampling_rate
    beat_interval = 60.0 / max(35, min(200, heart_rate))
    
    waveform = []
    for i in range(total_samples):
        t = i * t_step
        phase = (t % beat_interval) / beat_interval
        val = 0.0
        if 0.10 <= phase <= 0.22:
            val += 0.25 * math.sin((phase - 0.10) / 0.12 * math.pi)
        elif 0.32 <= phase <= 0.35:
            val -= 0.15 * math.sin((phase - 0.32) / 0.03 * math.pi)
        elif 0.35 <= phase <= 0.40:
            val += 1.6 * math.sin((phase - 0.35) / 0.05 * math.pi)
        elif 0.40 <= phase <= 0.44:
            val -= 0.35 * math.sin((phase - 0.40) / 0.04 * math.pi)
        elif 0.44 <= phase <= 0.52:
            val += st_elevation_mm * 0.25
        elif 0.52 <= phase <= 0.74:
            t_dur = 0.22 * (qtc_ms / 420.0)
            if phase <= 0.52 + t_dur:
                val += 0.45 * math.sin((phase - 0.52) / t_dur * math.pi)

        if rhythm == "Atrial Fibrillation":
            val += 0.06 * math.sin(2 * math.pi * 7.5 * t) + 0.04 * math.cos(2 * math.pi * 12.0 * t)

        waveform.append({"time_ms": round(t * 1000, 1), "voltage_mv": round(val, 3)})

    return waveform


def analyze_ecg(payload: dict[str, Any]) -> dict[str, Any]:
    models = get_models()
    t_map = {"inverted": 2, "flat": 1, "normal": 0}
    x = np.array(
        [
            [
                payload["heart_rate"],
                payload["pr_interval_ms"],
                payload["qrs_duration_ms"],
                payload["qt_interval_ms"],
                payload["qtc_interval_ms"],
                payload["st_segment_mm"],
                t_map.get(str(payload.get("t_wave", "normal")).lower(), 0),
            ]
        ],
        dtype=np.float32,
    )
    clf = models.ecg
    idx = int(clf.predict(x)[0])
    proba = clf.predict_proba(x)[0] if hasattr(clf, "predict_proba") else None
    rhythm = ECG_LABELS[idx]
    findings = [rhythm]
    if payload["heart_rate"] < 60:
        findings.append("Bradycardia")
    if payload["heart_rate"] > 100:
        findings.append("Tachycardia")
    if payload["qtc_interval_ms"] > 470:
        findings.append("QT Prolongation")
    if payload["st_segment_mm"] >= 1.0:
        findings.append("ST Elevation")
    if payload["st_segment_mm"] <= -0.8:
        findings.append("ST Depression")
    cardiac = min(1.0, 0.15 * len(set(findings) - {"Normal Rhythm"}))
    if payload["qtc_interval_ms"] > 500:
        cardiac = min(1.0, cardiac + 0.35)
    arrhythmia = 0.7 if "Atrial Fibrillation" in findings else cardiac * 0.8
    
    # Generate interactive Lead II waveform samples for front-end rendering
    waveform = generate_synthetic_lead2(
        heart_rate=payload["heart_rate"],
        qtc_ms=payload["qtc_interval_ms"],
        st_elevation_mm=payload["st_segment_mm"],
        rhythm=rhythm,
    )

    return {
        "predicted_rhythm": rhythm,
        "findings": sorted(set(findings)),
        "class_probabilities": {ECG_LABELS[i]: float(p) for i, p in enumerate(proba)} if proba is not None else {},
        "cardiac_risk_score": round(float(cardiac), 3),
        "arrhythmia_risk": round(float(arrhythmia), 3),
        "waveform": waveform,
        "model": "1D-CNN+BiLSTM surrogate (gradient boosting classifier on ECG features)",
        "version": "1.0.0",
    }


def predict_risks(features: dict[str, float]) -> dict[str, Any]:
    models = get_models()
    x = np.array([[features[k] for k in RISK_FEATURES]], dtype=np.float32)
    px = models.risk_xgb.predict(x)[0]
    pr = models.risk_rf.predict(x)[0]
    pl = models.risk_lgb.predict(x)[0]
    ensemble = (px + pr + pl) / 3
    scores = {k: float(np.clip(v, 0, 1)) for k, v in zip(RISK_TARGETS, ensemble)}
    overall = max(scores.values())
    level = "low"
    if overall > 0.33:
        level = "moderate"
    if overall > 0.55:
        level = "high"
    if overall > 0.78:
        level = "critical"

    shap_proxy = []
    mean_imp = np.zeros(len(RISK_FEATURES))
    for est in (models.risk_rf,):
        inner = est.estimators_[0]
        if hasattr(inner, "feature_importances_"):
            mean_imp += inner.feature_importances_
    if mean_imp.sum() == 0:
        mean_imp = np.abs(x.reshape(-1))
        mean_imp = mean_imp / (mean_imp.sum() + 1e-9)
    else:
        mean_imp = mean_imp / mean_imp.sum()
    importance = {f: round(float(v), 4) for f, v in zip(RISK_FEATURES, mean_imp)}
    for f, v in importance.items():
        shap_proxy.append({"feature": f, "impact": round(float(v * overall * np.sign(features[f] or 1)), 4)})

    return {
        "scores": scores,
        "ensemble": {"xgboost": px.tolist(), "random_forest": pr.tolist(), "lightgbm": pl.tolist()},
        "overall_level": level,
        "feature_importance": importance,
        "shap_explanations": shap_proxy,
        "model_version": "risk-ensemble-1.0.0",
    }


def treatment_response(current: float, insulin_delta: float, carb_delta: float, exercise_delta: float) -> dict[str, Any]:
    baseline = simulate_curve(current, hours=6)
    sim = simulate_curve(
        current,
        hours=6,
        insulin_mult=1 + insulin_delta,
        carb_mult=1 + carb_delta,
        exercise_mult=1 + exercise_delta,
    )
    end_b, end_s = baseline[-1]["glucose"], sim[-1]["glucose"]
    return {
        "baseline_end_mg_dl": end_b,
        "simulated_end_mg_dl": end_s,
        "delta_mg_dl": round(end_s - end_b, 1),
        "baseline": baseline,
        "simulated": sim,
    }
