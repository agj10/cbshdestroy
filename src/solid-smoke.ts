import * as THREE from 'three';

/** Opaque, overlapping round lobes. One draw call per plume, no alpha sorting. */
export class SolidSmoke {
  readonly mesh: THREE.InstancedMesh;
  private puffs: Array<{ phase: number; scale: number; speed: number; drift: number }>;
  private transform = new THREE.Object3D();
  private lobes = [[0,0,0,1],[-.62,.05,.18,.8],[.6,.22,-.1,.88],[.12,.54,.27,.76],[-.2,-.35,-.4,.72]];
  constructor(parent: THREE.Object3D, random: () => number, count = 7) {
    this.mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,transparent:false,opacity:1,depthWrite:true}), count * this.lobes.length);
    this.mesh.name = 'Opaque clustered smoke';
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.puffs = Array.from({length:count},(_,i)=>({phase:i/count,scale:.65+random()*.85,speed:.8+random()*.35,drift:random()*Math.PI*2}));
    for(let i=0;i<this.mesh.count;i++)this.mesh.setColorAt(i,new THREE.Color().setScalar(.105+random()*.065));
    parent.add(this.mesh);
    this.update(0,0,12,1);
  }
  update(age: number, baseHeight: number, rise: number, size: number): void {
    for(let i=0;i<this.puffs.length;i++) {
      const puff=this.puffs[i],clock=age*.1*puff.speed,phase=(clock+puff.phase)%1;
      const started=clock>=phase;
      const envelope=Math.min(1,phase*12)*Math.min(1,(1-phase)*7);
      const scale=(.7+phase*2.6)*size*puff.scale*envelope*(started?1:0);
      const x=Math.sin(puff.drift+age*.18)*phase*size*1.3,z=Math.cos(puff.drift+age*.13)*phase*size;
      for(let l=0;l<this.lobes.length;l++) {
        const [lx,ly,lz,r]=this.lobes[l];
        this.transform.position.set(x+lx*scale,baseHeight+phase*rise+ly*scale,z+lz*scale);
        this.transform.scale.set(scale*r,scale*r*(.85+i*.025),scale*r);
        this.transform.rotation.set(i*.4,l*.7,0);
        this.transform.updateMatrix();this.mesh.setMatrixAt(i*this.lobes.length+l,this.transform.matrix);
      }
    }
    this.mesh.instanceMatrix.needsUpdate=true;
  }
}
