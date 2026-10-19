// Where the coach's model comes from: the user's own key with one of these providers (BYOK), or the owner's local
// model (COACH_LOCAL_URL). Users never enter a URL: the server makes the request, so a user-chosen URL would let
// any invitee make it call internal addresses. OpenRouter and Groq go through the OpenAI-compatible client with
// fixed URLs.
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createGateway, type LanguageModel } from "ai";

export const GROQ_MODEL = "qwen/qwen3.8-27b";
export const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

export type ProviderId = "openai" | "anthropic" | "google" | "gateway" | "openrouter" | "groq";

export type ProviderInfo = {
  privacy: string;
  privacyUrl: string;
  dataControlsUrl: string;
  limits: string;
  limitsUrl: string;
};

export type Provider = {
  id: ProviderId;
  label: string;
  /** Pre-filled model id; the user may type another one their provider offers. */
  model: string;
  /** Where to get a key (shown in Settings). */
  keyUrl: string;
  /** Prevent a browser request from switching a deliberately pinned provider model. */
  fixedModel?: boolean;
  /** Provider-specific privacy and quota context shown before a key is saved. */
  info?: ProviderInfo;
  create: (apiKey: string, model: string) => LanguageModel;
};

export const PROVIDERS: Provider[] = [
  {
    id: "anthropic",
    label: "Anthropic",
    model: "claude-sonnet-5-5",
    keyUrl: "https://console.anthropic.com/settings/keys",
    create: (apiKey, model) => createAnthropic({ apiKey })(model),
  },
  {
    id: "openai",
    label: "OpenAI",
    model: "gpt-5.4-mini",
    keyUrl: "https://platform.openai.com/api-keys",
    create: (apiKey, model) => createOpenAI({ apiKey })(model),
  },
  {
    id: "google",
    label: "Google Gemini",
    model: "gemini-3.8-flash",
    keyUrl: "https://aistudio.google.com/apikey",
    create: (apiKey, model) => createGoogleGenerativeAI({ apiKey })(model),
  },
  {
    id: "gateway",
    label: "Vercel AI Gateway",
    model: "anthropic/claude-sonnet-5.5",
    keyUrl: "https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai",
    create: (apiKey, model) => createGateway({ apiKey })(model),
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    model: "anthropic/claude-sonnet-5.5",
    keyUrl: "https://openrouter.ai/settings/keys",
    create: (apiKey, model) => createOpenAICompatible({ name: "openrouter", baseURL: "https://openrouter.ai/api/v1", apiKey })(model),
  },
  {
    id: "groq",
    label: "Groq",
    model: GROQ_MODEL,
    keyUrl: "https://console.groq.com/keys",
    fixedModel: true,
    info: {
      privacy:
        "Groq says inference data is not retained by default, but prompts and replies may be logged for up to 30 days for reliability or abuse review. Enable Zero Data Retention before sending health data. This model is marked Preview.",
      privacyUrl: "https://console.groq.com/docs/your-data",
      dataControlsUrl: "https://console.groq.com/settings/data-controls",
      limits:
        "Published free-plan limits checked Oct 18, 2026: 30 requests/minute, 1,000/day, 8,000 tokens/minute and 200,000/day. Your account may differ.",
      limitsUrl: "https://console.groq.com/settings/limits",
    },
    create: (apiKey, model) => createOpenAICompatible({ name: "groq", baseURL: GROQ_BASE_URL, apiKey }).chatModel(model),
  },
];

export const providerOf = (id: string) => PROVIDERS.find((p) => p.id === id) ?? null;

/** A pinned provider ignores a browser-supplied model id; other providers keep supporting custom models. */
export const providerModel = (id: string, requested: string) => {
  const provider = providerOf(id);
  return provider?.fixedModel ? provider.model : requested;
};

/** The owner's local model from COACH_LOCAL_URL / COACH_LOCAL_MODEL (Ollama, LM Studio, vLLM). */
export const localModel = (url: string, model: string) => createOpenAICompatible({ name: "local", baseURL: url })(model);
