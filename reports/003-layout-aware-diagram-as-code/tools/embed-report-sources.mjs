import { readFile, writeFile } from "node:fs/promises";

const [mode, targetPath, ...pairs] = process.argv.slice(2);
if (!["html", "markdown"].includes(mode) || !targetPath || pairs.length === 0 || pairs.length % 3 !== 0) {
  throw new Error("Usage: node tools/embed-report-sources.mjs html|markdown target PLACEHOLDER language source [...]");
}

const escapeHtml = (value) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

let target = await readFile(targetPath, "utf8");
for (let index = 0; index < pairs.length; index += 3) {
  const [placeholder, language, sourcePath] = pairs.slice(index, index + 3);
  const source = (await readFile(sourcePath, "utf8")).trimEnd();
  if (!target.includes(placeholder)) throw new Error(`Placeholder not found: ${placeholder}`);
  const replacement = mode === "html"
    ? escapeHtml(source)
    : `\`\`\`${language}\n${source}\n\`\`\``;
  target = target.replace(placeholder, replacement);
}
await writeFile(targetPath, target, "utf8");
