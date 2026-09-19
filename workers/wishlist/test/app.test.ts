/**
 * The worker as the site sees it: every request goes through a contract, so a
 * route that drifts from its contract fails here rather than in a browser.
 */

import {
  castVoteContract,
  getWishlistContract,
  retractVoteContract,
  searchGamesContract,
} from "@refurbished-dinosaurs/wishlist-contracts";
import { requestByContract } from "@toad-contracts/hono";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { WishlistBindings } from "../src/env.ts";
import { ORIGIN, appWithBindings, stubGameDatabase, testBindings } from "./helpers/app.ts";

const realFetch = globalThis.fetch;

describe("the wishlist worker", () => {
  let env: WishlistBindings;
  let app: ReturnType<typeof appWithBindings>;

  beforeEach(() => {
    stubGameDatabase();
    env = testBindings();
    app = appWithBindings(env);
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  /** Casts a vote and returns the board it answered with. */
  async function vote(id: string, as = app) {
    const response = await requestByContract(as, castVoteContract, { body: { id } });
    return { status: response.status, body: await response.json() };
  }

  /** The same worker and database, seen from a different address. */
  function asVisitor(address: string) {
    return appWithBindings(env, { "CF-Connecting-IP": address });
  }

  it("answers a preflight with the allowed origin", async () => {
    const response = await app.request("/votes", { method: "OPTIONS" });

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(ORIGIN);
  });

  it("turns away another origin", async () => {
    const response = await requestByContract(
      appWithBindings(env, { Origin: "https://evil.example" }),
      getWishlistContract,
      {},
    );

    expect(response.status).toBe(403);
  });

  it("searches the database", async () => {
    const response = await requestByContract(app, searchGamesContract, {
      queryParams: { q: "chaos" },
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { results: { id: string; title: string }[] };
    expect(body.results).toHaveLength(2);
    expect(body.results[0]).toMatchObject({ id: "igdb:1", title: "Chaos Overlords", year: 1997 });
  });

  it("does not leak the provider's bookkeeping into search results", async () => {
    const response = await requestByContract(app, searchGamesContract, {
      queryParams: { q: "chaos" },
    });

    const body = (await response.json()) as { results: Record<string, unknown>[] };
    expect(Object.keys(body.results[0] ?? {}).sort()).toEqual([
      "coverUrl",
      "developer",
      "id",
      "summary",
      "title",
      "url",
      "year",
    ]);
  });

  it("refuses a search term too short to be worth a round trip", async () => {
    const calls = stubGameDatabase();
    const response = await app.request("/search?q=c");

    expect(response.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it("starts empty", async () => {
    const response = await requestByContract(app, getWishlistContract, {});

    expect(await response.json()).toEqual({ entries: [], total: 0 });
  });

  it("votes, and answers with the board the vote produced", async () => {
    const { status, body } = await vote("igdb:1");

    expect(status).toBe(201);
    expect((body as { entries: unknown[] }).entries[0]).toMatchObject({
      id: "igdb:1",
      title: "Chaos Overlords",
      year: 1997,
      developer: "Stick Man Games",
      votes: 1,
      voted: true,
    });
  });

  it("takes the same vote twice as one, and says so with a 200", async () => {
    expect((await vote("igdb:1")).status).toBe(201);

    const { status, body } = await vote("igdb:1");
    expect(status).toBe(200);
    expect((body as { entries: { votes: number }[] }).entries[0]?.votes).toBe(1);
  });

  it("counts a second visitor separately", async () => {
    await vote("igdb:1");
    const { body } = await vote("igdb:1", asVisitor("198.51.100.4"));

    expect((body as { entries: { votes: number }[] }).entries[0]?.votes).toBe(2);
  });

  it("marks only the voter's own entries as voted", async () => {
    await vote("igdb:1");

    const response = await requestByContract(asVisitor("198.51.100.4"), getWishlistContract, {});
    const body = (await response.json()) as { entries: { votes: number; voted: boolean }[] };

    expect(body.entries[0]?.votes).toBe(1);
    expect(body.entries[0]?.voted).toBe(false);
  });

  it("retracts a vote, and the entry with it", async () => {
    await vote("igdb:1");

    const response = await requestByContract(app, retractVoteContract, {
      pathParams: { id: "igdb:1" },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ entries: [], total: 0 });
  });

  it("refuses a game the database does not hand back as eligible", async () => {
    const { status, body } = await vote("igdb:999");

    expect(status).toBe(400);
    expect((body as { error: string }).error).toMatch(/before 2010/);
  });

  it("refuses ids it cannot trust", async () => {
    for (const id of ["1", "igdb:1 OR 1=1", "", null, { id: 1 }]) {
      const response = await app.request("/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      expect(response.status, JSON.stringify(id)).toBe(400);
    }
  });

  it("refuses an id minted by a provider it is not configured with", async () => {
    const { status } = await vote("rawg:1");
    expect(status).toBe(400);
  });

  it("refuses a body that is not JSON", async () => {
    const response = await app.request("/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });

    expect(response.status).toBe(400);
  });

  it("caps how much one voter can do in a day", async () => {
    env.MAX_VOTES_PER_DAY = "1";
    await vote("igdb:1");

    const { status, body } = await vote("igdb:2");
    expect(status).toBe(429);
    expect((body as { error: string }).error).toMatch(/lot of votes/);
  });

  it("says so when it is not configured", async () => {
    delete env.VOTER_SECRET;
    const response = await requestByContract(app, getWishlistContract, {});

    expect(response.status).toBe(500);
    expect(((await response.json()) as { error: string }).error).toMatch(/misconfigured/);
  });

  it("404s an unknown path", async () => {
    const response = await app.request("/nope");

    expect(response.status).toBe(404);
  });
});
