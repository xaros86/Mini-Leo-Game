// Mini Leo - un giochino 3D per bimbi piccoli.
// Tocca il prato: Leo corre lì e nasce un fiore.
// Tocca i palloncini: scoppiano. Tocca Leo: salta e ride.
// Porta Leo sulle stelle: 5 stelle = festa con l'arcobaleno!
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
      const len = this.ctx.sampleRate * 0.3;
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
  noise(dur, vol, freq = 1800, delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t); s.stop(t + dur);
  },
  pop() { this.noise(0.12, 0.6, 2200); this.tone(620, 0.14, { slide: 140, vol: 0.3 }); this.tone(rand(900, 1300), 0.25, { type: 'triangle', vol: 0.12, delay: 0.05 }); },
  boing() { this.tone(220, 0.3, { type: 'triangle', slide: 660, vol: 0.3 }); },
  hop() { this.tone(rand(380, 440), 0.07, { slide: 600, vol: 0.06 }); },
  plop() { const f = pickOne(PENTA); this.tone(f, 0.35, { type: 'triangle', vol: 0.22 }); this.tone(f * 2, 0.2, { vol: 0.05 }); },
  giggle() { for (let i = 0; i < 5; i++) this.tone(700 + i * 40, 0.09, { type: 'triangle', slide: 1050 + i * 60, vol: 0.18, delay: i * 0.1 }); },
  chime() { [0, 2, 4, 7].forEach((n, i) => this.tone(PENTA[n] , 0.4, { type: 'triangle', vol: 0.2, delay: i * 0.08 })); },
  flutter() { for (let i = 0; i < 6; i++) this.tone(PENTA[(i * 3) % PENTA.length] * 1.5, 0.12, { vol: 0.1, delay: i * 0.05 }); },
  fanfare() {
    const seq = [0, 2, 4, 5, 4, 5, 7];
    seq.forEach((n, i) => { this.tone(PENTA[n], 0.35, { type: 'square', vol: 0.06, delay: i * 0.15 }); this.tone(PENTA[n], 0.4, { type: 'triangle', vol: 0.18, delay: i * 0.15 }); });
    this.tone(PENTA[7], 0.9, { type: 'triangle', vol: 0.22, delay: seq.length * 0.15 });
  },
};
const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* niente */ } };

// ---------------------------------------------------------------- scena
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
{
  const c = document.createElement('canvas'); c.width = 2; c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, '#4fb3ff'); grd.addColorStop(0.6, '#a9dcff'); grd.addColorStop(1, '#e6f7ff');
  g.fillStyle = grd; g.fillRect(0, 0, 2, 256);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  scene.background = tex;
}
scene.fog = new THREE.Fog(0xd6f0ff, 35, 80);

const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 200);
const camTarget = new THREE.Vector3(0, 0.5, -1);

scene.add(new THREE.HemisphereLight(0xffffff, 0x88cc77, 1.6));
const sunLight = new THREE.DirectionalLight(0xffffff, 1.8);
sunLight.position.set(-4, 10, 6);
scene.add(sunLight);

// materiale "cartone animato"
const gradientMap = (() => {
  const t = new THREE.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
})();
const matCache = new Map();
function toon(color, extra = {}) {
  const key = color + JSON.stringify(extra);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshToonMaterial({ color, gradientMap, ...extra }));
  return matCache.get(key);
}
const SPHERE = new THREE.SphereGeometry(1, 24, 16);
function ball(r, color, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(SPHERE, typeof color === 'number' ? toon(color) : color);
  m.scale.set(r * sx, r * sy, r * sz); m.position.set(x, y, z); return m;
}

// ombra morbida (texture radiale), molto più leggera delle shadow map
const shadowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  grd.addColorStop(0, 'rgba(0,40,0,0.45)'); grd.addColorStop(1, 'rgba(0,40,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
const shadowGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
function blobShadow(size) {
  const m = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  m.scale.set(size, 1, size); m.position.y = 0.02; m.renderOrder = 1; scene.add(m); return m;
}

// ---------------------------------------------------------------- mondo
const ground = new THREE.Mesh(new THREE.CircleGeometry(90, 48).rotateX(-Math.PI / 2), toon(0x7fd65b));
scene.add(ground);
for (let i = 0; i < 18; i++) { // chiazze d'erba più chiara
  const p = new THREE.Mesh(new THREE.CircleGeometry(rand(1, 3), 20).rotateX(-Math.PI / 2), toon(pickOne([0x95e36b, 0x6cc94e])));
  p.position.set(rand(-16, 16), 0.008 + i * 0.004, rand(-14, 8)); p.scale.z = rand(0.5, 1); scene.add(p);
}
// colline in fondo
[[-22, -34, 12, 0x5cbf4a], [0, -40, 16, 0x6fcf55], [22, -34, 13, 0x58b845], [-38, -26, 10, 0x6fcf55], [38, -26, 10, 0x6fcf55]]
  .forEach(([x, z, r, c]) => scene.add(ball(r, c, x, -r * 0.45, z, 1.4, 0.75, 1)));
// alberi
function tree(x, z, s = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 1.4, 10), toon(0xa0673a));
  trunk.position.y = 0.7; g.add(trunk);
  const leaf = pickOne([0x3fae49, 0x4cc25a, 0x36a043]);
  g.add(ball(1.0, leaf, 0, 2.0, 0), ball(0.75, leaf, 0.6, 1.6, 0.2), ball(0.7, leaf, -0.6, 1.7, 0.1), ball(0.6, leaf, 0, 2.7, 0));
  if (Math.random() < 0.6) for (let i = 0; i < 4; i++) g.add(ball(0.13, 0xff4d5e, rand(-0.8, 0.8), rand(1.5, 2.6), rand(0.6, 0.95)));
  g.position.set(x, 0, z); g.scale.setScalar(s); scene.add(g);
  const sh = blobShadow(2.6 * s); sh.position.set(x, 0.02, z);
}
[[-12, -12, 1.3], [-7, -15, 1.1], [7, -14, 1.2], [12, -11, 1.4], [-17, -6, 1.2], [17, -5, 1.3], [-3, -19, 1], [3.5, -20, 1.2], [-20, 2, 1.3], [20, 3, 1.2]]
  .forEach(([x, z, s]) => tree(x, z, s));
// sole sorridente
const sun = new THREE.Group();
sun.add(new THREE.Mesh(SPHERE, new THREE.MeshBasicMaterial({ color: 0xffe14d, fog: false })));
const rayGeo = new THREE.ConeGeometry(0.35, 0.9, 8);
for (let i = 0; i < 10; i++) {
  const r = new THREE.Mesh(rayGeo, new THREE.MeshBasicMaterial({ color: 0xffc93c, fog: false }));
  const a = (i / 10) * Math.PI * 2; r.position.set(Math.cos(a) * 1.5, Math.sin(a) * 1.5, -0.2); r.rotation.z = a - Math.PI / 2; sun.add(r);
}
const sunFace = new THREE.MeshBasicMaterial({ color: 0x8a5a00, fog: false });
[-0.35, 0.35].forEach((x) => { const e = new THREE.Mesh(SPHERE, sunFace); e.scale.set(0.12, 0.17, 0.05); e.position.set(x, 0.2, 0.98); sun.add(e); });
{ const sm = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.06, 6, 16, Math.PI), sunFace); sm.rotation.z = Math.PI; sm.position.set(0, -0.1, 0.98); sun.add(sm); }
sun.scale.setScalar(2.2);
scene.add(sun);
// nuvole
const clouds = [];
for (let i = 0; i < 6; i++) {
  const c = new THREE.Group();
  const wm = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
  [[0, 0, 1.3], [1.3, -0.2, 1], [-1.3, -0.25, 0.95], [0.5, 0.6, 0.9]].forEach(([x, y, r]) => { const b = new THREE.Mesh(SPHERE, wm); b.scale.set(r, r * 0.85, r * 0.7); b.position.set(x, y, 0); c.add(b); });
  c.position.set(rand(-35, 35), rand(9, 16), rand(-45, -30)); c.userData.speed = rand(0.4, 1); c.scale.setScalar(rand(1.2, 2.2));
  scene.add(c); clouds.push(c);
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
  // distanza scelta perché si veda sempre un prato largo almeno ~11 unità
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
  sun.position.set(camera.aspect < 1 ? -3 : -12, camera.aspect < 1 ? 15 : 11, -40);
}
const clampToBounds = (v) => { v.x = clamp(v.x, -bounds.xHalf, bounds.xHalf); v.z = clamp(v.z, bounds.zMin, bounds.zMax); return v; };
const randomSpot = (margin = 0.5) => new THREE.Vector3(rand(-bounds.xHalf + margin, bounds.xHalf - margin), 0, rand(bounds.zMin + margin, bounds.zMax - margin));

// ---------------------------------------------------------------- animazioni semplici
const tweens = [];
function tween(dur, fn, done) { tweens.push({ t: 0, dur, fn, done }); }
function updateTweens(dt) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i]; tw.t += dt;
    const k = Math.min(1, tw.t / tw.dur); tw.fn(k);
    if (k >= 1) { tweens.splice(i, 1); tw.done && tw.done(); }
  }
}

// ---------------------------------------------------------------- particelle (coriandoli, scintille, cuoricini)
const particles = (() => {
  const N = 500;
  const geo = new THREE.OctahedronGeometry(0.11, 0);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }), N);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  const pos = [], vel = [], life = new Float32Array(N), maxLife = new Float32Array(N), size = new Float32Array(N), spin = new Float32Array(N), grav = new Float32Array(N);
  const col = new THREE.Color(); const m4 = new THREE.Matrix4(); const q = new THREE.Quaternion(); const e = new THREE.Euler(); const s = new THREE.Vector3();
  for (let i = 0; i < N; i++) { pos.push(new THREE.Vector3()); vel.push(new THREE.Vector3()); mesh.setColorAt(i, col.set(0xffffff)); mesh.setMatrixAt(i, m4.makeScale(0, 0, 0)); }
  scene.add(mesh);
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
        mesh.setColorAt(i, col.set(Array.isArray(colors) ? pickOne(colors) : colors));
      }
      mesh.instanceColor.needsUpdate = true;
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
        mesh.setMatrixAt(i, m4.compose(pos[i], q, s));
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
})();

// cerchio che si allarga dove si tocca
const ringGeo = new THREE.RingGeometry(0.75, 1, 32).rotateX(-Math.PI / 2);
function ripple(at, color = 0xffffff) {
  const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false }));
  m.position.copy(at); m.position.y = 0.04; scene.add(m);
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
  // coda
  const tail = new THREE.Group(); tail.position.set(0, 0.45, -0.5);
  const tailStick = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.6, 8), toon(Y));
  tailStick.position.set(0, 0.25, -0.15); tailStick.rotation.x = -0.6; tail.add(tailStick);
  tail.add(ball(0.15, MANE, 0, 0.52, -0.33));
  body.add(tail);

  // testa
  const head = new THREE.Group(); head.position.set(0, 1.45, 0.05);
  body.add(head);
  head.add(ball(0.68, MANE, 0, 0, -0.22, 1, 1, 0.65));       // criniera dietro
  for (let i = 0; i < 14; i++) {                              // ciuffi della criniera
    const a = (i / 14) * Math.PI * 2;
    head.add(ball(0.27, i % 2 ? MANE : 0xe8731c, Math.cos(a) * 0.68, Math.sin(a) * 0.68, -0.12));
  }
  head.add(ball(0.6, Y, 0, 0, 0.05));                         // faccia
  [-1, 1].forEach((s) => {
    head.add(ball(0.17, Y, s * 0.45, 0.5, 0.05));              // orecchie
    head.add(ball(0.09, PINK, s * 0.45, 0.5, 0.17, 1, 1, 0.5));
    head.add(ball(0.1, PINK, s * 0.36, -0.14, 0.5, 1, 0.6, 0.4)); // guanciotte
  });
  const eyes = [];
  [-1, 1].forEach((s) => {
    const eye = new THREE.Group(); eye.position.set(s * 0.21, 0.1, 0.52);
    eye.add(ball(0.16, 0xffffff, 0, 0, 0, 1, 1.15, 0.6));
    eye.add(ball(0.1, DARK, 0, -0.01, 0.07, 1, 1.1, 0.6));
    eye.add(ball(0.035, 0xffffff, 0.035, 0.04, 0.13));
    head.add(eye); eyes.push(eye);
  });
  head.add(ball(0.24, CREAM, 0, -0.18, 0.5, 1.2, 0.8, 0.65)); // muso
  head.add(ball(0.085, DARK, 0, -0.08, 0.66, 1.3, 0.9, 0.8));  // nasino
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.022, 6, 14, Math.PI), toon(DARK));
  mouth.rotation.z = Math.PI; mouth.position.set(0, -0.21, 0.66); head.add(mouth);
  const mouthOpen = ball(0.08, 0xc0394b, 0, -0.25, 0.64, 1.1, 0.9, 0.5); mouthOpen.visible = false; head.add(mouthOpen);

  scene.add(root);
  const shadow = blobShadow(1.6);

  const st = {
    root, pos: new THREE.Vector3(0, 0, 1), target: new THREE.Vector3(0, 0, 1), moving: false,
    y: 0, vy: 0, grounded: true, squash: 0, squashV: 0, yaw: 0, spin: 0, spinV: 0,
    blinkT: 2, happyT: 0, idleT: 0, waveT: 0, t: 0, lastHop: 0,
  };
  st.goTo = (p) => { st.target.copy(p); clampToBounds(st.target); st.moving = true; st.idleT = 0; };
  st.jump = (v = 7) => { if (st.grounded) { st.vy = v; st.grounded = false; st.squash = 0.25; } };
  st.happy = (big = false) => {
    st.happyT = big ? 1.6 : 0.9;
    st.jump(big ? 9 : 7.5);
    st.spinV = big ? 16 : 0; st.idleT = 0;
  };
  st.wave = () => { st.waveT = 1.6; st.idleT = 0; };
  st.update = (dt) => {
    st.t += dt; st.idleT += dt;
    // camminata
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
    // fa sempre un po' l'occhiolino alla telecamera quando è fermo
    st.yaw = angleLerp(st.yaw, st.moving ? wantYaw : 0, Math.min(1, dt * (st.moving ? 10 : 4)));
    // salto / gravità
    if (!st.grounded) {
      st.vy -= 22 * dt; st.y += st.vy * dt;
      if (st.y <= 0) { st.y = 0; st.grounded = true; st.squash = -0.28 * Math.min(1, Math.abs(st.vy) / 6); st.vy = 0; if (st.moving) sfx.hop(); }
    }
    // molla per schiacciamento
    st.squashV += (-st.squash * 160 - st.squashV * 12) * dt; st.squash += st.squashV * dt;
    const sq = clamp(st.squash, -0.4, 0.4);
    body.scale.set(1 - sq * 0.5, 1 + sq, 1 - sq * 0.5);
    // giravolta
    if (st.spinV > 0) { st.spin += st.spinV * dt; if (st.spin >= Math.PI * 2) { st.spin = 0; st.spinV = 0; } }
    root.position.set(st.pos.x, st.y, st.pos.z);
    root.rotation.y = st.yaw + st.spin;
    // testa che dondola, coda che scodinzola
    head.rotation.z = Math.sin(st.t * 2.2) * 0.07;
    head.rotation.x = st.moving ? 0.1 : Math.sin(st.t * 1.3) * 0.04;
    tail.rotation.z = Math.sin(st.t * (st.moving ? 14 : 4)) * 0.5;
    // piedini
    const w = st.moving ? Math.sin(st.t * 18) * 0.12 : 0;
    footL.position.z = 0.12 + w; footR.position.z = 0.12 - w;
    // braccia
    st.happyT = Math.max(0, st.happyT - dt); st.waveT = Math.max(0, st.waveT - dt);
    if (st.happyT > 0) { armL.rotation.z = -2.4 + Math.sin(st.t * 20) * 0.3; armR.rotation.z = 2.4 - Math.sin(st.t * 20) * 0.3; }
    else if (st.waveT > 0) { armL.rotation.z = lerp(armL.rotation.z, 0.2, 0.2); armR.rotation.z = 2.5 + Math.sin(st.t * 12) * 0.45; }
    else {
      const sw = st.moving ? Math.sin(st.t * 18) * 0.5 : Math.sin(st.t * 2) * 0.08;
      armL.rotation.z = lerp(armL.rotation.z, -0.15, 0.2); armR.rotation.z = lerp(armR.rotation.z, 0.15, 0.2);
      armL.rotation.x = sw; armR.rotation.x = -sw;
    }
    mouth.visible = !(st.happyT > 0 || st.waveT > 0); mouthOpen.visible = !mouth.visible;
    // occhi che sbattono
    st.blinkT -= dt;
    const blink = st.blinkT < 0.12 && st.blinkT > 0 ? 0.1 : 1;
    if (st.blinkT <= 0) st.blinkT = rand(2, 4.5);
    eyes.forEach((e) => (e.scale.y = st.happyT > 0 ? 0.55 : blink));
    // ombra
    shadow.position.set(st.pos.x, 0.02, st.pos.z);
    const ss = 1.6 * (1 - Math.min(0.5, st.y * 0.15)); shadow.scale.set(ss, 1, ss);
    // se nessuno gioca per un po', Leo saluta
    if (st.idleT > 9 && !st.moving) { st.wave(); sfx.giggle(); }
  };
  st.center = () => new THREE.Vector3(st.pos.x, st.y + 1.1, st.pos.z);
  return st;
})();

// ---------------------------------------------------------------- stelle da raccogliere
const starShape = (() => {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.22 : 0.5, a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  s.closePath(); return s;
})();
const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 2 });
starGeo.center();
const starMat = toon(0xffd23f, { emissive: 0x664400 });
const stars = [];
function spawnStar() {
  let p;
  for (let tries = 0; tries < 30; tries++) {
    p = randomSpot(0.8);
    if (p.distanceTo(leo.pos) > 2.2 && stars.every((s) => s.pos.distanceTo(p) > 1.8)) break;
  }
  const g = new THREE.Group();
  const m = new THREE.Mesh(starGeo, starMat); g.add(m);
  [-0.1, 0.1].forEach((x) => g.add(ball(0.045, 0x3b2a20, x, 0.04, 0.15, 1, 1.4, 0.6)));
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 4, 10, Math.PI), toon(0x3b2a20));
  smile.rotation.z = Math.PI; smile.position.set(0, -0.05, 0.15); g.add(smile);
  g.position.copy(p); g.scale.setScalar(0.01); scene.add(g);
  const star = { g, pos: p, t: rand(0, 6), alive: true, shadow: blobShadow(0.9), wiggle: 0 };
  star.shadow.position.set(p.x, 0.02, p.z);
  tween(0.6, (k) => g.scale.setScalar(Math.max(0.01, easeOutBack(k)) * 1.25));
  stars.push(star);
}
const hud = document.getElementById('hud');
const STAR_SVG = '<svg viewBox="0 0 50 50"><path d="M25 3l6.5 14 15 1.6-11.3 10 3.3 15L25 36l-13.5 7.6 3.3-15L3.5 18.6l15-1.6z"/></svg>';
const GOAL = 5;
hud.innerHTML = STAR_SVG.repeat(GOAL);
let collected = 0, partyTime = 0;
const tmpV = new THREE.Vector3();
function collectStar(star) {
  star.alive = false;
  stars.splice(stars.indexOf(star), 1);
  scene.remove(star.shadow);
  sfx.chime(); buzz(30);
  particles.burst(star.pos.clone().setY(0.8), [0xffd23f, 0xfff3a0, 0xffffff], 26, 4);
  leo.happy();
  setTimeout(spawnStar, 1200);
  if (collected >= GOAL) { // casella piena (festa in corso): la stella vola via e basta
    const s0 = star.g.scale.x;
    tween(0.5, (k) => { star.g.position.y += 0.15; star.g.scale.setScalar(Math.max(0.01, s0 * (1 - k))); }, () => scene.remove(star.g));
    return;
  }
  // la stella vola verso la sua casella in alto
  const slot = hud.children[collected].getBoundingClientRect();
  const nx = ((slot.left + slot.width / 2) / W) * 2 - 1, ny = -((slot.top + slot.height / 2) / H) * 2 + 1;
  ndc.set(nx, ny); raycaster.setFromCamera(ndc, camera);
  const dest = raycaster.ray.at(4, new THREE.Vector3());
  const from = star.g.position.clone();
  const idx = collected;
  collected++;
  tween(0.7, (k) => {
    const e = easeInOut(k);
    star.g.position.lerpVectors(from, dest, e); star.g.position.y += Math.sin(k * Math.PI) * 1.5;
    star.g.rotation.y += 0.4; star.g.scale.setScalar(1.25 * (1 - k * 0.6));
  }, () => {
    scene.remove(star.g);
    hud.children[idx].classList.add('on');
    sfx.tone(PENTA[idx + 2], 0.3, { type: 'triangle', vol: 0.2 });
    if (idx === GOAL - 1) party();
  });
}

// ---------------------------------------------------------------- palloncini
const balloonGeo = new THREE.SphereGeometry(0.55, 24, 18);
const knotGeo = new THREE.ConeGeometry(0.1, 0.16, 8);
const balloons = [];
function spawnBalloon() {
  const color = pickOne(PALETTE);
  const g = new THREE.Group();
  const b = new THREE.Mesh(balloonGeo, toon(color, { emissive: new THREE.Color(color).multiplyScalar(0.18).getHex() }));
  b.scale.set(1, 1.18, 1); g.add(b);
  g.add(ball(0.12, 0xffffff, -0.2, 0.28, 0.42, 0.8, 1.2, 0.5));
  const knot = new THREE.Mesh(knotGeo, toon(color)); knot.position.y = -0.68; g.add(knot);
  const pts = []; for (let i = 0; i < 8; i++) pts.push(new THREE.Vector3(Math.sin(i * 1.3) * 0.06, -0.75 - i * 0.14, 0));
  g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xffffff })));
  // posizione: deve restare sotto le stelline in alto
  let p, hoverY;
  for (let tries = 0; tries < 20; tries++) {
    p = randomSpot(0.8); p.z = Math.min(p.z, bounds.zMax - 1.5);
    hoverY = rand(2.2, 3.4);
    tmpV.set(p.x, hoverY + 0.8, p.z).project(camera);
    if (tmpV.y < 0.62 && balloons.every((o) => Math.hypot(o.base.x - p.x, o.base.z - p.z) > 1.6)) break;
  }
  g.position.set(p.x, -0.5, p.z);
  scene.add(g);
  const bl = { g, color, base: p, hoverY, t: rand(0, 6), vx: rand(-0.3, 0.3), age: 0, alive: true, shadow: blobShadow(1) };
  balloons.push(bl);
}
function popBalloon(bl) {
  bl.alive = false;
  balloons.splice(balloons.indexOf(bl), 1);
  scene.remove(bl.g); scene.remove(bl.shadow);
  sfx.pop(); buzz(40);
  particles.burst(bl.g.position, [bl.color, bl.color, 0xffffff, pickOne(PALETTE)], 45, 6, { up: 1, gravity: 5, sz: 1.2 });
  leo.happy();
  setTimeout(spawnBalloon, rand(1200, 2600));
}

// ---------------------------------------------------------------- farfalle
const wingGeo = new THREE.CircleGeometry(0.3, 16); wingGeo.translate(0.28, 0.05, 0);
const butterflies = [];
function makeButterfly() {
  const color = pickOne([0xff7bd5, 0x4d96ff, 0xffa62b, 0xb46bff]);
  const g = new THREE.Group();
  const bodyM = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.32, 4, 8), toon(0x4a3355)); bodyM.rotation.x = Math.PI / 2; g.add(bodyM);
  const wm = toon(color, { side: THREE.DoubleSide, emissive: new THREE.Color(color).multiplyScalar(0.2).getHex() });
  const wl = new THREE.Group(), wr = new THREE.Group();
  const w1 = new THREE.Mesh(wingGeo, wm); w1.rotation.x = -Math.PI / 2; wr.add(w1);
  const w2 = new THREE.Mesh(wingGeo, wm); w2.rotation.x = -Math.PI / 2; w2.scale.x = -1; wl.add(w2);
  g.add(wl, wr);
  [-1, 1].forEach((s) => g.add(ball(0.05, 0x4a3355, s * 0.05, 0.08, 0.22)));
  scene.add(g);
  const bf = { g, wl, wr, color, pos: randomSpot().setY(2), vel: new THREE.Vector3(), target: randomSpot().setY(2), t: rand(0, 5), loopT: 0, shadow: blobShadow(0.6) };
  bf.newTarget = () => { bf.target.copy(randomSpot(0.5)); bf.target.y = rand(1.4, 2.8); };
  butterflies.push(bf);
  return bf;
}
function updateButterfly(bf, dt) {
  bf.t += dt;
  const flap = Math.sin(bf.t * (bf.loopT > 0 ? 40 : 20)) * 1.1;
  bf.wl.rotation.z = flap; bf.wr.rotation.z = -flap;
  if (bf.pos.distanceTo(bf.target) < 0.6) bf.newTarget();
  const desire = tmpV.copy(bf.target).sub(bf.pos).normalize().multiplyScalar(bf.loopT > 0 ? 5 : 1.8);
  bf.vel.lerp(desire, dt * 1.5);
  bf.pos.addScaledVector(bf.vel, dt);
  bf.g.position.copy(bf.pos); bf.g.position.y += Math.sin(bf.t * 6) * 0.12;
  bf.g.rotation.y = Math.atan2(bf.vel.x, bf.vel.z);
  if (bf.loopT > 0) { bf.loopT -= dt; bf.g.rotation.z = (1 - bf.loopT / 0.8) * Math.PI * 4; } else bf.g.rotation.z = 0;
  bf.shadow.position.set(bf.pos.x, 0.02, bf.pos.z);
}
function tapButterfly(bf) {
  if (bf.loopT > 0) return;
  bf.loopT = 0.8; bf.newTarget();
  sfx.flutter(); buzz(20);
  particles.burst(bf.g.position, [bf.color, 0xffffff, 0xfff3a0], 20, 3, { up: 1, gravity: 2 });
}

// ---------------------------------------------------------------- fiori che nascono al tocco
const flowers = [];
const stemGeo = new THREE.CylinderGeometry(0.035, 0.045, 0.45, 6); stemGeo.translate(0, 0.225, 0);
function sproutFlower(at) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(stemGeo, toon(0x3d9e3a)));
  const leaf = ball(0.1, 0x4cb847, 0.1, 0.12, 0, 1.4, 0.5, 0.7); leaf.rotation.z = 0.5; g.add(leaf);
  const headG = new THREE.Group(); headG.position.y = 0.5; headG.rotation.x = -0.6; g.add(headG);
  const petal = pickOne(PALETTE);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; headG.add(ball(0.13, petal, Math.cos(a) * 0.16, Math.sin(a) * 0.16, 0, 1, 1, 0.45)); }
  headG.add(ball(0.1, petal === 0xffd93d ? 0xff7a3d : 0xffe45c, 0, 0, 0.04, 1, 1, 0.6));
  g.position.set(at.x, 0, at.z); g.rotation.y = rand(-0.4, 0.4);
  g.scale.setScalar(0.01); scene.add(g);
  const s = rand(1.1, 1.5);
  tween(0.55, (k) => g.scale.setScalar(Math.max(0.01, easeOutBack(k) * s)));
  flowers.push(g);
  if (flowers.length > 30) {
    const old = flowers.shift(); const s0 = old.scale.x;
    tween(0.4, (k) => old.scale.setScalar(Math.max(0.001, s0 * (1 - k))), () => scene.remove(old));
  }
  particles.burst(at.clone().setY(0.3), [petal, 0xffffff], 8, 2, { up: 2, gravity: 8, sz: 0.6, lifeT: 0.6 });
}

// ---------------------------------------------------------------- festa: 5 stelle!
const rainbow = new THREE.Group();
[0xff5d73, 0xffa62b, 0xffd93d, 0x6bcb77, 0x4d96ff, 0xb46bff].forEach((c, i) => {
  const t = new THREE.Mesh(new THREE.TorusGeometry(5 - i * 0.3, 0.16, 8, 48, Math.PI), new THREE.MeshBasicMaterial({ color: c }));
  rainbow.add(t);
});
rainbow.visible = false; scene.add(rainbow);
function party() {
  partyTime = 4.5;
  hud.classList.add('party');
  sfx.fanfare(); buzz([60, 80, 60]);
  leo.happy(true);
  rainbow.position.set(0, 0, bounds.zMin - 1.5);
  rainbow.scale.setScalar(0.01); rainbow.visible = true;
  const rs = clamp(bounds.xHalf / 5.2, 0.8, 1.6);
  tween(0.9, (k) => rainbow.scale.setScalar(Math.max(0.01, easeOutBack(k) * rs)));
}
function updateParty(dt) {
  if (partyTime <= 0) return;
  const before = partyTime;
  partyTime -= dt;
  if (Math.floor(before * 3) !== Math.floor(partyTime * 3)) {
    particles.burst(randomSpot().setY(rand(2, 4)), PALETTE, 40, 7, { up: 2, gravity: 6 });
    sfx.tone(pickOne(PENTA) * 2, 0.2, { type: 'triangle', vol: 0.08 });
  }
  if (leo.grounded && partyTime > 1) leo.happy(Math.random() < 0.4);
  if (partyTime <= 0) {
    hud.classList.remove('party');
    [...hud.children].forEach((c) => c.classList.remove('on'));
    collected = 0;
    const s0 = rainbow.scale.x;
    tween(0.6, (k) => rainbow.scale.setScalar(Math.max(0.01, s0 * (1 - k))), () => (rainbow.visible = false));
  }
}

// ---------------------------------------------------------------- tocco (un dito, o anche tanti)
const projV = new THREE.Vector3();
function pick(cx, cy) {
  const cands = [];
  balloons.forEach((b) => b.age > 0.3 && cands.push({ type: 'balloon', ref: b, pos: b.g.position, r: 0.75 }));
  butterflies.forEach((b) => cands.push({ type: 'butterfly', ref: b, pos: b.g.position, r: 0.5 }));
  cands.push({ type: 'leo', ref: leo, pos: leo.center(), r: 1.0 });
  stars.forEach((s) => cands.push({ type: 'star', ref: s, pos: s.g.position, r: 0.6 }));
  let best = null, bestScore = Infinity;
  const halfV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  for (const c of cands) {
    projV.copy(c.pos).project(camera);
    if (projV.z > 1) continue;
    const sx = (projV.x * 0.5 + 0.5) * W, sy = (-projV.y * 0.5 + 0.5) * H;
    const pr = (c.r * (H / 2)) / (halfV * camera.position.distanceTo(c.pos));
    const R = Math.max(pr * 1.2, 34);
    const d = Math.hypot(sx - cx, sy - cy);
    const score = d / R + (c.type === 'star' ? 0.15 : 0); // a parità, meglio palloncini & co.
    if (d < R && score < bestScore) { best = c; bestScore = score; }
  }
  return best;
}
let started = false, lastTap = 0;
function onTap(cx, cy) {
  const now = performance.now();
  if (now - lastTap < 60) return; // il palmo intero non deve fare 10 cose insieme
  lastTap = now;
  leo.idleT = 0;
  const hit = pick(cx, cy);
  if (hit) {
    if (hit.type === 'balloon') return popBalloon(hit.ref);
    if (hit.type === 'butterfly') return tapButterfly(hit.ref);
    if (hit.type === 'leo') {
      sfx.boing(); sfx.giggle(); buzz(25); leo.happy(Math.random() < 0.5);
      particles.burst(leo.center().setY(leo.y + 2.2), [0xff5d73, 0xff8fa3, 0xffffff], 14, 2.5, { up: 2, gravity: 1, sz: 1.1 });
      return;
    }
    if (hit.type === 'star') {
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
  sproutFlower(p);
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
for (let i = 0; i < 3; i++) spawnStar();
const nBalloons = W > H ? 4 : 3;
for (let i = 0; i < nBalloons; i++) spawnBalloon();
makeButterfly(); makeButterfly();
leo.wave();

const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;
  updateTweens(dt);
  leo.update(dt);
  // stelle: girano e saltellano; se Leo le tocca, le raccoglie
  for (const s of [...stars]) {
    s.t += dt;
    s.wiggle = Math.max(0, s.wiggle - dt);
    s.g.position.y = 0.75 + Math.abs(Math.sin(s.t * 2.5)) * 0.25;
    s.g.rotation.y = Math.sin(s.t * 1.5) * 0.6 + Math.sin(s.wiggle * 30) * s.wiggle;
    if (s.alive && Math.hypot(leo.pos.x - s.pos.x, leo.pos.z - s.pos.z) < 0.85 && leo.y < 1.5) collectStar(s);
  }
  // palloncini: salgono dal prato e poi galleggiano
  for (const b of balloons) {
    b.t += dt; b.age += dt;
    const rise = Math.min(1, b.age / 1.6);
    b.base.x += b.vx * dt;
    if (Math.abs(b.base.x) > bounds.xHalf - 0.5) b.vx = -Math.sign(b.base.x) * Math.abs(b.vx);
    b.g.position.set(b.base.x + Math.sin(b.t * 0.8) * 0.15, lerp(-0.5, b.hoverY, easeInOut(rise)) + Math.sin(b.t * 1.7) * 0.15, b.base.z);
    b.g.rotation.z = Math.sin(b.t * 1.3) * 0.1;
    b.shadow.position.set(b.g.position.x, 0.02, b.base.z);
    const sh = 1.1 - b.g.position.y * 0.12; b.shadow.scale.set(sh, 1, sh);
  }
  butterflies.forEach((bf) => updateButterfly(bf, dt));
  clouds.forEach((c) => { c.position.x += c.userData.speed * dt; if (c.position.x > 45) c.position.x = -45; });
  sun.rotation.z = Math.sin(time * 0.5) * 0.08;
  updateParty(dt);
  particles.update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// solo per test: index.html?debug
if (location.search.includes('debug')) window.__game = { stars, collectStar, leo, party };
