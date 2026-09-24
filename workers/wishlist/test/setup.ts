import { applyD1Migrations, reset } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { beforeEach } from "vitest";

/**
 * Every test starts from an empty database with the schema the deployment
 * runs: `reset()` wipes what the bindings hold, and the migrations go back on
 * top of it.
 */
beforeEach(async () => {
  await reset();
  await applyD1Migrations(env.WISHLIST_DB, env.TEST_MIGRATIONS);
});
