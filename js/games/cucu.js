// Minigioco 5: "Cucù! Dov'è Leo?"
// Leo corre a nascondersi dietro un cespuglio, una casetta, una botte… e il bimbo tocca dove pensa che sia.
// Indovinato: Leo salta fuori ridendo. Sbagliato: esce una farfalla o un pulcino, e si riprova.
// Difficoltà: 2 nascondigli con un pezzo di Leo che spunta → 3 nascondigli → si scambiano di posto → 4 e due scambi.
import * as THREE from '../vendor/three.module.min.js';
import { rand, pickOne, buzz } from '../shared/utils.js';
import { sfx, music, N } from '../shared/audio.js';
import { createStage } from '../shared/stage.js';
import { createLeo } from '../shared/leo.js';
import { ball, mesh, toon, glow, BOX, CYL, CONE, blobShadow, SHY } from '../shared/toon.js';
import { createTweens, createParticles, shuffle, CONFETTI } from '../shared/fx.js';
import { decorFor, scatter, treeLine, createButterflies, bush, flowers, tuft, mushroom } from '../shared/decor.js';
import { THEMES, makeCollectible, makeFriend } from './prato.js';

// ---- i nascondigli (abbastanza grandi da coprire Leo)
function bigBush() { const g = bush(0x4cb847); g.scale.setScalar(2.4); return g; }
function cottage() {
  const g = new THREE.Group(), C = pickOne([0xffb0a0, 0xa8d8ff, 0xffe08a]);
  g.add(mesh(BOX, C, 0, 0.75, 0, 1.9, 1.5, 1.4));
  const r = mesh(new THREE.ConeGeometry(1.5, 1.0, 4), 0xd9534a, 0, 2.0, 0); r.rotation.y = Math.PI / 4; g.add(r);
  g.add(mesh(BOX, 0x8a4a2a, 0, 0.5, 0.71, 0.55, 1.0, 0.04), ball(0.05, 0xffd23f, 0.18, 0.5, 0.75));
  [-0.6, 0.6].forEach((x) => g.add(mesh(BOX, 0xffffff, x, 0.95, 0.71, 0.42, 0.42, 0.03), mesh(BOX, glow(0xffe9a8), x, 0.95, 0.72, 0.32, 0.32, 0.02)));
  return g;
}
function barrel() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.7, 16), 0xb07a4a, 0, 0.85, 0), ball(0.85, 0xb07a4a, 0, 0.85, 0, 1, 0.7, 1));
  [0.3, 0.85, 1.4].forEach((y) => g.add(mesh(CYL, 0x5a5a6a, 0, y, 0, y === 0.85 ? 0.86 : 0.8, 0.08, y === 0.85 ? 0.86 : 0.8)));
  g.add(mesh(CYL, 0x8a5a34, 0, 1.71, 0, 0.72, 0.03, 0.72));
  return g;
}
function bigGift() { const g = makeCollectible('gift'); g.scale.setScalar(3.2); g.position.y = 0.95; const w = new THREE.Group(); w.add(g); return w; }
function hayBale() {
  const g = new THREE.Group();
  const h = mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.6, 18), 0xf3c94a, 0, 0.85, 0); h.rotation.z = Math.PI / 2; g.add(h);
  [-0.55, 0, 0.55].forEach((x) => { const b = mesh(CYL, 0xd9a830, x, 0.85, 0, 0.87, 0.05, 0.87); b.rotation.z = Math.PI / 2; g.add(b); });
  const top = mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.2, 14), 0xf3c94a, 0, 1.9, 0); top.rotation.z = Math.PI / 2; g.add(top);
  return g;
}
const SPOTS = [bigBush, cottage, barrel, bigGift, hayBale];

const stage = createStage();
const { scene, camera } = stage;
const portrait = () => window.innerWidth < window.innerHeight;
const fitStage = () => stage.fit(portrait() ? { w: 6.8, tilt: 0.95, fov: 32, tall: 2.8, top: 0.86, maxD: 10 } : { w: 16, tilt: 0.95, fov: 32, tall: 2.8, top: 0.86, maxD: 8 });
const tweens = createTweens();
const particles = createParticles(scene);
const leo = createLeo({ parent: scene });
const world = new THREE.Group(); scene.add(world);
const props = new THREE.Group(); scene.add(props);
let renderer = null, active = false, flutter = null;
let spots = [], found = 0, state = 'idle', hideIn = null, path = [], waitT = 0, nSpots = 0, stars = [];

function buildWorld() {
  const th = THEMES[0];
  stage.setTheme(th);
  world.clear();
  const b = stage.bounds, d = decorFor(th.id);
  treeLine(world, d.tree, [-6, -3.6, -1.2, 1.2, 3.6, 6], b.zMin - 0.8, [1, 1.3]);
  treeLine(world, d.tree, [-b.xHalf - 1.5, b.xHalf + 1.5], (b.zMin + b.zMax) / 2, [1, 1.2]);
  scatter(world, { x0: -b.xHalf - 4, x1: b.xHalf + 4, z0: b.zMin, z1: b.zMax + 0.5 }, portrait() ? 14 : 22, d.small, [{ x0: -b.xHalf + 0.3, x1: b.xHalf - 0.3, z0: b.zMin + 0.4, z1: b.zMax - 0.3 }], 0.7);
  // qualche fiore e ciuffo d'erba anche sul prato, lontano dai nascondigli
  const zMid = b.zMin + (b.zMax - b.zMin) * (portrait() ? 0.5 : 0.5);
  scatter(world, { x0: -b.xHalf + 0.3, x1: b.xHalf - 0.3, z0: b.zMin + 0.3, z1: b.zMax - 0.2 }, portrait() ? 8 : 12, [() => flowers(3), () => tuft(), mushroom], [{ x0: -99, x1: 99, z0: zMid - 2.4, z1: zMid + 2.2 }, { x0: -1.2, x1: 1.2, z0: -99, z1: 99 }], 1);
  flutter = createButterflies(world, 2, { x0: -b.xHalf, x1: b.xHalf, z0: b.zMin, z1: b.zMax - 1 });
  // stelline in alto: una ogni volta che trovi Leo (5 = festa)
  stars.forEach((s) => camera.remove(s)); stars = [];
}
const leoHome = () => new THREE.Vector3(0, 0, stage.bounds.zMax - (portrait() ? 1.6 : 1.1));

function layoutSpots(n) {
  props.clear(); spots = [];
  const b = stage.bounds, p = portrait();
  const types = shuffle([...SPOTS]).slice(0, n);
  const zMid = b.zMin + (b.zMax - b.zMin) * (p ? 0.5 : 0.5);
  let pos;
  if (n === 4 && p) pos = [[-1.55, zMid - 1.3], [1.55, zMid - 1.3], [-1.55, zMid + 1.2], [1.55, zMid + 1.2]];
  else { const gap = p ? (n === 2 ? 3.2 : 2.25) : (n === 2 ? 4.5 : n === 3 ? 3.6 : 3.2); pos = Array.from({ length: n }, (_, i) => [(i - (n - 1) / 2) * gap, zMid]); }
  types.forEach((make, i) => {
    const g = make(); const s = p ? (n === 2 ? 1.35 : n === 3 ? 1.0 : 1.05) : 1.15; g.scale.multiplyScalar(s);
    g.position.set(pos[i][0], 0, pos[i][1]);
    g.scale.multiplyScalar(0.01); const s1 = g.scale.x * 100;
    props.add(g);
    tweens.add(0.45, (k) => g.scale.setScalar(Math.max(0.01, s1 * k)));
    const shadow = blobShadow(2.2, props); shadow.position.set(g.position.x, SHY, g.position.z);
    spots.push({ g, shadow, home: g.position.clone(), w: 1.0 * s });
  });
  nSpots = n;
}

function level() { return found < 3 ? { n: 2, peek: true, swaps: 0 } : found < 6 ? { n: 3, peek: false, swaps: 0 } : found < 10 ? { n: 3, peek: false, swaps: 1 } : { n: 4, peek: false, swaps: 2 }; }

function newRound() {
  const L = level();
  if (L.n !== nSpots) layoutSpots(L.n);
  leo.root.visible = true;
  leo.wave(); sfx.note(N(19), { vol: 0.05, dur: 0.3 }); sfx.note(N(24), { vol: 0.05, dur: 0.4, delay: 0.2 });
  state = 'show';
  setTimeout(() => { // Leo corre a nascondersi: prima di lato, poi dietro
    if (state !== 'show') return;
    hideIn = pickOne(spots);
    const side = hideIn.g.position.x >= leo.pos.x ? -1 : 1, hp = hideIn.g.position;
    path = [new THREE.Vector3(hp.x + side * 1.4, 0, hp.z + 0.3), new THREE.Vector3(hp.x + (L.peek ? side * 0.75 : 0), 0, hp.z - 0.9)];
    leo.goTo(path.shift());
    state = 'hiding';
  }, 1400);
}

function hidden() {
  const L = level();
  leo.root.visible = L.peek; // nei primi livelli spunta un pezzo di criniera
  if (L.peek) { leo.root.rotation.y = 0; leo.yaw = 0; }
  sfx.note(N(16), { vol: 0.04, dur: 0.25 });
  if (L.swaps) { state = 'swap'; doSwaps(L.swaps, () => { state = 'guess'; waitT = 0; }); }
  else { state = 'guess'; waitT = 0; }
}

function doSwaps(n, done) { // il gioco dei bicchieri: due nascondigli si scambiano di posto, piano
  if (n <= 0) return done();
  const [a, c] = shuffle([...spots]).slice(0, 2);
  const pa = a.g.position.clone(), pc = c.g.position.clone();
  sfx.arp([N(12), N(16)], 0.3, { vol: 0.04, dur: 0.4 });
  tweens.add(1.3, (k) => {
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    a.g.position.lerpVectors(pa, pc, e); a.g.position.z += Math.sin(e * Math.PI) * 1.0;
    c.g.position.lerpVectors(pc, pa, e); c.g.position.z -= Math.sin(e * Math.PI) * 1.0;
    a.shadow.position.set(a.g.position.x, SHY, a.g.position.z); c.shadow.position.set(c.g.position.x, SHY, c.g.position.z);
  }, () => setTimeout(() => doSwaps(n - 1, done), 300));
}

function wiggle(s, big = false) {
  const g = s.g, r0 = 0;
  tweens.add(0.5, (k) => { g.rotation.z = r0 + Math.sin(k * Math.PI * 4) * (big ? 0.12 : 0.05) * (1 - k); g.position.y = Math.abs(Math.sin(k * Math.PI * 2)) * (big ? 0.15 : 0.04); });
}

function surprise(s) { // non c'è Leo, ma esce qualcosa di simpatico
  const top = s.g.position.clone().setY(2.2);
  if (Math.random() < 0.5) {
    const f = makeFriend('butterfly', true); f.g.position.copy(top); props.add(f.g);
    const dir = new THREE.Vector3(rand(-1, 1), 1, rand(-0.5, 0.2)).normalize();
    tweens.add(1.6, (k) => { f.g.position.copy(top).addScaledVector(dir, k * 4); const fl = Math.sin(k * 60) * 1.1; f.wl.rotation.z = fl; f.wr.rotation.z = -fl; }, () => props.remove(f.g));
    sfx.voice('butterfly');
  } else {
    const c = makeFriend('chick', true); c.g.scale.setScalar(1.3); props.add(c.g);
    const base = s.g.position.clone().add(new THREE.Vector3(0, 0, 0.9));
    tweens.add(1.2, (k) => { c.g.position.copy(base); c.g.position.y = Math.sin(k * Math.PI) * 0.9; }, () => props.remove(c.g));
    sfx.voice('chick');
  }
}

function reveal() { // cucù!
  state = 'found';
  const hp = hideIn.g.position;
  leo.root.visible = true;
  leo.pos.set(hp.x, 0, hp.z + 1.0); leo.target.copy(leo.pos); leo.moving = false;
  leo.happy(true);
  wiggle(hideIn, true);
  sfx.arp([N(24), N(19)], 0.18, { vol: 0.08, dur: 0.35, type: 'triangle', bright: 0.3 }); setTimeout(() => sfx.leo(), 350);
  buzz([30, 50, 30]);
  particles.burst(new THREE.Vector3(hp.x, 2.4, hp.z + 1), [0xff5d73, 0xff8fa3, 0xffffff], 22, 3, { up: 2, gravity: 1, sz: 1.2 });
  found++;
  addStar();
  if (found % 5 === 0) setTimeout(() => { sfx.fanfare(); leo.happy(true); for (let i = 0; i < 4; i++) setTimeout(() => particles.burst(new THREE.Vector3(rand(-3, 3), 3, rand(-2, 1)), CONFETTI, 40, 6), i * 300); }, 900);
  setTimeout(() => { leo.goTo(leoHome()); state = 'return'; }, 1800);
}

// stelline raccolte (in alto, nella scena): da 0 a 5, poi ricominciano
const starGeo = (() => { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.2 : 0.45, a = (i / 10) * Math.PI * 2 + Math.PI / 2; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } return new THREE.ShapeGeometry(s); })();
function addStar() {
  if (stars.length >= 5) { stars.forEach((s) => camera.remove(s)); stars = []; }
  const m = new THREE.Mesh(starGeo, glow(0xffd23f, { depthTest: false, side: THREE.DoubleSide })); m.renderOrder = 20;
  const D = 10, hh = D * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), hw = hh * camera.aspect;
  const step = Math.min(0.5, hw * 0.36);
  m.position.set(-2 * step + stars.length * step, hh * 0.84, -D); m.scale.setScalar(0.01);
  camera.add(m); stars.push(m);
  tweens.add(0.5, (k) => m.scale.setScalar(Math.max(0.01, (1 + Math.sin(k * Math.PI) * 0.6) * step * 0.8)));
}

export const game = {
  id: 'cucu',
  init(r) { renderer = r; fitStage(); buildWorld(); leo.pos.copy(leoHome()); leo.target.copy(leo.pos); layoutSpots(2); setTimeout(newRound, 600); },
  resize() { fitStage(); buildWorld(); const n = nSpots; nSpots = 0; layoutSpots(n); leo.root.visible = true; leo.pos.copy(leoHome()); leo.target.copy(leo.pos); state = 'idle'; setTimeout(newRound, 500); },
  enter() { active = true; music.set('allegra'); },
  exit() { active = false; },
  down(x, y) {
    if (!active || state !== 'guess') return;
    waitT = 0;
    let best = null, bd = 120;
    for (const s of spots) { const [sx, sy] = stage.toScreen(s.g.position.clone().setY(1)); const d = Math.hypot(sx - x, sy - y); if (d < bd) { bd = d; best = s; } }
    if (!best) return;
    if (best === hideIn) reveal();
    else { wiggle(best); surprise(best); }
  },
  frame(dt, time) {
    tweens.update(dt);
    leo.update(dt);
    if (flutter) flutter(dt);
    if (state === 'hiding' && !leo.moving) { if (path.length) leo.goTo(path.shift()); else hidden(); }
    if (state === 'return' && !leo.moving) { state = 'idle'; setTimeout(newRound, 600); }
    if (state === 'guess') {
      waitT += dt;
      if (level().peek && hideIn) { leo.root.rotation.y = Math.sin(time * 2) * 0.3; }
      if (waitT > 6 && hideIn) { waitT = 3; wiggle(hideIn); sfx.note(N(28), { vol: 0.04, dur: 0.15 }); sfx.note(N(31), { vol: 0.04, dur: 0.15, delay: 0.12 }); } // ridacchia: è qui!
    }
    particles.update(dt);
    renderer.render(scene, camera);
  },
};

if (location.search.includes('debug')) window.__cucu = { get spots() { return spots; }, get state() { return state; }, get hideIn() { return hideIn; }, get found() { return found; }, set found(v) { found = v; }, stage, leo };
