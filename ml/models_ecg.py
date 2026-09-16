"""1D CNN + BiLSTM Model Architecture for ECG Rhythm and Interval Analysis."""

from __future__ import annotations
import math

try:
    import torch
    from torch import nn
except ImportError:
    torch = None
    nn = None


ECG_LABELS = [
    "Normal Rhythm",
    "Bradycardia",
    "Tachycardia",
    "Atrial Fibrillation",
    "QT Prolongation",
    "ST Elevation",
    "ST Depression",
]


if nn is not None:
    class CNNBiLSTMEcg(nn.Module):
        """1D CNN + Bidirectional LSTM for ECG interval sequences and digitized lead strips."""

        def __init__(self, in_channels: int = 1, seq_len: int = 7, n_classes: int = 7, hidden_dim: int = 32):
            super().__init__()
            self.conv = nn.Sequential(
                nn.Conv1d(in_channels, 16, kernel_size=3, padding=1),
                nn.BatchNorm1d(16),
                nn.ReLU(),
                nn.Conv1d(16, 32, kernel_size=3, padding=1),
                nn.BatchNorm1d(32),
                nn.ReLU(),
            )
            self.bilstm = nn.LSTM(
                input_size=32,
                hidden_size=hidden_dim,
                batch_first=True,
                bidirectional=True,
            )
            self.classifier = nn.Sequential(
                nn.Linear(hidden_dim * 2, 32),
                nn.ReLU(),
                nn.Dropout(0.2),
                nn.Linear(32, n_classes),
            )
            self.risk_head = nn.Sequential(
                nn.Linear(hidden_dim * 2, 16),
                nn.ReLU(),
                nn.Linear(16, 2),  # [cardiac_risk_score, arrhythmia_risk]
                nn.Sigmoid(),
            )

        def forward(self, x):
            # x shape: [Batch, Length] or [Batch, Channels, Length]
            if x.dim() == 2:
                x = x.unsqueeze(1)
            feat = self.conv(x)
            feat = feat.transpose(1, 2)
            lstm_out, _ = self.bilstm(feat)
            pooled = lstm_out[:, -1, :]
            logits = self.classifier(pooled)
            risks = self.risk_head(pooled)
            return logits, risks
else:
    class CNNBiLSTMEcg:
        def __init__(self, *args, **kwargs):
            pass


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
        # phase inside single heart beat [0, 1)
        phase = (t % beat_interval) / beat_interval
        
        val = 0.0
        # P-wave (at ~0.15 of cycle)
        if 0.10 <= phase <= 0.22:
            val += 0.25 * math.sin((phase - 0.10) / 0.12 * math.pi)
        # Q-wave (at ~0.33)
        elif 0.32 <= phase <= 0.35:
            val -= 0.15 * math.sin((phase - 0.32) / 0.03 * math.pi)
        # R-wave (at ~0.37)
        elif 0.35 <= phase <= 0.40:
            val += 1.6 * math.sin((phase - 0.35) / 0.05 * math.pi)
        # S-wave (at ~0.42)
        elif 0.40 <= phase <= 0.44:
            val -= 0.35 * math.sin((phase - 0.40) / 0.04 * math.pi)
        # ST segment (at ~0.44 to 0.52)
        elif 0.44 <= phase <= 0.52:
            val += st_elevation_mm * 0.25
        # T-wave (at ~0.52 to 0.72)
        elif 0.52 <= phase <= 0.74:
            t_dur = 0.22 * (qtc_ms / 420.0)
            if phase <= 0.52 + t_dur:
                val += 0.45 * math.sin((phase - 0.52) / t_dur * math.pi)

        # Atrial Fibrillation adds small irregular baseline fibrillatory waves
        if rhythm == "Atrial Fibrillation":
            val += 0.06 * math.sin(2 * math.pi * 7.5 * t) + 0.04 * math.cos(2 * math.pi * 12.0 * t)

        waveform.append({"time_ms": round(t * 1000, 1), "voltage_mv": round(val, 3)})

    return waveform
