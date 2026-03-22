import { describe, it, expect } from "vitest";
import { parseRows } from "../server.js";

describe("parseRows caching", () => {
  it("returns the same cached reference on repeated calls", () => {
    const first = parseRows("SPY");
    const second = parseRows("SPY");
    expect(second).toBe(first); // same reference, not just deep-equal
  });
});
