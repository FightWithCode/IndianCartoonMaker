import { access, mkdir, open, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import {
  dataDir, mediaPath, hash, key, label, number, ratios, locations, times, weather,
  frames, moves, moods, fxKinds, poses, stances, propTypes, sounds, ambience, costumes, hairstyles, assetKinds,
} from './settings.mjs';

const libraryFile = join(dataDir, 'library.json');
const libraryLock = join(dataDir, 'library.lock');
const palette = ['#a04b38', '#356d84', '#2f7663', '#a15b75', '#b87832', '#556796', '#817442'];
const complexions = ['#b97550', '#a36343', '#c99064', '#925636', '#d29469', '#b77a55'];
const narrator = /^(narrator|voice[ -]?over|vo|वाचक|कथावाचक|सूत्रधार)$/iu;
const isNarrator = value => narrator.test(value.trim());
const hex = (value, fallback) => /^#[a-f0-9]{6}$/i.test(value) ? value : fallback;
const pick = (value, choices, fallback) => choices.includes(value) ? value : fallback;
const imageFile = /\.(jpg|jpeg|png|webp)$/i;
const audioFile = /\.(wav|mp3|m4a|ogg|flac)$/i;

function list(value, max, name) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > max || value.some(item => !item || typeof item !== 'object' || Array.isArray(item))) {
    throw new Error(`${name} must be a list of at most ${max} objects.`);
  }
  return value;
}

function named(value, location) {
  const name = label(value, '', 100);
  if (!name) throw new Error(`Give ${location} a name.`);
  return name;
}

function media(value, type, allowPlate = false) {
  if (!value) return undefined;
  if (allowPlate && value === 'banyan-square') return value;
  mediaPath(value);
  if (!type.test(value)) throw new Error('The selected studio media has the wrong file type.');
  return value;
}

function character(raw, name) {
  const seed = hash(key(name));
  const gender = pick(raw.gender, ['male', 'female', 'neutral'], 'neutral');
  const age = pick(raw.age, ['child', 'young', 'adult', 'elder'], 'adult');
  const female = gender === 'female';
  const defaultHair = female ? (seed % 2 ? 'braid' : 'bun') : (age === 'elder' ? 'grey' : seed % 2 ? 'part' : 'crop');
  return {
    name, seed, gender, age,
    costume: pick(raw.costume, costumes, female ? (age === 'elder' ? 'sari' : 'salwar') : seed % 2 ? 'kurta' : 'shirt'),
    hair: pick(raw.hair, hairstyles, defaultHair),
    skin: hex(raw.skin, complexions[seed % complexions.length]),
    primary: hex(raw.primary, palette[(seed >>> 4) % palette.length]),
    accent: hex(raw.accent, seed % 2 ? '#deb75b' : '#e4d0ab'),
    moustache: raw.moustache ?? (gender === 'male' && age !== 'child' && seed % 4 !== 0),
    glasses: raw.glasses === true,
    badge: raw.badge === true,
    // Distinguishing looks. All optional; a character without them is drawn exactly as before.
    build: pick(raw.build, ['slim', 'regular', 'stout'], 'regular'),
    jewelry: pick(raw.jewelry, ['none', 'simple', 'gold'], 'none'),
    trim: hex(raw.trim, undefined),
    shawl: hex(raw.shawl, undefined),
    beard: pick(raw.beard, ['none', 'short', 'full', 'white', 'long'], 'none'),
    tilak: pick(raw.tilak, ['none', 'red', 'sandal', 'tripund'], 'none'),
    patches: raw.patches === true,
    mud: raw.mud === true,
    barefoot: raw.barefoot === true,
    veil: raw.veil === true,
    voice: label(raw.voice, 'default', 160),
    voiceStyle: label(raw.voiceStyle, gender === 'neutral' ? '' : `${gender}, ${age === 'elder' ? 'elderly, low pitch' : age === 'child' ? 'child, high pitch' : age === 'young' ? 'young adult, moderate pitch' : 'middle-aged, moderate pitch'}`, 200),
    image: media(raw.image, imageFile),
  };
}

function scene(raw, name) {
  return {
    name, seed: hash(key(name)),
    kind: pick(raw.kind, locations, 'chowk'),
    palette: hex(raw.palette, '#b68758'),
    ambience: pick(raw.ambience, ambience, 'auto'),
    artDirection: label(raw.artDirection, '', 1600),
    image: media(raw.image, imageFile, true),
    bakedLight: raw.bakedLight === true,
  };
}

function prop(raw, name) {
  return {
    name, kind: pick(raw.kind, propTypes, 'pot'),
    color: hex(raw.color, '#a96545'),
    image: media(raw.image, imageFile),
    label: label(raw.label, '', 100),
  };
}

const assetReaders = { characters: character, scenes: scene, props: prop };

export async function readLibrary() {
  try {
    return JSON.parse(await readFile(libraryFile, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return { characters: [], scenes: [], props: [] };
  }
}

async function takeLibraryLock() {
  await mkdir(dataDir, { recursive: true });
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try {
      return await open(libraryLock, 'wx');
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const previous = await stat(libraryLock).catch(() => null);
      if (previous && Date.now() - previous.mtimeMs > 60000) await unlink(libraryLock).catch(() => {});
      await sleep(60);
    }
  }
  throw new Error('The shared library is busy. Try saving it again.');
}

export async function saveLibrary(story, replace = false) {
  const lock = await takeLibraryLock();
  const temp = join(dataDir, `library-${randomUUID()}.tmp`);
  try {
    const library = await readLibrary();
    for (const kind of assetKinds) {
      const entries = new Map(library[kind].map(asset => [key(asset.name), asset]));
      for (const asset of story[kind]) {
        const id = key(asset.name);
        if (replace || !entries.has(id)) entries.set(id, asset);
      }
      library[kind] = [...entries.values()];
    }
    await writeFile(temp, JSON.stringify(library, null, 2), 'utf8');
    await rename(temp, libraryFile);
    return library;
  } finally {
    await unlink(temp).catch(() => {});
    await lock.close();
    await unlink(libraryLock);
  }
}

export function resolveStory(raw, library) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('The storyboard must be a JSON object.');
  const warnings = [];
  const available = {};
  const used = {};
  for (const kind of assetKinds) {
    available[kind] = new Map(library[kind].map(asset => [key(asset.name), asset]));
    used[kind] = new Map();
    for (const asset of list(raw[kind], 200, kind)) {
      const name = named(asset.name, `each ${kind} entry`);
      const id = key(name);
      if (used[kind].has(id)) throw new Error(`Duplicate library entry: ${name}.`);
      const resolved = assetReaders[kind]({ ...available[kind].get(id), ...asset }, name);
      used[kind].set(id, resolved);
    }
  }
  function asset(kind, name, defaults) {
    const id = key(name);
    if (!used[kind].has(id)) {
      const existing = available[kind].get(id);
      used[kind].set(id, existing || assetReaders[kind](defaults, name));
      if (!existing) warnings.push(`Created ${name} in ${kind}.`);
    }
    return used[kind].get(id).name;
  }

  const ratio = pick(raw.ratio, Object.keys(ratios), '16:9');
  const shots = list(raw.shots, 180, 'Shots').map((shot, index) => {
    const name = label(shot.name, `Shot ${index + 1}`);
    const sceneName = label(shot.scene, 'Village square');
    const sceneRef = asset('scenes', sceneName, { kind: shot.location });
    const camera = shot.camera || {};
    const dialogue = list(shot.dialogue, 100, `${name} dialogue`).map(line => {
      const speaker = label(line.speaker, 'Narrator', 100);
      const text = label(line.text, '', 1600);
      if (!text) throw new Error(`Add dialogue text for ${speaker} in ${name}.`);
      return {
        speaker: isNarrator(speaker) ? speaker : asset('characters', speaker, {}),
        narration: isNarrator(speaker), text, at: number(line.at, undefined, 0, 180),
        emotion: pick(line.emotion, moods, 'neutral'),
        spoken: label(line.spoken, '', 1600) || undefined,
        audio: media(line.audio, audioFile),
        speed: number(line.speed, 1, 0.6, 1.6),
      };
    });
    const onScreen = shot.actors == null
      ? [...new Set(dialogue.filter(line => !line.narration).map(line => line.speaker))].map(character => ({ character }))
      : list(shot.actors, 10, `${name} actors`);
    const actors = onScreen.map((actor, actorIndex) => {
      const actorName = named(actor.character, `actor ${actorIndex + 1} in ${name}`);
      const spacing = Math.min(ratio === '9:16' ? 0.14 : 0.23, 0.72 / Math.max(1, onScreen.length - 1));
      const x = 0.5 + (actorIndex - (onScreen.length - 1) / 2) * spacing;
      return {
        character: asset('characters', actorName, {}),
        x: number(actor.x, x, -0.3, 1.3), y: number(actor.y, 0.87 + (actorIndex % 2 ? 0.025 : 0), 0.43, 1.2),
        size: number(actor.size, 1, 0.25, 1.6),
        face: pick(actor.face, ['left', 'right', 'front', 'back'], x > 0.5 ? 'left' : 'right'),
        pose: pick(actor.pose, poses, 'idle'),
        stance: pick(actor.stance, stances, 'stand'),
        ribbon: actor.ribbon === true,
        tears: actor.tears === true,
        alpha: number(actor.alpha, 1, 0, 1),
        outfit: actor.outfit ? Object.fromEntries(Object.entries({
          costume: pick(actor.outfit.costume, costumes, undefined),
          primary: hex(actor.outfit.primary, undefined),
          accent: hex(actor.outfit.accent, undefined),
          badge: typeof actor.outfit.badge === 'boolean' ? actor.outfit.badge : undefined,
        }).filter(([, value]) => value !== undefined)) : undefined,
        emotion: pick(actor.emotion, moods, 'neutral'),
        keys: list(actor.keys, 80, `${actorName} keyframes`).map(frame => ({
          at: number(frame.at, 0, 0, 180),
          x: number(frame.x, undefined, -0.3, 1.3), y: number(frame.y, undefined, 0.43, 1.2),
          size: number(frame.size, undefined, 0.25, 1.6),
          face: pick(frame.face, ['left', 'right', 'front', 'back'], undefined),
          pose: pick(frame.pose, poses, undefined),
          stance: pick(frame.stance, stances, undefined),
          alpha: number(frame.alpha, undefined, 0, 1),
          emotion: pick(frame.emotion, moods, undefined),
        })).sort((a, b) => a.at - b.at),
      };
    });
    const props = list(shot.props, 32, `${name} props`).map(item => {
      const holder = label(item.holder, '', 100);
      if (holder && !actors.some(actor => key(actor.character) === key(holder))) throw new Error(`Add ${holder} to the actors in ${name} before attaching a prop.`);
      return {
        prop: asset('props', named(item.prop, `each prop in ${name}`), { kind: item.kind }),
        x: number(item.x, 0.58, -0.3, 1.3), y: number(item.y, 0.88, 0.2, 1.2),
        size: number(item.size, 1, 0.12, 4), at: number(item.at, 0, 0, 180),
        end: number(item.end, undefined, 0, 180), holder: holder || undefined,
        grip: number(item.grip, undefined, 0, 205),
        grasp: holder && item.grasp ? {
          hand: pick(item.grasp.hand, ['near', 'far', 'both', 'waist', 'shoulder'], 'near'),
          x: number(item.grasp.x, 0, -205, 205),
          y: number(item.grasp.y, 0, -240, 205),
        } : undefined,
        depth: number(item.depth, undefined, 0, 1.6),
        angle: number(item.angle, 0, -720, 720), alpha: number(item.alpha, 1, 0, 1),
        keys: list(item.keys, 80, `${name} prop keyframes`).map(frame => ({
          at: number(frame.at, 0, 0, 180),
          x: number(frame.x, undefined, -0.3, 1.3), y: number(frame.y, undefined, 0.2, 1.2),
          size: number(frame.size, undefined, 0.12, 4),
          angle: number(frame.angle, undefined, -720, 720), alpha: number(frame.alpha, undefined, 0, 1),
        })).sort((a, b) => a.at - b.at),
        motion: pick(item.motion, ['none', 'sway', 'fall', 'roll', 'glow'], 'none'),
      };
    });
    const effects = list(shot.sounds, 100, `${name} sound cues`).map(cue => {
      const file = media(cue.file, audioFile);
      const kind = pick(cue.kind, sounds, undefined);
      if (!file && !kind) throw new Error(`Choose a supported sound or a media file in ${name}.`);
      return { kind, file, at: number(cue.at, 0, 0, 180), gain: number(cue.gain, 0.45, 0, 1) };
    });
    const overlays = list(shot.overlays, 20, `${name} overlays`).map(item => ({
      text: named(item.text, `overlay text in ${name}`),
      eyebrow: label(item.eyebrow, '', 100),
      style: pick(item.style, ['title', 'tag', 'count'], 'tag'),
      y: number(item.y, 0.2, 0.1, 0.82),
      at: number(item.at, 0, 0, 180), end: number(item.end, undefined, 0, 180),
    }));
    return {
      name, scene: sceneRef, direction: label(shot.direction, '', 2000),
      time: pick(shot.time, times, 'day'), weather: pick(shot.weather, weather, 'clear'),
      mood: pick(shot.mood, moods, 'neutral'),
      minDuration: number(shot.minDuration, 0, 0, 180),
      camera: {
        frame: pick(camera.frame, frames, 'wide'), move: pick(camera.move, moves, 'static'),
        focus: label(camera.focus, '', 100), zoom: number(camera.zoom, undefined, 1, 5),
        x: number(camera.x, undefined, 0, 1), y: number(camera.y, undefined, 0, 1), fit: camera.fit !== false,
      },
      actors, props, dialogue, sounds: effects, overlays,
      transition: pick(shot.transition, ['cut', 'fade'], 'cut'),
      captionPosition: pick(shot.captionPosition, ['top', 'bottom', 'low'], 'bottom'),
      atmosphere: pick(shot.atmosphere, ambience, 'auto'),
      autoSound: shot.autoSound !== false,
      vignette: number(shot.vignette, 0, 0, 0.68),
      fx: [...new Set((Array.isArray(shot.fx) ? shot.fx : []).filter(kind => fxKinds.includes(kind)))],
      fxAmount: number(shot.fxAmount, 1, 0, 2),
      auraX: number(shot.auraX, 0.5, 0, 1),
      auraY: number(shot.auraY, 0.5, 0, 1),
      // A rising heap of gold coins drawn over the actors (levels use the actors' y scale).
      gold: shot.gold && typeof shot.gold === 'object' ? {
        from: number(shot.gold.from, 1.05, 0, 1.3), to: number(shot.gold.to, number(shot.gold.from, 1.05, 0, 1.3), 0, 1.3),
        at: number(shot.gold.at, 0, 0, 180), end: number(shot.gold.end, undefined, 0, 180), peakX: number(shot.gold.peakX, 0.5, -0.2, 1.2),
      } : undefined,
      // Where the 'coins' effect pours from: a fountain (up and out) or a spill (out of a window, falling).
      coinSources: list(shot.coinSources, 12, `${name} coin sources`).map(item => ({
        x: number(item.x, 0.5, -0.2, 1.2), y: number(item.y, 0.5, -0.2, 1.2), mode: pick(item.mode, ['fountain', 'spill'], 'fountain'),
        rate: number(item.rate, 1, 0, 3), at: number(item.at, 0, 0, 180),
      })),
    };
  });
  if (!shots.length) throw new Error('Create at least one shot.');
  const title = label(raw.title, 'Untitled village story');
  const language = /^[a-z]{2,3}(?:-[A-Za-z]{2,4})?$/.test(raw.language || '') ? raw.language : 'hi';
  const scoreFile = media(raw.score?.file, audioFile);
  return {
    title, slug: label(raw.slug, '', 80) || undefined, ratio, language, captions: raw.captions !== false,
    captionScale: number(raw.captionScale, 1, 0.65, 1.25), shots, warnings,
    score: scoreFile ? { file: scoreFile, gain: number(raw.score.gain, 0.22, 0, 1) } : undefined,
    ...Object.fromEntries(assetKinds.map(kind => [kind, [...used[kind].values()]])),
  };
}

export async function verifyMedia(story) {
  const ids = new Set();
  if (story.score?.file) ids.add(story.score.file);
  for (const kind of assetKinds) for (const item of story[kind]) {
    if (item.image && item.image !== 'banyan-square') ids.add(item.image);
  }
  for (const shot of story.shots) {
    for (const line of shot.dialogue) if (line.audio) ids.add(line.audio);
    for (const cue of shot.sounds) if (cue.file) ids.add(cue.file);
  }
  for (const id of ids) {
    await access(mediaPath(id)).catch(() => { throw new Error(`Missing studio media ${id}. Import the file again and update its ID.`); });
  }
}
