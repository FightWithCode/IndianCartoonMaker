import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { demoPath } from './settings.mjs';
import { readLibrary, resolveStory } from './story.mjs';
import { planScript } from './plan.mjs';
import { checkRenderer, startExport } from './export.mjs';

try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: Object.fromEntries(['ratio', 'language', 'planner', 'model', 'voice', 'voice-model', 'narrator-voice', 'notes', 'title', 'name', 'out', 'fps', 'resolution'].map(key => [key, { type: 'string' }])),
  });
  const [action, file] = positionals;
  if (action === 'check') {
    console.log(await checkRenderer());
  } else if (action === 'plan' && file) {
    const story = await planScript({
      ...values,
      script: (await readFile(resolve(file), 'utf8')).replace(/^\uFEFF/u, ''),
      notes: values.notes ? await readFile(resolve(values.notes), 'utf8') : '',
    }, await readLibrary());
    const output = JSON.stringify(story, null, 2);
    if (values.out) {
      await writeFile(resolve(values.out), output, 'utf8');
      console.log(resolve(values.out));
    } else console.log(output);
  } else if (action === 'demo' || (action === 'render' && file)) {
    const raw = JSON.parse((await readFile(action === 'demo' ? demoPath : resolve(file), 'utf8')).replace(/^\uFEFF/u, ''));
    const story = resolveStory({ ...raw, ratio: values.ratio || raw.ratio }, await readLibrary());
    const job = await startExport(story, {
      voiceEngine: values.voice || (action === 'demo' ? 'offline' : 'auto'), voiceModel: values['voice-model'],
      narratorVoice: values['narrator-voice'], name: values.name, fps: Number(values.fps), resolution: Number(values.resolution),
    }, (stage, percent) => console.log(`[${String(percent).padStart(3)}%] ${stage}`));
    const result = await job.done;
    if (result.status !== 'done') throw new Error(result.error);
    console.log(join(job.cwd, 'video.mp4'));
    if (result.warnings.length) console.log(result.warnings.join('\n'));
  } else {
    throw new Error('Use npm run demo, npm run check, npm run plan -- script.txt, or npm run render -- storyboard.json.');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
