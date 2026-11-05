# AI Agent Guidelines

## プロジェクト概要: StarNote
iPad Safari（PWAスタンドアロン動作）で快適に使える、GoodNotes / Collanote ライクな手書きノートWebアプリケーションです。

### 主要機能 & 設計方針
1. **軽快な手書き描画（Apple Pencil対応）**:
   - `PointerEvent` を活用した筆圧（pressure）・傾き（tilt）検知
   - `desynchronized: true` および `getCoalescedEvents()` による低遅延ストローク描画
   - `perfect-freehand` による滑らかで自然なインク曲線の生成
   - `touch-action: none` を用いたパームリジェクション制御
2. **インテリジェントな手書きジェスチャ**:
   - ぐちゃぐちゃ描いて消す「ストローク消去（Scribble to erase）」
   - 線で囲んで長押しホールドによる「なげなわ選択（Circle to lasso）」
3. **PDF対応**:
   - `pdfjs-dist` を用いたPDFファイルの閲覧・下敷き読み込み
   - `pdf-lib` を用いた手書きストローク合成によるPDFエクスポート
4. **データ保存 & 同期**:
   - `IndexedDB` (Dexie.js) による高速・大容量のローカルファースト永続化（描画負荷を阻害しない非同期処理）
   - `@azure/msal-browser` + Microsoft Graph API による OneDrive クラウド保存・同期
5. **アーキテクチャ**:
   - React + TypeScript + Vite + Tailwind CSS + PWA (スタンドアロン起動)

---

## OpenSpec Guidelines
本プロジェクトでは仕様駆動開発（SDD: Specification-Driven Development）ツールとして **OpenSpec** を採用しています。
エージェントはコードの確認・追加・変更を行う際、必ず `openspec/` 配下の仕様やアーティファクトを参照・準拠してください。

- **仕様の参照 (SSOT)**:
  - システムの機能仕様は [`openspec/specs/`](./openspec/specs/) に蓄積されます。機能の追加・改修時には既存の仕様書を必ず確認してください。
- **仕様駆動開発ワークフロー**:
  - 新機能の設計や大きな変更を行う際は、いきなりコードを修正するのではなく、OpenSpec ワークフロー（`explore` -> `propose` -> `apply` -> `archive`）に従ってください。
- **言語設定**:
  - OpenSpec のアーティファクト（`proposal.md`, `specs/**/*.md`, `design.md`, `tasks.md`）を含むすべての仕様・設計・タスク文書は **日本語** で記述してください。
