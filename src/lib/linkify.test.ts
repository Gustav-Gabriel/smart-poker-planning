import { describe, expect, it } from "vitest";
import { isValidElement } from "react";
import { linkifyText } from "./linkify";

function linkProps(node: unknown): Record<string, unknown> {
  if (!isValidElement(node)) return {};
  return node.props as Record<string, unknown>;
}

describe("linkifyText", () => {
  it("returns plain text unchanged when there are no urls", () => {
    expect(linkifyText("sem links aqui")).toEqual(["sem links aqui"]);
  });

  it("wraps http(s) urls as external anchors", () => {
    const nodes = linkifyText("Veja https://example.com/path e pronto");
    expect(nodes).toHaveLength(3);
    expect(nodes[0]).toBe("Veja ");
    expect(linkProps(nodes[1])).toMatchObject({
      href: "https://example.com/path",
      children: "https://example.com/path",
      target: "_blank",
      rel: "noopener noreferrer",
    });
    expect(nodes[2]).toBe(" e pronto");
  });

  it("keeps trailing punctuation outside the href", () => {
    const nodes = linkifyText("Link: https://acme.atlassian.net/browse/PROJ-1.");
    expect(linkProps(nodes[1])).toMatchObject({
      href: "https://acme.atlassian.net/browse/PROJ-1",
    });
    expect(nodes[2]).toBe(".");
  });
});
