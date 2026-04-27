import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp } from "../helpers/app.js";
import { seedAll, seedDeletedUser } from "../helpers/db.js";

const app = buildTestApp();

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  await seedAll();
});

describe("POST /v1/auth/login", () => {
  it("returns 200 and a token with valid credentials", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "alice@example.com", password: "password123" }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveProperty("token");
    expect(typeof res.json().token).toBe("string");
  });

  it("returns 401 with wrong password", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "alice@example.com", password: "wrongpassword" }
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().message).toBe("Invalid credentials");
  });

  it("returns 401 when email does not exist", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "nobody@example.com", password: "password123" }
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().message).toBe("Invalid credentials");
  });

  it("returns 401 for a soft-deleted user", async () => {
    await seedDeletedUser();

    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "deleted@example.com", password: "password123" }
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().message).toBe("Invalid credentials");
  });

  it("returns 400 when email is missing", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { password: "password123" }
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      message: "Validation failed",
      details: expect.arrayContaining([
        expect.objectContaining({ field: "email" })
      ])
    });
  });

  it("returns 400 when password is missing", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "alice@example.com" }
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      message: "Validation failed",
      details: expect.arrayContaining([
        expect.objectContaining({ field: "password" })
      ])
    });
  });

  it("returns 400 with invalid email format", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "not-an-email", password: "password123" }
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      message: "Validation failed",
      details: expect.arrayContaining([
        expect.objectContaining({ field: "email" })
      ])
    });
  });
});
