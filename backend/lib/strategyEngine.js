/**
 * strategyEngine.js — Evaluate trading strategies against price data.
 */

import { calcEco } from "../indicators/eco.js";
import { calcObv } from "../indicators/obv.js";
import { calcDemark } from "../indicators/demark.js";
import { calcRsi } from "../indicators/rsi.js";
import { calcMacd } from "../indicators/macd.js";
import { calcBollinger } from "../indicators/bollinger.js";
import { calcAtr } from "../indicators/atr.js";
import { calcAdx } from "../indicators/adx.js";
import { calcCci } from "../indicators/cci.js";
import { calcRoc } from "../indicators/roc.js";
import { calcWilliamsR } from "../indicators/williams.js";
import { calcStochRsi } from "../indicators/stochrsi.js";
import { calcIchimoku } from "../indicators/ichimoku.js";

const CALC_MAP = {
  eco: calcEco,
  obv: calcObv,
  demark: calcDemark,
  rsi: calcRsi,
  macd: calcMacd,
  bollinger: calcBollinger,
  atr: calcAtr,
  adx: calcAdx,
  cci: calcCci,
  roc: calcRoc,
  williams: calcWilliamsR,
  stochrsi: calcStochRsi,
  ichimoku: calcIchimoku,
};

const VALID_OPERATORS = new Set([">", "<", ">=", "<=", "=="]);

function compare(operator, a, b) {
  switch (operator) {
    case ">":  return a > b;
    case "<":  return a < b;
    case ">=": return a >= b;
    case "<=": return a <= b;
    case "==": return a === b;
  }
}

/**
 * Evaluate a strategy against price rows.
 *
 * @param {Object} strategy - { id, action, conditions }
 *   Each condition: { indicator, field, operator, value?, crossover?, crossField? }
 * @param {Array} rows - Raw OHLCV rows from parseRows
 * @returns {Array} Trigger objects: { date, strategyId, action, details }
 */
export function evaluateStrategy(strategy, rows) {
  const { id, action, conditions } = strategy;

  // Validate conditions
  for (const cond of conditions) {
    if (!CALC_MAP[cond.indicator]) {
      throw new Error(`Unknown indicator: ${cond.indicator}`);
    }
    if (!VALID_OPERATORS.has(cond.operator)) {
      throw new Error(`Invalid operator: ${cond.operator}`);
    }
  }

  // Compute needed indicators (deduplicated)
  const indicatorNames = [...new Set(conditions.map((c) => c.indicator))];
  const indicatorData = {};
  for (const name of indicatorNames) {
    indicatorData[name] = CALC_MAP[name](rows);
  }

  const triggers = [];
  const len = rows.length;

  for (let i = 0; i < len; i++) {
    let allMet = true;

    for (const cond of conditions) {
      const data = indicatorData[cond.indicator];
      const curr = data[i];

      if (cond.crossover) {
        // Crossover: curr field crossed above/below crossField
        // Need previous bar
        if (i === 0) { allMet = false; break; }
        const prev = data[i - 1];
        const currVal = curr[cond.field];
        const currRef = curr[cond.crossField];
        const prevVal = prev[cond.field];
        const prevRef = prev[cond.crossField];

        // For ">": crossed above means curr > ref AND prev <= ref
        // For "<": crossed below means curr < ref AND prev >= ref
        const crossed =
          cond.operator === ">" || cond.operator === ">="
            ? compare(cond.operator, currVal, currRef) && !compare(cond.operator, prevVal, prevRef)
            : compare(cond.operator, currVal, currRef) && !compare(cond.operator, prevVal, prevRef);

        if (!crossed) { allMet = false; break; }
      } else {
        // Threshold comparison
        const val = curr[cond.field];
        if (!compare(cond.operator, val, cond.value)) { allMet = false; break; }
      }
    }

    if (allMet) {
      const date = indicatorData[indicatorNames[0]][i].date;
      triggers.push({
        date,
        strategyId: id,
        action,
        details: conditions.map((c) => {
          const d = indicatorData[c.indicator][i];
          return c.crossover
            ? `${c.field}=${d[c.field]} ${c.operator} ${c.crossField}=${d[c.crossField]} (crossover)`
            : `${c.field}=${d[c.field]} ${c.operator} ${c.value}`;
        }).join("; "),
      });
    }
  }

  return triggers;
}
