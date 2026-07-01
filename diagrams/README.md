# Project Diagrams

PlantUML files for the Whiteboard Collaboration project report.

## Files

| # | File | Diagram Type | Report Chapter |
|---|------|-------------|----------------|
| 1 | `01-er-diagram.puml` | Entity-Relationship (ER) | Ch 3: System Analysis |
| 2 | `02-use-case-diagram.puml` | Use Case | Ch 3: System Analysis |
| 3 | `03-sequence-join-sync.puml` | Sequence (Join + Yjs sync) | Ch 3: System Analysis |
| 4 | `04-sequence-shape-creation.puml` | Sequence (Shape drawing + Eraser + Undo) | Ch 4: System Design |
| 5 | `05-class-diagram.puml` | Class (DB models + Frontend types + Services) | Ch 4: System Design |
| 6 | `06-component-diagram.puml` | Component (Frontend ↔ Backend ↔ DB) | Ch 4: System Design |
| 7 | `07-deployment-diagram.puml` | Deployment (Browser → Server → Docker) | Ch 4: System Design |

## How to render

### VS Code
Install **PlantUML** extension, open any `.puml` file, press `Alt+D`.

### Online
Paste contents at https://www.plantuml.com/plantuml/uml/

### CLI (with PlantUML installed)
```bash
plantuml -tpng 01-er-diagram.puml
```

### Mermaid alternative
If PlantUML is not available, each file can be converted to Mermaid syntax:
https://mermaid.live/
