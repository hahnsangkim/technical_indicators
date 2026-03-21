import { describe, it, expect } from "vitest";
import { validateTicker } from "../server.js";

describe("Input Validation", () => {
  it('validateTicker("SPY") returns "SPY"', () => {
    expect(validateTicker("SPY")).toBe("SPY");
  });

  it('validateTicker("spy") returns "SPY" (uppercased)', () => {
    expect(validateTicker("spy")).toBe("SPY");
  });

  it('validateTicker("BRK.B") returns "BRK.B" (dots allowed)', () => {
    expect(validateTicker("BRK.B")).toBe("BRK.B");
  });

  it('validateTicker("") defaults to "SPY"', () => {
    expect(validateTicker("")).toBe("SPY");
  });

  it('validateTicker(null) defaults to "SPY"', () => {
    expect(validateTicker(null)).toBe("SPY");
  });

  it('validateTicker(undefined) defaults to "SPY"', () => {
    expect(validateTicker(undefined)).toBe("SPY");
  });

  it('validateTicker("A<script>") returns null (rejected)', () => {
    expect(validateTicker("A<script>")).toBeNull();
  });

  it('validateTicker("TOOLONGTICKERX") returns null (>10 chars)', () => {
    expect(validateTicker("TOOLONGTICKERX")).toBeNull();
  });
});
