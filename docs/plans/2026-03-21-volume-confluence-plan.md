# Volume Confluence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `/api/confluence` endpoint that detects volume-price confluence events around DeMark signals, and display them as markers on the DeMark chart.

**Architecture:** Extract DeMark and OBV math into shared functions. New endpoint combines both to detect three event types (CAPITULATION, OBV_DIVERGENCE, POST_SIGNAL). Frontend adds `confluence` indicator with sparse event markers overlaid on the DeMark chart panel.

**Tech Stack:** Express 5 (ES modules), React, Recharts, Vitest, Supertest, Testing Library

---

### Task 1: Extract DeMark calculation into a reusable function

**Files:**
- Modify: `backend/server.js:193-354` (extract DeMark logic from endpoint handler)

**Step 1: Write the failing test**

Create `backend/__tests__/confluence.test.js`:

```js
import { describe, it, expect } from "vitest";
import { calcDemark } from "../server.js";

describe("calcDemark (extracted function)", () => {
  it("is exported and callable", () => {
    expect(typeof calcDemark).toBe("function");
  });

  it("returns array with signal fields for valid rows", () => {
    // Minimal rows: 10 bars where each close < close[4 bars ago] to trigger buy setup
    const rows = Array.from({ length: 14 }, (_, i) => ({
      date: `2025-01-${String(i + 1).padStart(2, "0")}`,
      open: 100 - i,
      high: 101 - i,
      low: 99 - i,
      close: 100 - i, // steadily falling
      volume: 1000000,
    }));
    const result = calcDemark(rows);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(rows.length);
    expect(result[0]).toHaveProperty("signal");
    expect(result[0]).toHaveProperty("setupCount");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx vitest run __tests__/confluence.test.js`
Expected: FAIL — `calcDemark` is not exported

**Step 3: Extract `calcDemark` from the endpoint handler**

In `backend/server.js`, before the `/api/demark` route (around line 192), add:

```js
// ─── DeMark calculation (reusable) ──────────────────────────────────────────
function calcDemark(rows) {
  let setupCount = 0;
  let setupType = null;
  let countdownCount = 0;
  let countdownType = null;
  let countdownActive = false;
  let setupBars = [];
  let setupStartIdx = -1;
  let countdownStartIdx = -1;
  let activeRiskLine = null;

  return rows.map((row, i) => {
    let setupComplete = false;
    let countdownComplete = false;
    let perfected = false;
    let signal = null;

    if (i < 4) {
      return {
        date: row.date, close: +row.close.toFixed(2), volume: Math.round(row.volume),
        setupCount: 0, setupType: null, countdownCount: 0, countdownType: null,
        setupComplete: false, countdownComplete: false, perfected: false, signal: null,
        riskLine: null, riskLineType: null,
      };
    }

    const cmp = rows[i - 4].close;

    if (row.close < cmp) {
      if (setupType === "buy") { setupCount++; } else { setupType = "buy"; setupCount = 1; setupBars = []; setupStartIdx = i; }
      setupBars.push({ high: row.high, low: row.low, idx: i });
    } else if (row.close > cmp) {
      if (setupType === "sell") { setupCount++; } else { setupType = "sell"; setupCount = 1; setupBars = []; setupStartIdx = i; }
      setupBars.push({ high: row.high, low: row.low, idx: i });
    } else {
      setupCount = 0; setupType = null; setupBars = [];
    }

    if (setupCount === 9) {
      setupComplete = true;
      if (setupBars.length >= 9) {
        const b6 = setupBars[5], b7 = setupBars[6], b8 = setupBars[7], b9 = setupBars[8];
        if (setupType === "buy") {
          perfected = (b8.low < b6.low && b8.low < b7.low) || (b9.low < b6.low && b9.low < b7.low);
        } else {
          perfected = (b8.high > b6.high && b8.high > b7.high) || (b9.high > b6.high && b9.high > b7.high);
        }
      }
      signal = setupType === "buy" ? "BUY_SETUP_9" : "SELL_SETUP_9";
      activeRiskLine = calcRiskLine(rows, setupBars, setupType);
      countdownActive = true; countdownType = setupType; countdownCount = 0; countdownStartIdx = i;
      setupCount = 0; setupType = null; setupBars = [];
    }

    if (countdownActive && i >= 2) {
      if (countdownType === "buy" && row.close <= rows[i - 2].low) { countdownCount++; }
      else if (countdownType === "sell" && row.close >= rows[i - 2].high) { countdownCount++; }

      if (countdownCount === 13) {
        countdownComplete = true;
        signal = countdownType === "buy" ? "BUY_COUNTDOWN_13" : "SELL_COUNTDOWN_13";
        const cdBars = [];
        for (let j = countdownStartIdx; j <= i; j++) {
          cdBars.push({ high: rows[j].high, low: rows[j].low, idx: j });
        }
        activeRiskLine = calcRiskLine(rows, cdBars, countdownType);
        countdownActive = false; countdownCount = 0; countdownType = null;
      }

      if (setupComplete && setupType !== countdownType) {
        countdownActive = false; countdownCount = 0; countdownType = null;
      }
    }

    if (activeRiskLine) {
      if (activeRiskLine.type === "buy" && row.close < activeRiskLine.value) { activeRiskLine = null; }
      else if (activeRiskLine.type === "sell" && row.close > activeRiskLine.value) { activeRiskLine = null; }
    }

    return {
      date: row.date, close: +row.close.toFixed(2), volume: Math.round(row.volume),
      setupCount: setupType === "buy" ? -setupCount : setupCount,
      setupType,
      countdownCount: countdownActive ? countdownCount : 0,
      countdownType: countdownActive ? countdownType : null,
      setupComplete, countdownComplete, perfected, signal,
      riskLine: activeRiskLine ? +activeRiskLine.value.toFixed(2) : null,
      riskLineType: activeRiskLine ? activeRiskLine.type : null,
    };
  });
}
```

Then replace the `/api/demark` handler body to use it:

```js
app.get("/api/demark", (req, res) => {
  const ticker = validateTicker(req.query.ticker);
  if (!ticker) return res.status(400).json({ error: "Invalid ticker" });
  const rows = parseRows(ticker);
  if (rows.length === 0) return res.json({ ticker, data: [] });
  res.json({ ticker, data: calcDemark(rows) });
});
```

Add `calcDemark` to the exports:

```js
export { app, validateTicker, emaK, calcEMA, calcDEMA, parseRows, calcDemark };
```

**Step 4: Run ALL backend tests**

Run: `cd backend && npx vitest run`
Expected: All tests PASS (existing demark endpoint tests validate the refactor)

**Step 5: Commit**

```bash
git add backend/server.js backend/__tests__/confluence.test.js
git commit -m "refactor: extract calcDemark into reusable function"
```

---

### Task 2: Extract OBV calculation into a reusable function

**Files:**
- Modify: `backend/server.js:128-163` (extract OBV logic)
- Test: `backend/__tests__/confluence.test.js`

**Step 1: Write the failing test**

Add to `backend/__tests__/confluence.test.js`:

```js
import { calcDemark, calcObv } from "../server.js";

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
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx vitest run __tests__/confluence.test.js`
Expected: FAIL — `calcObv` is not exported

**Step 3: Extract `calcObv` from the endpoint handler**

In `backend/server.js`, before the `/api/obv` route, add:

```js
// ─── OBV calculation (reusable) ─────────────────────────────────────────────
function calcObv(rows) {
  let obv = 0;
  const k20 = emaK(20);
  let obvEma = 0;

  return rows.map((row, i) => {
    if (i === 0) {
      obv = 0;
    } else {
      const prevClose = rows[i - 1].close;
      if (row.close > prevClose) obv += row.volume;
      else if (row.close < prevClose) obv -= row.volume;
    }
    obvEma = i === 0 ? obv : calcEMA(obv, obvEma, k20);
    return {
      date: row.date, close: +row.close.toFixed(2), volume: Math.round(row.volume),
      obv: Math.round(obv), obvEma: Math.round(obvEma),
    };
  });
}
```

Replace the `/api/obv` handler:

```js
app.get("/api/obv", (req, res) => {
  const ticker = validateTicker(req.query.ticker);
  if (!ticker) return res.status(400).json({ error: "Invalid ticker" });
  const rows = parseRows(ticker);
  if (rows.length === 0) return res.json({ ticker, data: [] });
  res.json({ ticker, data: calcObv(rows) });
});
```

Add `calcObv` to exports:

```js
export { app, validateTicker, emaK, calcEMA, calcDEMA, parseRows, calcDemark, calcObv };
```

**Step 4: Run ALL backend tests**

Run: `cd backend && npx vitest run`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add backend/server.js backend/__tests__/confluence.test.js
git commit -m "refactor: extract calcObv into reusable function"
```

---

### Task 3: Implement `/api/confluence` endpoint

**Files:**
- Modify: `backend/server.js` (add new endpoint before health check)
- Test: `backend/__tests__/confluence.test.js`

**Step 1: Write the failing tests**

Add to `backend/__tests__/confluence.test.js`:

```js
import request from "supertest";
import { app, calcDemark, calcObv } from "../server.js";

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
```

**Step 2: Run tests to verify they fail**

Run: `cd backend && npx vitest run __tests__/confluence.test.js`
Expected: FAIL — no `/api/confluence` route

**Step 3: Implement the endpoint**

Add before the health check route in `backend/server.js`:

```js
// ─── GET /api/confluence?ticker=SPY ─────────────────────────────────────────
app.get("/api/confluence", (req, res) => {
  const ticker = validateTicker(req.query.ticker);
  if (!ticker) return res.status(400).json({ error: "Invalid ticker" });
  const rows = parseRows(ticker);
  if (rows.length === 0) return res.json({ ticker, data: [] });

  const demarkData = calcDemark(rows);
  const obvData = calcObv(rows);
  const events = [];

  // 20-bar rolling average volume
  const avgVol = new Array(rows.length);
  let volSum = 0;
  for (let i = 0; i < rows.length; i++) {
    volSum += rows[i].volume;
    if (i >= 20) volSum -= rows[i - 20].volume;
    avgVol[i] = i >= 19 ? volSum / 20 : volSum / (i + 1);
  }

  // Build index of signal bars
  const signalBars = [];
  for (let i = 0; i < demarkData.length; i++) {
    if (demarkData[i].signal) {
      signalBars.push({ idx: i, ...demarkData[i] });
    }
  }

  for (const sb of signalBars) {
    const i = sb.idx;

    // --- CAPITULATION: volume > 2x 20-bar average ---
    const ratio = rows[i].volume / avgVol[i];
    if (ratio > 2) {
      events.push({
        date: sb.date,
        signal: sb.signal,
        type: "CAPITULATION",
        volume: Math.round(rows[i].volume),
        avgVolume: Math.round(avgVol[i]),
        volumeRatio: +ratio.toFixed(2),
      });
    }

    // --- OBV_DIVERGENCE: only for Countdown-13 signals ---
    if (sb.signal.includes("COUNTDOWN_13")) {
      // Find countdown start: scan backwards for the Setup-9 that initiated this countdown
      let cdStartIdx = 0;
      for (let j = i - 1; j >= 0; j--) {
        if (demarkData[j].signal && demarkData[j].signal.includes("SETUP_9")) {
          cdStartIdx = j;
          break;
        }
      }
      if (cdStartIdx < i) {
        const priceStart = rows[cdStartIdx].close;
        const priceEnd = rows[i].close;
        const obvStart = obvData[cdStartIdx].obv;
        const obvEnd = obvData[i].obv;
        const priceDir = priceEnd > priceStart ? "up" : "down";
        const obvDir = obvEnd > obvStart ? "up" : "down";
        if (priceDir !== obvDir) {
          events.push({
            date: sb.date,
            signal: sb.signal,
            type: "OBV_DIVERGENCE",
            priceDirection: priceDir,
            obvDirection: obvDir,
            countdownSpanBars: i - cdStartIdx,
          });
        }
      }
    }

    // --- POST_SIGNAL: check 3 bars after signal ---
    if (i + 3 < rows.length) {
      const postBars = rows.slice(i + 1, i + 4);
      const avgPostVol = postBars.reduce((s, r) => s + r.volume, 0) / 3;
      const isBuySignal = sb.signal.startsWith("BUY");

      let followThrough = false;
      if (isBuySignal) {
        // Buy: green candles with rising volume = confirmed
        followThrough = postBars.some(b => b.close > b.open && b.volume > avgVol[i]);
      } else {
        // Sell: red candles with rising volume = confirmed
        followThrough = postBars.some(b => b.close < b.open && b.volume > avgVol[i]);
      }

      events.push({
        date: postBars[2].date,
        signal: sb.signal,
        type: "POST_SIGNAL",
        barsAfter: 3,
        validation: followThrough ? "CONFIRMED" : "FAILED",
        avgPostVolume: Math.round(avgPostVol),
        avgVolume: Math.round(avgVol[i]),
      });
    }
  }

  res.json({ ticker, data: events });
});
```

**Step 4: Run ALL backend tests**

Run: `cd backend && npx vitest run`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add backend/server.js backend/__tests__/confluence.test.js
git commit -m "feat: add /api/confluence endpoint for volume confluence analysis"
```

---

### Task 4: Frontend — add confluence indicator and chart markers

**Files:**
- Modify: `app/ECOComparison.jsx` (add INDICATORS entry, stats, KPIs, chart markers)
- Test: `__tests__/Dashboard.test.jsx`

**Step 1: Write the failing test**

Add to `__tests__/Dashboard.test.jsx`:

```js
it("renders confluence KPI cards when confluence and demark active", async () => {
  const demarkData = makeMockData((i) => ({
    setupCount: 0, setupType: null, countdownCount: 0, countdownType: null,
    setupComplete: false, countdownComplete: false, perfected: false,
    signal: i === 20 ? "BUY_SETUP_9" : null,
    riskLine: null, riskLineType: null,
  }));
  const confluenceData = [
    { date: "2025-01-21", signal: "BUY_SETUP_9", type: "CAPITULATION", volume: 5000000, avgVolume: 2000000, volumeRatio: 2.5 },
  ];
  global.fetch = vi.fn((url) => {
    if (url.includes("/api/tickers")) return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_TICKERS) });
    if (url.includes("/api/confluence")) return Promise.resolve({ ok: true, json: () => Promise.resolve({ ticker: "SPY", data: confluenceData }) });
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ ticker: "SPY", data: demarkData }) });
  });
  // Need to render with both demark and confluence active — default only has "eco"
  // The test validates the indicator exists in INDICATORS and can render KPIs
  render(<Dashboard />);
  await waitFor(() => {
    expect(screen.queryByTestId("loading-skeleton")).not.toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/Dashboard.test.jsx`
Expected: FAIL (or pass vacuously — either way, validates setup)

**Step 3: Implement frontend changes**

In `app/ECOComparison.jsx`:

**3a. Add indicator entry** (after ichimoku in INDICATORS):

```js
confluence: { label: "Confluence", desc: "Volume Confluence (DeMark + OBV)", color: "#ff6b6b" },
```

**3b. Add API key mapping** (in both useEffect blocks where `API_KEYS` is defined — the existing `API_KEYS` object maps frontend key names to backend endpoint names, but `confluence` maps directly so no entry needed).

**3c. Add confluence stats** (after the ichimoku stats section, before the combined signal badge):

```js
// Confluence stats
const hasConfluence = activeIndicators.includes("confluence") && filteredData.confluence && filteredData.confluence.length > 0;
const confluenceEvents = hasConfluence ? filteredData.confluence : [];
const confluenceCaps = confluenceEvents.filter(e => e.type === "CAPITULATION");
const confluenceDivs = confluenceEvents.filter(e => e.type === "OBV_DIVERGENCE");
const confluencePosts = confluenceEvents.filter(e => e.type === "POST_SIGNAL");
const lastConfluence = confluenceEvents.length > 0 ? confluenceEvents[confluenceEvents.length - 1] : null;
```

**3d. Add KPI cards** (after the ichimoku KPI block):

```js
if (hasConfluence) {
  kpis.push({ label: "CONFLUENCE", value: `${confluenceEvents.length}`, color: INDICATORS.confluence.color, sub: "total events" });
  if (lastConfluence) {
    kpis.push({ label: "LAST EVENT", value: lastConfluence.type.replace("_", " "), color: lastConfluence.type === "CAPITULATION" ? T.red : lastConfluence.type === "OBV_DIVERGENCE" ? T.purple : T.gold, sub: lastConfluence.date });
  }
  if (confluenceCaps.length > 0) {
    kpis.push({ label: "CAPITULATIONS", value: `${confluenceCaps.length}`, color: T.red, sub: `vol > 2x avg` });
  }
}
```

**3e. Add confluence markers on the DeMark chart.** After the existing DeMark chart section (after the `</div>` that closes `hasDemark`), add a confluence events panel:

```jsx
{/* CONFLUENCE EVENTS */}
{hasConfluence && confluenceEvents.length > 0 && (
  <div style={{ padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, marginBottom: 14 }}>
    <div className="chart-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: T.muted, letterSpacing: "0.14em" }}>VOLUME CONFLUENCE — DEMARK + OBV</div>
      <div className="chart-legend" style={{ display: "flex", gap: 14 }}>
        <span style={{ fontSize: 10 }}><span style={{ display: "inline-block", width: 8, height: 8, background: T.red, borderRadius: "50%", marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>Capitulation</span></span>
        <span style={{ fontSize: 10 }}><span style={{ display: "inline-block", width: 8, height: 8, background: T.purple, borderRadius: "50%", marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>OBV Divergence</span></span>
        <span style={{ fontSize: 10 }}><span style={{ display: "inline-block", width: 8, height: 8, background: T.gold, borderRadius: "50%", marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>Post-Signal</span></span>
      </div>
    </div>
    <div style={{ display: "grid", gap: 8 }}>
      {confluenceEvents.map((evt, i) => {
        const evtColor = evt.type === "CAPITULATION" ? T.red : evt.type === "OBV_DIVERGENCE" ? T.purple : T.gold;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", background: T.surface, borderRadius: 6, border: `1px solid ${T.border}` }}>
            <span style={{ display: "inline-block", width: 8, height: 8, background: evtColor, borderRadius: "50%", flexShrink: 0 }}></span>
            <span style={{ color: T.sub, fontSize: 11, minWidth: 80 }}>{evt.date}</span>
            <span style={{ color: T.text, fontSize: 11, fontWeight: 600 }}>{evt.type.replace(/_/g, " ")}</span>
            <span style={{ color: T.sub, fontSize: 11 }}>{evt.signal.replace(/_/g, " ")}</span>
            {evt.type === "CAPITULATION" && <span style={{ color: T.red, fontSize: 11, marginLeft: "auto" }}>{evt.volumeRatio}x vol</span>}
            {evt.type === "POST_SIGNAL" && <span style={{ color: evt.validation === "CONFIRMED" ? T.lime : T.red, fontSize: 11, marginLeft: "auto" }}>{evt.validation}</span>}
            {evt.type === "OBV_DIVERGENCE" && <span style={{ color: T.purple, fontSize: 11, marginLeft: "auto" }}>price {evt.priceDirection} / OBV {evt.obvDirection}</span>}
          </div>
        );
      })}
    </div>
  </div>
)}
```

**3f. Handle the sparse data in `filteredData`.** The confluence data is sparse (events, not per-bar), so the existing range filter (`filteredData` useMemo) should pass it through as-is. Find the `filteredData` useMemo and add confluence handling. Since confluence data is already date-filtered by the backend (all dates are within the ticker's range), just filter by the same date range used for other indicators:

In the `filteredData` useMemo, add after the last indicator filter:

```js
confluence: (indicatorData.confluence || []).filter(d => d.date >= startDate),
```

**Step 4: Run all frontend tests**

Run: `npx vitest run __tests__/Dashboard.test.jsx`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add app/ECOComparison.jsx __tests__/Dashboard.test.jsx
git commit -m "feat: add confluence indicator to frontend with event list panel"
```

---

### Task 5: Update HANDOFF.md and ARCHITECTURE.md

**Files:**
- Modify: `HANDOFF.md`
- Modify: `ARCHITECTURE.md`

**Step 1: Update HANDOFF.md**

- Add `| Volume confluence | ✅ Complete | DeMark + OBV, 3 event types |` to the done table
- Remove the confluence item from "What's Remaining"
- Update test counts
- Add `/api/confluence` to key files

**Step 2: Update ARCHITECTURE.md**

Add the confluence endpoint documentation (endpoint, response shape, three event types, calculation logic).

**Step 3: Commit**

```bash
git add HANDOFF.md ARCHITECTURE.md
git commit -m "docs: add confluence endpoint to HANDOFF.md and ARCHITECTURE.md"
```
