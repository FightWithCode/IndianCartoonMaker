"""Render still frames from a prepared job folder (timeline.json) to check composition quickly.

    python tools/still.py <job-folder> <out-folder> [--times 1.5,8,20] [--resolution 720] [--sheet]

Without --times, one frame is drawn near the middle of every shot. --sheet also tiles the frames
into a contact sheet (sheet.jpg). Use tools/preview.mjs to build the job folder from a storyboard.
"""
import argparse
import base64
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent))
import render  # noqa: E402  (reuses the renderer's browser lookup and asset routing)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("job")
    parser.add_argument("out")
    parser.add_argument("--times", default="")
    parser.add_argument("--resolution", type=int, default=720, choices=[720, 1080])
    parser.add_argument("--sheet", action="store_true")
    args = parser.parse_args()

    job = Path(args.job).resolve()
    out = Path(args.out).resolve()
    out.mkdir(parents=True, exist_ok=True)
    timeline = json.loads((job / "timeline.json").read_text(encoding="utf-8"))
    if args.times:
        times = [float(value) for value in args.times.split(",")]
    else:
        times = [min(timeline["duration"] - 0.05, shot["start"] + min(shot["duration"] * 0.55, 4.5)) for shot in timeline["shots"]]

    short = args.resolution
    long = short * 16 // 9
    width, height = (short, long) if timeline["ratio"] == "9:16" else (long, short)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(**render.browser_options())
        context = browser.new_context(viewport={"width": width, "height": height}, service_workers="block")
        page = context.new_page()
        page.route("**/*", render.route_asset)
        page.goto(render.ORIGIN + "/")
        for script in render.SCRIPTS:
            page.add_script_tag(content=(render.ROOT / "public" / script).read_text(encoding="utf-8"))
        page.evaluate("""async ({ timeline, width, height }) => {
            const canvas = document.getElementById('frame');
            canvas.width = width;
            canvas.height = height;
            const images = await VillageCanvas.loadImages(timeline);
            await document.fonts.ready;
            window.film = VillageCanvas.create(canvas, timeline, images);
            window.imageAt = (time, quality) => {
                film.drawAt(time);
                return canvas.toDataURL('image/jpeg', quality).split(',', 2)[1];
            };
        }""", {"timeline": timeline, "width": width, "height": height})
        files = []
        for index, time in enumerate(times):
            file = out / f"frame-{index + 1:02d}-{time:06.2f}.jpg"
            file.write_bytes(base64.b64decode(page.evaluate("t => imageAt(t, .93)", time)))
            files.append(file)
        browser.close()

    if args.sheet:
        from PIL import Image
        images = [Image.open(file) for file in files]
        thumb = 640 if width > height else 360
        scaled = [image.resize((thumb, round(thumb * image.height / image.width))) for image in images]
        columns = 3 if width > height else 5
        rows = -(-len(scaled) // columns)
        cell_w, cell_h = scaled[0].size
        sheet = Image.new("RGB", (columns * (cell_w + 4) + 4, rows * (cell_h + 4) + 4), "#111")
        for i, image in enumerate(scaled):
            sheet.paste(image, (4 + (i % columns) * (cell_w + 4), 4 + (i // columns) * (cell_h + 4)))
        sheet.save(out / "sheet.jpg", quality=88)
    print(f"{len(files)} frames in {out}")


if __name__ == "__main__":
    main()
