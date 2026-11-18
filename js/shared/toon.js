// Stile "cartone animato" condiviso: materiali, forme base e ombre morbide.
import * as THREE from '../vendor/three.module.min.js';

// materiali "cartone animato" (condivisi: niente sprechi di memoria cambiando mondo)
export const gradientMap = (() => {
  const t = new THREE.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
})();
const matCache = new Map();
export function toon(color, extra = {}) {
  const key = 't' + color + JSON.stringify(extra);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshToonMaterial({ color, gradientMap, ...extra }));
  return matCache.get(key);
}
export function glow(color, extra = {}) { // colori che "brillano" (non toccati dalle luci)
  const key = 'b' + color + JSON.stringify(extra);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshBasicMaterial({ color, ...extra }));
  return matCache.get(key);
}
export const SPHERE = new THREE.SphereGeometry(1, 24, 16);
export const SPHERE_LO = new THREE.SphereGeometry(1, 12, 8);
export const CYL = new THREE.CylinderGeometry(1, 1, 1, 12);
export const CONE = new THREE.ConeGeometry(1, 1, 14);
export const BOX = new THREE.BoxGeometry(1, 1, 1);
export const DISC = new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2);
export const SMILE = new THREE.TorusGeometry(1, 0.25, 6, 14, Math.PI);
export function mesh(geo, color, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, typeof color === 'number' ? toon(color) : color);
  m.scale.set(sx, sy, sz); m.position.set(x, y, z); return m;
}
export function ball(r, color, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) { return mesh(SPHERE, color, x, y, z, r * sx, r * sy, r * sz); }
export function smile(r, color, x, y, z) { const m = mesh(SMILE, color, x, y, z, r, r, r); m.rotation.z = Math.PI; return m; }

// ombra morbida (texture radiale), molto più leggera delle shadow map
export const shadowMat = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  grd.addColorStop(0, 'rgba(0,30,20,0.45)'); grd.addColorStop(1, 'rgba(0,30,20,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false });
})();
export const dotTex = (() => { // puntino morbido per neve, stelle e luci
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.4, 'rgba(255,255,255,0.8)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
})();
export const SHY = 0.06; // altezza delle ombre (sopra le chiazze del terreno)
export const SHADOW_GEO = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
export function blobShadow(size, parent) {
  const m = new THREE.Mesh(SHADOW_GEO, shadowMat);
  m.scale.set(size, 1, size); m.position.y = SHY; m.renderOrder = 1; parent.add(m); return m;
}
