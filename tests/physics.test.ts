import { afterEach, describe, expect, it } from "vitest";
import * as THREE from "three";
import { PhysicsSimulation } from "../src/physics";
import type { CampusPart, PartKind, Vec3 } from "../src/types";

const simulations: PhysicsSimulation[] = [];

function part(
  id: string,
  position: Vec3,
  supports: string[] = [],
  kind: PartKind = "column",
  size: Vec3 = { x: 1, y: 2, z: 1 },
): CampusPart {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size.x, size.y, size.z),
    new THREE.MeshStandardMaterial({ color: 0xeeeeee }),
  );
  mesh.position.set(position.x, position.y, position.z);
  return {
    spec: {
      id,
      position,
      size,
      supports,
      kind,
      color: 0xeeeeee,
      anchored: id.startsWith("foundation"),
    },
    mesh,
  };
}

async function simulation(parts: CampusPart[]): Promise<PhysicsSimulation> {
  const sim = await PhysicsSimulation.create(parts);
  simulations.push(sim);
  return sim;
}

function run(
  sim: PhysicsSimulation,
  seconds: number,
  effect?: (dt: number) => void,
): void {
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    effect?.(1 / 60);
    sim.step(1 / 60);
  }
}

afterEach(() => {
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

describe("structural physics", () => {
  it("keeps an intact anchored school stable without an active disaster", async () => {
    const parts = [
      part("foundation", { x: 0, y: 1, z: 0 }),
      part("upper", { x: 0, y: 3, z: 0 }, ["foundation"]),
    ];
    const sim = await simulation(parts);
    run(sim, 5);
    expect(sim.stats).toEqual({
      total: 2,
      detached: 0,
      moving: 0,
      burning: 0,
      integrity: 100,
    });
    expect(sim.getState("upper")!.position.y).toBeCloseTo(3);
  });

  it("allows localized foundation damage and delayed gravity-driven support collapse", async () => {
    const parts = [
      part("foundation", { x: 0, y: 1, z: 0 }),
      part("upper", { x: 0, y: 5, z: 0 }, ["foundation"]),
    ];
    const sim = await simulation(parts);
    sim.blast({ x: 0, y: 1, z: 0 }, 1, 160);
    expect(sim.getState("foundation")!.detached).toBe(true);
    expect(sim.getState("upper")!.detached).toBe(false);
    run(sim, 2);
    expect(sim.getState("upper")!.detached).toBe(true);
    expect(sim.getState("upper")!.position.y).toBeLessThan(4);
    expect(sim.getState("upper")!.position.y).toBeGreaterThan(0.6);
  });

  it("retains a slab on two of four supports, then fails when only one remains", async () => {
    const parts = [
      part("foundation-a", { x: -4, y: 1, z: -4 }),
      part("foundation-b", { x: 4, y: 1, z: -4 }),
      part("foundation-c", { x: -4, y: 1, z: 4 }),
      part("foundation-d", { x: 4, y: 1, z: 4 }),
      part(
        "slab",
        { x: 0, y: 4, z: 0 },
        ["foundation-a", "foundation-b", "foundation-c", "foundation-d"],
        "slab",
        { x: 8, y: 0.4, z: 8 },
      ),
    ];
    const sim = await simulation(parts);
    sim.blast({ x: -4, y: 1, z: -4 }, 0.7, 160);
    sim.blast({ x: 4, y: 1, z: -4 }, 0.7, 160);
    run(sim, 1);
    expect(sim.getState("slab")!.detached).toBe(false);
    sim.blast({ x: -4, y: 1, z: 4 }, 0.7, 160);
    run(sim, 1);
    expect(sim.getState("slab")!.detached).toBe(true);
  });

  it("resets transforms, damage, thermal state, support timers and motion", async () => {
    const parts = [
      part("foundation", { x: 0, y: 1, z: 0 }),
      part("wood", { x: 5, y: 1, z: 0 }, [], "wood"),
    ];
    const sim = await simulation(parts);
    sim.heat({ x: 5, y: 1, z: 0 }, 3, 40);
    sim.blast({ x: 0, y: 1, z: 0 }, 2, 160);
    run(sim, 1);
    sim.reset();
    expect(sim.elapsed).toBe(0);
    expect(sim.stats).toEqual({
      total: 2,
      detached: 0,
      moving: 0,
      burning: 0,
      integrity: 100,
    });
    expect(sim.getState("wood")!.temperature).toBe(20);
    expect(sim.getState("foundation")!.position).toEqual({ x: 0, y: 1, z: 0 });
    run(sim, 1);
    expect(sim.getState("foundation")!.velocity).toEqual({ x: 0, y: 0, z: 0 });
    sim.blast({ x: 0, y: 1, z: 0 }, 2, 160);
    run(sim, 3);
    const first = sim.getState("foundation")!.position;
    sim.reset();
    sim.blast({ x: 0, y: 1, z: 0 }, 2, 160);
    run(sim, 3);
    const second = sim.getState("foundation")!.position;
    expect(second.x).toBeCloseTo(first.x, 4);
    expect(second.y).toBeCloseTo(first.y, 4);
    expect(second.z).toBeCloseTo(first.z, 4);
  });

  it("transfers falling debris impact into damage on intact construction", async () => {
    const sim = await simulation([
      part("target", { x: 0, y: 1, z: 0 }, [], "wall", { x: 3, y: 2, z: 3 }),
      part("debris", { x: 0, y: 10, z: 0 }, [], "slab", { x: 3, y: 1, z: 3 }),
      part("distant", { x: 40, y: 1, z: 0 }),
    ]);
    sim.blast({ x: 0, y: 10, z: 0 }, 0.6, 150);
    expect(sim.getState("target")!.damage).toBe(0);
    run(sim, 3);
    expect(sim.getState("target")!.damage).toBeGreaterThan(0);
    expect(sim.getState("distant")!.damage).toBe(0);
    expect(sim.getState("distant")!.detached).toBe(false);
  });

  it("burns wood and heats adjacent material without labelling concrete flammable", async () => {
    const sim = await simulation([
      part("wood", { x: 0, y: 1, z: 0 }, [], "wood"),
      part("concrete", { x: 2, y: 1, z: 0 }),
    ]);
    sim.heat({ x: 0, y: 1, z: 0 }, 1, 17);
    expect(sim.stats.burning).toBe(1);
    run(sim, 1);
    expect(sim.getState("concrete")!.temperature).toBeGreaterThan(30);
    expect(sim.getState("wood")!.damage).toBeGreaterThan(0);
    sim.water(3, { x: 0, y: 0, z: 0 }, 1);
    expect(sim.stats.burning).toBe(0);
  });

  it("applies buoyancy and flow to detached wood and weakens inundated structure", async () => {
    const sim = await simulation([
      part("wood", { x: 0, y: 2, z: 0 }, [], "wood"),
      part("wall", { x: 15, y: 2, z: 0 }, [], "wall"),
    ]);
    sim.blast({ x: 0, y: 2, z: 0 }, 0.5, 100);
    run(sim, 0.5, (dt) => sim.water(6, { x: 4, y: 0, z: 0 }, dt));
    expect(sim.getState("wood")!.position.x).toBeGreaterThan(0.1);
    expect(sim.getState("wood")!.velocity.y).toBeGreaterThan(0);
    expect(sim.getState("wall")!.damage).toBeGreaterThan(0);
    expect(sim.getState("wall")!.detached).toBe(false);
  });

  it("accumulates water corrosion gradually and restores it on reset", async () => {
    const sim = await simulation([
      part("roof", { x: 0, y: 2, z: 0 }, [], "roof"),
      part("wall", { x: 7, y: 2, z: 0 }, [], "wall"),
    ]);
    sim.corrode({ x: 0, y: 2, z: 0 }, 10, 0.8);
    expect(sim.getState("roof")!.corrosion).toBeGreaterThan(
      sim.getState("wall")!.corrosion,
    );
    expect(sim.getState("roof")!.damage).toBeGreaterThan(0);
    sim.reset();
    expect(sim.getState("roof")!.corrosion).toBe(0);
  });

  it("applies a traveling water front only to parts the local surface has reached", async () => {
    const sim = await simulation([
      part("near-wall", { x: -8, y: 1, z: 0 }, [], "wall"),
      part("far-wall", { x: 8, y: 1, z: 0 }, [], "wall"),
      part("near-wood", { x: -8, y: 1, z: 3 }, [], "wood"),
      part("far-wood", { x: 8, y: 1, z: 3 }, [], "wood"),
    ]);
    sim.heat({ x: -8, y: 1, z: 3 }, 1, 17);
    sim.heat({ x: 8, y: 1, z: 3 }, 1, 17);
    sim.water(4, { x: 5, y: 0, z: 0 }, 1, (position) =>
      position.x < 0 ? 4 : -5,
    );
    expect(sim.getState("near-wall")!.damage).toBeGreaterThan(0);
    expect(sim.getState("far-wall")!.damage).toBe(0);
    expect(sim.getState("near-wood")!.temperature).toBe(20);
    expect(sim.getState("far-wood")!.temperature).toBeGreaterThan(260);
    // Once the same front travels beyond the far bank, the previously dry parts are inundated.
    sim.water(4, { x: 5, y: 0, z: 0 }, 1, (position) =>
      position.x < 12 ? 4 : -5,
    );
    expect(sim.getState("far-wall")!.damage).toBeGreaterThan(0);
    expect(sim.getState("far-wood")!.temperature).toBe(20);
  });

  it("accumulates earthquake and vortex loads deterministically", async () => {
    const sim = await simulation([
      part("tower", { x: 5, y: 12, z: 0 }, [], "wall"),
    ]);
    run(sim, 2, (dt) => sim.earthquake(dt, 5));
    const earthquakeDamage = sim.getState("tower")!.damage;
    expect(earthquakeDamage).toBeGreaterThan(0.05);
    sim.reset();
    run(sim, 2, (dt) => sim.earthquake(dt, 5));
    expect(sim.getState("tower")!.damage).toBeCloseTo(earthquakeDamage, 8);
    sim.reset();
    run(sim, 3, (dt) => sim.vortex({ x: 0, y: 15, z: 0 }, 5, dt));
    expect(sim.getState("tower")!.detached).toBe(true);
    expect(sim.getState("tower")!.position.x).toBeLessThan(5);
  });

  it("rejects broken support references and ignores nonfinite disaster input", async () => {
    const broken = part("broken", { x: 0, y: 1, z: 0 }, ["missing"]);
    await expect(PhysicsSimulation.create([broken])).rejects.toThrow(
      "Unknown support",
    );
    broken.mesh.geometry.dispose();
    (broken.mesh.material as THREE.Material).dispose();
    const sim = await simulation([part("safe", { x: 0, y: 1, z: 0 })]);
    sim.blast({ x: NaN, y: 0, z: 0 }, 3, 100);
    sim.earthquake(NaN, 5);
    sim.step(Infinity);
    expect(sim.stats.integrity).toBe(100);
    expect(sim.elapsed).toBe(0);
  });
});
