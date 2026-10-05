/**
 * Standalone waslapp: no Grok platform head injection.
 * App uses /manifest.webmanifest and icons from public/.
 */
export default async function grokPwaMiddleware(
  _event: { url: URL; req: { method: string; headers: Headers } },
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  return next();
}
