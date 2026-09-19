import { mkdir, writeFile } from "node:fs/promises";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { buildCampus } from "../src/campus.ts";

// GLTFExporter uses the browser FileReader API even when no textures are present.
class NodeFileReader {
  result: ArrayBuffer | string | null = null;
  onloadend: (() => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;
  readAsArrayBuffer(blob: Blob) {
    void blob
      .arrayBuffer()
      .then((result) => {
        this.result = result;
        this.onloadend?.();
      })
      .catch((error) => this.onerror?.(error));
  }
  readAsDataURL(blob: Blob) {
    void blob
      .arrayBuffer()
      .then((result) => {
        this.result = `data:${blob.type};base64,${Buffer.from(result).toString("base64")}`;
        this.onloadend?.();
      })
      .catch((error) => this.onerror?.(error));
  }
}
Object.defineProperty(globalThis, "FileReader", {
  value: NodeFileReader,
  configurable: true,
});
const campus = buildCampus();
const ids = new Set(campus.parts.map((part) => part.spec.id));
if (ids.size !== campus.parts.length) throw new Error("Duplicate part IDs");
for (const part of campus.parts) {
  if (part.spec.supports.some((id) => !ids.has(id)))
    throw new Error(`Missing support: ${part.spec.id}`);
}
campus.group.userData = {
  description:
    "Photo-based approximation of remodeled Chungbuk Science High School campus. Not surveyed or engineering-validated.",
  units: "metres",
  reference:
    "User-supplied aerial photographs, satellite layout and January 2024 road views; layout corrected September 19, 2026. Dimensions and unseen elevations inferred.",
  structuralParts: campus.parts.length,
};
for (const part of campus.parts) part.mesh.userData = { ...part.spec };
campus.group.updateMatrixWorld(true);
const binary = await new GLTFExporter().parseAsync(campus.group, {
  binary: true,
});
await mkdir("public/models", { recursive: true });
await writeFile(
  "public/models/cbsh-campus.glb",
  Buffer.from(binary as ArrayBuffer),
);
await writeFile(
  "public/models/cbsh-structure.json",
  JSON.stringify(
    {
      units: "metres",
      note: "Game-authored support graph and approximate dimensions; not actual school structural data.",
      parts: campus.parts.map((part) => part.spec),
    },
    null,
    2,
  ),
);
const header = new DataView(binary as ArrayBuffer);
if (header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2)
  throw new Error("Invalid GLB header");
console.log(
  `Exported ${campus.parts.length} structural parts to public/models/cbsh-campus.glb (${(header.byteLength / 1024 / 1024).toFixed(2)} MB).`,
);
