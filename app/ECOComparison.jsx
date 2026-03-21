"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  ComposedChart, Area, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

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
          width: 220, maxHeight: 340, background: T.surface,
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
          width: 260, background: T.surface,
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
export default function Dashboard() {
  const [tickers, setTickers] = useState([]);
  const [ticker, setTicker] = useState("SPY");
  const [activeIndicators, setActiveIndicators] = useState(["eco"]);
  const [ecoData, setEcoData] = useState(null);
  const [obvData, setObvData] = useState(null);
  const [demarkData, setDemarkData] = useState(null);
  const [rsiData, setRsiData] = useState(null);
  const [macdData, setMacdData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("1Y");

  useEffect(() => {
    fetch(`${API}/api/tickers`)
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then(setTickers)
      .catch(err => console.error("Failed to load tickers:", err));
  }, []);

  // Fetch indicator data based on active selections
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const promises = [];

    if (activeIndicators.includes("eco")) {
      promises.push(
        fetch(`${API}/api/eco?ticker=${ticker}`, { signal: controller.signal })
          .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
          .then(res => setEcoData(res.data))
      );
    } else {
      setEcoData(null);
    }

    if (activeIndicators.includes("obv")) {
      promises.push(
        fetch(`${API}/api/obv?ticker=${ticker}`, { signal: controller.signal })
          .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
          .then(res => setObvData(res.data))
      );
    } else {
      setObvData(null);
    }

    if (activeIndicators.includes("demark")) {
      promises.push(
        fetch(`${API}/api/demark?ticker=${ticker}`, { signal: controller.signal })
          .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
          .then(res => setDemarkData(res.data))
      );
    } else {
      setDemarkData(null);
    }

    if (activeIndicators.includes("rsi")) {
      promises.push(
        fetch(`${API}/api/rsi?ticker=${ticker}`, { signal: controller.signal })
          .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
          .then(res => setRsiData(res.data))
      );
    } else {
      setRsiData(null);
    }

    if (activeIndicators.includes("macd")) {
      promises.push(
        fetch(`${API}/api/macd?ticker=${ticker}`, { signal: controller.signal })
          .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
          .then(res => setMacdData(res.data))
      );
    } else {
      setMacdData(null);
    }

    Promise.all(promises)
      .catch(err => { if (err.name !== "AbortError") console.error("Indicator fetch failed:", err); })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [ticker, activeIndicators]);

  const toggleIndicator = (key) => {
    setActiveIndicators(prev => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev; // keep at least one
        return prev.filter(k => k !== key);
      }
      return [...prev, key];
    });
  };

  // Use whichever dataset is available for price chart / range filtering
  const primaryData = ecoData || obvData || demarkData || rsiData || macdData;

  const filtered = useMemo(() => {
    if (!primaryData) return [];
    const map = { "3M": 63, "6M": 126, "1Y": 252, "ALL": primaryData.length };
    const n = map[range] || primaryData.length;
    return primaryData.slice(-n);
  }, [primaryData, range]);

  const filteredEco = useMemo(() => {
    if (!ecoData) return [];
    const map = { "3M": 63, "6M": 126, "1Y": 252, "ALL": ecoData.length };
    const n = map[range] || ecoData.length;
    return ecoData.slice(-n);
  }, [ecoData, range]);

  const filteredObv = useMemo(() => {
    if (!obvData) return [];
    const map = { "3M": 63, "6M": 126, "1Y": 252, "ALL": obvData.length };
    const n = map[range] || obvData.length;
    return obvData.slice(-n);
  }, [obvData, range]);

  const filteredDemark = useMemo(() => {
    if (!demarkData) return [];
    const map = { "3M": 63, "6M": 126, "1Y": 252, "ALL": demarkData.length };
    const n = map[range] || demarkData.length;
    return demarkData.slice(-n);
  }, [demarkData, range]);

  const filteredRsi = useMemo(() => {
    if (!rsiData) return [];
    const map = { "3M": 63, "6M": 126, "1Y": 252, "ALL": rsiData.length };
    const n = map[range] || rsiData.length;
    return rsiData.slice(-n);
  }, [rsiData, range]);

  const filteredMacd = useMemo(() => {
    if (!macdData) return [];
    const map = { "3M": 63, "6M": 126, "1Y": 252, "ALL": macdData.length };
    const n = map[range] || macdData.length;
    return macdData.slice(-n);
  }, [macdData, range]);

  // Merge risk line into price data for chart overlay (must be before early returns — hooks rule)
  const priceWithRisk = useMemo(() => {
    if (!filteredDemark.length || !filtered.length) return filtered;
    const demarkByDate = {};
    for (const d of filteredDemark) {
      if (d.riskLine !== null) demarkByDate[d.date] = d.riskLine;
    }
    return filtered.map(row => ({
      ...row,
      riskLine: demarkByDate[row.date] ?? null,
    }));
  }, [filtered, filteredDemark]);

  if (loading || !primaryData) return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: T.cyan, fontSize: 14, fontFamily: "monospace" }}>Loading {ticker} data…</div>
    </div>
  );

  if (primaryData.length === 0) return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
      <div style={{ color: T.red, fontSize: 14, fontFamily: "monospace" }}>No data found for {ticker}</div>
      {tickers.length > 0 && <TickerSearch tickers={tickers} selected={ticker} onSelect={setTicker} />}
    </div>
  );

  const latest = filtered[filtered.length - 1];

  // ECO stats
  const hasEco = activeIndicators.includes("eco") && filteredEco.length > 0;
  const ecoLatest = hasEco ? filteredEco[filteredEco.length - 1] : null;
  let ecoBull = false, ecoCrossovers = 0, ecoBullBars = 0, ecoBullPct = "0", ecoMax = -Infinity, ecoMin = Infinity;
  if (hasEco) {
    ecoBull = ecoLatest.eco > ecoLatest.signal;
    for (const d of filteredEco) {
      if (d.eco > ecoMax) ecoMax = d.eco;
      if (d.eco < ecoMin) ecoMin = d.eco;
      if (d.eco > d.signal) ecoBullBars++;
    }
    ecoBullPct = ((ecoBullBars / filteredEco.length) * 100).toFixed(0);
    for (let i = 1; i < filteredEco.length; i++) {
      if ((filteredEco[i - 1].eco > filteredEco[i - 1].signal) !== (filteredEco[i].eco > filteredEco[i].signal)) ecoCrossovers++;
    }
  }

  // OBV stats
  const hasObv = activeIndicators.includes("obv") && filteredObv.length > 0;
  const obvLatest = hasObv ? filteredObv[filteredObv.length - 1] : null;
  let obvTrend = "", obvMax = -Infinity, obvMin = Infinity;
  if (hasObv) {
    obvTrend = obvLatest.obv > obvLatest.obvEma ? "BULLISH" : "BEARISH";
    for (const d of filteredObv) {
      if (d.obv > obvMax) obvMax = d.obv;
      if (d.obv < obvMin) obvMin = d.obv;
    }
  }

  // DeMark stats
  const hasDemark = activeIndicators.includes("demark") && filteredDemark.length > 0;
  const demarkLatest = hasDemark ? filteredDemark[filteredDemark.length - 1] : null;
  let demarkSignals = [], demarkSetup9Count = 0, demarkCountdown13Count = 0;
  if (hasDemark) {
    for (const d of filteredDemark) {
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
  const hasRsi = activeIndicators.includes("rsi") && filteredRsi.length > 0;
  const rsiLatest = hasRsi ? filteredRsi[filteredRsi.length - 1] : null;
  let rsiMax = -Infinity, rsiMin = Infinity, rsiOverboughtBars = 0, rsiOversoldBars = 0;
  if (hasRsi) {
    for (const d of filteredRsi) {
      if (d.rsi > rsiMax) rsiMax = d.rsi;
      if (d.rsi < rsiMin) rsiMin = d.rsi;
      if (d.rsi > 70) rsiOverboughtBars++;
      if (d.rsi < 30) rsiOversoldBars++;
    }
  }

  // MACD stats
  const hasMacd = activeIndicators.includes("macd") && filteredMacd.length > 0;
  const macdLatest = hasMacd ? filteredMacd[filteredMacd.length - 1] : null;
  let macdBull = false, macdCrossovers = 0;
  if (hasMacd) {
    macdBull = macdLatest.macd > macdLatest.signal;
    for (let i = 1; i < filteredMacd.length; i++) {
      if ((filteredMacd[i - 1].macd > filteredMacd[i - 1].signal) !== (filteredMacd[i].macd > filteredMacd[i].signal)) macdCrossovers++;
    }
  }

  // Combined signal badge
  const sigColor = hasEco ? (ecoBull ? T.lime : T.red) : hasObv ? (obvTrend === "BULLISH" ? T.lime : T.red) : hasRsi ? (rsiLatest.rsi > 70 ? T.red : rsiLatest.rsi < 30 ? T.lime : T.sub) : hasMacd ? (macdBull ? T.lime : T.red) : T.muted;
  const sigLabel = hasEco ? (ecoBull ? "▲ BULLISH" : "▼ BEARISH") : hasObv ? (obvTrend === "BULLISH" ? "▲ BULLISH" : "▼ BEARISH") : hasRsi ? (rsiLatest.rsi > 70 ? "▼ OVERBOUGHT" : rsiLatest.rsi < 30 ? "▲ OVERSOLD" : "— NEUTRAL") : hasMacd ? (macdBull ? "▲ BULLISH" : "▼ BEARISH") : "—";

  // KPI cards
  const kpis = [];
  kpis.push({ label: "CLOSE", value: `$${latest.close.toFixed(2)}`, color: T.text, sub: latest.date });
  if (hasEco) {
    kpis.push({ label: "ECO", value: ecoLatest.eco.toFixed(2), color: T.cyan, sub: `Signal: ${ecoLatest.signal.toFixed(2)}` });
    kpis.push({ label: "ECO HIST", value: ecoLatest.histogram.toFixed(2), color: ecoLatest.histogram > 0 ? T.lime : T.red, sub: `${ecoCrossovers} crossovers` });
  }
  if (hasObv) {
    kpis.push({ label: "OBV", value: fmtVol(obvLatest.obv), color: T.purple, sub: `EMA: ${fmtVol(obvLatest.obvEma)}` });
    kpis.push({ label: "OBV TREND", value: obvTrend, color: obvTrend === "BULLISH" ? T.lime : T.red, sub: `vs EMA(20)` });
  }
  if (hasDemark) {
    const setupVal = demarkLatest.setupCount === 0 ? "—" : `${demarkLatest.setupType === "sell" ? "S" : "B"} ${Math.abs(demarkLatest.setupCount)}`;
    kpis.push({ label: "TD SETUP", value: setupVal, color: T.gold, sub: demarkLatest.setupType ? `${demarkLatest.setupType} phase` : "inactive" });
    const lastSigLabel = lastDemarkSignal ? lastDemarkSignal.signal.replace(/_/g, " ") : "None";
    const lastSigColor = lastDemarkSignal?.signal.startsWith("BUY") ? T.lime : lastDemarkSignal?.signal.startsWith("SELL") ? T.red : T.muted;
    kpis.push({ label: "LAST SIGNAL", value: lastSigLabel, color: lastSigColor, sub: lastDemarkSignal?.date || "—" });
    if (currentRiskLine) {
      kpis.push({ label: "RISK LINE", value: `$${currentRiskLine}`, color: T.red, sub: `${currentRiskLineType} stop-loss` });
    }
  }
  if (hasRsi) {
    const rsiStatus = rsiLatest.rsi > 70 ? "OVERBOUGHT" : rsiLatest.rsi < 30 ? "OVERSOLD" : "NEUTRAL";
    const rsiColor = rsiLatest.rsi > 70 ? T.red : rsiLatest.rsi < 30 ? T.lime : T.sub;
    kpis.push({ label: "RSI", value: rsiLatest.rsi.toFixed(1), color: INDICATORS.rsi.color, sub: `Period: 14` });
    kpis.push({ label: "RSI STATUS", value: rsiStatus, color: rsiColor, sub: rsiLatest.rsi > 70 ? "Above 70" : rsiLatest.rsi < 30 ? "Below 30" : "30-70 range" });
  }
  if (hasMacd) {
    kpis.push({ label: "MACD", value: macdLatest.macd.toFixed(2), color: INDICATORS.macd.color, sub: `Signal: ${macdLatest.signal.toFixed(2)}` });
    kpis.push({ label: "MACD HIST", value: macdLatest.histogram.toFixed(2), color: macdLatest.histogram > 0 ? T.lime : T.red, sub: `${macdCrossovers} crossovers` });
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'IBM Plex Sans', 'Helvetica Neue', sans-serif", color: T.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700&family=IBM+Plex+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-track { background: ${T.bg}; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 2px; }
      `}</style>

      {/* HEADER */}
      <div style={{
        padding: "18px 20px 14px", borderBottom: `1px solid ${T.border}`,
        background: `${T.surface}ee`, backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 20
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div>
              <div style={{ fontSize: 10, color: T.muted, letterSpacing: "0.2em" }}>TECHNICAL INDICATORS</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
                {tickers.length > 0 && <TickerSearch tickers={tickers} selected={ticker} onSelect={setTicker} />}
                <span style={{ color: T.muted, fontSize: 11 }}>{primaryData.length} bars</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <IndicatorMenu active={activeIndicators} onToggle={toggleIndicator} />
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
                  color: range === r ? T.cyan : T.sub, fontSize: 10, fontWeight: 700,
                  cursor: "pointer", letterSpacing: "0.08em"
                }}>{r}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px", maxWidth: 1200, margin: "0 auto" }}>

        {/* KPI CARDS */}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${kpis.length}, 1fr)`, gap: 10, marginBottom: 14 }}>
          {kpis.map(({ label, value, color, sub }) => (
            <div key={label} style={{ padding: "12px 14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, textAlign: "center" }}>
              <div style={{ fontSize: 9, color: T.muted, letterSpacing: "0.14em", marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 9, color: T.sub, marginTop: 5 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* PRICE CHART */}
        <div style={{ padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: T.muted, letterSpacing: "0.14em" }}>PRICE — {ticker} CLOSE</div>
            {hasDemark && currentRiskLine && (
              <div style={{ display: "flex", gap: 14 }}>
                <span style={{ fontSize: 10 }}><span style={{ display: "inline-block", width: 10, height: 2, background: T.red, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>Risk Line ${currentRiskLine}</span></span>
              </div>
            )}
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
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* ECO CHART */}
        {hasEco && (
          <div style={{ padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: T.muted, letterSpacing: "0.14em" }}>ECO — DEMA + VOLUME-WEIGHTED</div>
              <div style={{ display: "flex", gap: 14 }}>
                <span style={{ fontSize: 10 }}><span style={{ display: "inline-block", width: 10, height: 3, background: T.cyan, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>ECO</span></span>
                <span style={{ fontSize: 10 }}><span style={{ display: "inline-block", width: 10, height: 3, background: T.gold, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>Signal</span></span>
                <span style={{ fontSize: 10 }}><span style={{ display: "inline-block", width: 10, height: 3, background: T.muted, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>Histogram</span></span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={filteredEco} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <XAxis dataKey="date" tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={{ stroke: T.border }}
                  tickFormatter={d => d.slice(5)} interval={Math.floor(filteredEco.length / 6)} />
                <YAxis tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} width={50} />
                <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11, color: T.text }}
                  labelStyle={{ color: T.sub }} />
                <ReferenceLine y={0} stroke={T.border} strokeDasharray="3 3" />
                <Bar dataKey="histogram" name="Histogram" fill={T.muted}
                  shape={({ x, y, width, height, payload }) => {
                    const c = payload.histogram >= 0 ? T.lime : T.red;
                    return <rect x={x} y={y} width={width} height={Math.abs(height)} fill={c} opacity={0.4} rx={1} />;
                  }} />
                <Line type="monotone" dataKey="eco" stroke={T.cyan} strokeWidth={2} dot={false} name="ECO" />
                <Line type="monotone" dataKey="signal" stroke={T.gold} strokeWidth={1.5} dot={false} name="Signal" strokeDasharray="4 2" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* OBV CHART */}
        {hasObv && (
          <div style={{ padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: T.muted, letterSpacing: "0.14em" }}>ON-BALANCE VOLUME (OBV)</div>
              <div style={{ display: "flex", gap: 14 }}>
                <span style={{ fontSize: 10 }}><span style={{ display: "inline-block", width: 10, height: 3, background: T.purple, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>OBV</span></span>
                <span style={{ fontSize: 10 }}><span style={{ display: "inline-block", width: 10, height: 3, background: T.gold, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>EMA(20)</span></span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={filteredObv} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="obvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={T.purple} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={T.purple} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={{ stroke: T.border }}
                  tickFormatter={d => d.slice(5)} interval={Math.floor(filteredObv.length / 6)} />
                <YAxis tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={false} domain={["auto", "auto"]}
                  tickFormatter={v => fmtVol(v)} width={50} />
                <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11, color: T.text }}
                  labelStyle={{ color: T.sub }}
                  formatter={(v) => [fmtVol(v), ""]} />
                <Area type="monotone" dataKey="obv" stroke={T.purple} fill="url(#obvGrad)" strokeWidth={2} dot={false} name="OBV" />
                <Line type="monotone" dataKey="obvEma" stroke={T.gold} strokeWidth={1.5} dot={false} name="EMA(20)" strokeDasharray="4 2" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* DEMARK CHART */}
        {hasDemark && (
          <div style={{ padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: T.muted, letterSpacing: "0.14em" }}>TD SEQUENTIAL — SETUP &amp; COUNTDOWN</div>
              <div style={{ display: "flex", gap: 14 }}>
                <span style={{ fontSize: 10 }}><span style={{ display: "inline-block", width: 10, height: 3, background: T.lime, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>Buy Setup</span></span>
                <span style={{ fontSize: 10 }}><span style={{ display: "inline-block", width: 10, height: 3, background: T.red, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>Sell Setup</span></span>
                <span style={{ fontSize: 10 }}><span style={{ display: "inline-block", width: 10, height: 3, background: T.gold, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>Countdown</span></span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={filteredDemark} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <XAxis dataKey="date" tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={{ stroke: T.border }}
                  tickFormatter={d => d.slice(5)} interval={Math.floor(filteredDemark.length / 6)} />
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
        )}

        {/* RSI CHART */}
        {hasRsi && (
          <div style={{ padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: T.muted, letterSpacing: "0.14em" }}>RSI — RELATIVE STRENGTH INDEX (14)</div>
              <div style={{ display: "flex", gap: 14 }}>
                <span style={{ fontSize: 10 }}><span style={{ display: "inline-block", width: 10, height: 3, background: INDICATORS.rsi.color, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>RSI</span></span>
                <span style={{ fontSize: 10 }}><span style={{ display: "inline-block", width: 10, height: 2, background: T.red, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>Overbought (70)</span></span>
                <span style={{ fontSize: 10 }}><span style={{ display: "inline-block", width: 10, height: 2, background: T.lime, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>Oversold (30)</span></span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={filteredRsi} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <XAxis dataKey="date" tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={{ stroke: T.border }}
                  tickFormatter={d => d.slice(5)} interval={Math.floor(filteredRsi.length / 6)} />
                <YAxis tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={false} domain={[0, 100]} width={30} />
                <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11, color: T.text }}
                  labelStyle={{ color: T.sub }} />
                <ReferenceLine y={70} stroke={T.red} strokeDasharray="3 3" strokeOpacity={0.5} />
                <ReferenceLine y={50} stroke={T.border} strokeDasharray="3 3" />
                <ReferenceLine y={30} stroke={T.lime} strokeDasharray="3 3" strokeOpacity={0.5} />
                <Area type="monotone" dataKey="rsi" stroke={INDICATORS.rsi.color} fill={`${INDICATORS.rsi.color}15`} strokeWidth={2} dot={false} name="RSI" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* MACD CHART */}
        {hasMacd && (
          <div style={{ padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: T.muted, letterSpacing: "0.14em" }}>MACD — EMA(12, 26, 9)</div>
              <div style={{ display: "flex", gap: 14 }}>
                <span style={{ fontSize: 10 }}><span style={{ display: "inline-block", width: 10, height: 3, background: INDICATORS.macd.color, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>MACD</span></span>
                <span style={{ fontSize: 10 }}><span style={{ display: "inline-block", width: 10, height: 3, background: T.gold, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>Signal</span></span>
                <span style={{ fontSize: 10 }}><span style={{ display: "inline-block", width: 10, height: 3, background: T.muted, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span><span style={{ color: T.sub }}>Histogram</span></span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={filteredMacd} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <XAxis dataKey="date" tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={{ stroke: T.border }}
                  tickFormatter={d => d.slice(5)} interval={Math.floor(filteredMacd.length / 6)} />
                <YAxis tick={{ fill: T.muted, fontSize: 9 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} width={50} />
                <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11, color: T.text }}
                  labelStyle={{ color: T.sub }} />
                <ReferenceLine y={0} stroke={T.border} strokeDasharray="3 3" />
                <Bar dataKey="histogram" name="Histogram" fill={T.muted}
                  shape={({ x, y, width, height, payload }) => {
                    const c = payload.histogram >= 0 ? T.lime : T.red;
                    return <rect x={x} y={y} width={width} height={Math.abs(height)} fill={c} opacity={0.4} rx={1} />;
                  }} />
                <Line type="monotone" dataKey="macd" stroke={INDICATORS.macd.color} strokeWidth={2} dot={false} name="MACD" />
                <Line type="monotone" dataKey="signal" stroke={T.gold} strokeWidth={1.5} dot={false} name="Signal" strokeDasharray="4 2" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* STATS GRID */}
        <div style={{ display: "grid", gridTemplateColumns: [hasEco, hasObv, hasDemark, hasRsi, hasMacd].filter(Boolean).length > 1 ? `repeat(${[hasEco, hasObv, hasDemark, hasRsi, hasMacd].filter(Boolean).length}, 1fr)` : "1fr", gap: 14 }}>
          {hasEco && (
            <div style={{ padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
              <div style={{ fontSize: 10, color: T.muted, letterSpacing: "0.14em", marginBottom: 12 }}>ECO STATISTICS</div>
              {[
                ["Method", "DEMA + Vol-Weighted", T.cyan],
                ["Current ECO", ecoLatest.eco.toFixed(2), T.cyan],
                ["Current Signal", ecoLatest.signal.toFixed(2), T.gold],
                ["ECO High", ecoMax.toFixed(2), T.lime],
                ["ECO Low", ecoMin.toFixed(2), T.red],
                ["Bullish Bars", `${ecoBullBars} / ${filteredEco.length} (${ecoBullPct}%)`, T.lime],
                ["Crossovers", `${ecoCrossovers}`, T.purple],
              ].map(([label, value, color]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ fontSize: 11, color: T.sub }}>{label}</span>
                  <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 600, color }}>{value}</span>
                </div>
              ))}
            </div>
          )}
          {hasObv && (
            <div style={{ padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
              <div style={{ fontSize: 10, color: T.muted, letterSpacing: "0.14em", marginBottom: 12 }}>OBV STATISTICS</div>
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
                  <span style={{ fontSize: 11, color: T.sub }}>{label}</span>
                  <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 600, color }}>{value}</span>
                </div>
              ))}
            </div>
          )}
          {hasDemark && (
            <div style={{ padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
              <div style={{ fontSize: 10, color: T.muted, letterSpacing: "0.14em", marginBottom: 12 }}>DEMARK STATISTICS</div>
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
                  <span style={{ fontSize: 11, color: T.sub }}>{label}</span>
                  <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 600, color }}>{value}</span>
                </div>
              ))}
            </div>
          )}
          {hasRsi && (
            <div style={{ padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
              <div style={{ fontSize: 10, color: T.muted, letterSpacing: "0.14em", marginBottom: 12 }}>RSI STATISTICS</div>
              {[
                ["Method", "Wilder's RSI", INDICATORS.rsi.color],
                ["Current RSI", rsiLatest.rsi.toFixed(2), INDICATORS.rsi.color],
                ["Status", rsiLatest.rsi > 70 ? "Overbought" : rsiLatest.rsi < 30 ? "Oversold" : "Neutral",
                  rsiLatest.rsi > 70 ? T.red : rsiLatest.rsi < 30 ? T.lime : T.sub],
                ["RSI High", rsiMax.toFixed(2), T.lime],
                ["RSI Low", rsiMin.toFixed(2), T.red],
                ["Overbought Bars", `${rsiOverboughtBars} / ${filteredRsi.length}`, T.red],
                ["Oversold Bars", `${rsiOversoldBars} / ${filteredRsi.length}`, T.lime],
              ].map(([label, value, color]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ fontSize: 11, color: T.sub }}>{label}</span>
                  <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 600, color }}>{value}</span>
                </div>
              ))}
            </div>
          )}
          {hasMacd && (
            <div style={{ padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
              <div style={{ fontSize: 10, color: T.muted, letterSpacing: "0.14em", marginBottom: 12 }}>MACD STATISTICS</div>
              {[
                ["Method", "EMA(12, 26, 9)", INDICATORS.macd.color],
                ["Current MACD", macdLatest.macd.toFixed(4), INDICATORS.macd.color],
                ["Current Signal", macdLatest.signal.toFixed(4), T.gold],
                ["Histogram", macdLatest.histogram.toFixed(4), macdLatest.histogram > 0 ? T.lime : T.red],
                ["Trend", macdBull ? "Bullish" : "Bearish", macdBull ? T.lime : T.red],
                ["Crossovers", `${macdCrossovers}`, T.purple],
              ].map(([label, value, color]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ fontSize: 11, color: T.sub }}>{label}</span>
                  <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 600, color }}>{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
