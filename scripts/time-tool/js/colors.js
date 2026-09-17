/* ================= COLORS：日程 6 色方案 ================= */
window.TT_COLORS = (function () {
  const colorMap = {
    violet: { fill: 'rgba(139, 92, 246, 0.12)', stroke: 'rgba(139, 92, 246, 0.5)', text: '#a78bfa', textLight: '#6d28d9' },
    blue: { fill: 'rgba(59, 130, 246, 0.12)', stroke: 'rgba(59, 130, 246, 0.5)', text: '#93c5fd', textLight: '#1d4ed8' },
    emerald: { fill: 'rgba(16, 185, 129, 0.12)', stroke: 'rgba(16, 185, 129, 0.5)', text: '#6ee7b7', textLight: '#047857' },
    amber: { fill: 'rgba(245, 158, 11, 0.12)', stroke: 'rgba(245, 158, 11, 0.5)', text: '#fde047', textLight: '#b45309' },
    rose: { fill: 'rgba(244, 63, 94, 0.12)', stroke: 'rgba(244, 63, 94, 0.5)', text: '#fda4af', textLight: '#be123c' },
    cyan: { fill: 'rgba(6, 182, 212, 0.12)', stroke: 'rgba(6, 182, 212, 0.5)', text: '#67e8f7', textLight: '#0369a1' }
  }
  const colorOptions = [
    { value: 'violet', label: '紫色', hex: '#8b5cf6' },
    { value: 'blue', label: '蓝色', hex: '#3b82f6' },
    { value: 'emerald', label: '绿色', hex: '#10b981' },
    { value: 'amber', label: '琥珀', hex: '#f59e0b' },
    { value: 'rose', label: '玫红', hex: '#f43f5e' },
    { value: 'cyan', label: '青色', hex: '#06b6d4' }
  ]
  const colorScheme = (v) => colorMap[v] || colorMap.blue
  return { colorMap, colorOptions, colorScheme }
})()

