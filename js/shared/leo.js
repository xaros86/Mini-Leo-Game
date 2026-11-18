// LEO, il leoncino: modello e animazioni, riutilizzabile in tutti i minigiochi.
//
//   const leo = createLeo({ parent: scene });
//   leo.goTo(punto)   corre saltellando fino al punto (sul terreno, y = 0)
//   leo.happy(big)    salta contento (big: giravolta)
//   leo.wave()        saluta con la manina      leo.munch()  mangia
//   leo.dizzy()       gli gira la testa          leo.jump(v)  salto
//   leo.outfit(id)    accessori: 'neve' berretto, 'mare' occhiali, 'spazio' casco, 'fondale' maschera
//   leo.update(dt)    da chiamare a ogni fotogramma
//   leo.onStep        (facoltativo) chiamata a ogni passo, per le impronte
import * as THREE from '../vendor/three.module.min.js';
import { rand, clamp, lerp, angleLerp } from './utils.js';
import { toon, glow, SPHERE, CYL, BOX, mesh, ball, smile, blobShadow, SHY } from './toon.js';

export function createLeo({ parent, gravity = () => 22, jumpFactor = () => 1, clampTarget = (v) => v } = {}) {
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
  const helmet = new THREE.Group(); // casco da astronauta
  helmet.add(mesh(SPHERE, glow(0xcfefff, { transparent: true, opacity: 0.22, depthWrite: false }), 0, 0.05, 0.05, 1.08, 1.08, 1.08));
  helmet.add(mesh(CYL, 0xdde3ee, 0, -0.78, 0.05, 0.62, 0.14, 0.62), ball(0.07, glow(0xff5d73), 0.5, 0.8, 0.1));
  helmet.visible = false; head.add(helmet);
  const mask = new THREE.Group(); // maschera da sub
  mask.add(mesh(CYL, 0x333344, 0, 0.12, 0.05, 0.64, 0.1, 0.64), mesh(BOX, glow(0x9be7ff, { transparent: true, opacity: 0.55 }), 0, 0.1, 0.6, 0.64, 0.32, 0.12));
  mask.add(mesh(CYL, 0xff8a2a, 0.55, 0.35, 0.25, 0.05, 0.8, 0.05));
  mask.visible = false; head.add(mask);
  const dizzyStars = new THREE.Group(); dizzyStars.position.y = 0.95; // stelline del capogiro
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; dizzyStars.add(ball(0.09, glow(0xffe14d), Math.cos(a) * 0.55, 0, Math.sin(a) * 0.55)); }
  dizzyStars.visible = false; head.add(dizzyStars);

  parent.add(root);
  const shadow = blobShadow(1.6, parent);

  const st = {
    root, pos: new THREE.Vector3(0, 0, 1), target: new THREE.Vector3(0, 0, 1), moving: false,
    y: 0, vy: 0, grounded: true, squash: 0, squashV: 0, yaw: 0, spin: 0, spinV: 0,
    blinkT: 2, happyT: 0, idleT: 0, waveT: 0, munchT: 0, dizzyT: 0, t: 0, lastHop: 0, taps: [],
  };
  st.goTo = (p) => { st.target.copy(p); clampTarget(st.target); st.moving = true; st.idleT = 0; };
  st.jump = (v = 7) => { if (st.grounded) { st.vy = v * jumpFactor(); st.grounded = false; st.squash = 0.25; } };
  st.happy = (big = false) => { st.happyT = big ? 1.6 : 0.9; st.jump(big ? 9 : 7.5); st.spinV = big ? 16 : 0; st.idleT = 0; };
  st.wave = () => { st.waveT = 1.6; st.idleT = 0; };
  st.munch = () => { st.munchT = 1.0; st.idleT = 0; };
  st.outfit = (id) => { hat.visible = id === 'neve'; shades.visible = id === 'mare'; helmet.visible = id === 'spazio'; mask.visible = id === 'fondale'; };
  st.dizzy = () => { st.dizzyT = 2.6; st.idleT = 0; };
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
        if (st.grounded && st.t - st.lastHop > 0.05) { st.vy = 3.6 * jumpFactor(); st.grounded = false; st.lastHop = st.t; }
      }
    }
    st.yaw = angleLerp(st.yaw, st.moving ? wantYaw : 0, Math.min(1, dt * (st.moving ? 10 : 4)));
    if (!st.grounded) {
      st.vy -= gravity() * dt; st.y += st.vy * dt;
      if (st.y <= 0) { st.y = 0; st.grounded = true; st.squash = -0.28 * Math.min(1, Math.abs(st.vy) / 6); st.vy = 0; if (st.moving) { st.onStep && st.onStep(); } }
    }
    st.squashV += (-st.squash * 160 - st.squashV * 12) * dt; st.squash += st.squashV * dt;
    const sq = clamp(st.squash, -0.4, 0.4);
    body.scale.set(1 - sq * 0.5, 1 + sq, 1 - sq * 0.5);
    if (st.spinV > 0) { st.spin += st.spinV * dt; if (st.spin >= Math.PI * 2) { st.spin = 0; st.spinV = 0; } }
    root.position.set(st.pos.x, st.y, st.pos.z);
    root.rotation.y = st.yaw + st.spin;
    st.dizzyT = Math.max(0, st.dizzyT - dt);
    dizzyStars.visible = st.dizzyT > 0; dizzyStars.rotation.y += dt * 6;
    root.rotation.z = st.dizzyT > 0 ? Math.sin(st.t * 7) * 0.22 : 0;
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
    eyes.forEach((e) => (e.scale.y = st.dizzyT > 0 ? 0.3 : st.happyT > 0 || st.munchT > 0 ? 0.55 : blink));
    shadow.position.set(st.pos.x, SHY, st.pos.z);
    const ss = 1.6 * (1 - Math.min(0.5, st.y * 0.15)); shadow.scale.set(ss, 1, ss);
    if (st.idleT > 9 && !st.moving && st.dizzyT <= 0) { st.wave(); }
  };
  st.center = () => new THREE.Vector3(st.pos.x, st.y + 1.1, st.pos.z);
  return st;
}
