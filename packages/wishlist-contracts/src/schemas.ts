import * as v from "valibot";

/**
 * What the wishlist accepts and what it sends back.
 *
 * These schemas are the shared vocabulary: the worker validates requests
 * against them and the site validates responses against them, so a field that
 * changes shape here breaks both sides at once rather than one of them
 * quietly.
 */

/** Releases have to predate this year to be wishlist-eligible. */
export const RELEASE_CUTOFF_YEAR = 2010;

/** Same cutoff as a Unix timestamp, which is what IGDB filters on. */
export const RELEASE_CUTOFF_UNIX = Date.UTC(RELEASE_CUTOFF_YEAR, 0, 1) / 1000;

/** Shortest and longest search term worth a round trip. */
export const MIN_SEARCH_LENGTH = 2;
export const MAX_SEARCH_LENGTH = 80;

/** Longest summary an entry carries; a card only has room for a couple of lines. */
export const MAX_SUMMARY_LENGTH = 280;

/**
 * `<provider>:<external id>`. The id is opaque to the site, and the worker
 * only accepts one from the provider it is currently configured with.
 */
export const entryIdSchema = v.pipe(
  v.string(),
  v.regex(/^[a-z]+:[A-Za-z0-9_-]{1,64}$/, "not a wishlist entry id"),
);

export const searchTermSchema = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(MIN_SEARCH_LENGTH),
  v.maxLength(MAX_SEARCH_LENGTH),
);

/** A game as the site displays it, whether from search or from the board. */
export const gameSchema = v.object({
  id: entryIdSchema,
  title: v.string(),
  /** Null only for data the provider left blank; eligibility is checked on the year. */
  year: v.nullable(v.pipe(v.number(), v.integer())),
  /** The game's page in the database it came from. */
  url: v.nullable(v.string()),
  coverUrl: v.nullable(v.string()),
  developer: v.nullable(v.string()),
  summary: v.nullable(v.string()),
});

/** A game on the board: the same fields, plus where it stands. */
export const wishlistEntrySchema = v.object({
  ...gameSchema.entries,
  votes: v.pipe(v.number(), v.integer()),
  /** True when the visitor making the request is one of the voters. */
  voted: v.boolean(),
  /** When the first vote landed, epoch seconds. Breaks ties in the ranking. */
  addedAt: v.pipe(v.number(), v.integer()),
});

export const boardSchema = v.object({
  entries: v.array(wishlistEntrySchema),
  total: v.pipe(v.number(), v.integer()),
});

/** Every failure answers with this, whatever the status code. */
export const errorSchema = v.object({ error: v.string() });

export type Game = v.InferOutput<typeof gameSchema>;
export type WishlistEntry = v.InferOutput<typeof wishlistEntrySchema>;
export type Board = v.InferOutput<typeof boardSchema>;
export type WishlistError = v.InferOutput<typeof errorSchema>;
