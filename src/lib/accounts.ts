const KEY = "wasl-saved-accounts";

export type SavedAccount = {
  label: string;
  email: string;
  when: number;
};

export function listSavedAccounts(): SavedAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as SavedAccount[]) : [];
    return parsed.filter((a) => a.email).slice(0, 6);
  } catch {
    return [];
  }
}

export function rememberAccount(label: string, email: string | null) {
  if (typeof window === "undefined" || !email) return;
  const next = [
    { label: label || email, email, when: Date.now() },
    ...listSavedAccounts().filter((a) => a.email !== email),
  ].slice(0, 6);
  window.localStorage.setItem(KEY, JSON.stringify(next));
}

export function forgetAccount(email: string) {
  window.localStorage.setItem(
    KEY,
    JSON.stringify(listSavedAccounts().filter((a) => a.email !== email)),
  );
}
