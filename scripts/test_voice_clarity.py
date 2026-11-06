import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import os
import requests
import wave
import io
import numpy as np
from scipy import signal
from backend.services.gnani_client import _load_dotenv_once

_load_dotenv_once()

key = os.getenv("GNANI_API_KEY")
url = "https://api.vachana.ai/api/v1/tts/inference"
headers = {"X-API-Key-ID": key, "Content-Type": "application/json", "User-Agent": "WhyLine/1.0"}

payload = {
    "model": "timbre-v3.0",
    "voice": "Shivani",
    "text": "Confirmed: keep retryCount 5 and timeoutMs 4500 in GatewayRouter dot java until version 2 cutover.",
    "language": "english",
    "sample_rate": 24000,
    "format": "wav"
}

resp = requests.post(url, headers=headers, json=payload, timeout=15)
if resp.status_code != 200:
    print("API Error:", resp.status_code, resp.text)
    sys.exit(1)

raw_pcm = resp.content
total_samples = len(raw_pcm) // 2
samples_int16 = np.frombuffer(raw_pcm[:total_samples*2], dtype=np.int16)
samples_float = samples_int16.astype(np.float32) / 32768.0

print(f"Original PCM: {len(raw_pcm)} bytes, {total_samples} samples")

# 1. Baseline naive decimation [::3] from 48k to 16k
naive_16k = samples_int16[::3]

# 2. DSP Voice Enhancement Filter Pipeline:
# a) High-pass filter (75 Hz cutoff) to eliminate low-frequency rumble & DC bias
b_hp, a_hp = signal.butter(2, 75.0 / (48000.0 / 2.0), btype='highpass')
clean_audio = signal.lfilter(b_hp, a_hp, samples_float)

# b) Presence / Clarity boost EQ: gentle peak boost at 3500 Hz (speech intelligibility band)
fs = 48000.0  # Gnani raw stream is 48kHz
f0 = 3500.0   # center frequency in Hz
Q = 1.2
gain_db = 2.5
A = 10.0 ** (gain_db / 40.0)
w0 = 2.0 * np.pi * f0 / fs
alpha = np.sin(w0) / (2.0 * Q)
b0 = 1.0 + alpha * A
b1 = -2.0 * np.cos(w0)
b2 = 1.0 - alpha * A
a0 = 1.0 + alpha / A
a1 = -2.0 * np.cos(w0)
a2 = 1.0 - alpha / A
b_eq = np.array([b0/a0, b1/a0, b2/a0], dtype=np.float32)
a_eq = np.array([1.0, a1/a0, a2/a0], dtype=np.float32)
enhanced_audio = signal.lfilter(b_eq, a_eq, clean_audio)

# c) Loudness peak normalization to -1.0 dBFS (~0.90 max amplitude)
peak = np.max(np.abs(enhanced_audio))
if peak > 0.01:
    enhanced_audio = (enhanced_audio / peak) * 0.90

out_dir = ROOT / "tmp_test" / "enhancement_test"
out_dir.mkdir(parents=True, exist_ok=True)

# Save naive 16k
with wave.open(str(out_dir / "naive_16k.wav"), "wb") as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(16000)
    wf.writeframes(naive_16k.tobytes())

# Save enhanced 48k studio audio
enhanced_int16 = (np.clip(enhanced_audio, -1.0, 1.0) * 32767.0).astype(np.int16)
with wave.open(str(out_dir / "enhanced_48k.wav"), "wb") as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(48000)
    wf.writeframes(enhanced_int16.tobytes())

# Save enhanced 16k (with anti-aliasing filter + presence boost + normalization)
enhanced_16k_float = signal.resample_poly(enhanced_audio, 1, 3)
enhanced_16k_int16 = (np.clip(enhanced_16k_float, -1.0, 1.0) * 32767.0).astype(np.int16)
with wave.open(str(out_dir / "enhanced_16k.wav"), "wb") as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(16000)
    wf.writeframes(enhanced_16k_int16.tobytes())

print("Saved test audio files:")
print(" - naive_16k.wav:", (out_dir / "naive_16k.wav").stat().st_size, "bytes")
print(" - enhanced_48k.wav:", (out_dir / "enhanced_48k.wav").stat().st_size, "bytes")
print(" - enhanced_16k.wav:", (out_dir / "enhanced_16k.wav").stat().st_size, "bytes")
