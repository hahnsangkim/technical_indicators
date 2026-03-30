import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";

// ─── Lib ─────────────────────────────────────────────────────────────────────
import { csvLines, parseRows } from "./lib/csvLoader.js";
import { validateTicker } from "./lib/validation.js";

// ─── Indicators ───────────────────────────────────────────────────────────────
import { emaK, calcEMA, calcDEMA } from "./indicators/math.js";
import { calcEco } from "./indicators/eco.js";
import { calcObv } from "./indicators/obv.js";
import { calcDemark } from "./indicators/demark.js";
import { calcRsi } from "./indicators/rsi.js";
import { calcMacd } from "./indicators/macd.js";
import { calcBollinger } from "./indicators/bollinger.js";
import { calcAtr } from "./indicators/atr.js";
import { calcAdx } from "./indicators/adx.js";
import { calcCci } from "./indicators/cci.js";
import { calcRoc } from "./indicators/roc.js";
import { calcWilliamsR } from "./indicators/williams.js";
import { calcStochRsi } from "./indicators/stochrsi.js";
import { calcIchimoku } from "./indicators/ichimoku.js";

// ─── Routes ───────────────────────────────────────────────────────────────────
import priceRouter from "./routes/price.js";
import indicatorsRouter from "./routes/indicators.js";
import signalsRouter from "./routes/signals.js";
import confluenceRouter from "./routes/confluence.js";
import adminRouter from "./routes/admin.js";
import strategyRouter from "./routes/strategy.js";
import generateStrategyRouter from "./routes/generateStrategy.js";

// ─── App setup ────────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());

// ─── Rate Limiting ────────────────────────────────────────────────────────────
export function createLimiters({ globalMax = 100, strictMax = 30, windowMs = 15 * 60 * 1000 } = {}) {
  const globalLimiter = rateLimit({
    windowMs, max: globalMax, standardHeaders: true, legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
  });
  const strictLimiter = rateLimit({
    windowMs, max: strictMax, standardHeaders: true, legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
  });
  return { globalLimiter, strictLimiter };
}

if (process.env.NODE_ENV !== "test") {
  const { globalLimiter, strictLimiter } = createLimiters();
  app.use(globalLimiter);
  app.use("/api/signals", strictLimiter);
  app.use("/api/confluence", strictLimiter);
  app.use("/api/strategy", strictLimiter);
}

// ─── Route registration ───────────────────────────────────────────────────────
app.use("/api", priceRouter);
app.use("/api", indicatorsRouter);
app.use("/api", signalsRouter);
app.use("/api", confluenceRouter);
app.use("/api", adminRouter);
app.use("/api", strategyRouter);
app.use("/api", generateStrategyRouter);

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
export {
  app,
  validateTicker,
  parseRows,
  emaK, calcEMA, calcDEMA,
  calcEco, calcObv, calcDemark, calcRsi, calcMacd,
  calcBollinger, calcAtr, calcAdx, calcCci, calcRoc,
  calcWilliamsR, calcStochRsi, calcIchimoku,
};
