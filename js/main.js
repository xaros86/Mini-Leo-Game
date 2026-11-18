// Mini Leo - un giochino 3D per bimbi piccoli.
// Tocca il prato: Leo corre lì e nasce qualcosa. Tocca palloncini, bolle e lanterne: scoppiano.
// Tocca gli amici (farfalle, granchi, pinguini, lucciole): fanno una magia. Tocca un albero: cade un frutto e Leo lo mangia.
// Porta Leo sulle 5 cose da raccogliere: festa! E poi si parte per un nuovo mondo.
import * as THREE from './vendor/three.module.min.js';

// ---------------------------------------------------------------- utilità
const rand = (a, b) => a + Math.random() * (b - a);
const pickOne = (arr) => arr[(Math.random() * arr.length) | 0];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOutBack = (t) => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const angleLerp = (a, b, t) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * t; };

const PALETTE = [0xff5d73, 0xffa62b, 0xffd93d, 0x6bcb77, 0x4d96ff, 0xb46bff, 0xff7bd5, 0x3fd2c7];

// ---------------------------------------------------------------- suoni (sintetizzati, nessun file)
const PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.5];
const sfx = {
  ctx: null, master: null, noiseBuf: null,
  init() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.7;
      const comp = this.ctx.createDynamicsCompressor();
      this.master.connect(comp).connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.6;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  tone(freq, dur, { type = 'sine', vol = 0.25, slide = null, delay = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur, vol, freq = 1800, delay = 0, q = 0.8) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t); s.stop(t + dur);
  },
  pop() { this.noise(0.12, 0.6, 2200); this.tone(620, 0.14, { slide: 140, vol: 0.3 }); this.tone(rand(900, 1300), 0.25, { type: 'triangle', vol: 0.12, delay: 0.05 }); },
  bloop() { this.tone(300, 0.12, { slide: 1100, vol: 0.3 }); this.tone(1400, 0.15, { vol: 0.08, delay: 0.08 }); },
  boom() { this.noise(0.5, 0.5, 600, 0, 0.5); for (let i = 0; i < 6; i++) this.noise(0.05, 0.25, 4000, 0.15 + i * 0.07); this.chime(); },
  boing() { this.tone(220, 0.3, { type: 'triangle', slide: 660, vol: 0.3 }); },
  hop() { this.tone(rand(380, 440), 0.07, { slide: 600, vol: 0.06 }); },
  plop() { const f = pickOne(PENTA); this.tone(f, 0.35, { type: 'triangle', vol: 0.22 }); this.tone(f * 2, 0.2, { vol: 0.05 }); },
  giggle() { for (let i = 0; i < 5; i++) this.tone(700 + i * 40, 0.09, { type: 'triangle', slide: 1050 + i * 60, vol: 0.18, delay: i * 0.1 }); },
  chime() { [0, 2, 4, 7].forEach((n, i) => this.tone(PENTA[n], 0.4, { type: 'triangle', vol: 0.2, delay: i * 0.08 })); },
  flutter() { for (let i = 0; i < 6; i++) this.tone(PENTA[(i * 3) % PENTA.length] * 1.5, 0.12, { vol: 0.1, delay: i * 0.05 }); },
  click() { for (let i = 0; i < 4; i++) { this.noise(0.04, 0.4, 3500, i * 0.12, 3); this.tone(900, 0.04, { type: 'square', vol: 0.05, delay: i * 0.12 }); } },
  whee() { this.tone(350, 0.6, { type: 'triangle', slide: 1300, vol: 0.22 }); this.noise(0.6, 0.15, 5000, 0, 0.5); },
  rustle() { this.noise(0.35, 0.35, 1200, 0, 0.6); this.noise(0.3, 0.2, 2500, 0.1, 0.6); },
  chomp() { [0, 0.22].forEach((d) => { this.tone(260, 0.1, { type: 'square', slide: 140, vol: 0.12, delay: d }); this.noise(0.06, 0.3, 900, d); }); this.tone(PENTA[5], 0.3, { type: 'triangle', vol: 0.15, delay: 0.5 }); },
  whoosh() { this.noise(0.9, 0.35, 900, 0, 0.4); this.tone(200, 0.9, { slide: 900, vol: 0.12 }); },
  fanfare() {
    const seq = [0, 2, 4, 5, 4, 5, 7];
    seq.forEach((n, i) => { this.tone(PENTA[n], 0.35, { type: 'square', vol: 0.06, delay: i * 0.15 }); this.tone(PENTA[n], 0.4, { type: 'triangle', vol: 0.18, delay: i * 0.15 }); });
    this.tone(PENTA[7], 0.9, { type: 'triangle', vol: 0.22, delay: seq.length * 0.15 });
  },
};
const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* niente */ } };

// ---------------------------------------------------------------- scena base
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd6f0ff, 35, 80);
const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 200);
const camTarget = new THREE.Vector3(0, 0.5, -1);
scene.add(camera); // il cielo (sole, luna, nuvole) è attaccato alla telecamera

const hemi = new THREE.HemisphereLight(0xffffff, 0x88cc77, 1.6);
scene.add(hemi);
const sunLight = new THREE.DirectionalLight(0xffffff, 1.8);
sunLight.position.set(-4, 10, 6);
scene.add(sunLight);

// materiali "cartone animato" (condivisi: niente sprechi di memoria cambiando mondo)
const gradientMap = (() => {
  const t = new THREE.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
})();
const matCache = new Map();
function toon(color, extra = {}) {
  const key = 't' + color + JSON.stringify(extra);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshToonMaterial({ color, gradientMap, ...extra }));
  return matCache.get(key);
}
function glow(color, extra = {}) { // colori che "brillano" (non toccati dalle luci)
  const key = 'b' + color + JSON.stringify(extra);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshBasicMaterial({ color, ...extra }));
  return matCache.get(key);
}
const SPHERE = new THREE.SphereGeometry(1, 24, 16);
const SPHERE_LO = new THREE.SphereGeometry(1, 12, 8);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 12);
const CONE = new THREE.ConeGeometry(1, 1, 14);
const BOX = new THREE.BoxGeometry(1, 1, 1);
const DISC = new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2);
const SMILE = new THREE.TorusGeometry(1, 0.25, 6, 14, Math.PI);
function mesh(geo, color, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, typeof color === 'number' ? toon(color) : color);
  m.scale.set(sx, sy, sz); m.position.set(x, y, z); return m;
}
function ball(r, color, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) { return mesh(SPHERE, color, x, y, z, r * sx, r * sy, r * sz); }
function smile(r, color, x, y, z) { const m = mesh(SMILE, color, x, y, z, r, r, r); m.rotation.z = Math.PI; return m; }

// ombra morbida (texture radiale), molto più leggera delle shadow map
const shadowMat = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  grd.addColorStop(0, 'rgba(0,30,20,0.45)'); grd.addColorStop(1, 'rgba(0,30,20,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false });
})();
const dotTex = (() => { // puntino morbido per neve, stelle e luci
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.4, 'rgba(255,255,255,0.8)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
})();
const SHADOW_GEO = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
let world = new THREE.Group(); // tutto ciò che cambia da un mondo all'altro
scene.add(world);
function blobShadow(size, parent = world) {
  const m = new THREE.Mesh(SHADOW_GEO, shadowMat);
  m.scale.set(size, 1, size); m.position.y = 0.03; m.renderOrder = 1; parent.add(m); return m;
}
function skyTexture(stops) {
  const c = document.createElement('canvas'); c.width = 2; c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 256);
  stops.forEach((s, i) => grd.addColorStop(i / (stops.length - 1), s));
  g.fillStyle = grd; g.fillRect(0, 0, 2, 256);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}

const ground = new THREE.Mesh(new THREE.CircleGeometry(90, 48).rotateX(-Math.PI / 2), new THREE.MeshToonMaterial({ color: 0x7fd65b, gradientMap }));
scene.add(ground);

// ---------------------------------------------------------------- cielo (attaccato alla telecamera: si vede sempre)
const sky = new THREE.Group();
camera.add(sky);
const SKY_D = 40;
const skyMat = (c) => glow(c, { fog: false, depthTest: false, depthWrite: false });
const sun = new THREE.Group();
{
  sun.add(mesh(SPHERE, skyMat(0xffe14d)));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const r = mesh(CONE, skyMat(0xffc93c), Math.cos(a) * 1.5, Math.sin(a) * 1.5, -0.2, 0.35, 0.9, 0.35);
    r.rotation.z = a - Math.PI / 2; sun.add(r);
  }
  [-0.35, 0.35].forEach((x) => sun.add(ball(1, skyMat(0x8a5a00), x, 0.2, 0.98, 0.12, 0.17, 0.05)));
  sun.add(smile(0.35, skyMat(0x8a5a00), 0, -0.1, 0.98));
  sky.add(sun);
}
const moon = new THREE.Group();
{
  moon.add(mesh(SPHERE, skyMat(0xfff4c2)));
  moon.add(ball(0.2, skyMat(0xf0e2a0), -0.4, -0.35, 0.9, 1, 1, 0.3), ball(0.14, skyMat(0xf0e2a0), 0.45, 0.4, 0.9, 1, 1, 0.3));
  [-0.32, 0.32].forEach((x) => { const e = smile(0.12, skyMat(0x8a7a40), x, 0.15, 0.99); e.rotation.z = 0; moon.add(e); }); // occhi chiusi: dorme
  moon.add(smile(0.22, skyMat(0x8a7a40), 0, -0.15, 0.99));
  sky.add(moon);
}
const clouds = [];
for (let i = 0; i < 4; i++) {
  const c = new THREE.Group();
  [[0, 0, 1.3], [1.3, -0.2, 1], [-1.3, -0.25, 0.95], [0.5, 0.6, 0.9]].forEach(([x, y, r]) => c.add(ball(r, skyMat(0xffffff), x, y, 0, 1, 0.85, 0.7)));
  c.userData.speed = rand(0.3, 0.7); c.userData.yk = rand(0.62, 0.9); c.userData.s = rand(0.9, 1.4);
  c.position.x = rand(-20, 20);
  sky.add(c); clouds.push(c);
}
const skyStars = (() => { // stelline che brillano di notte
  const n = 60, pos = new Float32Array(n * 3);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ map: dotTex, size: 0.9, color: 0xfff6c0, transparent: true, depthWrite: false, depthTest: false, fog: false }));
  sky.add(p); return p;
})();
sky.traverse((o) => (o.renderOrder = 10)); // il cielo si disegna sempre davanti, come un adesivo
let skyHalfW = 10, skyHalfH = 10;
function layoutSky() {
  skyHalfH = SKY_D * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  skyHalfW = skyHalfH * camera.aspect;
  const s = Math.min(skyHalfH, skyHalfW) * 0.13;
  [sun, moon].forEach((o) => { o.position.set(-skyHalfW * 0.72, skyHalfH * 0.62, -SKY_D); o.scale.setScalar(s); });
  clouds.forEach((c) => { c.position.y = skyHalfH * c.userData.yk; c.position.z = -SKY_D - 1; c.scale.setScalar(s * 0.9 * c.userData.s); });
  const pos = skyStars.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setXYZ(i, rand(-skyHalfW, skyHalfW), rand(skyHalfH * 0.72, skyHalfH), -SKY_D - 2);
  pos.needsUpdate = true;
}

// neve che cade
const snow = (() => {
  const n = 350, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) pos.set([rand(-14, 14), rand(0, 12), rand(-16, 9)], i * 3);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ map: dotTex, size: 0.22, color: 0xffffff, transparent: true, depthWrite: false }));
  p.frustumCulled = false; p.visible = false; scene.add(p);
  return p;
})();
function updateSnow(dt, time) {
  if (!snow.visible) return;
  const a = snow.geometry.attributes.position;
  for (let i = 0; i < a.count; i++) {
    let y = a.getY(i) - dt * (0.8 + (i % 5) * 0.15);
    if (y < 0) y = 12;
    a.setY(i, y); a.setX(i, a.getX(i) + Math.sin(time + i) * dt * 0.3);
  }
  a.needsUpdate = true;
}

// ---------------------------------------------------------------- area di gioco (si adatta allo schermo)
const bounds = { xHalf: 5, zMin: -4, zMax: 4 };
const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const ndc = new THREE.Vector2();
function screenToGround(nx, ny, out = new THREE.Vector3()) {
  ndc.set(nx, ny); raycaster.setFromCamera(ndc, camera);
  return raycaster.ray.intersectPlane(groundPlane, out);
}
let W = 1, H = 1;
function layout() {
  W = window.innerWidth; H = window.innerHeight;
  renderer.setSize(W, H);
  camera.aspect = W / H;
  // distanza scelta perché si veda sempre un prato largo almeno ~10 unità
  const halfV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const base = 15;
  const k = Math.max(1, 5.0 / (halfV * base * camera.aspect));
  const dir = new THREE.Vector3(0, camera.aspect < 1 ? 0.5 : 0.62, 0.8).normalize();
  camera.position.copy(camTarget).addScaledVector(dir, base * k);
  camera.lookAt(camTarget);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  const bl = screenToGround(-1, -1);
  const mid = screenToGround(-1, 0.4) || new THREE.Vector3(0, 0, -9);
  bounds.zMax = bl.z - 0.9;
  bounds.xHalf = Math.min(Math.abs(bl.x) - 0.8, 10);
  bounds.zMin = Math.max(mid.z + 0.5, bounds.zMax - 13, -9);
  layoutSky();
}
const clampToBounds = (v) => { v.x = clamp(v.x, -bounds.xHalf, bounds.xHalf); v.z = clamp(v.z, bounds.zMin, bounds.zMax); return v; };
const randomSpot = (margin = 0.5) => new THREE.Vector3(rand(-bounds.xHalf + margin, bounds.xHalf - margin), 0, rand(bounds.zMin + margin, bounds.zMax - margin));

// ---------------------------------------------------------------- animazioni e timer (annullati quando si cambia mondo)
const tweens = [];
function tween(dur, fn, done) { tweens.push({ t: 0, dur, fn, done }); }
function updateTweens(dt) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i]; tw.t += dt;
    const k = Math.min(1, tw.t / tw.dur); tw.fn(k);
    if (k >= 1) { tweens.splice(i, 1); tw.done && tw.done(); }
  }
}
let gen = 0; // "generazione" del mondo: i timer vecchi non fanno nulla nel mondo nuovo
function later(ms, fn) { const g = gen; setTimeout(() => { if (g === gen) fn(); }, ms); }

// ---------------------------------------------------------------- particelle (coriandoli, scintille, cuoricini)
const particles = (() => {
  const N = 600;
  const geo = new THREE.OctahedronGeometry(0.11, 0);
  const im = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }), N);
  im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  im.frustumCulled = false;
  const pos = [], vel = [], life = new Float32Array(N), maxLife = new Float32Array(N), size = new Float32Array(N), spin = new Float32Array(N), grav = new Float32Array(N);
  const col = new THREE.Color(); const m4 = new THREE.Matrix4(); const q = new THREE.Quaternion(); const e = new THREE.Euler(); const s = new THREE.Vector3();
  for (let i = 0; i < N; i++) { pos.push(new THREE.Vector3()); vel.push(new THREE.Vector3()); im.setColorAt(i, col.set(0xffffff)); im.setMatrixAt(i, m4.makeScale(0, 0, 0)); }
  scene.add(im);
  let next = 0;
  return {
    burst(at, colors, count = 30, speed = 5, { up = 3, gravity = 9, sz = 1, lifeT = 1.1 } = {}) {
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
})();
const HEARTS = [0xff5d73, 0xff8fa3, 0xffffff];

// cerchio che si allarga dove si tocca
const ringGeo = new THREE.RingGeometry(0.75, 1, 32).rotateX(-Math.PI / 2);
function ripple(at, color = 0xffffff) {
  const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false }));
  m.position.copy(at); m.position.y = 0.05; scene.add(m);
  tween(0.5, (k) => { m.scale.setScalar(0.2 + k * 1.2); m.material.opacity = 1 - k; }, () => { scene.remove(m); m.material.dispose(); });
}

// ---------------------------------------------------------------- LEO, il leoncino
const leo = (() => {
  const root = new THREE.Group();
  const body = new THREE.Group(); // per saltelli e schiacciamenti
  root.add(body);
  const Y = 0xffc94a, MANE = 0xf5892b, DARK = 0x3b2a20, CREAM = 0xfff0c4, PINK = 0xff8fa3;

  body.add(ball(0.6, Y, 0, 0.62, 0, 1, 0.95, 0.95));         // pancia
  body.add(ball(0.4, CREAM, 0, 0.56, 0.3, 1, 1.05, 0.55));    // pancino chiaro
  const footL = ball(0.22, Y, -0.3, 0.12, 0.12, 1.1, 0.6, 1.4);
  const footR = ball(0.22, Y, 0.3, 0.12, 0.12, 1.1, 0.6, 1.4);
  body.add(footL, footR);
  const armL = new THREE.Group(); armL.position.set(-0.52, 0.8, 0.05); armL.add(ball(0.17, Y, 0, -0.18, 0, 0.85, 1.4, 0.85));
  const armR = new THREE.Group(); armR.position.set(0.52, 0.8, 0.05); armR.add(ball(0.17, Y, 0, -0.18, 0, 0.85, 1.4, 0.85));
  body.add(armL, armR);
  const tail = new THREE.Group(); tail.position.set(0, 0.45, -0.5);
  const tailStick = mesh(CYL, Y, 0, 0.25, -0.15, 0.055, 0.6, 0.055); tailStick.rotation.x = -0.6; tail.add(tailStick);
  tail.add(ball(0.15, MANE, 0, 0.52, -0.33));
  body.add(tail);

  const head = new THREE.Group(); head.position.set(0, 1.45, 0.05);
  body.add(head);
  head.add(ball(0.68, MANE, 0, 0, -0.22, 1, 1, 0.65));
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    head.add(ball(0.27, i % 2 ? MANE : 0xe8731c, Math.cos(a) * 0.68, Math.sin(a) * 0.68, -0.12));
  }
  head.add(ball(0.6, Y, 0, 0, 0.05));
  [-1, 1].forEach((s) => {
    head.add(ball(0.17, Y, s * 0.45, 0.5, 0.05));
    head.add(ball(0.09, PINK, s * 0.45, 0.5, 0.17, 1, 1, 0.5));
    head.add(ball(0.1, PINK, s * 0.36, -0.14, 0.5, 1, 0.6, 0.4));
  });
  const eyes = [];
  [-1, 1].forEach((s) => {
    const eye = new THREE.Group(); eye.position.set(s * 0.21, 0.1, 0.52);
    eye.add(ball(0.16, 0xffffff, 0, 0, 0, 1, 1.15, 0.6));
    eye.add(ball(0.1, DARK, 0, -0.01, 0.07, 1, 1.1, 0.6));
    eye.add(ball(0.035, 0xffffff, 0.035, 0.04, 0.13));
    head.add(eye); eyes.push(eye);
  });
  head.add(ball(0.24, CREAM, 0, -0.18, 0.5, 1.2, 0.8, 0.65));
  head.add(ball(0.085, DARK, 0, -0.08, 0.66, 1.3, 0.9, 0.8));
  const mouth = smile(0.09, DARK, 0, -0.21, 0.66);
  head.add(mouth);
  const mouthOpen = ball(0.08, 0xc0394b, 0, -0.25, 0.64, 1.1, 0.9, 0.5); mouthOpen.visible = false; head.add(mouthOpen);
  // accessori dei vari mondi
  const hat = new THREE.Group(); // berretto di lana per la neve
  hat.add(ball(0.5, 0xff5d73, 0, 0.42, 0.05, 1.05, 0.62, 1.05), mesh(CYL, 0xffffff, 0, 0.32, 0.05, 0.56, 0.14, 0.56), ball(0.15, 0xffffff, 0, 0.82, 0.05));
  hat.visible = false; head.add(hat);
  const shades = new THREE.Group(); // occhiali da sole per la spiaggia
  [-0.21, 0.21].forEach((x) => { const l = mesh(CYL, 0x3355aa, x, 0.1, 0.66, 0.17, 0.05, 0.17); l.rotation.x = Math.PI / 2; shades.add(l); });
  shades.add(mesh(BOX, 0x3355aa, 0, 0.14, 0.66, 0.2, 0.03, 0.03));
  shades.visible = false; head.add(shades);

  scene.add(root);
  const shadow = blobShadow(1.6, scene);

  const st = {
    root, pos: new THREE.Vector3(0, 0, 1), target: new THREE.Vector3(0, 0, 1), moving: false,
    y: 0, vy: 0, grounded: true, squash: 0, squashV: 0, yaw: 0, spin: 0, spinV: 0,
    blinkT: 2, happyT: 0, idleT: 0, waveT: 0, munchT: 0, t: 0, lastHop: 0,
  };
  st.goTo = (p) => { st.target.copy(p); clampToBounds(st.target); st.moving = true; st.idleT = 0; };
  st.jump = (v = 7) => { if (st.grounded) { st.vy = v; st.grounded = false; st.squash = 0.25; } };
  st.happy = (big = false) => { st.happyT = big ? 1.6 : 0.9; st.jump(big ? 9 : 7.5); st.spinV = big ? 16 : 0; st.idleT = 0; };
  st.wave = () => { st.waveT = 1.6; st.idleT = 0; };
  st.munch = () => { st.munchT = 1.0; st.idleT = 0; };
  st.outfit = (id) => { hat.visible = id === 'neve'; shades.visible = id === 'mare'; };
  st.update = (dt) => {
    st.t += dt; st.idleT += dt;
    let wantYaw = 0;
    if (st.moving) {
      const dx = st.target.x - st.pos.x, dz = st.target.z - st.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.08) { st.moving = false; }
      else {
        const sp = Math.min(d, 4.2 * dt);
        st.pos.x += (dx / d) * sp; st.pos.z += (dz / d) * sp;
        wantYaw = Math.atan2(dx, dz);
        if (st.grounded && st.t - st.lastHop > 0.05) { st.vy = 3.6; st.grounded = false; st.lastHop = st.t; }
      }
    }
    st.yaw = angleLerp(st.yaw, st.moving ? wantYaw : 0, Math.min(1, dt * (st.moving ? 10 : 4)));
    if (!st.grounded) {
      st.vy -= 22 * dt; st.y += st.vy * dt;
      if (st.y <= 0) { st.y = 0; st.grounded = true; st.squash = -0.28 * Math.min(1, Math.abs(st.vy) / 6); st.vy = 0; if (st.moving) sfx.hop(); }
    }
    st.squashV += (-st.squash * 160 - st.squashV * 12) * dt; st.squash += st.squashV * dt;
    const sq = clamp(st.squash, -0.4, 0.4);
    body.scale.set(1 - sq * 0.5, 1 + sq, 1 - sq * 0.5);
    if (st.spinV > 0) { st.spin += st.spinV * dt; if (st.spin >= Math.PI * 2) { st.spin = 0; st.spinV = 0; } }
    root.position.set(st.pos.x, st.y, st.pos.z);
    root.rotation.y = st.yaw + st.spin;
    head.rotation.z = Math.sin(st.t * 2.2) * 0.07;
    head.rotation.x = st.moving ? 0.1 : Math.sin(st.t * 1.3) * 0.04;
    tail.rotation.z = Math.sin(st.t * (st.moving ? 14 : 4)) * 0.5;
    const w = st.moving ? Math.sin(st.t * 18) * 0.12 : 0;
    footL.position.z = 0.12 + w; footR.position.z = 0.12 - w;
    st.happyT = Math.max(0, st.happyT - dt); st.waveT = Math.max(0, st.waveT - dt); st.munchT = Math.max(0, st.munchT - dt);
    if (st.happyT > 0) { armL.rotation.z = -2.4 + Math.sin(st.t * 20) * 0.3; armR.rotation.z = 2.4 - Math.sin(st.t * 20) * 0.3; }
    else if (st.munchT > 0) { armL.rotation.z = -0.3; armR.rotation.z = 0.3; armL.rotation.x = armR.rotation.x = -1.3; }
    else if (st.waveT > 0) { armL.rotation.z = lerp(armL.rotation.z, 0.2, 0.2); armR.rotation.z = 2.5 + Math.sin(st.t * 12) * 0.45; }
    else {
      const sw = st.moving ? Math.sin(st.t * 18) * 0.5 : Math.sin(st.t * 2) * 0.08;
      armL.rotation.z = lerp(armL.rotation.z, -0.15, 0.2); armR.rotation.z = lerp(armR.rotation.z, 0.15, 0.2);
      armL.rotation.x = sw; armR.rotation.x = -sw;
    }
    const open = st.happyT > 0 || st.waveT > 0 || (st.munchT > 0 && Math.sin(st.t * 25) > 0);
    mouth.visible = !open; mouthOpen.visible = open;
    // guanciotte piene mentre mangia
    head.scale.setScalar(st.munchT > 0 ? 1 + Math.abs(Math.sin(st.t * 12)) * 0.06 : 1);
    st.blinkT -= dt;
    const blink = st.blinkT < 0.12 && st.blinkT > 0 ? 0.1 : 1;
    if (st.blinkT <= 0) st.blinkT = rand(2, 4.5);
    eyes.forEach((e) => (e.scale.y = st.happyT > 0 || st.munchT > 0 ? 0.55 : blink));
    shadow.position.set(st.pos.x, 0.03, st.pos.z);
    const ss = 1.6 * (1 - Math.min(0.5, st.y * 0.15)); shadow.scale.set(ss, 1, ss);
    if (st.idleT > 9 && !st.moving) { st.wave(); sfx.giggle(); }
  };
  st.center = () => new THREE.Vector3(st.pos.x, st.y + 1.1, st.pos.z);
  return st;
})();

// ================================================================ costruttori degli oggetti dei mondi
// ---- alberi
function meadowTree(dark = false) {
  const g = new THREE.Group();
  g.add(mesh(CYL, dark ? 0x6b4a3a : 0xa0673a, 0, 0.7, 0, 0.26, 1.4, 0.26));
  const leaf = dark ? pickOne([0x1f6b52, 0x24785a]) : pickOne([0x3fae49, 0x4cc25a, 0x36a043]);
  g.add(ball(1.0, leaf, 0, 2.0, 0), ball(0.75, leaf, 0.6, 1.6, 0.2), ball(0.7, leaf, -0.6, 1.7, 0.1), ball(0.6, leaf, 0, 2.7, 0));
  for (let i = 0; i < 4; i++) g.add(ball(0.13, dark ? glow(0xffd84d) : 0xff4d5e, rand(-0.8, 0.8), rand(1.5, 2.6), rand(0.6, 0.95)));
  return g;
}
function palmTree() {
  const g = new THREE.Group();
  let x = 0, y = 0;
  const lean = rand(-0.25, 0.25);
  for (let i = 0; i < 6; i++) {
    const seg = mesh(CYL, i % 2 ? 0xc48a4a : 0xb57a3d, x, y + 0.25, 0, 0.2 - i * 0.012, 0.5, 0.2 - i * 0.012);
    seg.rotation.z = -lean; g.add(seg);
    x += Math.sin(lean) * 0.5; y += 0.47;
  }
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const leaf = new THREE.Group(); leaf.position.set(x, y + 0.1, 0); leaf.rotation.y = a;
    const l = ball(0.9, pickOne([0x3fae49, 0x4cc25a]), 0.75, -0.15, 0, 1, 0.12, 0.3); l.rotation.z = -0.35; leaf.add(l);
    g.add(leaf);
  }
  [[0.18, 0], [-0.12, 0.15], [0, -0.18]].forEach(([dx, dz]) => g.add(ball(0.17, 0x7a4a24, x + dx, y - 0.1, dz + 0.1)));
  g.userData.top = y;
  return g;
}
function pineTree() {
  const g = new THREE.Group();
  g.add(mesh(CYL, 0x8a5a3a, 0, 0.4, 0, 0.2, 0.8, 0.2));
  [[1.25, 1.1, 0.9], [1.0, 1.9, 0.95], [0.72, 2.6, 0.9]].forEach(([r, y, h]) => {
    g.add(mesh(CONE, 0x2f8a5a, 0, y, 0, r, h * 1.3, r));
    g.add(mesh(CONE, 0xffffff, 0, y + h * 0.42, 0, r * 0.55, h * 0.55, r * 0.55));
  });
  g.add(ball(0.12, 0xffd23f, 0, 3.4, 0));
  return g;
}
// ---- frutti che cadono dagli alberi
function makeFruit(kind) {
  const g = new THREE.Group();
  if (kind === 'apple') { g.add(ball(0.28, 0xff4d5e), mesh(CYL, 0x7a4a24, 0, 0.3, 0, 0.03, 0.15, 0.03)); const l = ball(0.1, 0x4cc25a, 0.1, 0.33, 0, 1.5, 0.5, 0.8); g.add(l); }
  if (kind === 'golden') { g.add(ball(0.28, glow(0xffd84d)), mesh(CYL, 0x7a4a24, 0, 0.3, 0, 0.03, 0.15, 0.03)); }
  if (kind === 'coconut') { g.add(ball(0.3, 0x7a4a24)); [-0.08, 0.08, 0].forEach((x, i) => g.add(ball(0.04, 0x3b2a20, x, i === 2 ? 0.0 : 0.08, 0.28))); }
  if (kind === 'cookie') {
    const c = mesh(CYL, 0xd99a55, 0, 0, 0, 0.32, 0.1, 0.32); c.rotation.x = 1.2; g.add(c);
    for (let i = 0; i < 5; i++) g.add(ball(0.045, 0x5a3420, rand(-0.18, 0.18), rand(-0.18, 0.18), 0.06 + 0.02));
  }
  return g;
}
// ---- cose da raccogliere
const starShape = (() => {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.22 : 0.5, a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath(); return s;
})();
const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 2 }).center();
const starfishGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 3 }).center();
function face(g, z, s = 1, color = 0x3b2a20) {
  [-0.1, 0.1].forEach((x) => g.add(ball(0.045 * s, color, x * s, 0.04 * s, z, 1, 1.4, 0.6)));
  g.add(smile(0.06 * s, color, 0, -0.05 * s, z));
}
function makeCollectible(kind) {
  const g = new THREE.Group();
  if (kind === 'star') { g.add(new THREE.Mesh(starGeo, toon(0xffd23f, { emissive: 0x664400 }))); face(g, 0.15); }
  if (kind === 'nightstar') {
    g.add(new THREE.Mesh(starGeo, glow(0xffe066)));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: 0xfff2a0, transparent: true, opacity: 0.55, depthWrite: false }));
    halo.scale.setScalar(2.2); g.add(halo); face(g, 0.15, 1, 0x8a5a00);
  }
  if (kind === 'starfish') {
    const col = pickOne([0xff8a5c, 0xff6f91, 0xffa94d]);
    g.add(new THREE.Mesh(starfishGeo, toon(col)));
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + Math.PI / 2; g.add(ball(0.04, 0xfff0d0, Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0.11)); }
    face(g, 0.13);
  }
  if (kind === 'gift') {
    const col = pickOne([0xff5d73, 0x4d96ff, 0xb46bff, 0x6bcb77]);
    const rib = col === 0x6bcb77 ? 0xff5d73 : 0xffd93d;
    g.add(mesh(BOX, col, 0, 0, 0, 0.62, 0.55, 0.55));
    g.add(mesh(BOX, rib, 0, 0, 0, 0.14, 0.57, 0.57), mesh(BOX, rib, 0, 0, 0, 0.64, 0.57, 0.14));
    g.add(ball(0.13, rib, -0.1, 0.32, 0, 1.2, 0.8, 0.8), ball(0.13, rib, 0.1, 0.32, 0, 1.2, 0.8, 0.8));
  }
  return g;
}
const HUD_ICON = {
  star: { path: 'M25 3l6.5 14 15 1.6-11.3 10 3.3 15L25 36l-13.5 7.6 3.3-15L3.5 18.6l15-1.6z', fill: '#ffd23f', stroke: '#f0a500' },
  nightstar: { path: 'M25 3l6.5 14 15 1.6-11.3 10 3.3 15L25 36l-13.5 7.6 3.3-15L3.5 18.6l15-1.6z', fill: '#ffe066', stroke: '#fff6c0' },
  starfish: { path: 'M25 3l6.5 14 15 1.6-11.3 10 3.3 15L25 36l-13.5 7.6 3.3-15L3.5 18.6l15-1.6z', fill: '#ff8a5c', stroke: '#e0603a' },
  gift: { path: 'M7 20h36v24H7zM5 13h40v8H5zM22 13h6v31h-6zM25 13c-4-9-14-8-11-2 2 3 8 2 11 2 3 0 9 1 11-2 3-6-7-7-11 2z', fill: '#ff5d73', stroke: '#c93a4f' },
};
// ---- cose che galleggiano in aria (si toccano e scoppiano)
const BALLOON_GEO = new THREE.SphereGeometry(0.55, 24, 18);
const STRING_GEO = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 8 }, (_, i) => new THREE.Vector3(Math.sin(i * 1.3) * 0.06, -0.75 - i * 0.14, 0)));
const STRING_MAT = new THREE.LineBasicMaterial({ color: 0xffffff });
function makeFloater(kind) {
  const g = new THREE.Group();
  let color = pickOne(PALETTE);
  if (kind === 'balloon') {
    const b = new THREE.Mesh(BALLOON_GEO, toon(color, { emissive: new THREE.Color(color).multiplyScalar(0.18).getHex() }));
    b.scale.set(1, 1.18, 1); g.add(b);
    g.add(ball(0.12, 0xffffff, -0.2, 0.28, 0.42, 0.8, 1.2, 0.5));
    g.add(mesh(CONE, color, 0, -0.68, 0, 0.1, 0.16, 0.1));
    g.add(new THREE.Line(STRING_GEO, STRING_MAT));
  }
  if (kind === 'bubble') {
    color = pickOne([0x9be7ff, 0xc9b8ff, 0xffc2ea, 0xb8ffd9]);
    g.add(mesh(BALLOON_GEO, glow(color, { transparent: true, opacity: 0.35, depthWrite: false })));
    g.add(ball(0.12, glow(0xffffff, { transparent: true, opacity: 0.9 }), -0.2, 0.22, 0.42, 0.9, 1.2, 0.5));
    g.add(ball(0.05, glow(0xffffff, { transparent: true, opacity: 0.9 }), 0.25, -0.2, 0.45));
  }
  if (kind === 'lantern') {
    color = pickOne([0xffa62b, 0xff5d73, 0xffd93d, 0xff7bd5]);
    const b = mesh(BALLOON_GEO, glow(color)); b.scale.set(1, 1.15, 1); g.add(b);
    for (let i = -1; i <= 1; i++) g.add(mesh(CYL, glow(new THREE.Color(color).multiplyScalar(0.75).getHex()), 0, i * 0.3, 0, 0.56 - Math.abs(i) * 0.12, 0.03, 0.56 - Math.abs(i) * 0.12));
    g.add(mesh(CYL, 0x8a2a2a, 0, 0.66, 0, 0.22, 0.1, 0.22), mesh(CYL, 0x8a2a2a, 0, -0.66, 0, 0.22, 0.1, 0.22));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color, transparent: true, opacity: 0.45, depthWrite: false }));
    halo.scale.setScalar(2.8); g.add(halo);
  }
  return { g, color };
}
// ---- cose che nascono dove si tocca
const STEM = new THREE.CylinderGeometry(0.035, 0.045, 0.45, 6).translate(0, 0.225, 0);
function makeSprout(kind) {
  const g = new THREE.Group();
  let color = pickOne(PALETTE);
  if (kind === 'flower') {
    g.add(new THREE.Mesh(STEM, toon(0x3d9e3a)));
    const leaf = ball(0.1, 0x4cb847, 0.1, 0.12, 0, 1.4, 0.5, 0.7); leaf.rotation.z = 0.5; g.add(leaf);
    const h = new THREE.Group(); h.position.y = 0.5; h.rotation.x = -0.6; g.add(h);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; h.add(ball(0.13, color, Math.cos(a) * 0.16, Math.sin(a) * 0.16, 0, 1, 1, 0.45)); }
    h.add(ball(0.1, color === 0xffd93d ? 0xff7a3d : 0xffe45c, 0, 0, 0.04, 1, 1, 0.6));
  }
  if (kind === 'beach') {
    if (Math.random() < 0.5) { // castello di sabbia
      color = 0xe8c070;
      g.add(mesh(CYL, 0xe8c070, 0, 0.15, 0, 0.35, 0.3, 0.35));
      [-0.22, 0.22].forEach((x) => { g.add(mesh(CYL, 0xf0cd80, x, 0.38, 0.1, 0.12, 0.35, 0.12)); g.add(mesh(CONE, 0xf0cd80, x, 0.63, 0.1, 0.13, 0.18, 0.13)); });
      g.add(mesh(CYL, 0xf0cd80, 0, 0.45, -0.05, 0.14, 0.5, 0.14), mesh(CYL, 0x7a4a24, 0, 0.82, -0.05, 0.012, 0.3, 0.012));
      const flag = mesh(BOX, pickOne(PALETTE), 0.07, 0.9, -0.05, 0.14, 0.09, 0.01); g.add(flag);
    } else { // conchiglia a ventaglio
      color = pickOne([0xffc2d1, 0xffe0b2, 0xffd1f0, 0xfff1c9]);
      const h = new THREE.Group(); h.position.y = 0.15; h.rotation.x = -0.9; g.add(h);
      for (let i = 0; i < 7; i++) { const a = -1.1 + (i / 6) * 2.2; const r = ball(0.08, color, Math.sin(a) * 0.15, Math.cos(a) * 0.15, 0, 0.8, 2.2, 0.6); r.rotation.z = -a; h.add(r); }
      h.add(ball(0.07, color, 0, -0.04, 0));
    }
  }
  if (kind === 'snowman') {
    color = 0xffffff;
    g.add(ball(0.26, 0xffffff, 0, 0.24, 0), ball(0.19, 0xffffff, 0, 0.6, 0));
    [-0.07, 0.07].forEach((x) => g.add(ball(0.03, 0x222222, x, 0.66, 0.17)));
    const nose = mesh(CONE, 0xff8a2a, 0, 0.6, 0.2, 0.04, 0.16, 0.04); nose.rotation.x = Math.PI / 2; g.add(nose);
    const sc = pickOne(PALETTE);
    g.add(mesh(CYL, sc, 0, 0.45, 0, 0.17, 0.06, 0.17));
    g.add(mesh(CYL, 0x333344, 0, 0.8, 0, 0.13, 0.04, 0.13), mesh(CYL, 0x333344, 0, 0.9, 0, 0.09, 0.18, 0.09));
  }
  if (kind === 'mushroom') {
    color = pickOne([0x7af0ff, 0xff8af0, 0xb18aff, 0x9bff8a]);
    g.add(mesh(CYL, 0xf3ecd8, 0, 0.17, 0, 0.07, 0.34, 0.07));
    g.add(ball(0.22, glow(color), 0, 0.35, 0, 1, 0.6, 1));
    for (let i = 0; i < 4; i++) { const a = i * 1.6; g.add(ball(0.04, glow(0xffffff), Math.cos(a) * 0.13, 0.45, Math.sin(a) * 0.13)); }
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color, transparent: true, opacity: 0.4, depthWrite: false }));
    halo.position.y = 0.35; halo.scale.setScalar(1.3); g.add(halo);
  }
  return { g, color };
}
// ---- amici (si toccano e fanno una magia)
const WING_GEO = new THREE.CircleGeometry(0.3, 16).translate(0.28, 0.05, 0);
const CAPSULE = new THREE.CapsuleGeometry(0.06, 0.32, 4, 8);
function makeFriend(kind) {
  const g = new THREE.Group();
  const f = { kind, g, pos: randomSpot(), vel: new THREE.Vector3(), target: randomSpot(), t: rand(0, 5), actT: 0, flying: kind === 'butterfly' || kind === 'firefly' };
  if (kind === 'butterfly') {
    f.color = pickOne([0xff7bd5, 0x4d96ff, 0xffa62b, 0xb46bff]);
    const b = new THREE.Mesh(CAPSULE, toon(0x4a3355)); b.rotation.x = Math.PI / 2; g.add(b);
    const wm = toon(f.color, { side: THREE.DoubleSide, emissive: new THREE.Color(f.color).multiplyScalar(0.2).getHex() });
    f.wl = new THREE.Group(); f.wr = new THREE.Group();
    const w1 = new THREE.Mesh(WING_GEO, wm); w1.rotation.x = -Math.PI / 2; f.wr.add(w1);
    const w2 = new THREE.Mesh(WING_GEO, wm); w2.rotation.x = -Math.PI / 2; w2.scale.x = -1; f.wl.add(w2);
    g.add(f.wl, f.wr);
    [-1, 1].forEach((s) => g.add(ball(0.05, 0x4a3355, s * 0.05, 0.08, 0.22)));
  }
  if (kind === 'firefly') {
    f.color = 0xeaff6a;
    g.add(ball(0.09, 0x4a3a2a, 0, 0, 0.08), ball(0.12, glow(f.color), 0, 0, -0.08));
    f.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: f.color, transparent: true, opacity: 0.7, depthWrite: false }));
    f.halo.scale.setScalar(1.4); g.add(f.halo);
    const wm = glow(0xffffff, { transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    f.wl = new THREE.Group(); f.wr = new THREE.Group();
    const w1 = new THREE.Mesh(WING_GEO, wm); w1.rotation.x = -Math.PI / 2; w1.scale.setScalar(0.45); f.wr.add(w1);
    const w2 = new THREE.Mesh(WING_GEO, wm); w2.rotation.x = -Math.PI / 2; w2.scale.set(-0.45, 0.45, 0.45); f.wl.add(w2);
    g.add(f.wl, f.wr);
  }
  if (kind === 'crab') {
    f.color = 0xff5a4a;
    const inner = new THREE.Group(); g.add(inner); f.inner = inner;
    inner.add(ball(0.38, 0xff5a4a, 0, 0.3, 0, 1.25, 0.7, 0.95));
    [-1, 1].forEach((s) => {
      inner.add(mesh(CYL, 0xff5a4a, s * 0.13, 0.6, 0.15, 0.03, 0.25, 0.03));
      inner.add(ball(0.08, 0xffffff, s * 0.13, 0.75, 0.15), ball(0.045, 0x222222, s * 0.13, 0.76, 0.21));
      for (let i = 0; i < 3; i++) { const l = mesh(CYL, 0xe04a3a, s * (0.38 + i * 0.03), 0.12, -0.15 + i * 0.15, 0.03, 0.28, 0.03); l.rotation.z = s * 0.9; inner.add(l); }
    });
    inner.add(smile(0.08, 0x5a1a1a, 0, 0.32, 0.36));
    f.claws = [-1, 1].map((s) => { const c = new THREE.Group(); c.position.set(s * 0.5, 0.42, 0.18); c.add(ball(0.15, 0xff6a5a, 0, 0.1, 0, 0.9, 1.2, 0.6)); inner.add(c); return c; });
  }
  if (kind === 'penguin') {
    f.color = 0x2f3a56;
    const inner = new THREE.Group(); g.add(inner); f.inner = inner;
    inner.add(ball(0.38, 0x2f3a56, 0, 0.45, 0, 1, 1.25, 0.95));
    inner.add(ball(0.3, 0xffffff, 0, 0.42, 0.12, 1, 1.2, 0.8));
    inner.add(ball(0.26, 0x2f3a56, 0, 0.98, 0));
    inner.add(ball(0.2, 0xffffff, 0, 0.95, 0.09, 1, 0.9, 0.85));
    [-0.08, 0.08].forEach((x) => inner.add(ball(0.04, 0x222222, x, 1.0, 0.27)));
    const beak = mesh(CONE, 0xffa62b, 0, 0.92, 0.3, 0.06, 0.14, 0.06); beak.rotation.x = Math.PI / 2; inner.add(beak);
    [-1, 1].forEach((s) => { inner.add(ball(0.1, 0xffa62b, s * 0.15, 0.04, 0.12, 1, 0.4, 1.5)); const wing = ball(0.12, 0x2f3a56, s * 0.38, 0.5, 0, 0.5, 1.4, 0.8); wing.rotation.z = s * 0.3; inner.add(wing); });
    inner.add(ball(0.06, 0xff8fa3, -0.15, 0.9, 0.2, 1, 0.6, 0.4), ball(0.06, 0xff8fa3, 0.15, 0.9, 0.2, 1, 0.6, 0.4));
  }
  f.pos.y = f.flying ? 2 : 0;
  f.newTarget = () => { f.target.copy(randomSpot(0.6)); f.target.y = f.flying ? rand(1.4, 2.8) : 0; };
  f.newTarget();
  f.shadow = blobShadow(f.flying ? 0.6 : 1.0);
  world.add(g);
  return f;
}

// ================================================================ i mondi
const THEMES = [
  {
    id: 'prato', sky: ['#4fb3ff', '#a9dcff', '#e6f7ff'], fog: [0xd6f0ff, 35, 80], ground: 0x7fd65b, patches: [0x95e36b, 0x6cc94e],
    hills: [0x5cbf4a, 0x6fcf55, 0x58b845], light: [0xffffff, 0x88cc77, 1.6, 1.8], night: false,
    tree: () => meadowTree(), fruit: 'apple', collect: 'star', floater: 'balloon', friend: ['butterfly', 'butterfly'], sprout: 'flower', fade: '#a9dcff',
  },
  {
    id: 'mare', sky: ['#38b6ff', '#9fe0ff', '#fff4d6'], fog: [0xfff4d6, 35, 80], ground: 0xf5d98b, patches: [0xfbe6a8, 0xeccb74],
    hills: null, sea: true, light: [0xffffff, 0xffe0a0, 1.6, 1.8], night: false,
    tree: () => palmTree(), fruit: 'coconut', collect: 'starfish', floater: 'bubble', friend: ['crab', 'crab'], sprout: 'beach', fade: '#9fe0ff',
  },
  {
    id: 'neve', sky: ['#8fc8f0', '#cfe8fa', '#f4faff'], fog: [0xeef6ff, 30, 75], ground: 0xf2f7ff, patches: [0xe2ecf8, 0xffffff],
    hills: [0xffffff, 0xeaf2fc, 0xf6faff], light: [0xffffff, 0xbcd4f0, 1.5, 1.6], night: false, snow: true,
    tree: () => pineTree(), fruit: 'cookie', collect: 'gift', floater: 'balloon', friend: ['penguin', 'penguin'], sprout: 'snowman', fade: '#ffffff',
  },
  {
    id: 'notte', sky: ['#0b1440', '#23306e', '#3b3f86'], fog: [0x1d2658, 22, 60], ground: 0x2e6650, patches: [0x367560, 0x285a47],
    hills: [0x1f4a3e, 0x24543f, 0x1b4436], light: [0xb8c6ff, 0x304060, 1.6, 1.0], night: true,
    tree: () => meadowTree(true), fruit: 'golden', collect: 'nightstar', floater: 'lantern', friend: ['firefly', 'firefly', 'firefly', 'firefly'], sprout: 'mushroom', fade: '#23306e',
  },
];
let theme = THEMES[0], themeIndex = 0;

const TREE_SPOTS = [[-12, -12, 1.3], [-7, -15, 1.1], [7, -14, 1.2], [12, -11, 1.4], [-17, -6, 1.2], [17, -5, 1.3], [-3, -19, 1], [3.5, -20, 1.2], [-20, 2, 1.3], [20, 3, 1.2]];
const PATCH_GEO = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
let collectibles = [], floaters = [], friends = [], sprouts = [], fruits = [], trees = [];
let seaWaves = [];

function buildWorld(th) {
  gen++;
  scene.remove(world);
  world = new THREE.Group(); scene.add(world);
  collectibles = []; floaters = []; friends = []; sprouts = []; fruits = []; trees = []; seaWaves = [];
  tweens.length = 0;

  if (scene.background) scene.background.dispose();
  scene.background = skyTexture(th.sky);
  scene.fog.color.set(th.fog[0]); scene.fog.near = th.fog[1]; scene.fog.far = th.fog[2];
  hemi.color.set(th.light[0]); hemi.groundColor.set(th.light[1]); hemi.intensity = th.light[2]; sunLight.intensity = th.light[3];
  ground.material.color.set(th.ground);
  sun.visible = !th.night; moon.visible = th.night; skyStars.visible = th.night;
  clouds.forEach((c) => (c.visible = !th.night));
  snow.visible = !!th.snow;
  leo.outfit(th.id);
  document.documentElement.style.background = th.fade;

  for (let i = 0; i < 18; i++) {
    const p = mesh(PATCH_GEO, pickOne(th.patches), rand(-16, 16), 0.008 + i * 0.004, rand(-14, 8), rand(1, 3), 1, rand(1, 3) * rand(0.5, 1));
    world.add(p);
  }
  if (th.hills) [[-22, -34, 12], [0, -40, 16], [22, -34, 13], [-38, -26, 10], [38, -26, 10]]
    .forEach(([x, z, r], i) => world.add(ball(r, th.hills[i % 3], x, -r * 0.45, z, 1.4, 0.75, 1)));
  if (th.sea) {
    const sea = mesh(new THREE.PlaneGeometry(200, 60).rotateX(-Math.PI / 2), glow(0x3fb8e8), 0, 0.06, -45); world.add(sea);
    const shore = mesh(new THREE.PlaneGeometry(200, 1.2).rotateX(-Math.PI / 2), glow(0x8fe0f5), 0, 0.07, -15.4); world.add(shore);
    for (let i = 0; i < 14; i++) {
      const w = mesh(CAPSULE, glow(0xffffff), rand(-30, 30), 0.1, rand(-40, -17), 1, 1, 1);
      w.rotation.z = Math.PI / 2; w.scale.set(2, rand(3, 6), 1); w.userData.ph = rand(0, 6); world.add(w); seaWaves.push(w);
    }
  }
  TREE_SPOTS.forEach(([x, z, s]) => {
    if (th.sea && z < -14) z = -13.2; // le palme stanno sulla riva
    const g = th.tree(); g.position.set(x, 0, z); g.scale.setScalar(s); world.add(g);
    blobShadow(2.6 * s).position.set(x, 0.03, z);
    trees.push({ g, pos: new THREE.Vector3(x, 1.9 * s, z), r: 1.3 * s, s });
  });

  for (let i = 0; i < 3; i++) spawnCollectible();
  const nf = W > H ? 4 : 3;
  for (let i = 0; i < nf; i++) spawnFloater();
  th.friend.forEach((k) => friends.push(makeFriend(k)));
}

// ---- spawn / interazioni
function spawnCollectible() {
  let p;
  for (let tries = 0; tries < 30; tries++) {
    p = randomSpot(0.8);
    if (p.distanceTo(leo.pos) > 2.2 && collectibles.every((s) => s.pos.distanceTo(p) > 1.8)) break;
  }
  const g = makeCollectible(theme.collect);
  g.position.copy(p); g.scale.setScalar(0.01); world.add(g);
  const c = { g, pos: p, t: rand(0, 6), alive: true, shadow: blobShadow(0.9), wiggle: 0 };
  c.shadow.position.set(p.x, 0.03, p.z);
  tween(0.6, (k) => g.scale.setScalar(Math.max(0.01, easeOutBack(k)) * 1.25));
  collectibles.push(c);
}
const hud = document.getElementById('hud');
const GOAL = 5;
let collected = 0, partyTime = 0, busy = false;
function setupHud() {
  const ic = HUD_ICON[theme.collect];
  hud.innerHTML = `<svg viewBox="0 0 50 50"><path d="${ic.path}"/></svg>`.repeat(GOAL);
  hud.style.setProperty('--on-fill', ic.fill); hud.style.setProperty('--on-stroke', ic.stroke);
  hud.classList.toggle('night', theme.night);
}
function collect(c) {
  c.alive = false;
  collectibles.splice(collectibles.indexOf(c), 1);
  world.remove(c.shadow);
  sfx.chime(); buzz(30);
  particles.burst(c.pos.clone().setY(0.8), [0xffd23f, 0xfff3a0, 0xffffff], 26, 4);
  leo.happy();
  later(1200, spawnCollectible);
  if (collected >= GOAL) { // barra piena (festa in corso): vola via e basta
    const s0 = c.g.scale.x;
    tween(0.5, (k) => { c.g.position.y += 0.15; c.g.scale.setScalar(Math.max(0.01, s0 * (1 - k))); }, () => world.remove(c.g));
    return;
  }
  // vola verso la sua casella in alto
  const slot = hud.children[collected].getBoundingClientRect();
  ndc.set(((slot.left + slot.width / 2) / W) * 2 - 1, -((slot.top + slot.height / 2) / H) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const dest = raycaster.ray.at(4, new THREE.Vector3());
  const from = c.g.position.clone();
  const idx = collected++;
  tween(0.7, (k) => {
    c.g.position.lerpVectors(from, dest, easeInOut(k)); c.g.position.y += Math.sin(k * Math.PI) * 1.5;
    c.g.rotation.y += 0.4; c.g.scale.setScalar(1.25 * (1 - k * 0.6));
  }, () => {
    world.remove(c.g);
    hud.children[idx].classList.add('on');
    sfx.tone(PENTA[idx + 2], 0.3, { type: 'triangle', vol: 0.2 });
    if (idx === GOAL - 1) party();
  });
}

const tmpV = new THREE.Vector3();
function spawnFloater() {
  const { g, color } = makeFloater(theme.floater);
  let p, hoverY;
  for (let tries = 0; tries < 20; tries++) {
    p = randomSpot(0.8); p.z = Math.min(p.z, bounds.zMax - 1.5);
    hoverY = rand(2.2, 3.4);
    tmpV.set(p.x, hoverY + 0.8, p.z).project(camera);
    if (tmpV.y < 0.62 && floaters.every((o) => Math.hypot(o.base.x - p.x, o.base.z - p.z) > 1.6)) break;
  }
  g.position.set(p.x, -0.5, p.z);
  world.add(g);
  floaters.push({ g, color, base: p, hoverY, t: rand(0, 6), vx: rand(-0.3, 0.3), age: 0, shadow: blobShadow(1) });
}
function popFloater(f) {
  floaters.splice(floaters.indexOf(f), 1);
  world.remove(f.g); world.remove(f.shadow);
  buzz(40);
  if (theme.floater === 'bubble') {
    sfx.bloop();
    particles.burst(f.g.position, [f.color, 0xffffff], 25, 3, { up: 0.5, gravity: 1, sz: 0.7, lifeT: 0.7 });
  } else if (theme.floater === 'lantern') { // fuoco d'artificio!
    sfx.boom();
    particles.burst(f.g.position, [f.color, 0xffffff, pickOne(PALETTE), pickOne(PALETTE)], 70, 9, { up: 1, gravity: 2, sz: 1.1, lifeT: 1.4 });
  } else {
    sfx.pop();
    particles.burst(f.g.position, [f.color, f.color, 0xffffff, pickOne(PALETTE)], 45, 6, { up: 1, gravity: 5, sz: 1.2 });
  }
  leo.happy();
  later(rand(1200, 2600), spawnFloater);
}

function sproutAt(at) {
  const { g, color } = makeSprout(theme.sprout);
  g.position.set(at.x, 0, at.z); g.rotation.y = rand(-0.4, 0.4);
  g.scale.setScalar(0.01); world.add(g);
  const s = rand(1.1, 1.5);
  tween(0.55, (k) => g.scale.setScalar(Math.max(0.01, easeOutBack(k) * s)));
  sprouts.push(g);
  if (sprouts.length > 30) {
    const old = sprouts.shift(); const s0 = old.scale.x;
    tween(0.4, (k) => old.scale.setScalar(Math.max(0.001, s0 * (1 - k))), () => world.remove(old));
  }
  particles.burst(at.clone().setY(0.3), [color, 0xffffff], 8, 2, { up: 2, gravity: 8, sz: 0.6, lifeT: 0.6 });
}

function tapFriend(f) {
  if (f.actT > 0) return;
  buzz(20);
  if (f.kind === 'butterfly' || f.kind === 'firefly') {
    f.actT = 0.8; f.newTarget();
    sfx.flutter();
    particles.burst(f.g.position, f.kind === 'firefly' ? [0xeaff6a, 0xffffff, 0xfff3a0] : [f.color, 0xffffff, 0xfff3a0], f.kind === 'firefly' ? 35 : 20, 3, { up: 1, gravity: 1.5 });
  } else if (f.kind === 'crab') {
    f.actT = 1.4; sfx.click();
  } else if (f.kind === 'penguin') {
    f.actT = 1.3; sfx.whee();
    const dir = new THREE.Vector3(rand(-1, 1), 0, rand(-1, 1)).normalize();
    f.target.copy(f.pos).addScaledVector(dir, 3.5); clampToBounds(f.target); f.target.y = 0;
    particles.burst(f.g.position.clone().setY(0.3), [0xffffff, 0xdff1ff], 20, 2.5, { up: 1.5, gravity: 5 });
  }
}
function updateFriend(f, dt) {
  f.t += dt;
  f.actT = Math.max(0, f.actT - dt);
  if (f.flying) {
    const flap = Math.sin(f.t * (f.actT > 0 ? 40 : 20)) * 1.1;
    f.wl.rotation.z = flap; f.wr.rotation.z = -flap;
    if (f.pos.distanceTo(f.target) < 0.6) f.newTarget();
    const desire = tmpV.copy(f.target).sub(f.pos).normalize().multiplyScalar(f.actT > 0 ? 5 : 1.8);
    f.vel.lerp(desire, dt * 1.5);
    f.pos.addScaledVector(f.vel, dt);
    f.g.position.copy(f.pos); f.g.position.y += Math.sin(f.t * 6) * 0.12;
    f.g.rotation.y = Math.atan2(f.vel.x, f.vel.z);
    f.g.rotation.z = f.actT > 0 ? (1 - f.actT / 0.8) * Math.PI * 4 : 0;
    if (f.halo) f.halo.material.opacity = 0.45 + Math.sin(f.t * 4) * 0.3 + (f.actT > 0 ? 0.3 : 0);
  } else {
    const d = Math.hypot(f.target.x - f.pos.x, f.target.z - f.pos.z);
    const sliding = f.kind === 'penguin' && f.actT > 0;
    if (d < 0.15) { if (!sliding && Math.random() < dt * 0.8) f.newTarget(); }
    else {
      const sp = Math.min(d, (sliding ? 4 : f.kind === 'crab' ? 0.9 : 0.7) * dt);
      f.pos.x += ((f.target.x - f.pos.x) / d) * sp; f.pos.z += ((f.target.z - f.pos.z) / d) * sp;
    }
    const walking = d >= 0.15;
    if (f.kind === 'crab') { // il granchio guarda sempre verso di noi e cammina di lato
      const dance = f.actT > 0;
      f.inner.position.y = dance ? Math.abs(Math.sin(f.t * 12)) * 0.4 : 0;
      f.inner.rotation.z = walking || dance ? Math.sin(f.t * (dance ? 14 : 10)) * 0.15 : 0;
      f.claws.forEach((c, i) => (c.rotation.z = (i ? -1 : 1) * (dance ? 0.6 + Math.sin(f.t * 20) * 0.5 : Math.sin(f.t * 3) * 0.15)));
      f.g.rotation.y = 0;
    } else { // pinguino: dondola camminando, scivola di pancia se lo tocchi
      if (walking) f.g.rotation.y = angleLerp(f.g.rotation.y, Math.atan2(f.target.x - f.pos.x, f.target.z - f.pos.z), dt * 6);
      else f.g.rotation.y = angleLerp(f.g.rotation.y, 0, dt * 3);
      f.inner.rotation.x = lerp(f.inner.rotation.x, sliding ? 1.35 : 0, dt * 10);
      f.inner.position.y = sliding ? 0.35 : 0;
      f.inner.rotation.z = walking && !sliding ? Math.sin(f.t * 9) * 0.18 : 0;
    }
    f.g.position.set(f.pos.x, 0, f.pos.z);
  }
  f.shadow.position.set(f.pos.x, 0.03, f.pos.z);
}

// alberi: si scuotono e cade un frutto
function shakeTree(tr) {
  sfx.rustle(); buzz(20);
  const g = tr.g;
  tween(0.6, (k) => { g.rotation.z = Math.sin(k * Math.PI * 6) * 0.08 * (1 - k); });
  particles.burst(tr.pos.clone().setY(tr.pos.y + 0.5), theme.snow ? [0xffffff, 0xeaf6ff] : [0x4cc25a, 0x3fae49, 0x7fd65b], 14, 2.5, { up: 1, gravity: 4, sz: 0.8 });
  if (fruits.length >= 3) return;
  const land = clampToBounds(new THREE.Vector3(tr.pos.x * 0.6 + rand(-1, 1), 0, tr.pos.z * 0.5 + rand(-1, 1)));
  land.z = Math.min(land.z, bounds.zMin + rand(0.5, 2.5));
  const g2 = makeFruit(theme.fruit); world.add(g2);
  const from = tr.pos.clone();
  const fr = { g: g2, pos: land, ready: false, shadow: blobShadow(0.7) };
  fr.shadow.position.set(land.x, 0.03, land.z);
  fruits.push(fr);
  tween(0.8, (k) => {
    g2.position.lerpVectors(from, land, k);
    g2.position.y = lerp(from.y, 0.3, k) + Math.sin(k * Math.PI) * 1.8;
    g2.rotation.x += 0.2;
  }, () => {
    sfx.tone(300, 0.12, { slide: 200, vol: 0.2 });
    fr.ready = true; g2.rotation.set(0, 0, 0);
    leo.goTo(land); // Leo corre a mangiarlo!
  });
}
function eatFruit(fr) {
  fruits.splice(fruits.indexOf(fr), 1);
  world.remove(fr.shadow);
  sfx.chomp(); buzz([20, 60, 20]);
  leo.munch();
  const g = fr.g; const s0 = g.scale.x;
  tween(0.8, (k) => { g.position.lerp(leo.center().setY(1.3), 0.25); g.scale.setScalar(Math.max(0.01, s0 * (1 - k))); }, () => {
    world.remove(g);
    particles.burst(leo.center().setY(leo.y + 2.3), HEARTS, 12, 2, { up: 2, gravity: 1, sz: 1.1 });
  });
}

// ---------------------------------------------------------------- festa e viaggio nel mondo successivo
const rainbow = new THREE.Group();
[0xff5d73, 0xffa62b, 0xffd93d, 0x6bcb77, 0x4d96ff, 0xb46bff].forEach((c, i) => {
  rainbow.add(new THREE.Mesh(new THREE.TorusGeometry(5 - i * 0.3, 0.16, 8, 48, Math.PI), new THREE.MeshBasicMaterial({ color: c })));
});
rainbow.visible = false; scene.add(rainbow);
let rainbowT = 0;
function party() {
  partyTime = 4.5;
  hud.classList.add('party');
  sfx.fanfare(); buzz([60, 80, 60]);
  leo.happy(true);
  if (!theme.night) {
    rainbow.position.set(0, 0, bounds.zMin - 1.5);
    rainbow.visible = true; rainbowT = 0.001;
  }
}
function updateParty(dt) {
  if (rainbow.visible) {
    const rs = clamp(bounds.xHalf / 5.2, 0.8, 1.6);
    if (partyTime > 0) rainbowT = Math.min(1, rainbowT + dt / 0.9); else rainbowT = Math.max(0, rainbowT - dt / 0.5);
    rainbow.scale.setScalar(Math.max(0.01, (partyTime > 0 ? easeOutBack(rainbowT) : rainbowT) * rs));
    if (rainbowT <= 0) rainbow.visible = false;
  }
  if (partyTime <= 0) return;
  const before = partyTime;
  partyTime -= dt;
  if (Math.floor(before * 3) !== Math.floor(partyTime * 3)) {
    particles.burst(randomSpot().setY(rand(2, 4)), PALETTE, theme.night ? 60 : 40, theme.night ? 9 : 7, { up: 2, gravity: theme.night ? 2.5 : 6, lifeT: theme.night ? 1.4 : 1.1 });
    theme.night ? sfx.noise(0.3, 0.3, 700, 0, 0.5) : sfx.tone(pickOne(PENTA) * 2, 0.2, { type: 'triangle', vol: 0.08 });
  }
  if (leo.grounded && partyTime > 1) leo.happy(Math.random() < 0.4);
  if (partyTime <= 0) travel();
}
const wipe = document.getElementById('wipe');
function travel() {
  busy = true;
  const next = THEMES[(themeIndex + 1) % THEMES.length];
  wipe.style.background = next.fade;
  wipe.classList.add('on');
  sfx.whoosh();
  later(650, () => {
    themeIndex = (themeIndex + 1) % THEMES.length; theme = THEMES[themeIndex];
    hud.classList.remove('party');
    collected = 0;
    leo.pos.set(0, 0, 1); leo.moving = false;
    buildWorld(theme); setupHud();
    wipe.classList.remove('on');
    later(450, () => { busy = false; leo.wave(); sfx.giggle(); });
  });
}

// ---------------------------------------------------------------- tocco (un dito, o anche tanti)
const projV = new THREE.Vector3();
function pick(cx, cy) {
  const cands = [];
  floaters.forEach((b) => b.age > 0.3 && cands.push({ type: 'floater', ref: b, pos: b.g.position, r: 0.75 }));
  friends.forEach((f) => cands.push({ type: 'friend', ref: f, pos: f.flying ? f.g.position : tmpV.copy(f.pos).setY(0.5).clone(), r: f.flying ? 0.5 : 0.6 }));
  cands.push({ type: 'leo', ref: leo, pos: leo.center(), r: 1.0 });
  collectibles.forEach((s) => cands.push({ type: 'collect', ref: s, pos: s.g.position, r: 0.6 }));
  fruits.forEach((f) => f.ready && cands.push({ type: 'fruit', ref: f, pos: f.g.position, r: 0.45 }));
  trees.forEach((t) => cands.push({ type: 'tree', ref: t, pos: t.pos, r: t.r, weak: true }));
  let best = null, bestScore = Infinity;
  const halfV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  for (const c of cands) {
    projV.copy(c.pos).project(camera);
    if (projV.z > 1) continue;
    const sx = (projV.x * 0.5 + 0.5) * W, sy = (-projV.y * 0.5 + 0.5) * H;
    const pr = (c.r * (H / 2)) / (halfV * camera.position.distanceTo(c.pos));
    const R = c.weak ? pr : Math.max(pr * 1.2, 34);
    const d = Math.hypot(sx - cx, sy - cy);
    const score = d / R + (c.type === 'collect' ? 0.15 : 0) + (c.weak ? 0.5 : 0);
    if (d < R && score < bestScore) { best = c; bestScore = score; }
  }
  return best;
}
let started = false, lastTap = 0;
function onTap(cx, cy) {
  const now = performance.now();
  if (now - lastTap < 60 || busy) return; // il palmo intero non deve fare 10 cose insieme
  lastTap = now;
  leo.idleT = 0;
  const hit = pick(cx, cy);
  if (hit) {
    if (hit.type === 'floater') return popFloater(hit.ref);
    if (hit.type === 'friend') return tapFriend(hit.ref);
    if (hit.type === 'tree') return shakeTree(hit.ref);
    if (hit.type === 'fruit') { ripple(hit.ref.pos, 0xff8fa3); return leo.goTo(hit.ref.pos); }
    if (hit.type === 'leo') {
      sfx.boing(); sfx.giggle(); buzz(25); leo.happy(Math.random() < 0.5);
      particles.burst(leo.center().setY(leo.y + 2.2), HEARTS, 14, 2.5, { up: 2, gravity: 1, sz: 1.1 });
      return;
    }
    if (hit.type === 'collect') {
      hit.ref.wiggle = 0.6; sfx.tone(PENTA[4], 0.2, { type: 'triangle', vol: 0.15 });
      ripple(hit.ref.pos, 0xffd23f);
      return leo.goTo(hit.ref.pos);
    }
  }
  const p = screenToGround((cx / W) * 2 - 1, -(cy / H) * 2 + 1);
  if (!p) return;
  clampToBounds(p);
  ripple(p);
  sfx.plop();
  sproutAt(p);
  leo.goTo(p);
}
renderer.domElement.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (!started) return;
  sfx.init();
  onTap(e.clientX, e.clientY);
});
['contextmenu', 'gesturestart', 'dblclick'].forEach((ev) => document.addEventListener(ev, (e) => e.preventDefault()));
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

// schermata iniziale: un tocco e si parte (serve per audio e schermo intero)
let wakeLock = null;
async function keepAwake() {
  try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { /* niente */ }
}
const startEl = document.getElementById('start');
startEl.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (started) return;
  started = true;
  sfx.init();
  startEl.classList.add('hide');
  const de = document.documentElement;
  try { (de.requestFullscreen || de.webkitRequestFullscreen)?.call(de, { navigationUI: 'hide' })?.catch?.(() => {}); } catch (err) { /* niente */ }
  keepAwake();
  setTimeout(() => { leo.wave(); sfx.giggle(); }, 300);
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { keepAwake(); sfx.ctx && sfx.ctx.resume(); }
  else sfx.ctx && sfx.ctx.suspend();
});

// ---------------------------------------------------------------- avvio
layout();
window.addEventListener('resize', layout);
const startTheme = Number(new URLSearchParams(location.search).get('mondo')) || 0;
themeIndex = clamp(startTheme, 0, THEMES.length - 1); theme = THEMES[themeIndex];
buildWorld(theme); setupHud();
leo.wave();

const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;
  updateTweens(dt);
  leo.update(dt);
  const leoLow = leo.y < 1.5;
  for (const c of [...collectibles]) {
    c.t += dt;
    c.wiggle = Math.max(0, c.wiggle - dt);
    c.g.position.y = (theme.collect === 'gift' ? 0.45 : 0.75) + Math.abs(Math.sin(c.t * 2.5)) * 0.25;
    c.g.rotation.y = Math.sin(c.t * 1.5) * 0.6 + Math.sin(c.wiggle * 30) * c.wiggle;
    if (theme.collect === 'starfish') c.g.rotation.x = -0.5;
    if (c.alive && leoLow && Math.hypot(leo.pos.x - c.pos.x, leo.pos.z - c.pos.z) < 0.85) collect(c);
  }
  for (const fr of [...fruits]) {
    if (fr.ready) { fr.g.position.y = 0.3 + Math.abs(Math.sin(time * 4)) * 0.05; if (leoLow && Math.hypot(leo.pos.x - fr.pos.x, leo.pos.z - fr.pos.z) < 0.8) eatFruit(fr); }
  }
  for (const b of floaters) {
    b.t += dt; b.age += dt;
    const rise = Math.min(1, b.age / 1.6);
    b.base.x += b.vx * dt;
    if (Math.abs(b.base.x) > bounds.xHalf - 0.5) b.vx = -Math.sign(b.base.x) * Math.abs(b.vx);
    b.g.position.set(b.base.x + Math.sin(b.t * 0.8) * 0.15, lerp(-0.5, b.hoverY, easeInOut(rise)) + Math.sin(b.t * 1.7) * 0.15, b.base.z);
    b.g.rotation.z = Math.sin(b.t * 1.3) * 0.1;
    if (theme.floater === 'bubble') { const w = 1 + Math.sin(b.t * 5) * 0.04; b.g.scale.set(w, 2 - w, w); }
    b.shadow.position.set(b.g.position.x, 0.03, b.base.z);
    const sh = 1.1 - b.g.position.y * 0.12; b.shadow.scale.set(sh, 1, sh);
  }
  friends.forEach((f) => updateFriend(f, dt));
  seaWaves.forEach((w) => { w.userData.ph += dt; w.position.x += dt * 0.6; if (w.position.x > 32) w.position.x = -32; w.scale.y = 3 + Math.sin(w.userData.ph) * 2; });
  clouds.forEach((c) => { if (!c.visible) return; c.position.x += c.userData.speed * dt; if (c.position.x > skyHalfW + 6) c.position.x = -skyHalfW - 6; });
  sun.rotation.z = Math.sin(time * 0.5) * 0.08;
  moon.rotation.z = Math.sin(time * 0.4) * 0.1;
  if (skyStars.visible) skyStars.material.opacity = 0.75 + Math.sin(time * 3) * 0.25;
  updateSnow(dt, time);
  updateParty(dt);
  particles.update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// solo per test: index.html?debug
if (location.search.includes('debug')) window.__game = { get collectibles() { return collectibles; }, get trees() { return trees; }, get fruits() { return fruits; }, leo, party, travel, collect };
