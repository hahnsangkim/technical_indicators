import { Router } from "express";
import express from "express";
import Anthropic from "@anthropic-ai/sdk";

const router = Router();
router.use(express.json());

const INDICATOR_FIELDS = {
  eco: ["eco", "signal", "histogram"],
  obv: ["obv", "obvEma"],
  demark: ["setupCount", "setupComplete", "countdownComplete", "signal"],
  rsi: ["rsi"],
  macd: ["macd", "signal", "histogram"],
  bollinger: ["upper", "middle", "lower"],
  atr: ["tr", "atr"],
  adx: ["adx", "plusDI", "minusDI"],
  cci: ["cci"],
  roc: ["roc"],
  williamsR: ["williamsR"],
  stochRsi: ["stochRsi", "k", "d"],
  ichimoku: ["tenkan", "kijun", "senkouA", "senkouB", "chikou"],
};

const SYSTEM_PROMPT = `You are a trading strategy parser. Convert natural language trading strategies into structured conditions.

Available indicators and their fields:
${Object.entries(INDICATOR_FIELDS).map(([ind, fields]) => `- ${ind}: ${fields.join(", ")}`).join("\n")}

All indicators also have: date, close, volume

Rules:
- Each condition tests ONE field from ONE indicator
- Operators: >, <, >=, <=, ==
- For crossover conditions (e.g., "MACD crosses above signal line"), set crossover=true and crossField to the field being crossed
- For threshold conditions (e.g., "RSI < 30"), set value to the threshold number
- action must be "buy" or "sell"
- All conditions within a strategy use AND logic
- Generate a descriptive name for the strategy`;

const TOOL_SCHEMA = {
  name: "create_strategy",
  description: "Create a structured trading strategy from natural language",
  input_schema: {
    type: "object",
    required: ["name", "action", "conditions"],
    properties: {
      name: { type: "string", description: "Short descriptive name" },
      action: { type: "string", enum: ["buy", "sell"] },
      conditions: {
        type: "array",
        items: {
          type: "object",
          required: ["indicator", "field", "operator"],
          properties: {
            indicator: { type: "string", enum: Object.keys(INDICATOR_FIELDS) },
            field: { type: "string" },
            operator: { type: "string", enum: [">", "<", ">=", "<=", "=="] },
            value: { type: "number" },
            crossover: { type: "boolean" },
            crossField: { type: "string" },
          },
        },
      },
    },
  },
};

router.post("/generate-strategy", async (req, res) => {
  const { prompt, apiKey } = req.body || {};
  if (!prompt) return res.status(400).json({ error: "prompt is required" });
  if (!apiKey) return res.status(400).json({ error: "apiKey is required" });

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [TOOL_SCHEMA],
      tool_choice: { type: "tool", name: "create_strategy" },
      messages: [{ role: "user", content: prompt }],
    });

    const toolBlock = response.content.find(b => b.type === "tool_use");
    if (!toolBlock) {
      return res.status(500).json({ error: "Failed to parse strategy" });
    }

    const { name, action, conditions } = toolBlock.input;
    const id = "str_" + Date.now().toString(36);

    res.json({
      strategy: { id, name, description: prompt, action, conditions },
    });
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ error: "Invalid API key" });
    if (err.status === 429) return res.status(429).json({ error: "Rate limited, try again later" });
    return res.status(500).json({ error: "Failed to generate strategy" });
  }
});

export default router;
