import type { AiSuggestion } from "../types";

export function parseAiJson(
  text: string,
  kind: AiSuggestion["kind"],
): AiSuggestion["payload"] {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end < start) {
    throw new Error("Invalid AI response: JSON object not found");
  }

  let value: unknown;
  try {
    value = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error("Invalid AI response: malformed JSON");
  }

  if (!isRecord(value)) {
    throw new Error("Invalid AI response: expected an object");
  }
  if (
    typeof value.consensusNote !== "string" ||
    !isStringArray(value.discussionPoints)
  ) {
    throw new Error("Invalid AI response: missing summary fields");
  }

  const optionalArrays = [
    "risks",
    "unplannedWork",
    "openQuestions",
  ] as const;
  for (const field of optionalArrays) {
    if (value[field] !== undefined && !isStringArray(value[field])) {
      throw new Error(`Invalid AI response: ${field} must be a string array`);
    }
  }

  if (
    value.relevantFiles !== undefined &&
    (!Array.isArray(value.relevantFiles) ||
      !value.relevantFiles.every(
        (file) =>
          isRecord(file) &&
          typeof file.path === "string" &&
          typeof file.reason === "string",
      ))
  ) {
    throw new Error("Invalid AI response: relevantFiles is invalid");
  }

  if (
    value.estimateTension !== undefined &&
    typeof value.estimateTension !== "string"
  ) {
    throw new Error("Invalid AI response: estimateTension must be a string");
  }

  if (
    kind === "deep" &&
    optionalArrays.some(
      (field) => value[field] !== undefined && !isStringArray(value[field]),
    )
  ) {
    throw new Error("Invalid AI response: deep analysis fields are invalid");
  }

  return value as AiSuggestion["payload"];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
