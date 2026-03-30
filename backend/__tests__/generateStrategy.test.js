import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../server.js";

describe("POST /api/generate-strategy", () => {
  it("returns 400 when prompt is missing", async () => {
    const res = await request(app)
      .post("/api/generate-strategy")
      .send({ apiKey: "sk-ant-test" });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("prompt");
  });

  it("returns 400 when apiKey is missing", async () => {
    const res = await request(app)
      .post("/api/generate-strategy")
      .send({ prompt: "Buy when RSI < 30" });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("apiKey");
  });
});
