// Shared presets and variations for Stripe Studio, stored in Vercel Blob.
// Needs a Blob store connected to this project (adds BLOB_READ_WRITE_TOKEN).
// Optional: set PRESETS_KEY to require a team key for saving and deleting.
// Optional: set BLOB_ACCESS=private if your Blob store is private (default public).
import { put, list, del, get } from '@vercel/blob';
import { randomUUID } from 'node:crypto';

const PREFIX = 'stripe-studio/';
const ACCESS = process.env.BLOB_ACCESS === 'private' ? 'private' : 'public';
const MAX_BYTES = 2_000_000;

async function readBlob(b) {
  if (ACCESS === 'private') {
    const r = await get(b.pathname, { access: 'private', useCache: false });
    return JSON.parse(await new Response(r.stream).text());
  }
  const r = await fetch(b.url, { cache: 'no-store' });
  if (!r.ok) throw new Error('fetch ' + r.status);
  return r.json();
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  return req.body;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') {
      const blobs = [];
      let cursor;
      do {
        const r = await list({ prefix: PREFIX, cursor, limit: 1000 });
        blobs.push(...r.blobs);
        cursor = r.hasMore ? r.cursor : undefined;
      } while (cursor);
      const items = (await Promise.all(blobs.map(async b => {
        try { const j = await readBlob(b); return { ...j, url: b.url }; } catch { return null; }
      }))).filter(Boolean).sort((a, b) => String(a.savedAt).localeCompare(String(b.savedAt)));
      return res.status(200).json({ items });
    }

    const key = process.env.PRESETS_KEY;
    if (key && req.headers['x-presets-key'] !== key) return res.status(401).json({ error: 'Team key needed' });
    const body = parseBody(req);

    if (req.method === 'POST') {
      const { kind, name, v, base, data, replaceUrl } = body;
      if (!['preset', 'variation'].includes(kind) || !name || !data || typeof data.P !== 'object') {
        return res.status(400).json({ error: 'Invalid preset' });
      }
      const item = {
        kind, name: String(name).slice(0, 80), v: v || null, base: base || null,
        id: typeof body.id === 'string' ? body.id.slice(0, 40) : 'u' + randomUUID().slice(0, 8),
        data, savedAt: new Date().toISOString(),
      };
      const json = JSON.stringify(item);
      if (json.length > MAX_BYTES) return res.status(413).json({ error: 'Preset is too large' });
      const blob = await put(`${PREFIX}${kind}.json`, json, {
        access: ACCESS, contentType: 'application/json', addRandomSuffix: true,
      });
      if (typeof replaceUrl === 'string' && replaceUrl.includes('/' + PREFIX)) await del(replaceUrl).catch(() => {});
      return res.status(200).json({ url: blob.url, id: item.id });
    }

    if (req.method === 'DELETE') {
      const { url } = body;
      if (typeof url !== 'string' || !url.includes('/' + PREFIX)) return res.status(400).json({ error: 'Invalid url' });
      await del(url);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
