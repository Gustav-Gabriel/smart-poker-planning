import { describe, expect, it } from "vitest";
import { parseAiJson } from "./parse";

const FIB_SCORE = {
  value: "5",
  rationale: "Maioria votou 5 com pouca dispersão.",
};

function summaryJson(
  overrides: Record<string, unknown> = {},
): string {
  return JSON.stringify({
    consensusNote: "ok",
    discussionPoints: ["a"],
    suggestedScore: FIB_SCORE,
    ...overrides,
  });
}

describe("parseAiJson", () => {
  it("parses fenced JSON with suggestedScore", () => {
    const raw = `\`\`\`json\n${summaryJson()}\n\`\`\``;

    const parsed = parseAiJson(raw, "summary", "fibonacci");

    expect(parsed.consensusNote).toBe("ok");
    expect(parsed.discussionPoints).toEqual(["a"]);
    expect(parsed.suggestedScore).toEqual(FIB_SCORE);
  });

  it("parses a JSON object surrounded by prose", () => {
    const parsed = parseAiJson(
      `Resultado:\n${summaryJson({
        consensusNote: "consenso",
        discussionPoints: [],
      })}\nFim.`,
      "summary",
      "fibonacci",
    );

    expect(parsed).toEqual({
      consensusNote: "consenso",
      discussionPoints: [],
      suggestedScore: FIB_SCORE,
    });
  });

  it("accepts a t-shirt score for the tshirt deck", () => {
    const parsed = parseAiJson(
      summaryJson({
        suggestedScore: { value: "M", rationale: "Escopo médio." },
      }),
      "summary",
      "tshirt",
    );
    expect(parsed.suggestedScore.value).toBe("M");
  });

  it("rejects missing suggestedScore", () => {
    expect(() =>
      parseAiJson(
        '{"consensusNote":"ok","discussionPoints":[]}',
        "summary",
        "fibonacci",
      ),
    ).toThrow(/suggestedScore/);
  });

  it("rejects ? and coffee as suggested scores", () => {
    expect(() =>
      parseAiJson(
        summaryJson({ suggestedScore: { value: "?", rationale: "incerto" } }),
        "summary",
        "fibonacci",
      ),
    ).toThrow(/suggestedScore\.value/);

    expect(() =>
      parseAiJson(
        summaryJson({ suggestedScore: { value: "☕", rationale: "pausa" } }),
        "summary",
        "fibonacci",
      ),
    ).toThrow(/suggestedScore\.value/);
  });

  it("rejects unknown values and wrong-deck cards", () => {
    expect(() =>
      parseAiJson(
        summaryJson({
          suggestedScore: { value: "99", rationale: "inválido" },
        }),
        "summary",
        "fibonacci",
      ),
    ).toThrow(/suggestedScore\.value/);

    expect(() =>
      parseAiJson(
        summaryJson({
          suggestedScore: { value: "M", rationale: "errado" },
        }),
        "summary",
        "fibonacci",
      ),
    ).toThrow(/suggestedScore\.value/);
  });

  it("validates deep-analysis arrays", () => {
    expect(() =>
      parseAiJson(
        summaryJson({ risks: "alto" }),
        "deep",
        "fibonacci",
      ),
    ).toThrow("Invalid AI response");
  });
});
