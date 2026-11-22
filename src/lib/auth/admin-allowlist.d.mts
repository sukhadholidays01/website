export type AdminConfigurationProblem = "ADMIN_EMAIL_1_MISSING" | "ADMIN_EMAIL_1_INVALID" | "ADMIN_EMAIL_2_MISSING" | "ADMIN_EMAIL_2_INVALID" | "ADMIN_EMAILS_DUPLICATE";
export class AdminConfigurationError extends Error {
  readonly configurationProblems: readonly AdminConfigurationProblem[];
  constructor(configurationProblems?: readonly AdminConfigurationProblem[]);
}
export function readAdminAllowlist(environment: { ADMIN_EMAIL_1?: string; ADMIN_EMAIL_2?: string }): readonly [string, string];
