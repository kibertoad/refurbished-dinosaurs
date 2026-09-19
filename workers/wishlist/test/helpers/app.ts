/**
 * Test rigging for the worker: an app with bindings attached, and a stubbed
 * game database.
 */

import { createApp } from "../../src/app.ts";
import type { WishlistBindings } from "../../src/env.ts";
import { createDatabase } from "./d1.ts";

export const ORIGIN = "https://kibertoad.github.io";

/** Games the stubbed IGDB knows about. Anything else is "not eligible". */
export const IGDB_GAMES: Record<string, Record<string, unknown>> = {
  "1": {
    id: 1,
    name: "Chaos Overlords",
    url: "https://www.igdb.com/games/chaos-overlords",
    first_release_date: 852076800, // 1997
    cover: { image_id: "co1" },
    involved_companies: [{ developer: true, company: { name: "Stick Man Games" } }],
  },
  "2": {
    id: 2,
    name: "Darklands",
    url: "https://www.igdb.com/games/darklands",
    first_release_date: 715000000, // 1992
  },
};

export function testBindings(overrides: Partial<WishlistBindings> = {}): WishlistBindings {
  return {
    WISHLIST_DB: createDatabase(),
    VOTER_SECRET: "a-long-random-string",
    ALLOWED_ORIGIN: ORIGIN,
    IGDB_CLIENT_ID: "client",
    IGDB_CLIENT_SECRET: "secret",
    ...overrides,
  };
}

/**
 * The app with its bindings bound in, shaped so it can be handed to
 * `requestByContract` (which calls `app.request(url, init)` and has no way to
 * pass bindings of its own).
 *
 * The headers a browser and Cloudflare add on the way in are not part of any
 * contract, so they are attached here. `headers` overrides them, which is how
 * a test speaks as a second visitor or from a rejected origin.
 */
export function appWithBindings(
  env: WishlistBindings,
  headers: Record<string, string> = {},
): ReturnType<typeof createApp> {
  const app = createApp();
  const defaults: Record<string, string> = {
    Origin: ORIGIN,
    "CF-Connecting-IP": "203.0.113.7",
    "User-Agent": "Mozilla/5.0",
    ...headers,
  };

  return {
    request: (input: string, init: RequestInit = {}) => {
      const merged = new Headers(defaults);
      new Headers(init.headers).forEach((value, key) => merged.set(key, value));

      return app.request(input, { ...init, headers: merged }, env);
    },
  } as unknown as ReturnType<typeof createApp>;
}

/**
 * Stands in for Twitch and IGDB. Eligibility lives in the IGDB `where` clause,
 * so "not eligible" is modelled the way IGDB models it: no rows come back.
 *
 * @returns the query bodies sent upstream, in order
 */
export function stubGameDatabase(): string[] {
  const calls: string[] = [];

  globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
    const target = String(url instanceof Request ? url.url : url);
    if (target.startsWith("https://id.twitch.tv/")) {
      return Response.json({ access_token: "token", expires_in: 3600 });
    }

    const body = String(options?.body ?? "");
    calls.push(body);

    const lookup = /where id = (\d+)/.exec(body);
    if (lookup) {
      const game = IGDB_GAMES[lookup[1] as string];
      return Response.json(game ? [game] : []);
    }

    return Response.json(Object.values(IGDB_GAMES));
  }) as unknown as typeof fetch;

  return calls;
}
