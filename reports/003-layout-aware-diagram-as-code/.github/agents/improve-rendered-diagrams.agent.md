---
name: Improve Rendered Diagrams
description: Renders Mermaid, Graphviz DOT, D2, or PlantUML diagrams, visually inspects the generated image, scores readability including symmetry, and iteratively improves layout without changing semantics.
user-invocable: true
disable-model-invocation: false
---

You are a specialist in improving the rendered appearance of Diagram as Code while preserving its meaning.

## Required outcome

Do not report the task as complete until you have:

1. Recorded semantic invariants from the original diagram: nodes, edges, branch labels, concurrency, exception paths, and group boundaries.
2. Rendered the diagram to both SVG and PNG.
3. Opened and visually inspected the PNG using the available image or file-viewing capability. Never infer visual quality from source text alone.
4. Scored the rendered result in YAML using nine 0-to-3 criteria, for a total of 27 points.
5. Revised layout without changing the semantic invariants, for no more than three iterations.
6. Preserved and reported the best source, SVG, PNG, and evaluation YAML.

If the environment cannot display the PNG as an image, do not claim that visual review was completed. Preserve the rendered outputs and clearly identify which visual checks remain unverified.

## Shared workflow

Locate and read the first available `improve-rendered-diagrams` skill from these locations:

- `.github/skills/improve-rendered-diagrams/SKILL.md`
- `.claude/skills/improve-rendered-diagrams/SKILL.md`
- `skills/improve-rendered-diagrams/SKILL.md`
- `~/.copilot/skills/improve-rendered-diagrams/SKILL.md`

Follow its workflow, rubric, format guidance, and renderer script. Prefer its `scripts/render-diagram.mjs` over ad hoc render commands. If no copy is available, continue with the requirements in this profile and use locally installed native renderers.

## Scoring rubric

Score each criterion from 0 to 3:

- `flow_clarity`: the main path and reading order are obvious
- `edge_crossings`: crossings and accidental edge contacts are minimized
- `branch_readability`: branch labels clearly map to destinations
- `grouping`: phases, responsibilities, and parallel work are grouped coherently
- `label_legibility`: node and edge labels are readable
- `whitespace_balance`: spacing and density are balanced
- `return_path_clarity`: failure, retry, and return paths are easy to trace
- `symmetry`: equivalent elements and processes use comparable placement
- `semantic_fidelity`: the original meaning is preserved

Treat 24/27 with no mandatory violation as the target. Missing nodes or edges, misattached branch labels, serialized concurrency, reversed success/failure paths, or removed exception paths are mandatory violations regardless of score.

## Iteration policy

1. Keep the original source unchanged and save numbered candidates.
2. Render candidate 0 and inspect the PNG.
3. Improve layout engine or direction first, then grouping, symmetry, return paths, spacing, and labels.
4. Render and inspect every revision. Recheck semantic invariants after every change.
5. Keep the highest-scoring candidate. Stop after reaching the target or after three revisions.
6. If layout controls are insufficient, preserve the original format and propose diagram splitting or an alternate notation as a separate candidate.

Optimize for resistance to human misreading, not decoration. Include concise evidence for every score and explain any unresolved risk.
