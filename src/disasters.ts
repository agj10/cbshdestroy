import * as THREE from "three";
import type { PhysicsSimulation } from "./physics";
import type { Vec3 } from "./types";

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
    mechanism: "이동하는 파도 · 흐름의 압력 · 잔해 이동",
    duration: 22,
    color: 0x65d3e4,
  },
  {
    id: "volcano",
    name: "화산 폭발",
    english: "VOLCANIC ERUPTION",
    category: "자연",
    icon: "mountain",
    description: "화산탄과 뜨거운 화산재가 쏟아집니다.",
    mechanism: "화산탄 충격 · 열에 의한 강도 저하",
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
    mechanism: "수위 상승 · 부력 · 유체 항력",
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
    mechanism: "게임용 인력장 · 회전 궤적 · 구조 분리",
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
  target: THREE.Vector3;
  intensity: number;
  age: number;
  next: number;
  group: THREE.Group;
  fired: boolean;
  seed: number;
  flashUntil?: number;
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
const UP = new THREE.Vector3(0, 1, 0);

/** Seeded effects and normalized game forces, deliberately not an engineering hazard model. */
export class DisasterDirector {
  effects: Effect[] = [];
  private particles: Particle[] = [];
  private particleMesh: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();
  private waterMesh: THREE.Mesh;
  private seed = 9471;
  private waterPhase = 0;
  private disposed = false;
  private projectiles: Projectile[] = [];
  private surfaceRay = new THREE.Raycaster();
  onImpact: (strength: number) => void = () => {};
  onEvent: (text: string) => void = () => {};
  constructor(
    private scene: THREE.Scene,
    private sim: PhysicsSimulation,
  ) {
    this.particleMesh = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.MeshStandardMaterial({ roughness: 0.9 }),
      900,
    );
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleMesh.count = 0;
    this.particleMesh.frustumCulled = false;
    scene.add(this.particleMesh);
    const geometry = new THREE.PlaneGeometry(230, 200, 46, 40);
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
    this.waterMesh.visible = false;
    this.waterMesh.renderOrder = 2;
    scene.add(this.waterMesh);
  }
  private random() {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  launch(id: DisasterId, target: Vec3, intensity: number) {
    if (
      this.disposed ||
      this.effects.length >= 4 ||
      ![target.x, target.y, target.z, intensity].every(Number.isFinite)
    )
      return false;
    const info = DISASTERS.find((d) => d.id === id);
    if (!info) return false;
    intensity = THREE.MathUtils.clamp(intensity, 1, 5);
    const group = new THREE.Group();
    this.scene.add(group);
    const effect: Effect = {
      info,
      target: new THREE.Vector3(target.x, target.y, target.z),
      intensity,
      age: 0,
      next: 0,
      group,
      fired: false,
      seed: this.random(),
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
  private setup(e: Effect) {
    const id = e.info.id;
    if (id === "meteor" || id === "volcano" || id === "hail") {
      if (id === "meteor") {
        e.group.add(
          this.mesh(
            new THREE.IcosahedronGeometry(1.5 + e.intensity * 0.5, 1),
            0x574237,
          ),
        );
        e.group.position.copy(e.target).add(new THREE.Vector3(-65, 95, -42));
      }
      if (id === "volcano") {
        const cone = this.mesh(
          new THREE.ConeGeometry(18, 27, 10, 1, true),
          0x66544a,
        );
        cone.position.set(e.target.x - 55, 13, -65);
        e.group.add(cone);
        const lava = this.mesh(
          new THREE.TorusGeometry(5, 0.8, 6, 24),
          0xff6425,
          true,
        );
        lava.rotation.x = Math.PI / 2;
        lava.position.set(e.target.x - 55, 25, -65);
        e.group.add(lava);
      }
    }
    if (id === "plane") {
      e.group.position.copy(e.target).add(new THREE.Vector3(75, 32, 75));
      e.group.rotation.set(-0.2, Math.PI / 4, -0.3);
      const body = this.mesh(
        new THREE.CylinderGeometry(0.9, 0.55, 11, 10),
        0xe9e6da,
      );
      body.rotation.x = Math.PI / 2;
      e.group.add(body);
      const wing = this.mesh(new THREE.BoxGeometry(13, 0.2, 2.4), 0xe9e6da);
      e.group.add(wing);
      const tail = this.mesh(new THREE.BoxGeometry(4, 0.2, 1.5), 0xf19760);
      tail.position.z = 4;
      e.group.add(tail);
      const fin = this.mesh(new THREE.BoxGeometry(0.15, 2, 1.8), 0xf19760);
      fin.position.set(0, 1, 4);
      e.group.add(fin);
    }
    if (id === "blackhole" || id === "gravity") {
      e.group.position
        .copy(e.target)
        .addScaledVector(UP, id === "gravity" ? 37 : 15);
      const ball = this.mesh(
        new THREE.SphereGeometry(3.3, 32, 24),
        id === "blackhole" ? 0x030308 : 0xbbb0ff,
        id !== "blackhole",
      );
      e.group.add(ball);
      for (let i = 0; i < 3; i++) {
        const ring = this.mesh(
          new THREE.TorusGeometry(5 + i * 1.2, 0.12 + 0.15 * i, 8, 64),
          0xb898f5,
          true,
        );
        ring.rotation.set(Math.PI * 0.43 + i * 0.15, 0.2, 0);
        e.group.add(ring);
      }
    }
    if (id === "aliens") {
      e.group.position.copy(e.target).addScaledVector(UP, 32);
      const saucer = this.mesh(new THREE.SphereGeometry(8, 24, 12), 0x858e91);
      saucer.scale.y = 0.23;
      e.group.add(saucer);
      const cockpit = this.mesh(
        new THREE.SphereGeometry(3.5, 20, 12),
        0x9bdabb,
        true,
      );
      cockpit.position.y = 1;
      e.group.add(cockpit);
      const ring = this.mesh(
        new THREE.TorusGeometry(6, 0.16, 8, 40),
        0xaaffae,
        true,
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -1;
      e.group.add(ring);
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
  private impact(e: Effect, p: THREE.Vector3, radius: number, power: number) {
    this.sim.blast(p, radius, power);
    this.burst(p, 65, 0xc3b298, 13 + e.intensity * 3, 3, 9, 0.6);
    this.burst(p, 35, e.info.color, 16, 1.3, 1, 0.55);
    this.onImpact(e.intensity * 0.28);
  }
  private surfaceAt(x: number, z: number) {
    this.surfaceRay.set(
      new THREE.Vector3(x, 140, z),
      new THREE.Vector3(0, -1, 0),
    );
    const meshes = this.sim.parts.map((part) => part.mesh);
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
  ) {
    const mesh = this.mesh(
      new THREE.IcosahedronGeometry(heat > 0 ? 0.65 : 0.3, 0),
      heat > 0 ? 0xff773e : 0xd2e9ef,
      heat > 0,
    );
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
  update(dt: number) {
    if (this.disposed || !Number.isFinite(dt) || dt <= 0) return;
    // Match the physics clock's maximum accepted frame delta; pause is controlled by the caller.
    dt = Math.min(dt, 0.1);
    let waterHeight = -5,
      waterFlow = 0;
    const waterLayers: Array<(point: Vec3) => number> = [];
    this.waterPhase += dt;
    for (const e of this.effects) {
      e.age = Math.min(e.info.duration, e.age + dt);
      const { id } = e.info,
        t = e.age,
        s = e.intensity,
        p = e.target;
      if (id === "meteor") {
        if (t < 2.7) {
          const k = 1 - t / 2.7;
          e.group.position.set(p.x - 65 * k, p.y + 95 * k, p.z - 42 * k);
          e.group.rotation.x += dt * 1.6;
          this.burst(e.group.position, 3, 0xffaa58, 1.5, 0.6, -2, 0.8);
        } else if (!e.fired) {
          e.fired = true;
          e.group.visible = false;
          this.impact(e, p, 13 + s * 3, 100 + s * 48);
          this.sim.heat(p, 12 + s * 2, 25);
          this.onEvent("운석 충돌 · 충격파 전파");
        }
      }
      if (id === "explosion" && !e.fired) {
        e.fired = true;
        this.impact(e, p, 10 + s * 3.5, 75 + s * 35);
        this.onEvent("폭발 · 파편 충돌 진행");
      }
      if (id === "earthquake") {
        const envelope = Math.sin(Math.min(t / 16, 1) * Math.PI);
        this.sim.earthquake(dt, s * envelope);
        if (t > e.next) {
          e.next = t + 0.2;
          this.onImpact(0.08 * s * envelope);
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
      if (id === "fire") {
        this.sim.heat(p, 6 + s * 2 + t * 0.17, dt * (13 + s * 7));
        if (t > e.next) {
          e.next = t + 0.085;
          this.burst(
            {
              x: p.x + (this.random() - 0.5) * 6,
              y: p.y + 1,
              z: p.z + (this.random() - 0.5) * 6,
            },
            7,
            0xff8b38,
            2.3,
            1.6,
            -3,
            0.5,
          );
          this.burst(
            { x: p.x, y: p.y + 4, z: p.z },
            3,
            0x55585b,
            2,
            4,
            -1.2,
            1.4,
          );
        }
      }
      if (id === "lightning") {
        if (t > e.next && t < 3.6) {
          e.next = t + 1.15;
          e.flashUntil = t + 0.18;
          for (const child of [...e.group.children]) this.remove(child);
          const points = [];
          for (let i = 0; i < 12; i++)
            points.push(
              new THREE.Vector3(
                p.x + (i === 11 ? 0 : (this.random() - 0.5) * 7),
                p.y + 66 - i * 6,
                p.z + (i === 11 ? 0 : (this.random() - 0.5) * 4),
              ),
            );
          const bolt = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(points),
            new THREE.LineBasicMaterial({ color: 0xeff3ff }),
          );
          e.group.add(bolt);
          this.sim.heat(p, 3 + s, 17 + s * 6);
          this.sim.blast(p, 2 + s * 0.6, 6 + s * 2);
          this.burst(p, 15, 0xffffcc, 4, 0.5, 2, 0.2);
          this.onImpact(0.17);
        }
        e.group.visible = t < (e.flashUntil ?? 0);
      }
      if (id === "flood" || id === "tsunami") {
        const height =
          id === "flood"
            ? Math.min(t / 9, 1) * (1.2 + s * 1.25) * Math.min((28 - t) / 5, 1)
            : (3 + s * 1.8) * Math.min(t / 2, 1, (22 - t) / 3);
        const crestZ = p.z + 110 - t * 10;
        waterLayers.push(
          id === "flood"
            ? () => height
            : (point) =>
                height * Math.exp(-(((point.z - crestZ) / 16) ** 2)) - 0.15,
        );
        waterHeight = Math.max(waterHeight, height);
        waterFlow = Math.max(
          waterFlow,
          id === "tsunami" ? 6 + s * 2 : 1 + s * 0.6,
        );
      }
      if (id === "volcano" && t > e.next && t < e.info.duration - 4.4) {
        e.next = t + 0.65;
        const hit = this.surfaceAt(
          p.x + (this.random() - 0.5) * 44,
          p.z + (this.random() - 0.5) * 24,
        );
        this.projectile(
          e,
          new THREE.Vector3(p.x - 55, 27, -65),
          hit,
          4.4,
          3 + s,
          12 + s * 3,
          9 + s * 2,
        );
      }
      if (id === "hail" && t > e.next && t < e.info.duration - 2.5) {
        e.next = t + 0.15;
        const hit = this.surfaceAt(
          p.x + (this.random() - 0.5) * 65,
          p.z + (this.random() - 0.5) * 38,
        );
        this.projectile(
          e,
          hit.clone().addScaledVector(UP, 30),
          hit,
          Math.sqrt(60 / 9.81),
          2 + s * 0.5,
          3 + s * 2,
          0,
        );
      }
      if (id === "plane") {
        if (t < 3) {
          const k = 1 - t / 3;
          e.group.position.set(p.x + 75 * k, p.y + 32 * k, p.z + 75 * k);
          e.group.rotation.set(-0.2, Math.PI / 4, -0.3);
        } else if (!e.fired) {
          e.fired = true;
          e.group.visible = false;
          this.impact(e, p, 13 + s * 2, 90 + s * 30);
          const forward = p.clone().add(new THREE.Vector3(-9, 0, -9));
          this.impact(e, forward, 8 + s, 40 + s * 12);
        } else {
          this.sim.heat(p, 8 + s, dt * 15);
          if (t > e.next) {
            e.next = t + 0.15;
            this.burst(p, 5, 0xff944c, 3, 2, -3, 0.7);
          }
        }
      }
      if (id === "blackhole" || id === "gravity") {
        const center = p
          .clone()
          .addScaledVector(UP, id === "blackhole" ? 15 : 37);
        e.group.rotation.y += dt * 0.5;
        e.group.scale.setScalar(
          Math.min(t, 1, Math.max((e.info.duration - t) / 2, 0)),
        );
        if (t < e.info.duration - 4)
          this.sim.vortex(center, s * (id === "gravity" ? 0.65 : 1.2), dt);
        if (t > e.next) {
          e.next = t + 0.12;
          this.burst(center, 2, 0xb9a2ef, 1, 0.9, -1, 0.2);
        }
      }
      if (id === "aliens") {
        e.group.position.x = p.x + Math.sin(t * 0.6) * 10;
        e.group.rotation.y += dt * 0.4;
        if (t > e.next) {
          e.next = t + 1.3;
          const hit = p
            .clone()
            .add(
              new THREE.Vector3(
                (this.random() - 0.5) * 28,
                0,
                (this.random() - 0.5) * 20,
              ),
            );
          this.impact(e, hit, 4 + s * 1.4, 15 + s * 5);
          this.sim.heat(hit, 5 + s, 15);
          const source = e.group.position.clone().addScaledVector(UP, -2),
            direction = source.clone().sub(hit);
          const beam = new THREE.Mesh(
            new THREE.CylinderGeometry(0.22, 0.8, direction.length(), 8),
            new THREE.MeshBasicMaterial({
              color: 0xaaffbf,
              transparent: true,
              opacity: 0.65,
            }),
          );
          beam.position.copy(source).add(hit).multiplyScalar(0.5);
          beam.quaternion.setFromUnitVectors(UP, direction.normalize());
          // A short beam is owned by a short effect so pause/reset uses simulation time.
          const beamGroup = new THREE.Group();
          beamGroup.add(beam);
          this.scene.add(beamGroup);
          this.transients.push({ group: beamGroup, life: 0.24 });
        }
      }
      if (id === "tornado") {
        e.group.position
          .copy(p)
          .add(
            new THREE.Vector3(
              Math.sin(t * 0.22) * 12,
              0,
              Math.cos(t * 0.22) * 6,
            ),
          );
        e.group.rotation.y = t * 4;
        for (let i = 0; i < e.group.children.length; i++) {
          e.group.children[i].position.x = Math.sin(t * 3 + i * 0.3) * i * 0.12;
          e.group.children[i].position.z = Math.cos(t * 3 + i * 0.2) * i * 0.12;
        }
        this.sim.vortex(
          e.group.position.clone().addScaledVector(UP, 15),
          s * 0.7,
          dt,
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
      shot.mesh.rotation.x += dt * 2;
      if (k >= 1) {
        if (shot.heat > 0) {
          this.impact(shot.effect, shot.hit, shot.radius, shot.power);
          this.sim.heat(shot.hit, shot.radius + 2, shot.heat);
        } else {
          this.sim.blast(shot.hit, shot.radius, shot.power);
          this.burst(shot.hit, 5, 0xd2e9ef, 2, 0.6, 9.81, 0.18);
        }
        this.remove(shot.mesh);
        this.projectiles.splice(i, 1);
      }
    }
    this.waterMesh.visible = waterHeight > 0;
    if (waterHeight > 0) {
      const surface = (point: Vec3) =>
        Math.max(...waterLayers.map((layer) => layer(point)));
      this.sim.water(
        waterHeight,
        { x: waterFlow * 0.3, y: 0, z: -waterFlow },
        dt,
        surface,
      );
      const pos = this.waterMesh.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i),
          z = pos.getZ(i),
          height = surface({ x, y: 0, z });
        const ripple =
          (Math.sin(x * 0.11 + this.waterPhase * 1.5) * 0.28 +
            Math.sin(z * 0.22 + this.waterPhase * 2) * 0.24) *
          Math.min(1, Math.max(0, height));
        pos.setY(i, height + ripple);
      }
      pos.needsUpdate = true;
      this.waterMesh.geometry.computeVertexNormals();
    }
    for (let i = this.effects.length - 1; i >= 0; i--)
      if (this.effects[i].age >= this.effects[i].info.duration - 1e-8) {
        const e = this.effects.splice(i, 1)[0];
        this.projectiles = this.projectiles.filter((shot) => shot.effect !== e);
        this.remove(e.group);
        this.onEvent(`${e.info.name} 종료 · 잔해 안정화`);
      }
    for (let i = this.transients.length - 1; i >= 0; i--) {
      const v = this.transients[i];
      v.life -= dt;
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
  private transients: { group: THREE.Group; life: number }[] = [];
  private remove(group: THREE.Object3D) {
    group.removeFromParent();
    group.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
        o.geometry.dispose();
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        ms.forEach((m) => m.dispose());
      }
    });
  }
  reset() {
    this.effects.forEach((e) => this.remove(e.group));
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
    this.particleMesh.removeFromParent();
    this.particleMesh.geometry.dispose();
    (this.particleMesh.material as THREE.Material).dispose();
    this.waterMesh.removeFromParent();
    this.waterMesh.geometry.dispose();
    (this.waterMesh.material as THREE.Material).dispose();
  }
}
