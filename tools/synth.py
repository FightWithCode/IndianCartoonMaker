"""Small additive synthesizers for composing original film scores (no samples, no downloads).

Used by the score scripts in productions/*/build/score.py. Everything is mono at RATE.
Set `tonic` (Hz) and call `seed()` before composing; the same seed gives the same score.
"""
import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

RATE = 24000
TAU = 2 * np.pi
tonic = 146.832                      # D3
_rng = np.random.default_rng(1)


def seed(value):
    global _rng
    _rng = np.random.default_rng(value)


def tvec(duration):
    return np.arange(round(duration * RATE)) / RATE


def env(t, start, stop, attack, release):
    return np.minimum(np.clip((t - start) / attack, 0, 1), np.clip((stop - t) / release, 0, 1))


def air(t, low, high):
    return sosfilt(butter(2, (low, high), btype="bandpass", fs=RATE, output="sos"), _rng.normal(size=len(t)))


def add(out, signal, offset, gain=1.0):
    start = round(offset * RATE)
    if start < 0:                      # a note that begins before the film: drop the part before 0
        signal, start = signal[-start:], 0
    if start >= len(out):
        return
    count = min(len(signal), len(out) - start)
    if count > 0:
        out[start:start + count] += signal[:count] * gain


def freq(note):
    return tonic * 2 ** (note / 12)


def pluck(note, duration=3.2):
    """Tanpura-style string: bright partials with a slow buzz."""
    t = tvec(duration)
    phase = TAU * freq(note) * t
    body = sum(np.sin(phase * h + 0.03 * np.sin(t * 5 + h)) * g * np.exp(-t * d)
               for h, g, d in [(1, 1, 1.5), (2, .30, 3.0), (3, .20, 4.0), (4, .12, 5.5), (5, .08, 7), (7, .05, 11)])
    return (body + 0.05 * air(t, 500, 2400) * np.exp(-t * 60)) * env(t, 0, duration, .018, .25)


def flute(note, duration, vibrato=1.0):
    """Bansuri-like breathy flute with a late vibrato."""
    t = tvec(duration)
    f = freq(note) * (1 + 0.013 * vibrato * np.sin(TAU * 4.6 * t) * np.clip(t - .22, 0, .35))
    p = np.cumsum(TAU * f / RATE)
    tone = np.sin(p) + .13 * np.sin(2 * p + .1) + .05 * np.sin(3 * p)
    return (tone + .07 * air(t, 900, 2600)) * env(t, 0, duration, .16, .38) * (.88 + .12 * np.sin(t * 2.7) ** 2)


def pad(notes, duration):
    """Warm string pad: detuned pairs of sines per note, slowly swelling."""
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


def reverb(signal, seconds=2.4, decay=2.2, wet=.075):
    t = tvec(seconds)
    ir = air(t, 220, 5500) * np.exp(-t * decay)
    ir[:int(RATE * .012)] = 0
    ir /= np.abs(ir).max() + 1e-9
    return fftconvolve(signal, ir, mode="full")[:len(signal)] * wet
