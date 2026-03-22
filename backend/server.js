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

const parseCache = new Map();

function parseRows(ticker) {
  if (parseCache.has(ticker)) return parseCache.get(ticker);
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
  parseCache.set(ticker, rows);
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

// ─── calcEco — reusable ECO calculation ──────────────────────────────────────
function calcEco(rows) {
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

  return data;
}

// ─── GET /api/eco?ticker=SPY ──────────────────────────────────────────────────
app.get("/api/eco", (req, res) => {
  const ticker = validateTicker(req.query.ticker);
  if (!ticker) return res.status(400).json({ error: "Invalid ticker" });
  const rows = parseRows(ticker);
  if (rows.length === 0) return res.json({ ticker, data: [] });
  res.json({ ticker, data: calcEco(rows) });
});

// ─── calcObv — reusable OBV calculation ──────────────────────────────────────
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
}

// ─── GET /api/obv?ticker=SPY ──────────────────────────────────────────────────
app.get("/api/obv", (req, res) => {
  const ticker = validateTicker(req.query.ticker);
  if (!ticker) return res.status(400).json({ error: "Invalid ticker" });
  const rows = parseRows(ticker);
  if (rows.length === 0) return res.json({ ticker, data: [] });
  res.json({ ticker, data: calcObv(rows) });
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

// ─── calcDemark — reusable DeMark calculation ───────────────────────────────
function calcDemark(rows) {
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
        riskLine: null,
        riskLineType: null,
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
}

// ─── GET /api/demark?ticker=SPY ───────────────────────────────────────────────
app.get("/api/demark", (req, res) => {
  const ticker = validateTicker(req.query.ticker);
  if (!ticker) return res.status(400).json({ error: "Invalid ticker" });
  const rows = parseRows(ticker);
  if (rows.length === 0) return res.json({ ticker, data: [] });
  res.json({ ticker, data: calcDemark(rows) });
});

// ─── calcRsi — reusable RSI calculation ──────────────────────────────────────
function calcRsi(rows) {
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

  return data;
}

// ─── GET /api/rsi?ticker=SPY ──────────────────────────────────────────────────
app.get("/api/rsi", (req, res) => {
  const ticker = validateTicker(req.query.ticker);
  if (!ticker) return res.status(400).json({ error: "Invalid ticker" });
  const rows = parseRows(ticker);
  if (rows.length === 0) return res.json({ ticker, data: [] });
  res.json({ ticker, data: calcRsi(rows) });
});

// ─── calcMacd — reusable MACD calculation ────────────────────────────────────
function calcMacd(rows) {
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

  return data;
}

// ─── GET /api/macd?ticker=SPY ─────────────────────────────────────────────────
app.get("/api/macd", (req, res) => {
  const ticker = validateTicker(req.query.ticker);
  if (!ticker) return res.status(400).json({ error: "Invalid ticker" });
  const rows = parseRows(ticker);
  if (rows.length === 0) return res.json({ ticker, data: [] });
  res.json({ ticker, data: calcMacd(rows) });
});

// ─── calcBollinger — reusable Bollinger calculation ──────────────────────────
function calcBollinger(rows) {
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

  return data;
}

// ─── GET /api/bollinger?ticker=SPY ────────────────────────────────────────────
app.get("/api/bollinger", (req, res) => {
  const ticker = validateTicker(req.query.ticker);
  if (!ticker) return res.status(400).json({ error: "Invalid ticker" });
  const rows = parseRows(ticker);
  if (rows.length === 0) return res.json({ ticker, data: [] });
  res.json({ ticker, data: calcBollinger(rows) });
});

// ─── calcAtr — reusable ATR calculation ──────────────────────────────────────
function calcAtr(rows) {
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

  return data;
}

// ─── GET /api/atr?ticker=SPY ──────────────────────────────────────────────────
app.get("/api/atr", (req, res) => {
  const ticker = validateTicker(req.query.ticker);
  if (!ticker) return res.status(400).json({ error: "Invalid ticker" });
  const rows = parseRows(ticker);
  if (rows.length === 0) return res.json({ ticker, data: [] });
  res.json({ ticker, data: calcAtr(rows) });
});

// ─── calcAdx — reusable ADX calculation ──────────────────────────────────────
function calcAdx(rows) {
  const period = 14;
  let smoothedPlusDM = 0, smoothedMinusDM = 0, smoothedTR = 0, adx = 0;

  const data = rows.map((row, i) => {
    if (i === 0) {
      return { date: row.date, close: +row.close.toFixed(2), volume: Math.round(row.volume), adx: null, plusDI: null, minusDI: null };
    }

    const prevRow = rows[i - 1];
    const tr = Math.max(row.high - row.low, Math.abs(row.high - prevRow.close), Math.abs(row.low - prevRow.close));
    const upMove = row.high - prevRow.high;
    const downMove = prevRow.low - row.low;
    const plusDM = (upMove > downMove && upMove > 0) ? upMove : 0;
    const minusDM = (downMove > upMove && downMove > 0) ? downMove : 0;

    if (i <= period) {
      smoothedTR += tr;
      smoothedPlusDM += plusDM;
      smoothedMinusDM += minusDM;

      if (i < period) {
        return { date: row.date, close: +row.close.toFixed(2), volume: Math.round(row.volume), adx: null, plusDI: null, minusDI: null };
      }
    } else {
      smoothedTR = smoothedTR - smoothedTR / period + tr;
      smoothedPlusDM = smoothedPlusDM - smoothedPlusDM / period + plusDM;
      smoothedMinusDM = smoothedMinusDM - smoothedMinusDM / period + minusDM;
    }

    const plusDI = (smoothedPlusDM / smoothedTR) * 100;
    const minusDI = (smoothedMinusDM / smoothedTR) * 100;
    const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;

    if (i === period) {
      adx = dx;
    } else if (i > period) {
      adx = (adx * (period - 1) + dx) / period;
    }

    return {
      date: row.date, close: +row.close.toFixed(2), volume: Math.round(row.volume),
      adx: i < period ? null : +adx.toFixed(2),
      plusDI: +plusDI.toFixed(2),
      minusDI: +minusDI.toFixed(2),
    };
  });

  return data;
}

// ─── GET /api/adx?ticker=SPY ──────────────────────────────────────────────────
app.get("/api/adx", (req, res) => {
  const ticker = validateTicker(req.query.ticker);
  if (!ticker) return res.status(400).json({ error: "Invalid ticker" });
  const rows = parseRows(ticker);
  if (rows.length === 0) return res.json({ ticker, data: [] });
  res.json({ ticker, data: calcAdx(rows) });
});

// ─── calcCci — reusable CCI calculation ──────────────────────────────────────
function calcCci(rows) {
  const period = 20;

  const data = rows.map((row, i) => {
    const tp = (row.high + row.low + row.close) / 3;

    if (i < period - 1) {
      return { date: row.date, close: +row.close.toFixed(2), volume: Math.round(row.volume), cci: null };
    }

    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += (rows[j].high + rows[j].low + rows[j].close) / 3;
    const sma = sum / period;

    let meanDev = 0;
    for (let j = i - period + 1; j <= i; j++) meanDev += Math.abs((rows[j].high + rows[j].low + rows[j].close) / 3 - sma);
    meanDev /= period;

    const cci = meanDev === 0 ? 0 : (tp - sma) / (0.015 * meanDev);

    return { date: row.date, close: +row.close.toFixed(2), volume: Math.round(row.volume), cci: +cci.toFixed(2) };
  });

  return data;
}

// ─── GET /api/cci?ticker=SPY ──────────────────────────────────────────────────
app.get("/api/cci", (req, res) => {
  const ticker = validateTicker(req.query.ticker);
  if (!ticker) return res.status(400).json({ error: "Invalid ticker" });
  const rows = parseRows(ticker);
  if (rows.length === 0) return res.json({ ticker, data: [] });
  res.json({ ticker, data: calcCci(rows) });
});

// ─── calcRoc — reusable ROC calculation ──────────────────────────────────────
function calcRoc(rows) {
  const period = 12;

  const data = rows.map((row, i) => {
    if (i < period) {
      return { date: row.date, close: +row.close.toFixed(2), volume: Math.round(row.volume), roc: null };
    }

    const roc = ((row.close - rows[i - period].close) / rows[i - period].close) * 100;

    return { date: row.date, close: +row.close.toFixed(2), volume: Math.round(row.volume), roc: +roc.toFixed(4) };
  });

  return data;
}

// ─── GET /api/roc?ticker=SPY ──────────────────────────────────────────────────
app.get("/api/roc", (req, res) => {
  const ticker = validateTicker(req.query.ticker);
  if (!ticker) return res.status(400).json({ error: "Invalid ticker" });
  const rows = parseRows(ticker);
  if (rows.length === 0) return res.json({ ticker, data: [] });
  res.json({ ticker, data: calcRoc(rows) });
});

function calcWilliamsR(rows) {
  const period = 14;

  return rows.map((row, i) => {
    if (i < period - 1) {
      return { date: row.date, close: +row.close.toFixed(2), volume: Math.round(row.volume), williamsR: null };
    }

    let highestHigh = -Infinity, lowestLow = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (rows[j].high > highestHigh) highestHigh = rows[j].high;
      if (rows[j].low < lowestLow) lowestLow = rows[j].low;
    }

    const range = highestHigh - lowestLow;
    const wr = range === 0 ? -50 : ((highestHigh - row.close) / range) * -100;

    return { date: row.date, close: +row.close.toFixed(2), volume: Math.round(row.volume), williamsR: +wr.toFixed(2) };
  });
}

// ─── GET /api/williamsr?ticker=SPY ────────────────────────────────────────────
app.get("/api/williamsr", (req, res) => {
  const ticker = validateTicker(req.query.ticker);
  if (!ticker) return res.status(400).json({ error: "Invalid ticker" });
  const rows = parseRows(ticker);
  if (rows.length === 0) return res.json({ ticker, data: [] });
  res.json({ ticker, data: calcWilliamsR(rows) });
});

function calcStochRsi(rows) {
  const rsiPeriod = 14, stochPeriod = 14, kSmooth = 3, dSmooth = 3;

  // First compute RSI series
  let avgGain = 0, avgLoss = 0;
  const rsiValues = rows.map((row, i) => {
    if (i === 0) return 50;
    const change = row.close - rows[i - 1].close;
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);

    if (i <= rsiPeriod) {
      avgGain += gain / rsiPeriod;
      avgLoss += loss / rsiPeriod;
    } else {
      avgGain = (avgGain * (rsiPeriod - 1) + gain) / rsiPeriod;
      avgLoss = (avgLoss * (rsiPeriod - 1) + loss) / rsiPeriod;
    }

    if (i < rsiPeriod) return 50;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  });

  // Compute Stochastic RSI
  const kK = emaK(kSmooth), dK = emaK(dSmooth);
  let kEma = 0.5, dEma = 0.5;
  const minLookback = rsiPeriod + stochPeriod - 1;

  return rows.map((row, i) => {
    if (i < minLookback) {
      return { date: row.date, close: +row.close.toFixed(2), volume: Math.round(row.volume), stochRsi: null, k: null, d: null };
    }

    let minRsi = Infinity, maxRsi = -Infinity;
    for (let j = i - stochPeriod + 1; j <= i; j++) {
      if (rsiValues[j] < minRsi) minRsi = rsiValues[j];
      if (rsiValues[j] > maxRsi) maxRsi = rsiValues[j];
    }

    const range = maxRsi - minRsi;
    const stochRsi = range === 0 ? 0.5 : (rsiValues[i] - minRsi) / range;

    if (i === minLookback) {
      kEma = stochRsi;
      dEma = stochRsi;
    } else {
      kEma = calcEMA(stochRsi, kEma, kK);
      dEma = calcEMA(kEma, dEma, dK);
    }

    return {
      date: row.date, close: +row.close.toFixed(2), volume: Math.round(row.volume),
      stochRsi: +stochRsi.toFixed(4), k: +kEma.toFixed(4), d: +dEma.toFixed(4),
    };
  });
}

// ─── GET /api/stochrsi?ticker=SPY ─────────────────────────────────────────────
app.get("/api/stochrsi", (req, res) => {
  const ticker = validateTicker(req.query.ticker);
  if (!ticker) return res.status(400).json({ error: "Invalid ticker" });
  const rows = parseRows(ticker);
  if (rows.length === 0) return res.json({ ticker, data: [] });
  res.json({ ticker, data: calcStochRsi(rows) });
});

function calcIchimoku(rows) {
  function periodHL(start, end) {
    let high = -Infinity, low = Infinity;
    for (let j = Math.max(0, start); j <= end; j++) {
      if (rows[j].high > high) high = rows[j].high;
      if (rows[j].low < low) low = rows[j].low;
    }
    return (high + low) / 2;
  }

  // Pre-compute components
  const tenkan = [], kijun = [], spanA = [], spanB = [];
  for (let i = 0; i < rows.length; i++) {
    tenkan[i] = i < 8 ? null : periodHL(i - 8, i);
    kijun[i] = i < 25 ? null : periodHL(i - 25, i);
    spanA[i] = (tenkan[i] !== null && kijun[i] !== null) ? (tenkan[i] + kijun[i]) / 2 : null;
    spanB[i] = i < 51 ? null : periodHL(i - 51, i);
  }

  return rows.map((row, i) => {
    const chikouIdx = i + 26;

    return {
      date: row.date, close: +row.close.toFixed(2), volume: Math.round(row.volume),
      tenkan: tenkan[i] !== null ? +tenkan[i].toFixed(2) : null,
      kijun: kijun[i] !== null ? +kijun[i].toFixed(2) : null,
      senkouA: i >= 26 && spanA[i - 26] !== null ? +spanA[i - 26].toFixed(2) : null,
      senkouB: i >= 26 && spanB[i - 26] !== null ? +spanB[i - 26].toFixed(2) : null,
      chikou: chikouIdx < rows.length ? +rows[chikouIdx].close.toFixed(2) : null,
    };
  });
}

// ─── GET /api/ichimoku?ticker=SPY ─────────────────────────────────────────────
app.get("/api/ichimoku", (req, res) => {
  const ticker = validateTicker(req.query.ticker);
  if (!ticker) return res.status(400).json({ error: "Invalid ticker" });
  const rows = parseRows(ticker);
  if (rows.length === 0) return res.json({ ticker, data: [] });
  res.json({ ticker, data: calcIchimoku(rows) });
});

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
      const expectedSetup = sb.signal.includes("BUY") ? "BUY_SETUP_9" : "SELL_SETUP_9";
      let cdStartIdx = -1;
      for (let j = i - 1; j >= 0; j--) {
        if (demarkData[j].signal === expectedSetup) {
          cdStartIdx = j;
          break;
        }
      }
      if (cdStartIdx >= 0 && cdStartIdx < i) {
        const priceStart = rows[cdStartIdx].close;
        const priceEnd = rows[i].close;
        const obvStart = obvData[cdStartIdx].obv;
        const obvEnd = obvData[i].obv;
        if (priceStart === priceEnd || obvStart === obvEnd) { /* skip flat */ }
        else {
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
    }

    // --- POST_SIGNAL: check 3 bars after signal ---
    if (i + 3 < rows.length) {
      const postBars = rows.slice(i + 1, i + 4);
      const avgPostVol = postBars.reduce((s, r) => s + r.volume, 0) / 3;
      const isBuySignal = sb.signal.startsWith("BUY");

      let followThrough = false;
      if (isBuySignal) {
        followThrough = postBars.some(b => b.close > b.open && b.volume > avgVol[i]);
      } else {
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

// ─── Signal detection ────────────────────────────────────────────────────────
function detectSignals(rows) {
  const signals = [];
  const n = rows.length;
  const startIdx = Math.max(0, n - 10); // last 10 bars

  // ECO: crossover between eco and signal line
  const ecoData = calcEco(rows);
  for (let i = Math.max(startIdx, 1); i < n; i++) {
    const curr = ecoData[i], prev = ecoData[i-1];
    if (curr.eco !== null && prev.eco !== null && curr.signal !== null && prev.signal !== null) {
      if (curr.eco > curr.signal && prev.eco <= prev.signal) {
        signals.push({ date: curr.date, indicator: "eco", signal: "BULLISH_CROSSOVER", direction: "buy", value: +curr.eco.toFixed(2), details: "ECO crossed above signal" });
      }
      if (curr.eco < curr.signal && prev.eco >= prev.signal) {
        signals.push({ date: curr.date, indicator: "eco", signal: "BEARISH_CROSSOVER", direction: "sell", value: +curr.eco.toFixed(2), details: "ECO crossed below signal" });
      }
    }
  }

  // OBV: crossover between obv and obvEma
  const obvData = calcObv(rows);
  for (let i = Math.max(startIdx, 1); i < n; i++) {
    const curr = obvData[i], prev = obvData[i-1];
    if (curr.obv > curr.obvEma && prev.obv <= prev.obvEma) {
      signals.push({ date: curr.date, indicator: "obv", signal: "BULLISH_CROSSOVER", direction: "buy", value: curr.obv, details: "OBV crossed above EMA(20)" });
    }
    if (curr.obv < curr.obvEma && prev.obv >= prev.obvEma) {
      signals.push({ date: curr.date, indicator: "obv", signal: "BEARISH_CROSSOVER", direction: "sell", value: curr.obv, details: "OBV crossed below EMA(20)" });
    }
  }

  // DeMark: any non-null signal field
  const demarkData = calcDemark(rows);
  for (let i = startIdx; i < n; i++) {
    if (demarkData[i].signal) {
      const dir = demarkData[i].signal.startsWith("BUY") ? "buy" : "sell";
      signals.push({ date: demarkData[i].date, indicator: "demark", signal: demarkData[i].signal, direction: dir, value: demarkData[i].close, details: demarkData[i].signal.replace(/_/g, " ") });
    }
  }

  // RSI: crosses above 70 (overbought entry) or below 30 (oversold entry)
  const rsiData = calcRsi(rows);
  for (let i = Math.max(startIdx, 1); i < n; i++) {
    const curr = rsiData[i], prev = rsiData[i-1];
    if (curr.rsi > 70 && prev.rsi <= 70) {
      signals.push({ date: curr.date, indicator: "rsi", signal: "OVERBOUGHT_ENTRY", direction: "sell", value: +curr.rsi.toFixed(1), details: "RSI crossed above 70" });
    }
    if (curr.rsi < 30 && prev.rsi >= 30) {
      signals.push({ date: curr.date, indicator: "rsi", signal: "OVERSOLD_ENTRY", direction: "buy", value: +curr.rsi.toFixed(1), details: "RSI crossed below 30" });
    }
  }

  // MACD: crossover between macd and signal line
  const macdData = calcMacd(rows);
  for (let i = Math.max(startIdx, 1); i < n; i++) {
    const curr = macdData[i], prev = macdData[i-1];
    if (curr.macd > curr.signal && prev.macd <= prev.signal) {
      signals.push({ date: curr.date, indicator: "macd", signal: "BULLISH_CROSSOVER", direction: "buy", value: +curr.macd.toFixed(2), details: "MACD crossed above signal" });
    }
    if (curr.macd < curr.signal && prev.macd >= prev.signal) {
      signals.push({ date: curr.date, indicator: "macd", signal: "BEARISH_CROSSOVER", direction: "sell", value: +curr.macd.toFixed(2), details: "MACD crossed below signal" });
    }
  }

  // Bollinger: close crosses above upper or below lower
  const bbData = calcBollinger(rows);
  for (let i = Math.max(startIdx, 1); i < n; i++) {
    const curr = bbData[i], prev = bbData[i-1];
    if (curr.upper !== null && prev.upper !== null) {
      if (curr.close > curr.upper && prev.close <= prev.upper) {
        signals.push({ date: curr.date, indicator: "bollinger", signal: "UPPER_BREAK", direction: "sell", value: +curr.close.toFixed(2), details: "Close crossed above upper band" });
      }
      if (curr.close < curr.lower && prev.close >= prev.lower) {
        signals.push({ date: curr.date, indicator: "bollinger", signal: "LOWER_BREAK", direction: "buy", value: +curr.close.toFixed(2), details: "Close crossed below lower band" });
      }
    }
  }

  // ATR: volatility spike (atr > 2x its 20-bar average)
  const atrData = calcAtr(rows);
  for (let i = Math.max(startIdx, 1); i < n; i++) {
    if (atrData[i].atr !== null && i >= 20) {
      let atrSum = 0, atrCount = 0;
      for (let j = i - 20; j < i; j++) {
        if (atrData[j].atr !== null) { atrSum += atrData[j].atr; atrCount++; }
      }
      if (atrCount > 0 && atrData[i].atr > 2 * (atrSum / atrCount)) {
        // Only emit if previous bar wasn't also a spike (avoid duplicates)
        let prevSpike = false;
        if (i > 0 && atrData[i-1].atr !== null) {
          let prevSum = 0, prevCount = 0;
          for (let j = i - 21; j < i - 1; j++) {
            if (j >= 0 && atrData[j].atr !== null) { prevSum += atrData[j].atr; prevCount++; }
          }
          if (prevCount > 0) prevSpike = atrData[i-1].atr > 2 * (prevSum / prevCount);
        }
        if (!prevSpike) {
          signals.push({ date: atrData[i].date, indicator: "atr", signal: "VOLATILITY_SPIKE", direction: "neutral", value: +atrData[i].atr.toFixed(2), details: "ATR exceeded 2x 20-bar average" });
        }
      }
    }
  }

  // ADX: crosses above 25 (trend becomes strong)
  const adxData = calcAdx(rows);
  for (let i = Math.max(startIdx, 1); i < n; i++) {
    const curr = adxData[i], prev = adxData[i-1];
    if (curr.adx !== null && prev.adx !== null) {
      if (curr.adx > 25 && prev.adx <= 25) {
        const dir = curr.plusDI > curr.minusDI ? "buy" : "sell";
        signals.push({ date: curr.date, indicator: "adx", signal: "TREND_STRENGTH", direction: dir, value: +curr.adx.toFixed(1), details: `ADX crossed above 25 (${dir === "buy" ? "+DI" : "-DI"} dominant)` });
      }
    }
  }

  // CCI: crosses above 100 or below -100
  const cciData = calcCci(rows);
  for (let i = Math.max(startIdx, 1); i < n; i++) {
    const curr = cciData[i], prev = cciData[i-1];
    if (curr.cci !== null && prev.cci !== null) {
      if (curr.cci > 100 && prev.cci <= 100) {
        signals.push({ date: curr.date, indicator: "cci", signal: "OVERBOUGHT_ENTRY", direction: "sell", value: +curr.cci.toFixed(1), details: "CCI crossed above 100" });
      }
      if (curr.cci < -100 && prev.cci >= -100) {
        signals.push({ date: curr.date, indicator: "cci", signal: "OVERSOLD_ENTRY", direction: "buy", value: +curr.cci.toFixed(1), details: "CCI crossed below -100" });
      }
    }
  }

  // ROC: crosses zero
  const rocData = calcRoc(rows);
  for (let i = Math.max(startIdx, 1); i < n; i++) {
    const curr = rocData[i], prev = rocData[i-1];
    if (curr.roc !== null && prev.roc !== null) {
      if (curr.roc > 0 && prev.roc <= 0) {
        signals.push({ date: curr.date, indicator: "roc", signal: "BULLISH_CROSS", direction: "buy", value: +curr.roc.toFixed(2), details: "ROC crossed above zero" });
      }
      if (curr.roc < 0 && prev.roc >= 0) {
        signals.push({ date: curr.date, indicator: "roc", signal: "BEARISH_CROSS", direction: "sell", value: +curr.roc.toFixed(2), details: "ROC crossed below zero" });
      }
    }
  }

  // Williams %R: crosses above -20 or below -80
  const wrData = calcWilliamsR(rows);
  for (let i = Math.max(startIdx, 1); i < n; i++) {
    const curr = wrData[i], prev = wrData[i-1];
    if (curr.williamsR !== null && prev.williamsR !== null) {
      if (curr.williamsR > -20 && prev.williamsR <= -20) {
        signals.push({ date: curr.date, indicator: "williamsR", signal: "OVERBOUGHT_ENTRY", direction: "sell", value: +curr.williamsR.toFixed(1), details: "Williams %R crossed above -20" });
      }
      if (curr.williamsR < -80 && prev.williamsR >= -80) {
        signals.push({ date: curr.date, indicator: "williamsR", signal: "OVERSOLD_ENTRY", direction: "buy", value: +curr.williamsR.toFixed(1), details: "Williams %R crossed below -80" });
      }
    }
  }

  // StochRSI: K crosses above 0.8 or below 0.2
  const srData = calcStochRsi(rows);
  for (let i = Math.max(startIdx, 1); i < n; i++) {
    const curr = srData[i], prev = srData[i-1];
    if (curr.k !== null && prev.k !== null) {
      if (curr.k > 0.8 && prev.k <= 0.8) {
        signals.push({ date: curr.date, indicator: "stochRsi", signal: "OVERBOUGHT_ENTRY", direction: "sell", value: +curr.k.toFixed(3), details: "StochRSI K crossed above 0.8" });
      }
      if (curr.k < 0.2 && prev.k >= 0.2) {
        signals.push({ date: curr.date, indicator: "stochRsi", signal: "OVERSOLD_ENTRY", direction: "buy", value: +curr.k.toFixed(3), details: "StochRSI K crossed below 0.2" });
      }
    }
  }

  // Ichimoku: close crosses above or below cloud
  const ichData = calcIchimoku(rows);
  for (let i = Math.max(startIdx, 1); i < n; i++) {
    const curr = ichData[i], prev = ichData[i-1];
    if (curr.senkouA !== null && curr.senkouB !== null && prev.senkouA !== null && prev.senkouB !== null) {
      const currAbove = curr.close > Math.max(curr.senkouA, curr.senkouB);
      const prevAbove = prev.close > Math.max(prev.senkouA, prev.senkouB);
      const currBelow = curr.close < Math.min(curr.senkouA, curr.senkouB);
      const prevBelow = prev.close < Math.min(prev.senkouA, prev.senkouB);
      if (currAbove && !prevAbove) {
        signals.push({ date: curr.date, indicator: "ichimoku", signal: "ABOVE_CLOUD", direction: "buy", value: curr.close, details: "Close crossed above Ichimoku cloud" });
      }
      if (currBelow && !prevBelow) {
        signals.push({ date: curr.date, indicator: "ichimoku", signal: "BELOW_CLOUD", direction: "sell", value: curr.close, details: "Close crossed below Ichimoku cloud" });
      }
    }
  }

  signals.sort((a, b) => b.date.localeCompare(a.date)); // newest first
  return signals;
}

// ─── GET /api/signals?ticker=SPY ────────────────────────────────────────────
app.get("/api/signals", (req, res) => {
  const ticker = validateTicker(req.query.ticker);
  if (!ticker) return res.status(400).json({ error: "Invalid ticker" });
  const rows = parseRows(ticker);
  if (rows.length === 0) return res.json({ ticker, signals: [], totalSignals: 0 });

  const signals = detectSignals(rows);
  res.json({ ticker, signals, totalSignals: signals.length });
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

// ─── Start server only when run directly ─────────────────────────────────────
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, () => {
    console.log(`ECO API running on port ${PORT}`);
  });
}

export default app;
export { app, validateTicker, emaK, calcEMA, calcDEMA, parseRows, calcDemark, calcObv, calcEco, calcRsi, calcMacd, calcBollinger, calcAtr, calcAdx, calcCci, calcRoc, calcWilliamsR, calcStochRsi, calcIchimoku };
