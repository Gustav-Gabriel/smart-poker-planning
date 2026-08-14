import { describe, expect, it } from "vitest";
import {
  AI_SYSTEM_PROMPT,
  buildDeepPrompt,
  buildSummaryPrompt,
} from "./prompts";

describe("AI_SYSTEM_PROMPT", () => {
  it("requires multi-lens senior review and complexity-first scoring", () => {
    expect(AI_SYSTEM_PROMPT).toMatch(/QA sênior/i);
    expect(AI_SYSTEM_PROMPT).toMatch(/arquiteto sênior/i);
    expect(AI_SYSTEM_PROMPT).toMatch(/Desenvolvedor sênior/i);
    expect(AI_SYSTEM_PROMPT).toMatch(/NÃO são âncora/i);
  });
});

describe("buildSummaryPrompt", () => {
  it("includes suggestedScore schema and fibonacci allowed scores", () => {
    const prompt = buildSummaryPrompt({
      story: null,
      votes: [{ player: "Ana", vote: "5" }],
      deck: "fibonacci",
    });

    expect(prompt).toContain("suggestedScore");
    expect(prompt).toContain("forgottenDetails");
    expect(prompt).toContain("impacts");
    expect(prompt).toContain("dependencies");
    expect(prompt).toMatch(/QA sênior/i);
    expect(prompt).toMatch(/arquiteto sênior/i);
    expect(prompt).toMatch(/NÃO são âncora|não são âncora|votos servem só como contraste/i);
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
    expect(prompt).toContain("forgottenDetails");
    expect(prompt).toContain("impacts");
    expect(prompt).toContain("dependencies");
    expect(prompt).toMatch(/QA sênior/i);
    expect(prompt).toContain('"XS"');
    expect(prompt).toContain('"XL"');
    expect(prompt).toMatch(/revisar priorSummary\.suggestedScore/i);
    expect(prompt).toMatch(/português/i);
  });
});
