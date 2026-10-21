// Thin JSON-RPC proxy so the RPC key in RPC_URL stays server-side. Only the methods the site uses are allowed.
import { json, RPC_URL } from '../lib/shared.mjs';

export const config = { path: '/api/rpc' };

const ALLOW = new Set([
  'getSlot',
  'getBalance',
  'getEpochInfo',
  'getRecentPerformanceSamples',
  'getSignatureStatuses',
  'sendTransaction',
]);

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Bad request' }, 400);
  }
  const calls = Array.isArray(body) ? body : [body];
  if (!calls.length || calls.length > 5 || calls.some((c) => !ALLOW.has(c?.method)))
    return json({ error: 'Method not allowed' }, 403);

  const r = await fetch(RPC_URL(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return new Response(await r.text(), {
    status: r.status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
};
