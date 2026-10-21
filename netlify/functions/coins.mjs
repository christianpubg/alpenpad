// The Alpenpad board. GET lists coins launched through the site.
// POST records a launch, but only after checking on-chain that the signature is a finalized,
// successful pump.fun transaction that touches the claimed mint.
import { getStore } from '@netlify/blobs';
import { json, clean, rpc, B58, SIG58 } from '../lib/shared.mjs';

export const config = { path: '/api/coins' };

const PUMP_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export default async (req) => {
  const store = getStore({ name: 'coins', consistency: 'strong' });

  if (req.method === 'GET') {
    const { blobs } = await store.list();
    const items = (await Promise.all(blobs.map((b) => store.get(b.key, { type: 'json' }))))
      .filter(Boolean)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 300);
    return json(items, 200, { 'cache-control': 'public, max-age=10' });
  }

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let b;
  try {
    b = await req.json();
  } catch {
    return json({ error: 'Bad request' }, 400);
  }
  const mint = String(b.mint || '');
  const signature = String(b.signature || '');
  if (!B58.test(mint) || !SIG58.test(signature)) return json({ error: 'Invalid mint or signature' }, 400);
  if (await store.get(mint)) return json({ ok: true });

  let tx = null;
  for (let i = 0; i < 4 && !tx; i++) {
    try {
      tx = await rpc('getTransaction', [
        signature,
        { commitment: 'finalized', encoding: 'json', maxSupportedTransactionVersion: 0 },
      ]);
    } catch {}
    if (!tx) await wait(800);
  }
  if (!tx || tx.meta?.err) return json({ error: 'Transaction is not finalized' }, 400);

  const keys = [
    ...(tx.transaction?.message?.accountKeys || []),
    ...(tx.meta?.loadedAddresses?.writable || []),
    ...(tx.meta?.loadedAddresses?.readonly || []),
  ];
  if (!keys.includes(mint) || !keys.includes(PUMP_PROGRAM))
    return json({ error: 'Not a pump.fun launch for this mint' }, 400);

  const image = String(b.image || '');
  const ms = Number(b.finalizedMs);
  const record = {
    mint,
    signature,
    creator: keys[0],
    name: clean(b.name, 32),
    ticker: clean(b.ticker, 10).toUpperCase(),
    image: /^https:\/\/ipfs\.io\/ipfs\/[A-Za-z0-9]+$/.test(image) ? image : '',
    finalizedMs: Number.isFinite(ms) && ms > 0 && ms < 120000 ? Math.round(ms) : null,
    createdAt: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
  };
  await store.setJSON(mint, record);
  return json({ ok: true });
};
