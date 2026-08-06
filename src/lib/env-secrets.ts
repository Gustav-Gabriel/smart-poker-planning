import type { AiProvider } from "./types";

const PROVIDER_ENV: Record<AiProvider, string> = {
  gemini: "GEMINI_API_KEY",
  openai: "OPENAI_API_KEY",
  claude: "ANTHROPIC_API_KEY",
};

function readEnv(name: string): string | null {
  const value = process.env[name];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Maps AI provider to the corresponding server env API key. */
export function aiApiKeyForProvider(provider: AiProvider): string | null {
  return readEnv(PROVIDER_ENV[provider]);
}

export type JiraEnvSecrets = {
  jiraSite: string;
  jiraEmail: string;
  jiraToken: string;
};

/**
 * Reads Jira Basic-auth credentials from the server environment.
 * Returns a clear English error if any required value is missing.
 */
export function jiraSecretsFromEnv(): JiraEnvSecrets | { error: string } {
  const jiraSite = readEnv("JIRA_SITE")?.replace(/\/+$/, "") ?? null;
  const jiraEmail = readEnv("JIRA_EMAIL");
  const jiraToken = readEnv("JIRA_TOKEN");

  if (!jiraSite || !jiraEmail || !jiraToken) {
    return { error: "Jira credentials are not configured" };
  }

  return { jiraSite, jiraEmail, jiraToken };
}
