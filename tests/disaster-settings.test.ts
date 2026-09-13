import { describe, expect, it } from "vitest";
import { DISASTERS } from "../src/disasters";
import {
  DISASTER_SETTINGS,
  getDefaultSettings,
  normalizeSettings,
  intensityGain,
  MAX_INTENSITY,
} from "../src/disaster-settings";

describe("disaster parameter boundaries", () => {
  it("provides distinct, valid adjustable settings for every available disaster", () => {
    expect(Object.keys(DISASTER_SETTINGS).sort()).toEqual(
      DISASTERS.map((d) => d.id).sort(),
    );
    for (const event of DISASTERS) {
      const fields = DISASTER_SETTINGS[event.id];
      expect(fields.length).toBeGreaterThanOrEqual(3);
      expect(new Set(fields.map((field) => field.key)).size).toBe(
        fields.length,
      );
      expect(normalizeSettings(event.id, getDefaultSettings(event.id))).toEqual(
        getDefaultSettings(event.id),
      );
      for (const field of fields) {
        if (field.type === "range") {
          expect(field.default).toBeGreaterThanOrEqual(field.min);
          expect(field.default).toBeLessThanOrEqual(field.max);
          expect(field.step).toBeGreaterThan(0);
        } else {
          expect(field.options.length).toBeGreaterThanOrEqual(2);
          expect(
            field.options.some((option) => option.value === field.default),
          ).toBe(true);
        }
      }
    }
  });

  it("rejects malformed data, quantizes discrete counts and clamps imported settings", () => {
    expect(
      normalizeSettings("meteor", {
        diameter: Number.NaN,
        speed: Infinity,
        angle: -200,
        direction: 999,
        composition: "not-a-material",
        debris: 50,
        unexpected: 100,
      }),
    ).toEqual({
      ...getDefaultSettings("meteor"),
      angle: 15,
      direction: 360,
      debris: 4,
    });
    expect(normalizeSettings("lightning", { strikes: 4.7 }).strikes).toBe(5);
    expect(normalizeSettings("aliens", { craftCount: -2 }).craftCount).toBe(1);
    expect(normalizeSettings("flood", { height: "20" }).height).toBe(5);
    expect(normalizeSettings("meteor", null as never)).toEqual(
      getDefaultSettings("meteor"),
    );
  });

  it("returns independent drafts without changing defaults or supplied objects", () => {
    const first = getDefaultSettings("meteor");
    first.diameter = 30;
    expect(getDefaultSettings("meteor").diameter).toBe(6);
    const supplied = Object.freeze({ speed: 999, composition: "iron" });
    const normalized = normalizeSettings("meteor", supplied);
    expect(normalized.speed).toBe(180);
    expect(supplied.speed).toBe(999);
  });

  it("preserves the original five levels and grows monotonically to a bounded extreme range", () => {
    expect(MAX_INTENSITY).toBe(20);
    for (let i = 1; i <= 5; i++) expect(intensityGain(i)).toBe(1);
    for (let i = 6; i <= MAX_INTENSITY; i++)
      expect(intensityGain(i)).toBeGreaterThan(intensityGain(i - 1));
    expect(intensityGain(20)).toBe(12);
    expect(intensityGain(999)).toBe(12);
    expect(intensityGain(-99)).toBe(1);
    expect(Number.isFinite(intensityGain(NaN))).toBe(true);
  });
});
