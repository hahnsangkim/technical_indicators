import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Dashboard from "../app/ECOComparison.jsx";

// Mock recharts to avoid canvas/SVG issues in jsdom
vi.mock("recharts", () => {
  const FakeChart = ({ children }) => <div data-testid="chart">{children}</div>;
  const FakeLine = () => <div data-testid="line" />;
  const FakeBar = () => <div data-testid="bar" />;
  const FakeArea = () => <div data-testid="area" />;
  return {
    ComposedChart: FakeChart,
    Area: FakeArea,
    Line: FakeLine,
    Bar: FakeBar,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
    ResponsiveContainer: ({ children }) => <div>{children}</div>,
    ReferenceLine: () => null,
  };
});

// Helper to create mock indicator data
function makeMockData(fields, count = 50) {
  return Array.from({ length: count }, (_, i) => ({
    date: `2025-01-${String(i + 1).padStart(2, "0")}`,
    close: 500 + i,
    volume: 1000000 + i * 1000,
    ...fields(i),
  }));
}

const MOCK_TICKERS = ["AAPL", "MSFT", "SPY"];

function mockFetchForIndicator(indicator, data) {
  return vi.fn((url) => {
    if (url.includes("/api/tickers")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_TICKERS) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ ticker: "SPY", data }) });
  });
}

describe("Dashboard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows loading state initially", () => {
    global.fetch = vi.fn(() => new Promise(() => {})); // never resolves
    render(<Dashboard />);
    expect(screen.getByText(/Loading SPY data/)).toBeInTheDocument();
  });

  it("shows loading state when data is empty (no primary data)", async () => {
    global.fetch = vi.fn((url) => {
      if (url.includes("/api/tickers")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_TICKERS) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ticker: "ZZZZ", data: [] }) });
    });
    render(<Dashboard />);
    // Empty data means primaryData is null → loading screen persists
    await waitFor(() => {
      expect(screen.getByText(/Loading/)).toBeInTheDocument();
    });
  });

  it("renders price chart when data loads", async () => {
    const ecoData = makeMockData((i) => ({ eco: i * 0.1, signal: i * 0.05, histogram: i * 0.05 }));
    global.fetch = mockFetchForIndicator("eco", ecoData);
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.queryByText(/Loading/)).not.toBeInTheDocument();
    });
    // Chart rendered (mocked)
    expect(screen.getAllByTestId("chart").length).toBeGreaterThan(0);
  });

  it("renders ECO KPI cards when ECO active", async () => {
    const ecoData = makeMockData((i) => ({ eco: 5.2, signal: 3.1, histogram: 2.1 }));
    global.fetch = mockFetchForIndicator("eco", ecoData);
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.queryByText(/Loading/)).not.toBeInTheDocument();
    });
    // ECO-related KPI labels
    expect(screen.getByText("CLOSE")).toBeInTheDocument();
    expect(screen.getAllByText("ECO").length).toBeGreaterThan(0);
  });

  it("range buttons are visible", async () => {
    const ecoData = makeMockData((i) => ({ eco: 1, signal: 0.5, histogram: 0.5 }));
    global.fetch = mockFetchForIndicator("eco", ecoData);
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.queryByText(/Loading/)).not.toBeInTheDocument();
    });
    expect(screen.getByText("3M")).toBeInTheDocument();
    expect(screen.getByText("6M")).toBeInTheDocument();
    expect(screen.getByText("1Y")).toBeInTheDocument();
    expect(screen.getByText("ALL")).toBeInTheDocument();
  });

  it("signal badge reflects ECO state", async () => {
    const ecoData = makeMockData((i) => ({ eco: 10, signal: 5, histogram: 5 }));
    global.fetch = mockFetchForIndicator("eco", ecoData);
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.queryByText(/Loading/)).not.toBeInTheDocument();
    });
    // eco > signal => BULLISH
    expect(screen.getByText(/BULLISH/)).toBeInTheDocument();
  });
});
