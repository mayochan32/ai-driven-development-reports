import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";

const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const sourcePath = option("--source");
const requirementsPath = option("--requirements");
const outputPath = option("--output");
if (!sourcePath || !requirementsPath || !outputPath) {
  throw new Error("Usage: node tools/diagram-semantic-validator.mjs --source diagram --requirements requirements.md --output result.yaml");
}

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["preserved", "missing_requirements", "contradictions", "unsupported_additions", "evidence", "summary"],
  properties: {
    preserved: { type: "boolean" },
    missing_requirements: { type: "array", items: { type: "string" } },
    contradictions: { type: "array", items: { type: "string" } },
    unsupported_additions: { type: "array", items: { type: "string" } },
    evidence: { type: "array", items: { type: "string" } },
    summary: { type: "string" },
  },
};

function runCodex(commandArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn("codex", commandArgs, { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`codex failed (${code}): ${stderr.slice(-3000)}`)));
  });
}

const [source, requirements] = await Promise.all([
  readFile(sourcePath, "utf8"),
  readFile(requirementsPath, "utf8"),
]);
const outputDir = path.dirname(outputPath);
await mkdir(outputDir, { recursive: true });
const schemaPath = path.join(outputDir, "semantic-validation-schema.json");
const rawPath = path.join(outputDir, "semantic-validation-raw.json");
await writeFile(schemaPath, `${JSON.stringify(schema, null, 2)}\n`, "utf8");

const prompt = `あなたはソフトウェア設計図の意味検証エージェントです。画像や見た目は評価せず、論理的不変条件と図ソースの意味だけを照合してください。各不変条件が明示されているか、矛盾する順序・分岐・追加関係がないかを確認します。レイアウト用の領域、色、線種、方向は意味変更として扱いません。明示されていない要件を推測で補わないでください。\n\n論理的不変条件:\n${requirements}\n\n図ソース:\n${source}`;
await runCodex([
  "exec", "--ephemeral", "--ignore-user-config", "--ignore-rules", "--sandbox", "read-only",
  "-c", "model_reasoning_effort=\"low\"", "--color", "never",
  "--output-schema", schemaPath, "--output-last-message", rawPath, prompt,
]);

const result = JSON.parse(await readFile(rawPath, "utf8"));
const document = {
  source: path.basename(sourcePath),
  requirements: path.basename(requirementsPath),
  evaluator: "independent-semantic-agent",
  input_excludes_rendered_image: true,
  ...result,
};
await writeFile(outputPath, YAML.stringify(document), "utf8");
console.log(YAML.stringify(document));
