import { expect, it } from "vitest";
import { parseGithubUrl } from "./parse-url";

it("parses https github urls", () => {
  expect(parseGithubUrl("https://github.com/acme/api")).toEqual({
    owner: "acme",
    repo: "api",
  });
});

it("strips .git suffix", () => {
  expect(parseGithubUrl("https://github.com/acme/api.git").repo).toBe("api");
});
