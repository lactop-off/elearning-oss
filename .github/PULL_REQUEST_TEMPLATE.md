<!--
PR タイトル: Conventional Commits 形式で書いてください
例: feat(quiz): add time limit support
-->

## 概要 / Summary

<!-- この PR で何を変更するか、1-3 行で -->

## 変更の動機 / Motivation

<!-- なぜこの変更が必要か。関連 Issue があればリンク -->

Closes #

## 変更の種類 / Type of Change

- [ ] `feat` 新機能
- [ ] `fix` バグ修正
- [ ] `refactor` リファクタリング
- [ ] `perf` パフォーマンス改善
- [ ] `test` テスト追加・修正
- [ ] `docs` ドキュメント
- [ ] `build` / `ci` / `chore` その他
- [ ] **Breaking change を含む**

## 変更内容 / Changes

<!-- 主要な変更点を箇条書きで -->

-
-

## 影響範囲 / Affected Areas

- [ ] フロントエンド (UI / ページ)
- [ ] バックエンド (Server Actions / API)
- [ ] DB スキーマ (マイグレーションあり)
- [ ] 認証・認可
- [ ] i18n (翻訳ファイル)
- [ ] テスト
- [ ] ドキュメント

## テスト / Testing

<!-- 追加したテスト、手動で確認した内容 -->

- [ ] ユニットテストを追加・更新
- [ ] 統合テストを追加・更新
- [ ] E2E テストを追加・更新
- [ ] `/build-with-gates` または `/verify-only` で全 Gate PASS
- [ ] ローカルで動作確認済み

## 品質ゲート結果 / Quality Gates

`/verify-only` 実行結果のサマリを貼ってください:

```
| Gate | 判定 |
|---|---|
| type-safety | PASS |
| lint-format | PASS |
| test-coverage | PASS |
| unit-test-runner | PASS |
| accessibility | PASS |
| security | PASS |
| performance | PASS |
| i18n | PASS |
| architecture | PASS |
| domain-logic | PASS |
```

## スクリーンショット / Screenshots

<!-- UI 変更の場合、before/after を貼る -->

## 破壊的変更 / Breaking Changes

<!-- ある場合、移行手順を書く。なければ「なし」 -->

## レビュアー観点 / Review Notes

<!-- 特に見てほしいファイル、議論したい設計判断など -->

## チェックリスト

- [ ] PR タイトルが Conventional Commits 形式
- [ ] CLAUDE.md のコーディング規約に従っている
- [ ] [docs/git-workflow.md](../docs/git-workflow.md) のフローに従って作成
- [ ] CHANGELOG.md を更新 (該当時)
- [ ] 関連ドキュメントを更新 (該当時)
- [ ] `.env` 等の秘密情報を含めていない
