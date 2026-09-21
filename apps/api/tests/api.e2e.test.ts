import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

describe("API E2E", () => {
  const app = createApp();

  it("GET /health returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status");
  });

  it("GET /metrics returns prometheus data", async () => {
    const res = await request(app).get("/metrics");
    expect(res.status).toBe(200);
    expect(res.text).toContain("http_request_duration_seconds");
  });

  it("GET /search requires auth", async () => {
    const res = await request(app).get("/search?q=test");
    expect(res.status).toBe(401);
  });

  it("GET /docs/openapi.json returns spec", async () => {
    const res = await request(app).get("/docs/openapi.json");
    expect(res.status).toBe(200);
    expect(res.body.info.title).toBe("CultureMatch API");
  });

  it("POST /auth/magic/start accepts email", async () => {
    const res = await request(app)
      .post("/auth/magic/start")
      .send({ email: "test@example.com" });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
