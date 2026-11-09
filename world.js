/* 3D world: table, Arduino Uno, breadboard, wiring interaction, render loop. */
(function (G) {
'use strict';
const T = G.THREE, S = G.SIM, P = G.Parts, U = P.U;
const W = G.World = {wires: [], hints: [], wireColor: 'auto', onChange: null, onStatus: null, onPick: null};
let renderer, scene, camera, controls, ray, canvas, wireGroup, hintGroup, ring, tempWire = null;
const mouse = new T.Vector2(); const permHits = [];
let hoverTerm = null, drag = null, pending = null, hoverWire = null, pickAct = null;
const GND_CYCLE = ['ard:GND1', 'ard:GND2', 'ard:GND3']; let gndI = 0, colI = 0;
const COLORS = {red: 0xe53935, black: 0x222222, yellow: 0xfdd835, green: 0x43a047, blue: 0x1e88e5, orange: 0xfb8c00, white: 0xf5f5f5, purple: 0x8e24aa};
const AUTO = ['yellow', 'green', 'blue', 'orange', 'white', 'purple'];
W.COLORS = COLORS;

/* ---------- init ---------- */
W.init = function (cv) {
  canvas = cv;
  renderer = new T.WebGLRenderer({canvas: cv, antialias: true, powerPreference: 'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  scene = new T.Scene(); scene.background = new T.Color(0x0b1220); scene.fog = new T.Fog(0x0b1220, 140, 320);
  camera = new T.PerspectiveCamera(42, 1, 0.5, 600);
  scene.add(new T.HemisphereLight(0xcfe3ff, 0x1a2233, 0.85));
  const sun = new T.DirectionalLight(0xffffff, 0.9); sun.position.set(-30, 70, 40); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 10; sc.far = 200; sun.shadow.bias = -0.0005;
  scene.add(sun);
  const fill = new T.DirectionalLight(0x88aaff, 0.25); fill.position.set(40, 30, -30); scene.add(fill);
  // table
  const tc = document.createElement('canvas'); tc.width = tc.height = 1024; const x = tc.getContext('2d');
  const gr = x.createRadialGradient(512, 512, 40, 512, 512, 720); gr.addColorStop(0, '#26324a'); gr.addColorStop(1, '#0e1524'); x.fillStyle = gr; x.fillRect(0, 0, 1024, 1024);
  x.strokeStyle = 'rgba(120,160,255,.10)'; x.lineWidth = 1; for (let i = 0; i <= 64; i++) { x.beginPath(); x.moveTo(i * 16, 0); x.lineTo(i * 16, 1024); x.stroke(); x.beginPath(); x.moveTo(0, i * 16); x.lineTo(1024, i * 16); x.stroke(); }
  const table = new T.Mesh(new T.PlaneGeometry(260, 260), new T.MeshStandardMaterial({map: new T.CanvasTexture(tc), roughness: 0.9})); table.rotation.x = -Math.PI / 2; table.position.y = -0.02; table.receiveShadow = true; scene.add(table);
  wireGroup = new T.Group(); hintGroup = new T.Group(); scene.add(wireGroup, hintGroup);
  ring = new T.Mesh(new T.TorusGeometry(0.85, 0.12, 8, 28), new T.MeshBasicMaterial({color: 0x39e6ff, transparent: true, opacity: 0.95})); ring.rotation.x = Math.PI / 2; ring.visible = false; scene.add(ring);
  ray = new T.Raycaster();
  buildArduino(); buildBreadboard();
  bindEvents();
  controls = new T.OrbitControls(camera, cv); controls.enableDamping = true; controls.dampingFactor = 0.12; controls.maxPolarAngle = Math.PI / 2.05; controls.minDistance = 8; controls.maxDistance = 200;
  controls.mouseButtons = {LEFT: T.MOUSE.ROTATE, MIDDLE: T.MOUSE.DOLLY, RIGHT: T.MOUSE.PAN};
  W.resize(); W.resetView(); S.reindex();
  last = performance.now(); requestAnimationFrame(frame);
  setInterval(() => { const n = performance.now(); S.step(Math.min(60, n - simLast)); simLast = n; }, 6);
};
let last = 0, simLast = performance.now();
W.resize = function () {
  const p = canvas.parentElement; const w = p.clientWidth, h = p.clientHeight; if (!w || !h) return;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
};
W.resetView = function () {
  const ext = W.extent || {z1: 40}; const zMin = -13, zMax = ext.z1 + 2; const cz = (zMin + zMax) / 2;
  const tv = Math.tan(camera.fov * Math.PI / 360), halfW = 40, halfD = (zMax - zMin) / 2;
  const dist = Math.max(halfW / (tv * camera.aspect), halfD / tv * 0.95) * 1.12 + 6; const el = 60 * Math.PI / 180;
  controls.target.set(2, 0, cz);
  camera.position.set(2, dist * Math.sin(el), cz + dist * Math.cos(el));
  controls.update();
};

/* ---------- Arduino ---------- */
const PIN_Y = 4.3;
function buildArduino() {
  const g = new T.Group(); g.position.set(-19, 0, -1); scene.add(g); W.arduino = g;
  const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 840; const x = cv.getContext('2d');
  x.fillStyle = '#0a8f96'; x.fillRect(0, 0, 1080, 840);
  const grd = x.createLinearGradient(0, 0, 1080, 840); grd.addColorStop(0, 'rgba(255,255,255,.08)'); grd.addColorStop(1, 'rgba(0,0,0,.12)'); x.fillStyle = grd; x.fillRect(0, 0, 1080, 840);
  const px = X => (X + 13.5) * 40, pz = Z => (Z + 10.5) * 40;
  x.fillStyle = '#eafcff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = 'bold 22px Arial'; x.fillText('DIGITAL (PWM ~)', px(-1), pz(-7.2));
  x.fillText('ANALOG IN', px(8.1), pz(7.3)); x.fillText('POWER', px(-0.5), pz(7.3));
  x.font = 'bold 74px Arial'; x.fillText('UNO', px(-1.5), pz(0.6)); x.font = 'bold 28px Arial'; x.fillText('ARDUINO', px(-1.5), pz(-2.4)); x.fillText('∞', px(7.5), pz(-3));
  const lab = (t, X, Z) => { x.font = 'bold 19px Arial'; x.fillText(t, px(X), pz(Z)); };
  const pins = [];
  const add = (id, label, X, Z, sil) => { pins.push({id, label, X, Z}); lab(sil || label, X, Z > 0 ? Z - 1.5 : Z + 1.5); };
  const names = ['RX0', 'TX1', '2', '~3', '4', '~5', '~6', '7'];
  for (let n = 0; n <= 7; n++) add('ard:' + n, 'D' + n + (n < 2 ? (n ? ' (TX)' : ' (RX)') : ''), 12 - n, -9.3, names[n]);
  const hn = ['8', '~9', '~10', '~11', '12', '13'];
  for (let n = 8; n <= 13; n++) add('ard:' + n, 'D' + n, 2.4 - (n - 8), -9.3, hn[n - 8]);
  add('ard:GND1', 'GND', -3.6, -9.3, 'GND'); add('ard:AREF', 'AREF', -4.6, -9.3, 'AREF'); add('ard:SDA', 'SDA (A4)', -5.6, -9.3, 'SDA'); add('ard:SCL', 'SCL (A5)', -6.6, -9.3, 'SCL');
  add('ard:IOREF', 'IOREF', -3, 9.3, 'IOREF'); add('ard:RESET', 'RESET', -2, 9.3, 'RST'); add('ard:3V3', '3.3V', -1, 9.3, '3V3'); add('ard:5V', '5V', 0, 9.3, '5V');
  add('ard:GND2', 'GND', 1, 9.3, 'GND'); add('ard:GND3', 'GND', 2, 9.3, 'GND'); add('ard:VIN', 'VIN', 3, 9.3, 'VIN');
  for (let n = 0; n < 6; n++) add('ard:A' + n, 'A' + n, 5.6 + n, 9.3, 'A' + n);
  const tex = new T.CanvasTexture(cv); tex.anisotropy = 8;
  const side = U.mat(0x067a80), top = new T.MeshStandardMaterial({map: tex, roughness: 0.6});
  const board = new T.Mesh(new T.BoxGeometry(27, 0.8, 21), [side, side, top, side, side, side]); board.position.y = 0.9; board.receiveShadow = board.castShadow = true; g.add(board);
  // headers
  [[-2.1, -9.3, 10], [8.5, -9.3, 8], [-0.5, 9.3, 8], [8.1, 9.3, 6]].forEach(([hx, hz, w]) => U.B(g, w, 2.4, 1.2, U.mat(0x15171c), hx, 2.5, hz));
  // parts
  U.B(g, 7.6, 4.6, 5.4, U.mat(0xc5cad2, {metalness: 0.9, roughness: 0.3}), -11.6, 3.5, -4.2);          // USB
  U.B(g, 8, 4.4, 5.6, U.mat(0x1b1b1f), -11.8, 3.4, 4.8);                                                  // DC jack
  U.B(g, 9, 1, 2.8, U.mat(0x111317), 6, 1.8, 0.4);                                                         // ATmega
  U.B(g, 2.6, 0.8, 1.3, U.mat(0xc9ccd2, {metalness: 0.9}), -6.5, 1.7, 3.5);                               // crystal
  const rst = U.Cy(g, 0.9, 0.9, 0.9, U.mat(0xd22d2d), -6.0, 2.0, -6.6, 16); rst.userData.reset = true; P.picks.push(rst); permHits.push(rst);
  const mk = (X, Z, col) => { const m = new T.MeshStandardMaterial({color: col, emissive: col, emissiveIntensity: 0.05}); U.B(g, 0.9, 0.3, 0.55, m, X, 1.45, Z); return m; };
  W.led = {L: mk(-1.6, -6.4, 0xffa000), ON: mk(7, 4.8, 0x22ff55), TX: mk(-3.4, -6.4, 0xffd000), RX: mk(-4.4, -6.4, 0xffd000)};
  W.led.ON.emissiveIntensity = 2.2;
  // terminals
  for (const p of pins) {
    const h = new T.Mesh(U.HITGEO, U.HITMAT); h.position.set(p.X, PIN_Y, p.Z); h.userData.term = p.id; g.add(h); permHits.push(h);
    U.Cy(g, 0.26, 0.26, 1.4, U.GOLD, p.X, PIN_Y - 0.7, p.Z, 8);
    S.addTerm({id: p.id, label: 'Arduino ' + p.label, group: g, local: new T.Vector3(p.X, PIN_Y, p.Z), permanent: true});
  }
  S.links.push(['ard:GND1', 'ard:GND2'], ['ard:GND1', 'ard:GND3'], ['ard:SDA', 'ard:A4'], ['ard:SCL', 'ard:A5']);
}

/* ---------- Breadboard ---------- */
const BBY = 1.4;
function buildBreadboard() {
  const g = new T.Group(); g.position.set(21, 0, -1); scene.add(g); W.bb = g;
  const cv = document.createElement('canvas'); cv.width = 1320; cv.height = 880; const x = cv.getContext('2d');
  x.fillStyle = '#ece8dc'; x.fillRect(0, 0, 1320, 880);
  const px = X => (X + 16.5) * 40, pz = Z => (Z + 11) * 40;
  x.fillStyle = '#d6d1c2'; x.fillRect(0, pz(-0.7), 1320, 1.4 * 40);   // centre channel
  x.fillStyle = '#e53935'; x.fillRect(px(-13), pz(-9.45), 26 * 40, 3); x.fillStyle = '#1e88e5'; x.fillRect(px(-13), pz(-7.55), 26 * 40, 3);
  x.fillStyle = '#1e88e5'; x.fillRect(px(-13), pz(7.55), 26 * 40, 3); x.fillStyle = '#e53935'; x.fillRect(px(-13), pz(9.45), 26 * 40, 3);
  x.fillStyle = '#556'; x.font = 'bold 17px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
  for (let c = 1; c <= 30; c++) if (c === 1 || c % 5 === 0) { x.fillText(c, px(-14.5 + c - 1), pz(-6.8)); x.fillText(c, px(-14.5 + c - 1), pz(6.8)); }
  'abcde'.split('').forEach((l, i) => { x.fillText(l, px(-16), pz(-5.5 + i)); }); 'fghij'.split('').forEach((l, i) => { x.fillText(l, px(-16), pz(1.5 + i)); });
  x.fillStyle = '#e53935'; x.font = 'bold 24px Arial'; x.fillText('+', px(-15), pz(-9)); x.fillText('+', px(-15), pz(9)); x.fillStyle = '#1e88e5'; x.fillText('−', px(-15), pz(-8)); x.fillText('−', px(-15), pz(8));
  const tex = new T.CanvasTexture(cv); tex.anisotropy = 8;
  const side = U.mat(0xcfcab8), top = new T.MeshStandardMaterial({map: tex, roughness: 0.8});
  const base = new T.Mesh(new T.BoxGeometry(33, 1.2, 22), [side, side, top, side, side, side]); base.position.y = 0.6; base.receiveShadow = base.castShadow = true; g.add(base);
  // holes (instanced) + terminals
  const holes = []; const rows = {a: -5.5, b: -4.5, c: -3.5, d: -2.5, e: -1.5, f: 1.5, g: 2.5, h: 3.5, i: 4.5, j: 5.5};
  for (let c = 1; c <= 30; c++) for (const r in rows) holes.push({id: 'bb:' + r + c, X: -14.5 + c - 1, Z: rows[r], label: 'Breadboard ' + r.toUpperCase() + c});
  const rails = [['T+', -9], ['T-', -8], ['B-', 8], ['B+', 9]];
  for (const [nm, Z] of rails) for (let i = 0; i < 25; i++) holes.push({id: 'bb:' + nm + (i + 1), X: -12 + i, Z, label: 'Breadboard ' + (nm[0] === 'T' ? 'top' : 'bottom') + ' rail ' + nm[1].replace('-', '−') + ' #' + (i + 1)});
  const inst = new T.InstancedMesh(new T.BoxGeometry(0.55, 0.12, 0.55), new T.MeshBasicMaterial({color: 0x3a3a3a}), holes.length); const m4 = new T.Matrix4();
  holes.forEach((h, i) => {
    m4.setPosition(h.X, 1.22, h.Z); inst.setMatrixAt(i, m4);
    const hit = new T.Mesh(U.HITGEO, U.HITMAT); hit.position.set(h.X, BBY + 0.3, h.Z); hit.scale.setScalar(0.8); hit.userData.term = h.id; g.add(hit); permHits.push(hit);
    S.addTerm({id: h.id, label: h.label, group: g, local: new T.Vector3(h.X, BBY + 0.3, h.Z), permanent: true});
  });
  g.add(inst);
  for (let c = 1; c <= 30; c++) {
    for (const grp of ['abcde', 'fghij']) for (let i = 0; i < 4; i++) S.links.push(['bb:' + grp[i] + c, 'bb:' + grp[i + 1] + c]);
  }
  for (const [nm] of rails) for (let i = 1; i < 25; i++) S.links.push(['bb:' + nm + i, 'bb:' + nm + (i + 1)]);
}

/* ---------- experiment loading ---------- */
W.loadExperiment = function (exp) {
  for (const c of S.comps) scene.remove(c.group);
  S.stop(); S.removeCompTerms(); P.hits.length = 0; P.picks.length = 0; P.picks.push(...permHits.filter(h => h.userData.reset));
  W.clearWires(true); W.clearHints();
  const comps = exp.comps.map(o => P.build(o.type, o));
  let x = -35, z = 21, rowD = 0, maxZ = 20;
  for (const c of comps) {
    const w = c.size.w + 3, d = c.size.d;
    if (x + w > 40) { x = -35; z += rowD + 3; rowD = 0; }
    c.group.position.set(x + c.size.w / 2, 0, z + d / 2 - (d > 14 ? 3 : 0)); rowD = Math.max(rowD, d); x += w;
    scene.add(c.group); S.comps.push(c); maxZ = Math.max(maxZ, z + d);
  }
  W.extent = {z1: maxZ}; S.reindex(); scene.updateMatrixWorld(true);
  for (const t of S.terms.values()) t.pos = t.local.clone().applyMatrix4(t.group.matrixWorld);
  S.dirty = true; W.resetView(); W.comps = comps; pending = null; if (W.onChange) W.onChange();
};

/* ---------- wires ---------- */
function termPos(id) { const t = S.terms.get(id); return t.pos || (t.pos = t.local.clone().applyMatrix4(t.group.matrixWorld)); }
function curveFor(A, B2) {
  const d = A.distanceTo(B2); const mid = A.clone().add(B2).multiplyScalar(0.5); mid.y = Math.max(A.y, B2.y) + 2.6 + d * 0.14;
  const a1 = A.clone(); a1.y += 1.4; const b1 = B2.clone(); b1.y += 1.4;
  return new T.CatmullRomCurve3([A, a1, mid, b1, B2], false, 'catmullrom', 0.4);
}
function wireMesh(A, B2, color, r, opacity) {
  const grp = new T.Group();
  const m = new T.Mesh(new T.TubeGeometry(curveFor(A, B2), 40, r, 8), new T.MeshStandardMaterial({color, roughness: 0.45, transparent: opacity < 1, opacity, emissive: opacity < 1 ? color : 0x000000, emissiveIntensity: opacity < 1 ? 0.8 : 0}));
  m.castShadow = opacity >= 1; grp.add(m);
  [A, B2].forEach(p => { const s = new T.Mesh(new T.SphereGeometry(r * 1.5, 10, 8), m.material); s.position.copy(p); grp.add(s); });
  grp.userData.main = m; return grp;
}
function autoColor(a, b) {
  const has = s => a === s || b === s || a.startsWith(s) || b.startsWith(s);
  if (a.startsWith('ard:GND') || b.startsWith('ard:GND') || a.includes('.k') && false) return 'black';
  if (a === 'ard:5V' || b === 'ard:5V') return 'red'; if (a === 'ard:3V3' || b === 'ard:3V3') return 'orange';
  return AUTO[colI++ % AUTO.length];
}
W.resolve = function (id) { if (id === 'ard:GND') { id = GND_CYCLE[gndI++ % 3]; } return id; };
W.addWire = function (a, b, color, silent) {
  if (a === b || !S.terms.has(a) || !S.terms.has(b)) return null;
  if (W.wires.some(w => (w.a === a && w.b === b) || (w.a === b && w.b === a))) return null;
  const cname = color || (W.wireColor === 'auto' ? autoColor(a, b) : W.wireColor);
  const w = {a, b, cname, id: Math.random().toString(36).slice(2)};
  w.mesh = wireMesh(termPos(a), termPos(b), COLORS[cname], 0.2, 1); wireGroup.add(w.mesh); w.mesh.userData.wire = w; w.mesh.userData.main.userData.wire = w;
  W.wires.push(w); S.wires.push(w); S.dirty = true;
  if (!silent) { W.beep(520, 0.05); if (W.onChange) W.onChange(); }
  return w;
};
W.removeWire = function (w) {
  wireGroup.remove(w.mesh); W.wires = W.wires.filter(x => x !== w); S.wires = S.wires.filter(x => x !== w); S.dirty = true; W.beep(300, 0.06); if (W.onChange) W.onChange();
};
W.clearWires = function (silent) {
  for (const w of W.wires) wireGroup.remove(w.mesh);
  W.wires = []; S.wires = []; S.dirty = true; gndI = 0; colI = 0; if (!silent && W.onChange) W.onChange();
};
W.clearHints = function () { while (hintGroup.children.length) hintGroup.remove(hintGroup.children[0]); W.hintsOn = false; };
W.showHints = function (list) {
  W.clearHints(); W.hintsOn = true;
  list.forEach(([a, b], i) => { a = a.replace('ard:GND', 'ard:GND1'); b = b.replace('ard:GND', 'ard:GND1'); hintGroup.add(wireMesh(termPos(a), termPos(b), 0x39e6ff, 0.12, 0.45)); });
};
W.autoWire = function (list) {
  W.clearHints(); for (const [a, b] of list) W.addWire(W.resolve(a), W.resolve(b), null, true); W.beep(700, 0.1); if (W.onChange) W.onChange();
};

/* ---------- audio ---------- */
let actx = null, osc = null, og = null;
W.audioInit = function () { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (actx && actx.state === 'suspended') actx.resume(); };
W.beep = function (f, dur) {
  if (!actx) return; const o = actx.createOscillator(), g2 = actx.createGain(); o.frequency.value = f; o.type = 'sine'; g2.gain.value = 0.05;
  o.connect(g2); g2.connect(actx.destination); o.start(); g2.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur); o.stop(actx.currentTime + dur + 0.02);
};
function buzz(on) {
  if (!actx) return;
  if (on && !osc) { osc = actx.createOscillator(); og = actx.createGain(); osc.type = 'square'; osc.frequency.value = 2700; og.gain.value = 0.035; osc.connect(og); og.connect(actx.destination); osc.start(); }
  if (!on && osc) { osc.stop(); osc.disconnect(); og.disconnect(); osc = null; }
}

/* ---------- interaction ---------- */
function setMouse(e) { const r = canvas.getBoundingClientRect(); mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(mouse, camera); }
function pickTerm() { const hits = ray.intersectObjects(P.hits.concat(permHits), false); for (const h of hits) if (h.object.userData.term) return {id: h.object.userData.term, d: h.distance}; return null; }
function pickAction() { const hits = ray.intersectObjects(P.picks, false); return hits.length ? {obj: hits[0].object, d: hits[0].distance} : null; }
function pickWire() { const ms = W.wires.map(w => w.mesh.userData.main); const h = ray.intersectObjects(ms, false); return h.length ? h[0].object.userData.wire : null; }
const plane = new T.Plane(new T.Vector3(0, 1, 0), 0); const pt = new T.Vector3();

function bindEvents() {
  canvas.addEventListener('pointerdown', e => {
    if (e.button !== 0) return; W.audioInit(); setMouse(e);
    const tm = pickTerm(), ac = pickAction();
    if (tm && (!ac || tm.d <= ac.d + 1)) {
      e.stopImmediatePropagation();
      if (pending && pending !== tm.id) { W.addWire(pending, tm.id); pending = null; } else { drag = {from: tm.id, moved: false, sx: e.clientX, sy: e.clientY}; }
      canvas.setPointerCapture(e.pointerId); return;
    }
    if (ac) {
      const o = ac.obj.userData;
      if (o.press) { e.stopImmediatePropagation(); o.press.state.pressed = true; S.dirty = true; pickAct = {type: 'press', c: o.press}; canvas.setPointerCapture(e.pointerId); return; }
      if (o.pot) { e.stopImmediatePropagation(); pickAct = {type: 'pot', c: o.pot, x: e.clientX, y: e.clientY}; canvas.setPointerCapture(e.pointerId); return; }
      if (o.reset) { e.stopImmediatePropagation(); S.resetSketch(); W.beep(400, 0.1); return; }
    }
    pending = null;
  }, true);
  canvas.addEventListener('pointermove', e => {
    setMouse(e);
    if (pickAct && pickAct.type === 'pot') {
      const c = pickAct.c; const dx = e.clientX - pickAct.x, dy = e.clientY - pickAct.y; pickAct.x = e.clientX; pickAct.y = e.clientY;
      c.state.pos = Math.max(0, Math.min(1, c.state.pos + (dx - dy) * 0.004)); S.dirty = true; if (W.onPick) W.onPick(c); return;
    }
    if (drag) {
      if (Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) > 4) drag.moved = true;
      if (drag.moved) {
        const a = termPos(drag.from); plane.constant = -a.y; const tm = pickTerm();
        const b = tm ? termPos(tm.id).clone() : (ray.ray.intersectPlane(plane, pt) ? pt.clone() : a.clone());
        if (tempWire) scene.remove(tempWire); tempWire = wireMesh(a, b, 0x39e6ff, 0.16, 0.8); scene.add(tempWire);
      }
    }
    updateHover(e);
  });
  const up = e => {
    if (pickAct) { if (pickAct.type === 'press') { pickAct.c.state.pressed = false; S.dirty = true; } pickAct = null; }
    if (drag) {
      setMouse(e); const tm = pickTerm(); const from = drag.from; const moved = drag.moved; drag = null;
      if (tempWire) { scene.remove(tempWire); tempWire = null; }
      if (moved) { if (tm && tm.id !== from) W.addWire(from, tm.id); pending = null; }
      else { pending = (pending === from) ? null : from; }      // click-click mode
    }
  };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('dblclick', e => { setMouse(e); if (pickTerm()) return; const w = pickWire(); if (w) W.removeWire(w); });
  canvas.addEventListener('contextmenu', e => { e.preventDefault(); setMouse(e); if (pickTerm()) return; const w = pickWire(); if (w) W.removeWire(w); });
  window.addEventListener('keydown', e => { if (e.key === 'Escape') { pending = null; drag = null; if (tempWire) { scene.remove(tempWire); tempWire = null; } } });
  window.addEventListener('resize', W.resize);
}
const tip = () => document.getElementById('tip');
function updateHover(e) {
  const tm = drag && drag.moved ? pickTerm() : pickTerm(); const ac = !tm && pickAction();
  const t = tip(); hoverTerm = tm ? tm.id : null;
  if (!tm) { const w = pickWire(); if (hoverWire !== w) { if (hoverWire) hoverWire.mesh.userData.main.material.emissive.setHex(0); hoverWire = w; if (w) w.mesh.userData.main.material.emissive.setHex(0x553322); } }
  else if (hoverWire) { hoverWire.mesh.userData.main.material.emissive.setHex(0); hoverWire = null; }
  canvas.style.cursor = tm ? 'crosshair' : (ac ? 'grab' : (hoverWire ? 'not-allowed' : 'default'));
  if (tm) {
    const term = S.terms.get(tm.id); const v = S.volt(tm.id);
    t.innerHTML = '<b>' + term.label + '</b><span>' + v.toFixed(2) + ' V</span>' + (pending ? '<em>click to connect from ' + S.terms.get(pending).label + '</em>' : '');
    t.style.display = 'block';
  } else if (hoverWire) {
    t.innerHTML = '<b>Wire</b><em>double-click or right-click to remove</em>'; t.style.display = 'block';
  } else if (ac) {
    const o = ac.obj.userData; t.innerHTML = '<b>' + (o.press ? 'Hold to press the switch' : o.pot ? 'Drag to turn the knob' : 'Reset button') + '</b>'; t.style.display = 'block';
  } else t.style.display = 'none';
  const r = canvas.getBoundingClientRect(); t.style.left = Math.min(e.clientX - r.left + 16, r.width - 230) + 'px'; t.style.top = (e.clientY - r.top + 16) + 'px';
}

/* ---------- frame ---------- */
let t0 = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now; t0 += dt;
  S.ensure();
  let buz = false;
  for (const c of S.comps) { c.update(dt); if (c.sounding) buz = true; }
  buzz(buz);
  // onboard LEDs
  const L = W.led; L.L.emissiveIntensity = 0.05 + S.out[13] * (S.mode[13] === 1 ? 3 : 0);
  L.ON.emissiveIntensity = 2.2; const act = S.Serial.tx.length > 0 || performance.now() < (W.txUntil || 0);
  L.TX.emissiveIntensity = act ? 2.5 : 0.05; L.RX.emissiveIntensity = performance.now() < (W.txUntil || 0) ? 2.5 : 0.05;
  // hover ring
  const h = drag && drag.moved ? hoverTerm : hoverTerm || pending;
  const rp = pending && !hoverTerm ? pending : hoverTerm;
  if (rp && S.terms.has(rp)) { const p = termPos(rp); ring.position.copy(p); ring.position.y += 0.1; ring.visible = true; ring.scale.setScalar(1 + Math.sin(t0 * 8) * 0.12); } else ring.visible = false;
  controls.update(); renderer.render(scene, camera);
}
W.camera = () => camera;
})(window);
