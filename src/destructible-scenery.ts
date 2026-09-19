import * as THREE from 'three';
import type { CampusPart } from './types';

/** Campus paving breaks into slabs. Distant scenery and trees stay decorative. */
export function destructibleScenery(root:THREE.Group, parts:CampusPart[]):void {
  root.updateMatrixWorld(true);
  const protectedMeshes=new Set(parts.map(p=>p.mesh)),targets:THREE.Mesh[]=[];
  root.traverse(object=>{
    if(!(object instanceof THREE.Mesh)||object instanceof THREE.InstancedMesh||protectedMeshes.has(object)||!(object.geometry instanceof THREE.BoxGeometry))return;
    for(let parent=object.parent;parent;parent=parent.parent)if(protectedMeshes.has(parent as THREE.Mesh))return;
    targets.push(object);
  });
  const paving=[0x68716d,0xbec4b2,0xc7c8b9,0x577b93,0x6b9866,0xbf8a70,0x6a9489];
  for(const mesh of targets){
    const bounds=new THREE.Box3().setFromObject(mesh),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
    const color=(mesh.material as THREE.MeshStandardMaterial).color?.getHex();
    if(!paving.includes(color)||size.y>.3||Math.abs(center.x)>95||center.z < -80||center.z>105||size.x>120||size.z>120)continue;
    const nx=Math.ceil(size.x/7),nz=Math.ceil(size.z/7);
    for(let x=0;x<nx;x++)for(let z=0;z<nz;z++){
      const sx=size.x/nx,sz=size.z/nz,sy=Math.max(.12,size.y);
      const position=new THREE.Vector3(bounds.min.x+(x+.5)*sx,bounds.max.y-sy/2,bounds.min.z+(z+.5)*sz);
      const tile=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mesh.material);tile.position.copy(position);tile.receiveShadow=true;
      const id='campus-paving-'+parts.length;tile.name=id;root.add(tile);
      parts.push({mesh:tile,spec:{id,position:{...position},size:{x:sx,y:sy,z:sz},color,kind:'slab',supports:[],anchored:true}});
    }
    mesh.removeFromParent();
  }
}
