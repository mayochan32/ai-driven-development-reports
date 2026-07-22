import { execFile, spawn } from "node:child_process";
import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import OpenAI from "openai";
import YAML from "yaml";

const execFileAsync = promisify(execFile);
const SCORE_MAXIMUM = 3;
const TOTAL_MAXIMUM = 27;
const RUBRIC_VERSION = "2.0";
const DEFAULT_TARGET_SCORE = 24;
const DEFAULT_MAX_ITERATIONS = 2;

const scoreKeys = [
  "flow_direction",
  "sequence_clarity",
  "branch_clarity",
  "element_placement",
  "edge_crossings",
  "label_readability",
  "visual_hierarchy",
  "information_density",
  "symmetry",
];

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "mandatory_violations",
    "scores",
    "evidence",
    "misreading_risks",
    "revision_instructions",
    "should_revise",
    "revised_mermaid",
  ],
  properties: {
    mandatory_violations: { type: "array", items: { type: "string" } },
    scores: {
      type: "object",
      additionalProperties: false,
      required: scoreKeys,
      properties: Object.fromEntries(
        scoreKeys.map((key) => [key, { type: "integer", minimum: 0, maximum: SCORE_MAXIMUM }]),
      ),
    },
    evidence: {
      type: "object",
      additionalProperties: false,
      required: scoreKeys,
      properties: Object.fromEntries(
        scoreKeys.map((key) => [key, { type: "array", items: { type: "string" } }]),
      ),
    },
    misreading_risks: { type: "array", items: { type: "string" } },
    revision_instructions: { type: "array", items: { type: "string" } },
    should_revise: { type: "boolean" },
    revised_mermaid: { type: "string" },
  },
};

const reviewInstructions = `
あなたはソフトウェア設計図の視覚品質を評価し、Mermaid記述を改善するエージェントです。
必ずレンダリング画像を見て評価してください。Mermaidソースだけから見た目を推測してはいけません。

各項目を0〜3点で評価します。
- flow_direction: 処理方向の一貫性
- sequence_clarity: 処理順序の追いやすさ
- branch_clarity: 条件と分岐結果の明確さ
- element_placement: 意味に沿った要素配置
- edge_crossings: 線の交差と長い迂回線の少なさ
- label_readability: ラベルの判読性
- visual_hierarchy: 正常系、失敗系、補償、非同期処理の識別性
- information_density: 目的に対する情報量と画面利用の適切さ
- symmetry: 同型の要素や処理が対応関係の分かる対称配置になっているか。意味の違いは無理に対称化しない

次は必須違反です。
- ノード、ラベル、矢印の重なり
- 文字切れまたは判読不能
- 矢印の向きや接続先を判別不能
- 正常系と異常系を取り違える配置
- 実際と異なる処理順序に見える配置
- 説明のない要素重複
- 色だけによる意味の区別
- レンダリング領域からの要素のはみ出し

業務ロジックの不変条件を絶対に変更しないでください。改善は配置、方向、領域分け、ラベル、
線種、Mermaidのレイアウト指定に限定します。修正が必要な場合は、コードフェンスを付けず、
完全なMermaidソースをrevised_mermaidに返してください。修正不要の場合は空文字列を返してください。
`;

function parseArgs(argv) {
  const options = {
    maxIterations: DEFAULT_MAX_ITERATIONS,
    targetScore: DEFAULT_TARGET_SCORE,
    model: process.env.OPENAI_MODEL || "gpt-5.6",
    provider: "openai",
    renderOnly: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (argument === "--input") options.input = value, index += 1;
    else if (argument === "--requirements") options.requirements = value, index += 1;
    else if (argument === "--output-dir") options.outputDir = value, index += 1;
    else if (argument === "--model") options.model = value, index += 1;
    else if (argument === "--provider") options.provider = value, index += 1;
    else if (argument === "--review-fixture") options.reviewFixture = value, index += 1;
    else if (argument === "--max-iterations") options.maxIterations = Number(value), index += 1;
    else if (argument === "--target-score") options.targetScore = Number(value), index += 1;
    else if (argument === "--render-only") options.renderOnly = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }

  if (!options.input) throw new Error("--input is required");
  if (!options.outputDir) throw new Error("--output-dir is required");
  if (!["openai", "codex"].includes(options.provider)) {
    throw new Error("--provider must be openai or codex");
  }
  if (!Number.isInteger(options.maxIterations) || options.maxIterations < 0 || options.maxIterations > 5) {
    throw new Error("--max-iterations must be an integer between 0 and 5");
  }
  if (!Number.isInteger(options.targetScore) || options.targetScore < 0 || options.targetScore > TOTAL_MAXIMUM) {
    throw new Error(`--target-score must be an integer between 0 and ${TOTAL_MAXIMUM}`);
  }
  return options;
}

function iterationName(index) {
  return `iteration-${String(index).padStart(2, "0")}`;
}

function spawnWithClosedInput(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGTERM"), options.timeout);

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      if (stdout.length + stderr.length > options.maxBuffer) child.kill("SIGTERM");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      if (stdout.length + stderr.length > options.maxBuffer) child.kill("SIGTERM");
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      const detail = stderr.trim().split("\n").slice(-20).join("\n");
      reject(new Error(`${command} exited with code ${code ?? "null"} (${signal || "no signal"})\n${detail}`));
    });
  });
}

async function renderMermaid(sourcePath, outputBase) {
  const executable = path.resolve("node_modules", ".bin", process.platform === "win32" ? "mmdc.cmd" : "mmdc");
  await access(executable);
  await execFileAsync(executable, ["-i", sourcePath, "-o", `${outputBase}.svg`, "-b", "transparent"]);
  await execFileAsync(executable, ["-i", sourcePath, "-o", `${outputBase}.png`, "-b", "white", "-w", "2200"]);
}

async function readPngDimensions(imagePath) {
  const image = await readFile(imagePath);
  const signature = image.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a" || image.length < 24) {
    throw new Error(`Not a valid PNG: ${imagePath}`);
  }
  const width = image.readUInt32BE(16);
  const height = image.readUInt32BE(20);
  return {
    width,
    height,
    aspect_ratio: Number((width / height).toFixed(2)),
  };
}

function totalScore(scores) {
  return scoreKeys.reduce((sum, key) => sum + scores[key], 0);
}

function judgementFor(total, mandatoryViolations) {
  if (mandatoryViolations.length > 0) return "再構成が必要";
  if (total >= 24) return "公開可能";
  if (total >= 20) return "軽微な改善";
  if (total >= 14) return "再構成が必要";
  return "図の種類や分割方法から再検討";
}

function evaluationDocument(review, metadata) {
  const earned = totalScore(review.scores);
  return {
    diagram: path.basename(metadata.imagePath),
    source: path.basename(metadata.sourcePath),
    evaluation_target: "rendered_image",
    rubric_version: RUBRIC_VERSION,
    provider: metadata.provider,
    model: metadata.model,
    iteration: metadata.iteration,
    image_dimensions: metadata.imageDimensions,
    mandatory_violations: review.mandatory_violations,
    scoring_rule: {
      minimum_per_item: 0,
      maximum_per_item: SCORE_MAXIMUM,
      maximum_total: TOTAL_MAXIMUM,
      mandatory_violation_rule: "必須条件に1件でも違反した場合は、合計点にかかわらず再構成が必要",
      judgement_ranges: [
        { range: "24-27", judgement: "公開可能" },
        { range: "20-23", judgement: "軽微な改善" },
        { range: "14-19", judgement: "再構成が必要" },
        { range: "0-13", judgement: "図の種類や分割方法から再検討" },
      ],
    },
    scores: review.scores,
    total_score: {
      earned,
      maximum: TOTAL_MAXIMUM,
      percentage: Number(((earned / TOTAL_MAXIMUM) * 100).toFixed(1)),
    },
    judgement: judgementFor(earned, review.mandatory_violations),
    evidence: review.evidence,
    misreading_risks: review.misreading_risks,
    revision_instructions: review.revision_instructions,
  };
}

async function reviewDiagram(client, options) {
  const [mermaid, image, requirements] = await Promise.all([
    readFile(options.sourcePath, "utf8"),
    readFile(options.imagePath),
    options.requirementsPath ? readFile(options.requirementsPath, "utf8") : Promise.resolve("指定なし"),
  ]);

  const response = await client.responses.create({
    model: options.model,
    store: false,
    instructions: reviewInstructions,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `画像寸法: ${options.imageDimensions.width}x${options.imageDimensions.height}、縦横比 ${options.imageDimensions.aspect_ratio}\n\n業務ロジックの不変条件:\n${requirements}\n\n現在のMermaidソース:\n${mermaid}`,
          },
          {
            type: "input_image",
            detail: "high",
            image_url: `data:image/png;base64,${image.toString("base64")}`,
          },
        ],
      },
    ],
    text: {
      verbosity: "low",
      format: {
        type: "json_schema",
        name: "diagram_layout_review",
        description: "レンダリング済み設計図の評価とMermaid修正版",
        strict: true,
        schema: responseSchema,
      },
    },
  });

  if (!response.output_text) throw new Error("The model returned no structured output");
  return JSON.parse(response.output_text);
}

async function reviewDiagramWithCodex(options) {
  const [mermaid, requirements] = await Promise.all([
    readFile(options.sourcePath, "utf8"),
    options.requirementsPath ? readFile(options.requirementsPath, "utf8") : Promise.resolve("指定なし"),
  ]);
  const schemaPath = path.join(options.outputDir, "review-schema.json");
  const responsePath = path.join(options.outputDir, `${iterationName(options.iteration)}-raw-review.json`);
  await writeFile(schemaPath, `${JSON.stringify(responseSchema, null, 2)}\n`, "utf8");

  const prompt = `${reviewInstructions}\n\n画像寸法: ${options.imageDimensions.width}x${options.imageDimensions.height}、縦横比 ${options.imageDimensions.aspect_ratio}\n\n業務ロジックの不変条件:\n${requirements}\n\n現在のMermaidソース:\n${mermaid}`.trim();
  await spawnWithClosedInput(
    "codex",
    [
      "exec",
      "--ephemeral",
      "--ignore-user-config",
      "--ignore-rules",
      "--sandbox",
      "read-only",
      "-c",
      "model_reasoning_effort=\"low\"",
      "--color",
      "never",
      "--output-schema",
      schemaPath,
      "--output-last-message",
      responsePath,
      prompt,
      "--image",
      options.imagePath,
    ],
    { cwd: process.cwd(), maxBuffer: 10 * 1024 * 1024, timeout: 180_000 },
  );

  return JSON.parse(await readFile(responsePath, "utf8"));
}

async function loadReviewFixtures(fixturePath) {
  const fixture = YAML.parse(await readFile(fixturePath, "utf8"));
  if (!Array.isArray(fixture.reviews) || fixture.reviews.length === 0) {
    throw new Error("Review fixture must contain a non-empty reviews array");
  }

  return Promise.all(fixture.reviews.map(async (review) => {
    if (!review.revised_mermaid_file) return { ...review, revised_mermaid: review.revised_mermaid || "" };
    const revisionPath = path.resolve(path.dirname(fixturePath), review.revised_mermaid_file);
    const revisedMermaid = await readFile(revisionPath, "utf8");
    const { revised_mermaid_file: unused, ...rest } = review;
    return { ...rest, revised_mermaid: revisedMermaid };
  }));
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(options.input);
  const outputDir = path.resolve(options.outputDir);
  const requirementsPath = options.requirements ? path.resolve(options.requirements) : null;
  const fixturePath = options.reviewFixture ? path.resolve(options.reviewFixture) : null;
  await mkdir(outputDir, { recursive: true });

  let currentSource = path.join(outputDir, `${iterationName(0)}.mmd`);
  await copyFile(inputPath, currentSource);
  await renderMermaid(currentSource, path.join(outputDir, iterationName(0)));

  if (options.renderOnly) {
    console.log(`Rendered: ${path.join(outputDir, `${iterationName(0)}.png`)}`);
    return;
  }
  if (!fixturePath && options.provider === "openai" && !process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required unless --render-only is used");
  }

  const client = fixturePath || options.provider === "codex" ? null : new OpenAI();
  const fixtureReviews = fixturePath ? await loadReviewFixtures(fixturePath) : null;
  const reviewModel = fixturePath ? "fixture" : options.provider === "codex" ? "codex-cli" : options.model;
  const runSummary = [];
  let stopReason = "iteration_limit";
  for (let iteration = 0; iteration <= options.maxIterations; iteration += 1) {
    const baseName = iterationName(iteration);
    const imagePath = path.join(outputDir, `${baseName}.png`);
    const imageDimensions = await readPngDimensions(imagePath);
    let review;
    if (fixtureReviews) {
      review = fixtureReviews[iteration];
    } else if (options.provider === "codex") {
      review = await reviewDiagramWithCodex({
        sourcePath: currentSource,
        imagePath,
        requirementsPath,
        outputDir,
        iteration,
        imageDimensions,
      });
    } else {
      review = await reviewDiagram(client, {
        sourcePath: currentSource,
        imagePath,
        requirementsPath,
        model: options.model,
        imageDimensions,
      });
    }
    if (!review) throw new Error(`No review result for iteration ${iteration}`);
    const evaluation = evaluationDocument(review, {
      sourcePath: currentSource,
      imagePath,
      model: reviewModel,
      provider: fixturePath ? "fixture" : options.provider,
      iteration,
      imageDimensions,
    });
    await writeFile(path.join(outputDir, `${baseName}-evaluation.yaml`), YAML.stringify(evaluation), "utf8");

    runSummary.push({
      iteration,
      score: evaluation.total_score.earned,
      judgement: evaluation.judgement,
      mandatory_violations: evaluation.mandatory_violations.length,
      image_dimensions: imageDimensions,
    });

    const passed = evaluation.mandatory_violations.length === 0
      && evaluation.total_score.earned >= options.targetScore;
    if (passed) {
      stopReason = "target_reached";
      break;
    }
    if (!review.should_revise) {
      stopReason = "reviewer_stopped";
      break;
    }
    if (iteration === options.maxIterations) {
      if (review.revised_mermaid.trim()) {
        await writeFile(path.join(outputDir, "next-proposal.mmd"), `${review.revised_mermaid.trim()}\n`, "utf8");
      }
      stopReason = "iteration_limit";
      break;
    }
    if (!review.revised_mermaid.trim()) throw new Error("Revision requested but revised_mermaid is empty");

    const nextBaseName = iterationName(iteration + 1);
    currentSource = path.join(outputDir, `${nextBaseName}.mmd`);
    await writeFile(currentSource, `${review.revised_mermaid.trim()}\n`, "utf8");
    await renderMermaid(currentSource, path.join(outputDir, nextBaseName));
  }

  const best = runSummary.reduce((currentBest, candidate) => {
    if (!currentBest) return candidate;
    if (candidate.mandatory_violations < currentBest.mandatory_violations) return candidate;
    if (candidate.mandatory_violations > currentBest.mandatory_violations) return currentBest;
    return candidate.score > currentBest.score ? candidate : currentBest;
  }, null);
  const bestBaseName = iterationName(best.iteration);
  await Promise.all([
    copyFile(path.join(outputDir, `${bestBaseName}.mmd`), path.join(outputDir, "best.mmd")),
    copyFile(path.join(outputDir, `${bestBaseName}.svg`), path.join(outputDir, "best.svg")),
    copyFile(path.join(outputDir, `${bestBaseName}.png`), path.join(outputDir, "best.png")),
    copyFile(path.join(outputDir, `${bestBaseName}-evaluation.yaml`), path.join(outputDir, "best-evaluation.yaml")),
  ]);

  await writeFile(
    path.join(outputDir, "run-summary.yaml"),
    YAML.stringify({
      input: path.relative(process.cwd(), inputPath),
      requirements: requirementsPath ? path.relative(process.cwd(), requirementsPath) : null,
      provider: fixturePath ? "fixture" : options.provider,
      model: reviewModel,
      review_fixture: fixturePath ? path.relative(process.cwd(), fixturePath) : null,
      target_score: options.targetScore,
      maximum_iterations: options.maxIterations,
      stop_reason: stopReason,
      target_reached: stopReason === "target_reached",
      best_iteration: best.iteration,
      best_score: best.score,
      iterations: runSummary,
    }),
    "utf8",
  );
  console.log(YAML.stringify({ iterations: runSummary }));
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
