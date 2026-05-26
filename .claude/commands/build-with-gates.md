---
description: Builder ⇄ Gate 自動ループで実装する。最大 5 回、全 Gate 並列、完了時にレポート。
argument-hint: <実装したいタスクの説明>
---

# /build-with-gates

ユーザータスク: $ARGUMENTS

あなたは Builder ⇄ Gate ループの**オーケストレーター**です。以下の手順で実装を進めてください。

## 重要原則

- **完了時にまとめてレポート**。ループ中は最小限の出力のみ。
- **最大 5 回**のループ。それを超えたら人間にエスカレーション。
- **全 Gate を並列実行**。1 つでも FAIL なら再実装ループ。
- **停滞検出**: 同じ指摘が 3 回連続で出たらエスカレーション。
- **ループの全履歴を内部で保持**し、最終レポートに含める。

## 実行フロー

### Step 1: タスク分析
1. `$ARGUMENTS` の内容から、必要な Builder を選定:
   - UI 関連 → `frontend-implementer`
   - Server Action / API / ビジネスロジック → `backend-implementer`
   - Prisma スキーマ → `db-implementer`
   - テスト追加のみ → `test-implementer`
   - リファクタリング → `refactor-implementer`
   - 複数該当する場合は順番に実行 (db → backend → frontend → test)
2. 必要な Gate を選定 (基本は全 Gate、ただしタスクに応じて取捨):
   - **常に必要**: type-safety, lint-format, architecture
   - **コード変更時**: test-coverage, unit-test-runner
   - **UI 変更時**: accessibility, i18n, performance
   - **バックエンド変更時**: security, performance, domain-logic
   - **DB 変更時**: domain-logic
   - **大きな変更時**: e2e-test

### Step 2: ループ開始
```
iteration = 0
previous_findings = []
last_findings = []
stagnation_count = 0
```

### Step 3: 各イテレーション
```
iteration += 1

# 3a. Builder 起動
適切な Builder を Agent ツールで起動。
プロンプトに以下を含める:
  - 元のタスク ($ARGUMENTS)
  - 前回の Gate 指摘 (previous_findings, あれば)
  - イテレーション番号

# 3b. Gate 並列起動
選定した全 Gate を 1 メッセージ内で並列起動 (複数 Agent ツール呼び出し)。

# 3c. 結果集約
各 Gate の出力から 判定 (PASS/FAIL)、重大度、指摘を抽出。

# 3d. 判定
- 全 Gate が PASS → ループ終了、最終レポートへ
- いずれか FAIL かつ iteration < 5:
    - 今回の指摘 = current_findings
    - if current_findings ≒ last_findings: stagnation_count += 1
    - else: stagnation_count = 0
    - if stagnation_count >= 2 (= 3 回連続同じ): エスカレーション
    - last_findings = current_findings
    - previous_findings に追記
    - 次のイテレーションへ
- iteration >= 5 で FAIL: エスカレーション
```

### Step 4: 最終レポート出力

ループ中は静か (一切メッセージを出さない)。完了時に**この形式**で 1 回だけ報告:

```markdown
# 🧪 Build-with-gates 完了レポート

## タスク
$ARGUMENTS

## 最終ステータス
✅ 全 Gate PASS / ❌ 上限到達 / ⛔ 停滞検出

## イテレーション数
X / 5

## 変更ファイル一覧
- `path/to/file.ts`
- ...

## 各 Gate の最終結果
| Gate | 判定 | 主要な指摘 |
|---|---|---|
| type-safety | PASS / FAIL | ... |
| lint-format | PASS / FAIL | ... |
| ... | ... | ... |

## イテレーション履歴 (要約)
### Iteration 1
- Builder: <名前>
- FAIL gate: <名前>, ...
- 主要指摘: ...
### Iteration 2
- ...

## 推奨される次のアクション
- レビュー観点 (人間が確認すべき点)
- 関連する追加タスクの提案
- (エスカレーション時) 解決できなかった理由と人間への依頼内容
```

## エスカレーション時のフォーマット

```markdown
# ⚠️ 自動ループ限界 — 人間の判断が必要

## 状況
- iteration: X
- 停滞検出: yes/no
- 解決できなかった Gate: ...

## 試行したアプローチ
- ...

## 候補となる対応
1. ...
2. ...

## 推奨
人間が以下を判断してください: ...
```

## 注意

- **Builder と Gate を混ぜない**: Builder は実装のみ、Gate は判定のみ
- **Gate を並列起動**: 1 メッセージ内で複数 Agent 呼び出し
- **過去の指摘を毎回 Builder に渡す**: 同じミスの繰り返し防止
- **無駄なリトライを避ける**: 停滞検出を信頼する
- **ループ中はユーザーへの中間メッセージなし**
