// SlicedLabs · studio · © 2026 SlicedLabs — Showpiece3D renderer.
// Dynamically imported (see Showpiece3D.astro) so `three` is NEVER in the initial bundle
// and never downloads on a gated / no-JS / reduced-data visit. Mirrors ShaderField's
// discipline: capped DPR, render-ON-DEMAND (no perpetual spin — the model is STILL until
// you move it; upholds the no-shimmer law), paused off-screen / on tab blur, full dispose
// on teardown. With no glTF asset it builds a procedural, brand-tinted board so the seam
// ships green; drop a real .glb at the modelUrl to swap in zero code.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { loadMarkGroup } from "./markMesh";

export type ShowpieceHandle = { dispose: () => void };

export function initShowpiece(
  canvas: HTMLCanvasElement,
  opts: { modelUrl?: string; variant?: "mark" | "board" } = {},
): ShowpieceHandle {
  // The gate (clientCaps.shouldRunHeavyFx) already excludes reduced-motion / low-power /
  // save-data devices, so here we render for QUALITY: AA, ACES tone-mapping, IBL, one soft
  // shadow. Still render-on-demand (no perpetual loop), so battery cost stays bounded.
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0.35, 4.4);
  camera.lookAt(0, 0, 0);

  // PBR reflections from a soft studio room (no HDR download) — gives the metal its sheen.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;

  // soft key (casts the contact shadow) + a brand-blue rim — luxe, not theatrical.
  const key = new THREE.DirectionalLight(0xfff4e6, 2.4);
  key.position.set(2.5, 3.8, 3);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 20;
  key.shadow.camera.left = -3;
  key.shadow.camera.right = 3;
  key.shadow.camera.top = 3;
  key.shadow.camera.bottom = -3;
  key.shadow.bias = -0.0005;
  const rim = new THREE.DirectionalLight(0x38b6ff, 1.3); // brand mark blue
  rim.position.set(-3, 1.2, -2.5);
  scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.4));

  // ground shadow-catcher (static, under the rotating object) — transparent but receives.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 24),
    new THREE.ShadowMaterial({ opacity: 0.22 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.45;
  ground.receiveShadow = true;
  scene.add(ground);

  const group = new THREE.Group();
  scene.add(group);
  const BASE_Y = -0.5; // resting 3/4 view

  function buildPlaceholder() {
    // NEUTRALIZED (2026-06-23): a calm matte graphite slab, not a saturated brown box. This
    // is only the rare error-fallback (the index renders the real chevron mark); keeping it
    // a quiet, intentional surface — never a procedural-prop showpiece "we'd stake our name on."
    const geo = new THREE.BoxGeometry(2.5, 0.2, 1.6, 1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0x2a2b30, roughness: 0.82, metalness: 0.02 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    group.add(mesh);
  }

  function frameModel(obj: THREE.Object3D) {
    // center + scale-to-fit so any supplied model sits in the same comfortable box.
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    obj.position.sub(center);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    obj.scale.multiplyScalar(2.4 / maxDim);
    obj.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true;
    });
  }

  let disposed = false;
  if (opts.variant === "mark") {
    // the OFFICIAL chevron-S mark, extruded from /slicedlabs-mark.svg (operator artwork).
    loadMarkGroup()
      .then((markGroup) => {
        if (disposed) return;
        group.add(markGroup);
        kick();
      })
      .catch(() => {
        if (!disposed && group.children.length === 0) {
          buildPlaceholder();
          kick();
        }
      });
  } else if (opts.modelUrl) {
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
    // clamp so the accumulated scroll-tilt can't drift the mark off its resting 3/4 view
    target.ry = Math.max(-0.6, Math.min(0.6, target.ry + vel * 0.02));
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
      scene.environment = null;
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
