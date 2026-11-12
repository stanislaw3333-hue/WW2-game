// Three searchlight beams far off in the night, on the side opposite the moon. Each beam sweeps slowly across the
// sky, and their paths share one area above the yards, so the beams sometimes cross each other.
import * as THREE from 'three';
import { scene } from '../render/renderer.js';

const BASE_DIST = 50;      // m from the courtyards to the searchlight bases (just outside the walls; beams about 1/3 of the old length)
const BEAM_LEN = 260;      // m: geometry length, scaled per frame to reach the aim point
const BEAM_R = 2.25;       // m: radius at the far (sky) end (half the old 4.5, per the notes)
const AIM_C = new THREE.Vector3();    // set from the level (levels/<id>/data.js searchlights.aim): the area the beams sweep around, above the yards: raised so the beam tips stay in the sky (half the drop, per the notes)
const AIM_SPAN = 20;       // m: how far each beam's aim point wanders from AIM_C

// the moon sits to the north-east of the manor yard; the searchlights stand on the opposite bearing
const OPP = new THREE.Vector3(-0.5, 0, 0.87).normalize();
const SIDE = new THREE.Vector3(OPP.z, 0, -OPP.x);

// soft vertical falloff for the beam: dim at both ends, brightest in the lower-middle
function beamTex() {
  const c = document.createElement('canvas'); c.width = 4; c.height = 128;
  const x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.2, 'rgba(255,255,255,0.5)');
  gr.addColorStop(0.7, 'rgba(255,255,255,0.2)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 4, 128);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

const beams = [];
const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), aim = new THREE.Vector3();

export function buildSearchlights({ aim: c }) {
  AIM_C.set(...c);
  const mat = new THREE.MeshBasicMaterial({
    map: beamTex(), color: 0xdfe8ff, transparent: true, opacity: 0.12,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
  });
  // phases chosen by simulation (scratch: beam_sim.mjs) so the beams meet more often: about 24% of the time, up from 22.5%
  const PHASES = [0, 2.356, 5.498];
  for (let i = 0; i < 3; i++) {
    const base = OPP.clone().multiplyScalar(BASE_DIST).addScaledVector(SIDE, (i - 1) * 28);
    base.y = 0;
    const g = new THREE.CylinderGeometry(BEAM_R, 0.4, BEAM_LEN, 16, 1, true);   // narrow at the base, wide in the sky (base end halved too)
    const m = new THREE.Mesh(g, mat);
    m.frustumCulled = false;
    scene.add(m);
    beams.push({ base, mesh: m, phase: PHASES[i], speed: 0.12 + i * 0.024 });   // twice the sweep speed of before
  }
  return beams;
}

// called every frame with the game clock: every beam re-aims at its own wandering point above the yards
export function updateSearchlights(time) {
  for (const b of beams) {
    const a = time * b.speed + b.phase;
    aim.set(
      AIM_C.x + Math.cos(a) * AIM_SPAN,
      AIM_C.y + Math.sin(a * 1.3) * 8,
      AIM_C.z + Math.sin(a) * AIM_SPAN,
    );
    aim.lerp(b.base, 0.5);   // half as long: the beam keeps its direction but stops halfway to the aim point
    dir.subVectors(aim, b.base);
    const len = dir.length();
    dir.divideScalar(len);
    b.mesh.position.copy(b.base).addScaledVector(dir, len / 2);
    b.mesh.quaternion.setFromUnitVectors(up, dir);
    b.mesh.scale.set(1, len / BEAM_LEN, 1);
  }
}
