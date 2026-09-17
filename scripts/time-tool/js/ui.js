/* ================= UI：toast / 确认 / 帮助 / 深浅色 ================= */
window.TTUI = (function () {
  const C = window.TT_CONFIG

  let liveToasts = []

  function clearToasts() {
    liveToasts.forEach((el) => el.remove())
    liveToasts = []
  }

  function toast({ message, actionLabel, onAction, duration = 5000, type = 'info' }) {
    const el = document.createElement('div')
    el.className = 'toast toast--' + type
    const span = document.createElement('span')
    span.textContent = message
    el.appendChild(span)
    if (actionLabel) {
      const btn = document.createElement('button')
      btn.className = 'toast__btn'
      btn.textContent = actionLabel
      btn.addEventListener('click', () => {
        if (onAction) onAction()
        clearToasts()
      })
      el.appendChild(btn)
    }
    document.getElementById('toast-container').appendChild(el)
    liveToasts.push(el)
    setTimeout(() => {
      el.remove()
      liveToasts = liveToasts.filter((t) => t !== el)
    }, duration)
    return el
  }

  const warning = (message) => toast({ message, type: 'warning', duration: 3000 })

  let confirmResolve = null

  function confirm(message, { title = '确认', confirmText = '确定' } = {}) {
    const dlg = document.getElementById('dlg-confirm')
    document.getElementById('confirm-title').textContent = title
    document.getElementById('confirm-message').textContent = message
    document.getElementById('confirm-ok').textContent = confirmText
    dlg.showModal()
    return new Promise((resolve) => {
      confirmResolve = resolve
    })
  }

  function settleConfirm(result) {
    const dlg = document.getElementById('dlg-confirm')
    if (!dlg.open) return
    dlg.close()
    if (confirmResolve) {
      confirmResolve(result)
      confirmResolve = null
    }
  }

  function toggleHelp() {
    const dlg = document.getElementById('dlg-help')
    if (dlg.open) dlg.close()
    else dlg.showModal()
  }

  function isDark() {
    return document.documentElement.dataset.theme === 'dark'
  }

  function applyTheme(dark) {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    /* EP 暗色变量挂在 html.dark 上（vendor/element-plus-dark.css），与 data-theme 同步 */
    document.documentElement.classList.toggle('dark', dark)
    document.getElementById('icon-sun').classList.toggle('hidden', dark)
    document.getElementById('icon-moon').classList.toggle('hidden', !dark)
    document.dispatchEvent(new CustomEvent('tt-theme-change'))
  }

  function initTheme() {
    const stored = localStorage.getItem(C.themeKey)
    const dark = stored === null
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : stored === '1'
    applyTheme(dark)
  }

  function toggleTheme() {
    const dark = !isDark()
    localStorage.setItem(C.themeKey, dark ? '1' : '0')
    applyTheme(dark)
  }

  function init() {
    initTheme()
    document.getElementById('confirm-ok').addEventListener('click', () => settleConfirm(true))
    document.getElementById('confirm-cancel').addEventListener('click', () => settleConfirm(false))
    document.getElementById('dlg-confirm').addEventListener('close', () => {
      if (confirmResolve) {
        confirmResolve(false)
        confirmResolve = null
      }
    })
    document.getElementById('btn-theme').addEventListener('click', toggleTheme)
  }

  return { toast, warning, clearToasts, confirm, toggleHelp, isDark, toggleTheme, init }
})()

