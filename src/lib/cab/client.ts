export async function cabApi<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const response = await fetch("/api/cab/" + path, {
    method: options.method || "GET",
    signal: options.signal,
    cache: "no-store",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.token ? { Authorization: "Bearer " + options.token } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const result = await response.json();
  if (!response.ok)
    throw Error(
      result.error || "The cab service is unavailable. Please retry.",
    );
  return result;
}
