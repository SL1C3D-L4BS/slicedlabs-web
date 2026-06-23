// SlicedLabs · studio · © 2026 SlicedLabs — extrude the OFFICIAL mark into 3D.
// Loads the operator-provided /slicedlabs-mark.svg (two chevron-S paths) and extrudes each
// into a beveled 3D solid. We NEVER draw/redraw the mark (see no-logo-generation rule) —
// this only consumes the existing file. Warm half (path 0) + cool half (path 1) are tinted
// from the brand hues. Returned as a centered, normalized THREE.Group ready to drop into a
// rotating showpiece group. Dynamically imported alongside three (never in the base bundle).
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

// Official brand hues — mirror the gradients baked into slicedlabs-mark.svg itself
// (warm chevron coral→orange, cool chevron teal→blue). Literals, not generated artwork.
const WARM = 0xcb6820; // orange
const COOL = 0x308bdb; // blue

export function loadMarkGroup(url = "/slicedlabs-mark.svg"): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    new SVGLoader().load(
      url,
      (data) => {
        const group = new THREE.Group();
        const extrude: THREE.ExtrudeGeometryOptions = {
          depth: 36,
          bevelEnabled: true,
          bevelThickness: 6,
          bevelSize: 4,
          bevelSegments: 3,
          curveSegments: 16,
        };
        // path 0 = warm chevron (coral→orange), path 1 = cool chevron (teal→blue).
        const mats = [
          new THREE.MeshStandardMaterial({
            color: new THREE.Color(WARM),
            metalness: 0.38,
            roughness: 0.3,
            side: THREE.DoubleSide,
            envMapIntensity: 1.1,
          }),
          new THREE.MeshStandardMaterial({
            color: new THREE.Color(COOL),
            metalness: 0.38,
            roughness: 0.3,
            side: THREE.DoubleSide,
            envMapIntensity: 1.1,
          }),
        ];
        data.paths.forEach((path, i) => {
          const mat = mats[Math.min(i, mats.length - 1)];
          for (const shape of SVGLoader.createShapes(path)) {
            const geo = new THREE.ExtrudeGeometry(shape, extrude);
            geo.scale(1, -1, 1); // SVG y-down → Three y-up (DoubleSide covers the flipped winding)
            group.add(new THREE.Mesh(geo, mat));
          }
        });

        // center at the origin + normalize to ~2.6 units wide so it frames like the board did.
        const box = new THREE.Box3().setFromObject(group);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        for (const child of group.children) {
          const m = child as THREE.Mesh;
          m.geometry.translate(-center.x, -center.y, -center.z);
          m.castShadow = true;
          m.receiveShadow = false;
        }
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        group.scale.setScalar(2.6 / maxDim);
        resolve(group);
      },
      undefined,
      (err) => reject(err),
    );
  });
}
