import type {
  AiProvider,
  AiSuggestion,
  DeckType,
  Story,
} from "../types";
import { parseAiJson } from "./parse";
import {
  AI_SYSTEM_PROMPT,
  buildDeepPrompt,
  buildSummaryPrompt,
  type RepositoryContext,
  type VoteContext,
} from "./prompts";

const AI_REQUEST_TIMEOUT_MS = 90_000;

/**
 * Gemini Flash models to try in order. Google retires Flash IDs often;
 * 404 on one model falls through to the next.
 */
export const GEMINI_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
] as const;

/** Primary Gemini Flash model (first in the fallback list). */
export const GEMINI_MODEL = GEMINI_MODELS[0];

const ERROR_SNIPPET_MAX = 160;

type ChatCompletionInput = {
  provider: AiProvider;
  apiKey: string;
  system: string;
  user: string;
};

export async function chatCompletion(
  input: ChatCompletionInput,
): Promise<string> {
  if (!input.apiKey.trim()) {
    throw new Error("Chave da IA não configurada");
  }

  switch (input.provider) {
    case "openai":
      return openAiCompletion(input);
    case "gemini":
      return geminiCompletion(input);
    case "claude":
      return claudeCompletion(input);
  }
}

type AnalysisInput = {
  provider: AiProvider;
  apiKey: string;
  story: Story | null;
  votes: VoteContext[];
  deck: DeckType;
};

export async function runSummary(
  input: AnalysisInput,
): Promise<AiSuggestion> {
  const text = await chatCompletion({
    provider: input.provider,
    apiKey: input.apiKey,
    system: AI_SYSTEM_PROMPT,
    user: buildSummaryPrompt({
      story: input.story,
      votes: input.votes,
      deck: input.deck,
    }),
  });

  return {
    kind: "summary",
    createdAt: Date.now(),
    payload: parseAiJson(text, "summary", input.deck),
  };
}

export async function runDeepAnalysis(
  input: AnalysisInput & {
    repositories: RepositoryContext[];
    priorSummary?: AiSuggestion["payload"];
  },
): Promise<AiSuggestion> {
  const text = await chatCompletion({
    provider: input.provider,
    apiKey: input.apiKey,
    system: AI_SYSTEM_PROMPT,
    user: buildDeepPrompt({
      story: input.story,
      votes: input.votes,
      deck: input.deck,
      repositories: input.repositories,
      priorSummary: input.priorSummary,
    }),
  });

  return {
    kind: "deep",
    createdAt: Date.now(),
    payload: parseAiJson(text, "deep", input.deck),
  };
}

async function aiFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("A requisição para o provedor de IA expirou");
    }
    throw error;
  }
}

async function openAiCompletion(input: ChatCompletionInput): Promise<string> {
  const response = await aiFetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.user },
      ],
      response_format: { type: "json_object" },
    }),
  });
  const data = (await readProviderResponse(response)) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Resposta vazia da OpenAI");
  return text;
}

async function geminiCompletion(input: ChatCompletionInput): Promise<string> {
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: input.system }] },
    contents: [{ role: "user", parts: [{ text: input.user }] }],
    generationConfig: { responseMimeType: "application/json" },
  });
  const headers = {
    "Content-Type": "application/json",
    "x-goog-api-key": input.apiKey,
  };

  let lastError: Error | undefined;

  for (const model of GEMINI_MODELS) {
    const endpoint =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      `${model}:generateContent`;
    const response = await aiFetch(endpoint, {
      method: "POST",
      headers,
      body,
    });

    if (response.status === 404) {
      const data = (await response.json().catch(() => null)) as unknown;
      lastError = new Error(formatAiProviderError(404, data));
      continue;
    }

    const data = (await readProviderResponse(response)) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Resposta vazia do Gemini");
    return text;
  }

  throw (
    lastError ??
    new Error(
      "Provedor de IA respondeu com status 404: nenhum modelo Gemini Flash disponível para esta chave",
    )
  );
}

async function claudeCompletion(input: ChatCompletionInput): Promise<string> {
  const response = await aiFetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": input.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-latest",
      max_tokens: 2_048,
      system: input.system,
      messages: [{ role: "user", content: input.user }],
    }),
  });
  const data = (await readProviderResponse(response)) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const text = data.content?.find((block) => block.type === "text")?.text;
  if (!text) throw new Error("Resposta vazia da Claude");
  return text;
}

function extractProviderErrorSnippet(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;

  if (typeof record.message === "string" && record.message.trim()) {
    return record.message.trim();
  }

  const nested = record.error;
  if (nested && typeof nested === "object") {
    const err = nested as Record<string, unknown>;
    if (typeof err.message === "string" && err.message.trim()) {
      return err.message.trim();
    }
  }

  if (typeof nested === "string" && nested.trim()) {
    return nested.trim();
  }

  return null;
}

/** Build a Portuguese AI provider error including HTTP status and a short body excerpt. */
export function formatAiProviderError(status: number, body: unknown): string {
  const raw = extractProviderErrorSnippet(body);
  if (!raw) {
    return `Provedor de IA respondeu com status ${status}`;
  }
  const snippet =
    raw.length > ERROR_SNIPPET_MAX
      ? `${raw.slice(0, ERROR_SNIPPET_MAX - 1)}…`
      : raw;
  return `Provedor de IA respondeu com status ${status}: ${snippet}`;
}

async function readProviderResponse(response: Response): Promise<unknown> {
  const data = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    throw new Error(formatAiProviderError(response.status, data));
  }
  return data;
}
