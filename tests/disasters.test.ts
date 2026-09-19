import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { DisasterDirector, DISASTERS, type DisasterId } from "../src/disasters";
import { PhysicsSimulation } from "../src/physics";
import { buildCampus } from "../src/campus";
import type { CampusPart, Vec3 } from "../src/types";
import {
  MAX_INTENSITY,
  DISASTER_SETTINGS,
  getDefaultSettings,
  type DisasterSettings,
} from "../src/disaster-settings";

const directors: DisasterDirector[] = [];
const simulations: PhysicsSimulation[] = [];
const target = { x: 4, y: 8, z: -19.5 };
type Call = { method: string; args: unknown[] };

function fireFixture(): CampusPart[] {
  return [1,3,6,10,16].map((distance,i)=>{
    const position={x:target.x+distance,y:target.y,z:target.z+distance*.6};
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(2,2,1),new THREE.MeshStandardMaterial());mesh.position.copy(position);
    return {mesh,spec:{id:'fire-'+i,position,size:{x:2,y:2,z:1},kind:'wood',supports:[],color:0x884422}};
  });
}
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
    getState: (id: string) => {
      const part=parts.find(part=>part.spec.id===id);
      return part ? {position:part.spec.position,temperature:300,damage:0,detached:false,erosion:0} : undefined;
    },
    getBurningParts: () => [],
    blast: record("blast"),
    heat: record("heat"),
    igniteRemnants: record("igniteRemnants"),
    mutate: record("mutate"),
    earthquake: record("earthquake"),
    water: record("water"),
    vortex: record("vortex"),
    corrode: record("corrode"),
    deformGround: record("deformGround"),
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
      const { director, scene, calls } = harness(info.id === "fire" ? fireFixture() : []);
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

  it("lets an active UFO group fire at direct click or drag targets", () => {
    const { director, calls, scene } = harness();
    director.launch("aliens", target, 3, { craftCount: 1, beam: 1.5 });
    expect(director.attackAliens({ x: -22, y: 0, z: 18 })).toBe(true);
    expect(calls.some((call) => call.method === "blast")).toBe(true);
    expect(calls.some((call) => call.method === "heat")).toBe(false);
    expect(calls.some((call) => call.method === "mutate")).toBe(true);
    expect(scene.children).toHaveLength(4);
    expect(director.attackAliens({ x: -22, y: 0, z: 18 })).toBe(false);
    advance(director, 0.2);
    expect(director.attackAliens({ x: 24, y: 0, z: 18 })).toBe(true);
  });

  it.each(["meteor", "explosion", "aliens", "plane"] as const)(
    "%s creates a physical crater rim and a terrain callback after a strong impact",
    (id) => {
      const { director, calls } = harness();
      const terrain = vi.fn();
      director.onTerrainImpact = terrain;
      director.launch(id, target, 8);
      advance(director, 8);
      expect(calls.some((call) => call.method === "deformGround")).toBe(true);
      expect(terrain).toHaveBeenCalled();
    },
  );

  it.each(["flood", "tsunami"] as const)(
    "%s applies a gradual corrosion mode alongside water load",
    (id) => {
      const { director, calls } = harness();
      director.launch(id, target, 5);
      advance(director, 3);
      expect(calls.some((call) => call.method === "water")).toBe(true);
      expect(calls.some((call) => call.method === "corrode")).toBe(true);
    },
  );

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
    expect(director.effects[0].intensity).toBe(MAX_INTENSITY);
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

describe("editable disaster settings", () => {
  it("takes an independent immutable launch snapshot and never changes shared event durations", () => {
    const { director } = harness();
    const input = { duration: 60, radius: 40, heat: 2 };
    director.launch("fire", target, 3, input);
    input.radius = 2;
    input.duration = 5;
    director.launch("fire", target, 3, input);
    expect(director.effects[0].settings.radius).toBe(40);
    expect(director.effects[0].info.duration).toBe(60);
    expect(director.effects[1].settings.radius).toBe(2);
    expect(director.effects[1].info.duration).toBe(5);
    expect(Object.isFrozen(director.effects[0].settings)).toBe(true);
    expect(DISASTERS.find((info) => info.id === "fire")!.duration).toBe(30);
    expect(director.effects[0].info).not.toBe(director.effects[1].info);
  });

  const cases = DISASTERS.flatMap(({ id }) =>
    DISASTER_SETTINGS[id].map((field) => ({ id, field, key: field.key })),
  );
  it.each(cases)(
    "$id / $key changes the visible event or applied physical effect",
    ({ id, field }) => {
      const baseline = getDefaultSettings(id);
      if (id === "fire" && field.key === "direction") baseline.wind = 6;
      if (id === "explosion" && field.key === "direction")
        baseline.pattern = "directional";
      const altered = {
        ...baseline,
        [field.key]:
          field.type === "select"
            ? field.options.find((option) => option.value !== field.default)!
                .value
            : field.key === "duration"
              ? field.min
              : field.default === field.max
                ? field.min
                : field.max,
      };
      const run = (settings: DisasterSettings) => {
        const { director, scene, calls, waterSurfaces } = harness(id === "fire" ? fireFixture() : []);
        director.launch(id, target, 3, settings);
        const initial: unknown[] = [];
        scene.traverse((object) => {
          initial.push(object.position.toArray(), object.scale.toArray());
          if (
            object instanceof THREE.Mesh &&
            !(object instanceof THREE.InstancedMesh)
          )
            initial.push(
              (
                object.geometry as THREE.BufferGeometry & {
                  parameters?: unknown;
                }
              ).parameters,
            );
        });
        const duration = director.effects[0].info.duration;
        advance(director, 12);
        const water = waterSurfaces
          .slice(-2)
          .map((surface) => [
            surface(target),
            surface({ ...target, x: target.x + 30 }),
          ]);
        const output = JSON.stringify({ initial, duration, calls, water });
        director.dispose();
        return output;
      };
      expect(
        run(altered),
        `${id}.${field.key} must change rendered or physical behavior`,
      ).not.toBe(run(baseline));
    },
  );

  it("meteor speed changes arrival time, while diameter and iron composition increase impact", () => {
    const slow = harness(),
      fast = harness();
    slow.director.launch("meteor", target, 3, {
      speed: 10,
      diameter: 3,
      composition: "ice",
    });
    fast.director.launch("meteor", target, 3, {
      speed: 180,
      diameter: 12,
      composition: "iron",
    });
    advance(slow.director, 2);
    advance(fast.director, 2);
    expect(slow.calls).toHaveLength(0);
    const fastImpact = fast.calls.find((call) => call.method === "blast")!;
    expect(fastImpact).toBeDefined();
    advance(slow.director, 12);
    const slowImpact = slow.calls.find((call) => call.method === "blast")!;
    expect(fastImpact.args[1] as number).toBeGreaterThan(
      (slowImpact.args[1] as number) * 4,
    );
    expect(fastImpact.args[2] as number).toBeGreaterThan(
      (slowImpact.args[2] as number) * 20,
    );
  });

  it("vertical meteor incidence removes horizontal travel and horizontal impulse bias", () => {
    const { director, calls } = harness();
    director.launch("meteor", target, 3, { angle: 90, direction: 72 });
    expect(director.effects[0].group.position.x).toBeCloseTo(target.x, 8);
    expect(director.effects[0].group.position.z).toBeCloseTo(target.z, 8);
    advance(director, 3);
    const options = calls.find((call) => call.method === "blast")!.args[3] as {
      direction: Vec3;
    };
    expect(options.direction.x).toBeCloseTo(0, 8);
    expect(options.direction.z).toBeCloseTo(0, 8);
    expect(options.direction.y).toBeCloseTo(-1, 8);
  });

  it("simultaneous perpendicular waves retain their individual direction and local crest", () => {
    const { director, calls, waterSurfaces } = harness();
    director.launch("tsunami", target, 3, { direction: 0 });
    director.launch("tsunami", target, 3, { direction: 90 });
    advance(director, 5);
    const water = calls.filter((call) => call.method === "water").slice(-2);
    const north = water[0].args[1] as Vec3,
      east = water[1].args[1] as Vec3;
    expect(north.x).toBeCloseTo(0);
    expect(north.z).toBeLessThan(0);
    expect(east.x).toBeGreaterThan(0);
    expect(east.z).toBeCloseTo(0);
    const northSurface = waterSurfaces.at(-2)!,
      eastSurface = waterSurfaces.at(-1)!;
    const northCrest = { x: target.x, y: 0, z: target.z + 60 };
    const eastCrest = { x: target.x - 60, y: 0, z: target.z };
    expect(northSurface(northCrest)).toBeGreaterThan(7);
    expect(northSurface(eastCrest)).toBeLessThan(0);
    expect(eastSurface(eastCrest)).toBeGreaterThan(7);
    expect(eastSurface(northCrest)).toBeLessThan(0);
  });

  it.each(DISASTERS)(
    "$id accepts extreme settings, stays bounded and releases every event resource",
    ({ id }) => {
      const { director, scene } = harness();
      const settings = Object.fromEntries(
        DISASTER_SETTINGS[id].map((field) => [
          field.key,
          field.type === "select"
            ? field.options.at(-1)!.value
            : field.key === "duration"
              ? 5
              : field.max,
        ]),
      );
      director.launch(id, target, MAX_INTENSITY, settings);
      const duration = director.effects[0].info.duration;
      for (let second = 0; second < Math.ceil(duration) + 1; second++) {
        advance(director, 1);
        expectFiniteScene(scene);
        expect(
          (director as unknown as { projectiles: unknown[] }).projectiles
            .length,
        ).toBeLessThanOrEqual(128);
      }
      expect(director.effects).toHaveLength(0);
      advance(director, 8);
      expect(scene.children).toHaveLength(2);
      const particles = scene.children.find(
        (child) => child instanceof THREE.InstancedMesh,
      ) as THREE.InstancedMesh;
      expect(particles.count).toBe(0);
    },
  );

  it("extended lightning executes exactly the requested count and does not linger after its last strike", () => {
    const { director, calls } = harness();
    director.launch("lightning", target, 3, {
      strikes: 12,
      interval: 2,
      spread: 40,
    });
    const duration = director.effects[0].info.duration;
    expect(duration).toBeGreaterThan(22);
    advance(director, duration + 1);
    expect(calls.filter((call) => call.method === "blast")).toHaveLength(12);
    expect(director.effects).toHaveLength(0);
  });

  it.each([0.1, 1 / 60])(
    "short storms still land high-altitude hail at frame step %s",
    (dt) => {
      const { director, calls } = harness();
      director.launch("hail", target, 3, { duration: 5, height: 120, rate: 1 });
      advance(director, 6, dt);
      expect(calls.filter((call) => call.method === "blast")).toHaveLength(1);
      expect(director.effects).toHaveLength(0);
    },
  );
});

describe("disaster / Rapier integration", () => {
  it("maximum default meteor leaves lower structure while throwing debris and limiting secondary fire", async () => {
    const campus = buildCampus();
    const sim = await PhysicsSimulation.create(campus.parts);
    simulations.push(sim);
    const scene = new THREE.Scene();
    scene.add(campus.group);
    const director = new DisasterDirector(scene, sim);
    directors.push(director);
    director.launch("meteor", target, MAX_INTENSITY);
    const structural = campus.parts.filter(
      (part) =>
        !part.spec.anchored &&
        ["column", "wall", "slab", "roof"].includes(part.spec.kind),
    );
    const far = new Set<string>();
    for (let i = 0; i < 9 * 60; i++) {
      director.update(1 / 60);
      sim.step(1 / 60);
      for (const part of structural) {
        const state = sim.getState(part.spec.id)!;
        expectFinite(numericValues(state));
        if (
          Math.hypot(
            state.position.x - part.spec.position.x,
            state.position.z - part.spec.position.z,
          ) > 100
        )
          far.add(part.spec.id);
      }
    }
    expect(structural.length).toBeGreaterThan(100);
    const detached = structural.filter(
      (part) => sim.getState(part.spec.id)!.detached,
    ).length;
    expect(detached / structural.length).toBeGreaterThan(0.15);
    expect(detached / structural.length).toBeLessThan(0.85);
    const foundations = campus.parts.filter(part=>part.spec.anchored);
    expect(foundations.filter(part=>!sim.getState(part.spec.id)!.detached).length).toBeGreaterThan(foundations.length*.5);
    expect(sim.getBurningParts().length).toBeLessThan(20);
    expect(far.size).toBeGreaterThan(5);
  // More campus bodies require additional time for the same nine simulated seconds.
  }, 60_000);

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
