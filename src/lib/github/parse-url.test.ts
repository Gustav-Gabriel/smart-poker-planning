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

it("preserves dotted repository names", () => {
  expect(parseGithubUrl("https://github.com/acme/my.repo")).toEqual({
    owner: "acme",
    repo: "my.repo",
  });
  expect(parseGithubUrl("https://github.com/acme/my.repo.git").repo).toBe(
    "my.repo",
  );
});
