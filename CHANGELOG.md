# Changelog

このプロジェクトの全ての注目すべき変更を記録します。

フォーマットは [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) に準拠し、
バージョニングは [Semantic Versioning](https://semver.org/lang/ja/) に従います。

## [Unreleased]

### Added
- Prisma 7.8 + PostgreSQL 環境構築
  - `prisma/schema.prisma` に CLAUDE.md ドメインモデルをフル定義
    (User / Course / Lesson / Enrollment / Progress / Quiz / Question /
    Choice / Attempt / Answer / Certificate + 4 種の Enum)
  - driver adapter (`@prisma/adapter-pg`) 必須化への対応
  - `lib/db.ts`: Next.js dev mode 対応のシングルトン PrismaClient
  - `prisma/seed.ts`: 3 ロールのデモユーザー投入
  - `.env.example`: DATABASE_URL のテンプレート
  - npm scripts: `db:generate` / `db:migrate` / `db:migrate:deploy` /
    `db:push` / `db:studio` / `db:seed` / `db:reset` /
    `postinstall: prisma generate`
- Next.js 16 (App Router, Turbopack) プロジェクトの初期化
  - React 19.2 / TypeScript 5 (strict)
  - Tailwind CSS v4
  - ESLint 9 (eslint-config-next)
  - Prettier 3 と `.prettierrc.json` / `.prettierignore`
  - npm scripts: `dev`, `build`, `start`, `lint`, `lint:fix`, `typecheck`, `format`, `format:check`
  - `next.config.ts` で turbopack.root を明示
  - Next.js 16 の AI エージェント向けガイド (`AGENTS.md`)
- Claude Code ハーネス構成 (Builder ⇄ Gate 自動ループ)
  - 5 種の Builder エージェント (frontend / backend / db / test / refactor)
  - 11 種の Gate エージェント (type-safety / lint-format / test-coverage / unit-test-runner / e2e-test / accessibility / security / performance / i18n / architecture / domain-logic)
  - 4 つのスラッシュコマンド (`/build-with-gates` / `/verify-only` / `/builder-only` / `/escalate`)
- プロジェクトコンテキスト (`CLAUDE.md`)
- Git 運用ドキュメント
  - Gitflow ベースのブランチ運用 (`docs/git-workflow.md`)
  - Conventional Commits 規約 (`docs/commit-convention.md`)
  - コミットメッセージテンプレート (`.gitmessage`)
- GitHub テンプレート (PR / Issue)
- 貢献ガイド (`CONTRIBUTING.md`)

### Notes
- プロジェクト本体 (Next.js / Prisma) はまだ未作成
- 次ステップ: プロジェクト初期化、Prisma スキーマ定義

---

## バージョニング方針

- **0.x.y**: 実験段階。破壊的変更は MINOR 上げで吸収可
- **1.0.0**: 安定版リリース。以降は SemVer 厳守
  - MAJOR: 破壊的変更
  - MINOR: 後方互換のある機能追加
  - PATCH: 後方互換のあるバグ修正

## セクション一覧

各バージョンで使うセクション:
- `Added` — 新機能
- `Changed` — 既存機能の変更
- `Deprecated` — 将来削除予定
- `Removed` — 削除された機能
- `Fixed` — バグ修正
- `Security` — セキュリティ修正
