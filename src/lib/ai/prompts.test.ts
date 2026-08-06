import { describe, expect, it } from "vitest";
import { buildDeepPrompt, buildSummaryPrompt } from "./prompts";

describe("buildSummaryPrompt", () => {
  it("includes suggestedScore schema and fibonacci allowed scores", () => {
    const prompt = buildSummaryPrompt({
      story: null,
      votes: [{ player: "Ana", vote: "5" }],
      deck: "fibonacci",
    });

    expect(prompt).toContain("suggestedScore");
    expect(prompt).toContain('"0"');
    expect(prompt).toContain('"21"');
    expect(prompt).not.toMatch(/allowedScores":\[[^\]]*"\?"/);
    expect(prompt).toMatch(/português/i);
  });
});

describe("buildDeepPrompt", () => {
  it("includes suggestedScore and may revise prior score", () => {
    const prompt = buildDeepPrompt({
      story: null,
      votes: [{ player: "Ana", vote: "M" }],
      deck: "tshirt",
      repositories: [],
      priorSummary: {
        consensusNote: "ok",
        discussionPoints: [],
        suggestedScore: { value: "S", rationale: "Parecia pequeno." },
      },
    });

    expect(prompt).toContain("suggestedScore");
    expect(prompt).toContain('"XS"');
    expect(prompt).toContain('"XL"');
    expect(prompt).toMatch(/revisar priorSummary\.suggestedScore/i);
    expect(prompt).toMatch(/português/i);
  });
});
