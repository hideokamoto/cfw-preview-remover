# cwc (Cloudflare Workers Cleaner)

Cloudflare Workers の preview deployment と versions を安全に削除するCLIツール。

React2shellのような脆弱性発生時に、preview URLを迅速かつ安全に削除できます。

## 特徴

- **対話的UI**: チェックボックスで削除対象を選択
- **安全設計**: アクティブなdeployment/versionは削除不可、確認プロンプト付き
- **ドライラン**: `--dry-run`で実際の削除前に確認
- **一括削除**: `--all`で非アクティブな全deployment/versionを削除
- **レート制限対策**: リクエスト間隔を自動調整
- **Versions対応**: プレビューURLを完全に削除可能

## Cloudflare Workers の構造

Cloudflare Workers には3つの別々のリソースがあります：

| リソース | 説明 | プレビューURL |
|----------|------|--------------|
| **Builds** | GitリポジトリからのCI/CDビルド | 紐づかない |
| **Versions** | コードと設定の不変スナップショット | **紐づく** |
| **Deployments** | どのVersionがトラフィックを処理するか | 紐づかない |

**重要**: プレビューURLを完全に削除するには、**Versions** を削除する必要があります。

## インストール

### npxで実行（推奨）

インストール不要で、直接実行できます：

```bash
# 環境変数を指定して実行
CLOUDFLARE_API_TOKEN=your_token CLOUDFLARE_ACCOUNT_ID=your_account_id npx cwc list <script-name>
```

### ローカルインストール

```bash
# リポジトリをクローン
git clone https://github.com/your-org/cwc.git
cd cwc

# 依存関係をインストール
npm install

# ビルド
npm run build

# グローバルにリンク（オプション）
npm link
```

## 設定

### 環境変数

環境変数は以下のいずれかの方法で設定できます：

#### 方法1: `.env`ファイルを使用（推奨）

`.env.example`をコピーして`.env`を作成し、必要な値を設定してください。

```bash
cp .env.example .env
```

```env
CLOUDFLARE_API_TOKEN=your_api_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
```

#### 方法2: コマンドラインで直接指定

`npx`で実行する場合や、一時的に別の認証情報を使う場合：

```bash
CLOUDFLARE_API_TOKEN=your_api_token_here CLOUDFLARE_ACCOUNT_ID=your_account_id_here npx cwc list <script-name>
```

#### 方法3: システムの環境変数として設定

```bash
export CLOUDFLARE_API_TOKEN=your_api_token_here
export CLOUDFLARE_ACCOUNT_ID=your_account_id_here
cwc list <script-name>
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
cwc list <script-name>

# JSON形式で出力
cwc list <script-name> --json
```

### Deploymentを削除

```bash
# 対話的に選択して削除
cwc delete <script-name>

# ドライラン（実際には削除しない）
cwc delete <script-name> --dry-run

# 確認をスキップ
cwc delete <script-name> --force
cwc delete <script-name> -y  # --force のエイリアス

# 非アクティブな全deploymentを削除（確認スキップ）
cwc delete <script-name> --all -y
```

### Version一覧を表示（プレビューURLの元）

```bash
cwc versions list <script-name>

# JSON形式で出力
cwc versions list <script-name> --json
```

### Versionを削除（プレビューURLを完全削除）

```bash
# 対話的に選択して削除
cwc versions delete <script-name>

# ドライラン（実際には削除しない）
cwc versions delete <script-name> --dry-run

# 確認をスキップ
cwc versions delete <script-name> -y

# 非アクティブな全versionを削除（確認スキップ）
cwc versions delete <script-name> --all -y
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
| `-y, --force` | 確認プロンプトをスキップ |
| `--all` | アクティブ以外の全deploymentを削除 |

### `versions list <script-name>`

| オプション | 説明 |
|-----------|------|
| `--json` | JSON形式で出力 |

### `versions delete <script-name>`

| オプション | 説明 |
|-----------|------|
| `--dry-run` | 削除をシミュレート（実際には削除しない） |
| `-y, --force` | 確認プロンプトをスキップ |
| `--all` | アクティブ以外の全versionを削除 |

## 開発

```bash
# 開発モードで実行
npm run dev list my-worker

# 型チェック
npm run typecheck

# ビルド
npm run build
```

## 注意事項

- **アクティブなdeployment/versionは削除できません**: リスト先頭のdeployment/versionは現在トラフィックを処理中のため、削除対象から自動的に除外されます
- **レート制限**: Cloudflare APIは5分間に1,200リクエストの制限があります。超過するとHTTP 429エラーが返されます
- **削除は取り消せません**: 削除したdeployment/versionは復元できません
- **プレビューURLを完全に削除するにはVersionsを削除**: Deploymentsを削除してもプレビューURLは残ります。`cwc versions delete`を使用してください

## ライセンス

MIT
