import { readFile, writeFile } from "node:fs/promises";

const [targetPath, startMarker, endMarker, fragmentPath] = process.argv.slice(2);
if (!targetPath || !startMarker || !endMarker || !fragmentPath) {
  throw new Error("Usage: node tools/replace-html-range.mjs target start-marker end-marker fragment");
}

const [target, fragment] = await Promise.all([
  readFile(targetPath, "utf8"),
  readFile(fragmentPath, "utf8"),
]);
const anchor = target.indexOf(startMarker);
const viewerStart = target.lastIndexOf('<div class="viewer-tools">', anchor);
const start = viewerStart >= 0 ? viewerStart : anchor;
const end = target.indexOf(endMarker, anchor);
if (anchor < 0 || start < 0 || end < 0) throw new Error("Replacement markers were not found in order");
await writeFile(targetPath, `${target.slice(0, start)}${fragment.trimEnd()}\n\n      ${target.slice(end)}`, "utf8");
