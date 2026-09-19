import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isEligibleYear, normalizeQuery, parseEntryId, truncate } from "../lib/catalog.js";

describe("parseEntryId", () => {
  it("splits an id belonging to the configured provider", () => {
    assert.deepEqual(parseEntryId("igdb:1234", "igdb"), { provider: "igdb", externalId: "1234" });
  });

  it("rejects ids from another provider", () => {
    assert.equal(parseEntryId("rawg:1234", "igdb"), null);
  });

  it("rejects malformed and non-string ids", () => {
    for (const value of ["", "igdb:", ":1234", "igdb:12 34", "igdb:1234;DROP", 1234, null, undefined, {}]) {
      assert.equal(parseEntryId(value, "igdb"), null, `expected ${JSON.stringify(value)} to be rejected`);
    }
  });
});

describe("isEligibleYear", () => {
  it("takes releases before the cutoff", () => {
    assert.equal(isEligibleYear(1996), true);
    assert.equal(isEligibleYear(2009), true);
  });

  it("rejects the cutoff year, later years and unknown dates", () => {
    assert.equal(isEligibleYear(2010), false);
    assert.equal(isEligibleYear(2024), false);
    assert.equal(isEligibleYear(null), false);
    assert.equal(isEligibleYear(undefined), false);
  });
});

describe("normalizeQuery", () => {
  it("trims and caps the term", () => {
    assert.equal(normalizeQuery("  chaos overlords  "), "chaos overlords");
    assert.equal(normalizeQuery("x".repeat(200)).length, 80);
  });

  it("returns an empty string for anything that is not a string", () => {
    assert.equal(normalizeQuery(null), "");
    assert.equal(normalizeQuery(42), "");
  });
});

describe("truncate", () => {
  it("collapses whitespace and leaves short text alone", () => {
    assert.equal(truncate("a   b\nc"), "a b c");
  });

  it("cuts long text to the limit, ellipsis included", () => {
    const cut = truncate("word ".repeat(200));
    assert.equal(cut.length, 280);
    assert.ok(cut.endsWith("…"));
  });

  it("passes empty input through as null", () => {
    assert.equal(truncate(""), null);
    assert.equal(truncate(null), null);
  });
});
