// Build storyboard-part-3.json for "जादुई चक्की और दो भाइयों का न्याय" · खंड 3 (चक्की घर आई, खुशहाली और सोहन की जलन).
//
//   node productions/jadui-chakki-aur-do-bhai/build/board3.mjs
//
// Reads build/voices.json (clips h1..h23 are Part 5.mp3), build/plates.json and build/score3.json.
// Backdrops: the author's evening courtyard and pottery-yard plates, plus the hut and haveli plates made earlier.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = file => JSON.parse(readFileSync(join(here, file), 'utf8'));
const voices = read('voices.json');
const plates = read('plates.json');
const score = (() => { try { return read('score3.json').id; } catch { return undefined; } })();

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

// ------------------------------------------------------------------------------------ cast
const MADHAV = 'माधव';
const KAVITA = 'कविता';
const MAA = 'बूढ़ी मां';
const SOHAN = 'सोहन';
const NOW = { madhav: 'माधव (खुशहाल)', kavita: 'कविता (खुशहाल)', maa: 'बूढ़ी मां (स्वस्थ)' };
const VAIDYA = 'वैद्य जी';
const RAMU = 'रामू काका';
const KAMLI = 'कमली';
const BIRJU = 'नन्हा बिरजू';
const DHANIYA = 'धनिया';
const BHOLA = 'भोला';
const MUNIM = 'मुनीम जी';

const leads = [
  { name: MADHAV, gender: 'male', age: 'adult', build: 'slim', costume: 'dhoti', hair: 'crop', skin: '#a8694a', primary: '#b8ad90', accent: '#a2593e',
    patches: true, mud: true, barefoot: true, moustache: false, voiceStyle: 'male, young adult, moderate pitch' },
  { name: KAVITA, gender: 'female', age: 'adult', build: 'slim', costume: 'sari', hair: 'bun', skin: '#b06f4d', primary: '#6f8e88', accent: '#b89a58',
    patches: true, jewelry: 'simple', barefoot: true, voiceStyle: 'female, young adult, moderate pitch' },
  { name: MAA, gender: 'female', age: 'elder', build: 'slim', costume: 'sari', hair: 'grey', skin: '#a56a4c', primary: '#d9d4c6', accent: '#9a968b',
    patches: true, barefoot: true, voiceStyle: 'female, elderly, low pitch' },
  // The same three after the mill has changed their lives: clean cloth, no patches, no mud, a little jewellery.
  { name: NOW.madhav, gender: 'male', age: 'adult', build: 'regular', costume: 'kurta', hair: 'crop', skin: '#a8694a', primary: '#e9dfc6', accent: '#a2593e',
    moustache: false, voiceStyle: 'male, young adult, moderate pitch' },
  { name: NOW.kavita, gender: 'female', age: 'adult', build: 'regular', costume: 'sari', hair: 'bun', skin: '#b06f4d', primary: '#b8566b', accent: '#e0b860',
    jewelry: 'simple', voiceStyle: 'female, young adult, moderate pitch' },
  { name: NOW.maa, gender: 'female', age: 'elder', build: 'regular', costume: 'sari', hair: 'grey', skin: '#a56a4c', primary: '#f1ece0', accent: '#c9a064',
    jewelry: 'simple', voiceStyle: 'female, elderly, low pitch' },
  { name: SOHAN, gender: 'male', age: 'adult', build: 'stout', costume: 'kurta', hair: 'turban', skin: '#b07a55', primary: '#7b2d3b', accent: '#e3b64f',
    trim: '#e8c25a', shawl: '#c99a2e', jewelry: 'gold', moustache: true, voiceStyle: 'male, middle-aged, low pitch' },
];
const wanted = new Set([VAIDYA, RAMU, KAMLI, BIRJU, DHANIYA, BHOLA, MUNIM]);
const roster = JSON.parse(readFileSync(join(here, '..', '..', '_cast', 'naukars.json'), 'utf8')).filter(c => wanted.has(c.name)).map(({ role, ...rest }) => rest);
// रामू काका is no longer in the shared cast; these two films keep their own copy so they rebuild unchanged.
const ramuLocal = {"name": "रामू काका", "gender": "male", "age": "elder", "build": "slim", "costume": "dhoti", "hair": "grey", "skin": "#a5714e", "primary": "#e3dccb", "accent": "#9a6a48", "shawl": "#9a8c70", "beard": "white", "tilak": "red", "barefoot": true, "moustache": true, "voiceStyle": "male, elderly, low pitch"};
const characters = [...leads, ...roster, ramuLocal];

// ----------------------------------------------------------------------------------- scenes
const scene = (name, kind, image, ambience) => ({ name, kind, image, ambience, bakedLight: true });
const SC = { hut: 'जादुई चक्की · माधव की झोपड़ी', yard: 'जादुई चक्की · कुम्हार का आंगन', evening: 'जादुई चक्की · शाम का चौक', haveli: 'जादुई चक्की · सोहन की हवेली' };
const scenes = [
  scene(SC.hut, 'home', plates.jhopdi, 'village'),
  scene(SC.yard, 'courtyard', plates['pottery-yard'], 'village'),
  scene(SC.evening, 'chowk', plates['courtyard-evening'], 'night'),
  scene(SC.haveli, 'home', plates.haveli, 'village'),
];

// ------------------------------------------------------------------------------------ props
const P = {
  mill: 'जादुई चक्की · पत्थर की चक्की', spin: 'जादुई चक्की · घूमती चक्की', grain: 'जादुई चक्की · अनाज उगलती चक्की', heap: 'जादुई चक्की · अनाज का ढेर',
  sack: 'जादुई चक्की · अनाज की बोरी', sackB: 'जादुई चक्की · भरी बोरी', cloth: 'जादुई चक्की · तह किया कपड़ा', pouch: 'जादुई चक्की · दवा की पोटली',
  chaak: 'जादुई चक्की · माधव का चाक', pot: 'जादुई चक्की · पका लाल घड़ा', ledger: 'जादुई चक्की · मुनीम की बही',
};
const props = [
  { name: P.mill, kind: 'chakki', color: '#8f8a82' },
  { name: P.spin, kind: 'chakki', color: '#8f8a82', label: 'spin' },
  { name: P.grain, kind: 'chakki', color: '#8f8a82', label: 'grain' },
  { name: P.heap, kind: 'chakki', color: '#8f8a82', label: 'heap' },
  { name: P.sack, kind: 'seed-sack', color: '#c9a15f' },
  { name: P.sackB, kind: 'seed-sack', color: '#b98d52' },
  { name: P.cloth, kind: 'shawl', color: '#c0643f' },
  { name: P.pouch, kind: 'cloth-pouch', color: '#8a9a6a' },
  { name: P.chaak, kind: 'chaak', color: '#8a5f3c', label: 'spin' },
  { name: P.pot, kind: 'pot', color: '#b9482f' },
  { name: P.ledger, kind: 'book', color: '#6b3a2a' },
];
const carry = (prop, holder, x, y, extra = {}) => ({ prop, x, y, size: 0.85, holder, grasp: { hand: 'both', x: 0, y: -62 }, ...extra });
const hold = (holder, x, y, extra = {}) => ({ prop: P.mill, x, y, size: 0.9, holder, grasp: { hand: 'both', x: 0, y: -58 }, ...extra });

const shots = [];
const mood = [];
const shot = (music, definition) => { mood.push(music); shots.push({ actors: [], props: [], fx: [], sounds: [], ...definition }); };

// ---- the mill comes home -----------------------------------------------------------------------------------
shot('climb', {
  name: '१ · चक्की लेकर घर लौटा', scene: SC.hut, time: 'day', atmosphere: 'village', autoSound: false, transition: 'fade',
  camera: { frame: 'wide', move: 'push' }, vignette: 0.24, fx: ['rays'], fxAmount: 0.7, minDuration: 3.4,
  actors: [
    { character: MADHAV, x: -0.08, y: 0.88, size: 1.0, face: 'right', pose: 'walk', emotion: 'happy', keys: [{ at: 2.6, x: 0.40 }, { at: 3.0, pose: 'idle' }] },
    { character: KAVITA, x: 0.64, y: 0.86, size: 0.96, face: 'left', pose: 'idle', emotion: 'neutral', keys: [{ at: 2.4, emotion: 'surprised' }] },
    { character: MAA, x: 0.82, y: 0.735, size: 0.72, face: 'left', pose: 'idle', stance: 'sit', emotion: 'neutral' },
  ],
  props: [hold(MADHAV, -0.08, 0.88)],
  sounds: [{ kind: 'footstep', at: 0.3, gain: 0.12 }, { kind: 'footstep', at: 0.9, gain: 0.12 }, { kind: 'footstep', at: 1.5, gain: 0.12 }, { kind: 'birds', at: 0.3, gain: 0.12 }],
  dialogue: [say('h1', { at: 0.2 })],
});
shot('humble', {
  name: '२ · परिवार को पूरी बात', scene: SC.hut, time: 'day', atmosphere: 'village', autoSound: false,
  camera: { frame: 'medium', zoom: 1.3, x: 0.5, y: 0.62, move: 'push' }, vignette: 0.24, fx: [], minDuration: 3.2,
  actors: [
    { character: MADHAV, x: 0.40, y: 0.88, size: 1.02, face: 'right', pose: 'talk', emotion: 'happy' },
    { character: KAVITA, x: 0.62, y: 0.86, size: 0.98, face: 'left', pose: 'listen', emotion: 'surprised' },
    { character: MAA, x: 0.82, y: 0.735, size: 0.72, face: 'left', pose: 'attend', stance: 'sit', emotion: 'neutral' },
  ],
  props: [hold(MADHAV, 0.40, 0.88, { size: 0.85 })],
  sounds: [{ kind: 'wind', at: 0.2, gain: 0.14 }],
  dialogue: [say('h2', { at: 0.3 })],
});
shot('plea', {
  name: '३ · यकीन नहीं हुआ', scene: SC.hut, time: 'day', mood: 'worried', atmosphere: 'village', autoSound: false,
  camera: { frame: 'medium', zoom: 1.35, x: 0.55, y: 0.62, move: 'push' }, vignette: 0.28, fx: [], minDuration: 2.6,
  actors: [
    { character: MADHAV, x: 0.38, y: 0.88, size: 1.02, face: 'right', pose: 'offer', emotion: 'neutral' },
    { character: KAVITA, x: 0.62, y: 0.86, size: 0.98, face: 'left', pose: 'shake', emotion: 'worried' },
    { character: MAA, x: 0.82, y: 0.735, size: 0.72, face: 'left', pose: 'shake', stance: 'sit', emotion: 'worried' },
  ],
  props: [hold(MADHAV, 0.38, 0.88, { size: 0.85 })],
  dialogue: [say('h3', { at: 0.3 })],
});
shot('plea', {
  name: '४ · पत्थर का टुकड़ा कैसे पेट भरेगा', scene: SC.hut, time: 'day', mood: 'worried', atmosphere: 'village', autoSound: false,
  camera: { frame: 'medium', zoom: 1.35, x: 0.5, y: 0.62, move: 'push' }, vignette: 0.3, fx: [],
  actors: [
    { character: MADHAV, x: 0.36, y: 0.88, size: 1.02, face: 'right', pose: 'hold', emotion: 'sad' },
    { character: KAVITA, x: 0.62, y: 0.86, size: 0.98, face: 'left', pose: 'point', emotion: 'worried' },
    { character: MAA, x: 0.82, y: 0.735, size: 0.72, face: 'left', pose: 'think', stance: 'sit', emotion: 'worried' },
  ],
  props: [hold(MADHAV, 0.36, 0.88, { size: 0.85 })],
  sounds: [{ kind: 'sad', at: 0.4, gain: 0.2 }],
  dialogue: [say('h4', { at: 0.3 }), say('h5')],
});

// ---- turning the mill ---------------------------------------------------------------------------------------
{
  const t = timing(['h7', 'h8', 'h9'], 0.3);
  shot('wonder', {
    name: '५ · बाईं ओर घुमाकर मांगा', scene: SC.hut, time: 'day', mood: 'happy', atmosphere: 'village', autoSound: false,
    camera: { frame: 'medium', zoom: 1.35, x: 0.5, y: 0.66, move: 'push' }, vignette: 0.26, fx: [],
    actors: [
      { character: MADHAV, x: 0.44, y: 0.9, size: 1.04, face: 'right', pose: 'work', stance: 'crouch', emotion: 'neutral', keys: [{ at: t.h8.start, emotion: 'happy' }] },
      { character: KAVITA, x: 0.24, y: 0.86, size: 0.98, face: 'right', pose: 'attend', emotion: 'worried' },
      { character: MAA, x: 0.82, y: 0.735, size: 0.72, face: 'left', pose: 'attend', stance: 'sit', emotion: 'worried' },
    ],
    props: [{ prop: P.mill, x: 0.60, y: 0.91, size: 1.5 }],
    sounds: [{ kind: 'footstep', at: 0.2, gain: 0.08 }],
    dialogue: [say('h7', { at: 0.3 }), say('h8', { speaker: MADHAV, emotion: 'happy' }), say('h9', { speaker: MADHAV, emotion: 'happy' })],
  });
}
{
  const t = timing(['h10', 'h11'], 0.3);
  shot('wonder', {
    name: '६ · चक्की से गेहूं-चावल', scene: SC.hut, time: 'day', mood: 'surprised', atmosphere: 'village', autoSound: false,
    camera: { frame: 'medium', zoom: 1.3, x: 0.5, y: 0.66, move: 'push' }, vignette: 0.26, fx: ['rays'], fxAmount: 0.8,
    actors: [
      { character: MADHAV, x: 0.44, y: 0.9, size: 1.04, face: 'right', pose: 'work', stance: 'crouch', emotion: 'happy' },
      { character: KAVITA, x: 0.24, y: 0.86, size: 0.98, face: 'right', pose: 'open', emotion: 'surprised' },
      { character: MAA, x: 0.82, y: 0.735, size: 0.72, face: 'left', pose: 'open', stance: 'sit', emotion: 'surprised' },
    ],
    props: [{ prop: P.grain, x: 0.60, y: 0.91, size: 1.5 }],
    sounds: [{ kind: 'twinkle', at: 0.3, gain: 0.3 }, { kind: 'pot', at: t.h11.start + 0.4, gain: 0.16 }, { kind: 'pot', at: t.h11.start + 1.2, gain: 0.16 }, { kind: 'pot', at: t.h11.start + 2.0, gain: 0.16 }],
    dialogue: [say('h10', { at: 0.3 }), say('h11')],
  });
}
{
  const t = timing(['h12', 'h13'], 0.3);
  shot('wonder', {
    name: '७ · दाईं ओर घुमाते ही रुक गई', scene: SC.hut, time: 'day', mood: 'surprised', atmosphere: 'village', autoSound: false,
    camera: { frame: 'medium', zoom: 1.3, x: 0.5, y: 0.66, move: 'push' }, vignette: 0.26, fx: [],
    actors: [
      { character: MADHAV, x: 0.44, y: 0.9, size: 1.04, face: 'right', pose: 'work', stance: 'crouch', emotion: 'happy', keys: [{ at: t.h13.start, pose: 'idle', stance: 'stand', emotion: 'happy' }] },
      { character: KAVITA, x: 0.24, y: 0.86, size: 0.98, face: 'right', pose: 'open', emotion: 'surprised', keys: [{ at: t.h13.start + 0.4, pose: 'cheer', emotion: 'happy' }] },
      { character: MAA, x: 0.82, y: 0.735, size: 0.72, face: 'left', pose: 'open', stance: 'sit', emotion: 'surprised', keys: [{ at: t.h13.start + 0.4, emotion: 'happy' }] },
    ],
    props: [
      { prop: P.grain, x: 0.60, y: 0.91, size: 1.5, end: t.h13.start },
      { prop: P.heap, x: 0.60, y: 0.91, size: 1.5, at: t.h13.start },
    ],
    sounds: [{ kind: 'whoosh', at: t.h13.start, gain: 0.2 }],
    dialogue: [say('h12', { at: 0.3 }), say('h13')],
  });
}

// ---- happiness and care --------------------------------------------------------------------------------------
shot('pastoral', {
  name: '८ · सारे दुख खत्म', scene: SC.hut, time: 'day', mood: 'happy', atmosphere: 'village', autoSound: false,
  camera: { frame: 'wide', move: 'pull' }, vignette: 0.2, fx: ['petals', 'rays'], fxAmount: 0.8, minDuration: 4.2,
  actors: [
    { character: MADHAV, x: 0.34, y: 0.88, size: 1.0, face: 'right', pose: 'cheer', emotion: 'happy' },
    { character: KAVITA, x: 0.56, y: 0.86, size: 0.98, face: 'front', pose: 'laugh', emotion: 'happy' },
    { character: MAA, x: 0.82, y: 0.735, size: 0.72, face: 'left', pose: 'laugh', stance: 'sit', emotion: 'happy' },
  ],
  props: [{ prop: P.sackB, x: 0.14, y: 0.92, size: 1.2 }, { prop: P.sack, x: 0.22, y: 0.94, size: 1.15 }, { prop: P.heap, x: 0.62, y: 0.92, size: 1.2 }],
  sounds: [{ kind: 'birds', at: 0.3, gain: 0.16 }, { kind: 'funny', at: 0.6, gain: 0.2 }],
  dialogue: [say('h14', { at: 0.4 })],
});
shot('kind', {
  name: '९ · मां का इलाज', scene: SC.hut, time: 'day', mood: 'happy', atmosphere: 'village', autoSound: false,
  camera: { frame: 'medium', zoom: 1.3, x: 0.62, y: 0.64, move: 'push' }, vignette: 0.22, fx: [], minDuration: 2.8,
  actors: [
    { character: MAA, x: 0.76, y: 0.735, size: 0.72, face: 'left', pose: 'idle', stance: 'sit', emotion: 'neutral', keys: [{ at: 1.6, emotion: 'happy' }] },
    { character: VAIDYA, x: 0.52, y: 0.87, size: 0.98, face: 'right', pose: 'comfort', emotion: 'neutral' },
    { character: MADHAV, x: 0.32, y: 0.88, size: 1.0, face: 'right', pose: 'attend', emotion: 'worried', keys: [{ at: 1.6, emotion: 'happy' }] },
  ],
  props: [{ prop: P.pouch, x: 0.60, y: 0.92, size: 0.9 }],
  sounds: [{ kind: 'wind', at: 0.2, gain: 0.12 }],
  dialogue: [say('h15', { at: 0.3 })],
});
shot('pastoral', {
  name: '१० · सुंदर घर और कुम्हारी', scene: SC.yard, time: 'day', mood: 'happy', atmosphere: 'village', autoSound: false, transition: 'fade',
  camera: { frame: 'wide', move: 'push' }, vignette: 0.16, fx: ['rays', 'petals'], fxAmount: 0.7, minDuration: 5.4,
  actors: [
    { character: NOW.madhav, x: 0.50, y: 0.80, size: 0.9, face: 'left', pose: 'work', stance: 'sit', emotion: 'happy' },
    { character: NOW.kavita, x: 0.78, y: 0.86, size: 0.92, face: 'left', pose: 'present', emotion: 'happy' },
    { character: NOW.maa, x: 0.16, y: 0.86, size: 0.86, face: 'right', pose: 'idle', emotion: 'happy' },
  ],
  props: [{ prop: P.pot, x: 0.36, y: 0.80, size: 0.8 }],
  sounds: [{ kind: 'birds', at: 0.3, gain: 0.2 }, { kind: 'pot', at: 1.6, gain: 0.2 }, { kind: 'pot', at: 3.2, gain: 0.2 }],
  dialogue: [say('h16', { at: 0.4 })],
});
{
  const t = timing(['h17', 'h18'], 0.3);
  shot('humble', {
    name: '११ · अमीर होकर भी घमंड नहीं', scene: SC.yard, time: 'day', mood: 'neutral', atmosphere: 'village', autoSound: false,
    camera: { frame: 'medium', zoom: 1.5, focus: NOW.madhav, move: 'push' }, vignette: 0.2, fx: ['rays'], fxAmount: 0.6,
    actors: [
      { character: NOW.madhav, x: 0.58, y: 0.88, size: 1.02, face: 'front', pose: 'idle', emotion: 'neutral', keys: [{ at: t.h18.start, pose: 'fold', emotion: 'happy' }] },
      { character: NOW.kavita, x: 0.80, y: 0.88, size: 0.94, face: 'left', pose: 'idle', emotion: 'happy' },
    ],
    sounds: [{ kind: 'birds', at: 0.3, gain: 0.16 }],
    dialogue: [say('h17', { at: 0.3 }), say('h18')],
  });
}

// ---- Madhav's generosity ------------------------------------------------------------------------------------
{
  const t = timing(['h19'], 0.3);
  shot('kind', {
    name: '१२ · गरीबों को अनाज, कपड़े, दवा की जरूरत', scene: SC.evening, time: 'dusk', mood: 'sad', atmosphere: 'night', autoSound: false, transition: 'fade',
    camera: { frame: 'wide', move: 'push' }, vignette: 0.26, fx: ['fireflies'], fxAmount: 0.7, minDuration: 5.0,
    actors: [
      { character: RAMU, x: 0.24, y: 0.9, size: 1.0, face: 'right', pose: 'idle', emotion: 'sad' },
      { character: KAMLI, x: 0.36, y: 0.93, size: 1.0, face: 'right', pose: 'cradle', emotion: 'sad' },
      { character: BIRJU, x: 0.70, y: 0.92, size: 0.9, face: 'left', pose: 'idle', emotion: 'sad' },
      { character: DHANIYA, x: 0.82, y: 0.9, size: 0.98, face: 'left', pose: 'idle', emotion: 'worried' },
    ],
    sounds: [{ kind: 'wind', at: 0.2, gain: 0.14 }, { kind: 'sad', at: 0.6, gain: 0.2 }],
    dialogue: [say('h19', { at: 0.3 })],
  });
}
shot('humble', {
  name: '१३ · चुपचाप मदद', scene: SC.evening, time: 'dusk', mood: 'happy', atmosphere: 'night', autoSound: false,
  camera: { frame: 'medium', zoom: 1.2, x: 0.5, y: 0.7, move: 'push' }, vignette: 0.26, fx: ['fireflies'], fxAmount: 0.7, minDuration: 4.0,
  actors: [
    { character: NOW.madhav, x: 0.36, y: 0.93, size: 1.0, face: 'right', pose: 'pass', emotion: 'happy' },
    { character: RAMU, x: 0.64, y: 0.9, size: 0.96, face: 'left', pose: 'attend', emotion: 'happy', keys: [{ at: 1.6, pose: 'fold' }] },
    { character: KAMLI, x: 0.80, y: 0.93, size: 0.96, face: 'left', pose: 'cradle', emotion: 'happy' },
    { character: DHANIYA, x: 0.16, y: 0.9, size: 0.96, face: 'right', pose: 'present', emotion: 'happy' },
  ],
  props: [
    carry(P.sackB, NOW.madhav, 0.36, 0.93, { size: 0.8 }),
    { prop: P.sack, x: 0.64, y: 0.92, size: 0.8, at: 1.6 },
    { prop: P.cloth, x: 0.80, y: 0.9, size: 0.5, at: 0.4 },
  ],
  sounds: [{ kind: 'twinkle', at: 0.3, gain: 0.14 }],
  dialogue: [say('h20', { at: 0.3 })],
});
shot('pastoral', {
  name: '१४ · पूरे गांव में दरियादिली के चर्चे', scene: SC.evening, time: 'dusk', mood: 'happy', atmosphere: 'night', autoSound: false,
  camera: { frame: 'wide', move: 'pull' }, vignette: 0.24, fx: ['fireflies', 'petals'], fxAmount: 0.8, minDuration: 3.8,
  actors: [
    { character: NOW.madhav, x: 0.48, y: 0.93, size: 1.02, face: 'front', pose: 'fold', emotion: 'happy' },
    { character: RAMU, x: 0.28, y: 0.9, size: 0.96, face: 'right', pose: 'cheer', emotion: 'happy' },
    { character: KAMLI, x: 0.18, y: 0.94, size: 0.96, face: 'right', pose: 'present', emotion: 'happy' },
    { character: BIRJU, x: 0.68, y: 0.94, size: 0.88, face: 'left', pose: 'cheer', emotion: 'happy' },
    { character: DHANIYA, x: 0.80, y: 0.9, size: 0.96, face: 'left', pose: 'present', emotion: 'happy' },
    { character: BHOLA, x: 0.90, y: 0.94, size: 0.94, face: 'left', pose: 'cheer', emotion: 'happy' },
  ],
  sounds: [{ kind: 'bell', at: 0.4, gain: 0.2 }, { kind: 'birds', at: 0.3, gain: 0.1 }],
  dialogue: [say('h21', { at: 0.3 })],
});

// ---- Sohan hears -------------------------------------------------------------------------------------------------
{
  const t = timing(['h22'], 0.3);
  shot('flood', {
    name: '१५ · बड़े भाई सोहन तक खबर', scene: SC.haveli, time: 'day', mood: 'neutral', atmosphere: 'village', autoSound: false, transition: 'fade',
    camera: { frame: 'medium', zoom: 1.3, x: 0.52, y: 0.66, move: 'push' }, vignette: 0.28, fx: [], minDuration: 4.0,
    actors: [
      { character: SOHAN, x: 0.55, y: 0.745, size: 0.88, face: 'left', pose: 'work', stance: 'sit', emotion: 'neutral', keys: [{ at: 2.6, pose: 'listen', emotion: 'surprised' }] },
      { character: MUNIM, x: 0.20, y: 0.88, size: 1.0, face: 'right', pose: 'talk', emotion: 'neutral' },
    ],
    sounds: [{ kind: 'coin', at: 0.5, gain: 0.12 }, { kind: 'coin', at: 1.2, gain: 0.12 }],
    dialogue: [say('h22', { at: 0.3 })],
  });
}
shot('anger', {
  name: '१६ · ईर्ष्या की आग', scene: SC.haveli, time: 'dusk', mood: 'angry', atmosphere: 'village', autoSound: false,
  camera: { frame: 'close', zoom: 1.9, focus: SOHAN, move: 'push' }, vignette: 0.5, fx: ['embers'], fxAmount: 1.3, minDuration: 3.6,
  actors: [{ character: SOHAN, x: 0.55, y: 0.78, size: 0.98, face: 'front', pose: 'fold', emotion: 'angry' }],
  sounds: [{ kind: 'thunder', at: 0.3, gain: 0.4 }, { kind: 'angry', at: 0.9, gain: 0.3 }],
  dialogue: [say('h23', { at: 0.4 })],
});

const story = {
  title: 'जादुई चक्की और दो भाइयों का न्याय · खंड 3', slug: 'jadui-chakki-aur-do-bhai-part-3',
  language: 'hi', ratio: '16:9', captions: true, captionScale: 0.74,
  characters, scenes, props, shots, ...(score ? { score: { file: score, gain: 0.34 } } : {}),
};
writeFileSync(join(here, '..', 'storyboard-part-3.json'), JSON.stringify(story, null, 2), 'utf8');
writeFileSync(join(here, 'music3.json'), JSON.stringify(mood), 'utf8');
console.log(`storyboard-part-3.json · ${shots.length} shots${score ? ' · with score' : ' · no score yet'}`);
