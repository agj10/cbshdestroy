import { afterEach, describe, expect, it } from "vitest";
import * as THREE from "three";
import { buildCampus } from "../src/campus";
import { PhysicsSimulation } from "../src/physics";
import type { CampusPart, Vec3 } from "../src/types";

const resources: Array<{
  simulation: PhysicsSimulation;
  group: THREE.Object3D;
}> = [];

async function campusSimulation() {
  const campus = buildCampus();
  const simulation = await PhysicsSimulation.create(campus.parts);
  resources.push({ simulation, group: campus.group });
  return { campus, simulation };
}

async function isolatedParts(positions: Vec3[]) {
  const group = new THREE.Group();
  const parts: CampusPart[] = positions.map((position, index) => {
    const size = { x: 1, y: 1, z: 1 };
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial(),
    );
    mesh.position.copy(position);
    group.add(mesh);
    return {
      mesh,
      spec: {
        id: `part-${index}`,
        kind: "wall",
        size,
        position,
        color: 0xffffff,
        supports: [],
        anchored: true,
      },
    };
  });
  const simulation = await PhysicsSimulation.create(parts);
  resources.push({ simulation, group });
  return simulation;
}

function run(simulation: PhysicsSimulation, seconds: number) {
  for (let frame = 0; frame < Math.round(seconds * 60); frame++)
    simulation.step(1 / 60);
}

function assertFiniteMotion(simulation: PhysicsSimulation) {
  for (const { spec, mesh } of simulation.parts) {
    const state = simulation.getState(spec.id)!;
    expect(Object.values(state.position).every(Number.isFinite)).toBe(true);
    expect(Object.values(state.velocity).every(Number.isFinite)).toBe(true);
    expect(mesh.quaternion.toArray().every(Number.isFinite)).toBe(true);
    expect(
      Math.hypot(state.velocity.x, state.velocity.y, state.velocity.z),
    ).toBeLessThanOrEqual(220.001);
    // Ground penetrations beyond this tolerance mean fragments tunneled through the surface.
    expect(state.position.y).toBeGreaterThan(-0.15);
    expect(mesh.visible).toBe(true);
  }
}

afterEach(() => {
  for (const { simulation, group } of resources.splice(0)) {
    simulation.dispose();
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material])
        materials.add(material);
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
  }
});

describe("extreme disaster physics", () => {
  it("releases extensive debris but leaves foundation remnants under a broad blast", async () => {
    const { campus, simulation } = await campusSimulation();
    const structural = campus.parts.filter(({ spec }) =>
      ["slab", "wall", "column", "roof"].includes(spec.kind),
    );
    simulation.blast({ x: 4, y: 4, z: -19.5 }, 160, 4_000, { lift: 1.4 });
    const detached = structural.filter(
      ({ spec }) => simulation.getState(spec.id)!.detached,
    );
    expect(detached.length / structural.length).toBeGreaterThan(0.65);
    expect(structural.some(({spec})=>spec.anchored && !simulation.getState(spec.id)!.detached)).toBe(true);
    let farthest = 0;
    let farTravel = 0;
    for (let second = 0; second < 8; second++) {
      run(simulation, 1);
      assertFiniteMotion(simulation);
      farTravel = structural.filter(({ spec }) => {
        const p = simulation.getState(spec.id)!.position;
        const distance = Math.hypot(
          p.x - spec.position.x,
          p.z - spec.position.z,
        );
        farthest = Math.max(farthest, distance);
        return distance > 100;
      }).length;
    }
    expect(farTravel).toBeGreaterThan(20);
    console.info(
      `Extreme campus blast: ${detached.length}/${structural.length} structural parts released; ${farTravel} travelled over 100 m; farthest ${farthest.toFixed(1)} m after 8 s.`,
    );
  }, 30_000);

  it("keeps repeated overlapping maximum impulses finite without removing debris", async () => {
    const simulation = await isolatedParts([
      { x: -20, y: 10, z: 0 },
      { x: 20, y: 10, z: 0 },
      { x: 0, y: 10, z: -20 },
      { x: 0, y: 10, z: 20 },
    ]);
    for (let index = 0; index < 4; index++)
      simulation.blast({ x: 0, y: 0, z: 0 }, 500, 50_000, {
        impulseScale: 8,
        lift: 3,
      });
    assertFiniteMotion(simulation);
    for (let second = 0; second < 16; second++) {
      run(simulation, 1);
      assertFiniteMotion(simulation);
    }
    expect(simulation.parts.length).toBe(4);
    expect(simulation.stats.detached).toBe(4);
  });

  it("preserves low-power impulse response and leaves remote construction intact", async () => {
    const simulation = await isolatedParts([
      { x: 2, y: 2, z: 0 },
      { x: 50, y: 2, z: 0 },
    ]);
    simulation.blast({ x: 0, y: 2, z: 0 }, 8, 160);
    const near = simulation.getState("part-0")!;
    const falloff = (1 - 1.5 / 8) ** 1.3;
    expect(near.detached).toBe(true);
    expect(near.velocity.x).toBeCloseTo(160 * 0.14 * falloff, 4);
    expect(near.velocity.y).toBeCloseTo(2.5 * falloff, 4);
    expect(simulation.getState("part-1")!.detached).toBe(false);
    expect(simulation.getState("part-1")!.damage).toBe(0);
  });

  it("applies normalized blast direction and bounded optional values", async () => {
    const simulation = await isolatedParts([{ x: 0, y: 3, z: 2 }]);
    simulation.blast({ x: 0, y: 3, z: 0 }, 20, 160, {
      direction: { x: 15, y: 0, z: 0 },
      impulseScale: 2,
      lift: 0,
    });
    const directed = simulation.getState("part-0")!;
    expect(directed.velocity.x).toBeGreaterThan(5);
    expect(directed.velocity.y).toBeCloseTo(0, 5);
    simulation.reset();
    simulation.blast({ x: 0, y: 3, z: 0 }, 20, 160, {
      direction: { x: NaN, y: 0, z: 0 },
      impulseScale: NaN,
      lift: NaN,
    });
    const fallback = simulation.getState("part-0")!;
    expect(fallback.velocity.x).toBe(0);
    expect(fallback.velocity.y).toBeGreaterThan(0);
    assertFiniteMotion(simulation);
  });

  it("extends vortex reach and reverses its rotation while preserving radial pull", async () => {
    const simulation = await isolatedParts([{ x: 100, y: 10, z: 0 }]);
    simulation.vortex({ x: 0, y: 10, z: 0 }, 500, 1 / 60);
    expect(simulation.getState("part-0")!.damage).toBe(0);
    simulation.vortex({ x: 0, y: 10, z: 0 }, 500, 1 / 60, {
      radius: 300,
      spin: 2,
      lift: 0,
    });
    const clockwise = simulation.getState("part-0")!.velocity;
    expect(clockwise.x).toBeLessThan(0);
    expect(clockwise.z).toBeLessThan(0);
    expect(clockwise.y).toBe(0);
    simulation.reset();
    simulation.vortex({ x: 0, y: 10, z: 0 }, 500, 1 / 60, {
      radius: 300,
      spin: -2,
      lift: 0,
    });
    const counterclockwise = simulation.getState("part-0")!.velocity;
    expect(counterclockwise.x).toBeCloseTo(clockwise.x, 4);
    expect(counterclockwise.z).toBeCloseTo(-clockwise.z, 4);
  });

  it("rotates earthquake forcing and varies its frequency", async () => {
    const simulation = await isolatedParts([{ x: 0, y: 5, z: 0 }]);
    const sample = (direction: number, frequency: number) => {
      simulation.reset();
      simulation.blast({ x: 0, y: 5, z: 0 }, 1, 160, { lift: 0 });
      run(simulation, 0.2);
      simulation.earthquake(1 / 60, 10, { direction, frequency });
      return simulation.getState("part-0")!.velocity;
    };
    const base = sample(0, 1);
    const rotated = sample(90, 1);
    expect(rotated.x).toBeCloseTo(-base.z, 5);
    expect(rotated.z).toBeCloseTo(base.x, 5);
    const faster = sample(0, 2);
    expect(
      Math.abs(faster.x - base.x) + Math.abs(faster.z - base.z),
    ).toBeGreaterThan(0.05);
  });

  it("turns off the entire vortex updraft when lift is zero even below its center", async () => {
    const simulation = await isolatedParts([{ x: 10, y: 2, z: 0 }]);
    const center = { x: 0, y: 15, z: 0 };
    simulation.vortex(center, 500, 1 / 60, { lift: 0 });
    const withoutLift = simulation.getState("part-0")!;
    expect(withoutLift.detached).toBe(true);
    expect(withoutLift.velocity.x).toBeLessThan(0);
    expect(withoutLift.velocity.y).toBe(0);
    simulation.reset();
    simulation.vortex(center, 500, 1 / 60);
    const defaultLift = simulation.getState("part-0")!.velocity;
    expect(defaultLift.y).toBeGreaterThan(0);
    simulation.reset();
    simulation.vortex(center, 500, 1 / 60, { lift: 1 });
    expect(simulation.getState("part-0")!.velocity).toEqual(defaultLift);
  });
});
