import { destructibleScenery } from './destructible-scenery.ts';
import { batchStaticScenery } from "./static-scenery.ts";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { Campus, CampusPart, PartKind, PartSpec } from "./types";

// Photo-derived front elevations. Rear volumes and grounds are approximate.
// One scene unit represents one metre; all physics bodies use the same origin.
export function buildCampus(batchScenery = true): Campus {
  const group = new THREE.Group();
  group.name = "Chungbuk Science High School · remodeled exterior";
  const parts: CampusPart[] = [];
  const boxCache = new Map<string, THREE.BoxGeometry>();
  const materialCache = new Map<string, THREE.MeshStandardMaterial>();
  const palette = {
    wall: 0xc8d0d0,
    warm: 0xd3d5cf,
    edge: 0xe7eae4,
    charcoal: 0x758184,
    glass: 0x31585d,
    orange: 0xed922e,
    brick: 0xb49b91,
    concrete: 0xb8bcb2,
    grass: 0x88966b,
    field: 0xa4a578,
    asphalt: 0x68716d,
  };
  const material = (color: number, glass = false) => {
    const key = `${color}:${glass}`;
    if (!materialCache.has(key))
      materialCache.set(
        key,
        new THREE.MeshStandardMaterial({
          color,
          roughness: glass ? 0.25 : 0.87,
          metalness: glass ? 0.28 : 0,
        }),
      );
    return materialCache.get(key)!;
  };
  const geometry = (x: number, y: number, z: number) => {
    const key = `${x},${y},${z}`;
    if (!boxCache.has(key)) boxCache.set(key, new THREE.BoxGeometry(x, y, z));
    return boxCache.get(key)!;
  };
  function box(
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    color: number,
    glass = false,
  ) {
    const mesh = new THREE.Mesh(geometry(sx, sy, sz), material(color, glass));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function part(
    id: string,
    position: THREE.Vector3,
    size: THREE.Vector3,
    color: number,
    kind: PartKind,
    supports: string[],
    anchored = false,
    rotation = 0,
  ) {
    const mesh = box(
      group,
      position.x,
      position.y,
      position.z,
      size.x,
      size.y,
      size.z,
      color,
    );
    mesh.rotation.y = rotation;
    mesh.name = id;
    const spec: PartSpec = {
      id,
      position: { ...position },
      size: { ...size },
      color,
      kind,
      supports,
      anchored,
      rotation,
    };
    parts.push({ spec, mesh });
    return mesh;
  }
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  let randomState = 48261;
  const random = () =>
    ((randomState = (randomState * 16807) % 2147483647) - 1) / 2147483646;

  // Foundation landscape and paved paths remain terrain rather than building debris.
  box(group, 0, -0.52, 4, 720, 1, 620, palette.grass);
  box(group, 4, -0.012, 32, 62, 0.08, 80, palette.asphalt);
  box(group, 4, 0.038, 32, 52, 0.045, 70, palette.field).name = "school-field";
  box(group, 4, 0.042, 32, 48, 0.04, 66, 0xafac80);
  box(group, 11, 0.04, -9, 79, 0.08, 7, 0xc7c8b9);
  box(group, -26, 0.04, -1, 5, 0.08, 33, 0xc7c8b9);
  box(group, 50, 0.025, 39, 5, 0.07, 93, 0xbec4b2);
  box(group, -61, 0.006, -37, 44, 0.075, 9, palette.asphalt);
  box(group, 59, 0.009, -7, 29, 0.075, 27, palette.asphalt);
  box(group, 69, 0.01, -28, 9, 0.07, 72, palette.asphalt);

  // Worn, soft-edged islands of grass add scale without photograph textures.
  const patchGeometry = new THREE.CircleGeometry(1, 9);
  const patchMaterial = new THREE.MeshStandardMaterial({
    color: 0xa8a87e,
    roughness: 1,
  });
  const patches = new THREE.InstancedMesh(patchGeometry, patchMaterial, 55);
  const transform = new THREE.Object3D();
  for (let i = 0; i < 55; i++) {
    transform.position.set(
      4 + (random() - 0.5) * 43,
      0.067 + i * 0.00002,
      2 + random() * 60,
    );
    transform.rotation.set(-Math.PI / 2, 0, random() * Math.PI);
    transform.scale.set(0.8 + random() * 4.8, 0.5 + random() * 1.6, 1);
    transform.updateMatrix();
    patches.setMatrixAt(i, transform.matrix);
  }
  patches.receiveShadow = true;
  group.add(patches);

  function fieldLine(
    x: number,
    z: number,
    sx: number,
    sz: number,
    color = 0xe2dfc5,
  ) {
    return box(group, x, 0.09, z, sx, 0.025, sz, color);
  }
  // The field in the supplied photographs is grass/dirt, without an athletics track.
  fieldLine(4, 0, 46, 0.1);
  fieldLine(4, 64, 46, 0.1);
  fieldLine(-19, 32, 0.1, 64);
  fieldLine(27, 32, 0.1, 64);
  fieldLine(4, 32, 46, 0.08);
  for (const end of [0, 64]) {
    const inner = end === 0 ? 10 : 54;
    fieldLine(4, inner, 23, 0.08);
    fieldLine(-7.5, (end + inner) / 2, 0.08, 10);
    fieldLine(15.5, (end + inner) / 2, 0.08, 10);
  }
  const centerRing = new THREE.Mesh(
    new THREE.RingGeometry(6.1, 6.19, 64),
    material(0xe2dfc5),
  );
  centerRing.rotation.x = -Math.PI / 2;
  centerRing.position.set(4, 0.095, 32);
  group.add(centerRing);

  function goal(x: number, sign: number) {
    const goalGroup = new THREE.Group();
    goalGroup.position.set(4, 0, x);
    goalGroup.rotation.y = -Math.PI / 2;
    group.add(goalGroup);
    const white = 0xe3e6db;
    box(goalGroup, 0, 1.22, -3.7, 0.13, 2.44, 0.13, white);
    box(goalGroup, 0, 1.22, 3.7, 0.13, 2.44, 0.13, white);
    box(goalGroup, 0, 2.44, 0, 0.13, 0.13, 7.52, white);
    box(goalGroup, sign * 1.6, 0.06, 0, 0.1, 0.1, 7.5, white);
    const points: number[] = [];
    for (let z = -3.7; z <= 3.71; z += 0.42)
      points.push(0, 2.42, z, sign * 1.6, 0.12, z);
    for (let y = 0.2; y <= 2.44; y += 0.34) {
      const netX = sign * 1.6 * (1 - y / 2.44);
      points.push(netX, y, -3.7, netX, y, 3.7);
    }
    const net = new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.Float32BufferAttribute(points, 3),
      ),
      new THREE.LineBasicMaterial({
        color: 0xc8d5c4,
        transparent: true,
        opacity: 0.55,
      }),
    );
    goalGroup.add(net);
  }
  goal(0, -1);
  goal(64, 1);

  // Eastern multipurpose court, north of the tennis courts in the supplied satellite view.
  box(group, 76, 0.055, 5, 18, 0.12, 31, 0xbf8a70);
  box(group, 76, 0.125, 5, 15, 0.025, 28, 0x628e87);
  const courtLine = (x: number, z: number, sx: number, sz: number) =>
    box(group, x, 0.151, z, sx, 0.025, sz, 0xe2dfc5);
  courtLine(68.5, 5, 0.08, 28);
  courtLine(83.5, 5, 0.08, 28);
  courtLine(76, -9, 15, 0.08);
  courtLine(76, 19, 15, 0.08);
  courtLine(76, 5, 15, 0.08);
  for (const z of [-7.5, 17.5]) {
    box(group, 76, 1.8, z, 0.14, 3.6, 0.14, 0xced5d2);
    box(
      group,
      76,
      3.15,
      z + (z < 5 ? 0.45 : -0.45),
      1.8,
      1.1,
      0.09,
      0xdfebe1,
    );
    const hoop = new THREE.Mesh(
      new THREE.TorusGeometry(0.26, 0.035, 5, 16),
      material(palette.orange),
    );
    hoop.rotation.x = Math.PI / 2;
    hoop.position.set(76, 2.85, z + (z < 5 ? 0.78 : -0.78));
    group.add(hoop);
  }

  const tennis = new THREE.Group();
  tennis.name = "tennis-courts";
  tennis.position.set(74, 0, 43);
  group.add(tennis);
  box(tennis, 0, 0.06, 0, 34, 0.12, 35, 0x6b9866);
  for (const x of [-8, 8]) {
    box(tennis, x, 0.13, 0, 13, 0.025, 27, 0x577b93);
    const line = (px: number, pz: number, sx: number, sz: number) => box(tennis, x + px, 0.155, pz, sx, 0.02, sz, 0xe2e7d6);
    for (const side of [-1, 1]) {
      line(side * 5.5, 0, 0.07, 23.8);
      line(side * 4.1, 0, 0.055, 23.8);
      line(0, side * 11.9, 11, 0.07);
      line(0, side * 6.4, 8.2, 0.07);
      box(tennis, x + side * 6, 0.65, 0, 0.1, 1.3, 0.1, 0xe0e5dc);
    }
    line(0, 0, 0.06, 12.8);
    box(tennis, x, 0.7, 0, 12, 0.045, 0.04, 0xe4e9df);
    for (let y = 0.25; y < 0.7; y += 0.12) box(tennis, x, y, 0, 12, 0.012, 0.012, 0x465b53);
    for (let dx = -6; dx <= 6; dx += 0.4) box(tennis, x + dx, 0.46, 0, 0.012, 0.48, 0.012, 0x465b53);
  }
  for (let x = -17; x <= 17; x += 3.4) for (const z of [-17.5, 17.5]) box(tennis, x, 1.65, z, 0.08, 3.3, 0.08, 0x557563);
  for (let z = -17.5; z <= 17.5; z += 3.5) for (const x of [-17, 17]) box(tennis, x, 1.65, z, 0.08, 3.3, 0.08, 0x557563);
  for (const y of [0.3, 1.6, 3.2]) {
    for (const z of [-17.5, 17.5]) box(tennis, 0, y, z, 34, 0.04, 0.04, 0x557563);
    for (const x of [-17, 17]) box(tennis, x, y, 0, 0.04, 0.04, 35, 0x557563);
  }
  box(group, 74, 0.02, 84, 39, 0.08, 38, 0xb3ae97).name = "south-parking";
  box(group, 40, 0.015, 47, 6, 0.07, 112, palette.asphalt);
  box(group, 3, 0.015, 70.5, 80, 0.07, 6, palette.asphalt);

  interface WingOptions {
    name: string;
    x: number;
    z: number;
    bays: number;
    bay: number;
    depth: number;
    floors: number;
    rotation?: number;
    feature?: "main" | "west";
  }
  const roofMeshes = new Map<string, THREE.Mesh>();
  function building(options: WingOptions) {
    const { name, x, z, bays, bay, depth, floors, feature } = options;
    const rotation = options.rotation ?? 0;
    const story = 3.7;
    const width = bays * bay;
    const world = (px: number, py: number, pz: number) =>
      v(
        x + px * Math.cos(rotation) + pz * Math.sin(rotation),
        py,
        z - px * Math.sin(rotation) + pz * Math.cos(rotation),
      );
    const columnId = (f: number, b: number, side: number) =>
      `${name}-column-${f}-${b}-${side}`;
    const slabId = (f: number, b: number) => `${name}-slab-${f}-${b}`;
    const belowSlabs = (f: number, b: number) =>
      [
        b > 0 ? slabId(f - 1, b - 1) : "",
        b < bays ? slabId(f - 1, b) : "",
      ].filter(Boolean);
    box(
      group,
      x,
      0.1,
      z,
      width + (rotation ? 0 : 0.5),
      0.2,
      depth + 0.5,
      palette.concrete,
    ).rotation.y = rotation;
    for (let f = 0; f < floors; f++) {
      for (let b = 0; b <= bays; b++)
        for (const side of [-1, 1]) {
          const px = -width / 2 + b * bay;
          part(
            columnId(f, b, side),
            world(px, f * story + story / 2, side * (depth / 2 - 0.35)),
            v(0.5, story - 0.12, 0.5),
            f === 0 ? palette.brick : palette.edge,
            "column",
            f === 0 ? [] : belowSlabs(f, b),
            f === 0,
            rotation,
          );
        }
      for (let b = 0; b < bays; b++) {
        const px = -width / 2 + (b + 0.5) * bay;
        const columns = [
          columnId(f, b, -1),
          columnId(f, b, 1),
          columnId(f, b + 1, -1),
          columnId(f, b + 1, 1),
        ];
        const slab = part(
          slabId(f, b),
          world(px, (f + 1) * story, 0),
          v(bay - 0.04, 0.28, depth + 0.22),
          f === floors - 1 ? 0xb3bfbc : palette.edge,
          f === floors - 1 ? "roof" : "slab",
          columns,
          false,
          rotation,
        );
        if (f === floors - 1) {
          roofMeshes.set(`${name}-${b}`, slab);
          box(slab, 0, 0.38, -depth / 2, bay, 0.6, 0.2, palette.wall);
          box(slab, 0, 0.38, depth / 2, bay, 0.6, 0.2, palette.wall);
          if (b === 0 || b === bays - 1)
            box(
              slab,
              ((b === 0 ? -1 : 1) * bay) / 2,
              0.38,
              0,
              0.2,
              0.6,
              depth,
              palette.wall,
            );
        }
        for (const side of [-1, 1]) {
          const orange =
            side === 1 &&
            ((feature === "main" && (b === 7 || b === 8) && f >= 2) ||
              (feature === "west" &&
                (b === 3 || b === 4) &&
                (f === 1 || f === 2)));
          const accent =
            side === 1 &&
            feature === "main" &&
            (b === 2 || b === 10) &&
            f === 2;
          const color = orange
            ? palette.orange
            : accent
              ? palette.charcoal
              : f === 0
                ? palette.brick
                : palette.wall;
          const wall = part(
            `${name}-wall-${f}-${b}-${side}`,
            world(px, f * story + story / 2, (side * depth) / 2),
            v(bay - 0.1, story - 0.28, 0.26),
            color,
            "wall",
            [columnId(f, b, side), columnId(f, b + 1, side)],
            false,
            rotation,
          );
          const facade = new THREE.Group();
          facade.rotation.y = side === -1 ? Math.PI : 0;
          wall.add(facade);
          // Orange rainscreen panels project beyond the pale slab edges, forming a
          // continuous, substantial frame across floors as in the remodeled facade.
          const facadeOffset = orange ? 0.22 : 0;
          if (orange) {
            box(
              facade,
              0,
              0,
              0.22,
              bay + 0.035,
              story + 0.035,
              0.2,
              palette.orange,
            );
            const featureBottom = feature === "main" ? 2 : 1;
            const featureTop = feature === "main" ? 3 : 2;
            if (f === featureBottom)
              box(
                facade,
                0,
                -1.54,
                0.31,
                bay + 0.04,
                0.67,
                0.09,
                palette.orange,
              );
            if (f === featureTop)
              box(
                facade,
                0,
                1.54,
                0.31,
                bay + 0.04,
                0.67,
                0.09,
                palette.orange,
              );
          }
          let glazingIndex = 0;
          // Front windows are independent brittle physics bodies. Their surviving
          // recess and mullions reveal a dark interior when glass is knocked out.
          const window = (
            wx: number,
            wy: number,
            ww: number,
            wh: number,
            panes: number,
          ) => {
            box(
              facade,
              wx,
              wy,
              0.151 + facadeOffset,
              ww + 0.16,
              wh + 0.15,
              0.095,
              palette.edge,
            );
            const independent =
              side === 1 && (feature === "main" || feature === "west");
            if (independent) {
              box(
                facade,
                wx,
                wy,
                0.202 + facadeOffset,
                ww,
                wh,
                0.009,
                0x152729,
              );
              const pane = part(
                `${name}-glass-${f}-${b}-${glazingIndex++}`,
                world(
                  px + wx,
                  f * story + story / 2 + wy,
                  depth / 2 + 0.237 + facadeOffset,
                ),
                v(ww, wh, 0.035),
                palette.glass,
                "glass",
                [wall.name],
                false,
                rotation,
              );
              pane.material = material(palette.glass, true);
            } else {
              box(
                facade,
                wx,
                wy,
                0.237 + facadeOffset,
                ww,
                wh,
                0.032,
                palette.glass,
                true,
              );
            }
            box(
              facade,
              wx,
              wy - wh / 2 - 0.095,
              0.25 + facadeOffset,
              ww + 0.28,
              0.09,
              0.24,
              orange ? palette.orange : 0xabb4af,
            );
            for (let i = 1; i < panes; i++)
              box(
                facade,
                wx - ww / 2 + (ww * i) / panes,
                wy,
                0.285 + facadeOffset,
                0.045,
                wh,
                0.048,
                palette.edge,
              );
            if (wh > 1.6)
              box(
                facade,
                wx,
                wy - 0.35,
                0.285 + facadeOffset,
                ww,
                0.047,
                0.048,
                palette.edge,
              );
            // Muted blinds in selected windows make each facade less repetitive.
            if (!orange && (b * 7 + f * 3 + side + 10) % 6 === 0)
              box(
                facade,
                wx - ww * 0.32,
                wy + wh * 0.27,
                0.268,
                ww * 0.31,
                wh * 0.42,
                0.009,
                0xaeb9ad,
              );
          };
          if (feature === "main" && orange) {
            const glazingY = f === 2 ? 0.25 : -0.25;
            window(b === 7 ? -1.4 : 1.4, glazingY, 0.75, 2.95, 1);
            window(b === 7 ? 1.45 : -1.45, glazingY, 2.95, 2.95, 2);
          } else if (f === 0) {
            const isEntrance =
              side === 1 && feature === "main" && (b === 7 || b === 8);
            window(
              0,
              isEntrance ? 0.1 : 0.05,
              bay - (isEntrance ? 0.65 : 1.4),
              isEntrance ? 2.8 : 2.1,
              isEntrance ? 4 : 3,
            );
            if (isEntrance) {
              box(wall, 0, 1.64, 1.4, bay + 0.08, 0.18, 2.6, palette.charcoal);
              box(wall, 0, 1.52, 2.65, bay + 0.1, 0.2, 0.15, 0xc0b4a2);
            }
            // Fine masonry courses, modeled as shallow seams.
            for (let row = -1.3; row < 1.5; row += 0.46)
              box(facade, 0, row, 0.137, bay - 0.15, 0.018, 0.012, 0x9f8e85);
          } else {
            window(
              0,
              0.15,
              bay - (orange ? 1.7 : 1.05),
              1.25,
              Math.max(2, Math.round(bay / 1.1)),
            );
          }
          if (!orange && f > 0) {
            for (const seamX of [-bay / 4, bay / 4])
              box(facade, seamX, 0, 0.135, 0.016, story - 0.3, 0.016, 0xb6c0bc);
            box(facade, 0, -1.18, 0.135, bay - 0.12, 0.016, 0.016, 0xb6c0bc);
          }
        }
      }
      // Short ends are split into three panels, preserving local breakage.
      for (const end of [-1, 1])
        for (let segment = 0; segment < 3; segment++) {
          const endBay = end === -1 ? 0 : bays;
          const panelDepth = depth / 3;
          const wall = part(
            `${name}-end-${f}-${end}-${segment}`,
            world(
              (end * width) / 2,
              f * story + story / 2,
              -depth / 2 + (segment + 0.5) * panelDepth,
            ),
            v(0.28, story - 0.28, panelDepth - 0.06),
            f === 0 ? palette.brick : palette.warm,
            "wall",
            [columnId(f, endBay, -1), columnId(f, endBay, 1)],
            false,
            rotation,
          );
          if (segment !== 1) {
            box(
              wall,
              end * 0.16,
              0.2,
              0,
              0.045,
              1.25,
              panelDepth * 0.48,
              palette.edge,
            );
            box(
              wall,
              end * 0.19,
              0.2,
              0,
              0.025,
              1.09,
              panelDepth * 0.48 - 0.13,
              palette.glass,
              true,
            );
            box(wall, end * 0.21, 0.2, 0, 0.027, 1.09, 0.06, palette.edge);
          } else if (f > 0) {
            box(
              wall,
              end * 0.17,
              0,
              0,
              0.035,
              story - 0.33,
              panelDepth * 0.7,
              0xc8baa0,
            );
          }
        }
    }
    return { world, width, height: floors * story };
  }

  building({
    name: "main",
    x: 6,
    z: -26,
    bays: 12,
    bay: 6,
    depth: 12,
    floors: 4,
    feature: "main",
  });
  building({
    name: "west",
    x: -40,
    z: -9,
    bays: 8,
    bay: 6,
    depth: 16,
    floors: 4,
    rotation: Math.PI / 2,
    feature: "west",
  });
  building({
    name: "link",
    x: -31,
    z: -26,
    bays: 1,
    bay: 2,
    depth: 12,
    floors: 4,
  });
  building({
    name: "annex",
    x: 53,
    z: -34,
    bays: 3,
    bay: 6,
    depth: 15,
    floors: 3,
  });

  // Approximate footprints from the supplied north-up satellite image and 2024 road views.
  building({ name: "dorm-white", x: -40, z: 45, bays: 10, bay: 6, depth: 14, floors: 4, rotation: Math.PI / 2 });
  // The white footprint returns across the south end of the field (a ㄷ-shaped complex).
  building({ name: "dorm-white-return", x: -28, z: 80, bays: 5, bay: 8, depth: 10, floors: 4 });
  building({ name: "dorm-white-stair", x: -52, z: 80, bays: 1, bay: 8, depth: 10, floors: 4 });
  // Orange-roof dorm closes the end, outside the playing field and perimeter path.
  building({ name: "dorm-orange", x: -7, z: 92, bays: 6, bay: 6, depth: 14, floors: 3 });
  building({ name: "dorm-orange-return", x: 16, z: 95, bays: 4, bay: 6, depth: 10, floors: 3, rotation: Math.PI / 2 });
  building({ name: "creative", x: 29, z: -51, bays: 7, bay: 6, depth: 14, floors: 3 });
  building({ name: "creative-rear", x: 32, z: -68, bays: 5, bay: 6, depth: 12, floors: 3, rotation: -0.25 });
  // Enclosed links preserve the rear wing shapes while joining the whole complex.
  building({ name: "creative-main-link", x: 12, z: -38, bays: 2, bay: 5, depth: 12, floors: 3 });
  building({ name: "creative-annex-link", x: 47, z: -42.75, bays: 1, bay: 6, depth: 2.5, floors: 3 });
  building({ name: "creative-rear-link", x: 30, z: -61, bays: 2, bay: 5, depth: 6, floors: 3 });
  // Vertical dormitory accent panels are owned by the facade bodies and fall with them.
  for (const { spec, mesh } of parts) {
    if (spec.id.startsWith("dorm-orange") && spec.id.includes("-wall-")) {
      const side = spec.id.endsWith("--1") ? -1 : 1;
      box(mesh, 1.8, 0, side * 0.17, 1.25, spec.size.y, 0.07, 0xd28b61);
    }
    if (spec.id.startsWith("dorm-white") && spec.id.includes("-wall-")) {
      const side = spec.id.endsWith("--1") ? -1 : 1;
      box(mesh, 0, -0.8, side * 0.17, 2.5, 0.55, 0.06, 0xd6b66b);
    }
  }
  // Hipped roofs are divided into strips owned by the corresponding roof bodies.
  for (const [name, bays, depth] of [["dorm-orange", 6, 14], ["dorm-orange-return", 4, 10]] as const) {
    for (let i = 0; i < bays; i++) {
      const roof = roofMeshes.get(name + "-" + i)!;
      const geometry = new THREE.BoxGeometry(6, 0.2, depth + 0.5, 1, 1, 2);
      const positions = geometry.getAttribute("position");
      for (let vertex = 0; vertex < positions.count; vertex++) {
        const x = positions.getX(vertex), z = positions.getZ(vertex);
        const roofRise = Math.max(0, Math.min(2.1, (bays * 3 - Math.abs(-(bays - 1) * 3 + i * 6 + x)) * 0.32, (depth / 2 + 0.25 - Math.abs(z)) * 0.32));
        positions.setY(vertex, positions.getY(vertex) + 0.55 + roofRise);
      }
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, material(0x916b50));
      mesh.castShadow = true;
      roof.add(mesh);
    }
  }

  // Roof machinery, railings and observatory domes belong to roof bodies.
  function roofBox(
    key: string,
    px: number,
    py: number,
    pz: number,
    sx: number,
    sy: number,
    sz: number,
    color: number,
  ) {
    const parent = roofMeshes.get(key);
    if (!parent) return;
    return box(parent, px, py, pz, sx, sy, sz, color);
  }
  for (const [key, px] of [
    ["main-3", 0],
    ["main-10", 0],
    ["west-1", 0],
  ] as const) {
    roofBox(key, px, 1.15, -2.7, 4.5, 2, 3.8, palette.wall);
    roofBox(key, px, 2.25, -2.7, 4.75, 0.16, 4.0, palette.edge);
    roofBox(key, px + 0.8, 1.25, -0.75, 1.3, 0.8, 0.12, palette.charcoal);
  }
  for (const key of ["main-1", "main-5", "main-6", "west-6", "annex-1"]) {
    const roof = roofMeshes.get(key)!;
    for (let i = 0; i < 3; i++) {
      box(roof, -1.5 + i * 1.3, 0.5, -2, 1, 0.7, 1.2, 0xa1adad);
      const fan = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 0.025, 12),
        material(0x536666),
      );
      fan.position.set(-1.5 + i * 1.3, 0.87, -2);
      roof.add(fan);
    }
  }
  function observatory(key: string, radius: number, z: number) {
    const roof = roofMeshes.get(key)!;
    const domeMaterial = new THREE.MeshStandardMaterial({
      color: 0xc7d4d3,
      roughness: 0.34,
      metalness: 0.45,
    });
    const drum = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, 0.7, 24),
      material(0xb7c3c2),
    );
    drum.position.set(0, 0.52, z);
    drum.castShadow = true;
    roof.add(drum);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      domeMaterial,
    );
    dome.position.set(0, 0.87, z);
    dome.castShadow = true;
    roof.add(dome);
    const ribs: number[] = [];
    for (let r = 0; r < 16; r++) {
      const angle = (r / 16) * Math.PI * 2;
      for (let j = 0; j < 12; j++) {
        for (const elevation of [
          ((j / 12) * Math.PI) / 2,
          (((j + 1) / 12) * Math.PI) / 2,
        ]) {
          ribs.push(
            Math.sin(elevation) * Math.cos(angle) * (radius + 0.012),
            0.87 + Math.cos(elevation) * (radius + 0.012),
            z + Math.sin(elevation) * Math.sin(angle) * (radius + 0.012),
          );
        }
      }
    }
    roof.add(
      new THREE.LineSegments(
        new THREE.BufferGeometry().setAttribute(
          "position",
          new THREE.Float32BufferAttribute(ribs, 3),
        ),
        new THREE.LineBasicMaterial({ color: 0x8b9da0 }),
      ),
    );
  }
  observatory("west-5", 2.75, 0.4);
  observatory("west-7", 1.65, 0.5);

  // Solar arrays on the large rear creative wing, visible in the supplied satellite view.
  for (const key of ["creative-0", "creative-1", "creative-2", "creative-3", "creative-4", "creative-5", "creative-6"]) {
    const roof = roofMeshes.get(key)!;
    for (let row = 0; row < 3; row++) {
      const panel = box(
        roof,
        0,
        0.72,
        -4 + row * 3,
        5.4,
        0.09,
        2.2,
        0x294c63,
        true,
      );
      panel.rotation.x = -0.22;
      for (let j = -2; j <= 2; j++)
        box(panel, j * 0.9, 0.052, 0, 0.035, 0.025, 2.2, 0x90a9b8);
      box(panel, 0, 0.052, 0, 5.4, 0.025, 0.035, 0x90a9b8);
    }
  }

  // A canvas sign preserves the distinctive school name without external assets.
  const signCanvas =
    typeof document !== "undefined" ? document.createElement("canvas") : null;
  if (signCanvas) {
    signCanvas.width = 1536;
    signCanvas.height = 192;
  }
  const ctx = signCanvas?.getContext("2d");
  if (ctx && signCanvas) {
    ctx.clearRect(0, 0, signCanvas.width, signCanvas.height);
    ctx.shadowColor = "rgba(42,64,73,.42)";
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 5;
    ctx.shadowBlur = 2;
    ctx.fillStyle = "#eff2ee";
    ctx.font = '700 122px "Malgun Gothic", "Noto Sans KR", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("충북과학고등학교", 768, 96);
    const texture = new THREE.CanvasTexture(signCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 1.3),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
      }),
    );
    sign.position.set(-3.2, 0.08, 6.17);
    roofMeshes.get("main-10")!.add(sign);
  }
  // Three low terraces lead from the court lawn to the front doors.
  for (let step = 0; step < 4; step++)
    box(
      group,
      18,
      0.08 + step * 0.065,
      -15.6 - step * 0.4,
      11,
      0.16 + step * 0.13,
      2.3 - step * 0.4,
      0xc5c9be,
    );
  for (const x of [11.8, 24.2]) {
    box(group, x, 0.67, -16.7, 0.09, 1.05, 0.09, 0x8d9f9c);
    box(group, x, 0.6, -15.1, 0.09, 1.05, 0.09, 0x8d9f9c);
    box(group, x, 1.18, -15.9, 0.08, 0.08, 1.9, 0x9fafad);
  }

  // Trees use a handful of instanced draw calls, leaving room for physical debris.
  type Tree = { x: number; z: number; scale: number; variant: number };
  const trees: Tree[] = [];
  for (let i = 0; i < 410; i++) {
    let x: number, z: number;
    if (i < 180) {
      x = (random() - 0.5) * 265;
      z = -89 - random() * 65;
    } else if (i < 340) {
      x = -65 - random() * 110;
      z = -80 + random() * 170;
    } else {
      x = -58 - random() * 25;
      z = -40 + random() * 125;
    }
    trees.push({
      x,
      z,
      scale: 0.8 + random() * 1.1,
      variant: Math.floor(random() * 3),
    });
  }
  for (const [x, z, scale] of [
    [-23, 1, 0.75],
    [-21, -12, 0.85],
    [-30, 12, 0.7],
    [-16, -15, 0.8],
    [-7, -14, 0.65],
    [33, -12, 0.7],
    [42, 4, 0.8],
    [44, 18, 0.7],
    [48, 62, 0.9],
    [-45, 64, 0.9],
    [-47, 12, 0.7],
    [-54, -23, 0.85],
    [57, 15, 0.8],
  ]) {
    trees.push({ x, z, scale, variant: Math.floor(random() * 3) });
  }
  const trunkGeometry = new THREE.CylinderGeometry(0.19, 0.34, 3.6, 7);
  const foliageGeometry = new THREE.IcosahedronGeometry(2.45, 1);
  const trunks = new THREE.InstancedMesh(
    trunkGeometry,
    material(0x73765a),
    trees.length,
  );
  const foliage = new THREE.InstancedMesh(
    foliageGeometry,
    material(0x647c51),
    trees.length * 3,
  );
  const treeColors = [
    new THREE.Color(0x657d50),
    new THREE.Color(0x7f8d57),
    new THREE.Color(0x4f7052),
  ];
  trees.forEach((tree, index) => {
    transform.position.set(tree.x, 1.8 * tree.scale, tree.z);
    transform.rotation.set(0, random() * 6.28, 0);
    transform.scale.setScalar(tree.scale);
    transform.updateMatrix();
    trunks.setMatrixAt(index, transform.matrix);
    for (let crown = 0; crown < 3; crown++) {
      transform.position.set(
        tree.x + (crown === 0 ? 0 : crown === 1 ? -1.3 : 1.2) * tree.scale,
        (crown === 0 ? 5.2 : 4.3) * tree.scale,
        tree.z + (crown === 0 ? 0.1 : crown === 1 ? -0.4 : 0.6) * tree.scale,
      );
      transform.scale.set(
        tree.scale * (crown === 0 ? 1.12 : 0.85),
        tree.scale * (crown === 0 ? 1.1 : 0.85),
        tree.scale,
      );
      transform.updateMatrix();
      foliage.setMatrixAt(index * 3 + crown, transform.matrix);
      foliage.setColorAt(
        index * 3 + crown,
        treeColors[(tree.variant + crown) % 3],
      );
    }
  });
  trunks.castShadow = true;
  foliage.castShadow = true;
  foliage.receiveShadow = true;
  group.add(trunks, foliage);

  const shrubGeometry = new THREE.IcosahedronGeometry(1, 1);
  const shrubs = new THREE.InstancedMesh(shrubGeometry, material(0x647f52), 48);
  for (let i = 0; i < 48; i++) {
    const alongFront = i < 30;
    transform.position.set(
      alongFront ? -27 + i * 2.32 : -29.5,
      0.48,
      alongFront ? -16.9 : -11 + (i - 30) * 1.36,
    );
    transform.rotation.set(0, random() * 6, 0);
    transform.scale.set(0.65 + random() * 0.25, 0.48, 0.57);
    // Clear the main entry staircase.
    if (alongFront && transform.position.x > 11 && transform.position.x < 25)
      transform.position.z = -7.4;
    transform.updateMatrix();
    shrubs.setMatrixAt(i, transform.matrix);
  }
  shrubs.castShadow = true;
  shrubs.receiveShadow = true;
  group.add(shrubs);

  // Faceted forested ridgelines reproduce the sheltered mountain campus setting.
  const hillGeometry = new THREE.IcosahedronGeometry(1, 2);
  const hills = new THREE.InstancedMesh(hillGeometry, material(0x718769), 21);
  for (let i = 0; i < 21; i++) {
    transform.position.set(
      i < 13 ? -220 + i * 34 : -185 - random() * 35,
      -13 - random() * 8,
      i < 13 ? -175 - random() * 40 : -110 + (i - 13) * 35,
    );
    transform.rotation.set(0, random() * 6.28, 0);
    transform.scale.set(
      45 + random() * 20,
      40 + random() * 22,
      40 + random() * 22,
    );
    transform.updateMatrix();
    hills.setMatrixAt(i, transform.matrix);
    hills.setColorAt(
      i,
      new THREE.Color().setHSL(
        0.27,
        0.11 + random() * 0.05,
        0.38 + random() * 0.07,
      ),
    );
  }
  hills.receiveShadow = true;
  group.add(hills);

  // Nearby agricultural parcels: east is open farmland, west and north are wooded.
  const fields = new THREE.Group();
  fields.name = "surrounding-farmland";
  group.add(fields);
  const cropColors = [0x919b65, 0xa4a279, 0x788b59, 0xaaa184, 0x859779];
  for (let row = 0; row < 7; row++) for (let col = 0; col < 4; col++) {
    const x = 130 + col * 52, z = -130 + row * 47;
    box(fields, x, 0.025, z, 47, 0.06, 41, cropColors[(row + col * 2) % cropColors.length]);
    for (let strip = -20; strip <= 20; strip += 4) box(fields, x + strip, 0.065, z, 0.24, 0.025, 40, 0x9ba27c);
    box(fields, x + 25, 0.01, z, 1.2, 0.045, 47, 0x6a837d);
  }
  box(group, 101, 0.01, 20, 4, 0.07, 350, palette.asphalt);
  box(group, 206, 0.01, 105, 210, 0.07, 4, palette.asphalt);
  box(group, 206, 0.01, -59, 210, 0.07, 3, 0xb9b59b);

  // Parking bay paint and unoccupied cars provide familiar objects for scale.
  for (let i = 0; i <= 7; i++)
    fieldLine(46 + i * 3.1, -9, 0.075, 5.6, 0xc4cbbc);
  function car(x: number, z: number, color: number) {
    const carGroup = new THREE.Group();
    carGroup.position.set(x, 0, z);
    group.add(carGroup);
    box(carGroup, 0, 0.66, 0, 1.7, 0.65, 3.7, color);
    box(carGroup, 0, 1.18, -0.15, 1.42, 0.52, 1.8, 0x3c5356, true);
    box(carGroup, 0, 1.48, -0.15, 1.45, 0.09, 1.6, color);
    for (const side of [-1, 1])
      for (const end of [-1, 1]) {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.33, 0.33, 0.17, 10),
          material(0x37433e),
        );
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(side * 0.85, 0.36, end * 1.15);
        carGroup.add(wheel);
      }
    box(carGroup, -0.54, 0.7, 1.87, 0.38, 0.16, 0.035, 0xe3e5cd);
    box(carGroup, 0.54, 0.7, 1.87, 0.38, 0.16, 0.035, 0xe3e5cd);
  }
  for (const [x, color] of [
    [47.6, 0xd9ddd3],
    [53.8, 0x64777a],
    [57, 0xc9c9bc],
    [66.2, 0x566272],
  ])
    car(x, -9, color);
  for (const [x, z] of [
    [-27, 17],
    [45, 17],
    [-27, 61],
    [45, 61],
    [45, -15],
    [-21, -7],
  ]) {
    box(group, x, 2.7, z, 0.13, 5.4, 0.13, 0x82968d);
    box(group, x, 5.35, z, 0.8, 0.15, 0.42, 0xa1b2a5);
    box(group, x, 5.25, z, 0.55, 0.06, 0.26, 0xf1e8c7);
  }
  // Seating beside the field.
  for (const x of [-29, -19, 21, 31]) {
    const bench = part(
      `bench-${x}`,
      v(x, 0.62, 68),
      v(3.6, 0.15, 0.72),
      0x9c8060,
      "wood",
      [],
    );
    box(bench, 0, 0.39, 0.36, 3.6, 0.61, 0.12, 0x9c8060);
    box(bench, -1.25, -0.32, 0, 0.12, 0.6, 0.68, 0x56635a);
    box(bench, 1.25, -0.32, 0, 0.12, 0.6, 0.68, 0x56635a);
  }

  // Bake thousands of small window frames into their owning rigid body. Two
  // material batches per facade preserve glass while dramatically reducing draws.
  const bakedSolid = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.87,
  });
  const bakedGlass = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.25,
    metalness: 0.28,
  });
  group.updateMatrixWorld(true);
  for (const { mesh } of parts) {
    if (mesh.children.length === 0) continue;
    const inverse = mesh.matrixWorld.clone().invert();
    const batches: THREE.BufferGeometry[][] = [[], []];
    const bakedChildren: THREE.Mesh[] = [];
    mesh.traverse((object) => {
      if (
        !(object instanceof THREE.Mesh) ||
        Array.isArray(object.material) ||
        !(object.material instanceof THREE.MeshStandardMaterial)
      )
        return;
      const copy = object.geometry.clone();
      if (object !== mesh)
        copy.applyMatrix4(inverse.clone().multiply(object.matrixWorld));
      const colors = new Float32Array(copy.getAttribute("position").count * 3);
      for (let i = 0; i < colors.length; i += 3)
        object.material.color.toArray(colors, i);
      copy.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      // Every box, sphere and cylinder used above has position/normal/uv attributes.
      batches[object.material.roughness < 0.5 ? 1 : 0].push(copy);
      if (object !== mesh) bakedChildren.push(object);
    });
    const batchGeometries = batches.map((batch) =>
      batch.length ? mergeGeometries(batch, false) : null,
    );
    const merged = mergeGeometries(
      batchGeometries.filter(
        (batch): batch is THREE.BufferGeometry => batch !== null,
      ),
      true,
    );
    if (merged) {
      mesh.geometry = merged;
      mesh.material = batchGeometries[1]
        ? [bakedSolid, bakedGlass]
        : bakedSolid;
      for (const child of bakedChildren) child.removeFromParent();
    }
    for (const batch of batches) for (const copied of batch) copied.dispose();
    for (const batch of batchGeometries) batch?.dispose();
  }
  destructibleScenery(group,parts);
  if (batchScenery) batchStaticScenery(group, new Set(parts.map(part => part.mesh)));
  return { group, parts };
}
