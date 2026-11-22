import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
try {
  process.loadEnvFile(join(root, '.env'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
export const dataDir = join(root, 'data');
export const rendersDir = join(root, 'renders');
export const mediaDir = join(dataDir, 'media');
export const publicDir = join(root, 'public');
export const demoPath = join(root, 'examples', 'well-story.json');
export const env = {
  ffmpeg: process.env.FFMPEG || 'ffmpeg',
  python: process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3'),
  port: Number(process.env.PORT || 4177),
  ollamaUrl: process.env.OLLAMA_URL || 'http://127.0.0.1:11434',
  voiceUrl: process.env.VOICESTUDIO_URL || 'http://127.0.0.1:3900',
  voiceModel: process.env.VOICESTUDIO_MODEL || 'omnivoice',
  imageModel: process.env.OPENAI_IMAGE_MODEL || '',
  models: {
    openai: process.env.OPENAI_MODEL || 'gpt-6.1-sol',
    anthropic: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
    ollama: process.env.OLLAMA_MODEL || 'gemma4:latest',
  },
};

export const ratios = { '16:9': [1280, 720], '9:16': [720, 1280] };
export const locations = ['chowk', 'lane', 'field', 'river', 'courtyard', 'shop', 'home', 'school', 'temple'];
export const times = ['day', 'dawn', 'dusk', 'night'];
export const weather = ['clear', 'mist', 'rain'];
export const frames = ['wide', 'medium', 'close', 'detail'];
export const moves = ['static', 'push', 'pull', 'pan-left', 'pan-right'];
export const moods = ['neutral', 'happy', 'funny', 'sad', 'angry', 'worried', 'surprised'];
export const poses = ['idle', 'talk', 'open', 'point', 'think', 'walk', 'run', 'nod', 'shake', 'wave', 'fold', 'reach', 'hold', 'look', 'sneak', 'check-pocket', 'offer', 'read', 'flinch', 'listen', 'sniff', 'cheer', 'write', 'comfort', 'work', 'laugh', 'present', 'cradle', 'pass', 'scoop', 'attend', 'doze', 'hush', 'shiver', 'bow'];
export const stances = ['stand', 'sit', 'crouch', 'lie'];
export const propTypes = ['pot', 'well', 'bench', 'basket', 'sack', 'coin', 'lantern', 'cart', 'door', 'book', 'rope', 'pump', 'cycle', 'tree', 'sign', 'stall', 'goat', 'buffalo', 'wallet', 'open-wallet', 'envelope', 'postbox', 'note', 'letter', 'newspaper', 'key', 'soap', 'latch', 'photo', 'ticket', 'key-rack', 'tea', 'diya', 'cloth-pouch', 'open-pouch', 'banknotes', 'parcel', 'open-parcel', 'ribbon', 'piggy-bank', 'seed-sack', 'thali', 'umbrella', 'desk', 'pencil', 'clean-cloth', 'soap-key', 'tomato', 'soap-bar', 'jalebi', 'shawl', 'padlock', 'key-board', 'hanging-cloth', 'anklet', 'chest', 'dhol', 'open-sack', 'fair-wheel', 'puppet-show', 'chaak', 'shovel', 'coin-pile', 'quilt', 'pillow', 'chakki', 'roti', 'lota'];
export const sounds = ['funny', 'sad', 'angry', 'surprise', 'footstep', 'door', 'coin', 'birds', 'pot', 'water', 'wind', 'bell', 'thunder', 'goat', 'whoosh', 'twinkle'];
export const fxKinds = ['glitter', 'dust', 'rays', 'glow', 'embers', 'petals', 'fireflies', 'shimmer', 'leaves', 'fog', 'aura', 'coins'];
export const ambience = ['auto', 'quiet', 'village', 'night', 'market', 'room', 'river', 'rain'];
export const costumes = ['kurta', 'dhoti', 'shirt', 'vest', 'sari', 'salwar', 'ascetic'];
export const hairstyles = ['crop', 'part', 'bun', 'braid', 'grey', 'turban', 'topi', 'bald', 'jata'];
export const assetKinds = ['characters', 'scenes', 'props'];

export function hash(value) {
  let seed = 2166136261;
  for (const char of String(value)) seed = Math.imul(seed ^ char.codePointAt(0), 16777619);
  return seed >>> 0;
}

export function key(value) {
  return String(value).normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function label(value, fallback = '', max = 160) {
  return typeof value === 'string' ? value.trim().slice(0, max) || fallback : fallback;
}

export function number(value, fallback, min, max) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
}

export function mediaPath(id) {
  if (!/^[a-f0-9]{32}\.(jpg|jpeg|png|webp|wav|mp3|m4a|ogg|flac)$/.test(id || '')) {
    throw new Error('Choose a file from the studio media library.');
  }
  return resolve(mediaDir, id);
}
