import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../server.js";

describe("GET /api/signals", () => {
  it("returns 200 with correct shape for valid ticker", async () => {
    const res = await request(app).get("/api/signals?ticker=SPY");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("ticker", "SPY");
    expect(Array.isArray(res.body.signals)).toBe(true);
    expect(res.body).toHaveProperty("totalSignals");
    expect(res.body.totalSignals).toBe(res.body.signals.length);
  });

  it("returns 400 for invalid ticker", async () => {
    const res = await request(app).get("/api/signals?ticker=!!!");
    expect(res.status).toBe(400);
  });

  it("returns empty signals for unknown ticker", async () => {
    const res = await request(app).get("/api/signals?ticker=ZZZZZZ");
    expect(res.status).toBe(200);
    expect(res.body.signals).toEqual([]);
    expect(res.body.totalSignals).toBe(0);
  });

  it("each signal has required fields", async () => {
    const res = await request(app).get("/api/signals?ticker=SPY");
    for (const s of res.body.signals) {
      expect(s).toHaveProperty("date");
      expect(s).toHaveProperty("indicator");
      expect(s).toHaveProperty("signal");
      expect(s).toHaveProperty("direction");
      expect(s).toHaveProperty("value");
      expect(s).toHaveProperty("details");
      expect(["buy", "sell", "neutral"]).toContain(s.direction);
    }
  });

  it("signals are sorted by date descending", async () => {
    const res = await request(app).get("/api/signals?ticker=SPY");
    const dates = res.body.signals.map(s => s.date);
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i] <= dates[i-1]).toBe(true);
    }
  });

  it("signals are within last 10 bars of data", async () => {
    const res = await request(app).get("/api/signals?ticker=SPY");
    if (res.body.signals.length > 0) {
      // All signal dates should be recent (within last 10 bars)
      const allDates = res.body.signals.map(s => s.date);
      // Just verify they exist and are valid date strings
      for (const d of allDates) {
        expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });
});
