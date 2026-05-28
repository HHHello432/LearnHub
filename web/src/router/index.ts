import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { setRouter } from '@/api'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { requiresAuth: true, title: '📊 首页' },
  },
  {
    path: '/pomodoro',
    name: 'Pomodoro',
    component: () => import('@/views/Pomodoro.vue'),
    meta: { requiresAuth: true, title: '⏱️ 番茄钟' },
  },
  {
    path: '/tasks',
    name: 'Tasks',
    component: () => import('@/views/Tasks.vue'),
    meta: { requiresAuth: true, title: '📋 待办' },
  },
  {
    path: '/notes',
    name: 'Notes',
    component: () => import('@/views/Notes.vue'),
    meta: { requiresAuth: true, title: '📝 笔记' },
  },
  {
    path: '/diaries',
    name: 'Diaries',
    component: () => import('@/views/Diaries.vue'),
    meta: { requiresAuth: true, title: '📰 日记' },
  },
  {
    path: '/checkins',
    name: 'Checkins',
    component: () => import('@/views/Checkins.vue'),
    meta: { requiresAuth: true, title: '✅ 打卡' },
  },
  {
    path: '/shop',
    name: 'Shop',
    component: () => import('@/views/Shop.vue'),
    meta: { requiresAuth: true, title: '🛒 商城' },
  },
  {
    path: '/admin/shop',
    name: 'AdminShop',
    component: () => import('@/views/AdminShop.vue'),
    meta: { requiresAuth: true, title: '⚙️ 商品管理' },
  },
  {
    path: '/admin/settings',
    name: 'AdminSettings',
    component: () => import('@/views/AdminSettings.vue'),
    meta: { requiresAuth: true, title: '⚙️ 系统设置' },
  },
  {
    path: '/admin/users',
    name: 'AdminUsers',
    component: () => import('@/views/AdminUsers.vue'),
    meta: { requiresAuth: true, title: '👥 用户管理' },
  },
  {
    path: '/admin/invite-codes',
    name: 'AdminInviteCodes',
    component: () => import('@/views/AdminInviteCodes.vue'),
    meta: { requiresAuth: true, title: '📨 邀请码管理' },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/Profile.vue'),
    meta: { requiresAuth: true, title: '👤 个人中心' },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  // 直接从 localStorage 读 token，不受 Pinia 初始化时序影响
  const token = localStorage.getItem('learnhub_token')
  const requiresAuth = to.meta.requiresAuth !== false

  if (requiresAuth && !token) {
    next('/login')
  } else if (to.path === '/login' && token) {
    next('/')
  } else {
    next()
  }
})

setRouter(router)

export default router
