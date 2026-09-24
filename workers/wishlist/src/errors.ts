import type { ContentfulStatusCode } from "hono/utils/http-status";

/**
 * A failure the caller should see as a clean status code rather than a 500.
 * `message` is sent to the browser, so it is written for a person; `cause` is
 * logged and stays here.
 */
export class HttpError extends Error {
  readonly status: ContentfulStatusCode;

  constructor(
    status: ContentfulStatusCode,
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}
