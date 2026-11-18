// Effetti comuni: animazioni a tempo (tween), coriandoli/scintille e piccoli aiuti.
import * as THREE from '../vendor/three.module.min.js';
import { rand, pickOne } from './utils.js';

export function createTweens() {
  const list = [];
  return {
    add(dur, fn, done) { list.push({ t: 0, dur, fn, done }); },
    clear() { list.length = 0; },
    update(dt) {
      for (let i = list.length - 1; i >= 0; i--) {
        const tw = list[i]; tw.t += dt;
        const k = Math.min(1, tw.t / tw.dur); tw.fn(k);
        if (k >= 1) { list.splice(i, 1); tw.done && tw.done(); }
      }
    },
  };
}

export function createParticles(scene, N = 400) {
  const im = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.11, 0), new THREE.MeshBasicMaterial({ color: 0xffffff }), N);
  im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.frustumCulled = false;
  const pos = [], vel = [], life = new Float32Array(N), maxLife = new Float32Array(N), size = new Float32Array(N), spin = new Float32Array(N), grav = new Float32Array(N);
  const col = new THREE.Color(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3();
  for (let i = 0; i < N; i++) { pos.push(new THREE.Vector3()); vel.push(new THREE.Vector3()); im.setColorAt(i, col.set(0xffffff)); im.setMatrixAt(i, m4.makeScale(0, 0, 0)); }
  scene.add(im);
  let next = 0;
  return {
    burst(at, colors, count = 20, speed = 4, { up = 3, gravity = 8, sz = 1, lifeT = 1.1 } = {}) {
      count = Math.ceil(count * 0.55);
      for (let n = 0; n < count; n++) {
        const i = next; next = (next + 1) % N;
        pos[i].copy(at);
        const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI - Math.PI / 2;
        vel[i].set(Math.cos(a) * Math.cos(b), Math.sin(b) * 0.6 + 0.4, Math.sin(a) * Math.cos(b)).multiplyScalar(speed * rand(0.4, 1));
        vel[i].y += up;
        maxLife[i] = life[i] = lifeT * rand(0.7, 1.3); size[i] = sz * rand(0.7, 1.4); spin[i] = rand(0, 6); grav[i] = gravity;
        im.setColorAt(i, col.set(Array.isArray(colors) ? pickOne(colors) : colors));
      }
      im.instanceColor.needsUpdate = true;
    },
    update(dt) {
      for (let i = 0; i < N; i++) {
        if (life[i] <= 0) continue;
        life[i] -= dt;
        vel[i].y -= grav[i] * dt; vel[i].multiplyScalar(1 - 1.2 * dt);
        pos[i].addScaledVector(vel[i], dt);
        if (pos[i].y < 0.05) { pos[i].y = 0.05; vel[i].y *= -0.3; }
        spin[i] += dt * 8;
        const k = Math.max(0, life[i] / maxLife[i]);
        s.setScalar(life[i] > 0 ? size[i] * Math.min(1, k * 2.5) : 0);
        q.setFromEuler(e.set(spin[i], spin[i] * 0.7, 0));
        im.setMatrixAt(i, m4.compose(pos[i], q, s));
      }
      im.instanceMatrix.needsUpdate = true;
    },
  };
}

// porta un modello a una dimensione standard (il lato più lungo = size) con la base a terra
export function normalize(obj, size = 1.3) {
  const box = new THREE.Box3().setFromObject(obj), dim = box.getSize(new THREE.Vector3());
  const k = size / Math.max(dim.x, dim.y, dim.z, 0.001);
  const pivot = new THREE.Group();
  obj.position.sub(new THREE.Vector3((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2));
  pivot.add(obj); pivot.scale.setScalar(k);
  pivot.userData.height = dim.y * k;
  return pivot;
}
export const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const CONFETTI = [0xff5d73, 0xffa62b, 0xffd93d, 0x6bcb77, 0x4d96ff, 0xb46bff, 0xff7bd5];
