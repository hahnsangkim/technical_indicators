# Test Specification

## Backend Tests

### API Endpoint Tests

#### GET /api/tickers
| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Request tickers list | 200, JSON array of strings, sorted alphabetically |
| 2 | Response contains known tickers | Array includes "SPY", "AAPL", "MSFT" |
| 3 | No duplicate tickers | Array length === Set length |
| 4 | All tickers match validation regex | Each matches `^[A-Z0-9.]{1,10}$` |

#### GET /api/eco?ticker=SPY
| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Valid ticker (SPY) | 200, `{ ticker: "SPY", data: [...] }` |
| 2 | Each data point has required fields | `date`, `close`, `volume`, `eco`, `signal`, `histogram` |
| 3 | Data sorted by date ascending | `data[i].date < data[i+1].date` |
| 4 | `histogram === eco - signal` (within float tolerance) | `Math.abs(d.histogram - (d.eco - d.signal)) < 0.001` |
| 5 | Unknown ticker | 200, `{ ticker: "ZZZZ", data: [] }` |
| 6 | Missing ticker param | Defaults to SPY, returns data |
| 7 | Invalid ticker (special chars) | 400, `{ error: "Invalid ticker" }` |
| 8 | Ticker normalization | `?ticker=spy` returns same as `?ticker=SPY` |

#### GET /api/obv?ticker=SPY
| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Valid ticker (SPY) | 200, `{ ticker: "SPY", data: [...] }` |
| 2 | Each data point has required fields | `date`, `close`, `volume`, `obv`, `obvEma` |
| 3 | First data point OBV is 0 | `data[0].obv === 0` |
| 4 | OBV changes by exactly volume amount | If `close > prevClose`, `obv === prevObv + volume` |
| 5 | OBV unchanged on equal close | If `close === prevClose`, `obv === prevObv` |
| 6 | Unknown ticker | 200, `{ ticker: "ZZZZ", data: [] }` |
| 7 | Invalid ticker | 400, `{ error: "Invalid ticker" }` |

#### GET /api/demark?ticker=SPY
| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Valid ticker (SPY) | 200, `{ ticker: "SPY", data: [...] }` |
| 2 | Each data point has required fields | `date`, `close`, `volume`, `setupCount`, `setupType`, `countdownCount`, `countdownType`, `setupComplete`, `countdownComplete`, `perfected`, `signal`, `riskLine` |
| 3 | Data sorted by date ascending | `data[i].date < data[i+1].date` |
| 4 | First 4 bars have setupCount 0 | Not enough lookback for comparison |
| 5 | Setup count never exceeds 9 | `abs(setupCount) <= 9` for all rows |
| 6 | Countdown count never exceeds 13 | `countdownCount <= 13` for all rows |
| 7 | setupComplete only true when count reaches 9 | `setupComplete === true` implies prior 8 consecutive bars |
| 8 | Signal values are valid enums | One of `null`, `BUY_SETUP_9`, `SELL_SETUP_9`, `BUY_COUNTDOWN_13`, `SELL_COUNTDOWN_13` |
| 9 | Risk line present after setup-9 signal | Row with signal has non-null `riskLine` |
| 10 | Risk line invalidated on close breach | If close crosses risk line, subsequent rows have `riskLine: null` |
| 11 | Perfection flag only on setup completion | `perfected === true` only when `setupComplete === true` |
| 12 | Buy setup has negative setupCount | `setupType === "buy"` implies `setupCount < 0` |
| 13 | Sell setup has positive setupCount | `setupType === "sell"` implies `setupCount > 0` |
| 14 | Unknown ticker | 200, `{ ticker: "ZZZZ", data: [] }` |
| 15 | Invalid ticker | 400, `{ error: "Invalid ticker" }` |

#### GET /api/health
| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Health check | 200, `{ status: "ok", tickers: <number> }` |
| 2 | Ticker count > 0 | `tickers > 0` |

### Math Unit Tests

#### EMA Calculation
| # | Test Case | Expected |
|---|-----------|----------|
| 1 | `emaK(25)` | `2 / 26 ≈ 0.07692` |
| 2 | `emaK(13)` | `2 / 14 ≈ 0.14286` |
| 3 | `emaK(8)` | `2 / 9 ≈ 0.22222` |
| 4 | `calcEMA(10, 5, 0.5)` | `10 * 0.5 + 5 * 0.5 = 7.5` |
| 5 | EMA with k=1 equals current value | `calcEMA(val, prev, 1) === val` |
| 6 | EMA with k=0 equals previous value | `calcEMA(val, prev, 0) === prev` |

#### DEMA Calculation
| # | Test Case | Expected |
|---|-----------|----------|
| 1 | DEMA returns `{ ema1, ema2, dema }` | All three fields present |
| 2 | `dema === 2 * ema1 - ema2` | Within float tolerance |
| 3 | DEMA reduces lag vs single EMA | Compare response to step input |

### Input Validation Tests

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | `validateTicker("SPY")` | `"SPY"` |
| 2 | `validateTicker("spy")` | `"SPY"` (uppercased) |
| 3 | `validateTicker("BRK.B")` | `"BRK.B"` (dots allowed) |
| 4 | `validateTicker("")` | `"SPY"` (default) |
| 5 | `validateTicker(null)` | `"SPY"` (default) |
| 6 | `validateTicker(undefined)` | `"SPY"` (default) |
| 7 | `validateTicker("A<script>")` | `null` (rejected) |
| 8 | `validateTicker("TOOLONGTICKERX")` | `null` (>10 chars) |

### Error Handling Tests

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Server starts with valid CSV | No errors, port listening |
| 2 | Missing CSV file | `process.exit(1)` with error message |
| 3 | Global error handler catches thrown error | 500, `{ error: "Internal server error" }` |
| 4 | CORS headers present | `Access-Control-Allow-Origin` in response |

## Frontend Tests

### Dashboard Component

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Loading state shown initially | "Loading SPY data..." visible |
| 2 | Empty data state | "No data found for {ticker}" message |
| 3 | KPI cards render for ECO | CLOSE, ECO, ECO HIST cards visible |
| 4 | KPI cards render for OBV | CLOSE, OBV, OBV TREND cards visible |
| 5 | KPI cards render for DeMark | TD SETUP, LAST SIGNAL, RISK LINE cards visible |
| 6 | KPI cards render for all indicators | All 8 cards visible |
| 7 | Price chart always visible | Price chart rendered when data loaded |
| 8 | ECO chart visible when active | ECO chart shown only when ECO selected |
| 9 | OBV chart visible when active | OBV chart shown only when OBV selected |
| 10 | DeMark chart visible when active | TD Sequential chart shown only when DeMark selected |
| 11 | Risk line overlay on price chart | Red dashed line on price chart when DeMark active and risk line exists |
| 12 | Range buttons filter data | 3M shows ~63 bars, 6M ~126, 1Y ~252 |
| 13 | Signal badge reflects ECO state | Green BULLISH / Red BEARISH |
| 14 | DeMark statistics panel | Shows Method, Setup Phase, Countdown, Setup 9 Signals, Countdown 13s, Total Signals, Last Signal, Risk Line |

### TickerSearch Component

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Dropdown opens on click | Dropdown visible |
| 2 | Search filters tickers | Typing "AA" shows AAPL, AAL, etc. |
| 3 | Max 30 results shown | No more than 30 items rendered |
| 4 | Selecting ticker closes dropdown | Dropdown hidden, ticker updated |
| 5 | Click outside closes dropdown | Dropdown hidden |
| 6 | Shows ticker count | "{n} tickers available" footer |

### IndicatorMenu Component

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Badge shows count of active indicators | Number matches active count (1-3) |
| 2 | Toggling indicator updates state | Checkbox visual toggles |
| 3 | All three indicators listed | ECO, OBV, DeMark options present |
| 4 | Cannot deselect last indicator | At least 1 always active |
| 5 | Click outside closes menu | Menu hidden |

### Data Fetching

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Rapid ticker changes abort previous | Only latest fetch resolves |
| 2 | Network error shows in console | `console.error` called, no crash |
| 3 | Non-200 response throws | Error caught in `.catch()` |
| 4 | Deselecting indicator clears data | `setEcoData(null)` / `setObvData(null)` / `setDemarkData(null)` |
| 5 | DeMark fetch includes all required fields | Response has setupCount, signal, riskLine, etc. |

### Format Helpers

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | `fmtVol(1500000000)` | `"1.5B"` |
| 2 | `fmtVol(2500000)` | `"2.5M"` |
| 3 | `fmtVol(45000)` | `"45K"` |
| 4 | `fmtVol(500)` | `"500"` |
| 5 | `fmtVol(-3000000)` | `"-3.0M"` (handles negatives) |

## Integration Tests

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Frontend fetches tickers from backend | Dropdown populated with 487 tickers |
| 2 | Selecting ticker loads ECO data | ECO chart updates with correct ticker |
| 3 | Selecting ticker loads OBV data | OBV chart updates with correct ticker |
| 4 | Selecting ticker loads DeMark data | DeMark chart updates with correct ticker |
| 5 | Switching indicators re-fetches data | Correct API endpoint called |
| 6 | All three indicators render simultaneously | ECO + OBV + DeMark charts and stats visible together |
| 7 | Production URL accessible | `https://backend-rho-gray-78.vercel.app/api/health` returns 200 |

## Performance Considerations

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | `/api/eco?ticker=SPY` response time | < 200ms |
| 2 | `/api/demark?ticker=SPY` response time | < 200ms |
| 3 | `/api/tickers` response time | < 100ms |
| 4 | No memory leak on repeated ticker changes | Stable heap size over 50 changes |
| 5 | CSV parsed once at startup | No file reads on subsequent requests |
