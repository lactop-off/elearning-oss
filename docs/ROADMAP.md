# E-learning OSS — 開発ロードマップ (v1.0 まで)

> このドキュメントは「システムの完成 (v1.0)」までの開発計画です。各フェーズは
> `/build-with-gates` で進めることを前提に、成果物・実行タスク例・完了条件 (DoD) を
> 記述しています。進捗に応じてチェックを更新し、本ドキュメントを開発の単一の拠り所とします。
>
> 最終更新: 2026-05-28

---

## 1. v1.0 の定義 (ゴール)

**「公開・運用可能な OSS」** を v1.0 とする。具体的には:

1. **コア学習体験の完成形** — MVP の受講ループを、デザイン・機能の両面で「製品」と呼べる水準まで磨く。
2. **本番運用に耐える** — デプロイ手順・レート制限・セキュリティ硬化・ドキュメント・CI が整い、第三者が自前で運用できる。
3. **コントリビュータが参加できる** — セットアップ、貢献ガイド、アーキテクチャ説明が揃い、Issue/PR で開発を回せる。

### スコープ外 (Post-1.0 / v1.1+ に送る)
管理者専用 UI・ユーザー管理・コース承認フロー / 通知メール / OAuth ログイン /
動画・埋め込みレッスンの再生 UI / 分析レポート / 部分点採点。
→ [§11 Post-1.0 バックログ](#11-post-10-バックログ) に集約。

### 進め方の最優先軸
**デザイン / UX の磨き込みを最初のフェーズに置く。** 見た目と操作感を先に底上げしてから、
機能の完成・運用硬化に進む。

---

## 2. 現状サマリ (2026-05-28 / v0.2.0 時点)

**動作する受講ループ (学習者・講師フロー) は完成済み。**

| 領域 | 状態 |
|---|---|
| 認証 (Email/Password, 3ロール, JWT, bcrypt) | ✅ 実装済 |
| コース / レッスン CRUD・並び替え・公開トグル | ✅ 実装済 |
| クイズ SINGLE_CHOICE / MULTI_CHOICE 作成・採点 | ✅ 実装済 |
| 受講登録 → 進捗 → 修了判定 → 修了証発行 | ✅ 実装済 |
| i18n (ja/en)・WCAG 2.1 AA・E2E 33件 PASS | ✅ 実装済 |
| デザイン共通土台 (ヘッダー/ナビ/フッター/ロールバッジ/アイコン) | ✅ 実装済 (本ロードマップ起点) |
| デザインテーマ "Studious Indigo" + design-gate | ✅ 導入済 |
| TEXT 問題・手動採点 | ⚠️ スキーマのみ |
| クイズ高度設定 (時間制限/受験回数/シャッフル) | ⚠️ スキーマのみ |
| ダッシュボード (学習者/講師) | ❌ 未着手 |
| loading / error / not-found 画面 | ❌ 未着手 |
| 本番デプロイ・レート制限・運用ドキュメント | ❌ 未着手 |

---

## 3. マイルストーン全体像

| Phase | バージョン | テーマ | 主眼 |
|---|---|---|---|
| **Phase 1** | v0.3.0 | デザイン / UX 磨き込み | 見た目と操作感を製品水準へ |
| **Phase 2** | v0.4.0 | コア機能の完成 | TEXT問題・手動採点・クイズ高度設定 |
| **Phase 3** | v0.5.0 | ダッシュボード / 可視化 | 学習者・講師の状況把握 |
| **Phase 4** | v0.6.0 | 本番運用ハードニング | デプロイ・レート制限・セキュリティ |
| **Phase 5** | v1.0.0 | リリース整備 | ドキュメント・CI・最終QA |

各フェーズは前フェーズの完了 (DoD 達成 + 全 Gate PASS + タグ付け) を前提に進める。

---

## 4. Phase 1 — デザイン / UX 磨き込み (v0.3.0)

**目的**: 「テーマがない・素っ気ない」状態を脱し、全画面に一貫したデザイン言語を行き渡らせる。

### 成果物チェックリスト
- [x] 共通土台: ヘッダー / ナビ (アクティブ状態) / フッター / ロールバッジ / アイコン導入
- [x] **コースカードの作り込み** — カタログ / My Learning / 講師一覧を共通 `CourseCard` で統一。色付きカバー帯 (chart トークン) + アイコン + 状態バッジ + 講師 + CTA + hover
- [x] **ホームのヒーロー刷新** — エブロウバッジ + 大見出し + ロール対応 CTA + グラデ背景 + 機能ハイライト 3 枚 (コース/自動採点/修了証)
- [x] **タイポグラフィ階層の統一** — ページ主見出しを `text-2xl font-semibold tracking-tight` に統一 (詳細ページの text-3xl と、フォーム系で CardTitle 経由になっていた text-base を解消)。ホームのヒーローは意図的な例外。
- [x] **ローディング / エラーの整備** — 一覧ページに `<Suspense>` + カードスケルトンでストリーミング表示、`error.tsx` で再試行 CTA 付きエラー境界。
  - ⚠️ **styled 404 は別タスクに保留**: ファイル単位の `loading.tsx` は Suspense 境界が 200 を早期コミットし、配下の `notFound()` が 404 を返せなくなる (Next.js のストリーミング挙動)。同様に `[locale]/not-found.tsx` は dev で `notFound()` を 200 にする。E2E が dev サーバーに対して 404 を検証しているため、現状は既定の 404 を維持。localized styled 404 を入れるには E2E を production ビルドで回すインフラ変更が必要 → Phase 4/5 で対応。
- [ ] **空状態 (empty state) の強化** — アイコン + 説明 + 次アクション。一覧系すべて
- [ ] **フォーム画面の体裁統一** — コース/レッスン/クイズの作成・編集フォームの余白・見出し・ボタン配置を揃える
- [ ] **クイズ受験/結果画面のデザイン強化** — 進行状況・正誤表示・スコアの視認性
- [ ] **アクセシビリティ再確認** — 新テーマでのコントラスト比 4.5:1、フォーカスリング、見出し階層

### `/build-with-gates` タスク例
```
/build-with-gates コース一覧とMy Learningのコースカードをデザイン強化。カバー/バッジ/進捗/CTAを追加し、catalog・learn・instructor の3箇所で一貫させる
/build-with-gates 全データ取得ルートに loading.tsx と error.tsx を追加。Skeleton と再試行CTAを用意
/build-with-gates ページ主見出しのサイズを text-2xl font-semibold に全画面統一
```

### 関連 Gate
`design-gate`(★今フェーズの主役), `accessibility-gate`, `i18n-gate`, `performance-gate`, `type-safety`, `lint-format`, `architecture`

### 完了条件 (DoD)
- 全主要画面 (ホーム / カタログ / コース詳細 / レッスン / クイズ受験 / 講師一覧 / 各フォーム) で `design-gate` PASS。
- loading/error/not-found が全データルートに存在。
- `accessibility-gate` PASS、`i18n-gate` でハードコード文字列 0。
- 全 E2E PASS (デザイン変更でセレクタが壊れていない)。

> ⚠️ `design-gate` は新規追加のため、Claude Code を **一度再起動**するとループに自動参加する。

---

## 5. Phase 2 — コア機能の完成 (v0.4.0)

**目的**: スキーマだけ存在する機能を実体化し、クイズ・評価機能を完成させる。

### 成果物チェックリスト
- [ ] **TEXT 問題 — 作成 UI** — `question-form` に TEXT タイプの入力 (模範解答/配点)
- [ ] **TEXT 問題 — 受験 UI** — `quiz-taker` に自由記述入力 (`Answer.textAnswer`)
- [ ] **TEXT 問題 — 採点フロー** — 自動採点では保留 (pending) とし、講師が手動採点。
  - 受験提出時、TEXT を含むと Attempt は「採点待ち」状態 (status / passed 判定を保留)
  - 講師が回答を一覧し、正誤と点数を付与 → スコア確定 → 修了判定再評価
- [ ] **クイズ高度設定 — 時間制限** (`timeLimitSec`) — カウントダウン + 時間切れ自動提出 (`AUTO_SUBMITTED`)
- [ ] **クイズ高度設定 — 受験回数制限** (`maxAttempts`) — 上限到達で開始ボタン無効 + 残り回数表示
- [ ] **クイズ高度設定 — 選択肢シャッフル** (`shuffleChoices`) — 受験時に選択肢順をランダム化 (答えキー非露出を維持)
- [ ] 上記すべてに対する E2E + ユニットテスト

### ドメイン上の注意 (domain-logic-gate が検証)
- TEXT 採点保留時の修了判定: 「必修クイズ合格」が未確定の間はコース修了させない。
- 時間切れ自動提出のスコアは、提出済みの回答のみで採点。
- 答えキー (`Choice.isCorrect`, 模範解答) を学習者バンドルに**絶対に漏らさない** (security-gate)。

### `/build-with-gates` タスク例
```
/build-with-gates TEXT問題の作成UI・受験UI・講師の手動採点画面を実装。採点待ちAttemptは修了判定を保留する
/build-with-gates クイズに時間制限(カウントダウン+自動提出)と受験回数制限を実装
/build-with-gates 受験時の選択肢シャッフルを実装。答えキーは漏らさない
```

### 関連 Gate
`domain-logic-gate`(★), `security-gate`(★), `test-coverage`, `unit-test-runner`, `e2e-test`, `type-safety`, `design-gate`, `accessibility-gate`

### 完了条件 (DoD)
- TEXT 問題が作成→受験→手動採点→スコア確定→修了判定まで一気通貫で動く。
- 時間制限・受験回数・シャッフルが E2E で検証済み。
- `domain-logic-gate` / `security-gate` PASS。新規ロジックのテストカバレッジ確保。

---

## 6. Phase 3 — ダッシュボード / 可視化 (v0.5.0)

**目的**: 蓄積されたデータ (進捗・スコア・修了) を学習者・講師が把握できるようにする。

### 成果物チェックリスト
- [ ] **学習者ダッシュボード** — 受講中/修了コース数、全体進捗、直近アクティビティ、修了証一覧
- [ ] **修了証ページ** — 個別の修了証表示 (シリアル/発行日/コース名)。印刷しやすいレイアウト
- [ ] **講師ダッシュボード** — 自コースの受講者数、クイズ平均点、**手動採点待ち件数**、必修進捗の集計
- [ ] **講師: 学習者進捗ビュー** — コース単位で誰がどこまで進んだか
- [ ] 集計クエリは `features/*/data/` に集約し N+1 回避 (performance-gate)

### `/build-with-gates` タスク例
```
/build-with-gates 学習者ダッシュボードを実装。受講中/修了コース、全体進捗、修了証一覧を表示
/build-with-gates 講師ダッシュボードを実装。受講者数、クイズ平均点、手動採点待ち、進捗集計を表示
```

### 関連 Gate
`performance-gate`(★ N+1), `domain-logic-gate`, `design-gate`, `accessibility-gate`, `security-gate`(他人のデータを見せない), `i18n-gate`

### 完了条件 (DoD)
- 学習者・講師それぞれのダッシュボードが実データで表示。
- 集計に N+1 がない (`performance-gate` PASS)。認可で他ユーザーのデータが漏れない。
- E2E でダッシュボードの主要数値が検証済み。

---

## 7. Phase 4 — 本番運用ハードニング (v0.6.0)

**目的**: 第三者が安全に本番運用できる状態にする。

### 成果物チェックリスト
- [ ] **本番用 Dockerfile** — multi-stage + `next build` standalone 出力。`Dockerfile.dev` とは別
- [ ] **本番 compose / デプロイ手順** — `docker-compose.prod.yml` か、ホスティング向けデプロイガイド
- [ ] **環境変数バリデーション** — 起動時に必須 env (AUTH_SECRET, DATABASE_URL 等) を検証して fail-fast
- [ ] **レート制限** — ログイン / 登録 / クイズ提出 に適用 (Server Action / middleware レベル)
- [ ] **セキュリティ硬化** — セキュリティヘッダ (CSP, HSTS, X-Frame-Options 等)、全 Server Action の認可監査、CSRF 確認
- [ ] **パスワードリセット / プロフィール編集** — 運用に最低限必要なユーザー機能
- [ ] **エラーハンドリングの統一** — ログ出力方針、想定外エラーのユーザー向け表示
- [ ] **DB マイグレーション運用** — 本番は `migrate deploy`、破壊的変更の手順を明文化

### `/build-with-gates` タスク例
```
/build-with-gates 本番用multi-stage Dockerfile (next standalone) とデプロイ手順を作成
/build-with-gates ログイン・登録・クイズ提出にレート制限を実装
/build-with-gates セキュリティヘッダ(CSP/HSTS等)を追加し、全Server Actionの認可を監査・修正
/build-with-gates パスワードリセットとプロフィール編集を実装
```

### 関連 Gate
`security-gate`(★全面), `architecture-gate`, `performance-gate`, `type-safety`, `test-coverage`, `e2e-test`

### 完了条件 (DoD)
- 本番イメージがビルド・起動し、本番モードで全フローが動く。
- レート制限・セキュリティヘッダが有効。`security-gate` を OWASP Top 10 観点で全面 PASS。
- 環境変数不足時に明確なエラーで fail-fast。

---

## 9. Phase 5 — リリース整備 (v1.0.0)

**目的**: ドキュメント・CI・QA を仕上げ、v1.0.0 として公開する。

### 成果物チェックリスト
- [ ] **README 刷新** — スクリーンショット、機能一覧、デプロイ、ライセンスを最新化
- [ ] **CONTRIBUTING.md** — 開発フロー、ブランチ規約、Gate ループの使い方、コミット規約へのリンク
- [ ] **デプロイガイド** (`docs/deployment.md`) — 本番セットアップ手順
- [ ] **環境変数リファレンス** (`docs/configuration.md`) — 全 env の説明
- [ ] **アーキテクチャ概要** (`docs/architecture.md`) — レイヤー構成、ディレクトリ規約、データフロー
- [ ] **Issue / PR テンプレート、CODE_OF_CONDUCT、SECURITY.md**
- [ ] **CI 強化** — 全 Gate 相当 (typecheck/lint/test/e2e/a11y) を GitHub Actions に組込み、カバレッジ閾値、依存スキャン
- [ ] **最終 QA** — 全 E2E・a11y・i18n・パフォーマンスの最終確認
- [ ] **CHANGELOG に v1.0.0 をまとめ、タグ付け & リリースノート**

### 関連 Gate
全 Gate を最終確認。`/verify-only` で総点検 → 残課題を潰す。

### 完了条件 (DoD)
- 第三者が README + docs だけでローカル起動・本番デプロイできる。
- CI が main への push / PR で全チェックを実行し緑。
- v1.0.0 タグとリリースノートを公開。

---

## 10. 横断的な Definition of Done (全フェーズ共通)

各タスク / PR は以下を満たして初めて「完了」とする:

- [ ] 関連する全 Gate が PASS (`/build-with-gates` 完了 or `/verify-only` で確認)
- [ ] `any` 不使用 / `tsc --noEmit` クリア / ESLint・Prettier クリア
- [ ] 表示文字列はすべて i18n キー経由 (ja/en 両方)
- [ ] 変更コードに対応するテスト (ユニット and/or E2E) を追加・更新
- [ ] Server Action は認可チェック先頭 + Zod 検証 + `{ ok }` 返却 + revalidate
- [ ] デザイン規約 (CLAUDE.md) 準拠 — トークンのみ、コンポーネント再利用
- [ ] CHANGELOG の `[Unreleased]` に変更を記録
- [ ] Conventional Commits でコミット (`docs/commit-convention.md` 準拠)

---

## 11. Post-1.0 バックログ

v1.0 後に検討する機能 (優先度順は別途):

- **管理者機能** — admin 専用ダッシュボード、ユーザー管理 (作成/削除/ロール変更)、コース承認フロー
- **通知 / メール** — 修了通知、クイズ結果、採点完了の通知
- **OAuth ログイン** — Google / GitHub
- **動画・埋め込みレッスン** — `VIDEO` / `EMBED` の再生 UI、字幕対応
- **分析・レポート** — 学習統計、修了率、コース別パフォーマンス
- **部分点採点** — クイズの partial credit オプション
- **バッジ / ゲーミフィケーション**
- **コース内検索・タグ・カテゴリ**

---

## 運用メモ

- 各フェーズは feature ブランチで進め、フェーズ完了時に develop へマージ → バージョンタグ。
  ブランチ運用は `docs/git-workflow.md` を参照。
- フェーズ着手時に本ドキュメントのチェックボックスを更新し、完了項目に `[x]` を付ける。
- 大きなフェーズは複数の `/build-with-gates` タスクに分割して回す。
- ループで詰まったら `/escalate <問題>` で整理。
