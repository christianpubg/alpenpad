// Builds an unsigned pump.fun create + dev buy transaction via PumpPortal's Local Transaction API.
// Only public keys are sent. The user's wallet and the browser-generated mint keypair sign it client-side.
import { json, clean, B58 } from '../lib/shared.mjs';

export const config = { path: '/api/create' };

const MIN_BUY = 0.1;
const MAX_BUY = Number(process.env.MAX_DEV_BUY || 50);

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let b;
  try {
    b = await req.json();
  } catch {
    return json({ error: 'Bad request' }, 400);
  }

  const publicKey = String(b.publicKey || '');
  const mint = String(b.mint || '');
  const name = clean(b.name, 32);
  const symbol = clean(b.symbol, 10).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const uri = String(b.uri || '');
  const amount = Number(b.amount);

  if (!B58.test(publicKey) || !B58.test(mint)) return json({ error: 'Invalid wallet or mint address' }, 400);
  if (!name || !symbol) return json({ error: 'Name and ticker are required' }, 400);
  if (!/^https:\/\/ipfs\.io\/ipfs\/[A-Za-z0-9]+$/.test(uri)) return json({ error: 'Invalid metadata URI' }, 400);
  if (!Number.isFinite(amount) || amount < MIN_BUY || amount > MAX_BUY)
    return json({ error: `Dev buy must be between ${MIN_BUY} and ${MAX_BUY} SOL` }, 400);

  const r = await fetch('https://pumpportal.fun/api/trade-local', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      publicKey,
      action: 'create',
      tokenMetadata: { name, symbol, uri },
      mint,
      denominatedInSol: 'true',
      amount,
      slippage: Number(process.env.SLIPPAGE || 10),
      priorityFee: Number(process.env.PRIORITY_FEE || 0.0005),
      pool: 'pump',
    }),
  });

  if (r.status !== 200) {
    const t = await r.text().catch(() => '');
    return json({ error: (t || r.statusText || 'PumpPortal error').slice(0, 200) }, 502);
  }

  return new Response(await r.arrayBuffer(), {
    headers: { 'content-type': 'application/octet-stream', 'cache-control': 'no-store' },
  });
};
