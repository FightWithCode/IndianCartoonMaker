// Build a job folder (timeline + mixed audio) from a storyboard without encoding video, then
// optionally draw still frames. Handy for checking shot composition and timing.
//
//   node tools/preview.mjs <storyboard.json> <job-folder> [--stills <out-folder>] [--times 1,5,9] [--resolution 720|1080] [--voice voicestudio|offline]
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { readLibrary, resolveStory, verifyMedia } from '../src/story.mjs';
import { makeAudio, srt } from '../src/sound.mjs';
import { run } from '../src/process.mjs';
import { env } from '../src/settings.mjs';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: Object.fromEntries(['stills', 'times', 'resolution', 'voice'].map(key => [key, { type: 'string' }])),
});
const [file, folder] = positionals;
if (!file || !folder) throw new Error('Usage: node tools/preview.mjs <storyboard.json> <job-folder> [--stills <folder>] [--times 1,5,9]');
const cwd = resolve(folder);
await mkdir(cwd, { recursive: true });
const raw = JSON.parse((await readFile(resolve(file), 'utf8')).replace(/^﻿/u, ''));
const story = resolveStory(raw, await readLibrary());
await verifyMedia(story);
const timeline = await makeAudio(story, { voiceEngine: values.voice || 'voicestudio' }, cwd, (stage, percent) => {
  if (percent >= 34) console.log(stage);
});
await writeFile(join(cwd, 'timeline.json'), JSON.stringify(timeline), 'utf8');
await writeFile(join(cwd, 'captions.srt'), srt(timeline), 'utf8');
console.log(`${timeline.shots.length} shots, ${timeline.duration}s`);
for (const [i, shot] of timeline.shots.entries()) {
  console.log(`${String(i + 1).padStart(2)}  ${String(shot.start).padStart(7)}s  +${String(shot.duration).padStart(5)}s  ${shot.name}`);
}
for (const warning of timeline.warnings) console.log(`warning: ${warning}`);
if (values.stills) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const args = [join(root, 'tools', 'still.py'), cwd, resolve(values.stills), '--sheet', '--resolution', values.resolution || '720'];
  if (values.times) args.push('--times', values.times);
  await run(env.python, args, { cwd: root });
  console.log(`Stills in ${resolve(values.stills)}`);
}
