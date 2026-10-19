import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import type { ProviderOption } from "@/server/coach/options"
import { Consent, ProviderForm } from "./CoachSetup"

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock("@/server/actions/coach", () => ({ saveProviderAction: vi.fn(), setConsentAction: vi.fn() }))

afterEach(cleanup)

const groq: ProviderOption = {
  id: "groq",
  label: "Groq",
  model: "qwen/qwen3.8-27b",
  keyUrl: "https://console.groq.com/keys",
  needsKey: true,
  fixedModel: true,
  info: {
    privacy: "Inference data is not retained by default. Enable Zero Data Retention before sending health data.",
    privacyUrl: "https://console.groq.com/docs/your-data",
    dataControlsUrl: "https://console.groq.com/settings/data-controls",
    limits: "Published free-plan limits apply; your account may differ.",
    limitsUrl: "https://console.groq.com/settings/limits",
  },
}

it("pins Groq to Qwen and shows privacy, retention and limit controls before saving a key", () => {
  render(<ProviderForm providers={[groq]} current={{ provider: null, model: null }} />)
  expect(screen.getByLabelText("Model")).toHaveValue("qwen/qwen3.8-27b")
  expect(screen.getByLabelText("Model")).toHaveAttribute("readonly")
  expect(screen.getByText(/not retained by default/i)).toBeInTheDocument()
  expect(screen.getByRole("link", { name: /Enable Zero Data Retention/i })).toHaveAttribute("href", groq.info!.dataControlsUrl)
  expect(screen.getByRole("link", { name: /Your limits/i })).toHaveAttribute("href", groq.info!.limitsUrl)
})

it("discloses the automatic workout glance before consent", () => {
  render(<Consent />)
  expect(screen.getByText(/opening a workout also sends that workout.s displayed facts/i)).toBeInTheDocument()
})
