import { describe, expect, it } from "vitest";
import { parseAiJson } from "./parse";

describe("parseAiJson", () => {
  it("parses fenced JSON", () => {
    const raw =
      '```json\n{"consensusNote":"ok","discussionPoints":["a"]}\n```';

    const parsed = parseAiJson(raw, "summary");

    expect(parsed.consensusNote).toBe("ok");
    expect(parsed.discussionPoints).toEqual(["a"]);
  });

  it("parses a JSON object surrounded by prose", () => {
    const parsed = parseAiJson(
      'Resultado:\n{"consensusNote":"consenso","discussionPoints":[]}\nFim.',
      "summary",
    );

    expect(parsed).toEqual({
      consensusNote: "consenso",
      discussionPoints: [],
    });
  });

  it("validates deep-analysis arrays", () => {
    expect(() =>
      parseAiJson(
        '{"consensusNote":"ok","discussionPoints":[],"risks":"alto"}',
        "deep",
      ),
    ).toThrow("Invalid AI response");
  });
});
