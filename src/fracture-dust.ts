import * as THREE from 'three';
import type { Vec3 } from './types';

interface DustPuff {
  sprite: THREE.Sprite;
  velocity: THREE.Vector3;
  age: number;
  lifetime: number;
  size: number;
}

/** Short, sideways settling dust. It has no buoyancy or rising smoke column. */
export class FractureDust {
  private enabled = true;
  private puffs: DustPuff[] = [];
  private texture: THREE.DataTexture;
  constructor(private scene: THREE.Scene) {
    const pixels = new Uint8Array(64 * 64 * 4);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const r = Math.hypot((x + .5) / 32 - 1, (y + .5) / 32 - 1);
      const alpha = Math.max(0, 1 - r) ** 1.5;
      pixels.set([255, 255, 255, Math.round(alpha * 210)], (x + y * 64) * 4);
    }
    this.texture = new THREE.DataTexture(pixels, 64, 64);
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.needsUpdate = true;
  }
  setEnabled(value: boolean): void {
    this.enabled = value;
    if (!value) this.clear();
  }
  emit(position: Vec3, dimensions: Vec3): void {
    if (!this.enabled || ![position.x, position.y, position.z].every(Number.isFinite)) return;
    const spread = THREE.MathUtils.clamp(Math.max(dimensions.x, dimensions.z) * .3, .6, 4);
    for (let i = 0; i < 5; i++) {
      const angle = i * Math.PI * 2 / 5 + position.x * .17;
      const material = new THREE.SpriteMaterial({
        map: this.texture, color: 0xc5c0b5, transparent: true,
        opacity: 0, depthWrite: false, toneMapped: false,
      });
      material.rotation = angle;
      const sprite = new THREE.Sprite(material);
      sprite.name = 'Short settling fracture dust';
      sprite.position.set(position.x + Math.cos(angle) * spread * .2, position.y, position.z + Math.sin(angle) * spread * .2);
      this.scene.add(sprite);
      this.puffs.push({sprite, velocity: new THREE.Vector3(Math.cos(angle) * (2 + spread), -.2, Math.sin(angle) * (2 + spread)), age: 0, lifetime: .7 + i * .1, size: 1.6 + spread});
    }
    while (this.puffs.length > 240) this.remove(this.puffs.shift()!);
  }
  update(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const puff = this.puffs[i];
      puff.age += dt;
      if (puff.age >= puff.lifetime) { this.remove(puff); this.puffs.splice(i, 1); continue; }
      const phase = puff.age / puff.lifetime;
      puff.velocity.x *= Math.exp(-1.3 * dt);
      puff.velocity.z *= Math.exp(-1.3 * dt);
      puff.velocity.y -= .8 * dt;
      puff.sprite.position.addScaledVector(puff.velocity, dt);
      const width = puff.size * (1 + phase * 2.3);
      puff.sprite.scale.set(width, width * .42, 1);
      puff.sprite.material.opacity = .32 * Math.min(1, phase / .12) * (1 - phase) ** 1.7;
    }
  }
  private remove(puff: DustPuff): void {
    puff.sprite.removeFromParent();
    puff.sprite.material.dispose();
  }
  clear(): void { for (const puff of this.puffs) this.remove(puff); this.puffs = []; }
  dispose(): void { this.clear(); this.texture.dispose(); }
}
