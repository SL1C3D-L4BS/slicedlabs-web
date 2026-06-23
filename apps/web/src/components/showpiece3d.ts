// SlicedLabs · studio · © 2026 SlicedLabs — Showpiece3D renderer.
// Dynamically imported (see Showpiece3D.astro) so `three` is NEVER in the initial bundle
// and never downloads on a gated / no-JS / reduced-data visit. Mirrors ShaderField's
// discipline: capped DPR, render-ON-DEMAND (no perpetual spin — the model is STILL until
// you move it; upholds the no-shimmer law), paused off-screen / on tab blur, full dispose
// on teardown. With no glTF asset it builds a procedural, brand-tinted board so the seam
// ships green; drop a real .glb at the modelUrl to swap in zero code.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export type ShowpieceHandle = { dispose: () => void };

export function initShowpiece(
  canvas: HTMLCanvasElement,
  opts: { modelUrl?: string } = {},
): ShowpieceHandle {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0.35, 4.4);
  camera.lookAt(0, 0, 0);

  // soft key + a brand-blue rim — luxe, not theatrical.
  const key = new THREE.DirectionalLight(0xfff4e6, 2.1);
  key.position.set(2.5, 3.5, 3);
  const rim = new THREE.DirectionalLight(0x38b6ff, 1.2); // brand mark blue
  rim.position.set(-3, 1.2, -2.5);
  scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.55));

  const group = new THREE.Group();
  scene.add(group);
  const BASE_Y = -0.5; // resting 3/4 view

  function buildPlaceholder() {
    // a beveled board slab — brand-tinted walnut, gentle bevel via a rounded box feel.
    const geo = new THREE.BoxGeometry(2.5, 0.2, 1.6, 1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0x6f4524, roughness: 0.5, metalness: 0.04 });
    group.add(new THREE.Mesh(geo, mat));
  }

  function frameModel(obj: THREE.Object3D) {
    // center + scale-to-fit so any supplied model sits in the same comfortable box.
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    obj.position.sub(center);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    obj.scale.multiplyScalar(2.4 / maxDim);
  }

  let disposed = false;
  if (opts.modelUrl) {
    new GLTFLoader().load(
      opts.modelUrl,
      (gltf) => {
        if (disposed) return;
        frameModel(gltf.scene);
        group.add(gltf.scene);
        kick();
      },
      undefined,
      () => {
        // load failed → ensure SOMETHING shows (don't throw, don't leave it blank).
        if (!disposed && group.children.length === 0) {
          buildPlaceholder();
          kick();
        }
      },
    );
  } else {
    buildPlaceholder();
  }

  // ── render-on-demand: ease current→target, draw only while not settled ──────────
  const target = { rx: 0, ry: 0 };
  const cur = { rx: 0, ry: 0 };
  let raf = 0;
  let onScreen = false;

  function render() {
    raf = 0;
    cur.rx += (target.rx - cur.rx) * 0.08;
    cur.ry += (target.ry - cur.ry) * 0.08;
    group.rotation.set(cur.rx, BASE_Y + cur.ry, 0);
    renderer.render(scene, camera);
    const settled =
      Math.abs(target.rx - cur.rx) < 1e-3 && Math.abs(target.ry - cur.ry) < 1e-3;
    if (!settled) kick(); // keep going only while easing — then STOP (no perpetual loop)
  }
  function kick() {
    if (!raf && onScreen && !document.hidden && !disposed) raf = requestAnimationFrame(render);
  }
  function stop() {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  function resize() {
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    renderer.setSize(w, h, false); // false → don't touch canvas CSS size (we own it)
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    kick();
  }

  // pointer parallax — small tilt toward the cursor (input-driven only).
  function onPointer(e: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5; // -0.5..0.5
    const ny = (e.clientY - r.top) / r.height - 0.5;
    target.ry = nx * 0.6;
    target.rx = ny * 0.35;
    kick();
  }
  // scroll adds a whisper of rotation (reads the shared Lenis velocity if present).
  function onScroll() {
    const vel = (window as unknown as { __slVel?: number }).__slVel || 0;
    target.ry += vel * 0.02;
    kick();
  }

  const io = new IntersectionObserver(
    (en) => {
      onScreen = en[0]?.isIntersecting ?? false;
      onScreen ? kick() : stop();
    },
    { threshold: 0 },
  );
  io.observe(canvas);
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  const onVis = () => (document.hidden ? stop() : kick());
  document.addEventListener("visibilitychange", onVis);
  canvas.addEventListener("pointermove", onPointer);
  addEventListener("scroll", onScroll, { passive: true });

  resize(); // initial draw

  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("pointermove", onPointer);
      removeEventListener("scroll", onScroll);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
