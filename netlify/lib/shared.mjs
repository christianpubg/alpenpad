export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers },
  });

export const clean = (v, max) =>
  String(v ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, max);

export const cleanUrl = (v) => {
  const s = clean(v, 200);
  if (!s) return '';
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : '';
  } catch {
    return '';
  }
};

export const B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const SIG58 = /^[1-9A-HJ-NP-Za-km-z]{64,90}$/;

export const RPC_URL = () => process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';

export async function rpc(method, params) {
  const r = await fetch(RPC_URL(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message || 'RPC error');
  return j.result;
}
