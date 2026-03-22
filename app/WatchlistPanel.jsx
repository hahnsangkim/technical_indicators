"use client";
import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function WatchlistPanel({ tickers, onSelectTicker, onClose }) {
  const T = {
    bg: "#07090f", surface: "#0d1117", panel: "#111520",
    border: "#1a2236", borderHi: "#2a3d5e",
    lime: "#39ff8a", red: "#ff3a5c", gold: "#f5c842",
    cyan: "#00e5cc", purple: "#b06aff",
    text: "#d0dff5", sub: "#7a90b0", muted: "#3a4d6a",
  };

  const [watchlist, setWatchlist] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("watchlist");
      return saved ? JSON.parse(saved) : ["SPY"];
    }
    return ["SPY"];
  });
  const [signalsByTicker, setSignalsByTicker] = useState({});
  const [loading, setLoading] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [collapsed, setCollapsed] = useState({});
  const [notifEnabled, setNotifEnabled] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("notifEnabled") === "true";
    return false;
  });

  // Save watchlist to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("watchlist", JSON.stringify(watchlist));
    }
  }, [watchlist]);

  // Fetch signals for all watched tickers
  const fetchAllSignals = async () => {
    setLoading(true);
    const results = {};
    for (const t of watchlist) {
      try {
        const res = await fetch(`${API}/api/signals?ticker=${t}`);
        if (res.ok) {
          const body = await res.json();
          results[t] = body.signals || [];
        } else {
          results[t] = [];
        }
      } catch {
        results[t] = [];
      }
    }

    // Check for new signals and notify
    if (notifEnabled && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      const seenRaw = localStorage.getItem("seenSignals");
      const seen = seenRaw ? new Set(JSON.parse(seenRaw)) : new Set();
      const newSignals = [];
      for (const [ticker, signals] of Object.entries(results)) {
        for (const s of signals) {
          const key = `${ticker}-${s.date}-${s.indicator}-${s.signal}`;
          if (!seen.has(key)) newSignals.push({ ...s, ticker });
        }
      }
      if (newSignals.length > 0) {
        if (newSignals.length === 1) {
          new Notification(`${newSignals[0].ticker}: ${newSignals[0].signal.replace(/_/g, " ")}`, {
            body: `${newSignals[0].direction} signal on ${newSignals[0].date}`,
          });
        } else {
          const tickerCounts = {};
          for (const s of newSignals) tickerCounts[s.ticker] = (tickerCounts[s.ticker] || 0) + 1;
          const summary = Object.entries(tickerCounts).map(([t, c]) => `${t} (${c})`).join(", ");
          new Notification(`${newSignals.length} new signals`, { body: summary });
        }
      }
      // Update seen signals
      const allKeys = [];
      for (const [ticker, signals] of Object.entries(results)) {
        for (const s of signals) allKeys.push(`${ticker}-${s.date}-${s.indicator}-${s.signal}`);
      }
      localStorage.setItem("seenSignals", JSON.stringify(allKeys));
    }

    setSignalsByTicker(results);
    setLoading(false);
  };

  // Fetch on mount and every 5 minutes
  useEffect(() => {
    fetchAllSignals();
    const interval = setInterval(fetchAllSignals, 5 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlist, notifEnabled]);

  const addTicker = (t) => {
    const upper = t.toUpperCase().trim();
    if (upper && !watchlist.includes(upper) && tickers.includes(upper)) {
      setWatchlist(prev => [...prev, upper]);
    }
    setAddQuery("");
    setShowAdd(false);
  };

  const removeTicker = (t) => {
    setWatchlist(prev => prev.filter(x => x !== t));
  };

  const toggleCollapse = (t) => {
    setCollapsed(prev => ({ ...prev, [t]: !prev[t] }));
  };

  const enableNotifications = async () => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      const newVal = !notifEnabled;
      setNotifEnabled(newVal);
      localStorage.setItem("notifEnabled", String(newVal));
    } else if (Notification.permission !== "denied") {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        setNotifEnabled(true);
        localStorage.setItem("notifEnabled", "true");
      }
    }
  };

  const filteredTickers = addQuery
    ? tickers.filter(t => t.includes(addQuery.toUpperCase()) && !watchlist.includes(t)).slice(0, 8)
    : [];

  const totalSignals = Object.values(signalsByTicker).reduce((sum, s) => sum + s.length, 0);

  return (
    <div style={{ position: "fixed", top: 0, right: 0, width: 380, height: "100vh", background: T.bg, borderLeft: `1px solid ${T.border}`, zIndex: 1000, display: "flex", flexDirection: "column", fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: 11, color: T.muted, letterSpacing: "0.12em", flex: 1 }}>WATCHLIST SIGNALS</div>
        <span style={{ fontSize: 11, color: T.sub }}>{totalSignals} signals</span>
        <button onClick={enableNotifications} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: notifEnabled ? T.gold : T.muted, padding: "2px 6px" }} title={notifEnabled ? "Notifications on" : "Enable notifications"}>
          {notifEnabled ? "\uD83D\uDD14" : "\uD83D\uDD15"}
        </button>
        <button onClick={() => setShowAdd(!showAdd)} style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, cursor: "pointer", fontSize: 11, padding: "4px 8px" }}>+ Add</button>
        <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 16, padding: "2px 6px" }}>{"\u2715"}</button>
      </div>

      {/* Add ticker input */}
      {showAdd && (
        <div style={{ padding: "8px 16px", borderBottom: `1px solid ${T.border}`, position: "relative" }}>
          <input value={addQuery} onChange={e => setAddQuery(e.target.value)} placeholder="Search ticker..." onKeyDown={e => { if (e.key === "Enter" && filteredTickers.length > 0) addTicker(filteredTickers[0]); }}
            style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, padding: "6px 10px", fontSize: 12, fontFamily: "monospace", outline: "none" }} autoFocus />
          {filteredTickers.length > 0 && (
            <div style={{ position: "absolute", left: 16, right: 16, top: 42, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 4, maxHeight: 200, overflowY: "auto", zIndex: 10 }}>
              {filteredTickers.map(t => (
                <div key={t} onClick={() => addTicker(t)} style={{ padding: "6px 10px", cursor: "pointer", fontSize: 12, color: T.text, fontFamily: "monospace" }}
                  onMouseEnter={e => e.target.style.background = T.surface} onMouseLeave={e => e.target.style.background = "transparent"}>{t}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ticker sections */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {loading && watchlist.length > 0 && Object.keys(signalsByTicker).length === 0 && (
          <div style={{ padding: 16, color: T.sub, fontSize: 12, textAlign: "center" }}>Loading signals...</div>
        )}
        {watchlist.map(t => {
          const signals = signalsByTicker[t] || [];
          const isCollapsed = collapsed[t];
          return (
            <div key={t} style={{ borderBottom: `1px solid ${T.border}` }}>
              <div onClick={() => toggleCollapse(t)} style={{ display: "flex", alignItems: "center", padding: "8px 16px", cursor: "pointer", gap: 8 }}>
                <span style={{ color: T.muted, fontSize: 10 }}>{isCollapsed ? "\u25B6" : "\u25BC"}</span>
                <span style={{ color: T.text, fontSize: 12, fontWeight: 600, flex: 1 }}>{t}</span>
                <span style={{ color: T.sub, fontSize: 11 }}>{signals.length} signal{signals.length !== 1 ? "s" : ""}</span>
                <button onClick={e => { e.stopPropagation(); removeTicker(t); }} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 12, padding: "0 4px" }}>{"\u2715"}</button>
              </div>
              {!isCollapsed && (
                <div style={{ padding: "0 16px 8px" }}>
                  {signals.length === 0 ? (
                    <div style={{ color: T.muted, fontSize: 11, padding: "4px 0" }}>No signals in last 10 bars</div>
                  ) : (
                    signals.map((s, i) => (
                      <div key={i} onClick={() => onSelectTicker(t)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", borderRadius: 4, cursor: "pointer", marginBottom: 2, background: T.surface, border: `1px solid ${T.border}` }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = T.borderHi} onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
                        <span style={{ color: T.sub, fontSize: 10, minWidth: 52, fontFamily: "monospace" }}>{s.date.slice(5)}</span>
                        <span style={{ color: T.text, fontSize: 10, minWidth: 60 }}>{s.indicator}</span>
                        <span style={{ color: T.text, fontSize: 10, flex: 1 }}>{s.signal.replace(/_/g, " ")}</span>
                        <span style={{ color: s.direction === "buy" ? T.lime : s.direction === "sell" ? T.red : T.gold, fontSize: 10, fontWeight: 600 }}>
                          {s.direction === "buy" ? "\u25B2 BUY" : s.direction === "sell" ? "\u25BC SELL" : "\u2014 "}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
