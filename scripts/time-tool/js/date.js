/* ================= DATE：日期小工具 ================= */
window.TTDate = (function () {
  const pad2 = (n) => String(n).padStart(2, '0')
  const fmtDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  const fmtTime = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  const parseDate = (s) => {
    const [y, m, d] = s.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  const startOfDay = (v) => {
    const d = typeof v === 'string' ? parseDate(v) : new Date(v)
    d.setHours(0, 0, 0, 0)
    return d
  }
  const addDays = (dateStr, n) => {
    const d = parseDate(dateStr)
    d.setDate(d.getDate() + n)
    return fmtDate(d)
  }
  const dayDiff = (a, b) => Math.round((startOfDay(a) - startOfDay(b)) / 86400000)
  const todayStr = () => fmtDate(new Date())
  return { pad2, fmtDate, fmtTime, parseDate, startOfDay, addDays, dayDiff, todayStr }
})()

