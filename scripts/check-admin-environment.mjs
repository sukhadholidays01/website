import { fileURLToPath } from "node:url";
import path from "node:path";
import { readAdminAllowlist, AdminConfigurationError } from "../src/lib/auth/admin-allowlist.mjs";
import { adminSessionConfigurationProblem } from "../src/lib/auth/admin-session-configuration.mjs";
import { smtpConfigurationProblems } from "../src/lib/email/smtp-configuration.mjs";
import { adminResetOrigin } from "../src/lib/auth/reset-configuration.mjs";

/** This result is safe to share: no input values or raw exception messages. */
export function checkAdminEnvironment(environment, { email = false } = {}) {
  try {
    readAdminAllowlist(environment);
    const sessionProblem = adminSessionConfigurationProblem(environment);
    if (sessionProblem) return { ok: false, code: "ADMIN_SESSION_CONFIGURATION", configurationProblems: [sessionProblem] };
    if (email) {
      const problems = smtpConfigurationProblems(environment), origin = adminResetOrigin(environment);
      if (!origin.ok) problems.push(origin.code);
      if (problems.length) return { ok: false, code: "ADMIN_RESET_EMAIL_CONFIGURATION", configurationProblems: problems };
    }
    return { ok: true, authorisedAddressCount: 2, sessionSigningSecretConfigured: true };
  } catch (error) {
    if (error instanceof AdminConfigurationError) return { ok: false, code: "ADMIN_ALLOWLIST_CONFIGURATION", configurationProblems: error.configurationProblems };
    return { ok: false, code: "ADMIN_ENVIRONMENT_CHECK_UNAVAILABLE" };
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  if (args.some(arg => !["--production", "--process-only", "--email"].includes(arg))) {
    console.error(JSON.stringify({ ok: false, code: "INVALID_ARGUMENTS", usage: "npm run admin:check-env -- --production [--process-only] [--email]" }));
    process.exitCode = 1;
  } else {
    try {
      if (!args.includes("--process-only")) {
        const { default: nextEnv } = await import("@next/env");
        // Match next start's production environment loading; never load .env.development.
        nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
      }
      const result = checkAdminEnvironment({ ...process.env, NODE_ENV: "production" }, { email: args.includes("--email") });
      console.log(JSON.stringify({ event: "admin_environment_check", loading: args.includes("--process-only") ? "process-only" : "next-production", emailConfigurationChecked: args.includes("--email"), ...result }));
      if (!result.ok) process.exitCode = 1;
    } catch {
      console.error(JSON.stringify({ ok: false, code: "ADMIN_ENVIRONMENT_CHECK_UNAVAILABLE" }));
      process.exitCode = 1;
    }
  }
}
