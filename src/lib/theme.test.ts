import { describe, expect, it } from "vitest";
import { getInitialTheme, toggleTheme } from "./theme";

describe("getInitialTheme", () => {
  it("prefers a valid stored theme", () => {
    expect(getInitialTheme("dark", false)).toBe("dark");
    expect(getInitialTheme("light", true)).toBe("light");
  });

  it("falls back to prefers-color-scheme when nothing is stored", () => {
    expect(getInitialTheme(null, true)).toBe("dark");
    expect(getInitialTheme(undefined, false)).toBe("light");
  });

  it("ignores invalid stored values", () => {
    expect(getInitialTheme("sepia", true)).toBe("dark");
    expect(getInitialTheme("", false)).toBe("light");
  });
});

describe("toggleTheme", () => {
  it("switches between light and dark", () => {
    expect(toggleTheme("light")).toBe("dark");
    expect(toggleTheme("dark")).toBe("light");
  });
});
