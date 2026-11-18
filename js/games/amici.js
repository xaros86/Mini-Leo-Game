// Minigioco 3: "Aiuta gli amici".
// Arriva un amico con la nuvoletta di ciò che desidera. Il bimbo tocca l'oggetto giusto,
// Leo lo prende e glielo porta. Si parte con 2 scelte, poi 3; dal secondo giro la nuvoletta
// sparisce dopo qualche secondo (bisogna ricordarsi o sapere cosa vuole) e ricompare se si sbaglia.
import * as THREE from '../vendor/three.module.min.js';
import { rand, pickOne, lerp, angleLerp, buzz } from '../shared/utils.js';
import { sfx, music, N } from '../shared/audio.js';
import { createStage } from '../shared/stage.js';
import { createLeo } from '../shared/leo.js';
import { ball, mesh, smile, toon, CYL, CONE, blobShadow, SHY } from '../shared/toon.js';
import { createTweens, createParticles, normalize, shuffle, CONFETTI } from '../shared/fx.js';
import { THEMES, makeCollectible, makeSprout, makeFruit, makeFriend } from './prato.js';

// ---- nuovi amici
const eyes = (h, x, y, z, r = 0.045) => [-1, 1].forEach((k) => { h.add(ball(r * 1.6, 0xffffff, k * x, y, z, 1, 1.1, 0.6)); h.add(ball(r, 0x222222, k * x, y, z + r * 0.9)); h.add(ball(r * 0.35, 0xffffff, k * x + r * 0.3, y + r * 0.4, z + r * 1.6)); });
function rabbit() {
  const g = new THREE.Group(), W = 0xf2f2f7, PINK = 0xffb3c8;
  g.add(ball(0.32, W, 0, 0.38, 0, 1, 1.1, 0.95), ball(0.2, 0xffffff, 0, 0.36, 0.17, 1, 1.1, 0.6));
  [-1, 1].forEach((k) => g.add(ball(0.11, W, k * 0.15, 0.07, 0.15, 1, 0.6, 1.5)));
  g.add(ball(0.11, 0xffffff, 0, 0.35, -0.32));
  const h = new THREE.Group(); h.position.set(0, 0.85, 0.06); g.add(h);
  h.add(ball(0.26, W));
  [-1, 1].forEach((k) => { const e = ball(0.08, W, k * 0.1, 0.4, -0.02, 1, 3.2, 0.6); e.rotation.z = -k * 0.15; h.add(e); const ei = ball(0.045, PINK, k * 0.1, 0.4, 0.03, 1, 2.8, 0.3); ei.rotation.z = -k * 0.15; h.add(ei); });
  eyes(h, 0.1, 0.05, 0.21);
  h.add(ball(0.04, PINK, 0, -0.04, 0.26, 1.2, 0.9, 0.7), smile(0.04, 0x8a4a5a, 0, -0.09, 0.25));
  [-1, 1].forEach((k) => h.add(ball(0.05, PINK, k * 0.16, -0.06, 0.2, 1, 0.6, 0.4)));
  return g;
}
function dog() {
  const g = new THREE.Group(), B = 0xd08a4a, D = 0x7a4a2a, CR = 0xffe2b8;
  g.add(ball(0.34, B, 0, 0.45, 0, 1, 0.85, 1.3));
  [-0.18, 0.18].forEach((x) => [-0.25, 0.25].forEach((z) => g.add(mesh(CYL, B, x, 0.15, z, 0.08, 0.3, 0.08))));
  const tl = mesh(CONE, B, 0, 0.65, -0.45, 0.06, 0.3, 0.06); tl.rotation.x = -0.6; g.add(tl);
  const h = new THREE.Group(); h.position.set(0, 0.82, 0.4); g.add(h);
  h.add(ball(0.27, B), ball(0.15, CR, 0, -0.08, 0.2, 1.2, 0.9, 1.1), ball(0.06, 0x2a1a14, 0, -0.03, 0.36, 1.2, 0.9, 0.8));
  h.add(ball(0.09, D, 0.12, 0.12, 0.18, 1, 1, 0.5));
  eyes(h, 0.11, 0.07, 0.21);
  h.add(smile(0.05, 0x2a1a14, 0, -0.13, 0.33));
  [-1, 1].forEach((k) => { const e = ball(0.1, D, k * 0.25, -0.02, 0, 0.6, 1.6, 0.9); e.rotation.z = k * 0.3; h.add(e); });
  return g;
}
function monkey() {
  const g = new THREE.Group(), B = 0x9a5a34, F = 0xf3cf9e;
  g.add(ball(0.3, B, 0, 0.42, 0, 1, 1.1, 0.9), ball(0.19, F, 0, 0.4, 0.15, 1, 1.1, 0.6));
  [-1, 1].forEach((k) => { const a = ball(0.08, B, k * 0.3, 0.45, 0.05, 1, 2.4, 1); a.rotation.z = k * 0.4; g.add(a); g.add(ball(0.1, B, k * 0.14, 0.08, 0.1, 1, 0.6, 1.3)); });
  const tl = mesh(new THREE.TorusGeometry(0.18, 0.04, 6, 16, Math.PI * 1.5), B, 0, 0.45, -0.32); tl.rotation.y = Math.PI / 2; g.add(tl);
  const h = new THREE.Group(); h.position.set(0, 0.9, 0.05); g.add(h);
  h.add(ball(0.27, B), ball(0.2, F, 0, -0.04, 0.13, 1.1, 0.95, 0.65));
  [-1, 1].forEach((k) => { h.add(ball(0.1, B, k * 0.28, 0.02, 0)); h.add(ball(0.06, F, k * 0.3, 0.02, 0.04, 1, 1, 0.5)); });
  eyes(h, 0.08, 0.06, 0.24);
  h.add(smile(0.06, 0x5a2a14, 0, -0.1, 0.27));
  return g;
}
function mouse() {
  const g = new THREE.Group(), G = 0xb8b8cc, PINK = 0xffb3c8;
  g.add(ball(0.28, G, 0, 0.3, 0, 1, 0.9, 1.25));
  const tl = mesh(CYL, PINK, 0, 0.12, -0.55, 0.02, 0.5, 0.02); tl.rotation.x = 1.2; g.add(tl);
  [-1, 1].forEach((k) => g.add(ball(0.07, PINK, k * 0.13, 0.04, 0.2, 1, 0.5, 1.5)));
  const h = new THREE.Group(); h.position.set(0, 0.52, 0.28); g.add(h);
  h.add(ball(0.2, G, 0, 0, 0, 1, 0.95, 1.15), ball(0.035, PINK, 0, -0.02, 0.24));
  [-1, 1].forEach((k) => { h.add(ball(0.13, G, k * 0.17, 0.2, -0.04, 1, 1, 0.35)); h.add(ball(0.08, PINK, k * 0.17, 0.2, 0.0, 1, 1, 0.2)); });
  eyes(h, 0.08, 0.06, 0.17, 0.04);
  [-1, 1].forEach((k) => [0.02, -0.03].forEach((y) => { const w = mesh(CYL, 0x777788, k * 0.12, y - 0.02, 0.18, 0.005, 0.18, 0.005); w.rotation.z = Math.PI / 2 + k * y * 3; h.add(w); }));
  return g;
}
function cheese() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10, 1, false, 0, Math.PI / 2.4), 0xffd23f, 0, 0.15, 0));
  [[0.15, 0.2, 0.22], [0.25, 0.08, 0.1], [0.08, 0.1, 0.32]].forEach(([x, y, z]) => g.add(ball(0.045, 0xe8b020, x, y, z)));
  g.rotation.y = -0.5;
  return g;
}
const PAIRS = [
  { name: 'coniglio', animal: rabbit, item: () => makeSprout('carrot').g, voice: 'gummy' },
  { name: 'scimmia', animal: monkey, item: () => makeFruit('banana'), voice: 'alien' },
  { name: 'cane', animal: dog, item: () => makeCollectible('bone'), voice: 'pig' },
  { name: 'pinguino', animal: () => makeFriend('penguin', true).g, item: () => makeFriend('fish', true).g, voice: 'penguin' },
  { name: 'topolino', animal: mouse, item: cheese, voice: 'chick' },
];

const stage = createStage();
// area di gioco: stretta e alta in verticale, larga e bassa in orizzontale
const fitStage = () => { const aspect = window.innerWidth / window.innerHeight; stage.fit(aspect < 1 ? { w: 6.4 } : { w: 10.5 }); };
const { scene, camera } = stage;
const tweens = createTweens();
const particles = createParticles(scene);
const leo = createLeo({ parent: scene });
const level = new THREE.Group(); scene.add(level);
let renderer = null, active = false;
let round = 0, served = 0, order = [], pair = null, friend = null, bubble = null, choices = [], state = 'idle', carried = null, waitT = 0, bubbleT = 0;

function makeBubble(itemModel) {
  const b = new THREE.Group();
  const W = toon(0xffffff);
  [[0, 0, 0.62], [0.45, -0.1, 0.42], [-0.45, -0.08, 0.44], [0.25, 0.32, 0.4], [-0.25, 0.3, 0.38]].forEach(([x, y, r]) => b.add(ball(r, W, x, y, -0.25, 1, 1, 0.35)));
  b.add(ball(0.13, W, -0.15, -0.72, -0.2), ball(0.08, W, -0.28, -0.98, -0.2));
  itemModel.position.set(0, -0.35, 0.05); b.add(itemModel);
  b.userData.item = itemModel;
  b.scale.setScalar(0.01);
  return b;
}
function showBubble(on) {
  if (!bubble) return;
  const from = bubble.scale.x, to = on ? 1 : 0.01;
  tweens.add(0.3, (k) => bubble.scale.setScalar(Math.max(0.01, from + (to - from) * k)));
  bubble.userData.on = on;
  if (on) bubbleT = 0;
}

function newRound() {
  if (!order.length) order = shuffle([...PAIRS.keys()]);
  pair = PAIRS[order.shift()];
  const b = stage.bounds, side = Math.random() < 0.5 ? -1 : 1;
  // l'amico arriva camminando da un lato
  const g = new THREE.Group(); g.add(pair.animal());
  const shadow = blobShadow(1, level);
  friend = { g, side, spot: new THREE.Vector3(side * Math.min(b.xHalf * 0.5, 2.6), 0, b.zMin + 2.2), target: null, t: 0, shadow };
  g.position.set(side * (b.xHalf + 2.5), 0, friend.spot.z);
  friend.target = friend.spot.clone();
  level.add(g);
  // nuvoletta con il desiderio
  bubble = makeBubble(normalize(pair.item(), 0.75));
  level.add(bubble);
  // scelte sui piedistalli, in basso
  const n = round < 5 ? 2 : 3;
  const others = shuffle(PAIRS.filter((p) => p !== pair)).slice(0, n - 1);
  const opts = shuffle([pair, ...others]);
  const span = Math.min(b.xHalf - 0.8, 1.9 * (n - 1) / 2);
  choices = opts.map((p, i) => {
    const x = n === 1 ? 0 : -span + (2 * span * i) / (n - 1);
    const base = new THREE.Group(); base.position.set(x, 0, b.zMax - 1.0);
    base.add(mesh(CYL, 0xf5e6c8, 0, 0.12, 0, 0.5, 0.24, 0.5), mesh(CYL, 0xe8d4b0, 0, 0.25, 0, 0.52, 0.04, 0.52));
    const item = normalize(p.item(), 1.1); item.position.y = 0.27; base.add(item);
    base.scale.setScalar(0.01); level.add(base);
    tweens.add(0.4, (k) => base.scale.setScalar(Math.max(0.01, k)));
    return { pair: p, base, item, t: rand(0, 6) };
  });
  state = 'arrive'; waitT = 0;
}

function tapChoice(c) {
  if (c.pair === pair) {
    state = 'fetch'; carried = c;
    sfx.note(N(19), { vol: 0.06, dur: 0.3 }); buzz(20);
    leo.goTo(c.base.position.clone().add(new THREE.Vector3(0, 0, -0.75)));
  } else { // non è quello: l'oggetto dondola, l'amico fa "no" con la testa, la nuvoletta ricompare
    const s0 = c.item.rotation.z;
    tweens.add(0.5, (k) => (c.item.rotation.z = s0 + Math.sin(k * Math.PI * 4) * 0.3 * (1 - k)));
    tweens.add(0.6, (k) => (friend.g.rotation.y = Math.sin(k * Math.PI * 4) * 0.5 * (1 - k)));
    sfx.note(N(12), { vol: 0.05, dur: 0.25 }); sfx.note(N(9), { vol: 0.05, dur: 0.35, delay: 0.18 });
    if (!bubble.userData.on) showBubble(true);
  }
}

function deliver() {
  state = 'happy';
  const it = carried.item, from = it.getWorldPosition(new THREE.Vector3());
  level.attach(it);
  const to = friend.g.position.clone().add(new THREE.Vector3(0, 0.9, 0.3));
  tweens.add(0.5, (k) => { it.position.lerpVectors(from, to, k); it.scale.multiplyScalar(0.97); }, () => level.remove(it));
  sfx.collect(); buzz([20, 50, 20]);
  setTimeout(() => sfx.voice(pair.voice), 350);
  const g = friend.g;
  tweens.add(0.9, (k) => { g.position.y = Math.abs(Math.sin(k * Math.PI * 2)) * 0.5; g.rotation.y = k * Math.PI * 2; });
  particles.burst(to.clone().setY(1.6), [0xff5d73, 0xff8fa3, 0xffffff], 18, 2.5, { up: 2, gravity: 1, sz: 1.1 });
  showBubble(false);
  leo.happy();
  served++; round++;
  if (served % 5 === 0) setTimeout(() => { sfx.fanfare(); leo.happy(true); for (let i = 0; i < 4; i++) setTimeout(() => particles.burst(new THREE.Vector3(rand(-3, 3), 3, rand(-3, 1)), CONFETTI, 40, 6), i * 350); }, 900);
  setTimeout(() => { // l'amico se ne va contento, le scelte spariscono
    state = 'leave';
    friend.target = new THREE.Vector3(friend.side * (stage.bounds.xHalf + 3), 0, friend.spot.z);
    choices.forEach((c) => { const s0 = c.base.scale.x; tweens.add(0.35, (k) => c.base.scale.setScalar(Math.max(0.01, s0 * (1 - k))), () => level.remove(c.base)); });
    leo.goTo(new THREE.Vector3(0, 0, (stage.bounds.zMin + stage.bounds.zMax) / 2 + 0.5));
  }, 1300);
}

function walk(f, dt) {
  if (!f.target) return false;
  const p = f.g.position, dx = f.target.x - p.x, dz = f.target.z - p.z, d = Math.hypot(dx, dz);
  f.t += dt;
  if (d < 0.05) { f.g.rotation.y = angleLerp(f.g.rotation.y, 0, dt * 5); f.g.rotation.z = 0; return true; }
  const sp = Math.min(d, 1.8 * dt);
  p.x += (dx / d) * sp; p.z += (dz / d) * sp;
  f.g.rotation.y = angleLerp(f.g.rotation.y, Math.atan2(dx, dz), dt * 8);
  f.g.rotation.z = Math.sin(f.t * 10) * 0.12; p.y = Math.abs(Math.sin(f.t * 10)) * 0.08;
  return false;
}

export const game = {
  id: 'amici',
  init(r) { renderer = r; stage.setTheme(THEMES[0]); fitStage(); leo.pos.set(0, 0, (stage.bounds.zMin + stage.bounds.zMax) / 2 + 0.5); leo.target.copy(leo.pos); newRound(); this.ready = true; },
  resize() { fitStage(); },
  enter() { active = true; music.set('allegra'); setTimeout(() => leo.wave(), 300); },
  exit() { active = false; },
  down(x, y) {
    if (!active || state !== 'wait') return;
    waitT = 0;
    let best = null, bd = 85;
    for (const c of choices) { const [sx, sy] = stage.toScreen(c.base.position.clone().setY(0.6)); const d = Math.hypot(sx - x, sy - y); if (d < bd) { bd = d; best = c; } }
    if (best) tapChoice(best);
    else {
      const [fx, fy] = stage.toScreen(friend.g.position.clone().setY(0.8));
      if (Math.hypot(fx - x, fy - y) < 80) { sfx.voice(pair.voice); if (!bubble.userData.on) showBubble(true); }
    }
  },
  frame(dt, time) {
    tweens.update(dt);
    leo.update(dt);
    if (friend) {
      const arrived = walk(friend, dt);
      friend.shadow.position.set(friend.g.position.x, SHY, friend.g.position.z);
      if (bubble) {
        bubble.position.copy(friend.g.position).add(new THREE.Vector3(friend.side * -0.3, 2.3, 0));
        bubble.quaternion.copy(camera.quaternion);
        bubble.userData.item.rotation.y = Math.sin(time * 1.5) * 0.5;
      }
      if (state === 'arrive' && arrived) { state = 'wait'; showBubble(true); sfx.voice(pair.voice); }
      if (state === 'wait') {
        waitT += dt; bubbleT += dt;
        if (round >= 5 && bubble.userData.on && bubbleT > 3) showBubble(false); // dal secondo giro: bisogna ricordarsi
      }
      if (state === 'fetch' && !leo.moving) { // Leo prende l'oggetto e lo porta all'amico
        leo.root.attach(carried.item); carried.item.position.set(0, 2.35, 0); carried.item.rotation.set(0, 0, 0);
        state = 'deliver';
        leo.goTo(friend.g.position.clone().add(new THREE.Vector3(-friend.side * 0.95, 0, 0.2)));
      }
      if (state === 'deliver' && !leo.moving) deliver();
      if (state === 'leave' && arrived) { level.remove(friend.g); level.remove(friend.shadow); level.remove(bubble); friend = null; setTimeout(newRound, 400); }
    }
    for (const c of choices) {
      c.t += dt;
      if (c === carried && state !== 'wait') continue;
      const hint = state === 'wait' && waitT > 10 && c.pair === pair;
      c.item.position.y = 0.27 + (hint ? Math.abs(Math.sin(time * 6)) * 0.35 : Math.abs(Math.sin(c.t * 2)) * 0.06);
      c.item.rotation.y = Math.sin(c.t) * 0.4;
    }
    particles.update(dt);
    renderer.render(scene, camera);
  },
};

if (location.search.includes('debug')) window.__amici = { get choices() { return choices; }, get pair() { return pair; }, get state() { return state; }, get friend() { return friend; }, stage, leo };
