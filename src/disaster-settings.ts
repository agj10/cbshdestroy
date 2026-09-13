import type { DisasterId } from "./disasters";

export const MAX_INTENSITY = 20;
export const DEFAULT_INTENSITY = 3;
export type DisasterSettings = Record<string, number | string>;
export interface RangeSetting {
  type: "range";
  key: string;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: string;
}
export interface SelectSetting {
  type: "select";
  key: string;
  label: string;
  description: string;
  default: string;
  options: { value: string; label: string }[];
}
export type SettingDefinition = RangeSetting | SelectSetting;
const range = (
  key: string,
  label: string,
  description: string,
  min: number,
  max: number,
  step: number,
  value: number,
  unit = "",
): RangeSetting => ({
  type: "range",
  key,
  label,
  description,
  min,
  max,
  step,
  default: value,
  unit,
});
const select = (
  key: string,
  label: string,
  description: string,
  value: string,
  options: [string, string][],
): SelectSetting => ({
  type: "select",
  key,
  label,
  description,
  default: value,
  options: options.map(([value, label]) => ({ value, label })),
});
const direction = (value = 0, key = "direction", label = "진행 방향") =>
  range(
    key,
    label,
    "0°는 캠퍼스 화면의 북쪽, 90°는 동쪽이에요.",
    0,
    360,
    1,
    value,
    "°",
  );
const duration = (value: number) =>
  range(
    "duration",
    "지속 시간",
    "재난이 작용하는 시뮬레이션 시간을 정해요.",
    5,
    120,
    1,
    value,
    "초",
  );

/** Base settings are authored for the default intensity; the global intensity multiplies their effect. */
export const DISASTER_SETTINGS: Record<DisasterId, SettingDefinition[]> = {
  meteor: [
    range(
      "diameter",
      "운석 지름",
      "모형의 크기와 충격 범위·파괴력이 함께 달라져요.",
      0.5,
      30,
      0.5,
      6,
      "m",
    ),
    select(
      "composition",
      "운석 종류",
      "구성에 따라 무게, 충격과 열 반응이 달라져요.",
      "rock",
      [
        ["rock", "암석 운석"],
        ["iron", "철질 운석"],
        ["ice", "얼음 운석"],
      ],
    ),
    range(
      "speed",
      "충돌 속도",
      "빨라질수록 비행 시간이 짧아지고 충격이 강해져요.",
      10,
      180,
      5,
      45,
      "m/s",
    ),
    direction(123, "direction", "접근 방향"),
    range(
      "angle",
      "낙하 각도",
      "작은 값은 비스듬히, 90°는 수직으로 떨어져요.",
      15,
      90,
      1,
      51,
      "°",
    ),
    range(
      "debris",
      "잔해 비산",
      "충돌 후 구조 조각이 날아가는 힘을 조절해요.",
      0.2,
      4,
      0.1,
      1,
      "×",
    ),
  ],
  earthquake: [
    range(
      "frequency",
      "흔들림 주파수",
      "작은 값은 느린 흔들림, 큰 값은 빠른 흔들림이에요.",
      0.25,
      3,
      0.05,
      1,
      "×",
    ),
    direction(0, "direction", "진동 방향"),
    duration(16),
  ],
  tsunami: [
    range(
      "height",
      "파도 높이",
      "학교에 도달하는 파도의 기준 높이를 정해요.",
      0.4,
      40,
      0.2,
      8.4,
      "m",
    ),
    range(
      "speed",
      "이동 속도",
      "파도가 캠퍼스를 가로지르는 속도를 정해요.",
      3,
      40,
      1,
      10,
      "m/s",
    ),
    range(
      "width",
      "파도 폭",
      "두꺼운 파도일수록 한 지점에 물이 오래 머물러요.",
      4,
      60,
      1,
      16,
      "m",
    ),
    direction(17),
    duration(22),
  ],
  volcano: [
    range(
      "rate",
      "분출 빈도",
      "초당 분출하는 화산탄의 수를 정해요.",
      0.25,
      8,
      0.25,
      1.5,
      "회/초",
    ),
    range(
      "diameter",
      "화산탄 지름",
      "화산탄의 모형과 도착 지점의 충격이 커져요.",
      0.3,
      6,
      0.1,
      1.3,
      "m",
    ),
    range(
      "spread",
      "낙하 범위",
      "선택한 지점을 중심으로 화산탄이 퍼져요.",
      5,
      140,
      1,
      44,
      "m",
    ),
    range(
      "heat",
      "열량",
      "화산탄이 전달하는 열의 배율을 정해요.",
      0.1,
      4,
      0.1,
      1,
      "×",
    ),
    duration(22),
  ],
  flood: [
    range(
      "height",
      "최고 수위",
      "물의 기준 높이를 정해요. 재난 강도가 추가로 적용돼요.",
      0.25,
      30,
      0.25,
      5,
      "m",
    ),
    range(
      "riseTime",
      "물이 차는 시간",
      "설정한 수위까지 도달하는 데 걸리는 시간이에요.",
      1,
      40,
      1,
      9,
      "초",
    ),
    range(
      "flow",
      "수류 속도",
      "물에 잠긴 잔해를 미는 흐름을 조절해요.",
      0,
      30,
      0.5,
      3,
      "m/s",
    ),
    direction(17),
    duration(28),
  ],
  lightning: [
    range(
      "strikes",
      "낙뢰 횟수",
      "반복해서 떨어지는 번개의 수를 정해요.",
      1,
      20,
      1,
      4,
      "회",
    ),
    range(
      "interval",
      "낙뢰 간격",
      "반복 낙뢰 사이의 시뮬레이션 시간이에요.",
      0.2,
      3,
      0.1,
      1.1,
      "초",
    ),
    range(
      "spread",
      "낙뢰 분산",
      "0이면 같은 지점, 큰 값이면 주변에 흩어져 떨어져요.",
      0,
      100,
      1,
      0,
      "m",
    ),
    range(
      "heat",
      "방전 열량",
      "번개가 전달하는 국소 열손상을 조절해요.",
      0.25,
      5,
      0.25,
      1,
      "×",
    ),
  ],
  tornado: [
    range(
      "radius",
      "영향 반경",
      "회오리바람이 조각을 끌어당기는 범위를 정해요.",
      10,
      180,
      5,
      70,
      "m",
    ),
    range(
      "spin",
      "회전력",
      "잔해를 옆으로 회전시키는 힘을 조절해요.",
      0,
      4,
      0.1,
      1,
      "×",
    ),
    range(
      "lift",
      "상승력",
      "잔해를 하늘로 들어 올리는 힘을 조절해요.",
      0,
      4,
      0.1,
      1,
      "×",
    ),
    range(
      "travel",
      "이동 거리",
      "선택 지점을 중심으로 회오리가 이동하는 거리를 정해요.",
      0,
      100,
      2,
      24,
      "m",
    ),
    direction(90),
    duration(22),
  ],
  hail: [
    range(
      "diameter",
      "우박 지름",
      "얼음덩이의 크기와 반복 충격을 조절해요.",
      0.1,
      4,
      0.1,
      0.6,
      "m",
    ),
    range(
      "rate",
      "낙하 빈도",
      "초당 떨어지는 우박의 수를 정해요.",
      1,
      20,
      1,
      7,
      "개/초",
    ),
    range(
      "spread",
      "낙하 범위",
      "선택 지점 주변에 우박이 퍼지는 폭을 정해요.",
      5,
      160,
      1,
      65,
      "m",
    ),
    range(
      "height",
      "낙하 높이",
      "높이 떨어질수록 비행 시간이 길고 충격이 강해져요.",
      5,
      120,
      1,
      30,
      "m",
    ),
    duration(18),
  ],
  fire: [
    range(
      "radius",
      "초기 화재 범위",
      "처음 열이 가해지는 영역을 정해요.",
      1,
      50,
      1,
      12,
      "m",
    ),
    range(
      "heat",
      "열량",
      "주변 부재가 뜨거워지는 속도를 조절해요.",
      0.25,
      4,
      0.25,
      1,
      "×",
    ),
    range(
      "spread",
      "확산 속도",
      "열이 가해지는 영역이 커지는 속도를 정해요.",
      0,
      2,
      0.01,
      0.17,
      "m/s",
    ),
    range(
      "wind",
      "바람 세기",
      "바람이 부는 쪽으로 불과 열원이 이동해요.",
      0,
      15,
      0.5,
      0,
      "m/s",
    ),
    direction(0, "direction", "바람 방향"),
    duration(30),
  ],
  explosion: [
    range(
      "radius",
      "충격 반경",
      "선택 지점에서 충격이 퍼지는 기준 거리를 정해요.",
      2,
      160,
      0.5,
      20.5,
      "m",
    ),
    select("pattern", "폭발 형태", "충격이 퍼지는 방향을 바꿔요.", "radial", [
      ["radial", "사방으로"],
      ["upward", "위쪽으로"],
      ["directional", "한쪽 방향으로"],
    ]),
    range(
      "debris",
      "잔해 비산",
      "분리된 조각에 가해지는 힘을 조절해요.",
      0.2,
      5,
      0.1,
      1,
      "×",
    ),
    range(
      "heat",
      "후속 열량",
      "0이면 충격만, 큰 값이면 열손상도 남아요.",
      0,
      4,
      0.1,
      0,
      "×",
    ),
    direction(0, "direction", "충격 방향"),
  ],
  plane: [
    select(
      "aircraft",
      "비행기 종류",
      "기체 모형과 충돌 질량이 달라져요.",
      "jet",
      [
        ["jet", "제트기"],
        ["cargo", "화물기"],
        ["glider", "글라이더"],
      ],
    ),
    range(
      "size",
      "기체 크기",
      "기체 크기와 충격 범위의 배율이에요.",
      0.5,
      3,
      0.1,
      1,
      "×",
    ),
    range(
      "speed",
      "충돌 속도",
      "비행 시간과 충돌 세기를 함께 조절해요.",
      10,
      180,
      1,
      37,
      "m/s",
    ),
    direction(315, "direction", "접근 방향"),
    range(
      "angle",
      "진입 각도",
      "낮은 각도의 활공과 가파른 추락을 바꿔볼 수 있어요.",
      5,
      75,
      1,
      17,
      "°",
    ),
    range(
      "fuel",
      "후속 화재",
      "충돌 이후 열과 불꽃의 배율이에요. 0이면 불이 꺼져요.",
      0,
      4,
      0.1,
      1,
      "×",
    ),
  ],
  blackhole: [
    range(
      "radius",
      "영향 반경",
      "가상의 인력이 작용하는 범위를 정해요.",
      10,
      220,
      5,
      70,
      "m",
    ),
    range(
      "size",
      "핵의 크기",
      "검은 구체와 주변 고리의 크기를 정해요.",
      1,
      15,
      0.1,
      3.3,
      "m",
    ),
    range(
      "pull",
      "인력",
      "중심으로 조각을 끌어당기는 힘을 정해요.",
      0.25,
      5,
      0.25,
      1,
      "×",
    ),
    range(
      "spin",
      "회전력",
      "빨려 들어가는 잔해의 회전을 조절해요.",
      0,
      4,
      0.1,
      1,
      "×",
    ),
    range(
      "height",
      "발생 높이",
      "선택 지점 위에 핵이 생기는 높이예요.",
      0,
      100,
      1,
      15,
      "m",
    ),
    duration(24),
  ],
  aliens: [
    range(
      "craftCount",
      "비행체 수",
      "동시에 나타나는 미확인 비행체 수를 정해요.",
      1,
      6,
      1,
      1,
      "대",
    ),
    range(
      "interval",
      "발사 간격",
      "각 비행체가 빔을 발사하는 간격을 정해요.",
      0.2,
      4,
      0.1,
      1.3,
      "초",
    ),
    range(
      "beam",
      "빔 출력",
      "가상의 빔 충격과 열, 빛의 굵기를 조절해요.",
      0.25,
      5,
      0.25,
      1,
      "×",
    ),
    range(
      "spread",
      "공격 범위",
      "선택 지점 주변에서 빔이 떨어지는 영역이에요.",
      5,
      150,
      1,
      28,
      "m",
    ),
    range(
      "height",
      "비행 높이",
      "선택 지점 위에 비행체가 떠 있는 높이예요.",
      10,
      100,
      1,
      32,
      "m",
    ),
    duration(22),
  ],
  gravity: [
    range(
      "radius",
      "영향 반경",
      "중력 반전이 적용되는 영역을 정해요.",
      10,
      220,
      5,
      70,
      "m",
    ),
    range(
      "lift",
      "상승력",
      "조각을 위로 끌어올리는 힘을 조절해요.",
      0.25,
      5,
      0.25,
      1,
      "×",
    ),
    range(
      "height",
      "목표 높이",
      "선택 지점 위에서 조각이 모이는 높이예요.",
      10,
      140,
      1,
      37,
      "m",
    ),
    range(
      "spin",
      "회전력",
      "떠오르는 잔해의 회전 정도를 정해요.",
      0,
      4,
      0.1,
      1,
      "×",
    ),
    range(
      "release",
      "낙하 관찰 시간",
      "재난 종료 전 힘을 끄고 자연 낙하를 관찰하는 시간이에요.",
      1,
      12,
      1,
      4,
      "초",
    ),
    duration(20),
  ],
};

export function getDefaultSettings(id: DisasterId): DisasterSettings {
  return Object.fromEntries(
    DISASTER_SETTINGS[id].map((field) => [field.key, field.default]),
  );
}

/** Ignore unknown keys and invalid values; clamp finite numeric settings at the API boundary. */
export function normalizeSettings(
  id: DisasterId,
  input?: Partial<DisasterSettings>,
): DisasterSettings {
  const result = getDefaultSettings(id);
  if (!input || typeof input !== "object") return result;
  for (const field of DISASTER_SETTINGS[id]) {
    const value = input[field.key];
    if (
      field.type === "range" &&
      typeof value === "number" &&
      Number.isFinite(value)
    ) {
      const clamped = Math.max(field.min, Math.min(field.max, value));
      const stepped =
        field.min + Math.round((clamped - field.min) / field.step) * field.step;
      result[field.key] = Number(
        Math.max(field.min, Math.min(field.max, stepped)).toFixed(6),
      );
    } else if (
      field.type === "select" &&
      typeof value === "string" &&
      field.options.some((option) => option.value === value)
    ) {
      result[field.key] = value;
    }
  }
  return result;
}

/** Keep the original 1–5 range, then smoothly grow to 12× authored effect gain at level 20. */
export function intensityGain(intensity: number): number {
  const value = Number.isFinite(intensity)
    ? Math.max(1, Math.min(MAX_INTENSITY, intensity))
    : DEFAULT_INTENSITY;
  return 1 + 11 * Math.pow(Math.max(0, value - 5) / 15, 1.6);
}
