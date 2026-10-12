import type { SleepPlanVM } from "@/server/queries/types";
// These shared time helpers are pure Intl/date arithmetic: no server I/O or credentials.
import { fromWall, localDay, wall } from "@/server/time";

/** Change tomorrow's wake target, retaining every goal's existing time-in-bed allowance.
 * Returns null for invalid input or a nonexistent local time during a DST jump.
 * This is a what-if plan, never a change to a recorded sleep or an alarm.
 */
export function previewSleepPlan(plan: SleepPlanVM, timeZone: string, wakeTime: string): SleepPlanVM | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(wakeTime)) return null;
  const day = localDay(plan.wakeAt / 1000, timeZone);
  const wakeSeconds = fromWall(`${day}T${wakeTime}`, timeZone);
  const actual = wall(wakeSeconds, timeZone);
  if (actual.day !== day || actual.time.slice(0, 5) !== wakeTime) return null;
  const wakeAt = wakeSeconds * 1000;
  const delta = wakeAt - plan.wakeAt;
  return { ...plan, wakeAt, plans: plan.plans.map((p) => ({ ...p, bedtimeAt: p.bedtimeAt + delta })) };
}
