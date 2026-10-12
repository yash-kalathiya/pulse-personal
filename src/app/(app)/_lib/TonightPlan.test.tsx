import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it } from "vitest"
import type { SleepPlanVM } from "@/server/queries/types"
import { TonightPlan } from "./TonightPlan"
import { SleepPlanner } from "../sleep/SleepPlanner"

afterEach(cleanup)
const plan: SleepPlanVM = {
  needMin: 480, parts: { baselineMin: 480, strainMin: 0, debtMin: 0, napMin: 0 },
  wakeAt: Date.parse("2026-10-12T07:00:00Z"), weekend: false,
  plans: [
    { key: "peak", label: "Peak", share: 1, sleepMin: 480, bedtimeAt: Date.parse("2026-10-11T23:00:00Z") },
    { key: "perform", label: "Perform", share: 0.85, sleepMin: 408, bedtimeAt: Date.parse("2026-10-12T00:12:00Z") },
    { key: "get_by", label: "Get by", share: 0.7, sleepMin: 336, bedtimeAt: Date.parse("2026-10-12T01:24:00Z") },
  ],
}

it("previews a different wake target on Home and can restore typical wake", () => {
  render(<TonightPlan plan={plan} timeZone="UTC" />)
  expect(screen.getByRole("group", { name: "Bed by 23:00 for peak" })).toBeTruthy()
  fireEvent.change(screen.getByLabelText("Wake-up time"), { target: { value: "09:00" } })
  expect(screen.getByRole("group", { name: "Bed by 01:00 for peak" })).toBeTruthy()
  expect(screen.getByText("Planned wake")).toBeTruthy()
  fireEvent.click(screen.getByRole("radio", { name: /^Perform,/ }))
  expect(screen.getByRole("group", { name: "Bed by 02:12 for perform" })).toBeTruthy()
  fireEvent.click(screen.getByRole("button", { name: "Use typical wake" }))
  expect(screen.getByLabelText("Wake-up time")).toHaveValue("07:00")
  expect(screen.getByText("Typical wake")).toBeTruthy()
})

it("updates all three bedtime goals on the Sleep details screen", () => {
  render(<SleepPlanner plan={plan} timeZone="UTC" />)
  fireEvent.change(screen.getByLabelText("Wake-up time"), { target: { value: "09:00" } })
  for (const time of ["01:00", "02:12", "03:24"]) expect(screen.getByText(time)).toBeTruthy()
  expect(screen.getByText("8:00")).toBeTruthy()
})

it("keeps the automatic plan visible when the input is cleared", () => {
  render(<TonightPlan plan={plan} timeZone="UTC" />)
  fireEvent.change(screen.getByLabelText("Wake-up time"), { target: { value: "" } })
  expect(screen.getByRole("alert")).toBeTruthy()
  expect(screen.getByRole("group", { name: "Bed by 23:00 for peak" })).toBeTruthy()
})

it("does not carry an edited wake time into a different displayed night", () => {
  const { rerender } = render(<TonightPlan plan={plan} timeZone="UTC" />)
  fireEvent.change(screen.getByLabelText("Wake-up time"), { target: { value: "09:00" } })
  rerender(<TonightPlan plan={{ ...plan, wakeAt: plan.wakeAt + 86400_000 }} timeZone="UTC" />)
  expect(screen.getByLabelText("Wake-up time")).toHaveValue("07:00")
  expect(screen.queryByRole("button", { name: "Use typical wake" })).toBeNull()
})
