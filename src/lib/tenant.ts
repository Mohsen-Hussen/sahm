const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

export function isValidSlug(value: string) {
  return SLUG.test(value);
}

/**
 * Resolves the store slug from a request host when subdomain routing is on,
 * e.g. `nakhla.sahm.example` → `nakhla`. Returns null for the apex domain,
 * `www`, unrelated hosts, or when no root domain is configured.
 */
export function tenantFromHost(host: string | null, rootDomain: string | undefined): string | null {
  if (!host || !rootDomain) return null;
  const hostname = host.split(":")[0].toLowerCase();
  const root = rootDomain.split(":")[0].toLowerCase();
  if (hostname === root || !hostname.endsWith(`.${root}`)) return null;
  const sub = hostname.slice(0, -(root.length + 1));
  if (sub === "www" || sub.includes(".") || !isValidSlug(sub)) return null;
  return sub;
}
