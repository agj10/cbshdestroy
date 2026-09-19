import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Merge opaque static siblings without altering their triangles, materials or shadow flags. */
export function batchStaticScenery(root: THREE.Object3D, dynamic: ReadonlySet<THREE.Object3D>): void {
  root.updateMatrixWorld(true);
  const visit = (parent: THREE.Object3D) => {
    if (dynamic.has(parent) || parent instanceof THREE.Mesh) return;
    const batches = new Map<string, THREE.Mesh[]>();
    for (const child of [...parent.children]) {
      if (dynamic.has(child)) continue;
      if (!(child instanceof THREE.Mesh)) { visit(child); continue; }
      if (child instanceof THREE.InstancedMesh || child.children.length || child.name || Array.isArray(child.material) || child.material.transparent || child.geometry.groups.length && child.geometry.index === null) continue;
      const bounds = new THREE.Box3().setFromObject(child);
      // Ground must remain separate from tall objects for the excavation mask.
      // Spatial cells retain useful frustum culling for the surrounding landscape.
      const key = [child.material.uuid, child.castShadow, child.receiveShadow, child.renderOrder, child.layers.mask,
        bounds.max.y < 0.2, Math.floor(bounds.getCenter(new THREE.Vector3()).x / 64), Math.floor(bounds.getCenter(new THREE.Vector3()).z / 64)].join(':');
      const batch = batches.get(key) ?? [];
      batch.push(child); batches.set(key, batch);
    }
    for (const members of batches.values()) {
      if (members.length < 2) continue;
      const copies = members.map(mesh => mesh.geometry.clone().applyMatrix4(mesh.matrix));
      const geometry = mergeGeometries(copies, false);
      for (const copy of copies) copy.dispose();
      if (!geometry) continue;
      geometry.computeBoundingSphere();
      const first = members[0];
      const merged = new THREE.Mesh(geometry, first.material);
      merged.castShadow = first.castShadow;
      merged.receiveShadow = first.receiveShadow;
      merged.renderOrder = first.renderOrder;
      merged.layers.mask = first.layers.mask;
      merged.name = 'static-scenery-batch';
      parent.add(merged);
      for (const member of members) member.removeFromParent();
    }
  };
  visit(root);
}
