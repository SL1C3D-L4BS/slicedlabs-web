// SlicedLabs · studio · © 2026 SlicedLabs — ShaderField render worker.
// Renders the living field on a transferred OffscreenCanvas, OFF the main thread, so the
// shader can never stutter scrolling, hydration, or input. The main thread posts state
// (size / theme / velocity) + two independent pause signals (tab visibility AND on-screen);
// we derive running = visible && onScreen so neither clobbers the other. The clock is a
// CONTINUOUS accumulator (big gaps clamped) so resuming never snaps the field back to t=0.
import { initGL } from "./shaderGL";

type Renderer = ReturnType<typeof initGL>;
let r: Renderer = null;
let warm = 1, velTarget = 0, vel = 0, w = 1, h = 1;
let visible = true, onScreen = true, running = false;
let acc = 0, last = 0;

const scope = self as unknown as {
  requestAnimationFrame?: (cb: (t: number) => void) => number;
  postMessage: (m: unknown) => void;
};
const rAF: (cb: (t: number) => void) => void = scope.requestAnimationFrame
  ? scope.requestAnimationFrame.bind(self)
  : (cb) => { setTimeout(() => cb(performance.now()), 16); };

function frame(now: number) {
  if (!running) return;
  if (!last) last = now;
  acc += Math.min((now - last) / 1000, 0.1); // clamp big gaps → no snap on resume
  last = now;
  vel += (velTarget - vel) * 0.05; // smooth → no glitchy jumps on fast scroll
  if (r) { r.resize(w, h); r.draw(acc, warm, vel); }
  rAF(frame);
}

function setRun() {
  const want = visible && onScreen && !!r;
  if (want && !running) { running = true; last = 0; rAF(frame); }
  else running = want;
}

self.onmessage = (e: MessageEvent) => {
  const d = e.data || {};
  if (d.canvas) {
    r = initGL(d.canvas as OffscreenCanvas);
    w = d.w; h = d.h; warm = d.warm;
    if (r) { scope.postMessage({ started: true }); setRun(); }
  } else if (d.size) {
    w = d.w; h = d.h;
  } else if (d.warm !== undefined) {
    warm = d.warm;
  } else if (d.vel !== undefined) {
    velTarget = d.vel;
  } else if (d.visible !== undefined) {
    visible = d.visible;
    setRun();
  } else if (d.onScreen !== undefined) {
    onScreen = d.onScreen;
    setRun();
  }
};
