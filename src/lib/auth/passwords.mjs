import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const derive = promisify(scrypt);
export async function hashPassword(password) {
  if (typeof password !== "string" || password.length < 16 || password.length > 1024)
    throw new Error("Use a password between 16 and 1024 characters.");
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt, 64);
  return `scrypt-v1$${salt}$${key.toString("hex")}`;
}
export async function verifyPassword(password, encoded) {
  const valid = typeof encoded === "string" && /^scrypt-v1\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(encoded);
  const [, salt, digest] = valid ? encoded.split("$") : ["", "0".repeat(32), "0".repeat(128)];
  const key = await derive(typeof password === "string" ? password : "", salt, 64);
  return timingSafeEqual(key, Buffer.from(digest, "hex")) && valid;
}
