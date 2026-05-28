/**
 * 单元测试：积分计算逻辑
 *
 * 测试目标：等级计算、经验值阈值、积分来源汇总
 * 覆盖点：等级阈值、EXP 累计、积分汇总、日均计算
 */

// ========== 业务函数 ==========

/** 计算下一级所需 EXP */
function expNeededForLevel(level) {
  return level * 100
}

/** 判断是否可以升级 */
function canLevelUp(currentExp, currentLevel) {
  const needed = expNeededForLevel(currentLevel)
  return currentExp >= needed
}

/** 计算升级后的等级和剩余经验 */
function calculateLevel(currentExp, currentLevel) {
  let exp = currentExp
  let level = currentLevel
  while (exp >= expNeededForLevel(level)) {
    exp -= expNeededForLevel(level)
    level++
  }
  return { level, exp }
}

/** 汇总积分来源统计 */
function summarizePoints(logs) {
  const summary = { totalEarned: 0, totalSpent: 0, balance: 0, sources: {} }
  for (const log of logs) {
    if (log.type === 'earn') {
      summary.totalEarned += log.points
      summary.balance += log.points
    } else if (log.type === 'spend' || log.type === 'deduct') {
      summary.totalSpent += log.points
      summary.balance -= log.points
    }
    const src = log.source || 'other'
    summary.sources[src] = (summary.sources[src] || 0) + log.points
  }
  return summary
}

/** 计算日均积分 */
function averageDailyPoints(totalEarned, daysActive) {
  if (daysActive <= 0) return 0
  return Math.round(totalEarned / daysActive)
}

// ========== 测试 ==========

describe('等级计算', () => {
  test('Lv.1 需要 100 EXP 升级', () => {
    expect(expNeededForLevel(1)).toBe(100)
  })

  test('Lv.5 需要 500 EXP 升级', () => {
    expect(expNeededForLevel(5)).toBe(500)
  })

  test('EXP 不足时不能升级', () => {
    expect(canLevelUp(50, 1)).toBe(false)
  })

  test('EXP 刚好够升级', () => {
    expect(canLevelUp(100, 1)).toBe(true)
  })

  test('EXP 超出时升级到正确等级', () => {
    const result = calculateLevel(250, 1)
    // Lv.1: need 100 → consume 100 → Lv.2, exp=150
    // Lv.2: need 200, exp=150 < 200 → stays Lv.2
    expect(result.level).toBe(2)
    expect(result.exp).toBe(150)
  })

  test('高等级多级升级正确', () => {
    // Lv.1: need 100 → consume 100 → Lv.2, exp=600
    // Lv.2: need 200 → consume 200 → Lv.3, exp=400
    // Lv.3: need 300 → consume 300 → Lv.4, exp=100
    const result = calculateLevel(700, 1)
    expect(result.level).toBe(4)
    expect(result.exp).toBe(100)
  })

  test('EXP 为 0 不升级', () => {
    const result = calculateLevel(0, 1)
    expect(result.level).toBe(1)
    expect(result.exp).toBe(0)
  })
})

describe('积分汇总', () => {
  test('空日志汇总为零', () => {
    const s = summarizePoints([])
    expect(s.totalEarned).toBe(0)
    expect(s.totalSpent).toBe(0)
    expect(s.balance).toBe(0)
  })

  test('正确汇总多条积分记录', () => {
    const logs = [
      { points: 5, type: 'earn', source: 'checkin' },
      { points: 5, type: 'earn', source: 'checkin' },
      { points: 20, type: 'earn', source: 'task' },
      { points: 100, type: 'spend', source: 'shop' },
    ]
    const s = summarizePoints(logs)
    expect(s.totalEarned).toBe(30)
    expect(s.totalSpent).toBe(100)
    expect(s.balance).toBe(-70)
    expect(s.sources.checkin).toBe(10)
    expect(s.sources.task).toBe(20)
    expect(s.sources.shop).toBe(100)
  })

  test('扣除类型正确归类到支出', () => {
    const logs = [
      { points: 20, type: 'earn', source: 'task' },
      { points: 5, type: 'deduct', source: 'checkin_undo' },
    ]
    const s = summarizePoints(logs)
    expect(s.totalEarned).toBe(20)
    expect(s.totalSpent).toBe(5)
    expect(s.balance).toBe(15)
  })
})

describe('日平均积分', () => {
  test('0 天活跃返回 0', () => {
    expect(averageDailyPoints(100, 0)).toBe(0)
  })

  test('正确计算日均', () => {
    expect(averageDailyPoints(100, 10)).toBe(10)
    expect(averageDailyPoints(105, 10)).toBe(11) // 四舍五入
  })
})
