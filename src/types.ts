import type * as THREE from "three";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}
export type PartKind =
  | "wall"
  | "slab"
  | "column"
  | "glass"
  | "detail"
  | "roof"
  | "wood";
export interface PartSpec {
  id: string;
  position: Vec3;
  size: Vec3;
  color: number;
  kind: PartKind;
  supports: string[];
  anchored?: boolean;
  rotation?: number;
}
export interface CampusPart {
  spec: PartSpec;
  mesh: THREE.Mesh;
}
export interface Campus {
  group: THREE.Group;
  parts: CampusPart[];
}
export interface PhysicsStats {
  total: number;
  detached: number;
  moving: number;
  burning: number;
  integrity: number;
}
