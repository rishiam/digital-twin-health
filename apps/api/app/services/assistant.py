from __future__ import annotations

from typing import Any
import os
import httpx

KNOWLEDGE = [
    {
        "id": "cgm-targets",
        "title": "ADA Clinical CGM Consensus Targets",
        "text": "According to the American Diabetes Association (ADA) and international consensus: For most non-pregnant adults with Type 1 or Type 2 diabetes, the target Time in Range (TIR, 70–180 mg/dL) is >70%. Time Below Range (TBR, <70 mg/dL) must be <4% with <1% severe hypoglycemia (<54 mg/dL). Time Above Range (TAR, >180 mg/dL) should be <25%.",
    },
    {
        "id": "glucose-forecast",
        "title": "Hybrid Digital Twin Glucose Forecast Dynamics",
        "text": "DigiTwin combines a physiological minimal model (meal carbohydrate absorption kinetics, remote insulin compartment, hepatic glucose output, and exercise-induced muscle uptake) with a GRU neural sequence model. Hybrid predictions fuse both to predict at 30, 60, 90, 120 minutes and 4, 6 hours ahead. GRU vs LSTM benchmarking assesses RMSE, MAE, MAPE, and R2.",
    },
    {
        "id": "hypo",
        "title": "Hypoglycemia Pathophysiology & Counter-regulation",
        "text": "Hypoglycemia risk spikes with excessive basal/bolus insulin stacking, delayed meals, strenuous uncompensated exercise, or acute alcohol consumption. Glucose <70 mg/dL impairs autonomic warning responses over time (hypoglycemia-associated autonomic failure). Treatment: 15–20g fast-acting carbohydrate rule of 15.",
    },
    {
        "id": "hyper",
        "title": "Hyperglycemia, Glycemic Variability & HbA1c",
        "text": "Persistent glucose >180 mg/dL elevates vascular oxidative stress and protein glycation. Glycemic variability (CV% > 36%) independently predicts endothelial damage. Estimated HbA1c / Glycemic Management Indicator (GMI) is calculated as GMI (%) = 3.31 + 0.02392 * [mean glucose in mg/dL].",
    },
    {
        "id": "cbc",
        "title": "Complete Blood Count (CBC) Hematology Interpretation",
        "text": "Hemoglobin (<12 g/dL in women, <13 g/dL in men) indicates anemia. WBC > 11.0 x 10^3/uL with neutrophilia (>70%) suggests acute bacterial infection or systemic inflammation. Thrombocytopenia (platelets < 150,000 / uL) elevates spontaneous bleeding risk. DigiTwin uses XGBoost multi-output models trained on reference intervals.",
    },
    {
        "id": "ecg",
        "title": "Electrocardiogram (ECG) Rhythm & Interval Criteria",
        "text": "Normal sinus rhythm maintains heart rate 60–100 bpm, PR interval 120–200 ms, QRS < 120 ms, and QTc < 450 ms (men) or < 460 ms (women). QTc > 480–500 ms poses risk for Torsades de Pointes. ST-segment elevation >= 1 mm indicates transmural myocardial injury (STEMI); ST depression indicates subendocardial ischemia.",
    },
    {
        "id": "simulation",
        "title": "What-If Metabolic Simulation Engine",
        "text": "The what-if simulation engine allows clinicians and patients to simulate perturbations: increasing or reducing insulin doses (ISF modulation), adjusting carbohydrate intake (ICR tuning), scheduling exercise bouts, or introducing SGLT2/GLP-1 receptor agonist therapies before making real-world prescription adjustments.",
    },
    {
        "id": "medications",
        "title": "Cardiometabolic Pharmacotherapy Guidelines",
        "text": "Metformin remains first-line for Type 2 diabetes unless eGFR < 30. SGLT2 inhibitors and GLP-1 receptor agonists offer proven cardiorenal protection, reducing heart failure hospitalizations and progression of diabetic kidney disease. Basal insulin titration should target fasting blood glucose 80–130 mg/dL.",
    },
    {
        "id": "disclaimer",
        "title": "Clinical AI Decision Support Disclaimer",
        "text": "DigiTwin Health is an artificial intelligence clinical decision support and patient simulation system. It is designed for informational, educational, and simulation purposes, and does not replace the diagnosis, prescription, or clinical judgment of a licensed medical practitioner.",
    },
]


def retrieve(query: str, k: int = 3) -> list[dict[str, Any]]:
    q_words = set(query.lower().replace("?", "").replace(",", "").split())
    scored = []
    for doc in KNOWLEDGE:
        hay = (doc["title"] + " " + doc["text"]).lower()
        score = sum(1 for word in q_words if word in hay)
        scored.append((score, doc))
    scored.sort(key=lambda x: x[0], reverse=True)
    results = [d for s, d in scored[:k] if s > 0]
    return results or [KNOWLEDGE[0], KNOWLEDGE[-1]]


def answer(query: str, context: dict[str, Any] | None = None) -> dict[str, Any]:
    docs = retrieve(query)
    ctx = context or {}

    # Check if external LLM configured (OpenAI)
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        try:
            prompt = (
                f"You are the DigiTwin AI Healthcare Clinical Assistant. Answer the patient's question based on "
                f"the retrieved clinical knowledge sources and patient telemetry.\n\n"
                f"Telemetry Context: {ctx}\n\n"
                f"Knowledge Sources:\n" + "\n".join(f"- {d['title']}: {d['text']}" for d in docs) + f"\n\n"
                f"User Question: {query}\n\n"
                f"Clinical Answer:"
            )
            with httpx.Client(timeout=10.0) as client:
                res = client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={
                        "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.3,
                    },
                )
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"]
                    return {
                        "answer": content,
                        "citations": [{"id": d["id"], "title": d["title"]} for d in docs],
                        "provider": "openai-rag",
                    }
        except Exception:
            pass

    # High quality local grounded RAG response
    points = [d["text"] for d in docs]
    telemetry_notes = []
    if ctx.get("glucose"):
        telemetry_notes.append(f"Current live glucose reading: {ctx['glucose']} mg/dL.")
    if ctx.get("risks"):
        telemetry_notes.append(f"Current risk snapshot: {ctx['risks']}.")

    reply = " ".join(points)
    if telemetry_notes:
        reply = " ".join(telemetry_notes) + " " + reply
    reply += " Always consult with your attending endocrinologist or care team before changing insulin or therapy."

    return {
        "answer": reply,
        "citations": [{"id": d["id"], "title": d["title"]} for d in docs],
        "provider": "local-rag",
    }
