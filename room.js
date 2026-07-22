// Simple shared key-value storage for game rooms, backed by Upstash Redis
// (free tier). Replaces the artifact-only window.storage API so the game
// can sync across devices on a real deployment.
const BASE = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function upstash(parts) {
  const url = `${BASE}/${parts.map(encodeURIComponent).join('/')}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  return res.json();
}

export default async function handler(req, res) {
  if (!BASE || !TOKEN) {
    res.status(500).json({ error: 'UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set on the server.' });
    return;
  }

  const code = (req.query.code || '').toString().toUpperCase();
  if (!code) {
    res.status(400).json({ error: 'code query param is required' });
    return;
  }
  const key = `room:${code}`;

  try {
    if (req.method === 'GET') {
      const r = await upstash(['GET', key]);
      const room = r.result ? JSON.parse(r.result) : null;
      res.status(200).json({ room });
      return;
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      await upstash(['SET', key, JSON.stringify(body)]);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Unknown server error' });
  }
}
