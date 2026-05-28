/**
 * 面積換算：平方公分 → 坪
 * 1 坪 = 3.30579 m² = 33058 cm²（台灣標準：6尺×6尺，1尺=30.303cm）
 */
export function cm2ToPing(cm2) {
  return cm2 / 33058
}

/**
 * 計算面積或四面牆
 * @param {number} length - 長度 (cm)
 * @param {number} width  - 寬度 (cm)
 * @param {number} height - 高度 (cm)，可為 0 或 null
 * @returns {Array} 計算結果陣列
 *   - 只有長+寬: [{label, ping, note}]
 *   - 長+寬+高: [{label, ping, note}, x4 + 加總]
 */
export function calculateArea(length, width, height) {
  const L = parseFloat(length) || 0
  const W = parseFloat(width) || 0
  const H = parseFloat(height) || 0

  if (L <= 0 || W <= 0) return []

  if (H > 0) {
    // 四面牆
    const face1 = cm2ToPing(L * H)
    const face2 = cm2ToPing(W * H)
    const face3 = cm2ToPing(L * H)
    const face4 = cm2ToPing(W * H)
    const total = face1 + face2 + face3 + face4
    const noteText = `尺寸：${L}*${W} 公分`

    return [
      { label: '面1 (長×高)', ping: face1, note: noteText, isSubItem: true },
      { label: '面2 (寬×高)', ping: face2, note: noteText, isSubItem: true },
      { label: '面3 (長×高)', ping: face3, note: noteText, isSubItem: true },
      { label: '面4 (寬×高)', ping: face4, note: noteText, isSubItem: true },
      { label: '小計', ping: total, note: noteText, isSubItem: false, isWallTotal: true },
    ]
  } else {
    // 單一面積
    const ping = cm2ToPing(L * W)
    const noteText = `尺寸：${L}*${W} 公分`
    return [{ label: '', ping, note: noteText, isSubItem: false }]
  }
}

/**
 * 窗戶類自動計算總價
 * 總價 = 長 × 寬 × 單價
 */
export function calculateWindowPrice(length, width, unitPrice) {
  const L = parseFloat(length) || 0
  const W = parseFloat(width) || 0
  const P = parseFloat(unitPrice) || 0
  return L * W * P
}

/**
 * 金額格式化（加千分位，無小數）
 */
export function formatNTD(amount) {
  if (amount === null || amount === undefined || amount === '') return ''
  const num = parseFloat(amount)
  if (isNaN(num)) return ''
  return Math.round(num).toLocaleString('zh-TW')
}

/**
 * 安全數字轉換
 */
export function toNumber(val) {
  const n = parseFloat(val)
  return isNaN(n) ? 0 : n
}

/**
 * 坪數格式化（四捨五入到小數第2位）
 */
export function formatPing(ping) {
  return Math.round(ping * 100) / 100
}

/**
 * 計算估價單各類別小計
 */
export function calculateCategorySubtotals(items) {
  const categoryMap = {}
  items.filter(i => !i.is_sub_item).forEach(item => {
    const cat = item.work_type || '其他'
    if (!categoryMap[cat]) categoryMap[cat] = 0
    categoryMap[cat] += toNumber(item.total_price)
  })
  return categoryMap
}

/**
 * 計算估價單總計
 */
export function calculateGrandTotal(items) {
  return items.filter(i => !i.is_sub_item).reduce((sum, item) => sum + toNumber(item.total_price), 0)
}
