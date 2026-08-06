import { describe, expect, it } from "vitest";
import { formatAiProviderError, GEMINI_MODEL } from "./providers";

describe("GEMINI_MODEL", () => {
  it("uses gemini-2.5-flash", () => {
    expect(GEMINI_MODEL).toBe("gemini-2.5-flash");
  });
});

describe("formatAiProviderError", () => {
  it("includes status when no message is present", () => {
    expect(formatAiProviderError(502, null)).toBe(
      "Provedor de IA respondeu com status 502",
    );
  });

  it("appends nested error.message from provider JSON", () => {
    expect(
      formatAiProviderError(404, {
        error: { message: "models/gemini-2.0-flash is not found" },
      }),
    ).toBe(
      "Provedor de IA respondeu com status 404: models/gemini-2.0-flash is not found",
    );
  });

  it("truncates long provider messages", () => {
    const long = "x".repeat(200);
    const formatted = formatAiProviderError(429, { error: { message: long } });
    expect(formatted.startsWith("Provedor de IA respondeu com status 429: ")).toBe(
      true,
    );
    expect(formatted.length).toBeLessThan(long.length + 50);
    expect(formatted.endsWith("…")).toBe(true);
  });
});
