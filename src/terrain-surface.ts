import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import * as THREE from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import type { Vec3 } from './types';
export const TILE = 24;
export interface CraterCut { x: number; z: number; radius: number; depth: number }
export function terrainHeight(cuts: readonly CraterCut[], x: number, z: number): number {
  let height = 0;
  for (const cut of cuts) {
    const r = Math.hypot(x-cut.x,z-cut.z)/cut.radius;
    if(r<1) height = Math.min(height, -cut.depth*(1-r*r)**2);
  }
  return height;
}
export function makeCut(center: Vec3, radius: number, depth: number): CraterCut {
  return {x:center.x,z:center.z,radius:THREE.MathUtils.clamp(radius,2,80),depth:THREE.MathUtils.clamp(depth,.12,14)};
}
export function affectedTiles(cut: CraterCut): Array<[number,number]> {
  const tiles:Array<[number,number]>=[];
  for(let x=Math.max(-10,Math.floor((cut.x-cut.radius)/TILE));x<=Math.min(9,Math.floor((cut.x+cut.radius)/TILE));x++)
    for(let z=Math.max(-10,Math.floor((cut.z-cut.radius)/TILE));z<=Math.min(9,Math.floor((cut.z+cut.radius)/TILE));z++) tiles.push([x,z]);
  return tiles;
}
// Physics and rendering request the same terrain after each impact. Keep one bounded
// generation cache, returning independent buffers so either caller may dispose safely.
let cachedCuts = "";
const chunkCache = new Map<string, THREE.BufferGeometry>();
/** Sample a signed density volume and extract its zero surface with Marching Cubes. */
export function terrainChunk(cuts: readonly CraterCut[], tx:number,tz:number):THREE.BufferGeometry {
  const signature = cuts.map(cut => [cut.x, cut.z, cut.radius, cut.depth].join(",")).join(";");
  if (signature !== cachedCuts) {
    for (const geometry of chunkCache.values()) geometry.dispose();
    chunkCache.clear(); cachedCuts = signature;
  }
  const key = tx + "," + tz;
  const cached = chunkCache.get(key);
  if (cached) return cached.clone();
  const n=28, span=n-3, material=new THREE.MeshStandardMaterial();
  const mc=new MarchingCubes(n,material,false,false,12000);
  mc.isolation=80;
  const localCuts = cuts.filter(cut=>cut.x+cut.radius>=tx*TILE-2 && cut.x-cut.radius<=(tx+1)*TILE+2 && cut.z+cut.radius>=tz*TILE-2 && cut.z-cut.radius<=(tz+1)*TILE+2);
  const heights = new Float64Array(n * n);
  for(let z=0;z<n;z++) for(let x=0;x<n;x++)
    heights[x+z*n]=terrainHeight(localCuts,tx*TILE+(x-1)/span*TILE,tz*TILE+(z-1)/span*TILE);
  for(let z=0;z<n;z++) for(let y=0;y<n;y++) for(let x=0;x<n;x++) {
    const wy=-18+(y-1)/span*20;
    mc.field[x+y*n+z*n*n]=80+(heights[x+z*n]-wy)*10;
  }
  mc.update();
  const count=mc.geometry.drawRange.count, pos=mc.geometry.attributes.position;
  const array=new Float32Array(count*3), colors=new Float32Array(count*3);
  const soil=new THREE.Color(0x69533c), dry=new THREE.Color(0x97815c);
  for(let i=0;i<count;i++) {
    const x=tx*TILE+((pos.getX(i)+1)*n/2-1)/span*TILE;
    const y=-18+((pos.getY(i)+1)*n/2-1)/span*20;
    const z=tz*TILE+((pos.getZ(i)+1)*n/2-1)/span*TILE;
    array.set([x,y,z],i*3);
    const color=soil.clone().lerp(dry,Math.max(0,1+y/3)*.5);
    colors.set([color.r,color.g,color.b],i*3);
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(array,3));
  geo.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const smooth=mergeVertices(geo);smooth.computeVertexNormals();const result=smooth.toNonIndexed();
  geo.dispose();smooth.dispose();mc.geometry.dispose();material.dispose();
  if (chunkCache.size >= 100) {
    const oldest = chunkCache.keys().next().value!;
    chunkCache.get(oldest)!.dispose();chunkCache.delete(oldest);
  }
  chunkCache.set(key,result.clone());
  return result;
}
