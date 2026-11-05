import React, { useEffect, useRef, useState } from 'react'

export const AppShell: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [selectedTool, setSelectedTool] = useState<'pen' | 'highlighter' | 'eraser' | 'lasso'>('pen')
  const [selectedColor, setSelectedColor] = useState<string>('#1e293b')

  // ウィンドウリサイズに合わせてCanvas解像度を同期
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const updateSize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr

      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.scale(dpr, dpr)
      }
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-200 flex flex-col select-none touch-none">
      {/* 上部ツールバー */}
      <header className="h-14 bg-white/95 backdrop-blur border-b border-slate-200 px-4 flex items-center justify-between z-10 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-indigo-600 to-sky-600 bg-clip-text text-transparent">
            StarNote
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium border border-slate-200">
            PWA Standalone Ready
          </span>
        </div>

        {/* ツール選択ボタン群 */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => setSelectedTool('pen')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              selectedTool === 'pen'
                ? 'bg-white text-indigo-600 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ペン
          </button>
          <button
            type="button"
            onClick={() => setSelectedTool('highlighter')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              selectedTool === 'highlighter'
                ? 'bg-white text-indigo-600 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            マーカー
          </button>
          <button
            type="button"
            onClick={() => setSelectedTool('eraser')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              selectedTool === 'eraser'
                ? 'bg-white text-indigo-600 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            消しゴム
          </button>
          <button
            type="button"
            onClick={() => setSelectedTool('lasso')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              selectedTool === 'lasso'
                ? 'bg-white text-indigo-600 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            なげなわ
          </button>
        </div>

        {/* カラーパレット & アクション */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {['#1e293b', '#2563eb', '#dc2626', '#16a34a', '#ca8a04'].map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                style={{ backgroundColor: color }}
                className={`w-6 h-6 rounded-full transition-transform ${
                  selectedColor === color ? 'scale-125 ring-2 ring-offset-2 ring-indigo-500' : 'hover:scale-110'
                }`}
                aria-label={`色 ${color}`}
              />
            ))}
          </div>

          <div className="h-5 w-px bg-slate-200 mx-1" />

          <button
            type="button"
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-colors"
          >
            OneDrive 連携
          </button>
        </div>
      </header>

      {/* メインノートワークスペース（全画面キャンバス） */}
      <main className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center p-4">
        {/* ノート用紙カード */}
        <div className="relative w-full h-full max-w-5xl bg-white rounded-2xl shadow-xl border border-slate-300/80 overflow-hidden flex flex-col">
          {/* ノート紙面用のキャンバス */}
          <canvas
            ref={canvasRef}
            className="canvas-viewport w-full h-full block cursor-crosshair"
          />
        </div>
      </main>
    </div>
  )
}
export default AppShell
