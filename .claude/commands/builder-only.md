---
description: 指定した Builder で実装のみ実行 (Gate ループなし)。プロトタイピング・小さな変更用。
argument-hint: <builder-name> <タスクの説明>
---

# /builder-only

Gate ループを経由せず、指定された Builder だけで実装します。

引数: $ARGUMENTS

## 期待する引数フォーマット

```
<builder-name> <タスク説明>
```

`builder-name` は以下のいずれか:
- `frontend-implementer`
- `backend-implementer`
- `db-implementer`
- `test-implementer`
- `refactor-implementer`

例: `/builder-only frontend-implementer ヘッダーにダークモード切り替えボタンを追加`

## 実行フロー

1. 引数から Builder 名とタスクを分離
2. 指定された Builder を Agent ツールで起動
3. Builder の出力をそのまま表示

## 用途

- プロトタイピング (品質ゲートは後回しでとにかく動くものを)
- ごく小さな変更 (typo 修正、コメント追加)
- 既存品質が下がっている領域での緊急修正

## 注意

- このコマンドは Gate を実行しません
- 本格的な実装には `/build-with-gates` を推奨
- 終わったら `/verify-only` でセルフチェック推奨
