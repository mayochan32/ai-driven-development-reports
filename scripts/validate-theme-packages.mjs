import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const reportsDir = path.join(root, "reports");
const catalog = JSON.parse(await readFile(path.join(root, "catalog.json"), "utf8"));
const catalogById = new Map(catalog.reports.map((report) => [report.id, report]));
const errors = [];

const exists = async (filePath) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const themeDirs = (await readdir(reportsDir, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

for (const id of themeDirs) {
  const themeDir = path.join(reportsDir, id);
  const required = [
    "README.md",
    `${id}.md`,
    `${id}.html`,
    "manifest.json",
  ];

  for (const relativePath of required) {
    if (!await exists(path.join(themeDir, relativePath))) {
      errors.push(`${id}: missing ${relativePath}`);
    }
  }

  const manifestPath = path.join(themeDir, "manifest.json");
  if (!await exists(manifestPath)) continue;

  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.id !== id) errors.push(`${id}: manifest id is ${manifest.id}`);

  for (const key of ["readme", "markdown", "html"]) {
    const relativePath = manifest[key];
    if (!relativePath) {
      errors.push(`${id}: manifest is missing ${key}`);
      continue;
    }
    if (path.isAbsolute(relativePath) || relativePath.split(path.sep).includes("..")) {
      errors.push(`${id}: manifest ${key} must stay inside the theme folder`);
      continue;
    }
    if (!await exists(path.join(themeDir, relativePath))) {
      errors.push(`${id}: manifest ${key} does not exist: ${relativePath}`);
    }
  }

  const catalogEntry = catalogById.get(id);
  if (!catalogEntry) {
    errors.push(`${id}: missing from catalog.json`);
    continue;
  }
  for (const key of ["readme", "markdown", "html", "manifest"]) {
    if (!catalogEntry[key] || !await exists(path.join(root, catalogEntry[key]))) {
      errors.push(`${id}: catalog ${key} is missing or invalid`);
    }
  }
}

for (const id of catalogById.keys()) {
  if (!themeDirs.includes(id)) errors.push(`${id}: catalog entry has no theme folder`);
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Theme packages: OK (${themeDirs.length})`);
}
