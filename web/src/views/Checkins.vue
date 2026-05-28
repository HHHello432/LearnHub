<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { checkinsApi } from '@/api'

interface CheckinRecord {
  id: number
  habitName: string
  date: string
  status: string
  streakCount: number
}

interface Habit {
  name: string
  checkins: string[] // ISO date strings
  id?: number // placeholder
  points: number   // 每次打卡可得积分
}

interface HabitStats {
  total: number
  todayCompleted: number
  streak: number
}

const checkins = ref<CheckinRecord[]>([])
const habits = ref<Habit[]>([])
const newHabitName = ref('')
const newHabitPoints = ref(5)
const loading = ref(true)
const error = ref('')

// 日历月份导航
const calendarYear = ref(new Date().getFullYear())
const calendarMonth = ref(new Date().getMonth())
const submitting = ref(false)
const stats = ref<HabitStats>({ total: 0, todayCompleted: 0, streak: 0 })

const todayStr = computed(() => {
  const d = new Date()
  return d.toISOString().split('T')[0]
})

// 当前选中的日历日期（默认今天）
const selectedCalendarDate = ref('')

const calendarMonthStr = computed(() => {
  return `${calendarYear.value}-${String(calendarMonth.value + 1).padStart(2, '0')}`
})

const todayMonth = computed(() => new Date().getMonth())
const todayYear = computed(() => new Date().getFullYear())
const displayMonthLabel = computed(() => `${calendarYear.value}年${String(calendarMonth.value + 1).padStart(2, '0')}月`)

// 从打卡记录中按习惯名称分组
const HABIT_NAMES_KEY = 'learnhub_habit_names'

function loadHabitNames(): string[] {
  try {
    const raw = localStorage.getItem(HABIT_NAMES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveHabitNames(names: string[]) {
  try {
    localStorage.setItem(HABIT_NAMES_KEY, JSON.stringify(names))
  } catch { /* ignore */ }
}

// 各习惯独立积分值
const HABIT_POINTS_KEY = 'learnhub_habit_points'

function loadHabitPoints(): Record<string, number> {
  try {
    const raw = localStorage.getItem(HABIT_POINTS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveHabitPoints(points: Record<string, number>) {
  try {
    localStorage.setItem(HABIT_POINTS_KEY, JSON.stringify(points))
  } catch { /* ignore */ }
}

function getHabitPoints(name: string, defaultVal = 5): number {
  const all = loadHabitPoints()
  return all[name] ?? defaultVal
}

function setHabitPoints(name: string, val: number) {
  const all = loadHabitPoints()
  all[name] = val
  saveHabitPoints(all)
}

function groupByHabit(records: CheckinRecord[]): Habit[] {
  const map = new Map<string, string[]>()
  for (const r of records) {
    const d = r.date.split('T')[0]
    if (!map.has(r.habitName)) {
      map.set(r.habitName, [])
    }
    if (!map.get(r.habitName)!.includes(d)) {
      map.get(r.habitName)!.push(d)
    }
  }
  const pointsMap = loadHabitPoints()
  const result: Habit[] = []
  for (const [name, dates] of map.entries()) {
    result.push({ name, checkins: dates.sort(), points: pointsMap[name] ?? 5 })
  }
  return result
}

function prevMonth() {
  if (calendarMonth.value === 0) {
    calendarMonth.value = 11
    calendarYear.value--
  } else {
    calendarMonth.value--
  }
}

function nextMonth() {
  if (calendarMonth.value === 11) {
    calendarMonth.value = 0
    calendarYear.value++
  } else {
    calendarMonth.value++
  }
}

function goToTodayMonth() {
  calendarYear.value = new Date().getFullYear()
  calendarMonth.value = new Date().getMonth()
}

const calendarDays = computed(() => {
  const year = calendarYear.value
  const month = calendarMonth.value
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const days: { day: number; checked: boolean; weekDay: number }[] = []
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push({ day: 0, checked: false, weekDay: i })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const checked = habits.value.some((h) =>
      h.checkins?.some((c) => c.startsWith(dateStr))
    )
    days.push({ day, checked, weekDay: (firstDayOfWeek + day - 1) % 7 })
  }
  return days
})

const weekHeaders = ['日', '一', '二', '三', '四', '五', '六']

const completionRate = computed(() => {
  if (habits.value.length === 0) return 0
  return (stats.value.todayCompleted / habits.value.length) * 100
})

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const [checkinsRes, statsRes] = await Promise.all([
      checkinsApi.getAll({ month: calendarMonthStr.value }),
      checkinsApi.getStats(),
    ])
    // 原始打卡记录
    const cData = checkinsRes.data || {}
    const records = cData.data || cData.records || []
    checkins.value = Array.isArray(records) ? records : []
    // 按习惯名称分组
    const grouped = groupByHabit(checkins.value)

    // 从 localStorage 读取所有习惯名（确保无记录的习惯不丢失）
    const savedNames = loadHabitNames()
    const groupedNames = new Set(grouped.map(h => h.name))
    for (const name of savedNames) {
      if (!groupedNames.has(name)) {
        grouped.push({ name, checkins: [], points: getHabitPoints(name, 5) })
      }
    }
    habits.value = grouped

    // 保存习惯名到 localStorage
    saveHabitNames(habits.value.map(h => h.name))

    // 统计
    stats.value = { total: habits.value.length, todayCompleted: 0, streak: 0 }
    // 用本地方法计算连续天数和今日完成
    let todayCount = 0
    let maxStreak = 0
    for (const h of habits.value) {
      if (h.checkins.some(c => c.startsWith(todayStr.value))) todayCount++
      const s = getStreakDays(h)
      if (s > maxStreak) maxStreak = s
    }
    stats.value.todayCompleted = todayCount
    stats.value.streak = maxStreak
    stats.value.total = habits.value.length
  } catch (err: any) {
    error.value = err?.response?.data?.message || err?.message || '加载打卡数据失败'
  } finally {
    loading.value = false
  }
}

async function addHabit() {
  const name = newHabitName.value.trim()
  if (!name || submitting.value) return

  // 检查是否已存在该习惯
  if (habits.value.some(h => h.name === name)) {
    error.value = '该习惯已经存在'
    return
  }

  submitting.value = true
  try {
    // 新添加的习惯，只记录今天的打卡状态
    // 之前的日期不会自动打上这个新习惯的打卡
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const pts = newHabitPoints.value
    await checkinsApi.create({ date: todayStr, habitName: name, points: pts })
    setHabitPoints(name, pts)
    newHabitName.value = ''
    await fetchData()
  } catch (err: any) {
    error.value = err?.response?.data?.message || '创建习惯失败'
  } finally {
    submitting.value = false
  }
}

let tickingLock = false

async function toggleCheckin(habit: Habit) {
  if (tickingLock) {
    alert('⏳ 操作太频繁，请稍后再试')
    return
  }
  tickingLock = true

  const targetDate = selectedCalendarDate.value || todayStr.value
  const checked = habit.checkins?.some((c) => c.startsWith(targetDate))

  // 本地即时切换
  if (checked) {
    habit.checkins = habit.checkins.filter(c => !c.startsWith(targetDate))
  } else {
    habit.checkins = [...habit.checkins, targetDate]
  }
  updateLocalStats()

  try {
    if (checked) {
      const record = checkins.value.find(r =>
        r.habitName === habit.name && r.date.split('T')[0] === targetDate
      )
      if (record && record.id) {
        await checkinsApi.deleteRecord(record.id)
      }
    } else {
      const pts = getHabitPoints(habit.name, 5)
      await checkinsApi.create({ date: targetDate, habitName: habit.name, points: pts })
    }
  } catch (err: any) {
    // 失败回滚
    if (checked) {
      habit.checkins = [...habit.checkins, targetDate]
    } else {
      habit.checkins = habit.checkins.filter(c => !c.startsWith(targetDate))
    }
    updateLocalStats()
    error.value = err?.response?.data?.message || '操作失败'
  } finally {
    tickingLock = false
  }
}

function getStreakDays(habit: Habit): number {
  if (!habit.checkins || habit.checkins.length === 0) return 0
  const targetDate = selectedCalendarDate.value || todayStr.value
  const sorted = [...habit.checkins].sort().reverse()
  let streak = 0
  let check = new Date(targetDate)
  for (const dateStr of sorted) {
    const d = new Date(dateStr)
    const diff = Math.round((d.getTime() - check.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 0 || diff === -1) {
      if (diff === -1) check = d
      streak++
    } else if (diff < -1) {
      break
    }
  }
  return streak
}

function getMaxStreak(): number {
  let maxStreak = 0
  for (const h of habits.value) {
    const s = getStreakDays(h)
    if (s > maxStreak) maxStreak = s
  }
  return maxStreak
}

function updateLocalStats() {
  const targetDate = selectedCalendarDate.value || todayStr.value
  const doneCount = habits.value.filter(h =>
    h.checkins?.some(c => c.startsWith(targetDate))
  ).length
  stats.value.todayCompleted = doneCount
  stats.value.streak = getMaxStreak()
  stats.value.total = habits.value.length
}


function getDateStr(day: number) {
  return `${calendarYear.value}-${String(calendarMonth.value + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function selectCalendarDay(day: { day: number }) {
  if (day.day === 0) return
  selectedCalendarDate.value = getDateStr(day.day)
}

// 在日历切换时重置选中日期到今天
const origPrevMonth = prevMonth
const origNextMonth = nextMonth
const setPrevMonth = () => {
  prevMonth()
  selectedCalendarDate.value = ''
}
const setNextMonth = () => {
  nextMonth()
  selectedCalendarDate.value = ''
}

async function deleteHabit(habitName: string) {
  if (!confirm(`确定要删除习惯「${habitName}」及其所有打卡记录吗？`)) return
  try {
    await checkinsApi.delete(encodeURIComponent(habitName))
    // 从 localStorage 移除
    const names = loadHabitNames().filter(n => n !== habitName)
    saveHabitNames(names)
    await fetchData()
  } catch (err: any) {
    error.value = err?.response?.data?.message || '删除习惯失败'
  }
}

// 月份变化时重新获取数据
watch([calendarYear, calendarMonth], () => {
  fetchData()
})

onMounted(fetchData)
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">✅ 打卡</h1>

    <div v-if="error" class="error-message">
      <span>⚠️ {{ error }}</span>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <span class="loading-text">加载中...</span>
    </div>

    <template v-else>
      <!-- Stats -->
      <div class="stats-grid">
        <div class="stats-card">
          <div class="stats-icon" style="background: var(--accent-bg); color: var(--accent);">📊</div>
          <div class="stats-info">
            <div class="stats-value">{{ habits.length }}</div>
            <div class="stats-label">总习惯数</div>
          </div>
        </div>
        <div class="stats-card">
          <div class="stats-icon" style="background: var(--success-bg); color: var(--success);">✅</div>
          <div class="stats-info">
            <div class="stats-value">{{ stats.todayCompleted }}/{{ habits.length }}</div>
            <div class="stats-label">今日完成</div>
          </div>
        </div>
        <div class="stats-card">
          <div class="stats-icon" style="background: var(--warning-bg); color: var(--warning);">🔥</div>
          <div class="stats-info">
            <div class="stats-value">{{ stats.streak }}</div>
            <div class="stats-label">最高连续天数</div>
          </div>
        </div>
        <div class="stats-card">
          <div class="stats-icon" style="background: #7c3aed20; color: #a78bfa;">📈</div>
          <div class="stats-info">
            <div class="stats-value">{{ completionRate.toFixed(0) }}%</div>
            <div class="stats-label">今日完成率</div>
          </div>
        </div>
      </div>

      <!-- Add Habit -->
      <div class="add-habit card">
        <div class="add-habit-row">
          <input
            v-model="newHabitName"
            class="input"
            placeholder="添加新习惯..."
            @keyup.enter="addHabit"
          />
          <div class="pts-group">
            <span class="pts-label">+</span>
            <input
              v-model.number="newHabitPoints"
              type="number"
              class="input pts-input"
              min="1"
              max="999"
              title="每次打卡可得积分"
            />
            <span class="pts-label">分</span>
          </div>
          <button
            class="btn btn-primary"
            :disabled="!newHabitName.trim() || submitting"
            @click="addHabit"
          >
            {{ submitting ? '添加中...' : '添加' }}
          </button>
        </div>
        <div class="add-hint">新习惯创建后自动打卡今天，之后可每日勾选</div>
      </div>

      <!-- Calendar Heatmap -->
      <div class="card calendar-card">
        <div class="calendar-nav">
          <button class="btn btn-sm btn-ghost" @click="setPrevMonth(); fetchData()">◀</button>
          <h3 class="section-title" style="margin:0;border:none;padding:0">{{ displayMonthLabel }}</h3>
          <button class="btn btn-sm btn-ghost" @click="setNextMonth(); fetchData()">▶</button>
          <button v-if="calendarYear !== new Date().getFullYear() || calendarMonth !== new Date().getMonth()" class="btn btn-sm btn-secondary" @click="goToTodayMonth(); fetchData()">今天</button>
        </div>
        <div class="calendar">
          <div class="calendar-header">
            <div
              v-for="w in weekHeaders"
              :key="w"
              class="calendar-weekday"
            >
              {{ w }}
            </div>
          </div>
          <div class="calendar-grid">
            <div
              v-for="(day, idx) in calendarDays"
              :key="idx"
              class="calendar-day"
              :class="{
                'has-data': day.day > 0 && day.checked,
                'today': day.day > 0 && day.day === new Date().getDate() && calendarYear === new Date().getFullYear() && calendarMonth === new Date().getMonth(),
                'empty': day.day === 0,
                'selected': day.day > 0 && selectedCalendarDate === getDateStr(day.day),
              }"
              @click="selectCalendarDay(day)"
            >
              <span v-if="day.day > 0">{{ day.day }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 选中日期标签 -->
      <div v-if="selectedCalendarDate" class="card" style="padding: 12px 20px; margin-bottom: 12px;">
        <span style="font-size: 14px; color: var(--text-secondary);">📅 当前查看：<strong style="color: var(--text-primary);">{{ selectedCalendarDate }}</strong>
          <span v-if="selectedCalendarDate === todayStr" style="color: var(--accent); margin-left: 4px;">（今天）</span>
          <button v-if="selectedCalendarDate !== todayStr" class="btn btn-sm btn-ghost" style="margin-left: 8px;" @click="selectedCalendarDate = todayStr">回到今天</button>
        </span>
      </div>

      <!-- Habit List -->
      <div class="card habit-list-card">
        <h3 class="section-title">习惯列表</h3>
        <div v-if="habits.length === 0" class="empty-state" style="padding: 24px">
          <div class="empty-state-icon">✅</div>
          <div class="empty-state-text">还没有习惯</div>
          <div class="empty-state-desc">添加一个习惯开始打卡吧</div>
        </div>
        <div v-else class="habit-list">
          <div
            v-for="habit in habits"
            :key="habit.name"
            class="habit-item"
          >
            <div
              class="habit-check"
              :class="{ checked: !!habit.checkins?.some((c) => c.startsWith(selectedCalendarDate || todayStr)) }"
              @click="() => toggleCheckin(habit)"
            >
              <span class="check-icon">{{ !!habit.checkins?.some((c) => c.startsWith(selectedCalendarDate || todayStr)) ? '✅' : '⬜' }}</span>
            </div>
            <div class="habit-info">
              <div class="habit-name">{{ habit.name }}</div>
              <div class="habit-stats-row">
                <span class="habit-stat">🔥 连续 {{ getStreakDays(habit) }} 天</span>
                <span class="habit-stat">📅 {{ habit.checkins?.length || 0 }} 天</span>
                <span class="habit-stat">🎯 +{{ getHabitPoints(habit.name, 5) }}分</span>
              </div>
            </div>
            <button
              class="btn btn-icon btn-danger btn-sm-delete"
              @click="deleteHabit(habit.name)"
              title="删除习惯"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stats-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.stats-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.stats-info {
  min-width: 0;
}

.stats-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.stats-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.add-habit {
  margin-bottom: 16px;
}

.add-habit-row {
  display: flex;
  gap: 8px;
}

.add-habit-row .input {
  flex: 1;
}

.pts-group {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.pts-label {
  font-size: 13px;
  color: var(--text-tertiary);
}

.pts-input {
  width: 42px !important;
  text-align: center;
  flex: none !important;
}

.add-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 6px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-primary);
}

/* Calendar */
.calendar-card {
  margin-bottom: 16px;
  padding: 20px;
}

.calendar-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-primary);
}

.calendar-nav h3 {
  flex: 1;
  text-align: center;
}

.calendar {
  max-width: 400px;
}

.calendar-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 4px;
}

.calendar-weekday {
  text-align: center;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-tertiary);
  padding: 4px 0;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--text-secondary);
  border-radius: 4px;
  background: var(--bg-tertiary);
}

.calendar-day.has-data {
  background: var(--success-bg);
  color: var(--success);
}

.calendar-day.today {
  border: 1px solid var(--accent);
  font-weight: 600;
}

.calendar-day.selected {
  border: 2px solid var(--accent);
  background: var(--accent-bg);
  color: var(--accent);
  font-weight: 700;
}

.calendar-day.selected.has-data {
  background: var(--success);
  color: white;
}

.calendar-day.today.selected {
  border: 2px solid var(--accent);
}

.calendar-day.empty {
  background: transparent;
}

/* Habit List */
.habit-list-card {
  padding: 20px;
}

.habit-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.habit-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: var(--radius-sm);
  transition: background var(--transition);
}

.habit-item:hover {
  background: var(--bg-hover);
}

.habit-check {
  flex-shrink: 0;
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  transition: background var(--transition);
  user-select: none;
  -webkit-user-select: none;
}

.habit-check:hover {
  background: var(--bg-hover);
}

.check-icon {
  font-size: 20px;
  line-height: 1;
  display: inline-block;
}

.habit-info {
  flex: 1;
  min-width: 0;
}

.habit-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.habit-stats-row {
  display: flex;
  gap: 16px;
}

.habit-stat {
  font-size: 12px;
  color: var(--text-tertiary);
}

.btn-sm-delete {
  opacity: 0;
  transition: opacity var(--transition);
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
}

.habit-item:hover .btn-sm-delete {
  opacity: 0.6;
}

.btn-sm-delete:hover {
  opacity: 1 !important;
  background: var(--danger-bg);
}

@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
