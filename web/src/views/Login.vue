<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { inviteApi } from '@/api'

const router = useRouter()
const auth = useAuthStore()

const isLogin = ref(true)
const username = ref('')
const password = ref('')
const nickname = ref('')
const confirmPassword = ref('')
const inviteCode = ref('')
const error = ref('')
const submitting = ref(false)

// 邀请码验证状态
const inviteStatus = ref<'idle' | 'validating' | 'valid' | 'invalid'>('idle')
let inviteDebounceTimer: ReturnType<typeof setTimeout> | null = null

const formValid = computed(() => {
  if (!username.value.trim() || !password.value.trim()) return false
  if (!isLogin.value) {
    if (password.value !== confirmPassword.value) return false
    if (!inviteCode.value.trim() || inviteStatus.value !== 'valid') return false
  }
  return password.value.length >= 6
})

const passwordError = computed(() => {
  if (isLogin.value) return ''
  if (confirmPassword.value && password.value !== confirmPassword.value) {
    return '两次密码不一致'
  }
  return ''
})

// 邀请码防抖验证
function validateInviteCode(code: string) {
  if (inviteDebounceTimer) clearTimeout(inviteDebounceTimer)
  if (!code.trim()) {
    inviteStatus.value = 'idle'
    return
  }
  inviteStatus.value = 'validating'
  inviteDebounceTimer = setTimeout(async () => {
    try {
      await inviteApi.verify(code.trim())
      inviteStatus.value = 'valid'
    } catch {
      inviteStatus.value = 'invalid'
    }
  }, 500)
}

watch(inviteCode, (val) => {
  validateInviteCode(val)
})

function switchMode() {
  isLogin.value = !isLogin.value
  error.value = ''
  nickname.value = ''
  confirmPassword.value = ''
  inviteCode.value = ''
  inviteStatus.value = 'idle'
}

async function handleSubmit() {
  if (!formValid.value || submitting.value) return

  submitting.value = true
  error.value = ''

  try {
    if (isLogin.value) {
      await auth.login(username.value.trim(), password.value)
    } else {
      await auth.register(
        username.value.trim(),
        password.value,
        nickname.value.trim() || undefined,
        inviteCode.value.trim()
      )
    }
    // 确保 token 已持久化再跳转
    await new Promise(r => setTimeout(r, 100))
    router.push('/')
  } catch (err) {
    error.value = auth.getApiError(err)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <div class="logo">📚</div>
        <h1 class="title">LearnHub</h1>
        <p class="subtitle">你的学习成长平台</p>
      </div>

      <div class="tabs">
        <button
          class="tab"
          :class="{ active: isLogin }"
          @click="isLogin = true"
        >
          登录
        </button>
        <button
          class="tab"
          :class="{ active: !isLogin }"
          @click="isLogin = false"
        >
          注册
        </button>
      </div>

      <form class="login-form" @submit.prevent="handleSubmit">
        <div v-if="error" class="error-message">
          <span>⚠️</span>
          <span>{{ error }}</span>
        </div>

        <div class="form-group">
          <label class="form-label">用户名</label>
          <input
            v-model="username"
            class="input"
            type="text"
            placeholder="输入用户名"
            autocomplete="username"
            required
          />
        </div>

        <div v-if="!isLogin" class="form-group">
          <label class="form-label">昵称（可选）</label>
          <input
            v-model="nickname"
            class="input"
            type="text"
            placeholder="输入昵称"
          />
        </div>

        <div class="form-group">
          <label class="form-label">密码</label>
          <input
            v-model="password"
            class="input"
            type="password"
            placeholder="输入密码（至少6位）"
            autocomplete="current-password"
            required
          />
        </div>

        <div v-if="!isLogin" class="form-group">
          <label class="form-label">确认密码</label>
          <input
            v-model="confirmPassword"
            class="input"
            :class="{ 'input-error': !!passwordError }"
            type="password"
            placeholder="再次输入密码"
            autocomplete="new-password"
            required
          />
          <p v-if="passwordError" class="field-error">{{ passwordError }}</p>
        </div>

        <div v-if="!isLogin" class="form-group">
          <label class="form-label">邀请码</label>
          <input
            v-model="inviteCode"
            class="input"
            :class="{ 'input-error': inviteStatus === 'invalid' }"
            type="text"
            placeholder="输入邀请码（必填）"
            autocomplete="off"
          />
          <p v-if="inviteStatus === 'validating'" class="field-info">⏳ 验证中...</p>
          <p v-else-if="inviteStatus === 'valid'" class="field-success">✅ 有效邀请码</p>
          <p v-else-if="inviteStatus === 'invalid'" class="field-error">❌ 无效邀请码</p>
        </div>

        <button
          type="submit"
          class="btn btn-primary submit-btn"
          :disabled="!formValid || submitting"
        >
          <span v-if="submitting" class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></span>
          {{ submitting ? '处理中...' : isLogin ? '登录' : '注册' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: 32px;
  box-shadow: var(--shadow-lg);
}

.login-header {
  text-align: center;
  margin-bottom: 28px;
}

.logo {
  font-size: 48px;
  margin-bottom: 12px;
}

.title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 14px;
}

.tabs {
  display: flex;
  border-bottom: 1px solid var(--border-primary);
  margin-bottom: 24px;
}

.tab {
  flex: 1;
  padding: 10px 16px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-secondary);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}

.tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.tab:hover:not(.active) {
  color: var(--text-primary);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.input-error {
  border-color: var(--danger) !important;
}

.field-error {
  font-size: 12px;
  color: var(--danger);
}

.field-info {
  font-size: 12px;
  color: var(--text-secondary);
}

.field-success {
  font-size: 12px;
  color: var(--success);
}

.submit-btn {
  width: 100%;
  padding: 10px 16px;
  font-size: 15px;
  font-weight: 600;
  margin-top: 8px;
}

@media (max-width: 768px) {
  .login-card {
    padding: 24px;
  }
}
</style>
