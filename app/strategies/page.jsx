"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

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

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const INDICATOR_FIELDS = {
  eco: ["eco", "signal", "histogram"],
  obv: ["obv", "obvEma"],
  demark: ["setupCount", "setupComplete", "countdownComplete", "signal"],
  rsi: ["rsi"],
  macd: ["macd", "signal", "histogram"],
  bollinger: ["upper", "middle", "lower", "close"],
  atr: ["tr", "atr"],
  adx: ["adx", "plusDI", "minusDI"],
  cci: ["cci"],
  roc: ["roc"],
  williamsR: ["williamsR"],
  stochRsi: ["stochRsi", "k", "d"],
  ichimoku: ["tenkan", "kijun", "senkouA", "senkouB", "chikou"],
};

const OPERATORS = [">", "<", ">=", "<=", "=="];

const EXAMPLE_CHIPS = [
  "Buy when RSI < 30 and MACD crosses above signal",
  "Sell when Bollinger upper band is breached and ADX > 25",
  "Buy when DeMark Buy Setup 9 fires and OBV is rising",
];

function emptyCondition() {
  return {
    id: Date.now() + Math.random(),
    indicator: "eco",
    field: "eco",
    operator: ">",
    crossover: false,
    value: "",
    crossField: "signal",
  };
}

// ─── INPUT STYLE ─────────────────────────────────────────────────────────────
const inputStyle = {
  background: T.surface,
  border: `1px solid ${T.border}`,
  borderRadius: 6,
  color: T.text,
  padding: "8px 12px",
  fontSize: 13,
  fontFamily: "'IBM Plex Sans', sans-serif",
  outline: "none",
  width: "100%",
};

const btnStyle = (active, color = T.cyan) => ({
  padding: "8px 18px",
  borderRadius: 6,
  border: `1px solid ${active ? color : T.border}`,
  background: active ? `${color}20` : T.panel,
  color: active ? color : T.sub,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "'IBM Plex Sans', sans-serif",
});

// ─── AI INPUT SECTION ────────────────────────────────────────────────────────
function AIInput({ onGenerated }) {
  const [apiKey, setApiKey] = useState("");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("anthropic_api_key");
    if (saved) setApiKey(saved);
  }, []);

  const saveKey = (v) => {
    setApiKey(v);
    localStorage.setItem("anthropic_api_key", v);
  };

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/generate-strategy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, apiKey }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      onGenerated(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, padding: 24, marginBottom: 20 }}>
      <h2 style={{ color: T.text, fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>AI Strategy Generator</h2>
      <div style={{ marginBottom: 12 }}>
        <label style={{ color: T.sub, fontSize: 11, display: "block", marginBottom: 4 }}>Anthropic API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => saveKey(e.target.value)}
          placeholder="sk-ant-..."
          style={inputStyle}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ color: T.sub, fontSize: 11, display: "block", marginBottom: 4 }}>Strategy Description</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your trading strategy in plain English..."
          rows={4}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {EXAMPLE_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => setPrompt(chip)}
            style={{
              background: `${T.purple}15`,
              border: `1px solid ${T.purple}40`,
              borderRadius: 20,
              color: T.purple,
              fontSize: 11,
              padding: "6px 14px",
              cursor: "pointer",
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          >
            {chip}
          </button>
        ))}
      </div>
      <button onClick={generate} disabled={loading} style={btnStyle(true, T.purple)}>
        {loading ? "Generating..." : "Generate"}
      </button>
      {error && <div style={{ color: T.red, fontSize: 12, marginTop: 8 }}>{error}</div>}
    </div>
  );
}

// ─── CONDITION ROW ───────────────────────────────────────────────────────────
function ConditionRow({ cond, onChange, onDelete }) {
  const fields = INDICATOR_FIELDS[cond.indicator] || [];
  const allFields = Object.entries(INDICATOR_FIELDS).flatMap(([ind, fs]) => fs.map((f) => `${ind}.${f}`));

  const update = (key, val) => {
    const next = { ...cond, [key]: val };
    if (key === "indicator") {
      const newFields = INDICATOR_FIELDS[val] || [];
      next.field = newFields[0] || "";
    }
    onChange(next);
  };

  const selectStyle = { ...inputStyle, width: "auto", minWidth: 100, padding: "6px 8px" };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
      <select value={cond.indicator} onChange={(e) => update("indicator", e.target.value)} style={selectStyle}>
        {Object.keys(INDICATOR_FIELDS).map((k) => (
          <option key={k} value={k}>{k}</option>
        ))}
      </select>
      <select value={cond.field} onChange={(e) => update("field", e.target.value)} style={selectStyle}>
        {fields.map((f) => (
          <option key={f} value={f}>{f}</option>
        ))}
      </select>
      <select value={cond.operator} onChange={(e) => update("operator", e.target.value)} style={selectStyle}>
        {OPERATORS.map((op) => (
          <option key={op} value={op}>{op}</option>
        ))}
      </select>
      <label style={{ color: T.sub, fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
        <input
          type="checkbox"
          checked={cond.crossover}
          onChange={(e) => update("crossover", e.target.checked)}
        />
        Cross
      </label>
      {cond.crossover ? (
        <select value={cond.crossField} onChange={(e) => update("crossField", e.target.value)} style={selectStyle}>
          {allFields.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      ) : (
        <input
          type="number"
          value={cond.value}
          onChange={(e) => update("value", e.target.value)}
          placeholder="Value"
          style={{ ...inputStyle, width: 80, padding: "6px 8px" }}
        />
      )}
      <button onClick={onDelete} style={{ background: "none", border: "none", color: T.red, cursor: "pointer", fontSize: 16, fontWeight: 700 }}>
        X
      </button>
    </div>
  );
}

// ─── CONDITION EDITOR ────────────────────────────────────────────────────────
function ConditionEditor({ conditions, setConditions, strategyName, setStrategyName, action, setAction }) {
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const updateCondition = (idx, cond) => {
    setConditions((prev) => prev.map((c, i) => (i === idx ? cond : c)));
  };

  const deleteCondition = (idx) => {
    setConditions((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveStrategy = () => {
    if (!strategyName.trim()) return;
    const strategy = {
      id: Date.now(),
      name: strategyName,
      action,
      conditions: conditions.map(({ id, ...rest }) => rest),
      active: true,
    };
    const existing = JSON.parse(localStorage.getItem("trading_strategies") || "[]");
    existing.push(strategy);
    localStorage.setItem("trading_strategies", JSON.stringify(existing));
    setStrategyName("");
    setConditions([emptyCondition()]);
    window.dispatchEvent(new Event("strategies-updated"));
  };

  const testStrategy = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API}/api/strategy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: "SPY",
          action,
          conditions: conditions.map(({ id, ...rest }) => rest),
        }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setTestResult(data);
    } catch (e) {
      setTestResult({ error: e.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, padding: 24, marginBottom: 20 }}>
      <h2 style={{ color: T.text, fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>Condition Editor</h2>
      <div style={{ marginBottom: 12 }}>
        <label style={{ color: T.sub, fontSize: 11, display: "block", marginBottom: 4 }}>Strategy Name</label>
        <input
          value={strategyName}
          onChange={(e) => setStrategyName(e.target.value)}
          placeholder="My Strategy"
          style={inputStyle}
        />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setAction("BUY")} style={btnStyle(action === "BUY", T.lime)}>BUY</button>
        <button onClick={() => setAction("SELL")} style={btnStyle(action === "SELL", T.red)}>SELL</button>
      </div>
      <div style={{ marginBottom: 12 }}>
        {conditions.map((cond, i) => (
          <ConditionRow key={cond.id} cond={cond} onChange={(c) => updateCondition(i, c)} onDelete={() => deleteCondition(i)} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => setConditions((p) => [...p, emptyCondition()])} style={btnStyle(false, T.cyan)}>
          + Add Condition
        </button>
        <button onClick={saveStrategy} style={btnStyle(true, T.lime)}>Save Strategy</button>
        <button onClick={testStrategy} disabled={testing} style={btnStyle(true, T.blue)}>
          {testing ? "Testing..." : "Test Strategy"}
        </button>
      </div>
      {testResult && (
        <div style={{ marginTop: 12, padding: 12, background: T.surface, borderRadius: 6, border: `1px solid ${T.border}` }}>
          {testResult.error ? (
            <span style={{ color: T.red, fontSize: 12 }}>{testResult.error}</span>
          ) : (
            <span style={{ color: T.cyan, fontSize: 12 }}>
              Results: {testResult.signals?.length ?? testResult.count ?? JSON.stringify(testResult)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SAVED STRATEGIES LIBRARY ────────────────────────────────────────────────
function StrategyLibrary() {
  const [strategies, setStrategies] = useState([]);

  const load = useCallback(() => {
    const saved = JSON.parse(localStorage.getItem("trading_strategies") || "[]");
    setStrategies(saved);
  }, []);

  useEffect(() => {
    load();
    window.addEventListener("strategies-updated", load);
    return () => window.removeEventListener("strategies-updated", load);
  }, [load]);

  const persist = (list) => {
    localStorage.setItem("trading_strategies", JSON.stringify(list));
    setStrategies(list);
  };

  const toggleActive = (id) => {
    persist(strategies.map((s) => (s.id === id ? { ...s, active: !s.active } : s)));
  };

  const remove = (id) => {
    persist(strategies.filter((s) => s.id !== id));
  };

  const condSummary = (conds) =>
    conds
      .map((c) => {
        const lhs = `${c.indicator}.${c.field}`;
        const rhs = c.crossover ? c.crossField : c.value;
        return `${lhs} ${c.operator} ${rhs}`;
      })
      .join(" AND ");

  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ color: T.text, fontSize: 16, fontWeight: 700, margin: 0 }}>Saved Strategies</h2>
        <Link href="/?strategies=active" style={{ color: T.cyan, fontSize: 12, textDecoration: "none" }}>
          View on Dashboard &rarr;
        </Link>
      </div>
      {strategies.length === 0 && <div style={{ color: T.muted, fontSize: 13 }}>No saved strategies yet.</div>}
      {strategies.map((s) => (
        <div
          key={s.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 12px",
            marginBottom: 6,
            background: T.surface,
            borderRadius: 6,
            border: `1px solid ${T.border}`,
            flexWrap: "wrap",
          }}
        >
          <input type="checkbox" checked={s.active} onChange={() => toggleActive(s.id)} />
          <span style={{ color: T.text, fontSize: 13, fontWeight: 600, minWidth: 100 }}>{s.name}</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              padding: "3px 8px",
              borderRadius: 4,
              background: s.action === "BUY" ? `${T.lime}20` : `${T.red}20`,
              color: s.action === "BUY" ? T.lime : T.red,
            }}
          >
            {s.action}
          </span>
          <span style={{ color: T.sub, fontSize: 11, flex: 1 }}>{condSummary(s.conditions)}</span>
          <button onClick={() => remove(s.id)} style={{ background: "none", border: "none", color: T.red, cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── PAGE ────────────────────────────────────────────────────────────────────
export default function StrategiesPage() {
  const [conditions, setConditions] = useState([emptyCondition()]);
  const [strategyName, setStrategyName] = useState("");
  const [action, setAction] = useState("BUY");

  const handleGenerated = (data) => {
    if (data.name) setStrategyName(data.name);
    if (data.action) setAction(data.action);
    if (data.conditions && Array.isArray(data.conditions)) {
      setConditions(data.conditions.map((c) => ({ ...emptyCondition(), ...c })));
    }
  };

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: "'IBM Plex Sans', sans-serif", color: T.text }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: T.text }}>Strategy Builder</h1>
          <Link href="/" style={{ color: T.cyan, fontSize: 13, textDecoration: "none" }}>
            &larr; Dashboard
          </Link>
        </div>
        <AIInput onGenerated={handleGenerated} />
        <ConditionEditor
          conditions={conditions}
          setConditions={setConditions}
          strategyName={strategyName}
          setStrategyName={setStrategyName}
          action={action}
          setAction={setAction}
        />
        <StrategyLibrary />
      </div>
    </div>
  );
}
