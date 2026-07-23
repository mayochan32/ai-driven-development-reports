# Format Selection

| Format | Start command | Layout strengths | Typical limit |
|---|---|---|---|
| Mermaid | `mmdc` | Lightweight, Markdown-friendly; Dagre default and optional ELK | Complex routing offers limited direct control |
| Graphviz DOT | `dot` | `rank`, `cluster`, constraints, routing options | UML semantics and maintainability need care |
| D2 | `d2` | Concise containers and styles; layout-engine choice | Output depends strongly on engine availability |
| PlantUML | `plantuml` | UML vocabulary and hidden links for alignment | Layout-only hidden links can become opaque |

## Selection Rules

- Start with the user's existing format.
- For simple new diagrams, prefer Mermaid.
- Compare Mermaid's default Dagre with ELK before abandoning Mermaid for a complex layered graph.
- Prefer DOT when explicit rank and constraint control is central.
- Prefer D2 when concise structural source and engine comparison matter.
- Prefer PlantUML when UML notation is the primary requirement.
- Split the diagram when no single view can preserve readable text and traceable paths.

ELK means Eclipse Layout Kernel. It computes layout positions and dimensions; the host renderer draws the diagram.
