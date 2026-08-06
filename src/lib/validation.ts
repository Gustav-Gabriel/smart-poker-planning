import { cardsFor } from "./decks";
import type { AiProvider, DeckType, Player } from "./types";
import type { CreateRoomInput } from "./room-store";

export const MAX_NAME_LENGTH = 80;
export const MAX_SECRET_LENGTH = 512;
export const MAX_EMOJI_LENGTH = 16;

const KLIPY_HOSTS = new Set(["klipy.com", "www.klipy.com", "media.klipy.com", "cdn.klipy.com"]);

export function clampString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) return null;
  return trimmed;
}

export function isValidDeck(value: unknown): value is DeckType {
  return value === "fibonacci" || value === "tshirt";
}

export function isValidAiProvider(value: unknown): value is AiProvider {
  return value === "openai" || value === "gemini" || value === "claude";
}

function isSafeKlipyUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  return KLIPY_HOSTS.has(url.hostname) || url.hostname.endsWith(".klipy.com");
}

export function isValidAvatar(value: unknown): value is Player["avatar"] {
  if (!value || typeof value !== "object") return false;
  const avatar = value as { type?: unknown; value?: unknown };

  if (avatar.type === "emoji") {
    return (
      typeof avatar.value === "string" &&
      avatar.value.trim().length > 0 &&
      avatar.value.length <= MAX_EMOJI_LENGTH
    );
  }

  if (avatar.type === "gif") {
    return typeof avatar.value === "string" && isSafeKlipyUrl(avatar.value);
  }

  return false;
}

export function isValidVoteValue(deck: DeckType, value: unknown): value is string {
  return typeof value === "string" && cardsFor(deck).includes(value);
}

export function validateCreateRoomInput(
  input: unknown,
): CreateRoomInput | { error: string } {
  if (!input || typeof input !== "object") {
    return { error: "Invalid room payload" };
  }
  const value = input as Record<string, unknown>;

  const name = clampString(value.name, MAX_NAME_LENGTH);
  if (!name) return { error: "Room name is required" };

  if (!isValidDeck(value.deck)) return { error: "Invalid deck" };

  const hostName = clampString(value.hostName, MAX_NAME_LENGTH);
  if (!hostName) return { error: "Host name is required" };

  if (!isValidAvatar(value.hostAvatar)) {
    return { error: "Invalid host avatar" };
  }

  const secretsValue = value.secrets;
  if (!secretsValue || typeof secretsValue !== "object") {
    return { error: "Invalid room secrets" };
  }
  const secrets = secretsValue as Record<string, unknown>;

  if (!isValidAiProvider(secrets.aiProvider)) {
    return { error: "Invalid AI provider" };
  }

  const aiApiKey = clampString(secrets.aiApiKey, MAX_SECRET_LENGTH);
  if (!aiApiKey) return { error: "AI API key is required" };

  const jiraSite = clampString(secrets.jiraSite, MAX_SECRET_LENGTH);
  if (!jiraSite) return { error: "Jira site is required" };

  const jiraEmail = clampString(secrets.jiraEmail, MAX_SECRET_LENGTH);
  if (!jiraEmail) return { error: "Jira email is required" };

  const jiraToken = clampString(secrets.jiraToken, MAX_SECRET_LENGTH);
  if (!jiraToken) return { error: "Jira token is required" };

  let githubToken: string | undefined;
  if (secrets.githubToken !== undefined) {
    const clamped = clampString(secrets.githubToken, MAX_SECRET_LENGTH);
    if (!clamped) return { error: "Invalid GitHub token" };
    githubToken = clamped;
  }

  return {
    name,
    deck: value.deck as DeckType,
    hostName,
    hostAvatar: value.hostAvatar as Player["avatar"],
    secrets: {
      aiProvider: secrets.aiProvider as AiProvider,
      aiApiKey,
      jiraSite,
      jiraEmail,
      jiraToken,
      ...(githubToken ? { githubToken } : {}),
    },
  };
}

export type ValidJoinNameAvatar = { name: string; avatar: Player["avatar"] };

export function validateJoinNameAvatar(
  name: unknown,
  avatar: unknown,
): ValidJoinNameAvatar | { error: string } {
  const cleanName = clampString(name, MAX_NAME_LENGTH);
  if (!cleanName) return { error: "Name and avatar are required" };

  if (!isValidAvatar(avatar)) return { error: "Name and avatar are required" };

  return { name: cleanName, avatar };
}

export function validatePlayerUpdate(
  name: unknown,
  avatar: unknown,
): { name?: string; avatar?: Player["avatar"] } | { error: string } {
  const result: { name?: string; avatar?: Player["avatar"] } = {};

  if (name !== undefined) {
    const cleanName = clampString(name, MAX_NAME_LENGTH);
    if (!cleanName) return { error: "Invalid name" };
    result.name = cleanName;
  }

  if (avatar !== undefined) {
    if (!isValidAvatar(avatar)) return { error: "Invalid avatar" };
    result.avatar = avatar;
  }

  return result;
}
