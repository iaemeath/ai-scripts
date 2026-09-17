/* ================= SHORTCUTS：全局键盘快捷键（桌面端） ================= */
window.TTShortcuts = (function () {
  const MODIFIER_ONLY = ['Shift', 'Control', 'Alt', 'Meta']

  const isMobile = () => window.matchMedia('(max-width: 768px)').matches

  const isTypingTarget = (el) => {
    if (!(el instanceof HTMLElement)) return false
    return el.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]') !== null
  }

  function init() {
    document.addEventListener('keydown', (e) => {
      if (isMobile()) return

      /* 帮助浮层打开：仅 Esc/? 可关，其余不穿透 */
      const help = document.getElementById('dlg-help')
      if (help.open) {
        if (e.key === 'Escape' || e.key === '?') {
          e.preventDefault()
          TTUI.toggleHelp()
        }
        return
      }

      /* 表单/确认弹窗打开：全部让位（Esc 由原生 <dialog> 关闭） */
      if (document.getElementById('dlg-schedule').open) return
      if (document.getElementById('dlg-confirm').open) return

      /* Ctrl/Cmd+V：复制选中集到后一天 */
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        if (TTCal.hasSelection()) {
          e.preventDefault()
          TTCal.copySelectedToNextDay()
        }
        return
      }

      /* 其余带系统修饰键的组合不接管（? 为 Shift+/，仅 shift 放行） */
      if (e.ctrlKey || e.metaKey || e.altKey) return

      if (isTypingTarget(e.target)) return
      if (document.querySelector('.fc-event-dragging')) return

      switch (e.key) {
        case 't': case 'T':
          e.preventDefault(); TTCal.goToday(); break
        case 'c': case 'C':
          e.preventDefault(); TTCal.openCreateDefault(); break
        case 'ArrowLeft':
          e.preventDefault(); TTCal.shiftPeriod(-1); break
        case 'ArrowRight':
          e.preventDefault(); TTCal.shiftPeriod(1); break
        case '1':
          e.preventDefault(); TTCal.setViewDay(); break
        case '2':
          e.preventDefault(); TTCal.setViewWeek(); break
        case '3':
          e.preventDefault(); TTCal.setViewMonth(); break
        case 'Delete': case 'Backspace':
          if (TTCal.hasSelection()) { e.preventDefault(); TTCal.deleteSelected() }
          break
        case 'Escape':
          if (TTCal.hasSelection()) TTCal.clearSelection()
          break
        case '?':
          e.preventDefault(); TTUI.toggleHelp(); break
        case 'd': case 'D':
          e.preventDefault(); TTUI.toggleTheme(); break
        default:
          break
      }
    })
  }

  return { init }
})()

