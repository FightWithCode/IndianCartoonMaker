"""Draw storyboard frames in headless Chromium and stream them to FFmpeg."""
import argparse
import base64
import json
import math
import mimetypes
import os
from pathlib import Path
import re
import subprocess
import sys

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ["draw.js", "rig-lib.js", "face.js", "lipsync.js", "inserts.js", "scenery.js", "cast.js", "canvas.js"]
ORIGIN = "https://gaon-render.local"


def browser_options():
    options = {"headless": True, "timeout": 30000}
    configured = os.environ.get("CHROMIUM_PATH")
    if configured:
        return {**options, "executable_path": configured}
    if sys.platform == "win32":
        program_files = [os.environ.get("ProgramFiles"), os.environ.get("ProgramFiles(x86)"), os.environ.get("LOCALAPPDATA")]
        for product in ["Google/Chrome/Application/chrome.exe", "Microsoft/Edge/Application/msedge.exe"]:
            for folder in filter(None, program_files):
                executable = Path(folder) / product
                if executable.is_file():
                    return {**options, "executable_path": str(executable)}
    return options


def route_asset(route):
    url = route.request.url
    path = url.removeprefix(ORIGIN)
    if path == "/":
        route.fulfill(content_type="text/html", body='<!doctype html><meta charset="utf-8"><canvas id="frame"></canvas>')
        return
    if path == "/plates/banyan-square.jpg":
        file = ROOT / "public" / "plates" / "banyan-square.jpg"
    elif re.fullmatch(r"/media/[a-f0-9]{32}\.(jpg|jpeg|png|webp)", path):
        file = ROOT / "data" / "media" / path.rsplit("/", 1)[1]
    else:
        route.abort()
        return
    route.fulfill(path=file, content_type=mimetypes.guess_type(file)[0] or "application/octet-stream")


def emit(stage, percent):
    print(json.dumps({"stage": stage, "percent": percent}), flush=True)


def render(browser, args):
    job = Path(args.job).resolve()
    timeline = json.loads((job / "timeline.json").read_text(encoding="utf-8"))
    short_edge = args.resolution
    long_edge = short_edge * 16 // 9
    width, height = ((short_edge, long_edge) if timeline["ratio"] == "9:16" else (long_edge, short_edge))
    total = math.ceil(timeline["duration"] * args.fps)
    context = browser.new_context(viewport={"width": width, "height": height}, service_workers="block")
    page = context.new_page()
    page.route("**/*", route_asset)
    page.goto(ORIGIN + "/")
    for script in SCRIPTS:
        page.add_script_tag(content=(ROOT / "public" / script).read_text(encoding="utf-8"))
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
    poster_time = min(1.8, timeline["duration"] * 0.7)
    (job / "poster.jpg").write_bytes(base64.b64decode(page.evaluate("t => imageAt(t, .96)", poster_time)))

    ffmpeg_args = [
        args.ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
        "-f", "image2pipe", "-c:v", "mjpeg", "-framerate", str(args.fps), "-i", "pipe:0",
        "-i", "mix.wav", "-map", "0:v:0", "-map", "1:a:0",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-pix_fmt", "yuv420p",
        "-vf", "scale=in_range=full:out_range=tv", "-color_range", "tv",
        "-c:a", "aac", "-b:a", "128k", "-ar", "48000",
        "-movflags", "+faststart", "video.partial.mp4",
    ]
    with (job / "encode.log").open("wb") as log:
        encoder = subprocess.Popen(ffmpeg_args, cwd=job, stdin=subprocess.PIPE, stderr=log, stdout=subprocess.DEVNULL)
        try:
            for start in range(0, total, 8):
                end = min(start + 8, total)
                frames = page.evaluate("""({ start, end, fps }) =>
                    Array.from({ length: end - start }, (_, i) => imageAt((start + i) / fps, .94))
                """, {"start": start, "end": end, "fps": args.fps})
                for frame in frames:
                    encoder.stdin.write(base64.b64decode(frame))
                if start % 48 == 0 or end == total:
                    emit(f"Drawing frames {end:,} / {total:,}", round(39 + 58 * end / total))
            encoder.stdin.close()
            if encoder.wait(timeout=180) != 0:
                raise RuntimeError("FFmpeg could not encode the video.")
        except BaseException as error:
            if encoder.poll() is None:
                encoder.kill()
                encoder.wait()
            message = (job / "encode.log").read_text(encoding="utf-8", errors="replace").strip()
            if message:
                raise RuntimeError(f"{error}\n{message}") from error
            raise
        finally:
            context.close()
    (job / "video.partial.mp4").replace(job / "video.mp4")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--job")
    parser.add_argument("--ffmpeg", default="ffmpeg")
    parser.add_argument("--fps", type=int, default=25, choices=[24, 25, 30])
    parser.add_argument("--resolution", type=int, default=720, choices=[720, 1080])
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(**browser_options())
        try:
            if args.check:
                page = browser.new_page()
                assert page.evaluate("!!document.createElement('canvas').getContext('2d')")
                print("Chromium Canvas OK")
            else:
                render(browser, args)
        finally:
            browser.close()


if __name__ == "__main__":
    main()
