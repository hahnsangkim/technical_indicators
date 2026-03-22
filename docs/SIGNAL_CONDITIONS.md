# Signal Conditions Reference

The `/api/signals?ticker=SPY` endpoint scans the last 10 bars of a ticker's data and detects crossover and threshold conditions across all 14 indicators. Each signal includes a date, indicator name, signal type, direction (buy/sell/neutral), value, and human-readable description.

## Detection Method

All signals use a **crossover detection** pattern — a condition is triggered only when it transitions from false to true:

```
signal fires at bar[i] when: condition(bar[i]) == true AND condition(bar[i-1]) == false
```

This prevents duplicate signals on consecutive bars where a condition remains true.

---

## Momentum Indicators

### ECO (Enhanced Ergodic Candlestick Oscillator)

| Signal | Condition | Direction | Interpretation |
|--------|-----------|-----------|----------------|
| `BULLISH_CROSSOVER` | ECO crosses above its signal line | buy | Volume-weighted momentum turning positive |
| `BEARISH_CROSSOVER` | ECO crosses below its signal line | sell | Volume-weighted momentum turning negative |

**How it works:** ECO uses DEMA smoothing on volume-normalized candlestick changes. The signal line is an EMA(8) of ECO. Crossovers indicate shifts in volume-weighted momentum.

### MACD (Moving Average Convergence Divergence)

| Signal | Condition | Direction | Interpretation |
|--------|-----------|-----------|----------------|
| `BULLISH_CROSSOVER` | MACD line crosses above signal line | buy | Short-term momentum overtaking long-term |
| `BEARISH_CROSSOVER` | MACD line crosses below signal line | sell | Short-term momentum weakening vs long-term |

**How it works:** MACD = EMA(12) - EMA(26). Signal = EMA(9) of MACD. Crossovers are the classic MACD trade signal.

### ROC (Rate of Change)

| Signal | Condition | Direction | Interpretation |
|--------|-----------|-----------|----------------|
| `BULLISH_CROSS` | ROC crosses above zero | buy | Price now higher than 12 bars ago (momentum turning positive) |
| `BEARISH_CROSS` | ROC crosses below zero | sell | Price now lower than 12 bars ago (momentum turning negative) |

**How it works:** ROC = ((Close - Close_12_ago) / Close_12_ago) x 100. Zero-line crossover indicates a shift in 12-period momentum direction.

---

## Oscillators (Overbought / Oversold)

### RSI (Relative Strength Index, period 14)

| Signal | Condition | Direction | Interpretation |
|--------|-----------|-----------|----------------|
| `OVERBOUGHT_ENTRY` | RSI crosses above 70 | sell | Buying pressure may be exhausted; potential pullback |
| `OVERSOLD_ENTRY` | RSI crosses below 30 | buy | Selling pressure may be exhausted; potential bounce |

**Thresholds:** 70 (overbought), 30 (oversold). Uses Wilder's smoothing method.

### CCI (Commodity Channel Index, period 20)

| Signal | Condition | Direction | Interpretation |
|--------|-----------|-----------|----------------|
| `OVERBOUGHT_ENTRY` | CCI crosses above +100 | sell | Price significantly above its statistical mean |
| `OVERSOLD_ENTRY` | CCI crosses below -100 | buy | Price significantly below its statistical mean |

**Thresholds:** +100 (overbought), -100 (oversold). Measures deviation from the mean typical price.

### Williams %R (period 14)

| Signal | Condition | Direction | Interpretation |
|--------|-----------|-----------|----------------|
| `OVERBOUGHT_ENTRY` | %R crosses above -20 | sell | Price near the top of its 14-period range |
| `OVERSOLD_ENTRY` | %R crosses below -80 | buy | Price near the bottom of its 14-period range |

**Thresholds:** -20 (overbought), -80 (oversold). Scale is -100 to 0.

### Stochastic RSI (14, 14, 3, 3)

| Signal | Condition | Direction | Interpretation |
|--------|-----------|-----------|----------------|
| `OVERBOUGHT_ENTRY` | %K crosses above 0.8 | sell | RSI itself is overbought relative to its range |
| `OVERSOLD_ENTRY` | %K crosses below 0.2 | buy | RSI itself is oversold relative to its range |

**Thresholds:** 0.8 (overbought), 0.2 (oversold). Scale is 0 to 1. More sensitive than raw RSI.

---

## Volume Indicators

### OBV (On-Balance Volume)

| Signal | Condition | Direction | Interpretation |
|--------|-----------|-----------|----------------|
| `BULLISH_CROSSOVER` | OBV crosses above its EMA(20) | buy | Volume flow turning positive; accumulation |
| `BEARISH_CROSSOVER` | OBV crosses below its EMA(20) | sell | Volume flow turning negative; distribution |

**How it works:** OBV adds volume on up-closes and subtracts on down-closes. The EMA(20) smooths the trend. Crossover signals volume-backed momentum shifts.

---

## Volatility Indicators

### Bollinger Bands (SMA 20, 2 standard deviations)

| Signal | Condition | Direction | Interpretation |
|--------|-----------|-----------|----------------|
| `UPPER_BREAK` | Close crosses above upper band | sell | Price stretched beyond 2 std devs above mean; potential reversal |
| `LOWER_BREAK` | Close crosses below lower band | buy | Price stretched beyond 2 std devs below mean; potential reversal |

**How it works:** Bands contract during low volatility and expand during high volatility. Band breaks indicate extreme price moves.

### ATR (Average True Range, period 14)

| Signal | Condition | Direction | Interpretation |
|--------|-----------|-----------|----------------|
| `VOLATILITY_SPIKE` | ATR exceeds 2x its 20-bar average | neutral | Sudden volatility expansion; major move underway |

**How it works:** Compares current ATR to its own 20-bar average. A spike above 2x indicates abnormal volatility. De-duplicated: only fires on the first bar of a spike, not on consecutive spike bars.

---

## Trend Indicators

### ADX (Average Directional Index, period 14)

| Signal | Condition | Direction | Interpretation |
|--------|-----------|-----------|----------------|
| `TREND_STRENGTH` | ADX crosses above 25 | buy if +DI > -DI, sell if -DI > +DI | A strong trend is forming; direction determined by DI lines |

**Thresholds:** ADX > 25 = strong trend, ADX > 50 = very strong. Direction comes from +DI vs -DI comparison at the crossover bar.

### Ichimoku Cloud (9, 26, 52)

| Signal | Condition | Direction | Interpretation |
|--------|-----------|-----------|----------------|
| `ABOVE_CLOUD` | Close crosses above both Senkou Span A and B | buy | Bullish breakout above the cloud (support/resistance zone) |
| `BELOW_CLOUD` | Close crosses below both Senkou Span A and B | sell | Bearish breakdown below the cloud |

**How it works:** The cloud (Kumo) is formed by Senkou Span A and B projected 26 periods forward. Price crossing the cloud is a major trend signal.

---

## Trend Exhaustion

### DeMark (TD Sequential)

| Signal | Condition | Direction | Interpretation |
|--------|-----------|-----------|----------------|
| `BUY_SETUP_9` | 9 consecutive closes < close[4 bars ago] | buy | Bearish exhaustion; selling pressure may be running out |
| `SELL_SETUP_9` | 9 consecutive closes > close[4 bars ago] | sell | Bullish exhaustion; buying pressure may be running out |
| `BUY_COUNTDOWN_13` | 13 non-consecutive close <= low[2 bars ago] | buy | Deep structural bearish exhaustion; high-probability reversal zone |
| `SELL_COUNTDOWN_13` | 13 non-consecutive close >= high[2 bars ago] | sell | Deep structural bullish exhaustion; high-probability reversal zone |

**How it works:** DeMark is unique — it predicts when a trend is running out of steam, not when one is starting. Setup (9) signals short-term exhaustion; Countdown (13) signals major trend exhaustion.

---

## Confluence Indicators

### Volume Confluence (DeMark + OBV)

Confluence events are detected by the separate `/api/confluence` endpoint and displayed in the Confluence panel. They are **not** included in `/api/signals` to avoid duplication.

| Event | Condition | Interpretation |
|-------|-----------|----------------|
| `CAPITULATION` | DeMark signal fires on volume > 2x 20-bar average | Panic selling (buy) or euphoric blow-off (sell) |
| `OBV_DIVERGENCE` | Price and OBV trend in opposite directions during countdown | Hollow rally or quiet accumulation |
| `POST_SIGNAL` | 3 bars after any DeMark signal: green/red candles with above-avg volume | Confirms (follow-through) or denies (failed) the reversal |

---

## API Response

```
GET /api/signals?ticker=SPY
```

```json
{
  "ticker": "SPY",
  "signals": [
    {
      "date": "2023-03-01",
      "indicator": "rsi",
      "signal": "OVERBOUGHT_ENTRY",
      "direction": "sell",
      "value": 72.3,
      "details": "RSI crossed above 70"
    }
  ],
  "totalSignals": 5
}
```

Signals are sorted by date descending (newest first) and limited to the last 10 bars of data.
