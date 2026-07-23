---
title: "AI駆動開発における図の記述方針"
date: "2026-07-23"
status: "draft"
tags:
  - ai-driven-development
  - diagram-as-code
  - mermaid
  - visual-review
  - ai-agent
summary: "Diagram as Codeを論理構造の管理だけで終わらせず、レンダリング後の配置、誤読リスク、視覚品質をAIと人間のレビュー対象にする方針を、EC注文処理の実験とAIエージェント試作から考察する。"
---

# AI駆動開発における図の記述方針

## このレポートの位置づけ

このレポートは、AI駆動開発でシーケンス図、クラス図、フローチャート、構成図などを生成するときに、記述形式だけでなくレンダリング後の見た目をどこまで管理すべきかを考察する。

対象読者は、AIに設計資料を生成させる開発者、設計レビュー担当者、開発プロセスやドキュメント標準を設計するチームである。

主な対象はテキストから生成する図であり、手作業の描画ツールやデザインツールによる最終仕上げは補助的な手段として扱う。特定の図記述言語を唯一の標準として推奨することは目的としない。

更新日時は2026年7月23日である。ツールやモデルの仕様は更新される可能性があるため、導入時には公式資料と実環境で再確認する必要がある。

## 1. エグゼクティブサマリー

結論は、**Diagram as Codeだけでは不十分であり、AI駆動開発ではレンダリング後の見た目をレビュー対象として扱う必要がある**、というものである。

テキスト形式の図は、差分管理、検索、再生成、AIによる編集に向いている。しかし、ソース上の論理関係が正しくても、自動レイアウトの結果によって次の問題が起きる。

- 正常系と異常系を取り違える
- 並行処理を直列処理と誤読する
- 長い戻り線や交差線によって接続元を見失う
- 関連要素が離れ、処理のまとまりが伝わらない
- 全体表示では文字が小さく、拡大すると全体を追えない

したがって、設計情報は次の3層に分けて扱うべきである。

1. **意味層**: 要素、関係、順序、分岐、論理的不変条件
2. **表現層**: 図の種類、方向、領域、線種、ラベル、配置制約
3. **評価層**: レンダリング画像、誤読リスク、得点、修正履歴

形式選択では、Mermaidを軽量な第一候補とし、まず既定のDagreで配置する。配置上の問題がある場合はELK版も比較し、それでも改善できない場合はGraphviz DOT、D2、PlantUML、Structurizr DSLなどを目的別に使い分ける。Mermaidだけで改善できない場合は、記述を過度に細工するより、図の分割や形式変更を選ぶ。

AIは画像を見て改善案を作れるが、単純な自己修正ループは改善を保証しない。今回の自動実験では、必須違反は解消したものの、横長の図が極端な縦長へ変わり、2回の修正後も合格点へ届かなかった。AIエージェントには、最高得点の保持、客観的な画像寸法、論理的不変条件、停止条件、人間の承認が必要である。

## 2. 背景

### 2.1 テキスト化によって解決できる問題

Mermaid、PlantUML、Graphviz DOT、D2、Structurizr DSLなどは、図をテキストとして管理できる。これにより、Git差分、コードレビュー、テンプレート化、CIでの再生成、AIによる修正が可能になる。

AI駆動開発との相性も良い。AIは自然言語や設計文書から要素と関係を抽出し、図のソースへ変換できる。人間が座標を直接編集するより、変更意図をテキストで指示しやすい。

### 2.2 テキスト化だけでは解決できない問題

図のソースは意味を記述するが、読者が見るのはレンダリング結果である。自動レイアウトエンジンは一般的な規則でノードを配置するため、業務上の重要度、正常系と例外系の主従、読者が期待する視線順序までは自動的に理解しない。

この問題は構文検査だけでは検出できない。SVGが正常に生成され、すべてのノードとエッジが存在していても、人間にとって見づらい図は成立する。

### 2.3 美しさではなく誤読リスクを扱う

視覚評価を「きれいかどうか」という好みの問題にすると、再現性がない。評価対象は、図から正しい意味を読み取れるか、読み取りに不要な負荷がないか、誤読を誘発する配置になっていないかである。

本稿では、装飾品質ではなく次の9項目を評価する。

| 評価項目 | 見る内容 |
|---|---|
| 処理方向 | 左から右、上から下などの一貫性 |
| 処理順序 | 実際の順序を自然に追えるか |
| 分岐表現 | 条件と結果の対応が明確か |
| 要素配置 | 意味的に関連する要素がまとまっているか |
| 線の交差 | 交差や長い迂回線が読解を妨げないか |
| ラベル | 文字が判読でき、意味が明確か |
| 視覚的階層 | 正常、失敗、補償、非同期などを区別できるか |
| 情報量 | 一枚の図として過不足がないか |
| 対称性 | 同型の要素や処理が対応関係の分かる対称配置になっているか |

対称性は単なる整った外観ではない。在庫処理と審査処理、配送処理と通知処理のような同型または対になる構造を同じ軸、順序、形状で配置すると、対応関係を短時間で把握できる。片側だけに処理、条件、例外が存在する場合も、その差が目立つため、漏れや間違いを検出しやすい。

一方、意味や責務が異なる処理を見た目のために無理に対称化してはならない。意図的な非対称がある場合は、形やラベルによって理由を示す。対称性は意味の同型性を可視化するための評価項目である。

この9項目版を評価基準v2.0とする。各項目は0〜3点、合計27点とした。24〜27点を公開可能、20〜23点を軽微な改善、14〜19点を再構成が必要、0〜13点を図の種類や分割方法から再検討とする。

ただし、文字切れ、ノードや線の重なり、矢印の判別不能、実際と異なる順序に見える配置などは必須違反とし、合計点にかかわらず修正対象とする。

## 3. 中心主張

### 3.1 意味と配置を分離する

図の生成前に、図のソースとは独立した正規化設計情報を用意する必要がある。今回のサンプルでは、在庫引当と不正審査を並行開始すること、両方が完了するまで決済しないこと、保存失敗時は決済取消と在庫解放を行うことなどを論理的不変条件として定義した。

AIがレイアウトを改善するときは、この不変条件を変更してはならない。見やすくするためにノードを削除したり、並行処理を直列化したり、例外処理を正常系へ統合したりすれば、図は簡潔になっても設計資料として誤りになる。

### 3.2 レンダリング画像を正規のレビュー入力にする

ソースレビューと画像レビューは目的が異なる。

| レビュー対象 | 主に確認できること |
|---|---|
| 正規化設計情報 | 業務ロジック、制約、不変条件 |
| 図のソース | ノード、エッジ、構文、スタイル指定 |
| レンダリング画像 | 配置、交差、文字サイズ、余白、誤読リスク |

AIエージェントには図のソースだけでなく、実際に生成したPNGまたはSVGを入力する。評価結果には、対象画像名、画像寸法、各項目の得点、根拠、誤読リスク、修正指示を残す。

### 3.3 自動レイアウトを使い切ってから形式を変える

最初から座標を固定すると、設計変更のたびに配置調整が必要になる。まず自動レイアウトと意味的な制約を使う。

- 処理方向を指定する
- 関連処理を領域やサブグラフにまとめる
- 正常系を主軸に置く
- 失敗系と補償処理を別領域へ集約する
- 並行処理の分岐点とAND合流点を明示する
- 非同期処理と再試行を主トランザクションから分離する
- 色だけでなく、形状、線種、ラベルを併用する

これでも線が長い、交差が多い、縦横比が極端になる場合は、図を分割するか、より強い配置制約を持つ形式へ切り替える。

## 4. 記述形式の選択

### 4.1 形式別の位置づけ

| 形式 | 適する用途 | 配置制御 | AI生成のしやすさ | 主な注意点 |
|---|---|---:|---:|---|
| Mermaid | Markdown内の軽量なフロー、シーケンス、クラス図 | 低〜中 | 高 | 標準のDagreで開始し、複雑図ではELK版も比較する |
| PlantUML | UMLを中心とした詳細設計 | 中 | 高 | 隠し線などの調整が増えると保守しにくい |
| Graphviz DOT | 依存関係、状態遷移、配置制約が重要なグラフ | 高 | 中 | UML固有表現は自分で設計する必要がある |
| D2 | 構成図、依存図、複数レイアウトエンジンの比較 | 中〜高 | 高 | チームの導入経験とレンダラー準備が必要 |
| Structurizr DSL | C4モデルに基づくアーキテクチャ図 | 中〜高 | 中 | 汎用フローチャートには向かない |

Mermaidは、既存Markdownへ埋め込みやすく、構文も軽量である。単純な図では自動配置だけで十分な結果になる。一方、配置要件が中心になる図では、Graphviz DOTのrank、cluster、constraintや、D2のレイアウトエンジン選択の方が適する場合がある。

PlantUMLはUML表現に強く、Structurizr DSLはC4モデルとビューを分離できる。形式はチームで一つに固定するより、図の目的と配置要件で選択する方がよい。

### 4.2 推奨する選択手順

1. 読者が図から判断すべきことを一文で定義する。
2. 正規化設計情報と論理的不変条件を作る。
3. 単純な図はMermaidで生成する。
4. レンダリング画像を評価する。
5. 領域化、方向、合流点、線種で改善する。
6. 改善しても20点未満なら、図の分割または形式変更を検討する。
7. 公開前に人間が誤読リスクと論理的不変条件を確認する。

## 5. サンプル実験

### 5.1 題材

題材は、中程度の複雑さを持つEC注文処理とした。

- 在庫引当と不正審査を並行実行
- 不正審査から手動審査へ分岐
- 在庫確保と審査通過をAND条件で合流
- 決済失敗と保存失敗に補償処理
- 注文確定後に配送と通知を非同期実行
- 通知失敗時にキューへ登録して再試行

単純な注文処理も作成したが、ほぼ一本の流れであるためMermaidの自動配置で十分に整った。このこと自体が、単純な図では追加のレイアウト制御が不要であることを示す対照例になった。

### 5.2 レイアウト調整前

調整前は、論理関係を一枚の`flowchart LR`へ記述し、領域やレイアウト補助を付けなかった。

![レイアウト調整前の注文処理](assets/sample-order-flow-medium-mermaid.png)

出力は2584×595で、極端に横長になった。在庫不足から注文失敗への線、注文中止から在庫解放への線、通知再試行の戻り線などが長くなった。全体表示では文字が小さく、拡大すると全体経路を同時に追えない。

初回評価は15/27点で「再構成が必要」とした。特に、AND合流の曖昧さ、失敗要素の距離、視覚的階層の不足、対応する処理の非対称な配置が問題だった。

### 5.3 人間が方針を与えた改善

次の方針を与えてMermaidを修正した。

- 受付、前提条件、決済と保存、注文確定後処理、補償処理を領域化
- AND合流を専用ノードで明示
- 正常系、判断、合流、失敗、非同期処理を形状、色、ラベルで区別
- 補償処理と再試行を破線化
- ELKレイアウトを使用

![人間が方針を与えた改善版](assets/sample-order-flow-medium-improved.png)

評価は25/27点となった。在庫引当と不正審査、配送と通知を対応する枝として配置したことで、対称性も改善した。一方、出力は1312×2619の縦長になり、全体把握にはスクロールが必要になった。交差を減らすことと一覧性の間にトレードオフがある。

### 5.4 AIエージェントによる自動修正

試作エージェントは次の処理を行う。

```text
Mermaid入力
  → SVG・PNGへレンダリング
  → PNG、ソース、不変条件をAIへ入力
  → 9項目で評価
  → 修正版Mermaidを保存
  → 再レンダリング
  → 合格点または反復上限で停止
```

Codex CLIを読み取り専用の画像評価バックエンドとして実行した結果は次のとおりだった。

| 反復 | 得点 | 必須違反 | 判定 |
|---|---:|---:|---|
| 初期図 | 10/27 | 2 | 再構成が必要 |
| 修正1 | 12/27 | 0 | 図の種類や分割方法から再検討 |
| 修正2 | 14/27 | 0 | 再構成が必要 |
| 上限後の次案を別途評価 | 14/27 | 0 | 再構成が必要 |

上表は、当初の8項目による実験結果へ、レンダリング画像を再確認した対称性得点を加えた再集計値である。

AIは領域分け、ラベル、必須違反の解消には成功した。しかし、横長を改善する過程で図が極端に縦長になり、大きな未使用領域と長い失敗線が残った。得点は途中まで上昇したが、次案では対称性が改善しても総合点は横ばいになった。

この実験から、AIによる反復修正は単調増加ではなく、最後の案が最良とは限らないことが分かった。

### 5.5 得点解釈上の注意

人間が方針を与えた改善実験と、自動エージェント実験では、評価を行ったセッションと生成過程が異なる。したがって、25点と14点をモデル能力の直接比較として扱ってはならない。

得点は同じ評価者、同じプロンプト、同じレンダリング条件の中での推移を見るために使う。評価者間の絶対点を比較する場合は、複数評価者による校正、アンカー画像、再評価が必要である。

## 6. AIエージェントの設計方針

### 6.1 必須入力

- 正規化された設計情報
- 論理的不変条件
- 現在の図のソース
- 実際のレンダリング画像
- 評価尺度と必須違反
- 目標点と反復上限

### 6.2 必須出力

- 各項目の得点と満点
- 得点根拠
- 必須違反
- 想定される誤読
- 具体的な修正指示
- 修正版の図ソース
- 画像寸法と縦横比
- 使用モデル、反復番号、停止理由

### 6.3 制御上の要件

1. **元ファイルを上書きしない**: 反復ごとにソースと画像を保存する。
2. **最高得点を保持する**: 最後の案ではなく、必須違反数と得点で最良案を選ぶ。
3. **反復上限を設ける**: 無制限な自己修正を防ぐ。
4. **論理的不変条件を検査する**: 見た目の改善による意味変更を防ぐ。
5. **客観情報を併用する**: 画像寸法、縦横比、交差数などを可能な範囲で計測する。
6. **候補を比較する**: 一案ずつの自己修正だけでなく、方向やレイアウトエンジンの異なる候補を生成して比較する。
7. **人間の承認を残す**: 公開可否をAI得点だけで決めない。

今回の試作では、元ファイル保護、最高得点保持、画像寸法記録、反復上限、構造化YAML出力を実装した。本レポートの検証では、交差数の近似計測、空白率と文字サイズの計測、複数候補の比較、独立した意味検証エージェントも試作した。これらの結果と限界は第9節に示す。

### 6.4 再利用可能なエージェント

本レポートで整理した制御要件は、`improve-rendered-diagrams` という共通スキルと、実行環境別のエージェント定義として実装した。

- **Codex**: `skills/improve-rendered-diagrams/SKILL.md`
- **Claude Code**: `.claude/agents/improve-rendered-diagrams.md`
- **GitHub Copilot**: `.github/agents/improve-rendered-diagrams.agent.md`

Claude Code版とGitHub Copilot版も、Mermaid、Graphviz DOT、D2、PlantUMLのレンダリング、PNGの目視、9項目27点評価、論理的不変条件の確認、最大3回の改善、最高得点候補の保持を必須手順とする。エージェント定義は実行環境ごとに分けるが、評価尺度、形式別ガイド、レンダリングスクリプトは同じ共通スキルを利用する。画像を表示できない実行環境では、視覚評価を完了したと判定せず、未評価項目を明示する。

具体的な起動方法、既存エージェントへの組み込みパターン、入出力例、導入確認手順は、正本 `skills/improve-rendered-diagrams/references/usage-and-integration.md` と人間向けHTML版 `skills/improve-rendered-diagrams/references/usage-and-integration.html` にまとめた。

## 7. 実務上の示唆

### 7.1 チーム標準に入れるべきもの

- 図のソースだけでなくレンダリング画像もレビューする
- 図ごとに目的と対象読者を記載する
- 正常系、異常系、補償、非同期処理の表現規則を決める
- 公開可能な縦横比、最小文字サイズ、最大情報量の目安を決める
- 対になる要素や同型処理を対称に配置し、意図的な非対称には理由を表示する
- 図を分割する判断基準を決める
- CIで構文とレンダリング成功を確認する
- AI評価は根拠と修正指示を構造化データで残す

### 7.2 推奨ワークフロー

```text
設計情報を正規化
  → 図の目的と形式を選択
  → 図ソースを生成
  → レンダリング
  → 構文・意味・見た目を別々に評価
  → 複数の改善候補を生成
  → 最良候補を保持
  → 人間が最終確認
  → ソース、画像、評価履歴を公開
```

### 7.3 形式を変更する判断

次の状態が続く場合は、Mermaidの記述調整を続けるより、図の分割または形式変更を検討する。

- 20/27点未満が複数回続く
- 縦横比を直すと線の交差が増える
- 隠し線や宣言順など、意味と無関係な記述が増える
- 正常系と補償系を一枚で追えない
- レイアウトエンジンを変えても関連要素が離れる
- レビュー時に毎回同じ誤読が起きる

## 8. 注意点・未確認事項

- 得点には評価者間のばらつきがある。絶対点を品質保証値として扱わない。
- Mermaid、Graphviz、D2、PlantUMLの結果はバージョン、レイアウトエンジン、表示幅によって変わる。
- 今回はEC注文処理一題のみであり、題材による一般化には限界がある。
- SVG経路から求めた交差数は近似値である。transform、線の重なり、ノード内通過を完全には評価しない。
- 最小文字サイズはSVGの宣言値であり、最終表示倍率における物理的な可読サイズではない。
- 独立した意味検証エージェントは自然言語による照合であり、形式検証やモデル検査の代替ではない。
- 複数の人間評価者による校正は、参加者を招集できない実行環境のため未完了である。代わりに独立AI評価3回の代理実験と、人間用評価票を作成した。
- OpenAI APIやCodex CLIを使う構成では、送信する設計情報に機密情報や個人情報が含まれないか確認し、組織のデータ取扱方針に従う必要がある。
- AIの「公開可能」判定を承認の代替にしない。安全性、法令、監査、業務上の責任を伴う図は人間が確認する。

## 9. 形式比較と検証結果

### 9.1 レンダリング結果と記述テキストの比較

同一のEC注文処理をMermaid標準、Mermaid + ELK、PlantUML 1.2026.6、Graphviz 15.1.0、D2 0.7.1で記述し、実際にPNGとSVGへレンダリングした（Mermaidは11.16.0）。図だけを比較すると、どの配置指定が結果へ影響したか確認しにくい。このため、各形式についてレンダリング結果と入力テキストを一組で掲載する。

Mermaidでは、図の記述とは別に、要素の位置を決める自動配置エンジンを選べる。本稿の**Mermaid標準はDagre**を使用しており、ELKへ全面移行したわけではない。

- **Dagre:** Mermaidの既定値。単純から中規模の階層的な図に使いやすく、指定を省略したMermaidは原則としてDagreで配置される。本稿でも比較の基準候補として残す。
- **ELK:** **Eclipse Layout Kernel**の略。図の記述形式や描画形式ではなく、ノード、線、ポートなどの位置や寸法を計算する別の自動配置エンジンである。同じMermaid記法のまま`layout: elk`で選択できる。

- **効果が出やすい図:** フローチャート、ER図、依存関係図、クラス図、コンポーネント図など、ノードとエッジの自動配置が読みやすさを左右する図。
- **効果が限定的な図:** シーケンス図など、図種専用の配置規則を持つ図。MermaidでELKを指定しても適用されない場合があり、標準版と同じ結果になることもある。
- **実務上の判断:** まずDagreで作り、配置上の問題がある場合にELK版も生成する。ELKを指定すれば必ず改善するわけではないため、交差、対称性、流れ、縦横比を比較して採用する。

したがって、Dagreを使わなくするのではなく、**Dagreを基準候補、ELKを改善候補として併用する**。本稿でも同じ題材を両方でレンダリングして比較する。

| 比較ラベル | 記述形式 | 配置エンジン |
|---|---|---|
| Mermaid標準 | Mermaid | Dagre（既定値） |
| Mermaid + ELK | Mermaid | ELK |
| PlantUML | PlantUML | PlantUML標準配置（本稿では明示切替なし） |
| Graphviz DOT | DOT | Graphvizの`dot`。Dagreは使用しない |
| D2 | D2 | DagreとELKを比較。本稿のフローチャートはELKを採用 |

つまり、**Graphviz DOTとDagreは組み合わせていないが、D2とDagreは組み合わせている**。D2ではDagreが既定の配置エンジンであり、本稿ではDagre版を比較候補として残したうえで、見た目の評価が高かったELK版を掲載している。

#### Mermaid標準（Dagre）

![Mermaid標準版](assets/sample-order-flow-medium-mermaid.png)

```mermaid
%% 中程度の複雑さを持つ、レイアウト調整前のMermaidサンプル
%% 並行処理、合流、補償処理、非同期再試行を一枚で表現する
flowchart LR
    START["ユーザーが注文"] --> API["注文APIが注文を受け付ける"]

    API --> INVENTORY["在庫サービスへ引当を依頼"]
    INVENTORY --> INVENTORY_RESULT{"在庫を確保できた?"}
    INVENTORY_RESULT -->|はい| INVENTORY_READY["在庫確保完了"]
    INVENTORY_RESULT -->|いいえ| ORDER_FAIL["注文失敗をWeb画面へ返す"]

    API --> FRAUD["不正検知サービスへ審査を依頼"]
    FRAUD --> FRAUD_RESULT{"審査結果"}
    FRAUD_RESULT -->|承認| FRAUD_OK["審査通過"]
    FRAUD_RESULT -->|要確認| MANUAL["担当者が手動審査"]
    FRAUD_RESULT -->|拒否| CANCEL["注文を中止"]
    MANUAL --> MANUAL_RESULT{"手動審査結果"}
    MANUAL_RESULT -->|承認| FRAUD_OK
    MANUAL_RESULT -->|拒否| CANCEL

    INVENTORY_READY --> READY["在庫確保と審査通過を待機"]
    FRAUD_OK --> READY
    READY --> PAYMENT["決済サービスへ決済を依頼"]
    PAYMENT --> PAYMENT_RESULT{"決済成功?"}
    PAYMENT_RESULT -->|成功| SAVE["注文DBへ確定注文を保存"]
    PAYMENT_RESULT -->|失敗| RELEASE["引当済みなら在庫を解放"]

    SAVE --> SAVE_RESULT{"注文保存成功?"}
    SAVE_RESULT -->|失敗| REFUND["決済を取消または返金"]
    REFUND --> RELEASE
    CANCEL --> RELEASE
    RELEASE --> ORDER_FAIL

    SAVE_RESULT -->|成功| RESPOND["注文成功をWeb画面へ返す"]
    SAVE_RESULT -->|成功| SHIP["配送サービスへ配送を依頼"]
    SAVE_RESULT -->|成功| NOTIFY["通知サービスへ確認通知を依頼"]

    SHIP --> SHIP_RESULT{"配送依頼成功?"}
    SHIP_RESULT -->|成功| SHIP_DONE["配送手配完了"]
    SHIP_RESULT -->|失敗| OPS["運用担当者へ対応を依頼"]

    NOTIFY --> NOTIFY_RESULT{"通知成功?"}
    NOTIFY_RESULT -->|成功| NOTIFY_DONE["通知完了"]
    NOTIFY_RESULT -->|失敗| NOTIFY_QUEUE["通知キューへ登録"]
    NOTIFY_QUEUE --> NOTIFY
```

#### Mermaid + ELK

![Mermaid改善版](assets/sample-order-flow-medium-improved.png)

```mermaid
---
config:
  layout: elk
---
flowchart TB
    subgraph INTAKE["1. 注文受付"]
        direction LR
        START["ユーザーが注文"] --> API["注文APIが注文を受け付ける"]
    end

    subgraph PRECONDITIONS["2. 注文前提条件（並行処理）"]
        direction LR
        INVENTORY["在庫サービスへ引当を依頼"] --> INVENTORY_RESULT{"在庫を確保できた?"}
        INVENTORY_RESULT -->|はい| INVENTORY_READY["在庫確保完了"]

        FRAUD["不正検知サービスへ審査を依頼"] --> FRAUD_RESULT{"審査結果"}
        FRAUD_RESULT -->|承認| FRAUD_OK["審査通過"]
        FRAUD_RESULT -->|要確認| MANUAL["担当者が手動審査"]
        MANUAL --> MANUAL_RESULT{"手動審査結果"}
        MANUAL_RESULT -->|承認| FRAUD_OK

        INVENTORY_READY --> READY{{"AND合流<br/>在庫確保 + 審査通過"}}
        FRAUD_OK --> READY
    end

    subgraph COMMIT["3. 決済と注文確定"]
        direction LR
        PAYMENT["決済サービスへ決済を依頼"] --> PAYMENT_RESULT{"決済成功?"}
        PAYMENT_RESULT -->|成功| SAVE["注文DBへ確定注文を保存"]
        SAVE --> SAVE_RESULT{"注文保存成功?"}
        SAVE_RESULT -->|成功| RESPOND["注文成功をWeb画面へ返す"]
    end

    subgraph AFTER_COMMIT["4. 注文確定後（非同期処理）"]
        direction LR
        ASYNC["非同期処理を開始"]

        ASYNC --> SHIP["配送サービスへ配送を依頼"]
        SHIP --> SHIP_RESULT{"配送依頼成功?"}
        SHIP_RESULT -->|成功| SHIP_DONE["配送手配完了"]
        SHIP_RESULT -->|失敗| OPS["運用担当者へ対応を依頼"]

        ASYNC --> NOTIFY["通知サービスへ確認通知を依頼"]
        NOTIFY --> NOTIFY_RESULT{"通知成功?"}
        NOTIFY_RESULT -->|成功| NOTIFY_DONE["通知完了"]
        NOTIFY_RESULT -->|失敗| NOTIFY_QUEUE["通知キューへ登録"]
        NOTIFY_QUEUE -.->|再試行| NOTIFY
    end

    subgraph COMPENSATION["失敗・補償処理"]
        direction LR
        CANCEL["注文を中止"] -.->|必要な場合だけ| RELEASE["引当済み在庫を解放"]
        REFUND["決済を取消または返金"] -.-> RELEASE
        RELEASE --> ORDER_FAIL["注文失敗をWeb画面へ返す"]
    end

    API --> INVENTORY
    API --> FRAUD
    READY --> PAYMENT

    INVENTORY_RESULT -->|いいえ| ORDER_FAIL
    FRAUD_RESULT -->|拒否| CANCEL
    MANUAL_RESULT -->|拒否| CANCEL
    PAYMENT_RESULT -->|失敗| RELEASE
    SAVE_RESULT -->|失敗| REFUND
    SAVE_RESULT -.->|注文確定後に非同期実行| ASYNC

    classDef normal fill:#e8f3ff,stroke:#2563eb,color:#172033,stroke-width:1.5px
    classDef decision fill:#fff7d6,stroke:#a16207,color:#3f2d0a,stroke-width:1.5px
    classDef join fill:#e6f7ed,stroke:#15803d,color:#163d24,stroke-width:2px
    classDef failure fill:#fdecec,stroke:#b42318,color:#4a1712,stroke-width:1.5px
    classDef async fill:#f3efff,stroke:#6d4aff,color:#2c2254,stroke-width:1.5px

    class START,API,INVENTORY,INVENTORY_READY,FRAUD,FRAUD_OK,MANUAL,PAYMENT,SAVE,RESPOND normal
    class INVENTORY_RESULT,FRAUD_RESULT,MANUAL_RESULT,PAYMENT_RESULT,SAVE_RESULT,SHIP_RESULT,NOTIFY_RESULT decision
    class READY join
    class CANCEL,REFUND,RELEASE,ORDER_FAIL failure
    class ASYNC,SHIP,SHIP_DONE,OPS,NOTIFY,NOTIFY_DONE,NOTIFY_QUEUE async
```

#### PlantUML

![PlantUML版](assets/sample-order-flow-medium-plantuml.png)

```plantuml
@startuml
top to bottom direction
skinparam backgroundColor white
skinparam shadowing false
skinparam roundcorner 10
skinparam defaultFontName "Hiragino Sans"
skinparam defaultFontSize 12
skinparam ArrowColor #52606D
skinparam ArrowFontColor #364152
skinparam ArrowFontSize 10
skinparam packageStyle rectangle
skinparam packageBorderColor #A8C7FA
skinparam packageBackgroundColor white
skinparam rectangleBorderColor #2563EB
skinparam rectangleBackgroundColor #E8F3FF
skinparam rectangleFontColor #172033
skinparam diamondBorderColor #A16207
skinparam diamondBackgroundColor #FFF7D6
skinparam diamondFontColor #3F2D0A

package "1. 注文受付" as INTAKE {
  rectangle "ユーザーが注文" as START
  rectangle "注文APIが注文を受け付ける" as API
  START --> API
}

package "2. 注文前提条件（並行処理）" as PRE {
  rectangle "並行開始" as FORK #FFF7D6

  rectangle "在庫サービスへ\n引当を依頼" as INVENTORY
  rectangle "在庫を確保\nできた?" as INVENTORY_RESULT #FFF7D6
  rectangle "在庫確保完了" as INVENTORY_READY

  rectangle "不正検知サービスへ\n審査を依頼" as FRAUD
  rectangle "審査結果" as FRAUD_RESULT #FFF7D6
  rectangle "担当者が手動審査" as MANUAL
  rectangle "手動審査結果" as MANUAL_RESULT #FFF7D6
  rectangle "審査通過" as FRAUD_OK

  rectangle "AND合流\n在庫確保 + 審査通過" as READY #E6F7ED

  FORK --> INVENTORY
  FORK --> FRAUD
  INVENTORY --> INVENTORY_RESULT
  INVENTORY_RESULT --> INVENTORY_READY : はい
  FRAUD --> FRAUD_RESULT
  FRAUD_RESULT --> FRAUD_OK : 承認
  FRAUD_RESULT --> MANUAL : 要確認
  MANUAL --> MANUAL_RESULT
  MANUAL_RESULT --> FRAUD_OK : 承認
  INVENTORY_READY --> READY
  FRAUD_OK --> READY

  INVENTORY -[hidden]right-> FRAUD
  INVENTORY_RESULT -[hidden]right-> FRAUD_RESULT
  INVENTORY_READY -[hidden]right-> FRAUD_OK
}

package "3. 決済と注文確定" as COMMIT {
  rectangle "決済サービスへ\n決済を依頼" as PAYMENT
  rectangle "決済成功?" as PAYMENT_RESULT #FFF7D6
  rectangle "注文DBへ確定注文を保存" as SAVE
  rectangle "注文保存成功?" as SAVE_RESULT #FFF7D6
  rectangle "注文成功をWeb画面へ返す" as RESPOND

  PAYMENT --> PAYMENT_RESULT
  PAYMENT_RESULT --> SAVE : 成功
  SAVE --> SAVE_RESULT
  SAVE_RESULT --> RESPOND : 成功
}

package "4. 注文確定後（非同期処理）" as AFTER #FFFFFF {
  rectangle "非同期処理を開始" as ASYNC #F3EFFF
  rectangle "配送サービスへ\n配送を依頼" as SHIP #F3EFFF
  rectangle "配送依頼成功?" as SHIP_RESULT #FFF7D6
  rectangle "配送手配完了" as SHIP_DONE #F3EFFF
  rectangle "運用担当者へ\n対応を依頼" as OPS #F3EFFF
  rectangle "通知サービスへ\n確認通知を依頼" as NOTIFY #F3EFFF
  rectangle "通知成功?" as NOTIFY_RESULT #FFF7D6
  rectangle "通知完了" as NOTIFY_DONE #F3EFFF
  rectangle "通知キューへ登録" as NOTIFY_QUEUE #F3EFFF

  ASYNC --> SHIP
  ASYNC --> NOTIFY
  SHIP --> SHIP_RESULT
  SHIP_RESULT --> SHIP_DONE : 成功
  SHIP_RESULT --> OPS : 失敗
  NOTIFY --> NOTIFY_RESULT
  NOTIFY_RESULT --> NOTIFY_DONE : 成功
  NOTIFY_RESULT --> NOTIFY_QUEUE : 失敗
  NOTIFY_QUEUE ..> NOTIFY : 再試行

  SHIP -[hidden]right-> NOTIFY
  SHIP_RESULT -[hidden]right-> NOTIFY_RESULT
  SHIP_DONE -[hidden]right-> NOTIFY_DONE
}

package "失敗・補償処理" as COMP #FFFFFF {
  rectangle "注文を中止" as CANCEL #FDECEC
  rectangle "決済を取消または返金" as REFUND #FDECEC
  rectangle "引当済み在庫を解放" as RELEASE #FDECEC
  rectangle "注文失敗をWeb画面へ返す" as ORDER_FAIL #FDECEC
  CANCEL ..> RELEASE : 必要な場合だけ
  REFUND ..> RELEASE
  RELEASE --> ORDER_FAIL
  CANCEL -[hidden]right-> REFUND
}

API --> FORK
READY --> PAYMENT
SAVE_RESULT ..> ASYNC : 注文確定後
INVENTORY_RESULT -[#B42318]-> ORDER_FAIL : いいえ
FRAUD_RESULT -[#B42318]-> CANCEL : 拒否
MANUAL_RESULT -[#B42318]-> CANCEL : 拒否
PAYMENT_RESULT -[#B42318]-> RELEASE : 失敗
SAVE_RESULT -[#B42318]-> REFUND : 失敗

COMMIT -[hidden]right-> COMP
AFTER -[hidden]right-> COMP
@enduml
```

PlantUMLではパッケージによる領域化、隠しリンクによる同型処理の位置合わせ、色と線種による役割分離を指定した。

#### Graphviz DOT

![Graphviz DOT版](assets/sample-order-flow-medium-graphviz.png)

```dot
digraph OrderFlow {
  graph [
    rankdir=TB,
    compound=true,
    newrank=true,
    splines=ortho,
    nodesep=0.38,
    ranksep=0.58,
    pad=0.18,
    bgcolor="white",
    fontname="Hiragino Sans"
  ];
  node [shape=box, style="rounded,filled", fillcolor="#e8f3ff", color="#2563eb", fontcolor="#172033", fontname="Hiragino Sans", fontsize=12, margin="0.14,0.09"];
  edge [color="#52606d", fontcolor="#364152", fontname="Hiragino Sans", fontsize=10, arrowsize=0.72];

  subgraph cluster_intake {
    label="1. 注文受付"; color="#a8c7fa"; style="rounded";
    start [label="ユーザーが注文"];
    api [label="注文APIが注文を受け付ける"];
    start -> api;
  }

  subgraph cluster_preconditions {
    label="2. 注文前提条件（並行処理）"; color="#a8c7fa"; style="rounded";
    fork [label="並行開始", shape=diamond, fillcolor="#fff7d6", color="#a16207"];

    inventory [label="在庫サービスへ\n引当を依頼"];
    inventory_result [label="在庫を確保\nできた?", shape=diamond, fillcolor="#fff7d6", color="#a16207"];
    inventory_ready [label="在庫確保完了"];

    fraud [label="不正検知サービスへ\n審査を依頼"];
    fraud_result [label="審査結果", shape=diamond, fillcolor="#fff7d6", color="#a16207"];
    manual [label="担当者が手動審査"];
    manual_result [label="手動審査結果", shape=diamond, fillcolor="#fff7d6", color="#a16207"];
    fraud_ok [label="審査通過"];
    ready [label="AND合流\n在庫確保 + 審査通過", shape=hexagon, fillcolor="#e6f7ed", color="#15803d", penwidth=2];

    { rank=same; inventory; fraud; }
    { rank=same; inventory_result; fraud_result; }
    { rank=same; inventory_ready; fraud_ok; }
    fork -> inventory;
    fork -> fraud;
    inventory -> inventory_result;
    inventory_result -> inventory_ready [label="はい"];
    fraud -> fraud_result;
    fraud_result -> fraud_ok [label="承認"];
    fraud_result -> manual [label="要確認"];
    manual -> manual_result;
    manual_result -> fraud_ok [label="承認"];
    inventory_ready -> ready;
    fraud_ok -> ready;
  }

  subgraph cluster_commit {
    label="3. 決済と注文確定"; color="#a8c7fa"; style="rounded";
    payment [label="決済サービスへ\n決済を依頼"];
    payment_result [label="決済成功?", shape=diamond, fillcolor="#fff7d6", color="#a16207"];
    save [label="注文DBへ確定注文を保存"];
    save_result [label="注文保存成功?", shape=diamond, fillcolor="#fff7d6", color="#a16207"];
    respond [label="注文成功をWeb画面へ返す"];
    payment -> payment_result;
    payment_result -> save [label="成功"];
    save -> save_result;
    save_result -> respond [label="成功"];
  }

  subgraph cluster_after {
    label="4. 注文確定後（非同期処理）"; color="#8b7bd8"; style="rounded,dashed";
    async [label="非同期処理を開始", fillcolor="#f3efff", color="#6d4aff"];
    ship [label="配送サービスへ\n配送を依頼", fillcolor="#f3efff", color="#6d4aff"];
    ship_result [label="配送依頼成功?", shape=diamond, fillcolor="#fff7d6", color="#a16207"];
    ship_done [label="配送手配完了", fillcolor="#f3efff", color="#6d4aff"];
    ops [label="運用担当者へ\n対応を依頼", fillcolor="#f3efff", color="#6d4aff"];
    notify [label="通知サービスへ\n確認通知を依頼", fillcolor="#f3efff", color="#6d4aff"];
    notify_result [label="通知成功?", shape=diamond, fillcolor="#fff7d6", color="#a16207"];
    notify_done [label="通知完了", fillcolor="#f3efff", color="#6d4aff"];
    notify_queue [label="通知キューへ登録", fillcolor="#f3efff", color="#6d4aff"];

    { rank=same; ship; notify; }
    { rank=same; ship_result; notify_result; }
    { rank=same; ship_done; notify_done; }
    async -> ship;
    async -> notify;
    ship -> ship_result;
    ship_result -> ship_done [label="成功"];
    ship_result -> ops [label="失敗"];
    notify -> notify_result;
    notify_result -> notify_done [label="成功"];
    notify_result -> notify_queue [label="失敗"];
    notify_queue -> notify [label="再試行", style=dashed, constraint=false];
  }

  subgraph cluster_compensation {
    label="失敗・補償処理"; color="#d55c50"; style="rounded,dashed";
    cancel [label="注文を中止", fillcolor="#fdecec", color="#b42318"];
    refund [label="決済を取消または返金", fillcolor="#fdecec", color="#b42318"];
    release [label="引当済み在庫を解放", fillcolor="#fdecec", color="#b42318"];
    order_fail [label="注文失敗をWeb画面へ返す", fillcolor="#fdecec", color="#b42318"];
    { rank=same; cancel; refund; }
    cancel -> release [label="必要な場合だけ", style=dashed];
    refund -> release [style=dashed];
    release -> order_fail;
  }

  api -> fork;
  ready -> payment;
  save_result -> async [label="注文確定後", style=dashed];
  inventory_result -> order_fail [label="いいえ", color="#b42318"];
  fraud_result -> cancel [label="拒否", color="#b42318"];
  manual_result -> cancel [label="拒否", color="#b42318"];
  payment_result -> release [label="失敗", color="#b42318"];
  save_result -> refund [label="失敗", color="#b42318"];
}
```

Graphvizでは`cluster`、`rank=same`、`constraint`、直交線を指定した。

#### D2

![D2版](assets/sample-order-flow-medium-d2.png)

```d2
direction: down

classes: {
  normal: { style: { fill: "#e8f3ff"; stroke: "#2563eb"; font-color: "#172033" } }
  decision: { shape: diamond; style: { fill: "#fff7d6"; stroke: "#a16207"; font-color: "#3f2d0a" } }
  join: { shape: hexagon; style: { fill: "#e6f7ed"; stroke: "#15803d"; stroke-width: 2 } }
  failure: { style: { fill: "#fdecec"; stroke: "#b42318"; font-color: "#4a1712" } }
  async: { style: { fill: "#f3efff"; stroke: "#6d4aff"; font-color: "#2c2254" } }
}

intake: 1. 注文受付 {
  direction: right
  start: ユーザーが注文 { class: normal }
  api: 注文APIが注文を受け付ける { class: normal }
  start -> api
}

pre: 2. 注文前提条件（並行処理） {
  direction: down
  fork: 並行開始 { class: decision }
  inventory: 在庫サービスへ引当を依頼 { class: normal }
  inventory_result: 在庫を確保できた? { class: decision }
  inventory_ready: 在庫確保完了 { class: normal }
  fraud: 不正検知サービスへ審査を依頼 { class: normal }
  fraud_result: 審査結果 { class: decision }
  manual: 担当者が手動審査 { class: normal }
  manual_result: 手動審査結果 { class: decision }
  fraud_ok: 審査通過 { class: normal }
  ready: AND合流\n在庫確保 + 審査通過 { class: join }

  fork -> inventory -> inventory_result
  inventory_result -> inventory_ready: はい
  fork -> fraud -> fraud_result
  fraud_result -> fraud_ok: 承認
  fraud_result -> manual: 要確認
  manual -> manual_result
  manual_result -> fraud_ok: 承認
  inventory_ready -> ready
  fraud_ok -> ready
}

commit: 3. 決済と注文確定 {
  direction: right
  payment: 決済サービスへ決済を依頼 { class: normal }
  payment_result: 決済成功? { class: decision }
  save: 注文DBへ確定注文を保存 { class: normal }
  save_result: 注文保存成功? { class: decision }
  respond: 注文成功をWeb画面へ返す { class: normal }
  payment -> payment_result
  payment_result -> save: 成功
  save -> save_result
  save_result -> respond: 成功
}

after: 4. 注文確定後（非同期処理） {
  direction: down
  async_start: 非同期処理を開始 { class: async }
  ship: 配送サービスへ配送を依頼 { class: async }
  ship_result: 配送依頼成功? { class: decision }
  ship_done: 配送手配完了 { class: async }
  ops: 運用担当者へ対応を依頼 { class: async }
  notify: 通知サービスへ確認通知を依頼 { class: async }
  notify_result: 通知成功? { class: decision }
  notify_done: 通知完了 { class: async }
  notify_queue: 通知キューへ登録 { class: async }

  async_start -> ship -> ship_result
  ship_result -> ship_done: 成功
  ship_result -> ops: 失敗
  async_start -> notify -> notify_result
  notify_result -> notify_done: 成功
  notify_result -> notify_queue: 失敗
  notify_queue -> notify: 再試行 { style.stroke-dash: 4 }
}

comp: 失敗・補償処理 {
  direction: right
  style: { stroke: "#b42318"; stroke-dash: 4 }
  cancel: 注文を中止 { class: failure }
  refund: 決済を取消または返金 { class: failure }
  release: 引当済み在庫を解放 { class: failure }
  order_fail: 注文失敗をWeb画面へ返す { class: failure }
  cancel -> release: 必要な場合だけ { style.stroke-dash: 4 }
  refund -> release { style.stroke-dash: 4 }
  release -> order_fail
}

intake.api -> pre.fork
pre.ready -> commit.payment
commit.save_result -> after.async_start: 注文確定後 { style.stroke-dash: 4 }
pre.inventory_result -> comp.order_fail: いいえ
pre.fraud_result -> comp.cancel: 拒否
pre.manual_result -> comp.cancel: 拒否
commit.payment_result -> comp.release: 失敗
commit.save_result -> comp.refund: 失敗
```

D2ではコンテナ、方向、クラスを使用し、同じソースをDagreとELKでレンダリングした。掲載図は比較で評価が高かったELK版である。

| 候補 | 得点 | 寸法 | 縦横比 | 空白率 | 交差推定 | 最小文字宣言値 |
|---|---:|---:|---:|---:|---:|---:|
| Mermaid未調整 | 15/27 | 2584×595 | 4.34 | 90.0% | 4 | 12 |
| Mermaid改善版 | 25/27 | 1312×2619 | 0.50 | 57.8% | 1 | 12 |
| PlantUML | 18/27 | 1269×2096 | 0.61 | 81.7% | 3 | 10 |
| Graphviz DOT | 21/27 | 1512×2233 | 0.68 | 91.4% | 5 | 10 |
| D2 | 22/27 | 2200×5085 | 0.43 | 59.3% | 2 | 16 |

PlantUMLは隠しリンクによって対になる処理を揃えやすく、縦横比は0.61、評価は18/27だった。一方、汎用ダイアグラムとして記述したため判断ノードも矩形となり、色とラベルへの依存が強くなった。また、失敗・補償領域への長い外周線は残った。UML専用表現の強さと、汎用フローの配置品質は分けて評価する必要がある。

DOTはrank指定によって在庫と審査、配送と通知を対応配置しやすく、視覚評価は21/27だった。一方、上部の失敗分岐から右下の補償領域へ長い線が集中した。`splines=ortho`とエッジラベルの併用にもレンダラー警告が出た。

D2はコンテナとスタイルの宣言が簡潔で、ソース上の責務分割を読みやすく書けた。同じソースをDagreとELKでレンダリングしたところ、ELKでは並行処理の左右対称性が改善し、交差推定は8件から2件、視覚評価は16/27から22/27へ上がった。一方、縦横比は0.43となり、失敗・補償領域への長い外周線も残った。**形式変更やエンジン選択は配置改善の選択肢を増やすが、それだけで見やすさを保証するものではない**。

空白率は白に近い画素の比率、交差数はSVGエッジを約12px間隔で標本化した近似である。空白率が低いほど良いわけでもない。値は人間の視覚評価を置き換えず、極端な候補を検出する補助信号として使う。

### 9.2 図種バリエーションの比較

フローチャートだけでは形式差が特定の構造に偏るため、優先度Aのシーケンス図・クラス図・状態遷移図と、優先度Bのコンポーネント図・ER図を追加した。すべて同じEC注文ドメインを題材とし、Mermaid標準、Mermaid + ELK、PlantUML、Graphviz DOT、D2の5形式で意味を揃えて実際にレンダリングした。

D2は形式本来の能力を比較するため、全図をDagreへ固定していない。クラス図には`shape: class`、ER図には`shape: sql_table`、シーケンス図には`shape: sequence_diagram`というネイティブ記法を使用した。さらに同一ソースをDagreとELKでレンダリングし、意味を保持したうえで視覚評価が高い方を採用した。今回、シーケンス図はエンジン指定による差がなく、他の5図種ではELK版を採用した。したがって比較表の「D2」は固定された一つのエンジンではなく、**D2で利用可能な記法と配置エンジンを図種に応じて選んだ結果**を表す。

各図種の比較表では、基礎9項目・27点満点の著者視覚評価と、同じ計測スクリプトで取得した縦横比、空白率、交差推定、最小文字宣言値を並べる。空白率や交差推定は品質点ではなく、極端な候補を見つける補助信号である。集計条件と得点は`assets/diagram-variant-comparison.yaml`、機械値は各候補の`*-metrics.yaml`に保存した。

#### シーケンス図（優先度A）

並行する在庫引当と不正審査、条件分岐、決済、イベント発行、再試行を含め、ライフライン順と複合フラグメントの読みやすさを比較した。

##### Mermaid

![シーケンス図のMermaid版](assets/sample-order-sequence-mermaid.png)

```mermaid
sequenceDiagram
    autonumber
    actor User as ユーザー
    participant Web as Web画面
    participant Order as 注文サービス
    participant Inventory as 在庫サービス
    participant Fraud as 不正検知
    participant Payment as 決済サービス
    participant Broker as メッセージ基盤

    User->>Web: 注文を確定
    Web->>Order: 注文作成を依頼

    par 在庫確保
        Order->>Inventory: 在庫を引き当て
        Inventory-->>Order: 引当結果
    and 不正検知
        Order->>Fraud: 審査を依頼
        Fraud-->>Order: 審査結果
    end

    alt 在庫確保済み かつ 審査承認
        Order->>Payment: 決済を依頼
        alt 決済成功
            Payment-->>Order: 決済ID
            Order->>Order: 確定注文を保存
            par 配送開始
                Order-)Broker: 配送依頼を発行
            and 通知開始
                Order-)Broker: 確認通知を発行
            end
            Order-->>Web: 注文番号
            Web-->>User: 注文完了
        else 決済タイムアウト
            Payment--x Order: 応答なし
            loop 最大3回まで状態確認
                Order->>Payment: 決済状態を照会
                Payment-->>Order: 処理中または確定結果
            end
            alt 成功を確認
                Order->>Order: 確定注文を保存
                Order-->>Web: 注文番号
                Web-->>User: 注文完了
            else 失敗または不明
                Order->>Inventory: 引当を解放
                Order-->>Web: 注文失敗
                Web-->>User: 再試行を案内
            end
        end
    else 在庫不足 または 審査拒否
        Order->>Inventory: 引当済みなら解放
        Order-->>Web: 注文拒否
        Web-->>User: 理由を表示
    end
```

##### Mermaid + ELK

![シーケンス図のMermaid + ELK版](assets/sample-order-sequence-mermaid-elk.png)

```mermaid
---
config:
  layout: elk
---

sequenceDiagram
    autonumber
    actor User as ユーザー
    participant Web as Web画面
    participant Order as 注文サービス
    participant Inventory as 在庫サービス
    participant Fraud as 不正検知
    participant Payment as 決済サービス
    participant Broker as メッセージ基盤

    User->>Web: 注文を確定
    Web->>Order: 注文作成を依頼

    par 在庫確保
        Order->>Inventory: 在庫を引き当て
        Inventory-->>Order: 引当結果
    and 不正検知
        Order->>Fraud: 審査を依頼
        Fraud-->>Order: 審査結果
    end

    alt 在庫確保済み かつ 審査承認
        Order->>Payment: 決済を依頼
        alt 決済成功
            Payment-->>Order: 決済ID
            Order->>Order: 確定注文を保存
            par 配送開始
                Order-)Broker: 配送依頼を発行
            and 通知開始
                Order-)Broker: 確認通知を発行
            end
            Order-->>Web: 注文番号
            Web-->>User: 注文完了
        else 決済タイムアウト
            Payment--x Order: 応答なし
            loop 最大3回まで状態確認
                Order->>Payment: 決済状態を照会
                Payment-->>Order: 処理中または確定結果
            end
            alt 成功を確認
                Order->>Order: 確定注文を保存
                Order-->>Web: 注文番号
                Web-->>User: 注文完了
            else 失敗または不明
                Order->>Inventory: 引当を解放
                Order-->>Web: 注文失敗
                Web-->>User: 再試行を案内
            end
        end
    else 在庫不足 または 審査拒否
        Order->>Inventory: 引当済みなら解放
        Order-->>Web: 注文拒否
        Web-->>User: 理由を表示
    end
```

##### PlantUML

![シーケンス図のPlantUML版](assets/sample-order-sequence-plantuml.png)

```plantuml
@startuml
title EC注文処理のシーケンス
autonumber
actor "ユーザー" as User
participant "Web画面" as Web
participant "注文サービス" as Order
participant "在庫サービス" as Inventory
participant "不正検知" as Fraud
participant "決済サービス" as Payment
queue "メッセージ基盤" as Broker

User -> Web : 注文を確定
Web -> Order : 注文作成を依頼

par 在庫確保
  Order -> Inventory : 在庫を引き当て
  Inventory --> Order : 引当結果
else 不正検知
  Order -> Fraud : 審査を依頼
  Fraud --> Order : 審査結果
end

alt 在庫確保済み かつ 審査承認
  Order -> Payment : 決済を依頼
  activate Payment
  alt 決済成功
    Payment --> Order : 決済ID
    deactivate Payment
    Order -> Order : 確定注文を保存
    par 配送開始
      Order ->> Broker : 配送依頼を発行
    else 通知開始
      Order ->> Broker : 確認通知を発行
    end
    Order --> Web : 注文番号
    Web --> User : 注文完了
  else 決済タイムアウト
    Payment -x Order : 応答なし
    deactivate Payment
    loop 最大3回まで状態確認
      Order -> Payment : 決済状態を照会
      Payment --> Order : 処理中または確定結果
    end
    alt 成功を確認
      Order -> Order : 確定注文を保存
      Order --> Web : 注文番号
      Web --> User : 注文完了
    else 失敗または不明
      Order -> Inventory : 引当を解放
      Order --> Web : 注文失敗
      Web --> User : 再試行を案内
    end
  end
else 在庫不足 または 審査拒否
  Order -> Inventory : 引当済みなら解放
  Order --> Web : 注文拒否
  Web --> User : 理由を表示
end
@enduml
```
##### Graphviz DOT

![シーケンス図のGraphviz DOT版](assets/sample-order-sequence-graphviz.png)

```dot
// Generated by tools/generate-sequence-graphviz.mjs
digraph OrderSequence {
  graph [rankdir=TB, bgcolor="white", pad=0.25, nodesep=0.38, ranksep="0.52 equally", splines=line, fontname="Helvetica", label="EC注文処理のシーケンス図", labelloc=t];
  node [fontname="Helvetica"];
  edge [fontname="Helvetica", fontsize=9, arrowsize=0.7, color="#52645D"];

  User_head [shape=box, style="rounded,filled", fillcolor="#E8F3FF", color="#45635A", label="ユーザー", group="User"];
  Web_head [shape=box, style="rounded,filled", fillcolor="#E8F3FF", color="#45635A", label="Web画面", group="Web"];
  Order_head [shape=box, style="rounded,filled", fillcolor="#DDEBE4", color="#45635A", label="注文サービス", group="Order"];
  Inventory_head [shape=box, style="rounded,filled", fillcolor="#F7FAF8", color="#45635A", label="在庫サービス", group="Inventory"];
  Fraud_head [shape=box, style="rounded,filled", fillcolor="#F7FAF8", color="#45635A", label="不正検知", group="Fraud"];
  Payment_head [shape=box, style="rounded,filled", fillcolor="#F7FAF8", color="#45635A", label="決済サービス", group="Payment"];
  Broker_head [shape=box, style="rounded,filled", fillcolor="#F3EFFF", color="#45635A", label="メッセージ基盤", group="Broker"];
  phase_head [shape=plaintext, label="", group="phase"];
  { rank=same; phase_head; User_head; Web_head; Order_head; Inventory_head; Fraud_head; Payment_head; Broker_head; }
  phase_head -> User_head -> Web_head -> Order_head -> Inventory_head -> Fraud_head -> Payment_head -> Broker_head [style=invis, weight=100];

  phase_01 [shape=plaintext, fontsize=9, fontcolor="#52645D", label="", group="phase"];
  User_01 [shape=point, width=0.01, height=0.01, label="", style=invis, group="User"];
  Web_01 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Web"];
  Order_01 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Order"];
  Inventory_01 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Inventory"];
  Fraud_01 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Fraud"];
  Payment_01 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Payment"];
  Broker_01 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Broker"];
  { rank=same; phase_01; User_01; Web_01; Order_01; Inventory_01; Fraud_01; Payment_01; Broker_01; }
  phase_01 -> User_01 -> Web_01 -> Order_01 -> Inventory_01 -> Fraud_01 -> Payment_01 -> Broker_01 [style=invis, weight=100];

  phase_02 [shape=plaintext, fontsize=9, fontcolor="#52645D", label="", group="phase"];
  User_02 [shape=point, width=0.01, height=0.01, label="", style=invis, group="User"];
  Web_02 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Web"];
  Order_02 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Order"];
  Inventory_02 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Inventory"];
  Fraud_02 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Fraud"];
  Payment_02 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Payment"];
  Broker_02 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Broker"];
  { rank=same; phase_02; User_02; Web_02; Order_02; Inventory_02; Fraud_02; Payment_02; Broker_02; }
  phase_02 -> User_02 -> Web_02 -> Order_02 -> Inventory_02 -> Fraud_02 -> Payment_02 -> Broker_02 [style=invis, weight=100];

  phase_03 [shape=plaintext, fontsize=9, fontcolor="#52645D", label="par 在庫・不正審査", group="phase"];
  User_03 [shape=point, width=0.01, height=0.01, label="", style=invis, group="User"];
  Web_03 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Web"];
  Order_03 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Order"];
  Inventory_03 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Inventory"];
  Fraud_03 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Fraud"];
  Payment_03 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Payment"];
  Broker_03 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Broker"];
  { rank=same; phase_03; User_03; Web_03; Order_03; Inventory_03; Fraud_03; Payment_03; Broker_03; }
  phase_03 -> User_03 -> Web_03 -> Order_03 -> Inventory_03 -> Fraud_03 -> Payment_03 -> Broker_03 [style=invis, weight=100];

  phase_04 [shape=plaintext, fontsize=9, fontcolor="#52645D", label="", group="phase"];
  User_04 [shape=point, width=0.01, height=0.01, label="", style=invis, group="User"];
  Web_04 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Web"];
  Order_04 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Order"];
  Inventory_04 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Inventory"];
  Fraud_04 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Fraud"];
  Payment_04 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Payment"];
  Broker_04 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Broker"];
  { rank=same; phase_04; User_04; Web_04; Order_04; Inventory_04; Fraud_04; Payment_04; Broker_04; }
  phase_04 -> User_04 -> Web_04 -> Order_04 -> Inventory_04 -> Fraud_04 -> Payment_04 -> Broker_04 [style=invis, weight=100];

  phase_05 [shape=plaintext, fontsize=9, fontcolor="#52645D", label="", group="phase"];
  User_05 [shape=point, width=0.01, height=0.01, label="", style=invis, group="User"];
  Web_05 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Web"];
  Order_05 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Order"];
  Inventory_05 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Inventory"];
  Fraud_05 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Fraud"];
  Payment_05 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Payment"];
  Broker_05 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Broker"];
  { rank=same; phase_05; User_05; Web_05; Order_05; Inventory_05; Fraud_05; Payment_05; Broker_05; }
  phase_05 -> User_05 -> Web_05 -> Order_05 -> Inventory_05 -> Fraud_05 -> Payment_05 -> Broker_05 [style=invis, weight=100];

  phase_06 [shape=plaintext, fontsize=9, fontcolor="#52645D", label="", group="phase"];
  User_06 [shape=point, width=0.01, height=0.01, label="", style=invis, group="User"];
  Web_06 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Web"];
  Order_06 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Order"];
  Inventory_06 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Inventory"];
  Fraud_06 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Fraud"];
  Payment_06 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Payment"];
  Broker_06 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Broker"];
  { rank=same; phase_06; User_06; Web_06; Order_06; Inventory_06; Fraud_06; Payment_06; Broker_06; }
  phase_06 -> User_06 -> Web_06 -> Order_06 -> Inventory_06 -> Fraud_06 -> Payment_06 -> Broker_06 [style=invis, weight=100];

  phase_07 [shape=plaintext, fontsize=9, fontcolor="#52645D", label="alt 前提条件OK", group="phase"];
  User_07 [shape=point, width=0.01, height=0.01, label="", style=invis, group="User"];
  Web_07 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Web"];
  Order_07 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Order"];
  Inventory_07 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Inventory"];
  Fraud_07 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Fraud"];
  Payment_07 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Payment"];
  Broker_07 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Broker"];
  { rank=same; phase_07; User_07; Web_07; Order_07; Inventory_07; Fraud_07; Payment_07; Broker_07; }
  phase_07 -> User_07 -> Web_07 -> Order_07 -> Inventory_07 -> Fraud_07 -> Payment_07 -> Broker_07 [style=invis, weight=100];

  phase_08 [shape=plaintext, fontsize=9, fontcolor="#52645D", label="alt 決済成功", group="phase"];
  User_08 [shape=point, width=0.01, height=0.01, label="", style=invis, group="User"];
  Web_08 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Web"];
  Order_08 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Order"];
  Inventory_08 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Inventory"];
  Fraud_08 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Fraud"];
  Payment_08 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Payment"];
  Broker_08 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Broker"];
  { rank=same; phase_08; User_08; Web_08; Order_08; Inventory_08; Fraud_08; Payment_08; Broker_08; }
  phase_08 -> User_08 -> Web_08 -> Order_08 -> Inventory_08 -> Fraud_08 -> Payment_08 -> Broker_08 [style=invis, weight=100];

  phase_09 [shape=plaintext, fontsize=9, fontcolor="#52645D", label="", group="phase"];
  User_09 [shape=point, width=0.01, height=0.01, label="", style=invis, group="User"];
  Web_09 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Web"];
  Order_09 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Order"];
  Inventory_09 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Inventory"];
  Fraud_09 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Fraud"];
  Payment_09 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Payment"];
  Broker_09 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Broker"];
  { rank=same; phase_09; User_09; Web_09; Order_09; Inventory_09; Fraud_09; Payment_09; Broker_09; }
  phase_09 -> User_09 -> Web_09 -> Order_09 -> Inventory_09 -> Fraud_09 -> Payment_09 -> Broker_09 [style=invis, weight=100];

  phase_10 [shape=plaintext, fontsize=9, fontcolor="#52645D", label="par 注文確定後", group="phase"];
  User_10 [shape=point, width=0.01, height=0.01, label="", style=invis, group="User"];
  Web_10 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Web"];
  Order_10 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Order"];
  Inventory_10 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Inventory"];
  Fraud_10 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Fraud"];
  Payment_10 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Payment"];
  Broker_10 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Broker"];
  { rank=same; phase_10; User_10; Web_10; Order_10; Inventory_10; Fraud_10; Payment_10; Broker_10; }
  phase_10 -> User_10 -> Web_10 -> Order_10 -> Inventory_10 -> Fraud_10 -> Payment_10 -> Broker_10 [style=invis, weight=100];

  phase_11 [shape=plaintext, fontsize=9, fontcolor="#52645D", label="", group="phase"];
  User_11 [shape=point, width=0.01, height=0.01, label="", style=invis, group="User"];
  Web_11 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Web"];
  Order_11 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Order"];
  Inventory_11 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Inventory"];
  Fraud_11 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Fraud"];
  Payment_11 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Payment"];
  Broker_11 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Broker"];
  { rank=same; phase_11; User_11; Web_11; Order_11; Inventory_11; Fraud_11; Payment_11; Broker_11; }
  phase_11 -> User_11 -> Web_11 -> Order_11 -> Inventory_11 -> Fraud_11 -> Payment_11 -> Broker_11 [style=invis, weight=100];

  phase_12 [shape=plaintext, fontsize=9, fontcolor="#52645D", label="", group="phase"];
  User_12 [shape=point, width=0.01, height=0.01, label="", style=invis, group="User"];
  Web_12 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Web"];
  Order_12 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Order"];
  Inventory_12 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Inventory"];
  Fraud_12 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Fraud"];
  Payment_12 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Payment"];
  Broker_12 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Broker"];
  { rank=same; phase_12; User_12; Web_12; Order_12; Inventory_12; Fraud_12; Payment_12; Broker_12; }
  phase_12 -> User_12 -> Web_12 -> Order_12 -> Inventory_12 -> Fraud_12 -> Payment_12 -> Broker_12 [style=invis, weight=100];

  phase_13 [shape=plaintext, fontsize=9, fontcolor="#52645D", label="", group="phase"];
  User_13 [shape=point, width=0.01, height=0.01, label="", style=invis, group="User"];
  Web_13 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Web"];
  Order_13 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Order"];
  Inventory_13 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Inventory"];
  Fraud_13 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Fraud"];
  Payment_13 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Payment"];
  Broker_13 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Broker"];
  { rank=same; phase_13; User_13; Web_13; Order_13; Inventory_13; Fraud_13; Payment_13; Broker_13; }
  phase_13 -> User_13 -> Web_13 -> Order_13 -> Inventory_13 -> Fraud_13 -> Payment_13 -> Broker_13 [style=invis, weight=100];

  phase_14 [shape=plaintext, fontsize=9, fontcolor="#52645D", label="alt タイムアウト", group="phase"];
  User_14 [shape=point, width=0.01, height=0.01, label="", style=invis, group="User"];
  Web_14 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Web"];
  Order_14 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Order"];
  Inventory_14 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Inventory"];
  Fraud_14 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Fraud"];
  Payment_14 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Payment"];
  Broker_14 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Broker"];
  { rank=same; phase_14; User_14; Web_14; Order_14; Inventory_14; Fraud_14; Payment_14; Broker_14; }
  phase_14 -> User_14 -> Web_14 -> Order_14 -> Inventory_14 -> Fraud_14 -> Payment_14 -> Broker_14 [style=invis, weight=100];

  phase_15 [shape=plaintext, fontsize=9, fontcolor="#52645D", label="loop 最大3回", group="phase"];
  User_15 [shape=point, width=0.01, height=0.01, label="", style=invis, group="User"];
  Web_15 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Web"];
  Order_15 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Order"];
  Inventory_15 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Inventory"];
  Fraud_15 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Fraud"];
  Payment_15 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Payment"];
  Broker_15 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Broker"];
  { rank=same; phase_15; User_15; Web_15; Order_15; Inventory_15; Fraud_15; Payment_15; Broker_15; }
  phase_15 -> User_15 -> Web_15 -> Order_15 -> Inventory_15 -> Fraud_15 -> Payment_15 -> Broker_15 [style=invis, weight=100];

  phase_16 [shape=plaintext, fontsize=9, fontcolor="#52645D", label="", group="phase"];
  User_16 [shape=point, width=0.01, height=0.01, label="", style=invis, group="User"];
  Web_16 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Web"];
  Order_16 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Order"];
  Inventory_16 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Inventory"];
  Fraud_16 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Fraud"];
  Payment_16 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Payment"];
  Broker_16 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Broker"];
  { rank=same; phase_16; User_16; Web_16; Order_16; Inventory_16; Fraud_16; Payment_16; Broker_16; }
  phase_16 -> User_16 -> Web_16 -> Order_16 -> Inventory_16 -> Fraud_16 -> Payment_16 -> Broker_16 [style=invis, weight=100];

  phase_17 [shape=plaintext, fontsize=9, fontcolor="#52645D", label="alt 失敗・不明", group="phase"];
  User_17 [shape=point, width=0.01, height=0.01, label="", style=invis, group="User"];
  Web_17 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Web"];
  Order_17 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Order"];
  Inventory_17 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Inventory"];
  Fraud_17 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Fraud"];
  Payment_17 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Payment"];
  Broker_17 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Broker"];
  { rank=same; phase_17; User_17; Web_17; Order_17; Inventory_17; Fraud_17; Payment_17; Broker_17; }
  phase_17 -> User_17 -> Web_17 -> Order_17 -> Inventory_17 -> Fraud_17 -> Payment_17 -> Broker_17 [style=invis, weight=100];

  phase_18 [shape=plaintext, fontsize=9, fontcolor="#52645D", label="", group="phase"];
  User_18 [shape=point, width=0.01, height=0.01, label="", style=invis, group="User"];
  Web_18 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Web"];
  Order_18 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Order"];
  Inventory_18 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Inventory"];
  Fraud_18 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Fraud"];
  Payment_18 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Payment"];
  Broker_18 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Broker"];
  { rank=same; phase_18; User_18; Web_18; Order_18; Inventory_18; Fraud_18; Payment_18; Broker_18; }
  phase_18 -> User_18 -> Web_18 -> Order_18 -> Inventory_18 -> Fraud_18 -> Payment_18 -> Broker_18 [style=invis, weight=100];

  phase_19 [shape=plaintext, fontsize=9, fontcolor="#52645D", label="", group="phase"];
  User_19 [shape=point, width=0.01, height=0.01, label="", style=invis, group="User"];
  Web_19 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Web"];
  Order_19 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Order"];
  Inventory_19 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Inventory"];
  Fraud_19 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Fraud"];
  Payment_19 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Payment"];
  Broker_19 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Broker"];
  { rank=same; phase_19; User_19; Web_19; Order_19; Inventory_19; Fraud_19; Payment_19; Broker_19; }
  phase_19 -> User_19 -> Web_19 -> Order_19 -> Inventory_19 -> Fraud_19 -> Payment_19 -> Broker_19 [style=invis, weight=100];

  phase_20 [shape=plaintext, fontsize=9, fontcolor="#52645D", label="alt 前提条件NG", group="phase"];
  User_20 [shape=point, width=0.01, height=0.01, label="", style=invis, group="User"];
  Web_20 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Web"];
  Order_20 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Order"];
  Inventory_20 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Inventory"];
  Fraud_20 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Fraud"];
  Payment_20 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Payment"];
  Broker_20 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Broker"];
  { rank=same; phase_20; User_20; Web_20; Order_20; Inventory_20; Fraud_20; Payment_20; Broker_20; }
  phase_20 -> User_20 -> Web_20 -> Order_20 -> Inventory_20 -> Fraud_20 -> Payment_20 -> Broker_20 [style=invis, weight=100];

  phase_21 [shape=plaintext, fontsize=9, fontcolor="#52645D", label="", group="phase"];
  User_21 [shape=point, width=0.01, height=0.01, label="", style=invis, group="User"];
  Web_21 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Web"];
  Order_21 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Order"];
  Inventory_21 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Inventory"];
  Fraud_21 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Fraud"];
  Payment_21 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Payment"];
  Broker_21 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Broker"];
  { rank=same; phase_21; User_21; Web_21; Order_21; Inventory_21; Fraud_21; Payment_21; Broker_21; }
  phase_21 -> User_21 -> Web_21 -> Order_21 -> Inventory_21 -> Fraud_21 -> Payment_21 -> Broker_21 [style=invis, weight=100];

  phase_22 [shape=plaintext, fontsize=9, fontcolor="#52645D", label="", group="phase"];
  User_22 [shape=point, width=0.01, height=0.01, label="", style=invis, group="User"];
  Web_22 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Web"];
  Order_22 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Order"];
  Inventory_22 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Inventory"];
  Fraud_22 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Fraud"];
  Payment_22 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Payment"];
  Broker_22 [shape=point, width=0.01, height=0.01, label="", style=invis, group="Broker"];
  { rank=same; phase_22; User_22; Web_22; Order_22; Inventory_22; Fraud_22; Payment_22; Broker_22; }
  phase_22 -> User_22 -> Web_22 -> Order_22 -> Inventory_22 -> Fraud_22 -> Payment_22 -> Broker_22 [style=invis, weight=100];

  User_head -> User_01 -> User_02 -> User_03 -> User_04 -> User_05 -> User_06 -> User_07 -> User_08 -> User_09 -> User_10 -> User_11 -> User_12 -> User_13 -> User_14 -> User_15 -> User_16 -> User_17 -> User_18 -> User_19 -> User_20 -> User_21 -> User_22 [arrowhead=none, style=dashed, color="#9CB7AC", weight=20];
  Web_head -> Web_01 -> Web_02 -> Web_03 -> Web_04 -> Web_05 -> Web_06 -> Web_07 -> Web_08 -> Web_09 -> Web_10 -> Web_11 -> Web_12 -> Web_13 -> Web_14 -> Web_15 -> Web_16 -> Web_17 -> Web_18 -> Web_19 -> Web_20 -> Web_21 -> Web_22 [arrowhead=none, style=dashed, color="#9CB7AC", weight=20];
  Order_head -> Order_01 -> Order_02 -> Order_03 -> Order_04 -> Order_05 -> Order_06 -> Order_07 -> Order_08 -> Order_09 -> Order_10 -> Order_11 -> Order_12 -> Order_13 -> Order_14 -> Order_15 -> Order_16 -> Order_17 -> Order_18 -> Order_19 -> Order_20 -> Order_21 -> Order_22 [arrowhead=none, style=dashed, color="#9CB7AC", weight=20];
  Inventory_head -> Inventory_01 -> Inventory_02 -> Inventory_03 -> Inventory_04 -> Inventory_05 -> Inventory_06 -> Inventory_07 -> Inventory_08 -> Inventory_09 -> Inventory_10 -> Inventory_11 -> Inventory_12 -> Inventory_13 -> Inventory_14 -> Inventory_15 -> Inventory_16 -> Inventory_17 -> Inventory_18 -> Inventory_19 -> Inventory_20 -> Inventory_21 -> Inventory_22 [arrowhead=none, style=dashed, color="#9CB7AC", weight=20];
  Fraud_head -> Fraud_01 -> Fraud_02 -> Fraud_03 -> Fraud_04 -> Fraud_05 -> Fraud_06 -> Fraud_07 -> Fraud_08 -> Fraud_09 -> Fraud_10 -> Fraud_11 -> Fraud_12 -> Fraud_13 -> Fraud_14 -> Fraud_15 -> Fraud_16 -> Fraud_17 -> Fraud_18 -> Fraud_19 -> Fraud_20 -> Fraud_21 -> Fraud_22 [arrowhead=none, style=dashed, color="#9CB7AC", weight=20];
  Payment_head -> Payment_01 -> Payment_02 -> Payment_03 -> Payment_04 -> Payment_05 -> Payment_06 -> Payment_07 -> Payment_08 -> Payment_09 -> Payment_10 -> Payment_11 -> Payment_12 -> Payment_13 -> Payment_14 -> Payment_15 -> Payment_16 -> Payment_17 -> Payment_18 -> Payment_19 -> Payment_20 -> Payment_21 -> Payment_22 [arrowhead=none, style=dashed, color="#9CB7AC", weight=20];
  Broker_head -> Broker_01 -> Broker_02 -> Broker_03 -> Broker_04 -> Broker_05 -> Broker_06 -> Broker_07 -> Broker_08 -> Broker_09 -> Broker_10 -> Broker_11 -> Broker_12 -> Broker_13 -> Broker_14 -> Broker_15 -> Broker_16 -> Broker_17 -> Broker_18 -> Broker_19 -> Broker_20 -> Broker_21 -> Broker_22 [arrowhead=none, style=dashed, color="#9CB7AC", weight=20];

  User_01 -> Web_01 [constraint=false, label="注文を確定"];
  Web_02 -> Order_02 [constraint=false, label="注文作成を依頼"];
  Order_03 -> Inventory_03 [constraint=false, label="在庫を引き当て"];
  Inventory_04 -> Order_04 [constraint=false, label="引当結果", style=dashed];
  Order_05 -> Fraud_05 [constraint=false, label="審査を依頼"];
  Fraud_06 -> Order_06 [constraint=false, label="審査結果", style=dashed];
  Order_07 -> Payment_07 [constraint=false, label="決済を依頼"];
  Payment_08 -> Order_08 [constraint=false, label="決済ID", style=dashed];
  Order_09 -> Order_09 [constraint=false, label="確定注文を保存"];
  Order_10 -> Broker_10 [constraint=false, label="配送依頼を発行", style=dashed, color="#6D4AFF"];
  Order_11 -> Broker_11 [constraint=false, label="確認通知を発行", style=dashed, color="#6D4AFF"];
  Order_12 -> Web_12 [constraint=false, label="注文番号", style=dashed];
  Web_13 -> User_13 [constraint=false, label="注文完了", style=dashed];
  Payment_14 -> Order_14 [constraint=false, label="応答なし", style=dashed, color="#B42318"];
  Order_15 -> Payment_15 [constraint=false, label="決済状態を照会"];
  Payment_16 -> Order_16 [constraint=false, label="処理中または確定結果", style=dashed];
  Order_17 -> Inventory_17 [constraint=false, label="引当を解放", color="#B42318"];
  Order_18 -> Web_18 [constraint=false, label="注文失敗", style=dashed, color="#B42318"];
  Web_19 -> User_19 [constraint=false, label="再試行を案内", style=dashed, color="#B42318"];
  Order_20 -> Inventory_20 [constraint=false, label="引当済みなら解放", color="#B42318"];
  Order_21 -> Web_21 [constraint=false, label="注文拒否", style=dashed, color="#B42318"];
  Web_22 -> User_22 [constraint=false, label="理由を表示", style=dashed, color="#B42318"];
}
```

##### D2

![シーケンス図のD2版](assets/sample-order-sequence-d2.png)

```d2
shape: sequence_diagram

user: ユーザー {
  shape: person
}
web: Web画面
order: 注文サービス
inventory: 在庫サービス
fraud: 不正検知
payment: 決済サービス
broker: メッセージ基盤 {
  shape: queue
}

user -> web: 注文を確定
web -> order: 注文作成を依頼

並行処理 par: {
  order -> inventory: 在庫を引き当て
  inventory -> order: 引当結果 {
    style.stroke-dash: 4
  }
  order -> fraud: 審査を依頼
  fraud -> order: 審査結果 {
    style.stroke-dash: 4
  }
}

前提条件OK alt: {
  order -> payment: 決済を依頼

  決済成功 alt: {
    payment -> order: 決済ID {
      style.stroke-dash: 4
    }
    order -> order: 確定注文を保存

    注文確定後 par: {
      order -> broker: 配送依頼を発行 {
        style.stroke-dash: 4
      }
      order -> broker: 確認通知を発行 {
        style.stroke-dash: 4
      }
    }

    order -> web: 注文番号 {
      style.stroke-dash: 4
    }
    web -> user: 注文完了 {
      style.stroke-dash: 4
    }
  }

  決済タイムアウト alt: {
    payment -> order: 応答なし {
      style.stroke-dash: 4
      style.stroke: "#b42318"
    }

    最大3回まで状態確認 loop: {
      order -> payment: 決済状態を照会
      payment -> order: 処理中または確定結果 {
        style.stroke-dash: 4
      }
    }

    成功を確認 alt: {
      order -> order: 確定注文を保存
      order -> web: 注文番号 {
        style.stroke-dash: 4
      }
      web -> user: 注文完了 {
        style.stroke-dash: 4
      }
    }

    失敗または不明 alt: {
      order -> inventory: 引当を解放 {
        style.stroke: "#b42318"
      }
      order -> web: 注文失敗 {
        style.stroke-dash: 4
        style.stroke: "#b42318"
      }
      web -> user: 再試行を案内 {
        style.stroke-dash: 4
        style.stroke: "#b42318"
      }
    }
  }
}

前提条件NG alt: {
  order -> inventory: 引当済みなら解放 {
    style.stroke: "#b42318"
  }
  order -> web: 注文拒否 {
    style.stroke-dash: 4
    style.stroke: "#b42318"
  }
  web -> user: 理由を表示 {
    style.stroke-dash: 4
    style.stroke: "#b42318"
  }
}
```


Mermaid標準とMermaid + ELKはともに1450×1886で、この図種ではELK指定による差が現れなかった。PlantUMLは880×1241で、UML専用記法として最もコンパクトだった。D2はネイティブの`sequence_diagram`を使い2200×4110となり、ライフライン、フラグメント、自己メッセージを表現できた。Graphvizにはシーケンス図の専用記法がないため、同一ランクのメッセージ行と破線ライフラインをDOTで構成し、1468×2591となった。DOT版はシーケンス図として読めるが、`par`、`alt`、`loop`は左側のフェーズラベルで補っており、専用形式と同等ではない。

| 候補 | 得点 | 縦横比 | 空白率 | 交差推定 | 最小文字値 |
|---|---:|---:|---:|---:|---:|
| Mermaid標準 | 25/27 | 0.77 | 90.7% | 0 | 12 |
| Mermaid + ELK | 25/27 | 0.77 | 90.7% | 0 | 12 |
| PlantUML | 26/27 | 0.71 | 89.9% | 0 | 11 |
| Graphviz DOT | 17/27 | 0.57 | 98.1% | 18* | 9 |
| D2 | 23/27 | 0.54 | 42.8% | 18* | 16 |

\* GraphvizとD2の交差推定には、メッセージ線が途中のライフラインを横切るシーケンス図として正常な交差も含まれる。

#### クラス図（優先度A）

注文集約、商品、決済、配送、割引ポリシーの実装階層を含め、パッケージ境界、継承方向、多重度、同型クラスの対称性を比較した。

##### Mermaid

![クラス図のMermaid版](assets/sample-order-class-mermaid.png)

```mermaid
classDiagram
    direction TB

    namespace OrderDomain {
        class Order {
            +OrderId id
            +OrderStatus status
            +Money total
            +addLine(product, quantity)
            +applyDiscount(policy)
            +confirm()
            +cancel()
        }
        class OrderLine {
            +ProductId productId
            +int quantity
            +Money unitPrice
            +subtotal() Money
        }
        class DiscountPolicy {
            <<interface>>
            +discountFor(order) Money
        }
        class PercentageDiscount {
            +decimal rate
            +discountFor(order) Money
        }
        class CouponDiscount {
            +String couponCode
            +discountFor(order) Money
        }
    }

    namespace CustomerDomain {
        class Customer {
            +CustomerId id
            +String name
            +placeOrder()
        }
    }

    namespace CatalogDomain {
        class Product {
            +ProductId id
            +String name
            +Money price
        }
    }

    namespace Fulfillment {
        class Payment {
            +PaymentId id
            +PaymentStatus status
            +authorize()
            +refund()
        }
        class Shipment {
            +ShipmentId id
            +ShipmentStatus status
            +arrange()
        }
    }

    Customer "1" --> "0..*" Order : places
    Order "1" *-- "1..*" OrderLine : contains
    OrderLine "*" --> "1" Product : references
    Order "1" o-- "0..1" Payment : payment
    Order "1" o-- "0..1" Shipment : shipment
    Order --> DiscountPolicy : applies
    DiscountPolicy <|.. PercentageDiscount
    DiscountPolicy <|.. CouponDiscount
```

##### Mermaid + ELK

![クラス図のMermaid + ELK版](assets/sample-order-class-mermaid-elk.png)

```mermaid
---
config:
  layout: elk
---

classDiagram
    direction TB

    namespace OrderDomain {
        class Order {
            +OrderId id
            +OrderStatus status
            +Money total
            +addLine(product, quantity)
            +applyDiscount(policy)
            +confirm()
            +cancel()
        }
        class OrderLine {
            +ProductId productId
            +int quantity
            +Money unitPrice
            +subtotal() Money
        }
        class DiscountPolicy {
            <<interface>>
            +discountFor(order) Money
        }
        class PercentageDiscount {
            +decimal rate
            +discountFor(order) Money
        }
        class CouponDiscount {
            +String couponCode
            +discountFor(order) Money
        }
    }

    namespace CustomerDomain {
        class Customer {
            +CustomerId id
            +String name
            +placeOrder()
        }
    }

    namespace CatalogDomain {
        class Product {
            +ProductId id
            +String name
            +Money price
        }
    }

    namespace Fulfillment {
        class Payment {
            +PaymentId id
            +PaymentStatus status
            +authorize()
            +refund()
        }
        class Shipment {
            +ShipmentId id
            +ShipmentStatus status
            +arrange()
        }
    }

    Customer "1" --> "0..*" Order : places
    Order "1" *-- "1..*" OrderLine : contains
    OrderLine "*" --> "1" Product : references
    Order "1" o-- "0..1" Payment : payment
    Order "1" o-- "0..1" Shipment : shipment
    Order --> DiscountPolicy : applies
    DiscountPolicy <|.. PercentageDiscount
    DiscountPolicy <|.. CouponDiscount
```

##### PlantUML

![クラス図のPlantUML版](assets/sample-order-class-plantuml.png)

```plantuml
@startuml
title EC注文ドメインのクラス図
top to bottom direction
skinparam packageStyle rectangle
skinparam linetype ortho

package "Order Domain" {
  class Order {
    +id: OrderId
    +status: OrderStatus
    +total: Money
    +addLine(product, quantity)
    +applyDiscount(policy)
    +confirm()
    +cancel()
  }

  class OrderLine {
    +productId: ProductId
    +quantity: int
    +unitPrice: Money
    +subtotal(): Money
  }

  interface DiscountPolicy {
    +discountFor(order): Money
  }

  class PercentageDiscount {
    +rate: decimal
    +discountFor(order): Money
  }

  class CouponDiscount {
    +couponCode: String
    +discountFor(order): Money
  }
}

package "Customer Domain" {
  class Customer {
    +id: CustomerId
    +name: String
    +placeOrder()
  }
}

package "Catalog Domain" {
  class Product {
    +id: ProductId
    +name: String
    +price: Money
  }
}

package "Fulfillment" {
  class Payment {
    +id: PaymentId
    +status: PaymentStatus
    +authorize()
    +refund()
  }

  class Shipment {
    +id: ShipmentId
    +status: ShipmentStatus
    +arrange()
  }
}

Customer "1" --> "0..*" Order : places
Order "1" *-- "1..*" OrderLine : contains
OrderLine "*" --> "1" Product : references
Order "1" o-- "0..1" Payment : payment
Order "1" o-- "0..1" Shipment : shipment
Order --> DiscountPolicy : applies
DiscountPolicy <|.. PercentageDiscount
DiscountPolicy <|.. CouponDiscount
@enduml
```
##### Graphviz DOT

![クラス図のGraphviz DOT版](assets/sample-order-class-graphviz.png)

```dot
digraph OrderClasses {
  graph [rankdir=TB, bgcolor="white", pad=0.25, nodesep=0.45, ranksep=0.65, compound=true, fontname="Helvetica", label="EC注文ドメインのクラス図", labelloc=t];
  node [shape=plain, fontname="Helvetica"];
  edge [color="#52645D", fontname="Helvetica", fontsize=9, arrowsize=0.75];

  subgraph cluster_order {
    label="Order Domain";
    color="#9CB7AC";
    style="rounded";
    Order [label=<
      <TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="5">
        <TR><TD BGCOLOR="#DDEBE4"><B>Order</B></TD></TR>
        <TR><TD ALIGN="LEFT">id: OrderId<BR/>status: OrderStatus<BR/>total: Money</TD></TR>
        <TR><TD ALIGN="LEFT">addLine()<BR/>applyDiscount()<BR/>confirm()<BR/>cancel()</TD></TR>
      </TABLE>>];
    OrderLine [label=<
      <TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="5">
        <TR><TD BGCOLOR="#DDEBE4"><B>OrderLine</B></TD></TR>
        <TR><TD ALIGN="LEFT">productId: ProductId<BR/>quantity: int<BR/>unitPrice: Money</TD></TR>
        <TR><TD ALIGN="LEFT">subtotal(): Money</TD></TR>
      </TABLE>>];
    DiscountPolicy [label=<
      <TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="5">
        <TR><TD BGCOLOR="#FFF4CC"><I>interface</I><BR/><B>DiscountPolicy</B></TD></TR>
        <TR><TD ALIGN="LEFT">discountFor(order): Money</TD></TR>
      </TABLE>>];
    PercentageDiscount [label=<
      <TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="5">
        <TR><TD BGCOLOR="#F7FAF8"><B>PercentageDiscount</B></TD></TR>
        <TR><TD ALIGN="LEFT">rate: decimal<BR/>discountFor(order): Money</TD></TR>
      </TABLE>>];
    CouponDiscount [label=<
      <TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="5">
        <TR><TD BGCOLOR="#F7FAF8"><B>CouponDiscount</B></TD></TR>
        <TR><TD ALIGN="LEFT">couponCode: String<BR/>discountFor(order): Money</TD></TR>
      </TABLE>>];
    {rank=same; PercentageDiscount; CouponDiscount}
  }

  subgraph cluster_customer {
    label="Customer Domain";
    color="#9CB7AC";
    style="rounded";
    Customer [shape=record, style=filled, fillcolor="#F7FAF8", label="{Customer|id: CustomerId\lname: String\l|placeOrder()\l}"];
  }

  subgraph cluster_catalog {
    label="Catalog Domain";
    color="#9CB7AC";
    style="rounded";
    Product [shape=record, style=filled, fillcolor="#F7FAF8", label="{Product|id: ProductId\lname: String\lprice: Money\l}"];
  }

  subgraph cluster_fulfillment {
    label="Fulfillment";
    color="#9CB7AC";
    style="rounded";
    Payment [shape=record, style=filled, fillcolor="#F7FAF8", label="{Payment|id: PaymentId\lstatus: PaymentStatus\l|authorize()\lrefund()\l}"];
    Shipment [shape=record, style=filled, fillcolor="#F7FAF8", label="{Shipment|id: ShipmentId\lstatus: ShipmentStatus\l|arrange()\l}"];
    {rank=same; Payment; Shipment}
  }

  Customer -> Order [label="places  1 : 0..*"];
  Order -> OrderLine [label="contains  1 : 1..*", arrowhead=diamond];
  OrderLine -> Product [label="references  * : 1"];
  Order -> Payment [label="payment  1 : 0..1", arrowhead=odiamond];
  Order -> Shipment [label="shipment  1 : 0..1", arrowhead=odiamond];
  Order -> DiscountPolicy [label="applies", style=dashed];
  PercentageDiscount -> DiscountPolicy [arrowhead=empty, style=dashed];
  CouponDiscount -> DiscountPolicy [arrowhead=empty, style=dashed];
}
```

##### D2

![クラス図のD2版](assets/sample-order-class-d2.png)

```d2
direction: down

classes: {
  domain: {
    style: {
      fill: "#ffffff"
      stroke: "#9cb7ac"
      border-radius: 3
      font-color: "#17201c"
    }
  }
}

order_domain: Order Domain {
  class: domain
  direction: down

  order: Order {
    shape: class
    +id: OrderId
    +status: OrderStatus
    +total: Money
    "+addLine(product, quantity)"
    "+applyDiscount(policy)"
    "+confirm()"
    "+cancel()"
  }

  line: OrderLine {
    shape: class
    +productId: ProductId
    +quantity: int
    +unitPrice: Money
    "+subtotal()": Money
  }

  policy: "«interface»\nDiscountPolicy" {
    shape: class
    "+discountFor(order)": Money
  }

  percentage: PercentageDiscount {
    shape: class
    +rate: decimal
    "+discountFor(order)": Money
  }

  coupon_discount: CouponDiscount {
    shape: class
    +couponCode: String
    "+discountFor(order)": Money
  }

  order -> line: "contains 1 : 1..*" {
    source-arrowhead.shape: diamond
  }
  order -> policy: applies {
    style.stroke-dash: 4
  }
  percentage -> policy: implements {
    style.stroke-dash: 4
    target-arrowhead.shape: triangle
  }
  coupon_discount -> policy: implements {
    style.stroke-dash: 4
    target-arrowhead.shape: triangle
  }
}

customer_domain: Customer Domain {
  class: domain
  customer: Customer {
    shape: class
    +id: CustomerId
    +name: String
    "+placeOrder()"
  }
}

catalog_domain: Catalog Domain {
  class: domain
  product: Product {
    shape: class
    +id: ProductId
    +name: String
    +price: Money
  }
}

fulfillment: Fulfillment {
  class: domain
  direction: right

  payment: Payment {
    shape: class
    +id: PaymentId
    +status: PaymentStatus
    "+authorize()"
    "+refund()"
  }

  shipment: Shipment {
    shape: class
    +id: ShipmentId
    +status: ShipmentStatus
    "+arrange()"
  }
}

customer_domain.customer -> order_domain.order: "places 1 : 0..*"
order_domain.line -> catalog_domain.product: "references * : 1"
order_domain.order -> fulfillment.payment: "payment 1 : 0..1" {
  source-arrowhead.shape: diamond
}
order_domain.order -> fulfillment.shipment: "shipment 1 : 0..1" {
  source-arrowhead.shape: diamond
}
```


Mermaid標準は1537×1205、ELK版は992×1496で、同じソース構造でも横長から縦長へ大きく変化した。DOTは1297×1002、D2は2200×2713、PlantUMLは946×790だった。D2は文字列でクラス枠を模擬せず、`shape: class`で属性・操作の区画を表現し、DagreとELKの比較からELKを採用した。割引ポリシーの二つの実装を対称に置き、交差推定も1件から0件へ減った。

| 候補 | 得点 | 縦横比 | 空白率 | 交差推定 | 最小文字値 |
|---|---:|---:|---:|---:|---:|
| Mermaid標準 | 22/27 | 1.28 | 42.0% | 0 | 10 |
| Mermaid + ELK | 25/27 | 0.66 | 41.0% | 0 | 10 |
| PlantUML | 26/27 | 1.20 | 75.4% | 0 | 13 |
| Graphviz DOT | 24/27 | 1.29 | 93.4% | 0 | 9 |
| D2 | 24/27 | 0.81 | 90.3% | 0 | 16 |

#### 状態遷移図（優先度A）

注文の受付から完了までに、在庫不足、不正審査、決済結果不明、再試行、取消、返金を含め、循環と例外遷移の誤読リスクを比較した。

##### Mermaid

![状態遷移図のMermaid版](assets/sample-order-state-mermaid.png)

```mermaid
stateDiagram-v2
    direction TB

    [*] --> 受付済み
    受付済み --> 確認中 : 在庫確保と審査を開始
    受付済み --> 取消済み : ユーザー取消

    確認中 --> 支払待ち : 在庫OK・審査承認
    確認中 --> 取消済み : 在庫不足・審査拒否
    確認中 --> 取消済み : 取消 / 在庫解放

    支払待ち --> 支払待ち : 再試行 [3回未満]
    支払待ち --> 支払不明 : タイムアウト
    支払待ち --> 支払済み : 決済成功
    支払待ち --> 取消済み : 失敗 / 在庫解放

    支払不明 --> 支払不明 : 照会 [処理中]
    支払不明 --> 支払済み : 成功を確認
    支払不明 --> 取消済み : 失敗確認 / 在庫解放

    支払済み --> 配送準備中 : 配送依頼
    支払済み --> 返金待ち : 取消要求
    配送準備中 --> 発送済み : 配送業者へ引渡し
    配送準備中 --> 返金待ち : 配送前取消
    発送済み --> 完了 : 配達完了
    返金待ち --> 返金済み : 返金成功

    取消済み --> [*]
    完了 --> [*]
    返金済み --> [*]
```

##### Mermaid + ELK

![状態遷移図のMermaid + ELK版](assets/sample-order-state-mermaid-elk.png)

```mermaid
---
config:
  layout: elk
---

stateDiagram-v2
    direction TB

    [*] --> 受付済み
    受付済み --> 確認中 : 在庫確保と審査を開始
    受付済み --> 取消済み : ユーザー取消

    確認中 --> 支払待ち : 在庫OK・審査承認
    確認中 --> 取消済み : 在庫不足・審査拒否
    確認中 --> 取消済み : 取消 / 在庫解放

    支払待ち --> 支払待ち : 再試行 [3回未満]
    支払待ち --> 支払不明 : タイムアウト
    支払待ち --> 支払済み : 決済成功
    支払待ち --> 取消済み : 失敗 / 在庫解放

    支払不明 --> 支払不明 : 照会 [処理中]
    支払不明 --> 支払済み : 成功を確認
    支払不明 --> 取消済み : 失敗確認 / 在庫解放

    支払済み --> 配送準備中 : 配送依頼
    支払済み --> 返金待ち : 取消要求
    配送準備中 --> 発送済み : 配送業者へ引渡し
    配送準備中 --> 返金待ち : 配送前取消
    発送済み --> 完了 : 配達完了
    返金待ち --> 返金済み : 返金成功

    取消済み --> [*]
    完了 --> [*]
    返金済み --> [*]
```

##### PlantUML

![状態遷移図のPlantUML版](assets/sample-order-state-plantuml.png)

```plantuml
@startuml
title 注文ライフサイクルの状態遷移
top to bottom direction
hide empty description

[*] --> 受付済み
受付済み --> 確認中 : 在庫確保と審査を開始
受付済み --> 取消済み : ユーザー取消

確認中 --> 支払待ち : 在庫OK・審査承認
確認中 --> 取消済み : 在庫不足・審査拒否
確認中 --> 取消済み : 取消 / 在庫解放

支払待ち --> 支払待ち : 再試行 [3回未満]
支払待ち --> 支払不明 : タイムアウト
支払待ち --> 支払済み : 決済成功
支払待ち --> 取消済み : 失敗 / 在庫解放

支払不明 --> 支払不明 : 照会 [処理中]
支払不明 --> 支払済み : 成功を確認
支払不明 --> 取消済み : 失敗確認 / 在庫解放

支払済み --> 配送準備中 : 配送依頼
支払済み --> 返金待ち : 取消要求
配送準備中 --> 発送済み : 配送業者へ引渡し
配送準備中 --> 返金待ち : 配送前取消
発送済み --> 完了 : 配達完了
返金待ち --> 返金済み : 返金成功

取消済み --> [*]
完了 --> [*]
返金済み --> [*]
@enduml
```
##### Graphviz DOT

![状態遷移図のGraphviz DOT版](assets/sample-order-state-graphviz.png)

```dot
digraph OrderState {
  graph [rankdir=TB, bgcolor="white", pad=0.25, nodesep=0.45, ranksep=0.6, fontname="Helvetica", label="注文ライフサイクルの状態遷移", labelloc=t];
  node [shape=ellipse, style="filled", fillcolor="#F7FAF8", color="#45635A", fontname="Helvetica", fontsize=11];
  edge [color="#52645D", fontname="Helvetica", fontsize=9, arrowsize=0.7];

  start [shape=circle, label="", width=0.2, fillcolor="#17201C"];
  end_cancel [shape=doublecircle, label="", width=0.22, fillcolor="#17201C"];
  end_complete [shape=doublecircle, label="", width=0.22, fillcolor="#17201C"];
  end_refund [shape=doublecircle, label="", width=0.22, fillcolor="#17201C"];

  accepted [label="受付済み"];
  checking [label="確認中"];
  awaiting [label="支払待ち"];
  unknown [label="支払不明", fillcolor="#FFF4CC", color="#A16207"];
  paid [label="支払済み"];
  preparing [label="配送準備中"];
  shipped [label="発送済み"];
  completed [label="完了", fillcolor="#E6F7ED", color="#15803D"];
  cancelling [label="取消済み", fillcolor="#FDECEC", color="#B42318"];
  refunding [label="返金待ち", fillcolor="#FDECEC", color="#B42318"];
  refunded [label="返金済み", fillcolor="#E6F7ED", color="#15803D"];

  start -> accepted;
  accepted -> checking [label="在庫確保と審査を開始"];
  accepted -> cancelling [label="ユーザー取消", color="#B42318"];
  checking -> awaiting [label="在庫OK・審査承認"];
  checking -> cancelling [label="在庫不足・審査拒否\n取消 / 在庫解放", color="#B42318"];
  awaiting -> awaiting [label="再試行 [3回未満]", style=dashed];
  awaiting -> unknown [label="タイムアウト"];
  awaiting -> paid [label="決済成功"];
  awaiting -> cancelling [label="失敗 / 在庫解放", color="#B42318"];
  unknown -> unknown [label="照会 [処理中]", style=dashed];
  unknown -> paid [label="成功を確認"];
  unknown -> cancelling [label="失敗確認 / 在庫解放", color="#B42318"];
  paid -> preparing [label="配送依頼"];
  paid -> refunding [label="取消要求", color="#B42318"];
  preparing -> shipped [label="配送業者へ引渡し"];
  preparing -> refunding [label="配送前取消", color="#B42318"];
  shipped -> completed [label="配達完了"];
  refunding -> refunded [label="返金成功"];
  cancelling -> end_cancel;
  completed -> end_complete;
  refunded -> end_refund;

  {rank=same; awaiting; unknown}
  {rank=same; cancelling; refunding}
}
```

##### D2

![状態遷移図のD2版](assets/sample-order-state-d2.png)

```d2
direction: down

classes: {
  state: { shape: oval; style: { fill: "#f7faf8"; stroke: "#45635a"; font-color: "#17201c" } }
  warning: { shape: oval; style: { fill: "#fff4cc"; stroke: "#a16207"; font-color: "#3f2d0a" } }
  failure: { shape: oval; style: { fill: "#fdecec"; stroke: "#b42318"; font-color: "#4a1712" } }
  success: { shape: oval; style: { fill: "#e6f7ed"; stroke: "#15803d"; font-color: "#153d25" } }
  endpoint: { shape: circle; width: 18; height: 18; style: { fill: "#17201c"; stroke: "#17201c" } }
}

start: "" { class: endpoint }
accepted: 受付済み { class: state }
checking: 確認中 { class: state }
awaiting: 支払待ち { class: state }
unknown: 支払不明 { class: warning }
paid: 支払済み { class: state }
preparing: 配送準備中 { class: state }
shipped: 発送済み { class: state }
completed: 完了 { class: success }
canceled: 取消済み { class: failure }
refunding: 返金待ち { class: failure }
refunded: 返金済み { class: success }
end_cancel: "" { class: endpoint }
end_complete: "" { class: endpoint }
end_refund: "" { class: endpoint }

start -> accepted
accepted -> checking: 在庫確保と審査を開始
accepted -> canceled: ユーザー取消
checking -> awaiting: 在庫OK・審査承認
checking -> canceled: 在庫不足・審査拒否 / 取消・在庫解放
awaiting -> awaiting: "再試行 [3回未満]" { style.stroke-dash: 4 }
awaiting -> unknown: タイムアウト
awaiting -> paid: 決済成功
awaiting -> canceled: 失敗 / 在庫解放
unknown -> unknown: "照会 [処理中]" { style.stroke-dash: 4 }
unknown -> paid: 成功を確認
unknown -> canceled: 失敗確認 / 在庫解放
paid -> preparing: 配送依頼
paid -> refunding: 取消要求
preparing -> shipped: 配送業者へ引渡し
preparing -> refunding: 配送前取消
shipped -> completed: 配達完了
refunding -> refunded: 返金成功
canceled -> end_cancel
completed -> end_complete
refunded -> end_refund
```


Mermaid標準は1078×982、ELK版は908×1252、DOTは959×1016、D2は1763×2824、PlantUMLは863×1079だった。DOTは正常系、取消、返金の3終端を横に分けやすく、ELKは主経路を縦方向へ揃えた。D2でもELKを選ぶことで曲線中心のDagre版より遷移経路が整理され、交差推定は1件から0件へ減った。取消と再試行による戻り線は全形式に残り、単純な縦横比だけでは優劣を決められない。

| 候補 | 得点 | 縦横比 | 空白率 | 交差推定 | 最小文字値 |
|---|---:|---:|---:|---:|---:|
| Mermaid標準 | 16/27 | 1.10 | 91.9% | 3 | 10 |
| Mermaid + ELK | 23/27 | 0.73 | 92.0% | 0 | 10 |
| PlantUML | 21/27 | 0.80 | 94.6% | 0 | 13 |
| Graphviz DOT | 25/27 | 0.94 | 95.1% | 2 | 9 |
| D2 | 24/27 | 0.62 | 97.2% | 0 | 16 |

#### コンポーネント図（優先度B）

クライアント、注文処理、在庫・不正審査、決済境界、イベント駆動の非同期処理を含め、境界、依存方向、同期・非同期の区別を比較した。

##### Mermaid

![コンポーネント図のMermaid版](assets/sample-order-component-mermaid.png)

```mermaid
flowchart LR
    subgraph CLIENT["Client"]
        WEB["Web Frontend"]
    end

    subgraph COMMERCE["Commerce Platform"]
        API["Order API"]
        ORDER["Order Service"]
        DB[("Order DB")]
        API --> ORDER
        ORDER --> DB
    end

    subgraph CHECKS["Risk & Stock"]
        INVENTORY["Inventory Service"]
        FRAUD["Fraud Service"]
    end

    subgraph PAYMENT_ZONE["Payment Boundary"]
        PAYMENT["Payment Gateway"]
    end

    subgraph ASYNC["Asynchronous Processing"]
        BROKER[["Order Event Broker"]]
        SHIPPING["Shipping Service"]
        NOTIFY["Notification Service"]
        BROKER --> SHIPPING
        BROKER --> NOTIFY
    end

    WEB -->|HTTPS| API
    ORDER -->|reserve / release| INVENTORY
    ORDER -->|screen| FRAUD
    ORDER -->|authorize / refund| PAYMENT
    ORDER -->|publish events| BROKER
```

##### Mermaid + ELK

![コンポーネント図のMermaid + ELK版](assets/sample-order-component-mermaid-elk.png)

```mermaid
---
config:
  layout: elk
---

flowchart LR
    subgraph CLIENT["Client"]
        WEB["Web Frontend"]
    end

    subgraph COMMERCE["Commerce Platform"]
        API["Order API"]
        ORDER["Order Service"]
        DB[("Order DB")]
        API --> ORDER
        ORDER --> DB
    end

    subgraph CHECKS["Risk & Stock"]
        INVENTORY["Inventory Service"]
        FRAUD["Fraud Service"]
    end

    subgraph PAYMENT_ZONE["Payment Boundary"]
        PAYMENT["Payment Gateway"]
    end

    subgraph ASYNC["Asynchronous Processing"]
        BROKER[["Order Event Broker"]]
        SHIPPING["Shipping Service"]
        NOTIFY["Notification Service"]
        BROKER --> SHIPPING
        BROKER --> NOTIFY
    end

    WEB -->|HTTPS| API
    ORDER -->|reserve / release| INVENTORY
    ORDER -->|screen| FRAUD
    ORDER -->|authorize / refund| PAYMENT
    ORDER -->|publish events| BROKER
```

##### PlantUML

![コンポーネント図のPlantUML版](assets/sample-order-component-plantuml.png)

```plantuml
@startuml
title EC注文プラットフォームのコンポーネント図
left to right direction
skinparam componentStyle rectangle
skinparam linetype ortho

rectangle "Client" {
  [Web Frontend] as Web
}

rectangle "Commerce Platform" {
  [Order API] as API
  [Order Service] as Order
  database "Order DB" as DB
  API --> Order
  Order --> DB
}

rectangle "Risk & Stock" {
  [Inventory Service] as Inventory
  [Fraud Service] as Fraud
}

rectangle "Payment Boundary" {
  [Payment Gateway] as Payment
}

rectangle "Asynchronous Processing" {
  queue "Order Event Broker" as Broker
  [Shipping Service] as Shipping
  [Notification Service] as Notify
  Broker --> Shipping
  Broker --> Notify
}

Web --> API : HTTPS
Order --> Inventory : reserve / release
Order --> Fraud : screen
Order --> Payment : authorize / refund
Order --> Broker : publish events
@enduml
```
##### Graphviz DOT

![コンポーネント図のGraphviz DOT版](assets/sample-order-component-graphviz.png)

```dot
digraph OrderComponents {
  graph [rankdir=LR, bgcolor="white", pad=0.3, nodesep=0.45, ranksep=0.75, compound=true, splines=ortho, fontname="Helvetica", label="EC注文プラットフォームのコンポーネント図", labelloc=t];
  node [shape=component, style="filled", fillcolor="#F7FAF8", color="#45635A", fontname="Helvetica", fontsize=11];
  edge [color="#52645D", fontname="Helvetica", fontsize=9, arrowsize=0.7];

  subgraph cluster_client {
    label="Client";
    color="#9CB7AC";
    style="rounded";
    Web [label="Web Frontend"];
  }

  subgraph cluster_commerce {
    label="Commerce Platform";
    color="#9CB7AC";
    style="rounded";
    API [label="Order API"];
    Order [label="Order Service"];
    DB [shape=cylinder, label="Order DB"];
    API -> Order;
    Order -> DB;
  }

  subgraph cluster_checks {
    label="Risk & Stock";
    color="#9CB7AC";
    style="rounded";
    Inventory [label="Inventory Service"];
    Fraud [label="Fraud Service"];
  }

  subgraph cluster_payment {
    label="Payment Boundary";
    color="#9CB7AC";
    style="rounded";
    Payment [label="Payment Gateway"];
  }

  subgraph cluster_async {
    label="Asynchronous Processing";
    color="#9CB7AC";
    style="rounded";
    Broker [shape=box3d, label="Order Event Broker", fillcolor="#F3EFFF", color="#6D4AFF"];
    Shipping [label="Shipping Service"];
    Notify [label="Notification Service"];
    Broker -> Shipping [style=dashed];
    Broker -> Notify [style=dashed];
  }

  Web -> API [label="HTTPS"];
  Order -> Inventory [label="reserve / release"];
  Order -> Fraud [label="screen"];
  Order -> Payment [label="authorize / refund"];
  Order -> Broker [label="publish events", style=dashed, color="#6D4AFF"];
}
```

##### D2

![コンポーネント図のD2版](assets/sample-order-component-d2.png)

```d2
direction: right

classes: {
  component: {
    shape: rectangle
    style: {
      fill: "#f7faf8"
      stroke: "#45635a"
      border-radius: 3
      font-color: "#17201c"
    }
  }
  async: {
    shape: queue
    style: {
      fill: "#f3efff"
      stroke: "#6d4aff"
      font-color: "#2c2254"
    }
  }
}

client: Client {
  web: Web Frontend { class: component }
}

commerce: Commerce Platform {
  direction: right
  api: Order API { class: component }
  order: Order Service { class: component }
  db: Order DB { shape: cylinder; style.fill: "#f7faf8"; style.stroke: "#45635a" }
  api -> order
  order -> db
}

checks: Risk & Stock {
  direction: down
  inventory: Inventory Service { class: component }
  fraud: Fraud Service { class: component }
}

payment_zone: Payment Boundary {
  payment: Payment Gateway { class: component }
}

async_processing: Asynchronous Processing {
  direction: down
  broker: Order Event Broker { class: async }
  shipping: Shipping Service { class: component }
  notify: Notification Service { class: component }
  broker -> shipping { style.stroke-dash: 4 }
  broker -> notify { style.stroke-dash: 4 }
}

client.web -> commerce.api: HTTPS
commerce.order -> checks.inventory: reserve / release
commerce.order -> checks.fraud: screen
commerce.order -> payment_zone.payment: authorize / refund
commerce.order -> async_processing.broker: publish events { style.stroke-dash: 4; style.stroke: "#6d4aff" }
```


Mermaid標準は1381×922、ELK版は1527×579、DOTは1136×725、D2は2200×875、PlantUMLは900×629だった。ELKはサービス境界を横一列へ展開し、標準版とは最も大きな差が出た。D2もELKを採用すると、Dagre版の曲線と斜めの境界配置が、責務ごとに整列した直交経路へ変わった。DOT、D2、PlantUMLはいずれも境界と依存方向を保てたが、非同期イベントを線種と形状の両方で示す指定方法は異なる。

| 候補 | 得点 | 縦横比 | 空白率 | 交差推定 | 最小文字値 |
|---|---:|---:|---:|---:|---:|
| Mermaid標準 | 18/27 | 1.50 | 65.7% | 0 | 12 |
| Mermaid + ELK | 25/27 | 2.64 | 69.9% | 0 | 12 |
| PlantUML | 25/27 | 1.43 | 89.9% | 0 | 13 |
| Graphviz DOT | 26/27 | 1.57 | 94.8% | 0 | 9 |
| D2 | 26/27 | 2.51 | 77.1% | 0 | 16 |

#### ER図（優先度B）

顧客、住所、注文、注文明細、商品、決済、配送、クーポンを含め、カーディナリティ、キー、中心エンティティへの線集中を比較した。

##### Mermaid

![ER図のMermaid版](assets/sample-order-er-mermaid.png)

```mermaid
erDiagram
    CUSTOMER ||--o{ ORDER : places
    ADDRESS ||--o{ ORDER : billing
    ORDER ||--|{ ORDER_ITEM : ""
    PRODUCT ||--o{ ORDER_ITEM : ""
    ORDER ||--o| PAYMENT : payment
    ORDER ||--o| SHIPMENT : shipment
    ADDRESS ||--o{ SHIPMENT : delivery
    COUPON o|--o{ ORDER : coupon

    CUSTOMER {
        uuid customer_id PK
        string name
        string email
    }

    ADDRESS {
        uuid address_id PK
        uuid customer_id FK
        string postal_code
        string city
    }

    ORDER {
        uuid order_id PK
        uuid customer_id FK
        uuid billing_address_id FK
        uuid coupon_id FK
        string status
        decimal total
    }

    ORDER_ITEM {
        uuid order_id PK, FK
        uuid product_id PK, FK
        int quantity
        decimal unit_price
    }

    PRODUCT {
        uuid product_id PK
        string name
        decimal price
    }

    PAYMENT {
        uuid payment_id PK
        uuid order_id FK
        string status
        decimal amount
    }

    SHIPMENT {
        uuid shipment_id PK
        uuid order_id FK
        uuid address_id FK
        string status
    }

    COUPON {
        uuid coupon_id PK
        string code
        decimal discount_rate
    }
```

##### Mermaid + ELK

![ER図のMermaid + ELK版](assets/sample-order-er-mermaid-elk.png)

```mermaid
---
config:
  layout: elk
---

erDiagram
    CUSTOMER ||--o{ ORDER : places
    ADDRESS ||--o{ ORDER : billing
    ORDER ||--|{ ORDER_ITEM : ""
    PRODUCT ||--o{ ORDER_ITEM : ""
    ORDER ||--o| PAYMENT : payment
    ORDER ||--o| SHIPMENT : shipment
    ADDRESS ||--o{ SHIPMENT : delivery
    COUPON o|--o{ ORDER : coupon

    CUSTOMER {
        uuid customer_id PK
        string name
        string email
    }

    ADDRESS {
        uuid address_id PK
        uuid customer_id FK
        string postal_code
        string city
    }

    ORDER {
        uuid order_id PK
        uuid customer_id FK
        uuid billing_address_id FK
        uuid coupon_id FK
        string status
        decimal total
    }

    ORDER_ITEM {
        uuid order_id PK, FK
        uuid product_id PK, FK
        int quantity
        decimal unit_price
    }

    PRODUCT {
        uuid product_id PK
        string name
        decimal price
    }

    PAYMENT {
        uuid payment_id PK
        uuid order_id FK
        string status
        decimal amount
    }

    SHIPMENT {
        uuid shipment_id PK
        uuid order_id FK
        uuid address_id FK
        string status
    }

    COUPON {
        uuid coupon_id PK
        string code
        decimal discount_rate
    }
```

##### PlantUML

![ER図のPlantUML版](assets/sample-order-er-plantuml.png)

```plantuml
@startuml
title EC注文データモデル
hide circle
skinparam linetype ortho

entity CUSTOMER {
  * customer_id : uuid <<PK>>
  --
  name : string
  email : string
}

entity ADDRESS {
  * address_id : uuid <<PK>>
  --
  customer_id : uuid <<FK>>
  postal_code : string
  city : string
}

entity ORDER {
  * order_id : uuid <<PK>>
  --
  customer_id : uuid <<FK>>
  billing_address_id : uuid <<FK>>
  coupon_id : uuid <<FK>>
  status : string
  total : decimal
}

entity ORDER_ITEM {
  * order_id : uuid <<PK, FK>>
  * product_id : uuid <<PK, FK>>
  --
  quantity : int
  unit_price : decimal
}

entity PRODUCT {
  * product_id : uuid <<PK>>
  --
  name : string
  price : decimal
}

entity PAYMENT {
  * payment_id : uuid <<PK>>
  --
  order_id : uuid <<FK>>
  status : string
  amount : decimal
}

entity SHIPMENT {
  * shipment_id : uuid <<PK>>
  --
  order_id : uuid <<FK>>
  address_id : uuid <<FK>>
  status : string
}

entity COUPON {
  * coupon_id : uuid <<PK>>
  --
  code : string
  discount_rate : decimal
}

CUSTOMER "1" -- "0..*" ORDER : places
ADDRESS "1" -- "0..*" ORDER : billing
ORDER "1" -- "1..*" ORDER_ITEM
PRODUCT "1" -- "0..*" ORDER_ITEM
ORDER "1" -- "0..1" PAYMENT : payment
ORDER "1" -- "0..1" SHIPMENT : shipment
ADDRESS "1" -- "0..*" SHIPMENT : delivery
COUPON "0..1" -- "0..*" ORDER : coupon
@enduml
```
##### Graphviz DOT

![ER図のGraphviz DOT版](assets/sample-order-er-graphviz.png)

```dot
digraph OrderER {
  graph [layout=dot, rankdir=TB, bgcolor="white", pad=0.3, nodesep=0.45, ranksep=0.75, splines=polyline, fontname="Helvetica", label="EC注文データモデル", labelloc=t];
  node [shape=record, style="filled", fillcolor="#F7FAF8", color="#45635A", fontname="Helvetica", fontsize=10];
  edge [dir=none, color="#52645D", fontname="Helvetica", fontsize=9];

  CUSTOMER [label="{CUSTOMER|customer_id: uuid PK\lname: string\lemail: string\l}"];
  ADDRESS [label="{ADDRESS|address_id: uuid PK\lcustomer_id: uuid FK\lpostal_code: string\lcity: string\l}"];
  ORDER [fillcolor="#DDEBE4", label="{ORDER|order_id: uuid PK\lcustomer_id: uuid FK\lbilling_address_id: uuid FK\lcoupon_id: uuid FK\lstatus: string\ltotal: decimal\l}"];
  ORDER_ITEM [label="{ORDER_ITEM|order_id: uuid PK, FK\lproduct_id: uuid PK, FK\lquantity: int\lunit_price: decimal\l}"];
  PRODUCT [label="{PRODUCT|product_id: uuid PK\lname: string\lprice: decimal\l}"];
  PAYMENT [label="{PAYMENT|payment_id: uuid PK\lorder_id: uuid FK\lstatus: string\lamount: decimal\l}"];
  SHIPMENT [label="{SHIPMENT|shipment_id: uuid PK\lorder_id: uuid FK\laddress_id: uuid FK\lstatus: string\l}"];
  COUPON [label="{COUPON|coupon_id: uuid PK\lcode: string\ldiscount_rate: decimal\l}"];

  CUSTOMER -> ORDER [label="places", taillabel="1", headlabel="0..*", labeldistance=2.0];
  ADDRESS -> ORDER [label="billing", taillabel="1", headlabel="0..*", labeldistance=2.0];
  ORDER -> ORDER_ITEM [taillabel="1", headlabel="1..*", labeldistance=2.0];
  PRODUCT -> ORDER_ITEM [taillabel="1", headlabel="0..*", labeldistance=2.0];
  ORDER -> PAYMENT [label="payment", taillabel="1", headlabel="0..1", labeldistance=2.0];
  ORDER -> SHIPMENT [label="shipment", taillabel="1", headlabel="0..1", labeldistance=2.0];
  ADDRESS -> SHIPMENT [label="delivery", taillabel="1", headlabel="0..*", labeldistance=2.0];
  COUPON -> ORDER [label="coupon", taillabel="0..1", headlabel="0..*", labeldistance=2.0];

}
```

##### D2

![ER図のD2版](assets/sample-order-er-d2.png)

```d2
direction: right

customer: CUSTOMER {
  shape: sql_table
  customer_id: uuid {
    constraint: primary_key
  }
  name: string
  email: string
}

address: ADDRESS {
  shape: sql_table
  address_id: uuid {
    constraint: primary_key
  }
  customer_id: uuid {
    constraint: foreign_key
  }
  postal_code: string
  city: string
}

order: ORDER {
  shape: sql_table
  order_id: uuid {
    constraint: primary_key
  }
  customer_id: uuid {
    constraint: foreign_key
  }
  billing_address_id: uuid {
    constraint: foreign_key
  }
  coupon_id: uuid {
    constraint: foreign_key
  }
  status: string
  total: decimal
}

order_item: ORDER_ITEM {
  shape: sql_table
  order_id: uuid {
    constraint: [primary_key; foreign_key]
  }
  product_id: uuid {
    constraint: [primary_key; foreign_key]
  }
  quantity: int
  unit_price: decimal
}

product: PRODUCT {
  shape: sql_table
  product_id: uuid {
    constraint: primary_key
  }
  name: string
  price: decimal
}

payment: PAYMENT {
  shape: sql_table
  payment_id: uuid {
    constraint: primary_key
  }
  order_id: uuid {
    constraint: foreign_key
  }
  status: string
  amount: decimal
}

shipment: SHIPMENT {
  shape: sql_table
  shipment_id: uuid {
    constraint: primary_key
  }
  order_id: uuid {
    constraint: foreign_key
  }
  address_id: uuid {
    constraint: foreign_key
  }
  status: string
}

coupon: COUPON {
  shape: sql_table
  coupon_id: uuid {
    constraint: primary_key
  }
  code: string
  discount_rate: decimal
}

customer.customer_id -> order.customer_id: "places 1 : 0..*" {
  source-arrowhead.shape: cf-one
  target-arrowhead.shape: cf-many
}
address.address_id -> order.billing_address_id: "billing 1 : 0..*" {
  source-arrowhead.shape: cf-one
  target-arrowhead.shape: cf-many
}
order.order_id -> order_item.order_id: "1 : 1..*" {
  source-arrowhead.shape: cf-one
  target-arrowhead.shape: cf-many
}
product.product_id -> order_item.product_id: "1 : 0..*" {
  source-arrowhead.shape: cf-one
  target-arrowhead.shape: cf-many
}
order.order_id -> payment.order_id: "payment 1 : 0..1" {
  source-arrowhead.shape: cf-one
  target-arrowhead.shape: cf-one
}
order.order_id -> shipment.order_id: "shipment 1 : 0..1" {
  source-arrowhead.shape: cf-one
  target-arrowhead.shape: cf-one
}
address.address_id -> shipment.address_id: "delivery 1 : 0..*" {
  source-arrowhead.shape: cf-one
  target-arrowhead.shape: cf-many
}
coupon.coupon_id -> order.coupon_id: "coupon 0..1 : 0..*" {
  source-arrowhead.shape: cf-one
  target-arrowhead.shape: cf-many
}
```


Mermaid標準は1371×945、ELK版は948×1138、DOTは597×583、D2は2200×1010、PlantUMLは667×536だった。D2は文字列で表を模擬せず、`shape: sql_table`で主キー・外部キーと属性行を構造化した。ELKを使うことで関係線を対象の属性行へ接続でき、Dagre版より接続先を追いやすい。全形式で、線の短さよりもカーディナリティがどの関係へ属するかを優先して評価する必要がある。

| 候補 | 得点 | 縦横比 | 空白率 | 交差推定 | 最小文字値 |
|---|---:|---:|---:|---:|---:|
| Mermaid標準 | 19/27 | 1.45 | 79.4% | 2 | 14 |
| Mermaid + ELK | 25/27 | 0.83 | 75.5% | 0 | 14 |
| PlantUML | 26/27 | 1.24 | 52.9% | 0 | 13 |
| Graphviz DOT | 26/27 | 1.02 | 84.4% | 0 | 9 |
| D2 | 24/27 | 2.18 | 89.2% | 3 | 16 |

### 9.3 図種固有の評価基準

基礎9項目に加え、追加した5図種ではそれぞれ別枠の5項目、最大15点を定義した。基礎点へ単純加算すると図種間比較を歪めるため、図種固有点は別に記録する。

| 図種 | 追加項目 |
|---|---|
| シーケンス図 | ライフライン順、時間方向、メッセージ種別、複合フラグメント境界、活性区間 |
| クラス図 | 階層方向、関係種別、多重度とロール、パッケージ境界、メンバー密度 |
| 状態遷移図 | 状態の進行方向、イベントとガード、循環、開始・終了、例外経路の分離 |
| コンポーネント図 | 境界、依存方向、インターフェース、グルーピング、同期・非同期の区別 |
| ER図 | カーディナリティ、キー、関係線、エンティティ配置、中心要素への線集中 |

定義本体は`assets/diagram-type-rubrics.yaml`に保存した。時間順、並行性、継承方向、状態の入口・終端、依存方向、同期・非同期、カーディナリティなど、意味を逆に読める配置は必須違反とした。

### 9.4 意味検証と視覚評価の分離

視覚評価エージェントとは独立に、画像を入力せず、不変条件と図ソースだけを照合する意味検証エージェントを実装した。Mermaid改善版を検証した結果、13件の不変条件について欠落0、矛盾0、根拠のない追加0で、意味保持と判定された。

この分離により、視覚評価が出した修正版を意味検証へ渡し、意味が保持された候補だけを再レンダリング・採点するゲートを構成できる。ただし自然言語による照合なので、厳密性が必要な箇所では状態機械、テスト、形式検証を併用する。

### 9.5 best-of-N選択

未調整Mermaid、改善Mermaid、DOT、D2、PlantUMLの5候補を、必須違反数を第一キー、得点率を第二キーとして比較した。結果は改善Mermaid 25、D2 22、DOT 21、PlantUML 18、未調整Mermaid 15で、改善Mermaidが選択された。

一案を反復修正する方式では、局所改善で縦横比や別の枝が悪化することがある。方向、領域分割、形式、レイアウトエンジンが異なる候補を残し、同じ条件で比較する方が最高得点の退行を防ぎやすい。

### 9.6 評価者校正の代理実験

同じ改善Mermaid画像、ソース、不変条件、プロンプトを使い、Codex CLIを独立に3回実行した。得点は13、14、14、必須違反数は2、1、1だった。項目別の最大差は1点であり、同一設定内の反復性は比較的高かった。

一方、著者評価25点とは11〜12点差があった。3回中2回は、注文保存判定から非同期開始への線を「成功条件が不明確」として必須違反にした。これは、単に採点を平均するだけでなく、分岐ラベルのアンカー例と必須違反の境界を人間同士で合わせる必要があることを示す。

この実験は人間評価者による校正の代替ではない。実際の校正用に匿名候補、9項目、必須違反、読解確認質問を含む`assets/human-rating-sheet.md`を作成した。次の実地検証では3人以上が独立採点し、中央値、項目別最大差、必須違反一致率を集計する。

### 9.7 検証後の方針

検証結果を踏まえ、推奨パイプラインを次のように更新する。

```text
正規化設計情報
  → 方向・領域・形式の異なるN候補を生成
  → 独立した意味検証
  → レンダリング
  → 寸法・空白率・文字・交差の機械計測
  → 画像を使った視覚評価
  → 必須違反と得点率でbest-of-N選択
  → 人間が読解確認と公開承認
```

機械計測、AI評価、意味検証はそれぞれ異なる失敗を検出する。どれか一つへ統合せず、判定根拠を分けて保存することが重要である。

## 参考資料

- Mermaid, Writing Mermaid diagrams: https://mermaid.ai/docs/build-and-edit/write-diagram-syntax
- Mermaid, Layouts: https://mermaid.js.org/config/layouts.html
- Eclipse Layout Kernel: https://eclipse.dev/elk/
- PlantUML, Sequence Diagram: https://plantuml.com/sequence-diagram
- PlantUML, Class Diagram: https://plantuml.com/class-diagram
- PlantUML, Deployment and command line: https://plantuml.com/command-line
- Graphviz, dot layout engine: https://graphviz.org/docs/layouts/dot/
- Graphviz, DOT language: https://graphviz.org/doc/info/lang.html
- Graphviz, Download: https://graphviz.org/download/
- D2, Layouts: https://d2lang.com/tour/layouts/
- D2, Install: https://www.d2lang.com/tour/install/
- D2, CLI manual: https://d2lang.com/tour/man/
- Structurizr, DSL: https://docs.structurizr.com/dsl
- Structurizr, Automatic layout: https://docs.structurizr.com/ui/diagrams/automatic-layout
- OpenAI, Model guidance: https://developers.openai.com/api/docs/guides/latest-model
