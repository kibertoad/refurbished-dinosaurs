import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import worker from "../worker.js";
import { createDatabase } from "./helpers/d1.js";

const ORIGIN = "https://kibertoad.github.io";

const GAMES = {
  1: {
    id: 1,
    name: "Chaos Overlords",
    url: "https://www.igdb.com/games/chaos-overlords",
    first_release_date: 852076800,
    cover: { image_id: "co1" },
    involved_companies: [{ developer: true, company: { name: "Stick Man Games" } }],
  },
  2: {
    id: 2,
    name: "Darklands",
    url: "https://www.igdb.com/games/darklands",
    first_release_date: 715000000,
  },
};

const realFetch = globalThis.fetch;

/**
 * Stands in for Twitch and IGDB. Eligibility lives in the IGDB `where` clause,
 * so "not eligible" is modelled the way IGDB models it: no rows come back.
 */
function stubGameDatabase({ calls = [] } = {}) {
  globalThis.fetch = async (url, options) => {
    const target = String(url);
    if (target.startsWith("https://id.twitch.tv/")) {
      return Response.json({ access_token: "token", expires_in: 3600 });
    }

    const body = options.body;
    calls.push(body);

    const lookup = /where id = (\d+)/.exec(body);
    if (lookup) {
      const game = GAMES[lookup[1]];
      return Response.json(game ? [game] : []);
    }
    return Response.json(Object.values(GAMES));
  };

  return calls;
}

function request(path, { method = "GET", body, origin = ORIGIN, address = "203.0.113.7" } = {}) {
  return new Request(`https://wishlist.example${path}`, {
    method,
    headers: {
      Origin: origin,
      "CF-Connecting-IP": address,
      "User-Agent": "Mozilla/5.0",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

describe("the wishlist worker", () => {
  let env;

  beforeEach(() => {
    stubGameDatabase();
    env = {
      WISHLIST_DB: createDatabase(),
      VOTER_SECRET: "a-long-random-string",
      ALLOWED_ORIGIN: ORIGIN,
      IGDB_CLIENT_ID: "client",
      IGDB_CLIENT_SECRET: "secret",
    };
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  async function send(path, options) {
    const response = await worker.fetch(request(path, options), env);
    return { response, body: await response.json().catch(() => null) };
  }

  it("answers a preflight with the allowed origin", async () => {
    const response = await worker.fetch(request("/votes", { method: "OPTIONS" }), env);

    assert.equal(response.status, 204);
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), ORIGIN);
  });

  it("turns away another origin", async () => {
    const { response } = await send("/wishlist", { origin: "https://evil.example" });
    assert.equal(response.status, 403);
  });

  it("searches the database", async () => {
    const { response, body } = await send("/search?q=chaos");

    assert.equal(response.status, 200);
    assert.equal(body.results.length, 2);
    assert.partialDeepStrictEqual(body.results[0], { id: "igdb:1", title: "Chaos Overlords", year: 1997 });
  });

  it("does not bother the database with a one-letter term", async () => {
    const calls = stubGameDatabase();
    const { body } = await send("/search?q=c");

    assert.deepEqual(body.results, []);
    assert.equal(calls.length, 0);
  });

  it("starts empty", async () => {
    const { body } = await send("/wishlist");
    assert.deepEqual(body, { entries: [], total: 0 });
  });

  it("votes, and answers with the board the vote produced", async () => {
    const { response, body } = await send("/votes", { method: "POST", body: { id: "igdb:1" } });

    assert.equal(response.status, 201);
    assert.equal(body.added, true);
    assert.partialDeepStrictEqual(body.entries[0], {
      id: "igdb:1",
      title: "Chaos Overlords",
      year: 1997,
      developer: "Stick Man Games",
      votes: 1,
      voted: true,
    });
  });

  it("takes the same vote twice as one", async () => {
    await send("/votes", { method: "POST", body: { id: "igdb:1" } });
    const { response, body } = await send("/votes", { method: "POST", body: { id: "igdb:1" } });

    assert.equal(response.status, 200);
    assert.equal(body.added, false);
    assert.equal(body.entries[0].votes, 1);
  });

  it("counts a second visitor separately", async () => {
    await send("/votes", { method: "POST", body: { id: "igdb:1" } });
    const { body } = await send("/votes", { method: "POST", body: { id: "igdb:1" }, address: "198.51.100.4" });

    assert.equal(body.entries[0].votes, 2);
  });

  it("marks only the voter's own entries as voted", async () => {
    await send("/votes", { method: "POST", body: { id: "igdb:1" } });
    const { body } = await send("/wishlist", { address: "198.51.100.4" });

    assert.equal(body.entries[0].votes, 1);
    assert.equal(body.entries[0].voted, false);
  });

  it("retracts a vote, and the entry with it", async () => {
    await send("/votes", { method: "POST", body: { id: "igdb:1" } });
    const { response, body } = await send("/votes", { method: "DELETE", body: { id: "igdb:1" } });

    assert.equal(response.status, 200);
    assert.equal(body.removed, true);
    assert.deepEqual(body.entries, []);
  });

  it("refuses a game the database does not hand back as eligible", async () => {
    const { response, body } = await send("/votes", { method: "POST", body: { id: "igdb:999" } });

    assert.equal(response.status, 400);
    assert.match(body.error, /before 2010/);
  });

  it("refuses ids it cannot trust", async () => {
    for (const id of ["1", "rawg:1", "igdb:1 OR 1=1", null, { id: 1 }]) {
      const { response } = await send("/votes", { method: "POST", body: { id } });
      assert.equal(response.status, 400, `expected ${JSON.stringify(id)} to be refused`);
    }
  });

  it("refuses a body that is not JSON", async () => {
    const response = await worker.fetch(
      new Request("https://wishlist.example/votes", {
        method: "POST",
        headers: { Origin: ORIGIN, "Content-Type": "application/json" },
        body: "not json",
      }),
      env,
    );

    assert.equal(response.status, 400);
  });

  it("caps how much one voter can do in a day", async () => {
    env.MAX_VOTES_PER_DAY = "1";
    await send("/votes", { method: "POST", body: { id: "igdb:1" } });

    const { response, body } = await send("/votes", { method: "POST", body: { id: "igdb:2" } });
    assert.equal(response.status, 429);
    assert.match(body.error, /lot of votes/);
  });

  it("says so when it is not configured", async () => {
    delete env.VOTER_SECRET;
    const { response, body } = await send("/wishlist");

    assert.equal(response.status, 500);
    assert.match(body.error, /misconfigured/);
  });

  it("404s an unknown path", async () => {
    const { response } = await send("/nope");
    assert.equal(response.status, 404);
  });
});
