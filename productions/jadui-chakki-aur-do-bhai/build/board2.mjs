// Build storyboard-part-2.json for "जादुई चक्की और दो भाइयों का न्याय" · खंड 2 (काली पहाड़ी और साधु की चक्की).
//
//   node productions/jadui-chakki-aur-do-bhai/build/board2.mjs
//
// Reads build/voices.json (clips d1..g5 are Part 4.mp3), build/plates.json and build/score2.json.
// Backdrops: the author's four painted plates (kali-path, cliff, storm, cave) plus hut-morning. No titles, only captions.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = file => JSON.parse(readFileSync(join(here, file), 'utf8'));
const voices = read('voices.json');
const plates = read('plates.json');
const score = (() => { try { return read('score2.json').id; } catch { return undefined; } })();

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

const MADHAV = 'माधव';
const KAVITA = 'कविता';
const SADHU = 'साधु बाबा';
const leads = [
  { name: MADHAV, gender: 'male', age: 'adult', build: 'slim', costume: 'dhoti', hair: 'crop', skin: '#a8694a', primary: '#b8ad90', accent: '#a2593e',
    patches: true, mud: true, barefoot: true, moustache: false, voiceStyle: 'male, young adult, moderate pitch' },
  { name: KAVITA, gender: 'female', age: 'adult', build: 'slim', costume: 'sari', hair: 'bun', skin: '#b06f4d', primary: '#6f8e88', accent: '#b89a58',
    patches: true, jewelry: 'simple', barefoot: true, voiceStyle: 'female, young adult, moderate pitch' },
];
const mystics = JSON.parse(readFileSync(join(here, '..', '..', '_cast', 'mystics.json'), 'utf8')).map(({ role, ...rest }) => rest);
const characters = [...leads, ...mystics];

const SC = {
  hut: 'जादुई चक्की · कोहरे में झोपड़ी', path: 'जादुई चक्की · काली पहाड़ी की पगडंडी', cliff: 'जादुई चक्की · पहाड़ी की चट्टान',
  storm: 'जादुई चक्की · आंधी में जंगल', cave: 'जादुई चक्की · प्राचीन गुफा',
};
const scene = (name, kind, image, ambience) => ({ name, kind, image, ambience, bakedLight: true });
const scenes = [
  scene(SC.hut, 'home', plates['hut-morning'], 'village'),
  scene(SC.path, 'lane', plates['kali-path'], 'village'),
  scene(SC.cliff, 'field', plates.cliff, 'quiet'),
  scene(SC.storm, 'field', plates.storm, 'quiet'),
  scene(SC.cave, 'field', plates.cave, 'quiet'),
];

const P = {
  shovel: 'जादुई चक्की · फावड़ा', bag: 'जादुई चक्की · कपड़े का थैला', shawl: 'जादुई चक्की · माधव का गमछा',
  roti: 'जादुई चक्की · दो सूखी रोटियां', lota: 'जादुई चक्की · पानी का लोटा', chakki: 'जादुई चक्की · पत्थर की चक्की',
  chakkiGlow: 'जादुई चक्की · जगमगाती चक्की',
};
const props = [
  { name: P.shovel, kind: 'shovel', color: '#8d8f93' },
  { name: P.bag, kind: 'cloth-pouch', color: '#c9b48a' },
  { name: P.shawl, kind: 'shawl', color: '#9a6a3c' },
  { name: P.roti, kind: 'roti', color: '#d3b27a' },
  { name: P.lota, kind: 'lota', color: '#c89a3c' },
  { name: P.chakki, kind: 'chakki', color: '#8f8a82' },
  { name: P.chakkiGlow, kind: 'chakki', color: '#8f8a82', label: 'glow' },
];

const shots = [];
const mood = [];
const shot = (music, definition) => { mood.push(music); shots.push({ actors: [], props: [], fx: [], sounds: [], ...definition }); };
const spade = (holder, x, y, extra = {}) => ({ prop: P.shovel, x, y, size: 0.95, holder, grasp: { hand: 'near', x: 6, y: -6 }, ...extra });
const bag = (holder, x, y, extra = {}) => ({ prop: P.bag, x, y, size: 0.85, holder, grasp: { hand: 'far', x: 0, y: 0 }, ...extra });
const chakkiIn = (prop, holder, x, y, extra = {}) => ({ prop, x, y, size: 1.0, holder, grasp: { hand: 'both', x: 0, y: -52 }, ...extra });

// ---- Scene 1 · the desperate morning ----------------------------------------------------------------
{
  const t = timing(['d1', 'd2', 'd3'], 0.5);
  shot('dawn', {
    name: '१ · कोहरे की सुबह', scene: SC.hut, time: 'dawn', weather: 'mist', atmosphere: 'village', autoSound: false, transition: 'fade',
    camera: { frame: 'medium', zoom: 1.18, x: 0.52, y: 0.6, move: 'push' }, vignette: 0.3, fx: ['fog'], fxAmount: 0.6,
    actors: [
      { character: KAVITA, x: 0.42, y: 0.80, size: 0.9, face: 'right', pose: 'hold', emotion: 'worried' },
      { character: MADHAV, x: 0.66, y: 0.88, size: 1.02, face: 'left', pose: 'reach', emotion: 'sad',
        keys: [{ at: t.d2.start, pose: 'idle', emotion: 'neutral' }, { at: t.d3.start, pose: 'hold', emotion: 'neutral', face: 'right' }] },
    ],
    props: [
      { prop: P.shovel, x: 0.78, y: 0.90, size: 0.95, end: t.d2.start },
      spade(MADHAV, 0.66, 0.88, { at: t.d2.start }),
      bag(MADHAV, 0.66, 0.88, { at: t.d2.start }),
    ],
    sounds: [{ kind: 'birds', at: 0.4, gain: 0.12 }, { kind: 'wind', at: 0.2, gain: 0.2 }, { kind: 'thunder', at: t.d3.start, gain: 0.22 }],
    dialogue: [say('d1', { at: 0.5 }), say('d2'), say('d3')],
  });
}
shot('walk', {
  name: '२ · गांव से दूर', scene: SC.path, time: 'dawn', weather: 'mist', atmosphere: 'village', autoSound: false,
  camera: { frame: 'wide', move: 'static' }, vignette: 0.2, fx: ['fog'], fxAmount: 0.8, minDuration: 4.0,
  actors: [{ character: MADHAV, x: 0.40, y: 0.98, size: 1.05, face: 'right', pose: 'walk', emotion: 'neutral',
    keys: [{ at: 1.1, x: 0.52, y: 0.89, size: 0.84 }, { at: 2.2, x: 0.66, y: 0.79, size: 0.64 }, { at: 3.1, x: 0.72, y: 0.73, size: 0.52 },
      { at: 4.0, x: 0.65, y: 0.68, size: 0.42 }] }],
  props: [spade(MADHAV, 0.40, 0.98, { size: 1.0 }), bag(MADHAV, 0.40, 0.98)],
  sounds: [{ kind: 'footstep', at: 0.4, gain: 0.12 }, { kind: 'footstep', at: 1.0, gain: 0.12 }, { kind: 'footstep', at: 1.6, gain: 0.12 },
    { kind: 'footstep', at: 2.2, gain: 0.12 }, { kind: 'birds', at: 0.3, gain: 0.1 }, { kind: 'wind', at: 0.2, gain: 0.2 }],
  dialogue: [say('d4', { at: 0.3 })],
});
shot('peak', {
  name: '३ · काली पहाड़ी', scene: SC.path, time: 'dawn', weather: 'mist', mood: 'worried', atmosphere: 'village', autoSound: false,
  camera: { frame: 'medium', zoom: 2.1, x: 0.7, y: 0.3, move: 'push' }, vignette: 0.4, fx: ['fog'], fxAmount: 0.9, minDuration: 3.6,
  sounds: [{ kind: 'thunder', at: 0.5, gain: 0.55 }, { kind: 'wind', at: 0.2, gain: 0.24 }, { kind: 'thunder', at: 2.6, gain: 0.4 }],
  dialogue: [say('d5', { at: 0.3 })],
});

// ---- Scene 2 · lost in the howling storm ----------------------------------------------------------------
shot('climb', {
  name: '४ · पहाड़ी पर चढ़ाई, मौसम बदला', scene: SC.cliff, time: 'day', atmosphere: 'quiet', autoSound: false,
  camera: { frame: 'wide', move: 'static' }, vignette: 0.2, fx: ['rays', 'fog'], fxAmount: 0.9, minDuration: 4.4,
  // The path climbs from the bottom left to the far top left: each waypoint sits on it, and the size follows the depth.
  actors: [{ character: MADHAV, x: 0.14, y: 0.98, size: 1.0, face: 'right', pose: 'walk', emotion: 'neutral',
    keys: [{ at: 0.9, x: 0.12, y: 0.84, size: 0.82 }, { at: 1.8, x: 0.15, y: 0.71, size: 0.66 }, { at: 2.7, x: 0.21, y: 0.61, size: 0.52 },
      { at: 3.5, x: 0.265, y: 0.49, size: 0.4 }, { at: 4.2, x: 0.25, y: 0.41, size: 0.33 }] }],
  props: [spade(MADHAV, 0.14, 0.98, { size: 1.0 })],
  sounds: [{ kind: 'footstep', at: 0.4, gain: 0.12 }, { kind: 'footstep', at: 1.1, gain: 0.12 }, { kind: 'wind', at: 1.4, gain: 0.3 }, { kind: 'thunder', at: 3.6, gain: 0.45 }],
  dialogue: [say('d6', { at: 0.3 })],
});
shot('storm', {
  name: '५ · तेज आंधी और कोहरा', scene: SC.storm, time: 'day', mood: 'worried', atmosphere: 'quiet', autoSound: false,
  camera: { frame: 'medium', zoom: 1.25, x: 0.5, y: 0.66, move: 'push' }, vignette: 0.4, fx: ['leaves', 'fog'], fxAmount: 1.5, minDuration: 3.4,
  actors: [{ character: MADHAV, x: 0.46, y: 0.93, size: 1.05, face: 'left', pose: 'flinch', emotion: 'worried' }],
  sounds: [{ kind: 'wind', at: 0.1, gain: 0.6 }, { kind: 'wind', at: 1.5, gain: 0.5 }, { kind: 'thunder', at: 1.0, gain: 0.5 }],
  dialogue: [say('d7', { at: 0.3 })],
});
shot('storm', {
  name: '६ · भटककर अनजान जगह', scene: SC.storm, time: 'day', mood: 'worried', atmosphere: 'quiet', autoSound: false,
  camera: { frame: 'wide', move: 'pan-right' }, vignette: 0.42, fx: ['leaves', 'fog'], fxAmount: 1.3, minDuration: 4.6,
  actors: [{ character: MADHAV, x: 0.18, y: 0.95, size: 1.0, face: 'right', pose: 'walk', emotion: 'worried',
    keys: [{ at: 2.0, x: 0.45, y: 0.9 }, { at: 3.6, pose: 'look', x: 0.66, y: 0.88, size: 0.85, emotion: 'surprised' }] }],
  sounds: [{ kind: 'wind', at: 0.1, gain: 0.5 }, { kind: 'wind', at: 2.0, gain: 0.4 }],
  dialogue: [say('d8', { at: 0.3 })],
});

// ---- Scene 3 · the test of kindness ------------------------------------------------------------------------
{
  const t = timing(['e1', 'e2'], 0.4);
  shot('cave', {
    name: '७ · गुफा के बाहर कांपते साधु', scene: SC.cave, time: 'dusk', atmosphere: 'quiet', autoSound: false, transition: 'fade',
    camera: { frame: 'medium', zoom: 1.3, x: 0.42, y: 0.64, move: 'push' }, vignette: 0.28, fx: ['rays', 'fog'], fxAmount: 0.8,
    actors: [
      { character: SADHU, x: 0.46, y: 0.89, size: 1.0, face: 'left', pose: 'shiver', stance: 'sit', emotion: 'sad' },
      { character: MADHAV, x: -0.1, y: 0.92, size: 1.0, face: 'right', pose: 'walk', emotion: 'worried', keys: [{ at: t.e2.start + 1.0, x: 0.14 }, { at: t.e2.end, pose: 'look' }] },
    ],
    props: [spade(MADHAV, -0.1, 0.92, { size: 1.0 })],
    sounds: [{ kind: 'wind', at: 0.1, gain: 0.4 }, { kind: 'wind', at: 2.5, gain: 0.3 }],
    dialogue: [say('e1', { at: 0.4 }), say('e2')],
  });
}
{
  const t = timing(['e3', 'e4'], 0.3);
  shot('kind', {
    name: '८ · चादर ओढ़ा दी', scene: SC.cave, time: 'dusk', mood: 'sad', atmosphere: 'quiet', autoSound: false,
    camera: { frame: 'medium', zoom: 1.6, x: 0.36, y: 0.66, move: 'push' }, vignette: 0.32, fx: ['fog'], fxAmount: 0.7,
    actors: [
      { character: SADHU, x: 0.50, y: 0.89, size: 1.0, face: 'left', pose: 'shiver', stance: 'sit', emotion: 'sad' },
      { character: MADHAV, x: 0.20, y: 0.92, size: 1.02, face: 'right', pose: 'look', emotion: 'worried',
        keys: [{ at: t.e3.start + 0.5, pose: 'check-pocket', emotion: 'sad' }, { at: t.e4.start, pose: 'walk', x: 0.34 },
          { at: t.e4.start + 1.0, pose: 'comfort', emotion: 'happy' }] },
    ],
    props: [{ prop: P.shawl, x: 0.50, y: 0.89, size: 0.78, at: t.e4.start + 1.9, holder: SADHU, grasp: { hand: 'waist', x: 0, y: -22 } }],
    sounds: [{ kind: 'wind', at: 0.1, gain: 0.35 }, { kind: 'whoosh', at: t.e4.start + 1.8, gain: 0.2 }],
    dialogue: [say('e3', { at: 0.3 }), say('e4')],
  });
}
{
  const t = timing(['e5'], 0.4);
  shot('kind', {
    name: '९ · आखिरी रोटियां और पानी', scene: SC.cave, time: 'dusk', mood: 'happy', atmosphere: 'quiet', autoSound: false,
    camera: { frame: 'medium', zoom: 1.7, x: 0.40, y: 0.66, move: 'push' }, vignette: 0.28, fx: [], fxAmount: 0.8,
    actors: [
      { character: SADHU, x: 0.52, y: 0.89, size: 1.0, face: 'left', pose: 'shiver', stance: 'sit', emotion: 'sad',
        keys: [{ at: t.e5.start + 2.0, pose: 'reach' }, { at: t.e5.start + 3.4, pose: 'idle', emotion: 'happy' }] },
      { character: MADHAV, x: 0.32, y: 0.92, size: 1.02, face: 'right', pose: 'offer', emotion: 'happy' },
    ],
    props: [
      { prop: P.roti, x: 0.32, y: 0.92, size: 0.7, holder: MADHAV, grasp: { hand: 'near', x: 0, y: 0 }, end: t.e5.start + 1.9 },
      { prop: P.lota, x: 0.34, y: 0.92, size: 0.7, holder: MADHAV, grasp: { hand: 'far', x: 0, y: 0 }, end: t.e5.start + 2.3 },
      { prop: P.roti, x: 0.43, y: 0.95, size: 0.7, at: t.e5.start + 1.9 },
      { prop: P.lota, x: 0.47, y: 0.96, size: 0.7, at: t.e5.start + 2.3 },
    ],
    sounds: [{ kind: 'water', at: t.e5.start + 2.6, gain: 0.2 }],
    dialogue: [say('e5', { at: 0.4 })],
  });
}

// ---- Scene 4 · the secret of the stone chakki ------------------------------------------------------------------
shot('divine', {
  name: '१० · साधु की मुस्कान', scene: SC.cave, time: 'dusk', mood: 'happy', atmosphere: 'quiet', autoSound: false,
  camera: { frame: 'close', zoom: 2.0, focus: SADHU, move: 'push' }, vignette: 0.3, fx: [], fxAmount: 1.3, auraX: 0.5, auraY: 0.5, minDuration: 3.0,
  actors: [
    { character: SADHU, x: 0.52, y: 0.89, size: 1.0, face: 'front', pose: 'idle', stance: 'stand', emotion: 'happy' },
    { character: MADHAV, x: 0.28, y: 0.92, size: 1.02, face: 'right', pose: 'attend', emotion: 'happy' },
  ],
  sounds: [],
  dialogue: [say('f1', { at: 0.4 })],
});
{
  const t = timing(['f2', 'f3'], 0.3);
  shot('divine', {
    name: '११ · बेटा, तुमने सेवा की', scene: SC.cave, time: 'dusk', mood: 'happy', atmosphere: 'quiet', autoSound: false,
    camera: { frame: 'medium', zoom: 1.5, x: 0.44, y: 0.64, move: 'push' }, vignette: 0.3, fx: ['rays'], fxAmount: 0.8,
    actors: [
      { character: SADHU, x: 0.56, y: 0.89, size: 1.0, face: 'left', pose: 'open', stance: 'stand', emotion: 'happy',
        keys: [{ at: t.f3.start, pose: 'present' }] },
      { character: MADHAV, x: 0.30, y: 0.92, size: 1.02, face: 'right', pose: 'attend', emotion: 'surprised',
        keys: [{ at: t.f3.start, emotion: 'happy' }] },
    ],
    sounds: [],
    dialogue: [say('f2', { speaker: SADHU, at: 0.3, emotion: 'happy' }), say('f3', { speaker: SADHU, emotion: 'happy' })],
  });
}
shot('divine', {
  name: '१२ · गुफा से चक्की लाए', scene: SC.cave, time: 'dusk', mood: 'happy', atmosphere: 'quiet', autoSound: false,
  camera: { frame: 'wide', move: 'push' }, vignette: 0.26, fx: ['glitter', 'glow'], fxAmount: 1.0, minDuration: 4.6,
  actors: [
    { character: SADHU, x: 0.50, y: 0.88, size: 1.0, face: 'right', pose: 'walk', stance: 'stand', emotion: 'happy',
      keys: [{ at: 1.5, x: 0.66, y: 0.76, size: 0.72, alpha: 1 }, { at: 1.55, alpha: 0 }, { at: 2.4, alpha: 0, x: 0.66, y: 0.76 },
        { at: 2.5, alpha: 1, face: 'left' }, { at: 3.9, x: 0.52, y: 0.88, size: 1.0, pose: 'present' }] },
    { character: MADHAV, x: 0.26, y: 0.92, size: 1.02, face: 'right', pose: 'attend', emotion: 'surprised' },
  ],
  props: [chakkiIn(P.chakki, SADHU, 0.52, 0.88, { at: 2.8 })],
  sounds: [{ kind: 'footstep', at: 0.4, gain: 0.14 }, { kind: 'footstep', at: 0.9, gain: 0.14 }, { kind: 'twinkle', at: 2.8, gain: 0.4 }],
  dialogue: [say('f4', { at: 0.4 })],
});
{
  const t = timing(['f5', 'f6'], 0.3);
  shot('divine', {
    name: '१३ · बाईं ओर घुमाओ', scene: SC.cave, time: 'dusk', mood: 'happy', atmosphere: 'quiet', autoSound: false,
    camera: { frame: 'medium', zoom: 1.5, x: 0.42, y: 0.66, move: 'push' }, vignette: 0.28, fx: ['glitter', 'aura'], fxAmount: 0.8, auraX: 0.42, auraY: 0.6,
    actors: [
      { character: SADHU, x: 0.56, y: 0.89, size: 1.0, face: 'left', pose: 'offer', emotion: 'happy', keys: [{ at: t.f6.start, pose: 'present' }] },
      { character: MADHAV, x: 0.30, y: 0.92, size: 1.02, face: 'right', pose: 'attend', emotion: 'surprised', keys: [{ at: t.f5.start + 1.0, pose: 'cradle' }] },
    ],
    props: [
      chakkiIn(P.chakki, SADHU, 0.56, 0.89, { end: t.f5.start + 1.0 }),
      chakkiIn(P.chakki, MADHAV, 0.30, 0.92, { at: t.f5.start + 1.0 }),
    ],
    sounds: [{ kind: 'twinkle', at: t.f5.start + 1.0, gain: 0.35 }],
    dialogue: [say('f5', { speaker: SADHU, at: 0.3, emotion: 'happy' }), say('f6', { speaker: SADHU, emotion: 'happy' })],
  });
}
shot('divine', {
  name: '१४ · चक्की की सुनहरी चमक', scene: SC.cave, time: 'dusk', mood: 'happy', atmosphere: 'quiet', autoSound: false,
  camera: { frame: 'medium', zoom: 1.7, x: 0.5, y: 0.66, move: 'push' }, vignette: 0.34, fx: ['glitter', 'aura', 'embers'], fxAmount: 1.4, auraX: 0.5, auraY: 0.6, minDuration: 3.0,
  actors: [
    { character: MADHAV, x: 0.44, y: 0.92, size: 1.04, face: 'front', pose: 'cradle', emotion: 'surprised' },
    { character: SADHU, x: 0.74, y: 0.89, size: 1.0, face: 'left', pose: 'present', emotion: 'happy' },
  ],
  props: [chakkiIn(P.chakkiGlow, MADHAV, 0.44, 0.92, { size: 1.05 })],
  sounds: [{ kind: 'twinkle', at: 0.3, gain: 0.4 }, { kind: 'bell', at: 1.0, gain: 0.25 }],
  dialogue: [say('f7', { speaker: SADHU, at: 0.3, emotion: 'happy' })],
});
shot('divine', {
  name: '१५ · केवल भलाई के लिए', scene: SC.cave, time: 'dusk', mood: 'neutral', atmosphere: 'quiet', autoSound: false,
  camera: { frame: 'medium', zoom: 1.6, focus: SADHU, move: 'push' }, vignette: 0.32, fx: ['aura', 'glitter', 'rays'], fxAmount: 1.0, auraX: 0.55, auraY: 0.5,
  actors: [
    { character: SADHU, x: 0.56, y: 0.89, size: 1.0, face: 'left', pose: 'point', emotion: 'neutral', keys: [{ at: 3.0, pose: 'present', emotion: 'happy' }] },
    { character: MADHAV, x: 0.30, y: 0.92, size: 1.02, face: 'right', pose: 'cradle', emotion: 'happy', keys: [{ at: 2.8, pose: 'nod' }] },
  ],
  props: [chakkiIn(P.chakki, MADHAV, 0.30, 0.92)],
  sounds: [{ kind: 'bell', at: 0.4, gain: 0.25 }],
  dialogue: [say('f9', { speaker: SADHU, at: 0.3, emotion: 'neutral' })],
});

// ---- Scene 5 · the vanishing ------------------------------------------------------------------------------------
shot('vanish', {
  name: '१६ · चरणों में प्रणाम', scene: SC.cave, time: 'dusk', mood: 'happy', atmosphere: 'quiet', autoSound: false,
  camera: { frame: 'wide', move: 'push' }, vignette: 0.28, fx: [], fxAmount: 1.0, minDuration: 3.4,
  actors: [
    { character: SADHU, x: 0.48, y: 0.88, size: 1.0, face: 'left', pose: 'idle', emotion: 'happy',
      keys: [{ at: 1.6, face: 'right', pose: 'walk' }, { at: 3.0, x: 0.66, y: 0.77, size: 0.72 }] },
    { character: MADHAV, x: 0.30, y: 0.92, size: 1.02, face: 'right', pose: 'bow', stance: 'crouch', emotion: 'happy',
      keys: [{ at: 1.4, pose: 'cradle', stance: 'crouch', emotion: 'surprised' }] },
  ],
  props: [chakkiIn(P.chakki, MADHAV, 0.30, 0.92, { grasp: { hand: 'both', x: 0, y: -40 } })],
  sounds: [{ kind: 'footstep', at: 1.8, gain: 0.12 }],
  dialogue: [say('g1', { at: 0.4 })],
});
shot('vanish', {
  name: '१७ · सुनहरे कणों में ओझल', scene: SC.cave, time: 'dusk', mood: 'surprised', atmosphere: 'quiet', autoSound: false,
  camera: { frame: 'medium', zoom: 1.5, x: 0.58, y: 0.62, move: 'push' }, vignette: 0.3, fx: ['glitter', 'embers', 'aura', 'glow'], fxAmount: 2.0, auraX: 0.64, auraY: 0.6,
  actors: [
    { character: SADHU, x: 0.62, y: 0.78, size: 0.74, face: 'right', pose: 'walk', emotion: 'happy',
      keys: [{ at: 1.0, x: 0.66, y: 0.74, size: 0.66, alpha: 1 }, { at: 2.4, alpha: 0, x: 0.69, y: 0.72, size: 0.6 }] },
    { character: MADHAV, x: 0.30, y: 0.92, size: 1.02, face: 'right', pose: 'cradle', stance: 'stand', emotion: 'surprised' },
  ],
  props: [chakkiIn(P.chakki, MADHAV, 0.30, 0.92, { grasp: { hand: 'both', x: 0, y: -40 } })],
  sounds: [{ kind: 'twinkle', at: 0.8, gain: 0.4 }, { kind: 'twinkle', at: 1.6, gain: 0.4 }, { kind: 'bell', at: 2.0, gain: 0.3 }, { kind: 'whoosh', at: 2.2, gain: 0.25 }],
  dialogue: [say('g2', { at: 0.4 })],
});
shot('wonder', {
  name: '१८ · स्तब्ध माधव', scene: SC.cave, time: 'dusk', mood: 'surprised', atmosphere: 'quiet', autoSound: false,
  camera: { frame: 'medium', zoom: 1.5, focus: MADHAV, move: 'push' }, vignette: 0.34, fx: [], fxAmount: 1.0, minDuration: 3.0,
  actors: [{ character: MADHAV, x: 0.40, y: 0.92, size: 1.05, face: 'right', pose: 'cradle', emotion: 'surprised' }],
  props: [chakkiIn(P.chakki, MADHAV, 0.40, 0.92, { size: 1.05 })],
  sounds: [{ kind: 'wind', at: 0.1, gain: 0.18 }],
  dialogue: [say('g3', { at: 0.4 })],
});
{
  const t = timing(['g4', 'g5'], 0.4);
  shot('wonder', {
    name: '१९ · सपना या चमत्कार?', scene: SC.cave, time: 'dusk', mood: 'surprised', atmosphere: 'quiet', autoSound: false, transition: 'fade',
    camera: { frame: 'close', zoom: 1.9, focus: MADHAV, move: 'push' }, vignette: 0.38, fx: [], fxAmount: 1.2, auraX: 0.45, auraY: 0.6, minDuration: 5.0,
    actors: [{ character: MADHAV, x: 0.44, y: 0.92, size: 1.05, face: 'front', pose: 'cradle', emotion: 'surprised',
      keys: [{ at: t.g5.start + 0.6, emotion: 'happy' }, { at: t.g5.end - 0.2, pose: 'run', face: 'right', x: 0.62 }] }],
    props: [chakkiIn(P.chakki, MADHAV, 0.44, 0.92, { size: 1.05 })],
    sounds: [],
    dialogue: [say('g4', { speaker: MADHAV, at: 0.4, emotion: 'surprised' }), say('g5', { speaker: MADHAV, emotion: 'surprised' })],
  });
}

const story = {
  title: 'जादुई चक्की और दो भाइयों का न्याय · खंड 2', slug: 'jadui-chakki-aur-do-bhai-part-2',
  language: 'hi', ratio: '16:9', captions: true, captionScale: 0.74,
  characters, scenes, props, shots, ...(score ? { score: { file: score, gain: 0.34 } } : {}),
};
writeFileSync(join(here, '..', 'storyboard-part-2.json'), JSON.stringify(story, null, 2), 'utf8');
writeFileSync(join(here, 'music2.json'), JSON.stringify(mood), 'utf8');
console.log(`storyboard-part-2.json · ${shots.length} shots${score ? ' · with score' : ' · no score yet'}`);
