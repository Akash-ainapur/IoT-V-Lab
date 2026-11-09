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
/* ---- per-student record, saved on the Clerk user (unsafeMetadata): usn, name, sec, p{expId:{u,e,d,h,a,t}} ---- */
let cache = null, timer = null;
function getCache() { const u = window.Clerk && window.Clerk.user; if (!u) return null; if (!cache) cache = JSON.parse(JSON.stringify(u.unsafeMetadata || {})); return cache; }
function flush() { clearTimeout(timer); timer = null; const u = window.Clerk && window.Clerk.user; if (u && cache) u.update({unsafeMetadata: cache}).catch(e => console.warn('save failed', e)); }
A.rec = function (id, fn) {      // fn mutates {u:uploads, e:compile errors, d:done, h:hints, a:autowire}
  const m = getCache(); if (!m) return;
  const p = m.p || (m.p = {}); const e = p[id] || (p[id] = {u: 0, e: 0, d: 0, h: 0, a: 0});
  fn(e); e.t = new Date().toISOString().slice(0, 16);
  clearTimeout(timer); timer = setTimeout(flush, 1500);
};
A.track = exp => A.rec(exp.id, () => {});
window.addEventListener('beforeunload', () => { if (timer) flush(); });

function showProfile() {
  if (document.getElementById('profModal')) return;
  const m = getCache() || {};
  const ov = document.createElement('div'); ov.id = 'profModal'; ov.className = 'modal';
  ov.innerHTML = '<form class="box"><h3>👋 One quick thing</h3><p>Your lab progress is recorded for your instructor (experiments opened, completed, uploads, errors, hint use).</p>'
    + '<label>Full name<input name="n" required maxlength="60"></label><label>USN<input name="usn" required maxlength="20" placeholder="1MJ22CS014" style="text-transform:uppercase"></label>'
    + '<label>Section / Class<input name="sec" required maxlength="20" placeholder="CSE 7 A"></label><button class="btn pri" type="submit">Save &amp; continue</button></form>';
  document.body.appendChild(ov);
  const f = ov.querySelector('form'); f.n.value = m.n || ''; f.usn.value = m.usn || ''; f.sec.value = m.sec || '';
  f.onsubmit = ev => {
    ev.preventDefault(); const c = getCache(); if (!c) return;
    c.n = f.n.value.trim(); c.usn = f.usn.value.trim().toUpperCase(); c.sec = f.sec.value.trim();
    flush(); ov.remove();
  };
}
A.showProfile = showProfile;
function ensureProfile() { const m = getCache(); if (m && !m.usn) showProfile(); }

function refresh() {
  const was = A.signedIn; A.signedIn = !!(window.Clerk && window.Clerk.user); if (!A.signedIn || !was) cache = null;
  const box = document.getElementById('auth'); if (!box) return;
  box.innerHTML = '';
  if (A.signedIn) { const d = document.createElement('div'); box.appendChild(d); window.Clerk.mountUserButton(d); }
  else { const b = document.createElement('button'); b.className = 'btn pri'; b.textContent = '🔐 Sign in'; b.onclick = A.prompt; box.appendChild(b); const n = document.createElement('small'); n.className = 'cons'; n.textContent = 'Signing in records your lab progress for your instructor.'; box.prepend(n); }
  if (A.signedIn) ensureProfile();
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
