import type { D1Database } from "@cloudflare/workers-types";

/**
 * Everything the worker is wired to. Bindings come from wrangler.toml
 * (`[vars]`, `[[d1_databases]]`) and `wrangler secret put`.
 */
export type WishlistBindings = {
  /** D1 database holding the board; schema in schema.sql. */
  WISHLIST_DB: D1Database;
  /** Keys the voter hash. Any long random string. */
  VOTER_SECRET?: string;
  /** "igdb" (default) or "rawg". */
  GAME_DB_PROVIDER?: string;
  IGDB_CLIENT_ID?: string;
  IGDB_CLIENT_SECRET?: string;
  RAWG_API_KEY?: string;
  /** The one origin allowed to call this. */
  ALLOWED_ORIGIN?: string;
  /** Entries a board read returns, and votes one voter gets per day. */
  BOARD_LIMIT?: string;
  MAX_VOTES_PER_DAY?: string;
};

export type AppEnv = { Bindings: WishlistBindings };
