import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {FractureDust} from '../src/fracture-dust';
describe('fracture dust',()=>{
 it('spreads sideways, settles downward and disappears within 1.2 seconds',()=>{
  const scene=new THREE.Scene(),dust=new FractureDust(scene);
  dust.emit({x:0,y:4,z:0},{x:2,y:2,z:2});
  const sprite=scene.children[0] as THREE.Sprite, origin=sprite.position.clone();
  dust.update(.15);const opacity=sprite.material.opacity;
  expect(sprite.position.x).toBeGreaterThan(origin.x);expect(sprite.position.y).toBeLessThan(origin.y);expect(opacity).toBeGreaterThan(0);
  dust.update(.4);expect(sprite.material.opacity).toBeLessThan(opacity);
  dust.update(.65);expect(scene.children).toHaveLength(0);dust.dispose();
 });
 it('switching off removes existing dust immediately and prevents new emissions',()=>{
  const scene=new THREE.Scene(),dust=new FractureDust(scene),p={x:0,y:2,z:0},size={x:2,y:2,z:2};
  dust.emit(p,size);expect(scene.children.length).toBeGreaterThan(0);
  dust.setEnabled(false);expect(scene.children).toHaveLength(0);dust.emit(p,size);expect(scene.children).toHaveLength(0);
  dust.setEnabled(true);dust.emit(p,size);expect(scene.children.length).toBeGreaterThan(0);dust.dispose();expect(scene.children).toHaveLength(0);
 });
});
