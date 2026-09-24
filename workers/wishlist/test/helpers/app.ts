/**
 * Test rigging for the worker: the app with the runtime's own bindings, and a
 * stubbed game database.
 *
 * Tests run inside workerd in the same isolate as the app, so overriding
 * `fetch` here is what the worker's provider code sees. Everything else — D1,
 * the cache, the bindings — is real.
 */

import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { env } from "cloudflare:workers";

import { createApp } from "../../src/app.ts";
import type { WishlistBindings } from "../../src/env.ts";

export const ORIGIN = "https://dinorefurb.com";

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

/**
 * A dispatcher that looks like the app to `requestByContract`, which takes a
 * Hono app and calls `app.request(url, init)` on it.
 */
export type TestApp = ReturnType<typeof createApp>;

/**
 * The app with its bindings bound in, shaped so it can be handed to
 * `requestByContract` (which calls `app.request(url, init)` and has no way to
 * pass bindings of its own).
 *
 * The headers a browser and Cloudflare add on the way in are not part of any
 * contract, so they are attached here. `headers` overrides them, which is how
 * a test speaks as a second visitor or from a rejected origin, and `bindings`
 * overrides the environment, which is how it speaks to a misconfigured worker.
 */
export function appWithBindings(
  bindings: Partial<WishlistBindings> = {},
  headers: Record<string, string> = {},
): TestApp {
  const app = createApp();
  const environment = { ...env, ...bindings } as WishlistBindings;
  const defaults: Record<string, string> = {
    Origin: ORIGIN,
    "CF-Connecting-IP": "203.0.113.7",
    "User-Agent": "Mozilla/5.0",
    ...headers,
  };

  return {
    async request(input: string, init: RequestInit = {}) {
      const merged = new Headers(defaults);
      new Headers(init.headers).forEach((value, key) => merged.set(key, value));

      // The worker defers its cache writes to waitUntil, so the context has to
      // drain before a test can look at what they wrote.
      const context = createExecutionContext();
      const response = await app.request(input, { ...init, headers: merged }, environment, context);
      await waitOnExecutionContext(context);

      return response;
    },
  } as unknown as TestApp;
}

/**
 * Stands in for Twitch and IGDB. Eligibility lives in the IGDB `where` clause,
 * so "not eligible" is modelled the way IGDB models it: no rows come back.
 *
 * @returns the query bodies sent upstream, in order
 */
export function stubGameDatabase(): string[] {
  const calls: string[] = [];

  globalThis.fetch = (async (input: RequestInfo | URL, options?: RequestInit) => {
    const target = String(input instanceof Request ? input.url : input);
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
  }) as typeof fetch;

  return calls;
}
