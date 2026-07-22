---
name: improve-rendered-diagrams
description: Create, render, visually inspect, and iteratively improve Diagram as Code while preserving its meaning. Use for Mermaid (.mmd), Graphviz DOT (.dot), D2 (.d2), or PlantUML (.puml/.plantuml) when the user asks Codex to make a diagram easier to read, fix layout or crossings, compare renderers, evaluate a rendered result, generate best-of-N candidates, or build a render-review-revise loop.
---

# Improve Rendered Diagrams

Treat the rendered image, not only the source, as the visual truth. Preserve the user's logical structure while improving placement, routing, hierarchy, labels, density, and symmetry.

For installation, direct invocation, and integration into an existing Codex, Claude Code, or GitHub Copilot agent, read [references/usage-and-integration.md](references/usage-and-integration.md).

## Workflow

1. Read the source and any requirements or invariants.
2. State the diagram's reading goal in one sentence.
3. Preserve the original file. Create a run directory with numbered candidates.
4. Render candidate 0 with `scripts/render-diagram.mjs`.
5. Inspect the PNG with `view_image`. Never infer visual quality from source alone.
6. Score the image with [references/rubric.md](references/rubric.md).
7. Revise only layout-relevant source unless the user explicitly requests a logical change.
8. Validate the revised source against every invariant before accepting it.
9. Render and inspect the revision. Keep the best candidate seen so far.
10. Stop at the target, the iteration limit, or when a different format or diagram split is more appropriate.
11. Deliver source, PNG, SVG, evaluation, and a concise account of remaining risks.

Default to at most three revisions and a target of 24/27 with no mandatory violations. Ask for human approval before treating a diagram as publishable.

## Render

Check renderer availability before editing:

```bash
node scripts/render-diagram.mjs --check
```

Render without modifying the input:

```bash
node scripts/render-diagram.mjs \
  --input path/to/diagram.mmd \
  --output-dir path/to/run/iteration-00
```

The script supports `.mmd`, `.dot`, `.d2`, `.puml`, and `.plantuml`. Read [references/formats.md](references/formats.md) when choosing or changing formats. Do not install missing tools without user approval.

## Preserve Meaning

Extract explicit invariants before the first visual revision. At minimum, preserve:

- nodes and responsibilities
- edge direction and endpoints
- sequence and prerequisite relationships
- branch conditions and merge semantics
- concurrency versus serial execution
- failure, compensation, retry, and asynchronous behavior

Reject a visually improved candidate if it omits, adds, reverses, or serializes a required relationship. When the source is ambiguous, report the ambiguity instead of silently deciding it.

## Revise

Prefer these changes in order:

1. Set the primary reading direction.
2. Group related elements into meaningful regions.
3. Put the normal path on the primary axis.
4. Align equivalent branches and explicit joins.
5. Separate failure, compensation, retry, and asynchronous paths.
6. Shorten labels and add line breaks without changing meaning.
7. Use shape, line style, and labels in addition to color.
8. Generate a different direction, layout engine, format, or diagram split when local edits plateau.

Do not add invisible edges, dummy nodes, or declaration-order tricks without recording why they exist. Too many layout-only constructs are a signal to compare another format.

## Compare Candidates

For best-of-N, render all candidates under the same scale and renderer versions. Rank them by:

1. fewer mandatory violations
2. preserved meaning
3. higher rubric score
4. less extreme aspect ratio and routing burden
5. simpler, maintainable source

Do not select the last candidate automatically. Preserve the best earlier candidate if a later revision regresses.

## Record Results

Write one structured evaluation per candidate. Include:

- source and rendered image paths
- renderer and version
- image width, height, and aspect ratio
- mandatory violations
- nine item scores and evidence
- total out of 27
- likely misreadings
- revision instructions
- invariant-check result
- stop reason

Use [references/evaluation-example.yaml](references/evaluation-example.yaml) as the output shape. Keep machine metrics and human/AI visual judgments separate.

## Escalate

Recommend format change or diagram splitting when any of these persist:

- score remains below 20 after two revisions
- improving aspect ratio causes more crossings
- long external failure lines dominate the diagram
- source accumulates layout-only constructs
- the whole diagram cannot be read at a useful text size
- the same misreading recurs across reviewers

Never claim that a successful render proves semantic correctness or usability.
