-- =============================================================================
-- DigiTwin Health — Production PostgreSQL Schema (Supabase Compatible)
-- Includes: 18 Tables, Extensions, Custom Types, Updated_at Triggers,
-- Row Level Security (RLS) Policies, Indexes, and Initial Clinical Demo Seeds.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE diabetes_type AS ENUM ('none', 'type1', 'type2', 'gestational', 'prediabetes');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE risk_level AS ENUM ('low', 'moderate', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- Helper Trigger Function for updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 1. Users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    hashed_password TEXT,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'patient',
    supabase_uid TEXT UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 2. Patients
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    mrn TEXT UNIQUE,
    date_of_birth DATE,
    sex TEXT CHECK (sex IN ('female', 'male', 'other', 'unknown')),
    assigned_doctor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients (user_id);
CREATE INDEX IF NOT EXISTS idx_patients_assigned_doctor ON patients (assigned_doctor_id);

DROP TRIGGER IF EXISTS trg_patients_updated_at ON patients;
CREATE TRIGGER trg_patients_updated_at
    BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 3. Patient Profiles (Metabolic / Clinical baseline)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL UNIQUE REFERENCES patients(id) ON DELETE CASCADE,
    age INTEGER CHECK (age >= 0 AND age <= 130),
    weight_kg NUMERIC(6,2),
    height_cm NUMERIC(6,2),
    bmi NUMERIC(5,2),
    hba1c NUMERIC(4,2),
    diabetes_type diabetes_type NOT NULL DEFAULT 'none',
    years_since_diagnosis NUMERIC(4,1),
    comorbidities JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profiles_patient_id ON patient_profiles (patient_id);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON patient_profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON patient_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 4. CGM Readings (Continuous Glucose Monitoring)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cgm_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ NOT NULL,
    glucose_mg_dl NUMERIC(6,2) NOT NULL,
    trend TEXT,
    source TEXT DEFAULT 'cgm',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cgm_patient_time ON cgm_readings (patient_id, recorded_at DESC);

-- -----------------------------------------------------------------------------
-- 5. Medications
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    dose TEXT,
    frequency TEXT,
    started_on DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_meds_patient_id ON medications (patient_id);

-- -----------------------------------------------------------------------------
-- 6. Insulin Records
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS insulin_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ NOT NULL,
    insulin_type TEXT NOT NULL,
    units NUMERIC(6,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_insulin_patient_time ON insulin_records (patient_id, recorded_at DESC);

-- -----------------------------------------------------------------------------
-- 7. Meal Records
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meal_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ NOT NULL,
    carbs_g NUMERIC(6,1) NOT NULL,
    protein_g NUMERIC(6,1),
    fat_g NUMERIC(6,1),
    meal_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_meals_patient_time ON meal_records (patient_id, recorded_at DESC);

-- -----------------------------------------------------------------------------
-- 8. Activity Records
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ NOT NULL,
    activity_type TEXT,
    duration_min INTEGER,
    intensity TEXT,
    calories NUMERIC(7,1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_patient_time ON activity_records (patient_id, recorded_at DESC);

-- -----------------------------------------------------------------------------
-- 9. Complete Blood Count (CBC) Results
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cbc_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hemoglobin NUMERIC(5,2),
    hematocrit NUMERIC(5,2),
    rbc NUMERIC(5,2),
    wbc NUMERIC(6,2),
    platelets INTEGER,
    neutrophils NUMERIC(5,2),
    lymphocytes NUMERIC(5,2),
    monocytes NUMERIC(5,2),
    eosinophils NUMERIC(5,2),
    basophils NUMERIC(5,2),
    anemia_risk NUMERIC(5,4),
    infection_risk NUMERIC(5,4),
    bleeding_risk NUMERIC(5,4),
    inflammation_score NUMERIC(6,3),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cbc_patient_time ON cbc_results (patient_id, collected_at DESC);

-- -----------------------------------------------------------------------------
-- 10. ECG Results
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ecg_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    heart_rate INTEGER,
    pr_interval_ms INTEGER,
    qrs_duration_ms INTEGER,
    qt_interval_ms INTEGER,
    qtc_interval_ms INTEGER,
    st_segment_mm NUMERIC(5,2),
    t_wave TEXT,
    predicted_rhythm TEXT,
    cardiac_risk_score NUMERIC(5,4),
    arrhythmia_risk NUMERIC(5,4),
    findings JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ecg_patient_time ON ecg_results (patient_id, collected_at DESC);

-- -----------------------------------------------------------------------------
-- 11. Risk Scores
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS risk_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hypoglycemia_risk NUMERIC(5,4),
    hyperglycemia_risk NUMERIC(5,4),
    hospitalization_risk NUMERIC(5,4),
    cardiovascular_risk NUMERIC(5,4),
    complication_risk NUMERIC(5,4),
    overall_level risk_level,
    shap_values JSONB,
    feature_importance JSONB,
    model_version TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_risk_patient_time ON risk_scores (patient_id, computed_at DESC);

-- -----------------------------------------------------------------------------
-- 12. Glucose Predictions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS glucose_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    predicted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    horizon_minutes INTEGER NOT NULL,
    predicted_mg_dl NUMERIC(6,2) NOT NULL,
    lower_bound NUMERIC(6,2),
    upper_bound NUMERIC(6,2),
    model_name TEXT NOT NULL,
    model_version TEXT,
    metrics JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pred_patient_time ON glucose_predictions (patient_id, predicted_at DESC);

-- -----------------------------------------------------------------------------
-- 13. Simulation Results (What-If engine)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS simulation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scenario JSONB NOT NULL,
    baseline_curve JSONB NOT NULL,
    simulated_curve JSONB NOT NULL,
    summary TEXT
);
CREATE INDEX IF NOT EXISTS idx_sim_patient_time ON simulation_results (patient_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 14. Recommendations
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    priority TEXT DEFAULT 'medium',
    is_read BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_recs_patient_time ON recommendations (patient_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 15. Reports
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    title TEXT NOT NULL,
    report_type TEXT NOT NULL,
    content JSONB NOT NULL,
    storage_path TEXT
);
CREATE INDEX IF NOT EXISTS idx_reports_patient_time ON reports (patient_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 16. Alerts
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    severity risk_level NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_acknowledged BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_alerts_patient ON alerts (patient_id, is_acknowledged, created_at DESC);

-- -----------------------------------------------------------------------------
-- 17. Notifications
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_notifs_user ON notifications (user_id, is_read, created_at DESC);

-- -----------------------------------------------------------------------------
-- 18. Audit Logs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    resource_id TEXT,
    ip_address TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs (created_at DESC);

-- -----------------------------------------------------------------------------
-- 19. Model Registry
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS model_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    task TEXT NOT NULL,
    metrics JSONB,
    artifact_path TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (name, version)
);

-- =============================================================================
-- Row Level Security (RLS) Configuration
-- =============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cgm_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE insulin_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbc_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecg_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE glucose_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_registry ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS claims
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS text AS $$
    SELECT coalesce(
        current_setting('request.jwt.claim.role', true),
        (SELECT role::text FROM users WHERE id::text = current_setting('request.jwt.claim.sub', true) LIMIT 1),
        'anon'
    );
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION auth_user_id()
RETURNS text AS $$
    SELECT coalesce(current_setting('request.jwt.claim.sub', true), '');
$$ LANGUAGE sql STABLE;

-- Users policies
DROP POLICY IF EXISTS "users_select_self_or_staff" ON users;
CREATE POLICY "users_select_self_or_staff" ON users
    FOR SELECT USING (
        id::text = auth_user_id() OR auth_user_role() IN ('doctor', 'admin')
    );

DROP POLICY IF EXISTS "users_admin_all" ON users;
CREATE POLICY "users_admin_all" ON users
    FOR ALL USING (auth_user_role() = 'admin');

-- Patients policies
DROP POLICY IF EXISTS "patients_select_scoped" ON patients;
CREATE POLICY "patients_select_scoped" ON patients
    FOR SELECT USING (
        user_id::text = auth_user_id() OR assigned_doctor_id::text = auth_user_id() OR auth_user_role() = 'admin'
    );

DROP POLICY IF EXISTS "patients_write_staff" ON patients;
CREATE POLICY "patients_write_staff" ON patients
    FOR ALL USING (auth_user_role() IN ('doctor', 'admin'));

-- Patient clinical data policies (generic template based on patient ownership)
DROP POLICY IF EXISTS "cgm_select_scoped" ON cgm_readings;
CREATE POLICY "cgm_select_scoped" ON cgm_readings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM patients p
            WHERE p.id = cgm_readings.patient_id
            AND (p.user_id::text = auth_user_id() OR p.assigned_doctor_id::text = auth_user_id() OR auth_user_role() = 'admin')
        )
    );

DROP POLICY IF EXISTS "cbc_select_scoped" ON cbc_results;
CREATE POLICY "cbc_select_scoped" ON cbc_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM patients p
            WHERE p.id = cbc_results.patient_id
            AND (p.user_id::text = auth_user_id() OR p.assigned_doctor_id::text = auth_user_id() OR auth_user_role() = 'admin')
        )
    );

DROP POLICY IF EXISTS "ecg_select_scoped" ON ecg_results;
CREATE POLICY "ecg_select_scoped" ON ecg_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM patients p
            WHERE p.id = ecg_results.patient_id
            AND (p.user_id::text = auth_user_id() OR p.assigned_doctor_id::text = auth_user_id() OR auth_user_role() = 'admin')
        )
    );

DROP POLICY IF EXISTS "risk_select_scoped" ON risk_scores;
CREATE POLICY "risk_select_scoped" ON risk_scores
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM patients p
            WHERE p.id = risk_scores.patient_id
            AND (p.user_id::text = auth_user_id() OR p.assigned_doctor_id::text = auth_user_id() OR auth_user_role() = 'admin')
        )
    );

DROP POLICY IF EXISTS "predictions_select_scoped" ON glucose_predictions;
CREATE POLICY "predictions_select_scoped" ON glucose_predictions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM patients p
            WHERE p.id = glucose_predictions.patient_id
            AND (p.user_id::text = auth_user_id() OR p.assigned_doctor_id::text = auth_user_id() OR auth_user_role() = 'admin')
        )
    );

DROP POLICY IF EXISTS "simulations_select_scoped" ON simulation_results;
CREATE POLICY "simulations_select_scoped" ON simulation_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM patients p
            WHERE p.id = simulation_results.patient_id
            AND (p.user_id::text = auth_user_id() OR p.assigned_doctor_id::text = auth_user_id() OR auth_user_role() = 'admin')
        )
    );

DROP POLICY IF EXISTS "reports_select_scoped" ON reports;
CREATE POLICY "reports_select_scoped" ON reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM patients p
            WHERE p.id = reports.patient_id
            AND (p.user_id::text = auth_user_id() OR p.assigned_doctor_id::text = auth_user_id() OR auth_user_role() = 'admin')
        )
    );

DROP POLICY IF EXISTS "model_registry_select_all" ON model_registry;
CREATE POLICY "model_registry_select_all" ON model_registry
    FOR SELECT USING (true);

-- =============================================================================
-- Initial Model Registry Seeds
-- =============================================================================
INSERT INTO model_registry (name, version, task, metrics, is_active)
VALUES
    ('hybrid-gru-phys', '1.0.0', 'glucose_forecasting', '{"rmse": 14.8, "mae": 11.2, "mape": 8.4, "r2": 0.89}'::jsonb, true),
    ('lstm-comparator', '1.0.0', 'glucose_forecasting', '{"rmse": 16.2, "mae": 12.6, "mape": 9.5, "r2": 0.86}'::jsonb, true),
    ('xgboost-cbc-hematology', '1.0.0', 'cbc_analysis', '{"mae": 0.042, "accuracy": 0.96}'::jsonb, true),
    ('cnn-bilstm-cardiac', '1.0.0', 'ecg_analysis', '{"accuracy": 0.94, "macro_f1": 0.93}'::jsonb, true),
    ('risk-ensemble-xgb-rf-lgb', '1.0.0', 'multi_risk_prediction', '{"auc_roc": 0.92, "shap_features": 10}'::jsonb, true)
ON CONFLICT (name, version) DO NOTHING;
