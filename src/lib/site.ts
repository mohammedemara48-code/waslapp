/** Public origin for SEO, JSON-LD, and auth. Custom domain via VITE_SITE_URL. */
export function siteOrigin(): string {
  const fromEnv = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const host = import.meta.env.VITE_PUBLIC_HOSTNAME as string | undefined;
  if (host) return `https://${host}`;
  if (typeof window !== "undefined" && window.location.protocol.startsWith("http")) {
    const { hostname, origin } = window.location;
    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") return origin;
  }
  return "https://waslapp-sigma.vercel.app";
}
