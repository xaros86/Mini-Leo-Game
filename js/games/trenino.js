// Minigioco 4: "Il trenino dei colori".
// Gli orsetti gommosi aspettano sulla banchina: si trascinano nel vagone del loro colore.
// Quando il treno è pieno fischia, sbuffa e parte; ne arriva un altro con colori nuovi.
import * as THREE from '../vendor/three.module.min.js';
import { rand, pickOne, clamp, lerp, easeInOut, buzz } from '../shared/utils.js';
import { sfx, music, N } from '../shared/audio.js';
import { createStage } from '../shared/stage.js';
import { createLeo } from '../shared/leo.js';
import { ball, mesh, smile, toon, glow, CYL, CONE, BOX, blobShadow, SHY } from '../shared/toon.js';
import { createTweens, createParticles, shuffle, CONFETTI } from '../shared/fx.js';
import { decorFor, scatter, treeLine, createButterflies, checkerTexture } from '../shared/decor.js';
import { THEMES, meadowTree } from './prato.js';

const COLORS = [0xff5d73, 0x4d96ff, 0xffd93d, 0x6bcb77, 0xb46bff, 0xff9a3d];
const LEVELS = [[0, 1], [0, 1, 2], [2, 3, 1], [4, 0, 3], [5, 2, 1]]; // poi colori a caso, sempre 3 vagoni
const SEATS = 2, WAGON_L = 1.55;

function gummy(color) {
  const g = new THREE.Group();
  const gm = toon(color, { emissive: new THREE.Color(color).multiplyScalar(0.25).getHex() });
  g.add(ball(0.3, gm, 0, 0.38, 0, 1, 1.15, 0.85), ball(0.24, gm, 0, 0.8, 0.02));
  [-1, 1].forEach((k) => { g.add(ball(0.09, gm, k * 0.17, 1.0, 0)); g.add(ball(0.1, gm, k * 0.27, 0.5, 0.05, 0.8, 1.1, 0.8)); g.add(ball(0.11, gm, k * 0.14, 0.08, 0.05, 1, 0.8, 1.1)); });
  [-0.08, 0.08].forEach((x) => { g.add(ball(0.04, 0xffffff, x, 0.85, 0.2)); g.add(ball(0.025, 0x3b2a20, x, 0.85, 0.235)); });
  g.add(ball(0.045, 0x3b2a20, 0, 0.77, 0.24, 1.2, 0.8, 0.6), smile(0.05, 0x3b2a20, 0, 0.71, 0.23));
  // contorno nero da cartone animato: una copia un po' più grande, scura, vista "da dietro"
  g.children.filter((m) => m.material === gm).forEach((m) => {
    const o = new THREE.Mesh(m.geometry, OUTLINE);
    o.position.copy(m.position); o.scale.copy(m.scale).multiplyScalar(1.12); o.rotation.copy(m.rotation);
    g.add(o);
  });
  return g;
}
const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x1a1420, side: THREE.BackSide });
// colore pastello per i vagoni: stesso colore degli orsetti ma più tenue, così gli orsetti risaltano
const pastel = (c, k = 0.5) => new THREE.Color(c).lerp(new THREE.Color(0xffffff), k).getHex();
function wheel(x, z) { const w = mesh(CYL, 0x333344, x, 0.22, z, 0.22, 0.1, 0.22); w.rotation.x = Math.PI / 2; w.add(mesh(CYL, 0xd8d8e0, 0, z > 0 ? 0.06 : -0.06, 0, 0.4, 0.2, 0.4)); return w; }
function wagon(color) {
  const g = new THREE.Group();
  g.add(mesh(BOX, 0x444455, 0, 0.3, 0, WAGON_L - 0.1, 0.12, 0.8));
  g.add(mesh(BOX, pastel(color, 0.5), 0, 0.6, 0, WAGON_L - 0.15, 0.5, 0.9));
  g.add(mesh(BOX, pastel(color, 0.25), 0, 0.87, 0, WAGON_L - 0.05, 0.08, 1.0));
  g.add(mesh(BOX, pastel(color, 0.25), 0, 0.6, 0.455, WAGON_L - 0.5, 0.16, 0.01)); // fascia colorata sul fianco
  g.add(ball(0.12, glow(0xffffff, { transparent: true, opacity: 0.5 }), -0.45, 0.65, 0.46, 1, 1, 0.2));
  const wheels = [-0.45, 0.45].flatMap((x) => [wheel(x, 0.42), wheel(x, -0.42)]);
  wheels.forEach((w) => g.add(w));
  g.add(mesh(BOX, 0x666677, -WAGON_L / 2, 0.32, 0, 0.2, 0.06, 0.1));
  return { g, wheels, color, seats: [], seatPos: [-0.33, 0.33].map((x) => new THREE.Vector3(x, 0.7, 0)) };
}
function locomotive() {
  const g = new THREE.Group(), C = 0x5a6c9a, GOLD = 0xffd23f, RED = 0xff5d73;
  g.add(mesh(BOX, 0x444455, 0, 0.3, 0, 1.6, 0.14, 0.8));
  const boiler = mesh(CYL, C, 0.25, 0.75, 0, 0.42, 1.1, 0.42); boiler.rotation.z = Math.PI / 2; g.add(boiler);
  [0.0, 0.5].forEach((x) => { const r = mesh(CYL, GOLD, x, 0.75, 0, 0.44, 0.06, 0.44); r.rotation.z = Math.PI / 2; g.add(r); });
  g.add(mesh(BOX, RED, -0.5, 0.95, 0, 0.6, 0.9, 0.9), mesh(BOX, 0x8a2a3a, -0.5, 1.45, 0, 0.75, 0.1, 1.0));
  g.add(mesh(BOX, glow(0xbfeaff), -0.5, 1.05, 0.46, 0.35, 0.3, 0.02));
  g.add(mesh(new THREE.CylinderGeometry(0.16, 0.1, 0.45, 12), 0x333344, 0.5, 1.35, 0));
  g.add(ball(0.14, GOLD, 0.0, 1.2, 0));
  // faccina sul davanti
  const face = new THREE.Group(); face.position.set(0.82, 0.75, 0); face.rotation.y = Math.PI / 2; g.add(face);
  face.add(mesh(CYL, 0xe8ecf4, 0, 0, 0, 0.36, 0.04, 0.36)).children; face.children[0].rotation.x = Math.PI / 2;
  [-0.12, 0.12].forEach((x) => face.add(ball(0.05, 0x222233, x, 0.08, 0.04)));
  face.add(smile(0.1, 0x222233, 0, -0.06, 0.04));
  [-0.22, 0.22].forEach((x) => face.add(ball(0.05, 0xff9ab0, x, -0.04, 0.03, 1, 0.6, 0.4)));
  g.add(mesh(CONE, 0x444455, 0.92, 0.22, 0, 0.18, 0.3, 0.4)).children;
  const wheels = [[0.45, 0.26], [-0.05, 0.26], [-0.5, 0.3]].flatMap(([x, r]) => [wheel(x, 0.42), wheel(x, -0.42)]);
  wheels.forEach((w) => g.add(w));
  return { g, wheels, chimney: new THREE.Vector3(0.5, 1.6, 0) };
}

const stage = createStage();
// area di gioco: stretta e alta in verticale, larga e bassa in orizzontale
const fitStage = () => stage.fit(window.innerWidth < window.innerHeight ? { w: 8.6, tilt: 0.95, fov: 32, tall: 4, top: 0.86, maxD: 10 } : { w: 18, tilt: 0.95, fov: 32, tall: 4, top: 0.86, maxD: 8 });
const { scene, camera } = stage;
const tweens = createTweens();
const particles = createParticles(scene);
const leoLift = new THREE.Group(); leoLift.position.y = 0.22; scene.add(leoLift); // Leo sta sulla banchina
const leo = createLeo({ parent: leoLift });
const level = new THREE.Group(); scene.add(level);
let flutter = null;
let renderer = null, active = false, levelIndex = 0, train = null, bears = [], drag = null, state = 'idle', idleT = 0, railZ = 0;

const TS = 1.2; // grandezza del treno
let tunnelX = 10;
function buildScenery() {
  level.clear();
  stage.setTheme(THEMES[0]);
  const b = stage.bounds, p = window.innerWidth < window.innerHeight;
  railZ = b.zMin + 1.9;
  // massicciata, traversine e binari
  level.add(mesh(BOX, 0xc2b49a, 0, 0.03, railZ, 80, 0.06, 1.7));
  for (let x = -40; x <= 40; x += 0.62) level.add(mesh(BOX, 0x8a5a34, x, 0.07, railZ, 0.26, 0.05, 1.3));
  [-0.45, 0.45].forEach((dz) => level.add(mesh(BOX, 0xa8b0c0, 0, 0.12, railZ + dz, 80, 0.07, 0.08)));
  // banchina a piastrelle con la riga gialla
  const pz0 = railZ + 1.0, pz1 = b.zMax + 2;
  const tex = checkerTexture('#efe3cc', '#f8f0e0', 8); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(20, (pz1 - pz0) / 4);
  const plat = new THREE.Mesh(new THREE.BoxGeometry(80, 0.22, pz1 - pz0), new THREE.MeshLambertMaterial({ map: tex })); plat.position.set(0, 0.11, (pz0 + pz1) / 2); level.add(plat);
  level.add(mesh(BOX, 0xffd23f, 0, 0.225, pz0 + 0.25, 80, 0.01, 0.1), mesh(BOX, 0xd8c8ac, 0, 0.12, pz0 + 0.02, 80, 0.24, 0.06));
  // stazione dietro i binari, con l'orologio
  const st = new THREE.Group(); st.position.set(p ? -1.2 : -3.5, 0, railZ - 2.4); level.add(st);
  st.add(mesh(BOX, 0xffe0c8, 0, 1.0, 0, 3.4, 2.0, 1.6), mesh(BOX, 0xffffff, 0, 2.02, 0, 3.6, 0.1, 1.8));
  const roof = new THREE.Shape(); roof.moveTo(-1.9, 0); roof.lineTo(1.9, 0); roof.lineTo(1.4, 0.8); roof.lineTo(-1.4, 0.8); roof.closePath();
  const rm = new THREE.Mesh(new THREE.ExtrudeGeometry(roof, { depth: 1.9, bevelEnabled: false }), toon(0x5a8adf)); rm.position.set(0, 2.05, -0.95); st.add(rm);
  st.add(mesh(BOX, 0xffe0c8, 0, 3.15, 0, 0.9, 0.8, 0.9), mesh(new THREE.ConeGeometry(0.75, 0.6, 4), 0x5a8adf, 0, 3.85, 0)); st.children[st.children.length - 1].rotation.y = Math.PI / 4;
  st.add(mesh(CYL, 0xffffff, 0, 3.15, 0.46, 0.32, 0.04, 0.32)); st.children[st.children.length - 1].rotation.x = Math.PI / 2;
  st.add(mesh(BOX, 0x333344, 0, 3.22, 0.49, 0.03, 0.2, 0.01), mesh(BOX, 0x333344, 0.06, 3.15, 0.49, 0.14, 0.03, 0.01)); // lancette
  [-1.1, 0, 1.1].forEach((x, i) => {
    if (i === 1) st.add(mesh(BOX, 0x8a4a2a, x, 0.6, 0.81, 0.6, 1.2, 0.04));
    else { st.add(mesh(BOX, 0xffffff, x, 1.15, 0.81, 0.62, 0.62, 0.03), mesh(BOX, glow(0xffe9a8), x, 1.15, 0.83, 0.5, 0.5, 0.02)); st.add(mesh(BOX, 0x8a5a34, x, 0.78, 0.9, 0.66, 0.12, 0.16)); for (let k = 0; k < 4; k++) st.add(ball(0.06, pickOne([0xff5d73, 0xffd93d, 0xff7bd5]), x - 0.22 + k * 0.15, 0.88, 0.92)); }
  });
  // collina con la galleria dove il treno se ne va
  tunnelX = b.xHalf + (p ? 1.6 : 2.5);
  const hill = new THREE.Group(); hill.position.set(tunnelX + 2.2, 0, railZ); level.add(hill);
  hill.add(ball(3, 0x6cc94e, 0, -0.4, 0, 1, 0.85, 1.1), ball(1.8, 0x7fd65b, -0.8, 1.2, -0.6));
  const arch = mesh(new THREE.CircleGeometry(1.0, 24, 0, Math.PI), 0x2a2a34, -2.62, 0.05, 0); arch.rotation.y = -Math.PI / 2; hill.add(arch);
  const ring = mesh(new THREE.TorusGeometry(1.05, 0.14, 6, 20, Math.PI), 0xb8b0a8, -2.6, 0.05, 0); ring.rotation.y = -Math.PI / 2; hill.add(ring);
  treeLine(level, () => meadowTree(), [0.4, 1.6], railZ - 1.6 - 0.0 + 0); level.children.slice(-4).forEach((o) => o.position.add(new THREE.Vector3(tunnelX + 1.6, 0, 0)));
  // casette e alberi sullo sfondo
  const cols = [0xff9a8a, 0x8ac8ff, 0xffd27a, 0xb8a0ff, 0x9be0a0];
  for (let i = 0; i < 24; i++) { // un paesino su più file, fino in fondo
    const row = Math.floor(i / 6), x = -9 + (i % 6) * 3.4 + rand(-0.5, 0.5) + (row % 2) * 1.6, hz = railZ - 4.6 - row * 2.6 + rand(-0.3, 0.3);
    if (row === 0 && Math.abs(x - st.position.x) < 2.6) continue;
    if (Math.random() < 0.3) { treeLine(level, () => meadowTree(), [x], hz, [1, 1.3]); continue; }
    const h = new THREE.Group(); h.position.set(x, 0, hz); level.add(h);
    h.add(mesh(BOX, cols[i % cols.length], 0, 0.7, 0, 1.4, 1.4, 1.2));
    const r = mesh(new THREE.ConeGeometry(1.1, 0.8, 4), 0xd9534a, 0, 1.8, 0); r.rotation.y = Math.PI / 4; h.add(r);
    h.add(mesh(BOX, glow(0xffe9a8), 0, 0.85, 0.61, 0.4, 0.4, 0.02));
  }
  treeLine(level, () => meadowTree(), [-7, -4.6, 3.4, 6.2], railZ - 3.4, [0.9, 1.2]);
  level.add(ball(9, 0x6cc94e, -6, -4, railZ - 17, 1.6, 0.8, 1), ball(10, 0x7fd65b, 9, -4.5, railZ - 19, 1.6, 0.8, 1)); // colline in fondo
  // panchina, lampioni e fioriere sulla banchina (ai lati, per lasciare spazio agli orsetti)
  const deco = (x, z) => {
    const g = new THREE.Group(); g.position.set(x, 0.22, z); level.add(g);
    g.add(mesh(CYL, 0x3a5a3a, 0, 0.9, 0, 0.05, 1.8, 0.05), ball(0.16, glow(0xfff2b8), 0, 1.85, 0), mesh(new THREE.ConeGeometry(0.2, 0.15, 6), 0x3a5a3a, 0, 2.02, 0));
    const box = mesh(BOX, 0x9a5a34, 0.55, 0.15, 0, 0.6, 0.3, 0.3); g.add(box);
    for (let k = 0; k < 4; k++) g.add(ball(0.08, pickOne([0xff5d73, 0xffd93d, 0xff7bd5, 0x8fd0ff]), 0.35 + k * 0.13, 0.36, 0));
  };
  deco(-b.xHalf + 0.5, pz0 + 0.7); deco(b.xHalf - 1.1, pz0 + 0.7);
  const bench = new THREE.Group(); bench.position.set(p ? 0.6 : 2, 0.22, pz0 + 0.75); level.add(bench);
  bench.add(mesh(BOX, 0xd9534a, 0, 0.35, 0, 1.2, 0.08, 0.36), mesh(BOX, 0xd9534a, 0, 0.6, -0.16, 1.2, 0.3, 0.06));
  [-0.5, 0.5].forEach((x) => bench.add(mesh(BOX, 0x333344, x, 0.18, 0, 0.06, 0.36, 0.3)));
  // fioriere lungo il bordo davanti e una pila di valigie
  for (let x = -b.xHalf + 0.4; x <= b.xHalf - 0.3; x += 1.6) {
    const f = new THREE.Group(); f.position.set(x, 0.22, b.zMax - 0.35); level.add(f);
    f.add(mesh(BOX, 0x9a5a34, 0, 0.18, 0, 0.9, 0.36, 0.4));
    for (let k = 0; k < 5; k++) f.add(ball(0.1, pickOne([0xff5d73, 0xffd93d, 0xff7bd5, 0x8fd0ff, 0xffffff]), -0.32 + k * 0.16, 0.42, rand(-0.08, 0.08)));
    for (let k = 0; k < 3; k++) f.add(ball(0.12, 0x4cb847, -0.25 + k * 0.25, 0.36, -0.1));
  }
  const bags = new THREE.Group(); bags.position.set(b.xHalf - 0.9, 0.22, b.zMax - 1.6); level.add(bags);
  [[0x8a5adf, 0.7, 0.45, 0], [0xffb03a, 0.55, 0.35, 0.45], [0x4dc2a8, 0.4, 0.28, 0.8]].forEach(([c, w, h, y]) => { bags.add(mesh(BOX, c, 0, y + h / 2, 0, w, h, 0.32)); bags.add(mesh(BOX, 0x5a3a2a, 0, y + h + 0.04, 0, w * 0.35, 0.06, 0.06)); });
  const d = decorFor('prato');
  scatter(level, { x0: -b.xHalf - 5, x1: b.xHalf + 5, z0: railZ - 3.6, z1: railZ - 1.1 }, 14, d.small, [{ x0: st.position.x - 2, x1: st.position.x + 2, z0: -99, z1: 99 }, { x0: tunnelX - 1, x1: 99, z0: -99, z1: 99 }], 0.6);
  flutter = createButterflies(level, 2, { x0: -b.xHalf, x1: b.xHalf, z0: railZ - 3, z1: railZ - 1 });
}

function newTrain() {
  const cols = LEVELS[levelIndex] || shuffle([...COLORS.keys()]).slice(0, 3);
  const loco = locomotive();
  const wagons = cols.map((ci) => wagon(COLORS[ci]));
  const g = new THREE.Group(); g.add(loco.g); g.scale.setScalar(TS);
  wagons.forEach((w, i) => { w.g.position.x = -0.95 - WAGON_L * (i + 0.5) - 0.05 * i; g.add(w.g); });
  const len = (1.6 + wagons.length * (WAGON_L + 0.05)) * TS;
  const stopX = len / 2 - 0.8 * TS;
  g.position.set(-stage.bounds.xHalf - len - 2, 0, railZ);
  level.add(g);
  train = { g, loco, wagons, x: g.position.x, stopX, len, v: 0 };
  state = 'arrive';
  sfx.arp([N(19), N(16)], 0.25, { vol: 0.06, dur: 0.4, type: 'triangle', bright: 0.2 });
  // orsetti sulla banchina, mescolati
  const b = stage.bounds, p = window.innerWidth < window.innerHeight;
  const colors = shuffle(wagons.flatMap((w) => Array(SEATS).fill(w.color)));
  const n = colors.length, perRow = n > 5 ? Math.ceil(n / 2) : n;
  bears = colors.map((c, i) => {
    const row = Math.floor(i / perRow), col = i % perRow, rowN = row === 0 ? perRow : n - perRow;
    const span = Math.min(b.xHalf - 0.6, 1.4 * (rowN - 1) / 2);
    const home = new THREE.Vector3(rowN === 1 ? 0 : -span + (2 * span * col) / (rowN - 1) + row * 0.3, 0.24, railZ + (p ? 3.3 : 2.6) + row * 1.5);
    const m = gummy(c); m.position.copy(home); m.scale.setScalar(0.01); level.add(m);
    tweens.add(0.4, (k) => m.scale.setScalar(Math.max(0.01, k * 1.25)));
    return { m, color: c, home, seated: false, t: rand(0, 6), shadow: blobShadow(0.8, level) };
  });
}

function wagonAt(pos) {
  let best = null, bd = 1.3;
  for (const w of train.wagons) {
    const wp = w.g.getWorldPosition(new THREE.Vector3());
    const d = Math.hypot(pos.x - wp.x, (pos.z - wp.z) * 0.7);
    if (d < bd) { bd = d; best = w; }
  }
  return best;
}
function seat(bear, w) {
  bear.seated = true;
  const sp = w.seatPos[w.seats.length]; w.seats.push(bear);
  const from = bear.m.position.clone(), to = w.g.localToWorld(sp.clone());
  tweens.add(0.4, (k) => { bear.m.position.lerpVectors(from, to, k); bear.m.position.y += Math.sin(k * Math.PI) * 0.8; }, () => { w.g.attach(bear.m); bear.m.position.copy(sp); bear.m.rotation.set(0, 0, 0); bear.m.scale.setScalar(0.85); });
  level.remove(bear.shadow);
  sfx.voice('gummy'); buzz(25);
  particles.burst(to.clone().setY(1.2), [w.color, 0xffffff], 14, 2.5);
  leo.happy();
  if (bears.every((b) => b.seated)) setTimeout(depart, 900);
}
function sendHome(bear) {
  const from = bear.m.position.clone();
  bear.tw = tweens.add(0.45, (k) => { bear.m.position.lerpVectors(from, bear.home, k); bear.m.position.y = bear.home.y + Math.sin(k * Math.PI) * 0.7; });
  sfx.note(N(9), { vol: 0.04, dur: 0.25 });
}
function depart() {
  state = 'depart';
  sfx.arp([N(24), N(19), N(24), N(19)], 0.18, { vol: 0.07, dur: 0.3, type: 'triangle', bright: 0.3 });
  sfx.fanfare(); leo.happy(true); leo.wave();
  for (let i = 0; i < 3; i++) setTimeout(() => particles.burst(new THREE.Vector3(rand(-3, 3), 2.5, railZ), CONFETTI, 30, 5), i * 300);
}

export const game = {
  id: 'trenino',
  init(r) {
    renderer = r;
    stage.setTheme(THEMES.find((t) => t.id === 'citta'));
    fitStage();
    buildScenery();
    leo.pos.set(-stage.bounds.xHalf + 1.3, 0, railZ + 2.0); leo.target.copy(leo.pos);
    newTrain(); this.ready = true;
  },
  resize() { fitStage(); },
  enter() { active = true; music.set('allegra'); setTimeout(() => leo.wave(), 300); },
  exit() { active = false; if (drag) { sendHome(drag.b); drag = null; } },
  down(x, y, id) {
    if (!active || state !== 'wait' || drag) return;
    idleT = 0;
    let best = null, bd = 70;
    for (const b of bears) { if (b.seated) continue; const [sx, sy] = stage.toScreen(b.m.position.clone().setY(0.6)); const d = Math.hypot(sx - x, sy - y); if (d < bd) { bd = d; best = b; } }
    if (!best) return;
    drag = { b: best, id };
    tweens.cancel(best.tw);
    sfx.note(N(19), { vol: 0.04, dur: 0.2 });
    best.m.scale.setScalar(1.45);
  },
  move(x, y, id) {
    if (!drag || drag.id !== id) return;
    const g = stage.toGround(x, y); if (!g) return;
    const bd = stage.bounds;
    drag.b.m.position.set(clamp(g.x, -bd.xHalf, bd.xHalf), 0.7, clamp(g.z, railZ - 0.5, bd.zMax + 0.3));
  },
  up(x, y, id) {
    if (!drag || drag.id !== id) return;
    const b = drag.b; drag = null; b.m.scale.setScalar(1.25);
    const w = wagonAt(b.m.position);
    if (w && w.color === b.color && w.seats.length < SEATS) seat(b, w);
    else {
      if (w) { const g = w.g, y0 = g.position.y; tweens.add(0.4, (k) => (g.rotation.x = Math.sin(k * Math.PI * 4) * 0.06 * (1 - k))); }
      sendHome(b);
    }
  },
  frame(dt, time) {
    tweens.update(dt);
    leo.update(dt);
    if (flutter) flutter(dt);
    idleT += dt;
    if (train) {
      if (state === 'arrive') { // il treno arriva e rallenta
        const d = train.stopX - train.x;
        train.v = Math.min(5, Math.max(0.4, d * 1.4));
        train.x += train.v * dt;
        if (d < 0.02) { train.x = train.stopX; train.v = 0; state = 'wait'; leo.wave(); }
      } else if (state === 'depart') { // fischia e riparte
        train.v = Math.min(7, train.v + dt * 2.5);
        train.x += train.v * dt;
        if (Math.random() < 0.5) particles.burst(train.g.localToWorld(train.loco.chimney.clone()), [0xffffff, 0xe8e8f0], 2, 0.8, { up: 2.5, gravity: -0.5, sz: 2, lifeT: 1.2 });
        if (train.x > tunnelX + 1.5) { // dentro la galleria
          level.remove(train.g); train = null;
          levelIndex++;
          setTimeout(() => { if (!train) newTrain(); }, 500);
        }
      }
      if (train) {
        train.g.position.x = train.x;
        const spin = train.v * dt / 0.22;
        [...train.loco.wheels, ...train.wagons.flatMap((w) => w.wheels)].forEach((wh) => (wh.rotation.y -= spin));
        if (state === 'arrive' && Math.random() < 0.3) particles.burst(train.g.localToWorld(train.loco.chimney.clone()), [0xffffff, 0xe8e8f0], 2, 0.6, { up: 2, gravity: -0.5, sz: 1.8, lifeT: 1 });
      }
    }
    for (const b of bears) {
      b.t += dt;
      if (!b.seated && !(drag && drag.b === b)) {
        const hint = state === 'wait' && idleT > 9 && b === bears.find((q) => !q.seated);
        b.m.position.y = b.home.y + (hint ? Math.abs(Math.sin(time * 6)) * 0.4 : Math.abs(Math.sin(b.t * 2.2)) * 0.06);
        b.m.rotation.z = Math.sin(b.t * 1.7) * 0.06;
      }
      if (b.seated) b.m.rotation.z = Math.sin(b.t * 3) * 0.08;
      else b.shadow.position.set(b.m.position.x, 0.235, b.m.position.z);
    }
    particles.update(dt);
    renderer.render(scene, camera);
  },
};

if (location.search.includes('debug')) window.__trenino = { get bears() { return bears; }, get train() { return train; }, get state() { return state; }, stage, leo };
