import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import { Box3, Object3D } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

it("imports the shipped GLB with its full named structural graph and finite campus bounds", async () => {
  const bytes = await readFile(
    new URL("../public/models/cbsh-campus.glb", import.meta.url),
  );
  const data = new Uint8Array(bytes).buffer;
  const header = new DataView(data);
  expect(header.getUint32(0, true)).toBe(0x46546c67);
  expect(header.getUint32(4, true)).toBe(2);
  expect(header.getUint32(8, true)).toBe(bytes.length);
  const model = await new GLTFLoader().parseAsync(data, "");
  const structuralNodes: Object3D[] = [];
  model.scene.traverse((node) => {
    if (typeof node.userData.id === "string") structuralNodes.push(node);
  });
  const graph = JSON.parse(
    await readFile(
      new URL("../public/models/cbsh-structure.json", import.meta.url),
      "utf8",
    ),
  );
  expect(structuralNodes.length).toBe(graph.parts.length);
  expect(structuralNodes.length).toBeGreaterThan(600);
  const ids = new Set(structuralNodes.map((node) => node.userData.id));
  expect(ids.size).toBe(structuralNodes.length);
  for (const node of structuralNodes) {
    for (const id of node.userData.supports) expect(ids.has(id)).toBe(true);
  }
  const bounds = new Box3().setFromObject(model.scene);
  expect(
    [...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite),
  ).toBe(true);
  expect(bounds.max.x - bounds.min.x).toBeGreaterThan(200);
  expect(bounds.max.z - bounds.min.z).toBeGreaterThan(150);
});
