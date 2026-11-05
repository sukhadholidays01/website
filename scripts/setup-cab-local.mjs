import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
const file = new URL("../.env.local", import.meta.url);
let content = "";
try {
  content = await readFile(file, "utf8");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const additions = [];
if (!/^CAB_ADMIN_PASSWORD=/m.test(content))
  additions.push("CAB_ADMIN_PASSWORD=" + randomBytes(24).toString("base64url"));
if (!/^CAB_SESSION_SECRET=/m.test(content))
  additions.push("CAB_SESSION_SECRET=" + randomBytes(48).toString("hex"));
if (additions.length)
  await writeFile(
    file,
    content +
      (content && !content.endsWith("\n") ? "\n" : "") +
      "\n# Local cab operations credentials. Never commit or share this file.\n" +
      additions.join("\n") +
      "\n",
    { mode: 0o600 },
  );
console.log(
  additions.length
    ? "Local cab credentials configured in .env.local. Open that file privately for the admin password, then restart the dev server."
    : "Existing local cab credentials preserved.",
);
