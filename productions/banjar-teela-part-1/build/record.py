"""Record the screenplay through local VoiceStudio and check every clip by transcribing it back.

    python build/record.py            records any line not yet recorded, then audits all of them

Outputs: WAVs stored in data/media (content-addressed, like imported recordings) and
build/voices.json mapping each line to its media id and duration. Re-running is cheap: a
line is only re-synthesised when its text or voice settings change.
"""
import difflib
import hashlib
import io
import json
import re
import subprocess
import sys
import time
import urllib.request
import wave
from pathlib import Path

import numpy as np
from scipy.signal import resample_poly

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
MEDIA = ROOT / "data" / "media"
SOURCE = HERE.parent / "script-hi.txt"
RATE = 24000
URL = "http://127.0.0.1:3900/v1/audio/speech"

# code: (speaker name, VoiceStudio voice, design tags, seed, base speed)
# The narrator uses the saved "Rahul" profile: the lowest, slowest, most grave of the voices auditioned.
VOICES = {
    "N": ("कथावाचक", "Rahul", None, 71011, 0.95),
    "E": ("गाँव के बुज़ुर्ग", "default", "male, elderly, moderate pitch", 52061, 0.92),
}

DIGITS = {"३८": "अड़तीस", "११": "ग्यारह"}


def spoken(text):
    for number, word in DIGITS.items():
        text = text.replace(number, word)
    return text.replace("‘", "").replace("’", "").replace("—", "।").replace("…", "...").strip()


def pace(direction, base):
    if re.search("फुसफुस|बहुत धीमे", direction):
        return base - 0.06
    if re.search("धीमे|उदास|करुण|दुख|रहस्य", direction):
        return base - 0.035
    if re.search("तेज़|खिलखिला|उत्साह|हँस|ताना", direction):
        return min(1.0, base + 0.02)
    return base


def parse():
    rows, scene = [], 0
    for line in SOURCE.read_text(encoding="utf-8-sig").splitlines():
        if m := re.match(r"^### दृश्य (\d+)", line):
            scene = int(m[1])
        elif m := re.match(r"^([A-Z]):\s*\[([^\]]+)\]\s*(.+)$", line):
            code, direction, text = m.groups()
            rows.append({"number": len(rows) + 1, "scene": scene, "code": code,
                         "speaker": VOICES[code][0], "direction": direction, "text": text.strip()})
    return rows


def wave_bytes(samples):
    target = io.BytesIO()
    with wave.open(target, "wb") as out:
        out.setparams((1, 2, RATE, 0, "NONE", "not compressed"))
        out.writeframes(samples.astype("<i2").tobytes())
    return target.getvalue()


def decode(content, filters):
    return subprocess.run(["ffmpeg", "-v", "error", "-i", "pipe:0", "-af", filters, "-ac", "1", "-ar", str(RATE), "-f", "s16le", "pipe:1"],
                          input=content, capture_output=True, check=True).stdout


def trim(pcm):
    samples = np.frombuffer(pcm, "<i2")
    loud = np.abs(samples.astype(np.float64))
    active = np.flatnonzero(loud > max(loud.max() * 0.014, 65.5))
    if loud.max() < 120 or not len(active):
        raise ValueError("silent VoiceStudio response")
    return samples[max(0, active[0] - 1440):min(len(samples), active[-1] + 2200)]


def request(text, voice, tags, seed, speed):
    body = {"model": "omnivoice", "input": text, "voice": voice, "response_format": "wav", "language": "hi",
            "seed": seed, "speed": round(speed, 3)}
    if tags:
        body["instructions"] = tags
    req = urllib.request.Request(URL, data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=420) as response:
        return response.read()


def store(name, content):
    ident = hashlib.sha256(content).hexdigest()[:32] + ".wav"
    (MEDIA / ident).write_bytes(content)
    (MEDIA / (ident + ".json")).write_text(json.dumps(
        {"id": ident, "name": name + ".wav", "bytes": len(content), "type": "audio"}, ensure_ascii=False), encoding="utf-8")
    return ident


def record(row):
    _, voice, tags, seed, base = VOICES[row["code"]]
    speed = pace(row["direction"], base)
    text = spoken(row["text"])
    for trial in range(3):
        try:
            samples = trim(decode(request(text, voice, tags, seed, speed), "highpass=f=55"))
            break
        except Exception as error:
            if trial == 2:
                raise RuntimeError(f"VoiceStudio failed on line {row['number']}: {error}") from error
            time.sleep(1.5)
    ident = store(f"चंदनपुर भाग 1 · {row['number']:02d} · {row['speaker']}", wave_bytes(samples))
    return {**row, "audio": ident, "duration": round(len(samples) / RATE, 3), "speed": round(speed, 3), "settings": [voice, tags, seed, base]}


def audit(items):
    from faster_whisper import WhisperModel
    engine = WhisperModel("small", device="cpu", compute_type="int8", cpu_threads=4, local_files_only=True)
    clean = lambda text: re.sub(r"[^ऀ-ॿ]", "", spoken(text).replace("।", ""))
    for item in items:
        with wave.open(str(MEDIA / item["audio"]), "rb") as wav:
            y = np.frombuffer(wav.readframes(wav.getnframes()), "<i2").astype(np.float32) / 32768
        segments, _ = engine.transcribe(resample_poly(y, 2, 3).astype(np.float32), language="hi", beam_size=3, condition_on_previous_text=False)
        heard = " ".join(s.text.strip() for s in segments)
        score = difflib.SequenceMatcher(None, clean(item["text"]), clean(heard)).ratio()
        item["match"] = round(score, 3)
        flag = "  <-- CHECK" if score < 0.62 else ""
        print(f"{item['number']:02d} {item['duration']:5.1f}s match {score:.2f}{flag}", flush=True)
        if flag:
            print(f"     expected: {item['text']}\n     heard:    {heard}")


def main():
    rows = parse()
    path = HERE / "voices.json"
    done = {r["number"]: r for r in json.loads(path.read_text(encoding="utf-8"))} if path.exists() else {}
    items = []
    for row in rows:
        old = done.get(row["number"])
        want = [VOICES[row["code"]][1], VOICES[row["code"]][2], VOICES[row["code"]][3], VOICES[row["code"]][4]]
        if old and old["text"] == row["text"] and old["direction"] == row["direction"] and old["settings"] == want and (MEDIA / old["audio"]).is_file():
            items.append(old)
            continue
        started = time.monotonic()
        item = record(row)
        items.append(item)
        print(f"recorded {row['number']:02d} {item['code']} {item['duration']:5.1f}s ({time.monotonic() - started:.0f}s)", flush=True)
    if "--no-audit" not in sys.argv:
        audit(items)
    path.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{len(items)} lines, {sum(i['duration'] for i in items):.1f}s of speech.")


if __name__ == "__main__":
    main()
