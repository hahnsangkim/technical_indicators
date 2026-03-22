import { describe, it, expect } from "vitest";
import { calcDemark } from "../server.js";

describe("calcDemark (extracted function)", () => {
  it("is exported and callable", () => {
    expect(typeof calcDemark).toBe("function");
  });

  it("returns array with signal fields for valid rows", () => {
    const rows = Array.from({ length: 14 }, (_, i) => ({
      date: `2025-01-${String(i + 1).padStart(2, "0")}`,
      open: 100 - i, high: 101 - i, low: 99 - i,
      close: 100 - i,
      volume: 1000000,
    }));
    const result = calcDemark(rows);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(rows.length);
    expect(result[0]).toHaveProperty("signal");
    expect(result[0]).toHaveProperty("setupCount");
  });
});
