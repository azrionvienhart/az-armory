/* Az.Armory download gate — Cloudflare Worker
   /auth?p=azware      → sends the visitor to Discord login (identify + guilds)
   /callback           → checks they're in Azrion's server, sends them back to the site with a short-lived token
   /download?t=TOKEN   → verifies the token, redirects to the GitHub Release file
   Secrets (wrangler secret put): DISCORD_CLIENT_SECRET, SIGNING_KEY
   Vars (wrangler.toml): DISCORD_CLIENT_ID, GUILD_ID, SITE_URL */

const PRODUCTS = {
  // one entry per downloadable version (the site sends p=<product>-<platform>)
  // sset = a file in worker/files/ (private: only handed out after the password + Discord checks)
  'azware-pc': { page: 'azware.html', asset: '/Azware-v1.0-Windows.zip' }
  // 'azware-mobile': { page: 'azware.html', file: '...' }
};

const enc = new TextEncoder();
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => atob(s.replace(/-/g, '+').replace(/_/g, '/'));

async function hmac(key, data) {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', k, enc.encode(data)));
}
async function sign(env, obj) {
  const body = b64u(enc.encode(JSON.stringify(obj)));
  return body + '.' + await hmac(env.SIGNING_KEY, body);
}
async function verify(env, tok) {
  const [body, sig] = (tok || '').split('.');
  if (!body || !sig || sig !== await hmac(env.SIGNING_KEY, body)) return null;
  const o = JSON.parse(unb64u(body));
  return o.exp > Date.now() ? o : null;
}
const back = (env, page, q) => Response.redirect(`${env.SITE_URL.replace(/\/$/, '')}/${page}?${q}#get`, 302);

// Download password: stored only as the DOWNLOAD_PASSWORD secret, never in the public site code.
// Case-sensitive, compared in constant time. Fails closed if the secret isn't set.
async function passOk(env, k) {
  if (!env.DOWNLOAD_PASSWORD || !k) return false;
  const norm = s => String(s).trim();
  const [a, b] = await Promise.all([norm(k), norm(env.DOWNLOAD_PASSWORD)].map(s => crypto.subtle.digest('SHA-256', enc.encode(s))));
  const x = new Uint8Array(a), y = new Uint8Array(b); let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const redirectUri = `${url.origin}/callback`;

    // instant check for the site's password box (answers only ok: true/false)
    if (url.pathname === '/check') {
      const ok = await passOk(env, url.searchParams.get('k'));
      if (!ok) await new Promise(r => setTimeout(r, 600)); // slows guessing
      return new Response(JSON.stringify({ ok }), { headers: {
        'Content-Type': 'application/json', 'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': new URL(env.SITE_URL).origin } });
    }

    if (url.pathname === '/auth') {
      const p = url.searchParams.get('p');
      if (!PRODUCTS[p]) return new Response('Unknown product', { status: 400 });
      if (!(await passOk(env, url.searchParams.get('k')))) return back(env, PRODUCTS[p].page, 'gate=badpass');
      const state = await sign(env, { p, n: crypto.randomUUID(), exp: Date.now() + 10 * 60e3 });
      const q = new URLSearchParams({ client_id: env.DISCORD_CLIENT_ID, redirect_uri: redirectUri, response_type: 'code', scope: 'identify guilds', state, prompt: 'none' });
      return Response.redirect('https://discord.com/oauth2/authorize?' + q, 302);
    }

    if (url.pathname === '/callback') {
      const st = await verify(env, url.searchParams.get('state'));
      if (!st) return new Response('Link expired. Go back to the site and try again.', { status: 400 });
      const prod = PRODUCTS[st.p];
      const code = url.searchParams.get('code');
      if (!code) return back(env, prod.page, 'gate=cancelled');

      const tr = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: env.DISCORD_CLIENT_ID, client_secret: env.DISCORD_CLIENT_SECRET, grant_type: 'authorization_code', code, redirect_uri: redirectUri })
      });
      if (!tr.ok) return back(env, prod.page, 'gate=error');
      const { access_token } = await tr.json();

      const gr = await fetch('https://discord.com/api/users/@me/guilds', { headers: { Authorization: `Bearer ${access_token}` } });
      if (!gr.ok) return back(env, prod.page, 'gate=error');
      const guilds = await gr.json();
      if (!guilds.some(g => g.id === env.GUILD_ID)) return back(env, prod.page, 'gate=notmember');

      const t = await sign(env, { p: st.p, exp: Date.now() + 10 * 60e3 });
      return back(env, prod.page, 'dl=' + encodeURIComponent(t));
    }

    if (url.pathname === '/download') {
      const t = await verify(env, url.searchParams.get('t'));
      if (!t || !PRODUCTS[t.p]) return new Response('Download link expired. Unlock again on the site.', { status: 403 });
      const prod = PRODUCTS[t.p];
      if (prod.file) return Response.redirect(prod.file, 302);
      const r = await env.ASSETS.fetch(new Request(new URL(prod.asset, url.origin)));
      if (!r.ok) return new Response('File not found.', { status: 404 });
      const h = new Headers(r.headers);
      h.set('Content-Disposition', `attachment; filename="${prod.asset.split('/').pop()}"`);
      h.set('Cache-Control', 'no-store');
      return new Response(r.body, { status: 200, headers: h });
    }

    return new Response('Az.Armory gate', { status: 200 });
  }
};
