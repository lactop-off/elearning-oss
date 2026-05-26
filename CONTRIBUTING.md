# Contributing Guide

このリポジトリへの貢献ガイドです。詳細なルールは `docs/` 配下の各ドキュメントを参照してください。

## TL;DR

1. **ブランチ**: `develop` から `feature/<topic>` を切る (詳細: [docs/git-workflow.md](docs/git-workflow.md))
2. **コミット**: Conventional Commits 準拠 (詳細: [docs/commit-convention.md](docs/commit-convention.md))
3. **品質ゲート**: 実装は `/build-with-gates` 経由を推奨 (詳細: [README.md](README.md))
4. **PR**: `develop` 向けに作成、テンプレートに従う

## 最初にやること

### 1. リポジトリのクローン

```bash
git clone <repo-url>
cd new_apps
```

### 2. コミットテンプレートの設定 (推奨)

```bash
git config --local commit.template .gitmessage
```

これでコミット時にエディタが開き、テンプレートが表示されます。

### 3. 開発環境のセットアップ

```bash
npm install
cp .env.example .env  # 後日追加予定
npx prisma migrate dev
npm run dev
```

(プロジェクト本体は未作成。今はハーネス構成のみ。)

## ブランチ運用 (Gitflow)

### 永続ブランチ
- **`main`**: 本番リリース。タグ付きでバージョン管理
- **`develop`**: 次期リリースの統合先。日常的な開発の基準ブランチ

### 一時ブランチ
- **`feature/<topic>`**: 新機能・改善。`develop` から切り、`develop` にマージ
- **`bugfix/<topic>`**: バグ修正 (非緊急)。`develop` から切り、`develop` にマージ
- **`release/<version>`**: リリース準備。`develop` から切り、`main` と `develop` にマージ
- **`hotfix/<topic>`**: 本番緊急修正。`main` から切り、`main` と `develop` にマージ

詳細フロー: [docs/git-workflow.md](docs/git-workflow.md)

## コミットメッセージ

**Conventional Commits** に従います:

```
<type>(<scope>): <subject>

<body>

<footer>
```

例:
```
feat(quiz): add time limit support for quizzes

Allow instructors to set a time limit per quiz. When time expires,
the attempt is auto-submitted with current answers.

Closes #42
```

許可される `type`:
| type | 用途 |
|---|---|
| `feat` | 新機能 |
| `fix` | バグ修正 |
| `docs` | ドキュメント |
| `style` | フォーマット (機能変更なし) |
| `refactor` | リファクタリング |
| `perf` | パフォーマンス改善 |
| `test` | テスト追加・修正 |
| `build` | ビルドシステム・依存関係 |
| `ci` | CI 設定 |
| `chore` | その他雑務 |
| `revert` | コミットの取り消し |

詳細: [docs/commit-convention.md](docs/commit-convention.md)

## Pull Request

1. `feature/*` で実装完了 → `develop` 向けに PR
2. PR テンプレート (`.github/PULL_REQUEST_TEMPLATE.md`) を埋める
3. CI (将来) と Gate (ローカル `/verify-only`) を全パス
4. レビュー後マージ (Squash merge 推奨)

## コードレビュー観点

- [ ] CLAUDE.md のコーディング規約に従っている
- [ ] テストが追加されている (`/verify-only` の test-coverage-gate)
- [ ] アクセシビリティが配慮されている (a11y-gate)
- [ ] セキュリティの観点で問題ない (security-gate)
- [ ] ドメインルール (CLAUDE.md) に整合 (domain-logic-gate)

## 質問・相談

(後日 Discussion / Issue 運用予定)
