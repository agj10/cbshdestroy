import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { buildCampus } from "./campus";
import { PhysicsSimulation } from "./physics";
import { DisasterDirector, DISASTERS, type DisasterId } from "./disasters";
import { icon } from "./icons";
import "./style.css";

const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
$("#app").innerHTML = `
  <header class="topbar">
    <a class="brand" href="./" aria-label="CBSH Disaster Lab 홈"><span class="brandmark">${icon("box", 25)}</span><span>CBSH<span class="brand-divider">/</span><b>DISASTER LAB</b><small>CAMPUS PHYSICS SANDBOX</small></span></a>
    <div class="project-label"><span class="project-dot"></span> 충북과학고등학교 <span class="version">v1.0</span></div>
    <div class="top-actions"><span class="live-indicator"><i></i> <span id="session-status">준비 중</span></span><button class="icon-button" id="help-button" title="사용 방법" aria-label="사용 방법">${icon("info")}</button><button class="icon-button" id="settings-button" title="설정" aria-label="설정">${icon("settings")}</button></div>
  </header>
  <main class="workspace">
    <aside class="sidebar">
      <div class="sidebar-heading"><span class="eyebrow">EXPERIMENT 01</span><h1>재난 시뮬레이션<span class="tiny-dot"></span></h1><p>평온한 캠퍼스에, 뜻밖의 순간을.</p></div>
      <div class="categories" role="tablist" aria-label="재난 분류">${["전체", "자연", "사고", "상상"].map((c, i) => `<button role="tab" class="category ${i === 0 ? "active" : ""}" data-category="${c}" aria-selected="${i === 0}">${c}</button>`).join("")}</div>
      <div class="disaster-scroll"><div class="disaster-grid" id="disaster-grid"></div><p class="imagination-note">상상 재난은 게임 속 가상 현상이에요.</p></div>
      <section class="launch-panel">
        <div class="selection-heading"><span id="selected-icon">${icon("meteor", 22)}</span><div><h2 id="selected-name">운석 충돌</h2><span id="selected-english">METEOR IMPACT</span></div><span class="selection-index" id="selection-index">01</span></div>
        <p class="selection-description" id="selected-description"></p>
        <div class="intensity-label"><label for="intensity">재난 강도</label><span><b id="intensity-value">3</b> <span>/ 5</span></span></div>
        <input type="range" id="intensity" min="1" max="5" value="3" step="1" aria-label="재난 강도" />
        <div class="range-labels"><span>약하게</span><span>강하게</span></div>
        <button class="launch-button" id="launch-button" disabled>${icon("play", 18)}<span>재난 시작</span><kbd>Enter</kbd></button>
        <div class="aim-note">${icon("target", 13)} <span>위치 지정 후 원하는 곳에 실행하세요</span></div>
      </section>
    </aside>
    <section class="viewport" aria-label="학교 3D 시뮬레이션">
      <div id="scene-container"></div>
      <div class="view-heading"><span class="eyebrow">LIVE SIMULATION</span><h2>충북과학고 캠퍼스</h2><div><span class="model-tag">사진 기반 3D</span><span class="model-note">리모델링 외관 반영</span></div></div>
      <div class="view-tools"><button class="view-button active" data-view="orbit" title="캠퍼스 전체" aria-label="캠퍼스 전체">${icon("box", 18)}</button><button class="view-button" data-view="front" title="정면 보기" aria-label="정면 보기">${icon("front", 18)}</button><button class="view-button" data-view="top" title="위에서 보기" aria-label="위에서 보기">${icon("top", 18)}</button><span></span><button class="view-button" id="photo-button" title="화면 저장" aria-label="화면 저장">${icon("camera", 18)}</button></div>
      <div class="status-card">
        <div class="card-title"><span>캠퍼스 상태</span>${icon("activity", 16)}</div>
        <div class="integrity-value"><span id="integrity">100</span><small>%</small><span class="condition" id="condition">안정</span></div>
        <div class="integrity-track"><i id="integrity-bar"></i></div>
        <div class="stat-row"><span>분리된 구조 조각</span><b id="detached">0</b></div>
        <div class="stat-row"><span>움직이는 잔해</span><b id="moving">0</b></div>
        <div class="stat-row"><span>진행 중인 재난</span><b id="active-count">0</b></div>
        <div class="card-foot">게임용 구조 연결 상태</div>
      </div>
      <div class="compass"><span>N</span><svg width="32" height="38" viewBox="0 0 32 38"><path d="m16 3 7 27-7-5-7 5Z" fill="#ed9a73"/><path d="m16 3 0 22-7 5Z" fill="#71828c"/></svg><span class="compass-label">CAMPUS VIEW</span></div>
      <div class="scene-bottom"><div class="scene-caption"><span class="caption-line"></span><span>CHUNGBUK SCIENCE HIGH SCHOOL<small>청주 · 사진 기반 재구성</small></span></div><button class="target-button" id="target-button">${icon("target", 16)}<span>위치 지정</span></button></div>
      <div class="target-hint" id="target-hint" hidden>건물 또는 운동장을 클릭해 재난 위치를 정하세요 <kbd>Esc 취소</kbd></div>
      <div class="toast" id="toast" role="status" aria-live="polite"></div>
      <div class="loading" id="loading"><span class="loader"></span><strong>캠퍼스를 만들고 있어요</strong><span>3D 모델과 물리 엔진 준비 중</span></div>
    </section>
  </main>
  <footer class="transport"><div class="playback"><button id="pause-button" class="round-button" title="일시정지 (Space)" aria-label="일시정지">${icon("pause", 16)}</button><button id="reset-button" class="icon-button" title="캠퍼스 초기화 (R)" aria-label="캠퍼스 초기화">${icon("reset", 18)}</button><span class="transport-divider"></span><span class="clock-display" id="elapsed">00:00.0</span><span class="time-label">SIM TIME</span></div><div class="speed-controls" role="group" aria-label="시뮬레이션 속도"><span>재생 속도</span>${[0.25, 0.5, 1, 2].map((s) => `<button data-speed="${s}" class="speed-button ${s === 1 ? "active" : ""}">${s}×</button>`).join("")}</div><div class="footer-right"><span id="fps">60 FPS</span><button class="icon-button" id="sound-button" title="효과음 켜기" aria-label="효과음 켜기">${icon("mute", 18)}</button><button class="export-button" id="export-button">${icon("download", 16)}<span>3D 모델</span></button></div></footer>
  <dialog id="info-dialog"><button class="dialog-close icon-button" aria-label="닫기">${icon("close")}</button><span class="eyebrow">ABOUT THIS EXPERIMENT</span><h2>작은 캠퍼스, 커다란 실험.</h2><p>충북과학고등학교 사진을 바탕으로 만든 재난 샌드박스예요. 재난을 선택하고, 강도를 조절하고, 달라지는 캠퍼스를 자유롭게 관찰하세요.</p><div class="help-grid"><span>시점 회전</span><b>왼쪽 드래그 / 손가락 하나</b><span>화면 이동</span><b>오른쪽 드래그 / 손가락 둘</b><span>확대 · 축소</span><b>마우스 휠 / 핀치</b><span>실행 · 일시정지 · 초기화</span><b>Enter · Space · R</b></div><h3>모델과 물리에 관하여</h3><p>회색 외벽, 주황색 장식, 천문대 돔은 제공 사진을 반영했어요. 보이지 않는 뒷면과 별동, 운동장 세부 배치와 치수는 추정이에요. 2023년 현대화사업 이후 외관을 기준으로 삼았으며 2026년의 모든 변경을 확인한 실측 모델은 아니에요.</p><p>중력·충돌·마찰은 Rapier 물리 엔진으로, 구조 연결의 파손·열·물은 간략한 게임 모델로 계산해요. 실제 학교의 안전성이나 재난 피해를 예측하는 도구는 아니에요. 블랙홀·외계 침공·중력 반전은 가상 규칙을 사용해요.</p><p>3D 모델 버튼은 <b>현재 장면</b>을 GLB 파일로 저장해요. 온전한 모델은 초기화한 뒤 저장하세요.</p><a href="https://school.cbe.go.kr/cbs-h/M010202/" target="_blank" rel="noreferrer">학교 공식 연혁 ↗</a><a href="https://www.cbe.go.kr/news/na/ntt/selectNttInfo.do?mi=10301&nttSn=1517999" target="_blank" rel="noreferrer">공식 전경 참고자료 ↗</a></dialog>
  <dialog id="settings-dialog"><button class="dialog-close icon-button" aria-label="닫기">${icon("close")}</button><span class="eyebrow">PREFERENCES</span><h2>나에게 맞는 실험실</h2><label class="setting-row">그래픽 품질<select id="quality"><option value="high">높음 · 부드러운 그림자</option><option value="low">낮음 · 성능 우선</option></select></label><label class="setting-row">충격 시 카메라 흔들림<input type="checkbox" id="shake" checked /></label><p>느린 기기에서는 그래픽 품질과 재생 속도를 낮춰보세요. 여러 재난은 동시에 최대 4개까지 실행할 수 있어요.</p></dialog>
`;

let selected: DisasterId = "meteor",
  category = "전체",
  paused = false,
  timeScale = 1,
  elapsed = 0,
  aiming = false,
  ready = false,
  sound = false;
let simulation: PhysicsSimulation, director: DisasterDirector;
const target = new THREE.Vector3(4, 8, -19.5);
let toastTimer: ReturnType<typeof setTimeout>;
function toast(text: string) {
  $("#toast").textContent = text;
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 3000);
}
function drawDisasters() {
  $("#disaster-grid").innerHTML = DISASTERS.filter(
    (d) => category === "전체" || d.category === category,
  )
    .map(
      (d) =>
        `<button class="disaster-tile ${selected === d.id ? "selected" : ""}" data-disaster="${d.id}" aria-pressed="${selected === d.id}"><span class="tile-icon">${icon(d.icon, 22)}</span><span>${d.name}</span>${selected === d.id ? `<i>${icon("check", 10)}</i>` : ""}</button>`,
    )
    .join("");
  document.querySelectorAll<HTMLButtonElement>("[data-disaster]").forEach(
    (b) =>
      (b.onclick = () => {
        selected = b.dataset.disaster as DisasterId;
        drawDisasters();
        updateSelection();
      }),
  );
}
function updateSelection() {
  const d = DISASTERS.find((d) => d.id === selected)!;
  $("#selected-name").textContent = d.name;
  $("#selected-english").textContent = d.english;
  $("#selected-icon").innerHTML = icon(d.icon, 22);
  $("#selected-description").textContent = d.description;
  $("#selection-index").textContent = String(DISASTERS.indexOf(d) + 1).padStart(
    2,
    "0",
  );
}
drawDisasters();
updateSelection();
document.querySelectorAll<HTMLButtonElement>("[data-category]").forEach(
  (b) =>
    (b.onclick = () => {
      category = b.dataset.category!;
      document
        .querySelectorAll<HTMLButtonElement>("[data-category]")
        .forEach((c) => {
          c.classList.toggle("active", c === b);
          c.setAttribute("aria-selected", String(c === b));
        });
      drawDisasters();
    }),
);
$("#intensity").oninput = () => {
  $("#intensity-value").textContent = $<HTMLInputElement>("#intensity").value;
};
for (const id of ["info", "settings"]) {
  const dialog = $<HTMLDialogElement>(`#${id}-dialog`);
  dialog.querySelector<HTMLButtonElement>(".dialog-close")!.onclick = () =>
    dialog.close();
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        dialog.close();
    }
  });
}
$("#help-button").onclick = () =>
  $<HTMLDialogElement>("#info-dialog").showModal();
$("#settings-button").onclick = () =>
  $<HTMLDialogElement>("#settings-dialog").showModal();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb6c9ce);
scene.fog = new THREE.Fog(0xb6c9ce, 190, 470);
const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 800);
camera.position.set(126, 105, 158);
let renderer: THREE.WebGLRenderer;
try {
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance",
  });
} catch (error) {
  $("#loading").innerHTML =
    "<strong>3D 화면을 열지 못했어요</strong><span>WebGL을 지원하는 Chrome 또는 Edge에서 다시 열어주세요.</span>";
  throw error;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
renderer.domElement.setAttribute(
  "aria-label",
  "드래그로 둘러볼 수 있는 3D 캠퍼스",
);
renderer.domElement.setAttribute("role", "img");
$("#scene-container").append(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 9);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.minDistance = 25;
controls.maxDistance = 290;
controls.maxPolarAngle = Math.PI * 0.48;
controls.minPolarAngle = 0.045;
controls.enablePan = true;
const hemi = new THREE.HemisphereLight(0xe3f4ff, 0x747e60, 2.3);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe2b6, 3.2);
sun.position.set(-70, 110, 70);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {
  left: -120,
  right: 120,
  top: 100,
  bottom: -100,
  near: 1,
  far: 300,
});
sun.shadow.normalBias = 0.06;
sun.shadow.bias = -0.0001;
scene.add(sun);
const fill = new THREE.DirectionalLight(0xd3e6ff, 0.65);
fill.position.set(50, 50, -80);
scene.add(fill);
const campus = buildCampus();
scene.add(campus.group);

const targetMarker = new THREE.Group();
const ring = new THREE.Mesh(
  new THREE.RingGeometry(2.7, 2.83, 64),
  new THREE.MeshBasicMaterial({
    color: 0xfba479,
    transparent: true,
    opacity: 0.95,
    depthTest: false,
    side: THREE.DoubleSide,
  }),
);
ring.rotation.x = -Math.PI / 2;
targetMarker.add(ring);
const inner = new THREE.Mesh(
  new THREE.RingGeometry(0.6, 0.74, 32),
  ring.material,
);
inner.rotation.x = -Math.PI / 2;
targetMarker.add(inner);
for (let i = 0; i < 4; i++) {
  const tick = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.02, 1),
    ring.material,
  );
  tick.position.set(
    Math.sin((i * Math.PI) / 2) * 3.4,
    0,
    Math.cos((i * Math.PI) / 2) * 3.4,
  );
  tick.rotation.y = (i * Math.PI) / 2;
  targetMarker.add(tick);
}
targetMarker.position.copy(target);
targetMarker.position.y = 0.25;
targetMarker.renderOrder = 10;
scene.add(targetMarker);
const resize = () => {
  const { width, height } = $("#scene-container").getBoundingClientRect();
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.fov = THREE.MathUtils.radToDeg(
    2 *
      Math.atan(
        Math.tan(THREE.MathUtils.degToRad(19)) *
          Math.max(1, 1.4 / camera.aspect),
      ),
  );
  camera.updateProjectionMatrix();
};
new ResizeObserver(resize).observe($("#scene-container"));
resize();
document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach(
  (b) =>
    (b.onclick = () => {
      document
        .querySelectorAll("[data-view]")
        .forEach((c) => c.classList.toggle("active", c === b));
      controls.target.set(0, 2, 6);
      if (b.dataset.view === "front") camera.position.set(15, 28, 133);
      else if (b.dataset.view === "top") camera.position.set(0, 205, 6.1);
      else camera.position.set(126, 105, 158);
      controls.update();
    }),
);
function setAiming(value: boolean) {
  aiming = value;
  $("#target-button").classList.toggle("active", value);
  $("#target-hint").hidden = !value;
  renderer.domElement.style.cursor = value ? "crosshair" : "grab";
}
$("#target-button").onclick = () => setAiming(!aiming);
const raycaster = new THREE.Raycaster();
let down = { x: 0, y: 0 };
renderer.domElement.addEventListener("pointerdown", (e) => {
  down = { x: e.clientX, y: e.clientY };
});
renderer.domElement.addEventListener("pointerup", (e) => {
  if (!aiming || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
  const r = renderer.domElement.getBoundingClientRect();
  raycaster.setFromCamera(
    new THREE.Vector2(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      (-(e.clientY - r.top) / r.height) * 2 + 1,
    ),
    camera,
  );
  const intersects = raycaster.intersectObjects(
    campus.parts.map((p) => p.mesh),
    true,
  );
  const groundPoint = new THREE.Vector3();
  if (intersects.length) target.copy(intersects[0].point);
  else if (
    raycaster.ray.intersectPlane(
      new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
      groundPoint,
    ) &&
    Math.abs(groundPoint.x) < 110 &&
    Math.abs(groundPoint.z) < 95
  )
    target.copy(groundPoint);
  else {
    toast("캠퍼스 안쪽을 선택해주세요.");
    return;
  }
  targetMarker.position.copy(target);
  targetMarker.position.y = Math.max(0.25, target.y + 0.15);
  setAiming(false);
  toast("재난 위치를 지정했어요.");
});
function setPause(value: boolean) {
  if (!ready) return;
  paused = value;
  $("#pause-button").innerHTML = icon(paused ? "play" : "pause", 16);
  $("#pause-button").setAttribute("aria-label", paused ? "재생" : "일시정지");
  $("#pause-button").title = paused ? "재생 (Space)" : "일시정지 (Space)";
  $("#session-status").textContent = paused ? "일시정지" : "시뮬레이션 연결됨";
}
function reset() {
  if (!ready) return;
  director.reset();
  simulation.reset();
  elapsed = 0;
  accumulator = 0;
  shakeAmount = 0;
  lastImpactSoundTime = -1;
  renderer.shadowMap.needsUpdate = true;
  setPause(false);
  toast("캠퍼스를 처음 상태로 되돌렸어요.");
  updateStats();
}
function launch() {
  if (!ready) return;
  const success = director.launch(
    selected,
    target,
    Number($<HTMLInputElement>("#intensity").value),
  );
  if (!success) {
    toast("진행 중인 재난이 끝나면 추가할 수 있어요. (최대 4개)");
    return;
  }
  setPause(false);
  audioImpact(0.2);
}
$("#launch-button").onclick = launch;
$("#pause-button").onclick = () => setPause(!paused);
$("#reset-button").onclick = reset;
document.querySelectorAll<HTMLButtonElement>("[data-speed]").forEach(
  (b) =>
    (b.onclick = () => {
      timeScale = Number(b.dataset.speed);
      document
        .querySelectorAll("[data-speed]")
        .forEach((c) => c.classList.toggle("active", c === b));
    }),
);
document.addEventListener("keydown", (e) => {
  if (
    e.target instanceof HTMLInputElement ||
    e.target instanceof HTMLSelectElement ||
    document.querySelector("dialog[open]")
  )
    return;
  if (e.code === "Space") {
    e.preventDefault();
    setPause(!paused);
  }
  if (e.code === "Enter" && !(e.target instanceof HTMLButtonElement)) launch();
  if (e.code === "KeyR") reset();
  if (e.code === "Escape") setAiming(false);
});

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
$("#photo-button").onclick = () => {
  renderer.render(scene, camera);
  renderer.domElement.toBlob((blob) => {
    if (blob) {
      saveBlob(blob, "cbsh-disaster-lab.png");
      toast("현재 화면을 저장했어요.");
    }
  });
};
$("#export-button").onclick = async () => {
  if (!ready) return;
  const button = $<HTMLButtonElement>("#export-button");
  button.disabled = true;
  const wasPaused = paused;
  setPause(true);
  toast("현재 캠퍼스를 GLB 모델로 저장하고 있어요.");
  try {
    const data = await new GLTFExporter().parseAsync(campus.group, {
      binary: true,
      onlyVisible: true,
    });
    saveBlob(
      new Blob([data as ArrayBuffer], { type: "model/gltf-binary" }),
      "cbsh-campus.glb",
    );
    toast("3D 모델을 저장했어요. Blender 등 GLB 지원 도구에서 열 수 있어요.");
  } catch (error) {
    console.error(error);
    toast("모델 저장에 실패했어요. 브라우저 콘솔을 확인해주세요.");
  } finally {
    button.disabled = false;
    setPause(wasPaused);
  }
};
$<HTMLSelectElement>("#quality").onchange = () => {
  const high = $<HTMLSelectElement>("#quality").value === "high";
  renderer.setPixelRatio(high ? Math.min(devicePixelRatio, 1.7) : 1);
  renderer.shadowMap.enabled = high;
  renderer.shadowMap.needsUpdate = true;
  campus.group.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      ms.forEach((m) => (m.needsUpdate = true));
    }
  });
  resize();
};
const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
$<HTMLInputElement>("#shake").checked = !reducedMotion;
let audioContext: AudioContext | undefined;
$("#sound-button").onclick = () => {
  sound = !sound;
  if (sound) {
    audioContext ??= new AudioContext();
    void audioContext.resume();
  }
  $("#sound-button").innerHTML = icon(sound ? "volume" : "mute", 18);
  $("#sound-button").setAttribute(
    "aria-label",
    sound ? "효과음 끄기" : "효과음 켜기",
  );
  toast(sound ? "효과음을 켰어요." : "효과음을 껐어요.");
};
function audioImpact(power: number) {
  if (!sound || !audioContext) return;
  const ctx = audioContext;
  const oscillator = ctx.createOscillator(),
    gain = ctx.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(90, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(26, ctx.currentTime + 0.45);
  gain.gain.setValueAtTime(Math.min(power * 0.15, 0.12), ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.7);
}

function updateStats() {
  if (!ready) return;
  const stats = simulation.stats,
    integrity = Math.round(stats.integrity);
  hasMovingDebris = stats.moving > 0;
  $("#integrity").textContent = String(integrity);
  $("#integrity-bar").style.width = `${integrity}%`;
  $("#integrity-bar").style.background =
    integrity > 75 ? "#96caae" : integrity > 35 ? "#e1b375" : "#e8937d";
  $("#condition").textContent =
    integrity > 95
      ? "안정"
      : integrity > 70
        ? "손상"
        : integrity > 35
          ? "붕괴 중"
          : "심각";
  $("#detached").textContent = String(stats.detached);
  $("#moving").textContent = String(stats.moving);
  $("#active-count").textContent = String(director.effects.length);
  $("#elapsed").textContent =
    `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${(elapsed % 60).toFixed(1).padStart(4, "0")}`;
}
let last = performance.now(),
  accumulator = 0,
  lastUi = 0,
  frameCount = 0,
  fpsStart = last,
  shakeAmount = 0,
  lastImpactSoundTime = -1,
  shadowFrame = 0,
  hasMovingDebris = false;
function frame(now: number) {
  requestAnimationFrame(frame);
  const realDt = Math.min((now - last) / 1000, 0.1);
  last = now;
  if (ready && !paused) {
    accumulator += realDt * timeScale;
    let steps = 0;
    while (accumulator >= 1 / 60 && steps < 6) {
      director.update(1 / 60);
      simulation.step(1 / 60);
      elapsed += 1 / 60;
      accumulator -= 1 / 60;
      steps++;
    }
    if (steps === 6) accumulator = Math.min(accumulator, 1 / 60);
  }
  controls.update();
  const offset = new THREE.Vector3();
  if (shakeAmount > 0.001 && !paused && $<HTMLInputElement>("#shake").checked) {
    offset.set(
      Math.sin(now * 0.051) * shakeAmount,
      Math.cos(now * 0.039) * shakeAmount * 0.65,
      0,
    );
    camera.position.add(offset);
  }
  shakeAmount *= Math.exp(-realDt * 5);
  // Reuse static shadows. Moving debris updates shadows every other frame.
  if (
    ready &&
    !paused &&
    (director.effects.length > 0 || hasMovingDebris) &&
    shadowFrame++ % 2 === 0
  )
    renderer.shadowMap.needsUpdate = true;
  renderer.render(scene, camera);
  camera.position.sub(offset);
  if (now - lastUi > 180) {
    updateStats();
    lastUi = now;
  }
  frameCount++;
  if (now - fpsStart > 1000) {
    $("#fps").textContent =
      `${Math.round((frameCount * 1000) / (now - fpsStart))} FPS`;
    frameCount = 0;
    fpsStart = now;
  }
}
requestAnimationFrame(frame);
PhysicsSimulation.create(campus.parts)
  .then((sim) => {
    simulation = sim;
    director = new DisasterDirector(scene, simulation);
    director.onEvent = toast;
    director.onImpact = (strength) => {
      shakeAmount = Math.min(1.3, shakeAmount + strength);
      if (elapsed - lastImpactSoundTime > 0.4) {
        audioImpact(strength);
        lastImpactSoundTime = elapsed;
      }
    };
    ready = true;
    $("#loading").remove();
    $<HTMLButtonElement>("#launch-button").disabled = false;
    $("#session-status").textContent = "시뮬레이션 연결됨";
    updateStats();
    // Read-only telemetry for automated QA and reproducible bug reports.
    Object.defineProperty(window, "__CBSH__", {
      get: () => ({
        ready,
        paused,
        elapsed,
        timeScale,
        selected,
        active: director.effects.map((e) => e.info.id),
        stats: { ...simulation.stats },
        parts: campus.parts.length,
        target: { x: target.x, y: target.y, z: target.z },
        drawCalls: renderer.info.render.calls,
      }),
    });
  })
  .catch((error) => {
    console.error(error);
    $("#loading").innerHTML =
      "<strong>물리 엔진을 불러오지 못했어요</strong><span>페이지를 새로고침해 다시 시도해주세요.</span>";
    $("#session-status").textContent = "연결 실패";
  });
window.addEventListener("pagehide", (event) => {
  if (event.persisted) return;
  director?.dispose();
  simulation?.dispose();
  controls.dispose();
  renderer.dispose();
});
