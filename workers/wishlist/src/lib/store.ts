/**
 * Wishlist storage, on D1.
 *
 * Two tables: the games someone has nominated, and one row per vote. Counts
 * are derived from the vote rows rather than kept in a column, so a retracted
 * vote cannot leave a total behind that nothing agrees with. The board is a
 * few hundred rows at most, which SQLite groups without noticing.
 */

import type { D1Database, D1Result } from "@cloudflare/workers-types";
import type { WishlistEntry } from "@refurbished-dinosaurs/wishlist-contracts";

import type { ProviderGame } from "./providers/index.ts";

/** Rows a board request returns at most. */
const DEFAULT_LIMIT = 100;

type EntryRow = {
  id: string;
  title: string;
  release_year: number | null;
  url: string | null;
  cover_url: string | null;
  developer: string | null;
  summary: string | null;
  votes: number;
  voted: number;
  added_at: number;
};

/**
 * The board, ranked. Ties go to whichever game was nominated first, so an
 * entry cannot jump the queue by being added later with the same support.
 *
 * `voted` marks the entries this visitor already backed, which is what the
 * page uses to render their buttons as cast.
 */
export async function listEntries(
  db: D1Database,
  { voterHash, limit = DEFAULT_LIMIT }: { voterHash: string; limit?: number },
): Promise<WishlistEntry[]> {
  const { results } = await db
    .prepare(
      `SELECT g.id,
              g.title,
              g.release_year,
              g.url,
              g.cover_url,
              g.developer,
              g.summary,
              COUNT(v.voter_hash) AS votes,
              MAX(CASE WHEN v.voter_hash = ?1 THEN 1 ELSE 0 END) AS voted,
              MIN(v.created_at) AS added_at
         FROM games g
         JOIN votes v ON v.game_id = g.id
        GROUP BY g.id
        ORDER BY votes DESC, added_at ASC
        LIMIT ?2`,
    )
    .bind(voterHash, clampLimit(limit))
    .all<EntryRow>();

  return (results ?? []).map(toEntry);
}

/**
 * Records a vote, adding the game to the board if this is the first one.
 *
 * The two writes go in one batch so a game row can never appear without the
 * vote that justified it. `INSERT OR IGNORE` on the vote makes a repeat vote a
 * no-op rather than an error: the browser and the database can disagree about
 * what this visitor already backed, and the database wins quietly.
 *
 * @returns added false when the vote was already there
 */
export async function castVote(
  db: D1Database,
  game: ProviderGame,
  voterHash: string,
  now: number = Date.now(),
): Promise<{ added: boolean }> {
  const timestamp = Math.floor(now / 1000);

  const [, vote] = await db.batch([
    db
      .prepare(
        `INSERT INTO games (id, provider, external_id, title, release_year, url, cover_url, developer, summary, created_at)
              VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
         ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              release_year = excluded.release_year,
              url = excluded.url,
              cover_url = excluded.cover_url,
              developer = excluded.developer,
              summary = excluded.summary`,
      )
      .bind(
        game.id,
        game.provider,
        game.externalId,
        game.title,
        game.year,
        game.url,
        game.coverUrl,
        game.developer,
        game.summary,
        timestamp,
      ),
    db
      .prepare(`INSERT OR IGNORE INTO votes (game_id, voter_hash, created_at) VALUES (?1, ?2, ?3)`)
      .bind(game.id, voterHash, timestamp),
  ]);

  return { added: changeCount(vote) > 0 };
}

/**
 * Retracts a vote, and drops the game with it when that was the last one
 * holding it on the board.
 */
export async function retractVote(
  db: D1Database,
  gameId: string,
  voterHash: string,
): Promise<{ removed: boolean }> {
  const [vote] = await db.batch([
    db.prepare(`DELETE FROM votes WHERE game_id = ?1 AND voter_hash = ?2`).bind(gameId, voterHash),
    db
      .prepare(
        `DELETE FROM games WHERE id = ?1 AND NOT EXISTS (SELECT 1 FROM votes WHERE game_id = ?1)`,
      )
      .bind(gameId),
  ]);

  return { removed: changeCount(vote) > 0 };
}

/**
 * How many votes this visitor has cast since `since` (epoch seconds). The rate
 * limit reads this; it is the only thing keeping one script from filling the
 * board on its own.
 */
export async function votesSince(
  db: D1Database,
  voterHash: string,
  since: number,
): Promise<number> {
  const row = await db
    .prepare(`SELECT COUNT(*) AS votes FROM votes WHERE voter_hash = ?1 AND created_at >= ?2`)
    .bind(voterHash, since)
    .first<{ votes: number }>();

  return row?.votes ?? 0;
}

function toEntry(row: EntryRow): WishlistEntry {
  return {
    id: row.id,
    title: row.title,
    year: row.release_year,
    url: row.url,
    coverUrl: row.cover_url,
    developer: row.developer,
    summary: row.summary,
    votes: row.votes,
    voted: Boolean(row.voted),
    addedAt: row.added_at,
  };
}

function clampLimit(limit: number): number {
  return Math.min(Math.max(Math.trunc(limit) || 1, 1), DEFAULT_LIMIT);
}

/** D1 reports affected rows on `meta.changes`. */
function changeCount(result: D1Result | undefined): number {
  return result?.meta?.changes ?? 0;
}
