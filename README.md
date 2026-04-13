# Mixable CSS

CSSのデザインパターンを1ページに1テーマで集めた個人開発の見本市。選んで組み合わせてCSSを生成できるミキサー機能つき。

## 公開URL

- 本番: https://css-showcase-tan.vercel.app
- GitHub: https://github.com/tatsunoritojo/cafe-tojo-css-showcase

## ページ構成

| ページ | 内容 |
|---|---|
| [index.html](./index.html) | ポータル（ハブページ） |
| [sample_css_showcase.html](./sample_css_showcase.html) | CSS基礎（セレクタ・プロパティ・ボックスモデル） |
| [sample_image_effects.html](./sample_image_effects.html) | 画像エフェクト見本市（19種） |
| [sample_button_showcase.html](./sample_button_showcase.html) | ボタン見本市（20種） |
| [sample_text_showcase.html](./sample_text_showcase.html) | 文字装飾見本市（約50種） |
| [mixer.html](./mixer.html) | 見本を組み合わせるミキサー機能（MVP） |

## 技術構成

- 静的サイト（HTML + CSS + 一部 JavaScript）
- フレームワーク不使用
- ブラウザの `localStorage` でミキサー選択状態を保持
- 外部依存: Google Fonts、Unsplash（画像）

## ローカルで確認する

`index.html` をブラウザで開くだけ。

## ライセンス

教材目的のため、自由に参照・改変可能。
