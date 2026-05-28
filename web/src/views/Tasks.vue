<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { tasksApi } from '@/api'

interface Task {
  id: number
  title: string
  description?: string
  status: string
  priority: string
  category?: string
  createdAt: string
  completedAt?: string
  pointsReward?: number
}

const tasks = ref<Task[]>([])
const newTaskTitle = ref('')
const newTaskQuadrant = ref(1)
const newTaskPoints = ref(10)
const selectedQuadrant = ref<number | null>(null)
const searchQuery = ref('')
const loading = ref(true)
const error = ref('')
const submitting = ref(false)

const quadrantLabels = [
  { value: null, label: '全部', icon: '📋' },
  { value: 1, label: '重要紧急', icon: '🔴' },
  { value: 2, label: '重要不紧急', icon: '🟡' },
  { value: 3, label: '紧急不重要', icon: '🟠' },
  { value: 4, label: '不重要不紧急', icon: '🟢' },
]

const categoryMap: Record<number, string> = {
  1: 'urgent-important',
  2: 'non-urgent-important',
  3: 'urgent-not-important',
  4: 'non-urgent-not-important',
}

function getPriorityInfo(task: Task) {
  const cat = task.category
  if (cat === 'urgent-important' || cat === 'urgent-not-important') return { text: '紧急', cls: 'tag-urgent' }
  if (cat === 'non-urgent-important') return { text: '重要', cls: 'tag-important' }
  return { text: '普通', cls: 'tag-normal' }
}

// 搜索过滤
const filteredTasks = computed(() => {
  let filtered = tasks.value
  // 象限过滤
  if (selectedQuadrant.value !== null) {
    const cat = categoryMap[selectedQuadrant.value!]
    filtered = filtered.filter((t) => t.category === cat)
  }
  // 搜索过滤
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    filtered = filtered.filter((t) =>
      t.title.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q))
    )
  }
  return filtered
})

const pendingTasks = computed(() => filteredTasks.value.filter((t) => t.status !== 'done'))
const completedTasks = computed(() => filteredTasks.value.filter((t) => t.status === 'done'))

// 已完成任务按日期分组
interface DateGroup {
  label: string
  dateKey: string
  tasks: Task[]
}

function getDateLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const fmt = (dt: Date) => `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`
  const dFmt = fmt(d)
  if (dFmt === fmt(today)) return '今天'
  if (dFmt === fmt(yesterday)) return '昨天'
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

const completedGroups = computed(() => {
  const groups = new Map<string, Task[]>()
  for (const task of completedTasks.value) {
    const dateKey = task.completedAt
      ? new Date(task.completedAt).toISOString().split('T')[0]
      : new Date(task.createdAt).toISOString().split('T')[0]
    if (!groups.has(dateKey)) groups.set(dateKey, [])
    groups.get(dateKey)!.push(task)
  }
  const result: DateGroup[] = []
  const sortedKeys = Array.from(groups.keys()).sort().reverse()
  for (const dateKey of sortedKeys) {
    result.push({
      label: getDateLabel(dateKey),
      dateKey,
      tasks: groups.get(dateKey)!,
    })
  }
  return result
})
const stats = computed(() => ({
  total: tasks.value.length,
  completed: tasks.value.filter((t) => t.status === 'done').length,
  pending: tasks.value.filter((t) => t.status !== 'done').length,
}))

async function fetchTasks() {
  loading.value = true
  error.value = ''
  try {
    const res = await tasksApi.getAll()
    const d = res.data || {}
    if (Array.isArray(d)) {
      tasks.value = d
    } else if (Array.isArray(d.tasks)) {
      tasks.value = d.tasks
    } else if (Array.isArray(d.data)) {
      tasks.value = d.data
    } else {
      tasks.value = []
    }
  } catch (err: any) {
    error.value = err?.response?.data?.message || err?.message || '加载待办失败'
  } finally {
    loading.value = false
  }
}

async function addTask() {
  const title = newTaskTitle.value.trim()
  if (!title || submitting.value) return

  submitting.value = true
  try {
    await tasksApi.create({
      title,
      category: categoryMap[newTaskQuadrant.value] || undefined,
      pointsReward: newTaskPoints.value,
    })
    newTaskPoints.value = 10
    newTaskTitle.value = ''
    await fetchTasks()
  } catch (err: any) {
    error.value = err?.response?.data?.message || '创建待办失败'
  } finally {
    submitting.value = false
  }
}

async function toggleTask(task: Task) {
  // 乐观更新：前端先改状态
  const newStatus = task.status === 'done' ? 'todo' : 'done'
  task.status = newStatus

  try {
    await tasksApi.update(task.id, { status: newStatus })
  } catch (err: any) {
    // 失败回滚
    task.status = task.status === 'done' ? 'todo' : 'done'
    error.value = err?.response?.data?.message || '更新待办失败'
  }
}

async function deleteTask(id: number) {
  try {
    await tasksApi.delete(id)
    tasks.value = tasks.value.filter((t) => t.id !== id)
  } catch (err: any) {
    error.value = err?.response?.data?.message || '删除待办失败'
  }
}

onMounted(fetchTasks)
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title" style="margin-bottom: 0">📋 待办</h1>
      <div class="task-stats">
        <span class="badge badge-accent">全部 {{ stats.total }}</span>
        <span class="badge badge-success">已完成 {{ stats.completed }}</span>
        <span class="badge badge-warning">待完成 {{ stats.pending }}</span>
      </div>
    </div>

    <!-- Add Task -->
    <div class="add-task card">
      <div class="add-task-row">
        <input
          v-model="newTaskTitle"
          class="input"
          placeholder="添加新待办..."
          @keyup.enter="addTask"
        />
        <select v-model="newTaskQuadrant" class="select quadrant-select">
          <option value="1">重要紧急</option>
          <option value="2">重要不紧急</option>
          <option value="3">紧急不重要</option>
          <option value="4">不重要不紧急</option>
        </select>
        <input
          v-model.number="newTaskPoints"
          type="number"
          min="1"
          max="999"
          class="input points-input"
          placeholder="积分"
          title="完成此任务可获得积分（默认10）"
        />
        <button
          class="btn btn-primary"
          :disabled="!newTaskTitle.trim() || submitting"
          @click="addTask"
        >
          {{ submitting ? '添加中...' : '添加' }}
        </button>
      </div>
    </div>

    <div v-if="error" class="error-message">
      <span>⚠️ {{ error }}</span>
    </div>

    <!-- Search + Quadrant Filter -->
    <div class="filter-bar">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchQuery"
          class="input search-input"
          placeholder="搜索待办任务..."
        />
      </div>
      <div class="quadrant-filter">
        <button
          v-for="q in quadrantLabels"
          :key="q.value ?? 'all'"
          class="quadrant-btn"
          :class="{ active: selectedQuadrant === q.value }"
          @click="selectedQuadrant = q.value"
        >
          <span>{{ q.icon }}</span>
          <span>{{ q.label }}</span>
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <span class="loading-text">加载中...</span>
    </div>

    <template v-else>
      <!-- Pending Tasks -->
      <div class="card task-section">
        <h3 class="section-title">待完成 ({{ pendingTasks.length }})</h3>
        <div v-if="pendingTasks.length === 0" class="empty-state" style="padding: 24px">
          <div class="empty-state-icon">🎉</div>
          <div class="empty-state-text">太棒了！所有任务已完成</div>
          <div v-if="searchQuery" class="empty-state-desc">没有匹配搜索条件的任务</div>
        </div>
        <div v-else class="task-list">
          <div
            v-for="task in pendingTasks"
            :key="task.id"
            class="task-item"
          >
            <span
              class="task-check"
              :class="{ checked: task.status === 'done' }"
              @click="toggleTask(task)"
            >{{ task.status === 'done' ? '✅' : '⬜' }}</span>
            <span class="task-title" :class="{ 'task-done': task.status === 'done' }">{{ task.title }}</span>
            <span v-if="task.pointsReward" class="tag tag-points">+{{ task.pointsReward }}分</span>
            <span
              class="tag"
              :class="getPriorityInfo(task).cls"
            >
              {{ getPriorityInfo(task).text }}
            </span>
            <button
              class="btn btn-icon btn-danger btn-sm-delete"
              @click="deleteTask(task.id)"
              title="删除"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>

      <!-- Completed Tasks 按日期分组 -->
      <div class="card task-section" style="margin-top: 12px">
        <h3 class="section-title">已完成 ({{ completedTasks.length }})</h3>
        <div v-if="completedTasks.length === 0" class="empty-state" style="padding: 24px">
          <div class="empty-state-text">还没有已完成的任务</div>
        </div>
        <div v-else class="completed-groups">
          <div v-for="group in completedGroups" :key="group.dateKey" class="completed-group">
            <div class="date-header">
              <span class="date-label">{{ group.label }}</span>
              <span class="date-count">{{ group.tasks.length }} 项</span>
            </div>
            <div class="task-list">
              <div
                v-for="task in group.tasks"
                :key="task.id"
                class="task-item completed"
              >
                <span
                  class="task-check"
                  :class="{ checked: task.status === 'done' }"
                  @click="toggleTask(task)"
                >{{ task.status === 'done' ? '✅' : '⬜' }}</span>
                <span class="task-title" :class="{ 'task-done': task.status === 'done' }">{{ task.title }}</span>
                <span v-if="task.pointsReward" class="tag tag-points">+{{ task.pointsReward }}分</span>
                <span
                  class="tag"
                  :class="getPriorityInfo(task).cls"
                >
                  {{ getPriorityInfo(task).text }}
                </span>
                <span class="task-time">
                  {{ task.completedAt ? new Date(task.completedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '' }}
                </span>
                <button
                  class="btn btn-icon btn-danger btn-sm-delete"
                  @click="deleteTask(task.id)"
                  title="删除"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.task-stats {
  display: flex;
  gap: 8px;
}

.add-task {
  margin-bottom: 16px;
}

.add-task-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.add-task-row .input {
  flex: 1;
}

.quadrant-select {
  width: 130px;
}

.points-input {
  width: 70px;
  text-align: center;
}

/* Filter bar */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-sm);
  padding: 0 10px;
  flex: 1;
  min-width: 180px;
  max-width: 320px;
}

.search-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.search-input {
  border: none !important;
  background: transparent !important;
  padding: 8px 0 !important;
  flex: 1;
}

.search-input:focus {
  box-shadow: none !important;
}

.quadrant-filter {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.quadrant-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition);
}

.quadrant-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.quadrant-btn.active {
  background: var(--accent-bg);
  border-color: var(--accent);
  color: var(--accent);
}

.task-section {
  padding: 20px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-primary);
}

/* Date groups for completed tasks */
.completed-groups {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.completed-group {
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.date-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  font-size: 13px;
}

.date-label {
  font-weight: 600;
  color: var(--text-primary);
}

.date-count {
  color: var(--text-tertiary);
  font-size: 12px;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px;
  border-radius: var(--radius-sm);
  transition: background var(--transition);
}

.task-item:hover {
  background: var(--bg-hover);
}

.task-check {
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  padding: 2px 8px 2px 0;
  user-select: none;
  -webkit-user-select: none;
}

.task-title {
  flex: 1;
  font-size: 14px;
  color: var(--text-primary);
}

.task-done {
  text-decoration: line-through;
  color: var(--text-tertiary);
}

.task-item.completed .task-title {
  text-decoration: line-through;
  color: var(--text-tertiary);
}

.task-time {
  font-size: 12px;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.btn-sm-delete {
  opacity: 0;
  transition: opacity var(--transition);
}

.task-item:hover .btn-sm-delete {
  opacity: 1;
}

@media (max-width: 768px) {
  .add-task-row {
    flex-wrap: wrap;
  }

  .add-task-row .input {
    width: 100%;
  }

  .btn-sm-delete {
    opacity: 1;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    max-width: none;
  }
}

.tag-points {
  font-size: 11px;
  background: #e8f5e9;
  color: #4caf50;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
  margin-right: 4px;
}
</style>
