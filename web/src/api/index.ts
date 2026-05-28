import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { Router } from 'vue-router'

let _router: Router | null = null

export function setRouter(router: Router) {
  _router = router
}

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('learnhub_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      if (_router) _router.push('/login')
    }
    // 403 — 游客账户无权限，触发全局提示弹窗
    if (error.response?.status === 403) {
      const data = error.response.data as { message?: string }
      if (String(data?.message).includes('游客')) {
        window.dispatchEvent(new CustomEvent('guest-blocked', {
          detail: data?.message || ''
        }))
      }
    }
    return Promise.reject(error)
  }
)

// ============ Auth ============
export const authApi = {
  login(data: { username: string; password: string }) {
    return api.post('/auth/login', data)
  },
  register(data: { username: string; password: string; nickname?: string; inviteCode: string }) {
    return api.post('/auth/register', data)
  },
  me() {
    return api.get('/auth/me')
  },
}

// ============ Invite Codes ============
export const inviteApi = {
  verify(code: string) {
    return api.get(`/invite-codes/verify/${code}`)
  }
}

// ============ Tasks ============
export const tasksApi = {
  getAll(params?: { status?: string }) {
    return api.get('/tasks', { params })
  },
  create(data: { title: string; description?: string; priority?: string; category?: string; pointsReward?: number }) {
    return api.post('/tasks', data)
  },
  update(id: number, data: any) {
    return api.put(`/tasks/${id}`, data)
  },
  delete(id: number) {
    return api.delete(`/tasks/${id}`)
  },
  getStats() {
    return api.get('/tasks/stats')
  },
}

// ============ Pomodoro ============
export const pomodoroApi = {
  getAll() {
    return api.get('/pomodoro')
  },
  create(data: { durationPlanned: number; durationActual?: number; type: string; status: string; startedAt?: string; endedAt?: string }) {
    return api.post('/pomodoro', data)
  },
  getStats() {
    return api.get('/pomodoro/stats')
  },
  getHistory(params?: { year?: number; month?: number }) {
    return api.get('/pomodoro/history', { params })
  },
}

// ============ Notes ============
export const notesApi = {
  getAll(params?: { search?: string }) {
    return api.get('/notes', { params })
  },
  getById(id: number) {
    return api.get(`/notes/${id}`)
  },
  create(data: { title: string; content: string; isPublic?: boolean }) {
    return api.post('/notes', data)
  },
  update(id: number, data: any) {
    return api.put(`/notes/${id}`, data)
  },
  delete(id: number) {
    return api.delete(`/notes/${id}`)
  },
}

// ============ Diaries ============
export const diariesApi = {
  getAll(params?: { page?: number; limit?: number }) {
    return api.get('/diaries', { params })
  },
  create(data: { title: string; content: string; mood?: string; weather?: string; isPublic?: boolean }) {
    return api.post('/diaries', data)
  },
  update(id: number, data: any) {
    return api.put(`/diaries/${id}`, data)
  },
  delete(id: number) {
    return api.delete(`/diaries/${id}`)
  },
}

// ============ Checkins ============
export const checkinsApi = {
  getAll(params?: { month?: string }) {
    return api.get('/checkins', { params })
  },
  create(data: { date: string; habitName: string; points?: number }) {
    return api.post('/checkins', data)
  },
  getStats() {
    return api.get('/checkins/stats')
  },
  delete(habitName: string) {
    return api.delete(`/checkins/${habitName}`)
  },
  deleteRecord(id: number) {
    return api.delete(`/checkins/record/${id}`)
  },
}

// ============ Rewards (积分/等级) ============
export const rewardsApi = {
  getPoints() {
    return api.get('/rewards/points')
  },
  getMe() {
    return api.get('/rewards/me')
  },
  getAchievements() {
    return api.get('/rewards/achievements')
  },
  exchange(data: { points: number; itemId: number }) {
    return api.post('/rewards/exchange', data)
  },
}

// ============ Shop ============
export const shopApi = {
  getItems() {
    return api.get('/shop/items')
  },
  getAllItems() {
    return api.get('/shop/items?all=true')
  },
  buy(data: { itemId: number }) {
    return api.post('/shop/buy', data)
  },
  getOrders() {
    return api.get('/shop/orders')
  },
  addItem(data: { name: string; description?: string; price: number; stock?: number; image?: string }) {
    return api.post('/shop/items', data)
  },
  updateItem(id: number, data: any) {
    return api.put(`/shop/items/${id}`, data)
  },
  deleteItem(id: number) {
    return api.delete(`/shop/items/${id}`)
  },
  getPointsRules() {
    return api.get('/shop/points-rules')
  },
}

// ============ Notifications ============
export const notificationsApi = {
  getAll() {
    return api.get('/notifications')
  },
  markRead(id: number) {
    return api.put(`/notifications/${id}/read`)
  },
  getUnreadCount() {
    return api.get('/notifications/unread-count')
  },
}

export default api
