import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, calcDemark, calcObv } from "../server.js";

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

describe("calcObv (extracted function)", () => {
  it("is exported and callable", () => {
    expect(typeof calcObv).toBe("function");
  });

  it("returns array with obv and obvEma fields", () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      date: `2025-01-${String(i + 1).padStart(2, "0")}`,
      open: 100 + i, high: 101 + i, low: 99 + i,
      close: 100 + i, volume: 1000000,
    }));
    const result = calcObv(rows);
    expect(result.length).toBe(10);
    expect(result[0]).toHaveProperty("obv");
    expect(result[0]).toHaveProperty("obvEma");
  });
});

describe("GET /api/confluence", () => {
  it("returns 200 with valid ticker", async () => {
    const res = await request(app).get("/api/confluence?ticker=SPY");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("ticker", "SPY");
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("returns 400 for invalid ticker", async () => {
    const res = await request(app).get("/api/confluence?ticker=!!!");
    expect(res.status).toBe(400);
  });

  it("returns empty array for ticker with no data", async () => {
    const res = await request(app).get("/api/confluence?ticker=ZZZZZZ");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("each event has required fields", async () => {
    const res = await request(app).get("/api/confluence?ticker=SPY");
    for (const event of res.body.data) {
      expect(event).toHaveProperty("date");
      expect(event).toHaveProperty("signal");
      expect(event).toHaveProperty("type");
      expect(["CAPITULATION", "OBV_DIVERGENCE", "POST_SIGNAL"]).toContain(event.type);
    }
  });

  it("CAPITULATION events have volumeRatio > 2", async () => {
    const res = await request(app).get("/api/confluence?ticker=SPY");
    const caps = res.body.data.filter(e => e.type === "CAPITULATION");
    for (const c of caps) {
      expect(c.volumeRatio).toBeGreaterThan(2);
      expect(c).toHaveProperty("volume");
      expect(c).toHaveProperty("avgVolume");
    }
  });

  it("OBV_DIVERGENCE events have opposing directions", async () => {
    const res = await request(app).get("/api/confluence?ticker=SPY");
    const divs = res.body.data.filter(e => e.type === "OBV_DIVERGENCE");
    for (const d of divs) {
      expect(d).toHaveProperty("priceDirection");
      expect(d).toHaveProperty("obvDirection");
      expect(d.priceDirection).not.toBe(d.obvDirection);
      expect(d).toHaveProperty("countdownSpanBars");
    }
  });

  it("POST_SIGNAL events have validation field", async () => {
    const res = await request(app).get("/api/confluence?ticker=SPY");
    const posts = res.body.data.filter(e => e.type === "POST_SIGNAL");
    for (const p of posts) {
      expect(["CONFIRMED", "FAILED"]).toContain(p.validation);
      expect(p).toHaveProperty("barsAfter", 3);
      expect(p).toHaveProperty("avgPostVolume");
      expect(p).toHaveProperty("avgVolume");
    }
  });
});
