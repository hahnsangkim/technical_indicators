import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../server.js";

describe("POST /api/strategy", () => {
  it("returns 200 with triggers for valid strategy (RSI < 35 on SPY)", async () => {
    const res = await request(app)
      .post("/api/strategy")
      .send({
        ticker: "SPY",
        strategies: [
          {
            id: "rsi-oversold",
            action: "buy",
            conditions: [
              { indicator: "rsi", field: "rsi", operator: "<", value: 35 },
            ],
          },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.ticker).toBe("SPY");
    expect(res.body.results.length).toBeGreaterThan(0);
    for (const r of res.body.results) {
      expect(r).toHaveProperty("date");
      expect(r.strategyId).toBe("rsi-oversold");
      expect(r.action).toBe("buy");
    }
  });

  it("returns 400 for invalid ticker", async () => {
    const res = await request(app)
      .post("/api/strategy")
      .send({
        ticker: "!!!invalid!!!",
        strategies: [
          {
            id: "test",
            action: "buy",
            conditions: [
              { indicator: "rsi", field: "rsi", operator: "<", value: 30 },
            ],
          },
        ],
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid ticker/i);
  });

  it("returns 400 for malformed conditions (unknown indicator)", async () => {
    const res = await request(app)
      .post("/api/strategy")
      .send({
        ticker: "SPY",
        strategies: [
          {
            id: "bad",
            action: "buy",
            conditions: [
              { indicator: "foobar", field: "x", operator: ">", value: 0 },
            ],
          },
        ],
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/unknown indicator/i);
  });

  it("returns empty results for impossible conditions (RSI > 200)", async () => {
    const res = await request(app)
      .post("/api/strategy")
      .send({
        ticker: "SPY",
        strategies: [
          {
            id: "impossible",
            action: "buy",
            conditions: [
              { indicator: "rsi", field: "rsi", operator: ">", value: 200 },
            ],
          },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(0);
  });

  it("evaluates multiple strategies independently (OR logic)", async () => {
    const res = await request(app)
      .post("/api/strategy")
      .send({
        ticker: "SPY",
        strategies: [
          {
            id: "rsi-oversold",
            action: "buy",
            conditions: [
              { indicator: "rsi", field: "rsi", operator: "<", value: 35 },
            ],
          },
          {
            id: "cci-oversold",
            action: "buy",
            conditions: [
              { indicator: "cci", field: "cci", operator: "<", value: -100 },
            ],
          },
        ],
      });
    expect(res.status).toBe(200);
    const ids = new Set(res.body.results.map((r) => r.strategyId));
    expect(ids.has("rsi-oversold")).toBe(true);
    expect(ids.has("cci-oversold")).toBe(true);
  });

  it("returns 400 when strategies array is missing", async () => {
    const res = await request(app)
      .post("/api/strategy")
      .send({ ticker: "SPY" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/strategies array/i);
  });
});
