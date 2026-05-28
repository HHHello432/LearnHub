<script setup lang="ts">
import { ref } from 'vue'

const visible = ref(false)
const message = ref('')

function show(msg?: string) {
  message.value = msg || '当前为游客账户，浏览数据为示例数据，无法保存修改。如需完整功能，请使用有效邀请码注册账号。'
  visible.value = true
}

function close() {
  visible.value = false
}

defineExpose({ show })
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="close">
      <div class="guest-modal">
        <div class="modal-header">
          <h3 class="modal-title">🔒 游客模式</h3>
          <button class="modal-close" @click="close">✕</button>
        </div>
        <div class="modal-body">
          <p>{{ message }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" @click="close">我知道了</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.guest-modal {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: 24px;
  min-width: 380px;
  max-width: 460px;
  width: 90%;
  box-shadow: var(--shadow-lg);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.modal-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  transition: color var(--transition);
}

.modal-close:hover {
  color: var(--text-primary);
}

.modal-body {
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
