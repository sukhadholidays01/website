type Options = { method?: "GET" | "POST"; body?: unknown; signal?: AbortSignal };
/** Staff authentication transport; deliberately independent of cab/customer/guest API transports. */
export async function adminApi<T>(path: "login" | "session" | "logout", options: Options = {}): Promise<T> {
  const response = await fetch("/api/admin/" + path, {
    method: options.method || "GET", credentials: "same-origin", cache: "no-store", signal: options.signal,
    headers: options.body ? { "Content-Type": "application/json" } : {},
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result) {
    const candidate = result?.requestId || response.headers.get("x-request-id");
    const reference = typeof candidate === "string" && /^[a-f0-9-]{36}$/i.test(candidate) ? candidate : "";
    throw Error((result?.error || "Admin service is temporarily unavailable. Please retry.") + (reference ? " Reference: " + reference : ""));
  }
  return result;
}
