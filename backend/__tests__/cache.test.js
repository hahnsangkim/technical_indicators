import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../server.js";

describe("parseRows caching", () => {
  it("returns identical data on repeated calls for same ticker", async () => {
    const res1 = await request(app).get("/api/eco?ticker=SPY");
    const res2 = await request(app).get("/api/eco?ticker=SPY");
    expect(res1.body.data).toEqual(res2.body.data);
  });
});
