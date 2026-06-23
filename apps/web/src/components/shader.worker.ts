// SlicedLabs · studio · © 2026 SlicedLabs — ShaderField render worker.
// Renders the living field on a transferred OffscreenCanvas, OFF the main thread, so the
// shader can never stutter scrolling, hydration, or input. The main thread posts state
// (size / theme / velocity / pause). Velocity is eased here → no glitchy jumps on fast scroll.
import { initGL } from "./shaderGL";

type Renderer = ReturnType<typeof initGL>;
let r: Renderer = null;
let warm = 1, velTarget = 0, vel = 0, w = 1, h = 1, running = false, t0 = 0;

const scope = self as unknown as {
  requestAnimationFrame?: (cb: (t: number) => void) => number;
  postMessage: (m: unknown) => void;
};
const rAF: (cb: (t: number) => void) => void = scope.requestAnimationFrame
  ? scope.requestAnimationFrame.bind(self)
  : (cb) => { setTimeout(() => cb(performance.now()), 16); };

function frame(now: number) {
  if (!running) return;
  if (!t0) t0 = now;
  vel += (velTarget - vel) * 0.05; // smooth → the field eases into/out of "liquid"
  if (r) { r.resize(w, h); r.draw((now - t0) / 1000, warm, vel); }
  rAF(frame);
}

self.onmessage = (e: MessageEvent) => {
  const d = e.data || {};
  if (d.canvas) {
    r = initGL(d.canvas as OffscreenCanvas);
    w = d.w; h = d.h; warm = d.warm;
    if (r) { running = true; scope.postMessage({ started: true }); rAF(frame); }
  } else if (d.size) {
    w = d.w; h = d.h;
  } else if (d.warm !== undefined) {
    warm = d.warm;
  } else if (d.vel !== undefined) {
    velTarget = d.vel;
  } else if (d.pause !== undefined) {
    const wasRunning = running;
    running = !d.pause;
    if (running && !wasRunning) { t0 = 0; rAF(frame); }
  }
};
