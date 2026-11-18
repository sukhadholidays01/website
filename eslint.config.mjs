import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".chrome*/**",
    ".edge*/**",
    "artifacts/admin-browser-profile/**",
    "artifacts/**/chrome-profile/**",
    "artifacts/admin-access-refresh/browser-*/**",
    "artifacts/admin-access-refresh/phase-1/browser-*/**",
    "artifacts/admin-access-refresh/phase-2/browser-*/**",
    "artifacts/admin-access-refresh/phase-3/browser-*/**",
  ]),
]);

export default eslintConfig;
