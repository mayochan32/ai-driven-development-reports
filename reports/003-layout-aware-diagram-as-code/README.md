# 003 AI駆動開発における図の記述方針

Diagram as Codeの論理構造だけでなく、レンダリング後の配置、誤読リスク、視覚品質まで評価・改善する方法を検証した自己完結型のテーマパッケージです。

## 主な入口

| パス | 役割 |
|---|---|
| `003-layout-aware-diagram-as-code.md` | 考察の正本Markdown |
| `003-layout-aware-diagram-as-code.html` | 図とソースを比較できる人間向けHTML |
| `assets/` | 図のソース、PNG、SVG、評価、計測結果 |
| `skills/improve-rendered-diagrams/` | Codexなどで再利用できる図改善スキル |
| `.claude/agents/` | Claude Code用エージェント |
| `.github/agents/` | GitHub Copilot用エージェント |
| `tools/` | レンダリング、計測、比較、検証ツール |
| `package.json` | このテーマ専用の実行コマンドと依存関係 |

## 単独利用

このディレクトリを作業ルートとして使用します。

```bash
cd path/to/003-layout-aware-diagram-as-code
npm ci
node skills/improve-rendered-diagrams/scripts/render-diagram.mjs --check
```

代表的な検証コマンド:

```bash
npm run render:sample:d2
npm run verify:report
```

デスクトップ・モバイルの全ページ画像も保存する場合は、`npm run verify:report -- --screenshots`を実行します。

エージェントの利用方法と既存エージェントへの組み込み方は、次を参照してください。

- `skills/improve-rendered-diagrams/references/usage-and-integration.md`
- `skills/improve-rendered-diagrams/references/usage-and-integration.html`

## 配布単位

レポート、図、評価データ、ツール、エージェント、依存定義はすべてこのフォルダ内にあります。このテーマだけを利用する場合、リポジトリのルートにある別ファイルは実行に必要ありません。
