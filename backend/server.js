import express from "express";
import cors from "cors";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());

// ─── ECO Math ─────────────────────────────────────────────────────────────────
const emaK = (n) => 2 / (n + 1);
function calcEMA(val, prev, k) { return val * k + prev * (1 - k); }
function calcDEMA(val, ema1, ema2, k) {
  const newEma1 = calcEMA(val, ema1, k);
  const newEma2 = calcEMA(newEma1, ema2, k);
  return { ema1: newEma1, ema2: newEma2, dema: 2 * newEma1 - newEma2 };
}

// ─── Load CSV once at startup ─────────────────────────────────────────────────
const csvPath = join(__dirname, "data", "sp500spy_prices.csv");
let csvLines;
try {
  csvLines = readFileSync(csvPath, "utf-8").trim().split("\n");
} catch (err) {
  console.error(`Failed to load CSV: ${csvPath}`);
  console.error(err.message);
  process.exit(1);
}

function parseRows(ticker) {
  const rows = [];
  for (let i = 1; i < csvLines.length; i++) {
    const cols = csvLines[i].split(",");
    if (cols[1] !== ticker) continue;
    rows.push({
      date: cols[0],
      open: parseFloat(cols[2]),
      high: parseFloat(cols[3]),
      low: parseFloat(cols[4]),
      close: parseFloat(cols[5]),
      volume: parseFloat(cols[7]),
    });
  }
  rows.sort((a, b) => a.date.localeCompare(b.date));
  return rows;
}

// ─── GET /api/tickers ─────────────────────────────────────────────────────────
app.get("/api/tickers", (req, res) => {
  const tickers = new Set();
  for (let i = 1; i < csvLines.length; i++) {
    tickers.add(csvLines[i].split(",")[1]);
  }
  res.json([...tickers].sort());
});

// ─── Ticker validation ────────────────────────────────────────────────────────
function validateTicker(raw) {
  const ticker = (raw || "SPY").toUpperCase();
  if (!/^[A-Z0-9.]{1,10}$/.test(ticker)) return null;
  return ticker;
}

// ─── GET /api/eco?ticker=SPY ──────────────────────────────────────────────────
app.get("/api/eco", (req, res) => {
  const ticker = validateTicker(req.query.ticker);
  if (!ticker) return res.status(400).json({ error: "Invalid ticker" });
  const rows = parseRows(ticker);

  if (rows.length === 0) {
    return res.json({ ticker, data: [] });
  }

  const k25 = emaK(25), k13 = emaK(13), k8 = emaK(8);
  const avgVol = rows.reduce((s, r) => s + r.volume, 0) / rows.length;

  const first = rows[0];
  const initChange = (first.close - first.open) * (first.volume / avgVol);
  const initRange = Math.max(first.high - first.low, 0.001);

  let d25c = { ema1: initChange, ema2: initChange };
  let d25r = { ema1: initRange, ema2: initRange };
  let d13n = { ema1: initChange, ema2: initChange };
  let d13d = { ema1: initRange, ema2: initRange };
  let sigState = 0;

  const data = rows.map((row) => {
    const volNorm = row.volume / avgVol;
    const change = (row.close - row.open) * volNorm;
    const range = Math.max(row.high - row.low, 0.001);

    const dc = calcDEMA(change, d25c.ema1, d25c.ema2, k25);
    d25c = { ema1: dc.ema1, ema2: dc.ema2 };

    const dr = calcDEMA(range, d25r.ema1, d25r.ema2, k25);
    d25r = { ema1: dr.ema1, ema2: dr.ema2 };

    const dn = calcDEMA(dc.dema, d13n.ema1, d13n.ema2, k13);
    d13n = { ema1: dn.ema1, ema2: dn.ema2 };

    const dd = calcDEMA(dr.dema, d13d.ema1, d13d.ema2, k13);
    d13d = { ema1: dd.ema1, ema2: dd.ema2 };

    const eco = (dn.dema / Math.max(Math.abs(dd.dema), 0.0001)) * 100;
    sigState = calcEMA(eco, sigState, k8);

    return {
      date: row.date,
      close: +row.close.toFixed(2),
      volume: Math.round(row.volume),
      eco: +eco.toFixed(4),
      signal: +sigState.toFixed(4),
      histogram: +(eco - sigState).toFixed(4),
    };
  });

  res.json({ ticker, data });
});

// ─── GET /api/obv?ticker=SPY ──────────────────────────────────────────────────
app.get("/api/obv", (req, res) => {
  const ticker = validateTicker(req.query.ticker);
  if (!ticker) return res.status(400).json({ error: "Invalid ticker" });
  const rows = parseRows(ticker);

  if (rows.length === 0) {
    return res.json({ ticker, data: [] });
  }

  let obv = 0;
  const k20 = emaK(20);
  let obvEma = 0;

  const data = rows.map((row, i) => {
    if (i === 0) {
      obv = 0;
    } else {
      const prevClose = rows[i - 1].close;
      if (row.close > prevClose) obv += row.volume;
      else if (row.close < prevClose) obv -= row.volume;
      // equal: obv unchanged
    }

    obvEma = i === 0 ? obv : calcEMA(obv, obvEma, k20);

    return {
      date: row.date,
      close: +row.close.toFixed(2),
      volume: Math.round(row.volume),
      obv: Math.round(obv),
      obvEma: Math.round(obvEma),
    };
  });

  res.json({ ticker, data });
});

// ─── TD Risk Line ────────────────────────────────────────────────────────────
function calcRiskLine(rows, seqBars, type) {
  if (!seqBars.length) return null;

  // Find the extreme candle in the sequence
  let extremeBar = seqBars[0];
  for (const b of seqBars) {
    if (type === "buy" && b.low < extremeBar.low) extremeBar = b;
    if (type === "sell" && b.high > extremeBar.high) extremeBar = b;
  }

  // True Range of the extreme candle
  const prevClose = extremeBar.idx > 0 ? rows[extremeBar.idx - 1].close : extremeBar.low;
  const tr = Math.max(
    extremeBar.high - extremeBar.low,
    Math.abs(extremeBar.high - prevClose),
    Math.abs(prevClose - extremeBar.low)
  );

  // Risk line
  if (type === "buy") {
    return { value: extremeBar.low - tr, type: "buy" };
  } else {
    return { value: extremeBar.high + tr, type: "sell" };
  }
}

// ─── GET /api/demark?ticker=SPY ───────────────────────────────────────────────
app.get("/api/demark", (req, res) => {
  const ticker = validateTicker(req.query.ticker);
  if (!ticker) return res.status(400).json({ error: "Invalid ticker" });
  const rows = parseRows(ticker);

  if (rows.length === 0) {
    return res.json({ ticker, data: [] });
  }

  let setupCount = 0;   // positive = sell setup, negative = buy setup
  let setupType = null;  // "buy" | "sell" | null
  let countdownCount = 0;
  let countdownType = null;
  let countdownActive = false;

  // Store recent setup bar data for perfection check
  let setupBars = [];
  // Track bar indices for setup/countdown sequences (for risk line)
  let setupStartIdx = -1;
  let countdownStartIdx = -1;

  // Active risk line — persists until next signal or invalidation
  let activeRiskLine = null; // { value, type: "buy"|"sell" }

  const data = rows.map((row, i) => {
    let setupComplete = false;
    let countdownComplete = false;
    let perfected = false;
    let signal = null;

    if (i < 4) {
      return {
        date: row.date, close: +row.close.toFixed(2), volume: Math.round(row.volume),
        setupCount: 0, setupType: null, countdownCount: 0, countdownType: null,
        setupComplete: false, countdownComplete: false, perfected: false, signal: null,
        riskLine: null,
      };
    }

    const cmp = rows[i - 4].close;

    // --- TD Setup ---
    if (row.close < cmp) {
      // Buy setup bar (bearish exhaustion — close < close[4 bars ago])
      if (setupType === "buy") {
        setupCount++;
      } else {
        setupType = "buy";
        setupCount = 1;
        setupBars = [];
        setupStartIdx = i;
      }
      setupBars.push({ high: row.high, low: row.low, idx: i });
    } else if (row.close > cmp) {
      // Sell setup bar (bullish exhaustion — close > close[4 bars ago])
      if (setupType === "sell") {
        setupCount++;
      } else {
        setupType = "sell";
        setupCount = 1;
        setupBars = [];
        setupStartIdx = i;
      }
      setupBars.push({ high: row.high, low: row.low, idx: i });
    } else {
      // Equal — reset setup
      setupCount = 0;
      setupType = null;
      setupBars = [];
    }

    // Check setup completion at 9
    if (setupCount === 9) {
      setupComplete = true;

      // Perfection check
      if (setupBars.length >= 9) {
        const b6 = setupBars[5], b7 = setupBars[6], b8 = setupBars[7], b9 = setupBars[8];
        if (setupType === "buy") {
          perfected = (b8.low < b6.low && b8.low < b7.low) || (b9.low < b6.low && b9.low < b7.low);
        } else {
          perfected = (b8.high > b6.high && b8.high > b7.high) || (b9.high > b6.high && b9.high > b7.high);
        }
      }

      signal = setupType === "buy" ? "BUY_SETUP_9" : "SELL_SETUP_9";

      // TD Risk Line for setup-9
      activeRiskLine = calcRiskLine(rows, setupBars, setupType);

      // Start countdown
      countdownActive = true;
      countdownType = setupType;
      countdownCount = 0;
      countdownStartIdx = i;

      // Reset setup
      setupCount = 0;
      setupType = null;
      setupBars = [];
    }

    // --- TD Countdown (non-consecutive) ---
    if (countdownActive && i >= 2) {
      if (countdownType === "buy" && row.close <= rows[i - 2].low) {
        countdownCount++;
      } else if (countdownType === "sell" && row.close >= rows[i - 2].high) {
        countdownCount++;
      }

      if (countdownCount === 13) {
        countdownComplete = true;
        signal = countdownType === "buy" ? "BUY_COUNTDOWN_13" : "SELL_COUNTDOWN_13";

        // TD Risk Line for countdown-13: use all bars from countdown start
        const cdBars = [];
        for (let j = countdownStartIdx; j <= i; j++) {
          cdBars.push({ high: rows[j].high, low: rows[j].low, idx: j });
        }
        activeRiskLine = calcRiskLine(rows, cdBars, countdownType);

        countdownActive = false;
        countdownCount = 0;
        countdownType = null;
      }

      // Invalidation: opposite setup completing cancels countdown
      if (setupComplete && setupType !== countdownType) {
        countdownActive = false;
        countdownCount = 0;
        countdownType = null;
      }
    }

    // Check if risk line is breached on close — invalidate
    if (activeRiskLine) {
      if (activeRiskLine.type === "buy" && row.close < activeRiskLine.value) {
        activeRiskLine = null;
      } else if (activeRiskLine.type === "sell" && row.close > activeRiskLine.value) {
        activeRiskLine = null;
      }
    }

    return {
      date: row.date,
      close: +row.close.toFixed(2),
      volume: Math.round(row.volume),
      setupCount: setupType === "buy" ? -setupCount : setupCount,
      setupType,
      countdownCount: countdownActive ? countdownCount : 0,
      countdownType: countdownActive ? countdownType : null,
      setupComplete,
      countdownComplete,
      perfected,
      signal,
      riskLine: activeRiskLine ? +activeRiskLine.value.toFixed(2) : null,
      riskLineType: activeRiskLine ? activeRiskLine.type : null,
    };
  });

  res.json({ ticker, data });
});

// ─── GET /api/rsi?ticker=SPY ──────────────────────────────────────────────────
app.get("/api/rsi", (req, res) => {
  const ticker = validateTicker(req.query.ticker);
  if (!ticker) return res.status(400).json({ error: "Invalid ticker" });
  const rows = parseRows(ticker);
  if (rows.length === 0) return res.json({ ticker, data: [] });

  const period = 14;
  let avgGain = 0, avgLoss = 0;

  const data = rows.map((row, i) => {
    if (i === 0) return { date: row.date, close: +row.close.toFixed(2), volume: Math.round(row.volume), rsi: 50 };

    const change = row.close - rows[i - 1].close;
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);

    if (i <= period) {
      avgGain += gain / period;
      avgLoss += loss / period;
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = i < period ? 50 : 100 - (100 / (1 + rs));

    return { date: row.date, close: +row.close.toFixed(2), volume: Math.round(row.volume), rsi: +rsi.toFixed(2) };
  });

  res.json({ ticker, data });
});

// ─── GET /api/macd?ticker=SPY ─────────────────────────────────────────────────
app.get("/api/macd", (req, res) => {
  const ticker = validateTicker(req.query.ticker);
  if (!ticker) return res.status(400).json({ error: "Invalid ticker" });
  const rows = parseRows(ticker);
  if (rows.length === 0) return res.json({ ticker, data: [] });

  const k12 = emaK(12), k26 = emaK(26), k9 = emaK(9);
  let ema12 = rows[0].close, ema26 = rows[0].close, signalLine = 0;

  const data = rows.map((row, i) => {
    ema12 = i === 0 ? row.close : calcEMA(row.close, ema12, k12);
    ema26 = i === 0 ? row.close : calcEMA(row.close, ema26, k26);
    const macd = ema12 - ema26;
    signalLine = i === 0 ? macd : calcEMA(macd, signalLine, k9);
    const histogram = macd - signalLine;

    return {
      date: row.date, close: +row.close.toFixed(2), volume: Math.round(row.volume),
      macd: +macd.toFixed(4), signal: +signalLine.toFixed(4), histogram: +histogram.toFixed(4),
    };
  });

  res.json({ ticker, data });
});

// ─── GET /api/bollinger?ticker=SPY ────────────────────────────────────────────
app.get("/api/bollinger", (req, res) => {
  const ticker = validateTicker(req.query.ticker);
  if (!ticker) return res.status(400).json({ error: "Invalid ticker" });
  const rows = parseRows(ticker);
  if (rows.length === 0) return res.json({ ticker, data: [] });

  const period = 20, mult = 2;

  const data = rows.map((row, i) => {
    if (i < period - 1) {
      return { date: row.date, close: +row.close.toFixed(2), volume: Math.round(row.volume), upper: null, middle: null, lower: null };
    }

    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += rows[j].close;
    const sma = sum / period;

    let sqSum = 0;
    for (let j = i - period + 1; j <= i; j++) sqSum += (rows[j].close - sma) ** 2;
    const stdDev = Math.sqrt(sqSum / period);

    return {
      date: row.date, close: +row.close.toFixed(2), volume: Math.round(row.volume),
      upper: +(sma + mult * stdDev).toFixed(2),
      middle: +sma.toFixed(2),
      lower: +(sma - mult * stdDev).toFixed(2),
    };
  });

  res.json({ ticker, data });
});

// ─── GET /api/atr?ticker=SPY ──────────────────────────────────────────────────
app.get("/api/atr", (req, res) => {
  const ticker = validateTicker(req.query.ticker);
  if (!ticker) return res.status(400).json({ error: "Invalid ticker" });
  const rows = parseRows(ticker);
  if (rows.length === 0) return res.json({ ticker, data: [] });

  const period = 14;
  let atr = 0;

  const data = rows.map((row, i) => {
    const prevClose = i === 0 ? row.close : rows[i - 1].close;
    const tr = Math.max(row.high - row.low, Math.abs(row.high - prevClose), Math.abs(row.low - prevClose));

    if (i < period) {
      atr += tr / period;
    } else {
      atr = (atr * (period - 1) + tr) / period;
    }

    return {
      date: row.date, close: +row.close.toFixed(2), volume: Math.round(row.volume),
      tr: +tr.toFixed(4), atr: i < period - 1 ? null : +atr.toFixed(4),
    };
  });

  res.json({ ticker, data });
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", tickers: csvLines.length - 1 });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`ECO API running on port ${PORT}`);
});
