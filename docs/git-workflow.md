# Git Workflow — Gitflow ベース運用

このプロジェクトは **Gitflow** を運用ベースとし、Conventional Commits でコミット履歴を管理します。

---

## ブランチ構造の全体像

```
main      ●─────────●────────●     (タグ: v0.1.0, v0.2.0, v0.2.1)
           \         \        \
            \      hotfix      \
             \         \        \
develop  ●────●─────────●────────●
          \    \                  \
       feature/A                feature/C
                \             /
              feature/B
                  \         /
                   release/0.2.0
```

### 永続ブランチ

| ブランチ | 目的 | マージ元 | マージ先 |
|---|---|---|---|
| `main` | 本番リリース | `release/*`, `hotfix/*` | (なし — タグ付け) |
| `develop` | 次期リリース統合 | `feature/*`, `bugfix/*`, `release/*`, `hotfix/*` | `release/*` |

`main` と `develop` には**直接 push 禁止**。必ず PR 経由でマージする。

### 一時ブランチ

| ブランチ | 命名 | 派生元 | マージ先 | 削除タイミング |
|---|---|---|---|---|
| `feature/*` | `feature/<topic>` | `develop` | `develop` | マージ後 |
| `bugfix/*` | `bugfix/<topic>` | `develop` | `develop` | マージ後 |
| `release/*` | `release/<version>` | `develop` | `main` + `develop` | リリース完了後 |
| `hotfix/*` | `hotfix/<topic>` | `main` | `main` + `develop` | マージ後 |

---

## ブランチ命名規則

### `feature/*` と `bugfix/*`

```
feature/<topic-in-kebab-case>
bugfix/<topic-in-kebab-case>
```

- topic は **kebab-case 英小文字**
- 関連 Issue 番号があれば末尾に追加: `feature/quiz-timer-#42`
- 短く具体的に (20 文字目安、最大 40 文字)

良い例:
- `feature/lesson-reorder`
- `feature/quiz-time-limit`
- `bugfix/progress-rounding-error`

悪い例:
- `feature/new-stuff` (具体性なし)
- `feature/Tanaka_branch` (人名、Pascal、アンダースコア)
- `feature/implement-the-new-quiz-grading-system-with-partial-credit-support` (長すぎ)

### `release/*`

```
release/<semver>
```

- セマンティックバージョニング (`MAJOR.MINOR.PATCH`)
- 例: `release/0.2.0`, `release/1.0.0`

### `hotfix/*`

```
hotfix/<topic>
```

- 本番で発生した緊急バグの修正用
- 例: `hotfix/login-redirect-loop`, `hotfix/quiz-score-overflow`

---

## 各フローの手順

### A. 機能開発フロー (feature)

```bash
# 1. develop を最新化
git checkout develop
git pull origin develop

# 2. feature ブランチを切る
git checkout -b feature/lesson-reorder

# 3. 開発 (Builder ⇄ Gate ループ推奨)
# /build-with-gates レッスンの並び順変更機能を実装

# 4. コミット (Conventional Commits)
git add <files>
git commit  # .gitmessage テンプレートが開く

# 5. push (GitHub 連携後)
git push -u origin feature/lesson-reorder

# 6. PR 作成 (develop 向け)
gh pr create --base develop --title "feat(lessons): add lesson reordering"

# 7. レビュー → マージ → ブランチ削除
```

### B. バグ修正フロー (bugfix, 非緊急)

機能開発と同じ。ただしブランチ名が `bugfix/*`、コミット type が `fix`。

```bash
git checkout develop
git checkout -b bugfix/progress-rounding-error
# ... 修正、コミット、PR
```

### C. リリースフロー (release)

```bash
# 1. develop からリリースブランチを切る
git checkout develop
git pull origin develop
git checkout -b release/0.2.0

# 2. リリース準備
#    - CHANGELOG.md 更新
#    - package.json のバージョン更新
#    - 最終テスト

# 3. リリース PR を main 向けに作成
git push -u origin release/0.2.0
gh pr create --base main --title "release: 0.2.0"

# 4. main にマージ後、タグ付け
git checkout main
git pull origin main
git tag -a v0.2.0 -m "Release 0.2.0"
git push origin v0.2.0

# 5. main → develop バックマージ (バージョン更新の取り込み)
git checkout develop
git merge --no-ff main
git push origin develop

# 6. release/0.2.0 ブランチ削除
```

### D. ホットフィックスフロー (hotfix)

```bash
# 1. main から hotfix を切る
git checkout main
git pull origin main
git checkout -b hotfix/login-redirect-loop

# 2. 修正・テスト
#    - CHANGELOG.md にも追記
#    - package.json のパッチバージョン上げ (例: 0.2.0 → 0.2.1)

# 3. main 向け PR
gh pr create --base main --title "fix: resolve login redirect loop"

# 4. main マージ後、タグ付け
git tag -a v0.2.1 -m "Hotfix 0.2.1"

# 5. develop にもバックマージ (修正の取り込み)
git checkout develop
git merge --no-ff main
git push origin develop

# 6. hotfix ブランチ削除
```

---

## マージ戦略

| マージ先 | 戦略 | 理由 |
|---|---|---|
| `develop` ← `feature/*` | **Squash merge** | feature の内部コミットを 1 つに圧縮、履歴が clean |
| `develop` ← `bugfix/*` | **Squash merge** | 同上 |
| `main` ← `release/*` | **Merge commit (--no-ff)** | リリース履歴を残す |
| `main` ← `hotfix/*` | **Merge commit (--no-ff)** | 緊急対応の履歴を残す |
| `develop` ← `main` (バックマージ) | **Merge commit (--no-ff)** | リリース内容を反映 |

### Squash merge の運用

- PR タイトルが最終コミットメッセージになる
- 必ず Conventional Commits 形式で書く
- 例: PR タイトル `feat(quiz): add time limit support`

### Merge commit (no-ff) の運用

- マージコミットメッセージ例:
  ```
  Merge branch 'release/0.2.0'

  Release v0.2.0
  See CHANGELOG.md for details.
  ```

---

## タグ運用

- リリース時に `main` にタグ: `v<semver>` (例: `v0.2.0`)
- 注釈付きタグ (`-a`) を使う:
  ```bash
  git tag -a v0.2.0 -m "Release 0.2.0"
  ```
- タグメッセージは CHANGELOG.md の該当バージョンと一致させる

### セマンティックバージョニング

- `MAJOR.MINOR.PATCH`
- `MAJOR`: 破壊的変更 (DB スキーマ非互換、API 削除)
- `MINOR`: 後方互換のある機能追加
- `PATCH`: 後方互換のあるバグ修正
- 1.0.0 未満は実験段階 (破壊的変更の頻度が高くてもよい)

---

## やってはいけないこと

- ❌ `main` や `develop` に直接 push
- ❌ force push (`-f`) を共有ブランチで実行
- ❌ `git rebase` を共有ブランチで実行
- ❌ `.env`, 認証情報, 大きなバイナリのコミット
- ❌ `--no-verify` でフック skip (フックエラーは原因を直す)
- ❌ 複数の目的を 1 PR に混ぜる (feat + refactor は分ける)

---

## ローカル運用フェーズ (現在)

GitHub に上げるまでの間は、リモートなしでローカル運用:

```bash
# main の代わりに直接 commit していい場合は明示する
# 通常は feature ブランチを使う

git checkout -b feature/<topic>
# 作業
git commit
git checkout develop
git merge --squash feature/<topic>
git commit  # squash の確定
git branch -d feature/<topic>
```

### リモート追加後の移行

```bash
git remote add origin git@github.com:<user>/new-apps.git
git push -u origin main
git push -u origin develop
# 既存タグも push: git push --tags
```

---

## 関連ドキュメント

- [コミットメッセージ規約](commit-convention.md)
- [プロジェクトコンテキスト](../CLAUDE.md)
- [貢献ガイド](../CONTRIBUTING.md)
