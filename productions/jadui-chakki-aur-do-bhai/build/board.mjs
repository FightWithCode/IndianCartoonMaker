// Build storyboard.json for "जादुई चक्की और दो भाइयों का न्याय" · खंड 1 (पत्थर का दिल और मिट्टी के बर्तन).
//
//   node productions/jadui-chakki-aur-do-bhai/build/board.mjs
//
// Reads build/voices.json (the narrator's clips, from cut.py), build/plates.json (new backdrops,
// from plates.py) and build/score.json (the music, from score.py). There are no titles or name tags:
// the film shows only burned-in captions, the animation, effects and sound.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = file => JSON.parse(readFileSync(join(here, file), 'utf8'));
const voices = read('voices.json');
const plates = read('plates.json');
const score = (() => { try { return read('score.json').id; } catch { return undefined; } })();

// ------------------------------------------------------------------------------- narration
// One narrator reads everything. Narration stays the narrator's; but where the story quotes a character
// (Madhav's plea, Sohan's refusal) the line is given to that character, so the mouth moves with it.
const V = Object.fromEntries(voices.map(v => [v.key, v]));
const dur = key => V[key].duration - 0.08;
const say = (key, extra = {}) => ({ speaker: 'कथावाचक', text: V[key].caption, audio: V[key].audio, ...extra });
/** When each clip starts inside its shot, mirroring how the studio places consecutive lines. */
function timing(keys, first = 0.3) {
  const out = {};
  let cursor = first;
  for (const key of keys) {
    out[key] = { start: cursor, end: cursor + dur(key) };
    cursor = out[key].end + 0.22;
  }
  return out;
}

// ------------------------------------------------------------------------------------ cast
const SOHAN = 'सोहन';
const MADHAV = 'माधव';
const KAVITA = 'कविता';
const MAA = 'बूढ़ी मां';
const BUYER = 'बाज़ार का ग्राहक';
const MUNIM = 'मुनीम जी';
const DARBAN = 'दरबान';
const BHEEMA = 'पहलवान भीमा';
const BHOLA = 'भोला';
const RAMU = 'रामू काका';
const KAMLI = 'कमली';

const leads = [
  // The rich elder brother: stout, gold chain and bangles and rings, a jewelled turban, a silk shawl, gold-trimmed kurta.
  { name: SOHAN, gender: 'male', age: 'adult', build: 'stout', costume: 'kurta', hair: 'turban', skin: '#b07a55', primary: '#7b2d3b', accent: '#e3b64f',
    trim: '#e8c25a', shawl: '#c99a2e', jewelry: 'gold', moustache: true, voiceStyle: 'male, middle-aged, low pitch' },
  // The poor younger brother: thin, faded patched dhoti, clay on his clothes, bare feet.
  { name: MADHAV, gender: 'male', age: 'adult', build: 'slim', costume: 'dhoti', hair: 'crop', skin: '#a8694a', primary: '#b8ad90', accent: '#a2593e',
    patches: true, mud: true, barefoot: true, moustache: false, voiceStyle: 'male, young adult, moderate pitch' },
  { name: KAVITA, gender: 'female', age: 'adult', build: 'slim', costume: 'sari', hair: 'bun', skin: '#b06f4d', primary: '#6f8e88', accent: '#b89a58',
    patches: true, jewelry: 'simple', barefoot: true, voiceStyle: 'female, young adult, moderate pitch' },
  { name: MAA, gender: 'female', age: 'elder', build: 'slim', costume: 'sari', hair: 'grey', skin: '#a56a4c', primary: '#d9d4c6', accent: '#9a968b',
    patches: true, barefoot: true, voiceStyle: 'female, elderly, low pitch' },
  { name: BUYER, gender: 'male', age: 'adult', costume: 'shirt', hair: 'part', skin: '#b98057', primary: '#4f7a8a', accent: '#d9c08a',
    moustache: true, voiceStyle: 'male, middle-aged, moderate pitch' },
];
// Distinct supporting characters, shared with later stories (see productions/_cast).
const roster = JSON.parse(readFileSync(join(here, '..', '..', '_cast', 'naukars.json'), 'utf8')).map(({ role, ...rest }) => rest);
// रामू काका is no longer in the shared cast; these two films keep their own copy so they rebuild unchanged.
const ramuLocal = {"name": "रामू काका", "gender": "male", "age": "elder", "build": "slim", "costume": "dhoti", "hair": "grey", "skin": "#a5714e", "primary": "#e3dccb", "accent": "#9a6a48", "shawl": "#9a8c70", "beard": "white", "tilak": "red", "barefoot": true, "moustache": true, "voiceStyle": "male, elderly, low pitch"};
const characters = [...leads, ...roster, ramuLocal];

// ----------------------------------------------------------------------------------- scenes
const scene = (name, kind, image, ambience) => ({ name, kind, image, ambience, bakedLight: true });
const SC = {
  field: 'जादुई चक्की · हरा-भरा चंदनपुर', haveli: 'जादुई चक्की · सोहन की हवेली', godown: 'जादुई चक्की · अनाज का गोदाम',
  hut: 'जादुई चक्की · माधव की झोपड़ी', market: 'जादुई चक्की · हाट', flood: 'जादुई चक्की · बाढ़ का गांव',
  hutRain: 'जादुई चक्की · बारिश में झोपड़ी', kitchen: 'जादुई चक्की · ठंडी रसोई', room: 'जादुई चक्की · बीमार मां का कमरा',
  lane: 'जादुई चक्की · हवेली की ओर जाती गली',
};
const scenes = [
  scene(SC.field, 'field', '9ba90100b32f22d0064aa9c2563850ad.jpg', 'village'),
  scene(SC.haveli, 'home', plates.haveli, 'village'),
  scene(SC.godown, 'shop', '49b267c0ab1bee4ce4b7718b163df989.jpg', 'village'),
  scene(SC.hut, 'home', plates.jhopdi, 'village'),
  scene(SC.market, 'chowk', '2c9a72bb2235a80988c1c59dd7f052a6.jpg', 'market'),
  scene(SC.flood, 'chowk', plates.flood, 'rain'),
  scene(SC.hutRain, 'home', plates['hut-rain'], 'rain'),
  scene(SC.kitchen, 'home', plates['kitchen-cold'], 'room'),
  scene(SC.room, 'home', plates['room-sick'], 'room'),
  scene(SC.lane, 'chowk', '213ee03fc6767e7d0e81ffc265052a7d.jpg', 'village'),
];

// ------------------------------------------------------------------------------------ props
const P = {
  chaak: 'जादुई चक्की · माधव का चाक', potRaw: 'जादुई चक्की · कच्चा बर्तन', potRed: 'जादुई चक्की · पका लाल घड़ा',
  coins: 'जादुई चक्की · सोने के सिक्कों का ढेर', coin: 'जादुई चक्की · सोने का सिक्का',
  chestOpen: 'जादुई चक्की · खुली तिजोरी', chestShut: 'जादुई चक्की · बंद तिजोरी',
  sack: 'जादुई चक्की · अनाज की बोरी', sackB: 'जादुई चक्की · भरी बोरी', basket: 'जादुई चक्की · खाली टोकरी',
  ledger: 'जादुई चक्की · मुनीम की बही', quilt: 'जादुई चक्की · पैबंद की रज़ाई', pillow: 'जादुई चक्की · तकिया',
};
const props = [
  { name: P.chaak, kind: 'chaak', color: '#8a5f3c', label: 'clay spin' },
  { name: P.potRaw, kind: 'pot', color: '#9a7d5e' },
  { name: P.potRed, kind: 'pot', color: '#b9482f' },
  { name: P.coins, kind: 'coin-pile', color: '#d9a93a' },
  { name: P.coin, kind: 'coin', color: '#d9a93a' },
  { name: P.chestOpen, kind: 'chest', color: '#6b4a33', label: 'open' },
  { name: P.chestShut, kind: 'chest', color: '#6b4a33' },
  { name: P.sack, kind: 'seed-sack', color: '#c9a15f' },
  { name: P.sackB, kind: 'seed-sack', color: '#b98d52' },
  { name: P.basket, kind: 'basket', color: '#a8794a' },
  { name: P.ledger, kind: 'book', color: '#6b3a2a' },
  { name: P.quilt, kind: 'quilt', color: '#a8573d' },
  { name: P.pillow, kind: 'pillow', color: '#e6dcc4' },
];

// Stacks of grain sacks at both sides of the godown door.
const sackStacks = [
  ...[0.05, 0.14, 0.23].map(x => ({ prop: P.sack, x, y: 0.91, size: 1.25 })),
  ...[0.095, 0.185].map(x => ({ prop: P.sackB, x, y: 0.79, size: 1.25 })),
  { prop: P.sack, x: 0.14, y: 0.67, size: 1.25 },
  ...[0.95, 0.86, 0.77].map(x => ({ prop: P.sackB, x, y: 0.91, size: 1.25 })),
  ...[0.905, 0.815].map(x => ({ prop: P.sack, x, y: 0.79, size: 1.25 })),
  { prop: P.sackB, x: 0.86, y: 0.67, size: 1.25 },
];
const carry = (prop, holder, x, y) => ({ prop, x, y, size: 0.9, holder, grasp: { hand: 'both', x: 0, y: -70 } });

// ------------------------------------------------------------------------------------ shots
const shots = [];
const mood = [];                                    // music mood per shot, read by score.py
const shot = (music, definition) => { mood.push(music); shots.push({ actors: [], props: [], fx: [], sounds: [], ...definition }); };

// ---- the two brothers, in turn -----------------------------------------------------------------
shot('pastoral', {
  name: '१ · हरा-भरा चंदनपुर', scene: SC.field, time: 'day', atmosphere: 'village', autoSound: false, transition: 'fade',
  camera: { frame: 'wide', move: 'push' }, vignette: 0.14, fx: ['rays', 'dust'], fxAmount: 0.8, minDuration: 5.6,
  sounds: [{ kind: 'birds', at: 0.4, gain: 0.16 }, { kind: 'wind', at: 0.2, gain: 0.18 }],
  dialogue: [say('a1', { at: 0.7 })],
});
shot('wealth', {
  name: '२ · बड़ा भाई सोहन · हवेली, नौकर, गहने', scene: SC.haveli, time: 'day', atmosphere: 'village', autoSound: false,
  camera: { frame: 'medium', zoom: 1.4, focus: SOHAN, move: 'push' }, vignette: 0.16, fx: ['glitter', 'glow', 'rays'], fxAmount: 1.5, minDuration: 3.2,
  actors: [
    { character: SOHAN, x: 0.50, y: 0.86, size: 1.1, face: 'front', pose: 'present', emotion: 'happy' },
    { character: DARBAN, x: 0.22, y: 0.79, size: 0.88, face: 'right', pose: 'idle', emotion: 'neutral' },
    { character: MUNIM, x: 0.78, y: 0.80, size: 0.92, face: 'left', pose: 'read', emotion: 'neutral' },
    { character: BHOLA, x: 0.66, y: 0.88, size: 0.9, face: 'left', pose: 'attend', emotion: 'neutral' },
  ],
  props: [{ prop: P.ledger, x: 0.78, y: 0.80, size: 0.9, holder: MUNIM }],
  sounds: [{ kind: 'twinkle', at: 0.2, gain: 0.3 }, { kind: 'coin', at: 0.9, gain: 0.24 }, { kind: 'birds', at: 0.3, gain: 0.1 }],
  dialogue: [say('a2', { at: 0.3 })],
});
shot('humble', {
  name: '३ · छोटा भाई माधव · फटा-पुराना, झोपड़ी', scene: SC.hut, time: 'day', atmosphere: 'village', autoSound: false,
  camera: { frame: 'medium', zoom: 1.35, focus: MADHAV, move: 'push' }, vignette: 0.24, fx: ['dust'], fxAmount: 0.6, minDuration: 3.4,
  actors: [{ character: MADHAV, x: 0.50, y: 0.87, size: 1.0, face: 'front', pose: 'idle', emotion: 'sad' }],
  props: [{ prop: P.potRaw, x: 0.28, y: 0.90, size: 1.1 }],
  sounds: [{ kind: 'wind', at: 0.2, gain: 0.2 }],
  dialogue: [say('a3', { at: 0.4 })],
});
shot('wealth', {
  name: '४ · सबसे बड़ा अनाज व्यापारी', scene: SC.godown, time: 'day', atmosphere: 'village', autoSound: true,
  camera: { frame: 'wide', move: 'push' }, vignette: 0.16, fx: ['dust', 'rays', 'glitter'], fxAmount: 0.7,
  actors: [
    { character: SOHAN, x: 0.50, y: 0.88, size: 1.08, face: 'front', pose: 'fold', emotion: 'happy' },
    { character: MUNIM, x: 0.31, y: 0.86, size: 0.94, face: 'right', pose: 'read', emotion: 'neutral' },
    { character: BHOLA, x: 0.84, y: 0.87, size: 0.94, face: 'left', pose: 'walk', emotion: 'neutral', keys: [{ at: 3.2, x: 0.66 }] },
  ],
  props: [...sackStacks, { prop: P.ledger, x: 0.31, y: 0.86, size: 0.9, holder: MUNIM }, carry(P.sack, BHOLA, 0.84, 0.87)],
  sounds: [{ kind: 'twinkle', at: 1.0, gain: 0.22 }],
  dialogue: [say('a4', { at: 0.4 })],
});
shot('wealth', {
  name: '५ · आलीशान हवेली', scene: SC.haveli, time: 'day', atmosphere: 'village', autoSound: false,
  camera: { frame: 'wide', move: 'pull' }, vignette: 0.16, fx: ['glow', 'glitter', 'rays'], fxAmount: 1.5, minDuration: 3.8,
  actors: [
    { character: SOHAN, x: 0.50, y: 0.80, size: 0.82, face: 'front', pose: 'present', emotion: 'happy' },
    { character: DARBAN, x: 0.30, y: 0.76, size: 0.72, face: 'right', pose: 'idle', emotion: 'neutral' },
    { character: BHEEMA, x: 0.70, y: 0.76, size: 0.74, face: 'left', pose: 'fold', emotion: 'neutral' },
    { character: KAMLI, x: 0.40, y: 0.88, size: 0.82, face: 'right', pose: 'idle', emotion: 'neutral' },
  ],
  sounds: [{ kind: 'twinkle', at: 0.4, gain: 0.3 }, { kind: 'bell', at: 1.4, gain: 0.2 }, { kind: 'birds', at: 0.3, gain: 0.1 }],
  dialogue: [say('a5', { at: 0.4 })],
});
shot('wealth', {
  name: '६ · नौकर-चाकर और गोदाम', scene: SC.godown, time: 'day', atmosphere: 'village', autoSound: true,
  camera: { frame: 'wide', move: 'pan-right' }, vignette: 0.16, fx: ['dust', 'rays'], fxAmount: 0.8,
  actors: [
    { character: BHEEMA, x: 0.50, y: 0.88, size: 1.06, face: 'front', pose: 'fold', emotion: 'neutral' },
    { character: BHOLA, x: 0.14, y: 0.87, size: 0.94, face: 'right', pose: 'walk', emotion: 'neutral', keys: [{ at: 3.6, x: 0.38 }] },
    { character: RAMU, x: 0.88, y: 0.87, size: 0.96, face: 'left', pose: 'walk', emotion: 'neutral', keys: [{ at: 3.6, x: 0.62 }] },
  ],
  props: [...sackStacks, carry(P.sack, BHOLA, 0.14, 0.87), carry(P.sackB, RAMU, 0.88, 0.87)],
  dialogue: [say('a6', { at: 0.4 })],
});

// ---- the potter's family, in their hut --------------------------------------------------------
shot('humble', {
  name: '७ · कुम्हार माधव', scene: SC.hut, time: 'day', atmosphere: 'village', autoSound: false,
  camera: { frame: 'medium', zoom: 1.2, x: 0.48, y: 0.55, move: 'push' }, vignette: 0.24, fx: ['dust'], fxAmount: 0.6,
  actors: [{ character: MADHAV, x: 0.55, y: 0.87, size: 1.0, face: 'left', pose: 'work', stance: 'sit', emotion: 'neutral' }],
  props: [{ prop: P.chaak, x: 0.41, y: 0.89, size: 1.9 }, { prop: P.potRaw, x: 0.15, y: 0.91, size: 1.1 }, { prop: P.potRaw, x: 0.23, y: 0.94, size: 0.95 }],
  sounds: [{ kind: 'wind', at: 0.2, gain: 0.18 }],
  dialogue: [say('a7', { at: 0.4 })],
});
shot('humble', {
  name: '८ · पत्नी कविता', scene: SC.hut, time: 'day', atmosphere: 'village', autoSound: false,
  camera: { frame: 'medium', zoom: 1.35, focus: KAVITA, move: 'push' }, vignette: 0.24, fx: ['dust'], fxAmount: 0.6, minDuration: 3.0,
  actors: [
    { character: KAVITA, x: 0.60, y: 0.87, size: 1.0, face: 'left', pose: 'work', stance: 'sit', emotion: 'happy' },
    { character: MADHAV, x: 0.34, y: 0.88, size: 0.98, face: 'right', pose: 'work', stance: 'sit', emotion: 'neutral' },
  ],
  props: [{ prop: P.chaak, x: 0.44, y: 0.90, size: 1.6 }, { prop: P.potRaw, x: 0.72, y: 0.91, size: 1.0 }],
  sounds: [{ kind: 'birds', at: 0.4, gain: 0.1 }],
  dialogue: [say('a8', { at: 0.4 })],
});
shot('humble', {
  name: '९ · झोपड़ी में तीन लोग', scene: SC.hut, time: 'day', atmosphere: 'village', autoSound: false,
  camera: { frame: 'wide', move: 'pull' }, vignette: 0.24, fx: ['dust', 'rays'], fxAmount: 0.6,
  actors: [
    { character: MADHAV, x: 0.30, y: 0.88, size: 1.0, face: 'right', pose: 'idle', emotion: 'neutral' },
    { character: KAVITA, x: 0.55, y: 0.84, size: 0.94, face: 'front', pose: 'idle', emotion: 'happy' },
    { character: MAA, x: 0.80, y: 0.735, size: 0.72, face: 'left', pose: 'idle', stance: 'sit', emotion: 'neutral' },
  ],
  props: [{ prop: P.chaak, x: 0.14, y: 0.92, size: 1.3 }],
  sounds: [{ kind: 'wind', at: 0.2, gain: 0.16 }, { kind: 'birds', at: 0.6, gain: 0.1 }],
  dialogue: [say('a9', { at: 0.5 })],
});

// ---- work, flood and hunger --------------------------------------------------------------------
shot('humble', {
  name: '१० · दिन भर चाक पर', scene: SC.hut, time: 'day', atmosphere: 'village', autoSound: false,
  camera: { frame: 'medium', zoom: 1.25, x: 0.48, y: 0.58, move: 'push' }, vignette: 0.24, fx: ['dust'], fxAmount: 0.7,
  actors: [{ character: MADHAV, x: 0.55, y: 0.87, size: 1.02, face: 'left', pose: 'work', stance: 'sit', emotion: 'happy' }],
  props: [
    { prop: P.chaak, x: 0.41, y: 0.89, size: 1.9 },
    { prop: P.potRaw, x: 0.14, y: 0.91, size: 1.15, at: 0.9 }, { prop: P.potRaw, x: 0.22, y: 0.94, size: 1.0, at: 1.8 },
    { prop: P.potRaw, x: 0.30, y: 0.92, size: 1.1, at: 2.6 },
  ],
  sounds: [{ kind: 'pot', at: 0.9, gain: 0.26 }, { kind: 'pot', at: 1.8, gain: 0.26 }, { kind: 'pot', at: 2.6, gain: 0.26 }, { kind: 'birds', at: 0.4, gain: 0.1 }],
  dialogue: [say('b1', { at: 0.4 })],
});
shot('humble', {
  name: '११ · बाज़ार में बर्तन', scene: SC.market, time: 'day', atmosphere: 'quiet', autoSound: false,
  camera: { frame: 'medium', move: 'static' }, vignette: 0.14, fx: ['dust'], fxAmount: 0.5,
  actors: [
    { character: MADHAV, x: 0.42, y: 0.86, size: 1.0, face: 'right', pose: 'idle', stance: 'sit', emotion: 'happy' },
    { character: BUYER, x: 0.64, y: 0.86, size: 1.02, face: 'left', pose: 'offer', emotion: 'happy', keys: [{ at: 2.2, pose: 'nod' }] },
  ],
  props: [
    { prop: P.potRed, x: 0.30, y: 0.90, size: 1.2 }, { prop: P.potRed, x: 0.36, y: 0.94, size: 1.0 }, { prop: P.potRed, x: 0.50, y: 0.93, size: 1.05 },
    { prop: P.coin, x: 0.60, y: 0.86, size: 1.4, holder: BUYER, at: 0, end: 2.0 },
  ],
  sounds: [{ kind: 'coin', at: 2.1, gain: 0.3 }, { kind: 'pot', at: 1.2, gain: 0.2 }],
  dialogue: [say('b2', { at: 0.4 })],
});
shot('flood', {
  name: '१२ · भयंकर बाढ़', scene: SC.flood, time: 'dusk', weather: 'rain', mood: 'worried', atmosphere: 'rain', autoSound: false,
  camera: { frame: 'wide', move: 'push' }, vignette: 0.36, minDuration: 4.4,
  sounds: [{ kind: 'thunder', at: 0.5, gain: 0.5 }, { kind: 'water', at: 1.8, gain: 0.3 }],
  dialogue: [say('b3', { at: 0.8 })],
});
{
  const t = timing(['b4', 'b5'], 0.5);
  const sink = (y, begin) => [{ at: begin, alpha: 1 }, { at: begin + 1.4, y: y + 0.018, size: 0.7, alpha: 0 }];
  shot('flood', {
    name: '१३ · बारिश और गलते बर्तन', scene: SC.hutRain, time: 'dusk', weather: 'rain', mood: 'worried', atmosphere: 'rain', autoSound: false,
    camera: { frame: 'medium', zoom: 1.15, x: 0.5, y: 0.58, move: 'static' }, vignette: 0.3,
    actors: [
      { character: MADHAV, x: 0.58, y: 0.87, size: 1.0, face: 'left', pose: 'look', emotion: 'worried',
        keys: [{ at: t.b5.start + 0.5, pose: 'idle', emotion: 'sad' }] },
      { character: KAVITA, x: 0.74, y: 0.86, size: 0.98, face: 'left', pose: 'idle', emotion: 'worried' },
    ],
    props: [
      { prop: P.potRaw, x: 0.18, y: 0.91, size: 1.2, keys: sink(0.91, t.b5.start + 0.6) },
      { prop: P.potRaw, x: 0.28, y: 0.94, size: 1.05, keys: sink(0.94, t.b5.start + 1.0) },
      { prop: P.potRaw, x: 0.38, y: 0.92, size: 1.15, keys: sink(0.92, t.b5.start + 1.4) },
    ],
    sounds: [{ kind: 'thunder', at: t.b5.start + 0.2, gain: 0.4 }, { kind: 'water', at: t.b5.start + 0.8, gain: 0.3 }, { kind: 'water', at: t.b5.start + 1.6, gain: 0.26 }],
    dialogue: [say('b4', { at: 0.5 }), say('b5')],
  });
}
shot('cold', {
  name: '१४ · ठंडा चूल्हा', scene: SC.kitchen, time: 'night', mood: 'sad', atmosphere: 'quiet', autoSound: false,
  camera: { frame: 'medium', move: 'push' }, vignette: 0.3, minDuration: 3.6,
  actors: [{ character: KAVITA, x: 0.44, y: 0.86, size: 1.0, face: 'right', pose: 'idle', stance: 'sit', emotion: 'sad' }],
  props: [{ prop: P.basket, x: 0.62, y: 0.90, size: 1.0 }],
  sounds: [{ kind: 'sad', at: 0.3, gain: 0.26 }, { kind: 'wind', at: 0.2, gain: 0.2 }],
  dialogue: [say('b6', { at: 0.5 })],
});
shot('cold', {
  name: '१५ · बीमार मां बिस्तर पर', scene: SC.room, time: 'night', mood: 'sad', atmosphere: 'quiet', autoSound: false,
  camera: { frame: 'medium', zoom: 1.15, x: 0.34, y: 0.56, move: 'push' }, vignette: 0.32, minDuration: 4.4,
  actors: [
    { character: MAA, x: 0.27, y: 0.66, size: 0.72, face: 'right', pose: 'doze', stance: 'lie', emotion: 'sad' },
    { character: KAVITA, x: 0.46, y: 0.88, size: 1.0, face: 'left', pose: 'comfort', emotion: 'worried' },
    { character: MADHAV, x: 0.66, y: 0.88, size: 1.0, face: 'left', pose: 'think', emotion: 'worried' },
  ],
  props: [
    { prop: P.pillow, x: 0.065, y: 0.605, size: 0.9, depth: 0.60 },
    { prop: P.quilt, x: 0.20, y: 0.615, size: 0.92, depth: 0.69 },
  ],
  sounds: [{ kind: 'wind', at: 0.2, gain: 0.2 }],
  dialogue: [say('b7', { at: 0.5 })],
});

// ---- the plea to Sohan ---------------------------------------------------------------------------
shot('walk', {
  name: '१६ · हवेली की ओर', scene: SC.lane, time: 'day', atmosphere: 'village', autoSound: true,
  camera: { frame: 'wide', move: 'pan-right' }, vignette: 0.22, fx: ['dust'], fxAmount: 0.6, minDuration: 4.6,
  actors: [{ character: MADHAV, x: 0.06, y: 0.87, size: 1.0, face: 'right', pose: 'walk', emotion: 'sad', keys: [{ at: 4.2, x: 0.88 }] }],
  dialogue: [say('c1', { at: 0.4 })],
});
{
  const coinsAt = Array.from({ length: 8 }, (_, i) => ({ kind: 'coin', at: 0.7 + i * 0.6, gain: 0.2 }));
  shot('wealth', {
    name: '१७ · सोने के सिक्के गिनता सोहन', scene: SC.haveli, time: 'day', atmosphere: 'village', autoSound: false,
    camera: { frame: 'medium', zoom: 1.3, x: 0.5, y: 0.62, move: 'push' }, vignette: 0.2, fx: ['glow', 'glitter', 'dust'], fxAmount: 1.4,
    actors: [
      { character: SOHAN, x: 0.45, y: 0.745, size: 0.88, face: 'right', pose: 'work', stance: 'sit', emotion: 'happy' },
      { character: DARBAN, x: 0.20, y: 0.78, size: 0.8, face: 'right', pose: 'idle', emotion: 'neutral' },
    ],
    props: [{ prop: P.coins, x: 0.56, y: 0.765, size: 0.95 }, { prop: P.coin, x: 0.36, y: 0.78, size: 1.1 }],
    sounds: [{ kind: 'twinkle', at: 0.5, gain: 0.28 }, ...coinsAt],
    dialogue: [say('c2', { at: 0.4 })],
  });
}
{
  const t = timing(['c3', 'c4'], 0.4);
  shot('plea', {
    name: '१८ · हाथ जोड़कर', scene: SC.haveli, time: 'day', mood: 'neutral', atmosphere: 'village', autoSound: true,
    camera: { frame: 'medium', zoom: 1.3, x: 0.46, y: 0.64, move: 'push' }, vignette: 0.24, fx: ['glitter'], fxAmount: 0.5,
    actors: [
      { character: SOHAN, x: 0.55, y: 0.745, size: 0.88, face: 'left', pose: 'work', stance: 'sit', emotion: 'neutral' },
      { character: MADHAV, x: 0.10, y: 0.90, size: 1.05, face: 'right', pose: 'walk', emotion: 'sad',
        keys: [{ at: t.c3.end, x: 0.30, y: 0.90, pose: 'fold' }] },
    ],
    props: [{ prop: P.coins, x: 0.45, y: 0.765, size: 0.95 }],
    sounds: [{ kind: 'coin', at: 0.6, gain: 0.16 }],
    dialogue: [say('c3', { at: 0.4 }), say('c4', { speaker: MADHAV, emotion: 'sad' })],
  });
}
{
  const t = timing(['c5', 'c6', 'c7'], 0.3);
  shot('plea', {
    name: '१९ · मां बीमार है, एक बोरी गेहूं', scene: SC.haveli, time: 'day', mood: 'neutral', atmosphere: 'village', autoSound: false,
    camera: { frame: 'medium', zoom: 1.3, x: 0.46, y: 0.64, move: 'push' }, vignette: 0.26,
    actors: [
      { character: SOHAN, x: 0.55, y: 0.745, size: 0.88, face: 'left', pose: 'work', stance: 'sit', emotion: 'neutral',
        keys: [{ at: t.c6.start, pose: 'idle', emotion: 'angry' }] },
      { character: MADHAV, x: 0.30, y: 0.90, size: 1.05, face: 'right', pose: 'open', emotion: 'sad',
        keys: [{ at: t.c6.start, pose: 'offer' }, { at: t.c7.start, pose: 'nod', emotion: 'worried' }] },
    ],
    props: [{ prop: P.coins, x: 0.45, y: 0.765, size: 0.95 }],
    dialogue: [say('c5', { speaker: MADHAV, at: 0.3, emotion: 'sad' }), say('c6', { speaker: MADHAV, emotion: 'sad' }), say('c7', { speaker: MADHAV, emotion: 'worried' })],
  });
}
{
  const T = 2.9;                                        // the instant the strongbox slams shut
  shot('anger', {
    name: '२० · तिजोरी का दरवाजा', scene: SC.haveli, time: 'day', mood: 'neutral', atmosphere: 'village', autoSound: false,
    camera: { frame: 'medium', zoom: 1.4, x: 0.5, y: 0.66, move: 'push' }, vignette: 0.3,
    actors: [
      { character: SOHAN, x: 0.58, y: 0.76, size: 0.92, face: 'left', pose: 'work', stance: 'sit', emotion: 'neutral',
        keys: [{ at: T - 1.2, stance: 'stand', pose: 'reach', emotion: 'angry' }, { at: T + 0.1, pose: 'point', emotion: 'angry' }] },
      { character: MADHAV, x: 0.30, y: 0.90, size: 1.05, face: 'right', pose: 'fold', emotion: 'sad' },
    ],
    props: [
      { prop: P.coins, x: 0.47, y: 0.78, size: 0.95 },
      { prop: P.chestOpen, x: 0.76, y: 0.78, size: 0.75, end: T },
      { prop: P.chestShut, x: 0.76, y: 0.78, size: 0.75, at: T },
    ],
    sounds: [{ kind: 'door', at: T, gain: 0.6 }, { kind: 'angry', at: T + 0.15, gain: 0.3 }],
    dialogue: [say('c8', { at: 0.3 })],
  });
}
{
  const t = timing(['c9', 'c10', 'c11', 'c12', 'c13'], 0.4);
  const angry = key => say(key, { speaker: SOHAN, emotion: 'angry' });
  shot('anger', {
    name: '२१ · निकल जा यहां से', scene: SC.haveli, time: 'day', mood: 'neutral', atmosphere: 'village', autoSound: false,
    camera: { frame: 'medium', zoom: 1.5, focus: SOHAN, move: 'push' }, vignette: 0.36,
    actors: [
      { character: SOHAN, x: 0.58, y: 0.78, size: 0.98, face: 'left', pose: 'point', emotion: 'angry',
        keys: [{ at: t.c11.start, pose: 'open' }, { at: t.c12.start, pose: 'point' }, { at: t.c13.start, pose: 'present' }] },
      { character: MADHAV, x: 0.32, y: 0.90, size: 1.05, face: 'right', pose: 'fold', emotion: 'sad',
        keys: [{ at: t.c12.start, pose: 'flinch' }, { at: t.c13.start, pose: 'idle', emotion: 'sad' }] },
    ],
    props: [{ prop: P.coins, x: 0.47, y: 0.80, size: 0.95 }, { prop: P.chestShut, x: 0.78, y: 0.80, size: 0.75 }],
    sounds: [{ kind: 'thunder', at: t.c12.start, gain: 0.36 }],
    dialogue: [say('c9', { speaker: SOHAN, at: 0.4, emotion: 'angry' }), angry('c10'), angry('c11'), angry('c12'), angry('c13')],
  });
}
shot('sad', {
  name: '२२ · आंखों में आंसू', scene: SC.haveli, time: 'day', mood: 'neutral', atmosphere: 'quiet', autoSound: false,
  camera: { frame: 'medium', zoom: 1.6, focus: MADHAV, move: 'push' }, vignette: 0.42, minDuration: 3.2,
  actors: [
    { character: MADHAV, x: 0.34, y: 0.90, size: 1.05, face: 'right', pose: 'idle', emotion: 'sad' },
    { character: SOHAN, x: 0.62, y: 0.78, size: 0.95, face: 'left', pose: 'fold', emotion: 'angry' },
  ],
  props: [{ prop: P.coins, x: 0.50, y: 0.80, size: 0.95 }],
  sounds: [{ kind: 'sad', at: 0.4, gain: 0.3 }, { kind: 'wind', at: 0.1, gain: 0.2 }],
  dialogue: [say('c14', { at: 0.5 })],
});
shot('sad', {
  name: '२३ · चुपचाप लौट गया', scene: SC.haveli, time: 'dusk', mood: 'neutral', atmosphere: 'quiet', autoSound: true, transition: 'fade',
  camera: { frame: 'wide', move: 'pull' }, vignette: 0.4, minDuration: 7.0,
  actors: [
    { character: MADHAV, x: 0.40, y: 0.90, size: 1.0, face: 'left', pose: 'walk', emotion: 'sad', keys: [{ at: 5.6, x: -0.12 }] },
    { character: SOHAN, x: 0.62, y: 0.78, size: 0.9, face: 'left', pose: 'fold', emotion: 'neutral' },
  ],
  props: [{ prop: P.coins, x: 0.50, y: 0.80, size: 0.95 }],
  sounds: [{ kind: 'wind', at: 0.2, gain: 0.26 }],
  dialogue: [say('c15', { at: 0.6 })],
});

// ---------------------------------------------------------------------------------- output
const story = {
  title: 'जादुई चक्की और दो भाइयों का न्याय · खंड 1', slug: 'jadui-chakki-aur-do-bhai-part-1',
  language: 'hi', ratio: '16:9', captions: true, captionScale: 0.74,
  characters, scenes, props, shots, ...(score ? { score: { file: score, gain: 0.34 } } : {}),
};
writeFileSync(join(here, '..', 'storyboard.json'), JSON.stringify(story, null, 2), 'utf8');
writeFileSync(join(here, 'music.json'), JSON.stringify(mood), 'utf8');
console.log(`storyboard.json · ${shots.length} shots${score ? ' · with score' : ' · no score yet'}`);
