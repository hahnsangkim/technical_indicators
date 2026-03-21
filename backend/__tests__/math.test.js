import { describe, it, expect } from "vitest";
import { emaK, calcEMA, calcDEMA } from "../server.js";

describe("EMA Calculation", () => {
  it("emaK(25) ≈ 0.07692", () => {
    expect(emaK(25)).toBeCloseTo(2 / 26, 5);
  });

  it("emaK(13) ≈ 0.14286", () => {
    expect(emaK(13)).toBeCloseTo(2 / 14, 5);
  });

  it("emaK(8) ≈ 0.22222", () => {
    expect(emaK(8)).toBeCloseTo(2 / 9, 5);
  });

  it("calcEMA(10, 5, 0.5) = 7.5", () => {
    expect(calcEMA(10, 5, 0.5)).toBe(7.5);
  });

  it("EMA with k=1 equals current value", () => {
    expect(calcEMA(42, 100, 1)).toBe(42);
  });

  it("EMA with k=0 equals previous value", () => {
    expect(calcEMA(42, 100, 0)).toBe(100);
  });
});

describe("DEMA Calculation", () => {
  it("returns { ema1, ema2, dema }", () => {
    const result = calcDEMA(10, 5, 5, 0.5);
    expect(result).toHaveProperty("ema1");
    expect(result).toHaveProperty("ema2");
    expect(result).toHaveProperty("dema");
  });

  it("dema === 2 * ema1 - ema2 within float tolerance", () => {
    const result = calcDEMA(10, 5, 3, 0.3);
    expect(result.dema).toBeCloseTo(2 * result.ema1 - result.ema2, 10);
  });

  it("DEMA reduces lag vs single EMA", () => {
    // Step input: value jumps from 0 to 100
    const k = emaK(10);
    let ema = 0;
    let dema1 = 0, dema2 = 0;
    const emaValues = [];
    const demaValues = [];

    for (let i = 0; i < 20; i++) {
      const val = 100; // step input
      ema = calcEMA(val, ema, k);
      const d = calcDEMA(val, dema1, dema2, k);
      dema1 = d.ema1;
      dema2 = d.ema2;
      emaValues.push(ema);
      demaValues.push(d.dema);
    }

    // DEMA should reach 100 faster (less lag)
    // Check that DEMA is closer to 100 in early bars
    const earlyDemaAvg = demaValues.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    const earlyEmaAvg = emaValues.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    expect(earlyDemaAvg).toBeGreaterThan(earlyEmaAvg);
  });
});
