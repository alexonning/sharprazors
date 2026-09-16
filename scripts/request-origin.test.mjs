import test from "node:test";
import assert from "node:assert/strict";
import { hasSameOrigin } from "../lib/request-origin.ts";

test("accepts forwarded HTTPS origin", () => {
  const request = new Request("http://127.0.0.1:10000/api/admin", {
    method: "POST",
    headers: {
      origin: "https://sharprazors.onrender.com",
      host: "127.0.0.1:10000",
      "x-forwarded-host": "sharprazors.onrender.com",
      "x-forwarded-proto": "https",
    },
  });
  assert.equal(hasSameOrigin(request), true);
});

test("rejects forged or malformed origins", () => {
  assert.equal(hasSameOrigin(new Request("http://127.0.0.1/api", {
    method: "POST", headers: { origin: "https://attacker.invalid", host: "127.0.0.1" },
  })), false);
  assert.equal(hasSameOrigin(new Request("http://127.0.0.1/api", {
    method: "POST", headers: { origin: "not an origin" },
  })), false);
});

test("allows missing Origin headers", () => {
  assert.equal(hasSameOrigin(new Request("https://example.test/api", { method: "POST" })), true);
});
