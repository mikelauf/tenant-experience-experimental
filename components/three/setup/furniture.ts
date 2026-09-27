import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Furniture shapes, shared by the setups and the room's own dressing. Each stands on y = 0 and faces local −z. */

export function chairGeometry() {
  const seat = new THREE.BoxGeometry(0.44, 0.08, 0.42).translate(0, 0.44, 0);
  const back = new THREE.BoxGeometry(0.44, 0.42, 0.07).translate(0, 0.7, 0.19);
  const legs = new THREE.BoxGeometry(0.36, 0.4, 0.34).translate(0, 0.2, 0);
  return mergeGeometries([seat, back, legs]);
}

/** A guest: body, shoulders and a head, so a crowd reads as people rather than pegs. */
export function personGeometry() {
  const body = new THREE.CapsuleGeometry(0.16, 0.78, 4, 10).translate(0, 0.55, 0);
  const shoulders = new THREE.CapsuleGeometry(0.13, 0.16, 4, 8).rotateZ(Math.PI / 2).translate(0, 1.2, 0);
  const head = new THREE.SphereGeometry(0.11, 12, 10).translate(0, 1.5, 0);
  return mergeGeometries([body, shoulders, head]);
}

/** A banquet round with a floor-length cloth. */
export function roundGeometry() {
  const top = new THREE.CylinderGeometry(0.64, 0.64, 0.04, 32).translate(0, 0.74, 0);
  const skirt = new THREE.CylinderGeometry(0.64, 0.7, 0.72, 32, 1, true).translate(0, 0.36, 0);
  return mergeGeometries([top, skirt]);
}

export function coffeeGeometry() {
  return mergeGeometries([new THREE.CylinderGeometry(0.62, 0.62, 0.05, 28).translate(0, 0.42, 0), new THREE.CylinderGeometry(0.08, 0.22, 0.4, 12).translate(0, 0.2, 0)]);
}

export function highGeometry() {
  return mergeGeometries([
    new THREE.CylinderGeometry(0.34, 0.34, 0.04, 24).translate(0, 1.08, 0),
    new THREE.CylinderGeometry(0.04, 0.04, 1.06, 8).translate(0, 0.53, 0),
    new THREE.CylinderGeometry(0.24, 0.26, 0.03, 20).translate(0, 0.015, 0),
  ]);
}

export function sofaGeometry() {
  return mergeGeometries([
    new THREE.BoxGeometry(1.9, 0.26, 0.8).translate(0, 0.2, 0),
    new THREE.BoxGeometry(1.7, 0.12, 0.62).translate(0, 0.39, 0.06),
    new THREE.BoxGeometry(1.9, 0.4, 0.18).translate(0, 0.53, -0.31),
    new THREE.BoxGeometry(0.16, 0.26, 0.8).translate(-0.87, 0.46, 0),
    new THREE.BoxGeometry(0.16, 0.26, 0.8).translate(0.87, 0.46, 0),
  ]);
}
