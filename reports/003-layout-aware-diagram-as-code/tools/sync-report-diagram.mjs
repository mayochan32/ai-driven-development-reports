import { readFile, writeFile } from "node:fs/promises";

const [mode, targetPath, key, languageOrSource, sourceOrImage, maybeImage] = process.argv.slice(2);

const escapeHtml = (value) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

if (mode === "html") {
  const panelId = key;
  const sourcePath = languageOrSource;
  const imagePath = sourceOrImage;
  if (!targetPath || !panelId || !sourcePath || !imagePath || maybeImage) {
    throw new Error("Usage: node tools/sync-report-diagram.mjs html report.html panel-id source-file image.png");
  }

  const [target, source, image] = await Promise.all([
    readFile(targetPath, "utf8"),
    readFile(sourcePath, "utf8"),
    readFile(imagePath),
  ]);
  const panelStartPattern = new RegExp(
    `<figure class="(?:compare|variant)-panel"[^>]*id="${escapeRegExp(panelId)}"[^>]*>`,
  );
  const panelMatch = panelStartPattern.exec(target);
  if (!panelMatch) throw new Error(`Panel not found: ${panelId}`);
  const panelEnd = target.indexOf("</figure>", panelMatch.index);
  if (panelEnd < 0) throw new Error(`Panel is not closed: ${panelId}`);

  const before = target.slice(0, panelMatch.index);
  const panel = target.slice(panelMatch.index, panelEnd + "</figure>".length);
  const after = target.slice(panelEnd + "</figure>".length);
  const sourcePattern = /(<pre><code>)[\s\S]*?(<\/code><\/pre>)/;
  const imagePattern = /(<img src=")data:image\/png;base64,[^"]+(")/;
  const dimensionsPattern = /(<div class="render-pane"><p class="pane-title">)レンダリング結果(?: · [^<]+)?(<\/p>)/;
  if (!sourcePattern.test(panel) || !imagePattern.test(panel)) {
    throw new Error(`Panel source or image is missing: ${panelId}`);
  }
  const width = image.readUInt32BE(16);
  const height = image.readUInt32BE(20);
  const syncedPanel = panel
    .replace(sourcePattern, `$1${escapeHtml(source.trimEnd())}$2`)
    .replace(imagePattern, `$1data:image/png;base64,${image.toString("base64")}$2`)
    .replace(dimensionsPattern, `$1レンダリング結果 · ${width}×${height}$2`);
  await writeFile(targetPath, `${before}${syncedPanel}${after}`, "utf8");
} else if (mode === "markdown") {
  const imageReference = key;
  const language = languageOrSource;
  const sourcePath = sourceOrImage;
  if (!targetPath || !imageReference || !language || !sourcePath || maybeImage) {
    throw new Error("Usage: node tools/sync-report-diagram.mjs markdown report.md assets/image.png language source-file");
  }

  const [target, source] = await Promise.all([
    readFile(targetPath, "utf8"),
    readFile(sourcePath, "utf8"),
  ]);
  const sourcePattern = new RegExp(
    `(\\!\\[[^\\]]*\\]\\(${escapeRegExp(imageReference)}\\)\\s*\\n\\s*)\\x60\\x60\\x60[^\\n]*\\n[\\s\\S]*?\\n\\x60\\x60\\x60`,
  );
  if (!sourcePattern.test(target)) throw new Error(`Markdown image reference not found: ${imageReference}`);
  const replacement = `$1\`\`\`${language}\n${source.trimEnd()}\n\`\`\``;
  await writeFile(targetPath, target.replace(sourcePattern, replacement), "utf8");
} else {
  throw new Error("First argument must be html or markdown");
}
