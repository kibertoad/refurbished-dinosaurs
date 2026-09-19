/** Request/response plumbing shared by the wishlist endpoints. */

/**
 * Thrown by provider and store code for anything the caller should see as a
 * clean HTTP status rather than a 500.
 */
export class HttpError extends Error {
  /**
   * @param {number} status
   * @param {string} message  sent to the browser, so keep it user-facing
   * @param {unknown} [cause] logged, never sent
   */
  constructor(status, message, cause) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.cause = cause;
  }
}

export function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

/**
 * @param {unknown} body
 * @param {number} status
 * @param {Record<string, string>} env
 * @param {Record<string, string>} [headers]
 */
export function json(body, status, env, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(env),
      ...headers,
    },
  });
}

/**
 * The site is the only client, and it is on a different origin, so every
 * mutating request has to come from it. Without this, any page anywhere could
 * cast votes with a visitor's address.
 */
export function originAllowed(request, env) {
  if (!env.ALLOWED_ORIGIN) return true;
  return request.headers.get("Origin") === env.ALLOWED_ORIGIN;
}

/**
 * @param {Request} request
 * @returns {Promise<Record<string, unknown>>}
 */
export async function readJson(request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") throw new Error("not an object");
    return body;
  } catch (cause) {
    throw new HttpError(400, "expected JSON", cause);
  }
}
