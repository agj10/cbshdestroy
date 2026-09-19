import { afterEach, describe, expect, it } from "vitest";
import * as THREE from "three";
import { buildCampus } from "../src/campus";
import { PhysicsSimulation } from "../src/physics";
import type { Campus } from "../src/types";

const resources: Array<{ campus: Campus; simulation: PhysicsSimulation }> = [];

async function completeCampus() {
  const campus = buildCampus();
  const simulation = await PhysicsSimulation.create(campus.parts);
  resources.push({ campus, simulation });
  return { campus, simulation };
}

function run(simulation: PhysicsSimulation, seconds: number) {
  for (let i = 0; i < Math.round(seconds * 60); i++) simulation.step(1 / 60);
}

afterEach(() => {
  for (const { campus, simulation } of resources.splice(0)) {
    simulation.dispose();
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    campus.group.traverse((object) => {
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

describe("complete campus physics integration", () => {
  it("includes structurally destructible dormitories and rear creative wings outside the playing field", async () => {
    const { campus, simulation } = await completeCampus();
    const field = new THREE.Box3().setFromObject(campus.group.getObjectByName("school-field")!);
    const size = field.getSize(new THREE.Vector3());
    expect(size.x / size.z).toBeCloseTo(0.74, 1);
    const tennis = new THREE.Box3().setFromObject(campus.group.getObjectByName("tennis-courts")!);
    expect(tennis.min.x).toBeGreaterThan(field.max.x);
    expect(campus.group.getObjectByName("surrounding-farmland")).toBeDefined();
    for (const wing of ["dorm-white", "dorm-orange", "creative", "creative-rear"]) {
      const members = campus.parts.filter(({ spec }) => spec.id.startsWith(wing + "-"));
      expect(members.length).toBeGreaterThan(70);
      expect(members.some(({ spec }) => spec.anchored)).toBe(true);
      const bounds = new THREE.Box3();
      for (const member of members) {
        const memberBounds = new THREE.Box3().setFromObject(member.mesh);
        expect(memberBounds.intersectsBox(field), member.spec.id).toBe(false);
        bounds.union(memberBounds);
      }
      const center = bounds.getCenter(new THREE.Vector3());
      simulation.blast(center, 14, 300);
      expect(members.some(({ spec }) => simulation.getState(spec.id)!.detached)).toBe(true);
      simulation.reset();
    }
  });

  it("keeps all campus parts stable at rest and fully restores them after a destructive run", async () => {
    const { campus, simulation } = await completeCampus();
    expect(campus.parts.length).toBeGreaterThan(500);
    const ids = new Set(campus.parts.map(({ spec }) => spec.id));
    expect(ids.size).toBe(campus.parts.length);
    for (const { spec } of campus.parts) {
      for (const support of spec.supports) expect(ids.has(support)).toBe(true);
    }
    const initialTransforms = campus.parts.map(({ mesh }) => ({
      position: mesh.position.clone(),
      rotation: mesh.quaternion.clone(),
    }));
    run(simulation, 3);
    expect(simulation.stats).toEqual({
      total: campus.parts.length,
      detached: 0,
      moving: 0,
      burning: 0,
      integrity: 100,
    });
    simulation.blast({ x: 4, y: 8, z: -19.5 }, 22, 244);
    run(simulation, 3);
    expect(simulation.stats.detached).toBeGreaterThan(10);
    simulation.reset();
    expect(simulation.elapsed).toBe(0);
    run(simulation, 2);
    expect(simulation.stats).toEqual({
      total: campus.parts.length,
      detached: 0,
      moving: 0,
      burning: 0,
      integrity: 100,
    });
    campus.parts.forEach(({ spec, mesh }, index) => {
      expect(mesh.position.equals(initialTransforms[index].position)).toBe(
        true,
      );
      expect(mesh.quaternion.equals(initialTransforms[index].rotation)).toBe(
        true,
      );
      expect(simulation.getState(spec.id)!.damage).toBe(0);
      expect(simulation.getState(spec.id)!.temperature).toBe(20);
    });
  });

  it("turns the default meteor into local progressive collapse while distant wings remain standing", async () => {
    const { campus, simulation } = await completeCampus();
    const remoteParts = campus.parts.filter(
      ({ spec }) => spec.position.x < -30 || spec.position.x > 40,
    );
    simulation.blast({ x: 4, y: 8, z: -19.5 }, 22, 244);
    const immediateDetached = simulation.stats.detached;
    expect(immediateDetached).toBeGreaterThan(10);
    expect(immediateDetached).toBeLessThan(campus.parts.length * 0.5);
    expect(
      remoteParts.every(({ spec }) => !simulation.getState(spec.id)!.detached),
    ).toBe(true);
    run(simulation, 3);
    const finalDetached = simulation.stats.detached;
    expect(finalDetached).toBeGreaterThan(immediateDetached);
    expect(finalDetached).toBeLessThan(campus.parts.length * 0.7);
    const remoteStanding = remoteParts.filter(
      ({ spec }) => !simulation.getState(spec.id)!.detached,
    ).length;
    expect(remoteStanding / remoteParts.length).toBeGreaterThan(0.8);
    const detachedStructure = campus.parts.filter(
      ({ spec }) =>
        spec.kind !== "glass" && simulation.getState(spec.id)!.detached,
    );
    expect(detachedStructure.length).toBeGreaterThan(20);
    console.info(
      `Campus meteor integration: ${campus.parts.length} parts, ${immediateDetached} immediate → ${finalDetached} detached after 3 s; ${remoteStanding}/${remoteParts.length} remote parts remain attached.`,
    );
  });
});
