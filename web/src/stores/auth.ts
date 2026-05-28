import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api'
import type { AxiosError } from 'axios'

export interface User {
  id: number
  username: string
  nickname?: string
  avatar?: string
  level?: number
  exp?: number
  maxExp?: number
  role?: string
}

// ====== Token 持久化工具 ======
function getToken(): string | null {
  const t = localStorage.getItem('learnhub_token')
  if (t && t !== 'undefined' && t !== 'null') return t
  try {
    const match = document.cookie.match(/(?:^|;\s*)learnhub_token=([^;]*)/)
    if (match) {
      const val = decodeURIComponent(match[1])
      if (val && val !== 'undefined' && val !== 'null') return val
    }
  } catch(e) {}
  return null
}

function setToken(token: string | null | undefined) {
  if (!token || token === 'undefined' || token === 'null') return
  localStorage.setItem('learnhub_token', token)
  try {
    document.cookie = `learnhub_token=${encodeURIComponent(token)}; path=/; max-age=2592000; SameSite=Lax`
  } catch(e) {}
}

function clearToken() {
  localStorage.removeItem('learnhub_token')
  localStorage.removeItem('learnhub_user')
  document.cookie = 'learnhub_token=; path=/; max-age=0'
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null)
  const user = ref<User | null>(null)
  const loading = ref(false)
  const initialized = ref(false)

  // 从 localStorage 恢复用户基本信息（不需要调 API）
  function restoreUserFromCache() {
    try {
      const cached = localStorage.getItem('learnhub_user')
      if (cached) {
        user.value = JSON.parse(cached)
      }
    } catch(e) {}
  }

  async function init() {
    const savedToken = getToken()
    if (savedToken) {
      token.value = savedToken
      restoreUserFromCache()
      loading.value = true
      try {
        const res = await authApi.me()
        const respData = res.data.data || res.data
        user.value = respData.user || respData
        localStorage.setItem('learnhub_user', JSON.stringify(user.value))
      } catch {
        // token 无效，清除
        token.value = null
        clearToken()
      }
      loading.value = false
    }
    initialized.value = true
  }

  async function login(username: string, password: string) {
    const res = await authApi.login({ username, password })
    // res.data = { success, data: { token, user } } (axios 自动解包)
    const respData = res.data.data || res.data
    setToken(respData.token)
    token.value = respData.token
    user.value = respData.user || null
    localStorage.setItem('learnhub_user', JSON.stringify(user.value))
    return respData
  }

  async function register(username: string, password: string, nickname?: string, inviteCode?: string) {
    const res = await authApi.register({ username, password, nickname, inviteCode: inviteCode || '' })
    const respData = res.data.data || res.data
    setToken(respData.token)
    token.value = respData.token
    user.value = respData.user || null
    localStorage.setItem('learnhub_user', JSON.stringify(user.value))
    return respData
  }

  const isGuest = computed(() => user.value?.role === 'guest')

  function logout() {
    token.value = null
    user.value = null
    clearToken()
  }

  function getApiError(error: unknown): string {
    const axiosError = error as AxiosError<{ message?: string; error?: string }>
    return (
      axiosError?.response?.data?.message ||
      axiosError?.response?.data?.error ||
      axiosError?.message ||
      '操作失败，请重试'
    )
  }

  return {
    token,
    user,
    loading,
    initialized,
    init,
    login,
    register,
    logout,
    getApiError,
    isGuest,
  }
})
