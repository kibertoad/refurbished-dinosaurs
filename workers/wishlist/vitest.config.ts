import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

/**
 * Tests run inside workerd, against a real D1 database and a real edge cache,
 * rather than against stand-ins for them.
 *
 * The compatibility date and the D1 binding come from wrangler.toml, so the
 * tests run on the same runtime contract as the deployment. What is added here
 * is only what a deployment gets from secrets: the credentials, and the
 * migrations the setup file applies.
 */
export default defineConfig(async () => ({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.toml" },
      miniflare: {
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations("./migrations"),
          VOTER_SECRET: "a-long-random-string",
          IGDB_CLIENT_ID: "client",
          IGDB_CLIENT_SECRET: "secret",
        },
      },
    }),
  ],
  test: {
    include: ["test/**/*.test.ts"],
    setupFiles: ["./test/setup.ts"],
  },
}));
