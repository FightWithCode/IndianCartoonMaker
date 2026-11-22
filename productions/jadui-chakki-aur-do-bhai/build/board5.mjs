// Build storyboard-part-5.json for "जादुई चक्की और दो भाइयों का न्याय" · खंड 5 (असली दौलत की पहचान).
//
//   node productions/jadui-chakki-aur-do-bhai/build/board5.mjs
//
// Reads build/voices.json (clips j1..j28 are Part 7.mp3), build/plates.json and build/score5.json.
// Backdrops come from build/plates.py: the cracked and broken-open haveli at night, the moonlit lane and
// house, the painted hall (with the engine's gold heap), the haveli on a sunny morning with its doors
// open, and the mountain cave with a stone pedestal.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = file => JSON.parse(readFileSync(join(here, file), 'utf8'));
const voices = read('voices.json');
const plates = read('plates.json');
const score = (() => { try { return read('score5.json').id; } catch { return undefined; } })();

const V = Object.fromEntries(voices.map(v => [v.key, v]));
const dur = key => V[key].duration - 0.08;
const say = (key, extra = {}) => ({ speaker: 'कथावाचक', text: V[key].caption, audio: V[key].audio, ...extra });
function timing(keys, first = 0.3) {
  const out = {};
  let cursor = first;
  for (const key of keys) { out[key] = { start: cursor, end: cursor + dur(key) }; cursor = out[key].end + 0.22; }
  return out;
}
const span = (t, keys) => t[keys.at(-1)].end + 0.4;

// ------------------------------------------------------------------------------------ cast
const MADHAV = 'माधव (खुशहाल)';
const KAVITA = 'कविता (खुशहाल)';
const MAA = 'बूढ़ी मां (स्वस्थ)';
const SOHAN = 'सोहन (धूल में सना)';
const SOHAN_BARE = 'सोहन (बिना पगड़ी)';
const SOHAN_SIMPLE = 'सोहन (सादा)';
const RAMU = 'रामू काका', BHOLA = 'भोला', KAMLI = 'कमली', DHANIYA = 'धनिया', BIRJU = 'नन्हा बिरजू', VAIDYA = 'वैद्य जी';
const sohanBase = { gender: 'male', age: 'adult', build: 'stout', costume: 'kurta', skin: '#b07a55', moustache: true, voiceStyle: 'male, middle-aged, low pitch' };
const leads = [
  { name: MADHAV, gender: 'male', age: 'adult', build: 'regular', costume: 'kurta', hair: 'crop', skin: '#a8694a', primary: '#e9dfc6', accent: '#a2593e',
    moustache: false, voiceStyle: 'male, young adult, moderate pitch' },
  { name: KAVITA, gender: 'female', age: 'adult', build: 'regular', costume: 'sari', hair: 'bun', skin: '#b06f4d', primary: '#b8566b', accent: '#e0b860',
    jewelry: 'simple', voiceStyle: 'female, young adult, moderate pitch' },
  { name: MAA, gender: 'female', age: 'elder', build: 'regular', costume: 'sari', hair: 'grey', skin: '#a56a4c', primary: '#f1ece0', accent: '#c9a064',
    jewelry: 'simple', voiceStyle: 'female, elderly, low pitch' },
  // Sohan after the gold: the same rich clothes, dusty and dishevelled
  { ...sohanBase, name: SOHAN, hair: 'turban', primary: '#5e2630', accent: '#b8913f', shawl: '#9a7a2e', mud: true },
  // ... with his turban taken off
  { ...sohanBase, name: SOHAN_BARE, hair: 'crop', primary: '#5e2630', accent: '#b8913f', mud: true },
  // ... and humble afterwards: plain cotton, no gold
  { ...sohanBase, name: SOHAN_SIMPLE, hair: 'crop', primary: '#ece4d0', accent: '#8a6a4a', shawl: '#c9bfa6' },
];
const wanted = new Set([BHOLA, KAMLI, DHANIYA, BIRJU, VAIDYA]);
const roster = JSON.parse(readFileSync(join(here, '..', '..', '_cast', 'naukars.json'), 'utf8')).filter(c => wanted.has(c.name)).map(({ role, ...rest }) => rest);
const ramu = { name: RAMU, gender: 'male', age: 'elder', build: 'slim', costume: 'dhoti', hair: 'grey', skin: '#a5714e', primary: '#e3dccb', accent: '#9a6a48', shawl: '#9a8c70', beard: 'white', tilak: 'red', barefoot: true, moustache: true, voiceStyle: 'male, elderly, low pitch' };
const characters = [...leads, ...roster, ramu];

// ----------------------------------------------------------------------------------- scenes
const scene = (name, kind, image, ambience) => ({ name, kind, image, ambience, bakedLight: true });
const SC = {
  crack: 'जादुई चक्की · चटकती हवेली', house: 'जादुई चक्की · रात में माधव का घर', lane: 'जादुई चक्की · रात का चौक',
  broken: 'जादुई चक्की · टूटा दरवाजा', hall: 'जादुई चक्की · हवेली का दालान', open: 'जादुई चक्की · खुले दरवाजों वाली हवेली',
  cave: 'जादुई चक्की · गुफा का चबूतरा', yard: 'जादुई चक्की · कुम्हार का आंगन',
};
const scenes = [
  scene(SC.crack, 'home', plates['haveli-crack'], 'night'),
  scene(SC.house, 'courtyard', plates['house-night'], 'night'),
  scene(SC.lane, 'chowk', plates['chowk-night'], 'night'),
  scene(SC.broken, 'home', plates['haveli-broken'], 'night'),
  scene(SC.hall, 'home', plates['haveli-hall'], 'room'),
  scene(SC.open, 'home', plates['haveli-open'], 'village'),
  scene(SC.cave, 'cave', plates['cave-pedestal'], 'quiet'),
  scene(SC.yard, 'courtyard', plates['pottery-yard'], 'village'),
];

// ------------------------------------------------------------------------------------ props
const P = {
  mill: 'जादुई चक्की · पत्थर की चक्की', spin: 'जादुई चक्की · घूमती चक्की', glow: 'जादुई चक्की · चमकती चक्की',
  lantern: 'जादुई चक्की · लालटेन', sack: 'जादुई चक्की · भरी बोरी', sackB: 'जादुई चक्की · अनाज की बोरी', cloth: 'जादुई चक्की · तह किया कपड़ा',
  chaak: 'जादुई चक्की · माधव का चाक', pot: 'जादुई चक्की · पका लाल घड़ा',
};
const props = [
  { name: P.mill, kind: 'chakki', color: '#8f8a82' },
  { name: P.spin, kind: 'chakki', color: '#8f8a82', label: 'spin' },
  { name: P.glow, kind: 'chakki', color: '#8f8a82', label: 'glow' },
  { name: P.lantern, kind: 'lantern', color: '#c9a24a' },
  { name: P.sack, kind: 'seed-sack', color: '#b98d52' },
  { name: P.sackB, kind: 'seed-sack', color: '#c9a15f' },
  { name: P.cloth, kind: 'shawl', color: '#c0643f' },
  { name: P.chaak, kind: 'chaak', color: '#8a5f3c', label: 'spin' },
  { name: P.pot, kind: 'pot', color: '#b9482f' },
];
const lantern = (holder, x, y, extra = {}) => ({ prop: P.lantern, x, y, size: 0.7, holder, grasp: { hand: 'near', x: 0, y: -30 }, motion: 'glow', ...extra });
const carried = (holder, x, y, extra = {}) => ({ prop: P.mill, x, y, size: 0.8, holder, grasp: { hand: 'both', x: 0, y: -58 }, ...extra });

const shots = [];
const mood = [];
const shot = (music, definition) => { mood.push(music); shots.push({ actors: [], props: [], fx: [], sounds: [], ...definition }); };
const WINDOWS = [0.116, 0.203, 0.29, 0.378, 0.622, 0.709, 0.797, 0.884].map((x, i) => ({ x, y: 0.31, mode: 'spill', rate: 0.5, at: i * 0.1 }));
const HEAP = 0.585;   // the hall's gold surface where Sohan is buried to the neck

// ---- Scene 1 · the alarm and the race -------------------------------------------------------------------
shot('storm', {
  name: '१ · गांव वालों ने चीखें सुनीं', scene: SC.crack, time: 'night', mood: 'surprised', atmosphere: 'night', autoSound: false, transition: 'fade',
  camera: { frame: 'wide', move: 'push' }, vignette: 0.4, fx: ['coins', 'glow'], fxAmount: 1, coinSources: WINDOWS,
  actors: [
    { character: RAMU, x: 0.16, y: 0.94, size: 0.92, face: 'right', pose: 'look', emotion: 'surprised' },
    { character: BHOLA, x: 0.30, y: 0.96, size: 0.95, face: 'right', pose: 'point', emotion: 'surprised' },
    { character: KAMLI, x: 0.78, y: 0.95, size: 0.92, face: 'left', pose: 'flinch', emotion: 'worried' },
    { character: DHANIYA, x: 0.90, y: 0.94, size: 0.9, face: 'left', pose: 'look', emotion: 'surprised' },
  ],
  props: [lantern(RAMU, 0.16, 0.94), lantern(KAMLI, 0.78, 0.95)],
  sounds: [{ kind: 'surprise', at: 0.4, gain: 0.3 }, ...[0.6, 1.4, 2.2, 3.0, 3.8, 4.6, 5.4].map(at => ({ kind: 'coin', at, gain: 0.14 }))],
  dialogue: [say('j1', { at: 0.3 })],
});
{
  const t = timing(['j2', 'j3'], 0.2);
  shot('peak', {
    name: '२ · माधव के पास दौड़े', scene: SC.house, time: 'night', mood: 'worried', atmosphere: 'night', autoSound: false,
    camera: { frame: 'wide', zoom: 1.35, x: 0.55, y: 0.62 }, vignette: 0.42, fx: [],
    actors: [
      { character: BHOLA, x: -0.05, y: 0.86, size: 0.66, face: 'right', pose: 'run', emotion: 'worried', keys: [{ at: 1.6, x: 0.36, y: 0.76, size: 0.58, pose: 'point' }] },
      { character: RAMU, x: -0.15, y: 0.88, size: 0.66, face: 'right', pose: 'run', emotion: 'worried', keys: [{ at: 1.8, x: 0.26, y: 0.78, size: 0.6, pose: 'talk' }] },
      { character: MADHAV, x: 0.6, y: 0.74, size: 0.58, face: 'left', pose: 'idle', emotion: 'neutral', keys: [{ at: t.j3.start, pose: 'listen', emotion: 'surprised' }] },
    ],
    props: [lantern(RAMU, -0.15, 0.88)],
    sounds: [{ kind: 'footstep', at: 0.3, gain: 0.14 }, { kind: 'footstep', at: 0.6, gain: 0.14 }, { kind: 'footstep', at: 0.9, gain: 0.14 }, { kind: 'door', at: 1.4, gain: 0.2 }],
    dialogue: [say('j2', { at: 0.2 }), say('j3', { at: t.j3.start })],
  });
}
shot('peak', {
  name: '३ · हवेली की ओर दौड़ पड़ा', scene: SC.lane, time: 'night', mood: 'worried', atmosphere: 'night', autoSound: false,
  camera: { frame: 'wide', zoom: 1.15, x: 0.5, y: 0.62 }, vignette: 0.42, fx: [], minDuration: 3.2,
  actors: [
    { character: MADHAV, x: -0.08, y: 0.92, size: 1.0, face: 'right', pose: 'run', emotion: 'worried', keys: [{ at: 3.2, x: 1.12 }] },
    { character: BHOLA, x: -0.3, y: 0.9, size: 0.9, face: 'right', pose: 'run', emotion: 'worried', keys: [{ at: 3.2, x: 0.8 }] },
  ],
  sounds: [0.2, 0.45, 0.7, 0.95, 1.2, 1.45, 1.7, 1.95, 2.2, 2.45].map(at => ({ kind: 'footstep', at, gain: 0.14 })),
  dialogue: [say('j4', { at: 0.2 })],
});

// ---- Scene 2 · breaking the door and stopping the mill -----------------------------------------------------
shot('storm', {
  name: '४ · हवेली पहुंचा', scene: SC.crack, time: 'night', mood: 'worried', atmosphere: 'night', autoSound: false,
  camera: { frame: 'wide', zoom: 1.3, x: 0.5, y: 0.6 }, vignette: 0.42, fx: ['coins'], fxAmount: 0.8, coinSources: WINDOWS, minDuration: 2.4,
  actors: [
    { character: MADHAV, x: 0.1, y: 0.92, size: 0.78, face: 'right', pose: 'run', emotion: 'worried', keys: [{ at: 1.6, x: 0.44, y: 0.74, size: 0.6, pose: 'reach' }] },
    { character: BHOLA, x: -0.05, y: 0.94, size: 0.78, face: 'right', pose: 'run', emotion: 'worried', keys: [{ at: 1.8, x: 0.54, y: 0.75, size: 0.6, pose: 'reach' }] },
  ],
  sounds: [{ kind: 'footstep', at: 0.2, gain: 0.14 }, { kind: 'footstep', at: 0.6, gain: 0.14 }, { kind: 'footstep', at: 1.0, gain: 0.14 }, { kind: 'door', at: 1.9, gain: 0.5 }],
  dialogue: [say('j5', { at: 0.2 })],
});
shot('storm', {
  name: '५ · भारी दरवाजा तोड़ा', scene: SC.broken, time: 'night', mood: 'surprised', atmosphere: 'night', autoSound: false,
  camera: { frame: 'wide', zoom: 1.3, x: 0.5, y: 0.62, move: 'push' }, vignette: 0.42, fx: ['coins', 'glow'], fxAmount: 1, minDuration: 3.2,
  coinSources: [{ x: 0.5, y: 0.6, mode: 'spill', rate: 1.2 }],
  actors: [
    { character: MADHAV, x: 0.40, y: 0.8, size: 0.66, face: 'right', pose: 'flinch', emotion: 'surprised' },
    { character: BHOLA, x: 0.60, y: 0.8, size: 0.66, face: 'left', pose: 'flinch', emotion: 'surprised' },
    { character: RAMU, x: 0.22, y: 0.9, size: 0.8, face: 'right', pose: 'look', emotion: 'surprised' },
  ],
  props: [lantern(RAMU, 0.22, 0.9)],
  sounds: [{ kind: 'door', at: 0.1, gain: 0.7 }, { kind: 'thunder', at: 0.15, gain: 0.35 }, ...[0.4, 0.7, 1.0, 1.3, 1.6, 2.0].map(at => ({ kind: 'coin', at, gain: 0.2 }))],
  dialogue: [say('j6', { at: 0.3 })],
});
{
  const t = timing(['j7', 'j8'], 0.3);
  shot('peak', {
    name: '६ · सब दंग रह गए', scene: SC.hall, time: 'night', mood: 'surprised', atmosphere: 'room', autoSound: false,
    camera: { frame: 'wide', zoom: 1.15, x: 0.5, y: 0.5 }, vignette: 0.42, fx: ['coins', 'aura'], fxAmount: 1.2, auraX: 0.72, auraY: 0.5,
    coinSources: [{ x: 0.72, y: 0.5, mode: 'fountain', rate: 1.1 }],
    gold: { from: HEAP, to: HEAP, peakX: 0.72 },
    actors: [
      { character: MADHAV, x: 0.16, y: 0.6, size: 0.88, face: 'right', pose: 'flinch', emotion: 'surprised' },
      { character: SOHAN, x: 0.46, y: 0.86, size: 1.0, face: 'front', pose: 'shiver', emotion: 'worried', keys: [{ at: t.j8.start, pose: 'reach' }] },
    ],
    props: [{ prop: P.spin, x: 0.72, y: 0.53, size: 0.9, motion: 'glow' }],
    sounds: [{ kind: 'surprise', at: 0.4, gain: 0.3 }, ...[0.6, 1.4, 2.2, 3.0, 3.8, 4.6, 5.4].map(at => ({ kind: 'coin', at, gain: 0.15 }))],
    dialogue: [say('j7', { at: 0.3 }), say('j8')],
  });
}
{
  const t = timing(['j9', 'j10'], 0.3);
  shot('peak', {
    name: '७ · दाईं ओर घुमाया', scene: SC.hall, time: 'night', mood: 'worried', atmosphere: 'room', autoSound: false,
    camera: { frame: 'medium', zoom: 1.45, x: 0.58, y: 0.48, move: 'push' }, vignette: 0.44, fx: ['coins', 'aura'], fxAmount: 1.2, auraX: 0.72, auraY: 0.5,
    coinSources: [{ x: 0.72, y: 0.5, mode: 'fountain', rate: 1.2 }],
    gold: { from: HEAP, to: HEAP, peakX: 0.72 },
    actors: [
      { character: SOHAN, x: 0.4, y: 0.86, size: 1.0, face: 'right', pose: 'shiver', emotion: 'worried' },
      { character: MADHAV, x: 0.5, y: 0.57, size: 0.9, face: 'right', pose: 'walk', emotion: 'worried',
        keys: [{ at: 1.6, x: 0.64, y: 0.54, pose: 'work', emotion: 'angry' }, { at: t.j10.start + 1.2, pose: 'work', emotion: 'neutral' }] },
    ],
    props: [{ prop: P.spin, x: 0.72, y: 0.53, size: 0.9, motion: 'glow' }],
    sounds: [{ kind: 'whoosh', at: t.j10.start + 0.6, gain: 0.3 }, ...[0.5, 1.3, 2.1, 2.9, 3.7, 4.5].map(at => ({ kind: 'coin', at, gain: 0.15 }))],
    dialogue: [say('j9', { at: 0.3 }), say('j10')],
  });
}
shot('cave', {
  name: '८ · चक्की तुरंत रुक गई', scene: SC.hall, time: 'night', mood: 'neutral', atmosphere: 'room', autoSound: false,
  camera: { frame: 'medium', zoom: 1.45, x: 0.58, y: 0.48 }, vignette: 0.4, fx: ['glitter'], fxAmount: 0.6, minDuration: 2.6,
  gold: { from: HEAP, to: HEAP, peakX: 0.72 },
  actors: [
    { character: SOHAN, x: 0.4, y: 0.86, size: 1.0, face: 'right', pose: 'shiver', emotion: 'surprised' },
    { character: MADHAV, x: 0.64, y: 0.54, size: 0.9, face: 'right', pose: 'work', emotion: 'neutral', keys: [{ at: 1.0, pose: 'idle', face: 'left', emotion: 'happy' }] },
  ],
  props: [{ prop: P.mill, x: 0.72, y: 0.53, size: 0.9 }],
  sounds: [{ kind: 'bell', at: 0.15, gain: 0.45 }, { kind: 'twinkle', at: 0.2, gain: 0.25 }],
  dialogue: [say('j11', { at: 0.3 })],
});

// ---- Scene 3 · repentance and forgiveness ---------------------------------------------------------------
shot('cold', {
  name: '९ · सोने से बाहर निकाला', scene: SC.hall, time: 'night', mood: 'worried', atmosphere: 'room', autoSound: false,
  camera: { frame: 'medium', zoom: 1.3, x: 0.48, y: 0.5 }, vignette: 0.4, fx: [], minDuration: 5.2,
  gold: { from: HEAP, to: HEAP, peakX: 0.72 },
  actors: [
    { character: MADHAV, x: 0.62, y: 0.6, size: 0.92, face: 'left', pose: 'reach', emotion: 'worried' },
    { character: BHOLA, x: 0.26, y: 0.6, size: 0.9, face: 'right', pose: 'reach', emotion: 'worried' },
    { character: SOHAN, x: 0.44, y: 0.86, size: 1.0, face: 'front', pose: 'flinch', emotion: 'worried', keys: [{ at: 1.2, y: 0.86 }, { at: 4.4, y: 0.62, pose: 'shiver' }] },
  ],
  props: [{ prop: P.mill, x: 0.78, y: 0.53, size: 0.85 }],
  sounds: [{ kind: 'coin', at: 1.4, gain: 0.25 }, { kind: 'coin', at: 2.4, gain: 0.25 }, { kind: 'coin', at: 3.4, gain: 0.25 }, { kind: 'whoosh', at: 4.2, gain: 0.25 }],
  dialogue: [say('j12', { at: 0.3 })],
});
{
  const t = timing(['j13', 'j14'], 0.3);
  shot('cold', {
    name: '१० · जमीन पर गिर पड़ा', scene: SC.broken, time: 'night', mood: 'sad', atmosphere: 'night', autoSound: false,
    camera: { frame: 'medium', zoom: 1.55, x: 0.5, y: 0.72, move: 'push' }, vignette: 0.46, fx: ['glow'], fxAmount: 0.6,
    actors: [
      { character: SOHAN, x: 0.48, y: 0.94, size: 1.0, face: 'right', pose: 'shiver', stance: 'sit', emotion: 'worried', keys: [{ at: t.j14.start, pose: 'look', emotion: 'sad' }] },
      { character: MADHAV, x: 0.66, y: 0.94, size: 1.0, face: 'left', pose: 'comfort', stance: 'crouch', emotion: 'worried' },
      { character: RAMU, x: 0.24, y: 0.92, size: 0.92, face: 'right', pose: 'attend', emotion: 'worried' },
    ],
    props: [lantern(RAMU, 0.24, 0.92)],
    sounds: [{ kind: 'sad', at: t.j14.start, gain: 0.25 }],
    dialogue: [say('j13', { at: 0.3 }), say('j14')],
  });
}
{
  const t = timing(['j15', 'j16'], 0.3);
  shot('sad', {
    name: '११ · पश्चाताप के आंसू', scene: SC.broken, time: 'night', mood: 'sad', atmosphere: 'night', autoSound: false,
    camera: { frame: 'close', zoom: 1.9, x: 0.52, y: 0.62, move: 'push' }, vignette: 0.5, fx: [],
    actors: [
      { character: SOHAN_BARE, x: 0.44, y: 0.94, size: 1.0, face: 'right', pose: 'shiver', stance: 'crouch', emotion: 'sad', tears: true, keys: [{ at: t.j16.start, pose: 'reach' }] },
      { character: MADHAV, x: 0.62, y: 0.94, size: 1.0, face: 'left', pose: 'attend', stance: 'crouch', emotion: 'sad', keys: [{ at: t.j16.start + 0.3, pose: 'reach' }] },
    ],
    sounds: [{ kind: 'sad', at: 0.4, gain: 0.28 }],
    dialogue: [say('j15', { at: 0.3 }), say('j16')],
  });
}
shot('sad', {
  name: '१२ · मुझे माफ कर दे', scene: SC.broken, time: 'night', mood: 'sad', atmosphere: 'night', autoSound: false,
  camera: { frame: 'close', zoom: 2.0, x: 0.47, y: 0.6, move: 'push' }, vignette: 0.52, fx: [],
  actors: [
    { character: SOHAN_BARE, x: 0.44, y: 0.94, size: 1.0, face: 'right', pose: 'reach', stance: 'crouch', emotion: 'sad', tears: true },
    { character: MADHAV, x: 0.62, y: 0.94, size: 1.0, face: 'left', pose: 'reach', stance: 'crouch', emotion: 'sad' },
  ],
  dialogue: [say('j17', { at: 0.3, speaker: SOHAN_BARE, emotion: 'sad' }), say('j18', { speaker: SOHAN_BARE, emotion: 'sad' }), say('j19', { speaker: SOHAN_BARE, emotion: 'sad' })],
});
shot('kind', {
  name: '१३ · तूने फिर भी जान बचाई', scene: SC.broken, time: 'night', mood: 'sad', atmosphere: 'night', autoSound: false,
  camera: { frame: 'medium', zoom: 1.6, x: 0.53, y: 0.64 }, vignette: 0.48, fx: [],
  actors: [
    { character: SOHAN_BARE, x: 0.44, y: 0.94, size: 1.0, face: 'right', pose: 'offer', stance: 'crouch', emotion: 'sad', tears: true },
    { character: MADHAV, x: 0.62, y: 0.94, size: 1.0, face: 'left', pose: 'listen', stance: 'crouch', emotion: 'sad' },
  ],
  dialogue: [say('j20', { at: 0.3, speaker: SOHAN_BARE, emotion: 'sad' }), say('j21', { speaker: SOHAN_BARE, emotion: 'sad' }), say('j22', { speaker: SOHAN_BARE, emotion: 'sad' })],
});
{
  const t = timing(['j23', 'j24', 'j25'], 0.3);
  shot('kind', {
    name: '१४ · भाई को गले लगाया', scene: SC.broken, time: 'night', mood: 'happy', atmosphere: 'night', autoSound: false,
    camera: { frame: 'medium', zoom: 1.6, x: 0.5, y: 0.6, move: 'push' }, vignette: 0.44, fx: ['glow', 'glitter'], fxAmount: 0.6,
    actors: [
      { character: SOHAN_BARE, x: 0.44, y: 0.94, size: 1.0, face: 'right', pose: 'offer', stance: 'crouch', emotion: 'sad', tears: true,
        keys: [{ at: 0.9, stance: 'stand', pose: 'idle', y: 0.92 }, { at: 1.5, x: 0.47, pose: 'comfort' }] },
      { character: MADHAV, x: 0.62, y: 0.94, size: 1.0, face: 'left', pose: 'reach', stance: 'crouch', emotion: 'happy',
        keys: [{ at: 0.9, stance: 'stand', y: 0.92 }, { at: 1.5, x: 0.55, pose: 'comfort' }, { at: t.j25.start, pose: 'talk', emotion: 'happy' }] },
    ],
    sounds: [{ kind: 'twinkle', at: 1.6, gain: 0.2 }],
    dialogue: [say('j23', { at: 0.3 }), say('j24'), say('j25', { speaker: MADHAV, emotion: 'happy' })],
  });
}

// ---- Scene 4 · open gates and the mill returned --------------------------------------------------------------
shot('pastoral', {
  name: '१५ · हवेली के दरवाजे गरीबों के लिए', scene: SC.open, time: 'day', mood: 'happy', atmosphere: 'village', autoSound: false, transition: 'fade',
  camera: { frame: 'wide', zoom: 1.2, x: 0.5, y: 0.66, move: 'push' }, vignette: 0.2, fx: ['rays', 'petals'], fxAmount: 0.7, minDuration: 5.4,
  actors: [
    { character: SOHAN_SIMPLE, x: 0.42, y: 0.84, size: 0.86, face: 'right', pose: 'offer', emotion: 'happy', keys: [{ at: 2.6, pose: 'pass' }] },
    { character: MADHAV, x: 0.56, y: 0.84, size: 0.86, face: 'right', pose: 'present', emotion: 'happy' },
    { character: KAMLI, x: 0.72, y: 0.92, size: 0.92, face: 'left', pose: 'cradle', emotion: 'happy' },
    { character: BIRJU, x: 0.84, y: 0.94, size: 0.9, face: 'left', pose: 'cheer', emotion: 'happy' },
    { character: RAMU, x: 0.24, y: 0.92, size: 0.92, face: 'right', pose: 'fold', emotion: 'happy' },
  ],
  props: [{ prop: P.sack, x: 0.34, y: 0.86, size: 0.75 }, { prop: P.sackB, x: 0.64, y: 0.86, size: 0.7 }, { prop: P.cloth, x: 0.72, y: 0.92, size: 0.6, holder: KAMLI, grasp: { hand: 'both', x: 0, y: -20 } }],
  sounds: [{ kind: 'birds', at: 0.3, gain: 0.2 }, { kind: 'bell', at: 1.2, gain: 0.15 }],
  dialogue: [say('j26', { at: 0.3 })],
});
shot('divine', {
  name: '१६ · चक्की वापस गुफा में', scene: SC.cave, time: 'day', mood: 'neutral', atmosphere: 'quiet', autoSound: false, transition: 'fade',
  camera: { frame: 'wide', zoom: 1.35, x: 0.6, y: 0.66, move: 'push' }, vignette: 0.26, fx: ['rays', 'aura', 'glitter'], fxAmount: 0.7, auraX: 0.627, auraY: 0.66, minDuration: 4.6,
  actors: [{ character: MADHAV, x: 0.42, y: 0.86, size: 0.5, face: 'right', pose: 'cradle', emotion: 'neutral',
    keys: [{ at: 0.2, pose: 'walk' }, { at: 1.6, x: 0.58, y: 0.83, pose: 'offer' }, { at: 2.6, pose: 'fold', emotion: 'happy' }, { at: 3.4, face: 'left', pose: 'walk' }, { at: 4.6, x: 0.36, y: 0.88 }] }],
  props: [
    carried(MADHAV, 0.42, 0.86, { size: 0.42, end: 2.1 }),
    { prop: P.glow, x: 0.627, y: 0.722, size: 0.36, at: 2.1 },
  ],
  sounds: [{ kind: 'twinkle', at: 2.2, gain: 0.35 }, { kind: 'bell', at: 2.3, gain: 0.25 }],
  dialogue: [say('j27', { at: 0.3 })],
});
shot('vanish', {
  name: '१७ · मेहनत, प्रेम और संतोष', scene: SC.yard, time: 'day', mood: 'happy', atmosphere: 'village', autoSound: false, transition: 'fade',
  camera: { frame: 'wide', zoom: 1.1, x: 0.5, y: 0.66, move: 'pull' }, vignette: 0.2, fx: ['rays', 'glow', 'petals'], fxAmount: 0.8, minDuration: 7.2,
  actors: [
    { character: MAA, x: 0.16, y: 0.86, size: 0.84, face: 'right', pose: 'idle', emotion: 'happy' },
    { character: MADHAV, x: 0.48, y: 0.8, size: 0.86, face: 'left', pose: 'work', stance: 'sit', emotion: 'happy' },
    { character: SOHAN_SIMPLE, x: 0.64, y: 0.86, size: 0.9, face: 'left', pose: 'present', emotion: 'happy' },
    { character: KAVITA, x: 0.80, y: 0.86, size: 0.9, face: 'left', pose: 'laugh', emotion: 'happy' },
  ],
  props: [{ prop: P.chaak, x: 0.4, y: 0.82, size: 0.9 }, { prop: P.pot, x: 0.64, y: 0.86, size: 0.6, holder: SOHAN_SIMPLE, grasp: { hand: 'both', x: 0, y: -30 } }],
  sounds: [{ kind: 'birds', at: 0.4, gain: 0.2 }, { kind: 'twinkle', at: 5.0, gain: 0.25 }],
  dialogue: [say('j28', { at: 0.4 })],
});

const story = {
  title: 'जादुई चक्की और दो भाइयों का न्याय · खंड 5', slug: 'jadui-chakki-aur-do-bhai-part-5',
  language: 'hi', ratio: '16:9', captions: true, captionScale: 0.74,
  characters, scenes, props, shots, ...(score ? { score: { file: score, gain: 0.34 } } : {}),
};
writeFileSync(join(here, '..', 'storyboard-part-5.json'), JSON.stringify(story, null, 2), 'utf8');
writeFileSync(join(here, 'music5.json'), JSON.stringify(mood), 'utf8');
console.log(`storyboard-part-5.json · ${shots.length} shots${score ? ' · with score' : ' · no score yet'}`);
