# Session Handoff - Technical Indicators Dashboard

> **Last Updated:** 2026-03-21
> **Last Commit:** `3c7292c` - refactor: consolidate indicator state management into generic data map
> **Branch:** main

---

## Current State

**Multi-indicator dashboard with 13 indicators** is fully implemented and tested. All indicators have backend endpoints, frontend chart/KPI/stats panels, and automated tests.

### What's Done

| Component | Status | Notes |
|-----------|--------|-------|
| Backend Express API | ✅ Complete | 13 indicator endpoints + tickers + health |
| CSV data loading | ✅ Complete | 487 tickers, loaded once at startup |
| Input validation | ✅ Complete | Regex validation, 400 on invalid ticker |
| Error handling | ✅ Complete | Global handler, CSV load failure, CORS |
| Frontend Dashboard | ✅ Complete | Price chart + 13 indicator charts/overlays + KPI cards |
| Ticker search | ✅ Complete | Searchable dropdown, 487 S&P 500 stocks |
| Indicator menu | ✅ Complete | Multi-select toggle for all 13 indicators |
| AbortController | ✅ Complete | Prevents stale fetch race conditions |
| Range filter | ✅ Complete | 3M, 6M, 1Y, ALL |
| Generic data management | ✅ Complete | Consolidated state/fetch/filter into single data map |
| Vercel deployment | ✅ Complete | Frontend + backend separately deployed |
| ARCHITECTURE.md | ✅ Complete | Full system documentation for all 13 indicators |
| TEST_SPECIFICATION.md | ✅ Complete | 150+ test cases specified for all endpoints |
| Backend tests | ✅ Complete | 137 tests (vitest + supertest) |
| Frontend tests | ✅ Complete | 20 tests (vitest + jsdom + RTL) |

### Test Status

```
Backend:  137 tests passing (4 test files)
Frontend:  20 tests passing (4 test files)
Total:    157 tests passing
```

### Indicators Implemented

| Indicator | Endpoint | Chart Type |
|-----------|----------|------------|
| ECO | `/api/eco` | Separate panel (line + signal + histogram) |
| OBV | `/api/obv` | Separate panel (area + EMA signal) |
| DeMark | `/api/demark` | Separate panel (setup bars + countdown) + risk line overlay on price |
| RSI | `/api/rsi` | Separate panel (oscillator 0-100, ref lines 30/50/70) |
| MACD | `/api/macd` | Separate panel (line + signal + histogram, like ECO) |
| Bollinger Bands | `/api/bollinger` | Overlay on price chart (3 bands) |
| ATR | `/api/atr` | Separate panel (single volatility line) |
| ADX | `/api/adx` | Separate panel (ADX + +DI + -DI, ref line 25) |
| CCI | `/api/cci` | Separate panel (oscillator, ref lines ±100/0) |
| ROC | `/api/roc` | Separate panel (oscillator around zero) |
| Williams %R | `/api/williamsr` | Separate panel (oscillator -100 to 0, ref lines -20/-80) |
| Stochastic RSI | `/api/stochrsi` | Separate panel (%K/%D lines, ref lines 0.2/0.5/0.8) |
| Ichimoku Cloud | `/api/ichimoku` | Overlay on price chart (5 lines + cloud) |

### Deployment

- **Frontend:** `https://technicalindicators.vercel.app` (auto-deploy from main)
- **Backend:** `https://backend-rho-gray-78.vercel.app`
- **Env:** `.env.production` points frontend to backend URL

---

## What's Remaining

### High Priority

1. **Deploy updated backend**
   - 10 new endpoints + server.js export refactor need to be pushed to Vercel

### Lower Priority

- Responsive/mobile layout improvements
- Loading skeleton states instead of text spinner
- Error UI for failed API requests (currently just console.error)
- Volume confluence analysis (combining DeMark signals with OBV divergence)
- Performance: parseRows is called per-request; consider caching parsed ticker data

---

## Key Files

### Core Application
- [app/ECOComparison.jsx](app/ECOComparison.jsx) - Main dashboard component (~1276 lines)
- [backend/server.js](backend/server.js) - Express API with 13 indicator calculations (~738 lines)

### Tests
- [backend/__tests__/math.test.js](backend/__tests__/math.test.js) - EMA/DEMA unit tests (9 tests)
- [backend/__tests__/validation.test.js](backend/__tests__/validation.test.js) - Input validation (8 tests)
- [backend/__tests__/endpoints.test.js](backend/__tests__/endpoints.test.js) - All 13 indicator API tests (104 tests)
- [backend/__tests__/errors.test.js](backend/__tests__/errors.test.js) - Error handling + performance (16 tests)
- [__tests__/fmtVol.test.js](__tests__/fmtVol.test.js) - Volume formatting (5 tests)
- [__tests__/TickerSearch.test.jsx](__tests__/TickerSearch.test.jsx) - Ticker search component (5 tests)
- [__tests__/IndicatorMenu.test.jsx](__tests__/IndicatorMenu.test.jsx) - Indicator menu (4 tests)
- [__tests__/Dashboard.test.jsx](__tests__/Dashboard.test.jsx) - Dashboard integration (6 tests)

### Documentation
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture with all indicator formulas
- [TEST_SPECIFICATION.md](TEST_SPECIFICATION.md) - 150+ test case specifications
- [docs/plans/2026-03-21-missing-indicators.md](docs/plans/2026-03-21-missing-indicators.md) - Implementation plan for 10 new indicators
- [technical0ndicators.md](technical0ndicators.md) - Indicator specification handbook

### Reference Documents (gitignored)
- `strategies/ECO.md` - ECO indicator theory
- `strategies/OBV.md` - OBV indicator theory
- `strategies/DeMark.md` - TD Sequential, Risk Line, and volume confluence

---

## Quick Start for Next Session

```bash
# 1. Start backend
cd backend && npm run dev    # port 4000

# 2. Start frontend (separate terminal)
npm run dev                  # port 3000

# 3. Run tests
cd backend && npm test       # backend: 137 tests
cd .. && npm test            # frontend: 20 tests

# 4. Open http://localhost:3000
```

---

## Notes

- **strategies/ is gitignored** -- user explicitly does not want strategy docs committed
- `.env` files contain API URLs but are gitignored by default
- Backend uses Express 5.1.0 (latest) with ES modules (`"type": "module"`)
- `Math.max(...array)` was replaced with loops to avoid stack overflow on large datasets
- Vercel preview deployments have SSO protection; only production URLs work without auth
- React hooks ordering: all `useMemo` calls must be before any conditional early returns
- Large CSV file (~30MB) requires `git -c http.postBuffer=52428800 push` for pushes
- DeMark Risk Line persists until breached on close (intraday wicks don't invalidate per DeMark rules)
- Frontend uses generic `indicatorData` map + `API_KEYS` for endpoint name mismatches (`williamsR` → `williamsr`, `stochRsi` → `stochrsi`)
- Bollinger Bands and Ichimoku Cloud are overlaid on the price chart; all others have separate chart panels
- Backend exports `app`, `validateTicker`, `emaK`, `calcEMA`, `calcDEMA` for testing; `app.listen()` only runs when executed directly (not imported)
- Frontend exports `TickerSearch`, `IndicatorMenu`, `fmtVol`, `INDICATORS`, `T` as named exports for testing
- Recharts is mocked in Dashboard tests with simple div wrappers to avoid canvas/SVG issues in jsdom
