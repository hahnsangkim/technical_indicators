import { useState, useCallback } from "react";

// ─── THEME ────────────────────────────────────────────────────────────────────
const T = {
  bg: "#07090f",
  surface: "#0d1117",
  panel: "#111520",
  border: "#1a2236",
  borderHi: "#2a3d5e",
  lime: "#39ff8a",
  limeD: "#1a7a42",
  red: "#ff3a5c",
  redD: "#7a1a2a",
  gold: "#f5c842",
  blue: "#4a9eff",
  purple: "#b06aff",
  cyan: "#00e5cc",
  text: "#d0dff5",
  sub: "#7a90b0",
  muted: "#3a4d6a",
  off: "#ffffff08",
};

// ─── MATH ─────────────────────────────────────────────────────────────────────
const emaK = n => 2 / (n + 1);

function calcEMA(val, prev, k) { return val * k + prev * (1 - k); }

function calcDEMA(val, ema1, ema2, k) {
  const newEma1 = calcEMA(val, ema1, k);
  const newEma2 = calcEMA(newEma1, ema2, k);
  return { ema1: newEma1, ema2: newEma2, dema: 2 * newEma1 - newEma2 };
}

// ─── REUSABLE COMPONENTS ──────────────────────────────────────────────────────
function Slider({ label, value, min, max, step = 0.01, onChange, color = T.blue, unit = "" }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 11 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 10, color: T.sub, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
        <span style={{ fontSize: 12, color, fontFamily: "monospace", fontWeight: 700 }}>{typeof value === "number" ? value.toFixed(2) : value}{unit}</span>
      </div>
      <div style={{ position: "relative", height: 5, background: T.muted, borderRadius: 3 }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: color, borderRadius: 3, boxShadow: `0 0 6px ${color}66`, transition: "width 0.1s" }} />
        <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))}
          style={{ position: "absolute", top: -5, left: 0, width: "100%", height: 15, opacity: 0, cursor: "pointer", margin: 0, padding: 0 }} />
      </div>
    </div>
  );
}

function Toggle({ label, active, color, onClick, desc }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px",
      background: active ? `${color}14` : T.panel,
      border: `1px solid ${active ? color : T.border}`,
      borderRadius: 8, cursor: "pointer", width: "100%", textAlign: "left",
      transition: "all 0.2s ease", boxShadow: active ? `0 0 14px ${color}22` : "none"
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 1,
        background: active ? color : T.muted,
        boxShadow: active ? `0 0 8px ${color}` : "none",
        transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        {active && <span style={{ color: "#000", fontSize: 10, fontWeight: 900 }}>✓</span>}
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: active ? color : T.sub, letterSpacing: "0.04em" }}>{label}</div>
        <div style={{ fontSize: 10, color: T.muted, marginTop: 2, lineHeight: 1.4 }}>{desc}</div>
      </div>
    </button>
  );
}

function ValueRow({ label, orig, enhanced, deltaColor }) {
  const delta = enhanced - orig;
  const absDelta = Math.abs(delta);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 0.8fr", gap: 6, marginBottom: 7, alignItems: "center" }}>
      <span style={{ fontSize: 10, color: T.sub, letterSpacing: "0.06em" }}>{label}</span>
      <span style={{ fontSize: 12, fontFamily: "monospace", color: T.blue, textAlign: "right" }}>{orig.toFixed(4)}</span>
      <span style={{ fontSize: 12, fontFamily: "monospace", color: T.cyan, textAlign: "right" }}>{enhanced.toFixed(4)}</span>
      <span style={{ fontSize: 11, fontFamily: "monospace", color: delta > 0.001 ? T.lime : delta < -0.001 ? T.red : T.muted, textAlign: "right", fontWeight: 700 }}>
        {delta > 0.001 ? "+" : ""}{delta.toFixed(3)}
      </span>
    </div>
  );
}

function BigNumber({ label, value, color, sub }) {
  return (
    <div style={{ textAlign: "center", padding: "12px 8px", background: `${color}0a`, borderRadius: 8, border: `1px solid ${color}25` }}>
      <div style={{ fontSize: 9, color: T.muted, letterSpacing: "0.14em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: "monospace", letterSpacing: "-0.03em", lineHeight: 1 }}>
        {value.toFixed(2)}
      </div>
      {sub && <div style={{ fontSize: 9, color: T.sub, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SignalBadge({ eco, signal, label }) {
  const bull = eco > signal;
  const color = bull ? T.lime : T.red;
  return (
    <div style={{
      padding: "8px 12px", borderRadius: 6,
      background: `${color}12`, border: `1px solid ${color}33`,
      display: "flex", alignItems: "center", justifyContent: "space-between"
    }}>
      <div>
        <div style={{ fontSize: 9, color: T.muted, letterSpacing: "0.1em" }}>{label}</div>
        <div style={{ fontSize: 12, fontWeight: 800, color, marginTop: 2 }}>
          {bull ? "▲ BULLISH" : "▼ BEARISH"}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 9, color: T.muted }}>ECO − SIG</div>
        <div style={{ fontSize: 13, fontFamily: "monospace", color, fontWeight: 800 }}>
          {(eco - signal) > 0 ? "+" : ""}{(eco - signal).toFixed(2)}
        </div>
      </div>
    </div>
  );
}

function DeltaMeter({ orig, enhanced }) {
  const delta = enhanced - orig;
  const maxDelta = Math.max(Math.abs(delta), 5);
  const pct = Math.min(Math.abs(delta) / maxDelta * 100, 100);
  const color = Math.abs(delta) < 1 ? T.gold : delta > 0 ? T.lime : T.red;
  return (
    <div style={{ padding: "14px 16px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
      <div style={{ fontSize: 10, color: T.muted, letterSpacing: "0.12em", marginBottom: 10 }}>ECO DELTA (Enhanced − Original)</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, height: 8, background: T.muted, borderRadius: 4, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${pct}%`, borderRadius: 4,
            background: color, boxShadow: `0 0 10px ${color}88`,
            transition: "all 0.4s ease"
          }} />
        </div>
        <span style={{ fontSize: 18, fontWeight: 800, color, fontFamily: "monospace", minWidth: 70, textAlign: "right" }}>
          {delta > 0 ? "+" : ""}{delta.toFixed(3)}
        </span>
      </div>
      <div style={{ fontSize: 10, color: T.sub, marginTop: 8 }}>
        {Math.abs(delta) < 0.5 ? "Minimal difference — improvements have low impact on this candle's conditions"
          : Math.abs(delta) < 5 ? "Moderate shift — improvements are meaningfully altering the signal"
          : "Significant divergence — enhancements producing substantially different reading"}
      </div>
    </div>
  );
}

function RegimeFlag({ adx, trendFilter, useRegime, trueRange, range }) {
  if (!useRegime) return null;
  const trending = adx > 25;
  const color = trending ? T.red : T.lime;
  return (
    <div style={{
      padding: "8px 12px", borderRadius: 6, marginTop: 8,
      background: `${color}10`, border: `1px solid ${color}30`
    }}>
      <div style={{ fontSize: 10, color: T.muted, marginBottom: 3 }}>REGIME FILTER (ADX = {adx.toFixed(1)})</div>
      <div style={{ fontSize: 12, fontWeight: 700, color }}>
        {trending
          ? "⚠ TRENDING MARKET — ECO signals suppressed. Use trend-following only."
          : "✓ RANGING MARKET — ECO signals are valid in this regime."}
      </div>
      {trendFilter && (
        <div style={{ fontSize: 10, color: T.sub, marginTop: 4 }}>
          200-EMA trend filter active: only take signals in trend direction
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function ECOComparison() {
  // Candle inputs
  const [open, setOpen] = useState(150);
  const [high, setHigh] = useState(155);
  const [low, setLow] = useState(148);
  const [close, setClose] = useState(153);
  const [volume, setVolume] = useState(1000000);
  const [prevClose, setPrevClose] = useState(149);

  // Prior EMA state (shared starting point)
  const [pE25c, setPE25c] = useState(1.5);
  const [pE25r, setPE25r] = useState(6.0);
  const [pE13n, setPE13n] = useState(1.2);
  const [pE13d, setPE13d] = useState(5.5);
  const [pSig, setPSig] = useState(19.0);

  // DEMA prior state (for enhanced)
  const [pD25c2, setPD25c2] = useState(1.4);
  const [pD25r2, setPD25r2] = useState(5.8);
  const [pD13n2, setPD13n2] = useState(1.1);
  const [pD13d2, setPD13d2] = useState(5.3);

  // ADX proxy input
  const [adx, setAdx] = useState(18);
  const [trendFilter, setTrendFilter] = useState(false);

  // Feature toggles
  const [useDEMA, setUseDEMA] = useState(true);
  const [useVolume, setUseVolume] = useState(true);
  const [useTrueRange, setUseTrueRange] = useState(true);
  const [useRegime, setUseRegime] = useState(true);

  const [tab, setTab] = useState("compare"); // compare | detail | regime

  // ── ORIGINAL ECO ─────────────────────────────────────────────
  const origChange = close - open;
  const origRange = Math.max(high - low, 0.001);
  const k25 = emaK(25), k13 = emaK(13), k8 = emaK(8);

  const origE25c = calcEMA(origChange, pE25c, k25);
  const origE25r = calcEMA(origRange, pE25r, k25);
  const origNum = calcEMA(origE25c, pE13n, k13);
  const origDen = calcEMA(origE25r, pE13d, k13);
  const origECO = (origNum / origDen) * 100;
  const origSignal = calcEMA(origECO, pSig, k8);

  // ── ENHANCED ECO ─────────────────────────────────────────────
  const volNorm = volume / 1000000;
  const enhChange = useVolume ? (close - open) * volNorm : (close - open);
  const trueRange = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
  const enhRange = useTrueRange ? Math.max(trueRange, 0.001) : Math.max(high - low, 0.001);

  let enhNum, enhDen, enhECO, enhSignal;

  if (useDEMA) {
    const d25c = calcDEMA(enhChange, pE25c, pD25c2, k25);
    const d25r = calcDEMA(enhRange, pE25r, pD25r2, k25);
    const d13n = calcDEMA(d25c.dema, pE13n, pD13n2, k13);
    const d13d = calcDEMA(d25r.dema, pE13d, pD13d2, k13);
    enhNum = d13n.dema;
    enhDen = d13d.dema;
  } else {
    const eE25c = calcEMA(enhChange, pE25c, k25);
    const eE25r = calcEMA(enhRange, pE25r, k25);
    enhNum = calcEMA(eE25c, pE13n, k13);
    enhDen = calcEMA(eE25r, pE13d, k13);
  }

  enhECO = (enhNum / Math.max(Math.abs(enhDen), 0.0001)) * 100;
  if (useVolume) enhECO = enhECO; // volume already in numerator
  enhSignal = calcEMA(enhECO, pSig, k8);

  const regimeSuppressed = useRegime && adx > 25;
  const lagReduction = useDEMA ? "~45%" : "0%";

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'IBM Plex Sans', 'Helvetica Neue', sans-serif", color: T.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700&family=IBM+Plex+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; }
        input[type=range] { -webkit-appearance: none; appearance: none; }
        ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-track { background: ${T.bg}; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 2px; }
      `}</style>

      {/* HEADER */}
      <div style={{ padding: "18px 20px 14px", borderBottom: `1px solid ${T.border}`, background: `${T.surface}ee`, backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: T.muted, letterSpacing: "0.2em" }}>ERGODIC CANDLESTICK OSCILLATOR</div>
            <h1 style={{ margin: "2px 0 0", fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: "-0.01em" }}>
              Original <span style={{ color: T.muted }}>vs</span>{" "}
              <span style={{ color: T.cyan }}>Enhanced</span>
            </h1>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {["compare", "detail", "regime"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "6px 14px", borderRadius: 6, border: `1px solid ${tab === t ? T.cyan : T.border}`,
                background: tab === t ? `${T.cyan}18` : "transparent",
                color: tab === t ? T.cyan : T.sub, fontSize: 11, fontWeight: 700,
                cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase",
                transition: "all 0.2s"
              }}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: "16px", maxWidth: 1100, margin: "0 auto" }}>

        {/* IMPROVEMENT TOGGLES */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: T.muted, letterSpacing: "0.15em", marginBottom: 10 }}>ACTIVE ENHANCEMENTS</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            <Toggle label="DEMA Smoothing" color={T.cyan} active={useDEMA} onClick={() => setUseDEMA(v => !v)}
              desc="Reduces lag ~45% via error correction" />
            <Toggle label="Volume-Weighted" color={T.purple} active={useVolume} onClick={() => setUseVolume(v => !v)}
              desc="Scales Change by normalized volume" />
            <Toggle label="True Range" color={T.gold} active={useTrueRange} onClick={() => setUseTrueRange(v => !v)}
              desc="Accounts for overnight gaps" />
            <Toggle label="Regime Filter" color={T.lime} active={useRegime} onClick={() => setUseRegime(v => !v)}
              desc="ADX gate suppresses bad-regime signals" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 14 }}>

          {/* LEFT COLUMN — INPUTS */}
          <div>
            <div style={{ padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: T.muted, letterSpacing: "0.14em", marginBottom: 12 }}>TODAY'S CANDLE</div>
              <Slider label="Open" value={open} min={100} max={200} step={0.5} onChange={v => setOpen(v)} color="#8ab4f8" />
              <Slider label="High" value={high} min={Math.max(open, close)} max={220} step={0.5} onChange={v => setHigh(v)} color={T.lime} />
              <Slider label="Low" value={low} min={80} max={Math.min(open, close)} step={0.5} onChange={v => setLow(v)} color={T.red} />
              <Slider label="Close" value={close} min={100} max={200} step={0.5} onChange={v => setClose(v)} color={T.gold} />
              <Slider label="Prev Close" value={prevClose} min={100} max={200} step={0.5} onChange={setPrevClose} color={T.sub} />
              <Slider label="Volume (M)" value={volume} min={100000} max={5000000} step={50000} onChange={setVolume} color={T.purple} unit="M" />
            </div>

            <div style={{ padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: T.muted, letterSpacing: "0.14em", marginBottom: 12 }}>PRIOR EMA STATE</div>
              <Slider label="Prev EMA₂₅(Change)" value={pE25c} min={-10} max={10} onChange={setPE25c} />
              <Slider label="Prev EMA₂₅(Range)" value={pE25r} min={0.5} max={20} onChange={setPE25r} color={T.blue} />
              <Slider label="Prev EMA₁₃(Num)" value={pE13n} min={-10} max={10} onChange={setPE13n} />
              <Slider label="Prev EMA₁₃(Den)" value={pE13d} min={0.5} max={20} onChange={setPE13d} color={T.blue} />
              <Slider label="Prev Signal" value={pSig} min={-100} max={100} onChange={setPSig} color={T.gold} />
            </div>

            {useRegime && (
              <div style={{ padding: "14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
                <div style={{ fontSize: 10, color: T.muted, letterSpacing: "0.14em", marginBottom: 12 }}>REGIME INPUTS</div>
                <Slider label="ADX (proxy)" value={adx} min={0} max={60} step={0.5} onChange={setAdx} color={T.lime} />
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, cursor: "pointer" }} onClick={() => setTrendFilter(v => !v)}>
                  <div style={{ width: 14, height: 14, borderRadius: 3, background: trendFilter ? T.lime : T.muted, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: T.sub }}>200-EMA Trend Direction Filter</span>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN — OUTPUT */}
          <div>
            {tab === "compare" && (
              <div>
                {/* Big numbers */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <BigNumber label="ORIGINAL ECO" value={origECO} color={T.blue} sub={`Signal: ${origSignal.toFixed(2)}`} />
                  <BigNumber label="ENHANCED ECO" value={enhECO} color={T.cyan} sub={`Signal: ${enhSignal.toFixed(2)}`} />
                  <div style={{ padding: "12px 8px", background: T.panel, borderRadius: 8, border: `1px solid ${T.border}`, textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: T.muted, letterSpacing: "0.14em", marginBottom: 4 }}>DELTA</div>
                    <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "monospace", color: (enhECO - origECO) > 0 ? T.lime : T.red, letterSpacing: "-0.03em" }}>
                      {(enhECO - origECO) > 0 ? "+" : ""}{(enhECO - origECO).toFixed(2)}
                    </div>
                    <div style={{ fontSize: 9, color: T.sub, marginTop: 4 }}>
                      {Math.abs(enhECO - origECO) < 1 ? "≈ No change" : Math.abs(enhECO - origECO) < 5 ? "Moderate shift" : "Significant divergence"}
                    </div>
                  </div>
                </div>

                {/* Signal badges */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <SignalBadge eco={origECO} signal={origSignal} label="ORIGINAL SIGNAL STATE" />
                  <div style={{ position: "relative" }}>
                    <SignalBadge eco={enhECO} signal={enhSignal} label="ENHANCED SIGNAL STATE" />
                    {regimeSuppressed && (
                      <div style={{
                        position: "absolute", inset: 0, borderRadius: 6,
                        background: `${T.bg}cc`, backdropFilter: "blur(4px)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: `1px solid ${T.red}44`
                      }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: T.red }}>⚠ SUPPRESSED — TRENDING REGIME</span>
                      </div>
                    )}
                  </div>
                </div>

                <DeltaMeter orig={origECO} enhanced={enhECO} />

                {/* Comparison table */}
                <div style={{ padding: "14px 16px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, marginTop: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 0.8fr", gap: 6, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${T.border}` }}>
                    <span style={{ fontSize: 9, color: T.muted, letterSpacing: "0.1em" }}>METRIC</span>
                    <span style={{ fontSize: 9, color: T.blue, letterSpacing: "0.1em", textAlign: "right" }}>ORIGINAL</span>
                    <span style={{ fontSize: 9, color: T.cyan, letterSpacing: "0.1em", textAlign: "right" }}>ENHANCED</span>
                    <span style={{ fontSize: 9, color: T.muted, letterSpacing: "0.1em", textAlign: "right" }}>DELTA</span>
                  </div>
                  <ValueRow label="Change" orig={origChange} enhanced={enhChange} />
                  <ValueRow label="Range" orig={origRange} enhanced={enhRange} />
                  <ValueRow label="Numerator" orig={origNum} enhanced={enhNum} />
                  <ValueRow label="Denominator" orig={origDen} enhanced={enhDen} />
                  <div style={{ height: 1, background: T.border, margin: "8px 0" }} />
                  <ValueRow label="ECO" orig={origECO} enhanced={enhECO} />
                  <ValueRow label="Signal" orig={origSignal} enhanced={enhSignal} />
                </div>
              </div>
            )}

            {tab === "detail" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {/* Original workings */}
                <div style={{ padding: "14px", background: T.panel, border: `1px solid ${T.blue}33`, borderRadius: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.blue, marginBottom: 12, letterSpacing: "0.08em" }}>◈ ORIGINAL ECO — WORKINGS</div>
                  {[
                    ["Change = C − O", origChange, T.text],
                    ["Range = H − L", origRange, T.text],
                    ["EMA₂₅(Change)", origE25c, T.blue],
                    ["EMA₂₅(Range)", origE25r, T.blue],
                    ["Numerator (EMA₁₃)", origNum, T.lime],
                    ["Denominator (EMA₁₃)", origDen, T.gold],
                    ["ECO = N/D × 100", origECO, T.blue],
                    ["Signal = EMA₈(ECO)", origSignal, T.gold],
                  ].map(([l, v, c]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${T.border}` }}>
                      <span style={{ fontSize: 11, color: T.sub }}>{l}</span>
                      <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: c }}>{v.toFixed(4)}</span>
                    </div>
                  ))}
                  <div style={{ fontSize: 10, color: T.muted, marginTop: 4 }}>Smoother: plain EMA · Range: High−Low</div>
                </div>

                {/* Enhanced workings */}
                <div style={{ padding: "14px", background: T.panel, border: `1px solid ${T.cyan}33`, borderRadius: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.cyan, marginBottom: 12, letterSpacing: "0.08em" }}>◈ ENHANCED ECO — WORKINGS</div>
                  {[
                    [`Change ${useVolume ? "(vol-wtd)" : ""}`, enhChange, T.text],
                    [`Range ${useTrueRange ? "(True)" : ""}`, enhRange, T.text],
                    [useDEMA ? "DEMA₂₅(Change)" : "EMA₂₅(Change)", enhNum, T.cyan],
                    [useDEMA ? "DEMA₁₃(Num)" : "EMA₁₃(Num)", enhNum, T.lime],
                    ["Denominator", enhDen, T.gold],
                    ["ECO = N/D × 100", enhECO, T.cyan],
                    ["Signal = EMA₈(ECO)", enhSignal, T.gold],
                  ].map(([l, v, c]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${T.border}` }}>
                      <span style={{ fontSize: 11, color: T.sub }}>{l}</span>
                      <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: c }}>{v.toFixed(4)}</span>
                    </div>
                  ))}
                  <div style={{ fontSize: 10, color: T.muted, marginTop: 4 }}>
                    {useDEMA ? "✓ DEMA lag reduction" : "EMA"} · {useTrueRange ? "✓ True Range" : "H−L"} · {useVolume ? "✓ Vol-weighted" : "unweighted"}
                  </div>
                </div>

                {/* Improvement summary */}
                <div style={{ gridColumn: "1/-1", padding: "14px 16px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
                  <div style={{ fontSize: 10, color: T.muted, letterSpacing: "0.14em", marginBottom: 10 }}>ACTIVE IMPROVEMENT EFFECTS</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                    {[
                      { label: "DEMA Lag Cut", active: useDEMA, color: T.cyan, value: useDEMA ? "~45%" : "0%", desc: "Faster signal response" },
                      { label: "Volume Weight", active: useVolume, color: T.purple, value: useVolume ? `×${volNorm.toFixed(2)}` : "off", desc: "Conviction scaling" },
                      { label: "True Range", active: useTrueRange, color: T.gold, value: useTrueRange ? `TR: ${trueRange.toFixed(2)}` : `HL: ${origRange.toFixed(2)}`, desc: "Gap-aware volatility" },
                      { label: "Regime Gate", active: useRegime, color: T.lime, value: useRegime ? (adx > 25 ? "BLOCKED" : "PASS") : "off", desc: `ADX: ${adx.toFixed(1)}` },
                    ].map(({ label, active, color, value, desc }) => (
                      <div key={label} style={{ padding: "10px", background: active ? `${color}0e` : T.off, borderRadius: 7, border: `1px solid ${active ? color + "33" : T.border}` }}>
                        <div style={{ fontSize: 9, color: active ? color : T.muted, letterSpacing: "0.1em", marginBottom: 4 }}>{label}</div>
                        <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "monospace", color: active ? color : T.muted }}>{value}</div>
                        <div style={{ fontSize: 9, color: T.muted, marginTop: 3 }}>{desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === "regime" && (
              <div>
                <div style={{ padding: "16px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: T.muted, letterSpacing: "0.14em", marginBottom: 14 }}>ADX REGIME CLASSIFICATION</div>
                  <div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", border: `1px solid ${T.border}`, marginBottom: 16 }}>
                    {[
                      { label: "Weak / Ranging", range: "0–15", color: T.lime, active: adx <= 15 },
                      { label: "Developing", range: "15–25", color: T.gold, active: adx > 15 && adx <= 25 },
                      { label: "Strong Trend", range: "25–40", color: T.red, active: adx > 25 && adx <= 40 },
                      { label: "Extreme Trend", range: "40+", color: T.red, active: adx > 40 },
                    ].map(({ label, range, color, active }) => (
                      <div key={label} style={{ flex: 1, padding: "10px 8px", background: active ? `${color}18` : "transparent", textAlign: "center", borderRight: `1px solid ${T.border}` }}>
                        <div style={{ fontSize: 9, color: active ? color : T.muted, fontWeight: active ? 800 : 400, letterSpacing: "0.06em" }}>{label}</div>
                        <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{range}</div>
                        {active && <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, margin: "4px auto 0", boxShadow: `0 0 6px ${color}` }} />}
                      </div>
                    ))}
                  </div>

                  <RegimeFlag adx={adx} trendFilter={trendFilter} useRegime={useRegime} trueRange={trueRange} range={origRange} />
                </div>

                <div style={{ padding: "16px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: T.muted, letterSpacing: "0.14em", marginBottom: 12 }}>TRUE RANGE vs HIGH−LOW BREAKDOWN</div>
                  {[
                    { label: "High − Low", value: high - low, color: T.blue },
                    { label: "|High − Prev Close|", value: Math.abs(high - prevClose), color: T.gold },
                    { label: "|Low − Prev Close|", value: Math.abs(low - prevClose), color: T.gold },
                    { label: "True Range (max of above)", value: trueRange, color: T.cyan, bold: true },
                  ].map(({ label, value, color, bold }) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9, paddingBottom: 9, borderBottom: `1px solid ${T.border}` }}>
                      <span style={{ fontSize: 11, color: bold ? T.text : T.sub }}>{label}</span>
                      <span style={{ fontSize: bold ? 16 : 13, fontFamily: "monospace", fontWeight: bold ? 800 : 500, color }}>{value.toFixed(3)}</span>
                    </div>
                  ))}
                  <div style={{ fontSize: 10, color: T.muted, marginTop: 4 }}>
                    Gap factor: {((trueRange / (high - low) - 1) * 100).toFixed(1)}% larger than H−L
                  </div>
                </div>

                <div style={{ padding: "16px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
                  <div style={{ fontSize: 10, color: T.muted, letterSpacing: "0.14em", marginBottom: 12 }}>WHEN TO TRUST EACH VERSION</div>
                  {[
                    { scenario: "Low ADX, small gap, avg volume", rec: "Original ECO is fine", color: T.blue },
                    { scenario: "Low ADX, large overnight gap", rec: "Enable True Range", color: T.gold },
                    { scenario: "High-volume breakout candle", rec: "Enable Volume Weighting", color: T.purple },
                    { scenario: "ADX > 25, strong directional trend", rec: "Suppress ECO entirely → use trend-follow", color: T.red },
                    { scenario: "Choppy ranging market", rec: "All enhancements active → best ECO quality", color: T.lime },
                  ].map(({ scenario, rec, color }) => (
                    <div key={scenario} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${T.border}` }}>
                      <div style={{ width: 3, height: 36, background: color, borderRadius: 2, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 10, color: T.sub }}>{scenario}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color, marginTop: 2 }}>→ {rec}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
