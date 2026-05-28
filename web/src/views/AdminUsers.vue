<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

interface User {
  id: number
  username: string
  nickname?: string
  role: string
  level: number
  exp: number
  isActive: boolean
  createdAt: string
  _count: { tasks: number; notes: number; diaries: number }
}

const router = useRouter()
const auth = useAuthStore()
const users = ref<User[]>([])
const loading = ref(true)
const error = ref('')
const searchQuery = ref('')
const page = ref(1)
const total = ref(0)
const limit = 20

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

async function fetchUsers() {
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams({ page: String(page.value), limit: String(limit) })
    if (searchQuery.value) params.set('search', searchQuery.value)
    const json = await request('/auth/users?' + params.toString())
    users.value = json.data.users || []
    total.value = json.data.total || 0
  } catch (err: any) {
    error.value = err?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function changeRole(user: User, role: string) {
  try {
    await request(`/auth/users/${user.id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    })
    user.role = role
  } catch (err: any) {
    error.value = err?.message || '修改角色失败'
  }
}

async function toggleActive(user: User) {
  const action = user.isActive ? '禁用' : '启用'
  if (!confirm(`确定要${action}用户「${user.username}」吗？`)) return
  try {
    const json = await request(`/auth/users/${user.id}/toggle-active`, { method: 'PUT' })
    user.isActive = json.data.isActive
  } catch (err: any) {
    error.value = err?.message || '操作失败'
  }
}

function search() {
  page.value = 1
  fetchUsers()
}

const maxPage = computed(() => Math.ceil(total.value / limit))
const roleLabels: Record<string, string> = { admin: '管理员', user: '用户', guest: '访客' }
const roleColors: Record<string, string> = { admin: '#f59e0b', user: '#4caf50', guest: '#9e9e9e' }

onMounted(fetchUsers)
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title" style="margin-bottom:0">👥 用户管理</h1>
      <div class="header-actions">
        <button class="btn btn-sm btn-ghost" @click="router.push('/')">← 返回首页</button>
      </div>
    </div>

    <div v-if="!isAdmin" class="card" style="padding: 24px; text-align: center;">
      <div style="font-size: 40px; margin-bottom: 12px;">🚫</div>
      <div style="font-size: 16px; color: var(--text-secondary);">仅管理员可管理用户</div>
    </div>

    <template v-else>
      <div v-if="error" class="error-message">
        <span>⚠️ {{ error }}</span>
      </div>

      <!-- 搜索 -->
      <div class="search-bar card" style="padding: 12px 16px; margin-bottom: 16px;">
        <div class="search-row" style="display: flex; gap: 8px; align-items: center;">
          <input
            v-model="searchQuery"
            class="input"
            placeholder="搜索用户名..."
            style="flex: 1;"
            @keyup.enter="search"
          />
          <button class="btn btn-primary btn-sm" @click="search">🔍 搜索</button>
          <span style="font-size: 13px; color: var(--text-tertiary);">共 {{ total }} 人</span>
        </div>
      </div>

      <!-- 用户列表 -->
      <div class="card" style="padding: 0; overflow: hidden;">
        <div v-if="loading" class="loading" style="padding: 40px;">
          <div class="spinner"></div>
          <span>加载中...</span>
        </div>

        <div v-else-if="users.length === 0" class="empty-state" style="padding: 40px;">
          <div class="empty-state-icon">👥</div>
          <div class="empty-state-text">暂无用户</div>
        </div>

        <div v-else class="user-table">
          <div class="table-header">
            <span class="col-id">ID</span>
            <span class="col-user">用户</span>
            <span class="col-role">角色</span>
            <span class="col-level">等级</span>
            <span class="col-stats">内容</span>
            <span class="col-status">状态</span>
            <span class="col-time">注册时间</span>
            <span class="col-actions">操作</span>
          </div>
          <div
            v-for="user in users"
            :key="user.id"
            class="table-row"
          >
            <span class="col-id">#{{ user.id }}</span>
            <span class="col-user">
              <span class="user-name">{{ user.nickname || user.username }}</span>
              <span class="user-uname" v-if="user.nickname">@{{ user.username }}</span>
            </span>
            <span class="col-role">
              <select
                class="select select-sm"
                :style="{ color: roleColors[user.role] || '#4caf50' }"
                :value="user.role"
                @change="changeRole(user, ($event.target as HTMLSelectElement).value)"
              >
                <option value="admin">管理员</option>
                <option value="user">用户</option>
                <option value="guest">访客</option>
              </select>
            </span>
            <span class="col-level">Lv.{{ user.level }}</span>
            <span class="col-stats">
              📋{{ user._count.tasks }} 📝{{ user._count.notes }} 📰{{ user._count.diaries }}
            </span>
            <span class="col-status">
              <span :class="user.isActive ? 'status-active' : 'status-inactive'">
                {{ user.isActive ? '正常' : '已禁用' }}
              </span>
            </span>
            <span class="col-time">{{ new Date(user.createdAt).toLocaleDateString('zh-CN') }}</span>
            <span class="col-actions">
              <button
                class="btn btn-sm"
                :class="user.isActive ? 'btn-danger' : 'btn-primary'"
                @click="toggleActive(user)"
              >
                {{ user.isActive ? '禁用' : '启用' }}
              </button>
            </span>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="maxPage > 1" class="pagination">
          <button class="btn btn-sm" :disabled="page <= 1" @click="page--; fetchUsers()">◀</button>
          <span class="page-info">{{ page }} / {{ maxPage }}</span>
          <button class="btn btn-sm" :disabled="page >= maxPage" @click="page++; fetchUsers()">▶</button>
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

.user-table {
  width: 100%;
}

.table-header,
.table-row {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  gap: 8px;
  font-size: 13px;
}

.table-header {
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-primary);
}

.table-row {
  border-bottom: 1px solid var(--border-primary);
  transition: background var(--transition);
}

.table-row:hover {
  background: var(--bg-hover);
}

.table-row:last-child {
  border-bottom: none;
}

.col-id { width: 50px; flex-shrink: 0; color: var(--text-tertiary); }
.col-user { flex: 1; min-width: 0; }
.col-role { width: 100px; flex-shrink: 0; }
.col-level { width: 60px; flex-shrink: 0; text-align: center; }
.col-stats { width: 130px; flex-shrink: 0; font-size: 12px; color: var(--text-secondary); }
.col-status { width: 60px; flex-shrink: 0; text-align: center; }
.col-time { width: 90px; flex-shrink: 0; color: var(--text-tertiary); font-size: 12px; }
.col-actions { width: 70px; flex-shrink: 0; }

.user-name {
  font-weight: 500;
  color: var(--text-primary);
}

.user-uname {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-left: 4px;
}

.select-sm {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
}

.status-active {
  color: var(--success);
  font-size: 12px;
}

.status-inactive {
  color: var(--danger);
  font-size: 12px;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px;
  border-top: 1px solid var(--border-primary);
}

.page-info {
  font-size: 13px;
  color: var(--text-secondary);
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
</style>
