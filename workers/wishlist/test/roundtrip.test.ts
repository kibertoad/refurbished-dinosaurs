/**
 * The site's client against the worker's app, over the same contracts.
 *
 * `sendByApiContract` validates what it sends and parses every response
 * against the contract, so this fails if either side drifts: a route that
 * answers with a shape the schema does not describe, or a client call that
 * builds a request the route does not accept. It is the closest thing to
 * running the page against the worker without a browser or a network.
 */

import {
  castVoteContract,
  getWishlistContract,
  retractVoteContract,
  searchGamesContract,
} from "@refurbished-dinosaurs/wishlist-contracts";
import { sendByApiContract } from "@toad-contracts/frontend-http-client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import wretch from "wretch";

import { ORIGIN, appWithBindings, stubGameDatabase, testBindings } from "./helpers/app.ts";

const realFetch = globalThis.fetch;

describe("the contract round trip", () => {
  let client: ReturnType<typeof wretch>;

  beforeEach(() => {
    stubGameDatabase();
    const app = appWithBindings(testBindings());

    // The browser would reach the worker over the network and set Origin
    // itself; here fetch goes straight into the app.
    const upstream = globalThis.fetch;
    globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
      const target = String(input instanceof Request ? input.url : input);
      if (!target.startsWith("https://wishlist.test")) return upstream(input as never, init);

      return app.request(new URL(target).pathname + new URL(target).search, init);
    }) as unknown as typeof fetch;

    client = wretch("https://wishlist.test").headers({
      Origin: ORIGIN,
      "CF-Connecting-IP": "203.0.113.7",
      "User-Agent": "Mozilla/5.0",
    });
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("reads an empty board", async () => {
    const { result, error } = await sendByApiContract(client, getWishlistContract, {});

    expect(error).toBeUndefined();
    expect(result?.statusCode).toBe(200);
    expect(result?.body).toEqual({ entries: [], total: 0 });
  });

  it("searches, and parses the games that come back", async () => {
    const { result } = await sendByApiContract(client, searchGamesContract, {
      queryParams: { q: "chaos" },
    });

    expect(result?.body.results.map((game) => game.title)).toEqual([
      "Chaos Overlords",
      "Darklands",
    ]);
  });

  it("votes and sees the board it produced", async () => {
    const { result } = await sendByApiContract(client, castVoteContract, {
      body: { id: "igdb:1" },
    });

    expect(result?.statusCode).toBe(201);
    expect(result?.body.entries[0]).toMatchObject({ id: "igdb:1", votes: 1, voted: true });
  });

  it("answers a repeat vote with 200 rather than a second vote", async () => {
    await sendByApiContract(client, castVoteContract, { body: { id: "igdb:1" } });
    const { result } = await sendByApiContract(client, castVoteContract, {
      body: { id: "igdb:1" },
    });

    expect(result?.statusCode).toBe(200);
    expect(result?.body.entries[0]?.votes).toBe(1);
  });

  it("retracts a vote by id", async () => {
    await sendByApiContract(client, castVoteContract, { body: { id: "igdb:1" } });

    const { result } = await sendByApiContract(client, retractVoteContract, {
      pathParams: { id: "igdb:1" },
    });

    expect(result?.body).toEqual({ entries: [], total: 0 });
  });

  it("hands a declared failure back as a typed error, message included", async () => {
    const { result, error } = await sendByApiContract(client, castVoteContract, {
      body: { id: "igdb:999" },
    });

    expect(result).toBeUndefined();
    expect(error?.statusCode).toBe(400);
    expect(error?.body).toMatchObject({ error: expect.stringMatching(/before 2010/) as string });
  });

  it("refuses to send a request the contract rejects", async () => {
    await expect(
      sendByApiContract(client, castVoteContract, { body: { id: "not an id" } }),
    ).rejects.toThrow();
  });
});
