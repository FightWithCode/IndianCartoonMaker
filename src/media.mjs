import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { mediaDir, mediaPath } from './settings.mjs';

export const mediaTypes = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.flac': 'audio/flac',
};

async function writeOnce(file, bytes) {
  const temporary = join(mediaDir, `${randomUUID()}.tmp`);
  await writeFile(temporary, bytes);
  await rename(temporary, file);
}

export async function storeMedia(name, bytes) {
  const extension = extname(name).toLowerCase();
  const type = mediaTypes[extension];
  if (!type) throw new Error('Choose a JPG, PNG, WebP, WAV, MP3, M4A, OGG, or FLAC file.');
  if (!bytes.length) throw new Error('The selected file is empty.');
  const id = createHash('sha256').update(bytes).digest('hex').slice(0, 32) + extension;
  const item = { id, name, bytes: bytes.length, type: type.split('/')[0] };
  await mkdir(mediaDir, { recursive: true });
  await writeOnce(mediaPath(id), bytes);
  await writeOnce(join(mediaDir, id + '.json'), JSON.stringify(item));
  return item;
}

export async function listMedia() {
  const files = await readdir(mediaDir).catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return [];
  });
  return Promise.all(files.filter(file => /^[a-f0-9]{32}\.[a-z0-9]{3,4}\.json$/.test(file)).map(async file =>
    JSON.parse(await readFile(join(mediaDir, file), 'utf8'))));
}
