import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }) => <a href={href}>{children}</a>,
}));

// Mock fetch globally
beforeEach(() => {
  vi.restoreAllMocks();
  global.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
  );
  // Reset localStorage by setting keys to empty
  const storage = {};
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key) => storage[key] ?? null),
    setItem: vi.fn((key, value) => { storage[key] = String(value); }),
    removeItem: vi.fn((key) => { delete storage[key]; }),
    clear: vi.fn(() => { Object.keys(storage).forEach((k) => delete storage[k]); }),
  });
});

import StrategiesPage from "../app/strategies/page";

describe("StrategyPage", () => {
  it("renders the page title", () => {
    render(<StrategiesPage />);
    expect(screen.getByText("Strategy Builder")).toBeInTheDocument();
  });

  it("renders section headings", () => {
    render(<StrategiesPage />);
    expect(screen.getByText("AI Strategy Generator")).toBeInTheDocument();
    expect(screen.getByText("Condition Editor")).toBeInTheDocument();
    expect(screen.getByText("Saved Strategies")).toBeInTheDocument();
  });

  it("renders example chips", () => {
    render(<StrategiesPage />);
    expect(
      screen.getByText("Buy when RSI < 30 and MACD crosses above signal")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Sell when Bollinger upper band is breached and ADX > 25"
      )
    ).toBeInTheDocument();
  });

  it("renders BUY and SELL action buttons", () => {
    render(<StrategiesPage />);
    expect(screen.getByText("BUY")).toBeInTheDocument();
    expect(screen.getByText("SELL")).toBeInTheDocument();
  });

  it("renders + Add Condition button", () => {
    render(<StrategiesPage />);
    expect(screen.getByText("+ Add Condition")).toBeInTheDocument();
  });

  it("renders Save Strategy and Test Strategy buttons", () => {
    render(<StrategiesPage />);
    expect(screen.getByText("Save Strategy")).toBeInTheDocument();
    expect(screen.getByText("Test Strategy")).toBeInTheDocument();
  });

  it("adds a condition row when clicking + Add Condition", () => {
    render(<StrategiesPage />);
    // Starts with one condition row (one X delete button)
    const deleteBtns = screen.getAllByText("X");
    const initialCount = deleteBtns.length;

    fireEvent.click(screen.getByText("+ Add Condition"));

    const afterAdd = screen.getAllByText("X");
    expect(afterAdd.length).toBe(initialCount + 1);
  });

  it("removes a condition row when clicking X", () => {
    render(<StrategiesPage />);
    // Add a second condition
    fireEvent.click(screen.getByText("+ Add Condition"));
    const deleteBtns = screen.getAllByText("X");
    expect(deleteBtns.length).toBe(2);

    // Remove the first one
    fireEvent.click(deleteBtns[0]);
    expect(screen.getAllByText("X").length).toBe(1);
  });

  it("saves strategy to localStorage", () => {
    render(<StrategiesPage />);
    // Fill in name
    const nameInput = screen.getByPlaceholderText("My Strategy");
    fireEvent.change(nameInput, { target: { value: "Test RSI Strategy" } });

    // Click save
    fireEvent.click(screen.getByText("Save Strategy"));

    const saved = JSON.parse(window.localStorage.getItem("trading_strategies"));
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe("Test RSI Strategy");
    expect(saved[0].action).toBe("BUY");
    expect(saved[0].active).toBe(true);
  });

  it("does not save when strategy name is empty", () => {
    render(<StrategiesPage />);
    fireEvent.click(screen.getByText("Save Strategy"));

    const saved = JSON.parse(window.localStorage.getItem("trading_strategies") || "[]");
    expect(saved).toHaveLength(0);
  });

  it("loads saved strategies from localStorage", () => {
    window.localStorage.setItem(
      "trading_strategies",
      JSON.stringify([
        {
          id: "s1",
          name: "Test RSI",
          action: "BUY",
          active: true,
          conditions: [
            { indicator: "rsi", field: "rsi", operator: "<", value: 30 },
          ],
        },
      ])
    );
    render(<StrategiesPage />);
    expect(screen.getByText("Test RSI")).toBeInTheDocument();
  });

  it("shows 'No saved strategies yet.' when library is empty", () => {
    render(<StrategiesPage />);
    expect(screen.getByText("No saved strategies yet.")).toBeInTheDocument();
  });

  it("toggles action between BUY and SELL", () => {
    render(<StrategiesPage />);
    const nameInput = screen.getByPlaceholderText("My Strategy");
    fireEvent.change(nameInput, { target: { value: "Sell Strat" } });

    fireEvent.click(screen.getByText("SELL"));
    fireEvent.click(screen.getByText("Save Strategy"));

    const saved = JSON.parse(window.localStorage.getItem("trading_strategies"));
    expect(saved[0].action).toBe("SELL");
  });

  it("clears editor after saving", () => {
    render(<StrategiesPage />);
    const nameInput = screen.getByPlaceholderText("My Strategy");
    fireEvent.change(nameInput, { target: { value: "My Strat" } });
    fireEvent.click(screen.getByText("Save Strategy"));

    // Name should be cleared after save
    expect(nameInput.value).toBe("");
  });

  it("renders dashboard link", () => {
    render(<StrategiesPage />);
    // The "← Dashboard" link in the header (distinct from "View on Dashboard →")
    const links = screen.getAllByText(/Dashboard/);
    const backLink = links.find((el) => el.closest("a")?.getAttribute("href") === "/");
    expect(backLink).toBeDefined();
    expect(backLink.closest("a")).toHaveAttribute("href", "/");
  });

  it("deletes a saved strategy", () => {
    window.localStorage.setItem(
      "trading_strategies",
      JSON.stringify([
        {
          id: "s1",
          name: "To Delete",
          action: "BUY",
          active: true,
          conditions: [
            { indicator: "rsi", field: "rsi", operator: "<", value: 30 },
          ],
        },
      ])
    );
    render(<StrategiesPage />);
    expect(screen.getByText("To Delete")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Delete"));

    expect(screen.queryByText("To Delete")).not.toBeInTheDocument();
    const saved = JSON.parse(window.localStorage.getItem("trading_strategies"));
    expect(saved).toHaveLength(0);
  });
});
