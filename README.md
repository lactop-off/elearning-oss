# E-learning OSS

[![CI](https://github.com/lactop-off/elearning-oss/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/lactop-off/elearning-oss/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/lactop-off/elearning-oss)](https://github.com/lactop-off/elearning-oss/releases)

オープンソースの E-learning プラットフォーム。Next.js 16 + TypeScript + Prisma + Auth.js v5 で構築する Moodle / Open edX の代替を目指す MVP。

## ステータス

✅ **v0.1.0 リリース済** — 講師の作成ワークフローと学習者の受講ループ (受講登録 → レッスン閲覧 → クイズ受験 → 修了 + 修了証発行) が一通り動作する MVP。

## 主な機能

- コース・レッスン・クイズ作成 (講師)
- 受講登録、レッスン閲覧、進捗トラッキング (学習者)
- クイズ自動採点 (SINGLE_CHOICE)
- 修了判定 (全必修レッスン完了 + 全必修クイズ合格) + 修了証発行
- 多言語対応 (日本語 / 英語)
- 3 ロール (Learner / Instructor / Admin)

## 技術スタック

- Next.js 15 (App Router) / React 19 / TypeScript
- Tailwind CSS / shadcn/ui
- Prisma + PostgreSQL
- Vitest + Playwright
- next-intl

## Claude Code ハーネス構成

このリポジトリは Claude Code の **Builder ⇄ Gate 自動ループ**で開発されます。

### ディレクトリ
```
.claude/
├── settings.json                 # 権限・hooks (チーム共有)
├── settings.local.json           # 個人ローカル設定 (gitignore)
├── agents/
│   ├── builders/                 # 実装エージェント (5 種)
│   └── gates/                    # 品質ゲート (11 種)
└── commands/
    ├── build-with-gates.md       # メインの自動ループコマンド
    ├── verify-only.md            # 検証のみ
    ├── builder-only.md           # 実装のみ (ループなし)
    └── escalate.md               # 詰まった時の整理
```

### Builders (実装側)

| 名前 | 担当 |
|---|---|
| `frontend-implementer` | Next.js + React UI 実装 |
| `backend-implementer` | Server Actions / API |
| `db-implementer` | Prisma スキーマ・マイグレーション |
| `test-implementer` | Vitest / Playwright テスト |
| `refactor-implementer` | 動作不変のリファクタ |

### Gates (品質ゲート)

| 名前 | 検証内容 |
|---|---|
| `type-safety-gate` | `tsc --noEmit`、`any` 検出 |
| `lint-format-gate` | ESLint / Prettier |
| `test-coverage-gate` | カバレッジ、未テスト分岐 |
| `unit-test-runner-gate` | `npm test` 実行結果 |
| `e2e-test-gate` | Playwright + axe |
| `accessibility-gate` | WCAG 2.1 AA |
| `security-gate` | OWASP Top 10、認可漏れ |
| `performance-gate` | N+1、bundle size |
| `i18n-gate` | ハードコード、翻訳整合性 |
| `architecture-gate` | レイヤー違反、循環依存 |
| `domain-logic-gate` | クイズ採点、修了判定 |

### 使い方

```
# 完全な実装フロー (Builder → Gate 並列 → 必要なら再ループ)
/build-with-gates クイズ受験画面を実装してください

# 検証だけしたい (現状の git diff)
/verify-only

# Builder だけ動かしたい (品質ゲートなし)
/builder-only frontend-implementer ヘッダー追加

# 自動ループで詰まった時の整理
/escalate <問題>
```

### ループの仕様

- 最大 **5 イテレーション**
- Gate は**並列**実行
- 同じ指摘が **3 回連続**で停滞検出 → 人間にエスカレーション
- 進捗報告は**完了時にまとめて 1 回**

## セットアップ

### 必要なもの
- Docker / Docker Compose (アプリ + PostgreSQL を両方コンテナで起動)
- Node.js 20+ (任意 — ホストで直接動かしたい / CLI を使いたい場合のみ)

開発環境は Docker で完結します (Node 22 LTS のアプリコンテナ + PostgreSQL 16)。
ホストに Node を入れず、コンテナだけで開発できます。

### 手順 (Docker, 推奨)

```bash
# 1. 環境変数の準備
cp .env.example .env
# .env を編集 — 最低限 AUTH_SECRET を設定する:
#   openssl rand -base64 32
# ※ DATABASE_URL はコンテナ内では compose 側で postgres サービスを指すよう自動上書きされる

# 2. アプリ + PostgreSQL を起動 (初回はイメージビルドが走る)
docker compose up -d --build
# アプリは起動時に prisma generate → next dev を実行する

# 3. マイグレーション (アプリコンテナ内で実行)
docker compose exec app npm run db:migrate

# 4. デモデータ投入
docker compose exec app npm run db:seed
# → admin@example.com / instructor@example.com / learner@example.com
#    すべて共通パスワード: demo1234

# http://localhost:3000 でアクセス

# ログ確認 / テスト実行
docker compose logs -f app
docker compose exec app npm test         # Vitest
docker compose exec app npm run test:e2e # Playwright (実 DB に対して)
```

### 手順 (ホストで Node を動かす場合)

```bash
# PostgreSQL のみコンテナで起動し、アプリはホストで動かす
docker compose up -d postgres
npm install
cp .env.example .env   # AUTH_SECRET を設定
npm run db:migrate
npm run db:seed
npm run dev            # http://localhost:3000
```

### 終了するとき

```bash
docker compose down            # コンテナ停止 (データは残る)
docker compose down -v         # ボリュームごと削除 (DB リセット)
```

## ライセンス

[MIT License](LICENSE)
