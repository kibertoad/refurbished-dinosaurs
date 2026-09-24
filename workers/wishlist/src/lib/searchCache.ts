/**
 * Edge cache for search results.
 *
 * Autocompletion turns keystrokes into game-database traffic, and IGDB's rate
 * limit is a handful of requests a second for the whole worker, not per
 * visitor. Cloudflare's cache absorbs the repeats: everyone typing "darklands"
 * shares one upstream call for the next ten minutes.
 *
 * The cache holds the wire shape, not the provider's, so a cache hit costs one
 * JSON parse and nothing else. Outside the Workers runtime (tests, `node`)
 * there is no `caches`, and every call simply goes upstream.
 */

import type { Game } from "@refurbished-dinosaurs/wishlist-contracts";

const TTL_SECONDS = 600;

/** Cache keys are URLs; this origin is never fetched, it just namespaces them. */
const KEY_ORIGIN = "https://wishlist.cache.invalid";

type CloudflareCaches = {
  default: {
    match(request: Request): Promise<Response | undefined>;
    put(request: Request, response: Response): Promise<void>;
  };
};

function edgeCache(): CloudflareCaches["default"] | undefined {
  return (globalThis as { caches?: CloudflareCaches }).caches?.default;
}

/**
 * @param provider which database the results came from, so switching provider
 *   cannot serve the previous one's entries
 * @param term the normalized search term
 * @param load fetches from the provider on a miss
 * @param waitUntil keeps the worker alive while the write finishes, off the
 *   response's critical path
 */
export async function cachedSearch(
  provider: string,
  term: string,
  load: () => Promise<Game[]>,
  waitUntil: (promise: Promise<unknown>) => void,
): Promise<Game[]> {
  const cache = edgeCache();
  if (!cache) return load();

  const key = new Request(
    `${KEY_ORIGIN}/search?provider=${encodeURIComponent(provider)}&q=${encodeURIComponent(term)}`,
  );

  const hit = await cache.match(key);
  if (hit) return (await hit.json()) as Game[];

  const results = await load();
  waitUntil(
    cache.put(
      key,
      Response.json(results, { headers: { "Cache-Control": `max-age=${TTL_SECONDS}` } }),
    ),
  );

  return results;
}
