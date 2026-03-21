import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../server.js";

describe("Error Handling", () => {
  it("CORS headers present", async () => {
    const res = await request(app).get("/api/health");
    expect(res.headers["access-control-allow-origin"]).toBeDefined();
  });

  it("all 13 indicator endpoints handle concurrent requests", async () => {
    const endpoints = [
      "/api/eco", "/api/obv", "/api/demark", "/api/rsi",
      "/api/macd", "/api/bollinger", "/api/atr", "/api/adx",
      "/api/cci", "/api/roc", "/api/williamsr", "/api/stochrsi",
      "/api/ichimoku",
    ];

    const results = await Promise.all(
      endpoints.map(ep => request(app).get(`${ep}?ticker=SPY`))
    );

    for (const res of results) {
      expect(res.status).toBe(200);
      expect(res.body.ticker).toBe("SPY");
      expect(res.body.data.length).toBeGreaterThan(0);
    }
  });
});

describe("Performance", () => {
  const endpoints = [
    "/api/tickers",
    "/api/eco?ticker=SPY", "/api/obv?ticker=SPY", "/api/demark?ticker=SPY",
    "/api/rsi?ticker=SPY", "/api/macd?ticker=SPY", "/api/bollinger?ticker=SPY",
    "/api/atr?ticker=SPY", "/api/adx?ticker=SPY", "/api/cci?ticker=SPY",
    "/api/roc?ticker=SPY", "/api/williamsr?ticker=SPY", "/api/stochrsi?ticker=SPY",
    "/api/ichimoku?ticker=SPY",
  ];

  for (const ep of endpoints) {
    const name = ep.split("?")[0];
    const limit = name === "/api/tickers" ? 500 : 200;

    it(`${name} responds within ${limit}ms`, async () => {
      const start = performance.now();
      await request(app).get(ep);
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(limit);
    });
  }
});
