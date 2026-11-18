// Minigioco 4: "Il trenino dei colori".
// Gli orsetti gommosi aspettano sulla banchina: si trascinano nel vagone del loro colore.
// Quando il treno è pieno fischia, sbuffa e parte; ne arriva un altro con colori nuovi.
import * as THREE from '../vendor/three.module.min.js';
import { rand, clamp, lerp, easeInOut, buzz } from '../shared/utils.js';
import { sfx, music, N } from '../shared/audio.js';
import { createStage } from '../shared/stage.js';
import { createLeo } from '../shared/leo.js';
import { ball, mesh, smile, toon, glow, CYL, CONE, BOX, blobShadow, SHY } from '../shared/toon.js';
import { createTweens, createParticles, shuffle, CONFETTI } from '../shared/fx.js';
import { THEMES } from './prato.js';

const COLORS = [0xff5d73, 0x4d96ff, 0xffd93d, 0x6bcb77, 0xb46bff, 0xff9a3d];
const LEVELS = [[0, 1], [0, 1, 2], [2, 3, 1], [4, 0, 3], [5, 2, 1]]; // poi colori a caso, sempre 3 vagoni
const SEATS = 2, WAGON_L = 1.55;

function gummy(color) {
  const g = new THREE.Group();
  const gm = toon(color, { transparent: true, opacity: 0.88, emissive: new THREE.Color(color).multiplyScalar(0.25).getHex() });
  g.add(ball(0.3, gm, 0, 0.38, 0, 1, 1.15, 0.85), ball(0.24, gm, 0, 0.8, 0.02));
  [-1, 1].forEach((k) => { g.add(ball(0.09, gm, k * 0.17, 1.0, 0)); g.add(ball(0.1, gm, k * 0.27, 0.5, 0.05, 0.8, 1.1, 0.8)); g.add(ball(0.11, gm, k * 0.14, 0.08, 0.05, 1, 0.8, 1.1)); });
  [-0.08, 0.08].forEach((x) => { g.add(ball(0.04, 0xffffff, x, 0.85, 0.2)); g.add(ball(0.025, 0x3b2a20, x, 0.85, 0.235)); });
  g.add(ball(0.045, 0x3b2a20, 0, 0.77, 0.24, 1.2, 0.8, 0.6), smile(0.05, 0x3b2a20, 0, 0.71, 0.23));
  return g;
}
function wheel(x, z) { const w = mesh(CYL, 0x333344, x, 0.22, z, 0.22, 0.1, 0.22); w.rotation.x = Math.PI / 2; w.add(mesh(CYL, 0xd8d8e0, 0, z > 0 ? 0.06 : -0.06, 0, 0.4, 0.2, 0.4)); return w; }
function wagon(color) {
  const g = new THREE.Group();
  g.add(mesh(BOX, 0x444455, 0, 0.3, 0, WAGON_L - 0.1, 0.12, 0.8));
  g.add(mesh(BOX, color, 0, 0.6, 0, WAGON_L - 0.15, 0.5, 0.9));
  g.add(mesh(BOX, new THREE.Color(color).multiplyScalar(1.15).getHex(), 0, 0.87, 0, WAGON_L - 0.05, 0.08, 1.0));
  g.add(ball(0.12, glow(0xffffff, { transparent: true, opacity: 0.5 }), -0.45, 0.65, 0.46, 1, 1, 0.2));
  const wheels = [-0.45, 0.45].flatMap((x) => [wheel(x, 0.42), wheel(x, -0.42)]);
  wheels.forEach((w) => g.add(w));
  g.add(mesh(BOX, 0x666677, -WAGON_L / 2, 0.32, 0, 0.2, 0.06, 0.1));
  return { g, wheels, color, seats: [], seatPos: [-0.33, 0.33].map((x) => new THREE.Vector3(x, 0.55, 0)) };
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
const fitStage = () => { const aspect = window.innerWidth / window.innerHeight; stage.fit(aspect < 1 ? { w: 7 } : { w: 11 }); };
const { scene, camera } = stage;
const tweens = createTweens();
const particles = createParticles(scene);
const leo = createLeo({ parent: scene });
const level = new THREE.Group(); scene.add(level);
let renderer = null, active = false, levelIndex = 0, train = null, bears = [], drag = null, state = 'idle', idleT = 0, railZ = 0;

function buildScenery() {
  level.clear();
  const b = stage.bounds;
  railZ = b.zMin + 1.4;
  // binari, banchina e stazioncina
  [-0.42, 0.42].forEach((dz) => level.add(mesh(BOX, 0x9aa0b0, 0, 0.08, railZ + dz, 80, 0.06, 0.08)));
  for (let x = -30; x <= 30; x += 0.7) level.add(mesh(BOX, 0x9a6a44, x, 0.03, railZ, 0.25, 0.04, 1.2));
  level.add(mesh(BOX, 0xe8dcc8, 0, 0.06, (railZ + 1 + b.zMax + 1.5) / 2, 80, 0.1, b.zMax + 1.5 - railZ - 1));
  level.add(mesh(BOX, 0xffd23f, 0, 0.12, railZ + 1.05, 80, 0.03, 0.12));
  const house = new THREE.Group(); house.position.set(-b.xHalf - 1.5, 0, railZ - 2.6); level.add(house);
  house.add(mesh(BOX, 0xffb0a0, 0, 0.9, 0, 2.6, 1.8, 1.6));
  const roof = mesh(new THREE.ConeGeometry(1, 1, 4), 0x8a3a3a, 0, 2.2, 0, 2.2, 0.9, 1.4); roof.rotation.y = Math.PI / 4; house.add(roof);
  house.add(mesh(BOX, 0x7a4a2a, 0.5, 0.55, 0.81, 0.5, 1.1, 0.04), mesh(CYL, 0xffffff, -0.5, 1.4, 0.81, 0.28, 0.04, 0.28)).children;
}

function newTrain() {
  const cols = LEVELS[levelIndex] || shuffle([...COLORS.keys()]).slice(0, 3);
  const loco = locomotive();
  const wagons = cols.map((ci) => wagon(COLORS[ci]));
  const g = new THREE.Group(); g.add(loco.g);
  wagons.forEach((w, i) => { w.g.position.x = -0.95 - WAGON_L * (i + 0.5) - 0.05 * i; g.add(w.g); });
  const len = 1.6 + wagons.length * (WAGON_L + 0.05);
  const stopX = len / 2 - 0.8;
  g.position.set(-stage.bounds.xHalf - len - 2, 0, railZ);
  level.add(g);
  train = { g, loco, wagons, x: g.position.x, stopX, len, v: 0 };
  state = 'arrive';
  sfx.arp([N(19), N(16)], 0.25, { vol: 0.06, dur: 0.4, type: 'triangle', bright: 0.2 });
  // orsetti sulla banchina, mescolati
  const b = stage.bounds;
  const colors = shuffle(wagons.flatMap((w) => Array(SEATS).fill(w.color)));
  const n = colors.length, perRow = n > 5 ? Math.ceil(n / 2) : n;
  bears = colors.map((c, i) => {
    const row = Math.floor(i / perRow), col = i % perRow, rowN = row === 0 ? perRow : n - perRow;
    const span = Math.min(b.xHalf - 0.6, 1.4 * (rowN - 1) / 2);
    const home = new THREE.Vector3(rowN === 1 ? 0 : -span + (2 * span * col) / (rowN - 1) + row * 0.3, 0.1, b.zMax - 0.9 - row * 1.5);
    const m = gummy(c); m.position.copy(home); m.scale.setScalar(0.01); level.add(m);
    tweens.add(0.4, (k) => m.scale.setScalar(Math.max(0.01, k)));
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
  tweens.add(0.45, (k) => { bear.m.position.lerpVectors(from, bear.home, k); bear.m.position.y = bear.home.y + Math.sin(k * Math.PI) * 0.7; });
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
    leo.pos.set(-stage.bounds.xHalf + 0.7, 0, (railZ + stage.bounds.zMax) / 2 + 0.2); leo.target.copy(leo.pos);
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
    sfx.note(N(19), { vol: 0.04, dur: 0.2 });
    best.m.scale.setScalar(1.15);
  },
  move(x, y, id) {
    if (!drag || drag.id !== id) return;
    const g = stage.toGround(x, y); if (!g) return;
    const bd = stage.bounds;
    drag.b.m.position.set(clamp(g.x, -bd.xHalf, bd.xHalf), 0.7, clamp(g.z, railZ - 0.5, bd.zMax + 0.3));
  },
  up(x, y, id) {
    if (!drag || drag.id !== id) return;
    const b = drag.b; drag = null; b.m.scale.setScalar(1);
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
        if (train.x > stage.bounds.xHalf + train.len + 3) {
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
      else b.shadow.position.set(b.m.position.x, SHY, b.m.position.z);
    }
    particles.update(dt);
    renderer.render(scene, camera);
  },
};

if (location.search.includes('debug')) window.__trenino = { get bears() { return bears; }, get train() { return train; }, get state() { return state; }, stage, leo };
