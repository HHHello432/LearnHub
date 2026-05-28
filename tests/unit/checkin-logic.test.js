/**
 * 单元测试：打卡业务逻辑
 *
 * 测试目标：连续天数计算、统计数据聚合
 * 覆盖点：连续天数算法、月统计、今日完成率
 */

// ========== 业务函数（模拟后端 checkins.js 中的逻辑） ==========

/** 计算当前连续天数：从今天往前数，遇到断档即止 */
function calculateStreak(habitDates) {
  if (!habitDates || habitDates.length === 0) return 0

  // 将日期字符串排序（倒序）
  const sorted = [...habitDates]
    .map(d => {
      const dt = new Date(d)
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
    })
    .sort()
    .reverse()

  // 去重
  const unique = [...new Set(sorted)]

  // 从今天开始往前数
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const startFrom = unique.includes(todayStr) ? todayStr : unique[0]
  if (!startFrom) return 0

  const startIdx = unique.indexOf(startFrom)
  if (startIdx === -1) return 0

  let streak = 1
  for (let i = startIdx; i < unique.length - 1; i++) {
    const current = new Date(unique[i])
    const next = new Date(unique[i + 1])
    const diffDays = Math.round((current - next) / (1000 * 60 * 60 * 24))
    if (diffDays === 1) {
      streak++
    } else {
      break
    }
  }
  return streak
}

/** 计算指定月份的总打卡天数（去重） */
function calculateMonthDays(habitDates, year, month) {
  if (!habitDates || habitDates.length === 0) return 0

  const daysInMonth = new Set()
  for (const d of habitDates) {
    const dt = new Date(d)
    if (dt.getFullYear() === year && dt.getMonth() === month) {
      const dateStr = `${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}`
      daysInMonth.add(dateStr)
    }
  }
  return daysInMonth.size
}

/** 计算今日完成率 */
function calculateTodayRate(habits) {
  if (!habits || habits.length === 0) return 0

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  let doneCount = 0
  for (const habit of habits) {
    if (habit.dates.includes(todayStr)) doneCount++
  }
  return doneCount / habits.length
}

// ========== 测试 ==========

describe('连续天数计算', () => {
  test('空数据返回 0', () => {
    expect(calculateStreak([])).toBe(0)
    expect(calculateStreak(null)).toBe(0)
    expect(calculateStreak(undefined)).toBe(0)
  })

  test('单日打卡连续天数为 1', () => {
    const dates = ['2026-05-28']
    expect(calculateStreak(dates)).toBe(1)
  })

  test('连续三天打卡返回 3', () => {
    const dates = ['2026-05-28', '2026-05-27', '2026-05-26']
    expect(calculateStreak(dates)).toBe(3)
  })

  test('断档后只计算最新连续段', () => {
    const dates = ['2026-05-28', '2026-05-27', '2026-05-25', '2026-05-24']
    // 28→27连续2天，25→24断在26，所以最新段是2
    expect(calculateStreak(dates)).toBe(2)
  })

  test('日期乱序不影响结果', () => {
    const dates = ['2026-05-26', '2026-05-28', '2026-05-27']
    expect(calculateStreak(dates)).toBe(3)
  })

  test('重复日期不影响连续天数', () => {
    const dates = ['2026-05-28', '2026-05-28', '2026-05-27', '2026-05-26']
    expect(calculateStreak(dates)).toBe(3)
  })

  test('大跨度数据，最新连续段正确', () => {
    const dates = [
      '2026-05-28', '2026-05-27', '2026-05-26',
      '2026-05-20', '2026-05-19', '2026-05-18',
    ]
    // 28→27→26 连续3天
    expect(calculateStreak(dates)).toBe(3)
  })
})

describe('月度打卡天数计算', () => {
  test('空数据返回 0', () => {
    expect(calculateMonthDays([], 2026, 4)).toBe(0)
  })

  test('正确统计指定月份天数', () => {
    const dates = [
      '2026-05-01', '2026-05-02', '2026-05-03',
      '2026-04-30',
    ]
    expect(calculateMonthDays(dates, 2026, 3)).toBe(1) // 4月 (month=3, 0-indexed)
    expect(calculateMonthDays(dates, 2026, 4)).toBe(3) // 5月 (month=4)
  })
})

describe('今日完成率计算', () => {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

  test('空习惯返回 0', () => {
    expect(calculateTodayRate([])).toBe(0)
  })

  test('全部完成返回 100%', () => {
    const habits = [
      { name: '跑步', dates: [todayStr] },
      { name: '阅读', dates: [todayStr] },
    ]
    expect(calculateTodayRate(habits)).toBe(1)
  })

  test('一半完成返回 50%', () => {
    const habits = [
      { name: '跑步', dates: [todayStr] },
      { name: '阅读', dates: [yesterdayStr] },
    ]
    expect(calculateTodayRate(habits)).toBe(0.5)
  })

  test('全未完成返回 0%', () => {
    const habits = [
      { name: '跑步', dates: [yesterdayStr] },
      { name: '阅读', dates: [yesterdayStr] },
    ]
    expect(calculateTodayRate(habits)).toBe(0)
  })
})
