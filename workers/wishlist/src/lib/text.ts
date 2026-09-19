/**
 * @param text raw provider text, often several paragraphs
 * @param limit longest result, ellipsis included
 */
export function truncate(text: string | null | undefined, limit: number): string | null {
  if (!text) return null;

  const collapsed = text.replace(/\s+/g, " ").trim();
  if (!collapsed) return null;
  if (collapsed.length <= limit) return collapsed;

  return `${collapsed.slice(0, limit - 1).trimEnd()}\u2026`;
}
