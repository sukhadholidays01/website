export function adminResetOrigin(environment) {
  let origin;
  try { origin = new URL(environment.CAB_SITE_ORIGIN || environment.APP_URL || ""); }
  catch { return { ok: false, code: "RESET_ORIGIN_INVALID" }; }
  const local = environment.NODE_ENV !== "production" && ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname);
  if (origin.username || origin.password || origin.search || origin.hash || (origin.protocol !== "https:" && !(local && origin.protocol === "http:")))
    return { ok: false, code: "RESET_ORIGIN_INSECURE" };
  return { ok: true, origin: origin.origin };
}
