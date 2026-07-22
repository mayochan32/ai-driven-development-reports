# AI駆動開発考察

AI駆動開発に役立つ技術考察を、テーマ別のレポートとして公開するリポジトリです。

このリポジトリでは、各レポートを次の2形式で管理します。

- `<number>-<slug>.md`: 正本。本文、出典、判断理由、Git差分、長期保守の基準。
- `<number>-<slug>.html`: 人間向けビュー。比較、要約、フィルター、折りたたみ、判断支援などを含む表示・操作用の派生成果物。

MarkdownとHTMLは競合する形式ではありません。Markdownは知識を残すための正本であり、HTMLは知識を人間が短時間で利用するためのインターフェースです。

## レポート一覧

| No. | テーマ | Markdown | HTML |
|---:|---|---|---|
| 001 | AI駆動開発における文書・データ・表示形式の比較 | [001-document-formats-comparison.md](reports/001-document-formats-comparison/001-document-formats-comparison.md) | [001-document-formats-comparison.html](reports/001-document-formats-comparison/001-document-formats-comparison.html) |
| 002 | SDDフレームワーク比較調査: Kiro / cc-sdd / Spec Kit | [002-sdd-framework-comparison.md](reports/002-sdd-framework-comparison/002-sdd-framework-comparison.md) | [002-sdd-framework-comparison.html](reports/002-sdd-framework-comparison/002-sdd-framework-comparison.html) |
| 003 | AI駆動開発における見た目まで考慮した図の記述方針 | [003-layout-aware-diagram-as-code.md](reports/003-layout-aware-diagram-as-code/003-layout-aware-diagram-as-code.md) | [003-layout-aware-diagram-as-code.html](reports/003-layout-aware-diagram-as-code/003-layout-aware-diagram-as-code.html) |

## 基本構成

```text
.
├── README.md
├── AGENTS.md
├── catalog.json
├── docs/
│   ├── repository-philosophy.md
│   └── report-workflow.md
├── reports/
│   └── 001-document-formats-comparison/
│       ├── 001-document-formats-comparison.md
│       ├── 001-document-formats-comparison.html
│       └── manifest.json
├── schemas/
│   └── report-manifest.schema.json
├── templates/
│   ├── report.template.md
│   └── html-view.template.html
```

## 方針

詳しくは [docs/repository-philosophy.md](docs/repository-philosophy.md) を参照してください。別コンテキストで作業する場合は、まず [AGENTS.md](AGENTS.md) と [docs/report-workflow.md](docs/report-workflow.md) を確認します。
