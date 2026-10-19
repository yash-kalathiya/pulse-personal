import { describe, expect, it } from "vitest";
import { GROQ_BASE_URL, GROQ_MODEL, providerModel, providerOf } from "./providers";

describe("Groq coach provider", () => {
  it("uses the fixed official endpoint and requested Qwen model", () => {
    const groq = providerOf("groq");
    expect(GROQ_BASE_URL).toBe("https://api.groq.com/openai/v1");
    expect(groq).toMatchObject({
      label: "Groq",
      model: "qwen/qwen3.8-27b",
      keyUrl: "https://console.groq.com/keys",
      fixedModel: true,
    });
    expect(providerModel("groq", "another/model")).toBe(GROQ_MODEL);
    expect(groq!.create("test-key-value", GROQ_MODEL)).toMatchObject({ modelId: GROQ_MODEL });
  });

  it("does not pin providers that support a custom model", () => {
    expect(providerModel("openai", "custom/model")).toBe("custom/model");
  });
});
