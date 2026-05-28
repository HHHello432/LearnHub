<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { shopApi, rewardsApi } from '@/api'
import { useAuthStore } from '@/stores/auth'

interface ShopItem {
  id: number
  name: string
  description?: string
  price: number
  stock?: number
  image?: string
  isActive?: boolean
}

interface PointsRules {
  [key: string]: number
}

const router = useRouter()
const auth = useAuthStore()
const items = ref<ShopItem[]>([])
const redeemRecords = ref<any[]>([])
const pointsBalance = ref(0)
const loading = ref(true)
const error = ref('')
const showConfirmModal = ref(false)
const selectedItem = ref<ShopItem | null>(null)
const redeeming = ref(false)
const showRecords = ref(false)
const showPointsRules = ref(false)
const pointsRules = ref<PointsRules>({})
const isAdmin = computed(() => auth.user?.role === 'admin')

const defaultImage = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect fill="%2321262d" width="120" height="120" rx="8"/><text x="60" y="68" text-anchor="middle" font-size="40">🎁</text></svg>'
)

const pointsRuleLabels: Record<string, string> = {
  task_complete: '完成一个待办',
  checkin: '打卡一次',
  pomodoro: '完成一个番茄钟',
  note_create: '创建一篇笔记',
  note_content_100: '笔记每满100字',
  diary_create: '创建一篇日记',
  diary_content_100: '日记每满100字',
}

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const [itemsRes, pointsRes] = await Promise.all([
      shopApi.getItems(),
      rewardsApi.getPoints(),
    ])
    const iData = itemsRes.data?.data || itemsRes.data || {}
    const rawItems = iData.items || iData.data || iData || []
    items.value = Array.isArray(rawItems) ? rawItems : []
    const pData = pointsRes.data?.data || pointsRes.data || {}
    pointsBalance.value = pData.balance ?? pData.points ?? 0
  } catch (err: any) {
    error.value = err?.response?.data?.message || err?.message || '加载商城数据失败'
  } finally {
    loading.value = false
  }
}

async function fetchPointsRules() {
  try {
    const res = await shopApi.getPointsRules()
    pointsRules.value = res.data?.data || res.data || {}
  } catch { /* ignore */ }
}

async function fetchRecords() {
  try {
    const res = await shopApi.getOrders()
    const rData = res.data?.data || res.data
    if (Array.isArray(rData)) {
      redeemRecords.value = rData
    } else {
      redeemRecords.value = (rData || {}).orders || (rData || {}).data || []
    }
  } catch {
    // ignore
  }
}

function confirmRedeem(item: ShopItem) {
  if (item.price > pointsBalance.value) return
  selectedItem.value = item
  showConfirmModal.value = true
}

async function doRedeem() {
  if (!selectedItem.value || redeeming.value) return
  redeeming.value = true
  try {
    await shopApi.buy({ itemId: selectedItem.value.id })
    showConfirmModal.value = false
    selectedItem.value = null
    await fetchData()
    // 同时刷新兑换记录
    if (showRecords.value) {
      fetchRecords()
    } else {
      // 预加载，点了记录页就能看到
      fetchRecords()
    }
  } catch (err: any) {
    error.value = err?.response?.data?.message || '兑换失败'
  } finally {
    redeeming.value = false
  }
}

function toggleRecords() {
  showRecords.value = !showRecords.value
  // 用 hash 记录状态，刷新时不会丢失
  window.location.hash = showRecords.value ? '#records' : ''
  if (showRecords.value && redeemRecords.value.length === 0) {
    fetchRecords()
  }
}

// 页面加载时检测 hash，自动切换到兑换记录
onMounted(() => {
  fetchData()
  if (window.location.hash === '#records') {
    showRecords.value = true
    fetchRecords()
  }
})

function openPointsRules() {
  showPointsRules.value = !showPointsRules.value
  if (showPointsRules.value) fetchPointsRules()
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <h1 class="page-title" style="margin:0">🛒 商城</h1>
        <button class="btn btn-sm btn-ghost" @click="openPointsRules">📋 积分规则</button>
        <button v-if="isAdmin" class="btn btn-sm btn-secondary" @click="router.push('/admin/shop')">⚙️ 商品管理</button>
      </div>
      <div class="header-actions">
        <div class="points-display">
          <span class="points-icon">🎯</span>
          <span class="points-value">{{ pointsBalance }}</span>
          <span class="points-label">积分</span>
        </div>
        <button class="btn btn-secondary btn-sm" @click="toggleRecords">
          {{ showRecords ? '返回商城' : '兑换记录' }}
        </button>
      </div>
    </div>

    <div v-if="error" class="error-message">
      <span>⚠️ {{ error }}</span>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <span class="loading-text">加载中...</span>
    </div>

    <!-- Points Rules -->
    <div v-if="showPointsRules && !showRecords" class="card" style="margin-bottom:16px;padding:20px">
      <div class="rules-header">
        <h3 class="section-title" style="margin:0;border:none;padding:0">📋 积分获取规则</h3>
      </div>
      <div v-if="Object.keys(pointsRules).length === 0" class="empty-state" style="padding:12px">
        <div class="empty-state-text">加载中...</div>
      </div>
      <div v-else class="rules-list">
        <div v-for="(val, key) in pointsRules" :key="key" class="rule-item">
          <span class="rule-label">{{ pointsRuleLabels[key as string] || key }}</span>
          <span class="rule-points">+{{ val }} 积分</span>
        </div>
        <div class="rule-note">
          💡 说明：积分通过完成各种任务获得，可用于商城兑换商品。
        </div>
      </div>
    </div>

    <!-- Redeem Records -->
    <div v-else-if="showRecords" class="card">
      <h3 class="section-title">📋 兑换记录</h3>
      <div v-if="redeemRecords.length === 0" class="empty-state" style="padding: 24px">
        <div class="empty-state-icon">🛒</div>
        <div class="empty-state-text">暂无兑换记录</div>
      </div>
      <div v-else class="records-list">
        <div
          v-for="record in redeemRecords"
          :key="record.id"
          class="record-item"
        >
          <div class="record-name">{{ record.item?.name || record.itemName || '商品' }}</div>
          <div class="record-cost">-{{ record.pointsSpent || record.cost }} 积分</div>
          <div class="record-time">{{ new Date(record.createdAt).toLocaleDateString('zh-CN') }}</div>
        </div>
      </div>
    </div>

    <!-- Shop Items -->
    <div v-else class="shop-grid">
      <div v-if="items.length === 0" class="card empty-state" style="grid-column: 1/-1; padding: 48px">
        <div class="empty-state-icon">🛒</div>
        <div class="empty-state-text">商城暂无商品</div>
        <div class="empty-state-desc">敬请期待</div>
      </div>
      <div
        v-for="item in items"
        :key="item.id"
        class="card shop-item"
        :class="{ 'item-disabled': item.isActive === false }"
      >
        <div class="item-image-wrapper">
          <img
            :src="item.image || defaultImage"
            :alt="item.name"
            class="item-image"
            @error="($event.target as HTMLImageElement).src = defaultImage"
          />
          <div v-if="item.isActive === false" class="item-disabled-overlay">已下架</div>
        </div>
        <div class="item-details">
          <h3 class="item-name">{{ item.name }}</h3>
          <p v-if="item.description" class="item-desc">{{ item.description }}</p>
          <div class="item-meta">
            <div class="item-price">
              <span class="price-value">{{ item.price }}</span>
              <span class="price-unit">积分</span>
            </div>
            <div class="item-stock">
              库存: {{ item.stock === -1 ? '∞' : item.stock }}
            </div>
          </div>
          <button
            class="btn"
            :class="item.price <= pointsBalance && item.isActive !== false ? 'btn-primary' : 'btn-secondary'"
            :disabled="item.price > pointsBalance || item.isActive === false || (item.stock !== undefined && item.stock !== null && item.stock >= 0 && item.stock <= 0)"
            @click="confirmRedeem(item)"
          >
            {{ item.isActive === false ? '已下架' : item.price > pointsBalance ? '积分不足' : '兑换' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Confirm Redeem Modal -->
    <div v-if="showConfirmModal && selectedItem" class="modal-overlay" @click.self="showConfirmModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">确认兑换</h2>
          <button class="modal-close" @click="showConfirmModal = false">✕</button>
        </div>
        <div class="modal-body">
          <p style="margin-bottom: 12px; color: var(--text-primary);">
            确定要兑换 <strong>{{ selectedItem.name }}</strong> 吗？
          </p>
          <p style="color: var(--text-secondary);">
            需要消耗 <span style="color: var(--warning); font-weight: 600;">{{ selectedItem.price }}</span> 积分
          </p>
          <p style="color: var(--text-tertiary); font-size: 13px; margin-top: 8px;">
            当前积分: {{ pointsBalance }} &nbsp;&nbsp; 兑换后: {{ pointsBalance - selectedItem.price }}
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showConfirmModal = false">取消</button>
          <button
            class="btn btn-primary"
            :disabled="redeeming"
            @click="doRedeem"
          >
            {{ redeeming ? '兑换中...' : '确认兑换' }}
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
  flex-wrap: wrap;
  gap: 12px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.points-display {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-sm);
  padding: 8px 14px;
}

.points-icon { font-size: 18px; }
.points-value { font-size: 20px; font-weight: 700; color: var(--warning); }
.points-label { font-size: 13px; color: var(--text-secondary); }

.section-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-primary);
}

/* Rules */
.rules-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-primary);
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rule-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}

.rule-label { font-size: 14px; color: var(--text-primary); }
.rule-points { font-size: 14px; font-weight: 600; color: var(--success); }

.rule-note {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-tertiary);
  padding: 8px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
}

.shop-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.shop-item {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

.item-disabled {
  opacity: 0.6;
}

.item-image-wrapper {
  width: 100%;
  aspect-ratio: 16/10;
  overflow: hidden;
  background: var(--bg-tertiary);
  position: relative;
}

.item-image { width: 100%; height: 100%; object-fit: cover; }

.item-disabled-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  color: white;
}

.item-details {
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-name { font-size: 16px; font-weight: 600; color: var(--text-primary); }
.item-desc { font-size: 13px; color: var(--text-secondary); line-height: 1.4; flex: 1; }

.item-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.item-price { display: flex; align-items: baseline; gap: 4px; }
.price-value { font-size: 20px; font-weight: 700; color: var(--warning); }
.price-unit { font-size: 12px; color: var(--text-tertiary); }
.item-stock { font-size: 12px; color: var(--text-tertiary); }

/* Records */
.records-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.record-item {
  display: flex;
  align-items: center;
  padding: 10px 8px;
  border-radius: var(--radius-sm);
  transition: background var(--transition);
}

.record-item:hover { background: var(--bg-hover); }

.record-name { flex: 1; font-size: 14px; font-weight: 500; }
.record-cost { font-size: 13px; color: var(--danger); font-weight: 500; margin-right: 16px; }
.record-time { font-size: 12px; color: var(--text-tertiary); }

@media (max-width: 768px) {
  .shop-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .page-header { flex-direction: column; align-items: flex-start; gap: 12px; }
  .header-actions { width: 100%; justify-content: space-between; }
}
</style>
