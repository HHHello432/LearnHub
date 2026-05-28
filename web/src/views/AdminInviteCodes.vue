<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { inviteApi } from '@/api'

// 直接用 fetch 调 API
const BASE = ''

interface InviteCode {
  id: number
  code: string
  role: string
  maxUses: number
  usedCount: number
  isActive: boolean
  createdAt: string
}

const router = useRouter()
const auth = useAuthStore()
const codes = ref<InviteCode[]>([])
const loading = ref(true)
const error = ref('')
const generateCode = ref('')
const generateRole = ref('user')
const generateMaxUses = ref(1)
const generating = ref(false)
const isAdmin = computed(() => auth.user?.role === 'admin')

async function request(path: string, options?: RequestInit) {
  const token = localStorage.getItem('learnhub_token')
  const res = await fetch(BASE + '/api' + path, {
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

async function fetchCodes() {
  loading.value = true
  error.value = ''
  try {
    const json = await request('/invite-codes')
    const data = json.data || []
    codes.value = Array.isArray(data) ? data : []
  } catch (err: any) {
    error.value = err?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function generateNewCode() {
  if (generating.value) return
  generating.value = true
  try {
    await request('/invite-codes', {
      method: 'POST',
      body: JSON.stringify({
        code: generateCode.value || undefined,
        role: generateRole.value,
        maxUses: generateMaxUses.value,
      }),
    })
    generateCode.value = ''
    await fetchCodes()
    error.value = ''
  } catch (err: any) {
    error.value = err?.message || '创建失败'
  } finally {
    generating.value = false
  }
}

async function deleteCode(id: number) {
  if (!confirm('确定要删除该邀请码吗？')) return
  try {
    await request(`/invite-codes/${id}`, { method: 'DELETE' })
    await fetchCodes()
  } catch (err: any) {
    error.value = err?.message || '删除失败'
  }
}

onMounted(fetchCodes)
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title" style="margin-bottom:0">📨 邀请码管理</h1>
      <div class="header-actions">
        <button class="btn btn-sm btn-ghost" @click="router.push('/')">← 返回首页</button>
      </div>
    </div>

    <div v-if="!isAdmin" class="card" style="padding: 24px; text-align: center;">
      <div style="font-size: 40px; margin-bottom: 12px;">🚫</div>
      <div style="font-size: 16px; color: var(--text-secondary);">仅管理员可管理邀请码</div>
    </div>

    <template v-else>
      <div v-if="error" class="error-message">
        <span>⚠️ {{ error }}</span>
      </div>

      <!-- 生成邀请码 -->
      <div class="card" style="margin-bottom: 16px; padding: 20px;">
        <h3 class="section-title">生成邀请码</h3>
        <div class="generate-row">
          <input
            v-model="generateCode"
            class="input"
            placeholder="自定义邀请码（留空自动生成）"
            style="flex: 1;"
          />
          <select v-model="generateRole" class="select" style="width: 120px;">
            <option value="user">用户</option>
            <option value="guest">访客</option>
          </select>
          <input
            v-model.number="generateMaxUses"
            type="number"
            class="input"
            placeholder="可用次数"
            min="1"
            style="width: 80px;"
          />
          <button class="btn btn-primary" :disabled="generating" @click="generateNewCode">
            {{ generating ? '生成中...' : '生成' }}
          </button>
        </div>
        <div class="generate-hint">
          <span>角色说明：<strong>用户</strong> - 可正常使用所有功能 | <strong>访客</strong> - 浏览权限受限</span>
        </div>
      </div>

      <!-- 邀请码列表 -->
      <div class="card" style="padding: 20px;">
        <h3 class="section-title">已有邀请码</h3>

        <div v-if="loading" class="loading">
          <div class="spinner"></div>
          <span>加载中...</span>
        </div>

        <div v-else-if="codes.length === 0" class="empty-state" style="padding: 24px;">
          <div class="empty-state-icon">📨</div>
          <div class="empty-state-text">暂无邀请码</div>
          <div class="empty-state-desc">在上方生成第一个邀请码</div>
        </div>

        <div v-else class="code-list">
          <div
            v-for="code in codes"
            :key="code.id"
            class="code-item"
          >
            <div class="code-info">
              <div class="code-value">{{ code.code }}</div>
              <div class="code-meta">
                <span class="code-role" :class="code.role">{{ code.role === 'user' ? '用户' : '访客' }}</span>
                <span class="code-uses">使用 {{ code.usedCount }}/{{ code.maxUses }} 次</span>
                <span class="code-status" :class="{ active: code.isActive, inactive: !code.isActive }">
                  {{ code.isActive ? '有效' : '已停用' }}
                </span>
              </div>
            </div>
            <button class="btn btn-icon btn-danger" @click="deleteCode(code.id)" title="删除">
              🗑️
            </button>
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

.header-actions {
  display: flex;
  gap: 8px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-primary);
}

.generate-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.generate-hint {
  margin-top: 10px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.code-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.code-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
}

.code-value {
  font-size: 18px;
  font-weight: 700;
  font-family: monospace;
  letter-spacing: 2px;
  color: var(--accent);
  margin-bottom: 4px;
}

.code-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--text-secondary);
}

.code-role {
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.code-role.user {
  background: var(--accent-bg);
  color: var(--accent);
}

.code-role.guest {
  background: var(--warning-bg);
  color: var(--warning);
}

.code-status.active {
  color: var(--success);
}

.code-status.inactive {
  color: var(--danger);
}

.empty-state {
  text-align: center;
}

.empty-state-icon {
  font-size: 40px;
  margin-bottom: 8px;
}

.empty-state-text {
  font-size: 15px;
  color: var(--text-primary);
  font-weight: 500;
}

.empty-state-desc {
  font-size: 13px;
  color: var(--text-tertiary);
  margin-top: 4px;
}
</style>
