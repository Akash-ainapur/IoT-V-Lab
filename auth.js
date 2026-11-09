/* Clerk login gate: only the free experiment works signed-out; everything else asks for sign-in. */
(function () {
'use strict';
const cfg = window.APP_CONFIG || {}; const A = window.Auth = {ready: false, signedIn: false, onChange: null};
const free = new Set(cfg.FREE_EXPERIMENTS || ['1']);
A.allowed = exp => free.has(exp.id) || A.signedIn;
A.configured = !!cfg.CLERK_PUBLISHABLE_KEY;
A.prompt = function () {
  if (window.Clerk && window.Clerk.loaded) { window.Clerk.openSignIn({}); return; }
  alert(A.configured ? 'Login is still loading – try again in a moment.' : 'Login is not configured yet (add the Clerk key in config.js).');
};
A.track = function (exp) { // store which experiments each user opened (visible in Clerk dashboard → user → metadata)
  const u = window.Clerk && window.Clerk.user; if (!u) return;
  const meta = Object.assign({}, u.unsafeMetadata || {}); const set = new Set(meta.experiments || []);
  if (set.has(exp.id)) return; set.add(exp.id); meta.experiments = [...set]; meta.lastSeen = new Date().toISOString();
  u.update({unsafeMetadata: meta}).catch(() => {});
};
function refresh() {
  A.signedIn = !!(window.Clerk && window.Clerk.user);
  const box = document.getElementById('auth'); if (!box) return;
  box.innerHTML = '';
  if (A.signedIn) { const d = document.createElement('div'); box.appendChild(d); window.Clerk.mountUserButton(d); }
  else { const b = document.createElement('button'); b.className = 'btn pri'; b.textContent = '🔐 Sign in'; b.onclick = A.prompt; box.appendChild(b); }
  if (A.onChange) A.onChange(A.signedIn);
}
A.init = function () {
  refresh();
  if (!A.configured) return;
  const key = cfg.CLERK_PUBLISHABLE_KEY; let host;
  try { host = atob(key.split('_').slice(2).join('_')).replace(/\$$/, ''); } catch (e) { console.error('Bad Clerk key'); return; }
  const s = document.createElement('script'); s.async = true; s.crossOrigin = 'anonymous';
  s.setAttribute('data-clerk-publishable-key', key); s.src = 'https://' + host + '/npm/@clerk/clerk-js@5/dist/clerk.browser.js';
  s.onload = async () => { try { await window.Clerk.load(); A.ready = true; window.Clerk.addListener(refresh); refresh(); } catch (e) { console.error(e); } };
  document.head.appendChild(s);
};
})();
