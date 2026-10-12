"use client"

import { clock, hmm } from "@/lib/format"
import type { SleepPlanVM } from "@/server/queries/types"
import { CAPTION, LABEL } from "../_lib/view"
import { useWakeTimePreview, WakeTimeControl } from "../_lib/WakeTimePreview"

export function SleepPlanner({ plan: original, timeZone }: { plan: SleepPlanVM; timeZone: string }) {
  const { plan, custom, control } = useWakeTimePreview(original, timeZone)
  return (
    <div className="space-y-2">
      <div className="divide-y divide-border" aria-live="polite">
        {plan.plans.map((p) => (
          <div key={p.key} className="flex min-h-13 items-center gap-3 py-2">
            <span className="min-w-0 flex-1">
              <span className={`${LABEL} block truncate`}>{p.label}</span>
              <span className={`${CAPTION} mt-0.5 block truncate`}>{Math.round(p.share * 100)}% of need</span>
            </span>
            <span className="font-numeric text-xl leading-6 font-bold tabular-nums">{clock(p.bedtimeAt, timeZone)}</span>
          </div>
        ))}
        <div className="flex min-h-13 items-center gap-3 py-2">
          <span className="min-w-0 flex-1">
            <span className={`${LABEL} block truncate`}>{custom ? "Planned wake" : "Typical wake"}</span>
            <span className={`${CAPTION} mt-0.5 block truncate`}>{custom ? "Your wake-up target" : plan.weekend ? "Weekend wake time" : "Weekday wake time"}</span>
          </span>
          <span className="font-numeric text-xl leading-6 font-bold tabular-nums">{clock(plan.wakeAt, timeZone)}</span>
        </div>
      </div>
      <p className={CAPTION}>Need tonight: <span className="font-numeric tabular-nums">{hmm(plan.needMin)}</span></p>
      <WakeTimeControl {...control} />
    </div>
  )
}
