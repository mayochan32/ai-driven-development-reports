# Visual Rubric

Score each item from 0 to 3. Maximum: 27.

| Key | Criterion |
|---|---|
| flow_direction | Primary reading direction is consistent. |
| sequence_clarity | Actual order and prerequisites are easy to follow. |
| branch_clarity | Conditions, outcomes, joins, and returns are unambiguous. |
| element_placement | Related elements are near and meaningfully grouped. |
| edge_crossings | Crossings, overlaps, and long detours do not impede tracing. |
| label_readability | Text is legible, concise, and clearly attached. |
| visual_hierarchy | Normal, failure, compensation, retry, and async paths differ without color-only encoding. |
| information_density | The diagram fits its purpose without extreme whitespace or crowding. |
| symmetry | Equivalent or paired structures align; intentional asymmetry remains visible and meaningful. |

## Judgement

- 24-27: publishable after human approval
- 20-23: minor improvement
- 14-19: restructure
- 0-13: reconsider format or split

Any mandatory violation overrides the total and requires revision.

## Mandatory Violations

- overlapping node, label, or arrow
- clipped or unreadable text
- indeterminate arrow direction or endpoint
- layout that swaps normal and exceptional meaning
- layout that implies an incorrect order
- unexplained duplicate element
- meaning conveyed by color alone
- content outside the render bounds

For sequence and class diagrams, also read the diagram-specific criteria in the source project's documentation when available.
