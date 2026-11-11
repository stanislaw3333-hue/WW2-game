// Baked Blender models (src/models/*.json, made by tools/bake_models.py): base64 Float32 positions,
// normals and uvs per material key. They are already in metres with the muzzle along -Z.
import * as THREE from 'three';

// decodes a baked mesh once; every mesh that uses it shares the geometry
export function bakedGeo(m) {
  if (m.geo) return m.geo;
  const f32 = s => { const b = atob(s), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return new Float32Array(a.buffer); };
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(f32(m.pos), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(f32(m.nrm), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(f32(m.uv), 2));
  m.geo = g;
  return g;
}
// adds each baked mesh under parent, with the material that matches its key; returns the meshes
export function addBaked(data, parent, mats) {
  return data.meshes.map(m => { const mesh = new THREE.Mesh(bakedGeo(m), mats[m.mat]); parent.add(mesh); return mesh; });
}
