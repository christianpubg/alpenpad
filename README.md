# Alpenpad

Launch Solana coins from your own site. Coins are created on pump.fun's program, signed in the user's wallet, and the site waits for the **finalized** commitment (≈150ms on chain since Alpenglow).

## How a launch works

1. The browser sends the image and details to `/api/ipfs`, which pins the image and metadata JSON to IPFS (Pinata).
2. The browser generates a fresh mint keypair. Its secret key never leaves the browser.
3. `/api/create` asks PumpPortal's Local Transaction API for an unsigned create + dev buy transaction. Only public keys are sent.
4. The user's wallet signs, then the mint keypair signs, and the site sends it through `/api/rpc`.
5. The site polls the signature until it's `finalized`, and shows the measured time from send to finalized.
6. `/api/coins` checks on-chain that the transaction is a finalized, successful pump.fun launch for that mint, then adds it to the board (stored in Netlify Blobs).

## Deploy (GitHub → Netlify)

1. **Push this folder to a new GitHub repo.**
   ```bash
   git init && git add . && git commit -m "Alpenpad"
   git branch -M main
   git remote add origin https://github.com/YOUR_NAME/alpenpad.git
   git push -u origin main
   ```
2. **Get a Pinata JWT** (free): pinata.cloud → API Keys → New Key (admin or Files write) → copy the JWT.
3. **Get an RPC URL**: a Helius (or any mainnet) RPC URL, e.g. `https://mainnet.helius-rpc.com/?api-key=...`. The public RPC rate-limits hard, so use your own.
4. **Netlify** → Add new site → Import an existing project → GitHub → pick the repo.
   - Build command: leave empty
   - Publish directory: `.`
5. **Site configuration → Environment variables**, add:

   | Key | Value |
   |---|---|
   | `PINATA_JWT` | your Pinata JWT |
   | `RPC_URL` | your mainnet RPC URL |
   | `PRIORITY_FEE` | optional, SOL, default `0.0005` |
   | `SLIPPAGE` | optional, percent, default `10` |
   | `MAX_DEV_BUY` | optional, SOL, default `50` |

6. Trigger a redeploy (Deploys → Trigger deploy). Every push to `main` redeploys automatically.

Test the first launch yourself with the 0.1 SOL minimum dev buy.

## Costs

- PumpPortal: no fee for creation; **0.5%** on the dev buy (Local API).
- pump.fun's own bonding curve fees and normal Solana network fees apply.
- Pinata free tier covers a lot of launches; Netlify free tier covers the functions and Blobs.

## Files

```
index.html                    the whole site (single file)
netlify/functions/ipfs.mjs    image + metadata → IPFS
netlify/functions/create.mjs  unsigned create tx from PumpPortal
netlify/functions/rpc.mjs     RPC proxy (keeps your RPC key private)
netlify/lib/shared.mjs        helpers used by the functions
netlify/functions/coins.mjs   board: verified launches in Netlify Blobs
netlify.toml                  Netlify config
```
