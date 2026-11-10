/* UI glue: experiment picker, code editor, upload, serial monitor, mission checker, controls. */
(function () {
'use strict';
const S = SIM, W = World, $ = id => document.getElementById(id);
let exp = null, missionDone = false, uploaded = false;
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

/* ---------- tabs ---------- */
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
  const bar = t.parentElement; bar.querySelectorAll('.tab').forEach(x => x.classList.remove('act')); t.classList.add('act');
  const box = bar.parentElement; box.querySelectorAll(':scope > .pane').forEach(p => p.classList.toggle('act', p.id === t.dataset.p));
}));
const showTab = id => { const t = document.querySelector('.tab[data-p="' + id + '"]'); if (t) t.click(); };

/* ---------- console + serial ---------- */
function log(kind, msg) {
  const c = $('con'); const d = document.createElement('div'); d.className = kind; d.textContent = msg; c.appendChild(d); c.scrollTop = c.scrollHeight;
  while (c.children.length > 200) c.removeChild(c.firstChild);
}
S.onLog = log;
let serBuf = '', serDirty = false;
S.onSerial = (chunk, baud) => {
  if (+$('baud').value !== baud) chunk = chunk.replace(/[^\r\n]/g, () => '�');
  serBuf += chunk; if (serBuf.length > 20000) serBuf = serBuf.slice(-15000); serDirty = true; W.txUntil = performance.now() + 60;
};
setInterval(() => { if (serDirty) { const m = $('ser'); m.textContent = serBuf.replace(/\r/g, ''); m.scrollTop = m.scrollHeight; serDirty = false; } }, 80);
function sendSerial() {
  const i = $('serIn'); if (!i.value && $('le').value === '') return;
  S.serialIn(i.value + JSON.parse('"' + $('le').value.replace(/\n/g, '\\n').replace(/\r/g, '\\r') + '"')); W.txUntil = performance.now() + 120; i.value = '';
}
$('serSend').onclick = sendSerial; $('serIn').addEventListener('keydown', e => { if (e.key === 'Enter') sendSerial(); });
$('serClr').onclick = () => { serBuf = ''; serDirty = true; };

/* ---------- editor ---------- */
const code = $('code'), gut = $('gut'); let errLine = 0;
function gutter() {
  const n = code.value.split('\n').length; let h = '';
  for (let i = 1; i <= n; i++) h += (i === errLine ? '<span class="err">' + i + '</span>' : i + '\n');
  gut.innerHTML = h; gut.scrollTop = code.scrollTop;
}
code.addEventListener('input', () => { errLine = 0; gutter(); if (exp) store.set('iot3d:' + exp.id, code.value); });
code.addEventListener('scroll', () => { gut.scrollTop = code.scrollTop; });
code.addEventListener('keydown', e => {
  if (e.key === 'Tab') { e.preventDefault(); const s = code.selectionStart; code.setRangeText('  ', s, code.selectionEnd, 'end'); code.dispatchEvent(new Event('input')); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); upload(); }
});

/* ---------- upload ---------- */
function setStatus(t, cls) { const s = $('status'); s.textContent = t; s.style.borderColor = cls === 'run' ? '#2fe08a' : cls === 'err' ? '#ff5d5d' : ''; }
function upload() {
  W.audioInit(); const r = ArduinoCompiler.compile(code.value);
  Auth.rec(exp.id, e => { r.ok ? e.u++ : e.e++; });
  if (!r.ok) {
    errLine = r.line || 0; gutter(); showTab('mCon');
    log('err', (r.line ? 'sketch.ino:' + r.line + ': ' : '') + 'error: ' + r.msg); log('err', 'exit status 1 — Compilation error: ' + r.msg); setStatus('compile error', 'err');
    if (r.line) { const lh = 18; code.scrollTop = Math.max(0, (r.line - 4) * lh); }
    return;
  }
  errLine = 0; gutter(); showTab('mCon');
  log('info', 'Sketch uses ' + r.bytes.toLocaleString() + ' bytes (' + Math.round(r.bytes / 322.56) + '%) of program storage space. Maximum is 32,256 bytes.');
  log('info', 'Global variables use ' + r.vars + ' bytes of dynamic memory.');
  setStatus('uploading…'); const pr = $('prog'), bar = pr.firstElementChild; pr.style.display = 'block'; bar.style.width = '0'; S.running = false;
  W.txUntil = performance.now() + 1500; let p = 0;
  const iv = setInterval(() => { p += 8; bar.style.width = Math.min(100, p) + '%'; if (p >= 100) { clearInterval(iv); pr.style.display = 'none'; finishUpload(r); } }, 90);
}
function finishUpload(r) {
  serBuf = ''; serDirty = true; S.vt = 0;
  try { S.load(r.factory); uploaded = true; setStatus('running ●', 'run'); log('ok', 'Done uploading. avrdude: 1 bytes of flash verified.'); showTab('mSer'); }
  catch (e) { log('err', 'Upload failed: ' + e.message); setStatus('error', 'err'); }
}
$('bUp').onclick = upload;
$('bStop').onclick = () => { S.stop(); setStatus('stopped'); };
$('bReset').onclick = () => { if (S.program) { S.resetSketch(); serBuf = ''; serDirty = true; setStatus('running ●', 'run'); } else log('info', 'Nothing uploaded yet.'); };
$('bSample').onclick = () => { code.value = exp.code; errLine = 0; gutter(); store.set('iot3d:' + exp.id, code.value); };

/* ---------- experiment loading ---------- */
const sel = $('exp');
EXPS.forEach((e, i) => { const o = document.createElement('option'); o.value = i; o.textContent = e.title; sel.appendChild(o); });
function loadExp(i) {
  curIdx = i; exp = EXPS[i]; Auth.track(exp); W.loadExperiment(exp); uploaded = false; missionDone = false; setStatus('idle'); serBuf = ''; serDirty = true;
  $('aim').innerHTML = '<b>' + exp.title + '</b><small>' + exp.aim + '</small><div>' + exp.hw.map(h => '<span class="chip">' + h + '</span>').join('') + '</div>';
  const saved = store.get('iot3d:' + exp.id); code.value = saved || exp.code; errLine = 0; gutter();
  store.set('iot3d:last', String(i)); $('hud').innerHTML = ''; requestAnimationFrame(() => { W.resize(); W.resetView(); }); buildMission(); buildControls(); log('info', 'Loaded experiment ' + exp.id + '. Wire it up, then press Upload.');
}
let curIdx = 0, wantIdx = null;
sel.onchange = () => {
  const i = +sel.value;
  if (!Auth.allowed(EXPS[i])) { wantIdx = i; sel.value = curIdx; log('err', 'Experiment ' + EXPS[i].id + ' needs a free login. Experiment 1 is open to everyone.'); Auth.prompt(); return; }
  loadExp(i);
};
Auth.onChange = () => {
  [...sel.options].forEach((o, i) => { o.textContent = (Auth.allowed(EXPS[i]) ? '' : '🔒 ') + EXPS[i].title; });
  if (Auth.signedIn) { Auth.track(EXPS[curIdx]); if (wantIdx !== null) { sel.value = wantIdx; loadExp(wantIdx); wantIdx = null; } }
  else if (!Auth.allowed(EXPS[curIdx])) { sel.value = 0; loadExp(0); }
};

/* ---------- mission ---------- */
const lab = id => { const t = S.terms.get(W.resolve ? id.replace('ard:GND', 'ard:GND1') : id); return t ? t.label.replace('Arduino ', '') : id; };
function buildMission() {
  const m = $('mission'); let h = '<div id="mBan"></div><b>Required connections</b><div style="margin-top:6px">';
  exp.wires.forEach((w, i) => { h += '<div class="req" id="rq' + i + '"><i>·</i><span><span class="a">' + lab(w[0]) + '</span> ⟷ <span class="a">' + lab(w[1]) + '</span></span></div>'; });
  h += '</div>';
  if (exp.opt) { h += '<b style="display:block;margin-top:8px">Optional</b><div style="margin-top:6px">'; exp.opt.forEach((w, i) => { h += '<div class="req opt" id="ro' + i + '"><i>·</i><span><span class="a">' + lab(w[0]) + '</span> ⟷ <span class="a">' + lab(w[1]) + '</span></span></div>'; }); h += '</div>'; }
  h += '<div class="wl"><b style="color:var(--txt)">Your wires</b><div id="wlist"></div></div>';
  h += '<p style="color:var(--mut);font-size:12.5px;margin-top:10px">Tip: you may route through the breadboard rails — the check only cares that the two pins are electrically connected.<br>Every pin shows its live voltage when you hover it.</p>';
  m.innerHTML = h;
}
function wireList() {
  const l = $('wlist'); if (!l) return;
  l.innerHTML = '';
  if (!W.wires.length) { l.innerHTML = '<div>no wires yet</div>'; return; }
  W.wires.forEach(w => {
    const d = document.createElement('div'); d.innerHTML = '<span class="d" style="background:#' + W.COLORS[w.cname].toString(16).padStart(6, '0') + '"></span><span>' + lab(w.a) + ' → ' + lab(w.b) + '</span>';
    const b = document.createElement('button'); b.textContent = '✕'; b.title = 'remove'; b.onclick = () => W.removeWire(w); d.appendChild(b); l.appendChild(d);
  });
}
function checkMission() {
  if (!exp) return; S.ensure(); let all = true;
  exp.wires.forEach((w, i) => { const ok = S.same(w[0].replace('ard:GND', 'ard:GND1'), w[1].replace('ard:GND', 'ard:GND1')); const el = $('rq' + i); if (!el) return; el.classList.toggle('ok', ok); el.firstElementChild.textContent = ok ? '✓' : '·'; if (!ok) all = false; });
  (exp.opt || []).forEach((w, i) => { const ok = S.same(w[0].replace('ard:GND', 'ard:GND1'), w[1].replace('ard:GND', 'ard:GND1')); const el = $('ro' + i); if (el) { el.classList.toggle('ok', ok); el.firstElementChild.textContent = ok ? '✓' : '·'; } });
  const ban = $('mBan'); if (ban) ban.innerHTML = all ? '<div class="banner">✅ Circuit complete! Now write / check the code and press ⬆ Upload.</div>' : '';
  if (all && !missionDone) { missionDone = true; Auth.rec(exp.id, e => { e.d = 1; }); [0, 120, 240].forEach((t, i) => setTimeout(() => W.beep(660 + i * 220, 0.12), t)); log('ok', 'Circuit complete — all required connections are in place.'); }
  if (!all) missionDone = false;
  return all;
}
W.onChange = () => { wireList(); checkMission(); };
$('bHint').onclick = function () {
  if (W.hintsOn) { W.clearHints(); this.classList.remove('on'); } else { W.showHints(exp.wires.concat(exp.opt || [])); this.classList.add('on'); Auth.rec(exp.id, e => { e.h++; }); }
};
$('bAuto').onclick = () => { Auth.rec(exp.id, e => { e.a++; }); $('bHint').classList.remove('on'); W.autoWire(exp.wires.concat(exp.opt || [])); };
$('bClear').onclick = () => { W.clearWires(); };
$('bView').onclick = () => W.resetView();
$('speed').onchange = e => { S.speed = +e.target.value; };

/* ---------- controls (sensor sliders) ---------- */
function buildControls() {
  const c = $('controls'); c.innerHTML = '';
  const pal = document.createElement('div'); pal.className = 'ctl'; pal.innerHTML = '<h4>🧵 Wire colour</h4>'; const pr = document.createElement('div'); pr.className = 'pal';
  const mk = (name, css) => { const d = document.createElement('div'); d.className = 'dot' + (name === 'auto' ? ' auto' : '') + (W.wireColor === name ? ' sel' : ''); if (css) d.style.background = css; d.title = name;
    d.onclick = () => { W.wireColor = name; pr.querySelectorAll('.dot').forEach(x => x.classList.remove('sel')); d.classList.add('sel'); }; pr.appendChild(d); };
  mk('auto'); Object.keys(W.COLORS).forEach(k => mk(k, '#' + W.COLORS[k].toString(16).padStart(6, '0'))); pal.appendChild(pr); c.appendChild(pal);
  W.comps.forEach(comp => {
    if (!comp.ui.length) return; const box = document.createElement('div'); box.className = 'ctl'; box.innerHTML = '<h4>' + comp.label + '</h4>';
    comp.ui.forEach(u => {
      const row = document.createElement('label'); const val = document.createElement('b');
      if (u.type === 'range') {
        const inp = document.createElement('input'); inp.type = 'range'; inp.min = u.min; inp.max = u.max; inp.step = u.step; inp.value = comp.state[u.key];
        const show = () => { val.textContent = u.fmt(+inp.value); }; show();
        inp.oninput = () => { comp.state[u.key] = +inp.value; S.dirty = true; show(); }; row.innerHTML = '<span>' + u.label + '</span>'; row.appendChild(val); box.appendChild(row); box.appendChild(inp);
        comp.uiSync = comp.uiSync || {}; comp.uiSync[u.key] = () => { inp.value = comp.state[u.key]; show(); };
      } else {
        const inp = document.createElement('input'); inp.type = 'checkbox'; inp.checked = !!comp.state[u.key]; inp.onchange = () => { comp.state[u.key] = inp.checked; S.dirty = true; };
        row.style.alignItems = 'center'; row.style.justifyContent = 'flex-start'; row.style.gap = '8px'; row.appendChild(inp); row.appendChild(document.createTextNode(u.label)); box.appendChild(row);
      }
    });
    c.appendChild(box);
  });
  if (c.children.length === 1) { const n = document.createElement('p'); n.style.color = 'var(--mut)'; n.textContent = 'This experiment has no sensors to tune.'; c.appendChild(n); }
}
W.onPick = c => { if (c.uiSync) for (const k in c.uiSync) c.uiSync[k](); };

/* ---------- HUD ---------- */
const pins = $('pins');
for (let p = 0; p < 20; p++) { const d = document.createElement('div'); d.className = 'pn'; d.id = 'pn' + p; pins.appendChild(d); }
setInterval(() => {
  S.ensure();
  for (let p = 0; p < 20; p++) {
    const d = $('pn' + p); const name = p < 14 ? 'D' + p : 'A' + (p - 14); const m = S.mode[p];
    let cls = 'pn', txt = name;
    if (m === 1) { const o = S.out[p]; if (o > 0 && o < 1) { cls += ' pw'; txt += ' ' + Math.round(o * 100) + '%'; } else if (o >= 1) { cls += ' hi'; txt += ' ▲'; } else txt += ' ▽'; }
    else if (m === 0 && S.running) { cls += ' in'; const v = S.volt(S.pinTerm(p)); txt += p >= 14 ? ' ' + Math.round(v / 5 * 1023) : (v > 2.5 ? ' 1' : ' 0'); }
    d.className = cls; d.textContent = txt; d.title = name + (m === 1 ? ' OUTPUT' : m === 2 ? ' INPUT_PULLUP' : ' INPUT');
  }
  const hud = $('hud'); let h = '';
  if (S.shorted) h += '<div class="pill warn">⚠ SHORT CIRCUIT: 5V is connected to GND!</div>';
  if (uploaded && S.running) h += '<div class="pill good">▶ Sketch running · t = ' + (S.vt / 1000).toFixed(1) + ' s</div>';
  else if (uploaded) h += '<div class="pill">■ Sketch stopped / finished</div>';
  if (hud.dataset.h !== h) { hud.innerHTML = h; hud.dataset.h = h; }
  checkMission();
}, 150);

/* ---------- fun: don't click the black block ---------- */
let bombBusy = false;
W.onBomb = () => {
  if (bombBusy) return; bombBusy = true; W.audioInit(); W.explode();
  setTimeout(() => {
    const ov = document.createElement('div'); ov.className = 'modal'; ov.id = 'bomb';
    const msg = encodeURIComponent("Hey! I clicked the 'DON'T CLICK ME' block and destroyed the Arduino 💥 Here's my ₹100 for the damage 😅");
    ov.innerHTML = '<div class="box" style="text-align:center;border-color:#ff5050"><div style="font-size:46px">💥</div><h3>BOOM! I told you not to click it!</h3>'
      + '<p>You just destroyed the Arduino. Please send <b style="color:#ffb020">₹100</b> for the damages 😤</p>'
      + '<a class="btn pri" id="bombPay" target="_blank" rel="noopener" href="https://wa.me/918317366952?text=' + msg + '" style="text-decoration:none">💸 Pay ₹100 on WhatsApp</a>'
      + '<p id="bombT" style="font-size:12px">…or wait <b>5</b>s and I might rebuild it 😉</p></div>';
    document.body.appendChild(ov);
    let n = 5; const t = $('bombT').querySelector('b');
    const done = (txt) => { clearInterval(iv); setTimeout(() => { W.restore(); ov.remove(); bombBusy = false; log('info', txt); }, 0); };
    const iv = setInterval(() => { n--; t.textContent = n; if (n <= 0) done('Board rebuilt. Just kidding 😄'); }, 1000);
    $('bombPay').addEventListener('click', () => { clearInterval(iv); setTimeout(() => { W.restore(); ov.remove(); bombBusy = false; }, 1200); });
  }, 900);
};

/* ---------- boot ---------- */
W.init($('c'));
const last = +store.get('iot3d:last');
sel.value = 0; loadExp(0); Auth.init();
if (isFinite(last) && EXPS[last]) wantIdx = last; 
window.addEventListener('resize', () => W.resize());
requestAnimationFrame(() => { W.resize(); W.resetView(); });
if (window.ResizeObserver) new ResizeObserver(() => W.resize()).observe($('stage'));
})();
