/**
 * Wishlist storage, on D1.
 *
 * Two tables: the games someone has nominated, and one row per vote. Counts
 * are derived from the vote rows rather than kept in a column, so a retracted
 * vote cannot leave a total behind that nothing agrees with. The board is a
 * few hundred rows at most, which SQLite groups without noticing.
 */

/** Rows a board request returns at most. */
const DEFAULT_LIMIT = 100;

/**
 * The board, ranked. Ties go to whichever game was nominated first, so an
 * entry cannot jump the queue by being added later with the same support.
 *
 * `voted` marks the entries this visitor already backed, which is what the
 * page uses to render their buttons as cast.
 *
 * @param {D1Database} db
 * @param {{voterHash: string, limit?: number}} options
 */
export async function listEntries(db, { voterHash, limit = DEFAULT_LIMIT }) {
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
    .all();

  return (results || []).map(toEntry);
}

/**
 * Records a vote, adding the game to the board if this is the first one.
 *
 * The two writes go in one batch so a game row can never appear without the
 * vote that justified it. `INSERT OR IGNORE` on the vote makes a repeat vote a
 * no-op rather than an error: the browser and the database can disagree about
 * what this visitor already backed, and the database wins quietly.
 *
 * @param {D1Database} db
 * @param {object} game  a normalized provider entry
 * @param {string} voterHash
 * @param {number} [now]  epoch milliseconds
 * @returns {Promise<{added: boolean}>} false when the vote was already there
 */
export async function castVote(db, game, voterHash, now = Date.now()) {
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
        game.year ?? null,
        game.url ?? null,
        game.coverUrl ?? null,
        game.developer ?? null,
        game.summary ?? null,
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
 *
 * @param {D1Database} db
 * @param {string} gameId
 * @param {string} voterHash
 * @returns {Promise<{removed: boolean}>}
 */
export async function retractVote(db, gameId, voterHash) {
  const [vote] = await db.batch([
    db.prepare(`DELETE FROM votes WHERE game_id = ?1 AND voter_hash = ?2`).bind(gameId, voterHash),
    db
      .prepare(`DELETE FROM games WHERE id = ?1 AND NOT EXISTS (SELECT 1 FROM votes WHERE game_id = ?1)`)
      .bind(gameId),
  ]);

  return { removed: changeCount(vote) > 0 };
}

/**
 * How many votes this visitor has cast since `since` (epoch seconds). The rate
 * limit reads this; it is the only thing keeping one script from filling the
 * board on its own.
 *
 * @param {D1Database} db
 * @param {string} voterHash
 * @param {number} since
 */
export async function votesSince(db, voterHash, since) {
  const row = await db
    .prepare(`SELECT COUNT(*) AS votes FROM votes WHERE voter_hash = ?1 AND created_at >= ?2`)
    .bind(voterHash, since)
    .first();

  return row?.votes ?? 0;
}

function toEntry(row) {
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

function clampLimit(limit) {
  return Math.min(Math.max(Math.trunc(limit) || 1, 1), DEFAULT_LIMIT);
}

/** D1 reports affected rows on `meta.changes`. */
function changeCount(result) {
  return result?.meta?.changes ?? 0;
}
