import { describe, expect, it } from "vitest";

import { voterHash } from "../src/lib/voter.ts";

const SECRET = "a-long-random-string";
const AGENT = "Mozilla/5.0 (X11; Linux x86_64)";

describe("voterHash", () => {
  it("is stable for the same visitor", async () => {
    const first = await voterHash({ address: "203.0.113.7", agent: AGENT }, SECRET);
    const second = await voterHash({ address: "203.0.113.7", agent: AGENT }, SECRET);

    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
  });

  it("separates visitors by address and by browser", async () => {
    const base = await voterHash({ address: "203.0.113.7", agent: AGENT }, SECRET);

    expect(await voterHash({ address: "203.0.113.8", agent: AGENT }, SECRET)).not.toBe(base);
    expect(await voterHash({ address: "203.0.113.7", agent: "curl/8.5.0" }, SECRET)).not.toBe(base);
  });

  it("keeps the address out of the stored value", async () => {
    const hash = await voterHash({ address: "203.0.113.7", agent: AGENT }, SECRET);
    expect(hash).not.toContain("203");
  });

  it("changes with the secret, so a leaked table cannot be replayed", async () => {
    expect(await voterHash({ address: "203.0.113.7", agent: AGENT }, "other-secret")).not.toBe(
      await voterHash({ address: "203.0.113.7", agent: AGENT }, SECRET),
    );
  });

  it("handles a request with neither header", async () => {
    expect(await voterHash({ address: undefined, agent: undefined }, SECRET)).toMatch(
      /^[0-9a-f]{64}$/,
    );
  });
});
