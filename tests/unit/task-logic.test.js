/**
 * 单元测试：四象限待办逻辑
 *
 * 测试目标：分类筛选、优先级排序、统计数据
 * 覆盖点：分类映射、排序算法、统计聚合
 */

// ========== 业务函数 ==========

const CATEGORIES = {
  urgent_important: { label: '紧急重要', quadrant: 1 },
  not_urgent_important: { label: '重要不紧急', quadrant: 2 },
  urgent_not_important: { label: '紧急不重要', quadrant: 3 },
  not_urgent_not_important: { label: '不紧急不重要', quadrant: 4 },
}

const PRIORITY_ORDER = { urgent: 0, important: 1, normal: 2 }

/** 按四象限分组 */
function groupByCategory(tasks) {
  const grouped = {}
  for (const cat of Object.keys(CATEGORIES)) {
    grouped[cat] = []
  }
  for (const task of tasks) {
    if (CATEGORIES[task.category]) {
      grouped[task.category].push(task)
    }
  }
  // 各象限内按优先级排序
  for (const cat of Object.keys(grouped)) {
    grouped[cat].sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 99
      const pb = PRIORITY_ORDER[b.priority] ?? 99
      return pa - pb
    })
  }
  return grouped
}

/** 统计待办完成度 */
function summarizeTasks(tasks) {
  const total = tasks.length
  const done = tasks.filter(t => t.status === 'done').length
  const pending = total - done
  return { total, done, pending, completionRate: total > 0 ? done / total : 0 }
}

/** 统计各象限数量 */
function quadrantStats(tasks) {
  const stats = {}
  for (const cat of Object.keys(CATEGORIES)) {
    const items = tasks.filter(t => t.category === cat)
    stats[cat] = { total: items.length, done: items.filter(t => t.status === 'done').length }
  }
  return stats
}

describe('四象限分组', () => {
  const tasks = [
    { id: 1, title: '紧急任务', category: 'urgent_important', priority: 'urgent', status: 'pending' },
    { id: 2, title: '重要任务', category: 'not_urgent_important', priority: 'important', status: 'pending' },
    { id: 3, title: '普通任务', category: 'not_urgent_not_important', priority: 'normal', status: 'done' },
    { id: 4, title: '紧急不重要', category: 'urgent_not_important', priority: 'normal', status: 'pending' },
  ]

  test('应正确分配到 4 个象限', () => {
    const grouped = groupByCategory(tasks)
    expect(Object.keys(grouped)).toHaveLength(4)
    expect(grouped.urgent_important).toHaveLength(1)
    expect(grouped.not_urgent_important).toHaveLength(1)
    expect(grouped.not_urgent_not_important).toHaveLength(1)
    expect(grouped.urgent_not_important).toHaveLength(1)
  })

  test('未知分类的任务应被忽略', () => {
    const tasksWithInvalid = [...tasks, { id: 5, category: 'invalid_cat' }]
    const grouped = groupByCategory(tasksWithInvalid)
    const total = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0)
    expect(total).toBe(4)
  })

  test('空数组返回空分类', () => {
    const grouped = groupByCategory([])
    for (const arr of Object.values(grouped)) {
      expect(arr).toHaveLength(0)
    }
  })

  test('同象限内按优先级排序', () => {
    const mixed = [
      { id: 1, category: 'urgent_important', priority: 'normal', status: 'pending' },
      { id: 2, category: 'urgent_important', priority: 'urgent', status: 'pending' },
      { id: 3, category: 'urgent_important', priority: 'important', status: 'pending' },
    ]
    const grouped = groupByCategory(mixed)
    const items = grouped.urgent_important
    expect(items[0].priority).toBe('urgent')
    expect(items[1].priority).toBe('important')
    expect(items[2].priority).toBe('normal')
  })
})

describe('待办统计', () => {
  test('全部完成', () => {
    const tasks = [
      { status: 'done' }, { status: 'done' },
    ]
    const s = summarizeTasks(tasks)
    expect(s.done).toBe(2)
    expect(s.pending).toBe(0)
    expect(s.completionRate).toBe(1)
  })

  test('部分完成', () => {
    const tasks = [
      { status: 'done' }, { status: 'pending' }, { status: 'pending' },
    ]
    const s = summarizeTasks(tasks)
    expect(s.done).toBe(1)
    expect(s.pending).toBe(2)
    expect(s.completionRate).toBeCloseTo(0.333, 1)
  })

  test('空列表', () => {
    const s = summarizeTasks([])
    expect(s.completionRate).toBe(0)
  })
})

describe('象限统计', () => {
  test('各象限数量统计正确', () => {
    const tasks = [
      { category: 'urgent_important', status: 'done' },
      { category: 'urgent_important', status: 'pending' },
      { category: 'not_urgent_important', status: 'done' },
      { category: 'not_urgent_not_important', status: 'pending' },
    ]
    const stats = quadrantStats(tasks)
    expect(stats.urgent_important.total).toBe(2)
    expect(stats.urgent_important.done).toBe(1)
    expect(stats.not_urgent_important.done).toBe(1)
    expect(stats.urgent_not_important.total).toBe(0)
  })
})
