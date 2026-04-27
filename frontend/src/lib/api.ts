import toast from "react-hot-toast";
import { getSession, setSession, clearSession } from "../state/session";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

async function rawRequest<T>(
  path: string,
  method: HttpMethod,
  body?: unknown,
  init?: RequestInit
): Promise<T> {
  const session = getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers ? (init.headers as Record<string, string>) : {})
  };

  if (session?.accessToken) {
    headers.Authorization = `Bearer ${session.accessToken}`;
  }

  const response = await fetch(path, {
    ...init,
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as any).error)
        : `Request failed (${response.status})`;
    const err = new Error(message);
    (err as any).status = response.status;
    throw err;
  }

  return data as T;
}

async function refreshIfNeeded(): Promise<boolean> {
  const session = getSession();
  if (!session?.refreshToken) {
    return false;
  }

  try {
    const data = await rawRequest<{
      accessToken: string;
      refreshToken: string;
      refreshTokenExpiresAt: string;
    }>("/api/auth/refresh", "POST", { refreshToken: session.refreshToken });

    setSession({
      ...session,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      refreshTokenExpiresAt: data.refreshTokenExpiresAt
    });
    return true;
  } catch {
    clearSession();
    return false;
  }
}

export async function api<T>(
  path: string,
  method: HttpMethod,
  body?: unknown
): Promise<T> {
  try {
    return await rawRequest<T>(path, method, body);
  } catch (err: any) {
    if (err?.status === 401) {
      const refreshed = await refreshIfNeeded();
      if (refreshed) {
        return await rawRequest<T>(path, method, body);
      }
      toast.error("Session expired. Please log in again.");
    }
    throw err;
  }
}

