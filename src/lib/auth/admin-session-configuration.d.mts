export type AdminSessionConfigurationProblem = "CAB_SESSION_SECRET_MISSING" | "CAB_SESSION_SECRET_TOO_SHORT";
export function adminSessionConfigurationProblem(environment: { CAB_SESSION_SECRET?: string }): AdminSessionConfigurationProblem | null;
