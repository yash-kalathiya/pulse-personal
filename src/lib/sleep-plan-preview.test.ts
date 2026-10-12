import { describe, expect, it } from "vitest";
import type { SleepPlanVM } from "@/server/queries/types";
import { previewSleepPlan } from "./sleep-plan-preview";

const plan: SleepPlanVM = {
  needMin: 480, parts: { baselineMin: 480, strainMin: 0, debtMin: 0, napMin: 0 },
  wakeAt: Date.parse("2026-10-12T07:00:00Z"), weekend: false,
  plans: [
    { key: "peak", label: "Peak", share: 1, sleepMin: 480, bedtimeAt: Date.parse("2026-10-11T23:00:00Z") },
    { key: "perform", label: "Perform", share: 0.85, sleepMin: 408, bedtimeAt: Date.parse("2026-10-12T00:12:00Z") },
    { key: "get_by", label: "Get by", share: 0.7, sleepMin: 336, bedtimeAt: Date.parse("2026-10-12T01:24:00Z") },
  ],
};

describe("wake-time what-if", () => {
  it("moves every bedtime later while preserving sleep need and time in bed", () => {
    const preview = previewSleepPlan(plan, "UTC", "09:00")!;
    expect(preview.wakeAt).toBe(plan.wakeAt + 2 * 3600_000);
    preview.plans.forEach((p, i) => {
      expect(p.bedtimeAt).toBe(plan.plans[i].bedtimeAt + 2 * 3600_000);
      expect(preview.wakeAt - p.bedtimeAt).toBe(plan.wakeAt - plan.plans[i].bedtimeAt);
    });
    expect(preview.needMin).toBe(480);
    expect(plan.plans[0].bedtimeAt).toBe(Date.parse("2026-10-11T23:00:00Z"));
  });
  it("keeps midnight on the intended wake day, with bedtime the preceding day", () => {
    const preview = previewSleepPlan(plan, "UTC", "00:00")!;
    expect(new Date(preview.wakeAt).toISOString()).toBe("2026-10-12T00:00:00.000Z");
    expect(new Date(preview.plans[0].bedtimeAt).toISOString()).toBe("2026-10-11T16:00:00.000Z");
  });
  it("uses the profile time zone rather than the device zone", () => {
    const preview = previewSleepPlan(plan, "Asia/Kolkata", "08:30")!;
    expect(new Date(preview.wakeAt).toISOString()).toBe("2026-10-12T03:00:00.000Z");
  });
  it.each(["", "25:00", "09:60", "9:00", "09:00:00", "junk"])("rejects %j", (time) => {
    expect(previewSleepPlan(plan, "UTC", time)).toBeNull();
  });
  it("rejects a nonexistent DST wake time instead of silently moving it", () => {
    const spring = { ...plan, wakeAt: Date.parse("2026-03-08T14:00:00Z") };
    expect(previewSleepPlan(spring, "America/Los_Angeles", "02:30")).toBeNull();
  });
  it("handles an available time on the DST transition day", () => {
    const spring = { ...plan, wakeAt: Date.parse("2026-03-08T14:00:00Z") };
    expect(new Date(previewSleepPlan(spring, "America/Los_Angeles", "08:00")!.wakeAt).toISOString()).toBe("2026-03-08T15:00:00.000Z");
  });
});
