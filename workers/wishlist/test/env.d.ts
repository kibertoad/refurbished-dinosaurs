import type { D1Migration } from "@cloudflare/vitest-pool-workers";

import type { WishlistBindings } from "../src/env.ts";

/**
 * What the test runtime provides: the worker's own bindings, plus the
 * migrations the setup file applies.
 */
declare global {
  namespace Cloudflare {
    interface Env extends WishlistBindings {
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}

export {};
