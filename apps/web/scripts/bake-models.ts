// SlicedLabs · studio · © 2026 SlicedLabs — bake .glb product models (run: `bun run apps/web/scripts/bake-models.ts`).
// Procedurally models products and EMBOSSES the OFFICIAL mark (read from the operator's
// slicedlabs-mark.svg — never redrawn), then exports binary glTF to public/models/*.glb so
// the shop ProductViewer (<model-viewer>) can show real, brand-marked 3D. Headless three +
// GLTFExporter; solid material colors only (no image textures) so it runs in Node/bun.
import * as THREE from "three";
import { DOMParser } from "@xmldom/xmldom";
// Headless polyfills: SVGLoader.parse() wants a browser DOMParser; GLTFExporter's binary
// path wants a FileReader (bun has Blob, so we read it via blob.arrayBuffer()).
(globalThis as unknown as { DOMParser: unknown }).DOMParser = DOMParser;
class NodeFileReader {
  result: ArrayBuffer | null = null;
  onloadend: (() => void) | null = null;
  private listeners: Record<string, Array<() => void>> = {};
  addEventListener(type: string, cb: () => void) {
    (this.listeners[type] ||= []).push(cb);
  }
  private emit(type: string) {
    if (type === "loadend" && this.onloadend) this.onloadend();
    (this.listeners[type] || []).forEach((cb) => cb());
  }
  readAsArrayBuffer(blob: Blob) {
    blob
      .arrayBuffer()
      .then((buf) => {
        this.result = buf;
        this.emit("load");
        this.emit("loadend");
      })
      .catch(() => {
        this.emit("error");
        this.emit("loadend");
      });
  }
}
(globalThis as unknown as { FileReader: unknown }).FileReader = NodeFileReader;
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const WARM = 0xcb6820;
const COOL = 0x308bdb;
const here = dirname(fileURLToPath(import.meta.url)); // apps/web/scripts
const webRoot = dirname(here); // apps/web
const outDir = join(webRoot, "public", "models");
const markSvg = readFileSync(join(webRoot, "public", "slicedlabs-mark.svg"), "utf8");

// Build the extruded mark as a flat, thin group (for embossing onto a surface).
function buildMark(thickness = 0.06): THREE.Group {
  const g = new THREE.Group();
  const data = new SVGLoader().parse(markSvg);
  const extrude: THREE.ExtrudeGeometryOptions = {
    depth: 36,
    bevelEnabled: true,
    bevelThickness: 5,
    bevelSize: 3,
    bevelSegments: 2,
    curveSegments: 14,
  };
  data.paths.forEach((path, i) => {
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(i === 0 ? WARM : COOL),
      metalness: 0.4,
      roughness: 0.32,
      side: THREE.DoubleSide,
    });
    for (const shape of SVGLoader.createShapes(path)) {
      const geo = new THREE.ExtrudeGeometry(shape, extrude);
      geo.scale(1, -1, 1);
      g.add(new THREE.Mesh(geo, mat));
    }
  });
  // normalize: center + scale to ~1 unit wide + flatten depth to `thickness`.
  const box = new THREE.Box3().setFromObject(g);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  for (const c of g.children) (c as THREE.Mesh).geometry.translate(-center.x, -center.y, -center.z);
  const maxDim = Math.max(size.x, size.y) || 1;
  const planar = 1 / maxDim;
  g.scale.set(planar, planar, thickness / (size.z || 1));
  return g;
}

function engravedBoard(): THREE.Object3D {
  const root = new THREE.Group();
  // beveled walnut board
  const board = new THREE.Mesh(
    new RoundedBoxGeometry(2.6, 0.2, 1.7, 4, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x6f4524, roughness: 0.45, metalness: 0.05 }),
  );
  root.add(board);
  // mark embossed on the top face, lying flat, raised a hair above the surface
  const mark = buildMark(0.05);
  mark.scale.multiplyScalar(0.95); // ~0.95 units wide on a 2.6-wide board
  mark.rotation.x = -Math.PI / 2; // lay flat
  mark.position.y = 0.1 + 0.02; // top surface + tiny emboss
  root.add(mark);
  return root;
}

async function exportGlb(obj: THREE.Object3D, file: string): Promise<void> {
  const scene = new THREE.Scene();
  scene.add(obj);
  const exporter = new GLTFExporter();
  const result = await new Promise<ArrayBuffer>((resolve, reject) => {
    exporter.parse(
      scene,
      (out) => resolve(out as ArrayBuffer),
      (err) => reject(err),
      { binary: true },
    );
  });
  const path = join(outDir, file);
  writeFileSync(path, Buffer.from(result));
  console.log(`  → ${file} (${(result.byteLength / 1024).toFixed(1)} KB)`);
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  console.log("baking product .glb models →", outDir);
  await exportGlb(engravedBoard(), "board-engraved.glb");
  console.log("done.");
}

main().catch((e) => {
  console.error("bake-models failed:", e);
  process.exit(1);
});
