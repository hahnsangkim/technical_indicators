# Volume Confluence Analysis (DeMark + OBV) — Design

## Overview

A new `/api/confluence?ticker=SPY` endpoint that detects three types of volume-price confluence events around DeMark signals. Returns a sparse array of events (only bars where confluence exists).

## API Response Shape

```json
{
  "ticker": "SPY",
  "data": [
    {
      "date": "2025-03-15",
      "signal": "BUY_SETUP_9",
      "type": "CAPITULATION",
      "volume": 185000000,
      "avgVolume": 72000000,
      "volumeRatio": 2.57
    },
    {
      "date": "2025-06-20",
      "signal": "SELL_COUNTDOWN_13",
      "type": "OBV_DIVERGENCE",
      "priceDirection": "up",
      "obvDirection": "down",
      "countdownSpanBars": 34
    },
    {
      "date": "2025-06-23",
      "signal": "SELL_COUNTDOWN_13",
      "type": "POST_SIGNAL",
      "barsAfter": 3,
      "validation": "CONFIRMED",
      "avgPostVolume": 95000000,
      "avgVolume": 72000000
    }
  ]
}
```

## Three Event Types

### 1. CAPITULATION

A DeMark signal (9 or 13) fires on a bar where volume > 2x the 20-bar average volume. Indicates panic selling (buy signals) or blow-off euphoria (sell signals).

- Threshold: volume > 2 * SMA(volume, 20)
- Applies to all four signal types: BUY_SETUP_9, SELL_SETUP_9, BUY_COUNTDOWN_13, SELL_COUNTDOWN_13

### 2. OBV_DIVERGENCE

Price and OBV trend in opposite directions across the countdown span (from countdown start to bar 13). Only applies to Countdown-13 signals.

- Lookback: the actual countdown bar span (variable length, since countdown bars aren't consecutive)
- Bearish divergence: price direction up, OBV direction down (hollow rally)
- Bullish divergence: price direction down, OBV direction up (quiet accumulation)

### 3. POST_SIGNAL

Emitted 3 bars after any DeMark signal. Checks whether the reversal has follow-through.

- **CONFIRMED (buy):** Reversal bars are green with rising volume (above 20-bar average)
- **FAILED (buy):** Reversal bars have low volume (below 20-bar average)
- **CONFIRMED (sell):** Reversal bars are red with rising volume
- **FAILED (sell):** Reversal bars have low volume
- Not emitted if fewer than 3 bars remain after the signal

## Backend Implementation

The endpoint reuses the existing DeMark and OBV calculation logic (extracted into shared functions, not duplicated). Steps:

1. `parseRows(ticker)` — cached
2. Run DeMark calculation to get signals + countdown tracking
3. Run OBV calculation to get OBV values
4. Compute 20-bar rolling average volume
5. Scan for the three event types
6. Return sparse event array

DeMark and OBV math will be extracted into reusable functions that both the existing endpoints and the confluence endpoint call.

## Frontend Integration

- New `confluence` entry in `INDICATORS` map
- Events displayed as markers/annotations on the DeMark chart (not a separate panel)
- CAPITULATION: colored marker at the signal bar
- OBV_DIVERGENCE: distinct marker at the Countdown-13 bar
- POST_SIGNAL: small CONFIRMED/FAILED label 3 bars after the signal
- KPI cards: total confluence events, last event type + date

## Testing

Backend (10 tests):
- 200 with valid ticker
- Empty array for ticker with no DeMark signals
- 400 for invalid ticker
- Capitulation: detects on high volume
- Capitulation: does not fire on normal volume
- OBV Divergence: detects price/OBV divergence on Countdown-13
- OBV Divergence: does not fire when trends agree
- Post-Signal: CONFIRMED on green rising-volume bars after buy
- Post-Signal: FAILED on low-volume bars after buy
- Post-Signal: not emitted with <3 bars remaining
