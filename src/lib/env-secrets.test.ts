import { afterEach, describe, expect, it, vi } from "vitest";
import { aiApiKeyForProvider, jiraSecretsFromEnv } from "./env-secrets";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("aiApiKeyForProvider", () => {
  it("reads GEMINI_API_KEY for gemini", () => {
    vi.stubEnv("GEMINI_API_KEY", "  gem-key  ");
    expect(aiApiKeyForProvider("gemini")).toBe("gem-key");
  });

  it("reads OPENAI_API_KEY for openai", () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-openai");
    expect(aiApiKeyForProvider("openai")).toBe("sk-openai");
  });

  it("reads ANTHROPIC_API_KEY for claude", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant");
    expect(aiApiKeyForProvider("claude")).toBe("sk-ant");
  });

  it("returns null when the env var is missing or blank", () => {
    expect(aiApiKeyForProvider("gemini")).toBeNull();
    vi.stubEnv("GEMINI_API_KEY", "   ");
    expect(aiApiKeyForProvider("gemini")).toBeNull();
  });
});

describe("jiraSecretsFromEnv", () => {
  it("returns trimmed jira credentials from env", () => {
    vi.stubEnv("JIRA_SITE", "https://acme.atlassian.net/");
    vi.stubEnv("JIRA_EMAIL", "  ana@acme.com  ");
    vi.stubEnv("JIRA_TOKEN", "jira-token");

    expect(jiraSecretsFromEnv()).toEqual({
      jiraSite: "https://acme.atlassian.net",
      jiraEmail: "ana@acme.com",
      jiraToken: "jira-token",
    });
  });

  it("errors when any jira env var is missing", () => {
    vi.stubEnv("JIRA_SITE", "https://acme.atlassian.net");
    vi.stubEnv("JIRA_EMAIL", "ana@acme.com");
    expect(jiraSecretsFromEnv()).toEqual({
      error: "Jira credentials are not configured",
    });
  });
});
