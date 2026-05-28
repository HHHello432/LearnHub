<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { shopApi } from '@/api'
import { useAuthStore } from '@/stores/auth'

interface ShopItem {
  id: number
  name: string
  description?: string
  price: number
  stock?: number
  image?: string
  isActive?: boolean
  createdAt?: string
}

const auth = useAuthStore()
const router = useRouter()
const items = ref<ShopItem[]>([])
const loading = ref(true)
const error = ref('')
const editingItem = ref<ShopItem | null>(null)

// 新增/编辑表单
const formVisible = ref(false)
const formTitle = ref('')
const newItem = ref({ name: '', description: '', price: 0, stock: -1, image: '' })
const savingItem = ref(false)

const isAdmin = computed(() => auth.user?.role === 'admin')

const defaultImage = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect fill="%2321262d" width="120" height="120" rx="8"/><text x="60" y="68" text-anchor="middle" font-size="40">🎁</text></svg>'
)

async function fetchItems() {
  loading.value = true
  error.value = ''
  try {
    const res = await shopApi.getAllItems()
    const iData = res.data || {}
    // 后端返回 { success, data: { items: [...] } }
    const rawItems = iData.data?.items || iData.items || iData.data || []
    items.value = Array.isArray(rawItems) ? rawItems : []
  } catch (err: any) {
    error.value = err?.response?.data?.message || err?.message || '加载商品列表失败'
  } finally {
    loading.value = false
  }
}

function openCreateForm() {
  editingItem.value = null
  formTitle.value = '添加新商品'
  newItem.value = { name: '', description: '', price: 0, stock: -1, image: '' }
  formVisible.value = true
}

function openEditForm(item: ShopItem) {
  editingItem.value = item
  formTitle.value = '编辑商品'
  newItem.value = {
    name: item.name,
    description: item.description || '',
    price: item.price,
    stock: item.stock ?? -1,
    image: item.image || '',
  }
  formVisible.value = true
}

async function saveItem() {
  if (!newItem.value.name.trim() || savingItem.value) return
  savingItem.value = true
  error.value = ''
  try {
    if (editingItem.value) {
      await shopApi.updateItem(editingItem.value.id, {
        name: newItem.value.name,
        description: newItem.value.description,
        price: newItem.value.price,
        stock: newItem.value.stock,
        image: newItem.value.image || undefined,
      })
    } else {
      await shopApi.addItem({
        name: newItem.value.name,
        description: newItem.value.description,
        price: newItem.value.price,
        stock: newItem.value.stock,
        image: newItem.value.image || undefined,
      })
    }
    formVisible.value = false
    await fetchItems()
  } catch (err: any) {
    error.value = err?.response?.data?.message || '保存失败'
  } finally {
    savingItem.value = false
  }
}

async function deleteItem(id: number) {
  if (!confirm('确定要删除该商品吗？此操作不可撤销。')) return
  try {
    await shopApi.deleteItem(id)
    await fetchItems()
  } catch (err: any) {
    error.value = err?.response?.data?.message || '删除失败'
  }
}

async function toggleActive(item: ShopItem) {
  try {
    await shopApi.updateItem(item.id, { isActive: !item.isActive })
    item.isActive = !item.isActive
  } catch (err: any) {
    error.value = err?.response?.data?.message || '操作失败'
  }
}

onMounted(fetchItems)
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title" style="margin-bottom:0">⚙️ 商品管理</h1>
      <div class="header-actions">
        <button class="btn btn-sm btn-ghost" @click="router.push('/shop')">← 返回商城</button>
        <button class="btn btn-primary btn-sm" @click="openCreateForm">➕ 添加商品</button>
      </div>
    </div>

    <div v-if="error" class="error-message">
      <span>⚠️ {{ error }}</span>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <span class="loading-text">加载中...</span>
    </div>

    <div v-else-if="items.length === 0" class="card empty-state" style="padding: 48px">
      <div class="empty-state-icon">🛒</div>
      <div class="empty-state-text">暂无商品</div>
      <div class="empty-state-desc">点击「添加商品」开始上架</div>
    </div>

    <!-- 商品列表 -->
    <div v-else class="admin-item-list">
      <div
        v-for="item in items"
        :key="item.id"
        class="card admin-item-card"
      >
        <div class="admin-item-left">
          <img
            :src="item.image || defaultImage"
            :alt="item.name"
            class="admin-item-img"
            @error="($event.target as HTMLImageElement).src = defaultImage"
          />
        </div>
        <div class="admin-item-body">
          <div class="admin-item-name">{{ item.name }}</div>
          <div class="admin-item-desc">{{ item.description || '暂无描述' }}</div>
          <div class="admin-item-meta">
            <span class="admin-price">{{ item.price }} 积分</span>
            <span class="admin-stock">库存: {{ item.stock === -1 ? '无限' : item.stock }}</span>
            <span class="admin-status" :class="{ active: item.isActive !== false }">
              {{ item.isActive !== false ? '上架' : '下架' }}
            </span>
          </div>
          <div class="admin-item-time" v-if="item.createdAt">
            创建: {{ new Date(item.createdAt).toLocaleDateString('zh-CN') }}
          </div>
        </div>
        <div class="admin-item-actions">
          <button class="btn btn-sm btn-secondary" @click="toggleActive(item)" :title="item.isActive !== false ? '下架' : '上架'">
            {{ item.isActive !== false ? '下架' : '上架' }}
          </button>
          <button class="btn btn-sm btn-secondary" @click="openEditForm(item)">✏️ 编辑</button>
          <button class="btn btn-sm btn-danger" @click="deleteItem(item.id)">🗑️ 删除</button>
        </div>
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <div v-if="formVisible" class="modal-overlay" @click.self="formVisible = false">
      <div class="modal-content" style="max-width: 500px">
        <div class="modal-header">
          <h2 class="modal-title">{{ formTitle }}</h2>
          <button class="modal-close" @click="formVisible = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">商品名称 *</label>
            <input v-model="newItem.name" class="input" placeholder="输入商品名称" />
          </div>
          <div class="form-group">
            <label class="form-label">描述</label>
            <input v-model="newItem.description" class="input" placeholder="商品描述" />
          </div>
          <div class="form-row">
            <div class="form-group" style="flex:1">
              <label class="form-label">价格（积分） *</label>
              <input v-model.number="newItem.price" type="number" min="1" class="input" />
            </div>
            <div class="form-group" style="flex:1">
              <label class="form-label">库存（-1=无限）</label>
              <input v-model.number="newItem.stock" type="number" min="-1" class="input" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">图片URL（可选）</label>
            <input v-model="newItem.image" class="input" placeholder="https://..." />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="formVisible = false">取消</button>
          <button class="btn btn-primary" :disabled="!newItem.name.trim() || savingItem" @click="saveItem">
            {{ savingItem ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.admin-item-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.admin-item-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
}

.admin-item-left {
  flex-shrink: 0;
}

.admin-item-img {
  width: 80px;
  height: 60px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
}

.admin-item-body {
  flex: 1;
  min-width: 0;
}

.admin-item-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.admin-item-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.admin-item-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  margin-bottom: 2px;
}

.admin-price {
  color: var(--warning);
  font-weight: 500;
}

.admin-stock {
  color: var(--text-tertiary);
}

.admin-status {
  font-size: 12px;
  padding: 1px 8px;
  border-radius: 10px;
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
}

.admin-status.active {
  background: var(--success-bg);
  color: var(--success);
}

.admin-item-time {
  font-size: 11px;
  color: var(--text-tertiary);
}

.admin-item-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}

.form-group {
  margin-bottom: 14px;
}

.form-label {
  display: block;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.form-row {
  display: flex;
  gap: 12px;
}

@media (max-width: 768px) {
  .admin-item-card {
    flex-direction: column;
    align-items: stretch;
  }

  .admin-item-actions {
    flex-direction: row;
    justify-content: flex-end;
  }

  .form-row {
    flex-direction: column;
    gap: 0;
  }
}
</style>
