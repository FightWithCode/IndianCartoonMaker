// Build storyboard-part-4.json for "जादुई चक्की और दो भाइयों का न्याय" · खंड 4 (सोहन की चोरी और लालच का चक्रव्यूह).
//
//   node productions/jadui-chakki-aur-do-bhai/build/board4.mjs
//
// Reads build/voices.json (clips i1..i30 are Part 6.mp3), build/plates.json and build/score4.json.
// Backdrops: night regrades of the potter's house and the haveli, the lantern-lit room, a painted haveli hall,
// and the cracked haveli with gold pouring out (all from build/plates.py). The gold heap and the coin
// streams are the engine's `gold` layer and `coins` effect, so the gold really rises around Sohan.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = file => JSON.parse(readFileSync(join(here, file), 'utf8'));
const voices = read('voices.json');
const plates = read('plates.json');
const score = (() => { try { return read('score4.json').id; } catch { return undefined; } })();

const V = Object.fromEntries(voices.map(v => [v.key, v]));
const dur = key => V[key].duration - 0.08;
const say = (key, extra = {}) => ({ speaker: 'कथावाचक', text: V[key].caption, audio: V[key].audio, ...extra });
/** When each clip starts inside its shot, mirroring how the studio places consecutive lines. */
function timing(keys, first = 0.3) {
  const out = {};
  let cursor = first;
  for (const key of keys) { out[key] = { start: cursor, end: cursor + dur(key) }; cursor = out[key].end + 0.22; }
  return out;
}
const span = (t, keys) => t[keys.at(-1)].end + 0.4;

// ------------------------------------------------------------------------------------ cast
const SOHAN = 'सोहन';
const MADHAV = 'माधव (खुशहाल)';
const KAVITA = 'कविता (खुशहाल)';
const MAA = 'बूढ़ी मां (स्वस्थ)';
const characters = [
  { name: MADHAV, gender: 'male', age: 'adult', build: 'regular', costume: 'kurta', hair: 'crop', skin: '#a8694a', primary: '#e9dfc6', accent: '#a2593e',
    moustache: false, voiceStyle: 'male, young adult, moderate pitch' },
  { name: KAVITA, gender: 'female', age: 'adult', build: 'regular', costume: 'sari', hair: 'bun', skin: '#b06f4d', primary: '#b8566b', accent: '#e0b860',
    jewelry: 'simple', voiceStyle: 'female, young adult, moderate pitch' },
  { name: MAA, gender: 'female', age: 'elder', build: 'regular', costume: 'sari', hair: 'grey', skin: '#a56a4c', primary: '#f1ece0', accent: '#c9a064',
    jewelry: 'simple', voiceStyle: 'female, elderly, low pitch' },
  { name: SOHAN, gender: 'male', age: 'adult', build: 'stout', costume: 'kurta', hair: 'turban', skin: '#b07a55', primary: '#7b2d3b', accent: '#e3b64f',
    trim: '#e8c25a', shawl: '#c99a2e', jewelry: 'gold', moustache: true, voiceStyle: 'male, middle-aged, low pitch' },
];

// ----------------------------------------------------------------------------------- scenes
const scene = (name, kind, image, ambience) => ({ name, kind, image, ambience, bakedLight: true });
const SC = {
  house: 'जादुई चक्की · रात में माधव का घर', room: 'जादुई चक्की · रात में माधव का कमरा', street: 'जादुई चक्की · रात में सोहन की हवेली',
  hall: 'जादुई चक्की · हवेली का दालान', crack: 'जादुई चक्की · चटकती हवेली',
};
const scenes = [
  scene(SC.house, 'courtyard', plates['house-night'], 'night'),
  scene(SC.room, 'home', plates['room-night'], 'night'),
  scene(SC.street, 'home', plates['haveli-night'], 'night'),
  scene(SC.hall, 'home', plates['haveli-hall'], 'room'),
  scene(SC.crack, 'home', plates['haveli-crack'], 'night'),
];

// ------------------------------------------------------------------------------------ props
const P = {
  mill: 'जादुई चक्की · पत्थर की चक्की', grain: 'जादुई चक्की · अनाज उगलती चक्की', glow: 'जादुई चक्की · चमकती चक्की', spin: 'जादुई चक्की · घूमती चक्की',
  sack: 'जादुई चक्की · भरी बोरी', quilt: 'जादुई चक्की · रजाई', lota: 'जादुई चक्की · पीतल का लोटा', coins: 'जादुई चक्की · सिक्कों का ढेर',
};
const props = [
  { name: P.mill, kind: 'chakki', color: '#8f8a82' },
  { name: P.grain, kind: 'chakki', color: '#8f8a82', label: 'grain' },
  { name: P.glow, kind: 'chakki', color: '#8f8a82', label: 'glow' },
  { name: P.spin, kind: 'chakki', color: '#8f8a82', label: 'spin' },
  { name: P.sack, kind: 'seed-sack', color: '#b98d52' },
  { name: P.quilt, kind: 'quilt', color: '#7d5a8c' },
  { name: P.lota, kind: 'lota', color: '#d9a33c' },
  { name: P.coins, kind: 'coin-pile', color: '#e6b33a' },
];
const carried = (holder, x, y, extra = {}) => ({ prop: P.mill, x, y, size: 0.85, holder, grasp: { hand: 'both', x: 0, y: -58 }, ...extra });

const shots = [];
const mood = [];
const shot = (music, definition) => { mood.push(music); shots.push({ actors: [], props: [], fx: [], sounds: [], ...definition }); };

// Gold levels use the actors' y scale. An adult of size 1 is about 0.42 of the frame tall, so standing at
// y 0.88 the waist is near 0.72, the chest near 0.63 and the neck near 0.58.
const WINDOWS = [0.116, 0.203, 0.29, 0.378, 0.622, 0.709, 0.797, 0.884].map((x, i) => ({ x, y: 0.31, mode: 'spill', rate: 0.55, at: 0.2 + i * 0.12 }));

// ---- Scene 1 · spying in the shadows ---------------------------------------------------------------
{
  const t = timing(['i1', 'i2'], 0.3);
  shot('anger', {
    name: '१ · ईर्ष्या की आग', scene: SC.street, time: 'night', mood: 'angry', atmosphere: 'night', autoSound: false, transition: 'fade',
    camera: { frame: 'medium', zoom: 1.5, x: 0.5, y: 0.6, move: 'push' }, vignette: 0.42, fx: ['embers'], fxAmount: 0.8,
    actors: [{ character: SOHAN, x: 0.42, y: 0.9, size: 1.0, face: 'right', pose: 'walk', emotion: 'neutral',
      keys: [{ at: 1.6, x: 0.52, pose: 'fold', emotion: 'angry' }, { at: t.i2.start, emotion: 'angry', pose: 'fold' }] }],
    sounds: [{ kind: 'footstep', at: 0.4, gain: 0.1 }, { kind: 'footstep', at: 1.0, gain: 0.1 }, { kind: 'angry', at: t.i2.start + 0.2, gain: 0.25 }],
    dialogue: [say('i1', { at: 0.3 }), say('i2')],
  });
}
shot('walk', {
  name: '२ · घर में सब सो रहे थे', scene: SC.room, time: 'night', mood: 'neutral', atmosphere: 'night', autoSound: false, transition: 'fade',
  camera: { frame: 'wide', move: 'push' }, vignette: 0.4, fx: ['fireflies'], fxAmount: 0.3, minDuration: 3.6,
  actors: [
    { character: MAA, x: 0.30, y: 0.86, size: 0.86, face: 'right', pose: 'doze', stance: 'lie', emotion: 'neutral' },
    { character: KAVITA, x: 0.56, y: 0.88, size: 0.92, face: 'left', pose: 'doze', stance: 'sit', emotion: 'neutral' },
    { character: MADHAV, x: 0.74, y: 0.88, size: 0.96, face: 'left', pose: 'doze', stance: 'sit', emotion: 'neutral' },
  ],
  props: [{ prop: P.quilt, x: 0.30, y: 0.87, size: 0.9 }],
  dialogue: [say('i3', { at: 0.3 })],
});
shot('walk', {
  name: '३ · दबे पांव', scene: SC.house, time: 'night', mood: 'worried', atmosphere: 'night', autoSound: false,
  camera: { frame: 'wide', zoom: 1.25, x: 0.55, y: 0.6, move: 'pan' }, vignette: 0.45, fx: [], minDuration: 3.6,
  actors: [{ character: SOHAN, x: 0.12, y: 0.9, size: 0.7, face: 'right', pose: 'sneak', emotion: 'worried', keys: [{ at: 3.3, x: 0.46, y: 0.72, size: 0.56 }, { at: 3.5, pose: 'listen' }] }],
  sounds: [{ kind: 'footstep', at: 0.6, gain: 0.05 }, { kind: 'footstep', at: 1.5, gain: 0.05 }, { kind: 'footstep', at: 2.4, gain: 0.05 }],
  dialogue: [say('i4', { at: 0.2 })],
});
shot('peak', {
  name: '४ · खिड़की से झांका', scene: SC.house, time: 'night', mood: 'surprised', atmosphere: 'night', autoSound: false,
  camera: { frame: 'close', zoom: 2.4, x: 0.53, y: 0.48, move: 'push' }, vignette: 0.5, fx: [], minDuration: 2.4,
  actors: [{ character: SOHAN, x: 0.50, y: 0.66, size: 0.52, face: 'right', pose: 'look', emotion: 'neutral', keys: [{ at: 1.2, emotion: 'surprised' }] }],
  dialogue: [say('i5', { at: 0.2 })],
});
{
  const t = timing(['i6', 'i7'], 0.3);
  shot('wonder', {
    name: '५ · चक्की से अनाज', scene: SC.room, time: 'night', mood: 'surprised', atmosphere: 'night', autoSound: false,
    camera: { frame: 'medium', zoom: 1.45, x: 0.5, y: 0.66, move: 'push' }, vignette: 0.42, fx: ['glitter'], fxAmount: 0.5,
    actors: [{ character: MADHAV, x: 0.4, y: 0.86, size: 1.0, face: 'right', pose: 'work', stance: 'sit', emotion: 'happy' }],
    props: [{ prop: P.grain, x: 0.55, y: 0.9, size: 1.15 }, { prop: P.sack, x: 0.70, y: 0.9, size: 0.8, at: t.i7.start - 0.2 }],
    sounds: [{ kind: 'twinkle', at: t.i7.start, gain: 0.2 }],
    dialogue: [say('i6', { at: 0.3 }), say('i7')],
  });
}
{
  const t = timing(['i8', 'i9'], 0.3);
  shot('wealth', {
    name: '६ · मुंह में पानी', scene: SC.house, time: 'night', mood: 'funny', atmosphere: 'night', autoSound: false,
    camera: { frame: 'close', zoom: 2.4, x: 0.53, y: 0.5, move: 'push' }, vignette: 0.5, fx: ['glitter'], fxAmount: 0.4,
    actors: [{ character: SOHAN, x: 0.50, y: 0.66, size: 0.52, face: 'right', pose: 'think', emotion: 'happy', keys: [{ at: t.i9.start, pose: 'talk', emotion: 'happy' }] }],
    dialogue: [say('i8', { at: 0.3 }), say('i9', { speaker: SOHAN, emotion: 'happy' })],
  });
}

// ---- Scene 2 · the midnight theft ------------------------------------------------------------------
shot('walk', {
  name: '७ · माधव बाहर निकला', scene: SC.house, time: 'night', mood: 'worried', atmosphere: 'night', autoSound: false,
  camera: { frame: 'wide', zoom: 1.3, x: 0.52, y: 0.6 }, vignette: 0.45, fx: [], minDuration: 3.2,
  actors: [
    { character: MADHAV, x: 0.60, y: 0.72, size: 0.56, face: 'right', pose: 'walk', emotion: 'neutral', keys: [{ at: 2.8, x: 0.86, y: 0.86, size: 0.7 }] },
    { character: SOHAN, x: 0.30, y: 0.8, size: 0.62, face: 'right', pose: 'hush', emotion: 'worried' },
  ],
  props: [{ prop: P.lota, x: 0.6, y: 0.72, size: 0.7, holder: MADHAV, grasp: { hand: 'near', x: 0, y: -20 } }],
  sounds: [{ kind: 'door', at: 0.2, gain: 0.12 }, { kind: 'footstep', at: 0.8, gain: 0.08 }, { kind: 'footstep', at: 1.6, gain: 0.08 }],
  dialogue: [say('i10', { at: 0.2 })],
});
shot('peak', {
  name: '८ · चक्की चुराई', scene: SC.room, time: 'night', mood: 'worried', atmosphere: 'night', autoSound: false,
  camera: { frame: 'medium', zoom: 1.35, x: 0.5, y: 0.66 }, vignette: 0.45, fx: [], minDuration: 4.0,
  actors: [{ character: SOHAN, x: 0.14, y: 0.9, size: 1.0, face: 'right', pose: 'sneak', emotion: 'worried',
    keys: [{ at: 1.1, x: 0.46, pose: 'scoop', stance: 'crouch', emotion: 'happy' }, { at: 1.9, pose: 'cradle', stance: 'stand' }, { at: 2.3, pose: 'run', face: 'left' }, { at: 3.9, x: -0.2 }] }],
  props: [
    { prop: P.mill, x: 0.56, y: 0.9, size: 0.9, end: 1.9 },
    carried(SOHAN, 0.46, 0.9, { at: 1.9 }),
  ],
  sounds: [{ kind: 'whoosh', at: 1.9, gain: 0.3 }, { kind: 'footstep', at: 2.5, gain: 0.12 }, { kind: 'footstep', at: 2.8, gain: 0.12 }, { kind: 'footstep', at: 3.1, gain: 0.12 }],
  dialogue: [say('i11', { at: 0.2 })],
});
shot('peak', {
  name: '९ · हवेली की ओर भागा', scene: SC.street, time: 'night', mood: 'worried', atmosphere: 'night', autoSound: false,
  camera: { frame: 'wide', zoom: 1.15, x: 0.5, y: 0.6 }, vignette: 0.45, fx: [], minDuration: 2.2,
  actors: [{ character: SOHAN, x: -0.1, y: 0.92, size: 0.85, face: 'right', pose: 'run', emotion: 'happy', keys: [{ at: 1.9, x: 0.52, y: 0.8, size: 0.62 }] }],
  props: [carried(SOHAN, -0.1, 0.92)],
  sounds: [{ kind: 'footstep', at: 0.2, gain: 0.14 }, { kind: 'footstep', at: 0.5, gain: 0.14 }, { kind: 'footstep', at: 0.8, gain: 0.14 }, { kind: 'footstep', at: 1.1, gain: 0.14 }],
  dialogue: [],
});
shot('anger', {
  name: '१० · दरवाजे बंद', scene: SC.hall, time: 'night', mood: 'worried', atmosphere: 'room', autoSound: false,
  camera: { frame: 'medium', zoom: 1.3, x: 0.5, y: 0.6, move: 'push' }, vignette: 0.4, fx: [], minDuration: 6.4,
  actors: [{ character: SOHAN, x: 0.5, y: 0.9, size: 1.0, face: 'back', pose: 'reach', emotion: 'worried',
    keys: [{ at: 2.6, pose: 'hold' }, { at: 3.6, face: 'front', pose: 'cradle', emotion: 'happy' }] }],
  props: [carried(SOHAN, 0.5, 0.9, { at: 3.6 })],
  sounds: [{ kind: 'door', at: 0.5, gain: 0.5 }, { kind: 'door', at: 1.6, gain: 0.35 }, { kind: 'door', at: 2.4, gain: 0.3 }],
  dialogue: [say('i12', { at: 0.3 })],
});

// ---- Scene 3 · the greedy wish and the golden rain ----------------------------------------------------
{
  const t = timing(['i13', 'i14'], 0.3);
  shot('anger', {
    name: '११ · बाईं ओर घुमाकर मांगा सोना', scene: SC.hall, time: 'night', mood: 'angry', atmosphere: 'room', autoSound: false,
    camera: { frame: 'medium', zoom: 1.4, x: 0.52, y: 0.64, move: 'push' }, vignette: 0.42, fx: ['aura'], fxAmount: 0.6, auraX: 0.6, auraY: 0.78,
    actors: [{ character: SOHAN, x: 0.44, y: 0.9, size: 1.0, face: 'right', pose: 'work', stance: 'crouch', emotion: 'happy',
      keys: [{ at: t.i14.start, pose: 'cheer', stance: 'stand', emotion: 'angry' }] }],
    props: [{ prop: P.spin, x: 0.6, y: 0.9, size: 0.95, motion: 'glow' }],
    sounds: [{ kind: 'whoosh', at: 0.8, gain: 0.25 }],
    dialogue: [say('i13', { at: 0.3 }), say('i14', { speaker: SOHAN, emotion: 'angry' })],
  });
}
{
  const t = timing(['i15', 'i16'], 0.3);
  shot('wealth', {
    name: '१२ · सोने की बरसात', scene: SC.hall, time: 'night', mood: 'surprised', atmosphere: 'room', autoSound: false,
    camera: { frame: 'wide', zoom: 1.2, x: 0.52, y: 0.6, move: 'pull' }, vignette: 0.34, fx: ['coins', 'aura', 'glitter'], fxAmount: 1.1, auraX: 0.6, auraY: 0.72,
    coinSources: [{ x: 0.6, y: 0.74, mode: 'fountain', rate: 0.6, at: 0.3 }, { x: 0.6, y: 0.74, mode: 'fountain', rate: 0.8, at: t.i16.start }],
    gold: { from: 1.06, to: 0.97, at: t.i16.start, peakX: 0.6 },
    actors: [{ character: SOHAN, x: 0.36, y: 0.9, size: 0.95, face: 'right', pose: 'flinch', emotion: 'surprised', keys: [{ at: t.i16.start + 0.8, pose: 'open', emotion: 'happy' }] }],
    props: [{ prop: P.spin, x: 0.6, y: 0.9, size: 0.95, motion: 'glow' }],
    sounds: [{ kind: 'twinkle', at: 0.4, gain: 0.3 }, ...[0.7, 1.2, 1.7, 2.2, 2.8, 3.4, 4.0, 4.6].map(at => ({ kind: 'coin', at, gain: 0.18 }))],
    dialogue: [say('i15', { at: 0.3 }), say('i16')],
  });
}
{
  const t = timing(['i17', 'i18'], 0.3);
  const end = span(t, ['i17', 'i18']);
  const dance = [];
  for (let at = 0.4, i = 0; at < end - 0.3; at += 0.45, i++) dance.push({ at, pose: i % 2 ? 'cheer' : 'laugh', face: i % 4 < 2 ? 'right' : 'left', y: 0.92 - 0.05 * (at / end) });
  shot('wealth', {
    name: '१३ · सिक्कों के ढेर पर नाच', scene: SC.hall, time: 'night', mood: 'funny', atmosphere: 'room', autoSound: false,
    camera: { frame: 'wide', zoom: 1.2, x: 0.5, y: 0.6 }, vignette: 0.34, fx: ['coins', 'glitter', 'aura'], fxAmount: 1.2, auraX: 0.66, auraY: 0.62,
    coinSources: [{ x: 0.66, y: 0.64, mode: 'fountain', rate: 1 }],
    gold: { from: 0.97, to: 0.9, peakX: 0.66 },
    actors: [{ character: SOHAN, x: 0.38, y: 0.9, size: 0.95, face: 'right', pose: 'laugh', emotion: 'funny', keys: dance }],
    props: [{ prop: P.spin, x: 0.66, y: 0.92, size: 0.95, motion: 'glow', keys: [{ at: end, y: 0.86 }] }],
    sounds: [0.5, 1.4, 2.3, 3.2, 4.1].map(at => ({ kind: 'coin', at, gain: 0.16 })).concat([{ kind: 'funny', at: 0.6, gain: 0.2 }]),
    dialogue: [say('i17', { at: 0.3 }), say('i18')],
  });
}

// ---- Scene 4 · the unstoppable trap ------------------------------------------------------------------
{
  const t = timing(['i19', 'i20'], 0.3);
  shot('storm', {
    name: '१४ · कमर तक सोना', scene: SC.hall, time: 'night', mood: 'worried', atmosphere: 'room', autoSound: false,
    camera: { frame: 'medium', zoom: 1.35, x: 0.48, y: 0.56, move: 'push' }, vignette: 0.4, fx: ['coins', 'aura'], fxAmount: 1.2, auraX: 0.68, auraY: 0.62,
    coinSources: [{ x: 0.68, y: 0.64, mode: 'fountain', rate: 1.2 }],
    gold: { from: 0.9, to: 0.72, peakX: 0.68 },
    actors: [{ character: SOHAN, x: 0.42, y: 0.88, size: 1.0, face: 'right', pose: 'laugh', emotion: 'funny',
      keys: [{ at: 1.6, pose: 'flinch', emotion: 'surprised' }, { at: t.i20.start, pose: 'shiver', emotion: 'worried' }] }],
    props: [{ prop: P.spin, x: 0.68, y: 0.86, size: 0.95, motion: 'glow', keys: [{ at: span(t, ['i19', 'i20']), y: 0.7 }] }],
    sounds: [0.4, 1.3, 2.2, 3.1, 4.0, 4.9, 5.8, 6.7].map(at => ({ kind: 'coin', at, gain: 0.16 })).concat([{ kind: 'surprise', at: 1.6, gain: 0.3 }]),
    dialogue: [say('i19', { at: 0.3 }), say('i20')],
  });
}
{
  const t = timing(['i21', 'i22', 'i23'], 0.3);
  shot('storm', {
    name: '१५ · रोकने की कोशिश', scene: SC.hall, time: 'night', mood: 'worried', atmosphere: 'room', autoSound: false,
    camera: { frame: 'close', zoom: 1.7, x: 0.52, y: 0.5, move: 'push' }, vignette: 0.46, fx: ['coins'], fxAmount: 1.3, auraX: 0.62, auraY: 0.52,
    coinSources: [{ x: 0.62, y: 0.52, mode: 'fountain', rate: 1.2 }],
    gold: { from: 0.72, to: 0.67, peakX: 0.62 },
    actors: [{ character: SOHAN, x: 0.44, y: 0.88, size: 1.0, face: 'right', pose: 'reach', emotion: 'worried',
      keys: [{ at: t.i22.start, pose: 'shake', emotion: 'worried' }, { at: t.i23.start, pose: 'reach', emotion: 'surprised' }] }],
    props: [{ prop: P.spin, x: 0.62, y: 0.7, size: 0.95, motion: 'glow', keys: [{ at: span(t, ['i21', 'i22', 'i23']), y: 0.65 }] }],
    sounds: [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5].map(at => ({ kind: 'coin', at, gain: 0.15 })),
    dialogue: [say('i21', { at: 0.3 }), say('i22'), say('i23')],
  });
}
{
  const t = timing(['i24', 'i25'], 0.3);
  shot('peak', {
    name: '१६ · रुक जा!', scene: SC.hall, time: 'night', mood: 'worried', atmosphere: 'room', autoSound: false,
    camera: { frame: 'close', zoom: 1.9, x: 0.48, y: 0.44, move: 'push' }, vignette: 0.5, fx: ['coins'], fxAmount: 1.4, auraX: 0.66, auraY: 0.44,
    coinSources: [{ x: 0.66, y: 0.46, mode: 'fountain', rate: 1.3 }],
    gold: { from: 0.67, to: 0.63, peakX: 0.66 },
    actors: [{ character: SOHAN, x: 0.44, y: 0.88, size: 1.0, face: 'front', pose: 'flinch', emotion: 'worried', keys: [{ at: t.i25.start, pose: 'shake', emotion: 'surprised' }] }],
    sounds: [{ kind: 'surprise', at: t.i25.start, gain: 0.3 }, ...[0.6, 1.6, 2.6, 3.6, 4.6].map(at => ({ kind: 'coin', at, gain: 0.15 }))],
    dialogue: [say('i24', { at: 0.3 }), say('i25', { speaker: SOHAN, emotion: 'worried' })],
  });
}

// ---- Scene 5 · crushing greed and the cliffhanger -------------------------------------------------------
{
  const t = timing(['i26', 'i27'], 0.3);
  shot('storm', {
    name: '१७ · छत तक सोना', scene: SC.hall, time: 'night', mood: 'worried', atmosphere: 'room', autoSound: false,
    camera: { frame: 'wide', zoom: 1.1, x: 0.5, y: 0.55 }, vignette: 0.44, fx: ['coins', 'aura'], fxAmount: 1.5, auraX: 0.66, auraY: 0.5,
    coinSources: [{ x: 0.66, y: 0.5, mode: 'fountain', rate: 1.5 }],
    gold: { from: 0.63, to: 0.58, peakX: 0.66 },
    actors: [{ character: SOHAN, x: 0.42, y: 0.88, size: 1.0, face: 'front', pose: 'shiver', emotion: 'worried', keys: [{ at: span(t, ['i26', 'i27']), y: 0.86 }] }],
    sounds: [{ kind: 'thunder', at: 0.4, gain: 0.25 }, ...[0.5, 1.2, 1.9, 2.6, 3.3, 4.0].map(at => ({ kind: 'coin', at, gain: 0.16 }))],
    dialogue: [say('i26', { at: 0.3 }), say('i27')],
  });
}
shot('storm', {
  name: '१८ · दीवारें चटकने लगीं', scene: SC.crack, time: 'night', mood: 'worried', atmosphere: 'night', autoSound: false,
  camera: { frame: 'wide', move: 'push' }, vignette: 0.4, fx: ['coins', 'glitter', 'glow'], fxAmount: 1.1,
  coinSources: WINDOWS,
  sounds: [{ kind: 'thunder', at: 0.3, gain: 0.5 }, { kind: 'thunder', at: 2.6, gain: 0.35 }, ...[0.6, 1.1, 1.6, 2.1, 2.6, 3.1, 3.6, 4.1].map(at => ({ kind: 'coin', at, gain: 0.14 }))],
  dialogue: [say('i28', { at: 0.3 })],
});
shot('peak', {
  name: '१९ · दरवाजा जाम', scene: SC.hall, time: 'night', mood: 'worried', atmosphere: 'room', autoSound: false,
  camera: { frame: 'medium', zoom: 1.45, x: 0.5, y: 0.42 }, vignette: 0.5, fx: ['coins'], fxAmount: 1.2, auraX: 0.82, auraY: 0.3,
  coinSources: [{ x: 0.85, y: 0.3, mode: 'fountain', rate: 1 }],
  gold: { from: 0.585, to: 0.575 },
  actors: [{ character: SOHAN, x: 0.5, y: 0.86, size: 1.0, face: 'back', pose: 'work', emotion: 'worried' }],
  sounds: [{ kind: 'door', at: 0.4, gain: 0.5 }, { kind: 'door', at: 1.0, gain: 0.5 }, { kind: 'door', at: 1.6, gain: 0.45 }],
  dialogue: [say('i29', { at: 0.3 })],
});
shot('anger', {
  name: '२० · मदद के लिए चीख', scene: SC.hall, time: 'night', mood: 'worried', atmosphere: 'room', autoSound: false,
  camera: { frame: 'close', zoom: 2.1, x: 0.48, y: 0.36, move: 'push' }, vignette: 0.55, fx: ['coins'], fxAmount: 1.4, auraX: 0.7, auraY: 0.26,
  coinSources: [{ x: 0.72, y: 0.26, mode: 'fountain', rate: 1.2 }],
  gold: { from: 0.575, to: 0.56 },
  actors: [{ character: SOHAN, x: 0.46, y: 0.86, size: 1.0, face: 'front', pose: 'flinch', emotion: 'surprised', keys: [{ at: 1.6, pose: 'shake', emotion: 'worried' }] }],
  sounds: [{ kind: 'surprise', at: 0.4, gain: 0.3 }, ...[0.8, 1.6, 2.4, 3.2].map(at => ({ kind: 'coin', at, gain: 0.15 }))],
  dialogue: [say('i30', { at: 0.3 })],
});
shot('storm', {
  name: '२१ · सोना बाहर बह निकला', scene: SC.crack, time: 'night', mood: 'worried', atmosphere: 'night', autoSound: false, transition: 'fade',
  camera: { frame: 'wide', zoom: 1.2, x: 0.5, y: 0.5, move: 'pull' }, vignette: 0.48, fx: ['coins', 'glitter', 'glow'], fxAmount: 1.3, minDuration: 4.2,
  coinSources: WINDOWS.map(w => ({ ...w, rate: 0.8, at: 0 })),
  sounds: [{ kind: 'thunder', at: 0.2, gain: 0.55 }, { kind: 'whoosh', at: 1.4, gain: 0.3 }, ...[0.5, 1.0, 1.5, 2.0, 2.5, 3.0].map(at => ({ kind: 'coin', at, gain: 0.14 }))],
  dialogue: [],
});

const story = {
  title: 'जादुई चक्की और दो भाइयों का न्याय · खंड 4', slug: 'jadui-chakki-aur-do-bhai-part-4',
  language: 'hi', ratio: '16:9', captions: true, captionScale: 0.74,
  characters, scenes, props, shots, ...(score ? { score: { file: score, gain: 0.34 } } : {}),
};
writeFileSync(join(here, '..', 'storyboard-part-4.json'), JSON.stringify(story, null, 2), 'utf8');
writeFileSync(join(here, 'music4.json'), JSON.stringify(mood), 'utf8');
console.log(`storyboard-part-4.json · ${shots.length} shots${score ? ' · with score' : ' · no score yet'}`);
