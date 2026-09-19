/**
 * Game database providers.
 *
 * A provider turns a search term into wishlist entries and reads a single game
 * back by id. Everything else in the worker only sees that interface, so
 * swapping databases is a config change:
 *
 *   search(term, env, limit) -> Entry[]
 *   lookup(externalId, env)  -> Entry | null   (null = not wishlist-eligible)
 *
 * An Entry is `{ id, provider, externalId, title, year, url, coverUrl,
 * developer, summary }`, with `id` as `<provider>:<external id>`.
 */

import { HttpError } from "../http.js";
import { igdb } from "./igdb.js";
import { rawg } from "./rawg.js";

const PROVIDERS = { [igdb.name]: igdb, [rawg.name]: rawg };

export const DEFAULT_PROVIDER = igdb.name;

/**
 * @param {Record<string, string>} env
 * @returns {typeof igdb}
 */
export function selectProvider(env) {
  const name = (env.GAME_DB_PROVIDER || DEFAULT_PROVIDER).toLowerCase();
  const provider = PROVIDERS[name];

  if (!provider) {
    throw new HttpError(500, "the wishlist is misconfigured", `unknown provider: ${name}`);
  }
  if (!provider.configured(env)) {
    throw new HttpError(500, "the wishlist is misconfigured", `${name} credentials are missing`);
  }

  return provider;
}
