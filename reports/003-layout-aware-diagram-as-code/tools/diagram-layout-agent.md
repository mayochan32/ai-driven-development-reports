# Diagram Layout Agent

Mermaidソースをレンダリングし、その画像をAIで評価して、見やすさの基準を満たすまでMermaidを修正する実験用エージェントです。

## 前提

- `npm install`が完了していること
- AI評価を実行する場合は`OPENAI_API_KEY`が設定されていること
- モデルを変更する場合は`OPENAI_MODEL`を設定すること

モデルの既定値は`gpt-5.6`です。

## ローカルレンダリングだけを確認する

```bash
npm run agent:diagram:render-only
```

このモードはOpenAI APIを呼び出しません。

## 保存済み評価で反復処理を検証する

```bash
npm run agent:diagram:fixture
```

保存済みの評価と修正版を使い、2回のレンダリング、評価YAML生成、停止判定までを再現します。OpenAI APIは呼び出しません。

## 評価と修正のループを実行する

```bash
npm run agent:diagram
```

既定では、必須違反がなく、評価が24/27点以上になるか、修正を2回行うと停止します。

OpenAI APIキーを使わず、認証済みCodex CLIを評価バックエンドとして使うこともできます。

```bash
npm run agent:diagram:codex
```

Codex CLIには読み取り専用の権限だけを与えます。ファイル生成とレンダリングはエージェント本体が担当します。

## 直接実行する

```bash
node tools/diagram-layout-agent.mjs \
  --input path/to/diagram.mmd \
  --requirements path/to/logical-requirements.md \
  --output-dir path/to/run-output \
  --target-score 24 \
  --max-iterations 2
```

`--requirements`には、配置を変更しても維持しなければならない論理条件を記述します。

## 生成物

反復ごとに次のファイルを生成します。

- `iteration-NN.mmd`: その反復で評価したMermaidソース
- `iteration-NN.svg`: ベクター形式のレンダリング結果
- `iteration-NN.png`: AIへ入力した画像
- `iteration-NN-evaluation.yaml`: 評価結果と修正指示
- `run-summary.yaml`: 得点推移と実行条件
- `best.mmd`、`best.svg`、`best.png`: 必須違反数と得点から選んだ最良の反復
- `best-evaluation.yaml`: 最良反復の評価
- `next-proposal.mmd`: 反復上限で未評価になった次の修正案

各評価には画像の幅、高さ、縦横比も記録します。元のMermaidソースは上書きしません。`agent-runs/`は試行用出力としてGit管理対象外です。
