import { Router } from "express";
import express from "express";
import { parseRows } from "../lib/csvLoader.js";
import { validateTicker } from "../lib/validation.js";
import { evaluateStrategy } from "../lib/strategyEngine.js";

const router = Router();
router.use(express.json());

// POST /api/strategy — evaluate strategies against full history
router.post("/strategy", (req, res) => {
  const { ticker: rawTicker, strategies } = req.body || {};
  const ticker = validateTicker(rawTicker);
  if (!ticker) return res.status(400).json({ error: "Invalid ticker" });
  if (!Array.isArray(strategies)) return res.status(400).json({ error: "strategies array is required" });

  const rows = parseRows(ticker);
  if (rows.length === 0) return res.json({ ticker, results: [] });

  const allResults = [];
  for (const strategy of strategies) {
    try {
      const results = evaluateStrategy(strategy, rows);
      allResults.push(...results);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  allResults.sort((a, b) => b.date.localeCompare(a.date));
  res.json({ ticker, results: allResults });
});

export default router;
