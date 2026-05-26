# Changelog

このプロジェクトの全ての注目すべき変更を記録します。

フォーマットは [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) に準拠し、
バージョニングは [Semantic Versioning](https://semver.org/lang/ja/) に従います。

## [Unreleased]

### Added
- 学習者向け **公開カタログ + 受講登録 + My learning** (ハーネス試験 4 回目、Iteration 2 で全 Gate PASS — i18n で ja.json の `nav.catalog`/`myLearning` 欠落を検出し修正)
  - `app/[locale]/courses/page.tsx`: 公開コースのカタログ (未認証で閲覧可)
  - `app/[locale]/courses/[slug]/page.tsx`: 公開コース詳細
    - 未認証: 「Sign in to enroll」
    - ログイン済 未登録: 「Enroll」ボタン
    - ログイン済 登録済: 「You are enrolled」リンク
  - `app/[locale]/learn/page.tsx`: 受講中コース一覧 (My learning)
  - `features/enrollments/`:
    - `schemas/enroll.ts` + テスト
    - `data/enrollments.ts`: `createEnrollment` (P2002 → `AlreadyEnrolledError`), `findEnrollment`, `listEnrollmentsByUser`
    - `actions/enroll.ts`: Server Action、サーバー側で `findPublishedCourseById` 再検証で IDOR / 未公開コース登録防止
    - `components/enroll-button.tsx`: 未認証時は `/sign-in` へ
  - `features/courses/data/courses.ts`: `listPublishedCourses` / `findPublishedCourseBySlug` / `findPublishedCourseById` を追加 (全て `publishedAt: not null` で絞込)
  - `auth.config.ts`: `/courses` をパブリックパスに追加 (`/instructor/courses` とは衝突しない)
  - `components/site-header.tsx`: Catalog / My learning リンク追加 (My learning はログイン時のみ)
  - `prisma/seed.ts`: 公開済みデモコース "Intro to TypeScript" + 3 レッスンを投入
  - 翻訳キー追加: `nav.{catalog,myLearning}`, `catalog.*`, `enrollments.*`, `learn.*` (両言語完全一致)
  - E2E `tests/e2e/catalog-and-enroll.spec.ts` (5 件): 未認証カタログ閲覧、未認証 Enroll CTA、新規ユーザーの登録→My learning 表示、二重登録 UI、ヘッダーのロール別表示
- 講師向け **コース詳細ページ + レッスン追加機能** (ハーネス試験 3 回目、1 イテレーションで全 Gate PASS)
  - `app/[locale]/instructor/courses/[slug]/page.tsx`: コース詳細 +
    レッスン一覧 + 「レッスンを追加」ボタン
  - `app/[locale]/instructor/courses/[slug]/lessons/new/page.tsx`:
    レッスン追加フォーム
  - `features/lessons/`:
    - `schemas/lesson.ts` + テスト: `CreateLessonSchema`
    - `data/lessons.ts`: `listLessonsByCourse` + `prisma.$transaction` で
      `@@unique([courseId, order])` レースに耐える `order` 自動採番
    - `actions/create.ts`: 所有権 (`findCourseOwnedBy`) 経由で Server Action
    - `components/{lesson-list,lesson-form}.tsx`: 順序付き `<ol>` で
      レッスン一覧、`isRequired` チェックボックス付きフォーム
  - `features/courses/data/courses.ts`: `findCourseBySlugOwnedBy` 追加
  - 翻訳キー追加 (ja/en 27 keys): `courses.detail.*`, `lessons.*`
  - E2E テスト `tests/e2e/lesson-add.spec.ts`: 詳細遷移 + 追加フロー、
    学習者は home へリダイレクト
  - `playwright.config.ts`: dev サーバー過負荷回避のためローカル
    workers を 4 に上限設定
- 講師向け **コース一覧 + 公開トグル + サイトヘッダー** (ハーネス試験 2 回目、1 イテレーションで全 Gate PASS)
  - `components/site-header.tsx`: Server Component、ロールに応じて
    ナビゲーション項目を切替 (講師/管理者には "My courses"、未認証
    には Sign in / Create account)
  - `app/[locale]/instructor/courses/page.tsx`: 講師の自コース一覧
    (空時の CTA カード付き)
  - `features/courses/`:
    - `data/courses.ts`: `listCoursesByInstructor` / `findCourseOwnedBy`
      / `setCoursePublishedAt` を追加
    - `actions/publish.ts`: 公開/下書きトグル Server Action、所有権
      チェック付き
    - `components/{course-list-item,course-list-empty,publish-toggle}.tsx`
  - ホームページを刷新: ヘッダーとの重複を排し、未認証は単一の
    Create account CTA、講師ログインなら "My courses" CTA を表示
  - (auth) レイアウトから appName リンク削除 (ヘッダーで提供されるため)
  - 翻訳キー追加 (ja/en 一致、17 keys): `nav.*`, `courses.list.*`,
    `courses.toast.{published,unpublished}`, `courses.errors.NOT_FOUND`
  - E2E テスト `tests/e2e/course-list.spec.ts`: ロール別ナビ表示、
    講師の公開→下書きフロー
- 講師向け **コース作成機能** (Builder ⇄ Gate ハーネスの本番試験)
  - `app/[locale]/instructor/courses/new/page.tsx`: 認証 + ロール
    (INSTRUCTOR / ADMIN) チェック付きのコース作成ページ
  - `features/courses/{schemas,data,actions,components}/`:
    - `schemas/course.ts`: Zod `CreateCourseSchema` (title 200/slug 100
      /description 2000、slug は kebab-case ASCII)
    - `data/courses.ts`: `createCourse()` + `SlugTakenError`
      (P2002 → SLUG_TAKEN)
    - `actions/create.ts`: Server Action、{ ok, ... } 形式、
      `requireRole` で認可、`revalidatePath('/instructor/courses')`
    - `components/course-form.tsx`: react-hook-form + zodResolver、
      タイトルから自動 slug 生成、サブミット可否ロジックも改善
  - `lib/slug.ts` + `lib/slug.test.ts`: `slugify()` / `isValidSlug()` 共通化
  - 翻訳キー `courses.{new,toast,errors}.*` を ja/en 両方に追加 (17 keys)
  - E2E テスト `tests/e2e/course-creation.spec.ts`: 講師作成成功、
    学習者は home へリダイレクト、未認証は sign-in へ
- アクセシビリティ強化
  - `components/ui/card.tsx`: `CardTitle` に `asChild` 対応 (Slot 経由で
    h1 等のセマンティック要素を渡せる)、`CardDescription` を `<p>` に
  - `components/ui/textarea.tsx`: shadcn Textarea プリミティブを新規追加

### Changed
- 国際化対応 (i18n) を next-intl 4 で導入
  - 対応ロケール: `ja` (デフォルト) / `en`
  - URL は `localePrefix: 'always'` (/ja/*, /en/*)、`/` は
    Accept-Language ベースで自動リダイレクト
  - `i18n/routing.ts`: defineRouting 設定
  - `i18n/request.ts`: getRequestConfig + 動的 messages import
  - `i18n/navigation.ts`: Link / redirect / useRouter / usePathname の locale-aware ラッパー
  - `messages/ja.json` と `en.json`: UI 文字列を 30+ キーで網羅
- アプリ構造を `app/[locale]/*` に再編成
  - 旧 `app/(auth)/` を `app/[locale]/(auth)/` に git mv
  - `app/layout.tsx` はパススルー、`app/[locale]/layout.tsx` で
    `<html lang>` / フォント / NextIntlClientProvider / Toaster を管理
  - generateStaticParams + generateMetadata で静的ルート最適化
- `proxy.ts` を next-intl + Auth.js の二段構成に
  - `/api/auth/*` は素通り、それ以外は intlMiddleware → auth() の順
  - `auth.config.ts` の `authorized` はロケールプレフィックスを
    剥がしてからパブリック判定
- 各ページ/コンポーネントを useTranslations / getTranslations で翻訳化
- E2E テストを 7 件に拡張、ja/en 両方のロケールで表示・認証フローを検証
### Changed
- 開発用 DB 環境の確立
  - `docker-compose.yml`: PostgreSQL 16-alpine、port 5432、永続ボリューム、ヘルスチェック付き
  - 初回マイグレーション `prisma/migrations/20260526015612_init/`
    (11 テーブル + 4 enum + インデックス・FK 制約)
  - `db:seed` を `tsx --env-file=.env` 経由に変更し、シェル env なしでも動作
  - 実 DB に対する E2E テストを追加:
    - デモ学習者のサインイン → ホームでロール表示 → サインアウト
    - 未知メールでのサインインエラー表示
  - 検証結果: vitest 13/13 PASS、playwright **5/5 PASS** (実 DB)
- 認証 UI: サインイン / サインアップ / サインアウト
  - `app/(auth)/layout.tsx`: 中央寄せのカードレイアウト
  - `app/(auth)/sign-in/page.tsx`, `app/(auth)/sign-up/page.tsx`:
    既ログイン時は `/` へリダイレクト
  - `features/auth/components/sign-in-form.tsx`,
    `sign-up-form.tsx`, `sign-out-button.tsx`: react-hook-form +
    zodResolver + shadcn Form、sonner で結果通知
  - サインアップ成功後は自動でサインインまで実行 (失敗時は
    `/sign-in` にフォールバック)
  - ルートレイアウトに `<Toaster>` を追加
  - ホームページを刷新: 未ログイン時は Sign in / Create account
    リンク、ログイン時はユーザー名 + ロール + Sign out ボタン
  - E2E テスト 3 件 (ホーム、サインイン、サインアップの表示)
- 認証コアを Auth.js v5 (next-auth@beta) で実装
  - Email/Password (Credentials provider) のみ、JWT セッション
  - `auth.config.ts` (Edge-safe) と `auth.ts` (Node-side) の分割構成
  - `proxy.ts`: 認可済みでない場合 `/sign-in` にリダイレクト
    (Next.js 16 で `middleware` → `proxy` に改称された新規約に準拠)
  - `lib/auth.ts`: `getSession` / `getCurrentUser` / `requireUser` /
    `requireRole(...UserRole)` / `AuthError`
  - `lib/password.ts`: bcryptjs (cost 12) でハッシュ・検証
  - `features/auth/`:
    - `schemas/credentials.ts`: SignIn / SignUp の Zod スキーマ
    - `data/users.ts`: User データアクセス
    - `actions/signup.ts`: 登録 Server Action (`{ ok, ... }` 形式)
    - `actions/signin.ts`: ログイン Server Action (`signIn('credentials')` ラップ)
    - `actions/signout.ts`: ログアウト
  - `types/next-auth.d.ts`: Session / User / JWT に role を型拡張
  - `app/api/auth/[...nextauth]/route.ts`: Auth.js ハンドラ
  - `prisma/seed.ts`: デモユーザーに passwordHash を付与
    (共通パスワード `demo1234`)
  - `.env.example`: `AUTH_SECRET` のテンプレ
- テスト環境を整備 (Vitest 4 + Playwright 1.60)
  - **Vitest**: `vitest.config.ts` (jsdom 環境、`tests/setup.ts` で
    Testing Library の cleanup)、サンプル `lib/utils.test.ts`
  - **Playwright**: `playwright.config.ts` (chromium、`webServer`
    で `npm run dev` 自動起動)、サンプル `tests/e2e/home.spec.ts`
  - npm scripts: `test`, `test:watch`, `test:coverage`,
    `test:e2e`, `test:e2e:ui`
  - tsconfig.json に `vitest/globals` と `@testing-library/jest-dom`
    の型を追加
  - .gitignore: `playwright-report/`, `test-results/`, `.playwright/`
- shadcn/ui (radix-nova スタイル、neutral ベースカラー) を導入
  - `components.json`: shadcn 設定 (alias: `@/components`, `@/lib/utils` 等)
  - `lib/utils.ts`: `cn()` ヘルパー
  - 基本コンポーネント: `button`, `card`, `input`, `label`, `form`,
    `dialog`, `dropdown-menu`, `sonner`
  - 関連パッケージ: react-hook-form / @hookform/resolvers / zod /
    @radix-ui/react-slot / @radix-ui/react-label
  - `form.tsx` は手動配置 (現行 shadcn CLI でレジストリ取得不能のため公式テンプレを移植)
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
