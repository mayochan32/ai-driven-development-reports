# レポート作成ワークフロー

別コンテキストで作業する場合は、この手順に従う。

## 1. 素材を確認する

ユーザーから渡された素材を読み、次を整理する。

- テーマ
- 中心主張
- 想定読者
- 公開時に注意すべき情報
- 出典の有無
- 追加確認が必要な事実

この段階で、勝手にAI駆動開発全体の総論へ広げない。素材が扱っているテーマの範囲を尊重する。

## 2. レポート番号とslugを決める

既存の `reports/` を確認し、次の番号を使う。

```text
reports/<number>-<slug>/
```

例:

```text
reports/001-document-formats-comparison/
```

slugは英小文字、数字、ハイフンを基本とする。

このディレクトリは単なるレポート置き場ではなく、そのテーマの配布・保守・再現単位である。今後追加するテーマも、関連ファイルをこのディレクトリ内で完結させる。

最低限、次の4ファイルを作成する。

```text
reports/<number>-<slug>/
├── README.md
├── <number>-<slug>.md
├── <number>-<slug>.html
└── manifest.json
```

画像、データ、ツール、AIエージェント、依存定義がある場合は、同じテーマフォルダへ追加する。

## 3. 正本Markdownを作る

正本は必ず次の場所に置く。

```text
reports/<number>-<slug>/<number>-<slug>.md
```

ファイル単体でダウンロードしても内容が分かるように、`report.md` のような汎用名ではなく、テーマに沿った固有名を使う。

冒頭にはFront Matterを置く。

```yaml
---
title: "タイトル"
date: "YYYY-MM-DD"
status: "draft"
tags:
  - ai-driven-development
summary: "短い要約"
---
```

本文では、主張、根拠、出典、仮定、未確認事項を分けて書く。

## 4. 人間向けHTMLを作る

HTMLは必ず次の場所に置く。

```text
reports/<number>-<slug>/<number>-<slug>.html
```

HTMLも単体配布されることがあるため、`index.html` のような汎用名ではなく、Markdownと同じslugを使う。

HTMLはMarkdownの単純変換にしない。人間が内容を短時間で理解・比較・判断できるように再設計する。

有効なUI例:

- 要点サマリー
- 比較カード
- フィルター
- タブ
- 折りたたみ
- チェックリスト
- フロー図
- 判断JSON出力

HTMLは単一ファイルを基本とし、外部CDNや外部フォントに依存しない。CSSとJavaScriptは原則としてHTMLファイル内に埋め込み、そのHTML単体をコピーしても表示・操作できる状態にする。

## 5. テーマREADMEと関連ファイルを作る

`templates/theme-readme.template.md` を基に、テーマフォルダの入口となる `README.md` を作る。

READMEには次を記載する。

- テーマの目的
- 正本MarkdownとHTMLの場所
- `assets/`、`tools/`、`skills/`などの役割
- 再生成・検証コマンド
- テーマフォルダ単独で利用する方法

テーマ固有のファイルは、次のように同じフォルダ内へ置く。

```text
reports/<number>-<slug>/
├── assets/
├── tools/
├── skills/
├── .claude/
├── .github/
├── AGENTS.md
├── package.json
└── package-lock.json
```

必要なものだけ作成する。コマンドはテーマフォルダを作業ルートとして記述し、リポジトリルートにあるテーマ固有ファイルへ依存させない。

共通化は、同じファイルを2テーマ以上で実際に使うようになってから検討する。

## 6. 安全条件を確認する

HTMLを作成したら、最低限次を確認する。

- 外部通信がない
- 秘密情報が埋め込まれていない
- 外部スクリプトに依存していない
- 出典や仮定が表示から隠れていない
- 元Markdownへの参照がある
- 可能ならCSPを設定している

## 7. 全体カタログを更新する

トップの `README.md` と `catalog.json` のレポート一覧に追加する。

```md
| 002 | テーマ | [002-slug.md](reports/002-slug/002-slug.md) | [002-slug.html](reports/002-slug/002-slug.html) |
```

## 8. 検証する

最低限、次を確認する。

```sh
node scripts/validate-theme-packages.mjs
rg --files
git status --short
```

テーマ固有のコマンドは、テーマフォルダへ移動して実行する。

```sh
cd reports/<number>-<slug>
```

HTMLにJavaScriptがある場合は、構文とDOM参照を確認する。

```sh
node -e "const fs=require('fs'); const html=fs.readFileSync('reports/<number>-<slug>/<number>-<slug>.html','utf8'); const scripts=[...html.matchAll(/<script>([\\s\\S]*?)<\\/script>/g)].map(m=>m[1]); for (const s of scripts) new Function(s); console.log('script syntax ok:', scripts.length);"
```

可能ならブラウザで表示し、次を確認する。

- 初期表示で結論が分かる
- 主要テキストが見切れていない
- フィルターやタブが動く
- モバイル幅でも破綻しない
- 印刷時に最低限読める

さらに、そのテーマフォルダ外のテーマ固有ファイルへ依存していないことを確認する。フォルダだけを別の場所へコピーしても、READMEに書いた確認手順が成立する状態を目指す。

## 9. 報告する

作業完了時は、次を簡潔に報告する。

- 作成または更新したレポート
- Markdown正本の場所
- HTMLビューの場所
- 主な編集内容
- 実施した検証
- できなかった検証があればその理由
