import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { svgPathProperties } from "svg-path-properties";
import YAML from "yaml";

const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const svgPath = option("--svg");
const pngPath = option("--png");
const outputPath = option("--output");
if (!svgPath || !pngPath || !outputPath) {
  throw new Error("Usage: node tools/diagram-geometry-metrics.mjs --svg in.svg --png in.png --output metrics.yaml");
}

const svg = await readFile(svgPath, "utf8");
const { data, info } = await sharp(pngPath).flatten({ background: "#ffffff" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
let inkPixels = 0;
for (let index = 0; index < data.length; index += info.channels) {
  if (data[index] < 245 || data[index + 1] < 245 || data[index + 2] < 245) inkPixels += 1;
}
const totalPixels = info.width * info.height;
const fontSizes = [...svg.matchAll(/font-size(?:=|:)['"\s]*([0-9.]+)(?:px|pt)?/gi)].map((match) => Number(match[1])).filter(Number.isFinite);

function edgePathData(source) {
  const values = [];
  for (const group of source.matchAll(/<g\b[^>]*class="[^"]*edge[^"]*"[^>]*>([\s\S]*?)<\/g>/gi)) {
    for (const pathMatch of group[1].matchAll(/<path\b[^>]*\bd="([^"]+)"[^>]*>/gi)) values.push(pathMatch[1]);
  }
  for (const pathMatch of source.matchAll(/<path\b[^>]*(?:flowchart-link|connection)[^>]*\bd="([^"]+)"[^>]*>/gi)) values.push(pathMatch[1]);
  for (const pathMatch of source.matchAll(/<path\b[^>]*\bd="([^"]+)"[^>]*(?:flowchart-link|connection)[^>]*>/gi)) values.push(pathMatch[1]);
  for (const pathMatch of source.matchAll(/<path\b[^>]*\bd="([^"]+)"[^>]*\bid="[^"]+-to-[^"]+"[^>]*>/gi)) values.push(pathMatch[1]);
  for (const pathMatch of source.matchAll(/<path\b[^>]*\bid="[^"]+-to-[^"]+"[^>]*\bd="([^"]+)"[^>]*>/gi)) values.push(pathMatch[1]);
  return [...new Set(values)];
}

function sampledSegments(d) {
  try {
    const properties = new svgPathProperties(d);
    const length = properties.getTotalLength();
    const count = Math.max(4, Math.min(80, Math.ceil(length / 12)));
    const points = Array.from({ length: count + 1 }, (_, index) => properties.getPointAtLength((length * index) / count));
    return points.slice(1).map((point, index) => [points[index], point]);
  } catch {
    return [];
  }
}

function intersects([a, b], [c, d]) {
  const cross = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const abC = cross(a, b, c);
  const abD = cross(a, b, d);
  const cdA = cross(c, d, a);
  const cdB = cross(c, d, b);
  if (Math.abs(abC) < 0.01 || Math.abs(abD) < 0.01 || Math.abs(cdA) < 0.01 || Math.abs(cdB) < 0.01) return false;
  return (abC > 0) !== (abD > 0) && (cdA > 0) !== (cdB > 0);
}

const paths = edgePathData(svg).map((d) => sampledSegments(d));
let crossingEstimate = 0;
for (let left = 0; left < paths.length; left += 1) {
  for (let right = left + 1; right < paths.length; right += 1) {
    if (paths[left].some((a) => paths[right].some((b) => intersects(a, b)))) crossingEstimate += 1;
  }
}

const result = {
  source_svg: path.basename(svgPath),
  source_png: path.basename(pngPath),
  image_dimensions: {
    width: info.width,
    height: info.height,
    aspect_ratio: Number((info.width / info.height).toFixed(2)),
  },
  whitespace: {
    percentage: Number((((totalPixels - inkPixels) / totalPixels) * 100).toFixed(1)),
    ink_percentage: Number(((inkPixels / totalPixels) * 100).toFixed(1)),
    threshold: "RGBのいずれかが245未満の画素をインクとして計数",
  },
  typography: {
    detected_font_size_count: fontSizes.length,
    minimum_declared_size: fontSizes.length ? Math.min(...fontSizes) : null,
    unit: "SVG宣言値（pxまたは単位省略。ptは換算せず）",
  },
  edges: {
    detected_path_count: paths.length,
    crossing_estimate: crossingEstimate,
    method: "SVGのエッジ経路を約12px間隔で標本化した線分交差の近似。共有端点と接触は除外",
    limitation: "SVG transform、線の重なり、ノード内通過は完全には評価しない",
  },
};

await writeFile(outputPath, YAML.stringify(result), "utf8");
console.log(YAML.stringify(result));
