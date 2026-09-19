import {afterEach,describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {PhysicsSimulation} from '../src/physics';
import {DisasterDirector} from '../src/disasters';
import {terrainChunk,terrainHeight,makeCut} from '../src/terrain-surface';
import type {CampusPart,PartKind} from '../src/types';
const sims:PhysicsSimulation[]=[],directors:DisasterDirector[]=[];
function part(id:string,x:number,y:number,kind:PartKind='wood',supports:string[]=[]):CampusPart{
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,2,1),new THREE.MeshStandardMaterial({color:0xeeeeee}));mesh.position.set(x,y,0);
 return {mesh,spec:{id,position:{x,y,z:0},size:{x:1,y:2,z:1},kind,supports,color:0xeeeeee,anchored:supports.length===0}};
}
async function setup(parts:CampusPart[]){const sim=await PhysicsSimulation.create(parts);sims.push(sim);const scene=new THREE.Scene();const director=new DisasterDirector(scene,sim);directors.push(director);return{sim,director,scene};}
function run(sim:PhysicsSimulation,seconds:number,director?:DisasterDirector){for(let i=0;i<seconds*60;i++){director?.update(1/60);sim.step(1/60);}}
afterEach(()=>{directors.splice(0).forEach(d=>d.dispose());sims.splice(0).forEach(s=>{s.dispose();for(const p of s.parts){p.mesh.geometry.dispose();(p.mesh.material as THREE.Material).dispose();}});});
describe('destruction quality regressions',()=>{
 it('extracts a below-grade rounded density surface, including overlapping cuts',()=>{
  const cuts=[makeCut({x:12,y:0,z:12},8,3),makeCut({x:15,y:0,z:12},4,4)];
  const geometry=terrainChunk(cuts,0,0),p=geometry.attributes.position;
  const heights=Array.from({length:p.count},(_,i)=>p.getY(i));
  expect(Math.min(...heights)).toBeLessThan(-3.8);expect(terrainHeight(cuts,15,12)).toBe(-4);
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
