# Az.Armory — by Azrion

Static site (GitHub Pages) + a free Cloudflare Worker for Discord-verified downloads.

| Path | What |
|---|---|
| `index.html` | Store home |
| `azware.html` | Azware page (video, walkthrough, live app, unlock gate, FAQ) |
| `opticore.html` | OptiCore "coming soon" page |
| `assets/js/config.js` | **The only file you edit**: links, video IDs, downloads, worker URL |
| `app/azware/` | Browser demo of Azware; `demo-lock.js` locks callsign, The Ascent and Confession |
| `worker/` | Discord verification worker → see `worker/SETUP.md` |
| `tools/package-azware.ps1` | Re-zips the latest Azware build (`Azware\dist`) and rebuilds the demo. Run after every Azware update. |
| `tools/serve.js` | Local preview: `node tools/serve.js` → http://localhost:8820 |
| `tools/og.html`, `tools/icon.html` | Sources for `assets/img/og.png` (link preview) and `icon-512.png` |

## Publish (first time)
1. Create a **public** repo named `az-armory` on github.com/azrionvienhart.
2. From this folder:
   ```
   git init -b main
   git add .
   git commit -m "Az.Armory v1"
   git remote add origin https://github.com/azrionvienhart/az-armory.git
   git push -u origin main
   ```
3. Repo → **Settings → Pages** → Source: *Deploy from a branch* → `main` / `root` → Save.
   The site goes live at **https://azrionvienhart.github.io/az-armory/** in about a minute.
4. Repo → **Releases → Draft a new release** → tag `azware-v1.0` → attach `release/Azware.zip` → Publish.
   (The site links to `releases/latest/download/Azware.zip`, so new releases are picked up automatically.)
5. Follow `worker/SETUP.md` to turn on Discord verification.

## Add your video (when it's out)
In `assets/js/config.js` set `videoId` for the product, e.g. for `https://www.youtube.com/watch?v=AbC123xYz` use `'AbC123xYz'`. Commit and push.
The player is click-to-play, so every play is a real, monetizable view.

## Add a new product
1. Add an entry to `products` in `assets/js/config.js` (name, status, category, tagline, icon, art, page, features, videoId, download). The Store menu and the home catalogue update automatically; filter chips appear past 4 products.
2. Set `latest` in config.js to show it as the Store menu's big "Latest drop" card.
3. Copy `azware.html` as the template for its page (or `opticore.html` for a coming-soon page) and set `data-product` on the gate.
4. Add it to `PRODUCTS` in `worker/worker.js` so the Discord-verified download works.
