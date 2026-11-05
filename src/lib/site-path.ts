/** Prefix public assets and native URLs for a GitHub Pages project site.
 * Next Link/router apply basePath themselves; do not prefix their hrefs. */
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export function publicAsset(path: string) {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  return `${basePath}${path}`;
}
export function sitePath(path: string) {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  // Project-site exports use directory URLs. Keep saved plans canonical so a
  // refresh does not need a host redirect before restoring their parameters.
  const boundary = path.search(/[?#]/);
  const pathname = boundary < 0 ? path : path.slice(0, boundary);
  const suffix = boundary < 0 ? "" : path.slice(boundary);
  const slash = basePath && !pathname.endsWith("/") ? "/" : "";
  return `${basePath}${pathname}${slash}${suffix}`;
}
