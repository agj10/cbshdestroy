import * as THREE from 'three';

/** Soft procedural smoke alpha, shared by all surface emitters. */
export function smokeTexture(): THREE.DataTexture {
  const size=128,data=new Uint8Array(size*size*4);
  // Overlapping lobes share one silhouette, rather than reading as separate balls.
  const lobes=[[-.33,-.18,.43],[.29,-.17,.45],[-.05,.26,.48],[-.43,.2,.3],[.38,.3,.31],[.02,-.43,.32]];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const nx=(x+.5)/size*2-1,ny=(y+.5)/size*2-1;
    let edge=1;
    for(const [cx,cy,r] of lobes)edge=Math.min(edge,Math.hypot(nx-cx,ny-cy)-r);
    const t=THREE.MathUtils.clamp((edge+.075)/.15,0,1);
    const alpha=1-t*t*(3-2*t);
    const shade=Math.round(215+25*ny+12*Math.sin(nx*7+ny*4));
    data.set([shade,shade,shade,Math.round(alpha*240)],(x+y*size)*4);
  }
  const texture=new THREE.DataTexture(data,size,size);texture.needsUpdate=true;
  texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearFilter;return texture;
}

/** Broad-based turbulent tongues, with a hot inner core instead of a leaf silhouette. */
export function stylizedFlameGeometry(height:number,width:number,variant=.5):THREE.BufferGeometry {
  const positions:number[]=[],colors:number[]=[];
  const profiles=[[0,1],[.2,.94],[.42,.66],[.62,.44],[.82,.23],[1,0]];
  for(let branch=0;branch<3;branch++){
    const h=height*(branch===0?1:.5+variant*.23),w=width*(branch===0?1:.6);
    const offset=(branch-1)*width*.65;
    for(let ring=0;ring<profiles.length-1;ring++)for(let side=0;side<7;side++){
      const vertex=(r:number,k:number)=>{
        const [y,radius]=profiles[r],angle=k/7*Math.PI*2;
        const bend=Math.sin(y*4+variant*6+branch)*y*y*w*.8;
        return [offset+Math.cos(angle)*radius*w+bend,y*h,Math.sin(angle)*radius*w*.9];
      };
      for(const [r,k] of [[ring,side],[ring,side+1],[ring+1,side],[ring+1,side],[ring,side+1],[ring+1,side+1]]){
        positions.push(...vertex(r,k));
        const color=new THREE.Color(r<2?0xffdc73:r<4?0xff991e:0xf14c0b);colors.push(color.r,color.g,color.b);
      }
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();return geometry;
}
