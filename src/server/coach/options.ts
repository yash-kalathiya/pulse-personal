// What the coach setup offers the browser: safe provider metadata, never key values or API base URLs.
import { getConfig } from "../config";
import { PROVIDERS, providerOf, type ProviderInfo } from "./providers";

export type ProviderOption = {
  id: string;
  label: string;
  model: string;
  keyUrl: string | null;
  needsKey: boolean;
  fixedModel: boolean;
  info: ProviderInfo | null;
};

/** The owner's local model first when set, the test model only under COACH_MOCK, then the BYOK providers. */
export function providerOptions(): ProviderOption[] {
  const cfg = getConfig();
  return [
    ...(cfg.coachLocal
      ? [{ id: "local", label: "This server’s model", model: cfg.coachLocal.model, keyUrl: null, needsKey: false, fixedModel: true, info: null }]
      : []),
    ...(cfg.coachMock ? [{ id: "mock", label: "Test model", model: "mock", keyUrl: null, needsKey: false, fixedModel: true, info: null }] : []),
    ...PROVIDERS.map((p) => ({
      id: p.id,
      label: p.label,
      model: p.model,
      keyUrl: p.keyUrl,
      needsKey: true,
      fixedModel: p.fixedModel ?? false,
      info: p.info ?? null,
    })),
  ];
}

export const providerLabel = (id: string | null) =>
  id === "local" ? "this server’s model" : id === "mock" ? "the test model" : (providerOf(id ?? "")?.label ?? "your provider");
