// Palcoscenico comune ai minigiochi: cielo, prato, colline, luci e telecamera che si adatta allo schermo.
import * as THREE from '../vendor/three.module.min.js';
import { gradientMap, ball, mesh } from './toon.js';
import { rand, pickOne } from './utils.js';

export function skyTexture(stops) {
  const c = document.createElement('canvas'); c.width = 2; c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 256);
  stops.forEach((s, i) => grd.addColorStop(i / (stops.length - 1), s));
  g.fillStyle = grd; g.fillRect(0, 0, 2, 256);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}
const PATCH = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);

export function createStage() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xd6f0ff, 35, 80);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 200);
  scene.add(camera);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x88cc77, 1.6); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.8); sun.position.set(-4, 10, 6); scene.add(sun);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(90, 48).rotateX(-Math.PI / 2), new THREE.MeshToonMaterial({ color: 0x7fd65b, gradientMap }));
  scene.add(ground);
  let decor = new THREE.Group(); scene.add(decor);
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), ndc = new THREE.Vector2(), tmp = new THREE.Vector3();

  const st = { scene, camera, bounds: { xHalf: 5, zMin: -4, zMax: 4 }, W: 1, H: 1, decor };
  // colori del mondo: usa gli stessi temi del prato (sky, fog, ground, patches, hills, light)
  st.setTheme = (th) => {
    if (scene.background) scene.background.dispose();
    scene.background = skyTexture(th.sky);
    scene.fog.color.set(th.fog[0]); scene.fog.near = th.fog[1]; scene.fog.far = th.fog[2];
    hemi.color.set(th.light[0]); hemi.groundColor.set(th.light[1]); hemi.intensity = th.light[2]; sun.intensity = th.light[3];
    ground.material.color.set(th.ground);
    scene.remove(decor); decor = st.decor = new THREE.Group(); scene.add(decor);
    for (let i = 0; i < 9; i++) decor.add(mesh(PATCH, pickOne(th.patches), rand(-15, 15), 0.004 + i * 0.002, rand(-14, 8), rand(1, 3), 1, rand(1, 2.5)));
    if (th.hills) [[-22, -34, 12], [0, -40, 16], [22, -34, 13], [-38, -26, 10], [38, -26, 10]]
      .forEach(([x, z, r], i) => decor.add(ball(r, th.hills[i % 3], x, -r * 0.45, z, 1.4, 0.75, 1)));
    return decor;
  };
  st.toGround = (px, py, out = new THREE.Vector3()) => {
    ndc.set((px / st.W) * 2 - 1, -(py / st.H) * 2 + 1); ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(plane, out);
  };
  st.toScreen = (v) => { tmp.copy(v).project(camera); return [(tmp.x * 0.5 + 0.5) * st.W, (-tmp.y * 0.5 + 0.5) * st.H]; };
  // telecamera: inquadra sempre un prato largo almeno `width`*2 unità, in verticale e in orizzontale
  st.layout = ({ tilt = 0.5, width = 5, target = new THREE.Vector3(0, 0.5, -1), base = 15 } = {}) => {
    st.W = window.innerWidth; st.H = window.innerHeight;
    camera.aspect = st.W / st.H;
    const halfV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const k = Math.max(1, width / (halfV * base * camera.aspect));
    camera.position.copy(target).addScaledVector(new THREE.Vector3(0, tilt, 0.8).normalize(), base * k);
    camera.lookAt(target); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    const bl = st.toGround(0, st.H), top = st.toGround(0, st.H * 0.3) || new THREE.Vector3(0, 0, -9);
    st.bounds.zMax = bl.z - 0.9;
    st.bounds.xHalf = Math.min(Math.abs(bl.x) - 0.8, 9);
    st.bounds.zMin = Math.max(top.z + 0.5, st.bounds.zMax - 12, -9);
  };
  // inquadratura per i giochi "da tavolo": il bordo basso dello schermo mostra un prato largo esattamente w,
  // la profondità si adatta allo schermo (in alto resta spazio per i bottoni). Riempie sempre tutto lo schermo.
  st.fit = ({ w, tilt = 1.1, top = 0.78, tall = 1.8, maxD = 12 }) => {
    st.W = window.innerWidth; st.H = window.innerHeight;
    camera.aspect = st.W / st.H; camera.updateProjectionMatrix();
    const dir = new THREE.Vector3(0, tilt, 0.8).normalize(), origin = new THREE.Vector3();
    const place = (dist) => { camera.position.copy(origin).addScaledVector(dir, dist); camera.lookAt(origin); camera.updateMatrixWorld(); };
    const groundAt = (nx, ny) => { ndc.set(nx, ny); ray.setFromCamera(ndc, camera); return ray.ray.intersectPlane(plane, new THREE.Vector3()); };
    let lo = 1, hi = 200;
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; place(mid); const g = groundAt(0.96, -0.97); if (g && g.x >= w / 2) hi = mid; else lo = mid; }
    place(hi);
    const zMax = groundAt(0, -0.9).z;
    let zl = zMax - 40, zh = zMax; // il punto più lontano dove un oggetto alto `tall` resta sotto i bottoni
    for (let i = 0; i < 40; i++) { const zm = (zl + zh) / 2; tmp.set(0, tall, zm).project(camera); if (tmp.y > top) zl = zm; else zh = zm; }
    st.bounds.xHalf = w / 2; st.bounds.zMax = zMax; st.bounds.zMin = Math.max(zh, zMax - maxD);
  };
  return st;
}
