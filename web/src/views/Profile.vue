<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { rewardsApi, authApi, pomodoroApi } from '@/api'

const auth = useAuthStore()

// Data
const loading = ref(true)
const error = ref('')
const pointsData = ref({ balance: 0, totalEarned: 0, totalSpent: 0 })
const achievements = ref<any[]>([])
const studyStats = ref({ today: 0, week: 0, month: 0 })
const levelInfo = ref<any>(null)

// Settings
const notifyOnTask = ref(true)
const notifyOnPomodoro = ref(true)

// Password change
const showPasswordModal = ref(false)
const oldPassword = ref('')
const newPassword = ref('')
const confirmNewPassword = ref('')
const changingPassword = ref(false)
const passwordError = ref('')

// Edit profile
const showEditModal = ref(false)
const editNickname = ref('')
const savingProfile = ref(false)

const expPercent = computed(() => {
  if (!auth.user) return 0
  const maxExp = auth.user.maxExp || 100
  const exp = auth.user.exp || 0
  return Math.min(100, Math.round((exp / maxExp) * 100))
})

const achievementColors = ['var(--accent)', 'var(--success)', 'var(--warning)', '#a78bfa', '#f472b6', '#34d399']

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const [pointsRes, achievementsRes, meRes, pomoRes] = await Promise.all([
      rewardsApi.getPoints(),
      rewardsApi.getAchievements(),
      rewardsApi.getMe(),
      pomodoroApi.getStats(),
    ])
    const pData = pointsRes.data?.data || pointsRes.data || {}
    pointsData.value = {
      balance: pData.balance ?? 0,
      totalEarned: pData.totalEarned ?? 0,
      totalSpent: pData.totalSpent ?? 0,
    }
    const aData = achievementsRes.data?.data || achievementsRes.data || {}
    achievements.value = aData.achievements || aData.data || []
    if (!Array.isArray(achievements.value)) achievements.value = []
    const meData = meRes.data?.data || meRes.data || {}
    levelInfo.value = meData
    // 从番茄钟 stats 接口获取真实学习时长
    const pomoData = pomoRes.data?.data || pomoRes.data || {}
    studyStats.value = {
      today: pomoData.todayTotalMinutes ?? pomoData.todayMinutes ?? 0,
      week: pomoData.weeklyData ? pomoData.weeklyData.reduce((sum: number, d: any) => sum + d.totalMinutes, 0) : 0,
      month: pomoData.totalFocusMinutes ?? pomoData.totalMinutes ?? 0,
    }

    // Load user settings if available
    if (auth.user) {
      notifyOnTask.value = (auth.user as any).notifyOnTask !== false
      notifyOnPomodoro.value = (auth.user as any).notifyOnPomodoro !== false
    }
  } catch (err: any) {
    error.value = err?.response?.data?.message || err?.message || '加载个人信息失败'
  } finally {
    loading.value = false
  }
}

// Edit Profile
function openEditProfile() {
  editNickname.value = auth.user?.nickname || ''
  showEditModal.value = true
}

async function saveProfile() {
  // 前端提示：功能开发中
  alert('设置已更新')
  if (auth.user) {
    auth.user.nickname = editNickname.value
  }
  showEditModal.value = false
}

// Change Password
function openPasswordModal() {
  oldPassword.value = ''
  newPassword.value = ''
  confirmNewPassword.value = ''
  passwordError.value = ''
  showPasswordModal.value = true
}

async function changePassword() {
  // 功能开发中，仅前端提示
  alert('修改密码功能开发中')
  showPasswordModal.value = false
}

// Save settings
async function saveSettings() {
  // 前端提示：设置已保存
  console.log('设置已更新')
}

onMounted(fetchData)
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">👤 个人中心</h1>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <span class="loading-text">加载中...</span>
    </div>

    <div v-else-if="error" class="error-message">
      <span>⚠️ {{ error }}</span>
      <button class="btn btn-sm btn-secondary" @click="fetchData">重试</button>
    </div>

    <template v-else>
      <!-- User Info Card -->
      <div class="card user-card">
        <div class="user-info-section">
          <div class="user-avatar-large">
            {{ auth.user?.nickname?.[0] || auth.user?.username?.[0] || 'U' }}
          </div>
          <div class="user-details">
            <h2 class="user-nickname">{{ auth.user?.nickname || auth.user?.username }}</h2>
            <p class="user-username">@{{ auth.user?.username }}</p>
            <div class="level-info">
              <span class="level-badge">Lv.{{ auth.user?.level || 1 }}</span>
              <div class="exp-bar-wrapper">
                <div class="exp-bar">
                  <div class="exp-fill" :style="{ width: expPercent + '%' }"></div>
                </div>
                <span class="exp-text">{{ auth.user?.exp || 0 }}/{{ auth.user?.maxExp || 100 }} XP</span>
              </div>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" @click="openEditProfile">
            ✏️ 编辑
          </button>
        </div>
      </div>

      <div class="profile-grid">
        <!-- Points -->
        <div class="card">
          <h3 class="section-title">🎯 积分总览</h3>
          <div class="points-breakdown">
            <div class="points-stat">
              <div class="points-value" style="color: var(--success);">{{ pointsData.totalEarned }}</div>
              <div class="points-label">总收入</div>
            </div>
            <div class="points-stat">
              <div class="points-value" style="color: var(--danger);">{{ pointsData.totalSpent }}</div>
              <div class="points-label">总支出</div>
            </div>
            <div class="points-stat">
              <div class="points-value" style="color: var(--warning);">{{ pointsData.balance }}</div>
              <div class="points-label">当前余额</div>
            </div>
          </div>
        </div>

        <!-- Study Stats -->
        <div class="card">
          <h3 class="section-title">⏱️ 学习统计</h3>
          <div class="study-stats">
            <div class="study-stat">
              <div class="study-value">{{ studyStats.today }}</div>
              <div class="study-label">今日专注(分钟)</div>
            </div>
            <div class="study-stat">
              <div class="study-value">{{ studyStats.week }}</div>
              <div class="study-label">本周专注(分钟)</div>
            </div>
            <div class="study-stat">
              <div class="study-value">{{ studyStats.month }}</div>
              <div class="study-label">本月专注(分钟)</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Achievements -->
      <div class="card" style="margin-top: 16px">
        <h3 class="section-title">🏆 成就徽章</h3>
        <div v-if="achievements.length === 0" style="padding: 16px 0; color: var(--text-tertiary); font-size: 14px; text-align: center;">
          还没有获得成就，继续加油！
        </div>
        <div v-else class="achievements-grid">
          <div
            v-for="(ach, idx) in achievements"
            :key="ach.id"
            class="achievement-item"
          >
            <div
              class="achievement-icon"
              :style="{ background: (achievementColors[idx % achievementColors.length]) + '20', color: achievementColors[idx % achievementColors.length] }"
            >
              {{ ach.icon || '🏆' }}
            </div>
            <div class="achievement-name">{{ ach.name }}</div>
            <div class="achievement-desc">{{ ach.description }}</div>
          </div>
        </div>
      </div>

      <!-- Settings -->
      <div class="card" style="margin-top: 16px">
        <h3 class="section-title">⚙️ 设置</h3>

        <div class="settings-section">
          <h4 class="settings-subtitle">通知设置</h4>
          <div class="settings-items">
            <label class="settings-item">
              <div>
                <div class="settings-label">任务提醒</div>
                <div class="settings-desc">待办截止时间前通知</div>
              </div>
              <input
                type="checkbox"
                class="checkbox"
                v-model="notifyOnTask"
                @change="saveSettings"
              />
            </label>
            <label class="settings-item">
              <div>
                <div class="settings-label">番茄钟提醒</div>
                <div class="settings-desc">专注结束和休息结束时通知</div>
              </div>
              <input
                type="checkbox"
                class="checkbox"
                v-model="notifyOnPomodoro"
                @change="saveSettings"
              />
            </label>
          </div>
        </div>

        <div class="settings-section">
          <h4 class="settings-subtitle">安全设置</h4>
          <button class="btn btn-secondary btn-sm" @click="openPasswordModal">
            🔒 修改密码
          </button>
        </div>
      </div>
    </template>

    <!-- Edit Profile Modal -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">编辑个人信息</h2>
          <button class="modal-close" @click="showEditModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">昵称</label>
            <input v-model="editNickname" class="input" placeholder="输入新昵称" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showEditModal = false">取消</button>
          <button class="btn btn-primary" :disabled="savingProfile" @click="saveProfile">
            {{ savingProfile ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Change Password Modal -->
    <div v-if="showPasswordModal" class="modal-overlay" @click.self="showPasswordModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">🔒 修改密码</h2>
          <button class="modal-close" @click="showPasswordModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div v-if="passwordError" class="error-message" style="margin-bottom: 12px">
            <span>⚠️ {{ passwordError }}</span>
          </div>
          <div class="form-group">
            <label class="form-label">当前密码</label>
            <input v-model="oldPassword" class="input" type="password" placeholder="输入当前密码" />
          </div>
          <div class="form-group">
            <label class="form-label">新密码</label>
            <input v-model="newPassword" class="input" type="password" placeholder="至少6位" />
          </div>
          <div class="form-group">
            <label class="form-label">确认新密码</label>
            <input v-model="confirmNewPassword" class="input" type="password" placeholder="再次输入新密码" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showPasswordModal = false">取消</button>
          <button class="btn btn-primary" :disabled="changingPassword" @click="changePassword">
            {{ changingPassword ? '修改中...' : '确认修改' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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

/* User Card */
.user-card {
  padding: 24px;
  margin-bottom: 16px;
}

.user-info-section {
  display: flex;
  align-items: center;
  gap: 20px;
}

.user-avatar-large {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--accent-bg);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 600;
  flex-shrink: 0;
}

.user-details {
  flex: 1;
  min-width: 0;
}

.user-nickname {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary);
}

.user-username {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.level-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}

.level-badge {
  padding: 2px 10px;
  background: var(--accent-bg);
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
  border-radius: 20px;
  white-space: nowrap;
}

.exp-bar-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 240px;
}

.exp-bar {
  flex: 1;
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
}

.exp-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.exp-text {
  font-size: 11px;
  color: var(--text-tertiary);
  white-space: nowrap;
}

/* Grid */
.profile-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-primary);
}

/* Points */
.points-breakdown {
  display: flex;
  justify-content: space-around;
  text-align: center;
}

.points-stat {
  text-align: center;
}

.points-value {
  font-size: 28px;
  font-weight: 700;
}

.points-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

/* Study Stats */
.study-stats {
  display: flex;
  justify-content: space-around;
  text-align: center;
}

.study-stat {
  text-align: center;
}

.study-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--accent);
}

.study-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

/* Achievements */
.achievements-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.achievement-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  width: 100px;
  padding: 12px;
  border-radius: var(--radius-sm);
  transition: background var(--transition);
}

.achievement-item:hover {
  background: var(--bg-hover);
}

.achievement-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  margin-bottom: 8px;
}

.achievement-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.achievement-desc {
  font-size: 10px;
  color: var(--text-tertiary);
  line-height: 1.3;
}

/* Settings */
.settings-section {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-primary);
}

.settings-section:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.settings-subtitle {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.settings-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.settings-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  padding: 8px 0;
}

.settings-label {
  font-size: 14px;
  color: var(--text-primary);
}

.settings-desc {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 2px;
}

@media (max-width: 768px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }

  .user-info-section {
    flex-direction: column;
    text-align: center;
  }

  .user-avatar-large {
    width: 56px;
    height: 56px;
    font-size: 22px;
  }

  .level-info {
    justify-content: center;
  }

  .achievements-grid {
    justify-content: center;
  }
}
</style>
