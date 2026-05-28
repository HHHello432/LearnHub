<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  collapsed: boolean
  mobileOpen?: boolean
}>()

const emit = defineEmits<{
  toggle: []
  'toggle-mobile': []
}>()

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const navItems = [
  { path: '/', label: '首页', icon: '📊' },
  { path: '/pomodoro', label: '番茄钟', icon: '⏱️' },
  { path: '/tasks', label: '待办', icon: '📋' },
  { path: '/notes', label: '笔记', icon: '📝' },
  { path: '/diaries', label: '日记', icon: '📰' },
  { path: '/checkins', label: '打卡', icon: '✅' },
  { path: '/shop', label: '商城', icon: '🛒' },
  { path: '/profile', label: '个人中心', icon: '👤' },
]

const isActive = (path: string) => {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

function goTo(path: string) {
  router.push(path)
}

function handleNavClick(path: string) {
  goTo(path)
  emit('toggle-mobile')
}

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <div v-if="mobileOpen" class="sidebar-overlay" @click="emit('toggle-mobile')"></div>
  <aside class="sidebar" :class="{ collapsed, 'mobile-open': mobileOpen }">
    <div class="sidebar-header">
      <!-- 收缩时：点三横（☰）展开；展开时：显示logo文字 + 叉（✕）收起 -->
      <template v-if="collapsed">
        <button class="expand-btn" @click="emit('toggle')" title="展开侧边栏">
          <span class="expand-icon">☰</span>
        </button>
      </template>
      <template v-else>
        <div class="logo" @click="handleNavClick('/')">
          <span class="logo-icon">📚</span>
          <span class="logo-text">LearnHub</span>
        </div>
        <button class="collapse-btn" @click="emit('toggle')" title="收起侧边栏">
          ✕
        </button>
      </template>
    </div>

    <nav class="sidebar-nav">
      <button
        v-for="item in navItems"
        :key="item.path"
        class="nav-item"
        :class="{ active: isActive(item.path) }"
        @click="handleNavClick(item.path)"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span class="nav-label">{{ item.label }}</span>
      </button>
    </nav>

    <!-- 管理员区域 -->
    <div v-if="auth.user?.role === 'admin'" class="admin-section">
      <div class="admin-label">管</div>
      <button
        class="nav-item"
        :class="{ active: isActive('/admin/shop') }"
        @click="handleNavClick('/admin/shop')"
      >
        <span class="nav-icon">⚙️</span>
        <span class="nav-label">商品管理</span>
      </button>
      <button
        class="nav-item"
        :class="{ active: isActive('/admin/users') }"
        @click="handleNavClick('/admin/users')"
      >
        <span class="nav-icon">👥</span>
        <span class="nav-label">用户管理</span>
      </button>
      <button
        class="nav-item"
        :class="{ active: isActive('/admin/settings') }"
        @click="handleNavClick('/admin/settings')"
      >
        <span class="nav-icon">⚙️</span>
        <span class="nav-label">系统设置</span>
      </button>
      <button
        class="nav-item"
        :class="{ active: isActive('/admin/invite-codes') }"
        @click="handleNavClick('/admin/invite-codes')"
      >
        <span class="nav-icon">📨</span>
        <span class="nav-label">邀请码</span>
      </button>
    </div>

    <div class="sidebar-footer">
      <div class="user-info" @click="handleNavClick('/profile')">
        <div class="user-avatar">
          {{ auth.user?.nickname?.[0] || auth.user?.username?.[0] || 'U' }}
        </div>
        <div class="user-details">
          <div class="user-name">{{ auth.user?.nickname || auth.user?.username }}</div>
          <div class="user-level" v-if="!auth.isGuest">Lv.{{ auth.user?.level || 1 }}</div>
          <span v-if="auth.isGuest" class="guest-badge">👤 游客</span>
        </div>
      </div>
      <button class="logout-btn" @click="handleLogout" title="退出登录">
        <span>🚪</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: var(--sidebar-width);
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-primary);
  display: flex;
  flex-direction: column;
  z-index: 100;
  transition: width var(--transition);
}

.sidebar.collapsed {
  width: 60px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--border-primary);
}

/* 收缩时：展开按钮占满 header，居中显示 ☰ */
.expand-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  width: 100%;
  display: flex;
  justify-content: center;
  transition: color var(--transition);
}

.expand-btn:hover {
  color: var(--text-primary);
}

.expand-icon {
  display: inline-block;
}

/* 展开时：logo + 收起按钮 */
.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.logo-icon {
  font-size: 22px;
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.collapse-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 16px;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: var(--radius-sm);
  transition: color var(--transition);
}

.collapse-btn:hover {
  color: var(--text-primary);
}

.sidebar-nav {
  flex: 1;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all var(--transition);
  text-align: left;
  width: 100%;
  white-space: nowrap;
}

.nav-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.nav-item.active {
  background: var(--accent-bg);
  color: var(--accent);
}

.nav-icon {
  font-size: 18px;
  flex-shrink: 0;
  width: 24px;
  text-align: center;
}

.sidebar.collapsed .nav-label {
  display: none;
}

.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: 10px 0;
}

.admin-section {
  padding: 8px 12px;
  border-top: 1px solid var(--border-primary);
}

.admin-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 4px 8px;
  margin-bottom: 4px;
}

.sidebar-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid var(--border-primary);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  flex: 1;
  min-width: 0;
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent-bg);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.user-details {
  min-width: 0;
}

.user-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-level {
  font-size: 11px;
  color: var(--text-tertiary);
}

.guest-badge {
  display: inline-block;
  background: #30363d;
  color: var(--text-secondary);
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 10px;
  line-height: 1.5;
  user-select: none;
}

.sidebar.collapsed .user-details {
  display: none;
}

.logout-btn {
  background: none;
  border: none;
  color: var(--text-tertiary);
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  transition: color var(--transition);
  flex-shrink: 0;
}

.logout-btn:hover {
  color: var(--danger);
}

/* Mobile overlay */
.sidebar-overlay {
  display: none;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: var(--sidebar-width);
    z-index: 1000;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }

  .sidebar.mobile-open {
    transform: translateX(0);
  }

  .sidebar-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
  }

  .sidebar.collapsed .nav-label {
    display: inline;
  }

  .sidebar.collapsed .nav-item {
    justify-content: flex-start;
    padding: 10px 12px;
  }

  .sidebar.collapsed .user-details {
    display: block;
  }
}
</style>
