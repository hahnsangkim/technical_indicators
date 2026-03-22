import { describe, it, expect } from "vitest";
import { calcEco, calcRsi, calcMacd, calcBollinger, calcAtr, calcAdx, calcCci, calcRoc, calcWilliamsR, calcStochRsi, calcIchimoku } from "../server.js";

const makeRows = (n = 60) => Array.from({ length: n }, (_, i) => ({
  date: `2025-01-${String(i + 1).padStart(2, "0")}`,
  open: 100 + Math.sin(i) * 5,
  high: 102 + Math.sin(i) * 5,
  low: 98 + Math.sin(i) * 5,
  close: 101 + Math.sin(i) * 5,
  volume: 1000000 + i * 10000,
}));

describe("Extracted calc functions", () => {
  const rows = makeRows();

  it("calcEco returns array with eco, signal, histogram", () => {
    const data = calcEco(rows);
    expect(data.length).toBe(rows.length);
    expect(data[data.length - 1]).toHaveProperty("eco");
    expect(data[data.length - 1]).toHaveProperty("signal");
    expect(data[data.length - 1]).toHaveProperty("histogram");
  });

  it("calcRsi returns array with rsi field", () => {
    const data = calcRsi(rows);
    expect(data.length).toBe(rows.length);
    expect(data[data.length - 1]).toHaveProperty("rsi");
  });

  it("calcMacd returns array with macd, signal, histogram", () => {
    const data = calcMacd(rows);
    expect(data.length).toBe(rows.length);
    expect(data[data.length - 1]).toHaveProperty("macd");
    expect(data[data.length - 1]).toHaveProperty("signal");
    expect(data[data.length - 1]).toHaveProperty("histogram");
  });

  it("calcBollinger returns array with upper, middle, lower", () => {
    const data = calcBollinger(rows);
    expect(data.length).toBe(rows.length);
    expect(data[data.length - 1]).toHaveProperty("upper");
    expect(data[data.length - 1]).toHaveProperty("middle");
    expect(data[data.length - 1]).toHaveProperty("lower");
  });

  it("calcAtr returns array with tr and atr", () => {
    const data = calcAtr(rows);
    expect(data.length).toBe(rows.length);
    expect(data[data.length - 1]).toHaveProperty("tr");
    expect(data[data.length - 1]).toHaveProperty("atr");
  });

  it("calcAdx returns array with adx, plusDI, minusDI", () => {
    const data = calcAdx(rows);
    expect(data.length).toBe(rows.length);
    expect(data[data.length - 1]).toHaveProperty("adx");
    expect(data[data.length - 1]).toHaveProperty("plusDI");
    expect(data[data.length - 1]).toHaveProperty("minusDI");
  });

  it("calcCci returns array with cci field", () => {
    const data = calcCci(rows);
    expect(data.length).toBe(rows.length);
    expect(data[data.length - 1]).toHaveProperty("cci");
  });

  it("calcRoc returns array with roc field", () => {
    const data = calcRoc(rows);
    expect(data.length).toBe(rows.length);
    expect(data[data.length - 1]).toHaveProperty("roc");
  });

  it("calcWilliamsR returns array with williamsR field", () => {
    const data = calcWilliamsR(rows);
    expect(data.length).toBe(rows.length);
    expect(data[data.length - 1]).toHaveProperty("williamsR");
  });

  it("calcStochRsi returns array with stochRsi, k, d", () => {
    const data = calcStochRsi(rows);
    expect(data.length).toBe(rows.length);
    expect(data[data.length - 1]).toHaveProperty("stochRsi");
    expect(data[data.length - 1]).toHaveProperty("k");
    expect(data[data.length - 1]).toHaveProperty("d");
  });

  it("calcIchimoku returns array with tenkan, kijun, senkouA, senkouB", () => {
    const data = calcIchimoku(rows);
    expect(data.length).toBe(rows.length);
    expect(data[data.length - 1]).toHaveProperty("tenkan");
    expect(data[data.length - 1]).toHaveProperty("kijun");
    expect(data[data.length - 1]).toHaveProperty("senkouA");
    expect(data[data.length - 1]).toHaveProperty("senkouB");
  });
});
