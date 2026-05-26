# コミットメッセージ規約

このプロジェクトは [Conventional Commits 1.0.0](https://www.conventionalcommits.org/) に準拠します。これによりリリースノート自動生成、変更履歴の検索性、コミットレビューの効率が向上します。

---

## 基本構造

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 必須要素

- **`<type>`**: 変更の種類 (後述の一覧から選ぶ)
- **`<subject>`**: 変更内容の要約 (1 行、50 文字目安、最大 72 文字)

### 任意要素

- **`(<scope>)`**: 変更の影響範囲 (`courses`, `quiz`, `auth`, `db` など)
- **`<body>`**: 詳細説明 (なぜこの変更が必要か、何を解決するか)
- **`<footer>`**: メタ情報 (`Closes #42`, `BREAKING CHANGE: ...` など)

---

## `<type>` 一覧

| type | 用途 | 例 |
|---|---|---|
| `feat` | ユーザー視点の新機能追加 | `feat(quiz): add time limit support` |
| `fix` | バグ修正 | `fix(progress): correct rounding in completion %` |
| `docs` | ドキュメントのみの変更 | `docs(readme): add setup instructions` |
| `style` | 機能に影響しないフォーマット変更 | `style: apply prettier to all files` |
| `refactor` | 機能変更を伴わない内部実装の改善 | `refactor(auth): extract session helper` |
| `perf` | パフォーマンス改善 | `perf(courses): add index on slug column` |
| `test` | テスト追加・修正のみ | `test(quiz): add boundary cases for scoring` |
| `build` | ビルドシステム・依存関係 | `build: update next to 15.1` |
| `ci` | CI 設定の変更 | `ci: add github actions for typecheck` |
| `chore` | その他雑務 (設定ファイル等) | `chore: update gitignore for vscode` |
| `revert` | コミットの取り消し | `revert: feat(quiz): add time limit support` |

### type の使い分けの目安

#### `feat` vs `fix`
- **feat**: 新しい振る舞いを追加
- **fix**: 既存の壊れた振る舞いを直す

#### `refactor` vs `perf` vs `style`
- **refactor**: 構造を改善 (テストが通る前提)
- **perf**: 測定可能なパフォーマンス改善
- **style**: フォーマット・タイポなど見た目だけ

#### `chore` vs `build` vs `ci`
- **build**: `package.json` の dependencies、ビルド設定
- **ci**: `.github/workflows/`, lint 設定 (CI で動くもの)
- **chore**: それ以外の雑務

---

## `<scope>` 一覧 (推奨)

プロジェクトのドメイン区切りに合わせる:

- `courses` — コース管理
- `lessons` — レッスン管理
- `quiz` — クイズ・採点
- `progress` — 進捗・修了判定
- `enrollment` — 受講登録
- `auth` — 認証・認可
- `users` — ユーザー管理
- `admin` — 管理者機能
- `ui` — 汎用 UI コンポーネント
- `db` — Prisma スキーマ・マイグレーション
- `i18n` — 多言語対応
- `a11y` — アクセシビリティ
- `infra` — インフラ・デプロイ周り
- `harness` — Claude Code 設定

複数 scope にまたがる場合は `,` で並べる: `feat(quiz,progress): ...`

scope が広範すぎる場合は省略: `chore: bump dependencies`

---

## `<subject>` のルール

1. **英語で書く** (OSS として公開予定のため)
2. **命令形・現在形**: `add`, `fix`, `update` (× `added`, `fixed`, `updates`)
3. **先頭は小文字**
4. **末尾にピリオドなし**
5. **50 文字目安、最大 72 文字**

良い例:
- `feat(quiz): add time limit support`
- `fix(auth): prevent session fixation on login`
- `refactor(progress): extract completion calculator`

悪い例:
- `Added quiz time limit.` (過去形、ピリオドあり、type 欠落)
- `feat(quiz): Add Time Limit Support` (大文字)
- `feat(quiz): updates` (具体性なし)

---

## `<body>` のルール

- subject から **1 行空けて**書く
- **なぜ** この変更が必要かを説明 (何をしたかは diff で分かる)
- 72 文字で折り返す
- 日本語可 (チーム内の共通理解のため英語推奨だが、複雑な意図は日本語の方が誤解が少ない)

例:
```
feat(quiz): add time limit support

Instructors can now set a time limit on quizzes. When the timer
expires, the attempt auto-submits with the answers entered so far.

The timer is enforced server-side at submission to prevent client
manipulation. The client-side countdown is for UX only.
```

---

## `<footer>` のルール

### Issue / PR の参照

- 解決: `Closes #42`, `Fixes #42`, `Resolves #42` (GitHub が自動 close)
- 参照のみ: `Refs #42`, `See #42`

### 破壊的変更

`BREAKING CHANGE:` で始めて変更内容と移行手順を書く:

```
feat(api)!: change quiz attempt response shape

BREAKING CHANGE: The `submitAttempt` action now returns
{ ok, data: { score, passed, attemptId } } instead of
{ score, passed }. Update all callers accordingly.
```

`!` を type/scope の後に付けて視覚的に明示する: `feat(api)!:`

### 共同作業者

```
Co-Authored-By: Name <email@example.com>
```

Claude Code が作成したコミットには:
```
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## 実例集

### シンプルな機能追加
```
feat(courses): add course duplication
```

### バグ修正 (Issue 連携)
```
fix(progress): handle empty lesson list in completion calc

Previously divided by zero when a course had no lessons,
returning NaN. Now returns 0.

Closes #87
```

### リファクタリング
```
refactor(auth): extract role check to lib/auth.ts

Move the can() helper from features/admin/data to lib/auth.ts
so it can be reused across features.
```

### 破壊的変更
```
feat(db)!: rename Course.published to Course.publishedAt

Track publish timestamp instead of boolean. Migration script
included; existing rows get publishedAt set from createdAt.

BREAKING CHANGE: Queries using `where: { published: true }`
must be updated to `where: { publishedAt: { not: null } }`.

Refs #112
```

### 依存関係更新
```
build: bump next from 15.0.3 to 15.1.0

Includes fix for App Router cache invalidation that was
causing stale data after revalidatePath.
```

### マルチスコープ
```
feat(quiz,progress): mark course complete on final quiz pass

When a learner passes the final required quiz of a course,
the course is auto-marked as completed and a completion record
is created.

Closes #56
```

### コミットの取り消し
```
revert: feat(quiz): add time limit support

This reverts commit 9c8a5f2.

Reason: timer logic broke pre-existing untimed quizzes.
Reverting until #134 is resolved.
```

---

## ツール・自動化

### コミットテンプレートの有効化

リポジトリローカルで設定 (推奨):
```bash
git config --local commit.template .gitmessage
```

### commitlint (将来導入予定)

`.commitlintrc.json` で Conventional Commits を強制する設定を入れる予定。
今は人間 / Claude が手動で守る。

### CHANGELOG 自動生成

`feat`, `fix`, `perf` を中心に `CHANGELOG.md` に集約する。
リリース時 (`release/*` ブランチ) に手動で整理する。

---

## チェックリスト

コミットする前に確認:

- [ ] `<type>` が正しい (feat/fix/refactor 等)
- [ ] `<subject>` が命令形・現在形
- [ ] `<subject>` が 72 文字以下
- [ ] `<body>` が「なぜ」を説明している (必要な場合)
- [ ] 関連 Issue 番号を footer に書いた (該当時)
- [ ] 破壊的変更があれば `BREAKING CHANGE:` を書いた
- [ ] 1 つのコミットに 1 つの論理的変更 (feat と refactor を混ぜない)
- [ ] `.env` 等の秘密情報を含めていない

---

## 関連

- [Conventional Commits 仕様](https://www.conventionalcommits.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [Semantic Versioning](https://semver.org/)
- [Git Workflow](git-workflow.md)
