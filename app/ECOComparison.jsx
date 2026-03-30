"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  ComposedChart, Area, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import WatchlistPanel from "./WatchlistPanel";
import Link from "next/link";

// ─── THEME ────────────────────────────────────────────────────────────────────
const T = {
  bg: "#07090f",
  surface: "#0d1117",
  panel: "#111520",
  border: "#1a2236",
  borderHi: "#2a3d5e",
  lime: "#39ff8a",
  red: "#ff3a5c",
  gold: "#f5c842",
  blue: "#4a9eff",
  cyan: "#00e5cc",
  purple: "#b06aff",
  text: "#d0dff5",
  sub: "#7a90b0",
  muted: "#3a4d6a",
};

const INDICATORS = {
  eco: { label: "ECO", desc: "Enhanced Ergodic Candlestick Oscillator", color: T.cyan },
  obv: { label: "OBV", desc: "On-Balance Volume", color: T.purple },
  demark: { label: "DeMark", desc: "TD Sequential (Setup 9 / Countdown 13)", color: T.gold },
  rsi: { label: "RSI", desc: "Relative Strength Index (14)", color: "#ff9f43" },
  macd: { label: "MACD", desc: "Moving Average Convergence Divergence", color: "#54a0ff" },
  bollinger: { label: "BB", desc: "Bollinger Bands (20, 2)", color: "#ee5a24" },
  atr: { label: "ATR", desc: "Average True Range (14)", color: "#c44569" },
  adx: { label: "ADX", desc: "Average Directional Index (14)", color: "#6ab04c" },
  cci: { label: "CCI", desc: "Commodity Channel Index (20)", color: "#e056a0" },
  roc: { label: "ROC", desc: "Rate of Change (12)", color: "#7ed6df" },
  williamsR: { label: "%R", desc: "Williams %R (14)", color: "#f8a5c2" },
  stochRsi: { label: "StochRSI", desc: "Stochastic RSI (14,14,3,3)", color: "#f9ca24" },
  ichimoku: { label: "Ichimoku", desc: "Ichimoku Cloud (9, 26, 52)", color: "#a29bfe" },
  confluence: { label: "Confluence", desc: "Volume Confluence (DeMark + OBV)", color: "#ff6b6b" },
};

// ─── API ──────────────────────────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// ─── TICKER SEARCH ────────────────────────────────────────────────────────────
function TickerSearch({ tickers, selected, onSelect }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const results = useMemo(() => {
    if (!query) return tickers.slice(0, 30);
    const q = query.toUpperCase();
    return tickers.filter(t => t.includes(q)).slice(0, 30);
  }, [query, tickers]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div onClick={() => setOpen(!open)} style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 12px", borderRadius: 6,
        background: T.panel, border: `1px solid ${T.borderHi}`,
        cursor: "pointer", minWidth: 140,
      }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: T.cyan, fontFamily: "monospace" }}>{selected}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" style={{ marginLeft: "auto", opacity: 0.5 }}>
          <path d="M1 1l4 4 4-4" stroke={T.sub} strokeWidth="1.5" fill="none" />
        </svg>
      </div>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, marginTop: 4,
          width: 220, maxWidth: "calc(100vw - 40px)", maxHeight: 340, background: T.surface,
          border: `1px solid ${T.borderHi}`, borderRadius: 8,
          boxShadow: "0 12px 40px rgba(0,0,0,0.6)", zIndex: 100,
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <div style={{ padding: "8px 10px", borderBottom: `1px solid ${T.border}` }}>
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search ticker…"
              style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: `1px solid ${T.border}`, background: T.panel, color: T.text, fontSize: 12, fontFamily: "monospace", outline: "none" }}
              onFocus={e => e.target.style.borderColor = T.cyan}
              onBlur={e => e.target.style.borderColor = T.border} />
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {results.length === 0 && <div style={{ padding: "14px", textAlign: "center", color: T.muted, fontSize: 11 }}>No matches</div>}
            {results.map(t => (
              <button key={t} onClick={() => { onSelect(t); setOpen(false); setQuery(""); }}
                style={{ display: "block", width: "100%", padding: "8px 14px", background: t === selected ? `${T.cyan}15` : "transparent", border: "none", borderBottom: `1px solid ${T.border}`, color: t === selected ? T.cyan : T.text, fontSize: 12, fontFamily: "monospace", fontWeight: t === selected ? 700 : 400, cursor: "pointer", textAlign: "left" }}
                onMouseEnter={e => { if (t !== selected) e.target.style.background = `${T.blue}12`; }}
                onMouseLeave={e => { if (t !== selected) e.target.style.background = "transparent"; }}>
                {t}
              </button>
            ))}
          </div>
          <div style={{ padding: "6px 10px", borderTop: `1px solid ${T.border}`, fontSize: 9, color: T.muted, textAlign: "center" }}>
            {tickers.length} tickers available
          </div>
        </div>
      )}
    </div>
  );
}

// ─── INDICATOR MENU ───────────────────────────────────────────────────────────
function IndicatorMenu({ active, onToggle }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 12px", borderRadius: 6,
        background: T.panel, border: `1px solid ${T.borderHi}`,
        cursor: "pointer", color: T.text, fontSize: 11, fontWeight: 600,
        letterSpacing: "0.06em",
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.sub} strokeWidth="2">
          <path d="M3 3v18h18" /><path d="M7 16l4-8 4 4 6-10" />
        </svg>
        Indicators
        <span style={{
          background: T.cyan, color: "#000", fontSize: 9, fontWeight: 800,
          borderRadius: 4, padding: "1px 5px", marginLeft: 2,
        }}>{active.length}</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "100%", right: 0, marginTop: 4,
          width: 260, maxWidth: "calc(100vw - 40px)", background: T.surface,
          border: `1px solid ${T.borderHi}`, borderRadius: 8,
          boxShadow: "0 12px 40px rgba(0,0,0,0.6)", zIndex: 100,
          overflow: "hidden",
        }}>
          <div style={{ padding: "8px 12px", borderBottom: `1px solid ${T.border}`, fontSize: 9, color: T.muted, letterSpacing: "0.14em" }}>
            SELECT INDICATORS
          </div>
          {Object.entries(INDICATORS).map(([key, ind]) => {
            const isActive = active.includes(key);
            return (
              <button key={key} onClick={() => onToggle(key)} style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "10px 12px", background: isActive ? `${ind.color}10` : "transparent",
                border: "none", borderBottom: `1px solid ${T.border}`,
                cursor: "pointer", textAlign: "left",
              }}>
                <div style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                  background: isActive ? ind.color : T.muted,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: isActive ? `0 0 8px ${ind.color}` : "none",
                }}>
                  {isActive && <span style={{ color: "#000", fontSize: 10, fontWeight: 900 }}>&#10003;</span>}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: isActive ? ind.color : T.sub }}>{ind.label}</div>
                  <div style={{ fontSize: 9, color: T.muted, marginTop: 1 }}>{ind.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── FORMAT HELPERS ───────────────────────────────────────────────────────────
function fmtVol(n) {
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (abs >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (abs >= 1e3) return (n / 1e3).toFixed(0) + "K";
  return n.toString();
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export { TickerSearch, IndicatorMenu, fmtVol, INDICATORS, T };

export default function Dashboard() {
  const [tickers, setTickers] = useState([]);
  const [ticker, setTicker] = useState("SPY");
  const [activeIndicators, setActiveIndicators] = useState(["eco"]);
  const [indicatorData, setIndicatorData] = useState({});
  const [priceData, setPriceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("1Y");
  const [error, setError] = useState(null);
  const [signalData, setSignalData] = useState([]);
  const [showWatchlist, setShowWatchlist] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/tickers`)
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then(setTickers)
      .catch(err => {
        console.error("Failed to load tickers:", err);
        setError("Failed to load ticker list. Please refresh.");
      });
  }, []);

  // Fetch price data and all indicator data when ticker changes
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const API_KEYS = { williamsR: "williamsr", stochRsi: "stochrsi" };

    // Always fetch price data (independent of indicators)
    const priceFetch = fetch(`${API}/api/price?ticker=${ticker}`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then(res => res.data);

    const indicatorFetches = activeIndicators.map(key => {
      const endpoint = API_KEYS[key] || key;
      return fetch(`${API}/api/${endpoint}?ticker=${ticker}`, { signal: controller.signal })
        .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
        .then(res => ({ key, data: res.data }));
    });

    Promise.all([priceFetch, Promise.all(indicatorFetches)])
      .then(([price, results]) => {
        setPriceData(price);
        const newData = {};
        for (const k of Object.keys(INDICATORS)) newData[k] = null;
        for (const { key, data } of results) newData[key] = data;
        setIndicatorData(newData);
      })
      .catch(err => {
        if (err.name !== "AbortError") {
          console.error("Indicator fetch failed:", err);
          setError("Failed to load indicator data. Please try again.");
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [ticker]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch signals for current ticker
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API}/api/signals?ticker=${ticker}`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then(res => setSignalData(res.signals || []))
      .catch(err => { if (err.name !== "AbortError") console.error("Signal fetch failed:", err); });
    return () => controller.abort();
  }, [ticker]);

  // Fetch only newly activated indicators (without full reload)
  useEffect(() => {
    if (loading) return; // skip during initial load
    const API_KEYS = { williamsR: "williamsr", stochRsi: "stochrsi" };
    const toFetch = activeIndicators.filter(key => !indicatorData[key]);
    if (toFetch.length === 0) {
      // Deactivation — clear removed indicators
      setIndicatorData(prev => {
        const next = { ...prev };
        for (const k of Object.keys(INDICATORS)) {
          if (!activeIndicators.includes(k)) next[k] = null;
        }
        return next;
      });
      return;
    }

    setError(null);
    const controller = new AbortController();
    const fetches = toFetch.map(key => {
      const endpoint = API_KEYS[key] || key;
      return fetch(`${API}/api/${endpoint}?ticker=${ticker}`, { signal: controller.signal })
        .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
        .then(res => ({ key, data: res.data }));
    });

    Promise.all(fetches)
      .then(results => {
        setIndicatorData(prev => {
          const next = { ...prev };
          for (const k of Object.keys(INDICATORS)) {
            if (!activeIndicators.includes(k)) next[k] = null;
          }
          for (const { key, data } of results) next[key] = data;
          return next;
        });
      })
      .catch(err => {
        if (err.name !== "AbortError") {
          console.error("Indicator fetch failed:", err);
          setError("Failed to load indicator data. Please try again.");
        }
      });

    return () => controller.abort();
  }, [activeIndicators]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleIndicator = (key) => {
    setActiveIndicators(prev => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev; // keep at least one
        return prev.filter(k => k !== key);
      }
      return [...prev, key];
    });
  };

  // Price data is fetched independently — always available regardless of active indicators
  const primaryData = priceData;

  const filtered = useMemo(() => {
    if (!primaryData) return [];
    const map = { "3M": 63, "6M": 126, "1Y": 252, "ALL": primaryData.length };
    const n = map[range] || primaryData.length;
    return primaryData.slice(-n);
  }, [primaryData, range]);

  const filteredData = useMemo(() => {
    const result = {};
    const map = { "3M": 63, "6M": 126, "1Y": 252 };
    for (const k of Object.keys(INDICATORS)) {
      const data = indicatorData[k];
      if (!data) { result[k] = []; continue; }
      if (k === "confluence") {
        // Sparse event data — filter by date instead of slicing by count
        const startDate = filtered.length > 0 ? filtered[0].date : "";
        result[k] = data.filter(d => d.date >= startDate);
      } else {
        const n = map[range] || data.length;
        result[k] = data.slice(-n);
      }
    }
    return result;
  }, [indicatorData, range, filtered]);

  // Merge risk line and Bollinger data into price data for chart overlay (must be before early returns — hooks rule)
  const priceWithRisk = useMemo(() => {
    const demarkByDate = {};
    if (filteredData.demark.length) {
      for (const d of filteredData.demark) {
        if (d.riskLine !== null) demarkByDate[d.date] = d.riskLine;
      }
    }
    const bbByDate = {};
    if (filteredData.bollinger.length) {
      for (const d of filteredData.bollinger) {
        if (d.upper !== null) bbByDate[d.date] = { bbUpper: d.upper, bbMiddle: d.middle, bbLower: d.lower };
      }
    }
    const ichByDate = {};
    if (filteredData.ichimoku.length) {
      for (const d of filteredData.ichimoku) {
        ichByDate[d.date] = { tenkan: d.tenkan, kijun: d.kijun, senkouA: d.senkouA, senkouB: d.senkouB, chikou: d.chikou };
      }
    }
    if (!filteredData.demark.length && !filteredData.bollinger.length && !filteredData.ichimoku.length) return filtered;
    return filtered.map(row => ({
      ...row,
      riskLine: demarkByDate[row.date] ?? null,
      ...(bbByDate[row.date] || { bbUpper: null, bbMiddle: null, bbLower: null }),
      ...(ichByDate[row.date] || { tenkan: null, kijun: null, senkouA: null, senkouB: null, chikou: null }),
    }));
  }, [filtered, filteredData]);

  // Merge signal markers into indicator data for chart display
  const mergeSignals = (data, indicator) => {
    if (!signalData.length || !data.length) return data;
    const signalMap = {};
    for (const s of signalData) {
      if (s.indicator === indicator) signalMap[s.date] = s;
    }
    return data.map(d => ({ ...d, _signal: signalMap[d.date] || null }));
  };

  const signalDot = ({ cx, cy, payload }) => {
    if (!payload || !payload._signal) return null;
    const isBuy = payload._signal.direction === "buy";
    const isSell = payload._signal.direction === "sell";
    const color = isBuy ? T.lime : isSell ? T.red : T.gold;
    const label = isBuy ? "BUY" : isSell ? "SELL" : "";
    const yOffset = isBuy ? 22 : -16;
    return (
      <g key={`sig-${payload.date}`}>
        <circle cx={cx} cy={cy} r={6} fill={color} stroke="#fff" strokeWidth={1.5} />
        {label && <text x={cx} y={cy + yOffset} textAnchor="middle" fill={color} fontSize={11} fontWeight={700} fontFamily="monospace">{label}</text>}
      </g>
    );
  };

  if (loading || !primaryData) {
    const skelStyle = {
      background: `linear-gradient(90deg, ${T.panel} 25%, ${T.border} 50%, ${T.panel} 75%)`,
      backgroundSize: "200% 100%",
      animation: "shimmer 1.5s infinite",
      borderRadius: 8,
    };
    return (
      <div style={{ minHeight: "100vh", background: T.bg, padding: 20 }} data-testid="loading-skeleton">
        <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
        {error ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
            <div style={{ color: T.red, fontSize: 14, fontFamily: "monospace" }}>{error}</div>
          </div>
        ) : (
          <>
            {/* Header skeleton */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
              <div style={{ ...skelStyle, width: 200, height: 36 }} />
              <div style={{ ...skelStyle, width: 160, height: 36 }} />
              <div style={{ ...skelStyle, width: 120, height: 36, marginLeft: "auto" }} />
            </div>
            {/* Chart skeleton */}
            <div style={{ ...skelStyle, height: 340, marginBottom: 20 }} />
            {/* Stats skeleton */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} style={{ ...skelStyle, height: 100 }} />
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  if (primaryData.length === 0) return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
      <div style={{ color: T.red, fontSize: 14, fontFamily: "monospace" }}>No data found for {ticker}</div>
      {tickers.length > 0 && <TickerSearch tickers={tickers} selected={ticker} onSelect={setTicker} />}
    </div>
  );

  const latest = filtered[filtered.length - 1];

  // ECO stats
  const hasEco = activeIndicators.includes("eco") && filteredData.eco.length > 0;
  const ecoLatest = hasEco ? filteredData.eco[filteredData.eco.length - 1] : null;
  let ecoBull = false, ecoCrossovers = 0, ecoBullBars = 0, ecoBullPct = "0", ecoMax = -Infinity, ecoMin = Infinity;
  if (hasEco) {
    ecoBull = ecoLatest.eco > ecoLatest.signal;
    for (const d of filteredData.eco) {
      if (d.eco > ecoMax) ecoMax = d.eco;
      if (d.eco < ecoMin) ecoMin = d.eco;
      if (d.eco > d.signal) ecoBullBars++;
    }
    ecoBullPct = ((ecoBullBars / filteredData.eco.length) * 100).toFixed(0);
    for (let i = 1; i < filteredData.eco.length; i++) {
      if ((filteredData.eco[i - 1].eco > filteredData.eco[i - 1].signal) !== (filteredData.eco[i].eco > filteredData.eco[i].signal)) ecoCrossovers++;
    }
  }

  // OBV stats
  const hasObv = activeIndicators.includes("obv") && filteredData.obv.length > 0;
  const obvLatest = hasObv ? filteredData.obv[filteredData.obv.length - 1] : null;
  let obvTrend = "", obvMax = -Infinity, obvMin = Infinity;
  if (hasObv) {
    obvTrend = obvLatest.obv > obvLatest.obvEma ? "BULLISH" : "BEARISH";
    for (const d of filteredData.obv) {
      if (d.obv > obvMax) obvMax = d.obv;
      if (d.obv < obvMin) obvMin = d.obv;
    }
  }

  // DeMark stats
  const hasDemark = activeIndicators.includes("demark") && filteredData.demark.length > 0;
  const demarkLatest = hasDemark ? filteredData.demark[filteredData.demark.length - 1] : null;
  let demarkSignals = [], demarkSetup9Count = 0, demarkCountdown13Count = 0;
  if (hasDemark) {
    for (const d of filteredData.demark) {
      if (d.signal) {
        demarkSignals.push(d);
        if (d.signal.endsWith("SETUP_9")) demarkSetup9Count++;
        if (d.signal.endsWith("COUNTDOWN_13")) demarkCountdown13Count++;
      }
    }
  }
  const lastDemarkSignal = demarkSignals.length > 0 ? demarkSignals[demarkSignals.length - 1] : null;
  const currentRiskLine = hasDemark ? demarkLatest.riskLine : null;
  const currentRiskLineType = hasDemark ? demarkLatest.riskLineType : null;

  // RSI stats
  const hasRsi = activeIndicators.includes("rsi") && filteredData.rsi.length > 0;
  const rsiLatest = hasRsi ? filteredData.rsi[filteredData.rsi.length - 1] : null;
  let rsiMax = -Infinity, rsiMin = Infinity, rsiOverboughtBars = 0, rsiOversoldBars = 0;
  if (hasRsi) {
    for (const d of filteredData.rsi) {
      if (d.rsi > rsiMax) rsiMax = d.rsi;
      if (d.rsi < rsiMin) rsiMin = d.rsi;
      if (d.rsi > 70) rsiOverboughtBars++;
      if (d.rsi < 30) rsiOversoldBars++;
    }
  }

  // MACD stats
  const hasMacd = activeIndicators.includes("macd") && filteredData.macd.length > 0;
  const macdLatest = hasMacd ? filteredData.macd[filteredData.macd.length - 1] : null;
  let macdBull = false, macdCrossovers = 0;
  if (hasMacd) {
    macdBull = macdLatest.macd > macdLatest.signal;
    for (let i = 1; i < filteredData.macd.length; i++) {
      if ((filteredData.macd[i - 1].macd > filteredData.macd[i - 1].signal) !== (filteredData.macd[i].macd > filteredData.macd[i].signal)) macdCrossovers++;
    }
  }

  // Bollinger stats
  const hasBollinger = activeIndicators.includes("bollinger") && filteredData.bollinger.length > 0;
  const bollingerLatest = hasBollinger ? filteredData.bollinger[filteredData.bollinger.length - 1] : null;

  // ATR stats
  const hasAtr = activeIndicators.includes("atr") && filteredData.atr.length > 0;
  const atrLatest = hasAtr ? filteredData.atr[filteredData.atr.length - 1] : null;
  let atrMax = -Infinity, atrMin = Infinity;
  if (hasAtr) {
    for (const d of filteredData.atr) {
      if (d.atr !== null && d.atr > atrMax) atrMax = d.atr;
      if (d.atr !== null && d.atr < atrMin) atrMin = d.atr;
    }
  }

  // ADX stats
  const hasAdx = activeIndicators.includes("adx") && filteredData.adx.length > 0;
  const adxLatest = hasAdx ? filteredData.adx[filteredData.adx.length - 1] : null;
  let adxMax = -Infinity;
  if (hasAdx) {
    for (const d of filteredData.adx) {
      if (d.adx !== null && d.adx > adxMax) adxMax = d.adx;
    }
  }

  // CCI stats
  const hasCci = activeIndicators.includes("cci") && filteredData.cci.length > 0;
  const cciLatest = hasCci ? filteredData.cci[filteredData.cci.length - 1] : null;
  let cciMax = -Infinity, cciMin = Infinity, cciOverboughtBars = 0, cciOversoldBars = 0;
  if (hasCci) {
    for (const d of filteredData.cci) {
      if (d.cci !== null && d.cci > cciMax) cciMax = d.cci;
      if (d.cci !== null && d.cci < cciMin) cciMin = d.cci;
      if (d.cci !== null && d.cci > 100) cciOverboughtBars++;
      if (d.cci !== null && d.cci < -100) cciOversoldBars++;
    }
  }

  // ROC stats
  const hasRoc = activeIndicators.includes("roc") && filteredData.roc.length > 0;
  const rocLatest = hasRoc ? filteredData.roc[filteredData.roc.length - 1] : null;
  let rocMax = -Infinity, rocMin = Infinity, rocPositiveBars = 0, rocNegativeBars = 0;
  if (hasRoc) {
    for (const d of filteredData.roc) {
      if (d.roc !== null && d.roc > rocMax) rocMax = d.roc;
      if (d.roc !== null && d.roc < rocMin) rocMin = d.roc;
      if (d.roc !== null && d.roc > 0) rocPositiveBars++;
      if (d.roc !== null && d.roc < 0) rocNegativeBars++;
    }
  }

  // Williams %R stats
  const hasWilliamsR = activeIndicators.includes("williamsR") && filteredData.williamsR.length > 0;
  const williamsRLatest = hasWilliamsR ? filteredData.williamsR[filteredData.williamsR.length - 1] : null;
  let wrMax = -Infinity, wrMin = Infinity, wrOverboughtBars = 0, wrOversoldBars = 0;
  if (hasWilliamsR) {
    for (const d of filteredData.williamsR) {
      if (d.williamsR !== null && d.williamsR > wrMax) wrMax = d.williamsR;
      if (d.williamsR !== null && d.williamsR < wrMin) wrMin = d.williamsR;
      if (d.williamsR !== null && d.williamsR > -20) wrOverboughtBars++;
      if (d.williamsR !== null && d.williamsR < -80) wrOversoldBars++;
    }
  }

  // StochRSI stats
  const hasStochRsi = activeIndicators.includes("stochRsi") && filteredData.stochRsi.length > 0;
  const stochRsiLatest = hasStochRsi ? filteredData.stochRsi[filteredData.stochRsi.length - 1] : null;
  let srOverboughtBars = 0, srOversoldBars = 0;
  if (hasStochRsi) {
    for (const d of filteredData.stochRsi) {
      if (d.k !== null && d.k > 0.8) srOverboughtBars++;
      if (d.k !== null && d.k < 0.2) srOversoldBars++;
    }
  }

  // Ichimoku stats
  const hasIchimoku = activeIndicators.includes("ichimoku") && filteredData.ichimoku.length > 0;
  const ichimokuLatest = hasIchimoku ? filteredData.ichimoku[filteredData.ichimoku.length - 1] : null;

  // Confluence stats
  const hasConfluence = activeIndicators.includes("confluence") && filteredData.confluence && filteredData.confluence.length > 0;
  const confluenceEvents = hasConfluence ? filteredData.confluence : [];
  const lastConfluence = confluenceEvents.length > 0 ? confluenceEvents[confluenceEvents.length - 1] : null;

  // Combined signal badge
  const ichimokuBullish = hasIchimoku && ichimokuLatest.senkouA !== null && ichimokuLatest.close > Math.max(ichimokuLatest.senkouA, ichimokuLatest.senkouB) && ichimokuLatest.tenkan !== null && ichimokuLatest.kijun !== null && ichimokuLatest.tenkan > ichimokuLatest.kijun;
  const ichimokuBearish = hasIchimoku && ichimokuLatest.senkouA !== null && ichimokuLatest.close < Math.min(ichimokuLatest.senkouA, ichimokuLatest.senkouB) && ichimokuLatest.tenkan !== null && ichimokuLatest.kijun !== null && ichimokuLatest.tenkan < ichimokuLatest.kijun;
  const sigColor = hasEco ? (ecoBull ? T.lime : T.red) : hasObv ? (obvTrend === "BULLISH" ? T.lime : T.red) : hasRsi ? (rsiLatest.rsi > 70 ? T.red : rsiLatest.rsi < 30 ? T.lime : T.sub) : hasMacd ? (macdBull ? T.lime : T.red) : hasBollinger && bollingerLatest.upper !== null ? (bollingerLatest.close > bollingerLatest.upper ? T.red : bollingerLatest.close < bollingerLatest.lower ? T.lime : T.sub) : hasAtr ? T.sub : hasAdx && adxLatest.adx !== null ? (adxLatest.plusDI > adxLatest.minusDI && adxLatest.adx > 25 ? T.lime : adxLatest.plusDI < adxLatest.minusDI && adxLatest.adx > 25 ? T.red : T.sub) : hasCci && cciLatest.cci !== null ? (cciLatest.cci > 100 ? T.red : cciLatest.cci < -100 ? T.lime : T.sub) : hasRoc && rocLatest.roc !== null ? (rocLatest.roc > 0 ? T.lime : T.red) : hasWilliamsR && williamsRLatest.williamsR !== null ? (williamsRLatest.williamsR > -20 ? T.red : williamsRLatest.williamsR < -80 ? T.lime : T.sub) : hasStochRsi && stochRsiLatest.k !== null ? (stochRsiLatest.k > 0.8 ? T.red : stochRsiLatest.k < 0.2 ? T.lime : T.sub) : hasIchimoku ? (ichimokuBullish ? T.lime : ichimokuBearish ? T.red : T.sub) : T.muted;
  const sigLabel = hasEco ? (ecoBull ? "▲ BULLISH" : "▼ BEARISH") : hasObv ? (obvTrend === "BULLISH" ? "▲ BULLISH" : "▼ BEARISH") : hasRsi ? (rsiLatest.rsi > 70 ? "▼ OVERBOUGHT" : rsiLatest.rsi < 30 ? "▲ OVERSOLD" : "— NEUTRAL") : hasMacd ? (macdBull ? "▲ BULLISH" : "▼ BEARISH") : hasBollinger && bollingerLatest.upper !== null ? (bollingerLatest.close > bollingerLatest.upper ? "▼ ABOVE BAND" : bollingerLatest.close < bollingerLatest.lower ? "▲ BELOW BAND" : "— WITHIN BANDS") : hasAtr ? "— VOLATILITY" : hasAdx && adxLatest.adx !== null ? (adxLatest.plusDI > adxLatest.minusDI && adxLatest.adx > 25 ? "▲ BULLISH" : adxLatest.plusDI < adxLatest.minusDI && adxLatest.adx > 25 ? "▼ BEARISH" : "— WEAK TREND") : hasCci && cciLatest.cci !== null ? (cciLatest.cci > 100 ? "▼ OVERBOUGHT" : cciLatest.cci < -100 ? "▲ OVERSOLD" : "— NEUTRAL") : hasRoc && rocLatest.roc !== null ? (rocLatest.roc > 0 ? "▲ BULLISH" : "▼ BEARISH") : hasWilliamsR && williamsRLatest.williamsR !== null ? (williamsRLatest.williamsR > -20 ? "▼ OVERBOUGHT" : williamsRLatest.williamsR < -80 ? "▲ OVERSOLD" : "— NEUTRAL") : hasStochRsi && stochRsiLatest.k !== null ? (stochRsiLatest.k > 0.8 ? "▼ OVERBOUGHT" : stochRsiLatest.k < 0.2 ? "▲ OVERSOLD" : "— NEUTRAL") : hasIchimoku ? (ichimokuBullish ? "▲ BULLISH" : ichimokuBearish ? "▼ BEARISH" : "— NEUTRAL") : "—";

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'IBM Plex Sans', 'Helvetica Neue', sans-serif", color: T.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700&family=IBM+Plex+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-track { background: ${T.bg}; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 2px; }
        @media (max-width: 768px) {
          .header-bar { flex-direction: column !important; gap: 10px !important; align-items: flex-start !important; }
          .header-right { flex-wrap: wrap !important; }
          .chart-legend { flex-wrap: wrap !important; gap: 6px !important; }
          .chart-header { flex-direction: column !important; align-items: flex-start !important; gap: 6px !important; }
          .stats-grid { grid-template-columns: 1fr !important; }
          .chart-stats-row { flex-direction: column !important; }
          .chart-stats-row .stats-sidebar { width: 100% !important; }
        }
        @media (max-width: 480px) {
        }
      `}</style>

      {error && (
        <div style={{
          background: "rgba(255,70,70,0.15)", border: `1px solid ${T.red}`,
          color: T.red, padding: "8px 16px", borderRadius: 6,
          fontFamily: "monospace", fontSize: 13, margin: "0 0 12px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{
            background: "none", border: "none", color: T.red, cursor: "pointer",
            fontSize: 16, fontFamily: "monospace", padding: "0 4px",
          }}>✕</button>
        </div>
      )}

      {/* HEADER */}
      <div style={{
        padding: "18px 20px 14px", borderBottom: `1px solid ${T.border}`,
        background: `${T.surface}ee`, backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 20
      }}>
        <div className="header-bar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: T.sub, letterSpacing: "0.2em" }}>TECHNICAL INDICATORS</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
                {tickers.length > 0 && <TickerSearch tickers={tickers} selected={ticker} onSelect={setTicker} />}
                <span style={{ color: T.sub, fontSize: 12 }}>{primaryData.length} bars</span>
              </div>
            </div>
          </div>
          <div className="header-right" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <IndicatorMenu active={activeIndicators} onToggle={toggleIndicator} />
            <button onClick={() => setShowWatchlist(!showWatchlist)} style={{
              background: showWatchlist ? T.borderHi : T.panel, border: `1px solid ${T.border}`,
              borderRadius: 6, color: T.text, cursor: "pointer", fontSize: 11, padding: "6px 12px",
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}>Watchlist</button>
            <Link href="/strategies" style={{
              background: T.panel, border: `1px solid ${T.border}`,
              borderRadius: 6, color: T.text, cursor: "pointer", fontSize: 11, padding: "6px 12px",
              fontFamily: "'IBM Plex Sans', sans-serif", textDecoration: "none", display: "inline-block",
            }}>Strategies</Link>
            {/* Signal badge */}
            <div style={{ padding: "6px 14px", borderRadius: 6, background: `${sigColor}15`, border: `1px solid ${sigColor}40` }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: sigColor }}>{sigLabel}</span>
            </div>
            {/* Range buttons */}
            <div style={{ display: "flex", gap: 4 }}>
              {["3M", "6M", "1Y", "ALL"].map(r => (
                <button key={r} onClick={() => setRange(r)} style={{
                  padding: "5px 10px", borderRadius: 5, border: `1px solid ${range === r ? T.cyan : T.border}`,
                  background: range === r ? `${T.cyan}18` : "transparent",
                  color: range === r ? T.cyan : T.sub, fontSize: 12, fontWeight: 700,
                  cursor: "pointer", letterSpacing: "0.08em"
                }}>{r}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px", maxWidth: 1200, margin: "0 auto" }}>

        {/* PRICE CHART + BOLLINGER STATS */}
        <div className="chart-stats-row" style={{ display: "flex", gap: 14, marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 0, padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
            <div className="chart-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: T.sub, letterSpacing: "0.14em" }}>PRICE — {ticker} CLOSE</div>
              <div className="chart-legend" style={{ display: "flex", gap: 14 }}>
                {hasDemark && currentRiskLine && (
                  <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 10, height: 2, background: T.red, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>Risk Line ${currentRiskLine}</span></span>
                )}
                {hasBollinger && (
                  <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 10, height: 2, background: INDICATORS.bollinger.color, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>Bollinger</span></span>
                )}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={priceWithRisk} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={T.cyan} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={T.cyan} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={{ stroke: T.border }}
                  tickFormatter={d => d.slice(5)} interval={Math.floor(filtered.length / 6)} />
                <YAxis tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={false} domain={["auto", "auto"]}
                  tickFormatter={v => `$${v}`} width={50} />
                <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11, color: T.text }}
                  labelStyle={{ color: T.sub }} />
                <Area type="monotone" dataKey="close" stroke={T.cyan} fill="url(#priceGrad)" strokeWidth={1.5} dot={false} name="Close" />
                {hasDemark && <Line type="stepAfter" dataKey="riskLine" stroke={T.red} strokeWidth={1.5} strokeDasharray="6 3" dot={false} name="Risk Line" connectNulls={false} />}
                {hasBollinger && (
                  <>
                    <Area type="monotone" dataKey="bbUpper" stroke={INDICATORS.bollinger.color} fill="none" strokeWidth={1} strokeDasharray="4 2" dot={false} name="BB Upper" />
                    <Area type="monotone" dataKey="bbLower" stroke={INDICATORS.bollinger.color} fill={`${INDICATORS.bollinger.color}10`} strokeWidth={1} strokeDasharray="4 2" dot={false} name="BB Lower" />
                    <Line type="monotone" dataKey="bbMiddle" stroke={INDICATORS.bollinger.color} strokeWidth={1} strokeDasharray="2 2" dot={false} name="BB Middle" strokeOpacity={0.5} />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          {hasBollinger && bollingerLatest.upper !== null && (() => {
            const bandwidth = ((bollingerLatest.upper - bollingerLatest.lower) / bollingerLatest.middle * 100);
            const percentB = ((bollingerLatest.close - bollingerLatest.lower) / (bollingerLatest.upper - bollingerLatest.lower) * 100);
            const pricePos = bollingerLatest.close > bollingerLatest.upper ? "Above" : bollingerLatest.close < bollingerLatest.lower ? "Below" : "Within";
            const pricePosColor = pricePos === "Above" ? T.red : pricePos === "Below" ? T.lime : T.sub;
            return (
              <div className="stats-sidebar" style={{ width: 260, flexShrink: 0, padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
                <div style={{ fontSize: 12, color: T.sub, letterSpacing: "0.14em", marginBottom: 12 }}>BOLLINGER STATISTICS</div>
                {[
                  ["Method", "SMA(20) ± 2σ", INDICATORS.bollinger.color],
                  ["Upper Band", `$${bollingerLatest.upper}`, INDICATORS.bollinger.color],
                  ["Middle Band", `$${bollingerLatest.middle}`, INDICATORS.bollinger.color],
                  ["Lower Band", `$${bollingerLatest.lower}`, INDICATORS.bollinger.color],
                  ["Bandwidth", bandwidth.toFixed(1) + "%", T.cyan],
                  ["%B", percentB.toFixed(1) + "%", percentB > 100 ? T.red : percentB < 0 ? T.lime : T.sub],
                  ["Price Position", pricePos, pricePosColor],
                ].map(([label, value, color]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.border}` }}>
                    <span style={{ fontSize: 12, color: T.sub }}>{label}</span>
                    <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 600, color }}>{value}</span>
                  </div>
                ))}
              </div>
            );
          })()}
          {!(hasBollinger && bollingerLatest.upper !== null) && (
            <div style={{ width: 260, flexShrink: 0 }} />
          )}
        </div>

        {/* ECO CHART + STATS */}
        {hasEco && (
          <div className="chart-stats-row" style={{ display: "flex", gap: 14, marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 0, padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
              <div className="chart-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: T.sub, letterSpacing: "0.14em" }}>ECO — DEMA + VOLUME-WEIGHTED</div>
                <div className="chart-legend" style={{ display: "flex", gap: 14 }}>
                  <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 10, height: 3, background: T.cyan, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>ECO</span></span>
                  <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 10, height: 3, background: T.gold, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>Signal</span></span>
                  <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 10, height: 3, background: T.muted, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>Histogram</span></span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={mergeSignals(filteredData.eco, "eco")} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <XAxis dataKey="date" tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={{ stroke: T.border }}
                    tickFormatter={d => d.slice(5)} interval={Math.floor(filteredData.eco.length / 6)} />
                  <YAxis tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} width={50} />
                  <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11, color: T.text }}
                    labelStyle={{ color: T.sub }} />
                  <ReferenceLine y={0} stroke={T.border} strokeDasharray="3 3" />
                  <Bar dataKey="histogram" name="Histogram" fill={T.muted}
                    shape={({ x, y, width, height, payload }) => {
                      const c = payload.histogram >= 0 ? T.lime : T.red;
                      return <rect x={x} y={y} width={width} height={Math.abs(height)} fill={c} opacity={0.4} rx={1} />;
                    }} />
                  <Line type="monotone" dataKey="eco" stroke={T.cyan} strokeWidth={2} dot={signalDot} name="ECO" />
                  <Line type="monotone" dataKey="signal" stroke={T.gold} strokeWidth={1.5} dot={false} name="Signal" strokeDasharray="4 2" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="stats-sidebar" style={{ width: 260, flexShrink: 0, padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
              <div style={{ fontSize: 12, color: T.sub, letterSpacing: "0.14em", marginBottom: 12 }}>ECO STATISTICS</div>
              {[
                ["Method", "DEMA + Vol-Weighted", T.cyan],
                ["Current ECO", ecoLatest.eco.toFixed(2), T.cyan],
                ["Current Signal", ecoLatest.signal.toFixed(2), T.gold],
                ["ECO High", ecoMax.toFixed(2), T.lime],
                ["ECO Low", ecoMin.toFixed(2), T.red],
                ["Bullish Bars", `${ecoBullBars} / ${filteredData.eco.length} (${ecoBullPct}%)`, T.lime],
                ["Crossovers", `${ecoCrossovers}`, T.purple],
              ].map(([label, value, color]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ fontSize: 12, color: T.sub }}>{label}</span>
                  <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 600, color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* OBV CHART + STATS */}
        {hasObv && (
          <div className="chart-stats-row" style={{ display: "flex", gap: 14, marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 0, padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
              <div className="chart-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: T.sub, letterSpacing: "0.14em" }}>ON-BALANCE VOLUME (OBV)</div>
                <div className="chart-legend" style={{ display: "flex", gap: 14 }}>
                  <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 10, height: 3, background: T.purple, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>OBV</span></span>
                  <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 10, height: 3, background: T.gold, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>EMA(20)</span></span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={mergeSignals(filteredData.obv, "obv")} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="obvGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={T.purple} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={T.purple} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={{ stroke: T.border }}
                    tickFormatter={d => d.slice(5)} interval={Math.floor(filteredData.obv.length / 6)} />
                  <YAxis tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={false} domain={["auto", "auto"]}
                    tickFormatter={v => fmtVol(v)} width={50} />
                  <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11, color: T.text }}
                    labelStyle={{ color: T.sub }}
                    formatter={(v) => [fmtVol(v), ""]} />
                  <Area type="monotone" dataKey="obv" stroke={T.purple} fill="url(#obvGrad)" strokeWidth={2} dot={signalDot} name="OBV" />
                  <Line type="monotone" dataKey="obvEma" stroke={T.gold} strokeWidth={1.5} dot={false} name="EMA(20)" strokeDasharray="4 2" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="stats-sidebar" style={{ width: 260, flexShrink: 0, padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
              <div style={{ fontSize: 12, color: T.sub, letterSpacing: "0.14em", marginBottom: 12 }}>OBV STATISTICS</div>
              {[
                ["Method", "Cumulative Volume", T.purple],
                ["Current OBV", fmtVol(obvLatest.obv), T.purple],
                ["OBV EMA(20)", fmtVol(obvLatest.obvEma), T.gold],
                ["OBV High", fmtVol(obvMax), T.lime],
                ["OBV Low", fmtVol(obvMin), T.red],
                ["Trend", obvTrend, obvTrend === "BULLISH" ? T.lime : T.red],
                ["OBV vs EMA", fmtVol(obvLatest.obv - obvLatest.obvEma), obvLatest.obv > obvLatest.obvEma ? T.lime : T.red],
              ].map(([label, value, color]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ fontSize: 12, color: T.sub }}>{label}</span>
                  <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 600, color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DEMARK CHART + STATS */}
        {hasDemark && (
          <div className="chart-stats-row" style={{ display: "flex", gap: 14, marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 0, padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
              <div className="chart-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: T.sub, letterSpacing: "0.14em" }}>TD SEQUENTIAL — SETUP &amp; COUNTDOWN</div>
                <div className="chart-legend" style={{ display: "flex", gap: 14 }}>
                  <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 10, height: 3, background: T.lime, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>Buy Setup</span></span>
                  <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 10, height: 3, background: T.red, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>Sell Setup</span></span>
                  <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 10, height: 3, background: T.gold, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>Countdown</span></span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={filteredData.demark} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <XAxis dataKey="date" tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={{ stroke: T.border }}
                    tickFormatter={d => d.slice(5)} interval={Math.floor(filteredData.demark.length / 6)} />
                  <YAxis yAxisId="setup" tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={false}
                    domain={[-10, 10]} width={30} tickFormatter={v => Math.abs(v)} />
                  <YAxis yAxisId="countdown" orientation="right" tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={false}
                    domain={[0, 14]} width={30} />
                  <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11, color: T.text }}
                    labelStyle={{ color: T.sub }}
                    formatter={(v, name) => {
                      if (name === "Setup") return [Math.abs(v), v < 0 ? "Buy Setup" : v > 0 ? "Sell Setup" : "—"];
                      return [v, name];
                    }} />
                  <ReferenceLine yAxisId="setup" y={0} stroke={T.border} strokeDasharray="3 3" />
                  <Bar yAxisId="setup" dataKey="setupCount" name="Setup"
                    shape={({ x, y, width, height, payload }) => {
                      const c = payload.setupCount < 0 ? T.lime : payload.setupCount > 0 ? T.red : "transparent";
                      const opacity = payload.setupComplete ? 1 : 0.5;
                      return <rect x={x} y={y} width={width} height={Math.abs(height)} fill={c} opacity={opacity} rx={1} />;
                    }} />
                  <Line yAxisId="countdown" type="stepAfter" dataKey="countdownCount" stroke={T.gold} strokeWidth={2} dot={false} name="Countdown" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="stats-sidebar" style={{ width: 260, flexShrink: 0, padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
              <div style={{ fontSize: 12, color: T.sub, letterSpacing: "0.14em", marginBottom: 12 }}>DEMARK STATISTICS</div>
              {[
                ["Method", "TD Sequential", T.gold],
                ["Setup Phase", demarkLatest.setupType ? `${demarkLatest.setupType} (${Math.abs(demarkLatest.setupCount)}/9)` : "Inactive", demarkLatest.setupType === "buy" ? T.lime : demarkLatest.setupType === "sell" ? T.red : T.muted],
                ["Countdown", demarkLatest.countdownType ? `${demarkLatest.countdownType} (${demarkLatest.countdownCount}/13)` : "Inactive", T.gold],
                ["Setup 9 Signals", `${demarkSetup9Count}`, T.cyan],
                ["Countdown 13s", `${demarkCountdown13Count}`, T.purple],
                ["Total Signals", `${demarkSignals.length}`, T.blue],
                ["Last Signal", lastDemarkSignal ? `${lastDemarkSignal.signal.replace(/_/g, " ")}` : "None", lastDemarkSignal?.signal.startsWith("BUY") ? T.lime : lastDemarkSignal?.signal.startsWith("SELL") ? T.red : T.muted],
                ["Risk Line", currentRiskLine ? `$${currentRiskLine} (${currentRiskLineType})` : "Inactive", currentRiskLine ? T.red : T.muted],
              ].map(([label, value, color]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ fontSize: 12, color: T.sub }}>{label}</span>
                  <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 600, color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONFLUENCE CHART + STATS */}
        {hasConfluence && (() => {
          const confByDate = {};
          for (const evt of confluenceEvents) confByDate[evt.date] = evt;
          const confChartData = filtered.map(row => ({
            date: row.date, close: row.close,
            _conf: confByDate[row.date] || null,
          }));
          return (
            <div className="chart-stats-row" style={{ display: "flex", gap: 14, marginBottom: 14 }}>
              <div style={{ flex: 1, minWidth: 0, padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
                <div className="chart-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: T.sub, letterSpacing: "0.14em" }}>VOLUME CONFLUENCE — DEMARK + OBV</div>
                  <div className="chart-legend" style={{ display: "flex", gap: 14 }}>
                    <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 8, height: 8, background: T.red, borderRadius: "50%", marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>Capitulation</span></span>
                    <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 8, height: 8, background: T.purple, borderRadius: "50%", marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>OBV Divergence</span></span>
                    <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 8, height: 8, background: T.gold, borderRadius: "50%", marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>Post-Signal</span></span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={confChartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={INDICATORS.confluence.color} stopOpacity={0.15} />
                        <stop offset="100%" stopColor={INDICATORS.confluence.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={{ stroke: T.border }}
                      tickFormatter={d => d.slice(5)} interval={Math.floor(filtered.length / 6)} />
                    <YAxis tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={false} domain={["auto", "auto"]}
                      tickFormatter={v => `$${v}`} width={50} />
                    <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11, color: T.text }}
                      labelStyle={{ color: T.sub }} />
                    <Area type="monotone" dataKey="close" stroke={T.muted} fill="url(#confGrad)" strokeWidth={1} dot={({ cx, cy, payload }) => {
                      if (!payload || !payload._conf) return null;
                      const evt = payload._conf;
                      const color = evt.type === "CAPITULATION" ? T.red : evt.type === "OBV_DIVERGENCE" ? T.purple : T.gold;
                      const label = evt.type === "CAPITULATION" ? "CAP" : evt.type === "OBV_DIVERGENCE" ? "DIV" : evt.validation === "CONFIRMED" ? "OK" : "FAIL";
                      return (
                        <g key={`conf-${payload.date}`}>
                          <circle cx={cx} cy={cy} r={6} fill={color} stroke="#fff" strokeWidth={1.5} />
                          <text x={cx} y={cy - 12} textAnchor="middle" fill={color} fontSize={9} fontWeight={700} fontFamily="monospace">{label}</text>
                        </g>
                      );
                    }} name="Close" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="stats-sidebar" style={{ width: 260, flexShrink: 0, padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
                <div style={{ fontSize: 12, color: T.sub, letterSpacing: "0.14em", marginBottom: 12 }}>CONFLUENCE STATISTICS</div>
                {[
                  ["Total Events", `${confluenceEvents.length}`, INDICATORS.confluence.color],
                  ["Capitulations", `${confluenceEvents.filter(e => e.type === "CAPITULATION").length}`, T.red],
                  ["OBV Divergences", `${confluenceEvents.filter(e => e.type === "OBV_DIVERGENCE").length}`, T.purple],
                  ["Post-Signal", `${confluenceEvents.filter(e => e.type === "POST_SIGNAL").length}`, T.gold],
                  ["Confirmed", `${confluenceEvents.filter(e => e.validation === "CONFIRMED").length}`, T.lime],
                  ["Failed", `${confluenceEvents.filter(e => e.validation === "FAILED").length}`, T.red],
                  ["Last Event", lastConfluence ? lastConfluence.type.replace(/_/g, " ") : "—", lastConfluence ? (lastConfluence.type === "CAPITULATION" ? T.red : lastConfluence.type === "OBV_DIVERGENCE" ? T.purple : T.gold) : T.muted],
                ].map(([label, value, color]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.border}` }}>
                    <span style={{ fontSize: 12, color: T.sub }}>{label}</span>
                    <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 600, color }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* RSI CHART + STATS */}
        {hasRsi && (
          <div className="chart-stats-row" style={{ display: "flex", gap: 14, marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 0, padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
              <div className="chart-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: T.sub, letterSpacing: "0.14em" }}>RSI — RELATIVE STRENGTH INDEX (14)</div>
                <div className="chart-legend" style={{ display: "flex", gap: 14 }}>
                  <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 10, height: 3, background: INDICATORS.rsi.color, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>RSI</span></span>
                  <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 10, height: 2, background: T.red, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>Overbought (70)</span></span>
                  <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 10, height: 2, background: T.lime, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>Oversold (30)</span></span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={mergeSignals(filteredData.rsi, "rsi")} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <XAxis dataKey="date" tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={{ stroke: T.border }}
                    tickFormatter={d => d.slice(5)} interval={Math.floor(filteredData.rsi.length / 6)} />
                  <YAxis tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={false} domain={[0, 100]} width={30} />
                  <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11, color: T.text }}
                    labelStyle={{ color: T.sub }} />
                  <ReferenceLine y={70} stroke={T.red} strokeDasharray="3 3" strokeOpacity={0.5} />
                  <ReferenceLine y={50} stroke={T.border} strokeDasharray="3 3" />
                  <ReferenceLine y={30} stroke={T.lime} strokeDasharray="3 3" strokeOpacity={0.5} />
                  <Area type="monotone" dataKey="rsi" stroke={INDICATORS.rsi.color} fill={`${INDICATORS.rsi.color}15`} strokeWidth={2} dot={signalDot} name="RSI" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="stats-sidebar" style={{ width: 260, flexShrink: 0, padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
              <div style={{ fontSize: 12, color: T.sub, letterSpacing: "0.14em", marginBottom: 12 }}>RSI STATISTICS</div>
              {[
                ["Method", "Wilder's RSI", INDICATORS.rsi.color],
                ["Current RSI", rsiLatest.rsi.toFixed(2), INDICATORS.rsi.color],
                ["Status", rsiLatest.rsi > 70 ? "Overbought" : rsiLatest.rsi < 30 ? "Oversold" : "Neutral",
                  rsiLatest.rsi > 70 ? T.red : rsiLatest.rsi < 30 ? T.lime : T.sub],
                ["RSI High", rsiMax.toFixed(2), T.lime],
                ["RSI Low", rsiMin.toFixed(2), T.red],
                ["Overbought Bars", `${rsiOverboughtBars} / ${filteredData.rsi.length}`, T.red],
                ["Oversold Bars", `${rsiOversoldBars} / ${filteredData.rsi.length}`, T.lime],
              ].map(([label, value, color]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ fontSize: 12, color: T.sub }}>{label}</span>
                  <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 600, color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MACD CHART + STATS */}
        {hasMacd && (
          <div className="chart-stats-row" style={{ display: "flex", gap: 14, marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 0, padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
              <div className="chart-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: T.sub, letterSpacing: "0.14em" }}>MACD — EMA(12, 26, 9)</div>
                <div className="chart-legend" style={{ display: "flex", gap: 14 }}>
                  <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 10, height: 3, background: INDICATORS.macd.color, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>MACD</span></span>
                  <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 10, height: 3, background: T.gold, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>Signal</span></span>
                  <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 10, height: 3, background: T.muted, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>Histogram</span></span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={mergeSignals(filteredData.macd, "macd")} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <XAxis dataKey="date" tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={{ stroke: T.border }}
                    tickFormatter={d => d.slice(5)} interval={Math.floor(filteredData.macd.length / 6)} />
                  <YAxis tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} width={50} />
                  <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11, color: T.text }}
                    labelStyle={{ color: T.sub }} />
                  <ReferenceLine y={0} stroke={T.border} strokeDasharray="3 3" />
                  <Bar dataKey="histogram" name="Histogram" fill={T.muted}
                    shape={({ x, y, width, height, payload }) => {
                      const c = payload.histogram >= 0 ? T.lime : T.red;
                      return <rect x={x} y={y} width={width} height={Math.abs(height)} fill={c} opacity={0.4} rx={1} />;
                    }} />
                  <Line type="monotone" dataKey="macd" stroke={INDICATORS.macd.color} strokeWidth={2} dot={signalDot} name="MACD" />
                  <Line type="monotone" dataKey="signal" stroke={T.gold} strokeWidth={1.5} dot={false} name="Signal" strokeDasharray="4 2" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="stats-sidebar" style={{ width: 260, flexShrink: 0, padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
              <div style={{ fontSize: 12, color: T.sub, letterSpacing: "0.14em", marginBottom: 12 }}>MACD STATISTICS</div>
              {[
                ["Method", "EMA(12, 26, 9)", INDICATORS.macd.color],
                ["Current MACD", macdLatest.macd.toFixed(4), INDICATORS.macd.color],
                ["Current Signal", macdLatest.signal.toFixed(4), T.gold],
                ["Histogram", macdLatest.histogram.toFixed(4), macdLatest.histogram > 0 ? T.lime : T.red],
                ["Trend", macdBull ? "Bullish" : "Bearish", macdBull ? T.lime : T.red],
                ["Crossovers", `${macdCrossovers}`, T.purple],
              ].map(([label, value, color]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ fontSize: 12, color: T.sub }}>{label}</span>
                  <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 600, color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ATR CHART + STATS */}
        {hasAtr && (
          <div className="chart-stats-row" style={{ display: "flex", gap: 14, marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 0, padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
              <div className="chart-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: T.sub, letterSpacing: "0.14em" }}>ATR — AVERAGE TRUE RANGE (14)</div>
                <div className="chart-legend" style={{ display: "flex", gap: 14 }}>
                  <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 10, height: 3, background: INDICATORS.atr.color, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>ATR</span></span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={mergeSignals(filteredData.atr, "atr")} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <XAxis dataKey="date" tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={{ stroke: T.border }}
                    tickFormatter={d => d.slice(5)} interval={Math.floor(filteredData.atr.length / 6)} />
                  <YAxis tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} width={50} />
                  <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11, color: T.text }}
                    labelStyle={{ color: T.sub }} />
                  <Area type="monotone" dataKey="atr" stroke={INDICATORS.atr.color} fill={`${INDICATORS.atr.color}15`} strokeWidth={2} dot={signalDot} name="ATR" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {atrLatest.atr !== null && (() => {
              const atrPct = (atrLatest.atr / atrLatest.close * 100);
              const volatilityLevel = atrPct > 3 ? "High" : atrPct > 1.5 ? "Moderate" : "Low";
              const volatilityColor = atrPct > 3 ? T.red : atrPct > 1.5 ? T.gold : T.lime;
              return (
                <div className="stats-sidebar" style={{ width: 260, flexShrink: 0, padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
                  <div style={{ fontSize: 12, color: T.sub, letterSpacing: "0.14em", marginBottom: 12 }}>ATR STATISTICS</div>
                  {[
                    ["Method", "Wilder's ATR (14)", INDICATORS.atr.color],
                    ["Current ATR", atrLatest.atr.toFixed(4), INDICATORS.atr.color],
                    ["ATR %", atrPct.toFixed(2) + "%", INDICATORS.atr.color],
                    ["ATR High", atrMax.toFixed(4), T.lime],
                    ["ATR Low", atrMin.toFixed(4), T.red],
                    ["Current TR", atrLatest.tr.toFixed(4), T.cyan],
                    ["Volatility", volatilityLevel, volatilityColor],
                  ].map(([label, value, color]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.border}` }}>
                      <span style={{ fontSize: 12, color: T.sub }}>{label}</span>
                      <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 600, color }}>{value}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* ADX CHART + STATS */}
        {hasAdx && (
          <div className="chart-stats-row" style={{ display: "flex", gap: 14, marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 0, padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
              <div className="chart-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: T.sub, letterSpacing: "0.14em" }}>ADX — AVERAGE DIRECTIONAL INDEX (14)</div>
                <div className="chart-legend" style={{ display: "flex", gap: 14 }}>
                  <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 10, height: 3, background: INDICATORS.adx.color, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>ADX</span></span>
                  <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 10, height: 3, background: T.lime, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>+DI</span></span>
                  <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 10, height: 3, background: T.red, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>-DI</span></span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={mergeSignals(filteredData.adx, "adx")} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <XAxis dataKey="date" tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={{ stroke: T.border }}
                    tickFormatter={d => d.slice(5)} interval={Math.floor(filteredData.adx.length / 6)} />
                  <YAxis tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={false} domain={[0, "auto"]} width={30} />
                  <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11, color: T.text }}
                    labelStyle={{ color: T.sub }} />
                  <ReferenceLine y={25} stroke={T.border} strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="adx" stroke={INDICATORS.adx.color} strokeWidth={2} dot={signalDot} name="ADX" />
                  <Line type="monotone" dataKey="plusDI" stroke={T.lime} strokeWidth={1.5} dot={false} name="+DI" />
                  <Line type="monotone" dataKey="minusDI" stroke={T.red} strokeWidth={1.5} dot={false} name="-DI" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {adxLatest.adx !== null && (() => {
              const trendStrength = adxLatest.adx > 50 ? "Very Strong" : adxLatest.adx > 25 ? "Strong" : "Weak";
              const trendStrengthColor = adxLatest.adx > 50 ? T.lime : adxLatest.adx > 25 ? T.cyan : T.sub;
              const directionalBias = adxLatest.plusDI > adxLatest.minusDI ? "Bullish" : "Bearish";
              const directionalColor = adxLatest.plusDI > adxLatest.minusDI ? T.lime : T.red;
              return (
                <div className="stats-sidebar" style={{ width: 260, flexShrink: 0, padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
                  <div style={{ fontSize: 12, color: T.sub, letterSpacing: "0.14em", marginBottom: 12 }}>ADX STATISTICS</div>
                  {[
                    ["Method", "Wilder's ADX (14)", INDICATORS.adx.color],
                    ["ADX Value", adxLatest.adx.toFixed(2), INDICATORS.adx.color],
                    ["Trend Strength", trendStrength, trendStrengthColor],
                    ["+DI", adxLatest.plusDI.toFixed(2), T.lime],
                    ["-DI", adxLatest.minusDI.toFixed(2), T.red],
                    ["Directional Bias", directionalBias, directionalColor],
                    ["ADX High", adxMax.toFixed(2), T.cyan],
                  ].map(([label, value, color]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.border}` }}>
                      <span style={{ fontSize: 12, color: T.sub }}>{label}</span>
                      <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 600, color }}>{value}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* CCI CHART + STATS */}
        {hasCci && (
          <div className="chart-stats-row" style={{ display: "flex", gap: 14, marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 0, padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
              <div className="chart-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: T.sub, letterSpacing: "0.14em" }}>CCI — COMMODITY CHANNEL INDEX (20)</div>
                <div className="chart-legend" style={{ display: "flex", gap: 14 }}>
                  <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 10, height: 3, background: INDICATORS.cci.color, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>CCI</span></span>
                  <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 10, height: 2, background: T.red, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>Overbought (+100)</span></span>
                  <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 10, height: 2, background: T.lime, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>Oversold (-100)</span></span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={mergeSignals(filteredData.cci, "cci")} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="cciGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={INDICATORS.cci.color} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={INDICATORS.cci.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={{ stroke: T.border }}
                    tickFormatter={d => d.slice(5)} interval={Math.floor(filteredData.cci.length / 6)} />
                  <YAxis tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} width={50} />
                  <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11, color: T.text }}
                    labelStyle={{ color: T.sub }} />
                  <ReferenceLine y={100} stroke={T.red} strokeDasharray="3 3" strokeOpacity={0.5} />
                  <ReferenceLine y={0} stroke={T.border} strokeDasharray="3 3" />
                  <ReferenceLine y={-100} stroke={T.lime} strokeDasharray="3 3" strokeOpacity={0.5} />
                  <Area type="monotone" dataKey="cci" stroke={INDICATORS.cci.color} fill="url(#cciGrad)" strokeWidth={2} dot={signalDot} name="CCI" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {cciLatest.cci !== null && (() => {
              const cciStatus = cciLatest.cci > 100 ? "Overbought" : cciLatest.cci < -100 ? "Oversold" : "Neutral";
              const cciStatusColor = cciLatest.cci > 100 ? T.red : cciLatest.cci < -100 ? T.lime : T.sub;
              return (
                <div className="stats-sidebar" style={{ width: 260, flexShrink: 0, padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
                  <div style={{ fontSize: 12, color: T.sub, letterSpacing: "0.14em", marginBottom: 12 }}>CCI STATISTICS</div>
                  {[
                    ["Method", "Typical Price CCI (20)", INDICATORS.cci.color],
                    ["Current CCI", cciLatest.cci.toFixed(2), INDICATORS.cci.color],
                    ["Status", cciStatus, cciStatusColor],
                    ["CCI High", cciMax.toFixed(2), T.lime],
                    ["CCI Low", cciMin.toFixed(2), T.red],
                    ["Overbought Bars", `${cciOverboughtBars} / ${filteredData.cci.length}`, T.red],
                    ["Oversold Bars", `${cciOversoldBars} / ${filteredData.cci.length}`, T.lime],
                  ].map(([label, value, color]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.border}` }}>
                      <span style={{ fontSize: 12, color: T.sub }}>{label}</span>
                      <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 600, color }}>{value}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* ROC CHART + STATS */}
        {hasRoc && (
          <div className="chart-stats-row" style={{ display: "flex", gap: 14, marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 0, padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
              <div className="chart-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: T.sub, letterSpacing: "0.14em" }}>ROC — RATE OF CHANGE (12)</div>
                <div className="chart-legend" style={{ display: "flex", gap: 14 }}>
                  <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 10, height: 3, background: INDICATORS.roc.color, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>ROC</span></span>
                  <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 10, height: 2, background: T.border, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>Zero Line</span></span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={mergeSignals(filteredData.roc, "roc")} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <XAxis dataKey="date" tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={{ stroke: T.border }}
                    tickFormatter={d => d.slice(5)} interval={Math.floor(filteredData.roc.length / 6)} />
                  <YAxis tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} width={50} />
                  <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11, color: T.text }}
                    labelStyle={{ color: T.sub }} />
                  <ReferenceLine y={0} stroke={T.border} strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="roc" stroke={INDICATORS.roc.color} fill={`${INDICATORS.roc.color}15`} strokeWidth={2} dot={signalDot} name="ROC" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {rocLatest.roc !== null && (() => {
              const rocDirection = rocLatest.roc > 0 ? "Positive" : "Negative";
              const rocDirColor = rocLatest.roc > 0 ? T.lime : T.red;
              return (
                <div className="stats-sidebar" style={{ width: 260, flexShrink: 0, padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
                  <div style={{ fontSize: 12, color: T.sub, letterSpacing: "0.14em", marginBottom: 12 }}>ROC STATISTICS</div>
                  {[
                    ["Method", "Rate of Change (12)", INDICATORS.roc.color],
                    ["Current ROC", rocLatest.roc.toFixed(4), INDICATORS.roc.color],
                    ["Direction", rocDirection, rocDirColor],
                    ["ROC High", rocMax.toFixed(4), T.lime],
                    ["ROC Low", rocMin.toFixed(4), T.red],
                    ["Positive Bars", `${rocPositiveBars} / ${filteredData.roc.length}`, T.lime],
                    ["Negative Bars", `${rocNegativeBars} / ${filteredData.roc.length}`, T.red],
                  ].map(([label, value, color]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.border}` }}>
                      <span style={{ fontSize: 12, color: T.sub }}>{label}</span>
                      <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 600, color }}>{value}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* WILLIAMS %R CHART + STATS */}
        {hasWilliamsR && (
          <div className="chart-stats-row" style={{ display: "flex", gap: 14, marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 0, padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
              <div className="chart-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: T.sub, letterSpacing: "0.14em" }}>WILLIAMS %R (14)</div>
                <div className="chart-legend" style={{ display: "flex", gap: 14 }}>
                  <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 10, height: 3, background: INDICATORS.williamsR.color, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>%R</span></span>
                  <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 10, height: 2, background: T.red, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>Overbought (-20)</span></span>
                  <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 10, height: 2, background: T.lime, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>Oversold (-80)</span></span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={mergeSignals(filteredData.williamsR, "williamsR")} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <XAxis dataKey="date" tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={{ stroke: T.border }}
                    tickFormatter={d => d.slice(5)} interval={Math.floor(filteredData.williamsR.length / 6)} />
                  <YAxis domain={[-100, 0]} tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={false} width={30} />
                  <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11, color: T.text }}
                    labelStyle={{ color: T.sub }} />
                  <ReferenceLine y={-20} stroke={T.red} strokeDasharray="3 3" strokeOpacity={0.5} />
                  <ReferenceLine y={-80} stroke={T.lime} strokeDasharray="3 3" strokeOpacity={0.5} />
                  <Area type="monotone" dataKey="williamsR" stroke={INDICATORS.williamsR.color} fill={`${INDICATORS.williamsR.color}15`} strokeWidth={2} dot={signalDot} name="Williams %R" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {williamsRLatest.williamsR !== null && (() => {
              const wrStatus = williamsRLatest.williamsR > -20 ? "Overbought" : williamsRLatest.williamsR < -80 ? "Oversold" : "Neutral";
              const wrStatusColor = williamsRLatest.williamsR > -20 ? T.red : williamsRLatest.williamsR < -80 ? T.lime : T.sub;
              return (
                <div className="stats-sidebar" style={{ width: 260, flexShrink: 0, padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
                  <div style={{ fontSize: 12, color: T.sub, letterSpacing: "0.14em", marginBottom: 12 }}>WILLIAMS %R STATISTICS</div>
                  {[
                    ["Method", "Williams %R (14)", INDICATORS.williamsR.color],
                    ["Current %R", williamsRLatest.williamsR.toFixed(2), INDICATORS.williamsR.color],
                    ["Status", wrStatus, wrStatusColor],
                    ["%R High", wrMax.toFixed(2), T.lime],
                    ["%R Low", wrMin.toFixed(2), T.red],
                    ["Overbought Bars", `${wrOverboughtBars} / ${filteredData.williamsR.length}`, T.red],
                    ["Oversold Bars", `${wrOversoldBars} / ${filteredData.williamsR.length}`, T.lime],
                  ].map(([label, value, color]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.border}` }}>
                      <span style={{ fontSize: 12, color: T.sub }}>{label}</span>
                      <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 600, color }}>{value}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* STOCHASTIC RSI CHART + STATS */}
        {hasStochRsi && (
          <div className="chart-stats-row" style={{ display: "flex", gap: 14, marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 0, padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
              <div className="chart-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: T.sub, letterSpacing: "0.14em" }}>STOCHASTIC RSI (14,14,3,3)</div>
                <div className="chart-legend" style={{ display: "flex", gap: 14 }}>
                  <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 10, height: 3, background: INDICATORS.stochRsi.color, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>%K</span></span>
                  <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 10, height: 3, background: T.purple, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>%D</span></span>
                  <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 10, height: 2, background: T.red, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>Overbought (0.8)</span></span>
                  <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 10, height: 2, background: T.lime, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>Oversold (0.2)</span></span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={mergeSignals(filteredData.stochRsi, "stochRsi")} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <XAxis dataKey="date" tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={{ stroke: T.border }}
                    tickFormatter={d => d.slice(5)} interval={Math.floor(filteredData.stochRsi.length / 6)} />
                  <YAxis domain={[0, 1]} tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={false} width={30} />
                  <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11, color: T.text }}
                    labelStyle={{ color: T.sub }} />
                  <ReferenceLine y={0.8} stroke={T.red} strokeDasharray="3 3" strokeOpacity={0.5} />
                  <ReferenceLine y={0.5} stroke={T.border} strokeDasharray="3 3" />
                  <ReferenceLine y={0.2} stroke={T.lime} strokeDasharray="3 3" strokeOpacity={0.5} />
                  <Line type="monotone" dataKey="k" stroke={INDICATORS.stochRsi.color} strokeWidth={2} dot={signalDot} name="%K" />
                  <Line type="monotone" dataKey="d" stroke={T.purple} strokeWidth={1.5} dot={false} name="%D" strokeDasharray="4 2" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {stochRsiLatest.k !== null && (() => {
              const srZone = stochRsiLatest.k > 0.8 ? "Overbought" : stochRsiLatest.k < 0.2 ? "Oversold" : "Neutral";
              const srZoneColor = stochRsiLatest.k > 0.8 ? T.red : stochRsiLatest.k < 0.2 ? T.lime : T.sub;
              return (
                <div className="stats-sidebar" style={{ width: 260, flexShrink: 0, padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
                  <div style={{ fontSize: 12, color: T.sub, letterSpacing: "0.14em", marginBottom: 12 }}>STOCHRSI STATISTICS</div>
                  {[
                    ["Method", "StochRSI (14,14,3,3)", INDICATORS.stochRsi.color],
                    ["Raw StochRSI", stochRsiLatest.stochRsi.toFixed(4), INDICATORS.stochRsi.color],
                    ["%K", stochRsiLatest.k.toFixed(4), INDICATORS.stochRsi.color],
                    ["%D", stochRsiLatest.d.toFixed(4), T.purple],
                    ["Zone", srZone, srZoneColor],
                    ["Overbought Bars", `${srOverboughtBars} / ${filteredData.stochRsi.length}`, T.red],
                    ["Oversold Bars", `${srOversoldBars} / ${filteredData.stochRsi.length}`, T.lime],
                  ].map(([label, value, color]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.border}` }}>
                      <span style={{ fontSize: 12, color: T.sub }}>{label}</span>
                      <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 600, color }}>{value}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* ICHIMOKU CHART + STATS */}
        {hasIchimoku && (
          <div className="chart-stats-row" style={{ display: "flex", gap: 14, marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 0, padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
              <div className="chart-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: T.sub, letterSpacing: "0.14em" }}>ICHIMOKU CLOUD — (9, 26, 52)</div>
                <div className="chart-legend" style={{ display: "flex", gap: 14 }}>
                  <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 10, height: 3, background: T.cyan, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>Close</span></span>
                  <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 10, height: 3, background: INDICATORS.ichimoku.color, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>Tenkan</span></span>
                  <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 10, height: 3, background: "#fd79a8", borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>Kijun</span></span>
                  <span style={{ fontSize: 11 }}><span style={{ display: "inline-block", width: 10, height: 8, background: `${INDICATORS.ichimoku.color}30`, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>Cloud</span></span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={priceWithRisk} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <XAxis dataKey="date" tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={{ stroke: T.border }}
                    tickFormatter={d => d.slice(5)} interval={Math.floor(filtered.length / 6)} />
                  <YAxis tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={false} domain={["auto", "auto"]}
                    tickFormatter={v => `$${v}`} width={50} />
                  <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11, color: T.text }}
                    labelStyle={{ color: T.sub }} />
                  <Area type="monotone" dataKey="senkouA" stroke="none" fill={`${INDICATORS.ichimoku.color}20`} dot={false} name="Senkou A" />
                  <Area type="monotone" dataKey="senkouB" stroke="none" fill={`${INDICATORS.ichimoku.color}10`} dot={false} name="Senkou B" />
                  <Line type="monotone" dataKey="close" stroke={T.cyan} strokeWidth={1.5} dot={false} name="Close" />
                  <Line type="monotone" dataKey="tenkan" stroke={INDICATORS.ichimoku.color} strokeWidth={1} dot={false} name="Tenkan" />
                  <Line type="monotone" dataKey="kijun" stroke="#fd79a8" strokeWidth={1} dot={false} name="Kijun" />
                  <Line type="monotone" dataKey="chikou" stroke={T.lime} strokeWidth={1} strokeDasharray="2 2" dot={false} name="Chikou" strokeOpacity={0.5} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {ichimokuLatest.senkouA !== null && (() => {
              const aboveCloud = ichimokuLatest.close > Math.max(ichimokuLatest.senkouA, ichimokuLatest.senkouB);
              const belowCloud = ichimokuLatest.close < Math.min(ichimokuLatest.senkouA, ichimokuLatest.senkouB);
              const cloudPos = aboveCloud ? "Above Cloud" : belowCloud ? "Below Cloud" : "In Cloud";
              const cloudColor = aboveCloud ? T.lime : belowCloud ? T.red : T.gold;
              const tkCross = ichimokuLatest.tenkan !== null && ichimokuLatest.kijun !== null ? (ichimokuLatest.tenkan > ichimokuLatest.kijun ? "Bullish" : "Bearish") : "\u2014";
              const tkCrossColor = tkCross === "Bullish" ? T.lime : tkCross === "Bearish" ? T.red : T.sub;
              return (
                <div className="stats-sidebar" style={{ width: 260, flexShrink: 0, padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
                  <div style={{ fontSize: 12, color: T.sub, letterSpacing: "0.14em", marginBottom: 12 }}>ICHIMOKU STATISTICS</div>
                  {[
                    ["Method", "Ichimoku Cloud (9,26,52)", INDICATORS.ichimoku.color],
                    ["Tenkan-sen", ichimokuLatest.tenkan !== null ? `$${ichimokuLatest.tenkan}` : "\u2014", INDICATORS.ichimoku.color],
                    ["Kijun-sen", ichimokuLatest.kijun !== null ? `$${ichimokuLatest.kijun}` : "\u2014", "#fd79a8"],
                    ["Senkou A", `$${ichimokuLatest.senkouA}`, INDICATORS.ichimoku.color],
                    ["Senkou B", ichimokuLatest.senkouB !== null ? `$${ichimokuLatest.senkouB}` : "\u2014", INDICATORS.ichimoku.color],
                    ["Cloud Position", cloudPos, cloudColor],
                    ["TK Cross", tkCross, tkCrossColor],
                  ].map(([label, value, color]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.border}` }}>
                      <span style={{ fontSize: 12, color: T.sub }}>{label}</span>
                      <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 600, color }}>{value}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

      </div>
      {showWatchlist && (
        <WatchlistPanel
          tickers={tickers}
          onSelectTicker={(t) => { setTicker(t); setShowWatchlist(false); }}
          onClose={() => setShowWatchlist(false)}
        />
      )}
    </div>
  );
}
