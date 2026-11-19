// Minigioco 2: "Le ombre di Leo" – il teatrino delle ombre.
// Sul telo luminoso del teatrino ci sono le ombre (sagome nere viste di fronte) degli oggetti dei mondi;
// gli oggetti aspettano sulla coperta da picnic. Si trascina ogni oggetto sulla sua ombra: va sul palco,
// davanti alla sua ombra. A scena completa tutto prende vita, le tende si chiudono e si riaprono su una scena nuova.
import * as THREE from '../vendor/three.module.min.js';
import { clamp, rand, buzz } from '../shared/utils.js';
import { sfx, music, N } from '../shared/audio.js';
import { createStage } from '../shared/stage.js';
import { createLeo } from '../shared/leo.js';
import { ball, mesh, glow, toon, BOX, CYL, blobShadow, SHY } from '../shared/toon.js';
import { createTweens, createParticles, normalize, shuffle, CONFETTI } from '../shared/fx.js';
import { decorFor, scatter, treeLine, createButterflies, checkerTexture, bush, flowers } from '../shared/decor.js';
import { THEMES, meadowTree, palmTree, pineTree, makeCollectible, makeSprout, makeFloater, makeFriend } from './prato.js';

const theme = (id) => THEMES.find((t) => t.id === id);
const F = (k) => () => makeFriend(k, true).g;
const C = (k) => () => makeCollectible(k);
const S = (k) => () => makeSprout(k).g;
// [nome, costruttore, verso (facoltativo), grandezza relativa]
const LEVELS = [
  { world: 'prato', pieces: [['tree', meadowTree, null, 1.25], ['ladybug', C('ladybug')]] },
  { world: 'fattoria', pieces: [['cow', F('cow'), 'cow', 1.1], ['chick', F('chick'), 'chick', 0.8]] },
  { world: 'mare', pieces: [['palm', palmTree, null, 1.25], ['crab', F('crab'), 'crab'], ['starfish', C('starfish')]] },
  { world: 'citta', pieces: [['car', F('car'), 'car', 1.1], ['icecream', C('icecream')], ['flowerpot', S('flowerpot')]] },
  { world: 'neve', pieces: [['pine', pineTree, null, 1.25], ['snowman', S('snowman')], ['penguin', F('penguin'), 'penguin'], ['gift', C('gift'), null, 0.85]] },
  { world: 'dinosauri', pieces: [['dino', F('dino'), 'dino', 1.1], ['palm', palmTree, null, 1.25], ['bone', C('bone')], ['egg', C('dinoegg'), null, 0.85]] },
  { world: 'fattoria', pieces: [['cow', F('cow'), 'cow', 1.1], ['pig', F('pig'), 'pig'], ['sheep', F('sheep'), 'sheep'], ['chick', F('chick'), 'chick', 0.8], ['tree', meadowTree, null, 1.2]] },
  { world: 'spazio', pieces: [['alien', F('alien'), 'alien'], ['planet', C('planet')], ['crystal', S('crystal')], ['ufo', () => makeFloater('ufo').g, null, 1.05]] },
];

const stage = createStage();
const { scene, camera } = stage;
const portrait = () => window.innerWidth < window.innerHeight;
const fitStage = () => stage.fit(portrait() ? { w: 6.6, tilt: 0.95, fov: 32, tall: 5.8, top: 0.86, maxD: 11 } : { w: 15, tilt: 0.95, fov: 32, tall: 3.9, top: 0.86, maxD: 9 });
const tweens = createTweens();
const particles = createParticles(scene);
const leo = createLeo({ parent: scene });
let renderer = null, active = false, levelIndex = 0, pieces = [], busy = false, drag = null, idleT = 0, flutter = null;
const world = new THREE.Group(); scene.add(world);   // decorazioni del mondo
const level = new THREE.Group(); scene.add(level);   // pezzi della scena
const SIL = new THREE.MeshBasicMaterial({ color: 0x1e2440 });
const SIL_HOT = new THREE.MeshBasicMaterial({ color: 0x4a5ab8 });

// ---------------------------------------------------------------- il teatrino
let theater = null;
function buildTheater(width, height, z) {
  const t = new THREE.Group(); t.position.set(0, 0, z);
  const WOOD = 0xb0784a, WOOD2 = 0x8a5a34, RED = 0xd9404f, GOLD = 0xffcc3d;
  // palco
  t.add(mesh(BOX, WOOD, 0, 0.14, 0.55, width + 0.6, 0.28, 1.5));
  for (let x = -width / 2; x <= width / 2; x += 0.5) t.add(mesh(BOX, WOOD2, x, 0.285, 0.55, 0.02, 0.01, 1.48));
  t.add(mesh(BOX, GOLD, 0, 0.2, 1.31, width + 0.62, 0.06, 0.02));
  // telo luminoso, un po' inclinato verso chi guarda
  const screen = new THREE.Group(); screen.position.set(0, 0.28, 0); screen.rotation.x = -0.32; t.add(screen);
  const cloth = mesh(BOX, glow(0xfff4d8), 0, height / 2, -0.02, width, height, 0.04); screen.add(cloth);
  screen.add(mesh(new THREE.CircleGeometry(1, 40), glow(0xfffbee), 0, height * 0.55, 0.005, width * 0.42, height * 0.42, 1)); // luce calda al centro
  // cornice
  [-1, 1].forEach((k) => screen.add(mesh(BOX, WOOD, k * (width / 2 + 0.12), height / 2, 0, 0.26, height + 0.2, 0.2)));
  screen.add(mesh(BOX, WOOD, 0, height + 0.15, 0, width + 0.5, 0.3, 0.22));
  screen.add(mesh(new THREE.ConeGeometry(0.3, 0.4, 5), GOLD, 0, height + 0.5, 0)); // stellina in cima
  // drappeggio in alto
  for (let x = -width / 2; x <= width / 2 + 0.01; x += 0.42) screen.add(ball(0.24, RED, x, height - 0.05, 0.12, 1, 0.8, 0.5));
  screen.add(mesh(BOX, GOLD, 0, height - 0.28, 0.2, width, 0.05, 0.03));
  // tende (si chiudono tra una scena e l'altra)
  const curtain = () => { const c = new THREE.Group(); for (let i = 0; i < 3; i++) c.add(mesh(CYL, i % 2 ? RED : 0xc4303f, (i - 1) * 0.18, height / 2, 0.1, 0.13, height, 0.1)); c.add(ball(0.1, GOLD, 0, height * 0.45, 0.22)); return c; };
  const left = curtain(), right = curtain(); screen.add(left, right);
  const openX = width / 2 - 0.22, closedX = width / 4;
  const setCurtains = (k) => { left.position.x = -(openX + (closedX - openX) * k); right.position.x = openX + (closedX - openX) * k; const sx = 1 + k * (width / 4 / 0.32 - 1); left.scale.x = right.scale.x = sx; };
  setCurtains(0);
  world.add(t);
  return { t, screen, cloth, width, height, inner: width - 1.0, setCurtains, floorZ: z + 0.55 };
}

// ---------------------------------------------------------------- scena
function buildWorld(th) {
  stage.setTheme(th);
  world.clear();
  const b = stage.bounds, p = portrait();
  const width = p ? Math.min(6.4, b.xHalf * 2 + 0.2) : 11;
  const height = p ? 4.8 : 2.9;
  theater = buildTheater(width, height, b.zMin + 0.35);
  // coperta da picnic per gli oggetti
  const blanketD = p ? 4.0 : 2.1, blanketZ = b.zMax - blanketD / 2 - 0.15;
  const tex = checkerTexture('#ff6b6b', '#fff6ee', 8); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(p ? 2 : 4, p ? 1.6 : 1);
  const blanket = new THREE.Mesh(new THREE.PlaneGeometry(b.xHalf * 2 - 0.2, blanketD).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: tex }));
  blanket.position.set(0, 0.04, blanketZ); world.add(blanket);
  const blanketBox = { z0: blanketZ - blanketD / 2, z1: blanketZ + blanketD / 2 };
  // decorazioni del mondo: alberi ai lati del teatrino, cespugli, fiori e sassi lungo i bordi
  const d = decorFor(th.id);
  const tz = theater.t.position.z;
  treeLine(world, d.tree, [-(width / 2 + 1.4), -(width / 2 + 3.2)], tz - 0.6);
  treeLine(world, d.tree, [width / 2 + 1.4, width / 2 + 3.2], tz - 0.6);
  treeLine(world, d.tree, [-width / 3, 0, width / 3], tz - 3.2, [1, 1.3]);
  const avoid = [{ x0: -width / 2 - 0.7, x1: width / 2 + 0.7, z0: tz - 0.8, z1: tz + 1.6 }, { x0: -b.xHalf + 0.1, x1: b.xHalf - 0.1, z0: tz + 1.6, z1: b.zMax + 1 }];
  scatter(world, { x0: -b.xHalf - 4, x1: b.xHalf + 4, z0: tz - 2, z1: b.zMax + 0.5 }, p ? 18 : 26, d.small, avoid, 0.7);
  scatter(world, { x0: -b.xHalf - 0.2, x1: b.xHalf + 0.2, z0: blanketBox.z0 - 1.6, z1: blanketBox.z0 - 0.2 }, p ? 3 : 5, d.small, [{ x0: -1.2, x1: 1.2, z0: -99, z1: 99 }], 1.2);
  flutter = ['prato', 'fattoria', 'citta', 'dinosauri'].includes(th.id) ? createButterflies(world, 2, { x0: -b.xHalf, x1: b.xHalf, z0: tz, z1: b.zMax - 1 }) : null;
  return blanketBox;
}

function buildLevel(i) {
  levelIndex = i % LEVELS.length;
  const L = LEVELS[levelIndex];
  const th = theme(L.world);
  music.set(th.tune || 'allegra');
  const blanketBox = buildWorld(th);
  level.clear(); tweens.clear(); pieces = []; drag = null; busy = false; idleT = 0;
  const b = stage.bounds, p = portrait(), n = L.pieces.length;
  // ombre sul telo: una fila (due in verticale con tanti pezzi)
  const rows = p && n >= 4 ? 2 : 1;
  const W = theater.inner, H = theater.height;
  const perRow = Math.ceil(n / rows);
  const silSize = Math.min(rows === 2 ? H * 0.38 : H * 0.72, (W / perRow) * 0.82);
  const trayOrder = shuffle([...Array(n).keys()]);
  const trayRows = p && n > 3 ? 2 : 1, trayPer = Math.ceil(n / trayRows);
  L.pieces.forEach(([name, make, voice, rel], k) => {
    const size = silSize * (rel || 1) * 0.92;
    const model = normalize(make(), size);
    // ombra: lo stesso modello schiacciato sul telo e tutto nero = la sua sagoma vista di fronte
    const row = rows === 2 ? Math.floor(k / perRow) : 0, col = k - row * perRow, cols = row === 0 ? perRow : n - perRow;
    const sx = (col - (cols - 1) / 2) * (W / perRow);
    const sy = rows === 2 ? (row === 0 ? H * 0.53 : H * 0.07) : Math.max(H * 0.08, (H * 0.92 - size) / 2);
    const sil = model.clone(true);
    sil.traverse((o) => { if (o.isMesh) o.material = SIL; if (o.isSprite || o.isLine) o.visible = false; });
    sil.scale.z *= 0.02; sil.position.set(sx, sy, 0.03); sil.userData.base = sil.scale.x;
    theater.screen.add(sil); level.userData.sils = (level.userData.sils || []).concat(sil);
    // oggetto sulla coperta
    const t = trayOrder.indexOf(k), tr = trayRows === 2 ? t % 2 : 0, tc = trayRows === 2 ? Math.floor(t / 2) : t;
    const tcols = trayRows === 2 ? (tr === 0 ? Math.ceil(n / 2) : Math.floor(n / 2)) : n;
    const span = Math.min(b.xHalf - 0.8, (p ? 1.5 : 2.4) * (tcols - 1) / 2);
    const hx = tcols === 1 ? 0 : -span + (2 * span * tc) / (tcols - 1) + (tr ? 0.5 : 0);
    const hz = trayRows === 2 ? (tr === 0 ? blanketBox.z0 + 0.9 : blanketBox.z1 - 0.7) : (blanketBox.z0 + blanketBox.z1) / 2 + 0.2;
    const home = new THREE.Vector3(hx, 0.05, hz);
    const pm = normalize(make(), Math.min(p ? 1.9 : 1.6, size * 1.05));
    pm.position.copy(home); level.add(pm);
    const shadow = blobShadow(Math.min(1.6, size) * 0.8, level); shadow.position.set(home.x, SHY, home.z);
    pieces.push({ name, voice, model: pm, sil, home, shadow, placed: false, t: Math.random() * 6, spot: new THREE.Vector3(sx, 0.28, theater.floorZ) });
  });
  leo.pos.set(p ? b.xHalf - 0.6 : b.xHalf - 1.2, 0, blanketBox.z0 - (p ? 0.9 : 0.7)); leo.target.copy(leo.pos); leo.moving = false;
  leo.outfit(L.world);
}

// centro dell'ombra sullo schermo (in pixel)
function silScreen(p) {
  const box = new THREE.Box3().setFromObject(p.sil), c = box.getCenter(new THREE.Vector3());
  return stage.toScreen(c);
}
function silUnder(x, y) {
  let best = null, bd = Infinity;
  const spacingPx = Math.max(90, Math.min(150, (stage.W / Math.max(2, pieces.length)) * 0.55));
  for (const p of pieces) {
    if (p.placed) continue;
    const [sx, sy] = silScreen(p), d = Math.hypot(sx - x, sy - y);
    if (d < spacingPx && d < bd) { best = p; bd = d; }
  }
  return best;
}
function pickPiece(x, y) {
  let best = null, bd = Infinity;
  for (const p of pieces) {
    if (p.placed) continue;
    const c = p.model.position.clone(); c.y += p.model.userData.height / 2;
    const [sx, sy] = stage.toScreen(c), d = Math.hypot(sx - x, sy - y);
    if (d < 85 && d < bd) { best = p; bd = d; }
  }
  return best;
}

function place(p) {
  p.placed = true;
  const from = p.model.position.clone();
  p.tw = tweens.add(0.35, (k) => { p.model.position.lerpVectors(from, p.spot, k); p.model.position.y += Math.sin(k * Math.PI) * 0.6; }, () => {
    particles.burst(p.spot.clone().setY(1), [0xffffff, 0xfff3a0, 0xffd93d], 22, 3);
  });
  p.shadow.position.set(p.spot.x, 0.29, p.spot.z);
  p.sil.traverse((o) => { if (o.isMesh) o.material = SIL; });
  sfx.collect(); buzz(30);
  leo.happy();
  if (pieces.every((q) => q.placed)) setTimeout(complete, 700);
}
function sendHome(p) {
  const from = p.model.position.clone();
  p.tw = tweens.add(0.45, (k) => { p.model.position.lerpVectors(from, p.home, k); p.model.position.y = p.home.y + Math.sin(k * Math.PI) * 0.8; });
  sfx.note(N(9), { vol: 0.04, dur: 0.25 });
}

function complete() { // tutto prende vita, poi le tende si chiudono
  busy = true;
  sfx.fanfare(); buzz([40, 60, 40]);
  leo.happy(true);
  const cloth = theater.cloth;
  [0xfff0b8, 0xffd8f0, 0xd8f4ff, 0xfff4d8].forEach((c, i) => setTimeout(() => (cloth.material = glow(c)), i * 350));
  pieces.forEach((p, i) => setTimeout(() => {
    const base = p.model.position.clone(), s0 = p.model.scale.x;
    tweens.add(0.7, (k) => { p.model.position.y = base.y + Math.sin(k * Math.PI) * 1.2; p.model.rotation.y = k * Math.PI * 2; p.model.scale.setScalar(s0 * (1 + Math.sin(k * Math.PI) * 0.15)); });
    if (p.voice) sfx.voice(p.voice);
    particles.burst(base.clone().setY(1.2), CONFETTI, 30, 5, { up: 3 });
  }, 400 + i * 420));
  setTimeout(() => leo.happy(true), 400 + pieces.length * 420);
  setTimeout(nextLevel, 1900 + pieces.length * 420);
}
function nextLevel() {
  sfx.travel();
  tweens.add(0.7, (k) => theater.setCurtains(k), () => setTimeout(() => {
    buildLevel(levelIndex + 1);
    theater.setCurtains(1);
    tweens.add(0.8, (k) => theater.setCurtains(1 - k), () => leo.wave());
  }, 250));
}

export const game = {
  id: 'ombre',
  init(r) { renderer = r; fitStage(); buildLevel(0); },
  resize() { fitStage(); buildLevel(levelIndex); },
  enter() { active = true; music.set(theme(LEVELS[levelIndex].world).tune || 'allegra'); setTimeout(() => leo.wave(), 300); },
  exit() { active = false; if (drag) { sendHome(drag.p); drag = null; } },
  down(x, y, id) {
    if (!active || busy || drag) return;
    idleT = 0;
    const p = pickPiece(x, y);
    if (!p) return;
    drag = { p, id, x, y };
    tweens.cancel(p.tw); // se stava tornando al suo posto, si ferma: ora lo tiene il dito
    sfx.note(N(19), { vol: 0.04, dur: 0.2 });
    p.model.scale.multiplyScalar(1.12);
  },
  move(x, y, id) {
    if (!drag || drag.id !== id) return;
    drag.x = x; drag.y = y;
    const g = stage.toGround(x, y); if (!g) return;
    const b = stage.bounds;
    drag.p.model.position.set(clamp(g.x, -b.xHalf - 1, b.xHalf + 1), 0.6, clamp(g.z, theater.floorZ + 0.3, b.zMax + 0.3));
  },
  up(x, y, id) {
    if (!drag || drag.id !== id) return;
    const p = drag.p; drag = null;
    p.model.scale.multiplyScalar(1 / 1.12);
    const target = silUnder(x, y);
    // lasciato sull'ombra giusta, oppure sul palco proprio davanti alla sua ombra
    const onSpot = Math.hypot(p.model.position.x - p.spot.x, p.model.position.z - p.spot.z) < 0.9;
    if (target === p || (!target && onSpot)) place(p); else sendHome(p);
  },
  frame(dt, time) {
    tweens.update(dt);
    leo.update(dt);
    if (flutter) flutter(dt);
    idleT += dt;
    const hot = drag ? silUnder(drag.x, drag.y) : null;
    const hint = !drag && !busy && idleT > 8 ? pieces.find((q) => !q.placed) : null;
    for (const p of pieces) {
      p.t += dt;
      if (!p.placed) {
        // l'ombra giusta si illumina quando ci passi sopra con l'oggetto; dopo un po' di attesa, un piccolo aiuto
        const isHot = hot === p && drag.p === p;
        p.sil.traverse((o) => { if (o.isMesh) o.material = isHot ? SIL_HOT : SIL; });
        const pulse = isHot ? 1.08 : p === hint ? 1 + Math.abs(Math.sin(time * 3)) * 0.06 : 1;
        p.sil.scale.x = p.sil.scale.y = p.sil.userData.base * pulse;
        if (!(drag && drag.p === p)) {
          p.model.rotation.z = p === hint ? Math.sin(time * 10) * 0.15 : Math.sin(p.t * 1.5) * 0.04;
          if (p.model.position.y < p.home.y) p.model.position.y = p.home.y;
        }
        p.shadow.position.set(p.model.position.x, SHY, p.model.position.z);
      } else if (!busy) p.model.rotation.z = Math.sin(p.t * 2) * 0.03;
    }
    particles.update(dt);
    renderer.render(scene, camera);
  },
};

if (location.search.includes('debug')) window.__ombre = { get pieces() { return pieces; }, stage, leo, complete, nextLevel, silScreen };
