import * as THREE from 'three';

/** Scrolling hot seams under a cooling crust, shared by visible lava streams. */
export function lavaMaterial():THREE.MeshStandardMaterial {
  const material=new THREE.MeshStandardMaterial({color:0x8f3014,emissive:0xff4510,emissiveIntensity:.8,roughness:.7,side:THREE.DoubleSide});
  const time={value:0};material.userData.flowTime=time;
  material.onBeforeCompile=shader=>{
    shader.uniforms.flowTime=time;
    shader.vertexShader='varying vec3 lavaPosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nlavaPosition=position;');
    shader.fragmentShader='varying vec3 lavaPosition; uniform float flowTime;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec2 q=lavaPosition.xz*.8;
      float seams=sin(q.x*2.1+sin(q.y*1.3-flowTime*.8))*sin(q.y*1.8-flowTime*.6+sin(q.x));
      float molten=1.0-smoothstep(.12,.55,abs(seams));
      diffuseColor.rgb=mix(vec3(.12,.032,.012),vec3(.95,.19,.012),molten);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance *= molten*.8+.04;');
  };
  material.customProgramCacheKey=()=> 'flowing-lava-crust-v1';return material;
}
