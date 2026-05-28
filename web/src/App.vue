<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Sidebar from '@/components/Sidebar.vue'
import TopBar from '@/components/TopBar.vue'
import GuestModal from '@/components/GuestModal.vue'

const auth = useAuthStore()
const route = useRoute()
const sidebarCollapsed = ref(false)
const mobileOpen = ref(false)
const appReady = ref(false)
const guestModalRef = ref<InstanceType<typeof GuestModal> | null>(null)

const isLoggedIn = computed(() => !!auth.token && !!auth.user)
const isLoginPage = computed(() => route.path === '/login')
const showLayout = computed(() => isLoggedIn.value && !isLoginPage.value)

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

function toggleMobile() {
  mobileOpen.value = !mobileOpen.value
}

function onGuestBlocked(e: Event) {
  const detail = (e as CustomEvent).detail
  guestModalRef.value?.show(detail)
}

onMounted(async () => {
  // 页面加载时自动恢复登录态
  await auth.init()
  appReady.value = true

  // 监听游客权限被拦截事件
  window.addEventListener('guest-blocked', onGuestBlocked)
})

onBeforeUnmount(() => {
  window.removeEventListener('guest-blocked', onGuestBlocked)
})
</script>

<template>
  <div v-if="!appReady" class="loading-screen">
    <div class="spinner"></div>
  </div>
  <div v-else class="app-layout">
    <Sidebar
      v-if="showLayout"
      :collapsed="sidebarCollapsed"
      :mobile-open="mobileOpen"
      @toggle="toggleSidebar"
      @toggle-mobile="toggleMobile"
    />
    <div class="app-main" :class="{ 'with-sidebar': showLayout }" :style="showLayout ? { marginLeft: sidebarCollapsed ? '60px' : 'var(--sidebar-width)' } : {}">
      <TopBar v-if="showLayout" :sidebar-left="sidebarCollapsed ? '60px' : 'var(--sidebar-width)'" @toggle-sidebar="toggleSidebar" @toggle-mobile="toggleMobile" />
      <div class="app-content" :class="{ 'with-topbar': showLayout }">
        <router-view />
      </div>
    </div>
    <GuestModal ref="guestModalRef" />
  </div>
</template>

<style scoped>
.loading-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: var(--bg-primary);
}

.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.app-main.with-sidebar {
  transition: margin-left var(--transition);
}

.app-content {
  flex: 1;
  overflow: auto;
}

.app-content.with-topbar {
  padding-top: var(--topbar-height);
}

@media (max-width: 768px) {
  .app-main.with-sidebar {
    margin-left: 0;
  }
}
</style>
