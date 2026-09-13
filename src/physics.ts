import RAPIER from "@dimforge/rapier3d-compat";
import * as THREE from "three";
import type { CampusPart, PartKind, PhysicsStats, Vec3 } from "./types";

/** SI geometry/gravity with deliberately game-scaled failure capacities, not an engineering solver. */
const FIXED_DT = 1 / 60;
const SUPPORT_INTERVAL = 0.12;
const AMBIENT_TEMPERATURE = 20;
const SUPPORT_CAPACITY = 0.4;
const CELL_SIZE = 8;

interface MaterialProperties {
  density: number;
  strength: number;
  heatLimit: number;
  ignition?: number;
}

const MATERIALS: Record<PartKind, MaterialProperties> = {
  wall: { density: 1_800, strength: 1, heatLimit: 450 },
  slab: { density: 2_300, strength: 1.3, heatLimit: 500 },
  column: { density: 2_400, strength: 1.5, heatLimit: 500 },
  glass: { density: 2_500, strength: 0.24, heatLimit: 140 },
  detail: { density: 950, strength: 0.52, heatLimit: 350 },
  roof: { density: 1_600, strength: 0.9, heatLimit: 450 },
  wood: { density: 580, strength: 0.42, heatLimit: 200, ignition: 260 },
};

export interface PartPhysicsState {
  readonly id: string;
  readonly detached: boolean;
  readonly damage: number;
  readonly temperature: number;
  readonly position: Vec3;
  readonly velocity: Vec3;
}

interface PartRecord {
  part: CampusPart;
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  mass: number;
  volume: number;
  damage: number;
  temperature: number;
  detached: boolean;
  impactSpeed: number;
  unsupportedFor: number;
  collapseDelay: number;
  supports: PartRecord[];
  neighbors: PartRecord[];
  startPosition: THREE.Vector3;
  startRotation: THREE.Quaternion;
  originalMaterial: THREE.Material | THREE.Material[];
  materials: THREE.Material[];
  baseColors: Array<THREE.Color | undefined>;
  appearanceDamage: number;
  appearanceTemperature: number;
}

let rapierReady: Promise<void> | undefined;
const clamp = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, value));
const finiteVec = (v: Vec3): boolean =>
  Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);

function stableHash(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++)
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0) / 4294967296;
}

function hasColor(
  material: THREE.Material,
): material is THREE.MeshStandardMaterial {
  return (
    "color" in material &&
    (material as THREE.MeshStandardMaterial).color instanceof THREE.Color
  );
}

export class PhysicsSimulation {
  readonly parts: CampusPart[];
  elapsed = 0;
  private world!: RAPIER.World;
  private events!: RAPIER.EventQueue;
  private records: PartRecord[] = [];
  private byId = new Map<string, PartRecord>();
  private byCollider = new Map<number, PartRecord>();
  private dynamicRecords = new Set<PartRecord>();
  private accumulator = 0;
  private supportClock = 0;
  private disposed = false;

  private constructor(parts: CampusPart[]) {
    this.parts = parts;
  }

  static async create(parts: CampusPart[]): Promise<PhysicsSimulation> {
    rapierReady ??= RAPIER.init();
    await rapierReady;
    const ids = new Set<string>();
    for (const { spec } of parts) {
      if (ids.has(spec.id))
        throw new Error(`Duplicate physics part id: ${spec.id}`);
      ids.add(spec.id);
      if (
        !finiteVec(spec.position) ||
        !finiteVec(spec.size) ||
        Math.min(spec.size.x, spec.size.y, spec.size.z) <= 0
      ) {
        throw new Error(`Invalid physics dimensions for ${spec.id}`);
      }
    }
    for (const { spec } of parts) {
      for (const support of spec.supports) {
        if (!ids.has(support))
          throw new Error(`Unknown support ${support} for ${spec.id}`);
        if (support === spec.id)
          throw new Error(`Part ${spec.id} cannot support itself`);
      }
    }
    const simulation = new PhysicsSimulation(parts);
    simulation.initialize();
    return simulation;
  }

  private initialize(): void {
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.world.timestep = FIXED_DT;
    this.events = new RAPIER.EventQueue(true);
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(350, 0.5, 350)
        .setTranslation(0, -0.5, 0)
        .setFriction(0.82)
        .setRestitution(0.04),
    );

    for (const part of this.parts) {
      const { spec, mesh } = part;
      const material = MATERIALS[spec.kind];
      const volume = spec.size.x * spec.size.y * spec.size.z;
      const body = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed()
          .setTranslation(spec.position.x, spec.position.y, spec.position.z)
          .setRotation(mesh.quaternion)
          .setLinearDamping(0.15)
          .setAngularDamping(0.35)
          .setCcdEnabled(true),
      );
      const collider = this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(
          spec.size.x / 2,
          spec.size.y / 2,
          spec.size.z / 2,
        )
          .setDensity(material.density)
          .setFriction(spec.kind === "glass" ? 0.42 : 0.76)
          .setRestitution(spec.kind === "glass" ? 0.08 : 0.025)
          .setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS)
          .setContactForceEventThreshold(1_500),
        body,
      );
      const originalMaterial = mesh.material;
      const materials = (
        Array.isArray(originalMaterial) ? originalMaterial : [originalMaterial]
      ).map((m) => m.clone());
      mesh.material = Array.isArray(originalMaterial)
        ? materials
        : materials[0];
      const record: PartRecord = {
        part,
        body,
        collider,
        volume,
        mass: volume * material.density,
        damage: 0,
        temperature: AMBIENT_TEMPERATURE,
        detached: false,
        impactSpeed: 0,
        unsupportedFor: 0,
        collapseDelay: 0.26 + stableHash(spec.id) * 0.5,
        supports: [],
        neighbors: [],
        startPosition: mesh.position.clone(),
        startRotation: mesh.quaternion.clone(),
        originalMaterial,
        materials,
        baseColors: materials.map((m) =>
          hasColor(m) ? m.color.clone() : undefined,
        ),
        appearanceDamage: 0,
        appearanceTemperature: AMBIENT_TEMPERATURE,
      };
      this.records.push(record);
      this.byId.set(spec.id, record);
      this.byCollider.set(collider.handle, record);
    }
    for (const record of this.records) {
      record.supports = [...new Set(record.part.spec.supports)].map(
        (id) => this.byId.get(id)!,
      );
    }
    this.cacheNeighbors();
  }

  /** Cache local thermal contacts once. Dynamic neighbors are distance-checked before heat transfer. */
  private cacheNeighbors(): void {
    const cells = new Map<string, PartRecord[]>();
    for (const record of this.records) {
      const p = record.startPosition;
      const key = `${Math.floor(p.x / CELL_SIZE)},${Math.floor(p.y / CELL_SIZE)},${Math.floor(p.z / CELL_SIZE)}`;
      const cell = cells.get(key) ?? [];
      cell.push(record);
      cells.set(key, cell);
    }
    for (const record of this.records) {
      const p = record.startPosition;
      const cx = Math.floor(p.x / CELL_SIZE),
        cy = Math.floor(p.y / CELL_SIZE),
        cz = Math.floor(p.z / CELL_SIZE);
      for (let x = cx - 1; x <= cx + 1; x++)
        for (let y = cy - 1; y <= cy + 1; y++)
          for (let z = cz - 1; z <= cz + 1; z++) {
            for (const candidate of cells.get(`${x},${y},${z}`) ?? []) {
              if (
                candidate !== record &&
                p.distanceToSquared(candidate.startPosition) < 64
              )
                record.neighbors.push(candidate);
            }
          }
    }
  }

  step(dt: number): void {
    if (this.disposed || !Number.isFinite(dt) || dt <= 0) return;
    this.accumulator += Math.min(dt, 0.1);
    while (this.accumulator + 1e-9 >= FIXED_DT) {
      this.accumulator -= FIXED_DT;
      this.elapsed += FIXED_DT;
      for (const record of this.dynamicRecords) {
        const velocity = record.body.linvel();
        record.impactSpeed = Math.hypot(velocity.x, velocity.y, velocity.z);
      }
      this.world.step(this.events);
      this.processContacts();
      this.supportClock += FIXED_DT;
      if (this.supportClock + 1e-9 >= SUPPORT_INTERVAL) {
        const tick = this.supportClock;
        this.supportClock = 0;
        this.updateThermal(tick);
        this.updateSupports(tick);
        this.updateAppearance();
      }
      for (const record of this.dynamicRecords) {
        const position = record.body.translation();
        record.part.mesh.position.set(position.x, position.y, position.z);
        record.part.mesh.quaternion.copy(record.body.rotation());
      }
    }
  }

  private processContacts(): void {
    this.events.drainContactForceEvents((event) => {
      const first = this.byCollider.get(event.collider1());
      const second = this.byCollider.get(event.collider2());
      if (!first || !second || first.detached === second.detached) return;
      const intact = first.detached ? second : first;
      const moving = first.detached ? first : second;
      // Static debris weight must not behave like an endless impact. Require actual motion.
      // Use velocity before the solver: a heavy slab may have already stopped at contact.
      if (moving.impactSpeed < 1.1) return;
      const equivalentVelocity =
        (event.totalForceMagnitude() * FIXED_DT) / Math.max(intact.mass, 1);
      if (equivalentVelocity > 0.75) {
        this.damagePart(
          intact,
          Math.min(0.32, (equivalentVelocity - 0.75) * 0.075) /
            MATERIALS[intact.part.spec.kind].strength,
        );
      }
    });
  }

  private damagePart(record: PartRecord, amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    record.damage = clamp(record.damage + amount, 0, 1);
    if (record.damage >= 1 && !record.detached) this.detach(record);
  }

  private detach(record: PartRecord): void {
    if (record.detached) return;
    record.detached = true;
    record.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
    record.body.recomputeMassPropertiesFromColliders();
    record.body.enableCcd(true);
    // Small repeatable asymmetry prevents impossible perfectly balanced columns after release.
    const tilt = stableHash(record.part.spec.id) - 0.5;
    record.body.applyTorqueImpulse(
      { x: tilt * record.mass * 0.07, y: 0, z: -tilt * record.mass * 0.05 },
      true,
    );
    this.dynamicRecords.add(record);
  }

  private updateSupports(dt: number): void {
    const toDetach: PartRecord[] = [];
    for (const record of this.records) {
      if (
        record.detached ||
        record.part.spec.anchored ||
        record.supports.length === 0
      )
        continue;
      let available = 0;
      for (const support of record.supports) {
        if (!support.detached) available += Math.max(0, 1 - support.damage);
      }
      if (available / record.supports.length < SUPPORT_CAPACITY) {
        record.unsupportedFor += dt;
        if (record.unsupportedFor >= record.collapseDelay)
          toDetach.push(record);
      } else {
        record.unsupportedFor = 0;
      }
    }
    // Evaluate every member against the same support state, then release together.
    for (const record of toDetach) this.detach(record);
  }

  /** Radial impulse and local failure. power is an authored game intensity, not explosive yield. */
  blast(center: Vec3, radius: number, power: number): void {
    if (
      this.disposed ||
      !finiteVec(center) ||
      !Number.isFinite(radius) ||
      !Number.isFinite(power) ||
      radius <= 0 ||
      power <= 0
    )
      return;
    for (const record of this.records) {
      const p = record.body.translation();
      const dx = p.x - center.x,
        dy = p.y - center.y,
        dz = p.z - center.z;
      const distance = Math.hypot(dx, dy, dz);
      const edgeDistance = Math.max(
        0,
        distance -
          Math.min(
            record.part.spec.size.x,
            record.part.spec.size.y,
            record.part.spec.size.z,
          ) *
            0.5,
      );
      if (edgeDistance >= radius) continue;
      const falloff = (1 - edgeDistance / radius) ** 1.3;
      const strength = MATERIALS[record.part.spec.kind].strength;
      this.damagePart(record, (power * falloff) / (65 * strength));
      if (!record.detached) continue;
      const normalizer = Math.max(0.5, distance);
      const velocity = Math.min(28, power * 0.14) * falloff;
      record.body.applyImpulse(
        {
          x: (dx / normalizer) * velocity * record.mass,
          y: ((dy / normalizer) * velocity + 2.5 * falloff) * record.mass,
          z: (dz / normalizer) * velocity * record.mass,
        },
        true,
      );
    }
  }

  earthquake(dt: number, strength: number): void {
    if (!this.validEffect(dt, strength)) return;
    const time = this.elapsed;
    const ax =
      strength * (Math.sin(time * 13.1) + 0.47 * Math.sin(time * 23.7 + 0.8));
    const az =
      strength *
      (0.8 * Math.sin(time * 10.7 + 1.2) + 0.38 * Math.sin(time * 29.1));
    const acceleration = Math.hypot(ax, az);
    for (const record of this.records) {
      if (record.detached) {
        // Inertial forcing in the shaking ground reference frame.
        record.body.applyImpulse(
          { x: -ax * record.mass * dt, y: 0, z: -az * record.mass * dt },
          true,
        );
      } else {
        const heightFactor = 0.72 + Math.max(0, record.startPosition.y) * 0.065;
        const load = Math.max(0, acceleration * heightFactor - 1.7);
        this.damagePart(
          record,
          (dt * load * 0.035) / MATERIALS[record.part.spec.kind].strength,
        );
      }
    }
  }

  heat(center: Vec3, radius: number, amount: number): void {
    if (
      this.disposed ||
      !finiteVec(center) ||
      !Number.isFinite(radius) ||
      !Number.isFinite(amount) ||
      radius <= 0 ||
      amount <= 0
    )
      return;
    for (const record of this.records) {
      const p = record.body.translation();
      const distance = Math.hypot(
        p.x - center.x,
        p.y - center.y,
        p.z - center.z,
      );
      if (distance < radius) {
        record.temperature = Math.min(
          1_200,
          record.temperature + amount * 18 * (1 - distance / radius),
        );
      }
    }
  }

  private updateThermal(dt: number): void {
    // Apply spread simultaneously so array order cannot make heat traverse a whole building in one tick.
    const transfers = new Map<PartRecord, number>();
    for (const record of this.records) {
      const material = MATERIALS[record.part.spec.kind];
      const burning =
        material.ignition !== undefined &&
        record.temperature >= material.ignition;
      if (burning && record.damage < 1) {
        record.temperature = Math.min(1_000, record.temperature + 115 * dt);
        const p = record.body.translation();
        for (const neighbor of record.neighbors) {
          const q = neighbor.body.translation();
          const distance = Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
          if (distance < 6)
            transfers.set(
              neighbor,
              (transfers.get(neighbor) ?? 0) + 95 * (1 - distance / 6) * dt,
            );
        }
      }
      if (record.temperature > material.heatLimit) {
        const overload = (record.temperature - material.heatLimit) / 400;
        this.damagePart(
          record,
          (overload * dt * (material.ignition ? 0.12 : 0.065)) /
            material.strength,
        );
      }
      record.temperature = Math.max(
        AMBIENT_TEMPERATURE,
        record.temperature -
          (record.temperature - AMBIENT_TEMPERATURE) * 0.025 * dt,
      );
    }
    for (const [record, heat] of transfers)
      record.temperature = Math.min(1_200, record.temperature + heat);
  }

  water(
    height: number,
    velocity: Vec3,
    dt: number,
    surface?: (position: Vec3) => number,
  ): void {
    if (
      this.disposed ||
      !Number.isFinite(height) ||
      !finiteVec(velocity) ||
      !Number.isFinite(dt) ||
      dt <= 0
    )
      return;
    const flowSquared = velocity.x ** 2 + velocity.z ** 2;
    for (const record of this.records) {
      const p = record.body.translation();
      const { size, kind } = record.part.spec;
      const localHeight = surface ? surface(p) : height;
      if (!Number.isFinite(localHeight)) continue;
      const submerged = clamp(
        (localHeight - (p.y - size.y / 2)) / size.y,
        0,
        1,
      );
      if (submerged <= 0) continue;
      record.temperature +=
        (AMBIENT_TEMPERATURE - record.temperature) *
        Math.min(1, dt * submerged * 2.4);
      if (!record.detached) {
        const load = (0.003 + flowSquared * 0.0035) * submerged;
        this.damagePart(record, (dt * load) / MATERIALS[kind].strength);
      }
      if (!record.detached) continue;
      const v = record.body.linvel();
      const rx = velocity.x - v.x,
        ry = velocity.y - v.y,
        rz = velocity.z - v.z;
      const fx = 500 * size.y * size.z * submerged * rx * Math.abs(rx);
      const fz = 500 * size.y * size.x * submerged * rz * Math.abs(rz);
      const fy =
        1_000 * 9.81 * record.volume * submerged +
        500 * size.x * size.z * submerged * ry * Math.abs(ry);
      // Bound the explicit drag impulse to remain stable for thin fragments at high flows.
      const forceLimit = record.mass * 40;
      record.body.applyImpulse(
        {
          x: clamp(fx, -forceLimit, forceLimit) * dt,
          y: clamp(fy, -forceLimit, forceLimit) * dt,
          z: clamp(fz, -forceLimit, forceLimit) * dt,
        },
        true,
      );
    }
  }

  vortex(center: Vec3, strength: number, dt: number): void {
    if (!this.validEffect(dt, strength) || !finiteVec(center)) return;
    for (const record of this.records) {
      const p = record.body.translation();
      const dx = center.x - p.x,
        dy = center.y - p.y,
        dz = center.z - p.z;
      const distance = Math.hypot(dx, dy, dz);
      if (distance > 70) continue;
      const influence = Math.max(0, 1 - distance / 70);
      this.damagePart(
        record,
        (dt * strength * influence * 0.2) /
          MATERIALS[record.part.spec.kind].strength,
      );
      if (!record.detached) continue;
      const divisor = Math.max(3, distance);
      const force = strength * influence * record.mass * dt;
      record.body.applyImpulse(
        {
          x: ((dx * 8 - dz * 5) / divisor) * force,
          y: ((dy * 8) / divisor + 2) * force,
          z: ((dz * 8 + dx * 5) / divisor) * force,
        },
        true,
      );
    }
  }

  private validEffect(dt: number, strength: number): boolean {
    return (
      !this.disposed &&
      Number.isFinite(dt) &&
      dt > 0 &&
      Number.isFinite(strength) &&
      strength > 0
    );
  }

  private updateAppearance(): void {
    for (const record of this.records) {
      if (
        record.damage === record.appearanceDamage &&
        record.temperature === record.appearanceTemperature
      )
        continue;
      record.appearanceDamage = record.damage;
      record.appearanceTemperature = record.temperature;
      for (let i = 0; i < record.materials.length; i++) {
        const material = record.materials[i];
        const base = record.baseColors[i];
        if (!base || !hasColor(material)) continue;
        const scorch = clamp((record.temperature - 220) / 900, 0, 0.7);
        material.color
          .copy(base)
          .multiplyScalar(1 - record.damage * 0.24 - scorch * 0.48);
        if (
          "emissive" in material &&
          MATERIALS[record.part.spec.kind].ignition &&
          record.temperature > 260 &&
          record.damage < 1
        ) {
          material.emissive.setRGB(0.38, 0.06, 0.004);
        } else if ("emissive" in material) {
          material.emissive.setRGB(0, 0, 0);
        }
      }
    }
  }

  getState(id: string): PartPhysicsState | undefined {
    if (this.disposed) return undefined;
    const record = this.byId.get(id);
    if (!record) return undefined;
    return {
      id,
      detached: record.detached,
      damage: record.damage,
      temperature: record.temperature,
      position: { ...record.body.translation() },
      velocity: { ...record.body.linvel() },
    };
  }

  get stats(): PhysicsStats {
    let moving = 0,
      burning = 0,
      remaining = 0,
      weight = 0;
    for (const record of this.records) {
      const significance =
        record.part.spec.kind === "glass" || record.part.spec.kind === "detail"
          ? 0.25
          : 1;
      weight += significance;
      remaining += (record.detached ? 0 : 1 - record.damage) * significance;
      if (!this.disposed && record.detached && !record.body.isSleeping()) {
        const v = record.body.linvel();
        if (v.x ** 2 + v.y ** 2 + v.z ** 2 > 0.04) moving++;
      }
      const ignition = MATERIALS[record.part.spec.kind].ignition;
      if (
        ignition !== undefined &&
        record.temperature >= ignition &&
        record.damage < 1
      )
        burning++;
    }
    return {
      total: this.records.length,
      detached: this.dynamicRecords.size,
      moving,
      burning,
      integrity: weight === 0 ? 100 : Math.round((100 * remaining) / weight),
    };
  }

  reset(): void {
    if (this.disposed) return;
    this.elapsed = 0;
    this.accumulator = 0;
    this.supportClock = 0;
    // Rebuild the world as well as the visible parts, clearing contact warm starts and sleep islands.
    // This makes repeated runs deterministic even after an earlier run left resting rubble.
    for (const record of this.records) {
      record.part.mesh.position.copy(record.startPosition);
      record.part.mesh.quaternion.copy(record.startRotation);
      record.part.mesh.material = record.originalMaterial;
      for (const material of record.materials) material.dispose();
    }
    this.events.free();
    this.world.free();
    this.records = [];
    this.byId.clear();
    this.byCollider.clear();
    this.dynamicRecords.clear();
    this.initialize();
  }

  dispose(): void {
    if (this.disposed) return;
    for (const record of this.records) {
      record.part.mesh.material = record.originalMaterial;
      for (const material of record.materials) material.dispose();
    }
    this.events.free();
    this.world.free();
    this.dynamicRecords.clear();
    this.byCollider.clear();
    this.disposed = true;
  }
}
