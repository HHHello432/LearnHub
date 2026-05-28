<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { diariesApi } from '@/api'

interface Diary {
  id: number
  title: string
  content: string
  mood?: string
  weather?: string
  isPublic?: boolean
  createdAt: string
}

const moods = ['😊', '😢', '😡', '😌', '🥰', '🤔', '😴', '🔥']
const weathers = ['☀️', '🌤️', '☁️', '🌧️', '❄️', '🌪️', '🌈']

const diaries = ref<Diary[]>([])
const loading = ref(true)
const error = ref('')
const showModal = ref(false)
const submitting = ref(false)
const editingDiaryId = ref<number | null>(null)

// Form
const formTitle = ref('')
const formContent = ref('')
const formMood = ref('😊')
const formWeather = ref('☀️')
const formIsPublic = ref(false)

async function fetchDiaries() {
  loading.value = true
  error.value = ''
  try {
    const res = await diariesApi.getAll()
    const d = res.data || {}
    // 兼容两种返回格式：{ data: [...] } 或 { data: { diaries: [...] } }
    if (Array.isArray(d)) {
      diaries.value = d
    } else if (Array.isArray(d.diaries)) {
      diaries.value = d.diaries
    } else if (Array.isArray(d.data)) {
      diaries.value = d.data
    } else {
      diaries.value = []
    }
  } catch (err: any) {
    error.value = err?.response?.data?.message || err?.message || '加载日记失败'
  } finally {
    loading.value = false
  }
}

function openNewDiary() {
  editingDiaryId.value = null
  formTitle.value = ''
  formContent.value = ''
  formMood.value = '😊'
  formWeather.value = '☀️'
  formIsPublic.value = false
  showModal.value = true
}

function editDiary(diary: Diary) {
  editingDiaryId.value = diary.id
  formTitle.value = diary.title
  formContent.value = diary.content || ''
  formMood.value = diary.mood || ''
  formWeather.value = diary.weather || ''
  formIsPublic.value = diary.isPublic || false
  showModal.value = true
}

function closeForm() {
  showModal.value = false
  editingDiaryId.value = null
  formTitle.value = ''
  formContent.value = ''
  formMood.value = ''
  formWeather.value = ''
  formIsPublic.value = false
}

async function submitDiary() {
  if (!formTitle.value.trim() || submitting.value) return

  submitting.value = true
  try {
    const data = {
      title: formTitle.value.trim(),
      content: formContent.value.trim(),
      mood: formMood.value,
      weather: formWeather.value,
      isPublic: formIsPublic.value,
    }
    if (editingDiaryId.value) {
      await diariesApi.update(editingDiaryId.value, data)
    } else {
      await diariesApi.create(data)
    }
    closeForm()
    await fetchDiaries()
  } catch (err: any) {
    error.value = err?.response?.data?.message || '保存日记失败'
  } finally {
    submitting.value = false
  }
}

async function deleteDiary(id: number) {
  if (!confirm('确定删除这篇日记吗？')) return
  try {
    await diariesApi.delete(id)
    diaries.value = diaries.value.filter((d) => d.id !== id)
  } catch (err: any) {
    error.value = err?.response?.data?.message || '删除日记失败'
  }
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()

  if (isToday) return '今天'
  if (isYesterday) return '昨天'
  return d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
}

onMounted(fetchDiaries)
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title" style="margin-bottom: 0">📰 日记</h1>
      <button class="btn btn-primary" @click="openNewDiary">
        ✏️ 写日记
      </button>
    </div>

    <div v-if="error" class="error-message">
      <span>⚠️ {{ error }}</span>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <span class="loading-text">加载中...</span>
    </div>

    <div
      v-else-if="diaries.length === 0"
      class="card empty-state"
      style="margin-top: 16px"
    >
      <div class="empty-state-icon">📰</div>
      <div class="empty-state-text">还没有日记</div>
      <div class="empty-state-desc">点击「写日记」记录你的生活</div>
    </div>

    <!-- Timeline -->
    <div v-else class="timeline">
      <div
        v-for="diary in diaries"
        :key="diary.id"
        class="timeline-item"
      >
        <div class="timeline-dot"></div>
        <div class="timeline-date">{{ formatDate(diary.createdAt) }}</div>
        <div class="card diary-card">
          <div class="diary-header">
            <div class="diary-mood-weather">
              <span v-if="diary.mood" :title="'心情: ' + diary.mood">{{ diary.mood }}</span>
              <span v-if="diary.weather" :title="'天气: ' + diary.weather">{{ diary.weather }}</span>
            </div>
            <div class="diary-actions">
              <button class="btn btn-sm btn-secondary" @click="editDiary(diary)">✏️ 编辑</button>
              <button
                class="btn btn-icon"
                style="color: var(--text-tertiary); font-size: 14px;"
                @click="deleteDiary(diary.id)"
                title="删除"
              >
                🗑️
              </button>
            </div>
          </div>
          <h3 class="diary-title">{{ diary.title }}</h3>
          <p class="diary-excerpt">
            {{ diary.content?.substring(0, 120) }}{{ diary.content?.length > 120 ? '...' : '' }}
          </p>
          <div class="diary-footer">
            <span class="diary-time">
              {{ new Date(diary.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}
            </span>
            <span v-if="diary.isPublic" class="badge badge-accent">公开</span>
          </div>
        </div>
      </div>
    </div>

    <!-- New Diary Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeForm()">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">{{ editingDiaryId ? '✏️ 编辑日记' : '✏️ 写日记' }}</h2>
          <button class="modal-close" @click="closeForm()">✕</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">标题</label>
            <input
              v-model="formTitle"
              class="input"
              placeholder="日记标题"
            />
          </div>

          <div class="form-group">
            <label class="form-label">内容</label>
            <textarea
              v-model="formContent"
              class="textarea"
              placeholder="写下你的想法..."
              rows="6"
            ></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">心情</label>
              <div class="option-buttons">
                <button
                  v-for="m in moods"
                  :key="m"
                  class="option-btn"
                  :class="{ active: formMood === m }"
                  @click="formMood = m"
                >
                  {{ m }}
                </button>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">天气</label>
              <div class="option-buttons">
                <button
                  v-for="w in weathers"
                  :key="w"
                  class="option-btn"
                  :class="{ active: formWeather === w }"
                  @click="formWeather = w"
                >
                  {{ w }}
                </button>
              </div>
            </div>
          </div>

          <div class="form-group" style="margin-top: 12px">
            <label class="public-toggle">
              <input type="checkbox" v-model="formIsPublic" />
              <span>公开日记</span>
            </label>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeForm()">取消</button>
          <button
            class="btn btn-primary"
            :disabled="!formTitle.trim() || !formContent.trim() || submitting"
            @click="submitDiary"
          >
            {{ submitting ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.timeline {
  position: relative;
  padding-left: 28px;
  margin-top: 20px;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--border-primary);
}

.timeline-item {
  position: relative;
  margin-bottom: 20px;
}

.timeline-dot {
  position: absolute;
  left: -24px;
  top: 20px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent);
  border: 2px solid var(--bg-primary);
  z-index: 1;
}

.timeline-date {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.diary-card {
  padding: 20px;
}

.diary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.diary-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.diary-mood-weather {
  display: flex;
  gap: 8px;
  font-size: 20px;
}

.diary-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.diary-excerpt {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 12px;
}

.diary-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.diary-time {
  font-size: 12px;
  color: var(--text-tertiary);
}

/* Form */
.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.option-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.option-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition);
}

.option-btn:hover {
  background: var(--bg-hover);
}

.option-btn.active {
  background: var(--accent-bg);
  border-color: var(--accent);
}

.public-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .timeline {
    padding-left: 20px;
  }

  .diary-card {
    padding: 14px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>
