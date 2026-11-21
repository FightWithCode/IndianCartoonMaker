"""Compose an original score for Part 1, synthesised and timed to the film's real shot boundaries.

    python build/score.py <job-folder>/timeline.json     (writes build/score.json with the media id)

Instruments are all synthesised here (no samples): a tanpura drone, a bansuri-like flute, a warm
string pad, soft bell sparkles and a light dholak. The mood follows the story: a sorrowful minor
mode for the barren mound, a bright major lift for "today", a mocking, sparse passage for the
elders, a hopeful swell as they bow, then a calm pentatonic morning and a tender close.
"""
import hashlib
import io
import json
import sys
import wave
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
MEDIA = ROOT / "data" / "media"
RATE = 24000
TAU = 2 * np.pi
TONIC = 146.832                      # D3
RNG = np.random.default_rng(20261109)


def tvec(duration):
    return np.arange(round(duration * RATE)) / RATE


def env(t, start, stop, attack, release):
    return np.minimum(np.clip((t - start) / attack, 0, 1), np.clip((stop - t) / release, 0, 1))


def air(t, low, high):
    return sosfilt(butter(2, (low, high), btype="bandpass", fs=RATE, output="sos"), RNG.normal(size=len(t)))


def add(out, signal, offset, gain=1.0):
    start = round(offset * RATE)
    if start < 0:                      # a note that begins before the film: drop the part that falls before 0
        signal, start = signal[-start:], 0
    if start >= len(out):
        return
    count = min(len(signal), len(out) - start)
    if count > 0:
        out[start:start + count] += signal[:count] * gain


def freq(note):
    return TONIC * 2 ** (note / 12)


# --------------------------------------------------------------------------- instruments
def pluck(note, duration=3.2):
    """Tanpura-style string: bright partials with a slow buzz."""
    t = tvec(duration)
    phase = TAU * freq(note) * t
    body = sum(np.sin(phase * h + 0.03 * np.sin(t * 5 + h)) * g * np.exp(-t * d)
               for h, g, d in [(1, 1, 1.5), (2, .30, 3.0), (3, .20, 4.0), (4, .12, 5.5), (5, .08, 7), (7, .05, 11)])
    return (body + 0.05 * air(t, 500, 2400) * np.exp(-t * 60)) * env(t, 0, duration, .018, .25)


def flute(note, duration, vibrato=1.0):
    t = tvec(duration)
    f = freq(note) * (1 + 0.013 * vibrato * np.sin(TAU * 4.6 * t) * np.clip(t - .22, 0, .35))
    p = np.cumsum(TAU * f / RATE)
    tone = np.sin(p) + .13 * np.sin(2 * p + .1) + .05 * np.sin(3 * p)
    return (tone + .07 * air(t, 900, 2600)) * env(t, 0, duration, .16, .38) * (.88 + .12 * np.sin(t * 2.7) ** 2)


def pad(notes, duration):
    t = tvec(duration)
    out = np.zeros_like(t)
    for i, n in enumerate(notes):
        for detune in (-.0035, .0035):
            f = freq(n) * (1 + detune)
            out += (np.sin(TAU * f * t) + .22 * np.sin(TAU * 2 * f * t + i) + .08 * np.sin(TAU * 3 * f * t)) / len(notes)
    out *= (.82 + .18 * np.sin(t * 1.1 + 1.3))
    return out * env(t, 0, duration, min(1.6, duration / 3), min(2.0, duration / 3))


def bell(note, duration=2.4):
    t = tvec(duration)
    f = freq(note)
    tone = (np.sin(TAU * f * t) + .45 * np.sin(TAU * f * 2.76 * t) * np.exp(-3 * t) + .22 * np.sin(TAU * f * 5.4 * t) * np.exp(-7 * t))
    return tone * np.exp(-2.4 * t) * env(t, 0, duration, .004, .4)


def dholak(high):
    t = tvec(.42)
    f = 250 if high else 92
    phase = TAU * (f * t + 15 * (1 - np.exp(-t * 19)) / 19)
    return (np.sin(phase) * np.exp(-t * (15 if high else 8)) * .32 + air(t, 450, 2600) * np.exp(-t * 33) * .15) * env(t, 0, .42, .01, .1)


# --------------------------------------------------------------------------------- the score
SAD = {"a": [(12, 1.7), (13, .8), (12, .8), (10, 1.3), (8, .8), (7, 2.6)],
       "b": [(7, 1.2), (8, .8), (10, 1.7), (12, 2.3), (10, .8), (8, 1.0), (7, 2.8)],
       "c": [(15, 1.5), (13, .8), (12, 1.2), (10, .9), (12, 3.0)]}
HOPE = {"a": [(12, .8), (14, .8), (16, 1.3), (19, 1.7), (16, .8), (14, .8), (12, 2.2)],
        "b": [(16, .8), (19, .8), (21, 1.7), (24, 2.6), (21, .9), (19, 2.2)]}
CALM = {"a": [(12, 1.7), (16, 1.3), (14, .9), (12, 1.7), (9, 2.6)],
        "b": [(9, 1.3), (12, 1.7), (14, 1.3), (16, 2.1), (14, 1.1), (12, 2.8)]}
NIGHT = {"a": [(12, 2.1), (15, 1.3), (14, .9), (12, 1.7), (10, 3.2)],
         "b": [(10, 1.4), (12, 1.9), (15, 1.5), (17, 2.4), (15, 1.0), (12, 3.0)]}

# shot number -> section settings. Chord offsets are semitones above the tonic.
SECTIONS = {
    1:  dict(phr=SAD, chord=[0, 3, 7, 12], pad=.050, flute=.058, pulse=0, bells=[(0.5, [24, 28, 31, 36])]),
    2:  dict(phr=HOPE, chord=[0, 4, 7, 12], pad=.050, flute=.060, pulse=.050, bells=[(0.9, [24, 28, 31, 36]), (3.4, [28, 31, 36])]),
    3:  dict(phr=SAD, chord=[-5, 0, 3, 7], pad=.056, flute=.056, pulse=0, bells=[]),
    4:  dict(phr=NIGHT, chord=[0, 1, 7], pad=.034, flute=.030, pulse=0, bells=[]),
    5:  dict(phr=HOPE, chord=[0, 4, 7, 12, 16], pad=.070, flute=.064, pulse=0, bells=[(2.4, [24, 28, 31, 36]), (6.8, [28, 31, 36, 40])]),
    6:  dict(phr=CALM, chord=[0, 7, 12], pad=.040, flute=.054, pulse=0, bells=[(0.7, [24, 28, 31])]),
    7:  dict(phr=CALM, chord=[0, 7, 12], pad=.036, flute=.046, pulse=0, bells=[]),
    8:  dict(phr=CALM, chord=[0, 7, 14], pad=.036, flute=.046, pulse=0, bells=[]),
    9:  dict(phr=CALM, chord=[-5, 0, 7], pad=.036, flute=.044, pulse=0, bells=[]),
    10: dict(phr=NIGHT, chord=[0, 7, 10], pad=.040, flute=.046, pulse=0, bells=[]),
    11: dict(phr=NIGHT, chord=[-5, 0, 3, 7], pad=.048, flute=.050, pulse=0, bells=[]),
    12: dict(phr=SAD, chord=[-5, 0, 3, 7], pad=.050, flute=.052, pulse=0, bells=[]),
    13: dict(phr=HOPE, chord=[0, 4, 7, 12], pad=.054, flute=.056, pulse=0, bells=[(1.0, [24, 28, 31, 36]), (3.9, [28, 31, 36, 40])]),
}


def section(dry, wet, start, length, cfg, index):
    phrases = list(cfg["phr"].values())
    # string pad swells in and out of every section so changes of mood blend rather than cut
    add(wet, pad(cfg["chord"], length + 1.2), start - .4, cfg["pad"])
    # flute phrases, spaced so the narrator keeps the foreground
    cursor = start + (1.4 if index in (1, 6) else .6)
    k = index
    while cursor < start + length - 2.0:
        notes = phrases[k % len(phrases)]
        k += 1
        for n, d in notes:
            if cursor + d > start + length + 1.0:
                break
            add(wet, flute(n, d + .25), cursor, cfg["flute"])
            cursor += d
        cursor += 1.5 + .4 * (k % 3)
    for at, notes in cfg["bells"]:
        for j, n in enumerate(notes):
            add(wet, bell(n), start + at + j * .13, .045)
    if cfg["pulse"]:
        beat = .62
        for j, c in enumerate(np.arange(0, length - .4, beat)):
            if j % 4 in (0, 2):
                add(dry, dholak(False), start + c, cfg["pulse"])
            if j % 4 in (1, 3):
                add(dry, dholak(True), start + c + .02, cfg["pulse"] * .55)


def reverb(signal, seconds=2.4, decay=2.2):
    t = tvec(seconds)
    ir = air(t, 220, 5500) * np.exp(-t * decay)
    ir[:int(RATE * .012)] = 0
    ir /= np.abs(ir).max() + 1e-9
    return fftconvolve(signal, ir, mode="full")[:len(signal)] * .075


def compose(timeline):
    total = timeline["duration"] + 3.0
    dry = np.zeros(round(total * RATE))
    wet = np.zeros_like(dry)
    # tanpura cycle runs through the whole film: Pa - Sa - Sa - low Sa
    period = 3.1
    for i, c in enumerate(np.arange(0, total - 2, period)):
        for j, n in enumerate([-5, 0, 0, -12]):
            add(dry, pluck(n), c + j * period / 4, .095 * (1 - .06 * j))
    for number, shot in enumerate(timeline["shots"], 1):
        section(dry, wet, shot["start"], shot["duration"], SECTIONS[number], number)
    mix = dry + wet + reverb(wet)
    mix *= env(tvec(total), 0, total, 1.4, 3.2)
    return mix / (np.abs(mix).max() + 1e-9) * .88


def main():
    timeline = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    music = compose(timeline)
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as out:
        out.setparams((1, 2, RATE, 0, "NONE", "not compressed"))
        out.writeframes((music * 32767).astype("<i2").tobytes())
    content = buffer.getvalue()
    ident = hashlib.sha256(content).hexdigest()[:32] + ".wav"
    (MEDIA / ident).write_bytes(content)
    (MEDIA / (ident + ".json")).write_text(json.dumps(
        {"id": ident, "name": "चंदनपुर भाग 1 · संगीत.wav", "bytes": len(content), "type": "audio"}, ensure_ascii=False), encoding="utf-8")
    (HERE / "score.json").write_text(json.dumps({"id": ident, "duration": round(len(music) / RATE, 2)}), encoding="utf-8")
    print(ident, f"{len(music) / RATE:.1f}s")


if __name__ == "__main__":
    main()
