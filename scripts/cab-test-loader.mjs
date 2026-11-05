import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
const nativeRequire = createRequire(import.meta.url);
const cache = new Map();
/** Test-only TS loader: exercises pure business modules without adding a runtime dependency. */
export function loadCabModule(file) {
  const filename = path.resolve(file.endsWith(".ts") ? file : file + ".ts");
  if (cache.has(filename)) return cache.get(filename).exports;
  const loadedModule = { exports: {} };
  cache.set(filename, loadedModule);
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const localRequire = (request) =>
    request === "server-only"
      ? {}
      : request.startsWith("@/")
        ? loadCabModule(path.resolve("src", request.slice(2)))
        : request.startsWith(".")
          ? loadCabModule(path.resolve(path.dirname(filename), request))
          : nativeRequire(request);
  new Function(
    "require",
    "module",
    "exports",
    "__filename",
    "__dirname",
    compiled,
  )(
    localRequire,
    loadedModule,
    loadedModule.exports,
    filename,
    path.dirname(filename),
  );
  return loadedModule.exports;
}
