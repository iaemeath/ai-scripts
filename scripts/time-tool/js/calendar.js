/* ================= CALENDAR：主逻辑 ================= */
window.TTCal = (function () {
  const C = window.TT_CONFIG
  const D = window.TTDate
  const Store = window.TTStore
  const UI = window.TTUI
  const COLORS = window.TT_COLORS

  const isMobileMql = window.matchMedia('(max-width: 768px)')
  const isMobile = () => isMobileMql.matches

  const MIN_SELECT_MS = 5 * 60 * 1000 // snapDuration 5min：拖选闸门过滤单击误触

  let calendar
  let selection = new Set() // 选中集合（Ctrl+V / Del / 整组拖拽的操作对象）
  let curViewType = ''
  let pickerMode = 'range' // 'range' | 'month'
  let customRange = { start: D.startOfDay(new Date()), end: null } // end 为排他边界
  let dragGroupSnapshot = null // 整组拖拽预览：其余成员原始数据
  let lastGroupDayDelta = 0 // 已应用的天数差（去重，避免逐帧重渲染）
  let dropHandled = false // eventDrop 已受理（成功或 revert），dragStop 不再复位
  let lastTap = { id: '', time: 0 } // 双击判定（350ms 内再点同一事件 = 编辑）
  let editingId = null // 非空 = 表单编辑模式
  let editingRemind = 0 // 提醒字段已从表单移除：编辑时保留原值

  let els = {}

  customRange.end = D.startOfDay(new Date(Date.now() + 7 * 86400000))

  /* EP 日期选择器的 Vue 响应式状态（挂载点 #picker-mount）：
     mode='range' 渲染 daterange，'month' 渲染月份；datesSet 回写仅改值，
     不触发 @change（EP 只在用户交互时派发），无回环 */
  const pickerState = Vue.reactive({
    mode: 'range',
    range: [D.todayStr(), D.addDays(D.todayStr(), 6)],
    month: `${new Date().getFullYear()}-${D.pad2(new Date().getMonth() + 1)}`
  })

  function mountPicker() {
    const app = Vue.createApp({
      setup() {
        return {
          mode: Vue.toRef(pickerState, 'mode'),
          range: Vue.toRef(pickerState, 'range'),
          month: Vue.toRef(pickerState, 'month'),
          onRangeChange,
          onMonthChange
        }
      },
      template: `
        <el-date-picker v-if="mode !== 'month'" v-model="range" type="daterange"
          value-format="YYYY-MM-DD" format="M月D日" unlink-panels :clearable="false"
          popper-class="tt-range-panel" class="tt-picker" @change="onRangeChange" />
        <el-date-picker v-else v-model="month" type="month"
          value-format="YYYY-MM" format="YYYY年M月" :clearable="false"
          class="tt-picker" @change="onMonthChange" />
      `
    })
    app.use(ElementPlus, { locale: window.ElementPlusLocaleZhCn })
    app.mount('#picker-mount')
    window.__ttPickerState = pickerState // 诊断口
  }

  function onRangeChange(range) {
    if (Array.isArray(range) && range[0] && range[1]) applyCustomRange(range[0], range[1])
  }

  function onMonthChange(m) {
    if (typeof m !== 'string' || !m) return
    const [y, mo] = m.split('-').map(Number)
    calendar.changeView('dayGridMonth', new Date(y, mo - 1, 1))
  }

  /* ---- FC 事件映射 ---- */
  function buildEvents() {
    return Store.active().map((s) => {
      const scheme = COLORS.colorScheme(s.color)
      return {
        id: s.id,
        title: s.title,
        start: `${s.date}T${s.startTime}:00`,
        end: `${s.date}T${s.endTime}:00`,
        backgroundColor: scheme.fill,
        borderColor: scheme.stroke,
        textColor: UI.isDark() ? scheme.text : scheme.textLight,
        extendedProps: { ...s }
      }
    })
  }

  function refreshEvents() {
    calendar.setOption('events', buildEvents())
  }

  /* ---- 选中集合 ---- */
  const hasSelection = () => selection.size > 0

  function replaceSelection(ids) {
    selection = new Set(ids)
    refreshEvents()
  }

  function clearSelection() {
    if (selection.size) replaceSelection([])
  }

  /* Ctrl+V：复制选中到后一天（多选整组）；选中新副本集合——连续粘贴递增不重复 */
  function copySelectedToNextDay() {
    const picked = Store.active().filter((s) => selection.has(s.id))
    if (!picked.length) {
      replaceSelection([])
      return
    }
    const srcIds = picked.map((s) => s.id)
    const createdIds = picked.map((s) =>
      Store.addSchedule({
        title: s.title,
        description: s.description,
        date: D.addDays(s.date, 1),
        startTime: s.startTime,
        endTime: s.endTime,
        color: s.color,
        remindMinutes: s.remindMinutes
      }).id
    )
    replaceSelection(createdIds)
    UI.toast({
      message: picked.length === 1
        ? `已复制「${picked[0].title.slice(0, 12)}${picked[0].title.length > 12 ? '…' : ''}」到 ${D.addDays(picked[0].date, 1).slice(5).replace('-', '月')}日`
        : `已复制 ${picked.length} 个日程到后一天`,
      actionLabel: '撤销',
      onAction: () => {
        createdIds.forEach((id) => Store.deleteSchedule(id))
        replaceSelection(srcIds)
      }
    })
  }

  /* Del/Backspace：删除选中集（软删），撤销 = 复活 */
  function deleteSelected() {
    const picked = Store.active().filter((s) => selection.has(s.id))
    if (!picked.length) return
    const ids = picked.map((s) => s.id)
    ids.forEach((id) => Store.deleteSchedule(id))
    replaceSelection([])
    UI.toast({
      message: picked.length === 1
        ? `已删除「${picked[0].title.slice(0, 12)}${picked[0].title.length > 12 ? '…' : ''}」`
        : `已删除 ${picked.length} 个日程`,
      actionLabel: '撤销',
      onAction: () => {
        Store.restoreSchedules(ids)
        replaceSelection(ids)
      }
    })
  }

  /* ---- 拖拽落库（eventDrop/eventResize 共用）+ 多选整组平移 ---- */
  function applyEventMove(info) {
    const event = info.event
    if (dragGroupSnapshot) dropHandled = true

    const startDate = new Date(event.start)
    const endDate = event.end ? new Date(event.end) : new Date(startDate.getTime() + 3600000)
    const dateStr = D.fmtDate(startDate)
    const startTimeStr = D.fmtTime(startDate)
    const endTimeStr = D.fmtTime(endDate)

    if (endTimeStr <= startTimeStr) {
      info.revert()
      refreshEvents() // 预览中的其余成员复位（store 未动）
      UI.warning('日程不能跨零点，请调整到更早的时段')
      return
    }

    const oldStart = info.oldEvent && info.oldEvent.start ? new Date(info.oldEvent.start) : startDate
    const oldEnd = info.oldEvent && info.oldEvent.end ? new Date(info.oldEvent.end) : oldStart
    const moved = [{
      id: event.id,
      before: { date: D.fmtDate(oldStart), startTime: D.fmtTime(oldStart), endTime: D.fmtTime(oldEnd) }
    }]
    Store.updateSchedule(event.id, { date: dateStr, startTime: startTimeStr, endTime: endTimeStr })

    const dayDiff = D.dayDiff(dateStr, moved[0].before.date)
    const group = dayDiff !== 0 && selection.has(event.id)
      ? Array.from(selection).filter((id) => id !== event.id)
      : []
    for (const id of group) {
      const s = Store.get(id)
      if (!s || s.deletedAt) continue
      moved.push({ id, before: { date: s.date, startTime: s.startTime, endTime: s.endTime } })
      Store.updateSchedule(id, { date: D.addDays(s.date, dayDiff) })
    }
    if (group.length) {
      UI.toast({
        message: `已平移 ${moved.length} 个日程（${dayDiff > 0 ? '+' : ''}${dayDiff} 天）`,
        actionLabel: '撤销',
        onAction: () => moved.forEach((m) => Store.updateSchedule(m.id, m.before))
      })
    }
  }

  /* ---- 多选整组拖拽预览（吸附对齐）：eventAllow 读吸附落点天数差，
     实时 setDates 其余成员由 FC 网格定位，与被拖成员同步跳列 ---- */
  function handleEventDragStart(info) {
    if (!selection.has(info.event.id) || selection.size <= 1) return
    dropHandled = false
    lastGroupDayDelta = 0
    dragGroupSnapshot = new Map()
    for (const id of selection) {
      if (id === info.event.id) continue
      const s = Store.get(id)
      if (s && !s.deletedAt) dragGroupSnapshot.set(id, { date: s.date, startTime: s.startTime, endTime: s.endTime })
    }
  }

  function handleEventAllow(info, draggedEvent) {
    if (!dragGroupSnapshot || !dragGroupSnapshot.size || !draggedEvent.start) return true
    const dayDelta = D.dayDiff(info.start, draggedEvent.start)
    if (dayDelta === lastGroupDayDelta) return true
    lastGroupDayDelta = dayDelta
    for (const [id, orig] of dragGroupSnapshot) {
      const ev = calendar.getEventById(id)
      if (!ev) continue
      const nd = D.addDays(orig.date, dayDelta)
      ev.setDates(`${nd}T${orig.startTime}:00`, `${nd}T${orig.endTime}:00`)
    }
    return true
  }

  function handleEventDragStop() {
    /* 取消/无效落点（未走 eventDrop）：FC 内部成员停在预览位而 store 未动，刷新复位 */
    if (dragGroupSnapshot && !dropHandled) refreshEvents()
    dragGroupSnapshot = null
    lastGroupDayDelta = 0
    dropHandled = false
  }

  /* ---- 事件交互：单击选中 / 双击编辑 / 右键编辑 / 拖选新增 ---- */
  function handleEventClick(info) {
    const id = info.event.id
    const now = Date.now()
    if (lastTap.id === id && now - lastTap.time < 350) {
      openEditDialog(id)
      lastTap = { id: '', time: 0 }
      return
    }
    lastTap = { id, time: now }
    if (isMobile()) return // 移动端单击静默（无键盘，选中无消费者）
    const next = new Set(selection)
    if (info.jsEvent.ctrlKey || info.jsEvent.metaKey) {
      if (next.has(id)) next.delete(id)
      else next.add(id)
    } else {
      next.clear()
      next.add(id)
    }
    replaceSelection(next)
  }

  function handleSelect(info) {
    const start = new Date(info.start)
    const end = new Date(info.end)
    if (end.getTime() - start.getTime() <= MIN_SELECT_MS) return // 单击/极短选区忽略
    openCreateDialog(D.fmtDate(start), D.fmtTime(start), D.fmtTime(end))
  }

  function handleEventDidMount(info) {
    if (info.event.extendedProps.description) info.el.title = String(info.event.extendedProps.description)
    info.el.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      if (isMobile()) return // 移动端走双击入口
      openEditDialog(info.event.id)
    })
  }

  /* ---- 视图导航（区间/单日/月 + 今天 + 翻时段） ---- */
  const maxRangeDays = () => (isMobile() ? C.mobileMaxRangeDays : C.webMaxRangeDays)

  function applyCustomRange(startStr, endStr) {
    if (!startStr || !endStr) return
    let s = D.parseDate(startStr)
    let e = D.parseDate(endStr)
    if (s > e) [s, e] = [e, s]
    const max = maxRangeDays()
    if (D.dayDiff(e, s) + 1 > max) {
      e = D.startOfDay(D.parseDate(D.addDays(D.fmtDate(s), max - 1)))
      UI.warning(`最多选择 ${max} 天，已自动截断`)
    }
    customRange = { start: D.startOfDay(s), end: D.startOfDay(new Date(e.getTime() + 86400000)) }
    syncPickerInputs(D.fmtDate(s), D.fmtDate(e))
    setPickerMode('range')
    if (D.fmtDate(s) === D.fmtDate(e)) calendar.changeView('timeGridDay', s)
    else calendar.changeView('timeGridCustom', s)
  }

  function setPickerMode(mode) {
    pickerMode = mode
    pickerState.mode = mode
    els.btnMonth.classList.toggle('active', mode === 'month')
  }

  /* 无条件回写：change 事件即输入完成，聚焦保护会让 swap/截断后的输入框与视图不一致 */
  function syncPickerInputs(sStr, eStr, monthStr) {
    if (sStr && eStr) pickerState.range = [sStr, eStr]
    if (monthStr) pickerState.month = monthStr
  }

  function shiftPeriod(dir) {
    if (pickerMode === 'month') {
      const cur = calendar.getDate()
      calendar.changeView('dayGridMonth', new Date(cur.getFullYear(), cur.getMonth() + dir, 1))
      return
    }
    if (curViewType === 'timeGridDay') {
      const d = calendar.getDate()
      d.setDate(d.getDate() + dir)
      calendar.gotoDate(d)
      return
    }
    const days = Math.max(1, D.dayDiff(customRange.end, customRange.start))
    customRange = {
      start: D.startOfDay(new Date(customRange.start.getTime() + days * dir * 86400000)),
      end: D.startOfDay(new Date(customRange.end.getTime() + days * dir * 86400000))
    }
    calendar.changeView('timeGridCustom', customRange.start)
  }

  function goToday() {
    const now = new Date()
    if (pickerMode === 'month') {
      calendar.changeView('dayGridMonth', now)
      return
    }
    if (curViewType === 'timeGridDay') {
      calendar.gotoDate(now)
      return
    }
    const days = Math.max(1, D.dayDiff(customRange.end, customRange.start))
    applyCustomRange(D.todayStr(), D.addDays(D.todayStr(), days - 1))
  }

  function toggleMonth() {
    if (pickerMode === 'month') {
      calendar.changeView('timeGridCustom', customRange.start)
    } else {
      calendar.changeView('dayGridMonth', customRange.start)
    }
  }

  /* 快捷键视图命令 */
  const setViewDay = () => applyCustomRange(D.todayStr(), D.todayStr())
  const setViewWeek = () => applyCustomRange(D.todayStr(), D.addDays(D.todayStr(), 6))
  const setViewMonth = () => calendar.changeView('dayGridMonth', new Date())

  /* FC 日期区间变化 → 回写选择器/模式/自定义区间（所见=所选同步） */
  function handleDatesSet(info) {
    curViewType = info.view.type
    const sStr = D.fmtDate(info.view.currentStart)
    const eStr = D.fmtDate(new Date(info.view.currentEnd.getTime() - 86400000))
    if (info.view.type === 'dayGridMonth') {
      pickerMode = 'month'
      const m = info.view.currentStart
      syncPickerInputs(null, null, `${m.getFullYear()}-${D.pad2(m.getMonth() + 1)}`)
    } else {
      pickerMode = 'range'
      customRange = { start: new Date(info.view.currentStart), end: new Date(info.view.currentEnd) }
      syncPickerInputs(sStr, eStr)
    }
    setPickerMode(pickerMode)

    /* 「今」按钮：视图不含今天才出现 */
    const now = new Date()
    let show
    if (info.view.type === 'dayGridMonth') {
      const m = info.view.currentStart
      show = m.getFullYear() !== now.getFullYear() || m.getMonth() !== now.getMonth()
    } else {
      show = D.startOfDay(now) < info.view.currentStart || D.startOfDay(now) >= info.view.currentEnd
    }
    els.btnToday.classList.toggle('hidden', !show)

    /* 移动端单日视图列头冗余：隐藏 */
    els.panel.classList.toggle('hide-col-header', isMobile() && curViewType === 'timeGridDay')
  }

  function dayHeaderContent(arg) {
    if (arg.view.type === 'dayGridMonth') {
      return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][arg.date.getDay()]
    }
    if (isMobile() && arg.view.type === 'timeGridDay') return ''
    return `${arg.date.getMonth() + 1}月${arg.date.getDate()}日`
  }

  /* ---- 日程表单弹窗 ---- */
  const dlg = () => document.getElementById('dlg-schedule')

  function buildColorDots() {
    const wrap = document.getElementById('f-color')
    TT_COLORS.colorOptions.forEach((c) => {
      const dot = document.createElement('button')
      dot.type = 'button'
      dot.className = 'color-dot'
      dot.style.background = c.hex
      dot.title = c.label
      dot.dataset.value = c.value
      dot.addEventListener('click', () => {
        wrap.querySelectorAll('.color-dot').forEach((d) => d.classList.remove('active'))
        dot.classList.add('active')
      })
      wrap.appendChild(dot)
    })
  }

  function setColorValue(v) {
    const wrap = document.getElementById('f-color')
    let hit = false
    wrap.querySelectorAll('.color-dot').forEach((d) => {
      const on = d.dataset.value === v
      d.classList.toggle('active', on)
      if (on) hit = true
    })
    if (!hit) wrap.querySelector('.color-dot').classList.add('active')
  }

  const colorValue = () => {
    const active = document.querySelector('#f-color .color-dot.active')
    return active ? active.dataset.value : C.defaultColor
  }

  function openCreateDialog(dateStr, startStr, endStr) {
    editingId = null
    editingRemind = 0
    fillForm({
      heading: '新增日程',
      confirmText: '创建',
      showDelete: false,
      value: {
        title: '', description: '',
        date: dateStr || D.todayStr(),
        startTime: startStr || C.defaultStart,
        endTime: endStr || C.defaultEnd,
        color: C.defaultColor
      }
    })
  }

  /* 显式新增入口（工具条 + / C 键）：预填今天下一个整点起 1 小时 */
  function openCreateDefault() {
    const start = new Date()
    start.setMinutes(0, 0, 0)
    start.setHours(start.getHours() + 1)
    const end = new Date(start.getTime() + 3600000)
    openCreateDialog(D.fmtDate(start), D.fmtTime(start), D.fmtTime(end))
  }

  function openEditDialog(id) {
    const s = Store.get(id)
    if (!s || s.deletedAt) return
    editingId = s.id
    editingRemind = Number.isInteger(s.remindMinutes) ? s.remindMinutes : 0
    fillForm({
      heading: '编辑日程',
      confirmText: '保存',
      showDelete: true,
      value: s
    })
  }

  function fillForm({ heading, confirmText, showDelete, value }) {
    document.getElementById('dlg-heading').textContent = heading
    document.getElementById('f-title').value = value.title
    document.getElementById('f-desc').value = value.description || ''
    document.getElementById('f-date').value = value.date
    document.getElementById('f-start').value = value.startTime
    document.getElementById('f-end').value = value.endTime
    setColorValue(value.color || C.defaultColor)
    document.getElementById('f-save').textContent = confirmText
    document.getElementById('f-delete').classList.toggle('hidden', !showDelete)
    dlg().showModal()
  }

  function saveForm() {
    const title = document.getElementById('f-title').value.trim()
    const description = document.getElementById('f-desc').value.trim()
    const date = document.getElementById('f-date').value
    const startTime = document.getElementById('f-start').value
    const endTime = document.getElementById('f-end').value
    if (!title) { UI.warning('标题不能为空'); return }
    if (!date || !startTime || !endTime) { UI.warning('请填写完整的日期和时间'); return }
    if (startTime >= endTime) { UI.warning('结束时间必须晚于开始时间'); return }
    const value = {
      title, description, date, startTime, endTime,
      color: colorValue(),
      remindMinutes: editingRemind // 提醒字段已从表单移除：编辑保留原值，新建为 0
    }
    if (editingId) {
      Store.updateSchedule(editingId, value)
      UI.toast({ message: '已更新' })
    } else {
      Store.addSchedule(value)
      UI.toast({ message: '已新增日程' })
    }
    dlg().close()
  }

  function deleteFromDialog() {
    if (!editingId) return
    const id = editingId
    Store.deleteSchedule(id)
    dlg().close()
    UI.toast({
      message: '已删除日程',
      actionLabel: '撤销',
      onAction: () => Store.restoreSchedules([id])
    })
  }

  /* ---- 导入导出 ---- */
  function exportJSON() {
    const data = { app: 'time-tool', version: 1, exportedAt: new Date().toISOString(), schedules: Store.raw() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `time-tool-${D.todayStr().replace(/-/g, '')}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    UI.toast({ message: '已导出' })
  }

  function importJSON(text) {
    let obj
    try {
      obj = JSON.parse(text)
    } catch {
      UI.warning('JSON 解析失败，请检查文件内容')
      return
    }
    const list = Array.isArray(obj) ? obj : obj && Array.isArray(obj.schedules) ? obj.schedules : null
    if (!list) {
      UI.warning('文件格式不正确：需要 schedules 数组（兼容拾光备份）')
      return
    }
    const valid = list.filter((s) =>
      s && typeof s.title === 'string' && s.title.trim() &&
      typeof s.date === 'string' && typeof s.startTime === 'string' && typeof s.endTime === 'string'
    ).length
    UI.confirm(`将导入 ${valid} 条日程并替换现有 ${Store.active().length} 条，是否继续？`, { title: '导入日程', confirmText: '导入' })
      .then((ok) => {
        if (!ok) return
        Store.replaceAll(list)
        UI.toast({ message: `已导入 ${valid} 条日程` })
      })
  }

  /* ---- 装配 ---- */
  function bindToolbar() {
    els.btnPrev.addEventListener('click', () => shiftPeriod(-1))
    els.btnNext.addEventListener('click', () => shiftPeriod(1))
    els.btnToday.addEventListener('click', goToday)
    els.btnMonth.addEventListener('click', toggleMonth)
    els.btnExport.addEventListener('click', exportJSON)
    els.btnImport.addEventListener('click', () => document.getElementById('import-file').click())
    document.getElementById('f-cancel').addEventListener('click', () => dlg().close())
    document.getElementById('f-save').addEventListener('click', saveForm)
    document.getElementById('f-delete').addEventListener('click', deleteFromDialog)
    document.getElementById('import-file').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => importJSON(String(reader.result))
      reader.readAsText(file)
      e.target.value = '' // 允许连续导入同一文件
    })
  }

  function init() {
    els = {
      panel: document.getElementById('calendar-panel'),
      btnPrev: document.getElementById('btn-prev'),
      btnNext: document.getElementById('btn-next'),
      btnToday: document.getElementById('btn-today'),
      btnMonth: document.getElementById('btn-month'),
      btnImport: document.getElementById('btn-import'),
      btnExport: document.getElementById('btn-export'),
    }

    buildColorDots()
    bindToolbar()
    mountPicker()

    /* FC 外观变量注入（自 config） */
    const style = els.panel.style
    style.setProperty('--slot-height', C.slotHeight + 'px')
    style.setProperty('--major-line-width', C.majorLineWidth + 'px')
    style.setProperty('--major-line-opacity', C.majorLineOpacity)
    style.setProperty('--minor-line-width', C.minorLineWidth + 'px')
    style.setProperty('--minor-line-opacity', C.minorLineOpacity)
    style.setProperty('--minor-line-style', C.showMinorLines ? 'solid' : 'none')
    style.setProperty('--now-indicator-color', C.nowIndicatorColor)
    style.setProperty('--now-indicator-height', C.nowIndicatorHeight + 'px')

    /* 初始滚动定位：now-2h 并夹取显示时段 */
    const nowH = new Date().getHours() - 2
    const scrollHour = Math.min(Math.max(nowH, C.startHour), Math.max(C.startHour, C.endHour - 4))

    calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
      /* 全局构建：vendor 各插件已自动注册进 FullCalendar.globalPlugins，
         不传 plugins 选项即全部启用 */
      locale: 'zh-cn',
      firstDay: 1,
      headerToolbar: false,
      initialView: isMobile() ? 'timeGridDay' : 'timeGridCustom',
      initialDate: new Date(),
      events: buildEvents(),
      editable: true,
      selectable: true,
      views: {
        timeGridCustom: { type: 'timeGrid', visibleRange: () => customRange }
      },
      slotMinTime: `${String(C.startHour).padStart(2, '0')}:00:00`,
      slotMaxTime: `${String(C.endHour).padStart(2, '0')}:00:00`,
      slotDuration: C.slotDuration,
      snapDuration: '00:05:00',
      slotLabelInterval: '01:00',
      height: '100%',
      allDaySlot: false,
      nowIndicator: true,
      scrollTime: `${String(scrollHour).padStart(2, '0')}:00:00`,
      scrollTimeReset: false,
      eventDrop: applyEventMove,
      eventResize: applyEventMove,
      /* 选中高亮：选中集变化经 refreshEvents 重渲染生效 */
      eventClassNames: (arg) => (selection.has(arg.event.id) ? ['ev-selected'] : []),
      eventDragStart: handleEventDragStart,
      eventAllow: handleEventAllow,
      eventDragStop: handleEventDragStop,
      select: handleSelect,
      eventClick: handleEventClick,
      eventDidMount: handleEventDidMount,
      datesSet: handleDatesSet,
      dayHeaderContent
    })
    calendar.render()

    Store.subscribe(refreshEvents)
    document.addEventListener('tt-theme-change', refreshEvents)

    /* 设备切换（旋转/拉伸窗口）同步默认视图：
       桌面回内置 timeGridWeek（恒 7 天）——单日期间 datesSet 已把 customRange
       覆盖为 1 天，若回 timeGridCustom 会继承 1 天区间 */
    isMobileMql.addEventListener('change', (e) => {
      calendar.changeView(e.matches ? 'timeGridDay' : 'timeGridWeek', calendar.getDate())
    })
  }

  return {
    init,
    refreshEvents,
    hasSelection,
    clearSelection,
    copySelectedToNextDay,
    deleteSelected,
    goToday,
    shiftPeriod,
    setViewDay,
    setViewWeek,
    setViewMonth,
    openCreateDefault,
    toggleHelp: () => UI.toggleHelp()
  }
})()

