import { mkdir, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises';
import { join, isAbsolute, resolve } from 'node:path';
import { env, rendersDir, root } from './settings.mjs';
import { verifyMedia, saveLibrary } from './story.mjs';
import { makeAudio, srt } from './sound.mjs';
import { run } from './process.mjs';

// Render folders are named "<story>-v<number>" (for example jadui-chakki-aur-do-bhai-part-2-v3); the older
// "<date>-<title>-<random>" names are still read.
export const jobId = /^(?:\d{8}-[a-z0-9-]{1,80}-[a-f0-9]{8}|[a-z0-9][a-z0-9-]{0,80}-v\d{1,4})$/;
export const slugOf = text => String(text || '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

async function nextId(slug) {
  const taken = await readdir(rendersDir).catch(() => []);
  const used = taken.map(name => name.startsWith(slug + '-v') ? Number(name.slice(slug.length + 2)) : 0).filter(Number.isInteger);
  return `${slug}-v${Math.max(0, ...used) + 1}`;
}
const renderer = join(root, 'tools', 'render.py');
const bin = command => isAbsolute(command) || !/[\\/]/u.test(command) ? command : resolve(root, command);
const jobs = new Map();
const publicFiles = ['video.mp4', 'poster.jpg', 'captions.srt', 'storyboard.json'];

export async function checkRenderer() {
  const ffmpeg = (await run(env.ffmpeg, ['-hide_banner', '-filters'])).toString();
  await run(env.python, [renderer, '--check'], { cwd: root });
  return { renderer: 'Chromium Canvas', ffmpeg: true, offlineVoice: ffmpeg.includes('flite') };
}

async function saveStatus(cwd, status) {
  const temp = join(cwd, 'job.tmp');
  await writeFile(temp, JSON.stringify(status, null, 2), 'utf8');
  await rename(temp, join(cwd, 'job.json'));
}

export async function readJob(id) {
  if (!jobId.test(id)) return null;
  if (jobs.has(id)) return jobs.get(id);
  try {
    const status = JSON.parse(await readFile(join(rendersDir, id, 'job.json'), 'utf8'));
    if (status.status === 'working') return { ...status, status: 'error', stage: 'Studio stopped before export finished. Start a new export.' };
    return status;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return null;
  }
}

export async function readHistory() {
  const list = await readdir(rendersDir).catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return [];
  });
  const entries = await Promise.all(list.filter(id => jobId.test(id)).slice(-400).map(readJob));
  return entries.filter(Boolean).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20);
}

export function exportFile(id, file) {
  if (!jobId.test(id) || !publicFiles.includes(file)) return null;
  return join(rendersDir, id, file);
}

export async function startExport(story, settings = {}, onProgress) {
  await verifyMedia(story);
  // Name: an explicit slug ("slug" in the storyboard, or --name), else the Latin letters of the title.
  const slug = slugOf(settings.name) || slugOf(story.slug) || slugOf(story.title) || 'village-story';
  const createdAt = new Date().toISOString();
  const id = await nextId(slug);
  const cwd = join(rendersDir, id);
  await mkdir(cwd, { recursive: true });
  const status = { id, createdAt, title: story.title, ratio: story.ratio, status: 'working', stage: 'Preparing the storyboard', percent: 2, warnings: story.warnings };
  const report = (stage, percent) => {
    Object.assign(status, { stage, percent });
    onProgress?.(stage, percent);
  };
  await saveStatus(cwd, status);
  jobs.set(id, status);
  const done = (async () => {
    try {
      await writeFile(join(cwd, 'storyboard.json'), JSON.stringify(story, null, 2), 'utf8');
      const timeline = await makeAudio(story, settings, cwd, report);
      await writeFile(join(cwd, 'timeline.json'), JSON.stringify(timeline), 'utf8');
      await writeFile(join(cwd, 'captions.srt'), srt(timeline), 'utf8');
      report('Starting the frame renderer', 38);
      const fps = [24, 25, 30].includes(settings.fps) ? settings.fps : 25;
      const resolution = settings.resolution === 1080 ? 1080 : 720;
      await run(bin(env.python), [renderer, '--job', cwd, '--fps', String(fps), '--resolution', String(resolution), '--ffmpeg', bin(env.ffmpeg)], {
        cwd: root,
        onLine(line) {
          try {
            const { stage, percent } = JSON.parse(line);
            report(stage, percent);
          } catch {
            // Renderer progress is optional. Exit status determines success.
          }
        },
      });
      await unlink(join(cwd, 'mix.wav')).catch(() => {});
      await unlink(join(cwd, 'encode.log')).catch(() => {});
      try {
        await saveLibrary(story);
      } catch (error) {
        timeline.warnings.push(`The video rendered but the shared library could not be saved: ${error.message}`);
      }
      Object.assign(status, { status: 'done', duration: timeline.duration, fps, resolution, warnings: timeline.warnings, voice: timeline.voice });
      report('MP4 ready', 100);
    } catch (error) {
      Object.assign(status, { status: 'error', error: error.message });
      report('Export failed', status.percent);
      await unlink(join(cwd, 'video.partial.mp4')).catch(() => {});
      await unlink(join(cwd, 'mix.wav')).catch(() => {});
    }
    try {
      await saveStatus(cwd, status);
      jobs.delete(id);
    } catch (error) {
      status.warnings = [...status.warnings, `Could not write job history: ${error.message}`];
    }
    return status;
  })();
  return { id, cwd, done };
}
