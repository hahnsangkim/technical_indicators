# Session Handoff - Technical Indicators Dashboard

> **Last Updated:** 2026-03-21
> **Last Commit:** `d3ee82c` - feat: add confluence indicator to frontend with event list panel
> **Branch:** main

---

## Current State

**Multi-indicator dashboard with 14 indicators** is fully implemented, tested, deployed, and responsive.

### What's Done

| Component | Status | Notes |
|-----------|--------|-------|
| Backend Express API | ✅ Complete | 14 indicator endpoints + tickers + health |
| CSV data loading | ✅ Complete | 487 tickers, loaded once at startup |
| Input validation | ✅ Complete | Regex validation, 400 on invalid ticker |
| Error handling | ✅ Complete | Global handler, CSV load failure, CORS, frontend error banners |
| Frontend Dashboard | ✅ Complete | Price chart + 14 indicator charts/overlays + KPI cards |
| Volume confluence | ✅ Complete | DeMark + OBV, 3 event types (CAPITULATION, OBV_DIVERGENCE, POST_SIGNAL) |
| Loading skeletons | ✅ Complete | Shimmer skeleton placeholders during loading |
| Error UI | ✅ Complete | Dismissible error banners for failed API requests |
| parseRows cache | ✅ Complete | Map-based cache, parse once per ticker |
| Ticker search | ✅ Complete | Searchable dropdown, 487 S&P 500 stocks |
| Indicator menu | ✅ Complete | Multi-select toggle, stays open during toggles |
| AbortController | ✅ Complete | Prevents stale fetch race conditions |
| Range filter | ✅ Complete | 3M, 6M, 1Y, ALL |
| Generic data management | ✅ Complete | Consolidated state/fetch/filter into single data map |
| Incremental indicator fetch | ✅ Complete | Only fetches newly toggled indicators, no full reload |
| Responsive layout | ✅ Complete | Mobile/tablet breakpoints at 768px and 480px |
| Vercel deployment | ✅ Complete | Frontend + backend separately deployed |
| ARCHITECTURE.md | ✅ Complete | Full system documentation for all 13 indicators |
| TEST_SPECIFICATION.md | ✅ Complete | 150+ test cases specified for all endpoints |
| Backend tests | ✅ Complete | 149 tests (vitest + supertest) |
| Frontend tests | ✅ Complete | 23 tests (vitest + jsdom + RTL) |

### Test Status

```
Backend:  149 tests passing (6 test files)
Frontend:  23 tests passing (4 test files)
Total:    172 tests passing
```

### Deployment

- **Frontend:** `https://technicalindicators.vercel.app` (auto-deploy from main)
- **Backend:** `https://technical-indicators-api.vercel.app`
- **Env:** `NEXT_PUBLIC_API_URL` set via Vercel env var (`.env.production` is gitignored)

---

## What's Remaining

No remaining tasks. All features implemented.

---

## Key Files

### Core Application
- [app/ECOComparison.jsx](app/ECOComparison.jsx) - Main dashboard component (~1327 lines)
- [backend/server.js](backend/server.js) - Express API with 14 indicator calculations

### Tests
- [backend/__tests__/math.test.js](backend/__tests__/math.test.js) - EMA/DEMA unit tests (9 tests)
- [backend/__tests__/validation.test.js](backend/__tests__/validation.test.js) - Input validation (8 tests)
- [backend/__tests__/endpoints.test.js](backend/__tests__/endpoints.test.js) - All 13 indicator API tests (104 tests)
- [backend/__tests__/errors.test.js](backend/__tests__/errors.test.js) - Error handling + performance (16 tests)
- [backend/__tests__/cache.test.js](backend/__tests__/cache.test.js) - parseRows caching (1 test)
- [backend/__tests__/confluence.test.js](backend/__tests__/confluence.test.js) - calcDemark/calcObv extraction + confluence endpoint (11 tests)
- [__tests__/fmtVol.test.js](__tests__/fmtVol.test.js) - Volume formatting (5 tests)
- [__tests__/TickerSearch.test.jsx](__tests__/TickerSearch.test.jsx) - Ticker search component (5 tests)
- [__tests__/IndicatorMenu.test.jsx](__tests__/IndicatorMenu.test.jsx) - Indicator menu (4 tests)
- [__tests__/Dashboard.test.jsx](__tests__/Dashboard.test.jsx) - Dashboard integration (9 tests)

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
cd backend && npm test       # backend: 149 tests
cd .. && npm test            # frontend: 23 tests

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
- Backend exports `app`, `validateTicker`, `emaK`, `calcEMA`, `calcDEMA`, `parseRows`, `calcDemark`, `calcObv` for testing; `app.listen()` only runs when executed directly (not imported); `export default app` for Vercel serverless
- parseRows results are cached in a Map per ticker — safe because CSV is loaded once at startup and never changes
- `calcDemark` and `calcObv` are shared functions used by both individual endpoints and the confluence endpoint
- Confluence data is sparse (events, not per-bar) — frontend filters by date instead of slicing by count
- Frontend exports `TickerSearch`, `IndicatorMenu`, `fmtVol`, `INDICATORS`, `T` as named exports for testing
- Recharts is mocked in Dashboard tests with simple div wrappers to avoid canvas/SVG issues in jsdom
- Indicator toggling uses incremental fetch (only new indicators), separate from ticker-change full reload — prevents menu from closing during multi-select
- Responsive breakpoints: 768px (header stacks, KPI 3-col, stats single-col, legends wrap) and 480px (KPI 2-col, smaller font)
- Dropdowns capped to `max-width: calc(100vw - 40px)` to prevent overflow on mobile
- Backend Vercel project renamed from `backend` to `technical-indicators-api`
