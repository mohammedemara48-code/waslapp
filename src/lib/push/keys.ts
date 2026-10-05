/** VAPID public key from env — never hardcode the private key in the repo. */
export const VAPID_PUBLIC_KEY = (
  (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? ""
).trim();
