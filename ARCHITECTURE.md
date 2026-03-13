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
| `IndicatorMenu` | Multi-select indicator toggle (ECO, OBV) |

### Key Patterns

- **AbortController** on every fetch to cancel stale requests on rapid ticker changes
- **useMemo** for filtered data (3M/6M/1Y/ALL range slicing)
- **Dynamic KPI cards** — grid adapts based on active indicators
- **Min/max via loops** — avoids `Math.max(...largeArray)` stack overflow

## Backend

- **Stack**: Express 5.1.0, Node.js (ES modules)
- **Entry**: `backend/server.js`
- **Deployment**: Vercel Serverless (`backend/vercel.json`)
- **Data**: `backend/data/sp500spy_prices.csv` loaded once at startup

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tickers` | GET | Returns sorted list of all ticker symbols |
| `/api/eco?ticker=SPY` | GET | ECO indicator data for given ticker |
| `/api/obv?ticker=SPY` | GET | OBV indicator data for given ticker |
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

## Environment Variables

| Variable | Location | Value |
|----------|----------|-------|
| `NEXT_PUBLIC_API_URL` | `.env` (dev) | `http://localhost:4000` |
| `NEXT_PUBLIC_API_URL` | `.env.production` | `https://backend-rho-gray-78.vercel.app` |
| `PORT` | backend | `4000` (default) |

## Local Development

```bash
# Terminal 1: Backend
cd backend && npm run dev    # port 4000

# Terminal 2: Frontend
npm run dev                  # port 3000
```

## Project Structure

```
technical_indicators/
├── app/
│   ├── page.js              # Next.js entry
│   └── ECOComparison.jsx    # Dashboard component
├── backend/
│   ├── server.js            # Express API
│   ├── package.json
│   ├── vercel.json          # Serverless config
│   └── data/
│       └── sp500spy_prices.csv
├── data/
│   └── sp500spy_prices.csv  # Source data
├── strategies/              # Not committed (gitignored)
│   ├── ECO.md
│   └── OBV.md
├── package.json             # Frontend deps
├── .env                     # Dev API URL
└── .env.production          # Prod API URL
```
