/* ================= SWIPE：移动端滑动翻页 ================= */
window.TTSwipe = (function () {
  let start = null

  function reset() {
    start = null
  }

  function init() {
    const el = document.getElementById('calendar')
    if (!el) return

    el.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) { reset(); return }
      const t = e.touches[0]
      if (t.target && t.target.closest('.fc-event')) { reset(); return } // 日程块交给 FC
      start = { x: t.clientX, y: t.clientY, t: Date.now() }
    }, { passive: true })

    el.addEventListener('touchend', (e) => {
      if (!start) return
      const t = e.changedTouches[0]
      const dx = t.clientX - start.x
      const dy = t.clientY - start.y
      const dt = Date.now() - start.t
      reset()
      /* 快速轻扫：水平位移为主、>60px、<800ms → 翻时段（右→左 = 下一时段） */
      if (dt < 800 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        TTCal.shiftPeriod(dx < 0 ? 1 : -1)
      }
    }, { passive: true })

    el.addEventListener('touchcancel', reset, { passive: true })
  }

  return { init }
})()

