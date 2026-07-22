# 図の視覚改善エージェント 利用・組み込みガイド

人間向けのHTML版は [usage-and-integration.html](usage-and-integration.html) を参照する。

## 1. 対象

`improve-rendered-diagrams` は、Mermaid、Graphviz DOT、D2、PlantUMLの図を実際にレンダリングし、画像を見て配置を評価・改善するための共通スキルと専門エージェントである。

次のような場面で使用する。

- 図の論理構造は正しいが、線の交差や配置が読みにくい
- 同型処理を対称に配置して、差分や漏れを見つけやすくしたい
- Mermaid、Graphviz、D2、PlantUMLのレンダリング結果を比較したい
- 設計資料を公開する前に、図の見た目を品質ゲートとして確認したい

単なる構文検査には使用しない。必ずPNGまたはSVGを生成し、PNGを画像として確認できる環境で使う。

## 2. 構成

| 要素 | 場所 | 役割 |
|---|---|---|
| 共通スキル | `skills/improve-rendered-diagrams/` | 手順、評価基準、形式別ガイド、レンダラー |
| Codex用 | `skills/improve-rendered-diagrams/SKILL.md` | Codexから直接呼び出すスキル |
| Claude Code用 | `.claude/agents/improve-rendered-diagrams.md` | スキルをプリロードする専門サブエージェント |
| GitHub Copilot用 | `.github/agents/improve-rendered-diagrams.agent.md` | Copilotのカスタムエージェント |

各環境のエージェント定義は異なるが、9項目27点の評価尺度とレンダリング処理は共通スキルを使用する。

## 3. 事前確認

対象リポジトリで次を実行し、使用する形式のレンダラーが利用可能であることを確認する。

```bash
node skills/improve-rendered-diagrams/scripts/render-diagram.mjs --check
```

別の場所へインストールした場合は、`scripts/render-diagram.mjs` をスキルディレクトリから実行する。対応拡張子は `.mmd`、`.dot`、`.d2`、`.puml`、`.plantuml` である。

不足するレンダラーをエージェントが無断でインストールしないようにする。追加インストールが必要な場合は、人間の承認を得る。

## 4. 基本的な使い方

### 4.1 新しい図を作る

図の目的、対象読者、表現したい処理、不変条件を渡す。

```text
EC注文処理のフローチャートをMermaidで作成してください。
在庫確保と不正検知は並列処理です。どちらかが失敗したら注文を中止します。
improve-rendered-diagramsを使い、レンダリング画像を評価してから最良版を提示してください。
```

### 4.2 既存の図を改善する

対象ファイルと、変更してはいけない意味を明示する。

```text
docs/order-flow.mmdを改善してください。
ノード、分岐条件、並列性、失敗経路は変更しないでください。
画像を実際に確認し、対称性を含む27点評価と改善前後の成果物を残してください。
```

### 4.3 複数形式を比較する

```text
この処理をMermaid、Graphviz DOT、D2、PlantUMLでレンダリングし、
同じ評価基準で比較してください。必須違反がなく、最も誤読しにくい形式を採用してください。
```

## 5. 環境別の呼び出し方

### 5.1 Codex

プロンプトでスキル名を明示する。

```text
$improve-rendered-diagrams を使って docs/order-flow.mmd を評価・改善してください。
```

個人利用では、共通スキルを `~/.codex/skills/improve-rendered-diagrams/` に配置する。既存の `AGENTS.md` へ常時ルールとして組み込む場合は、次のように記載する。

```markdown
## Diagram review

- `.mmd`、`.dot`、`.d2`、`.puml` を作成または変更した場合は、`improve-rendered-diagrams` スキルを使用する。
- ソースの構文確認だけで完了せず、PNGを開いて視覚評価する。
- 元図の論理的不変条件を維持し、最良候補と評価YAMLを残す。
```

### 5.2 Claude Code

プロジェクトでは、スキルを `.claude/skills/improve-rendered-diagrams/`、エージェント定義を `.claude/agents/improve-rendered-diagrams.md` に配置する。個人利用では同じ構成を `~/.claude/skills/` と `~/.claude/agents/` に配置する。

自然言語、エージェント指定、またはセッション全体の専門エージェントとして呼び出せる。

```text
improve-rendered-diagramsエージェントを使って docs/order-flow.mmd を改善してください。
```

```bash
claude --agent improve-rendered-diagrams
```

既存のClaude Codeサブエージェントへ機能を組み込む場合は、既存定義のfrontmatterへスキルを追加する。

```yaml
skills:
  - improve-rendered-diagrams
```

既存エージェントの本文には、図を変更したときにスキルの完了条件を実行することを明記する。

```markdown
図ファイルを作成または変更した場合は、プリロードされた
`improve-rendered-diagrams` スキルを実行し、レンダリング画像の確認と評価YAMLの保存まで行う。
```

### 5.3 GitHub Copilot

プロジェクトでは、スキルを `.github/skills/improve-rendered-diagrams/`、エージェント定義を `.github/agents/improve-rendered-diagrams.agent.md` に配置する。Copilot CLIの個人利用では `~/.copilot/skills/` と `~/.copilot/agents/` に配置する。

Copilot CLIでは次のように選択する。

```bash
copilot --agent improve-rendered-diagrams
```

既存のCopilotカスタムエージェントへ組み込む場合は、そのエージェント本文へ次の指示を追加する。スキルの全文を複製せず、配置場所と完了条件を参照させる。

```markdown
When creating or editing Diagram as Code, locate and follow
`.github/skills/improve-rendered-diagrams/SKILL.md`.
Do not finish until the PNG has been visually inspected, semantic invariants
have been rechecked, and the best candidate and evaluation YAML are preserved.
If image inspection is unavailable, report the visual review as incomplete.
```

## 6. 既存エージェントへの組み込みパターン

### パターンA: 必要なときだけ明示的に呼ぶ

図の作業が少ないチーム向け。既存エージェントは変更せず、プロンプトで専門エージェントまたはスキルを指定する。導入は簡単だが、呼び忘れを防げない。

### パターンB: 既存エージェントへスキルを組み込む

設計書作成エージェントやドキュメント作成エージェント向け。既存エージェントが図を扱ったときだけ、共通スキルを必須工程として実行する。Claude Codeでは `skills` frontmatter、Codexでは `AGENTS.md`、Copilotではエージェント本文の参照指示を使う。

### パターンC: 専門エージェントへ委譲する

図が大きい、候補比較が必要、評価ログを主コンテキストから分離したい場合に使う。既存エージェントは次を担当する。

1. 図の目的と対象読者を定義する。
2. 論理的不変条件を専門エージェントへ渡す。
3. 専門エージェントから最良候補、評価YAML、残課題を受け取る。
4. 人間の承認を含む最終判断を行う。

専門エージェントは図ソース、レンダリング、視覚評価、反復改善だけを担当する。業務仕様が曖昧な場合に意味を勝手に決めない。

### パターンD: 設計資料の品質ゲートにする

設計資料を作る既存エージェントの完了条件へ、次を追加する。

- 図ソースとSVG、PNGが存在する
- PNGを画像として確認済みである
- 評価YAMLに9項目、合計点、必須違反、根拠がある
- 論理的不変条件の再確認結果がある
- 最良候補が24/27未満なら残課題と人間の判断事項がある

構文検査やレンダリング成功だけを品質ゲートにしない。

## 7. 出力の受け渡し

既存エージェントから専門エージェントへ渡す入力は、最低でも次を含める。

```yaml
diagram_source: docs/order-flow.mmd
purpose: 注文受付から確定までの正常系と補償処理をレビューする
audience: 開発者と運用担当者
invariants:
  - 在庫確保と不正検知は並列である
  - 両方が成功した場合だけ決済へ進む
  - 決済失敗時は確保済み在庫を解放する
target_score: 24
max_revisions: 3
```

専門エージェントからは、次を受け取る。

```yaml
best_source: path/to/candidate-02.mmd
best_png: path/to/candidate-02.png
best_svg: path/to/candidate-02.svg
evaluation: path/to/candidate-02-evaluation.yaml
score: 25
mandatory_violations: []
invariant_check: passed
stop_reason: target_reached
remaining_risks: []
```

## 8. 導入確認

1. 各環境でエージェントまたはスキルが一覧・選択候補に現れることを確認する。
2. 小さなサンプル図を指定し、SVG、PNG、`render.json` が生成されることを確認する。
3. PNGが実際に画像として開かれ、評価YAMLに画像を見た根拠が書かれることを確認する。
4. 意図的に非対称な同型処理を含む図で、`symmetry` の指摘が出ることを確認する。
5. ノード削除を伴う見かけ上の改善案を与え、重大違反として拒否されることを確認する。

導入確認では、エージェントが「画像を見た」と述べるだけでは不十分である。生成画像のパス、寸法、具体的な視覚所見が評価結果に残っていることを確認する。

## 9. 運用上の注意

- 24/27は自動承認基準ではなく、人間によるレビューへ進める目安である。
- AI評価の点数はモデルや実行ごとに揺れるため、根拠と必須違反を優先する。
- 機密設計を外部サービスへ送る場合は、組織のデータ取扱方針に従う。
- レンダラーやレイアウトエンジンのバージョンを評価結果に残す。
- 配置制御だけで改善しない場合は、図の分割または別形式を候補として提示する。

Claude Codeのサブエージェント仕様は [Create custom subagents](https://code.claude.com/docs/en/sub-agents)、GitHub Copilotのエージェント仕様は [Custom agents configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration) を参照する。
