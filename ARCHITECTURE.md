# Architecture

## Overview

Technical Indicators Dashboard — a separated frontend/backend application that calculates and visualizes financial technical indicators for S&P 500 stocks.

```
┌─────────────────────┐        REST API        ┌─────────────────────┐
│   Frontend (Next.js) │ ──────────────────────▶ │  Backend (Express)  │
│   Vercel Edge        │ ◀────────────────────── │  Vercel Serverless  │
└─────────────────────┘    JSON over HTTPS       └─────────┬───────────┘
                                                           │
                                                    ┌──────┴──────┐
                                                    │  CSV Data   │
                                                    │ (in-memory) │
                                                    └─────────────┘
```

## Frontend

- **Stack**: Next.js 16.1.6, React 19.2.3, Recharts 3.8.0
- **Entry**: `app/page.js` → `app/ECOComparison.jsx`
- **Deployment**: Vercel (automatic from `main` branch)
- **Config**: `NEXT_PUBLIC_API_URL` env var points to backend

### Components

| Component | Purpose |
|-----------|---------|
| `Dashboard` | Main layout, state management, chart rendering |
| `TickerSearch` | Searchable dropdown for 487 S&P 500 tickers |
| `IndicatorMenu` | Multi-select indicator toggle (14 indicators) |
| `WatchlistPanel` | Ticker watchlist with grouped signal display + notifications |

### Key Patterns

- **AbortController** on every fetch to cancel stale requests on rapid ticker changes
- **useMemo** for filtered data (3M/6M/1Y/ALL range slicing)
- **Hooks before returns** — all `useMemo` calls placed before conditional early returns to satisfy React hooks ordering rules
- **Independent price data** — `/api/price` fetched on every ticker change, decoupled from indicator selection. Price chart always works regardless of which indicators are active
- **Generic indicator data map** — single `indicatorData` state + `filteredData` memo replaces per-indicator state (consolidated from 13 individual useState/fetch/memo blocks)
- **Signal chart markers** — signal data merged into chart data via `mergeSignals()`, rendered as colored dots on primary Line/Area components using custom `dot` prop
- **API_KEYS mapping** — handles endpoint name mismatches (e.g., `williamsR` → `williamsr`, `stochRsi` → `stochrsi`)
- **Dynamic KPI cards** — grid adapts based on active indicators
- **Price chart overlays** — DeMark risk line, Bollinger Bands, and Ichimoku Cloud merged into price chart data via date lookup
- **Min/max via loops** — avoids `Math.max(...largeArray)` stack overflow
- **Incremental indicator fetching** — toggling indicators only fetches newly activated ones (no full reload), keeping the indicator menu open during multi-select
- **Responsive layout** — CSS media queries at 768px and 480px breakpoints for header, KPI grid, chart headers/legends, stats grid, and dropdown menus

## Backend

- **Stack**: Express 5.1.0, Node.js (ES modules)
- **Entry**: `backend/server.js`
- **Deployment**: Vercel Serverless (`backend/vercel.json`)
- **Data**: `backend/data/sp500spy_prices.csv` loaded once at startup

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tickers` | GET | Returns sorted list of all ticker symbols |
| `/api/price?ticker=SPY` | GET | Raw OHLCV price data (independent of indicators) |
| `/api/eco?ticker=SPY` | GET | ECO indicator (DEMA + volume-weighted) |
| `/api/obv?ticker=SPY` | GET | OBV (On-Balance Volume) with EMA(20) signal |
| `/api/demark?ticker=SPY` | GET | DeMark TD Sequential with risk line |
| `/api/rsi?ticker=SPY` | GET | RSI (Wilder's, period 14) |
| `/api/macd?ticker=SPY` | GET | MACD (EMA 12, 26, 9) |
| `/api/bollinger?ticker=SPY` | GET | Bollinger Bands (SMA 20, 2σ) |
| `/api/atr?ticker=SPY` | GET | ATR (Average True Range, period 14) |
| `/api/adx?ticker=SPY` | GET | ADX with +DI/-DI (period 14) |
| `/api/cci?ticker=SPY` | GET | CCI (Commodity Channel Index, period 20) |
| `/api/roc?ticker=SPY` | GET | ROC (Rate of Change, period 12) |
| `/api/williamsr?ticker=SPY` | GET | Williams %R (period 14) |
| `/api/stochrsi?ticker=SPY` | GET | Stochastic RSI (14, 14, 3, 3) |
| `/api/ichimoku?ticker=SPY` | GET | Ichimoku Cloud (9, 26, 52) |
| `/api/confluence?ticker=SPY` | GET | Volume Confluence (DeMark + OBV) |
| `/api/signals?ticker=SPY` | GET | Signal detection across all indicators (last 10 bars) |
| `/api/health` | GET | Health check with row count |

### Input Validation

- Ticker: regex `^[A-Z0-9.]{1,10}$`, defaults to `SPY`, returns 400 on invalid
- Global error handler returns 500 JSON

### CSV Schema

```
date, ticker, open, high, low, close, adj_close, volume, dividend, split
```
- 420,671 rows, 487 unique tickers
- Date range: ~2019-09-24 to 2023-03-03

## Indicators

### ECO (Enhanced Ergodic Candlestick Oscillator)

Uses DEMA (Double EMA) smoothing with volume normalization.

```
Input:  change = (close - open) * (volume / avgVolume)
        range  = max(high - low, 0.001)

Step 1: DEMA(25) of change → numerator
Step 2: DEMA(25) of range  → denominator
Step 3: DEMA(13) of numerator → smoothed numerator
Step 4: DEMA(13) of denominator → smoothed denominator
Step 5: ECO = (smoothedNum / |smoothedDen|) * 100
Step 6: Signal = EMA(8) of ECO
Step 7: Histogram = ECO - Signal
```

DEMA formula: `DEMA = 2 * EMA1 - EMA2` where EMA2 is the EMA of EMA1.
EMA multiplier: `k = 2 / (N + 1)`.

### OBV (On-Balance Volume)

Cumulative volume indicator with EMA signal line.

```
If close > prevClose: OBV += volume
If close < prevClose: OBV -= volume
If close == prevClose: OBV unchanged

Signal = EMA(20) of OBV
```

### DeMark (TD Sequential)

Trend exhaustion indicator with two phases and a risk line.

```
Phase 1 — TD Setup (the "9"):
  Buy Setup:  9 consecutive closes < close[4 bars ago]
  Sell Setup: 9 consecutive closes > close[4 bars ago]
  Perfection: bar 8 or 9 extreme exceeds bars 6 and 7

Phase 2 — TD Countdown (the "13"):
  Triggered after a completed setup. Non-consecutive.
  Buy:  close <= low[2 bars ago]
  Sell: close >= high[2 bars ago]
  Invalidation: opposite setup completes → countdown canceled

TD Risk Line (stop-loss):
  1. Find extreme candle in the setup/countdown sequence
  2. True Range = max(H-L, |H-prevClose|, |prevClose-L|)
  3. Buy Risk  = Extreme Low  - True Range
  4. Sell Risk = Extreme High + True Range
  Invalidated on close beyond the risk line
```

### RSI (Relative Strength Index)

Wilder's smoothed RSI with period 14.

```
Change = Close_t - Close_(t-1)
Gain = max(Change, 0),  Loss = max(-Change, 0)
Initial avg: simple average of first 14 gains/losses
Smoothing: avgGain = (avgGain * 13 + gain) / 14
RS = avgGain / avgLoss
RSI = 100 - (100 / (1 + RS))
Output: rsi (0-100, warmup=50 for first 14 bars)
```

### MACD (Moving Average Convergence Divergence)

```
MACD Line = EMA(12) - EMA(26)
Signal Line = EMA(9) of MACD
Histogram = MACD - Signal
Output: macd, signal, histogram
```

### Bollinger Bands

```
Middle = SMA(20)
Upper = SMA(20) + 2 × StdDev(20)
Lower = SMA(20) - 2 × StdDev(20)
Output: upper, middle, lower (null for first 19 bars)
```

### ATR (Average True Range)

```
TR = max(High-Low, |High-prevClose|, |Low-prevClose|)
ATR = Wilder's smoothing of TR over 14 periods
Output: tr, atr (null for first 13 bars)
```

### ADX (Average Directional Index)

```
+DM = (High - prevHigh) if upMove > downMove and > 0
-DM = (prevLow - Low) if downMove > upMove and > 0
Smoothed TR/+DM/-DM using Wilder's method (period 14)
+DI = (smoothed +DM / smoothed TR) × 100
-DI = (smoothed -DM / smoothed TR) × 100
DX = |+DI - -DI| / (+DI + -DI) × 100
ADX = Wilder's smoothing of DX
Output: adx, plusDI, minusDI (null for first 14 bars)
```

### CCI (Commodity Channel Index)

```
Typical Price = (High + Low + Close) / 3
SMA = SMA(20) of Typical Price
Mean Deviation = avg |TP - SMA| over 20 periods
CCI = (TP - SMA) / (0.015 × Mean Deviation)
Output: cci (null for first 19 bars)
```

### ROC (Rate of Change)

```
ROC = ((Close - Close_12_ago) / Close_12_ago) × 100
Output: roc (null for first 12 bars)
```

### Williams %R

```
%R = ((Highest High_14 - Close) / (Highest High_14 - Lowest Low_14)) × -100
Output: williamsR (-100 to 0, null for first 13 bars)
```

### Stochastic RSI

```
1. Compute RSI(14) series
2. StochRSI = (RSI - min RSI_14) / (max RSI_14 - min RSI_14)
3. %K = EMA(3) of StochRSI
4. %D = EMA(3) of %K
Output: stochRsi, k, d (0-1, null for first 27 bars)
```

### Ichimoku Cloud

```
Tenkan-sen = (9-period high + 9-period low) / 2
Kijun-sen = (26-period high + 26-period low) / 2
Senkou Span A = (Tenkan + Kijun) / 2, plotted 26 periods forward
Senkou Span B = (52-period high + 52-period low) / 2, plotted 26 periods forward
Chikou Span = Close, shifted 26 periods backward
Output: tenkan, kijun, senkouA, senkouB, chikou
```

### Volume Confluence (DeMark + OBV)

Detects volume-price confluence events around DeMark signals. Returns a sparse array of events (not per-bar).

```
Three event types:

CAPITULATION — DeMark signal fires on volume > 2x 20-bar SMA(volume)
  Output: date, signal, type, volume, avgVolume, volumeRatio

OBV_DIVERGENCE — Price and OBV trend in opposite directions across
  the countdown span (from matching SETUP_9 to COUNTDOWN_13).
  Only fires on COUNTDOWN_13 signals. Skips flat price/OBV.
  Output: date, signal, type, priceDirection, obvDirection, countdownSpanBars

POST_SIGNAL — 3 bars after any DeMark signal, checks follow-through.
  CONFIRMED: buy signal + green candle with volume > avg, or
             sell signal + red candle with volume > avg (any of 3 bars)
  FAILED: no qualifying follow-through bar
  Not emitted if <3 bars remain after signal.
  Output: date, signal, type, barsAfter, validation, avgPostVolume, avgVolume
```

Reuses `calcDemark()` and `calcObv()` internally (shared functions also used by their respective endpoints).

## Deployment URLs

| Service | URL |
|---------|-----|
| Frontend | `https://technicalindicators.vercel.app` |
| Backend | `https://backend-rho-gray-78.vercel.app` |

## Environment Variables

| Variable | Location | Value |
|----------|----------|-------|
| `NEXT_PUBLIC_API_URL` | `.env` (dev) | `http://localhost:4000` |
| `NEXT_PUBLIC_API_URL` | `.env.production` | `https://backend-rho-gray-78.vercel.app` |
| `PORT` | backend | `4000` (default) |

## Testing

### Backend Tests (vitest + supertest)

```bash
cd backend && npm test       # 166 tests
cd backend && npm run test:watch  # watch mode
```

| File | Tests | Coverage |
|------|-------|----------|
| `__tests__/math.test.js` | 9 | EMA/DEMA calculations, lag reduction |
| `__tests__/validation.test.js` | 8 | Input sanitization, defaults, XSS rejection |
| `__tests__/endpoints.test.js` | 104 | All 13 indicators + tickers + health: fields, bounds, formulas, sorting, warmup nulls, normalization |
| `__tests__/errors.test.js` | 16 | CORS headers, concurrent requests, response time (<200ms per endpoint) |
| `__tests__/confluence.test.js` | 11 | calcDemark/calcObv extraction, confluence endpoint (3 event types, validation, field checks) |
| `__tests__/cache.test.js` | 1 | parseRows caching (referential identity) |
| `__tests__/calcFunctions.test.js` | 11 | All 11 extracted calc functions (field structure validation) |
| `__tests__/signals.test.js` | 6 | Signal detection endpoint (shape, validation, sorting, field checks) |

### Frontend Tests (vitest + jsdom + React Testing Library)

```bash
npm test                     # 28 tests
npm run test:watch           # watch mode
```

| File | Tests | Coverage |
|------|-------|----------|
| `__tests__/fmtVol.test.js` | 5 | Volume formatting (B/M/K/raw, negatives) |
| `__tests__/TickerSearch.test.jsx` | 5 | Dropdown open, search filter, max results, selection, ticker count |
| `__tests__/IndicatorMenu.test.jsx` | 4 | Badge count, toggle callback, 13 indicators listed, unique colors |
| `__tests__/Dashboard.test.jsx` | 9 | Loading skeleton, empty data, chart render, KPI cards, range buttons, signal badge, error UI, confluence |
| `__tests__/WatchlistPanel.test.jsx` | 5 | Watchlist rendering, signal rows, empty state, close handler, signal count |

### Test Architecture

- **Backend** exports `app`, `validateTicker`, `emaK`, `calcEMA`, `calcDEMA`, `parseRows`, `calcDemark`, `calcObv`, `calcEco`, `calcRsi`, `calcMacd`, `calcBollinger`, `calcAtr`, `calcAdx`, `calcCci`, `calcRoc`, `calcWilliamsR`, `calcStochRsi`, `calcIchimoku` for testing (server only listens when run directly)
- **Frontend** exports `TickerSearch`, `IndicatorMenu`, `fmtVol`, `INDICATORS`, `T` as named exports
- Recharts is mocked in Dashboard tests to avoid canvas/SVG issues in jsdom

## Local Development

```bash
# Terminal 1: Backend
cd backend && npm run dev    # port 4000

# Terminal 2: Frontend
npm run dev                  # port 3000

# Run all tests
cd backend && npm test       # backend (137 tests)
cd .. && npm test            # frontend (20 tests)
```

## Project Structure

```
technical_indicators/
├── app/
│   ├── page.js              # Next.js entry
│   └── ECOComparison.jsx    # Dashboard component
├── __tests__/               # Frontend tests
│   ├── setup.js             # Test setup (jest-dom)
│   ├── fmtVol.test.js       # Format helper tests
│   ├── TickerSearch.test.jsx # Ticker search component tests
│   ├── IndicatorMenu.test.jsx # Indicator menu component tests
│   └── Dashboard.test.jsx   # Dashboard integration tests
├── backend/
│   ├── __tests__/           # Backend tests
│   │   ├── math.test.js     # EMA/DEMA unit tests
│   │   ├── validation.test.js # Input validation tests
│   │   ├── endpoints.test.js  # All 13 indicator API tests
│   │   └── errors.test.js   # Error handling + performance tests
│   ├── server.js            # Express API
│   ├── package.json
│   ├── vercel.json          # Serverless config
│   └── data/
│       └── sp500spy_prices.csv
├── vitest.config.js         # Frontend vitest config
├── package.json             # Frontend deps
├── .env                     # Dev API URL
└── .env.production          # Prod API URL
```
