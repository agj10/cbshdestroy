import { DESTRUCTION_TOOLS, type DestructionTool } from "./destruction-tools";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { buildCampus } from "./campus";
import { PhysicsSimulation } from "./physics";
import { DisasterDirector, DISASTERS, type DisasterId } from "./disasters";
import {
  DISASTER_SETTINGS,
  getDefaultSettings,
  normalizeSettings,
  MAX_INTENSITY,
  type DisasterSettings,
} from "./disaster-settings";
import { VoxelTerrain } from "./voxel-terrain";
import { icon } from "./icons";
import "./style.css";

const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
$("#app").innerHTML = `
  <header class="topbar">
    <a class="brand" href="./" aria-label="CBSH Disaster Lab 홈"><span class="brandmark">${icon("box", 25)}</span><span>CBSH<span class="brand-divider">/</span><b>DISASTER LAB</b><small>CAMPUS PHYSICS SANDBOX</small></span></a>
    <div class="project-label"><span class="project-dot"></span> 충북과학고등학교 <span class="version">v1.1</span></div>
    <div class="top-actions"><span class="live-indicator"><i></i> <span id="session-status">준비 중</span></span><button class="icon-button" id="help-button" title="사용 방법" aria-label="사용 방법">${icon("info")}</button><button class="icon-button" id="settings-button" title="설정" aria-label="설정">${icon("settings")}</button></div>
  </header>
  <main class="workspace">
    <aside class="sidebar">
      <div class="sidebar-heading"><span class="eyebrow">EXPERIMENT 01</span><h1>재난 시뮬레이션<span class="tiny-dot"></span></h1><p>평온한 캠퍼스에, 뜻밖의 순간을.</p></div>
      <div class="categories" role="tablist" aria-label="재난 분류">${["전체", "자연", "사고", "상상", "직접 파괴"].map((c, i) => `<button role="tab" class="category ${i === 0 ? "active" : ""}" data-category="${c}" aria-selected="${i === 0}">${c}</button>`).join("")}</div>
      <div class="disaster-scroll"><div class="disaster-grid" id="disaster-grid"></div><p class="imagination-note">상상 재난은 게임 속 가상 현상이에요.</p></div>
      <section class="launch-panel">
        <div class="selection-heading"><span id="selected-icon">${icon("meteor", 22)}</span><div><h2 id="selected-name">운석 충돌</h2><span id="selected-english">METEOR IMPACT</span></div><span class="selection-index" id="selection-index">01</span></div>
        <p class="selection-description" id="selected-description"></p>
        <div class="intensity-label"><label for="intensity">재난 강도</label><span class="intensity-number-wrap"><input type="number" class="number-input" id="intensity-number" min="1" max="${MAX_INTENSITY}" value="5" step="1" aria-label="재난 강도 숫자 입력" /><span>/ ${MAX_INTENSITY}</span></span></div>
        <input type="range" id="intensity" min="1" max="${MAX_INTENSITY}" value="5" step="1" aria-label="재난 강도" />
        <div class="intensity-presets" role="group" aria-label="재난 강도 프리셋">${[
          [5, "보통"],
          [8, "강력"],
          [10, "최대"],
        ]
          .map(
            ([value, label]) =>
              `<button type="button" data-intensity-preset="${value}">${label}<span>${value}</span></button>`,
          )
          .join("")}</div>
        <button type="button" class="detail-button" id="disaster-settings-button" aria-haspopup="dialog" aria-controls="disaster-settings-dialog">${icon("settings", 15)}<span>세부 설정</span><small id="settings-count"></small></button>
        <button class="launch-button" id="launch-button" disabled>${icon("play", 18)}<span>재난 시작</span><kbd>Enter</kbd></button>
        <div class="aim-note">${icon("target", 13)} <span id="target-summary">위치 지정 후 원하는 곳에 실행하세요</span></div>
      </section>
      <section id="direct-panel" class="launch-panel" hidden>
        <h2 id="direct-name">물리 파괴</h2><p id="direct-description" class="selection-description"></p>
        <label for="brush-radius">범위 <output id="brush-radius-value">6 m</output></label>
        <input id="brush-radius" type="range" min="1" max="30" step="1" value="6" />
        <label for="brush-strength">강도 <output id="brush-strength-value">5</output></label>
        <input id="brush-strength" type="range" min="1" max="10" step="1" value="5" />
        <button class="launch-button" id="direct-toggle" aria-pressed="false">직접 파괴 켜기</button>
        <p class="selection-description">좌클릭을 누르거나 드래그하면 계속 적용해요. 우클릭으로 회전하고 휠 클릭으로 화면을 옮겨요.</p>
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
      <div class="scene-bottom"><div class="scene-caption"><span class="caption-line"></span><span>CHUNGBUK SCIENCE HIGH SCHOOL<small>청주 · 사진 기반 재구성</small></span></div><div class="scene-actions"><button class="target-button" data-view="wide" id="wide-view-button" title="멀리 퍼진 잔해까지 넓게 보기">${icon("top", 16)}<span>넓게 보기</span></button><button class="target-button" id="target-button">${icon("target", 16)}<span>위치 지정</span></button><button type="button" class="target-button realtime-attack-toggle" id="realtime-attack-toggle" aria-pressed="false" aria-controls="target-hint" title="‘직접 파괴’ 카테고리에서 파괴 유형을 선택하세요" disabled>${icon("ufo", 16)}<span>직접 파괴</span></button></div></div>
      <div class="target-hint" id="target-hint" hidden><span id="target-hint-message">건물 또는 운동장을 클릭해 재난 위치를 정하세요</span> <kbd>Esc 취소</kbd></div>
      <div class="toast" id="toast" role="status" aria-live="polite"></div>
      <div class="loading" id="loading"><span class="loader"></span><strong>캠퍼스를 만들고 있어요</strong><span>3D 모델과 물리 엔진 준비 중</span></div>
    </section>
  </main>
  <footer class="transport"><div class="playback"><button id="pause-button" class="round-button" title="일시정지 (Space)" aria-label="일시정지">${icon("pause", 16)}</button><button id="reset-button" class="icon-button" title="캠퍼스 초기화 (R)" aria-label="캠퍼스 초기화">${icon("reset", 18)}</button><span class="transport-divider"></span><span class="clock-display" id="elapsed">00:00.0</span><span class="time-label">SIM TIME</span></div><div class="speed-controls" role="group" aria-label="시뮬레이션 속도"><span>재생 속도</span>${[0.25, 0.5, 1, 2].map((s) => `<button data-speed="${s}" class="speed-button ${s === 1 ? "active" : ""}">${s}×</button>`).join("")}</div><div class="footer-right"><span id="fps">60 FPS</span><button class="icon-button" id="sound-button" title="효과음 켜기" aria-label="효과음 켜기">${icon("mute", 18)}</button><button class="export-button" id="export-button">${icon("download", 16)}<span>3D 모델</span></button></div></footer>
  <dialog id="info-dialog"><button class="dialog-close icon-button" aria-label="닫기">${icon("close")}</button><span class="eyebrow">ABOUT THIS EXPERIMENT</span><h2>작은 캠퍼스, 커다란 실험.</h2><p>충북과학고등학교 사진을 바탕으로 만든 재난 샌드박스예요. 재난을 선택하고, 강도를 조절하고, 달라지는 캠퍼스를 자유롭게 관찰하세요.</p><div class="help-grid"><span>시점 회전</span><b>우클릭 드래그 / 손가락 하나</b><span>화면 이동</span><b>휠 클릭 드래그 / 손가락 둘</b><span>확대 · 축소</span><b>마우스 휠 / 핀치</b><span>직접 파괴</span><b>직접 파괴 카테고리 → 유형 선택 → 좌클릭</b><span>일반 재난</span><b>선택 후 원하는 곳을 좌클릭</b><span>실행 · 일시정지 · 초기화</span><b>Enter · Space · R</b></div><h3>모델과 물리에 관하여</h3><p>회색 외벽, 주황색 장식, 천문대 돔은 제공 사진을 반영했어요. 보이지 않는 뒷면과 별동, 운동장 세부 배치와 치수는 추정이에요. 2023년 현대화사업 이후 외관을 기준으로 삼았으며 2026년의 모든 변경을 확인한 실측 모델은 아니에요.</p><p>중력·충돌·마찰은 Rapier 물리 엔진으로, 구조 연결의 파손·열·물은 간략한 게임 모델로 계산해요. 실제 학교의 안전성이나 재난 피해를 예측하는 도구는 아니에요. 블랙홀·외계 침공·중력 반전은 가상 규칙을 사용해요.</p><p>3D 모델 버튼은 <b>현재 장면</b>을 GLB 파일로 저장해요. 온전한 모델은 초기화한 뒤 저장하세요.</p><a href="https://school.cbe.go.kr/cbs-h/M010202/" target="_blank" rel="noreferrer">학교 공식 연혁 ↗</a><a href="https://www.cbe.go.kr/news/na/ntt/selectNttInfo.do?mi=10301&nttSn=1517999" target="_blank" rel="noreferrer">공식 전경 참고자료 ↗</a></dialog>
  <dialog id="settings-dialog"><button class="dialog-close icon-button" aria-label="닫기">${icon("close")}</button><span class="eyebrow">PREFERENCES</span><h2>나에게 맞는 실험실</h2><label class="setting-row">그래픽 품질<select id="quality"><option value="high">높음 · 부드러운 그림자</option><option value="low">낮음 · 성능 우선</option></select></label><label class="setting-row">충격 시 카메라 흔들림<input type="checkbox" id="shake" checked /></label><label class="setting-row">파손 먼지<input type="checkbox" id="dust-effects" checked /></label><label class="setting-row">지면 굴착<input type="checkbox" id="terrain-effects" checked /></label><p>지면 굴착을 끄면 새 구덩이가 생기지 않아요. 기존 구덩이는 초기화하면 복원돼요.</p><p>느린 기기에서는 그래픽 품질과 재생 속도를 낮춰보세요. 여러 재난은 동시에 최대 4개까지 실행할 수 있어요.</p></dialog>
  <dialog id="disaster-settings-dialog" class="disaster-settings-dialog" aria-labelledby="detail-title" aria-describedby="detail-introduction">
    <div class="detail-header"><div><span class="eyebrow">DESIGN YOUR DISASTER</span><h2 id="detail-title">운석 충돌 세부 설정</h2><p id="detail-introduction">설정은 재난마다 따로 저장되며, 다음 실행부터 적용돼요.</p></div><button type="button" class="dialog-close icon-button" aria-label="세부 설정 닫기">${icon("close")}</button></div>
    <div class="detail-body">
      <section class="detail-section" aria-labelledby="detail-parameters-heading"><div class="detail-section-heading"><h3 id="detail-parameters-heading">재난 특성</h3><span class="detail-section-tag">01 / PARAMETERS</span></div><p class="field-description parameter-introduction">아래 수치는 기본 강도 5를 기준으로 해요. 재난 강도를 높이면 여기에 추가로 힘과 범위가 적용돼요.</p><div class="parameter-grid" id="disaster-parameter-fields"></div></section>
      <section class="detail-section" aria-labelledby="detail-target-heading"><div class="detail-section-heading"><h3 id="detail-target-heading">발생 위치</h3><span class="detail-section-tag">02 / LOCATION</span></div><div class="target-coordinates">${[
        { axis: "x", label: "가로 X", min: -110, max: 110 },
        { axis: "y", label: "높이 Y", min: 0, max: 60 },
        { axis: "z", label: "세로 Z", min: -95, max: 95 },
      ]
        .map(
          ({ axis, label, min, max }) =>
            `<label class="coordinate-field" for="target-${axis}"><span>${label}</span><span><input class="number-input" id="target-${axis}" type="number" data-target-axis="${axis}" min="${min}" max="${max}" step="0.5" /><small>m</small></span></label>`,
        )
        .join(
          "",
        )}</div><div class="target-presets"><button type="button" data-target-preset="main">본관 중앙</button><button type="button" data-target-preset="field">운동장</button><button type="button" id="detail-target-pick">${icon("target", 14)} 화면에서 지정</button></div><p class="field-description">장면의 가상 좌표예요. 높이는 지면 기준이며, m 표기는 모델의 추정 크기를 따라요.</p></section>
      <section class="detail-section" aria-labelledby="detail-intensity-heading"><div class="detail-section-heading"><h3 id="detail-intensity-heading">재난 강도</h3><span class="detail-section-tag">03 / POWER</span></div><div class="detail-intensity-line"><span id="detail-intensity-name">보통</span><span class="intensity-number-wrap"><input type="number" class="number-input" id="detail-intensity-number" min="1" max="${MAX_INTENSITY}" step="1" value="5" aria-label="세부 설정 재난 강도 숫자 입력" /><span>/ ${MAX_INTENSITY}</span></span></div><input type="range" id="detail-intensity" min="1" max="${MAX_INTENSITY}" step="1" value="5" aria-label="세부 설정 재난 강도" /><div class="intensity-presets detail-presets" role="group" aria-label="세부 설정 재난 강도 프리셋">${[
        [5, "보통"],
        [8, "강력"],
        [10, "최대"],
      ]
        .map(
          ([value, label]) =>
            `<button type="button" data-intensity-preset="${value}">${label}<span>${value}</span></button>`,
        )
        .join(
          "",
        )}</div><p class="field-description">강도는 1–10이며 기본값은 5예요. 높은 강도에서도 충돌 지점과 구조에 따라 남는 부분이 달라져요. 실제 재난 등급과 다른 게임용 강도예요.</p></section>
    </div>
    <div class="detail-footer"><p id="detail-status" role="status" aria-live="polite">변경 내용은 자동으로 저장돼요.</p><div><button type="button" class="detail-reset" id="reset-disaster-settings">${icon("reset", 15)} 이 재난 설정 초기화</button><button type="button" class="launch-button" id="detail-launch-button" disabled>${icon("play", 16)}<span>이 설정으로 시작</span></button></div></div>
  </dialog>
`;

let directTool: DestructionTool = "physical";
let brushPoint: THREE.Vector3 | null = null, brushClock = 0;
let selected: DisasterId = "meteor",
  category = "전체",
  paused = false,
  timeScale = 1,
  elapsed = 0,
  aiming = false,
  targetPreview = false,
  brushDragging = false,
  directModeEnabled = false,
  ready = false,
  sound = false;
let simulation: PhysicsSimulation, director: DisasterDirector;
interface DisasterDraft {
  intensity: number;
  target: { x: number; y: number; z: number };
  settings: DisasterSettings;
}
const DRAFT_STORAGE_KEY = "cbsh-disaster-lab:disaster-drafts:v1";
let storageAvailable = true;
const targetBounds = { x: [-110, 110], y: [0, 60], z: [-95, 95] } as const;
function boundedNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
  step: number,
) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Number(
    Math.min(
      max,
      Math.max(min, min + Math.round((value - min) / step) * step),
    ).toFixed(6),
  );
}
function defaultDraft(id: DisasterId): DisasterDraft {
  return {
    intensity: 5,
    target: { x: 4, y: 8, z: -19.5 },
    settings: getDefaultSettings(id),
  };
}
function readDrafts(): Record<DisasterId, DisasterDraft> {
  const result = Object.fromEntries(
    DISASTERS.map(({ id }) => [id, defaultDraft(id)]),
  ) as Record<DisasterId, DisasterDraft>;
  try {
    const stored = JSON.parse(
      localStorage.getItem(DRAFT_STORAGE_KEY) ?? "null",
    );
    if (
      !stored ||
      stored.version !== 1 ||
      !stored.drafts ||
      typeof stored.drafts !== "object"
    )
      return result;
    if (DISASTERS.some(({ id }) => id === stored.selected))
      selected = stored.selected;
    for (const { id } of DISASTERS) {
      const item = stored.drafts[id];
      if (!item || typeof item !== "object") continue;
      const draft = result[id];
      draft.intensity = stored.intensityScale === 10 ? boundedNumber(item.intensity, 5, 1, MAX_INTENSITY, 1) : 5;
      for (const axis of ["x", "y", "z"] as const) {
        draft.target[axis] = boundedNumber(
          item.target?.[axis],
          draft.target[axis],
          targetBounds[axis][0],
          targetBounds[axis][1],
          0.5,
        );
      }
      if (
        item.settings &&
        typeof item.settings === "object" &&
        !Array.isArray(item.settings)
      ) {
        const values = Object.fromEntries(
          Object.entries(item.settings).filter(
            ([, value]) =>
              typeof value === "string" ||
              (typeof value === "number" && Number.isFinite(value)),
          ),
        ) as DisasterSettings;
        draft.settings = normalizeSettings(id, values);
      }
    }
  } catch {
    // The sandbox still works when browser storage is unavailable or invalid.
    storageAvailable = false;
  }
  return result;
}
const drafts = readDrafts();
const target = new THREE.Vector3().copy(drafts[selected].target);
let lastLaunch: ({ id: DisasterId } & DisasterDraft) | null = null;
function saveDrafts() {
  try {
    localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({ version: 1, intensityScale: 10, selected, drafts }),
    );
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
  $("#detail-status").textContent = storageAvailable
    ? "변경 내용은 자동으로 저장돼요. 다음 실행부터 적용돼요."
    : "이 탭을 사용하는 동안 설정이 유지돼요. 다음 실행부터 적용돼요.";
}
function syncIntensity() {
  const value = drafts[selected].intensity;
  for (const id of [
    "intensity",
    "intensity-number",
    "detail-intensity",
    "detail-intensity-number",
  ]) {
    $<HTMLInputElement>(`#${id}`).value = String(value);
  }
  $("#detail-intensity-name").textContent =
    value <= 5 ? "기본 범위" : value < 10 ? "강력한 재난" : "최대 강도";
  document
    .querySelectorAll<HTMLButtonElement>("[data-intensity-preset]")
    .forEach((button) => {
      const active = Number(button.dataset.intensityPreset) === value;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
}
function setIntensity(value: number) {
  drafts[selected].intensity = boundedNumber(
    value,
    drafts[selected].intensity,
    1,
    MAX_INTENSITY,
    1,
  );
  syncIntensity();
  saveDrafts();
}
function syncTarget() {
  const campusWide = selected === "earthquake" || selected === "flood";
  target.copy(drafts[selected].target);
  for (const axis of ["x", "y", "z"] as const)
    $<HTMLInputElement>(`#target-${axis}`).value = String(target[axis]);
  $("#target-summary").textContent = campusWide
    ? "캠퍼스 전체에 적용돼요"
    : `X ${target.x} · Y ${target.y} · Z ${target.z} m`;
  targetMarker.visible = !campusWide && (aiming || targetPreview);
  targetMarker.position.copy(target);
  targetMarker.position.y = Math.max(0.25, target.y + 0.15);
}
function setTarget(position: { x: number; y: number; z: number }) {
  const draft = drafts[selected];
  for (const axis of ["x", "y", "z"] as const) {
    draft.target[axis] = boundedNumber(
      position[axis],
      draft.target[axis],
      targetBounds[axis][0],
      targetBounds[axis][1],
      0.5,
    );
  }
  targetPreview = true;
  syncTarget();
  saveDrafts();
}
function renderDetails() {
  const info = DISASTERS.find(({ id }) => id === selected)!;
  const campusWide = selected === "earthquake" || selected === "flood";
  $("#detail-title").textContent = `${info.name} 세부 설정`;
  $("#detail-target-heading").textContent = campusWide
    ? "발생 위치 · 캠퍼스 전체"
    : "발생 위치";
  $(".target-coordinates").hidden = campusWide;
  $(".target-presets").hidden = campusWide;
  $(".target-coordinates").parentElement!.querySelector<HTMLElement>(
    ".field-description",
  )!.textContent = campusWide
    ? "이 재난은 캠퍼스 전체에 적용돼요. 아래 특성에서 방향과 진행 방식을 조절하세요."
    : "장면의 가상 좌표예요. 높이는 지면 기준이며, m 표기는 모델의 추정 크기를 따라요.";
  $<HTMLButtonElement>("#target-button").disabled = campusWide;
  $("#target-button").title = campusWide
    ? "이 재난은 캠퍼스 전체에 적용돼요"
    : "발생 위치 지정";
  $("#settings-count").textContent =
    `${DISASTER_SETTINGS[selected].length}개 특성`;
  $("#disaster-parameter-fields").innerHTML = DISASTER_SETTINGS[selected]
    .map((field) => {
      const value = drafts[selected].settings[field.key];
      const description = `<p class="field-description" id="param-description-${field.key}">${field.description}</p>`;
      if (field.type === "select")
        return `<div class="parameter-field select-field"><label for="param-${field.key}">${field.label}</label>${description}<select id="param-${field.key}" data-parameter="${field.key}" aria-describedby="param-description-${field.key}">${field.options.map((option) => `<option value="${option.value}" ${value === option.value ? "selected" : ""}>${option.label}</option>`).join("")}</select></div>`;
      return `<div class="parameter-field"><div class="parameter-heading"><label for="param-${field.key}">${field.label}</label><span class="parameter-number-wrap"><input type="number" class="number-input" id="param-${field.key}-number" data-parameter="${field.key}" min="${field.min}" max="${field.max}" step="${field.step}" value="${value}" aria-label="${field.label} 숫자 입력" aria-describedby="param-description-${field.key}" /><small>${field.unit ?? ""}</small></span></div>${description}<input type="range" id="param-${field.key}" data-parameter="${field.key}" min="${field.min}" max="${field.max}" step="${field.step}" value="${value}" aria-describedby="param-description-${field.key}" /><div class="parameter-extents"><span>${field.min}${field.unit ? ` ${field.unit}` : ""}</span><span>${field.max}${field.unit ? ` ${field.unit}` : ""}</span></div></div>`;
    })
    .join("");
  document
    .querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-parameter]")
    .forEach((input) => {
      const field = DISASTER_SETTINGS[selected].find(
        ({ key }) => key === input.dataset.parameter,
      )!;
      const commit = () => {
        const draft = drafts[selected];
        draft.settings = normalizeSettings(selected, {
          ...draft.settings,
          [field.key]:
            field.type === "range"
              ? input.value === ""
                ? draft.settings[field.key]
                : Number(input.value)
              : input.value,
        });
        document
          .querySelectorAll<
            HTMLInputElement | HTMLSelectElement
          >(`[data-parameter="${field.key}"]`)
          .forEach((peer) => {
            peer.value = String(draft.settings[field.key]);
          });
        saveDrafts();
      };
      // Number inputs commit on blur/Enter so intermediate negative and decimal entries remain editable.
      if (input instanceof HTMLInputElement && input.type === "range")
        input.oninput = commit;
      else input.onchange = commit;
    });
  syncIntensity();
  syncTarget();
}
let toastTimer: ReturnType<typeof setTimeout>;
function toast(text: string) {
  $("#toast").textContent = text;
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 3000);
}
function drawDisasters() {
  const direct = category === "직접 파괴";
  $(".launch-panel").hidden = direct; $("#direct-panel").hidden = !direct;
  $(".imagination-note").textContent = direct ? "재난 없이 파괴 유형을 직접 실험해요." : "상상 재난은 게임 속 가상 현상이에요.";
  if(direct){
    $("#disaster-grid").innerHTML=DESTRUCTION_TOOLS.map(tool=>
      '<button class="disaster-tile '+(directTool===tool.id?'selected':'')+'" data-destruction="'+tool.id+'" aria-pressed="'+(directTool===tool.id)+'"><span class="tile-icon">'+icon(tool.icon,22)+'</span><span>'+tool.name+'</span></button>').join('');
    const tool=DESTRUCTION_TOOLS.find(tool=>tool.id===directTool)!;
    $("#direct-name").textContent=tool.name;$("#direct-description").textContent=tool.description;
    for(const selector of ['#brush-radius','#brush-strength','label[for="brush-radius"]','label[for="brush-strength"]']) $(selector).hidden = directTool === "grab";
    document.querySelectorAll<HTMLButtonElement>('[data-destruction]').forEach(button=>button.onclick=()=>{stopGrab();brushDragging=false;directTool=button.dataset.destruction as DestructionTool;brushPoint=null;syncDirectMode();drawDisasters();});
    return;
  }
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
        setAiming(false);
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
  renderDetails();
  saveDrafts();
}
document.querySelectorAll<HTMLButtonElement>("[data-category]").forEach(
  (b) =>
    (b.onclick = () => {
      setDirectMode(false);
      category = b.dataset.category!;
      syncDirectMode();
      document
        .querySelectorAll<HTMLButtonElement>("[data-category]")
        .forEach((c) => {
          c.classList.toggle("active", c === b);
          c.setAttribute("aria-selected", String(c === b));
        });
      drawDisasters();
    }),
);
for (const id of ["intensity", "detail-intensity"]) {
  $<HTMLInputElement>(`#${id}`).oninput = (event) =>
    setIntensity(Number((event.target as HTMLInputElement).value));
}
for (const id of ["intensity-number", "detail-intensity-number"]) {
  $<HTMLInputElement>(`#${id}`).onchange = (event) => {
    const input = event.target as HTMLInputElement;
    setIntensity(
      input.value === "" ? drafts[selected].intensity : Number(input.value),
    );
  };
}
document
  .querySelectorAll<HTMLButtonElement>("[data-intensity-preset]")
  .forEach((button) => {
    button.onclick = () => setIntensity(Number(button.dataset.intensityPreset));
  });
document
  .querySelectorAll<HTMLInputElement>("[data-target-axis]")
  .forEach((input) => {
    input.onchange = () => {
      const axis = input.dataset.targetAxis as keyof typeof targetBounds;
      setTarget({
        ...drafts[selected].target,
        [axis]:
          input.value === ""
            ? drafts[selected].target[axis]
            : Number(input.value),
      });
    };
  });
document
  .querySelectorAll<HTMLButtonElement>("[data-target-preset]")
  .forEach((button) => {
    button.onclick = () =>
      setTarget(
        button.dataset.targetPreset === "main"
          ? { x: 4, y: 8, z: -19.5 }
          : { x: 4, y: 0, z: 32 },
      );
  });
for (const id of ["info", "settings", "disaster-settings"]) {
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
$("#info-dialog").insertAdjacentHTML(
  "beforeend",
  "<h3>더 큰 재난, 더 세밀한 설정</h3><p>재난 강도는 1부터 10까지이며 기본값은 5예요. 세부 설정에서 재난의 크기, 속도, 방향 등을 조절할 수 있어요. 설정은 재난마다 따로 유지되며 다음 실행부터 적용돼요. 멀리 퍼진 잔해는 넓게 보기 버튼으로 관찰하세요.</p>",
);
$("#disaster-settings-button").onclick = () => {
  renderDetails();
  setAiming(false);
  $<HTMLDialogElement>("#disaster-settings-dialog").showModal();
  $(".detail-body").scrollTop = 0;
};
$("#detail-target-pick").onclick = () => {
  $<HTMLDialogElement>("#disaster-settings-dialog").close();
  setAiming(true);
};
$("#reset-disaster-settings").onclick = () => {
  drafts[selected] = defaultDraft(selected);
  renderDetails();
  saveDrafts();
  $("#detail-status").textContent =
    "이 재난의 강도, 위치와 특성을 기본값으로 되돌렸어요.";
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb6c9ce);
scene.fog = new THREE.Fog(0xb6c9ce, 280, 1250);
const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 2000);
camera.position.set(160, 145, 205);
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
controls.maxDistance = 1000;
controls.maxPolarAngle = Math.PI * 0.48;
controls.minPolarAngle = 0.045;
controls.enablePan = true;
controls.mouseButtons = { LEFT: null as unknown as THREE.MOUSE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE };
renderer.domElement.addEventListener('contextmenu', event => event.preventDefault());
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
const extendedGround = new THREE.Mesh(
  new THREE.CircleGeometry(1200, 96),
  new THREE.MeshStandardMaterial({ color: 0x879874, roughness: 1 }),
);
extendedGround.rotation.x = -Math.PI / 2;
extendedGround.position.y = -0.15;
extendedGround.receiveShadow = true;
scene.add(extendedGround);

const voxelTerrain = new VoxelTerrain();
scene.add(voxelTerrain.group);
voxelTerrain.bindSurface(extendedGround);
const buildingMeshes = new Set(campus.parts.map(part => part.mesh));
campus.group.traverse(object => {
  if (!(object instanceof THREE.Mesh) || buildingMeshes.has(object)) return;
  const bounds = new THREE.Box3().setFromObject(object);
  if (bounds.max.y < 0.2) voxelTerrain.bindSurface(object);
});

const targetMarker = new THREE.Group();
const ring = new THREE.Mesh(
  new THREE.RingGeometry(2.7, 2.83, 64),
  new THREE.MeshBasicMaterial({
    color: 0xfba479,
    transparent: true,
    opacity: 0.48,
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
targetMarker.visible = false;
scene.add(targetMarker);
drawDisasters();
updateSelection();
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
      controls.target.set(18, 2, 8);
      if (b.dataset.view === "front") camera.position.set(15, 37, 188);
      else if (b.dataset.view === "top") camera.position.set(18, 295, 8.1);
      else if (b.dataset.view === "wide") camera.position.set(340, 310, 430);
      else camera.position.set(160, 145, 205);
      controls.update();
    }),
);
function setAiming(value: boolean) {
  if (selected === "earthquake" || selected === "flood") value = false;
  if (value) setDirectMode(false);
  aiming = value;
  $("#target-button").classList.toggle("active", value);
  $("#target-hint").hidden = !value;
  $("#target-hint-message").textContent =
    "건물 또는 운동장을 클릭해 재난 위치를 정하세요";
  $("#target-hint kbd").textContent = "Esc 취소";
  targetMarker.visible =
    value ||
    (targetPreview && selected !== "earthquake" && selected !== "flood");
  renderer.domElement.style.cursor = value ? "crosshair" : "grab";
}
$("#target-button").onclick = () => setAiming(!aiming);
const raycaster = new THREE.Raycaster();
let down = { x: 0, y: 0 };
let grabPointer: number | null = null;
const grabPlane = new THREE.Plane();
const grabMeshes = new Map(campus.parts.map(part => [part.mesh, part.spec.id]));
function stopGrab() {
  if (ready) simulation.endGrab();
  if (grabPointer !== null && renderer.domElement.hasPointerCapture(grabPointer)) renderer.domElement.releasePointerCapture(grabPointer);
  grabPointer = null;
  if (directModeEnabled) renderer.domElement.style.cursor = directTool === "grab" ? "grab" : "crosshair";
}

const pointerPoint = (event: PointerEvent) => {
  const r = renderer.domElement.getBoundingClientRect();
  raycaster.setFromCamera(
    new THREE.Vector2(
      ((event.clientX - r.left) / r.width) * 2 - 1,
      (-(event.clientY - r.top) / r.height) * 2 + 1,
    ),
    camera,
  );
  const intersects = raycaster.intersectObjects(
    [...campus.parts.filter(part => part.mesh.visible).map((part) => part.mesh), ...voxelTerrain.group.children],
    false,
  );
  if (intersects.length) return intersects[0].point.clone();
  const groundPoint = new THREE.Vector3();
  return raycaster.ray.intersectPlane(
    new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    groundPoint,
  ) &&
    Math.abs(groundPoint.x) < 110 &&
    Math.abs(groundPoint.z) < 95
    ? groundPoint
    : undefined;
};
const canUseDirectMode = () =>
  ready && category === "직접 파괴";
function syncDirectMode() {
  directModeEnabled = canUseDirectMode();
  controls.enabled = true;
  $('#direct-toggle').hidden = true;
  $('#realtime-attack-toggle').hidden = true;
  $('#target-hint').hidden = false;
  $('#target-hint-message').textContent = '좌클릭: 실행·누르고 연속 적용 · 우클릭: 회전 · 휠: 확대 · 휠 드래그: 이동';
  $('#target-hint kbd').textContent = '';
  renderer.domElement.style.cursor = grabPointer !== null ? 'grabbing' : directTool === 'grab' && directModeEnabled ? 'grab' : 'crosshair';
}
function setDirectMode(_value: boolean) {
  stopGrab(); brushPoint = null; brushDragging = false;
  syncDirectMode();
}
for(const field of ["radius","strength"]){
  const input=$<HTMLInputElement>('#brush-'+field);
  input.oninput=()=>$('#brush-'+field+'-value').textContent=input.value+(field==='radius'?' m':'');
}
function applyBrush(){
  if(!brushPoint || paused || !directModeEnabled || directTool === "grab")return;
  director.directDestruction(directTool,brushPoint,Number($<HTMLInputElement>('#brush-radius').value),Number($<HTMLInputElement>('#brush-strength').value),.12);
}
const updateBrushPoint = (event: PointerEvent) => {
  brushPoint=pointerPoint(event) ?? null;
};
renderer.domElement.addEventListener("pointerdown", (e) => {
  down = { x: e.clientX, y: e.clientY };
  if (!ready || e.button !== 0) return;
  if (aiming) return;
  if (canUseDirectMode()) {
    if (directTool === "grab") {
      if (paused) {toast("재생 중에 조각을 잡아 옮길 수 있어요.");return;}
      pointerPoint(e);
      const hit = raycaster.intersectObjects(campus.parts.filter(part=>part.mesh.visible).map(part=>part.mesh),false)[0];
      if (hit && simulation.beginGrab(grabMeshes.get(hit.object as THREE.Mesh)!,hit.point)) {
        grabPlane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()),hit.point);
        grabPointer=e.pointerId;renderer.domElement.setPointerCapture(e.pointerId);
        renderer.domElement.style.cursor="grabbing";
      }
      e.preventDefault();return;
    }
    brushDragging = true;
    renderer.domElement.setPointerCapture?.(e.pointerId);
    updateBrushPoint(e);
    applyBrush(); brushClock=0;
    e.preventDefault();
  } else {
    const point = pointerPoint(e);
    if (point) { setTarget(point); launch(); }
  }
});
renderer.domElement.addEventListener("pointermove", (e) => {
  if (grabPointer === e.pointerId) {
    const r=renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);
    const target=raycaster.ray.intersectPlane(grabPlane,new THREE.Vector3());
    if (target) simulation.moveGrab(target);
    e.preventDefault();return;
  }
  if (brushDragging && e.buttons === 1) {
    const previous = brushPoint?.clone();
    updateBrushPoint(e);
    if(previous && brushPoint && directTool === "burn") {
      const next=brushPoint.clone(), steps=Math.min(24,Math.ceil(previous.distanceTo(next)/1.2));
      for(let i=1;i<=steps;i++){brushPoint=previous.clone().lerp(next,i/steps);applyBrush();}
      brushPoint=next;
    }
    e.preventDefault();
  }
});
renderer.domElement.addEventListener("pointerup", (e) => {
  if(e.button !== 0)return;
  if(grabPointer===e.pointerId){stopGrab();return;}
  if (brushDragging) {
    brushDragging = false;
    brushPoint = null;
    if (renderer.domElement.hasPointerCapture?.(e.pointerId))
      renderer.domElement.releasePointerCapture(e.pointerId);
    return;
  }
  if (!aiming || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
  const point = pointerPoint(e);
  if (!point) {
    toast("캠퍼스 안쪽을 선택해주세요.");
    return;
  }
  setTarget(point);
  setAiming(false);
  toast("재난 위치를 지정했어요.");
});
renderer.domElement.addEventListener("pointercancel", () => {
  stopGrab();
  brushDragging = false;
  brushPoint = null;
  if (directModeEnabled) return;
  controls.enabled = true;
});
renderer.domElement.addEventListener("lostpointercapture", () => {if(grabPointer!==null)stopGrab();});
window.addEventListener("blur",()=>{stopGrab();brushDragging=false;brushPoint=null;});
function setPause(value: boolean) {
  if (!ready) return;
  if (value) stopGrab();
  paused = value;
  $("#pause-button").innerHTML = icon(paused ? "play" : "pause", 16);
  $("#pause-button").setAttribute("aria-label", paused ? "재생" : "일시정지");
  $("#pause-button").title = paused ? "재생 (Space)" : "일시정지 (Space)";
  $("#session-status").textContent = paused ? "일시정지" : "시뮬레이션 연결됨";
}
function reset() {
  if (!ready) return;
  setDirectMode(false);
  director.reset();
  simulation.reset();
  voxelTerrain.clear();
  targetPreview = false;
  syncTarget();
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
  if(category === "직접 파괴")return;
  const draft = drafts[selected];
  const snapshot = {
    id: selected,
    intensity: draft.intensity,
    target: { ...draft.target },
    settings: normalizeSettings(selected, { ...draft.settings }),
  };
  const success = director.launch(
    snapshot.id,
    new THREE.Vector3().copy(snapshot.target),
    snapshot.intensity,
    { ...snapshot.settings },
  );
  if (!success) {
    const message = "진행 중인 재난이 끝나면 추가할 수 있어요. (최대 4개)";
    toast(message);
    $("#detail-status").textContent = message;
    return;
  }
  lastLaunch = snapshot;
  $<HTMLDialogElement>("#disaster-settings-dialog").close();
  targetPreview = false;
  setAiming(false);
  setPause(false);
  audioImpact(0.2);
  syncDirectMode();

}
$("#launch-button").onclick = launch;
$("#detail-launch-button").onclick = launch;
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
    e.code === "Enter" &&
    e.target instanceof HTMLInputElement &&
    e.target.type === "number"
  ) {
    e.preventDefault();
    e.target.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }
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
  if (e.code === "Escape") {
    if (directModeEnabled) setDirectMode(false);
    else setAiming(false);
  }
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
const terrainSetting = $<HTMLInputElement>("#terrain-effects");
try { terrainSetting.checked = localStorage.getItem("cbsh-terrain-effects") !== "false"; } catch {}
terrainSetting.onchange = () => {
  if (ready) director.terrainEnabled = terrainSetting.checked;
  try { localStorage.setItem("cbsh-terrain-effects", String(terrainSetting.checked)); } catch {}
};
const dustSetting=$<HTMLInputElement>("#dust-effects");
try { dustSetting.checked=localStorage.getItem("cbsh-fracture-dust") !== "false"; } catch {}
dustSetting.onchange=()=>{
  if(ready)director.setDustEnabled(dustSetting.checked);
    director.terrainEnabled = terrainSetting.checked;
  try { localStorage.setItem("cbsh-fracture-dust",String(dustSetting.checked)); } catch {}
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
  syncDirectMode();
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
      if(brushDragging && directModeEnabled){brushClock+=1/60;if(brushClock>=.12){applyBrush();brushClock-=.12;}}
      director.update(1 / 60);
      simulation.step(1 / 60);
      elapsed += 1 / 60;
      accumulator -= 1 / 60;
      steps++;
    }
    if (steps === 6) accumulator = Math.min(accumulator, 1 / 60);
  }
  controls.update();
  if (targetMarker.visible) {
    const pulse = 1 + Math.sin(now * 0.006) * 0.07;
    targetMarker.scale.setScalar(pulse);
  }
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
    director.setDustEnabled(dustSetting.checked);
    simulation.onFracture = (position,size) => director.fractureDust(position,size);
    simulation.onCrumble = (position, color) => director.crumble(position, color);
    director.onTerrainImpact = (center, radius, depth, source) =>
      voxelTerrain.impact(center, radius, depth, source);
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
    $<HTMLButtonElement>("#detail-launch-button").disabled = false;
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
        intensity: drafts[selected].intensity,
        settings: { ...drafts[selected].settings },
        drafts: structuredClone(drafts),
        lastLaunch: lastLaunch ? structuredClone(lastLaunch) : null,
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
  voxelTerrain.dispose();
  controls.dispose();
  renderer.dispose();
});
