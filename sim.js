/* Circuit solver + virtual Arduino Uno runtime (no 3D code in here). */
(function (G) {
'use strict';
const S = {
  terms: new Map(), list: [], idx: new Map(), links: [], wires: [], comps: [],
  dirty: true, V: null, nid: new Map(), find: null, shorted: false,
  mode: new Array(20).fill(0), out: new Array(20).fill(0), pull: new Array(20).fill(false), pwmPin: new Set([3, 5, 6, 9, 10, 11]),
  vt: 0, running: false, program: null, gen: null, wake: 0, speed: 1, sketchAddr: 0,
  onSerial: null, onLog: null, monitorBaud: 9600,
};
G.SIM = S;

const pinTerm = p => p < 14 ? 'ard:' + p : 'ard:A' + (p - 14);
S.pinTerm = pinTerm;

S.addTerm = function (t) { S.terms.set(t.id, t); S.dirty = true; };
S.reindex = function () {
  S.list = [...S.terms.keys()]; S.idx = new Map(S.list.map((id, i) => [id, i])); S.dirty = true;
};
S.removeCompTerms = function () {
  for (const [id, t] of [...S.terms]) if (!t.permanent) S.terms.delete(id);
  S.comps = []; S.wires = []; S.reindex();
};

/* ---------- solver ---------- */
function solveOnce() {
  const n = S.list.length;
  const par = new Int32Array(n); for (let i = 0; i < n; i++) par[i] = i;
  const find = x => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  const ix = id => { const v = S.idx.get(id); if (v === undefined) throw new Error('unknown terminal ' + id); return v; };
  const un = (a, b) => { a = find(ix(a)); b = find(ix(b)); if (a !== b) par[a] = b; };
  for (const [a, b] of S.links) un(a, b);
  for (const w of S.wires) un(w.a, w.b);
  const elems = [], srcs = [];
  for (const c of S.comps) {
    if (c.contacts) for (const [a, b] of c.contacts()) un(a, b);
  }
  for (const c of S.comps) {
    if (c.elements) for (const e of c.elements()) { e.off = false; e.I = 0; elems.push(e); }
    if (c.sources) for (const s of c.sources()) srcs.push(s);
  }
  srcs.push({t:'ard:5V', V:5, Rs:0.01}, {t:'ard:3V3', V:3.3, Rs:0.01}, {t:'ard:GND1', V:0, Rs:0.01}, {t:'ard:VIN', V:5, Rs:0.01});
  for (let p = 0; p < 20; p++) {
    if (S.mode[p] === 1) srcs.push({t:pinTerm(p), V:5 * S.out[p], Rs:25});
    else if (S.mode[p] === 2 || S.pull[p]) srcs.push({t:pinTerm(p), V:5, Rs:30000});
  }
  const nid = new Map();
  const gi = t => { const r = find(ix(t)); let v = nid.get(r); if (v === undefined) { v = nid.size; nid.set(r, v); } return v; };
  for (const w of S.wires) { gi(w.a); gi(w.b); }
  for (const e of elems) { e.na = gi(e.a); e.nb = gi(e.b); }
  for (const s of srcs) s.n = gi(s.t);
  const M = nid.size;
  const stamp = () => {
    const A = new Float64Array(M * (M + 1));
    const W = M + 1;
    for (let i = 0; i < M; i++) A[i * W + i] += 1e-9;
    for (const e of elems) {
      if (e.off || e.na === e.nb) continue;
      const g = 1 / e.R; A[e.na * W + e.na] += g; A[e.nb * W + e.nb] += g; A[e.na * W + e.nb] -= g; A[e.nb * W + e.na] -= g;
    }
    for (const s of srcs) { const g = 1 / s.Rs; A[s.n * W + s.n] += g; A[s.n * W + M] += s.V * g; }
    for (let c = 0; c < M; c++) {
      let piv = c, mx = Math.abs(A[c * W + c]);
      for (let r = c + 1; r < M; r++) { const v = Math.abs(A[r * W + c]); if (v > mx) { mx = v; piv = r; } }
      if (piv !== c) for (let k = c; k <= M; k++) { const t = A[c * W + k]; A[c * W + k] = A[piv * W + k]; A[piv * W + k] = t; }
      const d = A[c * W + c]; if (Math.abs(d) < 1e-15) continue;
      for (let r = c + 1; r < M; r++) {
        const f = A[r * W + c] / d; if (f === 0) continue;
        for (let k = c; k <= M; k++) A[r * W + k] -= f * A[c * W + k];
      }
    }
    const V = new Float64Array(M);
    for (let r = M - 1; r >= 0; r--) {
      let s = A[r * W + M]; for (let k = r + 1; k < M; k++) s -= A[r * W + k] * V[k];
      const d = A[r * W + r]; V[r] = Math.abs(d) < 1e-15 ? 0 : s / d;
    }
    return V;
  };
  let V = M ? stamp() : new Float64Array(0);
  for (let pass = 0; pass < 2 && M; pass++) {
    let ch = false;
    for (const e of elems) if (e.polar && !e.off && V[e.na] < V[e.nb] - 0.02) { e.off = true; ch = true; }
    if (!ch) break; V = stamp();
  }
  for (const e of elems) e.I = e.off ? 0 : (V[e.na] - V[e.nb]) / e.R;
  S.V = V; S.nid = nid; S.find = find;
  S.shorted = find(ix('ard:5V')) === find(ix('ard:GND1'));
}
S.solve = function () {
  if (!S.list.length) return;
  S.dirty = false;
  for (let it = 0; it < 4; it++) {
    solveOnce();
    let ch = false; for (const c of S.comps) if (c.settle && c.settle()) ch = true;
    if (!ch) break;
  }
};
S.ensure = function () { if (S.dirty) S.solve(); };
S.volt = function (id) {
  S.ensure(); if (!S.find) return 0;
  const i = S.idx.get(id); if (i === undefined) return 0;
  const r = S.nid.get(S.find(i)); return r === undefined ? 0 : S.V[r];
};
S.same = function (a, b) {
  S.ensure(); if (!S.find) return false;
  const i = S.idx.get(a), j = S.idx.get(b); if (i === undefined || j === undefined) return false;
  return S.find(i) === S.find(j);
};
S.connected = function (a, b) { return S.same(a, b); };

/* ---------- runtime for compiled sketches ---------- */
const Serial = {
  baud: 0, rx: [], tx: '', acc: 0,
  begin(b) { this.baud = b || 9600; }, end() {},
  print(s) { this.tx += s; }, println(s) { this.tx += (s === undefined ? '' : s) + '\r\n'; },
  write(x) { this.tx += typeof x === 'number' ? String.fromCharCode(x) : String(x); },
  full() { return this.baud > 0 && this.tx.length > 64; },
  available() { return this.rx.length; }, read() { return this.rx.length ? this.rx.shift() : -1; }, peek() { return this.rx.length ? this.rx[0] : -1; },
  flush() {}, setTimeout() {},
  parseInt() {
    while (this.rx.length && !(this.rx[0] === 45 || (this.rx[0] >= 48 && this.rx[0] <= 57))) this.rx.shift();
    let s = ''; if (this.rx[0] === 45) s += String.fromCharCode(this.rx.shift());
    while (this.rx.length && this.rx[0] >= 48 && this.rx[0] <= 57) s += String.fromCharCode(this.rx.shift());
    return parseInt(s, 10) || 0;
  },
  parseFloat() {
    while (this.rx.length && !(this.rx[0] === 45 || this.rx[0] === 46 || (this.rx[0] >= 48 && this.rx[0] <= 57))) this.rx.shift();
    let s = ''; while (this.rx.length && /[-0-9.]/.test(String.fromCharCode(this.rx[0]))) s += String.fromCharCode(this.rx.shift());
    return parseFloat(s) || 0;
  },
  readString() { const s = String.fromCharCode(...this.rx); this.rx = []; return s; },
  readStringUntil(c) { let s = ''; while (this.rx.length) { const ch = this.rx.shift(); if (ch === c) break; s += String.fromCharCode(ch); } return s; },
};
S.Serial = Serial;
S.serialIn = function (text) { for (const ch of text) Serial.rx.push(ch.charCodeAt(0)); };
S.drainSerial = function (dtMs) {
  if (!Serial.baud) { Serial.tx = ''; return; }
  Serial.acc += dtMs * Serial.baud / 10000;
  const n = Math.min(Math.floor(Serial.acc), Serial.tx.length); Serial.acc -= Math.floor(Serial.acc);
  if (Serial.acc > 50) Serial.acc = 50;
  if (n > 0) { const chunk = Serial.tx.slice(0, n); Serial.tx = Serial.tx.slice(n); if (S.onSerial) S.onSerial(chunk, Serial.baud); }
};

function fmt(v, t, s) {
  if (t === 'String' || typeof v === 'string') return String(v);
  if (t === 'char') return String.fromCharCode(v);
  if (typeof v === 'boolean') v = +v;
  if (t === 'float') return Number.isFinite(v) ? Number(v).toFixed(s === undefined ? 2 : s) : (Number.isNaN(v) ? 'nan' : 'inf');
  if (t === 'int' || t === 'bool') {
    v = Math.trunc(v) || 0;
    if (s === 16) return (v >>> 0).toString(16).toUpperCase(); if (s === 2) return (v >>> 0).toString(2); if (s === 8) return (v >>> 0).toString(8);
    return String(v);
  }
  if (Number.isNaN(v)) return 'nan';
  return Number.isInteger(v) ? String(v) : Number(v).toFixed(s === undefined ? 2 : s);
}
function sm(s, m, a, b) {
  s = String(s);
  switch (m) {
    case 'length': return s.length; case 'toInt': return parseInt(s, 10) || 0; case 'toFloat': return parseFloat(s) || 0;
    case 'equals': return s === String(a); case 'equalsIgnoreCase': return s.toLowerCase() === String(a).toLowerCase();
    case 'indexOf': return s.indexOf(typeof a === 'number' ? String.fromCharCode(a) : a);
    case 'substring': return s.substring(a, b); case 'trim': return s.trim(); case 'toUpperCase': return s.toUpperCase(); case 'toLowerCase': return s.toLowerCase();
    case 'startsWith': return s.startsWith(a); case 'endsWith': return s.endsWith(a); case 'charAt': return s.charCodeAt(a);
    default: throw new Error('String has no member ' + m);
  }
}

S.makeRuntime = function () {
  const rt = {Serial, fmt, sm};
  rt.toInt = x => { x = Math.trunc(x); return x === x ? x : 0; };
  rt.idiv = (a, b) => b === 0 ? 0 : Math.trunc(a / b);
  rt.pad = (a, n, d) => { while (a.length < n) a.push(d); return a; };
  rt.delay = function* (ms) { yield Math.max(0, +ms || 0); };
  rt.txwait = function* () { while (Serial.full()) yield 1; };
  rt.pinMode = (p, m) => { if (p >= 0 && p < 20) { S.mode[p] = m; if (m !== 1) S.pull[p] = false; S.dirty = true; } };
  rt.digitalWrite = (p, v) => {
    if (p < 0 || p >= 20) return;
    if (S.mode[p] === 1) { S.out[p] = v ? 1 : 0; S.dirty = true; } else if (S.mode[p] === 0) { S.pull[p] = !!v; S.dirty = true; }
  };
  rt.analogWrite = (p, v) => {
    if (p < 0 || p >= 20) return; v = Math.max(0, Math.min(255, v));
    S.mode[p] = 1; S.out[p] = S.pwmPin.has(p) ? v / 255 : (v >= 128 ? 1 : 0); S.dirty = true;
  };
  rt.digitalRead = p => (S.volt(pinTerm(p)) > 2.5 ? 1 : 0);
  rt.analogRead = p => {
    if (p < 8) p += 14; const v = S.volt(pinTerm(p));
    return Math.max(0, Math.min(1023, Math.round(v / 5 * 1023)));
  };
  rt.analogReference = () => {}; rt.delayMicroseconds = () => {}; rt.randomSeed = () => {}; rt.interrupts = () => {}; rt.noInterrupts = () => {};
  rt.attachInterrupt = () => {}; rt.digitalPinToInterrupt = p => p;
  rt.millis = () => Math.floor(S.vt); rt.micros = () => Math.floor(S.vt * 1000);
  rt.tone = (p, f) => { rt.pinMode(p, 1); rt.digitalWrite(p, 1); }; rt.noTone = p => rt.digitalWrite(p, 0);
  rt.map = (x, a, b, c, d) => Math.trunc((x - a) * (d - c) / (b - a) + c);
  rt.constrain = (x, a, b) => Math.max(a, Math.min(b, x)); rt.abs = Math.abs; rt.min = Math.min; rt.max = Math.max;
  rt.random = (a, b) => b === undefined ? Math.floor(Math.random() * a) : a + Math.floor(Math.random() * (b - a));
  rt.sqrt = Math.sqrt; rt.pow = Math.pow; rt.sin = Math.sin; rt.cos = Math.cos; rt.tan = Math.tan; rt.floor = Math.floor; rt.ceil = Math.ceil; rt.round = Math.round;
  rt.sq = x => x * x; rt.radians = x => x * Math.PI / 180; rt.degrees = x => x * 180 / Math.PI;
  rt.lowByte = x => x & 255; rt.highByte = x => (x >> 8) & 255; rt.bitRead = (x, b) => (x >> b) & 1;
  rt.isDigit = c => c >= 48 && c <= 57; rt.isAlpha = c => (c >= 65 && c <= 90) || (c >= 97 && c <= 122);
  rt.pulseIn = (p) => {
    const u = S.comps.find(c => c.type === 'ultra');
    if (u && u.powered && S.same(u.t('echo'), pinTerm(p))) {
      let trig = false; for (let q = 0; q < 14; q++) if (S.same(u.t('trig'), pinTerm(q))) trig = true;
      if (trig) return Math.round(u.state.dist * 58.3);
    }
    return 0;
  };
  rt.newLCD = (addr, cols, rows) => {
    const c = S.comps.find(x => x.type === 'lcd'); const st = c ? c.lcd : {buf:[], cx:0, cy:0};
    st.cols = cols || 16; st.rows = rows || 2; st.addr = addr; st.inited = false;
    const blank = () => { st.buf = []; for (let r = 0; r < 4; r++) st.buf.push(new Array(40).fill(' ')); st.cx = 0; st.cy = 0; };
    blank(); st.bl = false; st.on = true;
    const put = ch => { if (st.cy < st.rows && st.cx < 40) st.buf[st.cy][st.cx] = ch; st.cx++; };
    const pr = s => { for (const ch of String(s)) { if (ch === '\r' || ch === '\n') continue; put(ch); } };
    return {
      init() { st.inited = true; blank(); st.bl = true; }, begin(cols2, rows2) { st.inited = true; blank(); if (cols2) { st.cols = cols2; st.rows = rows2 || st.rows; } },
      backlight() { st.bl = true; }, noBacklight() { st.bl = false; }, clear() { blank(); }, home() { st.cx = 0; st.cy = 0; },
      setCursor(x, y) { st.cx = x; st.cy = y; }, print: pr, println: pr, write(n) { put(typeof n === 'number' ? String.fromCharCode(n) : n); },
      display() { st.on = true; }, noDisplay() { st.on = false; }, cursor() {}, noCursor() {}, blink() {}, noBlink() {},
      createChar() {}, scrollDisplayLeft() {}, scrollDisplayRight() {}, autoscroll() {}, noAutoscroll() {}, leftToRight() {}, rightToLeft() {},
      setBacklight(v) { st.bl = !!v; },
    };
  };
  rt.newDHT = (pin, type) => {
    const c = S.comps.find(x => x.type === 'dht');
    const ok = () => c && c.powered && S.same(c.t('data'), pinTerm(pin));
    return {
      begin() {}, readTemperature(f) { if (!ok()) return NaN; return f ? c.state.temp * 1.8 + 32 : c.state.temp; },
      readHumidity() { return ok() ? c.state.hum : NaN; }, readHeatIndex() { return ok() ? c.state.temp : NaN; },
    };
  };
  return rt;
};

/* ---------- running programs ---------- */
S.resetPins = function () {
  S.mode.fill(0); S.out.fill(0); S.pull.fill(false);
  Serial.baud = 0; Serial.rx = []; Serial.tx = ''; Serial.acc = 0; S.dirty = true;
  for (const c of S.comps) if (c.resetRuntime) c.resetRuntime();
};
S.log = function (kind, msg) { if (S.onLog) S.onLog(kind, msg); };
S.load = function (factory) {
  S.resetPins();
  const rt = S.makeRuntime();
  const prog = factory(rt);
  S.program = prog; S.factory = factory;
  S.gen = (function* () { yield* prog.init(); yield* prog.setup(); for (;;) { yield* prog.loop(); yield 0; } })();
  S.wake = S.vt; S.running = true;
};
S.stop = function () { S.running = false; S.gen = null; S.program = null; S.resetPins(); };
S.step = function (dtReal) {
  const dt = dtReal * S.speed;
  S.vt += dt;
  S.drainSerial(dt);
  if (!S.running || !S.gen) return;
  const t0 = performance.now(); let n = 0;
  try {
    while (S.wake <= S.vt && performance.now() - t0 < 8 && n++ < 60000) {
      const r = S.gen.next();
      if (r.done) { S.running = false; S.log('info', 'Sketch finished.'); break; }
      S.wake = S.vt + (r.value || 0);
    }
  } catch (e) {
    S.running = false; S.log('err', 'Runtime error: ' + (e && e.message || e));
  }
};

S.resetSketch = function () { // like pressing RESET
  if (!S.program) return;
  const prog = S.program; S.resetPins(); const rt = S.makeRuntime();
  // rebuild the program so global variables restart
  if (S.factory) { S.program = S.factory(rt); S.gen = (function* (p) { yield* p.init(); yield* p.setup(); for (;;) { yield* p.loop(); yield 0; } })(S.program); S.wake = S.vt; S.running = true; }
};

if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
