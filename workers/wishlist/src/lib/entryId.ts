/**
 * Entry ids are `<provider>:<external id>`. The contract has already checked
 * the shape by the time a handler runs, so all that is left is splitting it
 * and refusing an id minted by a provider this worker is not configured with.
 */
export type EntryId = { provider: string; externalId: string };

export function parseEntryId(value: string, providerName: string): EntryId | null {
  const separator = value.indexOf(":");
  if (separator < 0) return null;

  const provider = value.slice(0, separator);
  const externalId = value.slice(separator + 1);
  if (provider !== providerName || !externalId) return null;

  return { provider, externalId };
}
