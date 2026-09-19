import * as THREE from 'three';
import { affectedTiles, makeCut, terrainChunk, terrainHeight, type CraterCut } from './terrain-surface';
import type { Vec3 } from './types';

/** Real excavated volume; flat campus surfaces are cut away using the same height field. */
export class VoxelTerrain {
  readonly group = new THREE.Group();
  private cuts:CraterCut[]=[];
  private chunks=new Map<string,THREE.Mesh>();
  private material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide});
  private heights=new Float32Array(512*512);
  private mask=new THREE.DataTexture(this.heights,512,512,THREE.RedFormat,THREE.FloatType);
  constructor(){this.mask.minFilter=THREE.LinearFilter;this.mask.magFilter=THREE.LinearFilter;this.group.name='Marching Cubes excavated terrain';this.mask.needsUpdate=true;
    this.material.onBeforeCompile=shader=>{
      shader.vertexShader='varying float excavationY;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n excavationY=position.y;');
      shader.fragmentShader='varying float excavationY;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\n if(excavationY > -0.008) discard;');
    };
  }
  get craterCount(){return this.cuts.length;}
  heightAt(x:number,z:number){return terrainHeight(this.cuts,x,z);}
  bindSurface(mesh:THREE.Mesh){
    const originals=Array.isArray(mesh.material)?mesh.material:[mesh.material];
    const materials=originals.map(original=>{
      const material=original.clone();
      material.onBeforeCompile=shader=>{
        shader.uniforms.excavation={value:this.mask};
        shader.vertexShader='varying vec3 terrainWorld;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
          vec4 terrainPosition=vec4(transformed,1.0);
          #ifdef USE_INSTANCING
            terrainPosition=instanceMatrix*terrainPosition;
          #endif
          terrainWorld=(modelMatrix*terrainPosition).xyz;`);
        shader.fragmentShader='varying vec3 terrainWorld; uniform sampler2D excavation;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
          vec2 terrainUV=(terrainWorld.xz+240.0)/480.0;
          if(all(greaterThanEqual(terrainUV,vec2(0.0)))&&all(lessThanEqual(terrainUV,vec2(1.0)))&&texture2D(excavation,terrainUV).r < -0.008) discard;`);
      };
      material.customProgramCacheKey=()=> 'excavated-campus-v1';return material;
    });
    mesh.material=Array.isArray(mesh.material)?materials:materials[0];
  }
  impact(center:Vec3,radius:number,depth:number,_source:string){
    if(![center.x,center.y,center.z,radius,depth].every(Number.isFinite))return;
    const cut=makeCut(center,radius,depth);this.cuts.push(cut);
    for(const [x,z] of affectedTiles(cut)){
      const key=`${x},${z}`,old=this.chunks.get(key);if(old){old.geometry.dispose();old.removeFromParent();}
      const mesh=new THREE.Mesh(terrainChunk(this.cuts,x,z),this.material);
      mesh.receiveShadow=true;mesh.castShadow=false;
      // Discard unexcavated parts of the tile so the field markings remain visible.
      this.chunks.set(key,mesh);this.group.add(mesh);
    }
    for(let z=0;z<512;z++)for(let x=0;x<512;x++)this.heights[x+z*512]=this.heightAt((x+.5)/512*480-240,(z+.5)/512*480-240);
    this.mask.needsUpdate=true;
  }
  clear(){for(const mesh of this.chunks.values()){mesh.geometry.dispose();mesh.removeFromParent();}this.chunks.clear();this.cuts=[];this.heights.fill(0);this.mask.needsUpdate=true;}
  dispose(){this.clear();this.mask.dispose();this.material.dispose();}
}
