import { defineApiContract, withObjectKeys } from "@toad-contracts/valibot";
import * as v from "valibot";

import {
  boardSchema,
  entryIdSchema,
  errorSchema,
  gameSchema,
  searchTermSchema,
} from "./schemas.ts";

/**
 * The wishlist API, defined once for both sides.
 *
 * The worker mounts these with `buildHonoRoute`, which derives the method,
 * path and request validation from them; the site calls them with
 * `sendByApiContract`, which validates what it sends and parses what comes
 * back against the same schemas. Neither side restates the other's shape.
 */

/**
 * Every endpoint can fail the same way — a rejected origin, a rate limit, a
 * database that is not answering — so the failure shape is declared once, as
 * status-code ranges, and the client gets a typed body for all of them.
 */
const ERROR_RESPONSES = {
  "4xx": errorSchema,
  "5xx": errorSchema,
} as const;

/** Searches the game database for wishlist-eligible games. */
export const searchGamesContract = defineApiContract({
  method: "get",
  pathResolver: () => "/search",
  requestQuerySchema: v.object({ q: searchTermSchema }),
  responsesByStatusCode: {
    200: v.object({ results: v.array(gameSchema) }),
    ...ERROR_RESPONSES,
  },
  summary: "Search the game database for PC games released before the cutoff",
});

/** The board, ranked by votes. */
export const getWishlistContract = defineApiContract({
  method: "get",
  pathResolver: () => "/wishlist",
  responsesByStatusCode: {
    200: boardSchema,
    ...ERROR_RESPONSES,
  },
  summary: "Read the wishlist, ranked, with this visitor's own votes marked",
});

/**
 * Votes for a game, putting it on the board if nobody had yet. 201 when the
 * vote was new, 200 when this visitor had already cast it.
 */
export const castVoteContract = defineApiContract({
  method: "post",
  pathResolver: () => "/votes",
  requestBodySchema: v.object({ id: entryIdSchema }),
  responsesByStatusCode: {
    200: boardSchema,
    201: boardSchema,
    ...ERROR_RESPONSES,
  },
  summary: "Vote for a game",
});

/**
 * Takes a vote back. The entry leaves the board with the last vote holding
 * it there.
 */
export const retractVoteContract = defineApiContract({
  method: "delete",
  requestPathParamsSchema: withObjectKeys(v.object({ id: entryIdSchema })),
  // Not encoded: core builds the route pattern by running this resolver with
  // `:id` as the value, and an encoded placeholder would not be a route.
  pathResolver: ({ id }) => `/votes/${id}`,
  responsesByStatusCode: {
    200: boardSchema,
    ...ERROR_RESPONSES,
  },
  summary: "Take a vote back",
});
