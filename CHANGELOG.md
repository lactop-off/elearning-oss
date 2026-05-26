# Changelog

このプロジェクトの全ての注目すべき変更を記録します。

フォーマットは [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) に準拠し、
バージョニングは [Semantic Versioning](https://semver.org/lang/ja/) に従います。

## [Unreleased]

## [0.2.0] - 2026-05-26

### 概要

v0.1.0 リリース直後の minor バージョンアップ。クイズ機能を **MULTI_CHOICE** 対応に拡張し、SINGLE/MULTI を統一の採点フローで扱えるようにした。

### ハイライト

- 質問タイプを **discriminated union** で SINGLE_CHOICE / MULTI_CHOICE 両対応
- 採点ロジックを **集合等価 (all-or-nothing)** に統一 — 部分正解は意図的に 0 点
- 学習者バンドルへの answer key 漏洩は変わらずゼロ (`Choice.isCorrect` 非露出)
- 既存 SINGLE_CHOICE クイズへの後方互換あり (E2E suite 全 33 PASS)
- ハーネス試験 10 回目、**1 イテレーションで全 4 Gate PASS** (security / domain-logic / i18n + a11y / architecture)

### Added
- **クイズの MULTI_CHOICE 対応** (ハーネス試験 10 回目、1 イテレーションで全 Gate PASS)
  - `AddQuestionSchema` を `SINGLE_CHOICE` / `MULTI_CHOICE` の discriminated union に変更
    - SINGLE: `correctChoiceIndex` (単一)、MULTI: `correctChoiceIndices` (1〜N-1 個)
    - MULTI で全選択をした場合は Zod refine で degenerate として拒否
  - `createQuestionWithChoices` (data 層): `type` と正解インデックス配列を受け取る汎用関数
  - `addQuestionAction`: discriminated union を受け取り data 層に橋渡し
  - `findQuizForLearner` の select に `type` を追加 (`isCorrect` は引き続き非露出)
  - `gradeAndSubmitAttempt`: SINGLE/MULTI 共通の集合等価比較 (all-or-nothing) に統一
    - SINGLE は `choiceIds.length !== 1` を `INVALID_ANSWERS` で拒否
    - MULTI で `submittedSet.size === correctIds.size` かつ全要素一致のときのみ正解
    - partial credit は意図的に未実装
  - UI: `question-form` で type ラジオ + 動的選択肢 UI (SINGLE: radio、MULTI: checkbox)
  - UI: `quiz-taker` で type に応じて input type を切替
  - UI: `quiz-result` を `Map<questionId, Set<choiceId>>` ベースに刷新 (複数正解対応)
  - 翻訳キー: `quizzes.questionForm.{typeLabel,typeSingle,typeMulti,typeSingleHelper,typeMultiHelper,choicesHelperMulti}`、`questionList.{typeSingle,typeMulti}`、`attempts.take.{typeSingle,typeMulti}` (ja/en 一致)
  - E2E: `quiz-multi-choice.spec.ts` (3): 完全一致で合格、部分選択で不合格、余分選択で不合格

## [0.1.0] - 2026-05-26

### 概要

E-learning OSS プラットフォーム v0.1.0 — MVP 初回リリース。OSS として「実用に耐える最小単位」を目標に、講師の作成ワークフローと学習者の受講ループを一通りカバー。

### ハイライト

- **講師ワークフロー**: コース・レッスン・クイズ (SINGLE_CHOICE) の作成、公開/下書きトグル
- **学習者ワークフロー**: 公開カタログ → 受講登録 → レッスン閲覧 → 進捗マーク → クイズ受験 → 自動採点 → コース修了 → 修了証発行
- **修了判定**: 全必修レッスン完了 + 全必修クイズ合格 (`>=` 判定、`@@unique` 制約 + transaction で冪等性保証)
- **ハーネス開発**: Claude Code の Builder ⇄ Gate 自動ループで全 9 機能を品質保証付きで実装

### 技術スタック

- Next.js 16 (App Router, Turbopack) / React 19 / TypeScript 5 (strict)
- Tailwind CSS v4 / shadcn/ui (radix-nova)
- Prisma 7 + PostgreSQL 16 (driver adapter `@prisma/adapter-pg`)
- Auth.js v5 (Credentials + JWT)
- next-intl 4 (ja/en、`localePrefix: 'always'`)
- Vitest 4 + Playwright 1.60 + Testing Library
- bcryptjs / Zod / react-hook-form

### 主要機能

#### 認証
- メール+パスワードのサインアップ/サインイン/サインアウト
- 3 ロール (LEARNER / INSTRUCTOR / ADMIN)、Server Action での `requireUser` / `requireRole`

#### コース管理 (講師)
- コース CRUD (作成、一覧、詳細、公開トグル)
- レッスン追加 (TEXT コンテンツ、自動採番)
- クイズ作成 (SINGLE_CHOICE、2-6 選択肢、配点)

#### 学習 (学習者)
- 公開コースカタログ (未認証で閲覧可)
- 受講登録 (Enrollment)、「My learning」ダッシュボード
- レッスン読みページ + 前/次ナビ + 完了マーク
- 進捗バー (必修レッスン完了率)
- クイズ受験 + 自動採点 + 結果表示 (正解/不正解の理由を視覚化)
- コース修了 + 修了証発行 (CERT-{uuid})

#### i18n
- ja (default) / en、約 256 翻訳キー、両言語完全一致

### アーキテクチャ

- features/<domain>/{actions,components,data,schemas} レイヤー
- Prisma は data/ 配下のみ (architecture-gate で強制)
- Server Components がデフォルト、`"use client"` は最小限
- Server Action は `{ ok: true, data } | { ok: false, error }` 形式
- 全てのドメイン書き込みに**サーバー側所有権再検証** (IDOR 防止)

### テスト

- Vitest: 48/48 PASS (unit + integration)
- Playwright: 30/30 PASS (実 DB に対するシナリオテスト)

### 開発インフラ

- docker-compose.yml で PostgreSQL 16-alpine をワンコマンド起動
- `prisma/seed.ts` でデモユーザー 3 + 公開コース "Intro to TypeScript" を投入
- Conventional Commits + Gitflow

### 既知の制限事項

- クイズは SINGLE_CHOICE のみ (MULTI_CHOICE / TEXT は未対応)
- レッスン/クイズの編集・削除・並び順変更は未実装
- 学習者ダッシュボード以外のロール別ダッシュボードなし (管理者画面なし)
- 認証は Email/Password のみ (OAuth プロバイダ未対応)
- 通知 (メール) なし
- レート制限なし

詳細は各機能の commit メッセージを参照。

---

### Added
- **コース修了判定にクイズ合格を統合 (Phase 3 / MVP 完成)** (ハーネス試験 9 回目、1 イテレーションで全 Gate PASS)
  - `features/completions/data/completions.ts`:
    - `checkAndMarkComplete` を必修レッスン完了 + 必修クイズ合格 (`attempts: { some: { userId, status: SUBMITTED, passed: true } }`) の総合判定に拡張
    - `totalRequired = requiredLessons + requiredQuizzes`、`totalCompleted = completedLessons + passedQuizzes` で atomic に集計
    - `getCourseRequirementsProgress(enrollmentId, userId, courseId)` を新規追加 (UI 用、レッスン進捗 + クイズ合格カウント返却)
  - `features/attempts/actions/submit-attempt.ts`:
    - 採点が passed のときに `checkAndMarkComplete` を呼び、新規修了 → `/learn` を revalidate
    - completion チェック失敗は `console.error` のみ (採点結果はそのまま返す = 学習者体験を壊さない)
  - `app/[locale]/learn/[slug]/page.tsx`:
    - 必修クイズが存在するときのみ「必修クイズ合格: X/Y」を表示
  - 翻訳キー追加: `learn.detail.quizProgress` (`{passed}/{total}`)
  - E2E `tests/e2e/course-completion.spec.ts` を refactor:
    - 既存のレッスンのみ修了テストを fresh course ベースに変更 (テスト隔離)
    - 新規: 必修クイズが存在するコースで「レッスン完了だけでは修了しない、クイズ合格で修了」を検証
  - `playwright.config.ts`: dev サーバー過負荷対策で local workers を 2 に調整 (フレーキ回避)

### MVP 完成
学習ループが完全に閉じました:
- 受講登録 → レッスン閲覧 → 完了マーク → 必修クイズ受験 → 全合格 → コース修了 + 修了証発行
- **コース修了判定 = 全必修レッスン完了 + 全必修クイズ合格** (CLAUDE.md ドメインルール準拠)
- **クイズ受験 + 自動採点機能 (学習者、Phase 2)** (ハーネス試験 8 回目、1 イテレーションで全 Gate PASS)
  - `features/attempts/{schemas,data,actions,components}/`:
    - `schemas/attempt.ts` + テスト: `SubmitAttemptSchema`
    - `data/attempts.ts`: `findLatestAttempt`, `findInProgressAttempt`,
      `findAttemptOwnedBy`, `startAttempt`, `gradeAndSubmitAttempt` (transaction
      内で関係性検証 + 採点 + Answer 作成 + Attempt 状態更新を atomic),
      `listAnswersByAttempt`
    - `actions/start-attempt.ts`: クイズ受験開始 (既存 IN_PROGRESS は resume)
    - `actions/submit-attempt.ts`: 採点提出 Server Action
    - `components/{quiz-taker,quiz-result,start-quiz-button}.tsx`: 受験フォーム
      (fieldset/legend で問題ごとにラジオグループ)、結果表示 (合格バナー +
      問題別正誤、色 + テキストで重複表現)
  - `features/quizzes/data/quizzes.ts`: `findQuizForLearner` (isCorrect を
    クライアントに漏らさない select)、`listQuizzesForEnrolledLearner`
    (学習者コース詳細用、各クイズの合格状況含む)
  - 新規ページ: `/learn/[slug]/quizzes/[quizId]` (状態別: 未開始 / 進行中 /
    結果表示の 3 状態をサーバー側で分岐)
  - `/learn/[slug]` (学習者コース詳細) を更新: レッスンごとにクイズ一覧 + 合格バッジ
  - 翻訳キー追加: `attempts.{page,start,take,result,toast,errors}.*`,
    `learn.detail.{quizzesAria,quizPassed,quizPassedAria,quizNotPassed,quizNotPassedAria}`
  - E2E `tests/e2e/quiz-taking.spec.ts` (3、serial 実行): 受験合格 +
    `✓ correct` 表示 + コース詳細で Passed バッジ、誤答時の `your answer`
    マーカー + 不合格スコア、未エンロール 404
  - 採点: `Math.round(earned/possible * 100)`、合格判定は `score >= passingScore`
    (>= で境界値合格、CLAUDE.md ルール準拠)
  - `playwright.config.ts` 維持 + `test.describe.configure({ mode: 'serial' })`
    で重い設定を含むテストはファイル内 serial 化
- **クイズ作成機能 (講師、Phase 1)** (ハーネス試験 7 回目、1 イテレーションで全 Gate PASS)
  - `features/quizzes/{schemas,data,actions,components}/`:
    - `schemas/{quiz,question}.ts` + テスト: `CreateQuizSchema`,
      `AddSingleChoiceQuestionSchema` (cross-field refine で
      `correctChoiceIndex < choices.length` を保証)
    - `data/quizzes.ts`: createQuiz, listQuizzesByLesson,
      findQuizOwnedByInstructor, findLessonOwnedByInstructorForQuiz,
      listLessonQuizzesByCourseOwned (コース直下のレッスン+クイズ一覧)
    - `data/questions.ts`: listQuestionsByQuiz,
      createSingleChoiceQuestion (`prisma.$transaction` で
      `@@unique([quizId, order])` レース対策の自動採番、Choices を
      ネスト create で同時生成)
    - `actions/create-quiz.ts`: クライアント供給 lessonId をサーバ
      解決値と照合 (`!==` で拒否)、講師所有権を二重検証
    - `actions/add-question.ts`: クイズ所有権を再検証
    - `components/{quiz-form,question-form,question-list,
      lesson-quizzes-overview}.tsx`:
      - 動的選択肢 (2-6 個、useFieldArray)、`<fieldset><legend>` +
        ラジオ + `aria-label` で a11y
      - 質問リストは `<ol>` 順序付き、正解は色 + テキスト
        (`✓ correct`) で重複表現
  - 新規ページ:
    - `/instructor/courses/[slug]/lessons/[order]/quizzes/new`
    - `/instructor/courses/[slug]/quizzes/[quizId]`
  - 講師コース詳細ページに「クイズ」セクション追加: レッスン別の
    クイズ一覧 + 「クイズを追加」ボタン
  - 翻訳キー追加 (ja/en 各 219 keys 完全一致): `courses.detail.quizzesHeading`,
    `quizzes.{new,manage,questionForm,questionList,overview,toast,errors}.*`
  - E2E `tests/e2e/quiz-authoring.spec.ts` (2): フレッシュコース →
    レッスン → クイズ作成 → 質問追加 → 正解マーク表示、学習者は
    home へリダイレクト
- **コース修了判定 + 修了証発行** (ハーネス試験 6 回目、1 イテレーションで全 Gate PASS)
  - `features/completions/data/completions.ts`: `checkAndMarkComplete`
    を `prisma.$transaction` で実装。所有権検証 + 必修進捗集計 +
    `Enrollment.completedAt` 設定 + `Certificate` 発行を atomic
  - `findCertificate(userId, courseId)` で表示用シリアル取得
  - `features/completions/components/completion-banner.tsx`: `<aside
    role="status" aria-labelledby>` の修了通知、`Intl.DateTimeFormat`
    で日付ローカライズ、`CERT-{uuid}` シリアル表示
  - `features/progress/actions/mark-complete.ts`: `recordProgress`
    成功後に `checkAndMarkComplete` を呼び、完了時は `/learn` を revalidate。
    戻り値に `{ courseCompleted, certificateSerial }`
  - `app/[locale]/learn/[slug]/page.tsx`: completedAt あり時のみ
    CompletionBanner を表示
  - 翻訳キー: `completions.banner.{title, description, serialLabel}` (ja/en)
  - 冪等性: 既完了の early-return + `@@unique([userId,courseId])` の DB 制約で多重防御
  - Cert.serial は `CERT-${crypto.randomUUID()}` (122-bit entropy)
  - E2E `tests/e2e/course-completion.spec.ts`: 全 3 必修レッスン完了 →
    バナー + 進捗 100% + CERT- プレフィックス表示
- 学習者向け **レッスン閲覧 + 進捗トラッキング** (ハーネス試験 5 回目、Iteration 2 で全 Gate PASS)
  - `app/[locale]/learn/[slug]/page.tsx`: 受講中コース概要 + 進捗バー + レッスン一覧
  - `app/[locale]/learn/[slug]/lessons/[order]/page.tsx`: レッスン読みページ + 前/次ナビ + Mark Complete
  - `features/progress/`:
    - `schemas/progress.ts` + テスト: `MarkCompleteSchema`
    - `data/progress.ts`: `recordProgress` (P2002 → `ProgressAlreadyRecordedError`), `listProgressByEnrollment`
    - `actions/mark-complete.ts`: Server Action、`findLessonInEnrollment` 経由で所有権 + 関係性を再検証
    - `components/{progress-summary,mark-complete-button}.tsx`: 必修分母 (`requiredCompleted/requiredTotal`) で進捗率算出、`role="progressbar"` + ARIA、既完了時は `disabled` ボタン
  - `features/enrollments/data/enrollments.ts`: `findEnrolledCourseBySlug` 追加 (公開済 + 受講者本人のみ)
  - `features/lessons/data/lessons.ts`: `findLessonByCourseAndOrder`, `findLessonInEnrollment` 追加
  - 翻訳キー追加 (ja/en 30 keys): `learn.detail.*`, `learn.lesson.*`, `progress.{summary,button,toast,errors}.*`
  - E2E テスト `tests/e2e/lesson-read.spec.ts` (3): エンロール済学習者の閲覧→完了マーク→進捗反映、未エンロールは 404、未認証は /sign-in
  - **Iteration 1 の architecture-gate 指摘**: mark-complete.ts が `prisma` を直接呼んでいた → `findLessonInEnrollment` 経由に修正
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
