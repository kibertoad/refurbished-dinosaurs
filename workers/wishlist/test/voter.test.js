import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { voterHash } from "../lib/voter.js";

const SECRET = "a-long-random-string";

function requestFrom(address, agent = "Mozilla/5.0 (X11; Linux x86_64)") {
  return new Request("https://wishlist.example/votes", {
    headers: { "CF-Connecting-IP": address, "User-Agent": agent },
  });
}

describe("voterHash", () => {
  it("is stable for the same visitor", async () => {
    const first = await voterHash(requestFrom("203.0.113.7"), SECRET);
    const second = await voterHash(requestFrom("203.0.113.7"), SECRET);

    assert.equal(first, second);
    assert.match(first, /^[0-9a-f]{64}$/);
  });

  it("separates visitors by address and by browser", async () => {
    const base = await voterHash(requestFrom("203.0.113.7"), SECRET);

    assert.notEqual(await voterHash(requestFrom("203.0.113.8"), SECRET), base);
    assert.notEqual(await voterHash(requestFrom("203.0.113.7", "curl/8.5.0"), SECRET), base);
  });

  it("keeps the address out of the stored value", async () => {
    const hash = await voterHash(requestFrom("203.0.113.7"), SECRET);
    assert.ok(!hash.includes("203"), "the hash must not carry the address");
  });

  it("changes with the secret, so a leaked table cannot be replayed", async () => {
    assert.notEqual(await voterHash(requestFrom("203.0.113.7"), "other-secret"), await voterHash(requestFrom("203.0.113.7"), SECRET));
  });

  it("handles a request with no address or user agent", async () => {
    const bare = new Request("https://wishlist.example/votes");
    assert.match(await voterHash(bare, SECRET), /^[0-9a-f]{64}$/);
  });
});
