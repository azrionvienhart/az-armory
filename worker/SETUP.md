# Discord verification setup (free, ~10 minutes)

This makes the "Join the Discord" step on Az.Armory **actually verified**: the download only starts if the visitor is in Azrion's VOID (guild `1138073844779851816`).

## 1. Create the Discord app
1. Go to https://discord.com/developers/applications → **New Application** → name it `Az.Armory`.
2. **OAuth2** tab → copy the **Client ID**. Click **Reset Secret** → copy the **Client Secret** (keep it private).
3. Leave the Redirects empty for now (you add them in step 3).

## 2. Deploy the worker (Cloudflare, free plan)
1. Create a free account at https://dash.cloudflare.com.
2. In a terminal inside this `worker` folder:
   ```
   npx wrangler login
   ```
3. Open `wrangler.toml` and paste your **Client ID** into `DISCORD_CLIENT_ID`.
4. Add the two secrets. When prompted, paste the Discord secret, then any long random password for signing:
   ```
   npx wrangler secret put DISCORD_CLIENT_SECRET
   npx wrangler secret put SIGNING_KEY
   ```
5. Deploy:
   ```
   npx wrangler deploy
   ```
   It prints a URL like `https://azarmory-gate.<you>.workers.dev`.

## 3. Connect everything
1. Back in the Discord app → **OAuth2 → Redirects** → add: `https://azarmory-gate.<you>.workers.dev/callback`
2. In the site, open `assets/js/config.js` and set:
   `workerUrl: 'https://azarmory-gate.<you>.workers.dev'`
3. Commit and push. Done: the final button now says **Verify Discord & download**.

## How it works
Visitor clicks the button → Discord login ("Az.Armory wants to know which servers you're in") → the worker checks your server is in their list → it sends them back to the site with a 10-minute signed link → the zip downloads.
The worker never stores anything. YouTube and Instagram stay honor-based (no API exists to verify an Instagram follow, and YouTube forbids requiring subscriptions).
