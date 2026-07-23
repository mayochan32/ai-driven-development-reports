# AI駆動開発考察

AI駆動開発に役立つ技術考察を、テーマ別のレポートとして公開するリポジトリです。

このリポジトリでは、各レポートを次の2形式で管理します。

- `<number>-<slug>.md`: 正本。本文、出典、判断理由、Git差分、長期保守の基準。
- `<number>-<slug>.html`: 人間向けビュー。比較、要約、フィルター、折りたたみ、判断支援などを含む表示・操作用の派生成果物。

MarkdownとHTMLは競合する形式ではありません。Markdownは知識を残すための正本であり、HTMLは知識を人間が短時間で利用するためのインターフェースです。

各 `reports/<number>-<slug>/` は自己完結したテーマパッケージです。特定テーマのフォルダだけをダウンロードすれば、そのテーマのレポート、素材、評価データ、ツール、AIエージェントなど、公開に必要な関連ファイルをまとめて取得できます。

## レポート一覧

| No. | テーマ一式 | Markdown | HTML |
|---:|---|---|---|
| 001 | [AI駆動開発における文書・データ・表示形式の比較](reports/001-document-formats-comparison/README.md) | [001-document-formats-comparison.md](reports/001-document-formats-comparison/001-document-formats-comparison.md) | [001-document-formats-comparison.html](reports/001-document-formats-comparison/001-document-formats-comparison.html) |
| 002 | [SDDフレームワーク比較調査: Kiro / cc-sdd / Spec Kit](reports/002-sdd-framework-comparison/README.md) | [002-sdd-framework-comparison.md](reports/002-sdd-framework-comparison/002-sdd-framework-comparison.md) | [002-sdd-framework-comparison.html](reports/002-sdd-framework-comparison/002-sdd-framework-comparison.html) |
| 003 | [AI駆動開発における図の記述方針](reports/003-layout-aware-diagram-as-code/README.md) | [003-layout-aware-diagram-as-code.md](reports/003-layout-aware-diagram-as-code/003-layout-aware-diagram-as-code.md) | [003-layout-aware-diagram-as-code.html](reports/003-layout-aware-diagram-as-code/003-layout-aware-diagram-as-code.html) |

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
│   └── <number>-<slug>/
│       ├── README.md
│       ├── <number>-<slug>.md
│       ├── <number>-<slug>.html
│       ├── manifest.json
│       ├── assets/          # 必要な場合
│       ├── tools/           # 必要な場合
│       ├── skills/          # 必要な場合
│       ├── .claude/         # 必要な場合
│       └── .github/         # 必要な場合
├── schemas/
│   └── report-manifest.schema.json
├── scripts/
│   └── validate-theme-packages.mjs
├── templates/
│   ├── report.template.md
│   ├── html-view.template.html
│   └── theme-readme.template.md
```

## 方針

今後追加するテーマも、関連ファイルをすべてそのテーマフォルダ内へ置きます。ルートへ置くのは、複数テーマで実際に共有する運用文書、スキーマ、テンプレートだけです。

テーマ追加後は `node scripts/validate-theme-packages.mjs` を実行し、最低構成とカタログ参照を確認します。

詳しくは [docs/repository-philosophy.md](docs/repository-philosophy.md) を参照してください。別コンテキストで作業する場合は、まず [AGENTS.md](AGENTS.md) と [docs/report-workflow.md](docs/report-workflow.md) を確認します。
