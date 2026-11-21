"""Audition VoiceStudio voices: synthesise one line per candidate, then report pitch and a transcription check.

    python build/voicelab.py            (writes data/banjar-teela-part-1-work/lab/*.wav)

VoiceStudio's OmniVoice engine designs a voice from comma-separated tags (gender, age, pitch, ...) plus a
seed. The same tags + seed always give the same voice, so a character keeps its voice across episodes.
Saved VoiceStudio profiles (cloned voices) can be used instead by passing their name as `voice`.
"""
import difflib
import io
import json
import re
import subprocess
import sys
import urllib.request
import wave
from pathlib import Path

import numpy as np
from scipy.signal import resample_poly

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
LAB = ROOT / "data" / "banjar-teela-part-1-work" / "lab"
RATE = 24000
URL = "http://127.0.0.1:3900/v1/audio/speech"

LINE = "गांव के जिस सूखे टीले को लोग कभी बंजर टीला कहकर मुँह फेर लेते थे, आज उसी मिट्टी से बने घड़ों का ठंडा पानी पूरे शहर की प्यास बुझाता है।"

# name: (voice, instructions, seed, speed)
CANDIDATES = {
    "narrator-A  middle-aged, very low":  ("default", "male, middle-aged, very low pitch", 71011, 0.84),
    "narrator-B  elderly, low":           ("default", "male, elderly, low pitch", 71013, 0.84),
    "narrator-C  part-2 narrator":        ("default", "male, middle-aged, low pitch", 44001, 0.87),
    "narrator-D  profile Rahul":          ("Rahul", None, 71011, 0.88),
    "janaki      adult woman, warm":      ("default", "female, middle-aged, moderate pitch", 82031, 0.88),
    "janaki-2    profile Juhi":           ("Juhi", None, 82031, 0.90),
    "chhotu      boy, child":             ("default", "male, child, high pitch", 93041, 0.92),
    "seth        man, middle-aged, low":  ("default", "male, middle-aged, low pitch", 61051, 0.90),
    "elder       man, elderly, moderate": ("default", "male, elderly, moderate pitch", 52061, 0.90),
}


def synth(text, voice, tags, seed, speed):
    body = {"model": "omnivoice", "input": text, "voice": voice, "response_format": "wav", "language": "hi",
            "seed": seed, "speed": round(speed, 2)}
    if tags:
        body["instructions"] = tags
    request = urllib.request.Request(URL, data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
                                     headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(request, timeout=420) as response:
        return response.read()


def samples_of(wav_bytes):
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", "pipe:0", "-ac", "1", "-ar", str(RATE), "-f", "s16le", "pipe:1"],
                         input=wav_bytes, capture_output=True, check=True).stdout
    return np.frombuffer(pcm, "<i2").astype(np.float32) / 32768


def median_pitch(y):
    """Median f0 of voiced frames by autocorrelation (rough, good enough to tell voices apart)."""
    frame, hop = 1920, 960
    found = []
    for start in range(0, len(y) - frame, hop):
        x = y[start:start + frame]
        if np.sqrt(np.mean(x ** 2)) < 0.02:
            continue
        x = x - x.mean()
        ac = np.correlate(x, x, "full")[frame - 1:]
        lo, hi = int(RATE / 400), int(RATE / 70)
        lag = lo + int(np.argmax(ac[lo:hi]))
        if ac[lag] > 0.45 * ac[0]:
            found.append(RATE / lag)
    return float(np.median(found)) if found else 0.0


def normalised(text):
    return re.sub(r"[^ऀ-ॿ]", "", text.replace("।", ""))


def main():
    from faster_whisper import WhisperModel
    engine = WhisperModel("small", device="cpu", compute_type="int8", cpu_threads=4, local_files_only=True)
    LAB.mkdir(parents=True, exist_ok=True)
    for name, (voice, tags, seed, speed) in CANDIDATES.items():
        try:
            audio = synth(LINE, voice, tags, seed, speed)
        except Exception as error:
            print(f"{name:40} FAILED {error}")
            continue
        y = samples_of(audio)
        (LAB / (re.sub(r"\W+", "-", name)[:30] + ".wav")).write_bytes(audio)
        for_whisper = resample_poly(y, 2, 3).astype(np.float32)            # 24 kHz -> 16 kHz
        segments, _ = engine.transcribe(for_whisper, language="hi", beam_size=3, condition_on_previous_text=False)
        heard = " ".join(s.text.strip() for s in segments)
        score = difflib.SequenceMatcher(None, normalised(LINE), normalised(heard)).ratio()
        print(f"{name:40} {len(y) / RATE:5.1f}s  f0 {median_pitch(y):5.0f} Hz  match {score:.2f}", flush=True)


if __name__ == "__main__":
    main()
