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
});
