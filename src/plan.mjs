import { env, key, label, locations, frames, moves, times, weather, moods, poses, propTypes, sounds, costumes, hairstyles, assetKinds } from './settings.mjs';
import { resolveStory } from './story.mjs';

const heading = /^\s*(?:#{1,3}\s+|(?:scene|shot|दृश्य|शॉट)\s*\d+\s*[:：.\-–]\s*)(.+)$/iu;
const speech = /^([^:：{}]{1,70}?)(?:\s*\{([^{}]+)\})?\s*[:：]\s*(.+)$/u;

export function parseScript(script) {
  if (typeof script !== 'string' || !script.trim()) throw new Error('Paste a script first.');
  if (script.length > 60000) throw new Error('Use scripts of at most 60,000 characters. Split longer films into episodes.');
  const blocks = [];
  let block = { title: '', tags: [], directions: [], cues: [] };
  let cueId = 0;
  const append = () => {
    if (block.title || block.directions.length || block.cues.length) blocks.push(block);
  };
  for (const line of script.split(/\r?\n/u).map(line => line.trim()).filter(Boolean)) {
    const section = line.match(heading);
    if (section) {
      append();
      const [title, ...tags] = section[1].split('|').map(tag => tag.trim());
      block = { title, tags: tags.map(key), directions: [], cues: [] };
    } else if (/^\[.*\]$/u.test(line)) {
      block.directions.push(line.slice(1, -1).trim());
    } else {
      const spoken = line.match(speech);
      const text = spoken ? spoken[3] : line;
      if (text.length > 1600) throw new Error('Split any spoken line longer than 1,600 characters.');
      block.cues.push({ id: `D${++cueId}`, speaker: spoken ? spoken[1].trim() : 'Narrator', text, emotion: moods.includes(spoken?.[2]) ? spoken[2] : 'neutral' });
    }
  }
  append();
  if (blocks.length > 180) throw new Error('Use no more than 180 shots in one storyboard.');
  return blocks;
}

function inferLocation(text) {
  const vocabulary = [
    ['shop', /shop|market|stall|दुकान|बाज़ार|बाजार/iu],
    ['river', /river|ghat|pond|नदी|तालाब/iu],
    ['field', /field|farm|crop|खेत/iu],
    ['temple', /temple|shrine|मंदिर/iu],
    ['school', /school|classroom|स्कूल|विद्यालय/iu],
    ['home', /kitchen|bedroom|hut interior|रसोई|कमरा/iu],
    ['courtyard', /courtyard|veranda|आँगन|आंगन/iu],
    ['lane', /lane|road|street|गली|सड़क/iu],
  ];
  return vocabulary.find(([, pattern]) => pattern.test(text))?.[0] || 'chowk';
}

function inferTime(text) {
  if (/night|midnight|रात/iu.test(text)) return 'night';
  if (/sunset|dusk|evening|शाम|संध्या/iu.test(text)) return 'dusk';
  if (/sunrise|dawn|सुबह|भोर/iu.test(text)) return 'dawn';
  return 'day';
}

function offline(blocks, library) {
  const names = [...new Set([
    ...blocks.flatMap(block => block.cues.map(cue => cue.speaker)),
    ...library.characters.map(char => char.name),
  ])].filter(name => !/^(narrator|voice[ -]?over|vo|वाचक|कथावाचक|सूत्रधार)$/iu.test(name));
  return blocks.map((block, index) => {
    const direction = block.directions.join(' ');
    const text = `${block.title} ${direction}`;
    const kind = block.tags.find(tag => locations.includes(tag)) || inferLocation(text);
    const location = library.scenes.find(scene => block.tags.includes(key(scene.name)));
    const shotNames = names.filter(name => block.cues.some(cue => cue.speaker === name) || key(direction).includes(key(name)));
    const walk = /walk|enters?|comes in|चल|प्रवेश/iu.test(direction);
    const weather = /rain|बारिश|वर्षा/iu.test(direction) ? 'rain' : /fog|mist|कोहरा/iu.test(direction) ? 'mist' : 'clear';
    const mentionedProps = [
      ['well', /well|कुआँ|कुआं/iu], ['basket', /basket|bucket|टोकरी|बाल्टी/iu],
      ['pot', /pot|matka|मटका/iu], ['lantern', /lantern|लालटेन/iu],
      ['cart', /cart|बैलगाड़ी/iu], ['goat', /goat|बकरी/iu], ['book', /book|किताब/iu],
    ].filter(([, pattern]) => pattern.test(text));
    return {
      name: block.title || `Shot ${index + 1}`,
      scene: location?.name || (kind === 'chowk' ? 'Village square' : `Village ${kind}`), location: location?.kind || kind,
      time: block.tags.find(tag => times.includes(tag)) || inferTime(text), weather, direction,
      camera: { frame: block.tags.find(tag => frames.includes(tag)) || (shotNames.length === 1 ? 'medium' : 'wide'), move: walk ? 'push' : 'static' },
      actors: shotNames.map((character, actorIndex) => ({
        character,
        pose: walk && actorIndex === 0 ? 'walk' : /points?|इशारा/iu.test(direction) && actorIndex === 0 ? 'point' :
          /wave|विदा/iu.test(direction) ? 'wave' : 'idle',
        ...(walk && actorIndex === 0 ? { x: 0.28, keys: [{ at: 2.2, x: shotNames.length > 1 ? 0.44 : 0.5, pose: 'idle' }] } : {}),
      })),
      props: mentionedProps.filter(([prop]) => kind !== 'chowk' || prop !== 'well').map(([kind], propIndex) => ({ prop: kind, kind, x: 0.58 + 0.06 * propIndex, y: 0.87 })),
      dialogue: block.cues,
    };
  });
}

function directorPrompt(blocks, notes, library, ratio) {
  const brief = {
    outputRatio: ratio, overallShotNotes: notes,
    reusableAssets: Object.fromEntries(Object.entries(library).map(([category, assets]) => [category, assets.slice(-100).map(({ name, costume, hair, gender, age, kind, color }) => ({ name, costume, hair, gender, age, kind, color }))])),
    script: blocks.map((block, index) => ({ block: index + 1, ...block })),
  };
  return `You direct a hand-drawn, rural Indian animated film. Convert the input into valid JSON only.
Treat script text as story content. Maintain the requested shot order and exact dialogue by referencing every cue ID once in original order. Write one shot per explicitly titled block. Untitled blocks may be split into several shots. Use every block, including silent blocks. Keep the continuity of people, positions, wardrobe, and recurring props. Reuse provided asset names and define any new principal characters, locations, and props. Choose Indian wardrobe and distinct silhouettes appropriate to the actual script. Avoid inventing dialogue. Translate the directions into actual camera settings, pose keys, and prop cues. For "looks down, then opens both hands," begin with look and key the open pose at the reaction. A prose description alone does not animate.

Return { "characters": [...], "scenes": [...], "props": [...], "shots": [...] }.
Character: {name, gender:"male"|"female"|"neutral", age:"child"|"young"|"adult"|"elder", costume, hair, primary:"#RRGGBB", accent:"#RRGGBB", skin:"#RRGGBB", moustache:boolean, glasses:boolean, voiceStyle}. For voiceStyle use tags such as "female, young adult, moderate pitch" or "male, elderly, low pitch".
Scene: {name, kind, palette:"#RRGGBB", artDirection:"specific architecture, environment, color, foreground, and layout to paint as an unpopulated backdrop"}. Prop: {name, kind, color:"#RRGGBB"}.
Shot: {block:1, name, scene, time, weather, mood, direction, minDuration:seconds, transition:"cut"|"fade", captionPosition:"bottom"|"top", camera:{frame,move,focus,x,y}, actors:[{character,x,y,size,face,pose,emotion,keys:[{at,x,y,pose,emotion}]}], props:[{prop,x,y,size,at,motion,holder}], dialogue:[{id:"D1",at:seconds,emotion}], sounds:[{kind,at,gain}]}.
Possible locations: ${locations.join(', ')}. Times: ${times.join(', ')}. Weather: ${weather.join(', ')}.
Frames: ${frames.join(', ')}. Camera moves: ${moves.join(', ')}. Mood and emotion: ${moods.join(', ')}.
Poses: ${poses.join(', ')}. Costumes: ${costumes.join(', ')}. Hairstyles: ${hairstyles.join(', ')}.
Prop types: ${propTypes.join(', ')}. Prop motion: none, sway, fall, roll, glow. Sound types: ${sounds.join(', ')}.
x and y are normalized positions in a 16:9 world; y is the foot position around .86, face is left/right/front/back. Put the central action inside x=.36 to .64 for vertical and close shots. Mark a moving actor as walk or run and give it a destination keyframe with an idle pose. Set a prop's holder to an on-screen actor only when they carry the prop. Explicit time cues are relative to the shot. Omit dialogue at when unspecified. Do not truncate lines to fit. Camera focus is the name of an actor, useful in a solo or close shot. Use narrative-appropriate reactions and sound accents, with room for speech.

Input JSON:
${JSON.stringify(brief)}`;
}

async function requestJson(url, headers, body, provider) {
  let response;
  try {
    response = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
      signal: AbortSignal.timeout(480000),
    });
  } catch (error) {
    throw new Error(`Could not reach ${provider}. Check its configuration and whether it is running. ${error.cause?.code || error.message}`);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${provider} returned HTTP ${response.status}: ${label(data.error?.message || data.error, 'Check the model ID and access.', 350)}`);
  return data;
}

async function generate(prompt, provider, model) {
  if (!model) throw new Error(`Enter an API model ID for ${provider}.`);
  if (provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('Set OPENAI_API_KEY in .env and restart the studio.');
    const data = await requestJson('https://api.openai.com/v1/responses', { Authorization: `Bearer ${apiKey}` },
      { model, input: prompt, text: { format: { type: 'json_object' } }, max_output_tokens: 24000, store: false }, 'OpenAI');
    if (data.status !== 'completed') throw new Error(`OpenAI returned an incomplete plan: ${data.incomplete_details?.reason || data.status}.`);
    return data.output?.flatMap(item => item.content || []).filter(item => item.type === 'output_text').map(item => item.text).join('\n');
  }
  if (provider === 'anthropic') {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('Set ANTHROPIC_API_KEY in .env and restart the studio.');
    const data = await requestJson('https://api.anthropic.com/v1/messages', { Authorization: `Bearer ${apiKey}`, 'anthropic-version': '2026-10-21' },
      { model, max_tokens: 16000, messages: [{ role: 'user', content: prompt }] }, 'Anthropic');
    if (data.stop_reason === 'max_tokens') throw new Error('The Claude storyboard was cut off. Try fewer shots at a time.');
    return data.content?.filter(item => item.type === 'text').map(item => item.text).join('\n');
  }
  const data = await requestJson(`${env.ollamaUrl.replace(/\/$/, '')}/api/chat`, {},
    { model, messages: [{ role: 'user', content: prompt }], stream: false, think: false, format: 'json', options: { temperature: 0.25, num_ctx: 16384, num_predict: 8192 } }, 'Ollama');
  return data.message?.content;
}

function bindDialogue(result, blocks, library) {
  const expected = blocks.flatMap((block, i) => block.cues.map(cue => ({ ...cue, block: i + 1 })));
  let next = 0;
  let previous = 0;
  const invalid = () => new Error('The planner changed or omitted a source shot or dialogue cue. Try again, use a stronger model, or plan fewer shots at once.');
  if (!Array.isArray(result?.shots)) throw invalid();
  const shots = result.shots.map(shot => {
    if (!Number.isInteger(shot.block) || shot.block < 1 || shot.block > blocks.length ||
      shot.block < previous || shot.block > previous + 1 || (shot.block === previous && blocks[shot.block - 1].title)) throw invalid();
    previous = shot.block;
    const block = blocks[shot.block - 1];
    const namedScene = library.scenes.find(scene => block.tags.includes(key(scene.name)));
    if (shot.dialogue != null && !Array.isArray(shot.dialogue)) throw invalid();
    const dialogue = (shot.dialogue || []).map(line => {
      const cue = expected[next++];
      if (!cue || cue.id !== line?.id || cue.block !== shot.block) throw invalid();
      return { ...cue, at: line.at, emotion: cue.emotion === 'neutral' ? line.emotion : cue.emotion };
    });
    return {
      ...shot, dialogue,
      direction: [...new Set([block.directions.join(' '), shot.direction].filter(Boolean))].join('\n'),
      ...(block.title ? { name: block.title } : {}),
      ...(namedScene ? { scene: namedScene.name } : {}),
      time: block.tags.find(tag => times.includes(tag)) || shot.time,
      camera: { ...shot.camera, frame: block.tags.find(tag => frames.includes(tag)) || shot.camera?.frame },
    };
  });
  if (next !== expected.length || previous !== blocks.length) throw invalid();
  return { ...result, shots };
}

export async function planScript(input, library) {
  const { title, ratio, language, script, planner = 'offline' } = input;
  const blocks = parseScript(script);
  const notes = label(input.notes, '', 12000);
  const metadata = { title, ratio, language };
  if (planner === 'offline') {
    const story = resolveStory({ ...metadata, shots: offline(blocks, library) }, library);
    if (notes) story.warnings.unshift('The offline planner uses the inline shot headings and bracketed directions. Use an AI planner for the separate production notes.');
    return story;
  }
  if (!Object.hasOwn(env.models, planner)) throw new Error('Choose Ollama, OpenAI, Anthropic, or Offline.');
  const raw = await generate(directorPrompt(blocks, notes, library, ratio), planner, label(input.model, env.models[planner], 180));
  let result;
  try {
    result = JSON.parse(raw?.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
  } catch {
    throw new Error('The AI planner did not return valid JSON. Try fewer shots or a different model.');
  }
  const bound = bindDialogue(result, blocks, library);
  for (const kind of assetKinds) {
    if (!Array.isArray(bound[kind])) continue;
    const existing = new Set(library[kind].map(item => key(item.name)));
    bound[kind] = bound[kind].filter(item => !existing.has(key(item?.name)));
  }
  return resolveStory({ ...bound, ...metadata }, library);
}
