import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TickerSearch } from "../app/ECOComparison.jsx";

const TICKERS = ["AAPL", "AAL", "ABNB", "AMZN", "BA", "GOOG", "MSFT", "META", "NFLX", "NVDA",
  "SPY", "TSLA", "T01", "T02", "T03", "T04", "T05", "T06", "T07", "T08",
  "T09", "T10", "T11", "T12", "T13", "T14", "T15", "T16", "T17", "T18",
  "T19", "T20", "T21", "T22", "T23", "T24", "T25", "T26", "T27", "T28"];

describe("TickerSearch", () => {
  it("dropdown opens on click", async () => {
    render(<TickerSearch tickers={TICKERS} selected="SPY" onSelect={() => {}} />);
    const trigger = screen.getByText("SPY");
    await userEvent.click(trigger);
    expect(screen.getByPlaceholderText("Search ticker…")).toBeInTheDocument();
  });

  it('search filters tickers — typing "AA" shows AAPL, AAL', async () => {
    render(<TickerSearch tickers={TICKERS} selected="SPY" onSelect={() => {}} />);
    await userEvent.click(screen.getByText("SPY"));
    const input = screen.getByPlaceholderText("Search ticker…");
    await userEvent.type(input, "AA");
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("AAL")).toBeInTheDocument();
    expect(screen.queryByText("GOOG")).not.toBeInTheDocument();
  });

  it("max 30 results shown", async () => {
    render(<TickerSearch tickers={TICKERS} selected="SPY" onSelect={() => {}} />);
    await userEvent.click(screen.getByText("SPY"));
    // With 40 tickers and no filter, should show at most 30
    const buttons = screen.getAllByRole("button").filter(b => TICKERS.includes(b.textContent));
    expect(buttons.length).toBeLessThanOrEqual(30);
  });

  it("selecting ticker calls onSelect and closes dropdown", async () => {
    const onSelect = vi.fn();
    render(<TickerSearch tickers={TICKERS} selected="SPY" onSelect={onSelect} />);
    await userEvent.click(screen.getByText("SPY"));
    await userEvent.click(screen.getByText("AAPL"));
    expect(onSelect).toHaveBeenCalledWith("AAPL");
    expect(screen.queryByPlaceholderText("Search ticker…")).not.toBeInTheDocument();
  });

  it("shows ticker count", async () => {
    render(<TickerSearch tickers={TICKERS} selected="SPY" onSelect={() => {}} />);
    await userEvent.click(screen.getByText("SPY"));
    expect(screen.getByText(`${TICKERS.length} tickers available`)).toBeInTheDocument();
  });
});
