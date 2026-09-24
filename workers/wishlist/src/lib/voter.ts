/**
 * Voter identity without accounts.
 *
 * The wishlist has no login, so a vote is tied to a keyed hash of the address
 * and browser the vote came from. The hash is all that is stored: it is enough
 * to stop one browser voting for the same game twice and to show a visitor
 * what they already voted for, and it cannot be turned back into an address
 * without the secret.
 *
 * The trade-off is deliberate. Address alone would lump everyone behind one
 * office or carrier NAT into a single voter, so the user agent is mixed in;
 * that also means a second browser is a second voter. Ballot-stuffing is
 * cheap for anyone determined, which is why this is a wishlist and not an
 * election.
 */

const encoder = new TextEncoder();

const keyCache = new Map<string, CryptoKey>();

async function hmacKey(secret: string): Promise<CryptoKey> {
  let key = keyCache.get(secret);
  if (!key) {
    key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    keyCache.set(secret, key);
  }
  return key;
}

/** @returns hex-encoded HMAC-SHA256 of the caller's address and user agent */
export async function voterHash(
  headers: { address: string | undefined; agent: string | undefined },
  secret: string,
): Promise<string> {
  const signature = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(secret),
    encoder.encode(`${headers.address ?? ""}\n${headers.agent ?? ""}`),
  );

  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}
