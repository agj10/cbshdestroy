import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { DisasterDirector, DISASTERS, type DisasterId } from "../src/disasters";
import { PhysicsSimulation } from "../src/physics";
import { buildCampus } from "../src/campus";
import type { CampusPart, Vec3 } from "../src/types";

const directors: DisasterDirector[] = [];
const simulations: PhysicsSimulation[] = [];
const target = { x: 4, y: 8, z: -19.5 };
type Call = { method: string; args: unknown[] };

function harness(parts: CampusPart[] = []) {
  const calls: Call[] = [];
  const waterSurfaces: Array<(position: Vec3) => number> = [];
  const record =
    (method: string) =>
    (...args: unknown[]) => {
      if (method === "water" && typeof args[3] === "function")
        waterSurfaces.push(args[3] as (position: Vec3) => number);
      calls.push({ method, args: JSON.parse(JSON.stringify(args)) });
    };
  const sim = {
    parts,
    blast: record("blast"),
    heat: record("heat"),
    earthquake: record("earthquake"),
    water: record("water"),
    vortex: record("vortex"),
  } as unknown as PhysicsSimulation;
  const scene = new THREE.Scene();
  const director = new DisasterDirector(scene, sim);
  directors.push(director);
  return { director, scene, calls, waterSurfaces };
}

function advance(director: DisasterDirector, seconds: number, dt = 0.1) {
  for (let i = 0; i < Math.round(seconds / dt); i++) director.update(dt);
}

function expectFinite(values: ArrayLike<number>) {
  expect(Array.from(values).every(Number.isFinite)).toBe(true);
}

function expectFiniteScene(scene: THREE.Scene) {
  scene.traverse((object) => {
    expectFinite([
      ...object.position.toArray(),
      ...object.quaternion.toArray(),
      ...object.scale.toArray(),
    ]);
    if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
      expectFinite(object.geometry.attributes.position.array);
    }
    if (object instanceof THREE.InstancedMesh) {
      expectFinite(object.instanceMatrix.array.slice(0, object.count * 16));
      expect(object.count).toBeLessThanOrEqual(900);
    }
  });
}

function numericValues(value: unknown): number[] {
  if (typeof value === "number") return [value];
  if (value && typeof value === "object")
    return Object.values(value).flatMap(numericValues);
  return [];
}

afterEach(() => {
  vi.useRealTimers();
  for (const director of directors.splice(0)) director.dispose();
  for (const sim of simulations.splice(0)) {
    sim.dispose();
    for (const { mesh } of sim.parts) {
      mesh.geometry.dispose();
      for (const material of Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material])
        material.dispose();
    }
  }
});

describe("disaster lifecycles", () => {
  it("offers 14 distinct disasters and explicitly labels fictional effects", () => {
    expect(DISASTERS).toHaveLength(14);
    expect(new Set(DISASTERS.map((info) => info.id)).size).toBe(14);
    expect(
      DISASTERS.filter((info) => info.category === "상상")
        .map((info) => info.id)
        .sort(),
    ).toEqual(["aliens", "blackhole", "gravity"]);
  });

  it.each(DISASTERS)(
    "$id applies a physical effect, stays finite, and ends on its simulation clock",
    (info) => {
      const { director, scene, calls } = harness();
      const onEvent = vi.fn();
      director.onEvent = onEvent;
      expect(director.launch(info.id, target, 3)).toBe(true);
      for (let second = 0; second < info.duration; second++) {
        advance(director, 1);
        expectFiniteScene(scene);
        expect(
          director.effects.every(
            (effect) => effect.age <= effect.info.duration,
          ),
        ).toBe(true);
      }
      expect(calls.length).toBeGreaterThan(0);
      expectFinite(numericValues(calls));
      expect(director.effects).toHaveLength(0);
      expect(onEvent).toHaveBeenLastCalledWith(
        `${info.name} 종료 · 잔해 안정화`,
      );
      const count = calls.length;
      advance(director, 5);
      expect(calls).toHaveLength(count);
      expect(scene.children).toHaveLength(2); // Only persistent water and particle renderers remain.
      const particles = scene.children.find(
        (child) => child instanceof THREE.InstancedMesh,
      ) as THREE.InstancedMesh;
      expect(particles.count).toBe(0);
      expect(scene.children.find((child) => child !== particles)!.visible).toBe(
        false,
      );
    },
  );

  it("limits active disasters to four and releases slots when an effect ends", () => {
    const { director, scene } = harness();
    for (const id of ["explosion", "fire", "flood", "aliens"] as const)
      expect(director.launch(id, target, 3)).toBe(true);
    const childCount = scene.children.length;
    expect(director.launch("meteor", target, 3)).toBe(false);
    expect(scene.children).toHaveLength(childCount);
    advance(director, 8);
    expect(director.effects).toHaveLength(3);
    expect(director.launch("meteor", target, 3)).toBe(true);
  });

  it("moves a tsunami crest across the grounds while flood water stays level", () => {
    const { director, waterSurfaces } = harness();
    director.launch("tsunami", target, 3);
    advance(director, 5);
    const front = { x: 0, y: 0, z: target.z + 60 },
      rear = { x: 0, y: 0, z: target.z + 10 };
    const firstWave = waterSurfaces.at(-1)!;
    expect(firstWave(front)).toBeGreaterThan(7);
    expect(firstWave(rear)).toBeLessThan(0);
    advance(director, 5);
    const movedWave = waterSurfaces.at(-1)!;
    expect(movedWave(rear)).toBeGreaterThan(7);
    expect(movedWave(front)).toBeLessThan(0);
    director.reset();
    director.launch("flood", target, 3);
    advance(director, 10);
    const flood = waterSurfaces.at(-1)!;
    expect(flood(front)).toBeCloseTo(flood(rear), 8);
    expect(flood(front)).toBeGreaterThan(4);
  });

  it.each([
    "meteor",
    "volcano",
    "hail",
    "lightning",
    "aliens",
    "fire",
  ] as const)("%s repeats the same seeded effect after reset", (id) => {
    const { director, scene, calls } = harness();
    director.launch(id, target, 4);
    advance(director, 6);
    const first = structuredClone(calls);
    const particles = scene.children.find(
      (child) => child instanceof THREE.InstancedMesh,
    ) as THREE.InstancedMesh;
    const firstTransforms = Array.from(
      particles.instanceMatrix.array.slice(0, particles.count * 16),
    );
    director.reset();
    expect(director.effects).toHaveLength(0);
    expect(scene.children).toHaveLength(2);
    expect(particles.count).toBe(0);
    calls.length = 0;
    director.launch(id, target, 4);
    advance(director, 6);
    expect(calls).toEqual(first);
    expect(
      Array.from(particles.instanceMatrix.array.slice(0, particles.count * 16)),
    ).toEqual(firstTransforms);
  });

  it("keeps transient beams and ages paused until the caller advances simulation time", () => {
    vi.useFakeTimers();
    const { director, scene, calls } = harness();
    director.launch("aliens", target, 3);
    director.update(0.1);
    expect(scene.children).toHaveLength(4);
    const childCount = scene.children.length,
      callCount = calls.length,
      age = director.effects[0].age;
    vi.advanceTimersByTime(60_000);
    director.update(0);
    expect(scene.children).toHaveLength(childCount);
    expect(calls).toHaveLength(callCount);
    expect(director.effects[0].age).toBe(age);
    advance(director, 0.2);
    expect(scene.children).toHaveLength(3);
    director.reset();
    expect(scene.children).toHaveLength(2);
  });

  it("does not flash old lightning bolts after the final actual strike", () => {
    const { director, calls } = harness();
    director.launch("lightning", target, 3);
    advance(director, 4);
    const count = calls.length;
    for (let i = 0; i < 25; i++) {
      director.update(0.1);
      expect(director.effects[0].group.visible).toBe(false);
    }
    expect(calls).toHaveLength(count);
  });

  it.each(["meteor", "plane"] as const)(
    "places %s at its approach position immediately, including while paused",
    (id) => {
      const { director } = harness();
      director.launch(id, target, 3);
      const position = director.effects[0].group.position;
      expect(position.y).toBeGreaterThan(target.y + 20);
      expect(
        position.distanceTo(new THREE.Vector3(target.x, target.y, target.z)),
      ).toBeGreaterThan(50);
    },
  );

  it.each(["hail", "volcano"] as const)(
    "waits for %s projectiles to arrive before applying damage",
    (id) => {
      const { director, calls } = harness();
      director.launch(id, target, 3);
      advance(director, 2);
      expect(calls).toHaveLength(0);
      advance(director, 3);
      expect(calls.some((call) => call.method === "blast")).toBe(true);
      const impacts = calls.filter((call) => call.method === "blast");
      expect(impacts.every((call) => (call.args[0] as Vec3).y === 0.15)).toBe(
        true,
      );
    },
  );

  it("lands falling hail on the visible model roof instead of an arbitrary fixed height", () => {
    const size = { x: 140, y: 0.5, z: 140 },
      position = { x: 0, y: 10, z: 0 };
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(size.x, size.y, size.z),
      new THREE.MeshStandardMaterial(),
    );
    mesh.position.set(position.x, position.y, position.z);
    const roof: CampusPart = {
      mesh,
      spec: {
        id: "roof",
        size,
        position,
        kind: "roof",
        color: 0xffffff,
        supports: [],
      },
    };
    const { director, calls } = harness([roof]);
    director.launch("hail", target, 3);
    advance(director, 3);
    const impacts = calls.filter((call) => call.method === "blast");
    expect(impacts.length).toBeGreaterThan(0);
    for (const call of impacts)
      expect((call.args[0] as Vec3).y).toBeCloseTo(10.25, 8);
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  });

  it("ignores invalid times and launch data without poisoning the scene", () => {
    const { director, scene, calls } = harness();
    expect(director.launch("missing" as DisasterId, target, 3)).toBe(false);
    expect(director.launch("meteor", { ...target, x: NaN }, 3)).toBe(false);
    expect(director.launch("fire", target, Infinity)).toBe(false);
    director.launch("fire", target, 500);
    expect(director.effects[0].intensity).toBe(5);
    for (const dt of [NaN, Infinity, -1, 0]) director.update(dt);
    expect(director.effects[0].age).toBe(0);
    expect(calls).toHaveLength(0);
    expectFiniteScene(scene);
    director.dispose();
    director.dispose();
    expect(scene.children).toHaveLength(0);
    expect(director.launch("meteor", target, 3)).toBe(false);
  });
});

describe("disaster / Rapier integration", () => {
  it("default meteor produces a visible local collapse while preserving most of the campus", async () => {
    const campus = buildCampus();
    const sim = await PhysicsSimulation.create(campus.parts);
    simulations.push(sim);
    const scene = new THREE.Scene();
    scene.add(campus.group);
    const director = new DisasterDirector(scene, sim);
    directors.push(director);
    director.launch("meteor", target, 3);
    for (let i = 0; i < 8 * 60; i++) {
      director.update(1 / 60);
      sim.step(1 / 60);
    }
    expect(sim.stats.detached).toBeGreaterThan(20);
    expect(sim.stats.detached).toBeLessThan(campus.parts.length * 0.55);
    for (const part of campus.parts)
      expectFinite(numericValues(sim.getState(part.spec.id)));
  }, 20_000);

  it("meteor damage releases model glass only after the visible approach, then reset restores it", async () => {
    const position = { x: 0, y: 2, z: 0 },
      size = { x: 2, y: 2, z: 0.25 };
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(size.x, size.y, size.z),
      new THREE.MeshStandardMaterial(),
    );
    mesh.position.set(position.x, position.y, position.z);
    const part: CampusPart = {
      mesh,
      spec: {
        id: "window",
        position,
        size,
        kind: "glass",
        color: 0xffffff,
        supports: [],
      },
    };
    const sim = await PhysicsSimulation.create([part]);
    simulations.push(sim);
    const scene = new THREE.Scene();
    scene.add(mesh);
    const director = new DisasterDirector(scene, sim);
    directors.push(director);
    director.launch("meteor", position, 3);
    for (let i = 0; i < 120; i++) {
      director.update(1 / 60);
      sim.step(1 / 60);
    }
    expect(sim.getState("window")!.detached).toBe(false);
    for (let i = 0; i < 120; i++) {
      director.update(1 / 60);
      sim.step(1 / 60);
    }
    expect(sim.getState("window")!.detached).toBe(true);
    expectFinite(numericValues(sim.getState("window")));
    director.reset();
    sim.reset();
    expect(sim.getState("window")!.detached).toBe(false);
    expect(sim.getState("window")!.position).toEqual(position);
  });
});
