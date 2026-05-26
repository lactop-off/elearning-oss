# E-learning OSS — Project Context

> **AI エージェント向け重要事項**: このプロジェクトは Next.js 16 を使用しています。Next.js 15 以前と API・規約・ファイル構造が異なる点があります。実装前に `@AGENTS.md` と `node_modules/next/dist/docs/` の関連ガイドを参照してください。

## プロジェクト概要

オープンソースの E-learning プラットフォーム。Moodle / Open edX の代替を目指し、モダンな技術スタックで再構築する。

### 対象ユーザー
- **学習者 (Learner)**: コース受講、クイズ受験、進捗確認
- **講師 (Instructor)**: コース・レッスン作成、クイズ作成、学習者の進捗確認
- **管理者 (Admin)**: ユーザー管理、コース承認、システム設定

### 主要機能 (MVP)
1. コース・レッスン管理 (CRUD、階層構造、公開/非公開)
2. クイズ・評価機能 (多肢選択、記述、自動採点、合格基準)
3. 学習進捗トラッキング (レッスン単位の完了、コース修了判定、ダッシュボード)

---

## 技術スタック

- **Frontend**: Next.js 16 (App Router, Turbopack) / React 19 / TypeScript (strict)
- **UI**: Tailwind CSS v4 / shadcn/ui / Radix UI primitives
- **Form**: React Hook Form + Zod (バリデーション)
- **Backend**: Next.js Server Actions / Route Handlers
- **DB**: PostgreSQL 16 / Prisma 7 (ORM, driver adapter `@prisma/adapter-pg` 必須)
  - クライアントは `lib/db.ts` のシングルトン (`import { prisma } from '@/lib/db'`)
  - 生成物は `lib/generated/prisma/` (gitignore 済)
- **Auth**: NextAuth.js (or Lucia — 後で決定)
- **Test**: Vitest (ユニット) / Playwright (E2E) / Testing Library
- **i18n**: next-intl
- **Lint/Format**: ESLint / Prettier / TypeScript strict
- **CI/CD**: GitHub Actions

---

## ドメインモデル (Prisma 想定)

主要エンティティと関係:

- `User` (id, email, name, role: LEARNER|INSTRUCTOR|ADMIN)
- `Course` (id, title, slug, description, instructorId, published)
- `Lesson` (id, courseId, title, order, contentType, content)
- `Enrollment` (id, userId, courseId, enrolledAt, completedAt?)
- `Progress` (id, enrollmentId, lessonId, completedAt)
- `Quiz` (id, lessonId?, courseId?, title, passingScore, timeLimit?)
- `Question` (id, quizId, type: SINGLE|MULTI|TEXT, body, points)
- `Choice` (id, questionId, body, isCorrect)
- `Attempt` (id, userId, quizId, startedAt, submittedAt?, score?)
- `Answer` (id, attemptId, questionId, selectedChoiceIds[], textAnswer?)

### ドメインルール
- コースは `published=true` のときのみ学習者に表示
- Enrollment がなければレッスンへアクセス不可
- Quiz の合格判定は `score >= passingScore`
- コース修了 = 全必修レッスン完了 + 全必修クイズ合格
- 進捗計算は Server-side で行い、クライアントに数値のみ送る

---

## コーディング規約

### 全般
- Server Components を**デフォルト**にする。`"use client"` は必要最小限に
- 型は `interface` よりも `type` を優先
- `any` 禁止 (`unknown` + 型ガードを使う)
- ファイル名は `kebab-case`、コンポーネント名は `PascalCase`
- ディレクトリは機能単位 (`features/courses/`, `features/quizzes/`)

### ディレクトリ構造 (予定)
```
app/                    # Next.js App Router
  (auth)/               # 認証関連ルート
  (learner)/            # 学習者向けルート
  (instructor)/         # 講師向けルート
  (admin)/              # 管理者向けルート
  api/                  # Route Handlers (必要な場合のみ)
components/             # 共通UIコンポーネント
  ui/                   # shadcn/ui 由来
features/               # 機能単位のモジュール
  courses/
  lessons/
  quizzes/
  progress/
lib/                    # ユーティリティ、Prisma client、auth
  db.ts
  auth.ts
  utils.ts
prisma/
  schema.prisma
  migrations/
  seed.ts
messages/               # i18n 翻訳ファイル
  ja.json
  en.json
tests/
  e2e/                  # Playwright
```

### Server Actions の規約
- `'use server'` ディレクティブをファイル先頭に
- 入力は Zod でバリデーション必須
- 認可チェックを必ず最初に行う
- エラーは throw せず `{ ok: false, error: string }` 形式で返す
- 成功時は `{ ok: true, data: T }` で返す
- `revalidatePath` / `revalidateTag` を適切に呼ぶ

### データベースアクセス
- 直接 Prisma を呼ぶのは `features/*/data/` 配下のみ
- N+1 を避けるため `include` / `select` を明示
- 公開クエリと内部クエリを分け、公開クエリは認可済みデータのみ返す

---

## テスト戦略

| レイヤー | ツール | 目標カバレッジ |
|---|---|---|
| ユニット | Vitest | 80%+ (lib, utils, ドメインロジック) |
| 統合 | Vitest + テスト用DB | 主要 Server Action 全件 |
| E2E | Playwright | 主要ユーザーフロー (登録→受講→修了) |

- DB を使うテストは**モックせず**、テスト専用 PostgreSQL を使う
- E2E は seed データ前提、テスト前に必ずリセット
- アクセシビリティは axe-playwright で自動チェック

---

## アクセシビリティ要件 (WCAG 2.1 AA)

E-learning は障害を持つ学習者にも開かれているべき。以下を必須とする:

- すべての画像に意味のある `alt`
- フォームの `label` 必須
- キーボードのみで全機能操作可能
- フォーカスリングを消さない
- コントラスト比 4.5:1 以上
- 動画は字幕必須 (将来的)
- スクリーンリーダー対応 (見出し階層、ARIA ランドマーク)

---

## セキュリティ要件

- 認証: パスワードは bcrypt (cost >= 12)、セッションは httpOnly cookie
- 認可: Server Action / Route Handler の冒頭で必ず権限チェック
- 入力検証: Zod でクライアント・サーバー両方
- XSS: React のエスケープに頼り、`dangerouslySetInnerHTML` 禁止
- SQL Injection: Prisma の生クエリは使わない (使うなら `$queryRaw` ではなく `$queryRawUnsafe` 禁止)
- CSRF: Server Actions は Next.js が自動で対策、Route Handler は手動で
- レート制限: ログイン・登録・クイズ提出にレート制限

---

## ハーネス: 自動ループ品質ゲート

このプロジェクトは **Builder ⇄ Gate ループ** で開発する。

- ユーザーが `/build-with-gates <タスク>` を実行
- 適切な Builder エージェントが実装
- 関連する Gate エージェントが**並列**で検証
- いずれかの Gate が FAIL → 指摘付きで Builder に再依頼
- 最大 **5 回**まで自動ループ
- 全 PASS で完了レポート、最大回数到達で人間にエスカレーション
- 進捗は**完了時にまとめて報告** (ループ中は静か)

詳細は `.claude/agents/` と `.claude/commands/build-with-gates.md` を参照。

---

## 開発フロー

1. Issue / タスク定義
2. ローカルで `/build-with-gates <タスク>` 実行
3. 完了レポート確認、必要なら手動修正
4. テスト全パスを確認
5. Conventional Commits でコミット
6. PR 作成、レビュー、マージ

### Conventional Commits 例
- `feat(courses): add lesson reordering`
- `fix(quiz): correct score calculation for partial credit`
- `refactor(progress): extract completion logic to domain layer`
- `test(e2e): add learner flow for course completion`
