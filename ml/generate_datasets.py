"""Generate 10,000+ synthetic digital-twin patients with CGM, CBC, ECG, meds, lifestyle, and labels."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd

DIABETES = ["type1", "type2", "gestational", "prediabetes"]


def generate(n_patients: int = 10000, seed: int = 42, out_dir: str = "ml/data/generated") -> None:
    rng = np.random.default_rng(seed)
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    patient_ids = np.arange(1, n_patients + 1)
    age = rng.integers(18, 90, n_patients)
    sex = rng.choice(["female", "male"], n_patients)
    weight = rng.normal(78, 16, n_patients).clip(42, 160)
    height = rng.normal(168, 10, n_patients).clip(140, 200)
    bmi = weight / ((height / 100) ** 2)
    diabetes = rng.choice(DIABETES, n_patients, p=[0.18, 0.62, 0.05, 0.15])
    hba1c = np.where(diabetes == "type1", rng.normal(7.8, 1.3, n_patients), rng.normal(7.3, 1.1, n_patients))
    hba1c = hba1c.clip(4.8, 14)

    patients = pd.DataFrame(
        {
            "patient_id": patient_ids,
            "age": age,
            "sex": sex,
            "weight_kg": weight.round(1),
            "height_cm": height.round(1),
            "bmi": bmi.round(1),
            "diabetes_type": diabetes,
            "hba1c": hba1c.round(2),
            "years_since_diagnosis": rng.uniform(0.2, 25, n_patients).round(1),
        }
    )
    patients.to_csv(out / "patients.csv", index=False)

    # CGM: 24h x 5-min for a subset + daily summaries for all
    summaries = []
    cgm_rows = []
    sample_for_traces = min(250, n_patients)
    for i, pid in enumerate(patient_ids):
        mean_g = 90 + (hba1c[i] - 5) * 22 + rng.normal(0, 12)
        cv = rng.uniform(0.18, 0.42)
        tbr = rng.beta(1.4, 12)
        tar = rng.beta(2.2, 4.5)
        summaries.append(
            {
                "patient_id": pid,
                "mean_glucose": round(float(mean_g), 1),
                "cv": round(float(cv), 3),
                "time_below_range": round(float(tbr), 3),
                "time_above_range": round(float(tar), 3),
                "time_in_range": round(float(max(0, 1 - tbr - tar)), 3),
            }
        )
        if i < sample_for_traces:
            g = mean_g
            for step in range(288):
                g = float(np.clip(g + rng.normal(0, mean_g * cv / 8), 40, 400))
                if step % 72 == 36:
                    g += rng.uniform(20, 70)
                cgm_rows.append({"patient_id": pid, "minute": step * 5, "glucose_mg_dl": round(g, 1)})
    pd.DataFrame(summaries).to_csv(out / "cgm_daily_summary.csv", index=False)
    pd.DataFrame(cgm_rows).to_csv(out / "cgm_traces_sample.csv", index=False)

    cbc = pd.DataFrame(
        {
            "patient_id": patient_ids,
            "hemoglobin": rng.normal(13.4, 1.5, n_patients).clip(6.5, 18).round(1),
            "hematocrit": rng.normal(40, 4.5, n_patients).clip(20, 55).round(1),
            "rbc": rng.normal(4.6, 0.5, n_patients).round(2),
            "wbc": rng.normal(7.4, 2.2, n_patients).clip(2, 22).round(1),
            "platelets": rng.normal(240000, 70000, n_patients).clip(40000, 520000).astype(int),
            "neutrophils": rng.normal(58, 10, n_patients).clip(20, 90).round(1),
            "lymphocytes": rng.normal(30, 8, n_patients).clip(5, 60).round(1),
            "monocytes": rng.normal(7, 2, n_patients).clip(1, 15).round(1),
            "eosinophils": rng.normal(2.5, 1.2, n_patients).clip(0, 12).round(1),
            "basophils": rng.normal(0.6, 0.3, n_patients).clip(0, 3).round(1),
        }
    )
    cbc["anemia_label"] = (cbc["hemoglobin"] < 11.5).astype(int)
    cbc["infection_label"] = (cbc["wbc"] > 11).astype(int)
    cbc["bleeding_label"] = (cbc["platelets"] < 150000).astype(int)
    cbc.to_csv(out / "cbc.csv", index=False)

    hr = rng.normal(74, 14, n_patients)
    ecg = pd.DataFrame(
        {
            "patient_id": patient_ids,
            "heart_rate": hr.clip(38, 180).round().astype(int),
            "pr_interval_ms": rng.normal(160, 20, n_patients).clip(90, 280).round().astype(int),
            "qrs_duration_ms": rng.normal(92, 12, n_patients).clip(60, 160).round().astype(int),
            "qt_interval_ms": rng.normal(390, 28, n_patients).clip(300, 520).round().astype(int),
            "qtc_interval_ms": rng.normal(425, 24, n_patients).clip(340, 560).round().astype(int),
            "st_segment_mm": rng.normal(0, 0.5, n_patients).round(2),
            "t_wave": rng.choice(["normal", "flat", "inverted"], n_patients, p=[0.86, 0.08, 0.06]),
        }
    )
    rhythm = np.full(n_patients, "Normal Rhythm", dtype=object)
    rhythm[ecg["heart_rate"] < 60] = "Bradycardia"
    rhythm[ecg["heart_rate"] > 100] = "Tachycardia"
    rhythm[ecg["qtc_interval_ms"] > 480] = "QT Prolongation"
    rhythm[ecg["st_segment_mm"] >= 1.0] = "ST Elevation"
    rhythm[ecg["st_segment_mm"] <= -0.8] = "ST Depression"
    af_idx = rng.choice(n_patients, size=int(0.04 * n_patients), replace=False)
    rhythm[af_idx] = "Atrial Fibrillation"
    ecg["rhythm_label"] = rhythm
    ecg.to_csv(out / "ecg.csv", index=False)

    meds = pd.DataFrame(
        {
            "patient_id": patient_ids,
            "metformin": (diabetes == "type2").astype(int) * rng.integers(0, 2, n_patients),
            "sglt2": rng.binomial(1, 0.28, n_patients),
            "glp1": rng.binomial(1, 0.18, n_patients),
            "basal_insulin": np.where(diabetes == "type1", 1, rng.binomial(1, 0.22, n_patients)),
            "statin": rng.binomial(1, 0.41, n_patients),
        }
    )
    meds.to_csv(out / "medications.csv", index=False)

    lifestyle = pd.DataFrame(
        {
            "patient_id": patient_ids,
            "activity_hours_week": rng.uniform(0, 10, n_patients).round(1),
            "carb_grams_day": rng.normal(180, 55, n_patients).clip(60, 420).round(0),
            "sleep_hours": rng.normal(6.8, 1.1, n_patients).clip(3.5, 10).round(1),
            "smoker": rng.binomial(1, 0.14, n_patients),
        }
    )
    lifestyle.to_csv(out / "lifestyle.csv", index=False)

    hypo = (pd.DataFrame(summaries)["time_below_range"] > 0.04).astype(int)
    hyper = (pd.DataFrame(summaries)["time_above_range"] > 0.3).astype(int)
    cvd = ((age > 60) | (bmi > 32)).astype(int)
    risk = pd.DataFrame(
        {
            "patient_id": patient_ids,
            "hypoglycemia_label": hypo,
            "hyperglycemia_label": hyper,
            "hospitalization_label": ((hypo + hyper + (hba1c > 9).astype(int)) >= 2).astype(int),
            "cardiovascular_label": cvd,
            "complication_label": ((hba1c > 8.5).astype(int) | cvd).astype(int),
        }
    )
    risk.to_csv(out / "risk_labels.csv", index=False)

    meta = {
        "n_patients": n_patients,
        "seed": seed,
        "files": sorted(p.name for p in out.glob("*.csv")),
    }
    (out / "manifest.json").write_text(json.dumps(meta, indent=2))
    print(f"Wrote {n_patients} patients to {out.resolve()}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=10000)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--out", default="ml/data/generated")
    args = parser.parse_args()
    generate(args.n, args.seed, args.out)
