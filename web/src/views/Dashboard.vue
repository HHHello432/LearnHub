<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { tasksApi, checkinsApi, rewardsApi, pomodoroApi, notesApi } from '@/api'

const router = useRouter()
const loading = ref(true)
const error = ref('')
const todayFocus = ref(0)
const taskCompletion = ref({ completed: 0, total: 0 })
const pendingCount = ref(0)
const checkinRate = ref(0)
const points = ref(0)
const recentNotes = ref<any[]>([])
const todayTasks = ref<any[]>([])

// 待办优先级映射
function getPriorityInfo(task: any) {
  const cat = task.category
  if (cat === 'urgent-important' || cat === 'urgent-not-important') return { text: '紧急', cls: 'tag-urgent' }
  if (cat === 'non-urgent-important') return { text: '重要', cls: 'tag-important' }
  if (cat === 'non-urgent-not-important') return { text: '普通', cls: 'tag-normal' }
  // Fallback for old data with numeric priority
  if (task.priority >= 3) return { text: '紧急', cls: 'tag-urgent' }
  if (task.priority === 2) return { text: '重要', cls: 'tag-important' }
  return { text: '普通', cls: 'tag-normal' }
}

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const [statsRes, pomoRes, checkinRes, pointsRes, notesRes, todoRes] = await Promise.all([
      tasksApi.getStats(),
      pomodoroApi.getStats(),
      checkinsApi.getStats(),
      rewardsApi.getPoints(),
      notesApi.getAll({}),
      tasksApi.getAll({}),
    ])
    // tasks stats
    const taskStatsData = statsRes.data?.data || statsRes.data || {}
    taskCompletion.value = {
      completed: taskStatsData.done || taskStatsData.completed || 0,
      total: taskStatsData.total || 0,
    }
    pendingCount.value = taskStatsData.todo ?? (taskStatsData.total - (taskStatsData.done || taskStatsData.completed || 0))
    // pomodoro stats
    const pomoData = pomoRes.data?.data || pomoRes.data || {}
    todayFocus.value = pomoData.todayTotalMinutes ?? pomoData.totalMinutes ?? pomoData.minutes ?? 0
    // checkin stats - 计算今日打卡率
    const checkinData = checkinRes.data?.data || checkinRes.data || {}
    const habits = checkinData.habits || {}
    const todayStr = new Date().toISOString().split('T')[0]
    // 从 localStorage 读取所有习惯名（和打卡页保持一致）
    let allNames = new Set(Object.keys(habits))
    try {
      const saved = JSON.parse(localStorage.getItem('learnhub_habit_names') || '[]')
      if (Array.isArray(saved)) saved.forEach(n => allNames.add(n))
    } catch {}
    const totalHabits = allNames.size || Object.keys(habits).length || checkinData.totalHabits || 1
    let todayDone = 0
    for (const key of Object.keys(habits)) {
      const h = habits[key]
      if (h.records?.some((r: any) => r.date === todayStr)) todayDone++
    }
    checkinRate.value = todayDone / totalHabits
    // reward points
    const pointsData = pointsRes.data?.data || pointsRes.data || {}
    points.value = pointsData.balance ?? pointsData.points ?? 0
    // notes
    const notesData = notesRes.data || {}
    recentNotes.value = notesData.notes || notesData.data || []
    if (Array.isArray(recentNotes.value)) {
      recentNotes.value = recentNotes.value.slice(0, 5)
    } else {
      recentNotes.value = []
    }
    // todo tasks - get all, show pending ones
    const todoData = todoRes.data || {}
    let allTasks = todoData.tasks || todoData.data || []
    if (!Array.isArray(allTasks)) allTasks = []
    todayTasks.value = allTasks.filter((t: any) => t.status !== 'done')
  } catch (err: any) {
    error.value = err?.response?.data?.message || err?.message || '加载仪表板数据失败'
  } finally {
    loading.value = false
  }
}

function goToNote(noteId: number) {
  router.push('/notes')
  // Focus will set selectedNote via URL param
}

function goToTasks() {
  router.push('/tasks')
}

async function toggleTask(task: any) {
  try {
    await tasksApi.update(task.id, { status: task.status === 'done' ? 'todo' : 'done' })
    // Refresh data in background, no page jump
    fetchData()
  } catch (err: any) {
    error.value = err?.response?.data?.message || '更新待办失败'
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">📊 首页</h1>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <span class="loading-text">加载中...</span>
    </div>

    <div v-else-if="error" class="error-message">
      <span>⚠️ {{ error }}</span>
      <button class="btn btn-sm btn-secondary" @click="fetchData">重试</button>
    </div>

    <template v-else>
      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stats-card">
          <div class="stats-icon" style="background: var(--accent-bg); color: var(--accent);">⏱️</div>
          <div class="stats-info">
            <div class="stats-value">{{ todayFocus }}</div>
            <div class="stats-label">今日专注(分钟)</div>
          </div>
        </div>

        <div class="stats-card">
          <div class="stats-icon" style="background: var(--success-bg); color: var(--success);">📋</div>
          <div class="stats-info">
            <div class="stats-value">
              {{ pendingCount }}
            </div>
            <div class="stats-label">待办剩余</div>
          </div>
        </div>

        <div class="stats-card">
          <div class="stats-icon" style="background: var(--warning-bg); color: var(--warning);">✅</div>
          <div class="stats-info">
            <div class="stats-value">{{ (checkinRate * 100).toFixed(0) }}%</div>
            <div class="stats-label">打卡完成率</div>
          </div>
        </div>

        <div class="stats-card">
          <div class="stats-icon" style="background: #7c3aed20; color: #a78bfa;">🎯</div>
          <div class="stats-info">
            <div class="stats-value">{{ points }}</div>
            <div class="stats-label">当前积分</div>
          </div>
        </div>
      </div>

      <div class="dashboard-grid">
        <!-- Recent Notes -->
        <div class="card dashboard-section">
          <div class="section-header">
            <h2 class="section-title">📝 最近笔记</h2>
            <button class="btn btn-sm btn-ghost" @click="router.push('/notes')">查看全部 →</button>
          </div>
          <div v-if="recentNotes.length === 0" class="empty-state" style="padding: 24px">
            <div class="empty-state-icon">📝</div>
            <div class="empty-state-text">暂无笔记</div>
            <div class="empty-state-desc">去创建你的第一篇笔记吧</div>
          </div>
          <div v-else class="notes-list">
            <div
              v-for="note in recentNotes"
              :key="note.id"
              class="note-item"
              @click="goToNote(note.id)"
            >
              <div class="note-title">{{ note.title || '无标题' }}</div>
              <div class="note-summary">{{ note.content?.substring(0, 80) || '' }}{{ note.content?.length > 80 ? '...' : '' }}</div>
              <div class="note-time">{{ new Date(note.createdAt).toLocaleDateString('zh-CN') }}</div>
            </div>
          </div>
        </div>

        <!-- Today Tasks -->
        <div class="card dashboard-section">
          <div class="section-header">
            <h2 class="section-title">📋 今日待办</h2>
            <button class="btn btn-sm btn-ghost" @click="goToTasks">查看全部 →</button>
          </div>
          <div v-if="todayTasks.length === 0" class="empty-state" style="padding: 24px">
            <div class="empty-state-icon">✅</div>
            <div class="empty-state-text">暂无待办</div>
            <div class="empty-state-desc">去待办页面添加任务吧</div>
          </div>
          <div v-else class="tasks-list">
            <div
              v-for="task in todayTasks"
              :key="task.id"
              class="task-item"
              :class="{ completed: task.status === 'done' }"
            >
              <input
                type="checkbox"
                class="checkbox"
                :checked="task.status === 'done'"
                @click.prevent="toggleTask(task)"
              />
              <span class="task-title">{{ task.title }}</span>
              <span
                class="tag"
                :class="getPriorityInfo(task).cls"
              >
                {{ getPriorityInfo(task).text }}
              </span>
            </div>
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
  margin-bottom: 24px;
}

.stats-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: border-color var(--transition);
}

.stats-card:hover {
  border-color: #484f58;
}

.stats-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.stats-info {
  min-width: 0;
}

.stats-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.stats-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.dashboard-section {
  display: flex;
  flex-direction: column;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-primary);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
}

.notes-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.note-item {
  padding: 10px 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition);
}

.note-item:hover {
  background: var(--bg-hover);
}

.note-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.note-summary {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
  margin-bottom: 2px;
}

.note-time {
  font-size: 11px;
  color: var(--text-tertiary);
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition);
}

.task-item:hover {
  background: var(--bg-hover);
}

.task-title {
  flex: 1;
  font-size: 14px;
  color: var(--text-primary);
}

.task-item.completed .task-title {
  text-decoration: line-through;
  color: var(--text-tertiary);
}

@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
