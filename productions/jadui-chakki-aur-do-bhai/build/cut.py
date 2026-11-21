"""Cut the supplied voice-over (Part 1.mp3, Part 2.mp3, Part 3.mp3) into one clip per clause.

    python build/cut.py            slices, stores the clips in data/media, verifies each, writes build/voices.json

Clause boundaries come from the silences in the recordings (ffmpeg silencedetect, -38 dB, 0.18 s):
each clip runs from the end of one pause to the start of the next. Cutting per clause lets every
caption and every shot follow the narrator exactly, instead of estimating timing from text length.

NAMES. The brothers are सोहन (the rich elder) and माधव (the poor potter): those are the original
names, and the captions use them everywhere. The recordings differ: Part 1 says them, but the
narrator of Parts 2 and 3 says "गजराज" and "सूरज". The captions therefore follow the story, not
those spoken words, in clips b1, b5, c1, c2, c3, c8 and c14. Re-record those clauses with the
original names and nothing else needs to change.

Each clip has a stable key (a1.., b1.., c1..) that board.mjs uses, so adding or splitting clips
does not renumber the shots.
"""
import difflib
import hashlib
import io
import json
import re
import subprocess
import wave
from pathlib import Path

import numpy as np
from scipy.signal import resample_poly

HERE = Path(__file__).resolve().parent
PRODUCTION = HERE.parent
ROOT = PRODUCTION.parents[1]
MEDIA = ROOT / "data" / "media"
RATE = 24000

# (key, part, start, end, text and caption)
CLIPS = [
    ("a1", 1, 0.00, 4.05, "चंदनपुर नाम के एक हरे-भरे गांव में दो भाई रहते थे—"),
    ("a2", 1, 4.70, 5.76, "बड़ा भाई सोहन"),
    ("a3", 1, 6.15, 7.64, "और छोटा भाई माधव।"),
    ("a4", 1, 8.84, 11.79, "सोहन गांव का सबसे बड़ा अनाज व्यापारी था।"),
    ("a5", 1, 12.34, 14.40, "उसके पास आलीशान हवेली,"),
    ("a6", 1, 14.72, 18.54, "नौकर-चाकर और अनाज से भरे बड़े-बड़े गोदाम थे।"),
    ("a7", 1, 19.65, 23.45, "वहीं, माधव एक सीधा-सादा कुम्हार था,"),
    ("a8", 1, 24.04, 25.28, "जो अपनी पत्नी कविता"),
    ("a9", 1, 25.61, 29.76, "और बूढ़ी मां के साथ गांव के बाहर एक छोटी सी झोपड़ी में रहता था।"),

    ("b1", 2, 0.22, 3.35, "माधव दिन भर चाक पर मिट्टी के बर्तन बनाता"),
    ("b2", 2, 3.67, 6.96, "और उन्हें बाजार में बेचकर किसी तरह घर चलाता।"),
    ("b3", 2, 7.52, 10.26, "एक साल गांव में भयंकर बाढ़ आ गई।"),
    ("b4", 2, 10.70, 12.74, "बारिश रुकने का नाम नहीं ले रही थी,"),
    ("b5", 2, 13.11, 16.34, "जिससे माधव के कच्चे बर्तन गलकर मिट्टी में मिल गए।"),
    ("b6", 2, 16.81, 18.62, "कई दिनों तक चूल्हा नहीं जला"),
    ("b7", 2, 18.97, 21.22, "और बूढ़ी मां की तबीयत भी बिगड़ने लगी।"),

    ("c1", 3, 0.00, 3.61, "हारकर माधव अपने बड़े भाई सोहन के पास गया।"),
    ("c2", 3, 5.57, 11.02, "सोहन उस समय अपने बरामदे में बैठकर सोने के सिक्के गिन रहा था।"),
    ("c3", 3, 11.59, 13.34, "माधव ने हाथ जोड़कर कहा,"),
    ("c4", 3, 13.72, 17.08, "“भैया, बाढ़ ने मेरा सारा काम चौपट कर दिया है।"),
    ("c5", 3, 17.57, 20.90, "मां बीमार है और घर में अनाज का एक दाना भी नहीं है।"),
    ("c6", 3, 21.50, 24.56, "मुझे बस एक बोरी गेहूं और थोड़े पैसे उधार दे दो,"),
    ("c7", 3, 24.97, 26.50, "मैं मौसम खुलते ही चुका दूंगा।”"),
    ("c8", 3, 26.83, 30.89, "सोहन ने तिजोरी का दरवाजा जोर से बंद किया और गुस्से में बोला,"),
    ("c9", 3, 31.11, 33.47, "“मेरे गोदाम का अनाज बेचने के लिए है,"),
    ("c10", 3, 33.84, 35.24, "मुफ्त में बांटने के लिए नहीं।"),
    ("c11", 3, 36.00, 39.51, "तेरे जैसे आलसी लोग हमेशा मुसीबत का रोना रोते रहते हैं।"),
    ("c12", 3, 39.97, 40.78, "निकल जा यहां से"),
    ("c13", 3, 41.13, 43.43, "और दोबारा मेरे दरवाजे पर कदम मत रखना!”"),
    ("c14", 3, 43.78, 45.86, "माधव की आंखों में आंसू आ गए,"),
    ("c15", 3, 46.31, 51.11, "लेकिन उसने बिना कुछ कहे चुपचाप वहां से कदम वापस ले लिए।"),

    # Part 4: the hill, the storm, the sage (names in this recording match the captions)
    ("d1", 4, 0.60, 4.81, "अपने ही भाई के दरवाजे से अपमानित होकर लौटे माधव ने"),
    ("d2", 4, 5.26, 6.20, "हिम्मत नहीं हारी।"),
    ("d3", 4, 6.91, 7.67, "अगली सुबह,"),
    ("d4", 4, 8.08, 10.87, "वह चिकनी मिट्टी की तलाश में गांव से दूर"),
    ("d5", 4, 11.24, 13.71, "खतरनाक ‘काली पहाड़ी’ की ओर निकल पड़ा।"),
    ("d6", 4, 14.32, 17.53, "पहाड़ी पर चढ़ते ही अचानक मौसम ने करवट ली।"),
    ("d7", 4, 18.19, 21.25, "तेज आंधी और घने कोहरे ने रास्ता ढक लिया—"),
    ("d8", 4, 21.85, 26.02, "और माधव भटककर एक अनजान, सुनसान हिस्से में जा पहुंचा।"),
    ("e1", 4, 26.75, 30.75, "गुफा के बाहर एक अत्यंत वृद्ध और कमजोर साधु"),
    ("e2", 4, 30.97, 32.25, "ठंड से कांप रहे थे।"),
    ("e3", 4, 32.78, 36.30, "खुद भूखे होने के बावजूद,"),
    ("e4", 4, 36.73, 40.79, "माधव ने बिना एक पल सोचे अपनी चादर साधु को ओढ़ा दी"),
    ("e5", 4, 41.29, 45.70, "और अपने हिस्से की आखिरी दो सूखी रोटियां और पानी उन्हें दे दिया।"),
    ("f1", 4, 46.38, 49.06, "साधु ने तृप्त होकर मुस्कुराते हुए कहा—"),
    ("f2", 4, 49.56, 51.99, "“बेटा, तुम खुद संकट में हो,"),
    ("f3", 4, 52.64, 55.11, "फिर भी तुमने एक अनजान की सेवा की।”"),
    ("f4", 4, 55.68, 59.44, "साधु गुफा से एक छोटी पत्थर की चक्की लाए और बोले—"),
    ("f5", 4, 59.89, 62.25, "“इसे बाईं ओर घुमाकर जो मांगोगे,"),
    ("f6", 4, 62.64, 63.48, "यह वही देगी,"),
    ("f7", 4, 64.05, 66.37, "और दाईं ओर घुमाने पर रुक जाएगी।"),
    ("f9", 4, 67.03, 71.27, "पर याद रखना, इसका उपयोग केवल भलाई के लिए करना!”"),
    ("g1", 4, 71.68, 74.29, "इतना कहकर साधु गुफा के भीतर चले गए"),
    ("g2", 4, 74.81, 77.86, "और देखते ही देखते आंखों से ओझल हो गए।"),
    ("g3", 4, 78.59, 81.03, "माधव स्तब्ध खड़ा देखता रह गया—"),
    ("g4", 4, 81.50, 83.14, "क्या यह कोई सपना था,"),
    ("g5", 4, 84.07, 86.40, "या भगवान का भेजा हुआ चमत्कार?"),

    # Part 5: the mill comes home, prosperity, and Sohan's jealousy
    ("h1", 5, 0.00, 3.29, "माधव वो छोटी सी चक्की लेकर घर लौटा।"),
    ("h2", 5, 3.84, 6.36, "उसने कविता और मां को पूरी बात बताई।"),
    ("h3", 5, 7.07, 9.03, "पहले तो उन्हें यकीन नहीं हुआ,"),
    ("h4", 5, 9.54, 13.74, "आखिर एक मामूली सा पत्थर का टुकड़ा भूखे पेट को कैसे भर सकता है?"),
    ("h5", 5, 14.21, 15.42, "खाना कैसे दे सकता है?"),
    ("h7", 5, 17.29, 20.46, "लेकिन जब माधव ने चक्की को बाईं ओर घुमाकर कहा,"),
    ("h8", 5, 20.73, 21.70, "“हे जादुई चक्की,"),
    ("h9", 5, 21.93, 24.14, "हमें खाने के लिए गेहूं और चावल दो,”"),
    ("h10", 5, 24.42, 26.48, "तो चक्की अपने आप घूमने लगी"),
    ("h11", 5, 26.77, 30.48, "और उससे साफ-सुथरे गेहूं और चावल के दाने निकलने लगे।"),
    ("h12", 5, 31.01, 33.63, "जैसे ही माधव ने चक्की को दाईं ओर घुमाया,"),
    ("h13", 5, 34.03, 34.99, "वह तुरंत रुक गई।"),
    ("h14", 5, 35.52, 39.40, "इस चमत्कार से माधव के परिवार के सारे दुख खत्म हो गए।"),
    ("h15", 5, 39.92, 41.84, "उसने मां का अच्छा इलाज करवाया,"),
    ("h16", 5, 42.20, 47.49, "झोपड़ी की जगह एक सुंदर घर बनवाया और अपनी कुम्हारी का काम भी फिर से शुरू किया।"),
    ("h17", 5, 48.06, 50.16, "मगर अमीर होने के बाद भी"),
    ("h18", 5, 50.36, 52.13, "माधव ने कभी घमंड नहीं किया।"),
    ("h19", 5, 52.74, 57.42, "गांव में जब भी किसी गरीब को अनाज, कपड़े या दवा की जरूरत होती,"),
    ("h20", 5, 57.91, 61.80, "माधव चुपचाप चक्की से सामान निकालकर उनकी मदद कर देता।"),
    ("h21", 5, 62.35, 65.89, "पूरे गांव में माधव की दरियादिली के चर्चे होने लगे।"),
    ("h22", 5, 66.42, 70.02, "लेकिन यह खबर जब बड़े भाई सोहन के कानों तक पहुंची,"),
    ("h23", 5, 70.53, 73.36, "तो उसके सीने में ईर्ष्या की आग भड़क उठी।"),
]


def slice_clip(part, start, end):
    source = PRODUCTION / f"Part {part}.mp3"
    pad = 0.05
    a = max(0.0, start - pad)
    length = (end + pad) - a
    return subprocess.run([
        "ffmpeg", "-v", "error", "-ss", f"{a:.3f}", "-t", f"{length:.3f}", "-i", str(source),
        "-af", f"highpass=f=60,afade=t=in:d=0.012,afade=t=out:st={max(0, length - 0.02):.3f}:d=0.02",
        "-ac", "1", "-ar", str(RATE), "-f", "wav", "pipe:1"], capture_output=True, check=True).stdout


def store(name, content):
    ident = hashlib.sha256(content).hexdigest()[:32] + ".wav"
    (MEDIA / ident).write_bytes(content)
    (MEDIA / (ident + ".json")).write_text(json.dumps(
        {"id": ident, "name": name + ".wav", "bytes": len(content), "type": "audio"}, ensure_ascii=False), encoding="utf-8")
    return ident


def main():
    from faster_whisper import WhisperModel
    engine = WhisperModel("small", device="cpu", compute_type="int8", cpu_threads=4, local_files_only=True)
    clean = lambda text: re.sub(r"[^ऀ-ॿ]", "", text.replace("।", ""))
    import sys
    only = int(sys.argv[1]) if len(sys.argv) > 1 else None   # e.g. `cut.py 4` re-cuts just Part 4 and keeps the other rows
    path = HERE / "voices.json"
    old = json.loads(path.read_text(encoding="utf-8")) if only and path.exists() else []
    rows = [r for r in old if r["part"] != only]
    for key, part, start, end, text in CLIPS:
        if only and part != only:
            continue
        wav = slice_clip(part, start, end)
        ident = store(f"जादुई चक्की · {key}", wav)
        with wave.open(io.BytesIO(wav), "rb") as handle:
            y = np.frombuffer(handle.readframes(handle.getnframes()), "<i2").astype(np.float32) / 32768
        segments, _ = engine.transcribe(resample_poly(y, 2, 3).astype(np.float32), language="hi", beam_size=5, condition_on_previous_text=False)
        heard = " ".join(s.text.strip() for s in segments)
        score = difflib.SequenceMatcher(None, clean(text), clean(heard)).ratio()
        rows.append({"key": key, "part": part, "start": start, "end": end, "text": text, "caption": text,
                     "audio": ident, "duration": round(len(y) / RATE, 3), "match": round(score, 3), "heard": heard})
        print(f"{key:>3} P{part} {start:5.2f}-{end:5.2f} {len(y) / RATE:5.2f}s match {score:.2f}  {heard}", flush=True)
    rows.sort(key=lambda r: (r["part"], r["start"]))
    path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{len(rows)} clips, {sum(r['duration'] for r in rows):.1f}s")


if __name__ == "__main__":
    main()
