import { readFile, writeFile } from "node:fs/promises";
import YAML from "yaml";

const args = process.argv.slice(2);
const outputIndex = args.indexOf("--output");
if (outputIndex < 0 || !args[outputIndex + 1]) throw new Error("--output is required");
const output = args[outputIndex + 1];
const inputs = args.filter((value, index) => index !== outputIndex && index !== outputIndex + 1);
if (inputs.length < 2) throw new Error("Provide at least two evaluation YAML files");

const candidates = await Promise.all(inputs.map(async (input) => {
  const value = YAML.parse(await readFile(input, "utf8"));
  const score = value.total_score?.earned ?? value.total_score;
  const maximum = value.total_score?.maximum ?? value.scoring_rule?.maximum_total ?? 27;
  const mandatory = value.mandatory_violations?.length ?? 0;
  return {
    id: value.candidate_id ?? value.diagram ?? input,
    evaluation: input,
    mandatory_violations: mandatory,
    score,
    maximum,
    normalized_percentage: Number(((score / maximum) * 100).toFixed(1)),
  };
}));

candidates.sort((a, b) => a.mandatory_violations - b.mandatory_violations || b.normalized_percentage - a.normalized_percentage);
const result = {
  selection_rule: "必須違反が少ない候補を優先し、同数なら得点率が高い候補を選ぶ",
  selected: candidates[0].id,
  candidates,
};
await writeFile(output, YAML.stringify(result), "utf8");
console.log(YAML.stringify(result));
