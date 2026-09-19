import { expect, it } from 'vitest';
import * as THREE from 'three';
import { buildCampus } from '../src/campus';
import { terrainChunk, makeCut } from '../src/terrain-surface';

function inventory(root: THREE.Object3D) {
  let draws = 0, triangles = 0;
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    draws += Array.isArray(object.material) ? object.geometry.groups.length : 1;
    triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3 * (object instanceof THREE.InstancedMesh ? object.count : 1);
  });
  return { draws, triangles, bounds: new THREE.Box3().setFromObject(root) };
}
function dispose(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
  root.traverse(object => {if(object instanceof THREE.Mesh) {geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material);}});
  geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());
}
it('reduces static draw submissions while preserving every triangle and all structural bodies', () => {
  const original = buildCampus(false), batched = buildCampus();
  try {
    const before = inventory(original.group), after = inventory(batched.group);
    expect(after.draws).toBeLessThan(before.draws * .9);
    expect(after.triangles).toBe(before.triangles);
    expect(after.bounds.min.distanceTo(before.bounds.min)).toBeLessThan(.001);
    expect(after.bounds.max.distanceTo(before.bounds.max)).toBeLessThan(.001);
    expect(batched.parts.map(part=>part.spec)).toEqual(original.parts.map(part=>part.spec));
    for (const part of batched.parts) expect(part.mesh.parent).toBe(batched.group);
  } finally {dispose(original.group);dispose(batched.group);}
});
it('reuses identical terrain safely without sharing disposable buffers or retaining stale cuts', () => {
  const cut = makeCut({x:2,y:0,z:2},8,2);
  const first = terrainChunk([cut],0,0), cached = terrainChunk([{...cut}],0,0);
  expect(cached.attributes.position.array).toEqual(first.attributes.position.array);
  expect(cached.attributes.position.array).not.toBe(first.attributes.position.array);
  const originalX = cached.attributes.position.getX(0);
  first.attributes.position.setX(0,999);
  const fresh = terrainChunk([cut],0,0);
  expect(fresh.attributes.position.getX(0)).toBe(originalX);
  const changed = terrainChunk([{...cut,depth:4}],0,0);
  expect(changed.attributes.position.array).not.toEqual(cached.attributes.position.array);
  for(const geometry of [first,cached,fresh,changed])geometry.dispose();
});
