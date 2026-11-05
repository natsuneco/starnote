# StarNote

> iPad Safari（PWA）で快適に使える、GoodNotes / Collanote ライクな手書きノートWebアプリケーション。

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.x-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646cff.svg)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-38b2ac.svg)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## Features

- ✍️ **Natural & Low Latency Inking**  
  Apple Pencil の筆圧（pressure）・傾き（tilt）検知に対応。`perfect-freehand` による美しいベジェ曲線描画と `desynchronized: true` による低遅延レンダリング。
- 🪄 **Intelligent Gestures**  
  ぐちゃぐちゃ描いて消す「ストローク消去（Scribble to erase）」や、線で囲んで長押しによる「なげなわ選択（Circle to lasso）」。
- 📄 **PDF Reading & Export**  
  `pdfjs-dist` によるPDF閲覧・下敷き読み込みと、`pdf-lib` を用いた手書き注釈合成PDFエクスポート。
- 💾 **Local-First & OneDrive Sync**  
  IndexedDB（Dexie.js）による描画を妨げない非同期ローカルファースト永続化。Microsoft Graph API による OneDrive クラウド同期。
- 📱 **PWA Standalone**  
  iPad の Safari で「ホーム画面に追加」することで、ブラウザ枠のないフルスクリーン環境で利用可能。

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Framework** | [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vite.dev/) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) |
| **Drawing Engine** | HTML5 Canvas 2D, [perfect-freehand](https://github.com/steveruizok/perfect-freehand) |
| **PDF** | [pdfjs-dist](https://mozilla.github.io/pdf.js/), [pdf-lib](https://pdf-lib.js.org/) |
| **Storage & Sync** | [Dexie.js](https://dexie.org/) (IndexedDB), `@azure/msal-browser` |
| **Icons & PWA** | [Lucide React](https://lucide.dev/), `vite-plugin-pwa` |
| **Spec-Driven Dev** | [OpenSpec](https://github.com/Fission-AI/OpenSpec) |

---

## Getting Started

### Prerequisites
- Node.js (v20+)
- npm / pnpm

### Installation & Run

```bash
# リポジトリのクローン
git clone https://github.com/natsuneco/starnote.git
cd starnote

# 依存関係のインストール
npm install

# 開発サーバーの起動 (ローカルWi-Fi端末へのホスト公開付き)
npm run dev -- --host
```

ブラウザで `http://localhost:5173/`（同一Wi-Fi内の iPad からは `http://<YOUR_LOCAL_IP>:5173/`）にアクセスします。

### Production Build

```bash
npm run build
```

---

## Development Workflow

本プロジェクトは **OpenSpec** による仕様駆動開発（SDD: Specification-Driven Development）を採用しています。

- 仕様のSSOT（Single Source of Truth）: [`openspec/specs/`](./openspec/specs/)
- 変更提案・ワークフロー: `/opsx-propose` ➔ `/opsx-apply` ➔ `/opsx-verify` ➔ `/opsx-archive`

---

## License

MIT © [Natsuneco](https://github.com/natsuneco)
