import "server-only";
import path from "node:path";
import { mkdir, open, writeFile, unlink, realpath, lstat } from "node:fs/promises";
import {constants} from 'node:fs';
import { randomBytes } from "node:crypto";
import { CabError } from "./security";
export const maximumDocumentBytes = 3 * 1024 * 1024;
export function documentMime(bytes: Buffer, declared: string | null) {
  if (!bytes.length || bytes.length > maximumDocumentBytes) throw new CabError("Choose a document up to 3 MB.", 413);
  const png = bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 && bytes.at(-2) === 255 && bytes.at(-1) === 217;
  const pdf = bytes.subarray(0,5).toString() === "%PDF-" && bytes.subarray(-1024).includes(Buffer.from("%%EOF")) && !/\/(?:JavaScript|JS|OpenAction|EmbeddedFile|Launch)\b/.test(bytes.toString("latin1"));
  const mime = png ? "image/png" : jpg ? "image/jpeg" : pdf ? "application/pdf" : "";
  if (!mime || mime !== declared) throw new CabError("Use a valid JPG, PNG or PDF matching its content type.");
  return mime;
}
async function root() {
  const configured = process.env.CAB_PRIVATE_DOCUMENT_DIR;
  if (!configured || !path.isAbsolute(configured)) throw new CabError("Private document storage is not configured. Contact support.", 503);
  await mkdir(configured, { recursive: true, mode: 0o700 });
  const target = await realpath(configured), publicRoot = await realpath(path.resolve("public"));
  const inside = (base: string) => { const relative = path.relative(base,target); return !relative || (!relative.startsWith("..") && !path.isAbsolute(relative)); };
  if (inside(publicRoot) || (process.env.CAB_UPLOAD_DIR && inside(path.resolve(process.env.CAB_UPLOAD_DIR)))) throw new CabError("Private storage must be separate from public and vehicle media storage.", 503);
  return target;
}
function keyName(key: string) { if (!/^[a-f0-9]{64}$/.test(key)) throw new CabError("Document unavailable.",404); return key; }
async function privateFile(key:string){const base=await root(),file=path.join(base,keyName(key));const stat=await lstat(file);if(stat.isSymbolicLink()||!stat.isFile()||await realpath(file)!==file)throw new CabError('Unsafe private storage entry.',503);return file;}
export const privateDocumentStorage = {
  async put(bytes: Buffer) { const key = randomBytes(32).toString("hex"); await writeFile(path.join(await root(),key), bytes, { flag: "wx", mode: 0o600 }); return key; },
  async get(key: string) { const file=await privateFile(key),handle=await open(file,constants.O_RDONLY|(constants.O_NOFOLLOW||0));try{return await handle.readFile();}finally{await handle.close();} },
  async remove(key: string) { try { await unlink(await privateFile(key)); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; } },
};
export async function documentBytes(request: Request) {
  const reader = request.body?.getReader(); if (!reader) throw new CabError("Select a document.");
  const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const {value,done} = await reader.read(); if (done) break; size += value.byteLength; if (size > maximumDocumentBytes) { await reader.cancel(); throw new CabError("Document exceeds 3 MB.",413); } chunks.push(value); } } finally { reader.releaseLock(); }
  const bytes = Buffer.concat(chunks); return { bytes, mime: documentMime(bytes,request.headers.get("content-type")) };
}
