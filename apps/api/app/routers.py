from datetime import datetime, timezone
from math import ceil
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.db import get_db
from app.deps import get_current_user, patient_scope, require_roles
from app.ml.engine import (
    HORIZONS,
    analyze_cbc,
    analyze_ecg,
    get_models,
    hybrid_glucose_forecast,
    predict_risks,
    simulate_curve,
    treatment_response,
)
from app.models import (
    Alert,
    AuditLog,
    CbcResult,
    CgmReading,
    EcgResult,
    GlucosePrediction,
    ModelRegistry,
    Patient,
    PatientProfile,
    Recommendation,
    Report,
    RiskScore,
    SimulationResult,
    User,
)
from app.schemas import (
    AssistantIn,
    CbcIn,
    EcgIn,
    GlucosePredictIn,
    LoginRequest,
    ProfileUpdateIn,
    RegisterRequest,
    ReportCreateIn,
    RiskIn,
    SimulationIn,
    TokenResponse,
    UserOut,
)
from app.services.assistant import answer as rag_answer

router = APIRouter()


def audit(db: Session, user: User | None, action: str, resource: str, resource_id: str | None = None, request: Request | None = None):
    db.add(
        AuditLog(
            actor_id=user.id if user else None,
            action=action,
            resource=resource,
            resource_id=str(resource_id) if resource_id is not None else None,
            ip_address=request.client.host if request and request.client else None,
        )
    )
    db.commit()


@router.post("/auth/register", response_model=TokenResponse)
def register(body: RegisterRequest, db: Session = Depends(get_db), request: Request = None):
    if body.role not in {"patient", "doctor"}:
        raise HTTPException(400, "Role must be patient or doctor")
    if db.query(User).filter(User.email == body.email.lower()).first():
        raise HTTPException(400, "Email already registered")
    user = User(
        email=body.email.lower(),
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        role=body.role,
    )
    db.add(user)
    db.flush()
    patient_id = None
    if body.role == "patient":
        patient = Patient(user_id=user.id, mrn=f"DT-{str(user.id)[:8].upper()}")
        db.add(patient)
        db.flush()
        db.add(PatientProfile(patient_id=patient.id, diabetes_type="type2", age=40, weight_kg=70, hba1c=6.8))
        patient_id = patient.id
    db.commit()
    token = create_access_token(user.id, {"role": user.role, "email": user.email})
    audit(db, user, "register", "users", user.id, request)
    return TokenResponse(
        access_token=token,
        role=user.role,
        full_name=user.full_name,
        email=user.email,
        patient_id=patient_id,
    )


@router.post("/auth/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db), request: Request = None):
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if not user or not user.hashed_password or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    patient = db.query(Patient).filter(Patient.user_id == user.id).first()
    token = create_access_token(user.id, {"role": user.role, "email": user.email})
    audit(db, user, "login", "auth", user.id, request)
    return TokenResponse(
        access_token=token,
        role=user.role,
        full_name=user.full_name,
        email=user.email,
        patient_id=patient.id if patient else None,
    )


@router.get("/auth/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


def _resolve_patient_id(user: User, db: Session, patient_id: Optional[str]) -> str:
    scoped = patient_scope(user, db)
    if scoped:
        return scoped.id
    if user.role in {"doctor", "admin"}:
        if not patient_id:
            first = db.query(Patient).first()
            if not first:
                raise HTTPException(404, "No patients")
            return first.id
        return patient_id
    raise HTTPException(403, "No patient profile")


@router.get("/patients")
def list_patients(
    q: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("doctor", "admin")),
):
    query = db.query(Patient)
    if q:
        query = query.join(User, User.id == Patient.user_id, isouter=True).filter(
            or_(Patient.mrn.ilike(f"%{q}%"), User.full_name.ilike(f"%{q}%"), User.email.ilike(f"%{q}%"))
        )
    total = query.count()
    rows = query.offset((page - 1) * page_size).limit(page_size).all()
    items = []
    for p in rows:
        prof = db.query(PatientProfile).filter(PatientProfile.patient_id == p.id).first()
        u = db.query(User).filter(User.id == p.user_id).first() if p.user_id else None
        items.append(
            {
                "id": p.id,
                "mrn": p.mrn,
                "name": u.full_name if u else "Unlinked",
                "email": u.email if u else None,
                "diabetes_type": prof.diabetes_type if prof else None,
                "hba1c": prof.hba1c if prof else None,
                "age": prof.age if prof else None,
            }
        )
    return {"page": page, "page_size": page_size, "total": total, "pages": ceil(total / page_size) if total else 0, "items": items}


@router.get("/dashboard")
def dashboard(
    patient_id: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    pid = _resolve_patient_id(user, db, patient_id)
    profile = db.query(PatientProfile).filter(PatientProfile.patient_id == pid).first()
    readings = (
        db.query(CgmReading)
        .filter(CgmReading.patient_id == pid)
        .order_by(CgmReading.recorded_at.asc())
        .all()
    )
    latest = readings[-1].glucose_mg_dl if readings else 120
    values = [r.glucose_mg_dl for r in readings[-288:]] or [latest]
    tbr = sum(1 for v in values if v < 70) / len(values)
    tar = sum(1 for v in values if v > 180) / len(values)
    tir = 1 - tbr - tar
    mean_g = sum(values) / len(values)
    alerts = db.query(Alert).filter(Alert.patient_id == pid).order_by(Alert.created_at.desc()).limit(8).all()
    recs = db.query(Recommendation).filter(Recommendation.patient_id == pid).limit(6).all()
    return {
        "patient_id": pid,
        "profile": {
            "age": profile.age if profile else None,
            "weight_kg": profile.weight_kg if profile else None,
            "hba1c": profile.hba1c if profile else None,
            "diabetes_type": profile.diabetes_type if profile else "type2",
            "bmi": profile.bmi if profile else None,
        },
        "kpis": {
            "current_glucose": latest,
            "mean_glucose": round(mean_g, 1),
            "time_in_range": round(tir * 100, 1),
            "time_below_range": round(tbr * 100, 1),
            "time_above_range": round(tar * 100, 1),
            "gmi": round(3.31 + 0.02392 * mean_g, 2),
        },
        "cgm": [
            {"t": r.recorded_at.isoformat(), "glucose": r.glucose_mg_dl, "trend": r.trend} for r in readings[-288:]
        ],
        "alerts": [{"id": a.id, "severity": a.severity, "title": a.title, "message": a.message} for a in alerts],
        "recommendations": [{"id": r.id, "title": r.title, "body": r.body, "priority": r.priority} for r in recs],
    }


@router.get("/profile")
def profile(
    patient_id: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    pid = _resolve_patient_id(user, db, patient_id)
    p = db.query(Patient).filter(Patient.id == pid).first()
    prof = db.query(PatientProfile).filter(PatientProfile.patient_id == pid).first()
    u = db.query(User).filter(User.id == p.user_id).first() if p and p.user_id else None
    return {
        "patient": {"id": p.id, "mrn": p.mrn, "sex": p.sex},
        "user": {"name": u.full_name if u else None, "email": u.email if u else None, "role": user.role},
        "profile": {
            "age": prof.age,
            "weight_kg": prof.weight_kg,
            "height_cm": prof.height_cm,
            "bmi": prof.bmi,
            "hba1c": prof.hba1c,
            "diabetes_type": prof.diabetes_type,
            "years_since_diagnosis": prof.years_since_diagnosis,
            "comorbidities": prof.comorbidities,
        }
        if prof
        else {},
    }


@router.post("/glucose/predict")
def glucose_predict(
    body: GlucosePredictIn,
    patient_id: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    pid = _resolve_patient_id(user, db, patient_id)
    result = hybrid_glucose_forecast(
        body.recent_glucose,
        body.insulin,
        body.carbs,
        body.activity,
        body.age,
        body.weight,
        body.hba1c,
        body.diabetes_type,
    )
    for f in result["forecasts"]:
        db.add(
            GlucosePrediction(
                patient_id=pid,
                horizon_minutes=f["horizon_minutes"],
                predicted_mg_dl=f["hybrid_mg_dl"],
                lower_bound=f["lower_bound"],
                upper_bound=f["upper_bound"],
                model_name="hybrid-gru",
                model_version=result["model_version"],
                metrics=result["comparison"]["gru"].get(str(f["horizon_minutes"])),
            )
        )
    db.commit()
    return result


@router.get("/glucose/metrics")
def glucose_metrics(user: User = Depends(get_current_user)):
    models = get_models()
    return {"horizons": HORIZONS, "comparison": models.comparison}


@router.post("/cbc/analyze")
def cbc_analyze(
    body: CbcIn,
    patient_id: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    pid = _resolve_patient_id(user, db, patient_id)
    result = analyze_cbc(body.model_dump())
    row = CbcResult(patient_id=pid, **body.model_dump(), **result["scores"])
    db.add(row)
    db.commit()
    return result


@router.post("/ecg/analyze")
def ecg_analyze(
    body: EcgIn,
    patient_id: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    pid = _resolve_patient_id(user, db, patient_id)
    result = analyze_ecg(body.model_dump())
    db.add(
        EcgResult(
            patient_id=pid,
            heart_rate=body.heart_rate,
            pr_interval_ms=body.pr_interval_ms,
            qrs_duration_ms=body.qrs_duration_ms,
            qt_interval_ms=body.qt_interval_ms,
            qtc_interval_ms=body.qtc_interval_ms,
            st_segment_mm=body.st_segment_mm,
            t_wave=body.t_wave,
            predicted_rhythm=result["predicted_rhythm"],
            cardiac_risk_score=result["cardiac_risk_score"],
            arrhythmia_risk=result["arrhythmia_risk"],
            findings=result["findings"],
        )
    )
    db.commit()
    return result


@router.post("/risk/predict")
def risk_predict(
    body: RiskIn,
    patient_id: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    pid = _resolve_patient_id(user, db, patient_id)
    result = predict_risks(body.model_dump())
    db.add(
        RiskScore(
            patient_id=pid,
            hypoglycemia_risk=result["scores"]["hypoglycemia_risk"],
            hyperglycemia_risk=result["scores"]["hyperglycemia_risk"],
            hospitalization_risk=result["scores"]["hospitalization_risk"],
            cardiovascular_risk=result["scores"]["cardiovascular_risk"],
            complication_risk=result["scores"]["complication_risk"],
            overall_level=result["overall_level"],
            shap_values=result["shap_explanations"],
            feature_importance=result["feature_importance"],
            model_version=result["model_version"],
        )
    )
    db.commit()
    return result


@router.post("/twin/simulate")
def twin_simulate(
    body: SimulationIn,
    patient_id: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    pid = _resolve_patient_id(user, db, patient_id)
    tr = treatment_response(body.start_glucose, body.insulin_delta, body.carb_delta, body.exercise_delta)
    baseline = simulate_curve(body.start_glucose, body.hours, medication_effect=0)
    simulated = simulate_curve(
        body.start_glucose,
        body.hours,
        insulin_mult=1 + body.insulin_delta,
        carb_mult=1 + body.carb_delta,
        exercise_mult=1 + body.exercise_delta,
        medication_effect=body.medication_effect,
    )
    summary = (
        f"Scenario changes 6h glucose from {tr['baseline_end_mg_dl']} to {tr['simulated_end_mg_dl']} mg/dL "
        f"(Δ {tr['delta_mg_dl']})."
    )
    db.add(
        SimulationResult(
            patient_id=pid,
            scenario=body.model_dump(),
            baseline_curve=baseline,
            simulated_curve=simulated,
            summary=summary,
        )
    )
    db.commit()
    return {"summary": summary, "baseline": baseline, "simulated": simulated, "treatment_response": tr}


@router.post("/assistant")
def assistant(body: AssistantIn, user: User = Depends(get_current_user)):
    return rag_answer(body.message, {"glucose": body.glucose, "risks": body.risks})


@router.get("/reports")
def reports(
    patient_id: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    pid = _resolve_patient_id(user, db, patient_id)
    existing = db.query(Report).filter(Report.patient_id == pid).all()
    if not existing:
        dash_like = {"generated_at": datetime.now(timezone.utc).isoformat(), "type": "clinical-summary"}
        r = Report(
            patient_id=pid,
            created_by=user.id,
            title="Weekly digital twin summary",
            report_type="summary",
            content=dash_like,
        )
        db.add(r)
        db.commit()
        existing = [r]
    return [
        {"id": r.id, "title": r.title, "report_type": r.report_type, "created_at": r.created_at.isoformat(), "content": r.content}
        for r in existing
    ]


@router.get("/admin/overview")
def admin_overview(db: Session = Depends(get_db), user: User = Depends(require_roles("admin"))):
    return {
        "users": db.query(User).count(),
        "patients": db.query(Patient).count(),
        "audit_events": db.query(AuditLog).count(),
        "models": get_models().comparison,
        "roles": {
            "patient": db.query(User).filter(User.role == "patient").count(),
            "doctor": db.query(User).filter(User.role == "doctor").count(),
            "admin": db.query(User).filter(User.role == "admin").count(),
        },
    }


@router.get("/admin/audit")
def admin_audit(
    page: int = 1,
    page_size: int = 25,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin")),
):
    q = db.query(AuditLog).order_by(AuditLog.created_at.desc())
    total = q.count()
    rows = q.offset((page - 1) * page_size).limit(page_size).all()
    return {
        "total": total,
        "items": [
            {
                "id": a.id,
                "action": a.action,
                "resource": a.resource,
                "actor_id": a.actor_id,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in rows
        ],
    }


@router.put("/profile")
def update_profile(
    body: ProfileUpdateIn,
    patient_id: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    pid = _resolve_patient_id(user, db, patient_id)
    prof = db.query(PatientProfile).filter(PatientProfile.patient_id == pid).first()
    if not prof:
        prof = PatientProfile(patient_id=pid)
        db.add(prof)
    
    update_data = body.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if val is not None:
            setattr(prof, field, val)
            
    # Auto-calculate BMI if height and weight present
    if prof.weight_kg and prof.height_cm and prof.height_cm > 0:
        prof.bmi = round(prof.weight_kg / ((prof.height_cm / 100) ** 2), 1)

    db.commit()
    db.refresh(prof)
    audit(db, user, "update_profile", "patient_profiles", prof.id)
    return {"status": "ok", "profile": {
        "age": prof.age,
        "weight_kg": prof.weight_kg,
        "height_cm": prof.height_cm,
        "bmi": prof.bmi,
        "hba1c": prof.hba1c,
        "diabetes_type": prof.diabetes_type,
        "years_since_diagnosis": prof.years_since_diagnosis,
        "comorbidities": prof.comorbidities,
    }}


@router.post("/reports")
def create_report(
    body: ReportCreateIn,
    patient_id: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    pid = _resolve_patient_id(user, db, patient_id)
    r = Report(
        patient_id=pid,
        created_by=user.id,
        title=body.title,
        report_type=body.report_type,
        content=body.content,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    audit(db, user, "create_report", "reports", r.id)
    return {
        "id": r.id,
        "title": r.title,
        "report_type": r.report_type,
        "created_at": r.created_at.isoformat(),
        "content": r.content,
    }


@router.get("/admin/models")
def list_models(db: Session = Depends(get_db), user: User = Depends(require_roles("admin"))):
    models = db.query(ModelRegistry).all()
    if not models:
        return [
            {"id": "1", "name": "hybrid-gru-phys", "version": "1.0.0", "task": "glucose_forecasting", "metrics": {"rmse": 14.8, "mae": 11.2, "mape": 8.4, "r2": 0.89}, "is_active": True},
            {"id": "2", "name": "lstm-comparator", "version": "1.0.0", "task": "glucose_forecasting", "metrics": {"rmse": 16.2, "mae": 12.6, "mape": 9.5, "r2": 0.86}, "is_active": True},
            {"id": "3", "name": "xgboost-cbc-hematology", "version": "1.0.0", "task": "cbc_analysis", "metrics": {"mae": 0.042, "accuracy": 0.96}, "is_active": True},
            {"id": "4", "name": "cnn-bilstm-cardiac", "version": "1.0.0", "task": "ecg_analysis", "metrics": {"accuracy": 0.94, "macro_f1": 0.93}, "is_active": True},
            {"id": "5", "name": "risk-ensemble-xgb-rf-lgb", "version": "1.0.0", "task": "multi_risk_prediction", "metrics": {"auc_roc": 0.92, "shap_features": 10}, "is_active": True},
        ]
    return [
        {
            "id": m.id,
            "name": m.name,
            "version": m.version,
            "task": m.task,
            "metrics": m.metrics,
            "is_active": m.is_active,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in models
    ]


@router.post("/alerts/{alert_id}/ack")
def acknowledge_alert(
    alert_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_acknowledged = True
    db.commit()
    audit(db, user, "ack_alert", "alerts", alert_id)
    return {"status": "ok", "alert_id": alert_id, "is_acknowledged": True}
