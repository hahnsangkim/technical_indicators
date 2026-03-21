import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IndicatorMenu, INDICATORS } from "../app/ECOComparison.jsx";

describe("IndicatorMenu", () => {
  it("badge shows count of active indicators", () => {
    render(<IndicatorMenu active={["eco", "rsi", "macd"]} onToggle={() => {}} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("toggling indicator calls onToggle", async () => {
    const onToggle = vi.fn();
    render(<IndicatorMenu active={["eco"]} onToggle={onToggle} />);
    await userEvent.click(screen.getByText("Indicators"));
    await userEvent.click(screen.getByText("RSI"));
    expect(onToggle).toHaveBeenCalledWith("rsi");
  });

  it("all 13 indicators listed when open", async () => {
    render(<IndicatorMenu active={["eco"]} onToggle={() => {}} />);
    await userEvent.click(screen.getByText("Indicators"));
    for (const ind of Object.values(INDICATORS)) {
      expect(screen.getByText(ind.label)).toBeInTheDocument();
    }
  });

  it("each indicator has unique color", () => {
    const colors = Object.values(INDICATORS).map(i => i.color);
    expect(colors.length).toBe(new Set(colors).size);
  });
});
