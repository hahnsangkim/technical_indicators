import { describe, it, expect } from "vitest";
import { fmtVol } from "../app/ECOComparison.jsx";

describe("fmtVol", () => {
  it('fmtVol(1500000000) returns "1.5B"', () => {
    expect(fmtVol(1500000000)).toBe("1.5B");
  });

  it('fmtVol(2500000) returns "2.5M"', () => {
    expect(fmtVol(2500000)).toBe("2.5M");
  });

  it('fmtVol(45000) returns "45K"', () => {
    expect(fmtVol(45000)).toBe("45K");
  });

  it('fmtVol(500) returns "500"', () => {
    expect(fmtVol(500)).toBe("500");
  });

  it('fmtVol(-3000000) returns "-3.0M" (handles negatives)', () => {
    expect(fmtVol(-3000000)).toBe("-3.0M");
  });
});
