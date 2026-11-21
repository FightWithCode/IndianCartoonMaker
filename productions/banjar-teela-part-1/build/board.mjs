// Build storyboard.json for "बंजर टीले की लाल मिट्टी और एक माँ का हौसला · भाग १".
//
//   node productions/banjar-teela-part-1/build/board.mjs [--score <media-id>]
//
// Reads build/voices.json (recorded lines, from record.py) and build/plates.json (new backdrops,
// from plates.py). Existing painted plates from earlier films are referenced by their media ids.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = file => JSON.parse(readFileSync(join(here, file), 'utf8'));
const voices = read('voices.json');
const plates = read('plates.json');
const scoreArg = process.argv.indexOf('--score');
const score = scoreArg > 0 ? process.argv[scoreArg + 1] : (() => { try { return read('score.json').id; } catch { return undefined; } })();

const line = number => {
  const row = voices.find(item => item.number === number);
  if (!row) throw new Error(`No recording for line ${number}. Run build/record.py.`);
  return row;
};
const say = (number, extra = {}) => {
  const row = line(number);
  return { speaker: row.speaker, text: row.text, audio: row.audio, emotion: 'neutral', ...extra };
};

// ------------------------------------------------------------------------------------ cast
// voice: a saved VoiceStudio profile ("Rahul", "Juhi"). voiceStyle: OmniVoice design tags, used when no profile is set.
const characters = [
  { name: 'जानकी', gender: 'female', age: 'adult', costume: 'sari', hair: 'bun', skin: '#a8694a', primary: '#d9d1c1', accent: '#8f8678',
    moustache: false, voice: 'Juhi', voiceStyle: 'female, middle-aged, moderate pitch' },
  { name: 'छोटू', gender: 'male', age: 'child', costume: 'shirt', hair: 'crop', skin: '#b4794f', primary: '#6f8ea0', accent: '#c8b48c',
    moustache: false, voiceStyle: 'male, child, high pitch' },
  { name: 'गाँव के बुज़ुर्ग', gender: 'male', age: 'elder', costume: 'dhoti', hair: 'turban', skin: '#a36e50', primary: '#d9cfb6', accent: '#9b4d3a',
    moustache: true, voiceStyle: 'male, elderly, moderate pitch' },
  { name: 'चौपाल के काका', gender: 'male', age: 'elder', costume: 'vest', hair: 'grey', skin: '#ac7551', primary: '#8e5643', accent: '#d3ac71',
    moustache: true, voiceStyle: 'male, elderly, low pitch' },
  { name: 'चौपाल के दादा', gender: 'male', age: 'elder', costume: 'kurta', hair: 'turban', skin: '#b57d55', primary: '#667c4a', accent: '#e0cfa0',
    moustache: true, glasses: true, voiceStyle: 'male, elderly, moderate pitch' },
  { name: 'शहर का राहगीर', gender: 'male', age: 'young', costume: 'shirt', hair: 'part', skin: '#b98057', primary: '#4f7a8a', accent: '#d9c08a',
    moustache: false, voiceStyle: 'male, young adult, moderate pitch' },
  { name: 'शहर की दीदी', gender: 'female', age: 'young', costume: 'salwar', hair: 'braid', skin: '#c08a60', primary: '#b0485c', accent: '#e7c46a',
    voiceStyle: 'female, young adult, moderate pitch' },
  { name: 'पनिहारिन काकी', gender: 'female', age: 'adult', costume: 'sari', hair: 'bun', skin: '#a56a4c', primary: '#356d84', accent: '#e0b860',
    voiceStyle: 'female, middle-aged, low pitch' },
  { name: 'पनिहारिन बहू', gender: 'female', age: 'young', costume: 'sari', hair: 'braid', skin: '#b5774f', primary: '#a04b38', accent: '#e4d0ab',
    voiceStyle: 'female, young adult, moderate pitch' },
  // Cast for the next parts, defined now so their voices stay fixed from the start.
  { name: 'सेठ धनीराम', gender: 'male', age: 'adult', costume: 'vest', hair: 'turban', skin: '#bd8b62', primary: '#865437', accent: '#d8a54a',
    moustache: true, glasses: false, voiceStyle: 'male, middle-aged, low pitch' },
  { name: 'मास्टर जी', gender: 'male', age: 'elder', costume: 'kurta', hair: 'grey', skin: '#b07a55', primary: '#e0d6bf', accent: '#7b8a6b',
    moustache: false, glasses: true, voiceStyle: 'male, elderly, moderate pitch' },
];

// ----------------------------------------------------------------------------------- scenes
// Plates from earlier films (library media ids) and the four new ones made by plates.py.
const scene = (name, kind, image, ambience) => ({ name, kind, image, ambience, bakedLight: true });
const SC = {
  mound: 'चंदनपुर · बंजर टीला',
  market: 'चंदनपुर · शहर का हाट',
  chaupal: 'चंदनपुर · पीपल की चौपाल',
  chaupalDusk: 'चंदनपुर · साँझ की चौपाल',
  ghat: 'चंदनपुर · सुबह का घाट',
  temple: 'चंदनपुर · मंदिर का चबूतरा',
  well: 'चंदनपुर · कुआँ और पनघट',
  house: 'चंदनपुर · जानकी का कच्चा घर',
  houseDusk: 'चंदनपुर · जानकी का घर, साँझ',
};
const scenes = [
  scene(SC.mound, 'field', plates.teela, 'quiet'),
  scene(SC.market, 'chowk', '2c9a72bb2235a80988c1c59dd7f052a6.jpg', 'market'),
  scene(SC.chaupal, 'chowk', '213ee03fc6767e7d0e81ffc265052a7d.jpg', 'quiet'),
  scene(SC.chaupalDusk, 'chowk', plates['peepal-dusk'], 'quiet'),
  scene(SC.ghat, 'river', 'dc31bc3e2322cb32417d5e3b676952b7.jpg', 'quiet'),
  scene(SC.temple, 'temple', 'db32321ecd3473fd343b035990442060.jpg', 'quiet'),
  scene(SC.well, 'chowk', '3edf954ccf5d29e8e030c0e2d77c52e9.jpg', 'quiet'),
  scene(SC.house, 'home', plates['janaki-ghar'], 'quiet'),
  scene(SC.houseDusk, 'home', plates['janaki-ghar-dusk'], 'quiet'),
];

// ------------------------------------------------------------------------------------ props
const P = {
  chaak: 'चंदनपुर · जानकी का पुराना चाक',
  pot: 'चंदनपुर · लाल मिट्टी का घड़ा',
  shovel: 'चंदनपुर · फावड़ा',
  basket: 'चंदनपुर · मिट्टी की टोकरी',
  cup: 'चंदनपुर · ठंडे पानी का कुल्हड़',
};
const props = [
  { name: P.chaak, kind: 'chaak', color: '#8a5f3c', label: 'dusty' },
  { name: P.pot, kind: 'pot', color: '#b9482f' },
  { name: P.shovel, kind: 'shovel', color: '#9a9a9c' },
  { name: P.basket, kind: 'basket', color: '#a8794a' },
  { name: P.cup, kind: 'tea', color: '#b9482f' },
];

// ------------------------------------------------------------------------------------ shots
const shots = [
  {
    name: '१ · बंजर टीला · शीर्षक', scene: SC.mound, time: 'dusk', mood: 'neutral', atmosphere: 'quiet', autoSound: false,
    camera: { frame: 'wide', x: 0.36, y: 0.40, zoom: 1.25, move: 'push' }, actors: [], vignette: 0.22,
    fx: ['glow', 'rays', 'dust', 'glitter'], fxAmount: 1,
    overlays: [
      { text: 'बंजर टीले की लाल मिट्टी', eyebrow: 'भाग १ · चंदनपुर की कहानी', style: 'title', y: 0.56, at: 0.5, end: 4.8 },
      { text: 'और एक माँ का हौसला', style: 'tag', y: 0.68, at: 1.6, end: 4.8 },
    ],
    sounds: [{ kind: 'wind', at: 0.1, gain: 0.34 }, { kind: 'twinkle', at: 0.7, gain: 0.26 }, { kind: 'twinkle', at: 2.1, gain: 0.18 }],
    dialogue: [say(1, { at: 3.7, emotion: 'sad' })],
  },
  {
    name: '२ · आज · ठंडे घड़ों का हाट', scene: SC.market, time: 'day', mood: 'happy', atmosphere: 'market', autoSound: false,
    camera: { frame: 'wide', move: 'pull' }, vignette: 0.12,
    fx: ['glow', 'glitter', 'dust'], fxAmount: 1,
    overlays: [{ text: 'आज', eyebrow: 'वर्षों बाद', style: 'tag', y: 0.15, at: 0.3, end: 3.0 }],
    actors: [
      { character: 'शहर का राहगीर', x: 0.50, y: 0.80, size: 0.92, face: 'right', pose: 'hold', emotion: 'happy' },
      { character: 'शहर की दीदी', x: 0.66, y: 0.82, size: 0.9, face: 'left', pose: 'idle', emotion: 'happy',
        keys: [{ at: 2.2, pose: 'nod' }] },
    ],
    props: [
      { prop: P.cup, x: 0.5, y: 0.8, size: 1.0, holder: 'शहर का राहगीर', grasp: undefined },
      { prop: P.pot, x: 0.17, y: 0.88, size: 2.0, motion: 'glow' },
      { prop: P.pot, x: 0.31, y: 0.93, size: 1.6, motion: 'glow' },
      { prop: P.pot, x: 0.84, y: 0.90, size: 1.9, motion: 'glow' },
      { prop: P.pot, x: 0.94, y: 0.95, size: 1.5, motion: 'glow' },
    ],
    sounds: [{ kind: 'water', at: 0.4, gain: 0.3 }, { kind: 'twinkle', at: 0.9, gain: 0.3 }, { kind: 'twinkle', at: 3.3, gain: 0.2 }],
    dialogue: [say(2, { at: 0.8, emotion: 'happy' })],
  },
  {
    name: '३ · तब · टीले की मिट्टी को पहला हाथ', scene: SC.mound, time: 'dusk', mood: 'sad', atmosphere: 'quiet', autoSound: false,
    camera: { frame: 'medium', zoom: 1.3, x: 0.33, y: 0.50, move: 'push' }, vignette: 0.28,
    fx: ['glow', 'dust', 'glitter'], fxAmount: 0.75,
    overlays: [{ text: 'तब', eyebrow: 'एक साधारण सुबह', style: 'tag', y: 0.14, at: 0.3, end: 3.2 }],
    actors: [
      { character: 'जानकी', x: 0.31, y: 0.55, size: 0.66, face: 'left', pose: 'scoop', stance: 'sit', emotion: 'worried' },
      { character: 'छोटू', x: 0.40, y: 0.57, size: 0.58, face: 'left', pose: 'reach', stance: 'sit', emotion: 'worried' },
    ],
    props: [
      { prop: P.shovel, x: 0.49, y: 0.60, size: 0.8 },
      { prop: P.basket, x: 0.22, y: 0.60, size: 0.66 },
    ],
    sounds: [{ kind: 'wind', at: 0.1, gain: 0.3 }, { kind: 'footstep', at: 1.2, gain: 0.2 }, { kind: 'footstep', at: 2.6, gain: 0.2 },
      { kind: 'footstep', at: 4.1, gain: 0.2 }],
    dialogue: [say(3, { at: 0.6, emotion: 'sad' })],
  },
  {
    name: '४ · बड़े-बुजुर्ग हँस पड़े', scene: SC.chaupal, time: 'day', mood: 'neutral', atmosphere: 'quiet', autoSound: false,
    camera: { frame: 'medium', move: 'static' }, vignette: 0.18, fx: ['dust'], fxAmount: 0.6,
    actors: [
      { character: 'चौपाल के दादा', x: 0.30, y: 0.84, size: 1.0, face: 'right', pose: 'laugh', emotion: 'funny' },
      { character: 'गाँव के बुज़ुर्ग', x: 0.50, y: 0.86, size: 1.04, face: 'left', pose: 'laugh', emotion: 'funny',
        keys: [{ at: 4.5, pose: 'point' }] },
      { character: 'चौपाल के काका', x: 0.70, y: 0.84, size: 1.0, face: 'left', pose: 'laugh', emotion: 'funny' },
    ],
    sounds: [{ kind: 'wind', at: 0.1, gain: 0.25 }],
    dialogue: [say(4, { at: 0.5, emotion: 'sad' }), say(5, { emotion: 'funny' })],
  },
  {
    name: '५ · टूटे चाक के आगे झुके सिर', scene: SC.houseDusk, time: 'dusk', mood: 'happy', atmosphere: 'quiet', autoSound: false,
    camera: { frame: 'wide', move: 'push' }, vignette: 0.3,
    fx: ['glow', 'rays', 'glitter'], fxAmount: 1.25,
    actors: [
      { character: 'चौपाल के दादा', x: 0.60, y: 0.78, size: 0.96, face: 'left', pose: 'fold', emotion: 'sad' },
      { character: 'गाँव के बुज़ुर्ग', x: 0.72, y: 0.82, size: 1.0, face: 'left', pose: 'fold', emotion: 'sad' },
      { character: 'चौपाल के काका', x: 0.84, y: 0.80, size: 0.98, face: 'left', pose: 'fold', emotion: 'sad' },
    ],
    props: [{ prop: P.chaak, x: 0.34, y: 0.90, size: 2.5, motion: 'glow' }],
    sounds: [{ kind: 'wind', at: 0.2, gain: 0.25 }, { kind: 'twinkle', at: 2.4, gain: 0.3 }, { kind: 'twinkle', at: 6.8, gain: 0.25 }],
    dialogue: [say(6, { at: 1.0, emotion: 'neutral' })],
    minDuration: 13.5,
  },
  {
    name: '६ · चंदनपुर · सुबह का घाट', scene: SC.ghat, time: 'dawn', mood: 'neutral', atmosphere: 'quiet', autoSound: false,
    camera: { frame: 'wide', move: 'pan-right' }, vignette: 0.15,
    fx: ['rays', 'glow', 'dust', 'shimmer'], fxAmount: 1, transition: 'fade',
    overlays: [{ text: 'चंदनपुर', eyebrow: 'एक छोटा सा गाँव', style: 'title', y: 0.2, at: 0.5, end: 4.4 }],
    sounds: [{ kind: 'birds', at: 0.2, gain: 0.12 }, { kind: 'twinkle', at: 0.7, gain: 0.24 }],
    dialogue: [say(7, { at: 2.6, emotion: 'happy' })],
    minDuration: 6.2,
  },
  {
    name: '७ · मंदिर की ओर', scene: SC.temple, time: 'dawn', mood: 'neutral', atmosphere: 'quiet', autoSound: false,
    camera: { frame: 'wide', move: 'push' }, vignette: 0.14, fx: ['rays', 'dust'], fxAmount: 0.8,
    sounds: [{ kind: 'wind', at: 0.2, gain: 0.2 }, { kind: 'bell', at: 4.5, gain: 0.45 }],
    dialogue: [say(8, { at: 0.5 })],
    minDuration: 5.8,
  },
  {
    name: '८ · मंदिर की घंटियाँ और पनघट', scene: SC.well, time: 'dawn', mood: 'neutral', atmosphere: 'quiet', autoSound: false,
    camera: { frame: 'wide', move: 'pull' }, vignette: 0.14, fx: ['rays', 'dust', 'glitter'], fxAmount: 0.8,
    actors: [
      { character: 'पनिहारिन काकी', x: 0.70, y: 0.74, size: 0.9, face: 'left', pose: 'idle', emotion: 'neutral',
        keys: [{ at: 2.2, pose: 'reach' }, { at: 4.2, pose: 'idle' }] },
      { character: 'पनिहारिन बहू', x: 0.55, y: 0.80, size: 0.95, face: 'left', pose: 'walk', emotion: 'neutral',
        keys: [{ at: 2.0, x: 0.50, pose: 'idle' }] },
    ],
    props: [{ prop: P.pot, x: 0.60, y: 0.82, size: 0.9, holder: 'पनिहारिन बहू' }],
    sounds: [{ kind: 'bell', at: 0.1, gain: 0.42 }, { kind: 'bell', at: 1.7, gain: 0.34 }, { kind: 'pot', at: 2.5, gain: 0.34 },
      { kind: 'water', at: 3.0, gain: 0.28 }, { kind: 'pot', at: 4.6, gain: 0.32 }, { kind: 'bell', at: 4.9, gain: 0.3 }],
    dialogue: [say(9, { at: 0.5 })],
  },
  {
    name: '९ · पुराना पीपल', scene: SC.chaupal, time: 'day', mood: 'neutral', atmosphere: 'village', autoSound: false,
    camera: { frame: 'wide', move: 'push' }, vignette: 0.14, fx: ['rays', 'dust'], fxAmount: 0.9,
    sounds: [{ kind: 'birds', at: 0.2, gain: 0.14 }],
    dialogue: [say(10, { at: 0.4 })],
  },
  {
    name: '१० · हर शाम की चौपाल', scene: SC.chaupalDusk, time: 'dusk', mood: 'neutral', atmosphere: 'village', autoSound: false,
    camera: { frame: 'medium', move: 'static' }, vignette: 0.26, fx: ['glow', 'fireflies', 'dust'], fxAmount: 0.9,
    actors: [
      { character: 'चौपाल के दादा', x: 0.44, y: 0.70, size: 0.86, face: 'right', pose: 'talk', stance: 'sit', emotion: 'neutral' },
      { character: 'गाँव के बुज़ुर्ग', x: 0.58, y: 0.70, size: 0.88, face: 'left', pose: 'listen', stance: 'sit', emotion: 'neutral',
        keys: [{ at: 2.0, pose: 'nod' }] },
      { character: 'चौपाल के काका', x: 0.70, y: 0.70, size: 0.86, face: 'left', pose: 'open', stance: 'sit', emotion: 'neutral' },
    ],
    sounds: [{ kind: 'wind', at: 0.2, gain: 0.18 }],
    dialogue: [say(11, { at: 0.4 })],
  },
  {
    name: '११ · गाँव का आख़िरी छोर', scene: SC.houseDusk, time: 'dusk', mood: 'sad', atmosphere: 'night', autoSound: false,
    camera: { frame: 'wide', move: 'pan-left' }, vignette: 0.34, fx: ['glow', 'dust'], fxAmount: 0.8,
    overlays: [{ text: 'गाँव का आख़िरी छोर', eyebrow: 'नाले के किनारे', style: 'tag', y: 0.14, at: 0.6, end: 4.6 }],
    sounds: [{ kind: 'wind', at: 0.1, gain: 0.3 }],
    dialogue: [say(12, { at: 0.6, emotion: 'sad' })],
  },
  {
    name: '१२ · टूटी छत, बारिश की लकीरें', scene: SC.houseDusk, time: 'dusk', mood: 'sad', atmosphere: 'night', autoSound: false,
    camera: { frame: 'wide', zoom: 1.7, x: 0.56, y: 0.3, move: 'push' }, vignette: 0.36, fx: ['glow', 'dust'], fxAmount: 0.7,
    sounds: [{ kind: 'wind', at: 0.1, gain: 0.3 }],
    dialogue: [say(13, { at: 0.4, emotion: 'sad' })],
  },
  {
    name: '१३ · जानकी और छोटू', scene: SC.houseDusk, time: 'dusk', mood: 'happy', atmosphere: 'night', autoSound: false,
    camera: { frame: 'wide', move: 'push' }, vignette: 0.3, fx: ['glow', 'glitter', 'dust', 'fireflies'], fxAmount: 0.8, transition: 'fade',
    overlays: [
      { text: 'जानकी', eyebrow: '३८ साल', style: 'tag', y: 0.15, at: 1.0, end: 3.7 },
      { text: 'छोटू', eyebrow: '११ साल', style: 'tag', y: 0.15, at: 3.9, end: 7.2 },
    ],
    actors: [
      { character: 'जानकी', x: 0.42, y: 0.84, size: 1.0, face: 'right', pose: 'idle', emotion: 'neutral' },
      { character: 'छोटू', x: 0.56, y: 0.85, size: 0.86, face: 'left', pose: 'wave', emotion: 'happy',
        keys: [{ at: 4.0, pose: 'idle' }] },
    ],
    sounds: [{ kind: 'twinkle', at: 1.2, gain: 0.26 }, { kind: 'twinkle', at: 3.8, gain: 0.26 }, { kind: 'wind', at: 0.1, gain: 0.22 }],
    dialogue: [say(14, { at: 0.5, emotion: 'neutral' })],
    minDuration: 9.4,
  },
];

const story = {
  title: 'बंजर टीले की लाल मिट्टी और एक माँ का हौसला · भाग १',
  language: 'hi', ratio: '16:9', captions: true, captionScale: 0.74,
  characters, scenes, props, shots, ...(score ? { score: { file: score, gain: 0.34 } } : {}),
};
for (const shot of story.shots) {
  shot.actors ??= [];
  shot.props ??= [];
  shot.fx ??= [];
}
// Props held by a character must not carry a placement of their own.
for (const shot of story.shots) for (const item of shot.props) if (item.grasp === undefined) delete item.grasp;
writeFileSync(join(here, '..', 'storyboard.json'), JSON.stringify(story, null, 2), 'utf8');
console.log(`storyboard.json · ${story.shots.length} shots${score ? ' · with score' : ' · no score yet'}`);
