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
    payload: parseAiJson(text, "summary"),
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
    payload: parseAiJson(text, "deep"),
  };
}

async function openAiCompletion(input: ChatCompletionInput): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
  const endpoint =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    `gemini-2.0-flash:generateContent?key=${encodeURIComponent(input.apiKey)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: input.system }] },
      contents: [{ role: "user", parts: [{ text: input.user }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });
  const data = (await readProviderResponse(response)) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Resposta vazia do Gemini");
  return text;
}

async function claudeCompletion(input: ChatCompletionInput): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
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

async function readProviderResponse(response: Response): Promise<unknown> {
  const data = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    throw new Error(`Provedor de IA respondeu com status ${response.status}`);
  }
  return data;
}
