import path from "node:path";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer";

const reportPath = path.resolve(process.argv[2]);
if (!process.argv[2]) throw new Error("Usage: node tools/verify-report-html.mjs report.html");
const assetsDir = path.join(path.dirname(reportPath), "assets");
const sourceFiles = {
  "mermaid-standard-format": "sample-order-flow-medium-mermaid.mmd",
  "mermaid-elk-format": "sample-order-flow-medium-improved.mmd",
  "graphviz-format": "sample-order-flow-medium-graphviz.dot",
  "d2-format": "sample-order-flow-medium-d2.d2",
  "plantuml-format": "sample-order-flow-medium-plantuml.puml",
};
const expectedSources = Object.fromEntries(await Promise.all(Object.entries(sourceFiles).map(async ([id, file]) => [id, (await readFile(path.join(assetsDir, file), "utf8")).trimEnd()])));

const browser = await puppeteer.launch({ headless: true });
const results = [];
for (const viewport of [{ name: "desktop", width: 1440, height: 1000 }, { name: "mobile", width: 390, height: 844 }]) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(pathToFileURL(reportPath).href, { waitUntil: "load" });
  const tabStates = [];
  for (const target of Object.keys(sourceFiles)) {
    await page.click(`[data-compare-target="${target}"]`);
    tabStates.push(await page.evaluate((selected) => ({
      selected,
      visiblePanels: Array.from(document.querySelectorAll(".compare-panel")).filter((panel) => !panel.hidden).map((panel) => panel.id),
    }), target));
  }
  const state = await page.evaluate(() => ({
    title: document.title,
    images: Array.from(document.images).map((image) => ({ complete: image.complete, width: image.naturalWidth, alt: image.alt })),
    sourceTexts: Object.fromEntries(Array.from(document.querySelectorAll(".compare-panel")).map((panel) => [panel.id, panel.querySelector("code").textContent.trimEnd()])),
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  await page.screenshot({ path: `/tmp/report-003-${viewport.name}.png`, fullPage: true });
  const sourceMatches = Object.fromEntries(Object.entries(state.sourceTexts).map(([id, source]) => [id, source === expectedSources[id]]));
  results.push({ viewport: viewport.name, errors, tabStates, sourceMatches, ...state, sourceTexts: undefined });
  await page.close();
}
await browser.close();

for (const result of results) {
  if (result.errors.length) throw new Error(`${result.viewport}: ${result.errors.join("; ")}`);
  if (result.images.some((image) => !image.complete || image.width === 0)) throw new Error(`${result.viewport}: image failed to render`);
  if (result.tabStates.some((state) => state.visiblePanels.length !== 1 || state.visiblePanels[0] !== state.selected)) throw new Error(`${result.viewport}: compare tabs failed`);
  if (Object.values(result.sourceMatches).some((matches) => !matches)) throw new Error(`${result.viewport}: embedded source differs from input file`);
  if (result.documentWidth > result.viewportWidth + 1) throw new Error(`${result.viewport}: horizontal overflow ${result.documentWidth}/${result.viewportWidth}`);
}
console.log(JSON.stringify(results, null, 2));
