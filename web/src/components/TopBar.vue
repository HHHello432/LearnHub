<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

defineProps<{
  sidebarLeft?: string
}>()

const emit = defineEmits<{
  toggleSidebar: []
  'toggle-mobile': []
}>()

const route = useRoute()
const auth = useAuthStore()

const pageTitle = computed(() => (route.meta?.title as string) || 'LearnHub')
const notificationCount = computed(() => 0)

const userInitial = computed(() => {
  return auth.user?.nickname?.[0] || auth.user?.username?.[0] || 'U'
})
</script>

<template>
  <header class="topbar" :style="{ left: sidebarLeft || 'var(--sidebar-width)' }">
    <div class="topbar-left">
      <button class="menu-btn" @click="emit('toggleSidebar'); emit('toggle-mobile')">
        ☰
      </button>
      <h1 class="topbar-title">{{ pageTitle }}</h1>
    </div>
    <div class="topbar-right">
      <button class="notification-btn" title="通知">
        <span class="bell">🔔</span>
        <span v-if="notificationCount > 0" class="notification-badge">
          {{ notificationCount > 99 ? '99+' : notificationCount }}
        </span>
      </button>
      <span v-if="auth.isGuest" class="guest-badge">👤 游客</span>
      <div class="user-avatar" :title="auth.user?.nickname || auth.user?.username">
        {{ userInitial }}
      </div>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  position: fixed;
  top: 0;
  right: 0;
  height: var(--topbar-height);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  z-index: 50;
  transition: left var(--transition);
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.menu-btn {
  display: none;
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
}

.topbar-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.notification-btn {
  position: relative;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  transition: background var(--transition);
}

.notification-btn:hover {
  background: var(--bg-hover);
}

.bell {
  font-size: 18px;
}

.notification-badge {
  position: absolute;
  top: -2px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  background: var(--danger);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--accent-bg);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity var(--transition);
}

.user-avatar:hover {
  opacity: 0.8;
}

.guest-badge {
  background: #30363d;
  color: var(--text-secondary);
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  line-height: 1.4;
  user-select: none;
}

@media (max-width: 768px) {
  .topbar {
    left: 0 !important;
  }

  .menu-btn {
    display: block;
  }
}
</style>
