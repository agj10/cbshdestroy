import {lavaMaterial} from './lava-material';
import { SolidSmoke } from "./solid-smoke";
import { FractureDust } from "./fracture-dust";
import type { DestructionTool } from "./destruction-tools";
import { stylizedFlameGeometry } from "./flame-material";
import * as THREE from "three";
import type { PhysicsSimulation } from "./physics";
import type { CampusPart, Vec3 } from "./types";
import {
  MAX_INTENSITY,
  intensityGain,
  normalizeSettings,
  type DisasterSettings,
} from "./disaster-settings";

export type DisasterId =
  | "meteor"
  | "volcano"
  | "flood"
  | "earthquake"
  | "tsunami"
  | "lightning"
  | "fire"
  | "explosion"
  | "plane"
  | "blackhole"
  | "aliens"
  | "tornado"
  | "hail"
  | "gravity";
export interface DisasterInfo {
  id: DisasterId;
  name: string;
  english: string;
  category: "자연" | "사고" | "상상";
  icon: string;
  description: string;
  mechanism: string;
  duration: number;
  color: number;
}
export const DISASTERS: DisasterInfo[] = [
  {
    id: "meteor",
    name: "운석 충돌",
    english: "METEOR IMPACT",
    category: "자연",
    icon: "meteor",
    description: "하늘을 가르는 불빛, 그리고 거대한 충돌.",
    mechanism: "충격파 · 파편 충돌 · 지지 구조 붕괴",
    duration: 10,
    color: 0xff9a52,
  },
  {
    id: "earthquake",
    name: "지진",
    english: "EARTHQUAKE",
    category: "자연",
    icon: "activity",
    description: "흔들리는 지반이 건물의 연결부를 시험합니다.",
    mechanism: "지반 가속도 · 관성 하중 · 연쇄 붕괴",
    duration: 16,
    color: 0xe8bc75,
  },
  {
    id: "tsunami",
    name: "지진해일",
    english: "TSUNAMI",
    category: "자연",
    icon: "waves",
    description: "캠퍼스를 향해 밀려오는 거대한 물결.",
    mechanism: "유체 하중 · 잔해 이동 · 점진 부식",
    duration: 22,
    color: 0x65d3e4,
  },
  {
    id: "volcano",
    name: "화산 폭발",
    english: "VOLCANIC ERUPTION",
    category: "자연",
    icon: "mountain",
    description: "흐르는 용암이 구조를 녹이고 화산탄이 떨어집니다.",
    mechanism: "화산탄 충격 · 고열 연화 · 구조 약화",
    duration: 22,
    color: 0xff7c52,
  },
  {
    id: "flood",
    name: "홍수",
    english: "FLOOD",
    category: "자연",
    icon: "droplets",
    description: "차오르는 물이 낮은 층부터 잠기게 합니다.",
    mechanism: "수위 상승 · 부력 · 유체 항력 · 부식",
    duration: 28,
    color: 0x75c8eb,
  },
  {
    id: "lightning",
    name: "낙뢰",
    english: "LIGHTNING",
    category: "자연",
    icon: "zap",
    description: "섬광과 함께 한 지점에 열이 집중됩니다.",
    mechanism: "국소 열손상 · 작은 표면 파편",
    duration: 7,
    color: 0xf0d990,
  },
  {
    id: "tornado",
    name: "토네이도",
    english: "TORNADO",
    category: "자연",
    icon: "wind",
    description: "회오리바람이 지붕과 잔해를 끌어올립니다.",
    mechanism: "회전 풍력 · 상승력 · 잔해 충돌",
    duration: 22,
    color: 0xc4c9d8,
  },
  {
    id: "hail",
    name: "거대 우박",
    english: "HAILSTORM",
    category: "자연",
    icon: "cloud",
    description: "굵은 얼음덩이가 지붕과 창문을 두드립니다.",
    mechanism: "반복 충격 · 유리 파손",
    duration: 18,
    color: 0xd1edf3,
  },
  {
    id: "fire",
    name: "화재",
    english: "FIRE",
    category: "사고",
    icon: "flame",
    description: "열이 쌓이고 가까운 가연물로 불이 번집니다.",
    mechanism: "연소 · 열 축적 · 구조 강도 저하",
    duration: 30,
    color: 0xf38a58,
  },
  {
    id: "explosion",
    name: "폭발 사고",
    english: "EXPLOSION",
    category: "사고",
    icon: "burst",
    description: "한순간 퍼지는 충격이 외벽을 밀어냅니다.",
    mechanism: "거리에 따라 줄어드는 충격 · 파편 비산",
    duration: 8,
    color: 0xf5b06d,
  },
  {
    id: "plane",
    name: "비행기 추락",
    english: "AIRCRAFT IMPACT",
    category: "사고",
    icon: "plane",
    description: "무인 모형 비행기의 충돌을 관찰합니다.",
    mechanism: "방향성 충돌 · 잔해 · 후속 화재",
    duration: 16,
    color: 0xebaa81,
  },
  {
    id: "blackhole",
    name: "블랙홀",
    english: "BLACK HOLE",
    category: "상상",
    icon: "orbit",
    description: "작은 어둠이 주변의 모든 것을 끌어당깁니다.",
    mechanism: "게임용 인력장 · 비틀림 응력 · 구조 분리",
    duration: 24,
    color: 0xb9a0ff,
  },
  {
    id: "aliens",
    name: "외계 침공",
    english: "ALIEN INVASION",
    category: "상상",
    icon: "ufo",
    description: "미확인 비행체가 캠퍼스 위에 나타납니다.",
    mechanism: "가상의 에너지 빔 · 국소 충격과 가열",
    duration: 22,
    color: 0xa9e4ac,
  },
  {
    id: "gravity",
    name: "중력 반전",
    english: "REVERSE GRAVITY",
    category: "상상",
    icon: "arrowup",
    description: "부서진 조각이 떠올랐다가 다시 내려옵니다.",
    mechanism: "상승력 · 중력에 의한 낙하 충돌",
    duration: 20,
    color: 0xc4b7ef,
  },
];

interface Effect {
  info: DisasterInfo;
  settings: Readonly<DisasterSettings>;
  target: THREE.Vector3;
  intensity: number;
  age: number;
  next: number;
  group: THREE.Group;
  fired: boolean;
  seed: number;
  flashUntil?: number;
  secondaryFireDone?: boolean;
  approach?: THREE.Vector3;
  travelTime?: number;
  strikes: number;
  lastManualAttack: number;
  /** Fire visual groups are parented to individual construction meshes, not the effect root. */
  fireVisuals?: Map<string, FireVisual>;
  volcano?: VolcanoVisual;
}
interface Particle {
  p: THREE.Vector3;
  v: THREE.Vector3;
  life: number;
  max: number;
  size: number;
  color: THREE.Color;
  gravity: number;
}
interface Projectile {
  effect: Effect;
  mesh: THREE.Mesh;
  start: THREE.Vector3;
  hit: THREE.Vector3;
  age: number;
  duration: number;
  radius: number;
  power: number;
  heat: number;
}

interface FireVisual {
  part: CampusPart;
  group: THREE.Group;
  outerFlames: THREE.Mesh[];
  innerFlames: THREE.Mesh[];
  smoke: SolidSmoke;
  seed: number;
  age: number;
}

interface VolcanoVisual {
  origin: THREE.Vector3;
  height: number;
  baseRadius: number;
  magma: THREE.Mesh;
  magmaMaterial: THREE.MeshStandardMaterial;
  lava: THREE.Mesh[];
  lavaMaterials: THREE.MeshStandardMaterial[];
  plume: SolidSmoke;
  ventRocks: THREE.Mesh[];
  flows: Array<{mesh:THREE.Mesh; points:THREE.Vector3[]; width:number}>;
  flowClock:number;
}
const UP = new THREE.Vector3(0, 1, 0);
const number = (e: Effect, key: string) => Number(e.settings[key]);
const heading = (degrees: number) => {
  const angle = THREE.MathUtils.degToRad(degrees);
  return new THREE.Vector3(Math.sin(angle), 0, -Math.cos(angle));
};
const finite = (point: Vec3) =>
  Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z);

/** Seeded effects and normalized game forces, deliberately not an engineering hazard model. */
export class DisasterDirector {
  effects: Effect[] = [];
  private dust: FractureDust;
  private particles: Particle[] = [];
  private particleMesh: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();
  private surfaceFires = new Map<string, FireVisual>();
  private waterMesh: THREE.Mesh;
  private waterAligned = false;
  private waterCrest = { value: -1 };
  private seed = 9471;
  private waterPhase = 0;
  private disposed = false;
  private projectiles: Projectile[] = [];
  private surfaceRay = new THREE.Raycaster();
  onImpact: (strength: number) => void = () => {};
  onEvent: (text: string) => void = () => {};
  terrainEnabled = true;
  onTerrainImpact: (
    center: Vec3,
    radius: number,
    depth: number,
    source: DisasterId | "direct",
  ) => void = () => {};
  constructor(
    private scene: THREE.Scene,
    private sim: PhysicsSimulation,
  ) {
    this.dust = new FractureDust(scene);
    this.particleMesh = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.MeshStandardMaterial({ roughness: 0.9 }),
      900,
    );
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleMesh.count = 0;
    this.particleMesh.frustumCulled = false;
    scene.add(this.particleMesh);
    const geometry = new THREE.PlaneGeometry(1800, 1800, 300, 300);
    geometry.rotateX(-Math.PI / 2);
    this.waterMesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: 0x479faf,
        transparent: true,
        opacity: 0.64,
        roughness: 0.22,
        metalness: 0.25,
        side: THREE.DoubleSide,
      }),
    );
    (this.waterMesh.material as THREE.MeshStandardMaterial).onBeforeCompile=shader=>{
      shader.uniforms.crestHeight=this.waterCrest;
      shader.vertexShader='varying vec3 waterPoint;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n waterPoint=position;');
      shader.fragmentShader='varying vec3 waterPoint; uniform float crestHeight;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',
        '#include <color_fragment>\n if(waterPoint.y < -0.05) discard;\n float foam=crestHeight>0.0?smoothstep(crestHeight*0.82,crestHeight*0.98,waterPoint.y):0.0;\n diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.82,0.94,0.91),foam*0.85);');
    };
    this.waterMesh.visible = false;
    this.waterMesh.renderOrder = 2;
    scene.add(this.waterMesh);
  }
  private random() {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  launch(
    id: DisasterId,
    target: Vec3,
    intensity: number,
    settings?: Partial<DisasterSettings>,
  ) {
    if (
      this.disposed ||
      this.effects.length >= 4 ||
      ![target.x, target.y, target.z, intensity].every(Number.isFinite)
    )
      return false;
    const preset = DISASTERS.find((d) => d.id === id);
    if (!preset) return false;
    const snapshot = Object.freeze({ ...normalizeSettings(id, settings) });
    const info = {
      ...preset,
      duration: Number(snapshot.duration ?? preset.duration),
    };
    intensity = THREE.MathUtils.clamp(intensity, 1, MAX_INTENSITY);
    const group = new THREE.Group();
    this.scene.add(group);
    const effect: Effect = {
      info,
      settings: snapshot,
      target: new THREE.Vector3(target.x, target.y, target.z),
      intensity,
      age: 0,
      next: 0,
      group,
      fired: false,
      seed: this.random(),
      strikes: 0,
      lastManualAttack: -Infinity,
    };
    this.effects.push(effect);
    this.setup(effect);
    this.onEvent(`${info.name} 시작`);
    return true;
  }
  private mesh(g: THREE.BufferGeometry, color: number, emissive = false) {
    return new THREE.Mesh(
      g,
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.65,
        metalness: 0.15,
        emissive: emissive ? color : 0,
        emissiveIntensity: emissive ? 0.9 : 0,
      }),
    );
  }

  private fireSurfaceParts(
    e: Effect,
    radius: number,
  ): Array<{ part: CampusPart; distance: number; state: ReturnType<PhysicsSimulation["getState"]> }> {
    // Fire belongs to surfaces and contents represented by actual campus meshes.
    // Columns/slabs are intentionally excluded as visual sources: they can be heated
    // and lose capacity, but do not turn into floating-looking flame emitters.
    const sourceKinds = new Set(["wall", "glass", "detail", "roof", "wood"]);
    const states = (this.sim as Partial<PhysicsSimulation>).getState;
    if (!states) return [];
    const wind = heading(number(e, "direction"));
    const windStrength = Math.min(0.35, number(e, "wind") / 45);
    const candidates: Array<{
      part: CampusPart;
      distance: number;
      state: ReturnType<PhysicsSimulation["getState"]>;
    }> = [];
    for (const part of this.sim.parts) {
      if (!sourceKinds.has(part.spec.kind)) continue;
      const state = states.call(this.sim, part.spec.id);
      if (!state || state.erosion >= 1) continue;
      const dx = state.position.x - e.target.x;
      const dy = (state.position.y - e.target.y) * 0.58;
      const dz = state.position.z - e.target.z;
      const along = dx * wind.x + dz * wind.z;
      // Wind stretches the heat footprint downwind, but does not move a fire into
      // empty air. Every chosen point still resolves to a real construction mesh.
      const distance = Math.max(0, Math.hypot(dx, dy, dz) - along * windStrength);
      if (distance <= radius) candidates.push({ part, distance, state });
    }
    candidates.sort((a, b) => a.distance - b.distance);
    return candidates;
  }

  /** Local surface anchors allow multiple fires on a single large member. */
  private paintFire(point: THREE.Vector3, radius: number): void {
    for(const part of this.sim.parts){
      if(!part.mesh.visible || part.mesh.position.distanceToSquared(point)>(radius+Math.max(part.spec.size.x,part.spec.size.y,part.spec.size.z))**2)continue;
      const state=this.sim.getState?.(part.spec.id);
      if(!state || state.melting || state.erosion>=1)continue;
      part.mesh.updateWorldMatrix(true,false);
      const local=part.mesh.worldToLocal(point.clone());
      const half=new THREE.Vector3(part.spec.size.x/2,part.spec.size.y/2,part.spec.size.z/2);
      const surface=local.clone().clamp(half.clone().negate(),half);
      if(part.mesh.localToWorld(surface.clone()).distanceTo(point)>Math.min(radius,2.5))continue;
      const gaps=[half.x-Math.abs(surface.x),half.y-Math.abs(surface.y),half.z-Math.abs(surface.z)];
      const axis=gaps.indexOf(Math.min(...gaps));
      surface.setComponent(axis,(surface.getComponent(axis)<0?-1:1)*(half.getComponent(axis)+.04));
      const key=part.spec.id+':'+[surface.x,surface.y,surface.z].map(v=>Math.round(v/1.5)).join(',');
      if(!this.surfaceFires.has(key) && this.surfaceFires.size<160)this.surfaceFires.set(key,this.createFireVisual(part,surface));
    }
  }
  private createFireVisual(part: CampusPart, local?: THREE.Vector3): FireVisual {
    const group = new THREE.Group();
    group.name = `Attached flame · ${part.spec.id}`;
    const breadth = Math.max(0.55, Math.min(2.2, part.spec.size.x * 0.32));
    const depth = Math.max(0.08, Math.min(2, part.spec.size.z * 0.3));
    // Parent the source to the part so it follows the wall/roof through all later
    // physics motion. The top edge is a readable proxy for interior fuel behind a
    // facade when the model does not contain individual room furnishings.
    group.position.set(
      (this.random() - 0.5) * breadth,
      part.spec.size.y * 0.5 + 0.045,
      (this.random() - 0.5) * depth,
    );
    if(local) group.position.copy(local);
    group.rotation.y = this.random() * Math.PI * 2;

    const outerFlames: THREE.Mesh[] = [];
    const innerFlames: THREE.Mesh[] = [];
    const tongues = 5 + Math.floor(this.random() * 4);
    const sourceScale = .65 + this.random() * .9;
    for (let i = 0; i < tongues; i++) {
      const height = (2.8 + this.random() * 4.8) * sourceScale;
      const geometry = stylizedFlameGeometry(height, (.65 + this.random() * .65) * sourceScale, this.random());
      const flame = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide}));
      flame.position.set((this.random()-.5)*breadth*1.6,0,(this.random()-.5)*depth*1.5);
      flame.rotation.y = this.random() * Math.PI * 2;
      group.add(flame);
      outerFlames.push(flame);
    }

    const smoke = new SolidSmoke(group, () => this.random());
    part.mesh.add(group);
    return {
      part,
      group,
      outerFlames,
      innerFlames,
      smoke,
      seed: this.random() * Math.PI * 2,
      age: 0,
    };
  }

  private updateFireVisual(
    visual: FireVisual,
    state: NonNullable<ReturnType<PhysicsSimulation["getState"]>>,
    dt: number,
  ): void {
    visual.age += dt;
    visual.group.quaternion.copy(visual.part.mesh.quaternion).invert();
    const heat = THREE.MathUtils.clamp((state.temperature - 160) / 460, 0, 1);
    const health = 1 - state.damage * 0.35;
    for (let i = 0; i < visual.outerFlames.length; i++) {
      const flame = visual.outerFlames[i];

      const flicker = 0.83 + 0.22 * Math.sin(visual.age * (9.7 + i) + visual.seed);
      flame.scale.set(
        (0.75 + heat * 0.55) * flicker,
        (0.85 + heat * .7) * health * (1 + .18*Math.sin(visual.age*(4+i*.3)+visual.seed+i)),
        (0.75 + heat * 0.55) * flicker,
      );
      flame.rotation.z =
        Math.sin(visual.age * (5.1 + i * 0.7) + visual.seed) * (0.14 + heat * 0.14);
    }
    for (let i = 0; i < visual.innerFlames.length; i++) {
      const flame = visual.innerFlames[i];
      const flicker = 0.88 + 0.18 * Math.sin(visual.age * (12.3 + i) + visual.seed);
      flame.scale.setScalar((0.72 + heat * 0.5) * flicker * health);
    }
    visual.smoke.update(visual.age, 1.6 + heat, 18 + heat * 12, .75 + heat * .45 + Math.sin(visual.seed) * .2);
  }

  private clearFireVisuals(e: Effect): void {
    for (const visual of e.fireVisuals?.values() ?? []) this.remove(visual.group);
    e.fireVisuals?.clear();
  }

  private updateFire(e: Effect, dt: number): void {
    const s = Math.min(e.intensity, 5);
    const gain = intensityGain(e.intensity);
    const radius = Math.max(
      1.35,
      number(e, "radius") +
        e.age * number(e, "spread") * (0.72 + Math.min(0.45, number(e, "wind") / 34)),
    );
    const candidates = this.fireSurfaceParts(e, radius);
    if (candidates.length === 0) {
      this.clearFireVisuals(e);
      return;
    }

    const active = candidates.slice(0, Math.min(16, 2 + Math.ceil(radius * 0.7)));
    for (const candidate of active) {
      const falloff = 0.45 + 0.55 * (1 - candidate.distance / Math.max(radius, 0.01));
      const size = candidate.part.spec.size;
      const localRadius = Math.max(0.7, Math.min(2.4, Math.max(size.x, size.y, size.z) * 0.45));
      this.sim.heat(
        candidate.state!.position,
        localRadius,
        dt * (3 + s * 1.2) * number(e, "heat") * gain * falloff,
      );
    }

  }

  private updateSurfaceFires(dt: number): void {
    const states=(this.sim as Partial<PhysicsSimulation>).getState;
    if(!states)return;
    const candidates = this.sim.getHeatedParts?.(185) ?? this.sim.parts;
    for(const part of candidates){
      if(!['wood','detail','roof'].includes(part.spec.kind))continue;
      const state=states.call(this.sim,part.spec.id);
      if(!state || state.melting || state.erosion>=1 || state.temperature<185 || !part.mesh.visible)continue;
      if(!Array.from(this.surfaceFires.values()).some(v=>v.part===part) && this.surfaceFires.size<160)
        this.surfaceFires.set(part.spec.id,this.createFireVisual(part));
    }
    for(const [key,visual] of this.surfaceFires){
      const state=states.call(this.sim,visual.part.spec.id);
      if(!state || state.melting || state.erosion>=1 || state.temperature<150 || !visual.part.mesh.visible){this.remove(visual.group);this.surfaceFires.delete(key);}
      else this.updateFireVisual(visual,state,dt);
    }
  }

  private createVolcano(e: Effect): VolcanoVisual {
    const gain = intensityGain(e.intensity);
    const origin = new THREE.Vector3(e.target.x, 0.16, e.target.z);
    const height = 10.5 + number(e, "diameter") * 2.1 + Math.min(7, e.intensity) * 0.72;
    const baseRadius = 12 + number(e, "diameter") * 2.5 + gain ** 0.2 * 1.8;
    const rimOuter = baseRadius * 0.28;
    const rimInner = rimOuter * 0.5;
    e.group.name = "Volcanic cone and crater";
    e.group.position.copy(origin);
    const profile = [
      new THREE.Vector2(baseRadius, 0),
      new THREE.Vector2(baseRadius * 0.78, height * 0.12),
      new THREE.Vector2(baseRadius * 0.53, height * 0.42),
      new THREE.Vector2(rimOuter * 1.15, height * 0.89),
      new THREE.Vector2(rimOuter, height),
      new THREE.Vector2(rimInner, height),
      new THREE.Vector2(rimInner * 0.82, height - 0.72),
      new THREE.Vector2(rimInner * 0.54, height - 1.2),
    ];
    const cone = this.mesh(new THREE.LatheGeometry(profile, 32), 0x443a35);
    const coneMaterial = cone.material as THREE.MeshStandardMaterial;
    coneMaterial.roughness = 0.98;
    coneMaterial.metalness = 0.03;
    e.group.add(cone);
    const magmaMaterial = new THREE.MeshStandardMaterial({
      color: 0xff5420,
      emissive: 0xff2404,
      emissiveIntensity: 2.1,
      roughness: 0.42,
      metalness: 0.06,
    });
    const magma = new THREE.Mesh(new THREE.CircleGeometry(rimInner * 0.72, 28), magmaMaterial);
    magma.rotation.x = -Math.PI / 2;
    magma.position.y = height - 1.14;
    e.group.add(magma);

    const lava: THREE.Mesh[] = [];
    const lavaMaterials: THREE.MeshStandardMaterial[] = [];
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 + 0.35;
      const radial = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      const tangent = new THREE.Vector3(-radial.z, 0, radial.x);
      const path = new THREE.CatmullRomCurve3([
        radial.clone().multiplyScalar(rimInner * 0.9).setY(height - 0.85),
        radial
          .clone()
          .multiplyScalar(baseRadius * 0.54)
          .addScaledVector(tangent, (i - 1) * 1.1)
          .setY(height * 0.43),
        radial
          .clone()
          .multiplyScalar(baseRadius * 1.02)
          .addScaledVector(tangent, (i - 1) * 1.8)
          .setY(0.16),
      ]);
      const material = new THREE.MeshStandardMaterial({
        color: 0xff4d15,
        emissive: 0xff2605,
        emissiveIntensity: 1.65,
        roughness: 0.48,
      });
      const flow = new THREE.Mesh(new THREE.TubeGeometry(path, 18, 0.34, 6, false), material);
      e.group.add(flow);
      lava.push(flow);
      lavaMaterials.push(material);
    }
    const flows: VolcanoVisual['flows'] = [];
    const destination=new THREE.Vector3(4,0,-19.5);
    const toward=destination.clone().sub(origin).setY(0).normalize();
    if(toward.lengthSq()<.01)toward.set(0,0,1);
    const side=new THREE.Vector3(-toward.z,0,toward.x);
    for(let branch=-1;branch<=1;branch++){
      const direction=toward.clone().addScaledVector(side,branch*.28).normalize();
      const length=Math.max(baseRadius+35,destination.clone().sub(origin).length()+28);
      const points:THREE.Vector3[]=[], vertices:number[]=[], indices:number[]=[];
      const width=3.5+e.intensity*.5;
      for(let j=0;j<=72;j++){
        const distance=rimOuter+(length-rimOuter)*j/72;
        const stops=[[rimOuter,height],[baseRadius*.322,height*.89],[baseRadius*.53,height*.42],[baseRadius*.78,height*.12],[baseRadius,0]];
        let y=.22;
        for(let k=1;k<stops.length;k++)if(distance<=stops[k][0]){y=THREE.MathUtils.lerp(stops[k-1][1],stops[k][1],(distance-stops[k-1][0])/(stops[k][0]-stops[k-1][0]));break;}
        const point=direction.clone().multiplyScalar(distance).addScaledVector(side,Math.sin(j*.24+branch)*Math.min(3,j*.15)).setY(y+.32);
        points.push(point);
        const spread=width*(.65+j/100)*(1+.14*Math.sin(j*.7));
        for(const sign of [-1,1]){const edge=point.clone().addScaledVector(side,sign*spread);vertices.push(edge.x,edge.y,edge.z);}
        if(j<72){const k=j*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}
      }
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.setDrawRange(0,0);
      const material=lavaMaterial();
      const mesh=new THREE.Mesh(geometry,material);mesh.name='Advancing lava flow';e.group.add(mesh);flows.push({mesh,points,width});
    }
    const plume = new SolidSmoke(e.group, () => this.random(), 9);
    const ventRocks: THREE.Mesh[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2 + this.random() * 0.22;
      const rock = this.mesh(
        new THREE.DodecahedronGeometry(0.48 + this.random() * 0.72, 0),
        i % 3 === 0 ? 0x5b4337 : 0x302b28,
      );
      rock.position.set(
        Math.cos(angle) * (rimOuter * (0.82 + this.random() * 0.16)),
        height * (0.91 + this.random() * 0.08),
        Math.sin(angle) * (rimOuter * (0.82 + this.random() * 0.16)),
      );
      rock.rotation.set(this.random() * 2, this.random() * 2, this.random() * 2);
      e.group.add(rock);
      ventRocks.push(rock);
    }
    return { origin, height, baseRadius, magma, magmaMaterial, lava, lavaMaterials, plume, ventRocks, flows, flowClock:0 };
  }

  private updateVolcanoVisual(e: Effect, dt: number): void {
    const volcano = e.volcano;
    if (!volcano) return;
    volcano.flowClock+=dt;
    const advance=Math.min(1,Math.max(0,e.age-1)/(e.info.duration*.65));
    for(const flow of volcano.flows){
      const visible=Math.floor(advance*72);
      flow.mesh.geometry.setDrawRange(0,visible*6);
      (flow.mesh.material as THREE.MeshStandardMaterial).userData.flowTime.value=e.age;
      if(volcano.flowClock>=.25 && visible>0)for(let j=0;j<=visible;j+=3){
        const contact=flow.points[j].clone().add(volcano.origin);
        this.sim.melt(contact,flow.width+2,.055*(.7+e.intensity*.15)*number(e,"heat"));
      }
    }
    if(volcano.flowClock>=.25)volcano.flowClock=0;
    const pulse = 0.86 + 0.14 * Math.sin(e.age * 5.2);
    volcano.magma.scale.set(pulse, pulse, 1);
    volcano.magmaMaterial.emissiveIntensity = 1.55 + 0.75 * pulse;
    for (let i = 0; i < volcano.lava.length; i++) {
      volcano.lavaMaterials[i].emissiveIntensity = 1.2 + 0.65 * Math.sin(e.age * 3.8 + i);

    }
    volcano.plume.update(e.age, volcano.height + .5, 16 + e.intensity, 1.4 + e.intensity * .07);
    for (let i = 0; i < volcano.ventRocks.length; i++)
      volcano.ventRocks[i].rotation.y += dt * (0.12 + i * 0.015);
  }
  private approach(e: Effect, height: number) {
    const angle = THREE.MathUtils.degToRad(number(e, "angle"));
    const distance = height / Math.tan(angle);
    e.approach = heading(number(e, "direction"))
      .multiplyScalar(-distance)
      .addScaledVector(UP, height);
    e.travelTime = Math.max(0.12, e.approach.length() / number(e, "speed"));
    e.info.duration = Math.max(e.info.duration, e.travelTime + 4);
    e.group.position.copy(e.target).add(e.approach);
  }
  private setup(e: Effect) {
    const id = e.info.id;
    const gain = intensityGain(e.intensity);
    if (id === "lightning")
      e.info.duration = Math.max(
        e.info.duration,
        (Math.round(number(e, "strikes")) - 1) * number(e, "interval") + 1,
      );
    if (id === "meteor" || id === "volcano" || id === "hail") {
      if (id === "meteor") {
        const color =
          e.settings.composition === "ice"
            ? 0xa0d9e8
            : e.settings.composition === "iron"
              ? 0x4e555e
              : 0x574237;
        const stone = this.mesh(
          new THREE.IcosahedronGeometry(
            number(e, "diameter") * 0.5 * gain ** 0.12,
            1,
          ),
          color,
        );
        stone.material.metalness =
          e.settings.composition === "iron" ? 0.85 : 0.08;
        stone.material.roughness =
          e.settings.composition === "ice" ? 0.16 : 0.7;
        e.group.add(stone);
        this.approach(e, 95);
      }
      if (id === "volcano") e.volcano = this.createVolcano(e);
    }
    if (id === "plane") {
      this.approach(e, 32);
      e.group.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, -1),
        e.approach!.clone().negate().normalize(),
      );
      const cargo = e.settings.aircraft === "cargo",
        glider = e.settings.aircraft === "glider";
      const color = cargo ? 0x809497 : glider ? 0xebdcad : 0xe9e6da;
      const body = this.mesh(
        new THREE.CylinderGeometry(
          cargo ? 1.4 : glider ? 0.38 : 0.9,
          0.55,
          cargo ? 15 : 11,
          10,
        ),
        color,
      );
      body.rotation.x = Math.PI / 2;
      e.group.add(body);
      const wing = this.mesh(
        new THREE.BoxGeometry(
          glider ? 20 : cargo ? 18 : 13,
          0.2,
          cargo ? 3.8 : 2.4,
        ),
        color,
      );
      e.group.add(wing);
      const tail = this.mesh(new THREE.BoxGeometry(4, 0.2, 1.5), 0xf19760);
      tail.position.z = 4;
      e.group.add(tail);
      const fin = this.mesh(new THREE.BoxGeometry(0.15, 2, 1.8), 0xf19760);
      fin.position.set(0, 1, 4);
      e.group.add(fin);
      e.group.scale.setScalar(number(e, "size") * gain ** 0.08);
    }
    if (id === "blackhole" || id === "gravity") {
      e.group.position.copy(e.target).addScaledVector(UP, number(e, "height"));
      const ball = this.mesh(
        new THREE.SphereGeometry(
          id === "blackhole" ? number(e, "size") : 3.3,
          32,
          24,
        ),
        id === "blackhole" ? 0x030308 : 0xbbb0ff,
        id !== "blackhole",
      );
      e.group.add(ball);
      for (let i = 0; i < 3; i++) {
        const ring = this.mesh(
          new THREE.TorusGeometry(
            (5 + i * 1.2) * (id === "blackhole" ? number(e, "size") / 3.3 : 1),
            0.12 + 0.15 * i,
            8,
            64,
          ),
          0xb898f5,
          true,
        );
        ring.rotation.set(Math.PI * 0.43 + i * 0.15, 0.2, 0);
        e.group.add(ring);
      }
    }
    if (id === "aliens") {
      e.group.position.copy(e.target).addScaledVector(UP, number(e, "height"));
      for (let i = 0; i < Math.round(number(e, "craftCount")); i++) {
        const craft = new THREE.Group();
        if (number(e, "craftCount") > 1) {
          const a = (i / number(e, "craftCount")) * Math.PI * 2;
          craft.position.set(
            Math.cos(a) * 14,
            Math.sin(a) * 3,
            Math.sin(a) * 14,
          );
        }
        const saucer = this.mesh(new THREE.SphereGeometry(8, 24, 12), 0x858e91);
        saucer.scale.y = 0.23;
        craft.add(saucer);
        const cockpit = this.mesh(
          new THREE.SphereGeometry(3.5, 20, 12),
          0x9bdabb,
          true,
        );
        cockpit.position.y = 1;
        craft.add(cockpit);
        const ring = this.mesh(
          new THREE.TorusGeometry(6, 0.16, 8, 40),
          0xaaffae,
          true,
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = -1;
        craft.add(ring);
        const tractor=new THREE.Mesh(new THREE.CylinderGeometry(.7,8,32,16,1,true),new THREE.MeshBasicMaterial({color:0x82ffc0,transparent:true,opacity:.055,depthWrite:false,side:THREE.DoubleSide}));
        tractor.name="Debris tractor beam";tractor.position.y=-18;craft.add(tractor);
        e.group.add(craft);
      }
    }
    if (id === "tornado") {
      e.group.position.copy(e.target).add(new THREE.Vector3(0, 0, 6));
      for (let i = 0; i < 20; i++) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(1 + i * 0.34, 0.2 + i * 0.018, 5, 28),
          new THREE.MeshStandardMaterial({
            color: 0x90999a,
            transparent: true,
            opacity: 0.58,
          }),
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = i * 1.8;
        e.group.add(ring);
      }
      e.group.scale.set(
        (number(e, "radius") / 70) * gain ** 0.3,
        Math.max(0.4, number(e, "lift") ** 0.3),
        (number(e, "radius") / 70) * gain ** 0.3,
      );
    }
    if (id === "hail") {
      // Start the first stone at t=0, so even a short, high-altitude storm reaches the ground
      // within its chosen lifetime at both fast and slow rendering frame rates.
      this.hailstone(e);
      e.next = 1 / number(e, "rate");
    }
  }
  private burst(
    p: Vec3,
    count: number,
    color: number,
    speed = 10,
    life = 2,
    gravity = 6,
    size = 0.6,
  ) {
    for (let i = 0; i < count && this.particles.length < 900; i++) {
      const a = this.random() * Math.PI * 2,
        r = this.random();
      this.particles.push({
        p: new THREE.Vector3(p.x, p.y, p.z),
        v: new THREE.Vector3(
          Math.cos(a) * r * speed,
          (this.random() * 0.9 + 0.15) * speed,
          Math.sin(a) * r * speed,
        ),
        life: life * (0.5 + this.random() * 0.5),
        max: life,
        size: size * (0.4 + this.random()),
        color: new THREE.Color(color),
        gravity,
      });
    }
  }
  private impact(
    e: Effect,
    p: THREE.Vector3,
    radius: number,
    power: number,
    debris = 1,
    direction?: THREE.Vector3,
  ) {
    const gain = intensityGain(e.intensity);
    const reach = radius * gain ** 0.8;
    this.sim.blast(p, reach, power * gain ** 1.4, {
      impulseScale: debris,
      lift: Math.min(2, 1 + (gain - 1) * 0.05),
      direction,
    });
    if (
      this.terrainEnabled && ["meteor", "explosion", "aliens", "plane", "volcano"].includes(
        e.info.id,
      ) &&
      power * gain > 45
    ) {
      const craterRadius = Math.min(55, Math.max(4, reach * 0.62));
      const craterDepth = Math.min(12, 1.2 + Math.sqrt(power * gain) * 0.2);
      // Shock waves disturb a wide shallow rim; the deep excavation stays near the impact core.
      const coreRadius=Math.max(2.5,craterRadius*.48);
      if (this.sim.deformGround?.(p, craterRadius, Math.min(.65,craterDepth*.08)) !== false)
        this.onTerrainImpact(p, craterRadius, Math.min(.65,craterDepth*.08), e.info.id);
      if (this.sim.deformGround?.(p, coreRadius, craterDepth) !== false)
        this.onTerrainImpact(p, coreRadius, craterDepth, e.info.id);
    }
    this.burst(
      p,
      Math.min(250, 65 * Math.sqrt(gain) * debris),
      0xc3b298,
      (13 + Math.min(e.intensity, 5) * 3) * Math.sqrt(gain) * debris,
      3 + Math.log(gain),
      9,
      0.6,
    );
    this.burst(
      p,
      35 * Math.sqrt(gain),
      e.info.color,
      16 * Math.sqrt(gain),
      1.3,
      1,
      0.55,
    );
    if (gain > 1) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1, 0.028, 5, 64),
        new THREE.MeshBasicMaterial({
          color: e.info.color,
          transparent: true,
          opacity: 0.55,
        }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.copy(p);
      const group = new THREE.Group();
      group.add(ring);
      this.scene.add(group);
      this.transients.push({
        group,
        life: 0.8,
        shock: { mesh: ring, radius: reach, duration: 0.8 },
      });
    }
    this.onImpact(Math.min(3.5, e.intensity * 0.28));
  }
  setDustEnabled(value: boolean) { this.dust.setEnabled(value); }
  fractureDust(position: Vec3, size: Vec3) { this.dust.emit(position,size); }
  crumble(position: Vec3, color: number) { this.burst(position, 12, color, 1.3, 1.8, 9.81, .12); }
  private alienBeam(e: Effect, hit: THREE.Vector3) {
    const s = Math.min(e.intensity, 5);
    const gain = intensityGain(e.intensity);
    this.sim.mutate?.(hit, (8 + s) * Math.sqrt(number(e, "beam")), .35);
    for (const craft of e.group.children) {
      this.impact(
        e,
        hit,
        (4 + s * 1.4) * Math.sqrt(number(e, "beam")),
        (15 + s * 5) * number(e, "beam"),
      );
      const source = craft
          .getWorldPosition(new THREE.Vector3())
          .addScaledVector(UP, -2),
        direction = source.clone().sub(hit);
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.22 * number(e, "beam"),
          0.8 * number(e, "beam"),
          direction.length(),
          8,
        ),
        new THREE.MeshBasicMaterial({
          color: 0xaaffbf,
          transparent: true,
          opacity: 0.65,
        }),
      );
      beam.position.copy(source).add(hit).multiplyScalar(0.5);
      beam.quaternion.setFromUnitVectors(UP, direction.normalize());
      const beamGroup = new THREE.Group();
      beamGroup.add(beam);
      this.scene.add(beamGroup);
      this.transients.push({ group: beamGroup, life: 0.24 });
    }
  }
  /** Direct click/drag targeting for an active UFO group. */
  attackAliens(target: Vec3): boolean {
    if (!finite(target)) return false;
    const effect = this.effects.find(
      (candidate) =>
        candidate.info.id === "aliens" &&
        candidate.age - candidate.lastManualAttack >= 0.12,
    );
    if (!effect) return false;
    effect.lastManualAttack = effect.age;
    this.alienBeam(effect, new THREE.Vector3(target.x, target.y, target.z));
    this.onEvent("UFO 조준 공격");
    return true;
  }
  directDestruction(mode: DestructionTool, point: Vec3, radius: number, strength: number, dt: number): void {
    if(this.disposed || !finite(point) || ![radius,strength,dt].every(Number.isFinite) || radius<=0 || strength<=0 || dt<=0)return;
    radius=THREE.MathUtils.clamp(radius,1,30);strength=THREE.MathUtils.clamp(strength,1,10);dt=Math.min(dt,.2);
    const p=new THREE.Vector3(point.x,point.y,point.z);
    if(mode === "physical"){
      this.sim.blast(p,radius,32*strength, {impulseScale:1.8,lift:1.25});
      const depth=Math.min(9,1+strength*.5);
      if(this.terrainEnabled && this.sim.deformGround(p,radius,depth)!==false)this.onTerrainImpact(p,radius,depth,"direct");
      this.burst(p,40,0xd4c9af,9+strength*1.4,.85,9.81,.35);
    }else if(mode === "burn"){this.sim.heat(p,radius,dt*strength*65);this.paintFire(p,radius);}
    else if(mode === "corrosion"){this.sim.corrode(p,radius,dt*strength*.65);this.burst(p,5,0x8ba973,.6,.5,9.81,.1);}
    else if(mode === "melt")this.sim.melt(p,radius,dt*strength*.15);
    else if(mode === "mutation"){this.sim.mutate(p,radius,dt*strength*.3);this.burst(p,4,0xc491ef,.8,.7,-1,.12);}
    else if(mode === "gravity")this.sim.vortex(p.clone().addScaledVector(UP,8),strength*2,dt,{radius,spin:.5,lift:1});
    else if(mode === "water"){
      const surface=(q:Vec3)=>Math.hypot(q.x-p.x,q.z-p.z)<radius ? p.y+radius*.5 : -100;
      this.sim.water(p.y+radius*.5,{x:strength*3,y:0,z:0},dt,surface);
      this.sim.corrode(p,radius,dt*strength*.05,surface);
      this.burst(p,10,0x90d5e2,4,.8,9.81,.15);
    }else if(mode === "excavate"){
      const depth=Math.min(10,1+strength*.65);
      if (this.terrainEnabled && this.sim.deformGround(p,radius,depth) !== false) this.onTerrainImpact(p,radius,depth,"direct");
      this.burst(p,10,0x82704e,2,.7,9.81,.18);
    }
  }
  private surfaceAt(x: number, z: number) {
    this.surfaceRay.set(
      new THREE.Vector3(x, 140, z),
      new THREE.Vector3(0, -1, 0),
    );
    const meshes = this.sim.parts.filter(part=>part.mesh.visible).map((part) => part.mesh);
    for (const mesh of meshes) mesh.updateWorldMatrix(true, false);
    const first = this.surfaceRay.intersectObjects(meshes, false)[0];
    return new THREE.Vector3(x, Math.max(0.15, first?.point.y ?? 0), z);
  }
  private projectile(
    e: Effect,
    start: THREE.Vector3,
    hit: THREE.Vector3,
    duration: number,
    radius: number,
    power: number,
    heat: number,
    size = heat > 0 ? 0.65 : 0.3,
  ) {
    if (this.projectiles.length >= 128 || e.age + duration >= e.info.duration)
      return;
    const mesh = this.mesh(
      new THREE.IcosahedronGeometry(size, 0),
      heat > 0 ? 0xff773e : 0xd2e9ef,
      heat > 0,
    );
    mesh.material.emissiveIntensity =
      heat > 0 ? Math.min(3, 0.5 + heat / 25) : 0;
    mesh.position.copy(start);
    e.group.add(mesh);
    this.projectiles.push({
      effect: e,
      mesh,
      start,
      hit,
      age: 0,
      duration,
      radius,
      power,
      heat,
    });
  }
  private hailstone(e: Effect) {
    const p = e.target,
      s = Math.min(e.intensity, 5),
      gain = intensityGain(e.intensity);
    const hit = this.surfaceAt(
      p.x + (this.random() - 0.5) * number(e, "spread"),
      p.z + ((this.random() - 0.5) * number(e, "spread") * 38) / 65,
    );
    const size = number(e, "diameter") / 0.6;
    this.projectile(
      e,
      hit.clone().addScaledVector(UP, number(e, "height")),
      hit,
      Math.sqrt((2 * number(e, "height")) / 9.81),
      (2 + s * 0.5) * size ** 0.7,
      ((3 + s * 2) * size ** 1.5 * number(e, "height")) / 30,
      0,
      number(e, "diameter") * 0.5 * gain ** 0.1,
    );
  }
  update(dt: number) {
    if (this.disposed || !Number.isFinite(dt) || dt <= 0) return;
    // Match the physics clock's maximum accepted frame delta; pause is controlled by the caller.
    dt = Math.min(dt, 0.1);
    let waterHeight = -5;
    const waterLayers: Array<(point: Vec3) => number> = [];
    this.waterPhase += dt;
    for (const e of this.effects) {
      e.age = Math.min(e.info.duration, e.age + dt);
      const { id } = e.info,
        t = e.age,
        s = Math.min(e.intensity, 5),
        gain = intensityGain(e.intensity),
        p = e.target;
      if (id === "meteor") {
        const size = number(e, "diameter") / 6;
        const speed = number(e, "speed") / 45;
        const density =
          e.settings.composition === "iron"
            ? 2.5
            : e.settings.composition === "ice"
              ? 0.32
              : 1;
        if (t < e.travelTime!) {
          const k = 1 - t / e.travelTime!;
          e.group.position.copy(p).addScaledVector(e.approach!, k);
          e.group.rotation.x += dt * 1.6;
          this.burst(
            e.group.position,
            Math.min(16, 3 * Math.sqrt(size * gain)),
            e.settings.composition === "ice" ? 0xacf4ff : 0xffaa58,
            1.5 * speed,
            0.6,
            -2,
            0.8 * size,
          );
        } else if (!e.fired) {
          e.fired = true;
          e.group.visible = false;
          this.impact(
            e,
            p,
            (13 + s * 3) * size ** 0.72 * speed ** 0.35 * density ** 0.2,
            (100 + s * 48) * size ** 1.5 * speed * density ** 0.55,
            number(e, "debris"),
            heading(number(e, "direction"))
              .multiplyScalar(
                Math.cos(THREE.MathUtils.degToRad(number(e, "angle"))),
              )
              .addScaledVector(
                UP,
                -Math.sin(THREE.MathUtils.degToRad(number(e, "angle"))),
              ),
          );
          this.onEvent("운석 충돌 · 충격파 전파");
        }
      }
      if (id === "meteor" && e.fired && !e.secondaryFireDone && t > e.travelTime! + 3) {
        e.secondaryFireDone = true;
        if (e.settings.composition !== "ice") this.sim.igniteRemnants?.(p, 9 + number(e,"diameter") * .8, 5);
      }
      if (id === "explosion" && !e.fired) {
        e.fired = true;
        const direction =
          e.settings.pattern === "upward"
            ? UP
            : e.settings.pattern === "directional"
              ? heading(number(e, "direction"))
              : undefined;
        this.impact(
          e,
          p,
          (number(e, "radius") * (10 + s * 3.5)) / 20.5,
          75 + s * 35,
          number(e, "debris"),
          direction,
        );
        if (number(e, "heat") > 0)
          this.sim.heat(
            p,
            number(e, "radius") * gain ** 0.5,
            number(e, "heat") * 35 * gain,
          );
        this.onEvent("폭발 · 파편 충돌 진행");
      }
      if (id === "earthquake") {
        const envelope = Math.sin(Math.min(t / e.info.duration, 1) * Math.PI);
        this.sim.earthquake(dt, s * envelope * gain, {
          frequency: number(e, "frequency"),
          direction: number(e, "direction"),
        });
        if (t > e.next) {
          e.next = t + 0.2;
          this.onImpact(Math.min(2.5, 0.08 * s * envelope * Math.sqrt(gain)));
          if (this.random() > 0.6)
            this.burst(
              {
                x: this.random() * 80 - 40,
                y: 0.3,
                z: this.random() * 60 - 35,
              },
              3,
              0xb8ad97,
              2,
              1.5,
              1,
              0.3,
            );
        }
      }
      if (id === "fire") this.updateFire(e, dt);
      if (id === "lightning") {
        if (t >= e.next && e.strikes < Math.round(number(e, "strikes"))) {
          e.next += number(e, "interval");
          e.strikes++;
          const hit = p
            .clone()
            .add(
              new THREE.Vector3(
                (this.random() - 0.5) * number(e, "spread"),
                0,
                (this.random() - 0.5) * number(e, "spread"),
              ),
            );
          e.flashUntil = t + 0.18;
          for (const child of [...e.group.children]) this.remove(child);
          const points = [];
          for (let i = 0; i < 12; i++)
            points.push(
              new THREE.Vector3(
                hit.x + (i === 11 ? 0 : (this.random() - 0.5) * 7),
                hit.y + 66 - i * 6,
                hit.z + (i === 11 ? 0 : (this.random() - 0.5) * 4),
              ),
            );
          const bolt = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(points),
            new THREE.LineBasicMaterial({ color: 0xeff3ff }),
          );
          e.group.add(bolt);
          this.sim.heat(
            hit,
            (3 + s) * gain ** 0.65,
            (17 + s * 6) * number(e, "heat") * gain,
          );
          this.sim.blast(
            hit,
            (2 + s * 0.6) * gain ** 0.65,
            (6 + s * 2) * gain ** 1.2,
          );
          this.burst(
            hit,
            15 * Math.sqrt(gain),
            0xffffcc,
            4 * Math.sqrt(number(e, "heat") * gain),
            0.5,
            2,
            0.2,
          );
          this.onImpact(0.17);
        }
        e.group.visible = t < (e.flashUntil ?? 0);
      }
      if (id === "flood" || id === "tsunami") {
        const flowDirection = heading(number(e, "direction"));
        const tail = Math.max(
          0,
          Math.min((e.info.duration - t) / (id === "flood" ? 5 : 3), 1),
        );
        const height =
          id === "flood"
            ? ((Math.min(t / number(e, "riseTime"), 1) *
                number(e, "height") *
                (1.2 + s * 1.25)) /
                4.95) *
              tail *
              gain ** 0.42
            : ((number(e, "height") * (3 + s * 1.8)) / 8.4) *
              Math.min(t / 2, 1) *
              tail *
              gain ** 0.42;
        const speed = id === "tsunami" ? number(e, "speed") : number(e, "flow");
        // Each wave keeps its own direction, speed and surface when several disasters coexist.
        const crest = p
          .clone()
          .addScaledVector(
            flowDirection,
            -Math.min(110, speed * e.info.duration * 0.5) + t * speed,
          );
        const surface =
          id === "flood"
            ? () => height
            : (point: Vec3) => {
                const distance =
                  (point.x - crest.x) * flowDirection.x +
                  (point.z - crest.z) * flowDirection.z;
                return (
                  Math.abs(distance) >= number(e, "width") * 1.5 ? -0.15 :
                  height * Math.cos(distance / (number(e, "width") * 1.5) * Math.PI / 2) ** 2 - 0.15
                );
              };
        waterLayers.push(surface);
        waterHeight = Math.max(waterHeight, height);
        const flow =
          speed *
          (id === "tsunami" ? (6 + s * 2) / 10 : (1 + s * 0.6) / 2.8) *
          gain ** 0.45;
        if (height > 0)
          this.sim.water(
            height,
            flowDirection.clone().multiplyScalar(flow),
            dt,
            surface,
          );
        // Water carries two different failure modes: immediate flow load and a
        // slower wet/salt degradation that weakens exposed roof/detail joins.
        this.sim.corrode?.(
          id === "flood" ? p : crest,
          id === "flood" ? 165 : number(e, "width") * 1.45,
          dt *
            height *
            (id === "tsunami" ? 0.034 : 0.012) *
            (1 + flow * 0.025),
          surface,
        );
      }
      if (id === "volcano") this.updateVolcanoVisual(e, dt);
      if (id === "volcano" && t < e.info.duration - 4.4) {
        while (t >= e.next) {
          e.next += 1 / number(e, "rate");
          const hit = this.surfaceAt(
            p.x + (this.random() - 0.5) * number(e, "spread"),
            p.z + ((this.random() - 0.5) * number(e, "spread") * 24) / 44,
          );
          const size = number(e, "diameter") / 1.3;
          this.projectile(
            e,
            e.volcano!.origin.clone().addScaledVector(UP, e.volcano!.height - 0.8),
            hit,
            4.4,
            (3 + s) * size ** 0.7,
            (12 + s * 3) * size ** 1.5,
            (9 + s * 2) * number(e, "heat") * gain,
            number(e, "diameter") * 0.5 * gain ** 0.12,
          );
        }
      }
      if (id === "hail") {
        const travel = Math.sqrt((2 * number(e, "height")) / 9.81);
        while (t >= e.next && t < e.info.duration - travel) {
          e.next += 1 / number(e, "rate");
          this.hailstone(e);
        }
      }
      if (id === "plane") {
        if (t < e.travelTime!) {
          const k = 1 - t / e.travelTime!;
          e.group.position.copy(p).addScaledVector(e.approach!, k);
        } else if (!e.fired) {
          e.fired = true;
          e.group.visible = false;
          const mass =
            e.settings.aircraft === "cargo"
              ? 2.2
              : e.settings.aircraft === "glider"
                ? 0.25
                : 1;
          const size = number(e, "size"),
            speed = number(e, "speed") / 37;
          const direction = heading(number(e, "direction"));
          const spread = size ** 0.7 * speed ** 0.35 * mass ** 0.2;
          const power = size ** 1.5 * speed * mass ** 0.55;
          this.impact(
            e,
            p,
            (13 + s * 2) * spread,
            (90 + s * 30) * power,
            1,
            direction,
          );
          const forward = p
            .clone()
            .addScaledVector(
              direction,
              12.7 * Math.cos(THREE.MathUtils.degToRad(number(e, "angle"))),
            );
          this.impact(
            e,
            forward,
            (8 + s) * spread,
            (40 + s * 12) * power,
            1,
            direction,
          );
        } else if (number(e, "fuel") > 0) {
          this.sim.heat(
            p,
            (8 + s) * number(e, "size") * gain ** 0.5,
            dt * 15 * number(e, "fuel") * gain,
          );

        }
      }
      if (id === "blackhole" || id === "gravity") {
        if(id === "blackhole")this.sim.mutate?.(p,number(e,"radius"),dt*.12);
        const center = p.clone().addScaledVector(UP, number(e, "height"));
        e.group.rotation.y += dt * 0.5 * number(e, "spin");
        e.group.scale.setScalar(
          Math.min(t, 1, Math.max((e.info.duration - t) / 2, 0)),
        );
        const release =
          id === "gravity"
            ? Math.min(number(e, "release"), e.info.duration - 1)
            : Math.min(4, e.info.duration * 0.2);
        if (t < e.info.duration - release)
          this.sim.vortex(
            center,
            s *
              (id === "gravity"
                ? 0.65 * number(e, "lift")
                : 1.2 * number(e, "pull")) *
              gain,
            dt,
            {
              radius: number(e, "radius") * gain ** 0.35,
              spin: number(e, "spin"),
              lift: 1,
            },
          );
        if (t > e.next) {
          e.next = t + 0.12;
          this.burst(center, 2, 0xb9a2ef, 1, 0.9, -1, 0.2);
        }
      }
      if (id === "aliens") {
        e.group.position.x =
          p.x +
          Math.sin(t * 0.6) * Math.min(35, (number(e, "spread") * 10) / 28);
        e.group.position.z = p.z + Math.sin(t * 0.37) * Math.min(30, number(e, "spread") * 0.5);
        e.group.rotation.y += dt * 0.4;
        for (const craft of e.group.children) {
          const source = craft.getWorldPosition(new THREE.Vector3());
          this.sim.attractDebris?.(source, 52, 24 * Math.sqrt(gain), dt);
        }
        if (t > e.next) {
          e.next = t + number(e, "interval");
          const hit = p
            .clone()
            .add(
              new THREE.Vector3(
                (this.random() - 0.5) * number(e, "spread"),
                0,
                ((this.random() - 0.5) * number(e, "spread") * 20) / 28,
              ),
            );
          this.alienBeam(e, this.surfaceAt(hit.x, hit.z));
        }
      }
      if (id === "tornado") {
        e.group.position
          .copy(p)
          .addScaledVector(
            heading(number(e, "direction")),
            Math.sin(t * 0.22) * number(e, "travel") * 0.5,
          );
        e.group.rotation.y = t * 4 * number(e, "spin");
        for (let i = 0; i < e.group.children.length; i++) {
          e.group.children[i].position.x = Math.sin(t * 3 + i * 0.3) * i * 0.12;
          e.group.children[i].position.z = Math.cos(t * 3 + i * 0.2) * i * 0.12;
        }
        this.sim.vortex(
          e.group.position.clone().addScaledVector(UP, 15),
          s * 0.7 * gain,
          dt,
          {
            radius: number(e, "radius") * gain ** 0.35,
            spin: number(e, "spin"),
            lift: number(e, "lift"),
          },
        );
      }
    }
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const shot = this.projectiles[i];
      shot.age += dt;
      const k = Math.min(shot.age / shot.duration, 1);
      shot.mesh.position.lerpVectors(shot.start, shot.hit, k);
      // Constant-gravity ballistic arc joining the launch point and the sampled campus surface.
      shot.mesh.position.y += 0.5 * 9.81 * shot.duration ** 2 * k * (1 - k);
      if (shot.mesh.parent) {
        shot.mesh.parent.updateWorldMatrix(true, false);
        shot.mesh.parent.worldToLocal(shot.mesh.position);
      }
      shot.mesh.rotation.x += dt * 2;
      if (k >= 1) {
        if (shot.heat > 0) {
          this.impact(shot.effect, shot.hit, shot.radius, shot.power);
          if(shot.effect.info.id === "volcano") this.sim.melt(shot.hit,shot.radius+2,shot.heat*.02);
          else this.sim.heat(shot.hit, shot.radius + 2, shot.heat);
          this.sim.melt?.(shot.hit, shot.radius + 1, Math.min(.4,shot.heat/150));
        } else {
          const gain = intensityGain(shot.effect.intensity);
          this.sim.blast(
            shot.hit,
            shot.radius * gain ** 0.65,
            shot.power * gain ** 1.4,
          );
          this.burst(
            shot.hit,
            5 * Math.sqrt(gain),
            0xd2e9ef,
            2 * Math.sqrt(gain),
            0.6,
            9.81,
            number(shot.effect, "diameter") * 0.3,
          );
        }
        this.remove(shot.mesh);
        this.projectiles.splice(i, 1);
      }
    }
    this.waterCrest.value = this.effects.some(e=>e.info.id === "tsunami") ? waterHeight : -1;
    this.dust.update(dt);
    this.updateSurfaceFires(dt);
    this.waterMesh.visible = waterHeight > 0;
    if (waterHeight > 0) {
      const waves=this.effects.filter(e=>e.info.id === "tsunami" || e.info.id === "flood");
      const aligned=waves.length===1 && waves[0].info.id === "tsunami";
      if(aligned!==this.waterAligned){
        this.waterMesh.geometry.dispose();
        this.waterMesh.geometry=(aligned ? new THREE.PlaneGeometry(1800,512,1,512) : new THREE.PlaneGeometry(1800,1800,300,300));
        this.waterMesh.geometry.rotateX(-Math.PI/2);this.waterAligned=aligned;
      }
      this.waterMesh.position.set(0,0,0);this.waterMesh.rotation.set(0,0,0);
      if(aligned){
        const wave=waves[0],speed=number(wave,"speed");
        this.waterMesh.position.copy(wave.target).setY(0).addScaledVector(heading(number(wave,"direction")),-Math.min(110,speed*wave.info.duration*.5)+wave.age*speed);
        this.waterMesh.rotation.y=Math.PI-THREE.MathUtils.degToRad(number(wave,"direction"));
      }
      const cos=Math.cos(this.waterMesh.rotation.y),sin=Math.sin(this.waterMesh.rotation.y);
      const surface = (point: Vec3) =>
        Math.max(...waterLayers.map((layer) => layer(point)));
      const pos = this.waterMesh.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i),
          z = pos.getZ(i),
          height = surface({ x: x*cos+z*sin+this.waterMesh.position.x, y: 0, z: z*cos-x*sin+this.waterMesh.position.z });
        pos.setY(i, height);
      }
      pos.needsUpdate = true;
      this.waterMesh.geometry.computeVertexNormals();
    }
    for (let i = this.effects.length - 1; i >= 0; i--)
      if (this.effects[i].age >= this.effects[i].info.duration - 1e-8) {
        const e = this.effects.splice(i, 1)[0];
        this.projectiles = this.projectiles.filter((shot) => shot.effect !== e);
        this.clearFireVisuals(e);
        this.remove(e.group);
        this.onEvent(`${e.info.name} 종료 · 잔해 안정화`);
      }
    for (let i = this.transients.length - 1; i >= 0; i--) {
      const v = this.transients[i];
      v.life -= dt;
      if (v.shock) {
        const phase = THREE.MathUtils.clamp(
          1 - v.life / v.shock.duration,
          0,
          1,
        );
        v.shock.mesh.scale.setScalar(Math.max(0.01, v.shock.radius * phase));
        (v.shock.mesh.material as THREE.MeshBasicMaterial).opacity =
          (1 - phase) * 0.55;
      }
      if (v.life <= 0) {
        this.remove(v.group);
        this.transients.splice(i, 1);
      }
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.v.y -= p.gravity * dt;
      p.p.addScaledVector(p.v, dt);
      if (p.p.y < 0.12) {
        p.p.y = 0.12;
        p.v.multiplyScalar(0.5);
        p.v.y = Math.abs(p.v.y) * 0.3;
      }
    }
    this.particleMesh.count = this.particles.length;
    this.particles.forEach((p, i) => {
      this.dummy.position.copy(p.p);
      this.dummy.scale.setScalar(p.size * Math.min(p.life * 2, 1));
      this.dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, this.dummy.matrix);
      this.particleMesh.setColorAt(i, p.color);
    });
    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor)
      this.particleMesh.instanceColor.needsUpdate = true;
  }
  private transients: {
    group: THREE.Group;
    life: number;
    shock?: { mesh: THREE.Mesh; radius: number; duration: number };
  }[] = [];
  private remove(group: THREE.Object3D) {
    group.removeFromParent();
    group.traverse((o) => {
      if (o instanceof THREE.Sprite) o.material.dispose();
      if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
        o.geometry.dispose();
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        ms.forEach((m) => m.dispose());
      }
    });
  }
  reset() {
    this.dust.clear();
    for(const visual of this.surfaceFires.values())this.remove(visual.group);
    this.surfaceFires.clear();
    this.effects.forEach((e) => { this.clearFireVisuals(e); this.remove(e.group); });
    this.effects = [];
    this.projectiles = [];
    this.transients.forEach((t) => this.remove(t.group));
    this.transients = [];
    this.particles = [];
    this.particleMesh.count = 0;
    this.waterMesh.visible = false;
    this.seed = 9471;
    this.waterPhase = 0;
  }
  dispose() {
    if (this.disposed) return;
    this.reset();
    this.disposed = true;
    this.dust.dispose();
    this.particleMesh.removeFromParent();
    this.particleMesh.geometry.dispose();
    (this.particleMesh.material as THREE.Material).dispose();
    this.waterMesh.removeFromParent();
    this.waterMesh.geometry.dispose();
    (this.waterMesh.material as THREE.Material).dispose();
  }
}
