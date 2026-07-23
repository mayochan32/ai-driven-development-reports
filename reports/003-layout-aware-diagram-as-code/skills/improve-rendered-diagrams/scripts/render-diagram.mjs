#!/usr/bin/env node
import { execFile, spawn } from "node:child_process";
import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

async function commandExists(command) {
  try {
    await execFileAsync("sh", ["-c", `command -v ${command}`]);
    return true;
  } catch {
    return false;
  }
}

async function resolveMmdc() {
  const local = path.resolve("node_modules", ".bin", process.platform === "win32" ? "mmdc.cmd" : "mmdc");
  try {
    await access(local);
    return local;
  } catch {
    return "mmdc";
  }
}

async function runPipe(command, commandArgs, input, output) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, { stdio: ["pipe", "pipe", "pipe"] });
    const chunks = [];
    let stderr = "";
    child.stdout.on("data", (chunk) => chunks.push(chunk));
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", async (code) => {
      if (code !== 0) return reject(new Error(`${command} failed (${code}): ${stderr}`));
      await writeFile(output, Buffer.concat(chunks));
      resolve();
    });
    child.stdin.end(input);
  });
}

async function convertSvgToPng(svg, png, width) {
  if (await commandExists("rsvg-convert")) {
    await execFileAsync("rsvg-convert", ["-w", width, "-o", png, svg]);
    return "rsvg-convert";
  }
  if (await commandExists("magick")) {
    await execFileAsync("magick", [svg, "-resize", `${width}x`, png]);
    return "imagemagick";
  }
  if (await commandExists("convert")) {
    await execFileAsync("convert", [svg, "-resize", `${width}x`, png]);
    return "imagemagick";
  }
  if (await commandExists("sips")) {
    await execFileAsync("sips", ["-s", "format", "png", svg, "--out", png]);
    return "sips";
  }
  return null;
}

function pngDimensions(buffer) {
  if (buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

if (args.includes("--check")) {
  const mmdc = await resolveMmdc();
  const checks = {
    mermaid: mmdc !== "mmdc" || await commandExists("mmdc"),
    graphviz: await commandExists("dot"),
    d2: await commandExists("d2"),
    plantuml: await commandExists("plantuml"),
  };
  console.log(JSON.stringify(checks, null, 2));
  process.exit(0);
}

const inputPath = option("--input");
const outputDir = option("--output-dir");
const width = option("--width") || "2200";
if (!inputPath || !outputDir) throw new Error("Usage: render-diagram.mjs --input diagram --output-dir dir [--width 2200]");

const input = path.resolve(inputPath);
const output = path.resolve(outputDir);
const extension = path.extname(input).toLowerCase();
const name = path.basename(input, extension);
const base = path.join(output, name);
await mkdir(output, { recursive: true });
await copyFile(input, path.join(output, path.basename(input)));

let renderer;
let pngConverter;
if (extension === ".mmd") {
  renderer = "mermaid-cli";
  const mmdc = await resolveMmdc();
  await execFileAsync(mmdc, ["-i", input, "-o", `${base}.svg`, "-b", "transparent"]);
  await execFileAsync(mmdc, ["-i", input, "-o", `${base}.png`, "-b", "white", "-w", width]);
} else if (extension === ".dot") {
  renderer = "graphviz-dot";
  await execFileAsync("dot", ["-Tsvg", input, "-o", `${base}.svg`]);
  await execFileAsync("dot", ["-Tpng", input, "-o", `${base}.png`]);
} else if (extension === ".d2") {
  renderer = "d2";
  await execFileAsync("d2", [input, `${base}.svg`]);
  pngConverter = await convertSvgToPng(`${base}.svg`, `${base}.png`, width);
  if (!pngConverter) {
    await execFileAsync("d2", [input, `${base}.png`]);
    pngConverter = "d2-playwright";
  }
} else if ([".puml", ".plantuml"].includes(extension)) {
  renderer = "plantuml";
  const source = await readFile(input);
  await runPipe("plantuml", ["-pipe", "-tsvg"], source, `${base}.svg`);
  await runPipe("plantuml", ["-pipe", "-tpng"], source, `${base}.png`);
} else {
  throw new Error(`Unsupported extension: ${extension}`);
}

const dimensions = pngDimensions(await readFile(`${base}.png`));
const metadata = {
  input,
  renderer,
  ...(pngConverter ? { png_converter: pngConverter } : {}),
  svg: `${base}.svg`,
  png: `${base}.png`,
  image_dimensions: dimensions ? {
    ...dimensions,
    aspect_ratio: Number((dimensions.width / dimensions.height).toFixed(2)),
  } : null,
};
await writeFile(path.join(output, "render.json"), `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
console.log(JSON.stringify(metadata, null, 2));
