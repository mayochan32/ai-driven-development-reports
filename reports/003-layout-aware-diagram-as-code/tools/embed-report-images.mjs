import { readFile, writeFile } from "node:fs/promises";

const [htmlPath, ...pairs] = process.argv.slice(2);
if (!htmlPath || pairs.length === 0 || pairs.length % 2 !== 0) {
  throw new Error("Usage: node tools/embed-report-images.mjs report.html PLACEHOLDER image.png [...]");
}

let html = await readFile(htmlPath, "utf8");
for (let index = 0; index < pairs.length; index += 2) {
  const [placeholder, imagePath] = [pairs[index], pairs[index + 1]];
  const image = await readFile(imagePath);
  if (!html.includes(placeholder)) throw new Error(`Placeholder not found: ${placeholder}`);
  html = html.replace(placeholder, `data:image/png;base64,${image.toString("base64")}`);
}
await writeFile(htmlPath, html, "utf8");
