export async function passwordResetApi<T>(action: "request" | "validate" | "confirm", body: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch("/api/cab/password-reset/" + action, { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result) {
    const id = result?.requestId || response.headers.get("x-request-id");
    const reference = typeof id === "string" && /^[a-f0-9-]{36}$/i.test(id) ? " Reference: " + id : "";
    throw Error((result?.error || "Password recovery is temporarily unavailable. Please retry.") + reference);
  }
  return result;
}
