// Piccole utilità condivise da tutti i minigiochi.
export const rand = (a, b) => a + Math.random() * (b - a);
export const pickOne = (arr) => arr[(Math.random() * arr.length) | 0];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeOutBack = (t) => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
export const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
export const angleLerp = (a, b, t) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * t; };

export const PALETTE = [0xff5d73, 0xffa62b, 0xffd93d, 0x6bcb77, 0x4d96ff, 0xb46bff, 0xff7bd5, 0x3fd2c7];
export const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* niente */ } };
