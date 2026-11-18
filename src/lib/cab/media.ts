import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { CabError } from "./security";
const limit = 2 * 1024 * 1024;
function storageRoot() {
  const root = process.env.CAB_UPLOAD_DIR;
  if (!root || !path.isAbsolute(root)) throw new CabError("Durable vehicle image storage is not configured. Set CAB_UPLOAD_DIR to a persistent absolute directory.", 503);
  return root;
}
export async function saveVehicleImage(request: Request) {
  const root = storageRoot();
  if (Number(request.headers.get("content-length") || 0) > limit) throw new CabError("Vehicle images must be at most 2 MB.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new CabError("Choose a vehicle image.");
  const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > limit) { await reader.cancel(); throw new CabError("Vehicle images must be at most 2 MB.", 413); } chunks.push(value); } } finally { reader.releaseLock(); }
  const bytes = Buffer.concat(chunks);
  const mime = request.headers.get("content-type");
  const extension = mime === "image/png" && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? "png" : mime === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? "jpg" : mime === "image/webp" && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" ? "webp" : null;
  if (!extension) throw new CabError("Choose a valid JPEG, PNG or WebP image.");
  const name = randomUUID() + "." + extension;
  await mkdir(root, { recursive: true }); await writeFile(path.join(root, name), bytes, { flag: "wx", mode: 0o600 });
  return { url: "/api/cab/media/" + name };
}
export async function readVehicleImage(name: string) {
  if (!/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(name)) throw new CabError("Image not found.", 404);
  try { return await readFile(path.join(storageRoot(), name)); } catch (e) { if (e instanceof CabError) throw e; throw new CabError("Image not found.", 404); }
}
