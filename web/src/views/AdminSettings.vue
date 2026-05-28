<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

interface User {
  id: number
  username: string
  nickname?: string
  role: string
}

const router = useRouter()
const auth = useAuthStore()
const loading = ref(true)
const error = ref('')
const successMsg = ref('')
const guestUserId = ref(2)
const users = ref<User[]>([])
const selectedUserId = ref(2)

const isAdmin = computed(() => auth.user?.role === 'admin')

async function request(path: string, options?: RequestInit) {
  const token = localStorage.getItem('learnhub_token')
  const res = await fetch('/api' + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options?.headers,
    },
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.message || '请求失败')
  return json
}

async function loadSettings() {
  loading.value = true
  error.value = ''
  try {
    // 加载系统设置
    const json = await request('/settings')
    const settings = json.data || {}
    guestUserId.value = parseInt(settings.guest_demo_user_id) || 2

    // 加载用户列表（包括 admin，因为演示账号可能是 admin）
    const usersJson = await request('/auth/users')
    users.value = usersJson.data?.users || []

    // 默认选中当前设置
    selectedUserId.value = guestUserId.value
  } catch (err: any) {
    error.value = err?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function saveGuestDemo() {
  successMsg.value = ''
  error.value = ''
  try {
    const json = await request('/settings/guest-demo', {
      method: 'POST',
      body: JSON.stringify({ userId: selectedUserId.value }),
    })
    guestUserId.value = selectedUserId.value
    successMsg.value = json.message || '设置已保存'
  } catch (err: any) {
    error.value = err?.message || '保存失败'
  }
}

const selectedUser = computed(() => users.value.find(u => u.id === selectedUserId.value))

onMounted(loadSettings)
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title" style="margin-bottom:0">⚙️ 系统设置</h1>
      <div class="header-actions">
        <button class="btn btn-sm btn-ghost" @click="router.push('/')">← 返回首页</button>
      </div>
    </div>

    <div v-if="!isAdmin" class="card" style="padding: 24px; text-align: center;">
      <div style="font-size: 40px; margin-bottom: 12px;">🚫</div>
      <div style="font-size: 16px; color: var(--text-secondary);">仅管理员可管理系统设置</div>
    </div>

    <template v-else>
      <div v-if="error" class="error-message">
        <span>⚠️ {{ error }}</span>
      </div>
      <div v-if="successMsg" class="success-message">
        <span>✅ {{ successMsg }}</span>
      </div>

      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <span>加载中...</span>
      </div>

      <div v-else class="card" style="padding: 20px;">
        <h3 class="section-title">👤 游客演示账号</h3>
        <p class="setting-desc">
          设置后，未登录游客和<strong>访客角色</strong>的用户在浏览时将看到该账号的数据。
          目前设置：<strong>{{ users.find(u => u.id === guestUserId)?.nickname || users.find(u => u.id === guestUserId)?.username || '无' }}</strong>
        </p>

        <div class="setting-form">
          <div class="form-row">
            <label class="form-label">选择演示账号：</label>
            <select v-model="selectedUserId" class="select" style="flex: 1;">
              <option v-for="u in users" :key="u.id" :value="u.id">
                {{ u.nickname || u.username }} (#{{ u.id }})
              </option>
            </select>
          </div>
          <div v-if="selectedUser" class="selected-info">
            <span>选择后，游客将看到 <strong>{{ selectedUser.nickname || selectedUser.username }}</strong> 的打卡、番茄钟、待办等数据</span>
          </div>
          <button class="btn btn-primary" @click="saveGuestDemo" style="margin-top: 12px;">
            💾 保存设置
          </button>
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

.header-actions {
  display: flex;
  gap: 8px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 8px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-primary);
}

.setting-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 16px;
}

.setting-form {
  max-width: 500px;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.form-label {
  font-size: 14px;
  color: var(--text-primary);
  white-space: nowrap;
}

.selected-info {
  font-size: 12px;
  color: var(--text-tertiary);
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  margin-top: 8px;
}

.success-message {
  background: var(--success-bg);
  color: var(--success);
  padding: 10px 16px;
  border-radius: var(--radius-md);
  font-size: 14px;
  margin-bottom: 16px;
}
</style>
