import { expect, it } from "vitest";
import { parseBitbucketUrl } from "./parse-url";

it("parses https bitbucket urls", () => {
  expect(parseBitbucketUrl("https://bitbucket.org/acme/api")).toEqual({
    workspace: "acme",
    repo: "api",
  });
});

it("strips .git suffix", () => {
  expect(parseBitbucketUrl("https://bitbucket.org/acme/api.git").repo).toBe(
    "api",
  );
});

it("preserves dotted repository names", () => {
  expect(parseBitbucketUrl("https://bitbucket.org/acme/my.repo")).toEqual({
    workspace: "acme",
    repo: "my.repo",
  });
  expect(parseBitbucketUrl("https://bitbucket.org/acme/my.repo.git").repo).toBe(
    "my.repo",
  );
});

it("rejects workspace-only urls", () => {
  expect(() => parseBitbucketUrl("https://bitbucket.org/useniu")).toThrow(
    "Invalid Bitbucket repository URL",
  );
});

it("rejects non-bitbucket urls", () => {
  expect(() => parseBitbucketUrl("https://github.com/acme/api")).toThrow(
    "Invalid Bitbucket repository URL",
  );
});
