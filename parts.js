/* 3D component builders. Each builder fills comp.group, registers terminals (pins) with SIM and defines electrical behaviour. */
(function (G) {
'use strict';
const T = G.THREE, S = G.SIM;
const P = G.Parts = {hits: [], picks: [], BUILD: {}, SIZE: {}};

/* ---------- helpers ---------- */
const matCache = {};
function mat(color, o) {
  const k = color + JSON.stringify(o || {});
  return matCache[k] || (matCache[k] = new T.MeshStandardMaterial(Object.assign({color, roughness: 0.55, metalness: 0.15}, o || {})));
}
function B(g, w, h, d, m, x, y, z) { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; }
function Cy(g, rt, rb, h, m, x, y, z, seg) { const o = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg || 20), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; }
function Sp(g, r, m, x, y, z) { const o = new T.Mesh(new T.SphereGeometry(r, 20, 14), m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; }
const GOLD = mat(0xd9b24a, {metalness: 0.9, roughness: 0.3});
const HITGEO = new T.SphereGeometry(0.62, 6, 4), HITMAT = new T.MeshBasicMaterial({visible: false});
const labelCache = {};
function textTex(text, o) {
  o = o || {}; const key = text + '|' + (o.color || '') + (o.font || '') + (o.w || '');
  if (labelCache[key]) return labelCache[key];
  const cv = document.createElement('canvas'); cv.width = o.w || 256; cv.height = o.h || 64;
  const x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height);
  x.fillStyle = o.color || '#ffffff'; x.font = o.font || 'bold 34px "Segoe UI",Arial,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, cv.width / 2, cv.height / 2 + 2);
  const t = new T.CanvasTexture(cv); t.anisotropy = 4; return (labelCache[key] = t);
}
function flat(g, text, x, y, z, w, o) {
  o = o || {}; const h = w * ((o.h || 64) / (o.w || 256));
  const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({map: textTex(text, o), transparent: true, depthWrite: false}));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); g.add(m); return m;
}
let glowTex = null;
function glow(g, color, size, x, y, z) {
  if (!glowTex) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d');
    const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gr; c.fillRect(0, 0, 128, 128); glowTex = new T.CanvasTexture(cv);
  }
  const s = new T.Sprite(new T.SpriteMaterial({map: glowTex, color, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false}));
  s.scale.set(size, size, 1); s.position.set(x, y, z); g.add(s); return s;
}
P.U = {mat, B, Cy, Sp, flat, glow, textTex, GOLD, HITGEO, HITMAT};

function newComp(type, o) {
  const c = {type, id: o.id, label: o.label || o.id, group: new T.Group(), terms: {}, state: {}, ui: [], opts: o, size: {w: 8, d: 8}};
  c.t = n => c.id + '.' + n; c.group.userData.comp = c; c.update = () => {}; return c;
}
function pin(c, name, label, x, y, z, col, showLabel) {
  const id = c.id + '.' + name; c.terms[name] = id;
  const m = col ? mat(col, {metalness: 0.5, roughness: 0.35}) : GOLD;
  Cy(c.group, 0.27, 0.27, 1.5, m, x, y - 0.75, z, 8);
  const h = new T.Mesh(HITGEO, HITMAT); h.position.set(x, y, z); h.userData.term = id; c.group.add(h); P.hits.push(h);
  S.addTerm({id, label: c.label + ' · ' + label, group: c.group, local: new T.Vector3(x, y, z), permanent: false});
  if (showLabel !== false) flat(c.group, label, x, 0.62, z + 1.25, 1.9, {w: 128, h: 48, font: 'bold 30px Arial', color: '#e8f0ff'});
}
function powerPins(c) { // generic sensor: settle() decides powered from VCC / GND pins
  c.powered = false;
  c.settle = () => {
    const was = c.powered; c.powered = S.volt(c.t('vcc')) - S.volt(c.t('gnd')) > 3 && S.volt(c.t('gnd')) < 1;
    return was !== c.powered;
  };
}
function lbl(c, y) { flat(c.group, c.label, 0, 0.08, c.size.d / 2 + 0.6, Math.max(7, c.size.w), {w: 512, h: 64, font: 'bold 34px "Segoe UI",Arial'}); }
function plate(c, w, d, color) { B(c.group, w, 0.5, d, mat(color || 0x2b3140), 0, 0.25, 0); }
function led(g, on) { return on; }
P.pinLabel = flat;

/* ---------- LED ---------- */
P.SIZE.led = {w: 7, d: 6};
P.BUILD.led = (c, o) => {
  const col = {red: 0xff2a2a, green: 0x22e04a, yellow: 0xffc41f, blue: 0x2f74ff, white: 0xf2f4ff}[o.color || 'red'];
  c.size = P.SIZE.led; const g = c.group;
  plate(c, 7, 4);
  Cy(g, 1.55, 1.55, 0.35, mat(0xd8d8d8, {transparent: true, opacity: 0.8}), 0, 0.7, 0);
  c.bodyMat = new T.MeshStandardMaterial({color: col, transparent: true, opacity: 0.78, emissive: col, emissiveIntensity: 0.04, roughness: 0.2});
  const cyl = Cy(g, 1.25, 1.25, 1.8, c.bodyMat, 0, 1.7, 0, 24);
  const dome = new T.Mesh(new T.SphereGeometry(1.25, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), c.bodyMat); dome.position.set(0, 2.6, 0); g.add(dome);
  B(g, 0.25, 1.2, 0.9, mat(0x888888, {metalness: 0.8}), -0.35, 1.9, 0); B(g, 0.25, 0.8, 0.9, mat(0x888888, {metalness: 0.8}), 0.35, 1.7, 0);
  pin(c, 'a', '+', -2.6, 1.9, 0, 0xcc2222); pin(c, 'k', '−', 2.6, 1.9, 0, 0x222222);
  c.glow = glow(g, col, 9, 0, 2.4, 0); c.b = 0;
  c.elements = () => (c.el = [{a: c.t('a'), b: c.t('k'), R: 100, polar: true}]);
  c.update = () => {
    const I = c.el && c.el[0] ? c.el[0].I : 0;
    const target = Math.sqrt(Math.max(0, Math.min(1, I / 0.025)));
    c.b += (target - c.b) * 0.6; c.bodyMat.emissiveIntensity = 0.04 + c.b * 2.2; c.glow.material.opacity = c.b * 0.9; c.state.on = c.b > 0.05;
  };
  lbl(c);
};

/* ---------- Buzzer ---------- */
P.SIZE.buzzer = {w: 8, d: 8};
P.BUILD.buzzer = (c) => {
  c.size = P.SIZE.buzzer; const g = c.group; plate(c, 8, 5);
  Cy(g, 2.7, 2.7, 2.6, mat(0x15151a), 0, 1.8, 0, 28); Cy(g, 0.5, 0.5, 0.1, mat(0x000000), 0, 3.12, 0, 12);
  c.ring = Cy(g, 2.75, 2.75, 0.12, mat(0x333344, {emissive: 0x2255ff, emissiveIntensity: 0}), 0, 2.2, 0, 28);
  flat(g, '+', -1.3, 3.15, 1.3, 1.4, {w: 64, h: 64});
  pin(c, 'p', '+', -3.4, 1.9, 0, 0xcc2222); pin(c, 'n', '−', 3.4, 1.9, 0, 0x222222);
  c.elements = () => (c.el = [{a: c.t('p'), b: c.t('n'), R: 120, polar: true}]);
  c.update = () => { const I = c.el && c.el[0] ? c.el[0].I : 0; c.sounding = I > 0.01; c.ring.material.emissiveIntensity = c.sounding ? 1.2 + Math.sin(performance.now() / 40) * 0.8 : 0; };
  lbl(c);
};

/* ---------- Resistor ---------- */
const BANDS = {0: 0x111111, 1: 0x7a4a1c, 2: 0xd42a2a, 3: 0xf08a1a, 4: 0xf2d41f, 5: 0x2a9b3a, 6: 0x2a5ad6, 7: 0x8a2ad6, 8: 0x888888, 9: 0xf4f4f4};
P.SIZE.resistor = {w: 9, d: 5};
P.BUILD.resistor = (c, o) => {
  c.size = P.SIZE.resistor; const g = c.group; plate(c, 9, 3.2);
  const ohms = o.ohms || 220; const s = String(ohms); const d1 = +s[0], d2 = +s[1] || 0, mult = s.length - 2;
  Cy(g, 0.8, 0.8, 4.4, mat(0xd8c08a), 0, 1.5, 0, 16).rotation.z = Math.PI / 2;
  [[d1, -1.5], [d2, -0.75], [mult, 0], [-1, 1.5]].forEach(([v, x]) => { const b = Cy(g, 0.84, 0.84, 0.32, mat(v < 0 ? 0xc9a227 : BANDS[v]), x, 1.5, 0, 16); b.rotation.z = Math.PI / 2; });
  B(g, 2.2, 0.15, 0.15, mat(0xaaaaaa, {metalness: 0.8}), -3.0, 1.5, 0); B(g, 2.2, 0.15, 0.15, mat(0xaaaaaa, {metalness: 0.8}), 3.0, 1.5, 0);
  pin(c, 'a', '', -3.8, 1.9, 0, 0, false); pin(c, 'b', '', 3.8, 1.9, 0, 0, false);
  flat(g, o.label || (ohms + ' Ω'), 0, 0.62, 1.7, 5, {w: 256, h: 64, font: 'bold 34px Arial', color: '#ffe9a8'});
  c.elements = () => (c.el = [{a: c.t('a'), b: c.t('b'), R: ohms}]);
};

/* ---------- Micro-switch ---------- */
P.SIZE.switch = {w: 9, d: 8};
P.BUILD.switch = (c) => {
  c.size = P.SIZE.switch; const g = c.group; plate(c, 9, 6);
  B(g, 5, 1.6, 4, mat(0x24262e), 0, 1.3, 0);
  c.cap = Cy(g, 1.35, 1.35, 1.2, mat(0xe03030, {emissive: 0x330000}), 0, 2.7, 0, 24); c.cap.userData.press = c; P.picks.push(c.cap);
  c.state.pressed = false; c.state.latch = false;
  pin(c, 'a', 'IN', -3.4, 1.9, 0); pin(c, 'b', 'OUT', 3.4, 1.9, 0);
  flat(g, 'HOLD ME', 0, 0.62, 2.9, 4, {w: 256, h: 64, font: 'bold 30px Arial', color: '#ff9c9c'});
  c.ui = [{type: 'toggle', key: 'latch', label: 'Latch switch ON (instead of holding)', value: false}];
  c.contacts = () => (c.state.pressed || c.state.latch ? [[c.t('a'), c.t('b')]] : []);
  c.update = () => { const dn = c.state.pressed || c.state.latch; c.cap.position.y += ((dn ? 2.05 : 2.7) - c.cap.position.y) * 0.5; };
  lbl(c);
};

/* ---------- Potentiometer ---------- */
P.SIZE.pot = {w: 10, d: 9};
P.BUILD.pot = (c) => {
  c.size = P.SIZE.pot; const g = c.group; plate(c, 10, 7);
  B(g, 6.4, 2.2, 5, mat(0x2f6fd0), 0, 1.6, -0.2);
  c.knob = new T.Group(); c.knob.position.set(0, 2.7, -0.2); g.add(c.knob);
  Cy(c.knob, 2, 2, 1.5, mat(0xf0f0f0), 0, 0.5, 0, 28); B(c.knob, 0.35, 0.1, 1.9, mat(0x111111), 0, 1.27, -0.9);
  c.knob.children.forEach(m => { m.userData.pot = c; P.picks.push(m); });
  c.state.pos = 0.5;
  pin(c, 'p1', '1', -3, 1.9, 3.6, 0x222222); pin(c, 'w', 'W', 0, 1.9, 3.6, 0xe0b000); pin(c, 'p3', '3', 3, 1.9, 3.6, 0xcc2222);
  c.ui = [{type: 'range', key: 'pos', label: 'Knob angle', min: 0, max: 1, step: 0.005, fmt: v => Math.round(v * 315) + '°  (' + Math.round(v * 1023) + ')', value: 0.5}];
  c.elements = () => (c.el = [{a: c.t('p1'), b: c.t('w'), R: Math.max(1, c.state.pos * 10000)}, {a: c.t('w'), b: c.t('p3'), R: Math.max(1, (1 - c.state.pos) * 10000)}]);
  c.update = () => { c.knob.rotation.y = -(c.state.pos * 315 - 157) * Math.PI / 180; };
  flat(g, '10K POT', 0, 0.62, -3.4, 4, {w: 256, h: 64, font: 'bold 28px Arial', color: '#9ec1ff'});
  lbl(c);
};

/* ---------- common module body ---------- */
function module4(c, w, d, color, names, cols) {
  plate(c, w, d, color);
  const n = names.length, step = 2, x0 = -(n - 1) * step / 2;
  names.forEach((nm, i) => pin(c, nm[0], nm[1], x0 + i * step, 1.9, -d / 2 + 0.9, cols ? cols[i] : (nm[0] === 'vcc' ? 0xcc2222 : nm[0] === 'gnd' ? 0x222222 : 0)));
}
function sensorOut(c, pinName, valueFn, powerGate) {
  c.sources = () => (c.powered ? [{t: c.t(pinName), V: Math.max(0, Math.min(5, valueFn() / 1023 * 5)), Rs: 100}] : []);
}

/* ---------- IR obstacle module ---------- */
P.SIZE.ir = {w: 12, d: 22};
P.BUILD.ir = (c) => {
  c.size = P.SIZE.ir; const g = c.group; powerPins(c);
  B(g, 9, 0.5, 4.8, mat(0x1d7a46), 0, 0.25, 0);
  [[-2.6, 0xe8e8ff, true], [2.6, 0x1a1a1a, false]].forEach(([x, col, clear]) => { Cy(g, 0.9, 0.9, 1.6, mat(col, clear ? {transparent: true, opacity: 0.6} : {}), x, 1.3, 1.5, 16); Sp(g, 0.9, mat(col, clear ? {transparent: true, opacity: 0.6} : {}), x, 2.1, 1.5); });
  B(g, 2.2, 1.4, 1.8, mat(0x2a6fd0), 0, 1.2, -0.3);
  c.led = Sp(g, 0.28, mat(0xff0000, {emissive: 0xff0000, emissiveIntensity: 0.1}), 3.7, 0.75, -1.1);
  [['vcc', 'VCC'], ['gnd', 'GND'], ['out', 'OUT']].forEach((nm, i) => pin(c, nm[0], nm[1], -2 + i * 2, 1.9, -1.5, nm[0] === 'vcc' ? 0xcc2222 : nm[0] === 'gnd' ? 0x222222 : 0));
  c.state.dist = 25; c.obs = B(g, 6, 3.4, 0.7, mat(0xf2f2f2), 0, 1.9, 8);
  c.ui = [{type: 'range', key: 'dist', label: 'Obstacle distance', min: 0, max: 30, step: 0.5, fmt: v => v.toFixed(1) + ' cm', value: 25}];
  c.val = () => Math.min(1023, 40 + c.state.dist * 37);
  sensorOut(c, 'out', c.val);
  c.update = () => { c.obs.position.z = 3.8 + c.state.dist * 0.4; c.led.material.emissiveIntensity = c.powered ? (c.val() < 260 ? 3 : 0.3) : 0.05; };
  lbl(c);
};

/* ---------- LDR ---------- */
P.SIZE.ldr = {w: 8, d: 8};
P.BUILD.ldr = (c) => {
  c.size = P.SIZE.ldr; const g = c.group; plate(c, 8, 5);
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d');
  x.fillStyle = '#c9a15a'; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#6b4a14'; x.lineWidth = 7; x.beginPath();
  for (let i = 0; i < 6; i++) { x.moveTo(15, 20 + i * 18); x.lineTo(113, 20 + i * 18); if (i < 5) x.lineTo(113, 38 + i * 18); } x.stroke();
  const d = Cy(g, 2.2, 2.2, 0.6, [mat(0xaa8844), new T.MeshStandardMaterial({map: new T.CanvasTexture(cv)}), mat(0xaa8844)], 0, 1.2, 0, 28);
  pin(c, 'a', '', -1.4, 1.9, 2.2, 0, false); pin(c, 'b', '', 1.4, 1.9, 2.2, 0, false);
  B(g, 0.15, 1.2, 0.15, mat(0xaaaaaa, {metalness: 0.8}), -1.4, 1.3, 1.7); B(g, 0.15, 1.2, 0.15, mat(0xaaaaaa, {metalness: 0.8}), 1.4, 1.3, 1.7);
  c.sun = Sp(g, 1.1, new T.MeshBasicMaterial({color: 0xffe066}), 0, 7, -0.5); c.sunGlow = glow(g, 0xffd84a, 9, 0, 7, -0.5);
  c.state.light = 80;
  c.ui = [{type: 'range', key: 'light', label: 'Light level (☀)', min: 0, max: 100, step: 1, fmt: v => v + ' %', value: 80}];
  c.R = () => 2000 * Math.pow(100 / Math.max(c.state.light, 0.5), 1.2);
  c.elements = () => (c.el = [{a: c.t('a'), b: c.t('b'), R: c.R()}]);
  c.update = () => { const l = c.state.light / 100; c.sun.material.color.setHSL(0.13, 1, 0.15 + l * 0.5); c.sunGlow.material.opacity = l; c.sun.scale.setScalar(0.5 + l * 0.7); };
  flat(g, 'LDR', 0, 0.62, -1.9, 3, {w: 128, h: 64});
  lbl(c);
};

/* ---------- Ultrasonic ---------- */
P.SIZE.ultra = {w: 14, d: 26};
P.BUILD.ultra = (c) => {
  c.size = P.SIZE.ultra; const g = c.group; powerPins(c);
  B(g, 12, 0.5, 5.4, mat(0x1b5fb0), 0, 0.25, 0);
  [-3.4, 3.4].forEach(x => { const t = Cy(g, 2.1, 2.1, 2.6, mat(0xb8bcc4, {metalness: 0.8, roughness: 0.3}), x, 1.8, 0.8, 28); t.rotation.x = Math.PI / 2; t.position.z = 1.4; Cy(g, 1.5, 1.5, 0.1, mat(0x222222), x, 1.8, 2.75, 20).rotation.x = Math.PI / 2; });
  B(g, 1.6, 0.8, 0.8, mat(0xcccccc, {metalness: 0.9}), 0, 0.9, 0.4);
  [['vcc', 'VCC'], ['trig', 'TRIG'], ['echo', 'ECHO'], ['gnd', 'GND']].forEach((nm, i) => pin(c, nm[0], nm[1], -3 + i * 2, 1.9, -1.8, nm[0] === 'vcc' ? 0xcc2222 : nm[0] === 'gnd' ? 0x222222 : 0));
  c.state.dist = 100; c.obs = B(g, 7, 4, 0.8, mat(0xf2f2f2), 0, 2.2, 8);
  c.ui = [{type: 'range', key: 'dist', label: 'Object distance', min: 2, max: 200, step: 1, fmt: v => v + ' cm', value: 100}];
  c.update = () => { c.obs.position.z = 5 + c.state.dist * 0.095; };
  lbl(c);
};

/* ---------- MQ-2 smoke module ---------- */
P.SIZE.smoke = {w: 11, d: 12};
P.BUILD.smoke = (c) => {
  c.size = P.SIZE.smoke; const g = c.group; powerPins(c);
  B(g, 9, 0.5, 6.4, mat(0x24367a), 0, 0.25, 0);
  const can = Cy(g, 2.5, 2.5, 3, mat(0xc4c8d0, {metalness: 0.9, roughness: 0.3}), 0, 2, 0.8, 28);
  Cy(g, 2.3, 2.3, 0.1, mat(0x30343c), 0, 3.55, 0.8, 28);
  c.hot = Cy(g, 2.4, 2.4, 0.12, mat(0x552200, {emissive: 0xff5500, emissiveIntensity: 0.1}), 0, 3.62, 0.8, 28);
  [['vcc', 'VCC'], ['gnd', 'GND'], ['do', 'DO'], ['ao', 'AO']].forEach((nm, i) => pin(c, nm[0], nm[1], -3 + i * 2, 1.9, -2.0, nm[0] === 'vcc' ? 0xcc2222 : nm[0] === 'gnd' ? 0x222222 : 0));
  c.puffs = []; for (let i = 0; i < 9; i++) { const p = Sp(g, 1, new T.MeshBasicMaterial({color: 0xbbbbbb, transparent: true, opacity: 0, depthWrite: false}), 0, 4, 0.8); p.userData.ph = i / 9; c.puffs.push(p); }
  c.state.level = 8;
  c.ui = [{type: 'range', key: 'level', label: 'Smoke / gas level', min: 0, max: 100, step: 1, fmt: v => v + ' %  → A0 = ' + Math.round(c.val()), value: 8}];
  c.val = () => Math.min(1023, 80 + c.state.level * 8.5);
  c.sources = () => c.powered ? [{t: c.t('ao'), V: c.val() / 1023 * 5, Rs: 100}, {t: c.t('do'), V: c.val() > 550 ? 0 : 5, Rs: 100}] : [];
  c.update = () => {
    const l = c.state.level / 100; c.hot.material.emissiveIntensity = c.powered ? 0.6 : 0.05; const now = performance.now() / 1000;
    c.puffs.forEach(p => { const ph = (p.userData.ph + now * 0.25) % 1; p.position.set(Math.sin(ph * 9 + p.userData.ph * 20) * (0.5 + ph * 2), 4 + ph * 9, 0.8 + Math.cos(ph * 7) * ph); p.scale.setScalar(0.6 + ph * 2.6); p.material.opacity = l * (1 - ph) * 0.55; });
  };
  lbl(c);
};

/* ---------- DHT11 ---------- */
P.SIZE.dht = {w: 9, d: 9};
P.BUILD.dht = (c) => {
  c.size = P.SIZE.dht; const g = c.group; powerPins(c);
  plate(c, 9, 6, 0x2b3140);
  B(g, 5, 4, 2.6, mat(0x2d82e0), 0, 2.3, 0.5);
  for (let i = 0; i < 6; i++) B(g, 4.2, 0.12, 0.35, mat(0x0d3a70), 0, 4.33, -0.6 + i * 0.5 + 0.3).rotation.x = 0;
  [['vcc', 'VCC'], ['data', 'DATA'], ['nc', 'NC'], ['gnd', 'GND']].forEach((nm, i) => pin(c, nm[0], nm[1], -3 + i * 2, 1.9, -2.2, nm[0] === 'vcc' ? 0xcc2222 : nm[0] === 'gnd' ? 0x222222 : 0));
  c.state.temp = 27; c.state.hum = 60;
  c.ui = [{type: 'range', key: 'temp', label: 'Temperature', min: 0, max: 50, step: 1, fmt: v => v + ' °C', value: 27}, {type: 'range', key: 'hum', label: 'Humidity', min: 20, max: 90, step: 1, fmt: v => v + ' %', value: 60}];
  flat(g, 'DHT11', 0, 4.4, 0.8, 3, {w: 128, h: 48, font: 'bold 26px Arial', color: '#ffffff'});
  lbl(c);
};

/* ---------- LCD 16x2 I2C ---------- */
P.SIZE.lcd = {w: 22, d: 11};
P.BUILD.lcd = (c) => {
  c.size = P.SIZE.lcd; const g = c.group; powerPins(c);
  B(g, 20, 0.5, 8.2, mat(0x0f7a3a), 0, 0.25, 0.4);
  B(g, 16.4, 1, 5.6, mat(0x1a1a1a), 0, 1, 0.6);
  c.cv = document.createElement('canvas'); c.cv.width = 640; c.cv.height = 160; c.ctx = c.cv.getContext('2d'); c.tex = new T.CanvasTexture(c.cv);
  const scr = new T.Mesh(new T.PlaneGeometry(14.4, 3.6), new T.MeshBasicMaterial({map: c.tex})); scr.rotation.x = -Math.PI / 2; scr.position.set(0, 1.52, 0.6); g.add(scr);
  B(g, 4.6, 0.4, 2, mat(0x1b4fa8), 6.8, 0.7, -3.0);
  [['gnd', 'GND'], ['vcc', 'VCC'], ['sda', 'SDA'], ['scl', 'SCL']].forEach((nm, i) => pin(c, nm[0], nm[1], 4.8 + i * 1.9 - 3.0, 1.9, -3.9 + 0.2, nm[0] === 'vcc' ? 0xcc2222 : nm[0] === 'gnd' ? 0x222222 : 0));
  c.lcd = {buf: [], cx: 0, cy: 0, cols: 16, rows: 2, bl: false, on: true, inited: false, addr: 0x27};
  for (let r = 0; r < 4; r++) c.lcd.buf.push(new Array(40).fill(' '));
  c.resetRuntime = () => { c.lcd.inited = false; c.lcd.bl = false; for (const r of c.lcd.buf) r.fill(' '); c.lastKey = null; };
  c.draw = () => {
    const L = c.lcd, x = c.ctx;
    const ok = c.powered && S.same(c.t('sda'), 'ard:A4') && S.same(c.t('scl'), 'ard:A5');
    const mode = !c.powered ? 0 : (ok && L.inited && (L.addr === 0x27 || L.addr === 0x3F) ? 2 : 1);
    const key = mode + '|' + L.bl + '|' + L.on + '|' + L.buf[0].slice(0, 16).join('') + L.buf[1].slice(0, 16).join('');
    if (key === c.lastKey) return; c.lastKey = key;
    const lit = mode > 0 && (mode === 1 || L.bl);
    x.fillStyle = lit ? '#2a63e8' : (mode > 0 ? '#16255a' : '#1b2430'); x.fillRect(0, 0, 640, 160);
    for (let r = 0; r < 2; r++) for (let col = 0; col < 16; col++) {
      const cx = col * 40 + 3, cy = r * 80 + 6;
      x.fillStyle = lit ? '#2257d6' : '#12204c'; x.fillRect(cx, cy, 34, 68);
      if (mode === 1 && r === 0) { x.fillStyle = '#e8f0ff'; x.fillRect(cx, cy, 34, 68); }
      else if (mode === 2 && L.on) {
        const ch = L.buf[r][col]; if (ch && ch !== ' ') { x.fillStyle = '#f4f8ff'; x.font = 'bold 56px "Courier New",monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch === 'ß' ? '°' : ch, cx + 17, cy + 36); }
      }
    }
    c.tex.needsUpdate = true;
  };
  c.update = () => c.draw();
  lbl(c);
};

/* ---------- Soil moisture ---------- */
P.SIZE.soil = {w: 14, d: 22};
P.BUILD.soil = (c) => {
  c.size = P.SIZE.soil; const g = c.group; powerPins(c);
  B(g, 8, 0.5, 4.4, mat(0x181a20), 0, 0.25, 0);
  B(g, 1.6, 1.0, 1.4, mat(0x3a8ad8), 2.6, 1.0, 0.5);
  [['vcc', 'VCC'], ['gnd', 'GND'], ['ao', 'AO'], ['do', 'DO']].forEach((nm, i) => pin(c, nm[0], nm[1], -3 + i * 2, 1.9, -1.4, nm[0] === 'vcc' ? 0xcc2222 : nm[0] === 'gnd' ? 0x222222 : 0));
  const pot = Cy(g, 4.6, 3.4, 4.2, mat(0xb5562f), 0, 2.1, 12.5, 28);
  c.soil = Cy(g, 4.3, 4.3, 0.3, mat(0xc9a66b), 0, 4.1, 12.5, 28);
  c.probe = new T.Group(); c.probe.position.set(0, 0, 12.5); g.add(c.probe);
  B(c.probe, 2.6, 8.5, 0.25, mat(0x14161a), 0, 6.2, 0); B(c.probe, 0.5, 6.5, 0.28, mat(0xd9b24a, {metalness: 0.9}), -0.7, 5.5, 0); B(c.probe, 0.5, 6.5, 0.28, mat(0xd9b24a, {metalness: 0.9}), 0.7, 5.5, 0);
  const cable = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(1.2, 1.0, 0.5), new T.Vector3(2, 3, 5), new T.Vector3(0, 8.5, 10), new T.Vector3(0, 9.8, 12.4)]), 20, 0.12, 6), mat(0x222222)); g.add(cable);
  c.state.wet = 0;
  c.ui = [{type: 'range', key: 'wet', label: 'Soil moisture', min: 0, max: 100, step: 1, fmt: v => v + ' %  → A0 = ' + Math.round(c.val()) + (c.val() >= 1000 ? '  (DRY)' : (c.val() <= 600 ? '  (WET)' : '')), value: 0}];
  c.val = () => 1023 - c.state.wet * 6.9;
  c.sources = () => c.powered ? [{t: c.t('ao'), V: c.val() / 1023 * 5, Rs: 100}, {t: c.t('do'), V: c.val() > 650 ? 5 : 0, Rs: 100}] : [];
  const dry = new T.Color(0xc9a66b), wet = new T.Color(0x2d1a0e);
  c.update = () => { c.soil.material = c.soilMat || (c.soilMat = new T.MeshStandardMaterial({color: 0xc9a66b, roughness: 1})); c.soilMat.color.copy(dry).lerp(wet, c.state.wet / 100); };
  lbl(c);
};

/* ---------- DC motor / water pump ---------- */
P.SIZE.motor = {w: 10, d: 9};
P.BUILD.motor = (c) => {
  c.size = P.SIZE.motor; const g = c.group; plate(c, 10, 5);
  Cy(g, 2.2, 2.2, 5, mat(0xb4b8c0, {metalness: 0.9, roughness: 0.3}), -0.5, 2.7, 0, 28).rotation.z = Math.PI / 2;
  B(g, 0.6, 0.6, 0.6, mat(0xaaaaaa), 2.9, 2.7, 0);
  c.prop = new T.Group(); c.prop.position.set(3.3, 2.7, 0); g.add(c.prop);
  for (let i = 0; i < 3; i++) { const b = B(c.prop, 0.15, 3.4, 1.0, mat(0x33a0ff, {transparent: true, opacity: 0.85}), 0, 0, 0); b.position.y = 1.7; b.rotation.y = 0.3; const holder = new T.Group(); holder.rotation.x = i * Math.PI * 2 / 3; holder.add(b); c.prop.add(holder); }
  pin(c, 'p', '+', -2, 1.9, 2.4, 0xcc2222); pin(c, 'n', '−', 2, 1.9, 2.4, 0x222222);
  c.elements = () => (c.el = [{a: c.t('p'), b: c.t('n'), R: 50}]);
  c.spin = 0;
  c.update = (dt) => { const I = c.el && c.el[0] ? c.el[0].I : 0; const tgt = Math.abs(I) > 0.02 ? Math.sign(I) * 18 : 0; c.spin += (tgt - c.spin) * 0.08; c.prop.rotation.x += c.spin * dt; };
  lbl(c);
};

/* ---------- Relay module ---------- */
P.SIZE.relay = {w: 16, d: 11};
P.BUILD.relay = (c) => {
  c.size = P.SIZE.relay; const g = c.group; powerPins(c);
  B(g, 15, 0.5, 7.4, mat(0x1a3e8a), 0, 0.25, 0);
  B(g, 7, 4.4, 5, mat(0x1c6bd8), -1, 2.7, 0.8);
  B(g, 2.2, 1.6, 2.4, mat(0x2a9a3a), 5.4, 1.2, 1.0);
  c.led = Sp(g, 0.4, mat(0xff2020, {emissive: 0xff0000, emissiveIntensity: 0}), -5.6, 0.7, 2.6);
  [['vcc', 'VCC'], ['gnd', 'GND'], ['in', 'IN']].forEach((nm, i) => pin(c, nm[0], nm[1], -6 + i * 2, 1.9, -2.8, nm[0] === 'vcc' ? 0xcc2222 : nm[0] === 'gnd' ? 0x222222 : 0));
  [['com', 'COM'], ['no', 'NO'], ['nc', 'NC']].forEach((nm, i) => pin(c, nm[0], nm[1], 2 + i * 2, 1.9, -2.8, 0x2a2a2a));
  c.energized = false;
  c.settle2 = c.settle;
  c.settle = () => { const a = c.settle2(); const was = c.energized; c.energized = c.powered && S.volt(c.t('in')) > 2.5; return a || was !== c.energized; };
  c.contacts = () => [[c.t('com'), c.energized ? c.t('no') : c.t('nc')]];
  c.update = () => { c.led.material.emissiveIntensity = c.energized ? 3 : 0; };
  flat(g, 'IN: HIGH = ON', 0, 0.62, 3.9, 6, {w: 256, h: 48, font: 'bold 24px Arial', color: '#9ec1ff'});
  lbl(c);
};

/* ---------- Lamp ---------- */
P.SIZE.lamp = {w: 8, d: 8};
P.BUILD.lamp = (c) => {
  c.size = P.SIZE.lamp; const g = c.group; plate(c, 8, 5);
  Cy(g, 1.4, 1.8, 1.6, mat(0x555a66, {metalness: 0.8}), 0, 1.3, 0, 16);
  c.bulbMat = new T.MeshStandardMaterial({color: 0xffffee, transparent: true, opacity: 0.55, emissive: 0xffc860, emissiveIntensity: 0});
  Sp(g, 2.3, c.bulbMat, 0, 4.4, 0);
  Cy(g, 0.12, 0.12, 2, mat(0xffaa22, {emissive: 0xff8800, emissiveIntensity: 0.4}), 0, 4.1, 0, 6);
  c.glow = glow(g, 0xffcc66, 16, 0, 4.4, 0);
  pin(c, 'a', '', -2.4, 1.9, 2.2, 0, false); pin(c, 'b', '', 2.4, 1.9, 2.2, 0, false);
  c.elements = () => (c.el = [{a: c.t('a'), b: c.t('b'), R: 100}]); c.b = 0;
  c.update = () => { const I = c.el && c.el[0] ? Math.abs(c.el[0].I) : 0; const t = Math.min(1, I / 0.04); c.b += (t - c.b) * 0.3; c.bulbMat.emissiveIntensity = c.b * 2.5; c.glow.material.opacity = c.b; };
  lbl(c);
};

P.build = function (type, o) {
  const c = newComp(type, o); P.BUILD[type](c, o);
  return c;
};
})(window);
