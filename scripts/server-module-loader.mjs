import {readFileSync} from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import ts from 'typescript';
const native=createRequire(import.meta.url);
/** Run the same server domain modules outside Next without another server/framework. */
export function serverModuleLoader(overrides={}){
 const cache=new Map();
 function load(input){const filename=path.resolve(input.endsWith('.ts')?input:input+'.ts');if(cache.has(filename))return cache.get(filename).exports;const mod={exports:{}};cache.set(filename,mod);
 const source=ts.transpileModule(readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',source)(name=>{if(Object.hasOwn(overrides,name))return overrides[name];if(name==='server-only')return {};if(name==='next/headers')return {cookies:async()=>{throw Error('Worker must not access request cookies');}};if(name.startsWith('@/'))return load(path.join('src',name.slice(2)));if(name.startsWith('.')){const resolved=path.resolve(path.dirname(filename),name);return /\.(mjs|json)$/.test(name)?native(resolved):load(resolved);}return native(name);},mod,mod.exports);return mod.exports;
 }return load;
}
