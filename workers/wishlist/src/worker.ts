/**
 * Worker entry point. A Hono app is already a module worker: it exposes
 * `fetch(request, env, ctx)`, which is what Cloudflare calls.
 *
 * Bindings and deployment live in wrangler.toml; the app itself is in app.ts,
 * where it can also be built for tests without a runtime.
 */
import { createApp } from "./app.ts";

export default createApp();
