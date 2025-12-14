# cf-preview-cleaner

Cloudflare Workers preview deployment を安全に削除するCLIツール。

React2shellのような脆弱性発生時に、preview deploymentを迅速かつ安全に削除できます。

## 特徴

- **対話的UI**: チェックボックスで削除対象を選択
- **安全設計**: アクティブなdeploymentは削除不可、確認プロンプト付き
- **ドライラン**: `--dry-run`で実際の削除前に確認
- **一括削除**: `--all`で非アクティブな全deploymentを削除
- **レート制限対策**: リクエスト間隔を自動調整

## インストール

```bash
# リポジトリをクローン
git clone https://github.com/your-org/cf-preview-cleaner.git
cd cf-preview-cleaner

# 依存関係をインストール
npm install

# ビルド
npm run build

# グローバルにリンク（オプション）
npm link
```

## 設定

### 環境変数

`.env.example`をコピーして`.env`を作成し、必要な値を設定してください。

```bash
cp .env.example .env
```

```env
CLOUDFLARE_API_TOKEN=your_api_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
```

### APIトークンの作成

1. [Cloudflareダッシュボード](https://dash.cloudflare.com/profile/api-tokens)にアクセス
2. 「Create Token」をクリック
3. 以下の権限を設定:
   - **Workers Scripts: Read** - deployment一覧取得用
   - **Workers Scripts: Edit** - deployment削除用
4. スコープを特定のアカウントに制限（推奨）
5. 有効期限を設定（推奨: 90日）

### Account IDの確認

[Cloudflareダッシュボード](https://dash.cloudflare.com/)のOverviewページ右サイドバーに表示されています。

## 使い方

### Deployment一覧を表示

```bash
cf-preview-cleaner list <script-name>

# JSON形式で出力
cf-preview-cleaner list <script-name> --json
```

### Deploymentを削除

```bash
# 対話的に選択して削除
cf-preview-cleaner delete <script-name>

# ドライラン（実際には削除しない）
cf-preview-cleaner delete <script-name> --dry-run

# 確認をスキップ
cf-preview-cleaner delete <script-name> --force

# 非アクティブな全deploymentを削除
cf-preview-cleaner delete <script-name> --all

# 全て自動でYes
cf-preview-cleaner delete <script-name> --all -y
```

## コマンドオプション

### `list <script-name>`

| オプション | 説明 |
|-----------|------|
| `--json` | JSON形式で出力 |

### `delete <script-name>`

| オプション | 説明 |
|-----------|------|
| `--dry-run` | 削除をシミュレート（実際には削除しない） |
| `--force` | 確認プロンプトをスキップ |
| `-y, --yes` | 全ての確認に自動でYes |
| `--all` | アクティブ以外の全deploymentを削除 |

## 開発

```bash
# 開発モードで実行
npm run dev -- list my-worker

# 型チェック
npm run typecheck

# ビルド
npm run build
```

## 注意事項

- **アクティブなdeploymentは削除できません**: リスト先頭のdeploymentは現在トラフィックを処理中のため、削除対象から自動的に除外されます
- **レート制限**: Cloudflare APIは5分間に1,200リクエストの制限があります。超過するとHTTP 429エラーが返されます
- **削除は取り消せません**: 削除したdeploymentは復元できません

## ライセンス

MIT
