from datetime import datetime, date
from typing import Optional
from uuid import uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    TypeDecorator,
    Uuid,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

import uuid


class GUID(TypeDecorator):
    """Platform-independent GUID/UUID type.
    Uses native UUID on PostgreSQL, CHAR(32) on SQLite.
    Accepts both str and uuid.UUID on binding, converting strings to uuid.UUID.
    Returns uuid.UUID so that PostgreSQL sentinel matching in insertmanyvalues works seamlessly.
    """
    impl = Uuid
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, uuid.UUID):
            return value
        try:
            return uuid.UUID(str(value))
        except (ValueError, TypeError, AttributeError):
            return value

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, uuid.UUID):
            return value
        try:
            return uuid.UUID(str(value))
        except (ValueError, TypeError, AttributeError):
            return value


def uid() -> uuid.UUID:
    return uuid4()


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=uid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    full_name: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(32), default="patient")
    supabase_uid: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, unique=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    patient: Mapped[Optional["Patient"]] = relationship(
        back_populates="user",
        foreign_keys="[Patient.user_id]",
        uselist=False,
    )


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=uid)
    user_id: Mapped[Optional[str]] = mapped_column(GUID, ForeignKey("users.id"), nullable=True)
    mrn: Mapped[Optional[str]] = mapped_column(String(64), unique=True, nullable=True)
    date_of_birth: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    sex: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    assigned_doctor_id: Mapped[Optional[str]] = mapped_column(GUID, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped[Optional[User]] = relationship(back_populates="patient", foreign_keys=[user_id])
    profile: Mapped[Optional["PatientProfile"]] = relationship(back_populates="patient", uselist=False)


class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=uid)
    patient_id: Mapped[str] = mapped_column(GUID, ForeignKey("patients.id"), unique=True)
    age: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    weight_kg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    height_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    bmi: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    hba1c: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    diabetes_type: Mapped[str] = mapped_column(String(32), default="type2")
    years_since_diagnosis: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    comorbidities: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    patient: Mapped[Patient] = relationship(back_populates="profile")


class CgmReading(Base):
    __tablename__ = "cgm_readings"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=uid)
    patient_id: Mapped[str] = mapped_column(GUID, ForeignKey("patients.id"), index=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    glucose_mg_dl: Mapped[float] = mapped_column(Float)
    trend: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    source: Mapped[str] = mapped_column(String(32), default="cgm")


class Medication(Base):
    __tablename__ = "medications"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=uid)
    patient_id: Mapped[str] = mapped_column(GUID, ForeignKey("patients.id"), index=True)
    name: Mapped[str] = mapped_column(String(128))
    dose: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    frequency: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class InsulinRecord(Base):
    __tablename__ = "insulin_records"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=uid)
    patient_id: Mapped[str] = mapped_column(GUID, ForeignKey("patients.id"), index=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    insulin_type: Mapped[str] = mapped_column(String(64))
    units: Mapped[float] = mapped_column(Float)


class MealRecord(Base):
    __tablename__ = "meal_records"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=uid)
    patient_id: Mapped[str] = mapped_column(GUID, ForeignKey("patients.id"), index=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    carbs_g: Mapped[float] = mapped_column(Float)
    protein_g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    fat_g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    meal_type: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)


class ActivityRecord(Base):
    __tablename__ = "activity_records"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=uid)
    patient_id: Mapped[str] = mapped_column(GUID, ForeignKey("patients.id"), index=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    activity_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    duration_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    intensity: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    calories: Mapped[Optional[float]] = mapped_column(Float, nullable=True)


class CbcResult(Base):
    __tablename__ = "cbc_results"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=uid)
    patient_id: Mapped[str] = mapped_column(GUID, ForeignKey("patients.id"), index=True)
    collected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    hemoglobin: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    hematocrit: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    rbc: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    wbc: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    platelets: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    neutrophils: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lymphocytes: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    monocytes: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    eosinophils: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    basophils: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    anemia_risk: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    infection_risk: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    bleeding_risk: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    inflammation_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)


class EcgResult(Base):
    __tablename__ = "ecg_results"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=uid)
    patient_id: Mapped[str] = mapped_column(GUID, ForeignKey("patients.id"), index=True)
    collected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    heart_rate: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    pr_interval_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    qrs_duration_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    qt_interval_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    qtc_interval_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    st_segment_mm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    t_wave: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    predicted_rhythm: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    cardiac_risk_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    arrhythmia_risk: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    findings: Mapped[list] = mapped_column(JSON, default=list)


class RiskScore(Base):
    __tablename__ = "risk_scores"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=uid)
    patient_id: Mapped[str] = mapped_column(GUID, ForeignKey("patients.id"), index=True)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    hypoglycemia_risk: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    hyperglycemia_risk: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    hospitalization_risk: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    cardiovascular_risk: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    complication_risk: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    overall_level: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    shap_values: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    feature_importance: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    model_version: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)


class GlucosePrediction(Base):
    __tablename__ = "glucose_predictions"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=uid)
    patient_id: Mapped[str] = mapped_column(GUID, ForeignKey("patients.id"), index=True)
    predicted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    horizon_minutes: Mapped[int] = mapped_column(Integer)
    predicted_mg_dl: Mapped[float] = mapped_column(Float)
    lower_bound: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    upper_bound: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    model_name: Mapped[str] = mapped_column(String(64))
    model_version: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    metrics: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)


class SimulationResult(Base):
    __tablename__ = "simulation_results"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=uid)
    patient_id: Mapped[str] = mapped_column(GUID, ForeignKey("patients.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    scenario: Mapped[dict] = mapped_column(JSON)
    baseline_curve: Mapped[list] = mapped_column(JSON)
    simulated_curve: Mapped[list] = mapped_column(JSON)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class Recommendation(Base):
    __tablename__ = "recommendations"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=uid)
    patient_id: Mapped[str] = mapped_column(GUID, ForeignKey("patients.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    category: Mapped[str] = mapped_column(String(64))
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text)
    priority: Mapped[str] = mapped_column(String(16), default="medium")
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=uid)
    patient_id: Mapped[str] = mapped_column(GUID, ForeignKey("patients.id"), index=True)
    created_by: Mapped[Optional[str]] = mapped_column(GUID, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    title: Mapped[str] = mapped_column(String(255))
    report_type: Mapped[str] = mapped_column(String(64))
    content: Mapped[dict] = mapped_column(JSON)
    storage_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=uid)
    patient_id: Mapped[str] = mapped_column(GUID, ForeignKey("patients.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    severity: Mapped[str] = mapped_column(String(16))
    title: Mapped[str] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(Text)
    is_acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(GUID, ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=uid)
    actor_id: Mapped[Optional[str]] = mapped_column(GUID, ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(64))
    resource: Mapped[str] = mapped_column(String(64))
    resource_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    metadata_json: Mapped[Optional[dict]] = mapped_column("metadata", JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class ModelRegistry(Base):
    __tablename__ = "model_registry"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=uid)
    name: Mapped[str] = mapped_column(String(128))
    version: Mapped[str] = mapped_column(String(32))
    task: Mapped[str] = mapped_column(String(64))
    metrics: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    artifact_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
