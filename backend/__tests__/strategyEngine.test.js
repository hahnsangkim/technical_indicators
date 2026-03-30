import { describe, it, expect } from "vitest";
import { evaluateStrategy } from "../lib/strategyEngine.js";
import { parseRows } from "../lib/csvLoader.js";

const rows = parseRows("SPY");

describe("evaluateStrategy", () => {
  it("detects threshold condition (RSI < 30) — returns buy triggers", () => {
    const strategy = {
      id: "rsi-oversold",
      action: "buy",
      conditions: [
        { indicator: "rsi", field: "rsi", operator: "<", value: 30 },
      ],
    };
    const triggers = evaluateStrategy(strategy, rows);
    expect(triggers.length).toBeGreaterThan(0);
    for (const t of triggers) {
      expect(t).toHaveProperty("date");
      expect(t.strategyId).toBe("rsi-oversold");
      expect(t.action).toBe("buy");
      expect(t.details).toBeDefined();
    }
  });

  it("detects crossover condition (MACD crosses above signal) — returns triggers", () => {
    const strategy = {
      id: "macd-cross",
      action: "buy",
      conditions: [
        { indicator: "macd", field: "macd", operator: ">", crossover: true, crossField: "signal" },
      ],
    };
    const triggers = evaluateStrategy(strategy, rows);
    expect(triggers.length).toBeGreaterThan(0);
    for (const t of triggers) {
      expect(t.strategyId).toBe("macd-cross");
      expect(t.action).toBe("buy");
    }
  });

  it("AND logic: combined conditions return fewer results than single condition", () => {
    const single = {
      id: "rsi-only",
      action: "buy",
      conditions: [
        { indicator: "rsi", field: "rsi", operator: "<", value: 40 },
      ],
    };
    const combined = {
      id: "rsi-and-macd",
      action: "buy",
      conditions: [
        { indicator: "rsi", field: "rsi", operator: "<", value: 40 },
        { indicator: "macd", field: "macd", operator: ">", crossover: true, crossField: "signal" },
      ],
    };
    const singleTriggers = evaluateStrategy(single, rows);
    const combinedTriggers = evaluateStrategy(combined, rows);
    expect(singleTriggers.length).toBeGreaterThan(combinedTriggers.length);
  });

  it("returns empty for impossible conditions (RSI > 200)", () => {
    const strategy = {
      id: "impossible",
      action: "buy",
      conditions: [
        { indicator: "rsi", field: "rsi", operator: ">", value: 200 },
      ],
    };
    const triggers = evaluateStrategy(strategy, rows);
    expect(triggers).toHaveLength(0);
  });

  it('throws "Unknown indicator" for invalid indicator name', () => {
    const strategy = {
      id: "bad",
      action: "buy",
      conditions: [
        { indicator: "foobar", field: "x", operator: ">", value: 0 },
      ],
    };
    expect(() => evaluateStrategy(strategy, rows)).toThrow("Unknown indicator");
  });

  it('throws "Invalid operator" for bad operator', () => {
    const strategy = {
      id: "bad-op",
      action: "buy",
      conditions: [
        { indicator: "rsi", field: "rsi", operator: "!=", value: 50 },
      ],
    };
    expect(() => evaluateStrategy(strategy, rows)).toThrow("Invalid operator");
  });

  it("handles close and volume as base fields", () => {
    const strategy = {
      id: "volume-spike",
      action: "buy",
      conditions: [
        { indicator: "rsi", field: "volume", operator: ">", value: 200_000_000 },
      ],
    };
    const triggers = evaluateStrategy(strategy, rows);
    expect(triggers.length).toBeGreaterThan(0);
    for (const t of triggers) {
      expect(t.strategyId).toBe("volume-spike");
    }
  });
});
