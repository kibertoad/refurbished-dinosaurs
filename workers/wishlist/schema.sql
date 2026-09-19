-- Wishlist schema. Apply with:
--   wrangler d1 execute refurbished-dinosaurs-wishlist --file=schema.sql --remote

-- One row per nominated game, filled from the game database at vote time so
-- the board does not depend on whatever the browser sent.
CREATE TABLE IF NOT EXISTS games (
  id           TEXT PRIMARY KEY,   -- "<provider>:<external id>"
  provider     TEXT NOT NULL,
  external_id  TEXT NOT NULL,
  title        TEXT NOT NULL,
  release_year INTEGER,
  url          TEXT,               -- the game's page in the database
  cover_url    TEXT,
  developer    TEXT,
  summary      TEXT,
  created_at   INTEGER NOT NULL    -- epoch seconds
);

-- One row per vote. The primary key is the deduplication: a voter hash can
-- back a given game exactly once. No addresses are stored, only the keyed
-- hash described in lib/voter.js.
CREATE TABLE IF NOT EXISTS votes (
  game_id    TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  voter_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (game_id, voter_hash)
);

-- Covers the rate-limit lookup ("how much has this voter done lately").
CREATE INDEX IF NOT EXISTS votes_by_voter ON votes (voter_hash, created_at);
