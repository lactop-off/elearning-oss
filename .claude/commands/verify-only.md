---
description: 現在の変更に対して全 Gate を並列実行し、判定だけ受け取る (実装はしない)
argument-hint: (なし — git diff の内容を検証)
---

# /verify-only

すでにある変更 (git diff) に対して、全 Gate を並列実行し判定のみを返します。実装は一切行いません。

## 実行フロー

1. `git status` と `git diff` で変更内容を確認
2. 以下の全 Gate を**並列で起動** (1 メッセージで複数 Agent 呼び出し):
   - type-safety-gate
   - lint-format-gate
   - test-coverage-gate
   - unit-test-runner-gate
   - accessibility-gate
   - design-gate
   - security-gate
   - performance-gate
   - i18n-gate
   - architecture-gate
   - domain-logic-gate
   - (e2e-test-gate は大規模変更時のみ)
3. 結果を集約してレポート

## 出力フォーマット

```markdown
# 🔍 検証レポート

## 変更サマリ
- ファイル数: X
- 主要な変更領域: ...

## Gate 判定
| Gate | 判定 | 重大度 | 指摘数 |
|---|---|---|---|
| type-safety | PASS/FAIL | critical/major/minor | N |
| ... | ... | ... | ... |

## 重大な指摘 (critical / major のみ)
### type-safety-gate
- [ファイル:行] 説明
### ...

## 推奨アクション
- 担当 implementer: ...
- 修正の優先順位: ...
```

## 用途

- PR を出す前のセルフレビュー
- 手動で書いたコードの品質チェック
- ループに入らずざっと現状確認したいとき
