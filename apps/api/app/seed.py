from datetime import datetime, timedelta, timezone
from random import Random

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import (
    ActivityRecord,
    Alert,
    CbcResult,
    CgmReading,
    EcgResult,
    InsulinRecord,
    MealRecord,
    Medication,
    Patient,
    PatientProfile,
    Recommendation,
    User,
)


def seed_if_empty(db: Session) -> None:
    if db.query(User).first():
        return

    doctor = User(
        email="doctor@digitwin.health",
        hashed_password=hash_password("Demo1234!"),
        full_name="Dr. Maya Chen",
        role="doctor",
    )
    admin = User(
        email="admin@digitwin.health",
        hashed_password=hash_password("Demo1234!"),
        full_name="Alex Rivera",
        role="admin",
    )
    patient_user = User(
        email="patient@digitwin.health",
        hashed_password=hash_password("Demo1234!"),
        full_name="Jordan Hale",
        role="patient",
    )
    db.add_all([doctor, admin, patient_user])
    db.flush()

    patient = Patient(
        user_id=patient_user.id,
        mrn="DT-100042",
        sex="female",
        assigned_doctor_id=doctor.id,
    )
    db.add(patient)
    db.flush()

    db.add(
        PatientProfile(
            patient_id=patient.id,
            age=46,
            weight_kg=78.4,
            height_cm=168,
            bmi=27.8,
            hba1c=7.4,
            diabetes_type="type2",
            years_since_diagnosis=6.5,
            comorbidities=["hypertension", "dyslipidemia"],
        )
    )
    db.add(Medication(patient_id=patient.id, name="Metformin", dose="1000 mg", frequency="BID"))
    db.add(Medication(patient_id=patient.id, name="Empagliflozin", dose="10 mg", frequency="QD"))

    rng = Random(42)
    now = datetime.now(timezone.utc)
    glucose = 142.0
    for i in range(288):  # 24h of 5-min CGM
        t = now - timedelta(minutes=5 * (287 - i))
        meal_bump = 28 if i % 72 in (36, 72 // 2) else 0
        insulin_drop = 18 if i % 72 == 40 else 0
        glucose = max(62, min(280, glucose + rng.gauss(0, 4.5) + meal_bump - insulin_drop - 0.15))
        trend = "flat"
        if meal_bump:
            trend = "rising"
        if insulin_drop:
            trend = "falling"
        db.add(CgmReading(patient_id=patient.id, recorded_at=t, glucose_mg_dl=round(glucose, 1), trend=trend))

    db.add(InsulinRecord(patient_id=patient.id, recorded_at=now - timedelta(hours=3), insulin_type="bolus", units=6.5))
    db.add(MealRecord(patient_id=patient.id, recorded_at=now - timedelta(hours=3, minutes=10), carbs_g=55, protein_g=22, fat_g=12, meal_type="lunch"))
    db.add(ActivityRecord(patient_id=patient.id, recorded_at=now - timedelta(hours=5), activity_type="brisk walk", duration_min=32, intensity="moderate", calories=180))
    db.add(
        CbcResult(
            patient_id=patient.id,
            hemoglobin=12.1,
            hematocrit=36.4,
            rbc=4.1,
            wbc=7.8,
            platelets=214000,
            neutrophils=58,
            lymphocytes=31,
            monocytes=7,
            eosinophils=3,
            basophils=1,
        )
    )
    db.add(
        EcgResult(
            patient_id=patient.id,
            heart_rate=78,
            pr_interval_ms=162,
            qrs_duration_ms=92,
            qt_interval_ms=390,
            qtc_interval_ms=428,
            st_segment_mm=0.2,
            t_wave="normal",
            predicted_rhythm="Normal Rhythm",
        )
    )
    db.add(
        Alert(
            patient_id=patient.id,
            severity="moderate",
            title="Post-prandial excursion",
            message="Glucose rose above 180 mg/dL after lunch. Consider meal timing and bolus adjustment.",
        )
    )
    db.add(
        Recommendation(
            patient_id=patient.id,
            category="nutrition",
            title="Flatten the lunch spike",
            body="Pair 15–20g of protein with lunch carbohydrates and walk 10 minutes after meals.",
            priority="high",
        )
    )
    db.commit()
