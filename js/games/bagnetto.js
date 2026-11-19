// Minigioco 6: "Il bagnetto di Leo".
// Leo arriva sporco nella vasca. Con la spugna si strofina (via le macchie, arriva la schiuma),
// con la doccetta si sciacqua (via la schiuma), con l'asciugamano si asciuga finché è morbido e luccicante.
// Poi Leo esce a giocare e torna sporco in un altro modo: fango, pittura, cioccolato.
// Sempre attivi: la paperella (squit!) e le bolle di sapone da scoppiare.
import * as THREE from '../vendor/three.module.min.js';
import { rand, pickOne, clamp, buzz, PALETTE } from '../shared/utils.js';
import { sfx, music, N } from '../shared/audio.js';
import { createLeo } from '../shared/leo.js';
import { ball, mesh, toon, glow, BOX, CYL, CONE, SPHERE, dotTex } from '../shared/toon.js';
import { createTweens, createParticles, CONFETTI } from '../shared/fx.js';
import { checkerTexture } from '../shared/decor.js';
import { skyTexture } from '../shared/stage.js';

const scene = new THREE.Scene();
scene.background = skyTexture(['#cfeeff', '#e8f6ff']);
const camera = new THREE.PerspectiveCamera(38, 1, 0.3, 100);
scene.add(new THREE.HemisphereLight(0xffffff, 0xd8e8f0, 1.7));
const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(-3, 6, 5); scene.add(sun);
const tweens = createTweens();
const particles = createParticles(scene);
const room = new THREE.Group(); scene.add(room);
const LIFT = 0.4; // Leo sta un po' su nella vasca, così l'acqua gli arriva alla pancia
const leoLift = new THREE.Group(); leoLift.position.y = LIFT; scene.add(leoLift);
const leo = createLeo({ parent: leoLift });
let renderer = null, active = false, W = 1, H = 1;
let phase = 'dirty', dirtKind = 0, spots = [], foam = [], tool = null, dragging = null, lastFoamT = 0, dryness = 0, towelOn = null, bubbles = [], duck = null, idleT = 0;
const LEO_Z = 0;
const BODY = new THREE.Vector3(0, 0.62 + 0.4, LEO_Z), HEAD = new THREE.Vector3(0, 1.5 + 0.4, LEO_Z + 0.05);
const local = (p) => p.clone().setY(p.y - 0.4); // da coordinate del bagno a coordinate di Leo

// ---------------------------------------------------------------- il bagno
function roundedRect(w, d, r) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -d / 2); s.lineTo(w / 2 - r, -d / 2); s.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
  s.lineTo(w / 2, d / 2 - r); s.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2); s.lineTo(-w / 2 + r, d / 2);
  s.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r); s.lineTo(-w / 2, -d / 2 + r); s.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
  return s;
}
function buildRoom() {
  room.clear();
  // pavimento e pareti a piastrelle
  const ft = checkerTexture('#f3e6d4', '#fbf4ea', 8); ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(5, 3);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 14).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: ft })); floor.position.z = 2; room.add(floor);
  const wt = checkerTexture('#bfe6f5', '#e4f6fc', 8); wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(7, 2);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(30, 7), new THREE.MeshLambertMaterial({ map: wt })); wall.position.set(0, 3.5, -1.6); room.add(wall);
  room.add(mesh(BOX, 0xffffff, 0, 1.9, -1.58, 30, 0.1, 0.06)); // bordino
  // finestra con il cielo e le nuvolette
  const win = new THREE.Group(); win.position.set(-3.2, 3.3, -1.57); room.add(win);
  win.add(mesh(BOX, 0xffffff, 0, 0, 0, 1.6, 1.4, 0.08), mesh(BOX, glow(0x9fdcff), 0, 0, 0.05, 1.4, 1.2, 0.02));
  win.add(ball(0.18, glow(0xffffff), -0.2, 0.15, 0.07, 1.6, 0.8, 0.2), ball(0.14, glow(0xffffff), 0.3, -0.2, 0.07, 1.6, 0.8, 0.2), mesh(BOX, 0xffffff, 0, 0, 0.07, 0.06, 1.2, 0.02), mesh(BOX, 0xffffff, 0, 0, 0.07, 1.4, 0.06, 0.02));
  // mensola con i flaconi
  const sh = new THREE.Group(); sh.position.set(2.4, 2.6, -1.45); room.add(sh);
  sh.add(mesh(BOX, 0xffffff, 0, 0, 0, 1.6, 0.08, 0.3));
  [[-0.5, 0xff7bd5, 0.42], [-0.1, 0x7bd3ff, 0.55], [0.3, 0xffd93d, 0.35], [0.6, 0x9bff8a, 0.3]].forEach(([x, c, h]) => { sh.add(mesh(CYL, c, x, 0.04 + h / 2, 0, 0.1, h, 0.1)); sh.add(mesh(CYL, 0xffffff, x, 0.06 + h, 0, 0.05, 0.08, 0.05)); });
  // vasca
  const tub = new THREE.Group(); room.add(tub);
  const outer = new THREE.Mesh(new THREE.ExtrudeGeometry(roundedRect(3.4, 1.9, 0.7), { depth: 0.95, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 3 }), toon(0xffffff));
  outer.rotation.x = -Math.PI / 2; outer.position.set(0, 0.12, LEO_Z); tub.add(outer);
  [[-1.3, 0.6], [1.3, 0.6], [-1.3, -0.6], [1.3, -0.6]].forEach(([x, z]) => tub.add(ball(0.13, 0xffcc3d, x, 0.08, z + LEO_Z)));
  const water = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(3.2, 1.7, 0.62)).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x8fd8ff, transparent: true, opacity: 0.85 }));
  water.position.set(0, 0.95, LEO_Z); tub.add(water);
  for (let i = 0; i < 14; i++) tub.add(ball(rand(0.08, 0.18), glow(0xffffff, { transparent: true, opacity: 0.9 }), rand(-1.4, 1.4), 0.97, LEO_Z + rand(-0.7, 0.7), 1, 0.4, 1));
  // rubinetto
  const tap = new THREE.Group(); tap.position.set(-1.55, 1.05, LEO_Z - 0.6); room.add(tap);
  tap.add(mesh(CYL, 0xd8dee8, 0, 0.3, 0, 0.06, 0.6, 0.06), mesh(CYL, 0xd8dee8, 0.15, 0.6, 0, 0.05, 0.3, 0.05));
  tap.children[1].rotation.z = Math.PI / 2; tap.add(ball(0.1, 0xff5d73, 0, 0.66, 0));
  // tappetino e piantina
  room.add(mesh(new THREE.CircleGeometry(0.9, 24).rotateX(-Math.PI / 2), 0xff9ad5, -0.4, 0.01, LEO_Z + 2.7, 1.3, 1, 0.7));
  const pl = new THREE.Group(); pl.position.set(-2.7, 0, -0.9); room.add(pl);
  pl.add(mesh(new THREE.CylinderGeometry(0.35, 0.26, 0.6, 12), 0xe8845a, 0, 0.3, 0));
  for (let i = 0; i < 7; i++) { const l = ball(0.28, 0x4cb847, Math.cos(i) * 0.2, 0.9 + (i % 3) * 0.2, Math.sin(i) * 0.15, 0.5, 1.4, 0.3); l.rotation.z = Math.cos(i) * 0.6; pl.add(l); }
  // sgabello per gli attrezzi, ciabattine, cesto e barchetta
  const stool = new THREE.Group(); stool.position.set(0, 0, LEO_Z + 1.75); room.add(stool);
  stool.add(mesh(BOX, 0xd09a5a, 0, 0.5, 0, 3.0, 0.12, 0.7));
  [-1.3, 1.3].forEach((x) => stool.add(mesh(BOX, 0xb88048, x, 0.25, 0, 0.14, 0.5, 0.6)));
  [-0.35, 0.35].forEach((x) => { const sl = new THREE.Group(); sl.position.set(-1.9 + x * 0.6, 0, LEO_Z + 2.8); sl.rotation.y = x; room.add(sl); sl.add(ball(0.2, 0xff8fb8, 0, 0.05, 0, 0.8, 0.3, 1.5), ball(0.12, 0xffffff, 0, 0.12, -0.12, 1.2, 0.5, 0.9)); });
  const basket = new THREE.Group(); basket.position.set(2.0, 0, LEO_Z + 2.7); room.add(basket);
  basket.add(mesh(new THREE.CylinderGeometry(0.5, 0.4, 0.7, 14), 0xe8c890, 0, 0.35, 0), ball(0.32, 0x8fd0ff, -0.1, 0.72, 0, 1, 0.6, 1), ball(0.28, 0xffb0c8, 0.18, 0.75, 0.05, 1, 0.6, 1));
  const boat = new THREE.Group(); boat.position.set(0.3, 0.02, LEO_Z + 3.2); boat.rotation.y = 0.4; room.add(boat);
  boat.add(ball(0.35, 0xff5d73, 0, 0.1, 0, 1.4, 0.45, 0.7), mesh(CYL, 0x8a5a34, 0, 0.5, 0, 0.025, 0.7, 0.025), mesh(new THREE.ConeGeometry(0.25, 0.45, 3), 0xffffff, 0.12, 0.55, 0));
  // paperella
  duck = new THREE.Group(); duck.position.set(0.75, 0.98, LEO_Z + 0.6); room.add(duck);
  duck.add(ball(0.22, 0xffd93d, 0, 0.08, 0, 1.2, 0.8, 1), ball(0.15, 0xffd93d, 0.12, 0.28, 0));
  const bk = mesh(CONE, 0xff8a2a, 0.27, 0.26, 0, 0.06, 0.12, 0.06); bk.rotation.z = -Math.PI / 2; duck.add(bk);
  duck.add(ball(0.025, 0x222222, 0.2, 0.33, 0.1), ball(0.025, 0x222222, 0.2, 0.33, -0.1));
  duck.rotation.y = -0.6;
}

// ---------------------------------------------------------------- gli attrezzi
function makeSponge() {
  const g = new THREE.Group();
  g.add(mesh(BOX, 0xffd93d, 0, 0, 0, 0.6, 0.32, 0.4), mesh(BOX, 0x6bcb77, 0, -0.2, 0, 0.6, 0.1, 0.4));
  for (let i = 0; i < 5; i++) g.add(ball(0.04, 0xe8b020, rand(-0.25, 0.25), rand(-0.1, 0.12), 0.2, 1, 1, 0.3));
  return g;
}
function makeShower() {
  const g = new THREE.Group();
  const h = mesh(CYL, 0xd8dee8, 0, -0.35, 0, 0.07, 0.6, 0.07); g.add(h);
  const head = mesh(new THREE.CylinderGeometry(0.24, 0.16, 0.14, 16), 0xd8dee8, 0, 0, 0); g.add(head);
  g.add(mesh(CYL, 0x8fd8ff, 0, -0.075, 0, 0.2, 0.01, 0.2));
  return g;
}
function makeTowel() {
  const g = new THREE.Group();
  g.add(mesh(BOX, 0xff9ab8, 0, 0, 0, 0.9, 1.1, 0.12));
  [-0.42, 0.42].forEach((y) => g.add(mesh(BOX, 0xffffff, 0, y, 0.01, 0.92, 0.1, 0.13)));
  return g;
}
let tools = {};
function buildTools(portraitMode) {
  Object.values(tools).forEach((t) => scene.remove(t.g, t.ring));
  const mk = (g, home) => { g.position.copy(home); scene.add(g); const ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: 0xfff3a0, transparent: true, opacity: 0, depthWrite: false })); ring.scale.setScalar(1.6); scene.add(ring); return { g, home: home.clone(), ring }; };
  // gli attrezzi stanno sullo sgabello davanti alla vasca
  tools = {
    sponge: mk(makeSponge(), new THREE.Vector3(-1.0, 0.78, LEO_Z + 1.75)),
    shower: mk(makeShower(), new THREE.Vector3(0.05, 1.05, LEO_Z + 1.75)),
    towel: mk(makeTowel(), new THREE.Vector3(1.0, 0.95, LEO_Z + 1.75)),
  };
  tools.towel.g.rotation.x = -0.25;
}
const activeTool = () => (phase === 'dirty' ? tools.sponge : phase === 'foam' ? tools.shower : phase === 'wet' ? tools.towel : null);

// ---------------------------------------------------------------- macchie e schiuma su Leo
const SPOT_COLORS = [[0x7a4a24, 0x5a3418, 0x9a6a3a], PALETTE, [0x5a3420, 0x4a2a18]];
function surfacePoint(dir, onHead) {
  const c = onHead ? HEAD : BODY, r = onHead ? 0.62 : 0.6;
  return c.clone().addScaledVector(dir.clone().normalize(), r * 0.98);
}
function addSpots() {
  spots.forEach((s) => leo.root.remove(s.m)); spots = [];
  const cols = SPOT_COLORS[dirtKind % SPOT_COLORS.length];
  const dirs = [[0.5, 0.3, 1, false], [-0.5, 0.1, 1, false], [0.1, -0.3, 1, false], [-0.4, 0.6, 1, true], [0.55, 0.45, 0.8, true], [0.1, 0.9, 0.6, true], [0.7, -0.1, 0.8, false]];
  dirs.forEach(([x, y, z, head]) => {
    const d = new THREE.Vector3(x, y, z).normalize();
    const p = surfacePoint(d, head);
    const lp = local(p); const m = ball(rand(0.11, 0.16), pickOne(cols), lp.x, lp.y, lp.z, 1, 1, 0.35);
    m.lookAt(lp.clone().add(d)); leo.root.add(m);
    if (dirtKind % 3 === 2) for (let k = 0; k < 3; k++) { const sp = ball(0.025, pickOne(PALETTE), rand(-0.07, 0.07), rand(-0.07, 0.07), 0.9, 1, 1, 1); m.add(sp); sp.scale.set(0.2, 0.2, 0.5); }
    spots.push({ m, pos: p });
  });
}
function addFoam(near) {
  if (foam.length > 70) return;
  const onHead = near.distanceTo(HEAD) < near.distanceTo(BODY);
  const d = near.clone().sub(onHead ? HEAD : BODY); d.z = Math.max(d.z, 0.2);
  const p = surfacePoint(d.add(new THREE.Vector3(rand(-0.3, 0.3), rand(-0.3, 0.3), 0)), onHead);
  const lp = local(p); const m = ball(rand(0.08, 0.16), toon(0xffffff), lp.x, lp.y, lp.z); m.scale.multiplyScalar(0.01);
  leo.root.add(m); const s = rand(0.08, 0.16);
  tweens.add(0.2, (k) => m.scale.setScalar(Math.max(0.001, s * k)));
  foam.push({ m, pos: p });
}

// ---------------------------------------------------------------- fasi
function startRound() {
  phase = 'dirty'; dryness = 0;
  foam.forEach((f) => leo.root.remove(f.m)); foam = [];
  if (towelOn) { leo.root.remove(towelOn); towelOn = null; }
  addSpots();
  Object.values(tools).forEach((t) => t.g.position.copy(t.home));
  leo.wave();
}
function phaseDone() {
  if (phase === 'dirty') { phase = 'foam'; sfx.magic(); leo.happy(); }
  else if (phase === 'foam') { phase = 'wet'; sfx.magic(); leo.happy(); for (let i = 0; i < 8; i++) addDrip(); }
  else if (phase === 'wet') finish();
}
const drips = [];
function addDrip() {
  const d = new THREE.Vector3(rand(-0.8, 0.8), rand(-0.2, 1), 1);
  const p = surfacePoint(d, Math.random() < 0.5);
  const lp = local(p); const m = ball(0.06, glow(0x8fd8ff, { transparent: true, opacity: 0.9 }), lp.x, lp.y, lp.z, 0.8, 1.2, 0.6);
  leo.root.add(m); drips.push(m);
}
function finish() { // morbido e luccicante!
  phase = 'done';
  drips.forEach((m) => leo.root.remove(m)); drips.length = 0;
  if (towelOn) { const t = towelOn; tweens.add(0.5, (k) => { t.position.y = 1.2 + k * 2; t.scale.setScalar(Math.max(0.01, 1 - k)); }, () => leo.root.remove(t)); towelOn = null; }
  sfx.fanfare(); buzz([40, 60, 40]);
  leo.happy(true);
  const r = leo.root; tweens.add(1.2, (k) => r.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.12));
  for (let i = 0; i < 6; i++) setTimeout(() => particles.burst(new THREE.Vector3(rand(-0.8, 0.8), rand(1, 2.2), LEO_Z + 0.6), [0xffffff, 0xfff3a0, 0xffd93d, 0xff8fa3], 16, 2.5, { up: 1, gravity: 0.5, sz: 1 }), i * 220);
  for (let i = 0; i < 3; i++) setTimeout(() => particles.burst(new THREE.Vector3(rand(-2, 2), 3, LEO_Z), CONFETTI, 30, 5), 600 + i * 300);
  setTimeout(() => { // Leo va a giocare… e torna sporco!
    const wipe = document.getElementById('wipe');
    wipe.style.background = '#cfeeff'; wipe.classList.add('on');
    sfx.travel();
    setTimeout(() => { dirtKind++; startRound(); wipe.classList.remove('on'); }, 700);
  }, 3200);
}

// ---------------------------------------------------------------- input: trascinare sul piano davanti a Leo
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -(LEO_Z + 0.75));
function toPlane(x, y) { ndc.set((x / W) * 2 - 1, -(y / H) * 2 + 1); ray.setFromCamera(ndc, camera); return ray.ray.intersectPlane(dragPlane, new THREE.Vector3()); }
const toScreen = (v) => { const p = v.clone().project(camera); return [(p.x * 0.5 + 0.5) * W, (-p.y * 0.5 + 0.5) * H]; };

function layout() {
  W = window.innerWidth; H = window.innerHeight;
  camera.aspect = W / H;
  const p = W < H, halfW = p ? 2.25 : 3.6, halfH = p ? 2.5 : 2.05;
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const dist = Math.max(halfW / (t * camera.aspect), halfH / t);
  const target = new THREE.Vector3(0, p ? 1.25 : 1.4, LEO_Z + (p ? 0.9 : 0.7));
  camera.position.copy(target).add(new THREE.Vector3(0, 0.45, 1).normalize().multiplyScalar(dist));
  camera.lookAt(target); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  buildTools(p);
}

export const game = {
  id: 'bagnetto',
  init(r) { renderer = r; buildRoom(); layout(); leo.pos.set(0, 0, LEO_Z); leo.target.copy(leo.pos); startRound(); },
  resize() { layout(); },
  enter() { active = true; music.set('acqua'); setTimeout(() => leo.wave(), 300); },
  exit() { active = false; if (dragging) { dragging.g.position.copy(dragging.home); dragging = null; } },
  down(x, y, id) {
    if (!active) return;
    idleT = 0;
    // attrezzi
    for (const [name, t] of Object.entries(tools)) {
      const [tx, ty] = toScreen(t.g.position);
      if (Math.hypot(tx - x, ty - y) < 75) {
        if (t !== activeTool()) { const g = t.g, r0 = g.rotation.z; tweens.add(0.4, (k) => (g.rotation.z = r0 + Math.sin(k * Math.PI * 4) * 0.2 * (1 - k))); sfx.note(N(9), { vol: 0.04, dur: 0.2 }); return; }
        dragging = t; dragging.id = id; sfx.note(N(19), { vol: 0.04, dur: 0.2 });
        if (name === 'towel' && !towelOn) t.g.rotation.set(0, 0, 0);
        return;
      }
    }
    // paperella e bolle si possono sempre toccare
    const [dx, dy] = toScreen(duck.getWorldPosition(new THREE.Vector3()));
    if (Math.hypot(dx - x, dy - y) < 60) { sfx.voice('chick'); const r0 = duck.rotation.y; tweens.add(0.6, (k) => { duck.position.y = 0.98 + Math.sin(k * Math.PI) * 0.3; duck.rotation.y = r0 + k * Math.PI * 2; }); particles.burst(duck.position.clone(), [0x8fd8ff, 0xffffff], 10, 2); return; }
    for (const b of bubbles) { const [bx, by] = toScreen(b.m.position); if (Math.hypot(bx - x, by - y) < 45) { popBubble(b); return; } }
    // tocco su Leo: ride
    const [lx, ly] = toScreen(HEAD);
    if (Math.hypot(lx - x, ly - y) < 90) { sfx.leo(); leo.wave(); }
  },
  move(x, y, id) {
    if (!dragging || dragging.id !== id) return;
    const p = toPlane(x, y); if (!p) return;
    p.y = clamp(p.y, 0.9, 3.2);
    const prev = dragging.g.position.clone();
    dragging.g.position.copy(p);
    const moved = prev.distanceTo(p);
    const now = performance.now();
    if (phase === 'dirty' && dragging === tools.sponge) { // strofina: via le macchie, arriva la schiuma
      const nearLeo = p.distanceTo(BODY) < 1.1 || p.distanceTo(HEAD) < 1.0;
      for (const s of [...spots]) if (s.pos.distanceTo(p) < 0.55) {
        spots.splice(spots.indexOf(s), 1); const m = s.m, s0 = m.scale.clone();
        tweens.add(0.3, (k) => m.scale.set(s0.x * (1 - k) + 0.001, s0.y * (1 - k) + 0.001, s0.z), () => leo.root.remove(m));
        sfx.note(pickOne([N(19), N(21), N(24)]), { vol: 0.05, dur: 0.25 }); addFoam(p); addFoam(p);
      }
      if (nearLeo && moved > 0.03 && now - lastFoamT > 70) { lastFoamT = now; addFoam(p); if (Math.random() < 0.08) sfx.leo(); }
      if (!spots.length && foam.length >= 14) phaseDone();
    } else if (phase === 'foam' && dragging === tools.shower) { // sciacqua
      if (now - lastFoamT > 60) { lastFoamT = now; particles.burst(p.clone().add(new THREE.Vector3(0, -0.12, 0)), [0x8fd8ff, 0xbfeaff, 0xffffff], 6, 0.6, { up: -3, gravity: 10, sz: 0.6, lifeT: 0.6 }); }
      for (const f of [...foam]) if (Math.abs(f.pos.x - p.x) < 0.5 && f.pos.y < p.y + 0.2 && f.pos.y > p.y - 1.6) {
        foam.splice(foam.indexOf(f), 1); const m = f.m, s0 = m.scale.x;
        tweens.add(0.25, (k) => { m.scale.setScalar(Math.max(0.001, s0 * (1 - k))); m.position.y -= 0.01; }, () => leo.root.remove(m));
      }
      if (Math.random() < 0.05) sfx.note(pickOne([N(16), N(19), N(21)]), { vol: 0.03, dur: 0.2 });
      if (!foam.length) phaseDone();
    } else if (phase === 'wet' && dragging === tools.towel) { // asciuga
      const nearLeo = p.distanceTo(BODY) < 1.2 || p.distanceTo(HEAD) < 1.1;
      if (nearLeo) {
        if (!towelOn) { // l'asciugamano avvolge Leo
          towelOn = new THREE.Group();
          const t = mesh(new THREE.CylinderGeometry(0.72, 0.8, 0.9, 20, 1, true, -Math.PI * 0.85, Math.PI * 1.7), toon(0xff9ab8, { side: THREE.DoubleSide }), 0, 1.0, 0); t.rotation.y = Math.PI; towelOn.add(t);
          towelOn.add(mesh(new THREE.TorusGeometry(0.72, 0.06, 6, 24, Math.PI * 1.7), 0xffffff, 0, 1.42, 0)); towelOn.children[1].rotation.set(Math.PI / 2, 0, Math.PI * 0.65);
          leo.root.add(towelOn); dragging.g.visible = false;
        }
        dryness += moved * 22;
        if (Math.random() < 0.3 && drips.length) { const m = drips.pop(); leo.root.remove(m); }
        if (Math.random() < 0.06) sfx.leo();
        if (dryness >= 100) { dragging.g.visible = true; dragging.g.position.copy(dragging.home); dragging = null; phaseDone(); }
      }
    }
  },
  up(x, y, id) {
    if (!dragging || dragging.id !== id) return;
    const t = dragging; dragging = null;
    t.g.visible = true;
    const from = t.g.position.clone();
    tweens.add(0.4, (k) => t.g.position.lerpVectors(from, t.home, k));
  },
  frame(dt, time) {
    tweens.update(dt);
    leo.update(dt);
    idleT += dt;
    // l'attrezzo da usare luccica e saltella per farsi notare
    for (const t of Object.values(tools)) {
      const on = t === activeTool() && dragging !== t;
      t.ring.position.copy(t.g.position);
      t.ring.material.opacity = on ? 0.55 + Math.sin(time * 4) * 0.25 : 0;
      if (on) t.g.position.y = t.home.y + Math.abs(Math.sin(time * 3)) * (idleT > 5 ? 0.25 : 0.08);
      if (t === tools.towel && dragging !== t) t.g.rotation.z = Math.sin(time * 1.5) * 0.05;
    }
    if (dragging === tools.towel && towelOn) towelOn.rotation.y = Math.sin(time * 14) * 0.15;
    duck.position.y = duck.position.y > 1.1 ? duck.position.y : 0.98 + Math.sin(time * 2) * 0.03;
    duck.rotation.z = Math.sin(time * 1.6) * 0.08;
    // bolle di sapone che salgono
    if (Math.random() < dt * 0.6 && bubbles.length < 5) {
      const m = new THREE.Mesh(SPHERE, glow(pickOne([0xc9b8ff, 0x9be7ff, 0xffc2ea]), { transparent: true, opacity: 0.45, depthWrite: false }));
      const s = rand(0.12, 0.22); m.scale.setScalar(s); m.position.set(rand(-1.4, 1.4), 1.0, LEO_Z + rand(0.2, 0.8)); scene.add(m);
      bubbles.push({ m, t: rand(0, 6), v: rand(0.3, 0.5) });
    }
    for (const b of [...bubbles]) { b.t += dt; b.m.position.y += b.v * dt; b.m.position.x += Math.sin(b.t * 2) * dt * 0.2; if (b.m.position.y > 4) { scene.remove(b.m); bubbles.splice(bubbles.indexOf(b), 1); } }
    drips.forEach((m, i) => (m.position.y -= Math.sin(time * 3 + i) * 0.0008));
    particles.update(dt);
    renderer.render(scene, camera);
  },
};
function popBubble(b) { scene.remove(b.m); bubbles.splice(bubbles.indexOf(b), 1); sfx.pop(); particles.burst(b.m.position, [0xffffff, 0xd8f8ff], 8, 1.5, { up: 0.5, gravity: 1, sz: 0.6, lifeT: 0.5 }); }

if (location.search.includes('debug')) window.__bagno = { get phase() { return phase; }, get spots() { return spots; }, get foam() { return foam; }, get dryness() { return dryness; }, tools: () => tools, toScreen, BODY, HEAD, leo };
