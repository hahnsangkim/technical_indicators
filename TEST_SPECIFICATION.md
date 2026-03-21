# Test Specification

> **Status:** ✅ Implemented — 157 tests passing (137 backend + 20 frontend)
>
> **Backend:** `cd backend && npm test` — vitest + supertest
> **Frontend:** `npm test` — vitest + jsdom + React Testing Library
>
> | Test File | Tests | Spec Sections Covered |
> |-----------|-------|-----------------------|
> | `backend/__tests__/math.test.js` | 9 | Math Unit Tests (EMA, DEMA) |
> | `backend/__tests__/validation.test.js` | 8 | Input Validation Tests |
> | `backend/__tests__/endpoints.test.js` | 104 | All API Endpoint Tests (13 indicators + tickers + health) |
> | `backend/__tests__/errors.test.js` | 16 | Error Handling + Performance |
> | `__tests__/fmtVol.test.js` | 5 | Format Helpers |
> | `__tests__/TickerSearch.test.jsx` | 5 | TickerSearch Component |
> | `__tests__/IndicatorMenu.test.jsx` | 4 | IndicatorMenu Component |
> | `__tests__/Dashboard.test.jsx` | 6 | Dashboard Component |

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

#### GET /api/rsi?ticker=SPY
| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Valid ticker (SPY) | 200, `{ ticker: "SPY", data: [...] }` |
| 2 | Each data point has required fields | `date`, `close`, `volume`, `rsi` |
| 3 | Data sorted by date ascending | `data[i].date < data[i+1].date` |
| 4 | RSI bounded 0-100 | `0 <= rsi <= 100` for all rows where rsi is not warmup |
| 5 | First 13 rows have RSI = 50 (warmup) | `data[i].rsi === 50` for `i < 14` |
| 6 | RSI near 50 in flat market | Stable prices → RSI converges to ~50 |
| 7 | Unknown ticker | 200, `{ ticker: "ZZZZ", data: [] }` |
| 8 | Invalid ticker | 400, `{ error: "Invalid ticker" }` |
| 9 | Ticker normalization | `?ticker=spy` returns same as `?ticker=SPY` |

#### GET /api/macd?ticker=SPY
| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Valid ticker (SPY) | 200, `{ ticker: "SPY", data: [...] }` |
| 2 | Each data point has required fields | `date`, `close`, `volume`, `macd`, `signal`, `histogram` |
| 3 | Data sorted by date ascending | `data[i].date < data[i+1].date` |
| 4 | `histogram === macd - signal` (within float tolerance) | `Math.abs(d.histogram - (d.macd - d.signal)) < 0.001` |
| 5 | MACD starts at 0 when EMAs converge | First data point `macd ≈ 0` |
| 6 | Unknown ticker | 200, `{ ticker: "ZZZZ", data: [] }` |
| 7 | Invalid ticker | 400, `{ error: "Invalid ticker" }` |

#### GET /api/bollinger?ticker=SPY
| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Valid ticker (SPY) | 200, `{ ticker: "SPY", data: [...] }` |
| 2 | Each data point has required fields | `date`, `close`, `volume`, `upper`, `middle`, `lower` |
| 3 | Data sorted by date ascending | `data[i].date < data[i+1].date` |
| 4 | First 19 rows have null bands | `upper === null && middle === null && lower === null` for `i < 19` |
| 5 | Upper > middle > lower always | `upper > middle > lower` for all non-null rows |
| 6 | Bands symmetric around middle | `Math.abs((upper - middle) - (middle - lower)) < 0.01` |
| 7 | Middle band equals SMA(20) | `middle` matches manual SMA calculation within tolerance |
| 8 | Unknown ticker | 200, `{ ticker: "ZZZZ", data: [] }` |
| 9 | Invalid ticker | 400, `{ error: "Invalid ticker" }` |

#### GET /api/atr?ticker=SPY
| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Valid ticker (SPY) | 200, `{ ticker: "SPY", data: [...] }` |
| 2 | Each data point has required fields | `date`, `close`, `volume`, `tr`, `atr` |
| 3 | Data sorted by date ascending | `data[i].date < data[i+1].date` |
| 4 | First 13 rows have null ATR | `atr === null` for `i < 13` |
| 5 | ATR always positive | `atr > 0` for all non-null rows |
| 6 | TR always positive | `tr > 0` for all rows |
| 7 | TR >= high - low | `tr >= high - low` (true range includes gap) |
| 8 | Unknown ticker | 200, `{ ticker: "ZZZZ", data: [] }` |
| 9 | Invalid ticker | 400, `{ error: "Invalid ticker" }` |

#### GET /api/adx?ticker=SPY
| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Valid ticker (SPY) | 200, `{ ticker: "SPY", data: [...] }` |
| 2 | Each data point has required fields | `date`, `close`, `volume`, `adx`, `plusDI`, `minusDI` |
| 3 | Data sorted by date ascending | `data[i].date < data[i+1].date` |
| 4 | First row has all nulls | `adx === null && plusDI === null && minusDI === null` at `i === 0` |
| 5 | First 13 rows have null ADX | `adx === null` for `i < 14` |
| 6 | ADX bounded 0-100 | `0 <= adx <= 100` for all non-null rows |
| 7 | +DI and -DI bounded 0-100 | `0 <= plusDI <= 100` and `0 <= minusDI <= 100` |
| 8 | Unknown ticker | 200, `{ ticker: "ZZZZ", data: [] }` |
| 9 | Invalid ticker | 400, `{ error: "Invalid ticker" }` |

#### GET /api/cci?ticker=SPY
| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Valid ticker (SPY) | 200, `{ ticker: "SPY", data: [...] }` |
| 2 | Each data point has required fields | `date`, `close`, `volume`, `cci` |
| 3 | Data sorted by date ascending | `data[i].date < data[i+1].date` |
| 4 | First 19 rows have null CCI | `cci === null` for `i < 19` |
| 5 | CCI is unbounded (can exceed ±100) | Values outside [-100, 100] expected in volatile periods |
| 6 | CCI ≈ 0 in flat market | Stable prices → CCI converges to ~0 |
| 7 | Unknown ticker | 200, `{ ticker: "ZZZZ", data: [] }` |
| 8 | Invalid ticker | 400, `{ error: "Invalid ticker" }` |

#### GET /api/roc?ticker=SPY
| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Valid ticker (SPY) | 200, `{ ticker: "SPY", data: [...] }` |
| 2 | Each data point has required fields | `date`, `close`, `volume`, `roc` |
| 3 | Data sorted by date ascending | `data[i].date < data[i+1].date` |
| 4 | First 12 rows have null ROC | `roc === null` for `i < 12` |
| 5 | ROC formula correct | `roc === ((close - close_12_ago) / close_12_ago) * 100` within tolerance |
| 6 | ROC = 0 when price unchanged | Same close 12 bars apart → `roc === 0` |
| 7 | Unknown ticker | 200, `{ ticker: "ZZZZ", data: [] }` |
| 8 | Invalid ticker | 400, `{ error: "Invalid ticker" }` |

#### GET /api/williamsr?ticker=SPY
| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Valid ticker (SPY) | 200, `{ ticker: "SPY", data: [...] }` |
| 2 | Each data point has required fields | `date`, `close`, `volume`, `williamsR` |
| 3 | Data sorted by date ascending | `data[i].date < data[i+1].date` |
| 4 | First 13 rows have null %R | `williamsR === null` for `i < 13` |
| 5 | Williams %R bounded -100 to 0 | `-100 <= williamsR <= 0` for all non-null rows |
| 6 | %R = 0 when close equals highest high | Close at period high → `williamsR === 0` |
| 7 | %R = -100 when close equals lowest low | Close at period low → `williamsR === -100` |
| 8 | Unknown ticker | 200, `{ ticker: "ZZZZ", data: [] }` |
| 9 | Invalid ticker | 400, `{ error: "Invalid ticker" }` |

#### GET /api/stochrsi?ticker=SPY
| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Valid ticker (SPY) | 200, `{ ticker: "SPY", data: [...] }` |
| 2 | Each data point has required fields | `date`, `close`, `volume`, `stochRsi`, `k`, `d` |
| 3 | Data sorted by date ascending | `data[i].date < data[i+1].date` |
| 4 | First 26 rows have null values | `stochRsi === null` for `i < 27` (rsiPeriod + stochPeriod - 1) |
| 5 | StochRSI bounded 0-1 | `0 <= stochRsi <= 1` for all non-null rows |
| 6 | %K bounded 0-1 | `0 <= k <= 1` for all non-null rows |
| 7 | %D bounded 0-1 | `0 <= d <= 1` for all non-null rows |
| 8 | %D is smoother than %K | %D changes less bar-to-bar on average |
| 9 | Unknown ticker | 200, `{ ticker: "ZZZZ", data: [] }` |
| 10 | Invalid ticker | 400, `{ error: "Invalid ticker" }` |

#### GET /api/ichimoku?ticker=SPY
| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Valid ticker (SPY) | 200, `{ ticker: "SPY", data: [...] }` |
| 2 | Each data point has required fields | `date`, `close`, `volume`, `tenkan`, `kijun`, `senkouA`, `senkouB`, `chikou` |
| 3 | Data sorted by date ascending | `data[i].date < data[i+1].date` |
| 4 | Tenkan null for first 8 bars | `tenkan === null` for `i < 8` |
| 5 | Kijun null for first 25 bars | `kijun === null` for `i < 25` |
| 6 | Senkou A null for first 51 bars | `senkouA === null` for `i < 51` (26 + 25) |
| 7 | Senkou B null for first 77 bars | `senkouB === null` for `i < 77` (26 + 51) |
| 8 | Tenkan = (9-period high + 9-period low) / 2 | Manual calculation matches within tolerance |
| 9 | Chikou null for last 26 bars | `chikou === null` for `i >= data.length - 26` |
| 10 | Unknown ticker | 200, `{ ticker: "ZZZZ", data: [] }` |
| 11 | Invalid ticker | 400, `{ error: "Invalid ticker" }` |

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
| 6 | KPI cards render for RSI | RSI value, overbought/oversold status cards visible |
| 7 | KPI cards render for MACD | MACD, Signal, Histogram cards visible |
| 8 | KPI cards render for Bollinger Bands | Bandwidth, %B position cards visible |
| 9 | KPI cards render for ATR | ATR value, ATR % of price cards visible |
| 10 | KPI cards render for ADX | ADX value, trend strength, +DI vs -DI cards visible |
| 11 | KPI cards render for CCI | CCI value, overbought/oversold status cards visible |
| 12 | KPI cards render for ROC | ROC value, momentum direction cards visible |
| 13 | KPI cards render for Williams %R | %R value, overbought/oversold status cards visible |
| 14 | KPI cards render for Stochastic RSI | %K, %D, zone status cards visible |
| 15 | KPI cards render for Ichimoku | Price vs cloud, Tenkan vs Kijun, cloud color cards visible |
| 16 | Price chart always visible | Price chart rendered when data loaded |
| 17 | ECO chart visible when active | ECO chart shown only when ECO selected |
| 18 | OBV chart visible when active | OBV chart shown only when OBV selected |
| 19 | DeMark chart visible when active | TD Sequential chart shown only when DeMark selected |
| 20 | RSI chart visible when active | RSI oscillator with ref lines at 30/50/70 shown |
| 21 | MACD chart visible when active | MACD line + signal + histogram shown |
| 22 | Bollinger Bands overlay on price chart | Upper/lower bands and middle line drawn over price |
| 23 | ATR chart visible when active | Single ATR line in separate panel shown |
| 24 | ADX chart visible when active | ADX, +DI, -DI lines with ref line at 25 shown |
| 25 | CCI chart visible when active | CCI oscillator with ref lines at +100/0/-100 shown |
| 26 | ROC chart visible when active | ROC oscillator around zero centerline shown |
| 27 | Williams %R chart visible when active | %R oscillator with ref lines at -20/-80 shown |
| 28 | Stochastic RSI chart visible when active | %K/%D lines with ref lines at 0.2/0.5/0.8 shown |
| 29 | Ichimoku overlay on price chart | Tenkan/Kijun lines, Senkou A/B cloud, Chikou span drawn over price |
| 30 | Risk line overlay on price chart | Red dashed line on price chart when DeMark active and risk line exists |
| 31 | Range buttons filter data | 3M shows ~63 bars, 6M ~126, 1Y ~252 |
| 32 | Signal badge reflects ECO state | Green BULLISH / Red BEARISH |
| 33 | DeMark statistics panel | Shows Method, Setup Phase, Countdown, Setup 9 Signals, Countdown 13s, Total Signals, Last Signal, Risk Line |

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
| 1 | Badge shows count of active indicators | Number matches active count (1-13) |
| 2 | Toggling indicator updates state | Checkbox visual toggles |
| 3 | All 13 indicators listed | ECO, OBV, DeMark, RSI, MACD, BB, ATR, ADX, CCI, ROC, %R, StochRSI, Ichimoku options present |
| 4 | Cannot deselect last indicator | At least 1 always active |
| 5 | Click outside closes menu | Menu hidden |
| 6 | Each indicator has unique color | No two indicators share the same color swatch |

### Data Fetching

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Rapid ticker changes abort previous | Only latest fetch resolves |
| 2 | Network error shows in console | `console.error` called, no crash |
| 3 | Non-200 response throws | Error caught in `.catch()` |
| 4 | Deselecting indicator clears data | Deactivated indicator data set to null |
| 5 | DeMark fetch includes all required fields | Response has setupCount, signal, riskLine, etc. |
| 6 | All 13 indicator endpoints respond | Each `/api/<indicator>?ticker=SPY` returns 200 with data |
| 7 | Activating multiple indicators fetches all | Concurrent fetches resolve correctly |

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
| 5 | Selecting ticker loads RSI data | RSI chart updates with correct ticker |
| 6 | Selecting ticker loads MACD data | MACD chart updates with correct ticker |
| 7 | Selecting ticker loads Bollinger data | Bollinger overlay updates with correct ticker |
| 8 | Selecting ticker loads ATR data | ATR chart updates with correct ticker |
| 9 | Selecting ticker loads ADX data | ADX chart updates with correct ticker |
| 10 | Selecting ticker loads CCI data | CCI chart updates with correct ticker |
| 11 | Selecting ticker loads ROC data | ROC chart updates with correct ticker |
| 12 | Selecting ticker loads Williams %R data | Williams %R chart updates with correct ticker |
| 13 | Selecting ticker loads Stochastic RSI data | Stochastic RSI chart updates with correct ticker |
| 14 | Selecting ticker loads Ichimoku data | Ichimoku overlay updates with correct ticker |
| 15 | Switching indicators re-fetches data | Correct API endpoint called |
| 16 | All 13 indicators render simultaneously | All charts and stats visible together without layout break |
| 7 | Production frontend accessible | `https://technicalindicators.vercel.app` returns 200 |
| 8 | Production backend accessible | `https://backend-rho-gray-78.vercel.app/api/health` returns 200 |

## Performance Considerations

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | `/api/eco?ticker=SPY` response time | < 200ms |
| 2 | `/api/demark?ticker=SPY` response time | < 200ms |
| 3 | `/api/tickers` response time | < 100ms |
| 4 | `/api/rsi?ticker=SPY` response time | < 200ms |
| 5 | `/api/macd?ticker=SPY` response time | < 200ms |
| 6 | `/api/bollinger?ticker=SPY` response time | < 200ms |
| 7 | `/api/atr?ticker=SPY` response time | < 200ms |
| 8 | `/api/adx?ticker=SPY` response time | < 200ms |
| 9 | `/api/cci?ticker=SPY` response time | < 200ms |
| 10 | `/api/roc?ticker=SPY` response time | < 200ms |
| 11 | `/api/williamsr?ticker=SPY` response time | < 200ms |
| 12 | `/api/stochrsi?ticker=SPY` response time | < 200ms |
| 13 | `/api/ichimoku?ticker=SPY` response time | < 200ms |
| 14 | No memory leak on repeated ticker changes | Stable heap size over 50 changes |
| 15 | CSV parsed once at startup | No file reads on subsequent requests |
| 16 | All 13 endpoints handle concurrent requests | No race conditions or data corruption |
