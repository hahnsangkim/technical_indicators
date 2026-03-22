import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WatchlistPanel from "../app/WatchlistPanel.jsx";

const MOCK_TICKERS = ["AAPL", "MSFT", "SPY", "GOOGL", "AMZN"];

const MOCK_SIGNALS = [
  { date: "2023-03-01", indicator: "rsi", signal: "OVERBOUGHT_ENTRY", direction: "sell", value: 72.3, details: "RSI crossed above 70" },
  { date: "2023-02-28", indicator: "macd", signal: "BULLISH_CROSSOVER", direction: "buy", value: 1.5, details: "MACD crossed above signal" },
];

function mockFetch(signalsByTicker = {}) {
  return vi.fn((url) => {
    const tickerMatch = url.match(/ticker=([A-Z]+)/);
    const ticker = tickerMatch ? tickerMatch[1] : "SPY";
    const signals = signalsByTicker[ticker] || [];
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ ticker, signals, totalSignals: signals.length }),
    });
  });
}

// Mock localStorage since jsdom doesn't provide a full implementation
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = String(value); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, writable: true });

describe("WatchlistPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorageMock.clear();
    localStorageMock.getItem.mockImplementation((key) => null);
  });

  it("renders with default watchlist (SPY)", async () => {
    global.fetch = mockFetch({ SPY: MOCK_SIGNALS });
    const onSelectTicker = vi.fn();
    const onClose = vi.fn();
    render(<WatchlistPanel tickers={MOCK_TICKERS} onSelectTicker={onSelectTicker} onClose={onClose} />);
    expect(screen.getByText("WATCHLIST SIGNALS")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("SPY")).toBeInTheDocument();
    });
  });

  it("shows signal rows for watched ticker", async () => {
    global.fetch = mockFetch({ SPY: MOCK_SIGNALS });
    render(<WatchlistPanel tickers={MOCK_TICKERS} onSelectTicker={vi.fn()} onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/OVERBOUGHT ENTRY/)).toBeInTheDocument();
      expect(screen.getByText(/BULLISH CROSSOVER/)).toBeInTheDocument();
    });
  });

  it("shows 'No signals' when ticker has no signals", async () => {
    global.fetch = mockFetch({ SPY: [] });
    render(<WatchlistPanel tickers={MOCK_TICKERS} onSelectTicker={vi.fn()} onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/No signals/)).toBeInTheDocument();
    });
  });

  it("calls onClose when close button clicked", async () => {
    global.fetch = mockFetch({});
    const onClose = vi.fn();
    render(<WatchlistPanel tickers={MOCK_TICKERS} onSelectTicker={vi.fn()} onClose={onClose} />);
    // The close button uses ✕ — there's one in the header and one per ticker row
    // Get the first one which is in the header
    const closeButtons = screen.getAllByText("\u2715");
    await userEvent.click(closeButtons[0]);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("displays signal count", async () => {
    global.fetch = mockFetch({ SPY: MOCK_SIGNALS });
    render(<WatchlistPanel tickers={MOCK_TICKERS} onSelectTicker={vi.fn()} onClose={vi.fn()} />);
    await waitFor(() => {
      const matches = screen.getAllByText("2 signals");
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });
});
