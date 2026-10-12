"use client"

import { useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { clock } from "@/lib/format"
import { previewSleepPlan } from "@/lib/sleep-plan-preview"
import type { SleepPlanVM } from "@/server/queries/types"

export function useWakeTimePreview(original: SleepPlanVM, timeZone: string) {
  // Keep the what-if local to this displayed night. No browser persistence or Google writes.
  const [selection, setSelection] = useState<{ wakeAt: number; zone: string; time: string } | null>(null)
  const time = selection?.wakeAt === original.wakeAt && selection.zone === timeZone ? selection.time : null
  const preview = time === null ? original : previewSleepPlan(original, timeZone, time)
  return {
    plan: preview ?? original,
    custom: time !== null && preview !== null,
    control: {
      value: time ?? clock(original.wakeAt, timeZone),
      error: preview === null,
      changed: time !== null,
      timeZone,
      onChange: (value: string) => setSelection({ wakeAt: original.wakeAt, zone: timeZone, time: value }),
      onReset: () => setSelection(null),
    },
  }
}

type Control = ReturnType<typeof useWakeTimePreview>["control"]

export function WakeTimeControl({ value, error, changed, timeZone, onChange, onReset }: Control) {
  const id = useId()
  return (
    <div className="space-y-2 border-t border-border pt-3">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor={id} className="text-xs font-bold tracking-[0.1em] text-foreground-secondary uppercase">Wake-up time</label>
        <Input id={id} type="time" step={60} value={value} onChange={(e) => onChange(e.target.value)}
          aria-invalid={error} aria-describedby={`${id}-help`} className="h-10 w-32 font-numeric" />
        {changed && <Button type="button" variant="ghost" size="sm" onClick={onReset}>Use typical wake</Button>}
      </div>
      <p id={`${id}-help`} role={error ? "alert" : undefined} className="text-xs leading-4 text-muted-foreground">
        {error ? "Choose a valid time. Times skipped by daylight saving are unavailable; the typical plan is still shown." : `Preview only · ${timeZone}. This does not set an alarm or change your sleep records.`}
      </p>
    </div>
  )
}
