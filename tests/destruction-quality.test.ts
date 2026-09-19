import {destructibleScenery} from '../src/destructible-scenery';
import {afterEach,describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {PhysicsSimulation} from '../src/physics';
import {DisasterDirector} from '../src/disasters';
import {terrainChunk,terrainHeight,makeCut} from '../src/terrain-surface';
import type {CampusPart,PartKind} from '../src/types';
import {SolidSmoke} from '../src/solid-smoke';
import {VoxelTerrain} from '../src/voxel-terrain';
const sims:PhysicsSimulation[]=[],directors:DisasterDirector[]=[];
function part(id:string,x:number,y:number,kind:PartKind='wood',supports:string[]=[]):CampusPart{
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,2,1),new THREE.MeshStandardMaterial({color:0xeeeeee}));mesh.position.set(x,y,0);
 return {mesh,spec:{id,position:{x,y,z:0},size:{x:1,y:2,z:1},kind,supports,color:0xeeeeee,anchored:supports.length===0}};
}
async function setup(parts:CampusPart[]){const sim=await PhysicsSimulation.create(parts);sims.push(sim);const scene=new THREE.Scene();const director=new DisasterDirector(scene,sim);directors.push(director);return{sim,director,scene};}
function run(sim:PhysicsSimulation,seconds:number,director?:DisasterDirector){for(let i=0;i<seconds*60;i++){director?.update(1/60);sim.step(1/60);}}
afterEach(()=>{directors.splice(0).forEach(d=>d.dispose());sims.splice(0).forEach(s=>{s.dispose();for(const p of s.parts){p.mesh.geometry.dispose();(p.mesh.material as THREE.Material).dispose();}});});
describe('destruction quality regressions',()=>{
 it('breaks campus paving into movable slabs while leaving distant scenery alone',async()=>{
  const root=new THREE.Group(),road=new THREE.Mesh(new THREE.BoxGeometry(21,.1,7),new THREE.MeshStandardMaterial({color:0x68716d}));road.position.set(40,.05,30);root.add(road);
  const hill=new THREE.Mesh(new THREE.IcosahedronGeometry(20),new THREE.MeshStandardMaterial());hill.position.set(-150,10,-160);root.add(hill);
  const parts:CampusPart[]=[];destructibleScenery(root,parts);expect(parts).toHaveLength(3);expect(hill.parent).toBe(root);
  const {sim,director}=await setup(parts);director.directDestruction('physical',{x:40,y:0,z:30},8,8,.12);run(sim,1);
  expect(parts.some(p=>sim.getState(p.spec.id)!.detached)).toBe(true);
 });
 it('fades older smoke while its size continues growing',()=>{
  const smoke=new SolidSmoke(new THREE.Group(),()=>.5);const matrix=new THREE.Matrix4(),scale=new THREE.Vector3(),pos=new THREE.Vector3(),q=new THREE.Quaternion();
  smoke.update(2,1,25,1);smoke.mesh.getMatrixAt(0,matrix);matrix.decompose(pos,q,scale);const earlySize=scale.x,earlyAlpha=smoke.mesh.geometry.getAttribute('puffOpacity').getX(0);
  smoke.update(8,1,25,1);smoke.mesh.getMatrixAt(0,matrix);matrix.decompose(pos,q,scale);
  expect(scale.x).toBeGreaterThan(earlySize);expect(smoke.mesh.geometry.getAttribute('puffOpacity').getX(0)).toBeLessThan(earlyAlpha);
  smoke.mesh.geometry.dispose();(smoke.mesh.material as THREE.Material).dispose();
 });
 it('melts hot fuel without igniting it and resets the melt state',async()=>{
  const fuel=part('melt-fuel',0,1);const {sim,director}=await setup([fuel]);
  director.directDestruction('melt',{x:0,y:1,z:0},4,10,.2);run(sim,2,director);
  expect(sim.getState('melt-fuel')!.melting).toBe(true);expect(sim.getBurningParts()).toHaveLength(0);
  expect(fuel.mesh.children.some(c=>c.name.startsWith('Attached flame'))).toBe(false);
  sim.reset();expect(sim.getState('melt-fuel')!.melting).toBe(false);
 });
 it('places multiple attached fires on one broad surface and sustains combustion',async()=>{
  const fuel=part('large-fuel',0,1);fuel.spec.size.x=16;fuel.mesh.geometry.dispose();fuel.mesh.geometry=new THREE.BoxGeometry(16,2,1);
  const {sim,director}=await setup([fuel]);
  director.directDestruction('burn',{x:-3,y:2,z:0},8,5,.12);
  director.directDestruction('burn',{x:3,y:2,z:0},8,5,.12);run(sim,12,director);
  expect(fuel.mesh.children.filter(c=>c.name.startsWith('Attached flame')).length).toBeGreaterThanOrEqual(2);
  expect(sim.getState('large-fuel')!.erosion).toBeLessThan(1);
 });
 it('physical destruction also excavates and leaves irregular crater edges',async()=>{
  const {director}=await setup([]);let changes=0;director.onTerrainImpact=()=>changes++;
  director.directDestruction('physical',{x:0,y:0,z:0},8,5,.12);expect(changes).toBe(1);
  const cuts=[makeCut({x:0,y:0,z:0},10,4)];
  expect(terrainHeight(cuts,8,0)).not.toBeCloseTo(terrainHeight(cuts,0,8),3);
 });
 it('drags a selected structural object with physical forces and releases it to gravity',async()=>{
  const {sim}=await setup([part('grabbed',0,1,'column'),part('above',0,5,'slab',['grabbed'])]);
  expect(sim.beginGrab('missing',{x:0,y:1,z:0})).toBe(false);
  expect(sim.beginGrab('grabbed',{x:0,y:1,z:0})).toBe(true);
  sim.moveGrab({x:8,y:10,z:0});run(sim,2);
  const held=sim.getState('grabbed')!;expect(held.position.x).toBeGreaterThan(6);expect(held.position.y).toBeGreaterThan(8);
  expect(sim.getState('above')!.detached).toBe(true);
  sim.endGrab();run(sim,1);expect(sim.getState('grabbed')!.position.y).toBeLessThan(held.position.y-2);
  sim.reset();sim.moveGrab({x:20,y:30,z:0});run(sim,1);expect(sim.getState('grabbed')!.position.x).toBe(0);expect(sim.getState('grabbed')!.detached).toBe(false);
 });

 it('keeps deep excavation visible and lets debris settle below the original surface',async()=>{
  const {sim}=await setup([part('deep-debris',12,1)]);
  expect(sim.deformGround({x:12,y:0,z:0},8,9)).toBe(true);
  expect(sim.deformGround({x:12,y:0,z:0},8,9)).toBe(false);
  run(sim,3);expect(sim.getState('deep-debris')!.position.y).toBeLessThan(-6);
  const terrain=new VoxelTerrain();const cover=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshStandardMaterial());cover.castShadow=true;
  terrain.bindSurface(cover);expect(cover.castShadow).toBe(false);
  terrain.impact({x:12,y:0,z:0},8,9,'test');expect(terrain.heightAt(12,0)).toBe(-9);
  terrain.impact({x:12,y:0,z:0},8,9,'test');expect(terrain.craterCount).toBe(1);
  expect(terrain.group.children.every(child=>child.castShadow)).toBe(true);terrain.dispose();cover.geometry.dispose();(cover.material as THREE.Material).dispose();
 });
 it('turns off terrain changes for both direct tools and meteor impacts',async()=>{
  const {sim,director}=await setup([part('base',0,1,'column')]);let changes=0;director.onTerrainImpact=()=>changes++;director.terrainEnabled=false;
  director.directDestruction('excavate',{x:0,y:0,z:0},8,10,.12);
  expect(sim.getState('base')!.detached).toBe(false);
  director.launch('meteor',{x:0,y:0,z:0},10);run(sim,5,director);expect(changes).toBe(0);
  director.terrainEnabled=true;director.directDestruction('excavate',{x:0,y:0,z:0},8,10,.12);expect(changes).toBe(1);
 });
 it('ignites only a small subset of nearby fuel, excluding fast airborne debris',async()=>{
  const fuel=Array.from({length:12},(_,i)=>part('remnant-'+i,i-6,1));const flying=part('flying',20,5);
  const {sim}=await setup([...fuel,flying]);sim.blast({x:19.8,y:5,z:0},1,300);
  expect(Math.hypot(...Object.values(sim.getState('flying')!.velocity))).toBeGreaterThan(4);
  sim.igniteRemnants({x:0,y:0,z:0},30,3);
  expect(fuel.filter(p=>sim.getState(p.spec.id)!.temperature>185)).toHaveLength(3);
  expect(sim.getState('flying')!.temperature).toBe(20);
 });
 it('renders varied smoke clusters that fade by age without shrinking',()=>{
  const parent=new THREE.Group();let seed=1;const smoke=new SolidSmoke(parent,()=>((seed=seed*16807%2147483647)/2147483647));
  smoke.update(6,2,15,1);const material=smoke.mesh.material as THREE.MeshStandardMaterial;
  expect(material.transparent).toBe(true);expect(material.opacity).toBe(1);expect(parent.children).toHaveLength(1);
  const scales=new Set<number>(),matrix=new THREE.Matrix4(),position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();
  for(let i=0;i<smoke.mesh.count;i++){smoke.mesh.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);if(scale.x>.001)scales.add(Math.round(scale.x*100));}
  expect(scales.size).toBeGreaterThan(8);
  const opacity=smoke.mesh.geometry.getAttribute("puffOpacity");expect(Array.from(opacity.array).some(v=>v>0&&v<.8)).toBe(true);smoke.mesh.geometry.dispose();material.dispose();
 });

 it('extracts a below-grade rounded density surface, including overlapping cuts',()=>{
  const cuts=[makeCut({x:12,y:0,z:12},8,3),makeCut({x:15,y:0,z:12},4,4)];
  const geometry=terrainChunk(cuts,0,0),p=geometry.attributes.position;
  const heights=Array.from({length:p.count},(_,i)=>p.getY(i));
  expect(Math.min(...heights)).toBeLessThan(-3.5);expect(terrainHeight(cuts,15,12)).toBe(-4);
  expect(heights.every(Number.isFinite)).toBe(true);geometry.dispose();
 });
 it('lets debris fall below the original flat ground and restores ground on reset',async()=>{
  const {sim}=await setup([part('debris',0,1)]);
  sim.deformGround({x:0,y:0,z:0},10,3);
  sim.blast({x:0,y:1,z:0},2,100,{impulseScale:0});run(sim,3);
  expect(sim.getState('debris')!.position.y).toBeLessThan(-1);
  sim.reset();sim.blast({x:0,y:1,z:0},2,100,{impulseScale:0});run(sim,3);
  expect(sim.getState('debris')!.position.y).toBeGreaterThan(.4);
 });
 it('removes foundation support when the soil underneath is excavated',async()=>{
  const {sim}=await setup([part('base',0,1,'column'),part('upper',0,4,'slab',['base'])]);
  sim.deformGround({x:0,y:0,z:0},8,3);
  expect(sim.getState('base')!.detached).toBe(true);expect(sim.getState('upper')!.detached).toBe(false);
  run(sim,2);expect(sim.getState('upper')!.detached).toBe(true);expect(sim.getState('upper')!.position.y).toBeLessThan(3);
 });
 it('does not corrode or propel dry objects before the wave arrives',async()=>{
  const {sim}=await setup([part('dry',0,1)]);const dry=()=>-.15;
  sim.corrode({x:0,y:1,z:0},10,2,dry);sim.water(10,{x:30,y:0,z:0},1,dry);run(sim,1);
  expect(sim.getState('dry')!.corrosion).toBe(0);expect(sim.getState('dry')!.damage).toBe(0);expect(sim.getState('dry')!.velocity.y).toBe(0);
 });
 it('corrosion crumbles a support before gravity releases the member above',async()=>{
  const support=part('support',0,1),upper=part('upper',0,5,'slab',['support']);const {sim}=await setup([support,upper]);
  sim.corrode({x:0,y:1,z:0},1,.8);expect(sim.getState('support')!.corrosion).toBeGreaterThan(.5);expect(upper.mesh.visible).toBe(true);
  for(let i=0;i<35;i++)sim.corrode({x:0,y:1,z:0},1,.25);
  expect(sim.getState('support')!.erosion).toBe(1);expect(support.mesh.visible).toBe(false);
  run(sim,2);expect(sim.getState('upper')!.detached).toBe(true);expect(sim.getState('upper')!.position.y).toBeLessThan(4);
  sim.reset();expect(support.mesh.visible).toBe(true);expect(support.mesh.scale.x).toBe(1);
 });
 it('ignites visible surface flames without launching a timed disaster',async()=>{
  const fuel=part('fuel',0,1);const {sim,director}=await setup([fuel]);
  director.directDestruction('burn',{x:0,y:1,z:0},6,3,.12);run(sim,.5,director);
  expect(director.effects).toHaveLength(0);expect(fuel.mesh.children.some(c=>c.name.startsWith('Attached flame'))).toBe(true);
  expect(sim.getState('fuel')!.temperature).toBeGreaterThan(260);
  director.reset();expect(fuel.mesh.children).toHaveLength(0);
 });
 it('mutation changes geometry and is restored on reset',async()=>{
  const target=part('target',0,1,'wall');const original=target.mesh.geometry;const {sim,director}=await setup([target]);
  director.directDestruction('mutation',{x:0,y:1,z:0},4,10,.12);
  expect(sim.getState('target')!.mutation).toBeGreaterThan(0);expect(target.mesh.geometry).not.toBe(original);expect(director.effects).toHaveLength(0);
  sim.reset();expect(target.mesh.geometry).toBe(original);expect(sim.getState('target')!.mutation).toBe(0);
 });
 it('a tractor field lifts detached debris without damaging intact members',async()=>{
  const {sim}=await setup([part('loose',0,1),part('intact',8,1,'column')]);sim.blast({x:0,y:1,z:0},1,100,{impulseScale:0});
  for(let i=0;i<120;i++){sim.attractDebris({x:0,y:20,z:0},50,40,1/60);sim.step(1/60);}
  expect(sim.getState('loose')!.position.y).toBeGreaterThan(3);expect(sim.getState('intact')!.damage).toBe(0);
 });
 it.each([0,17,90,225])('keeps the visible wave crest aligned with direction %s',async(direction)=>{
  const {director,scene}=await setup([]);
  director.launch('tsunami',{x:0,y:0,z:0},3,{direction,width:4,speed:18,height:8});
  for(let i=0;i<30;i++)director.update(.1);
  const water=scene.children.find(object=>object instanceof THREE.Mesh && object.geometry instanceof THREE.PlaneGeometry) as THREE.Mesh;
  const pos=water.geometry.attributes.position;
  expect(Math.max(...Array.from({length:pos.count},(_,i)=>pos.getY(i)))).toBeGreaterThan(4);
 });
 it('empty space never produces a fire emitter',async()=>{
  const {sim,director}=await setup([]);director.launch('fire',{x:0,y:40,z:0},3);run(sim,1,director);expect((director as unknown as {surfaceFires:Map<string,unknown>}).surfaceFires.size).toBe(0);
 });
});
