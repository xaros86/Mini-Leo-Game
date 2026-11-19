// Mini Leo - menù principale: sceglie il minigioco e gestisce schermo, audio e tocchi.
// Ogni minigioco è un modulo che esporta `game` con: init(renderer), resize(), enter(), exit(), frame(dt, time)
// e per i tocchi tap(x, y) oppure down/move/up(x, y, id) per trascinare.
import * as THREE from './vendor/three.module.min.js';
import { buzz } from './shared/utils.js';
import { sfx, music, N } from './shared/audio.js';
import { game as prato } from './games/prato.js';
import { game as ombre } from './games/ombre.js';
import { game as amici } from './games/amici.js';
import { game as trenino } from './games/trenino.js';
import { game as cucu } from './games/cucu.js';
import { game as bagnetto } from './games/bagnetto.js';

const GAMES = [prato, ombre, amici, trenino, cucu, bagnetto]; // uno per bottone del menù (null = in arrivo)

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.prepend(renderer.domElement);

let current = prato;     // il gioco che si vede (anche dietro al menù, come sfondo animato)
let playing = false;     // true = si sta giocando, false = menù aperto
current.init(renderer); current.ready = true;

const menu = document.getElementById('menu');
const home = document.getElementById('home');
const hud = document.getElementById('hud');
hud.style.display = 'none';

// ---- schermo intero e schermo sempre acceso
async function keepAwake() {
  try { if ('wakeLock' in navigator) await navigator.wakeLock.request('screen'); } catch (e) { /* niente */ }
}
function goFullscreen() {
  const de = document.documentElement;
  try { (de.requestFullscreen || de.webkitRequestFullscreen)?.call(de, { navigationUI: 'hide' })?.catch?.(() => {}); } catch (e) { /* niente */ }
}

// ---- menù: tre bottoni grandi
function startGame(i) {
  const g = GAMES[i];
  const btn = menu.querySelectorAll('.game')[i];
  sfx.init();
  if (!g) { // non ancora pronto: il bottone fa solo "no no" con dolcezza
    btn.classList.remove('nope'); void btn.offsetWidth; btn.classList.add('nope');
    sfx.note(N(12), { vol: 0.05, dur: 0.3 }); sfx.note(N(7), { vol: 0.05, dur: 0.4, delay: 0.15 });
    return;
  }
  btn.classList.add('go');
  sfx.arp([N(12), N(16), N(19), N(24)], 0.07, { vol: 0.07, dur: 0.6 });
  goFullscreen(); keepAwake();
  setTimeout(() => {
    btn.classList.remove('go');
    if (current !== g) { current.exit(); current = g; if (!g.ready) { g.init(renderer); g.ready = true; } else g.resize(); }
    playing = true;
    menu.classList.add('hide'); home.classList.add('show');
    current.enter();
    music.start();
  }, 350);
}
menu.querySelectorAll('.game').forEach((b, i) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); startGame(i); }));

function backToMenu() {
  playing = false;
  current.exit();
  menu.classList.remove('hide'); home.classList.remove('show');
  buzz(40);
  sfx.arp([N(24), N(19), N(16), N(12)], 0.07, { vol: 0.06, dur: 0.5 });
}

// ---- casetta: tenere premuto 2 secondi per tornare al menù (un tocco veloce non fa nulla)
const HOLD = 2000;
let holdStart = 0, holdRaf = 0;
function holdTick() {
  const k = Math.min(1, (performance.now() - holdStart) / HOLD);
  home.style.setProperty('--p', k);
  if (k >= 1) { endHold(); backToMenu(); return; }
  holdRaf = requestAnimationFrame(holdTick);
}
function endHold() { cancelAnimationFrame(holdRaf); holdStart = 0; home.style.setProperty('--p', 0); home.classList.remove('press'); }
home.addEventListener('pointerdown', (e) => {
  e.preventDefault(); e.stopPropagation();
  holdStart = performance.now(); home.classList.add('press'); holdTick();
});
['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => home.addEventListener(ev, endHold));

// ---- musica on/off: pressione lunga sul bottoncino in alto a sinistra
const musicBtn = document.getElementById('music');
try { music.on = localStorage.getItem('minileo-music') !== 'off'; } catch (e) { /* niente */ }
musicBtn.classList.toggle('off', !music.on);
let pressT = null;
musicBtn.addEventListener('pointerdown', (e) => {
  e.preventDefault(); e.stopPropagation();
  musicBtn.classList.add('press');
  pressT = setTimeout(() => {
    music.on = !music.on;
    musicBtn.classList.toggle('off', !music.on);
    try { localStorage.setItem('minileo-music', music.on ? 'on' : 'off'); } catch (err) { /* niente */ }
    sfx.init(); music.on ? music.start() : music.stop();
    buzz(30);
  }, 800);
});
['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => musicBtn.addEventListener(ev, () => { clearTimeout(pressT); musicBtn.classList.remove('press'); }));

// ---- tocchi sul gioco
renderer.domElement.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (!playing) return;
  sfx.init();
  if (current.down) current.down(e.clientX, e.clientY, e.pointerId); else current.tap(e.clientX, e.clientY);
});
window.addEventListener('pointermove', (e) => { if (playing && current.move) current.move(e.clientX, e.clientY, e.pointerId); });
['pointerup', 'pointercancel'].forEach((ev) => window.addEventListener(ev, (e) => { if (playing && current.up) current.up(e.clientX, e.clientY, e.pointerId); }));
['contextmenu', 'gesturestart', 'dblclick'].forEach((ev) => document.addEventListener(ev, (e) => e.preventDefault()));
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { keepAwake(); sfx.ctx && sfx.ctx.resume(); }
  else sfx.ctx && sfx.ctx.suspend();
});
window.addEventListener('resize', () => { renderer.setSize(window.innerWidth, window.innerHeight); current.resize(); });

// ---- ciclo principale
const clock = new THREE.Clock();
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  music.tick();
  current.frame(dt, clock.elapsedTime);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
