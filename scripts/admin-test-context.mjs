import { readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import * as passwords from "../src/lib/auth/passwords.mjs";
const native = createRequire(import.meta.url);
/** Real authentication modules and MySQL, with request-local cookie and SMTP test boundaries. */
export function adminTestContext(pool, smtp = {}, store) {
  const jar=new Map(),cache=new Map();
  function load(file) {
    const filename=path.resolve(file.endsWith(".ts")?file:file+".ts");
    if(cache.has(filename))return cache.get(filename).exports;
    const mod={exports:{}};cache.set(filename,mod);
    const source=ts.transpileModule(readFileSync(filename,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
    new Function("require","module","exports",source)(name=>{
      if(name==="server-only")return {};
      if(name==="next/headers")return {cookies:async()=>({get:key=>jar.has(key)?{value:jar.get(key)}:undefined,set:(key,value)=>jar.set(key,value),delete:key=>jar.delete(key)})};
      if(name==="@/lib/db")return {getDatabasePool:()=>pool};
      if(name==="./store")return store || {cabStorageMode:()=>"mysql",changeCabState:()=>{throw Error("Unexpected state mutation");}};
      if(name==="./passwords.mjs")return passwords;
      if(name==="@/lib/email/smtp"&&Object.keys(smtp).length)return smtp;
      if(name.startsWith("@/"))return load(path.join("src",name.slice(2)));
      if(name.startsWith(".")&&name.endsWith(".mjs"))return native(path.resolve(path.dirname(filename),name));
      if(name.startsWith("."))return load(path.resolve(path.dirname(filename),name));
      return native(name);
    },mod,mod.exports);
    return mod.exports;
  }
  return {load,jar};
}
