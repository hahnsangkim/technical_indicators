import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../server.js";

// ─── /api/tickers ────────────────────────────────────────────────────────────

describe("GET /api/tickers", () => {
  it("returns 200 with JSON array of strings, sorted alphabetically", async () => {
    const res = await request(app).get("/api/tickers");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    // Check sorted
    for (let i = 1; i < res.body.length; i++) {
      expect(res.body[i] >= res.body[i - 1]).toBe(true);
    }
  });

  it('contains known tickers SPY, AAPL, MSFT', async () => {
    const res = await request(app).get("/api/tickers");
    expect(res.body).toContain("SPY");
    expect(res.body).toContain("AAPL");
    expect(res.body).toContain("MSFT");
  });

  it("has no duplicate tickers", async () => {
    const res = await request(app).get("/api/tickers");
    expect(res.body.length).toBe(new Set(res.body).size);
  });

  it("all tickers match validation regex", async () => {
    const res = await request(app).get("/api/tickers");
    for (const t of res.body) {
      expect(t).toMatch(/^[A-Z0-9.]{1,10}$/);
    }
  });
});

// ─── /api/health ─────────────────────────────────────────────────────────────

describe("GET /api/health", () => {
  it('returns { status: "ok", tickers: <number> }', async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(typeof res.body.tickers).toBe("number");
  });

  it("ticker count > 0", async () => {
    const res = await request(app).get("/api/health");
    expect(res.body.tickers).toBeGreaterThan(0);
  });
});

// ─── /api/eco ────────────────────────────────────────────────────────────────

describe("GET /api/eco", () => {
  it("valid ticker returns 200 with ticker and data", async () => {
    const res = await request(app).get("/api/eco?ticker=SPY");
    expect(res.status).toBe(200);
    expect(res.body.ticker).toBe("SPY");
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("each data point has required fields", async () => {
    const res = await request(app).get("/api/eco?ticker=SPY");
    const d = res.body.data[10];
    expect(d).toHaveProperty("date");
    expect(d).toHaveProperty("close");
    expect(d).toHaveProperty("volume");
    expect(d).toHaveProperty("eco");
    expect(d).toHaveProperty("signal");
    expect(d).toHaveProperty("histogram");
  });

  it("data sorted by date ascending", async () => {
    const res = await request(app).get("/api/eco?ticker=SPY");
    const data = res.body.data;
    for (let i = 1; i < data.length; i++) {
      expect(data[i].date >= data[i - 1].date).toBe(true);
    }
  });

  it("histogram === eco - signal within float tolerance", async () => {
    const res = await request(app).get("/api/eco?ticker=SPY");
    for (const d of res.body.data) {
      expect(Math.abs(d.histogram - (d.eco - d.signal))).toBeLessThan(0.001);
    }
  });

  it("unknown ticker returns empty data", async () => {
    const res = await request(app).get("/api/eco?ticker=ZZZZ");
    expect(res.status).toBe(200);
    expect(res.body.ticker).toBe("ZZZZ");
    expect(res.body.data).toEqual([]);
  });

  it("missing ticker param defaults to SPY", async () => {
    const res = await request(app).get("/api/eco");
    expect(res.status).toBe(200);
    expect(res.body.ticker).toBe("SPY");
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("invalid ticker returns 400", async () => {
    const res = await request(app).get("/api/eco?ticker=A<script>");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid ticker");
  });

  it("ticker normalization (lowercase)", async () => {
    const lower = await request(app).get("/api/eco?ticker=spy");
    const upper = await request(app).get("/api/eco?ticker=SPY");
    expect(lower.body.data.length).toBe(upper.body.data.length);
    expect(lower.body.data[0].close).toBe(upper.body.data[0].close);
  });
});

// ─── /api/obv ────────────────────────────────────────────────────────────────

describe("GET /api/obv", () => {
  it("valid ticker returns 200 with data", async () => {
    const res = await request(app).get("/api/obv?ticker=SPY");
    expect(res.status).toBe(200);
    expect(res.body.ticker).toBe("SPY");
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("each data point has required fields", async () => {
    const res = await request(app).get("/api/obv?ticker=SPY");
    const d = res.body.data[10];
    expect(d).toHaveProperty("date");
    expect(d).toHaveProperty("close");
    expect(d).toHaveProperty("volume");
    expect(d).toHaveProperty("obv");
    expect(d).toHaveProperty("obvEma");
  });

  it("first data point OBV is 0", async () => {
    const res = await request(app).get("/api/obv?ticker=SPY");
    expect(res.body.data[0].obv).toBe(0);
  });

  it("OBV changes by exactly volume amount", async () => {
    const res = await request(app).get("/api/obv?ticker=SPY");
    const data = res.body.data;
    for (let i = 1; i < Math.min(data.length, 50); i++) {
      const diff = data[i].obv - data[i - 1].obv;
      if (data[i].close > data[i - 1].close) {
        expect(diff).toBe(data[i].volume);
      } else if (data[i].close < data[i - 1].close) {
        expect(diff).toBe(-data[i].volume);
      } else {
        expect(diff).toBe(0);
      }
    }
  });

  it("unknown ticker returns empty data", async () => {
    const res = await request(app).get("/api/obv?ticker=ZZZZ");
    expect(res.body.data).toEqual([]);
  });

  it("invalid ticker returns 400", async () => {
    const res = await request(app).get("/api/obv?ticker=INVALID!");
    expect(res.status).toBe(400);
  });
});

// ─── /api/demark ─────────────────────────────────────────────────────────────

describe("GET /api/demark", () => {
  it("valid ticker returns 200 with data", async () => {
    const res = await request(app).get("/api/demark?ticker=SPY");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("each data point has required fields", async () => {
    const res = await request(app).get("/api/demark?ticker=SPY");
    const d = res.body.data[50];
    for (const field of ["date", "close", "volume", "setupCount", "setupType",
      "countdownCount", "countdownType", "setupComplete", "countdownComplete",
      "perfected", "signal", "riskLine"]) {
      expect(d).toHaveProperty(field);
    }
  });

  it("data sorted by date ascending", async () => {
    const res = await request(app).get("/api/demark?ticker=SPY");
    const data = res.body.data;
    for (let i = 1; i < data.length; i++) {
      expect(data[i].date >= data[i - 1].date).toBe(true);
    }
  });

  it("first 4 bars have setupCount 0", async () => {
    const res = await request(app).get("/api/demark?ticker=SPY");
    for (let i = 0; i < 4; i++) {
      expect(res.body.data[i].setupCount).toBe(0);
    }
  });

  it("setup count never exceeds 9", async () => {
    const res = await request(app).get("/api/demark?ticker=SPY");
    for (const d of res.body.data) {
      expect(Math.abs(d.setupCount)).toBeLessThanOrEqual(9);
    }
  });

  it("countdown count never exceeds 13", async () => {
    const res = await request(app).get("/api/demark?ticker=SPY");
    for (const d of res.body.data) {
      expect(d.countdownCount).toBeLessThanOrEqual(13);
    }
  });

  it("signal values are valid enums", async () => {
    const res = await request(app).get("/api/demark?ticker=SPY");
    const valid = [null, "BUY_SETUP_9", "SELL_SETUP_9", "BUY_COUNTDOWN_13", "SELL_COUNTDOWN_13"];
    for (const d of res.body.data) {
      expect(valid).toContain(d.signal);
    }
  });

  it("buy setup has negative setupCount", async () => {
    const res = await request(app).get("/api/demark?ticker=SPY");
    for (const d of res.body.data) {
      if (d.setupType === "buy" && d.setupCount !== 0) {
        expect(d.setupCount).toBeLessThan(0);
      }
    }
  });

  it("sell setup has positive setupCount", async () => {
    const res = await request(app).get("/api/demark?ticker=SPY");
    for (const d of res.body.data) {
      if (d.setupType === "sell" && d.setupCount !== 0) {
        expect(d.setupCount).toBeGreaterThan(0);
      }
    }
  });

  it("unknown ticker returns empty data", async () => {
    const res = await request(app).get("/api/demark?ticker=ZZZZ");
    expect(res.body.data).toEqual([]);
  });

  it("invalid ticker returns 400", async () => {
    const res = await request(app).get("/api/demark?ticker=BAD!");
    expect(res.status).toBe(400);
  });
});

// ─── /api/rsi ────────────────────────────────────────────────────────────────

describe("GET /api/rsi", () => {
  it("valid ticker returns 200 with data", async () => {
    const res = await request(app).get("/api/rsi?ticker=SPY");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("each data point has required fields", async () => {
    const res = await request(app).get("/api/rsi?ticker=SPY");
    const d = res.body.data[20];
    expect(d).toHaveProperty("date");
    expect(d).toHaveProperty("close");
    expect(d).toHaveProperty("volume");
    expect(d).toHaveProperty("rsi");
  });

  it("data sorted by date ascending", async () => {
    const res = await request(app).get("/api/rsi?ticker=SPY");
    const data = res.body.data;
    for (let i = 1; i < data.length; i++) {
      expect(data[i].date >= data[i - 1].date).toBe(true);
    }
  });

  it("RSI bounded 0-100", async () => {
    const res = await request(app).get("/api/rsi?ticker=SPY");
    for (const d of res.body.data) {
      expect(d.rsi).toBeGreaterThanOrEqual(0);
      expect(d.rsi).toBeLessThanOrEqual(100);
    }
  });

  it("first 13 rows have RSI = 50 (warmup)", async () => {
    const res = await request(app).get("/api/rsi?ticker=SPY");
    for (let i = 0; i < 14; i++) {
      expect(res.body.data[i].rsi).toBe(50);
    }
  });

  it("unknown ticker returns empty data", async () => {
    const res = await request(app).get("/api/rsi?ticker=ZZZZ");
    expect(res.body.data).toEqual([]);
  });

  it("invalid ticker returns 400", async () => {
    const res = await request(app).get("/api/rsi?ticker=BAD!");
    expect(res.status).toBe(400);
  });

  it("ticker normalization", async () => {
    const lower = await request(app).get("/api/rsi?ticker=spy");
    const upper = await request(app).get("/api/rsi?ticker=SPY");
    expect(lower.body.data.length).toBe(upper.body.data.length);
  });
});

// ─── /api/macd ───────────────────────────────────────────────────────────────

describe("GET /api/macd", () => {
  it("valid ticker returns 200 with data", async () => {
    const res = await request(app).get("/api/macd?ticker=SPY");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("each data point has required fields", async () => {
    const res = await request(app).get("/api/macd?ticker=SPY");
    const d = res.body.data[30];
    expect(d).toHaveProperty("date");
    expect(d).toHaveProperty("close");
    expect(d).toHaveProperty("volume");
    expect(d).toHaveProperty("macd");
    expect(d).toHaveProperty("signal");
    expect(d).toHaveProperty("histogram");
  });

  it("data sorted by date ascending", async () => {
    const res = await request(app).get("/api/macd?ticker=SPY");
    const data = res.body.data;
    for (let i = 1; i < data.length; i++) {
      expect(data[i].date >= data[i - 1].date).toBe(true);
    }
  });

  it("histogram === macd - signal within float tolerance", async () => {
    const res = await request(app).get("/api/macd?ticker=SPY");
    for (const d of res.body.data) {
      expect(Math.abs(d.histogram - (d.macd - d.signal))).toBeLessThan(0.001);
    }
  });

  it("MACD starts at 0 when EMAs converge", async () => {
    const res = await request(app).get("/api/macd?ticker=SPY");
    expect(Math.abs(res.body.data[0].macd)).toBeLessThan(0.01);
  });

  it("unknown ticker returns empty data", async () => {
    const res = await request(app).get("/api/macd?ticker=ZZZZ");
    expect(res.body.data).toEqual([]);
  });

  it("invalid ticker returns 400", async () => {
    const res = await request(app).get("/api/macd?ticker=BAD!");
    expect(res.status).toBe(400);
  });
});

// ─── /api/bollinger ──────────────────────────────────────────────────────────

describe("GET /api/bollinger", () => {
  it("valid ticker returns 200 with data", async () => {
    const res = await request(app).get("/api/bollinger?ticker=SPY");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("each data point has required fields", async () => {
    const res = await request(app).get("/api/bollinger?ticker=SPY");
    const d = res.body.data[25];
    expect(d).toHaveProperty("date");
    expect(d).toHaveProperty("close");
    expect(d).toHaveProperty("volume");
    expect(d).toHaveProperty("upper");
    expect(d).toHaveProperty("middle");
    expect(d).toHaveProperty("lower");
  });

  it("first 19 rows have null bands", async () => {
    const res = await request(app).get("/api/bollinger?ticker=SPY");
    for (let i = 0; i < 19; i++) {
      expect(res.body.data[i].upper).toBeNull();
      expect(res.body.data[i].middle).toBeNull();
      expect(res.body.data[i].lower).toBeNull();
    }
  });

  it("upper > middle > lower for non-null rows", async () => {
    const res = await request(app).get("/api/bollinger?ticker=SPY");
    for (const d of res.body.data) {
      if (d.upper !== null) {
        expect(d.upper).toBeGreaterThanOrEqual(d.middle);
        expect(d.middle).toBeGreaterThanOrEqual(d.lower);
      }
    }
  });

  it("bands symmetric around middle", async () => {
    const res = await request(app).get("/api/bollinger?ticker=SPY");
    for (const d of res.body.data) {
      if (d.upper !== null) {
        expect(Math.abs((d.upper - d.middle) - (d.middle - d.lower))).toBeLessThan(0.02);
      }
    }
  });

  it("unknown ticker returns empty data", async () => {
    const res = await request(app).get("/api/bollinger?ticker=ZZZZ");
    expect(res.body.data).toEqual([]);
  });

  it("invalid ticker returns 400", async () => {
    const res = await request(app).get("/api/bollinger?ticker=BAD!");
    expect(res.status).toBe(400);
  });
});

// ─── /api/atr ────────────────────────────────────────────────────────────────

describe("GET /api/atr", () => {
  it("valid ticker returns 200 with data", async () => {
    const res = await request(app).get("/api/atr?ticker=SPY");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("each data point has required fields", async () => {
    const res = await request(app).get("/api/atr?ticker=SPY");
    const d = res.body.data[20];
    expect(d).toHaveProperty("date");
    expect(d).toHaveProperty("close");
    expect(d).toHaveProperty("volume");
    expect(d).toHaveProperty("tr");
    expect(d).toHaveProperty("atr");
  });

  it("first 13 rows have null ATR", async () => {
    const res = await request(app).get("/api/atr?ticker=SPY");
    for (let i = 0; i < 13; i++) {
      expect(res.body.data[i].atr).toBeNull();
    }
  });

  it("ATR always positive for non-null rows", async () => {
    const res = await request(app).get("/api/atr?ticker=SPY");
    for (const d of res.body.data) {
      if (d.atr !== null) {
        expect(d.atr).toBeGreaterThan(0);
      }
    }
  });

  it("TR always positive", async () => {
    const res = await request(app).get("/api/atr?ticker=SPY");
    for (const d of res.body.data) {
      expect(d.tr).toBeGreaterThan(0);
    }
  });

  it("unknown ticker returns empty data", async () => {
    const res = await request(app).get("/api/atr?ticker=ZZZZ");
    expect(res.body.data).toEqual([]);
  });

  it("invalid ticker returns 400", async () => {
    const res = await request(app).get("/api/atr?ticker=BAD!");
    expect(res.status).toBe(400);
  });
});

// ─── /api/adx ────────────────────────────────────────────────────────────────

describe("GET /api/adx", () => {
  it("valid ticker returns 200 with data", async () => {
    const res = await request(app).get("/api/adx?ticker=SPY");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("each data point has required fields", async () => {
    const res = await request(app).get("/api/adx?ticker=SPY");
    const d = res.body.data[20];
    expect(d).toHaveProperty("date");
    expect(d).toHaveProperty("close");
    expect(d).toHaveProperty("volume");
    expect(d).toHaveProperty("adx");
    expect(d).toHaveProperty("plusDI");
    expect(d).toHaveProperty("minusDI");
  });

  it("first row has all nulls", async () => {
    const res = await request(app).get("/api/adx?ticker=SPY");
    const d = res.body.data[0];
    expect(d.adx).toBeNull();
    expect(d.plusDI).toBeNull();
    expect(d.minusDI).toBeNull();
  });

  it("first 13 rows have null ADX", async () => {
    const res = await request(app).get("/api/adx?ticker=SPY");
    for (let i = 0; i < 14; i++) {
      expect(res.body.data[i].adx).toBeNull();
    }
  });

  it("ADX bounded 0-100 for non-null rows", async () => {
    const res = await request(app).get("/api/adx?ticker=SPY");
    for (const d of res.body.data) {
      if (d.adx !== null) {
        expect(d.adx).toBeGreaterThanOrEqual(0);
        expect(d.adx).toBeLessThanOrEqual(100);
      }
    }
  });

  it("+DI and -DI bounded 0-100", async () => {
    const res = await request(app).get("/api/adx?ticker=SPY");
    for (const d of res.body.data) {
      if (d.plusDI !== null) {
        expect(d.plusDI).toBeGreaterThanOrEqual(0);
        expect(d.plusDI).toBeLessThanOrEqual(100);
      }
      if (d.minusDI !== null) {
        expect(d.minusDI).toBeGreaterThanOrEqual(0);
        expect(d.minusDI).toBeLessThanOrEqual(100);
      }
    }
  });

  it("unknown ticker returns empty data", async () => {
    const res = await request(app).get("/api/adx?ticker=ZZZZ");
    expect(res.body.data).toEqual([]);
  });

  it("invalid ticker returns 400", async () => {
    const res = await request(app).get("/api/adx?ticker=BAD!");
    expect(res.status).toBe(400);
  });
});

// ─── /api/cci ────────────────────────────────────────────────────────────────

describe("GET /api/cci", () => {
  it("valid ticker returns 200 with data", async () => {
    const res = await request(app).get("/api/cci?ticker=SPY");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("each data point has required fields", async () => {
    const res = await request(app).get("/api/cci?ticker=SPY");
    const d = res.body.data[25];
    expect(d).toHaveProperty("date");
    expect(d).toHaveProperty("close");
    expect(d).toHaveProperty("volume");
    expect(d).toHaveProperty("cci");
  });

  it("first 19 rows have null CCI", async () => {
    const res = await request(app).get("/api/cci?ticker=SPY");
    for (let i = 0; i < 19; i++) {
      expect(res.body.data[i].cci).toBeNull();
    }
  });

  it("CCI is unbounded (values outside ±100 exist)", async () => {
    const res = await request(app).get("/api/cci?ticker=SPY");
    const nonNull = res.body.data.filter(d => d.cci !== null);
    const hasOutside = nonNull.some(d => Math.abs(d.cci) > 100);
    expect(hasOutside).toBe(true);
  });

  it("unknown ticker returns empty data", async () => {
    const res = await request(app).get("/api/cci?ticker=ZZZZ");
    expect(res.body.data).toEqual([]);
  });

  it("invalid ticker returns 400", async () => {
    const res = await request(app).get("/api/cci?ticker=BAD!");
    expect(res.status).toBe(400);
  });
});

// ─── /api/roc ────────────────────────────────────────────────────────────────

describe("GET /api/roc", () => {
  it("valid ticker returns 200 with data", async () => {
    const res = await request(app).get("/api/roc?ticker=SPY");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("each data point has required fields", async () => {
    const res = await request(app).get("/api/roc?ticker=SPY");
    const d = res.body.data[20];
    expect(d).toHaveProperty("date");
    expect(d).toHaveProperty("close");
    expect(d).toHaveProperty("volume");
    expect(d).toHaveProperty("roc");
  });

  it("first 12 rows have null ROC", async () => {
    const res = await request(app).get("/api/roc?ticker=SPY");
    for (let i = 0; i < 12; i++) {
      expect(res.body.data[i].roc).toBeNull();
    }
  });

  it("ROC formula correct within tolerance", async () => {
    const res = await request(app).get("/api/roc?ticker=SPY");
    const data = res.body.data;
    for (let i = 12; i < Math.min(data.length, 50); i++) {
      const expected = ((data[i].close - data[i - 12].close) / data[i - 12].close) * 100;
      expect(Math.abs(data[i].roc - expected)).toBeLessThan(0.01);
    }
  });

  it("unknown ticker returns empty data", async () => {
    const res = await request(app).get("/api/roc?ticker=ZZZZ");
    expect(res.body.data).toEqual([]);
  });

  it("invalid ticker returns 400", async () => {
    const res = await request(app).get("/api/roc?ticker=BAD!");
    expect(res.status).toBe(400);
  });
});

// ─── /api/williamsr ──────────────────────────────────────────────────────────

describe("GET /api/williamsr", () => {
  it("valid ticker returns 200 with data", async () => {
    const res = await request(app).get("/api/williamsr?ticker=SPY");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("each data point has required fields", async () => {
    const res = await request(app).get("/api/williamsr?ticker=SPY");
    const d = res.body.data[20];
    expect(d).toHaveProperty("date");
    expect(d).toHaveProperty("close");
    expect(d).toHaveProperty("volume");
    expect(d).toHaveProperty("williamsR");
  });

  it("first 13 rows have null %R", async () => {
    const res = await request(app).get("/api/williamsr?ticker=SPY");
    for (let i = 0; i < 13; i++) {
      expect(res.body.data[i].williamsR).toBeNull();
    }
  });

  it("Williams %R bounded -100 to 0", async () => {
    const res = await request(app).get("/api/williamsr?ticker=SPY");
    for (const d of res.body.data) {
      if (d.williamsR !== null) {
        expect(d.williamsR).toBeGreaterThanOrEqual(-100);
        expect(d.williamsR).toBeLessThanOrEqual(0);
      }
    }
  });

  it("unknown ticker returns empty data", async () => {
    const res = await request(app).get("/api/williamsr?ticker=ZZZZ");
    expect(res.body.data).toEqual([]);
  });

  it("invalid ticker returns 400", async () => {
    const res = await request(app).get("/api/williamsr?ticker=BAD!");
    expect(res.status).toBe(400);
  });
});

// ─── /api/stochrsi ───────────────────────────────────────────────────────────

describe("GET /api/stochrsi", () => {
  it("valid ticker returns 200 with data", async () => {
    const res = await request(app).get("/api/stochrsi?ticker=SPY");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("each data point has required fields", async () => {
    const res = await request(app).get("/api/stochrsi?ticker=SPY");
    const d = res.body.data[30];
    expect(d).toHaveProperty("date");
    expect(d).toHaveProperty("close");
    expect(d).toHaveProperty("volume");
    expect(d).toHaveProperty("stochRsi");
    expect(d).toHaveProperty("k");
    expect(d).toHaveProperty("d");
  });

  it("first 26 rows have null values", async () => {
    const res = await request(app).get("/api/stochrsi?ticker=SPY");
    for (let i = 0; i < 27; i++) {
      expect(res.body.data[i].stochRsi).toBeNull();
    }
  });

  it("StochRSI bounded 0-1", async () => {
    const res = await request(app).get("/api/stochrsi?ticker=SPY");
    for (const d of res.body.data) {
      if (d.stochRsi !== null) {
        expect(d.stochRsi).toBeGreaterThanOrEqual(0);
        expect(d.stochRsi).toBeLessThanOrEqual(1);
      }
    }
  });

  it("%K bounded 0-1", async () => {
    const res = await request(app).get("/api/stochrsi?ticker=SPY");
    for (const d of res.body.data) {
      if (d.k !== null) {
        expect(d.k).toBeGreaterThanOrEqual(0);
        expect(d.k).toBeLessThanOrEqual(1);
      }
    }
  });

  it("%D bounded 0-1", async () => {
    const res = await request(app).get("/api/stochrsi?ticker=SPY");
    for (const d of res.body.data) {
      if (d.d !== null) {
        expect(d.d).toBeGreaterThanOrEqual(0);
        expect(d.d).toBeLessThanOrEqual(1);
      }
    }
  });

  it("%D is smoother than %K", async () => {
    const res = await request(app).get("/api/stochrsi?ticker=SPY");
    const nonNull = res.body.data.filter(d => d.k !== null && d.d !== null);
    let kChanges = 0, dChanges = 0;
    for (let i = 1; i < nonNull.length; i++) {
      kChanges += Math.abs(nonNull[i].k - nonNull[i - 1].k);
      dChanges += Math.abs(nonNull[i].d - nonNull[i - 1].d);
    }
    expect(dChanges).toBeLessThan(kChanges);
  });

  it("unknown ticker returns empty data", async () => {
    const res = await request(app).get("/api/stochrsi?ticker=ZZZZ");
    expect(res.body.data).toEqual([]);
  });

  it("invalid ticker returns 400", async () => {
    const res = await request(app).get("/api/stochrsi?ticker=BAD!");
    expect(res.status).toBe(400);
  });
});

// ─── /api/ichimoku ───────────────────────────────────────────────────────────

describe("GET /api/ichimoku", () => {
  it("valid ticker returns 200 with data", async () => {
    const res = await request(app).get("/api/ichimoku?ticker=SPY");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("each data point has required fields", async () => {
    const res = await request(app).get("/api/ichimoku?ticker=SPY");
    const d = res.body.data[100];
    expect(d).toHaveProperty("date");
    expect(d).toHaveProperty("close");
    expect(d).toHaveProperty("volume");
    expect(d).toHaveProperty("tenkan");
    expect(d).toHaveProperty("kijun");
    expect(d).toHaveProperty("senkouA");
    expect(d).toHaveProperty("senkouB");
    expect(d).toHaveProperty("chikou");
  });

  it("tenkan null for first 8 bars", async () => {
    const res = await request(app).get("/api/ichimoku?ticker=SPY");
    for (let i = 0; i < 8; i++) {
      expect(res.body.data[i].tenkan).toBeNull();
    }
  });

  it("kijun null for first 25 bars", async () => {
    const res = await request(app).get("/api/ichimoku?ticker=SPY");
    for (let i = 0; i < 25; i++) {
      expect(res.body.data[i].kijun).toBeNull();
    }
  });

  it("senkou A null for first 51 bars", async () => {
    const res = await request(app).get("/api/ichimoku?ticker=SPY");
    for (let i = 0; i < 51; i++) {
      expect(res.body.data[i].senkouA).toBeNull();
    }
  });

  it("senkou B null for first 77 bars", async () => {
    const res = await request(app).get("/api/ichimoku?ticker=SPY");
    for (let i = 0; i < 77; i++) {
      expect(res.body.data[i].senkouB).toBeNull();
    }
  });

  it("chikou null for last 26 bars", async () => {
    const res = await request(app).get("/api/ichimoku?ticker=SPY");
    const data = res.body.data;
    for (let i = data.length - 26; i < data.length; i++) {
      expect(data[i].chikou).toBeNull();
    }
  });

  it("unknown ticker returns empty data", async () => {
    const res = await request(app).get("/api/ichimoku?ticker=ZZZZ");
    expect(res.body.data).toEqual([]);
  });

  it("invalid ticker returns 400", async () => {
    const res = await request(app).get("/api/ichimoku?ticker=BAD!");
    expect(res.status).toBe(400);
  });
});
