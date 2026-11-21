"""Compose an original score for the film, timed to its real shot boundaries.

    python build/score.py <job-folder>/timeline.json [2]    (reads build/music.json, writes build/score.json;
                                                             with "2": music2.json -> score2.json, for Part 2)

build/music.json (written by board.mjs) names a mood for every shot. The music follows the story:
a bright pastoral opening, a glittering "wealth" colour for Gajraj, a humble warm colour for the
potter's family, tense low strings and a heartbeat for the flood and Gajraj's anger, and a
sorrowful minor mode for hunger, sickness and the walk away.
"""
import hashlib
import io
import json
import sys
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "tools"))
import synth as S  # noqa: E402

HERE = Path(__file__).resolve().parent
MEDIA = ROOT / "data" / "media"
S.seed(20261121)

SAD = [[(12, 1.7), (13, .8), (12, .8), (10, 1.3), (8, .8), (7, 2.6)],
       [(7, 1.2), (8, .8), (10, 1.7), (12, 2.3), (10, .8), (8, 1.0), (7, 2.8)],
       [(15, 1.5), (13, .8), (12, 1.2), (10, .9), (12, 3.0)]]
HOPE = [[(12, .8), (14, .8), (16, 1.3), (19, 1.7), (16, .8), (14, .8), (12, 2.2)],
        [(16, .8), (19, .8), (21, 1.7), (24, 2.6), (21, .9), (19, 2.2)]]
CALM = [[(12, 1.7), (16, 1.3), (14, .9), (12, 1.7), (9, 2.6)],
        [(9, 1.3), (12, 1.7), (14, 1.3), (16, 2.1), (14, 1.1), (12, 2.8)]]
NIGHT = [[(12, 2.1), (15, 1.3), (14, .9), (12, 1.7), (10, 3.2)],
         [(10, 1.4), (12, 1.9), (15, 1.5), (17, 2.4), (15, 1.0), (12, 3.0)]]

# mood -> phrases, pad chord (semitones above the tonic), pad level, flute level, rhythm, bell sparkles
MOODS = {
    "pastoral": dict(phr=HOPE, chord=[0, 4, 7, 12], pad=.046, flute=.060, pulse="light", bells=[(0.8, [24, 28, 31, 36])]),
    "wealth":   dict(phr=HOPE, chord=[0, 4, 7, 12], pad=.040, flute=.044, pulse="light", bells="sparkle"),
    "humble":   dict(phr=CALM, chord=[0, 7, 12], pad=.040, flute=.052, pulse=None, bells=[]),
    "flood":    dict(phr=NIGHT, chord=[0, 1, 7], pad=.056, flute=.032, pulse="heart", bells=[]),
    "cold":     dict(phr=SAD, chord=[0, 3, 7], pad=.052, flute=.050, pulse=None, bells=[]),
    "walk":     dict(phr=NIGHT, chord=[-5, 0, 3, 7], pad=.045, flute=.050, pulse=None, bells=[]),
    "plea":     dict(phr=SAD, chord=[0, 3, 7, 12], pad=.050, flute=.048, pulse=None, bells=[]),
    "anger":    dict(phr=NIGHT, chord=[0, 1, 7], pad=.060, flute=.018, pulse="heart", bells=[]),
    "sad":      dict(phr=SAD, chord=[-5, 0, 3, 7], pad=.054, flute=.050, pulse=None, bells=[]),
    # Part 2: the hill, the storm and the sage
    "dawn":     dict(phr=CALM, chord=[0, 7, 12], pad=.044, flute=.050, pulse=None, bells=[(1.2, [24, 31])]),
    "peak":     dict(phr=NIGHT, chord=[0, 1, 7], pad=.058, flute=.020, pulse="heart", bells=[]),
    "climb":    dict(phr=HOPE, chord=[0, 7, 12], pad=.042, flute=.052, pulse=None, bells=[]),
    "storm":    dict(phr=NIGHT, chord=[0, 1, 6], pad=.064, flute=.016, pulse="heart", bells=[]),
    "cave":     dict(phr=NIGHT, chord=[0, 7, 12], pad=.050, flute=.040, pulse=None, bells=[(2.0, [28, 36])]),
    "kind":     dict(phr=SAD, chord=[0, 4, 7, 12], pad=.050, flute=.056, pulse=None, bells=[(2.4, [31, 36, 40])]),
    "divine":   dict(phr=HOPE, chord=[0, 4, 7, 12], pad=.048, flute=.050, pulse=None, bells="sparkle"),
    "vanish":   dict(phr=HOPE, chord=[0, 4, 7, 12, 16], pad=.052, flute=.036, pulse=None, bells="sparkle"),
    "wonder":   dict(phr=CALM, chord=[0, 4, 7, 12], pad=.046, flute=.048, pulse="light", bells="sparkle"),
}


def section(dry, wet, start, length, cfg, index, first):
    S.add(wet, S.pad(cfg["chord"], length + 1.2), start - .4, cfg["pad"])
    cursor = start + (1.6 if first else .7)
    k = index
    while cursor < start + length - 2.0:
        for n, d in cfg["phr"][k % len(cfg["phr"])]:
            if cursor + d > start + length + 1.0:
                break
            S.add(wet, S.flute(n, d + .25), cursor, cfg["flute"])
            cursor += d
        k += 1
        cursor += 1.5 + .4 * (k % 3)
    bells = cfg["bells"]
    if bells == "sparkle":                              # gold glints scattered through the section
        bells = [(.6 + 2.1 * j, [[28, 31, 36], [31, 36, 40], [24, 28, 31]][j % 3]) for j in range(int(length // 2.1))]
    for at, notes in bells:
        for j, n in enumerate(notes):
            S.add(wet, S.bell(n), start + at + j * .13, .04)
    if cfg["pulse"] == "light":
        for j, c in enumerate(np.arange(0, length - .4, .62)):
            S.add(dry, S.dholak(j % 2 == 1), start + c + (.02 if j % 2 else 0), .034 if j % 2 == 0 else .02)
    elif cfg["pulse"] == "heart":                       # a slow, low heartbeat
        for c in np.arange(.3, length - .5, 1.15):
            S.add(dry, S.dholak(False), start + c, .075)
            S.add(dry, S.dholak(False), start + c + .30, .045)


def compose(timeline, moods):
    total = timeline["duration"] + 3.0
    dry = np.zeros(round(total * S.RATE))
    wet = np.zeros_like(dry)
    period = 3.1                                        # tanpura cycle: Pa - Sa - Sa - low Sa
    for c in np.arange(0, total - 2, period):
        for j, n in enumerate([-5, 0, 0, -12]):
            S.add(dry, S.pluck(n), c + j * period / 4, .095 * (1 - .06 * j))
    for number, shot in enumerate(timeline["shots"], 1):
        section(dry, wet, shot["start"], shot["duration"], MOODS[moods[number - 1]], number, number == 1)
    mix = dry + wet + S.reverb(wet)
    mix *= S.env(S.tvec(total), 0, total, 1.4, 3.2)
    return mix / (np.abs(mix).max() + 1e-9) * .88


def main():
    timeline = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    tag = sys.argv[2] if len(sys.argv) > 2 else ""
    moods = json.loads((HERE / f"music{tag}.json").read_text(encoding="utf-8"))
    assert len(moods) == len(timeline["shots"]), "music.json and the timeline have different shot counts; rebuild the board"
    music = compose(timeline, moods)
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as out:
        out.setparams((1, 2, S.RATE, 0, "NONE", "not compressed"))
        out.writeframes((music * 32767).astype("<i2").tobytes())
    content = buffer.getvalue()
    ident = hashlib.sha256(content).hexdigest()[:32] + ".wav"
    (MEDIA / ident).write_bytes(content)
    (MEDIA / (ident + ".json")).write_text(json.dumps(
        {"id": ident, "name": f"जादुई चक्की · संगीत{tag}.wav", "bytes": len(content), "type": "audio"}, ensure_ascii=False), encoding="utf-8")
    (HERE / f"score{tag}.json").write_text(json.dumps({"id": ident, "duration": round(len(music) / S.RATE, 2)}), encoding="utf-8")
    print(ident, f"{len(music) / S.RATE:.1f}s")


if __name__ == "__main__":
    main()
