// Uploads the coin image and its metadata JSON to IPFS (Pinata) and returns the metadata URI.
// pump.fun no longer accepts direct metadata uploads, so a pinning service is required.
import { json, clean, cleanUrl } from '../lib/shared.mjs';

export const config = { path: '/api/ipfs' };

const MAX_BYTES = 4 * 1024 * 1024;
const TYPES = /^image\/(png|jpe?g|gif|webp)$/;

async function pin(jwt, blob, filename) {
  const fd = new FormData();
  fd.append('network', 'public');
  fd.append('file', blob, filename);
  const r = await fetch('https://uploads.pinata.cloud/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: fd,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j?.data?.cid) throw new Error('IPFS upload failed');
  return `https://ipfs.io/ipfs/${j.data.cid}`;
}

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const jwt = process.env.PINATA_JWT;
  if (!jwt) return json({ error: 'Server is missing PINATA_JWT' }, 500);

  let fd;
  try {
    fd = await req.formData();
  } catch {
    return json({ error: 'Bad form data' }, 400);
  }

  const file = fd.get('file');
  const name = clean(fd.get('name'), 32);
  const symbol = clean(fd.get('symbol'), 10).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!file || typeof file === 'string') return json({ error: 'Add a coin image' }, 400);
  if (!TYPES.test(file.type)) return json({ error: 'Image must be PNG, JPG, GIF or WEBP' }, 400);
  if (file.size > MAX_BYTES) return json({ error: 'Image must be under 4MB' }, 400);
  if (!name || !symbol) return json({ error: 'Name and ticker are required' }, 400);

  try {
    const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
    const image = await pin(jwt, file, `${symbol.toLowerCase()}.${ext}`);
    const metadata = {
      name,
      symbol,
      description: clean(fd.get('description'), 280),
      image,
      showName: true,
      createdOn: process.env.URL || 'https://alpenpad',
      twitter: cleanUrl(fd.get('twitter')),
      telegram: cleanUrl(fd.get('telegram')),
      website: cleanUrl(fd.get('website')),
    };
    const metadataUri = await pin(
      jwt,
      new Blob([JSON.stringify(metadata)], { type: 'application/json' }),
      'metadata.json',
    );
    return json({ metadataUri, image });
  } catch (e) {
    return json({ error: e.message || 'IPFS upload failed' }, 502);
  }
};
