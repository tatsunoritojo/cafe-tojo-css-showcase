# Mixable CSS

CSS デザインパターンの見本市 + 組み合わせミキサー機能を提供する静的サイト。

## 公開先・デプロイ
- 本番: https://css-showcase-tan.vercel.app
- GitHub: https://github.com/tatsunoritojo/cafe-tojo-css-showcase
- Vercel が `main` を自動デプロイ → push 前にローカルで動作確認する

## 技術構成
- 静的サイト（HTML + CSS + 素の JavaScript）
- フレームワーク・ビルドツール・npm 不使用
- ローカル確認: `index.html` をブラウザで直接開く
- 状態保持: `localStorage`（ミキサーの選択状態）
- 外部 CDN: Google Fonts / Unsplash / Lucide アイコン

## ページ構成
| ファイル | 役割 |
|---|---|
| `index.html` | ポータル（ハブ） |
| `sample_css_showcase.html` | CSS基礎 |
| `sample_image_effects.html` | 画像活用見本市 |
| `sample_button_showcase.html` | ボタン見本市 |
| `sample_text_showcase.html` | 文字装飾見本市 |
| `mixer.html` / `mixer.js` | ミキサー機能 |

## 実装上の注意（非自明なルール）
- **アイコンは Lucide を使う**。絵文字はアイコン用途で使わない（視認性と統一感のため置換済み）
- **Lucide アイコンの再描画**: `mixer.js` で `render*` 系関数を実行して DOM を書き換えた後は、`lucide.createIcons()` を必ず呼び直す（呼ばないとアイコンが表示されない）
- **トップナビ**: 全ページに黒背景のトップナビを置き、相互に1クリックで遷移できる状態を維持する
- **ミキサーのテンプレート**: 意図別テンプレートで組み立てたとき、不足している要素は注釈として描画する

## 作業フロー
- `main` ブランチ直接運用（feature ブランチは作らない）
- コミットメッセージは日本語で、変更の意図が伝わる1行 + 補足
