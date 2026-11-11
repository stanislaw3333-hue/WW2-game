// Renderer, scenes, cameras, the PS1 material factory, and the window-fit resize.
import * as THREE from 'three';
import { V3, LOW_H, TEST, clamp } from '../core/util.js';
import { S } from '../core/state.js';
import { VERT, FRAG } from './shaders.js';

export const canvas = document.getElementById('game');
export const hudCanvas = document.getElementById('hud');
export const hud = hudCanvas.getContext('2d');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: TEST });
renderer.setPixelRatio(1);
renderer.autoClear = false;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

export const scene = new THREE.Scene();
export const gunScene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(62, 4 / 3, 0.08, 400);
camera.rotation.order = 'YXZ';
export const gunCam = new THREE.PerspectiveCamera(52, 4 / 3, 0.01, 5);

export const FOG_COL = [12 / 255, 18 / 255, 34 / 255];
export const FOG = [5, 50];
export function makeLights() {
  return {
    uAmbient: { value: new V3() }, uSunDir: { value: new V3(0, 1, 0) }, uSunCol: { value: new V3() },
    uLPos: { value: [0, 1, 2, 3, 4].map(() => new V3()) }, uLCol: { value: [0, 1, 2, 3, 4].map(() => new V3()) },
    uFogCol: { value: new V3(...FOG_COL) }, uSnap: { value: new THREE.Vector2(160, 120) },
  };
}
export const worldL = makeLights(), gunL = makeLights();

// PS1 material. o: tint, emis, fog, affine, snap, shade, side, additive, decal, depthWrite, lights
export function mat(map, o = {}) {
  const L = o.lights || worldL;
  const m = new THREE.ShaderMaterial({
    uniforms: {
      ...L, map: { value: map },
      uTint: { value: new V3(...(o.tint || [1, 1, 1])) }, uEmis: { value: o.emis || 0 },
      uFog: { value: new THREE.Vector2(...(o.fog === false ? [1e6, 2e6] : FOG)) },
      uAffine: { value: o.affine === undefined ? 0.3 : o.affine }, uSnapOn: { value: o.snap === false ? 0 : 1 },
      uUvOff: { value: new THREE.Vector2() }, uShadeOn: { value: o.shade ? 1 : 0 }, uShade: { value: new V3(...(o.shade || [1, 0, 1])) }, uCut: { value: o.additive ? 0.01 : 0.5 }, uAdd: { value: o.additive ? 1 : 0 },
    },
    vertexShader: VERT, fragmentShader: FRAG, side: o.side || THREE.FrontSide,
  });
  if (o.additive) { m.transparent = true; m.blending = THREE.AdditiveBlending; m.depthWrite = false; }
  if (o.decal) { m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -6; }
  if (o.depthWrite === false) m.depthWrite = false;
  return m;
}

// fit the low-res buffers to the window; the pixel size stays the same at any aspect ratio
export function resize() {
  const asp = clamp(innerWidth / Math.max(1, innerHeight), 1, 2.4);
  S.lowW = Math.round(LOW_H * asp / 2) * 2;
  const pr = Math.min(window.devicePixelRatio || 1, 2), rh = Math.min(Math.round(innerHeight * pr), 1200);
  renderer.setSize(Math.max(2, Math.round(rh * innerWidth / Math.max(1, innerHeight))), Math.max(2, rh), false);
  hudCanvas.width = S.lowW; hudCanvas.height = LOW_H; hud.imageSmoothingEnabled = false;
  camera.aspect = gunCam.aspect = S.lowW / LOW_H; gunCam.updateProjectionMatrix();
  worldL.uSnap.value.set(S.lowW, LOW_H); gunL.uSnap.value.set(S.lowW, LOW_H);
}
