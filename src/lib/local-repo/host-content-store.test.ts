import { afterEach, describe, expect, it } from "vitest";
import {
  clearAll,
  getSelectedContents,
  localRepoKey,
  setSelectedContents,
} from "./host-content-store";

describe("host-content-store", () => {
  afterEach(() => {
    clearAll();
  });

  it("stores and retrieves selected contents by key", () => {
    const key = localRepoKey("demo");
    expect(key).toBe("local/demo");
    setSelectedContents(key, new Map([["a.ts", "hi"]]));
    expect(getSelectedContents(key)?.get("a.ts")).toBe("hi");
  });
});
