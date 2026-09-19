import * as THREE from 'three';
export interface WearUniforms { corrosion:{value:number}; erosion:{value:number} }
export function applySurfaceWear(material:THREE.Material):WearUniforms {
  const uniforms={corrosion:{value:0},erosion:{value:0}};
  material.onBeforeCompile=shader=>{
    shader.uniforms.surfaceCorrosion=uniforms.corrosion;shader.uniforms.surfaceErosion=uniforms.erosion;
    shader.vertexShader='varying vec3 wearPosition;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n wearPosition=position;');
    shader.fragmentShader='varying vec3 wearPosition; uniform float surfaceCorrosion; uniform float surfaceErosion;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec3 cell=floor(wearPosition*9.0);
      float pits=fract(sin(dot(cell,vec3(12.9898,78.233,39.425)))*43758.5453);
      float wearPatch=smoothstep(0.25,0.85,pits)*surfaceCorrosion;
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.24,0.16,0.07),wearPatch*0.8);
      if(surfaceErosion>0.08 && pits<surfaceErosion*0.55)discard;`);
  };
  material.customProgramCacheKey=()=> 'progressive-surface-wear-v1';return uniforms;
}
