import path from "node:path";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer";
import YAML from "yaml";

const reportPath = path.resolve(process.argv[2]);
if (!process.argv[2]) throw new Error("Usage: node tools/verify-report-html.mjs report.html");
const assetsDir = path.join(path.dirname(reportPath), "assets");
const sourceFiles = {
  "mermaid-standard-format": "sample-order-flow-medium-mermaid.mmd",
  "mermaid-elk-format": "sample-order-flow-medium-improved.mmd",
  "plantuml-format": "sample-order-flow-medium-plantuml.puml",
  "graphviz-format": "sample-order-flow-medium-graphviz.dot",
  "d2-format": "sample-order-flow-medium-d2.d2",
};
const variantSourceFiles = {
  "sequence-mermaid-format": "sample-order-sequence-mermaid.mmd",
  "sequence-mermaid-elk-format": "sample-order-sequence-mermaid-elk.mmd",
  "sequence-plantuml-format": "sample-order-sequence-plantuml.puml",
  "sequence-graphviz-format": "sample-order-sequence-graphviz.dot",
  "sequence-d2-format": "sample-order-sequence-d2.d2",
  "class-mermaid-format": "sample-order-class-mermaid.mmd",
  "class-mermaid-elk-format": "sample-order-class-mermaid-elk.mmd",
  "class-plantuml-format": "sample-order-class-plantuml.puml",
  "class-graphviz-format": "sample-order-class-graphviz.dot",
  "class-d2-format": "sample-order-class-d2.d2",
  "state-mermaid-format": "sample-order-state-mermaid.mmd",
  "state-mermaid-elk-format": "sample-order-state-mermaid-elk.mmd",
  "state-plantuml-format": "sample-order-state-plantuml.puml",
  "state-graphviz-format": "sample-order-state-graphviz.dot",
  "state-d2-format": "sample-order-state-d2.d2",
  "component-mermaid-format": "sample-order-component-mermaid.mmd",
  "component-mermaid-elk-format": "sample-order-component-mermaid-elk.mmd",
  "component-plantuml-format": "sample-order-component-plantuml.puml",
  "component-graphviz-format": "sample-order-component-graphviz.dot",
  "component-d2-format": "sample-order-component-d2.d2",
  "er-mermaid-format": "sample-order-er-mermaid.mmd",
  "er-mermaid-elk-format": "sample-order-er-mermaid-elk.mmd",
  "er-plantuml-format": "sample-order-er-plantuml.puml",
  "er-graphviz-format": "sample-order-er-graphviz.dot",
  "er-d2-format": "sample-order-er-d2.d2",
};
const allSourceFiles = { ...sourceFiles, ...variantSourceFiles };
const expectedSources = Object.fromEntries(await Promise.all(Object.entries(allSourceFiles).map(async ([id, file]) => [id, (await readFile(path.join(assetsDir, file), "utf8")).trimEnd()])));
const comparison = YAML.parse(await readFile(path.join(assetsDir, "diagram-variant-comparison.yaml"), "utf8"));
const diagramTypes = ["sequence", "class", "state", "component", "er"];
const formats = [
  { metric: "mermaid", score: "mermaid", label: "Mermaid標準" },
  { metric: "mermaid-elk", score: "mermaid_elk", label: "Mermaid + ELK" },
  { metric: "plantuml", score: "plantuml", label: "PlantUML" },
  { metric: "graphviz", score: "graphviz", label: "Graphviz DOT" },
  { metric: "d2", score: "d2", label: "D2" },
];
const expectedVariantTableRows = Object.fromEntries(await Promise.all(diagramTypes.map(async (type) => {
  const rows = await Promise.all(formats.map(async (format) => {
    const metrics = YAML.parse(await readFile(path.join(assetsDir, `sample-order-${type}-${format.metric}-metrics.yaml`), "utf8"));
    const score = comparison.scores[type][format.score];
    return [
      format.label,
      `${score.total} / ${score.maximum}`,
      metrics.image_dimensions.aspect_ratio.toFixed(2),
      `${metrics.whitespace.percentage.toFixed(1)}%`,
      String(metrics.edges.crossing_estimate),
      String(metrics.typography.minimum_declared_size),
    ];
  }));
  return [type, rows];
})));

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
  const variantTabStates = [];
  for (const target of Object.keys(variantSourceFiles)) {
    await page.click(`[data-variant-target="${target}"]`);
    variantTabStates.push(await page.evaluate((selected) => {
      const panel = document.getElementById(selected);
      const block = panel.closest(".variant-block");
      return {
        selected,
        type: block.dataset.diagramType,
        visiblePanels: Array.from(block.querySelectorAll(".variant-panel")).filter((item) => !item.hidden).map((item) => item.id),
      };
    }, target));
  }
  const state = await page.evaluate(() => ({
    title: document.title,
    images: Array.from(document.images).map((image) => ({ complete: image.complete, width: image.naturalWidth, alt: image.alt })),
    sourceTexts: Object.fromEntries(Array.from(document.querySelectorAll(".compare-panel, .variant-panel")).map((panel) => [panel.id, panel.querySelector("code").textContent.trimEnd()])),
    compareButtonLabels: Array.from(document.querySelectorAll("[data-compare-target]")).map((button) => button.textContent.trim()),
    variantButtonLabels: Object.fromEntries(Array.from(document.querySelectorAll(".variant-block")).map((block) => [
      block.dataset.diagramType,
      Array.from(block.querySelectorAll("[data-variant-target]")).map((button) => button.textContent.trim()),
    ])),
    variantTableRows: Object.fromEntries(Array.from(document.querySelectorAll(".variant-block")).map((block) => [
      block.dataset.diagramType,
      Array.from(block.querySelectorAll(".variant-score-table tbody tr")).map((row) =>
        Array.from(row.cells).map((cell) => cell.textContent.trim().replace(/\*$/, ""))),
    ])),
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  await page.screenshot({ path: `/tmp/report-003-${viewport.name}.png`, fullPage: true });
  const sourceMatches = Object.fromEntries(Object.entries(state.sourceTexts).map(([id, source]) => [id, source === expectedSources[id]]));
  results.push({ viewport: viewport.name, errors, tabStates, variantTabStates, sourceMatches, ...state, sourceTexts: undefined });
  await page.close();
}
await browser.close();

for (const result of results) {
  if (result.errors.length) throw new Error(`${result.viewport}: ${result.errors.join("; ")}`);
  if (result.images.some((image) => !image.complete || image.width === 0)) throw new Error(`${result.viewport}: image failed to render`);
  if (result.tabStates.some((state) => state.visiblePanels.length !== 1 || state.visiblePanels[0] !== state.selected)) throw new Error(`${result.viewport}: compare tabs failed`);
  if (result.variantTabStates.some((state) => state.visiblePanels.length !== 1 || state.visiblePanels[0] !== state.selected)) throw new Error(`${result.viewport}: diagram variant tabs failed`);
  if (Object.values(result.sourceMatches).some((matches) => !matches)) throw new Error(`${result.viewport}: embedded source differs from input file`);
  const expectedFormatLabels = formats.map((format) => format.label);
  if (JSON.stringify(result.compareButtonLabels) !== JSON.stringify(expectedFormatLabels)) throw new Error(`${result.viewport}: format tabs are in the wrong order`);
  if (Object.values(result.variantButtonLabels).some((labels) => JSON.stringify(labels) !== JSON.stringify(expectedFormatLabels))) throw new Error(`${result.viewport}: diagram variant tabs are in the wrong order`);
  if (JSON.stringify(result.variantTableRows) !== JSON.stringify(expectedVariantTableRows)) throw new Error(`${result.viewport}: variant comparison table differs from YAML metrics`);
  if (result.documentWidth > result.viewportWidth + 1) throw new Error(`${result.viewport}: horizontal overflow ${result.documentWidth}/${result.viewportWidth}`);
}
console.log(JSON.stringify(results, null, 2));
