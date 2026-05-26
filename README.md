# E-learning OSS (working title)

オープンソースの E-learning プラットフォーム。Next.js + TypeScript + Prisma で構築する Moodle / Open edX の代替を目指す。

## ステータス

🚧 **初期セットアップ段階**: ハーネス (Claude Code) の構成のみが整った状態。プロジェクト本体 (Next.js 等) はまだ作成されていない。

## 主な機能 (予定)

- コース・レッスン管理
- クイズ・評価機能 (自動採点、合格基準)
- 学習進捗トラッキング (ダッシュボード、修了判定)

## 技術スタック (予定)

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

(プロジェクト本体作成後に追記予定)

```bash
# Coming soon
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

## ライセンス

未定 (OSS として公開予定 — MIT または AGPL を検討中)
