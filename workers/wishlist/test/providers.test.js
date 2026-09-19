import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HttpError } from "../lib/http.js";
import { RELEASE_CUTOFF_UNIX } from "../lib/catalog.js";
import { lookupBody, searchBody, toEntry as igdbEntry } from "../lib/providers/igdb.js";
import { isEligible, toEntry as rawgEntry } from "../lib/providers/rawg.js";
import { selectProvider } from "../lib/providers/index.js";

const IGDB_ENV = { IGDB_CLIENT_ID: "id", IGDB_CLIENT_SECRET: "secret" };

describe("igdb queries", () => {
  it("filters searches to PC releases before the cutoff", () => {
    const body = searchBody("chaos overlords", 8);
    assert.match(body, /platforms = \(6,13\)/);
    assert.match(body, new RegExp(`first_release_date < ${RELEASE_CUTOFF_UNIX}`));
    assert.match(body, /limit 8;/);
  });

  it("strips quotes and backslashes out of the term", () => {
    const body = searchBody('sid meier\\"s "pirates"', 8);
    assert.ok(body.startsWith('search "sid meier  s  pirates";'), body);
  });

  it("clamps the limit", () => {
    assert.match(searchBody("doom", 500), /limit 50;/);
    assert.match(searchBody("doom", 0), /limit 1;/);
  });

  it("looks up by numeric id only, with the same eligibility filter", () => {
    assert.match(lookupBody("1234"), /where id = 1234 & platforms = \(6,13\)/);
    for (const bad of ["1234; drop", "abc", "-1", "0", ""]) {
      assert.throws(() => lookupBody(bad), HttpError, `expected ${bad} to be rejected`);
    }
  });
});

describe("igdb entries", () => {
  it("normalizes a game", () => {
    const entry = igdbEntry({
      id: 1234,
      name: "Chaos Overlords",
      url: "https://www.igdb.com/games/chaos-overlords",
      first_release_date: 852076800, // 1997-01-01
      summary: "Gang   warfare\non a cyberpunk city grid.",
      cover: { image_id: "co1abc" },
      involved_companies: [
        { developer: false, company: { name: "New World Computing" } },
        { developer: true, company: { name: "Stick Man Games" } },
      ],
    });

    assert.deepEqual(entry, {
      id: "igdb:1234",
      provider: "igdb",
      externalId: "1234",
      title: "Chaos Overlords",
      year: 1997,
      url: "https://www.igdb.com/games/chaos-overlords",
      coverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_small/co1abc.jpg",
      developer: "Stick Man Games",
      summary: "Gang warfare on a cyberpunk city grid.",
    });
  });

  it("copes with a game that is missing everything optional", () => {
    const entry = igdbEntry({ id: 7, name: "Untitled" });
    assert.equal(entry.year, null);
    assert.equal(entry.coverUrl, null);
    assert.equal(entry.developer, null);
    assert.equal(entry.summary, null);
    assert.equal(entry.url, "https://www.igdb.com/games/7");
  });
});

describe("rawg entries", () => {
  const game = {
    id: 42,
    slug: "conqueror-ad-1086",
    name: "Conqueror: A.D. 1086",
    released: "1995-06-01",
    background_image: "https://media.rawg.io/cover.jpg",
    developers: [{ name: "Sierra" }],
    description_raw: "Norman England, in real time.",
    platforms: [{ platform: { id: 4, name: "PC" } }],
  };

  it("normalizes a game", () => {
    assert.deepEqual(rawgEntry(game), {
      id: "rawg:42",
      provider: "rawg",
      externalId: "42",
      title: "Conqueror: A.D. 1086",
      year: 1995,
      url: "https://rawg.io/games/conqueror-ad-1086",
      coverUrl: "https://media.rawg.io/cover.jpg",
      developer: "Sierra",
      summary: "Norman England, in real time.",
    });
  });

  it("accepts pre-cutoff PC releases only", () => {
    assert.equal(isEligible(game), true);
    assert.equal(isEligible({ ...game, released: "2015-01-01" }), false);
    assert.equal(isEligible({ ...game, released: null }), false);
    assert.equal(isEligible({ ...game, platforms: [{ platform: { id: 18, name: "PlayStation 2" } }] }), false);
    assert.equal(isEligible({ ...game, platforms: [] }), false);
  });
});

describe("selectProvider", () => {
  it("defaults to IGDB", () => {
    assert.equal(selectProvider(IGDB_ENV).name, "igdb");
  });

  it("honours the configured provider", () => {
    assert.equal(selectProvider({ GAME_DB_PROVIDER: "rawg", RAWG_API_KEY: "key" }).name, "rawg");
  });

  it("refuses an unknown provider or missing credentials", () => {
    assert.throws(() => selectProvider({ GAME_DB_PROVIDER: "mobygames" }), { status: 500 });
    assert.throws(() => selectProvider({ GAME_DB_PROVIDER: "igdb" }), { status: 500 });
  });
});
