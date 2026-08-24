/** The placeholder every stored search-URL pattern uses for the user's query. */
export const QUERY_TOKEN = "{query}";

/** Substitutes the user's query into a stored pattern. */
export function buildFromTemplate(template: string, query: string): string {
  return template.split(QUERY_TOKEN).join(encodeURIComponent(query));
}

/** A pattern is only useful if it is an absolute http(s) URL with a query slot. */
export function validateTemplate(template: string): boolean {
  if (!template.includes(QUERY_TOKEN)) return false;
  try {
    const url = new URL(buildFromTemplate(template, "test"));
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
