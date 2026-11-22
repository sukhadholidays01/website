/** Preserve the existing signing-key rule without ever returning the secret. */
export function adminSessionConfigurationProblem(environment) {
  const secret = environment.CAB_SESSION_SECRET;
  if (typeof secret !== "string" || secret.length === 0) return "CAB_SESSION_SECRET_MISSING";
  if (secret.length < 32) return "CAB_SESSION_SECRET_TOO_SHORT";
  return null;
}
