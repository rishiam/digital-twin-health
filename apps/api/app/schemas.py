from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, Field


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: str
    email: EmailStr
    patient_id: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str
    role: str = "patient"


class UserOut(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class Pagination(BaseModel):
    page: int = 1
    page_size: int = 20
    total: int
    items: list[Any]


class CbcIn(BaseModel):
    hemoglobin: float
    hematocrit: float
    rbc: float
    wbc: float
    platelets: float
    neutrophils: float
    lymphocytes: float
    monocytes: float
    eosinophils: float
    basophils: float


class EcgIn(BaseModel):
    heart_rate: int
    pr_interval_ms: int
    qrs_duration_ms: int
    qt_interval_ms: int
    qtc_interval_ms: int
    st_segment_mm: float
    t_wave: str = "normal"


class GlucosePredictIn(BaseModel):
    recent_glucose: list[float] = Field(min_length=1)
    insulin: float = 1.0
    carbs: float = 45
    activity: float = 0.4
    age: float = 46
    weight: float = 78
    hba1c: float = 7.4
    diabetes_type: str = "type2"


class RiskIn(BaseModel):
    age: float
    bmi: float
    hba1c: float
    mean_glucose: float
    time_below_range: float
    time_above_range: float
    glucose_cv: float
    systolic_bp: float
    ldl: float
    activity_hours: float


class SimulationIn(BaseModel):
    start_glucose: float = 140
    insulin_delta: float = 0.0
    carb_delta: float = 0.0
    exercise_delta: float = 0.0
    medication_effect: float = 0.0
    hours: float = 6


class AssistantIn(BaseModel):
    message: str
    glucose: Optional[float] = None
    risks: Optional[dict[str, Any]] = None


class ProfileUpdateIn(BaseModel):
    age: Optional[int] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    bmi: Optional[float] = None
    hba1c: Optional[float] = None
    diabetes_type: Optional[str] = "type2"
    years_since_diagnosis: Optional[float] = None
    comorbidities: Optional[list[str]] = None


class ReportCreateIn(BaseModel):
    title: str
    report_type: str = "clinical_summary"
    content: dict[str, Any]
