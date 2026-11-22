import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { demoPath, env, label, mediaPath, publicDir } from './settings.mjs';
import { planScript } from './plan.mjs';
import { readLibrary, resolveStory, saveLibrary, verifyMedia } from './story.mjs';
import { localVoices, previewTimeline } from './sound.mjs';
import { exportFile, readHistory, readJob, startExport } from './export.mjs';
import { listMedia, mediaTypes, storeMedia } from './media.mjs';
import { paintScene } from './paint.mjs';

const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.srt': 'text/plain; charset=utf-8', '.mp4': 'video/mp4',
  ...mediaTypes,
};
const staticFiles = new Set(['/', '/app.js', '/draw.js', '/inserts.js', '/scenery.js', '/rig-lib.js', '/face.js', '/lipsync.js', '/cast.js', '/canvas.js', '/styles.css', '/plates/banyan-square.jpg']);
let exporting = false;

function json(res, code, value) {
  res.writeHead(code, { 'Content-Type': types['.json'], 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}

async function collect(req, max) {
  const parts = [];
  let bytes = 0;
  let tooLarge = false;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > max) tooLarge = true;
    if (!tooLarge) parts.push(chunk);
  }
  if (tooLarge) throw new Error(`Maximum request size is ${max / 1024 / 1024} MB.`);
  return Buffer.concat(parts);
}

async function body(req) {
  if (req.headers['content-type']?.split(';')[0] !== 'application/json') throw new Error('Send an application/json request.');
  try {
    return JSON.parse((await collect(req, 3 * 1024 * 1024)).toString('utf8'));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error('The request is not valid JSON.');
    throw error;
  }
}

function byteRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) return null;
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  return start < size && end >= start ? { start, end } : null;
}

async function serveFile(req, res, file, downloadName) {
  const info = file ? await stat(file).catch(() => null) : null;
  if (!info?.isFile()) return json(res, 404, { error: 'File not found.' });
  const headers = {
    'Content-Type': types[extname(file)] || 'application/octet-stream',
    'Accept-Ranges': 'bytes', 'Content-Length': info.size, 'Cache-Control': 'no-cache',
  };
  if (downloadName) headers['Content-Disposition'] = `attachment; filename="${downloadName}"`;
  const range = req.headers.range ? byteRange(req.headers.range, info.size) : undefined;
  if (range === null) {
    res.writeHead(416, { 'Content-Range': `bytes */${info.size}` });
    return res.end();
  }
  if (range) {
    headers['Content-Length'] = range.end - range.start + 1;
    headers['Content-Range'] = `bytes ${range.start}-${range.end}/${info.size}`;
  }
  res.writeHead(range ? 206 : 200, headers);
  if (req.method === 'HEAD') return res.end();
  const source = createReadStream(file, range);
  source.on('error', () => res.destroy());
  res.on('close', () => source.destroy());
  source.pipe(res);
}

async function importMedia(req, url) {
  const name = label(url.searchParams.get('name'), '', 160);
  const bytes = await collect(req, 30 * 1024 * 1024);
  return storeMedia(name, bytes);
}

async function handle(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host || '')) return json(res, 403, { error: 'Open the studio on localhost.' });
  if ((req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) || req.headers['sec-fetch-site'] === 'cross-site') {
    return json(res, 403, { error: 'Cross-origin access is disabled.' });
  }
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  if (req.method === 'GET' || req.method === 'HEAD') {
    if (staticFiles.has(path)) return serveFile(req, res, join(publicDir, path === '/' ? 'index.html' : path.slice(1)));
    if (path.startsWith('/media/')) return serveFile(req, res, mediaPath(path.slice(7)));
    const rendered = path.match(/^\/renders\/([^/]+)\/([^/]+)$/);
    if (rendered) return serveFile(req, res, exportFile(rendered[1], rendered[2]), url.searchParams.has('download') ? rendered[2] : null);
    if (path === '/api/setup') return json(res, 200, {
      models: env.models, voiceModel: env.voiceModel, openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
      anthropicConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
      paintingConfigured: Boolean(process.env.OPENAI_API_KEY && env.imageModel),
    });
    if (path === '/api/demo') {
      const file = url.searchParams.get('language') === 'hi' ? demoPath.replace(/\.json$/, '-hi.json') : demoPath;
      return json(res, 200, { story: JSON.parse(await readFile(file, 'utf8')), script: await readFile(file.replace(/\.json$/, '.txt'), 'utf8') });
    }
    if (path === '/api/library') return json(res, 200, { ...await readLibrary(), media: await listMedia() });
    if (path === '/api/voices') return json(res, 200, await localVoices());
    if (path === '/api/history') return json(res, 200, await readHistory());
    if (path.startsWith('/api/jobs/')) {
      const job = await readJob(path.slice(10));
      return json(res, job ? 200 : 404, job || { error: 'Export not found.' });
    }
  }
  if (req.method === 'POST') {
    if (path === '/api/media') return json(res, 201, await importMedia(req, url));
    if (path === '/api/plan') return json(res, 200, await planScript(await body(req), await readLibrary()));
    if (['/api/preview', '/api/render', '/api/library', '/api/paint'].includes(path)) {
      const input = await body(req);
      const story = resolveStory(input.story, await readLibrary());
      await verifyMedia(story);
      if (path === '/api/preview') return json(res, 200, previewTimeline(story));
      if (path === '/api/paint') return json(res, 201, await paintScene(story, label(input.scene, '', 100)));
      if (path === '/api/library') return json(res, 200, await saveLibrary(story, true));
      if (exporting) return json(res, 409, { error: 'An export is running. Start another after it finishes.' });
      exporting = true;
      try {
        const { id, done } = await startExport(story, input.settings || {});
        done.finally(() => { exporting = false; }).catch(console.error);
        return json(res, 202, { id });
      } catch (error) {
        exporting = false;
        throw error;
      }
    }
  }
  return json(res, 404, { error: 'Route not found.' });
}

createServer((req, res) => {
  handle(req, res).catch(error => {
    if (res.headersSent) return res.destroy();
    json(res, 400, { error: error.message });
  });
}).listen(env.port, '127.0.0.1', () => console.log(`Gaon Studio is ready at http://127.0.0.1:${env.port}`));
