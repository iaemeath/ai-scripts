/* ================= STORE：日程仓库（localStorage 自动持久化） =================
   沿用拾光的 key 与字段（revTime/deletedAt），拾光备份的 schedules 可直接导入 */
window.TTStore = (function () {
  const C = window.TT_CONFIG
  const KEY = C.storageKey

  let schedules = [] // 全集（含软删墓碑，撤销复活用）
  const listeners = []

  const genId = () =>
    'sch-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7)

  function sanitizeOne(s) {
    if (!s || typeof s !== 'object') return null
    if (typeof s.title !== 'string' || !s.title.trim()) return null
    if (typeof s.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s.date)) return null
    if (typeof s.startTime !== 'string' || !/^\d{2}:\d{2}$/.test(s.startTime)) return null
    if (typeof s.endTime !== 'string' || !/^\d{2}:\d{2}$/.test(s.endTime)) return null
    const out = {
      id: typeof s.id === 'string' && s.id ? s.id : genId(),
      title: s.title.trim(),
      description: typeof s.description === 'string' ? s.description : '',
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      color: typeof s.color === 'string' ? s.color : C.defaultColor,
      remindMinutes: Number.isInteger(s.remindMinutes) ? s.remindMinutes : 0
    }
    if (typeof s.taskId === 'string') out.taskId = s.taskId
    if (typeof s.revTime === 'number') out.revTime = s.revTime
    if (typeof s.deletedAt === 'number') out.deletedAt = s.deletedAt
    return out
  }

  const sanitize = (list) =>
    (Array.isArray(list) ? list : []).map(sanitizeOne).filter(Boolean)

  /* 任何写操作统一打新 revTime 并清墓碑（语义同拾光 touch） */
  function touch(r) {
    r.revTime = Date.now()
    delete r.deletedAt
  }

  function load() {
    try {
      schedules = sanitize(JSON.parse(localStorage.getItem(KEY) || '[]'))
    } catch (e) {
      console.error('Failed to parse schedules', e)
      schedules = []
    }
  }

  function persist() {
    localStorage.setItem(KEY, JSON.stringify(schedules))
  }

  function emit() {
    listeners.forEach((fn) => fn())
  }

  function subscribe(fn) {
    listeners.push(fn)
  }

  const active = () => schedules.filter((s) => !s.deletedAt)
  const get = (id) => schedules.find((s) => s.id === id)

  function addSchedule(data) {
    const s = sanitizeOne({ ...data, id: genId() })
    touch(s)
    schedules.push(s)
    persist()
    emit()
    return s
  }

  function updateSchedule(id, updates) {
    const s = get(id)
    if (!s) return
    Object.assign(s, updates)
    touch(s)
    persist()
    emit()
    return s
  }

  function deleteSchedule(id) {
    const s = get(id)
    if (!s) return
    s.deletedAt = Date.now()
    s.revTime = s.deletedAt
    persist()
    emit()
  }

  /* 墓碑复活（撤销删除） */
  function restoreSchedules(ids) {
    const now = Date.now()
    let changed = false
    for (const id of ids) {
      const s = get(id)
      if (!s || !s.deletedAt) continue
      delete s.deletedAt
      s.revTime = now
      changed = true
    }
    if (changed) {
      persist()
      emit()
    }
  }

  function replaceAll(list) {
    schedules = sanitize(list)
    persist()
    emit()
  }

  const raw = () => JSON.parse(JSON.stringify(schedules))

  load()

  return {
    subscribe, active, get, raw,
    addSchedule, updateSchedule, deleteSchedule, restoreSchedules, replaceAll
  }
})()

