import { describe, expect, it } from "vitest";
import { adfToPlainText } from "./adf";

describe("adfToPlainText", () => {
  it("flattens paragraphs and text", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hello " },
            { type: "text", text: "world" },
          ],
        },
      ],
    };
    expect(adfToPlainText(doc)).toBe("Hello world");
  });

  it("returns string descriptions unchanged", () => {
    expect(adfToPlainText("plain")).toBe("plain");
  });

  it("appends link href when mark text differs from url", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "documentação",
              marks: [
                {
                  type: "link",
                  attrs: { href: "https://example.com/docs" },
                },
              ],
            },
          ],
        },
      ],
    };
    expect(adfToPlainText(doc)).toBe("documentação https://example.com/docs");
  });

  it("emits inlineCard urls", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "inlineCard",
              attrs: { url: "https://acme.atlassian.net/browse/PROJ-1" },
            },
          ],
        },
      ],
    };
    expect(adfToPlainText(doc)).toBe(
      "https://acme.atlassian.net/browse/PROJ-1",
    );
  });
});
