import { readFile } from "node:fs/promises";
import sharp from "sharp";

const [input, output, widthValue = "1800"] = process.argv.slice(2);
if (!input || !output) throw new Error("Usage: node tools/render-svg-png.mjs input.svg output.png");

const svg = await readFile(input);
await sharp(svg, { density: 96 })
  .resize({ width: Number(widthValue), withoutEnlargement: true })
  .flatten({ background: "#ffffff" })
  .png()
  .toFile(output);
