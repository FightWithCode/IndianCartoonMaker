import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { dataDir, env, hash, key, mediaPath } from './settings.mjs';
import { run } from './process.mjs';

const RATE = 24000;
const TAU = Math.PI * 2;
const cacheDir = join(dataDir, 'speech-cache');
const fliteVoices = ['kal', 'rms', 'awb', 'slt', 'kal16'];
const clamp = (x, low, high) => Math.max(low, Math.min(high, x));
const round = value => Math.round(value * 1000) / 1000;
const emotionSfx = { funny: 'funny', sad: 'sad', angry: 'angry', surprised: 'surprise' };
const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const textLength = text => [...graphemes.segment(text)].length;

function randomizer(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function pcm(buffer) {
  const result = new Float32Array(Math.floor(buffer.length / 2));
  for (let i = 0; i < result.length; i++) result[i] = buffer.readInt16LE(i * 2) / 32768;
  return result;
}

function formatWav(samples) {
  const buffer = Buffer.allocUnsafe(44 + samples.length * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(RATE, 24);
  buffer.writeUInt32LE(RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    const value = samples[i];
    const soft = Math.abs(value) < 0.86 ? value : Math.sign(value) * (0.86 + 0.14 * Math.tanh((Math.abs(value) - 0.86) / 0.14));
    buffer.writeInt16LE(Math.round(clamp(soft, -1, 1) * 32767), 44 + i * 2);
  }
  return buffer;
}

function voiceChoice(story, setting) {
  if (setting && setting !== 'auto') return setting;
  return story.language.split('-')[0] === 'en' ? 'offline' : 'voicestudio';
}

function voiceOptions() {
  return process.env.VOICESTUDIO_API_KEY ? { Authorization: `Bearer ${process.env.VOICESTUDIO_API_KEY}` } : {};
}

export async function localVoices() {
  const url = `${env.voiceUrl.replace(/\/$/, '')}/v1/audio/voices`;
  const reply = await fetch(url, { headers: voiceOptions(), signal: AbortSignal.timeout(3500) });
  if (!reply.ok) throw new Error(`VoiceStudio returned HTTP ${reply.status}.`);
  const data = await reply.json();
  return (data.voices || data.data || []).filter(voice => voice.type === 'profile')
    .map(voice => ({ id: voice.voice_id || voice.id, name: voice.name, language: voice.language }));
}

async function voiceStudio(line, cast, language, voice) {
  const request = {
    model: voice.model,
    input: line.spoken || line.text,
    voice: cast?.voice || voice.narrator,
    response_format: 'wav',
    language: language.split('-')[0],
    speed: line.speed * ({ sad: 0.91, worried: 1.04, angry: 1.08, funny: 1.03 }[line.emotion] || 1),
    seed: (cast?.seed ?? hash('Narrator')) & 0x7fffffff,
    instructions: cast?.voiceStyle || undefined,
  };
  let reply;
  try {
    reply = await fetch(`${env.voiceUrl.replace(/\/$/, '')}/v1/audio/speech`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...voiceOptions() },
      body: JSON.stringify(request), signal: AbortSignal.timeout(600000),
    });
  } catch (error) {
    throw new Error(`VoiceStudio is unreachable at ${env.voiceUrl}. Open VoiceStudio and start its local API. ${error.cause?.code || error.message}`);
  }
  if (!reply.ok) {
    const data = await reply.json().catch(() => ({}));
    const detail = data.error?.message || data.detail || 'Check the selected engine and voice in VoiceStudio.';
    throw new Error(`VoiceStudio rejected ${line.speaker}'s line (HTTP ${reply.status}). ${typeof detail === 'string' ? detail.slice(0, 450) : JSON.stringify(detail).slice(0, 450)}`);
  }
  return Buffer.from(await reply.arrayBuffer());
}

async function decode(input, file, cwd, filter = '', limit = 180) {
  return run(env.ffmpeg, [
    '-v', 'error', '-i', file || 'pipe:0', '-map', '0:a:0', ...(filter ? ['-af', filter] : []),
    '-t', String(limit), '-ac', '1', '-ar', String(RATE), '-f', 's16le', 'pipe:1',
  ], { cwd, input });
}

async function speechAudio(line, cast, language, voice, cwd) {
  const text = line.spoken || line.text;
  if (line.audio) return pcm(await decode(null, mediaPath(line.audio), cwd, 'highpass=f=75', 181));
  const id = createHash('sha256').update(JSON.stringify([
    'v1', env.voiceUrl, voice, language, cast?.voice, cast?.voiceStyle, cast?.gender, cast?.age, cast?.seed, text, line.emotion, line.speed,
  ])).digest('hex');
  const cached = join(cacheDir, `${id}.pcm`);
  try {
    return pcm(await readFile(cached));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  let buffer;
  if (voice.engine === 'voicestudio') {
    buffer = await decode(await voiceStudio(line, cast, language, voice), null, cwd, 'highpass=f=75', 181);
  } else {
    if (language.split('-')[0] !== 'en' || /[\u0900-\u0dff]/u.test(text)) {
      throw new Error('Choose VoiceStudio or attach a recording for non-English dialogue. The offline preview voice speaks English.');
    }
    const file = `speech-${randomUUID()}.txt`;
    await writeFile(join(cwd, file), text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"'), 'utf8');
    const defaultVoice = cast?.gender === 'female' ? 'slt' : cast ? fliteVoices[(cast.seed % 3)] : 'awb';
    const choice = fliteVoices.includes(cast?.voice) ? cast.voice : defaultVoice;
    const pace = line.speed * (line.emotion === 'sad' ? 0.90 : line.emotion === 'angry' ? 1.13 : 1);
    try {
      buffer = await run(env.ffmpeg, [
        '-v', 'error', '-f', 'lavfi', '-i', `flite=textfile=${file}:voice=${choice}`,
        '-af', `highpass=f=75,atempo=${pace}`, '-t', '181', '-ar', String(RATE), '-ac', '1', '-f', 's16le', 'pipe:1',
      ], { cwd });
    } finally {
      await unlink(join(cwd, file)).catch(() => {});
    }
  }
  if (!buffer.length) throw new Error(`No voice audio was produced for ${line.speaker}.`);
  await mkdir(cacheDir, { recursive: true });
  const temporary = join(cacheDir, `${randomUUID()}.tmp`);
  await writeFile(temporary, buffer);
  await rename(temporary, cached);
  return pcm(buffer);
}

function cleanVoice(samples, speaker) {
  if (samples.length > RATE * 180) throw new Error(`Split ${speaker}'s dialogue into recordings shorter than three minutes.`);
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  if (peak < 0.003) throw new Error(`The recording for ${speaker} is silent.`);
  const threshold = Math.max(peak * 0.014, 0.002);
  const first = samples.findIndex(value => Math.abs(value) > threshold);
  const last = samples.findLastIndex(value => Math.abs(value) > threshold);
  const trimmed = samples.subarray(Math.max(0, first - 1440), Math.min(samples.length, last + 2200));
  const scale = Math.min(8, 0.74 / peak);
  for (let i = 0; i < trimmed.length; i++) trimmed[i] *= scale * Math.min(1, i / 160, (trimmed.length - i) / 160);
  return trimmed;
}

function envelope(samples) {
  const hop = RATE / 25;
  const levels = [];
  for (let start = 0; start < samples.length; start += hop) {
    let sum = 0;
    for (let i = start; i < Math.min(start + hop, samples.length); i++) sum += samples[i] ** 2;
    levels.push(Math.round(clamp((Math.sqrt(sum / hop) - 0.008) * 9, 0, 1) * 100));
  }
  return levels;
}

function splitCaptions(text, start, duration, ratio) {
  const max = ratio === '9:16' ? 64 : 90;
  const pages = [];
  let page = '';
  let length = 0;
  for (const word of text.split(/\s+/u)) {
    const size = textLength(word);
    if (page && length + size + 1 > max) {
      pages.push(page);
      page = '';
      length = 0;
    }
    page += `${page ? ' ' : ''}${word}`;
    length += size + 1;
  }
  if (page) pages.push(page);
  if (pages.length > 1 && textLength(pages.at(-1)) < max * 0.32) {
    const last = pages.pop();
    const previous = pages.pop();
    const words = (previous + ' ' + last).split(/\s+/u);
    const half = Math.ceil(words.length / 2);
    pages.push(words.slice(0, half).join(' '), words.slice(half).join(' '));
  }
  const weights = pages.map(page => Math.max(12, textLength(page)));
  const total = weights.reduce((sum, length) => sum + length, 0);
  let cursor = start;
  return pages.map((page, index) => {
    const next = cursor + duration * weights[index] / total;
    const caption = { text: page, start: round(cursor), end: round(next) };
    cursor = next;
    return caption;
  });
}

function actorEnd(shot) {
  return Math.max(shot.minDuration, 2.2, ...shot.actors.flatMap(actor => actor.keys.map(frame => frame.at + 0.45)),
    ...shot.props.map(prop => Math.max((prop.end ?? prop.at) + 0.35, (prop.keys.at(-1)?.at || 0) + 0.12)),
    ...shot.overlays.map(item => (item.end ?? item.at + 0.8) + 0.12), ...shot.sounds.map(cue => cue.at + 0.8));
}

function addLine(line, samples, cursor, ratio) {
  const estimate = clamp(line.text.split(/\s+/u).length * 0.37 + 0.3, 0.8, 160);
  const duration = samples ? samples.length / RATE : estimate;
  const start = round(Math.max(cursor, line.at ?? cursor));
  return {
    ...line, start, end: round(start + duration), levels: samples ? envelope(samples) : [],
    captions: splitCaptions(line.text, start, duration, ratio),
  };
}

function placeShot(shot, start, dialogue, minimum = 0) {
  const duration = round(Math.max(minimum, actorEnd(shot), (dialogue.at(-1)?.end || 0) + 0.46));
  return { ...shot, start, duration, dialogue };
}

export function previewTimeline(story) {
  let start = 0;
  const shots = story.shots.map(shot => {
    let cursor = 0;
    const dialogue = shot.dialogue.map(line => {
      const timed = addLine(line, null, line.at == null ? Math.max(0.30, cursor) : cursor, story.ratio);
      cursor = timed.end + 0.22;
      return timed;
    });
    const timed = placeShot(shot, start, dialogue);
    start = round(start + timed.duration);
    return timed;
  });
  return { ...story, shots, duration: start };
}

const effects = {
  funny: [0.73, (t, n) => Math.sin(TAU * (270 * t + 142 * t * t + 1.8 * Math.sin(14 * t))) * Math.exp(-4.2 * t) + n * 0.03],
  sad: [1.62, t => (Math.sin(TAU * (287 * t + 1.7 * Math.sin(18 * t))) + 0.34 * Math.sin(TAU * 192 * t)) * Math.exp(-1.7 * t) * (1 - Math.exp(-16 * t))],
  angry: [0.66, (t, n) => Math.sin(TAU * (87 * t - 24 * t * t)) * Math.exp(-9 * t) + n * 0.31 * Math.exp(-11 * t)],
  surprise: [0.85, t => (Math.sin(TAU * (510 * t + 270 * t * t)) * Math.exp(-8 * t) + 0.32 * Math.sin(TAU * 910 * t) * Math.exp(-3.3 * t))],
  footstep: [0.24, (t, n) => (n * 0.5 + Math.sin(TAU * 87 * t)) * Math.exp(-17 * t)],
  door: [0.65, (t, n) => 0.55 * Math.sin(TAU * (210 * t - 85 * t * t) + 5 * Math.sin(t * 12)) * Math.exp(-4 * t) + n * Math.exp(-14 * Math.abs(t - 0.44)) * 0.4],
  coin: [0.68, t => (Math.sin(TAU * 1800 * t) + 0.38 * Math.sin(TAU * 2831 * t)) * Math.exp(-8 * t)],
  birds: [1.5, t => {
    const chirp = t % 0.43;
    return Math.sin(TAU * (2100 * chirp - 1950 * chirp * chirp)) * Math.max(0, Math.sin(Math.PI * chirp / 0.18)) * (chirp < 0.18 ? 0.30 : 0);
  }],
  pot: [0.62, t => (Math.sin(TAU * 281 * t) + 0.4 * Math.sin(TAU * 612 * t)) * Math.exp(-10 * t)],
  water: [1.2, (t, n) => (n * 0.58 + 0.17 * Math.sin(TAU * (600 * t - 187 * t * t))) * Math.exp(-3.6 * t) * Math.sin(18 * t) ** 2],
  wind: [1.5, (t, n) => n * 0.32 * Math.sin(Math.PI * t / 1.5) ** 2],
  bell: [1.4, t => (Math.sin(TAU * 721 * t) + 0.27 * Math.sin(TAU * 1117 * t)) * Math.exp(-3.1 * t)],
  thunder: [2.45, (t, n) => (n * 0.46 + 0.58 * Math.sin(TAU * (46 * t - 3 * t * t))) * Math.sin(7 * t) ** 2 * Math.exp(-1.8 * t)],
  goat: [1.0, t => Math.tanh(1.4 * Math.sin(TAU * (280 * t - 32 * t * t) + 3 * Math.sin(34 * t))) * Math.exp(-2.6 * t) * Math.sin(13 * t) ** 2],
  twinkle: [1.35, t => {
    const note = (at, f) => t < at ? 0 : (Math.sin(TAU * f * (t - at)) + 0.34 * Math.sin(TAU * f * 2.756 * (t - at)) * Math.exp(-5 * (t - at))) * Math.exp(-5.2 * (t - at));
    return 0.5 * (note(0, 1568) + 0.8 * note(0.09, 2093) + 0.65 * note(0.2, 2637) + 0.5 * note(0.33, 3136));
  }],
  whoosh: [0.55, (t, n) => n * Math.sin(Math.PI * t / 0.55) ** 2 * 0.56],
};

const synthesized = new Map();
function synth(kind) {
  if (synthesized.has(kind)) return synthesized.get(kind);
  const [duration, wave] = effects[kind];
  const noise = randomizer(hash(kind));
  const samples = Float32Array.from({ length: Math.round(duration * RATE) }, (_, i) => {
    const t = i / RATE;
    return wave(t, noise() * 2 - 1) * Math.min(1, t * 95, (duration - t) * 42) * 0.57;
  });
  synthesized.set(kind, samples);
  return samples;
}

function soundCues(shot, props) {
  const cues = [...shot.sounds];
  if (!shot.autoSound) return cues;
  const beats = shot.dialogue.filter(line => emotionSfx[line.emotion]).map(line => ({ emotion: line.emotion, at: Math.max(0, line.start - 0.13) }));
  if (!beats.some(beat => beat.emotion === shot.mood)) beats.push({ emotion: shot.mood, at: 0.35 });
  for (const { emotion, at } of beats) {
    const kind = emotionSfx[emotion];
    if (kind && !cues.some(cue => cue.kind === kind && Math.abs(cue.at - at) < 3)) cues.push({ kind, at, gain: 0.28 });
  }
  for (const item of shot.props) {
    if (item.motion !== 'fall') continue;
    const at = item.at + 0.62;
    const kind = ({ coin: 'coin', pot: 'pot' })[props.get(key(item.prop)).kind] || 'footstep';
    if (!cues.some(cue => cue.kind === kind && Math.abs(cue.at - at) < 0.42)) cues.push({ kind, at, gain: 0.29 });
  }
  if (!cues.some(cue => cue.kind === 'footstep')) {
    const steps = [];
    for (const actor of shot.actors) {
      let from = 0;
      let pose = actor.pose;
      for (const frame of [...actor.keys.filter(frame => frame.pose), { at: shot.duration }]) {
        if (['walk', 'run', 'sneak'].includes(pose)) {
          const pace = pose === 'run' ? 0.28 : pose === 'sneak' ? 0.62 : 0.46;
          for (let t = from + 0.16; t < frame.at; t += pace) steps.push(t);
        }
        from = frame.at;
        pose = frame.pose;
      }
    }
    steps.sort((a, b) => a - b);
    for (let i = 0, last = -1; i < steps.length; i++) {
      if (steps[i] - last < 0.12) continue;
      last = steps[i];
      cues.push({ kind: 'footstep', at: last, gain: 0.26 });
    }
  }
  return cues;
}

function mixAt(mix, source, offset, gain) {
  const start = Math.round(offset * RATE);
  const limit = Math.min(source.length, mix.length - start);
  for (let i = 0; i < limit; i++) mix[i + start] += source[i] * gain;
}

async function mixScore(mix, timeline, cwd) {
  if (!timeline.score) return;
  const music = pcm(await decode(null, mediaPath(timeline.score.file), cwd, '', timeline.duration));
  const speech = timeline.shots.flatMap(shot => shot.dialogue.map(line => ({
    start: Math.round((shot.start + line.start) * RATE),
    end: Math.round((shot.start + line.end) * RATE),
  })));
  const lead = RATE * 0.14;
  const tail = RATE * 0.24;
  let phrase = 0;
  for (let i = 0; i < Math.min(mix.length, music.length); i++) {
    while (speech[phrase] && i >= speech[phrase].end + tail) phrase++;
    const line = speech[phrase];
    const duck = line ? clamp(Math.min((i - line.start + lead) / lead, (line.end + tail - i) / tail), 0, 1) : 0;
    mix[i] += music[i] * timeline.score.gain * (1 - 0.60 * duck);
  }
}

function bed(mix, shot, place) {
  const inferred = shot.weather === 'rain' ? 'rain' : shot.time === 'night' ? 'night' :
    ({ shop: 'market', home: 'room', school: 'room', river: 'river' }[place.kind] || 'village');
  const kind = shot.atmosphere !== 'auto' ? shot.atmosphere :
    place.ambience !== 'auto' && !['rain', 'night'].includes(inferred) ? place.ambience : inferred;
  if (kind === 'quiet') return;
  const noise = randomizer(hash(place.name));
  const offset = Math.round(shot.start * RATE);
  const count = Math.min(Math.round(shot.duration * RATE), mix.length - offset);
  let low = 0;
  let line = 0;
  for (let i = 0; i < count; i++) {
    const t = i / RATE;
    const white = noise() * 2 - 1;
    low += 0.018 * (white - low);
    const breath = 0.62 + 0.38 * Math.sin(t * 2.1) ** 2;
    let air = low * 0.15 * breath;
    if (kind === 'rain') air += white * 0.020 + low * 0.22;
    if (kind === 'river') air += white * 0.009 * breath + low * 0.17;
    if (kind === 'market') air += 0.018 * low * (1 + Math.sin(t * 6));
    if (kind === 'room') air *= 0.33;
    if (kind === 'night') air += Math.sin(TAU * 4130 * t) * 0.009 * Math.max(0, Math.sin(6.4 * t)) ** 10;
    if (shot.dialogue[line]?.end < t) line++;
    const speaking = shot.dialogue[line]?.start <= t && t < shot.dialogue[line].end;
    mix[i + offset] += air * Math.min(1, t * 5, (shot.duration - t) * 5) * (speaking ? 0.5 : 1);
  }
  if (kind === 'village' && shot.duration > 2.8 && !shot.sounds.some(cue => cue.kind === 'birds')) {
    mixAt(mix, synth('birds'), shot.start + 0.15, 0.16);
  }
}

export async function makeAudio(story, settings, cwd, report) {
  const voice = {
    engine: voiceChoice(story, settings.voiceEngine),
    model: typeof settings.voiceModel === 'string' && settings.voiceModel.trim() ? settings.voiceModel.trim().slice(0, 120) : env.voiceModel,
    narrator: typeof settings.narratorVoice === 'string' && settings.narratorVoice.trim() ? settings.narratorVoice.trim().slice(0, 160) : 'default',
  };
  if (!['offline', 'voicestudio'].includes(voice.engine)) throw new Error('Choose Offline, VoiceStudio, or Auto voices.');
  const totalLines = story.shots.reduce((sum, shot) => sum + shot.dialogue.length, 0);
  const cast = new Map(story.characters.map(character => [key(character.name), character]));
  const places = new Map(story.scenes.map(scene => [key(scene.name), scene]));
  const props = new Map(story.props.map(prop => [key(prop.name), prop]));
  const timeline = { ...story, warnings: [...story.warnings], shots: [], duration: 0, voice: voice.engine };
  const tracks = [];
  let completed = 0;
  for (const shot of story.shots) {
    const dialogue = [];
    let cursor = 0;
    for (const line of shot.dialogue) {
      report(`Voicing ${line.speaker} · ${completed + 1}/${totalLines}`, 5 + 28 * completed / totalLines);
      const samples = cleanVoice(await speechAudio(line, cast.get(key(line.speaker)), story.language, voice, cwd), line.speaker);
      const timed = addLine(line, samples, line.at == null ? Math.max(0.30, cursor) : cursor, story.ratio);
      if (line.at != null && timed.start > line.at + 0.05) timeline.warnings.push(`${shot.name}: ${line.speaker} starts at ${timed.start}s to give the prior line room.`);
      tracks.push([samples, timeline.duration + timed.start]);
      dialogue.push(timed);
      cursor = timed.end + 0.22;
      completed++;
    }
    const timed = placeShot(shot, timeline.duration, dialogue);
    timed.sounds = soundCues(timed, props);
    let minimum = timed.duration;
    const prepared = [];
    for (const cue of timed.sounds) {
      const samples = cue.file ? pcm(await decode(null, mediaPath(cue.file), cwd, '', 120)) : synth(cue.kind);
      prepared.push([samples, timeline.duration + cue.at, cue.gain]);
      minimum = Math.max(minimum, cue.at + samples.length / RATE + 0.06);
    }
    timed.duration = round(minimum);
    tracks.push(...prepared);
    timeline.shots.push(timed);
    timeline.duration = round(timeline.duration + timed.duration);
    if (timeline.duration > 1800) throw new Error('The finished video exceeds 30 minutes. Render it in sections.');
  }
  report('Mixing voices, ambience, and effects', 34);
  const mix = new Float32Array(Math.ceil(timeline.duration * RATE));
  await mixScore(mix, timeline, cwd);
  for (const shot of timeline.shots) bed(mix, shot, places.get(key(shot.scene)));
  for (const [samples, start, gain = 1] of tracks) mixAt(mix, samples, start, gain);
  await writeFile(join(cwd, 'mix.wav'), formatWav(mix));
  return timeline;
}

function stamp(seconds) {
  const ms = Math.round(seconds * 1000);
  const two = value => String(value).padStart(2, '0');
  return `${two(Math.floor(ms / 3600000))}:${two(Math.floor(ms / 60000) % 60)}:${two(Math.floor(ms / 1000) % 60)},${String(ms % 1000).padStart(3, '0')}`;
}

export function srt(timeline) {
  const captions = timeline.shots.flatMap(shot => shot.dialogue.flatMap(line =>
    line.captions.map(caption => ({ ...caption, start: shot.start + caption.start, end: shot.start + caption.end }))));
  return captions.map((caption, index) => `${index + 1}\n${stamp(caption.start)} --> ${stamp(caption.end)}\n${caption.text}\n`).join('\n');
}
