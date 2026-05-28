<script setup lang="ts">
import { ref, computed, onUnmounted, onMounted, watch, onActivated } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import { pomodoroApi } from '@/api'

// Timer
const FOCUS_TIME = 25 * 60
const BREAK_TIME = 5 * 60
const TEST_FOCUS_TIME = 60 // 1分钟测试
const TEST_BREAK_TIME = 60

const isTestMode = ref(false)
const isFocus = ref(true)
const timeLeft = ref(FOCUS_TIME)
const isRunning = ref(false)
const completedPomodoros = ref(0)
const totalMinutes = ref(0)
const records = ref<any[]>([])

let timerInterval: number | null = null

// 番茄钟运行时阻止离开
onBeforeRouteLeave((_to, _from, next) => {
  if (isRunning.value) {
    if (!confirm('⏱️ 番茄钟正在运行中，离开将中断计时。确定要离开吗？')) {
      next(false)
      return
    }
    stopTimer()
  }
  next()
})

// 阻止用户关闭页面
function beforeUnload(e: BeforeUnloadEvent) {
  if (isRunning.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}
onMounted(() => {
  window.addEventListener('beforeunload', beforeUnload)
  fetchRecords()
})

// 每次路由进入/激活时刷新数据
onActivated(() => {
  fetchRecords()
})

onBeforeRouteUpdate(() => {
  fetchRecords()
})
onUnmounted(() => {
  window.removeEventListener('beforeunload', beforeUnload)
  if (timerInterval) clearInterval(timerInterval)
})

const currentTotal = computed(() => {
  if (isTestMode.value) {
    return isFocus.value ? TEST_FOCUS_TIME : TEST_BREAK_TIME
  }
  return isFocus.value ? FOCUS_TIME : BREAK_TIME
})

const progress = computed(() => {
  const total = currentTotal.value
  return ((total - timeLeft.value) / total) * 100
})

const displayTime = computed(() => {
  const m = Math.floor(timeLeft.value / 60)
  const s = timeLeft.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const timerColor = computed(() => {
  if (!isRunning.value) return 'var(--text-secondary)'
  return isFocus.value ? 'var(--accent)' : 'var(--success)'
})

function getActualMinutes() {
  const total = currentTotal.value
  return Math.round(total / 60)
}

function startTimer() {
  if (isRunning.value) return
  isRunning.value = true
  timerInterval = window.setInterval(() => {
    if (timeLeft.value > 0) {
      timeLeft.value--
    } else {
      completeSession()
    }
  }, 1000)
}

function completeSession() {
  stopTimer()
  if (isFocus.value) {
    completedPomodoros.value++
    const mins = getActualMinutes()
    totalMinutes.value += mins
    // Record to API with actual duration and timestamps
    const planned = isTestMode.value ? 1 : 25
    const now = new Date()
    const startedAt = new Date(now.getTime() - (planned * 60 * 1000))
    pomodoroApi.create({
      durationPlanned: planned,
      durationActual: planned,
      type: 'focus',
      status: 'completed',
      startedAt: startedAt.toISOString(),
      endedAt: now.toISOString(),
    }).then(() => {
      // Refresh records after save
      fetchRecords()
    }).catch(() => {})
    switchMode()
  } else {
    switchMode()
  }
}

function pauseTimer() {
  isRunning.value = false
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

function stopTimer() {
  pauseTimer()
}

function resetTimer() {
  stopTimer()
  timeLeft.value = currentTotal.value
}

function switchMode() {
  isFocus.value = !isFocus.value
  timeLeft.value = currentTotal.value
  if (isRunning.value) {
    stopTimer()
  }
}

// 切换测试模式
function toggleTestMode() {
  if (isRunning.value) {
    if (!confirm('切换模式将重置计时器，确定吗？')) return
    stopTimer()
  }
  isTestMode.value = !isTestMode.value
  isFocus.value = true
  timeLeft.value = isTestMode.value ? TEST_FOCUS_TIME : FOCUS_TIME
}

// White noise options
const noiseOptions = [
  { label: '安静', value: '' },
  { label: '雨声', value: 'rain' },
  { label: '海浪', value: 'ocean' },
  { label: '森林', value: 'forest' },
  { label: '篝火', value: 'fire' },
]
const selectedNoise = ref('')

// Loading / Error
const loading = ref(true)
const error = ref('')

// 历史记录
const showHistory = ref(false)
const historyLoading = ref(false)
const historyYear = ref(new Date().getFullYear())
const historyMonth = ref(new Date().getMonth() + 1)
const historyData = ref({ monthSessions: 0, monthMinutes: 0, dailyData: [] as any[] })
const totalAllSessions = ref(0)
const totalAllMinutes = ref(0)

async function fetchRecords() {
  loading.value = true
  try {
    const statsRes = await pomodoroApi.getStats()
    const recordsRes = await pomodoroApi.getAll()
    if (statsRes.data && statsRes.data.success !== false) {
      const sData = statsRes.data.data || statsRes.data
      totalMinutes.value = sData.todayTotalMinutes ?? sData.totalMinutes ?? sData.minutes ?? 0
      completedPomodoros.value = sData.todaySessions ?? sData.completedPomodoros ?? sData.count ?? 0
    }
    if (recordsRes.data && recordsRes.data.success !== false) {
      const rData = recordsRes.data.data || recordsRes.data
      records.value = Array.isArray(rData) ? rData : (rData.records || rData.data || [])
    }
    if (!Array.isArray(records.value)) records.value = []
  } catch (e: any) {
    error.value = '加载番茄钟数据失败: ' + (e?.message || '')
  } finally {
    loading.value = false
  }
}

// 历史记录
async function openHistory() {
  showHistory.value = true
  await loadHistory()
}

function historyMonthOffset(delta: number) {
  historyMonth.value += delta
  if (historyMonth.value > 12) { historyMonth.value = 1; historyYear.value++ }
  if (historyMonth.value < 1) { historyMonth.value = 12; historyYear.value-- }
  loadHistory()
}

async function loadHistory() {
  historyLoading.value = true
  try {
    const [hisRes, statsRes] = await Promise.all([
      pomodoroApi.getHistory({ year: historyYear.value, month: historyMonth.value }),
      pomodoroApi.getStats(),
    ])
    const hd = hisRes.data?.data || hisRes.data || {}
    historyData.value = hd
    // 累计数据从 stats 接口拿
    const sd = statsRes.data?.data || statsRes.data || {}
    totalAllSessions.value = sd.totalCompleted || sd.totalSessions || 0
    totalAllMinutes.value = sd.totalFocusMinutes || 0
  } catch { /* ignore */ }
  historyLoading.value = false
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title" style="margin-bottom:0">⏱️ 番茄钟</h1>
      <button class="btn btn-sm btn-secondary" @click="toggleTestMode">
        {{ isTestMode ? '🔁 切换到标准模式 (25min)' : '🧪 测试模式 (1min)' }}
      </button>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <span class="loading-text">加载中...</span>
    </div>

    <div v-else-if="error" class="error-message">
      <span>⚠️ {{ error }}</span>
      <button class="btn btn-sm btn-secondary" @click="fetchRecords">重试</button>
    </div>

    <template v-else>
      <div class="pomodoro-layout">
        <!-- Timer -->
        <div class="card timer-card">
          <div class="mode-switch">
            <button
              class="mode-btn"
              :class="{ active: isFocus }"
              @click="isFocus ? null : switchMode()"
            >
              专注
            </button>
            <button
              class="mode-btn"
              :class="{ active: !isFocus }"
              @click="!isFocus ? null : switchMode()"
            >
              休息
            </button>
          </div>

          <div class="timer-circle" :style="{ '--progress': progress, '--color': timerColor }">
            <svg class="circle-svg" viewBox="0 0 200 200">
              <circle
                class="circle-bg"
                cx="100" cy="100" r="88"
                fill="none"
                stroke="var(--border-primary)"
                stroke-width="6"
              />
              <circle
                class="circle-progress"
                cx="100" cy="100" r="88"
                fill="none"
                :stroke="timerColor"
                stroke-width="6"
                stroke-linecap="round"
                :stroke-dasharray="2 * Math.PI * 88"
                :stroke-dashoffset="2 * Math.PI * 88 * (1 - progress / 100)"
                transform="rotate(-90, 100, 100)"
              />
            </svg>
            <div class="timer-display">
              <div class="timer-time">{{ displayTime }}</div>
              <div class="timer-label">{{ isFocus ? (isTestMode ? '专注测试' : '专注时间') : (isTestMode ? '休息测试' : '休息时间') }}</div>
              <div v-if="isTestMode" class="test-badge">🧪 测试模式</div>
            </div>
          </div>

          <div class="timer-controls">
            <button
              v-if="!isRunning"
              class="btn btn-primary"
              @click="startTimer"
            >
              ▶ 开始
            </button>
            <button
              v-else
              class="btn btn-secondary"
              @click="pauseTimer"
            >
              ⏸ 暂停
            </button>
            <button
              class="btn btn-secondary"
              @click="resetTimer"
            >
              ⏹ 重置
            </button>
          </div>

          <div v-if="isRunning" class="running-warning">
            ⏱️ 番茄钟运行中，离开此页将中断计时
          </div>

          <div class="noise-select">
            <label class="noise-label">白噪音</label>
            <select v-model="selectedNoise" class="select">
              <option
                v-for="opt in noiseOptions"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>

        <!-- Stats & Records -->
        <div class="side-panel">
          <div class="card stats-card">
            <div class="stats-header">
              <h3 class="stats-title" style="margin:0;border:none;padding:0">今日统计</h3>
              <button class="btn btn-sm btn-ghost" @click="openHistory">📅 历史</button>
            </div>
            <div class="stats-row">
              <div class="stat-item">
                <div class="stat-value">{{ totalMinutes }}</div>
                <div class="stat-label">总时长(分钟)</div>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <div class="stat-value">{{ completedPomodoros }}</div>
                <div class="stat-label">完成番茄</div>
              </div>
            </div>
          </div>

          <div class="card records-card">
            <h3 class="stats-title">最近记录</h3>
            <div v-if="records.length === 0" class="empty-state" style="padding: 24px">
              <div class="empty-state-text">暂无记录</div>
              <div class="empty-state-desc">完成一个番茄钟开始记录吧</div>
            </div>
            <div v-else class="records-list">
              <div
                v-for="record in records"
                :key="record.id"
                class="record-item"
              >
                <div class="record-type">{{ record.type === 'focus' ? '🍅 专注' : '☕ 休息' }}</div>
                <div class="record-duration">{{ record.durationPlanned || record.duration }}分钟</div>
                <div class="record-time">{{ new Date(record.startedAt || record.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) }} {{ new Date(record.completedAt || record.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>

  <!-- 历史记录弹窗 -->
  <Teleport v-if="showHistory" to="body">
    <div class="modal-overlay" @click.self="showHistory = false">
      <div class="history-modal">
        <div class="modal-header">
          <h3>📅 历史记录</h3>
          <button class="btn btn-sm btn-ghost" @click="showHistory = false">✕</button>
        </div>

        <div class="history-nav">
          <button class="btn btn-sm" @click="historyMonthOffset(-1)">◀</button>
          <span class="history-nav-label">{{ historyYear }}年{{ historyMonth }}月</span>
          <button class="btn btn-sm" @click="historyMonthOffset(1)">▶</button>
        </div>

        <div v-if="historyLoading" class="history-loading">
          <div class="spinner small"></div>
          <span>加载中...</span>
        </div>

        <div v-else class="history-body">
          <!-- 当月汇总 -->
          <div class="history-summary">
            <div class="summary-item">
              <span class="summary-val">{{ historyData.monthMinutes }}</span>
              <span class="summary-label">本月时长(分钟)</span>
            </div>
            <div class="summary-item">
              <span class="summary-val">{{ historyData.monthSessions }}</span>
              <span class="summary-label">本月完成番茄</span>
            </div>
          </div>

          <!-- 累计 -->
          <div class="history-total">
            <span class="total-val">📊 累计 {{ totalAllMinutes }} 分钟 · {{ totalAllSessions }} 个番茄</span>
          </div>

          <!-- 每天明细 -->
          <div v-if="historyData.dailyData && historyData.dailyData.length > 0" class="history-daily">
            <div class="history-list-header">
              <span>日期</span>
              <span>完成番茄</span>
              <span>总时长</span>
            </div>
            <div
              v-for="day in historyData.dailyData"
              :key="day.date"
              class="history-daily-item"
            >
              <span class="daily-date">{{ day.date.slice(5) }}</span>
              <span class="daily-count">🍅 {{ day.sessions }}次</span>
              <span class="daily-minutes">{{ day.totalMinutes }}分钟</span>
            </div>
          </div>
          <div v-else class="history-empty">
            该月暂无记录
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.page-header {
  margin-bottom: 20px;
}

.pomodoro-layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 20px;
}

.timer-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px;
}

.mode-switch {
  display: flex;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  padding: 3px;
  margin-bottom: 28px;
}

.mode-btn {
  padding: 6px 20px;
  background: none;
  border: none;
  border-radius: 4px;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}

.mode-btn.active {
  background: var(--bg-secondary);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
}

.timer-circle {
  position: relative;
  width: 240px;
  height: 240px;
  margin-bottom: 24px;
}

.circle-svg {
  width: 100%;
  height: 100%;
  transform: rotate(0deg);
}

.circle-progress {
  transition: stroke-dashoffset 0.3s ease, stroke 0.3s ease;
}

.timer-display {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.timer-time {
  font-size: 48px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
  letter-spacing: 2px;
}

.timer-label {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.test-badge {
  font-size: 11px;
  margin-top: 2px;
  color: var(--warning);
  font-weight: 500;
}

.timer-controls {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.running-warning {
  font-size: 12px;
  color: var(--warning);
  margin-bottom: 16px;
  padding: 6px 12px;
  background: var(--warning-bg);
  border-radius: var(--radius-sm);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.noise-select {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  max-width: 280px;
}

.noise-label {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.side-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stats-card {
  padding: 20px;
}

.stats-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-primary);
}

.stats-row {
  display: flex;
  align-items: center;
  justify-content: space-around;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--accent);
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: var(--border-primary);
}

.records-card {
  flex: 1;
  padding: 20px;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.record-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  border-radius: var(--radius-sm);
  transition: background var(--transition);
}

.record-item:hover {
  background: var(--bg-hover);
}

.record-type {
  font-size: 13px;
  font-weight: 500;
}

.record-duration {
  font-size: 13px;
  color: var(--text-primary);
}

.record-time {
  font-size: 12px;
  color: var(--text-tertiary);
}

/* 历史弹窗 */
.stats-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-primary);
}

.btn-ghost {
  background: none;
  border: 1px solid var(--border-primary);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  transition: all var(--transition);
}

.btn-ghost:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.history-modal {
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  width: 440px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-primary);
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.history-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border-primary);
}

.history-nav-label {
  font-size: 14px;
  font-weight: 600;
  min-width: 80px;
  text-align: center;
}

.history-nav .btn {
  font-size: 13px;
  padding: 4px 10px;
}

.history-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px;
  color: var(--text-secondary);
}

.spinner.small {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border-primary);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.history-body {
  overflow-y: auto;
  padding: 16px 20px;
  flex: 1;
}

.history-summary {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.summary-item {
  flex: 1;
  text-align: center;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
}

.summary-val {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: var(--accent);
}

.summary-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.history-total {
  text-align: center;
  padding: 10px;
  margin-bottom: 12px;
  font-size: 14px;
  color: var(--text-primary);
  background: var(--bg-accent-subtle);
  border-radius: var(--radius-sm);
}

.total-val {
  font-weight: 600;
}

.history-list-header {
  display: flex;
  justify-content: space-between;
  padding: 6px 8px;
  font-size: 12px;
  color: var(--text-tertiary);
  border-bottom: 1px solid var(--border-primary);
}

.history-daily-item {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  border-radius: var(--radius-sm);
  transition: background var(--transition);
}

.history-daily-item:hover {
  background: var(--bg-hover);
}

.daily-date {
  font-size: 13px;
  font-weight: 500;
  min-width: 50px;
}

.daily-count, .daily-minutes {
  font-size: 13px;
  color: var(--text-secondary);
}

.history-empty {
  text-align: center;
  padding: 24px;
  color: var(--text-tertiary);
}

@media (max-width: 768px) {
  .pomodoro-layout {
    grid-template-columns: 1fr;
  }

  .timer-circle {
    width: 200px;
    height: 200px;
  }

  .timer-time {
    font-size: 36px;
  }
}
</style>
