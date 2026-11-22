import { z } from "zod";

const address = z.string().trim().email().max(190).transform(value => value.toLowerCase());
export class AdminConfigurationError extends Error {
  constructor(configurationProblems = []) {
    super("Configure two distinct valid ADMIN_EMAIL_1 and ADMIN_EMAIL_2 addresses on the server.");
    this.configurationProblems = configurationProblems;
  }
}

/** Shared by server authentication and the offline preflight. No file loading or fallback addresses. */
export function readAdminAllowlist(environment) {
  const first = address.safeParse(environment.ADMIN_EMAIL_1);
  const second = address.safeParse(environment.ADMIN_EMAIL_2);
  if (!first.success || !second.success || first.data === second.data) {
    const problems = [];
    if (!first.success) problems.push(environment.ADMIN_EMAIL_1?.trim() ? "ADMIN_EMAIL_1_INVALID" : "ADMIN_EMAIL_1_MISSING");
    if (!second.success) problems.push(environment.ADMIN_EMAIL_2?.trim() ? "ADMIN_EMAIL_2_INVALID" : "ADMIN_EMAIL_2_MISSING");
    if (first.success && second.success && first.data === second.data) problems.push("ADMIN_EMAILS_DUPLICATE");
    throw new AdminConfigurationError(problems);
  }
  return [first.data, second.data];
}
