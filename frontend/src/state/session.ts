import type { User } from "../lib/types";

export type Session = {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: User;
};

const KEY = "laundry.session.v1";

export function getSession(): Session | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function setSession(session: Session) {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

