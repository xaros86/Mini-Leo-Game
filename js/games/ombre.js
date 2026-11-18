// Minigioco 2: "Le ombre di Leo".
// In alto ci sono le ombre (sagome scure) degli oggetti, in basso gli oggetti colorati.
// Si trascina ogni oggetto sulla sua ombra: se è vicino scivola dentro da solo, altrimenti torna al suo posto.
// A scena completa tutto si anima e si passa alla scena successiva (2 → 5 pezzi).
import * as THREE from '../vendor/three.module.min.js';
import { clamp, buzz } from '../shared/utils.js';
import { sfx, music, N } from '../shared/audio.js';
import { createStage } from '../shared/stage.js';
import { createLeo } from '../shared/leo.js';
import { blobShadow, SHY } from '../shared/toon.js';
import { createTweens, createParticles, normalize, shuffle, CONFETTI } from '../shared/fx.js';
import { THEMES, meadowTree, palmTree, pineTree, makeCollectible, makeSprout, makeFloater, makeFriend } from './prato.js';

const theme = (id) => THEMES.find((t) => t.id === id);
const F = (k) => () => makeFriend(k, true).g;
const C = (k) => () => makeCollectible(k);
const S = (k) => () => makeSprout(k).g;
// [nome, costruttore, verso (facoltativo), grandezza]
const LEVELS = [
  { world: 'prato', pieces: [['tree', meadowTree, null, 2.1], ['ladybug', C('ladybug')]] },
  { world: 'fattoria', pieces: [['cow', F('cow'), 'cow'], ['chick', F('chick'), 'chick', 1.0]] },
  { world: 'mare', pieces: [['palm', palmTree, null, 2.1], ['crab', F('crab'), 'crab'], ['starfish', C('starfish')]] },
  { world: 'citta', pieces: [['car', F('car'), 'car', 1.5], ['icecream', C('icecream')], ['flowerpot', S('flowerpot')]] },
  { world: 'neve', pieces: [['pine', pineTree, null, 2.1], ['snowman', S('snowman')], ['penguin', F('penguin'), 'penguin'], ['gift', C('gift'), null, 1.1]] },
  { world: 'dinosauri', pieces: [['dino', F('dino'), 'dino', 1.5], ['palm', palmTree, null, 2.1], ['bone', C('bone')], ['egg', C('dinoegg'), null, 1.1]] },
  { world: 'fattoria', pieces: [['cow', F('cow'), 'cow'], ['pig', F('pig'), 'pig'], ['sheep', F('sheep'), 'sheep'], ['chick', F('chick'), 'chick', 1.0], ['tree', meadowTree, null, 2.0]] },
  { world: 'spazio', pieces: [['alien', F('alien'), 'alien'], ['planet', C('planet')], ['crystal', S('crystal')], ['ufo', () => makeFloater('ufo').g, null, 1.4]] },
];
let SNAP = 1.5; // quanto vicino all'ombra bisogna lasciare l'oggetto (generoso, ma mai fino all'ombra accanto)

const stage = createStage();
// area di gioco: stretta e alta in verticale, larga e bassa in orizzontale
const fitStage = () => { const aspect = window.innerWidth / window.innerHeight; stage.fit(aspect < 1 ? { w: 6.6 } : { w: 11 }); };
const { scene, camera } = stage;
const tweens = createTweens();
const particles = createParticles(scene);
const leo = createLeo({ parent: scene });
let renderer = null, active = false, levelIndex = 0, pieces = [], busy = false, drag = null, idleT = 0;
const level = new THREE.Group(); scene.add(level);

function ghostOf(pivot) {
  const g = pivot.clone(true);
  const mat = new THREE.MeshBasicMaterial({ color: 0x2c3658, transparent: true, opacity: 0.32, depthWrite: false });
  g.traverse((o) => { if (o.isMesh) o.material = mat; if (o.isSprite || o.isLine) o.visible = false; });
  g.userData.mat = mat;
  return g;
}

function buildLevel(i) {
  levelIndex = i % LEVELS.length;
  const L = LEVELS[levelIndex];
  const th = theme(L.world);
  stage.setTheme(th);
  music.set(th.tune || 'allegra');
  level.clear(); tweens.clear(); pieces = []; drag = null; busy = false; idleT = 0;
  const b = stage.bounds, n = L.pieces.length;
  // ombre in alto (una o due file), oggetti in basso, in ordine mescolato
  const portrait = window.innerWidth < window.innerHeight;
  const rows = n >= 4 && portrait ? 2 : 1;
  const slotPos = L.pieces.map((_, k) => {
    const perRow = Math.ceil(n / rows), row = rows === 2 ? k % 2 : 0, col = rows === 2 ? Math.floor(k / 2) : k;
    const cols = rows === 2 ? (row === 0 ? Math.ceil(n / 2) : Math.floor(n / 2)) : n;
    const span = Math.min(b.xHalf - 1, (portrait ? 1.7 : 2.3) * (cols - 1) / 2 + 0.6);
    const x = cols === 1 ? 0 : -span + (2 * span * col) / (cols - 1) + (rows === 2 && row === 1 ? 0.6 : 0);
    return new THREE.Vector3(x, 0, b.zMin + 1.3 + row * 2.8);
  });
  let md = Infinity;
  slotPos.forEach((a, i) => slotPos.forEach((c, j) => { if (i < j) md = Math.min(md, a.distanceTo(c)); }));
  SNAP = Math.min(1.5, md * 0.45);
  const trayOrder = shuffle([...Array(n).keys()]);
  const traySpan = Math.min(b.xHalf - 0.7, (portrait ? 1.5 : 2.2) * (n - 1) / 2);
  L.pieces.forEach(([name, make, voice, size], k) => {
    const model = normalize(make(), size || 1.3);
    const ghost = ghostOf(model);
    ghost.position.copy(slotPos[k]); level.add(ghost);
    const t = trayOrder.indexOf(k);
    const home = new THREE.Vector3(n === 1 ? 0 : -traySpan + (2 * traySpan * t) / (n - 1), 0, b.zMax - (portrait && n > 3 && t % 2 ? 2.2 : 1.0));
    model.position.copy(home); level.add(model);
    const shadow = blobShadow(Math.max(0.8, (size || 1.3) * 0.8), level); shadow.position.set(home.x, SHY, home.z);
    pieces.push({ name, voice, model, ghost, slot: slotPos[k], home, shadow, placed: false, t: Math.random() * 6, wig: 0 });
  });
  leo.pos.set(portrait ? b.xHalf - 0.7 : b.xHalf - 0.9, 0, portrait ? b.zMin + 6.2 : b.zMin + 3.6); leo.target.copy(leo.pos); leo.moving = false;
  leo.outfit(L.world);
}

function pickPiece(x, y) {
  let best = null, bd = Infinity;
  for (const p of pieces) {
    if (p.placed) continue;
    const c = p.model.position.clone(); c.y += p.model.userData.height / 2;
    const [sx, sy] = stage.toScreen(c);
    const d = Math.hypot(sx - x, sy - y);
    if (d < 75 && d < bd) { best = p; bd = d; }
  }
  return best;
}

function place(p) {
  p.placed = true;
  const from = p.model.position.clone();
  tweens.add(0.25, (k) => p.model.position.lerpVectors(from, p.slot, k), () => {
    p.model.position.copy(p.slot);
    particles.burst(p.slot.clone().setY(0.8), [0xffffff, 0xfff3a0, 0xffd93d], 20, 3);
  });
  p.shadow.position.set(p.slot.x, SHY, p.slot.z);
  const m = p.ghost.userData.mat;
  tweens.add(0.4, (k) => (m.opacity = 0.32 * (1 - k)), () => (p.ghost.visible = false));
  sfx.collect(); buzz(30);
  leo.happy();
  if (pieces.every((q) => q.placed)) setTimeout(complete, 600);
}

function sendHome(p) {
  const from = p.model.position.clone();
  tweens.add(0.45, (k) => { p.model.position.lerpVectors(from, p.home, k); p.model.position.y = Math.sin(k * Math.PI) * 0.8; });
  sfx.note(N(9), { vol: 0.04, dur: 0.25 });
}

// scena completa: tutto prende vita, poi si passa alla prossima
function complete() {
  busy = true;
  sfx.fanfare(); buzz([40, 60, 40]);
  leo.happy(true);
  pieces.forEach((p, i) => setTimeout(() => {
    if (!active && !busy) return;
    const base = p.model.position.clone(), s0 = p.model.scale.x;
    tweens.add(0.7, (k) => { p.model.position.y = base.y + Math.sin(k * Math.PI) * 1.2; p.model.rotation.y = k * Math.PI * 2; p.model.scale.setScalar(s0 * (1 + Math.sin(k * Math.PI) * 0.15)); });
    if (p.voice) sfx.voice(p.voice);
    particles.burst(base.clone().setY(1), CONFETTI, 30, 5, { up: 3 });
  }, 400 + i * 420));
  setTimeout(() => leo.happy(true), 400 + pieces.length * 420);
  setTimeout(() => nextLevel(), 1800 + pieces.length * 420);
}
const wipe = document.getElementById('wipe');
function nextLevel() {
  const nextTheme = theme(LEVELS[(levelIndex + 1) % LEVELS.length].world);
  wipe.style.background = nextTheme.fade; wipe.classList.add('on');
  sfx.travel();
  setTimeout(() => { buildLevel(levelIndex + 1); wipe.classList.remove('on'); setTimeout(() => leo.wave(), 400); }, 650);
}

export const game = {
  id: 'ombre',
  init(r) { renderer = r; fitStage(); buildLevel(0); this.ready = true; },
  resize() { fitStage(); buildLevel(levelIndex); },
  enter() { active = true; music.set(theme(LEVELS[levelIndex].world).tune || 'allegra'); setTimeout(() => leo.wave(), 300); },
  exit() { active = false; if (drag) { sendHome(drag.p); drag = null; } },
  down(x, y, id) {
    if (!active || busy || drag) return;
    idleT = 0;
    const p = pickPiece(x, y);
    if (!p) return;
    drag = { p, id };
    sfx.note(N(19), { vol: 0.04, dur: 0.2 });
    p.model.scale.multiplyScalar(1.12);
  },
  move(x, y, id) {
    if (!drag || drag.id !== id) return;
    const g = stage.toGround(x, y); if (!g) return;
    const b = stage.bounds;
    drag.p.model.position.set(clamp(g.x, -b.xHalf, b.xHalf), 0.5, clamp(g.z, b.zMin - 0.5, b.zMax + 0.3));
  },
  up(x, y, id) {
    if (!drag || drag.id !== id) return;
    const p = drag.p; drag = null;
    p.model.scale.multiplyScalar(1 / 1.12);
    const d = Math.hypot(p.model.position.x - p.slot.x, p.model.position.z - p.slot.z);
    if (d < SNAP) place(p); else sendHome(p);
  },
  frame(dt, time) {
    tweens.update(dt);
    leo.update(dt);
    idleT += dt;
    for (const p of pieces) {
      p.t += dt;
      const near = drag && drag.p === p && Math.hypot(p.model.position.x - p.slot.x, p.model.position.z - p.slot.z) < SNAP;
      if (!p.placed) {
        // l'ombra giusta si illumina quando l'oggetto è vicino; dopo un po' di attesa, un piccolo aiuto
        const hint = !drag && idleT > 8 && p === pieces.find((q) => !q.placed);
        const m = p.ghost.userData.mat;
        m.opacity = near ? 0.55 + Math.sin(time * 12) * 0.1 : hint ? 0.32 + Math.abs(Math.sin(time * 3)) * 0.2 : 0.32;
        p.ghost.scale.setScalar(near ? 1.06 : 1);
        if (!(drag && drag.p === p)) {
          p.model.rotation.z = hint ? Math.sin(time * 10) * 0.15 : Math.sin(p.t * 1.5) * 0.04;
          if (p.model.position.y < 0.01) p.model.position.y = 0;
        }
        p.shadow.position.set(p.model.position.x, SHY, p.model.position.z);
      } else if (!busy) {
        p.model.rotation.z = Math.sin(p.t * 2) * 0.03;
      }
    }
    particles.update(dt);
    renderer.render(scene, camera);
  },
};

if (location.search.includes('debug')) window.__ombre = { get pieces() { return pieces; }, stage, leo, complete, nextLevel };
