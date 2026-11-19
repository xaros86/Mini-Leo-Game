// Decorazioni comuni per rendere vivi gli scenari: cespugli, fiori, ciuffi d'erba, sassi, farfalle…
// Ogni mondo ha i suoi alberi e i suoi "dettagli" (abeti e mucchi di neve sulla neve, palme in spiaggia…).
import * as THREE from '../vendor/three.module.min.js';
import { rand, pickOne, PALETTE } from './utils.js';
import { toon, glow, ball, mesh, CYL, CONE, blobShadow, SHY } from './toon.js';
import { meadowTree, palmTree, pineTree, crystalTree, cityTree, lollipopTree, kelpTree, makeSprout, makeFriend } from '../games/prato.js';

const ROCK = new THREE.IcosahedronGeometry(1, 0);
export function bush(color = pickOne([0x4cb847, 0x3fae49, 0x5cc85a])) {
  const g = new THREE.Group();
  [[0, 0.32, 0, 0.42], [0.38, 0.24, 0.05, 0.32], [-0.36, 0.22, 0.02, 0.3], [0.1, 0.5, -0.1, 0.28]].forEach(([x, y, z, r]) => g.add(ball(r, color, x, y, z)));
  if (Math.random() < 0.5) for (let i = 0; i < 4; i++) g.add(ball(0.06, pickOne([0xff5d73, 0xffffff, 0xffd93d]), rand(-0.45, 0.45), rand(0.25, 0.6), rand(0.2, 0.4)));
  return g;
}
export function flowers(n = 4) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const x = rand(-0.35, 0.35), z = rand(-0.25, 0.25), h = rand(0.18, 0.32), c = pickOne(PALETTE);
    g.add(mesh(CYL, 0x3d9e3a, x, h / 2, z, 0.015, h, 0.015));
    for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; g.add(ball(0.045, c, x + Math.cos(a) * 0.05, h, z + Math.sin(a) * 0.05, 1, 0.5, 1)); }
    g.add(ball(0.035, 0xffe45c, x, h + 0.02, z));
  }
  return g;
}
export function tuft(color = 0x5cc84a) {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) { const c = mesh(CONE, color, rand(-0.12, 0.12), 0.12, rand(-0.08, 0.08), 0.04, rand(0.18, 0.32), 0.04); c.rotation.z = rand(-0.4, 0.4); g.add(c); }
  return g;
}
export function rock(color = pickOne([0xb8b4ac, 0xa8a49c, 0xc4c0b8])) {
  const m = new THREE.Mesh(ROCK, toon(color, { flatShading: true }));
  m.scale.set(rand(0.25, 0.45), rand(0.15, 0.28), rand(0.25, 0.4)); m.position.y = 0.08; m.rotation.y = rand(0, 6);
  const g = new THREE.Group(); g.add(m); return g;
}
export function mushroom() {
  const g = new THREE.Group();
  g.add(mesh(CYL, 0xfff3dc, 0, 0.08, 0, 0.05, 0.16, 0.05), ball(0.13, 0xff4d5e, 0, 0.18, 0, 1, 0.6, 1));
  for (let i = 0; i < 3; i++) g.add(ball(0.025, 0xffffff, Math.cos(i * 2) * 0.08, 0.23, Math.sin(i * 2) * 0.08));
  return g;
}
function snowMound() { const g = new THREE.Group(); g.add(ball(0.5, 0xffffff, 0, 0, 0, 1.3, 0.45, 1), ball(0.3, 0xf2f7ff, 0.4, 0, 0.1, 1, 0.5, 1)); return g; }
function shellSmall() { const g = makeSprout('beach').g; g.scale.setScalar(0.8); return g; }
function crater() {
  const g = new THREE.Group();
  const r = mesh(new THREE.TorusGeometry(0.4, 0.1, 6, 18), 0x9d96c2, 0, 0.02, 0); r.rotation.x = Math.PI / 2; r.scale.z = 0.5; g.add(r);
  g.add(mesh(new THREE.CircleGeometry(0.38, 18).rotateX(-Math.PI / 2), 0x8a84b0, 0, 0.012, 0));
  return g;
}
function crystals() { const g = makeSprout('crystal').g; g.scale.setScalar(1.3); return g; }
function fern() { return makeSprout('fern').g; }
function hay() { const g = new THREE.Group(); const h = mesh(CYL, 0xf3c94a, 0, 0.3, 0, 0.3, 0.55, 0.3); h.rotation.z = Math.PI / 2; g.add(h); return g; }
function candy() { return makeSprout('sweet').g; }

// alberi e dettagli per ogni mondo
const DECOR = {
  prato: { tree: () => meadowTree(), small: [bush, flowers, tuft, tuft, rock, mushroom] },
  fattoria: { tree: () => meadowTree(), small: [bush, flowers, tuft, tuft, hay] },
  citta: { tree: () => cityTree(), small: [bush, flowers, tuft] },
  mare: { tree: () => palmTree(), small: [shellSmall, rock, () => tuft(0x9bc86a)] },
  fondale: { tree: () => kelpTree(), small: [rock, rock, shellSmall] },
  neve: { tree: () => pineTree(), small: [snowMound, snowMound, rock] },
  dinosauri: { tree: () => palmTree(), small: [fern, fern, rock, bush] },
  dolci: { tree: () => lollipopTree(), small: [candy, candy, () => bush(0xff9ad5)] },
  notte: { tree: () => meadowTree(true), small: [() => bush(0x2e6650), mushroom, rock] },
  spazio: { tree: () => crystalTree(), small: [crater, crater, crystals, rock] },
};
export const decorFor = (id) => DECOR[id] || DECOR.prato;

// sparge decorazioni in un'area evitando i rettangoli liberi (dove si gioca)
export function scatter(group, area, count, makers, avoid = [], minDist = 0.6) {
  const placed = [];
  for (let i = 0, tries = 0; i < count && tries < count * 20; tries++) {
    const x = rand(area.x0, area.x1), z = rand(area.z0, area.z1);
    if (avoid.some((r) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1)) continue;
    if (placed.some((p) => Math.hypot(p.x - x, p.z - z) < minDist)) continue;
    const o = pickOne(makers)(); o.position.set(x, 0, z); o.rotation.y = rand(-0.5, 0.5);
    group.add(o); placed.push({ x, z }); i++;
  }
  return placed;
}
// fila di alberi (con ombra) lungo una linea
export function treeLine(group, maker, xs, z, scale = [0.9, 1.2]) {
  xs.forEach((x) => {
    const t = maker(); const s = rand(scale[0], scale[1]);
    t.position.set(x + rand(-0.3, 0.3), 0, z + rand(-0.5, 0.5)); t.scale.setScalar(s); t.rotation.y = rand(-0.4, 0.4);
    group.add(t); blobShadow(2.4 * s, group).position.set(t.position.x, SHY, t.position.z);
  });
}

// farfalle che svolazzano qua e là (solo decorazione)
export function createButterflies(group, n, area) {
  const list = [];
  for (let i = 0; i < n; i++) {
    const f = makeFriend('butterfly', true);
    f.g.scale.setScalar(0.9); group.add(f.g);
    const p = new THREE.Vector3(rand(area.x0, area.x1), rand(1, 2.4), rand(area.z0, area.z1));
    list.push({ f, p, v: new THREE.Vector3(), target: p.clone(), t: rand(0, 5) });
  }
  return (dt) => list.forEach((b) => {
    b.t += dt;
    if (b.p.distanceTo(b.target) < 0.4) b.target.set(rand(area.x0, area.x1), rand(1, 2.4), rand(area.z0, area.z1));
    b.v.lerp(b.target.clone().sub(b.p).normalize().multiplyScalar(1.2), dt * 1.5);
    b.p.addScaledVector(b.v, dt);
    b.f.g.position.copy(b.p); b.f.g.position.y += Math.sin(b.t * 6) * 0.1;
    b.f.g.rotation.y = Math.atan2(b.v.x, b.v.z);
    const flap = Math.sin(b.t * 20) * 1.1; b.f.wl.rotation.z = flap; b.f.wr.rotation.z = -flap;
  });
}

// texture a quadretti (coperta da picnic, piastrelle…)
export function checkerTexture(c1, c2, n = 8) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d'); const s = 128 / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = (i + j) % 2 ? c1 : c2; g.fillRect(i * s, j * s, s, s); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
  return t;
}
