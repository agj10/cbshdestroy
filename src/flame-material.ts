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

export function stylizedFlameGeometry(height:number,width:number,variant=.5):THREE.BufferGeometry {
  const positions:number[]=[],colors:number[]=[];
  const rings=[[0,.5],[.16+variant*.12,1],[.48+variant*.12,.55+variant*.2],[.78,.16+variant*.18],[1,0]];
  for(let ring=0;ring<4;ring++)for(let side=0;side<5;side++){
    const vertex=(r:number,k:number)=>{
      const [y,radius]=rings[r],angle=k/5*Math.PI*2+variant*2;
      return [Math.cos(angle)*radius*width+y*y*width*(variant*1.6-.5),y*height,Math.sin(angle)*radius*width];
    };
    for(const [r,k] of [[ring,side],[ring,side+1],[ring+1,side],[ring+1,side],[ring,side+1],[ring+1,side+1]]){
      positions.push(...vertex(r,k));
      const color=new THREE.Color(r<2?0xffc34a:r<3?0xff8527:0xee481b);
      colors.push(color.r,color.g,color.b);
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();return geometry;
}
