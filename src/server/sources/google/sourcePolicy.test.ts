import { describe, expect, it } from "vitest";
import { assertFitbitSources, isFitbitPoint } from "./sourcePolicy";

describe("Fitbit-only provenance", () => {
  it("accepts explicit Fitbit provenance", () => {
    expect(isFitbitPoint({ dataSource: { platform: "FITBIT", device: { displayName: "Google Fitbit Air" } } })).toBe(true);
  });
  it("rejects Apple/WHOOP/Health Connect, missing metadata and Pixel Watch", () => {
    for (const point of [null, [], {}, { dataSource: {} },
      { dataSource: { platform: "HEALTH_KIT", application: { packageName: "com.whoop.iphone" } } },
      { dataSource: { platform: "HEALTH_CONNECT" } },
      { dataSource: { platform: "FITBIT", device: { displayName: "Google Pixel Watch 4" } } }]) {
      expect(isFitbitPoint(point)).toBe(false);
      expect(() => assertFitbitSources([point])).toThrow("non_fitbit_rollup_source");
    }
  });
  it("does not guess an origin from a device name", () => {
    expect(isFitbitPoint({ dataSource: { platform: "HEALTH_KIT", device: { displayName: "Fitbit Air" } } })).toBe(false);
  });
});
