import React, { useState, useMemo } from 'react'
import { formatNTD, toNumber } from '../../lib/calculations.js'

// 搬運費計算資料庫（各樓層各材料搬運單價）
// 單位：磚頭=元/塊, 水泥=元/包, 沙=元/m³, 黏著劑=元/包, 磁磚=元/箱
const TRANSPORT_DB_INIT = {
  '一樓': { 磚頭: null, 水泥: null, 沙: null, 黏著劑: null, 磁磚: null },
  '二樓': { 磚頭: 2.5, 水泥: 40, 沙: 1400, 黏著劑: 25, 磁磚: 25 },
  '三樓': { 磚頭: 4, 水泥: 60, 沙: 2200, 黏著劑: 40, 磁磚: 40 },
  '四樓': { 磚頭: 5, 水泥: 80, 沙: 3000, 黏著劑: null, 磁磚: null },
  '五樓': { 磚頭: 6, 水泥: 100, 沙: 4000, 黏著劑: null, 磁磚: null },
}
const FLOOR_LIST = ['一樓', '二樓', '三樓', '四樓', '五樓']
const MAT_COLS = ['磚頭', '水泥', '沙', '黏著劑', '磁磚']
const MAT_UNITS = { 磚頭: '塊', 水泥: '包', 沙: 'm³', 黏著劑: '包', 磁磚: '箱' }

// 材料計算規則（per 坪）
const MATERIAL_RULES = {
  '砌磚':           { 磚頭: 840, 水泥: 2.5, 沙: 0.1 },
  '30*60地磚':      { 磁磚_3060: 21, 水泥: 1.5, 沙: 0.05, 黏著劑: 1 },
  '30*30地磚':      { 磁磚_3030: 41, 水泥: 1.5, 沙: 0.05, 黏著劑: 1 },
  '60*60拋光石英磚': { 磁磚_6060: 10, 黏著劑: 2 },
  '80*80拋光石英磚': { 磁磚_8080: 6, 黏著劑: 2 },
  '抹牆打底':       { 水泥: 1, 沙: 0.04 },
}
const ITEM_KEYWORDS = {
  '砌磚': ['砌磚'],
  '30*60地磚': ['30*60', '30×60'],
  '30*30地磚': ['30*30', '30×30'],
  '60*60拋光石英磚': ['60*60', '60×60', '拋光石英'],
  '80*80拋光石英磚': ['80*80', '80×80'],
  '抹牆打底': ['抹牆', '打底'],
}
function matchRule(name) {
  for (const [r, kws] of Object.entries(ITEM_KEYWORDS))
    if (kws.some(kw => name?.includes(kw))) return r
  return null
}
const TILE_BOXES = { 磁磚_3060: 8, 磁磚_3030: 15, 磁磚_6060: 4, 磁磚_8080: 3 }

export default function TransportCalc({ onClose, onAddToQuote, quoteItems = [] }) {
  const [db, setDb] = useState(
    Object.fromEntries(FLOOR_LIST.map(f => [f, { ...TRANSPORT_DB_INIT[f] }]))
  )

  // 從估價單按樓層分別計算材料用量
  const matQtyByFloor = useMemo(() => {
    const byFloor = {}
    FLOOR_LIST.forEach(f => {
      byFloor[f] = { 磚頭: 0, 水泥: 0, 沙: 0, 黏著劑: 0, 磁磚_3060: 0, 磁磚_3030: 0, 磁磚_6060: 0, 磁磚_8080: 0 }
    })

    quoteItems.forEach(item => {
      const floor = item.floor_location
      if (!floor || !byFloor[floor]) return

      if (item.item_name?.includes('翻修廁所')) {
        const m = item.notes?.match(/(\d+)\s*[*×]\s*(\d+)/i)
        if (!m) return
        const L = parseFloat(m[1]), W = parseFloat(m[2]), H = 270
        const wallPing = Math.max(0, 2 * (L / 100) * (H / 100) * 0.3025 - 0.5)
        const floorPing = (L / 100) * (W / 100) * 0.3025
        const doorPcs = Math.ceil(W / 30) + Math.ceil(90 / 30)
        const doorPing = doorPcs * 900 / 10000 * 0.3025
        byFloor[floor].磁磚_3060 += wallPing * 21
        byFloor[floor].黏著劑 += wallPing
        byFloor[floor].磁磚_3030 += floorPing * 41 + doorPcs
        byFloor[floor].黏著劑 += floorPing + doorPing
        return
      }

      const rule = matchRule(item.item_name)
      if (!rule || !MATERIAL_RULES[rule]) return
      const qty = toNumber(item.quantity) || 0
      Object.entries(MATERIAL_RULES[rule]).forEach(([mat, per]) => {
        if (byFloor[floor][mat] !== undefined) byFloor[floor][mat] += qty * per
      })
    })

    const result = {}
    FLOOR_LIST.forEach(floor => {
      const raw = byFloor[floor]
      const tilePcs = Object.entries(TILE_BOXES).reduce((s, [key, ppb]) =>
        s + (raw[key] > 0 ? Math.ceil(raw[key] / ppb) : 0), 0)
      result[floor] = {
        磚頭: Math.round(raw.磚頭),
        水泥: parseFloat(raw.水泥.toFixed(1)),
        沙: parseFloat(raw.沙.toFixed(2)),
        黏著劑: parseFloat(raw.黏著劑.toFixed(1)),
        磁磚: tilePcs,
      }
    })
    return result
  }, [quoteItems])

  // 全部樓層合計（供顯示用）
  const matQty = useMemo(() => {
    const result = { 磚頭: 0, 水泥: 0, 沙: 0, 黏著劑: 0, 磁磚: 0 }
    FLOOR_LIST.forEach(floor => {
      MAT_COLS.forEach(mat => { result[mat] += matQtyByFloor[floor]?.[mat] || 0 })
    })
    result.水泥 = parseFloat(result.水泥.toFixed(1))
    result.沙 = parseFloat(result.沙.toFixed(2))
    result.黏著劑 = parseFloat(result.黏著劑.toFixed(1))
    return result
  }, [matQtyByFloor])

  const hasMaterials = Object.values(matQty).some(v => v > 0)

  // 所有樓層搬運費計算
  const allFloorData = useMemo(() => {
    return FLOOR_LIST.map(floor => {
      const prices = db[floor] || {}
      let total = 0
      const mats = MAT_COLS.map(mat => {
        const qty = matQtyByFloor[floor]?.[mat] || 0
        const price = prices[mat]
        const cost = (qty && price != null) ? qty * toNumber(price) : 0
        total += cost
        return { mat, qty, price, cost }
      })
      return { floor, mats, total }
    })
  }, [db, matQtyByFloor])

  const grandTotal = allFloorData.reduce((s, f) => s + f.total, 0)

  const updatePrice = (floor, mat, val) => {
    setDb(prev => ({
      ...prev,
      [floor]: { ...prev[floor], [mat]: val === '' ? null : toNumber(val) },
    }))
  }

  const handleExport = () => {
    const dateStr = new Date().toLocaleDateString('zh-TW')
    const headerRow1 = `<tr>
      <th rowspan="2" style="vertical-align:middle">樓層</th>
      ${MAT_COLS.map(mat => `<th colspan="2">${mat}（${MAT_UNITS[mat]}）</th>`).join('')}
      <th rowspan="2" style="vertical-align:middle">合計費用</th>
    </tr>`
    const headerRow2 = `<tr>
      ${MAT_COLS.map(() => '<th>數量</th><th>費用</th>').join('')}
    </tr>`
    const bodyRows = allFloorData.map(({ floor, mats, total }) => `<tr>
      <td style="font-weight:700;color:#1565C0">${floor}</td>
      ${mats.map(({ qty, cost }) => `
        <td style="text-align:right">${qty > 0 ? qty : '—'}</td>
        <td style="text-align:right;font-weight:${cost > 0 ? 600 : 400}">${cost > 0 ? cost.toLocaleString() : '—'}</td>
      `).join('')}
      <td style="text-align:right;font-weight:700">${total > 0 ? total.toLocaleString() : '—'}</td>
    </tr>`).join('')
    const totalRow = `<tr style="background:#E3F2FD">
      <td style="font-weight:700">加總</td>
      ${MAT_COLS.map(mat => `
        <td style="text-align:right;font-weight:600">${matQty[mat] > 0 ? matQty[mat] : '—'}</td>
        <td style="text-align:right;font-weight:700;color:#1565C0">${formatNTD(allFloorData.reduce((s, f) => s + (f.mats.find(m => m.mat === mat)?.cost || 0), 0))}</td>
      `).join('')}
      <td style="text-align:right;font-weight:700;font-size:14px">${formatNTD(grandTotal)}</td>
    </tr>`
    const html = `<html><head><meta charset="UTF-8"><style>
    body{font-family:Microsoft JhengHei;font-size:11px}
    table{border-collapse:collapse;width:100%}
    th{background:#1565C0;color:white;padding:3px 5px;border:1px solid #ccc;text-align:center}
    td{border:1px solid #ccc;padding:2px 5px;vertical-align:middle}
    tr:nth-child(even){background:#f9f9f9}
    </style></head><body>
    <h2>搬運費計算（全樓層）</h2>
    <p>日期：${dateStr}</p>
    <table>
      <thead>${headerRow1}${headerRow2}</thead>
      <tbody>${bodyRows}</tbody>
      <tfoot>${totalRow}</tfoot>
    </table>
    </body></html>`
    const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `搬運費_全樓層_${dateStr}.xls`
    document.body.appendChild(a); a.click()
    setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a) }, 100)
  }

  const handleAddToQuote = () => {
    const items = allFloorData
      .filter(f => f.total > 0)
      .map(({ floor, mats, total }) => {
        const notes = mats
          .filter(m => m.cost > 0)
          .map(m => `${m.mat}：${m.qty}${MAT_UNITS[m.mat]}`)
          .join('\n')
        return {
          work_type: '搬運工程',
          item_name: `材料搬運費（${floor}）`,
          unit_price: null,
          quantity: 1,
          unit: '式',
          total_price: total,
          notes,
          floor_location: floor,
        }
      })
    if (items.length > 0) {
      onAddToQuote(items)
    }
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ width: 960, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 17, color: '#1565C0' }}>🚛 搬運費計算</h2>
          <button className="btn-gray" onClick={onClose}>✕ 關閉</button>
        </div>

        {/* === 搬運費單價資料庫（可編輯）=== */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#E65100', marginBottom: 6, borderLeft: '3px solid #E65100', paddingLeft: 8 }}>
            搬運費單價資料庫（各樓層各材料，可直接修改）
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ width: 60 }}>樓層</th>
                  {MAT_COLS.map(m => <th key={m} style={{ textAlign: 'right' }}>{m}<br /><span style={{ fontWeight: 400, color: '#aaa' }}>元/{MAT_UNITS[m]}</span></th>)}
                </tr>
              </thead>
              <tbody>
                {FLOOR_LIST.map(floor => (
                  <tr key={floor}>
                    <td style={{ fontWeight: 700, color: '#1565C0' }}>{floor}</td>
                    {MAT_COLS.map(mat => (
                      <td key={mat} style={{ textAlign: 'right', padding: '2px 4px' }}>
                        <input
                          type="number"
                          value={db[floor][mat] ?? ''}
                          onChange={e => updatePrice(floor, mat, e.target.value)}
                          style={{ width: 80, textAlign: 'right' }}
                          min={0}
                          placeholder="—"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* === 本次估價材料用量 === */}
        {hasMaterials ? (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#2e7d32', marginBottom: 6, borderLeft: '3px solid #2e7d32', paddingLeft: 8 }}>
              本次估價材料用量（自動計算）
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', background: '#E8F5E9', padding: '8px 12px', borderRadius: 4, fontSize: 13 }}>
              {MAT_COLS.map(mat => matQty[mat] > 0 ? (
                <span key={mat}><strong>{mat}</strong>：{matQty[mat]} {MAT_UNITS[mat]}</span>
              ) : null)}
            </div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
              ※ 沙的用量單位為「m³」（立方公尺）
            </div>
          </div>
        ) : (
          <div style={{ background: '#FFF8E1', border: '1px solid #FFD54F', borderRadius: 4, padding: '8px 12px', marginBottom: 18, fontSize: 13, color: '#795548' }}>
            ⚠️ 估價單中未偵測到泥作材料（砌磚、磁磚等），搬運費將無法自動計算。請先在估價單新增泥作項目，或手動修改下方數量。
          </div>
        )}

        {/* === 全樓層搬運費矩陣 === */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#1565C0', marginBottom: 8, borderLeft: '3px solid #1565C0', paddingLeft: 8 }}>
            各樓層搬運費一覽
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ fontSize: 11, minWidth: 820 }}>
              <thead>
                <tr>
                  <th rowSpan={2} style={{ width: 55, verticalAlign: 'middle' }}>樓層</th>
                  {MAT_COLS.map(mat => (
                    <th key={mat} colSpan={2} style={{ textAlign: 'center' }}>
                      {mat}<br />
                      <span style={{ fontWeight: 400, fontSize: 10, color: '#cce' }}>（{MAT_UNITS[mat]}）</span>
                    </th>
                  ))}
                  <th rowSpan={2} style={{ verticalAlign: 'middle', background: '#0d47a1' }}>合計費用</th>
                </tr>
                <tr>
                  {MAT_COLS.map(mat => (
                    <React.Fragment key={mat}>
                      <th style={{ background: '#1976D2', fontSize: 10 }}>數量</th>
                      <th style={{ background: '#1976D2', fontSize: 10 }}>費用</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allFloorData.map(({ floor, mats, total }) => (
                  <tr key={floor}>
                    <td style={{ fontWeight: 700, color: '#1565C0', textAlign: 'center' }}>{floor}</td>
                    {mats.map(({ mat, qty, cost }) => (
                      <React.Fragment key={mat}>
                        <td style={{ textAlign: 'right', color: '#555', paddingRight: 4 }}>
                          {qty > 0 ? qty : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: cost > 0 ? 600 : 400, color: cost > 0 ? '#1565C0' : '#ccc' }}>
                          {cost > 0 ? formatNTD(cost) : (qty > 0 && (db[floor][mat] == null || db[floor][mat] === '') ? <span style={{ color: '#ff9800', fontSize: 10 }}>未設價</span> : '—')}
                        </td>
                      </React.Fragment>
                    ))}
                    <td style={{ textAlign: 'right', fontWeight: 700, color: total > 0 ? '#E65100' : '#ccc' }}>
                      {total > 0 ? formatNTD(total) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#E3F2FD' }}>
                  <td style={{ fontWeight: 700, textAlign: 'center', color: '#1565C0' }}>加總</td>
                  {MAT_COLS.map(mat => {
                    const matCostTotal = allFloorData.reduce((s, f) => s + (f.mats.find(m => m.mat === mat)?.cost || 0), 0)
                    return (
                      <React.Fragment key={mat}>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#555' }}>
                          {matQty[mat] > 0 ? matQty[mat] : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: matCostTotal > 0 ? '#1565C0' : '#ccc' }}>
                          {matCostTotal > 0 ? formatNTD(matCostTotal) : '—'}
                        </td>
                      </React.Fragment>
                    )
                  })}
                  <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 14, color: '#E65100' }}>
                    {grandTotal > 0 ? formatNTD(grandTotal) : '—'}
                  </td>
                </tr>
                <tr style={{ background: '#FFF8E1' }}>
                  <td style={{ fontWeight: 700, color: '#E65100', textAlign: 'center', fontSize: 10 }}>費用<br/>合計</td>
                  {MAT_COLS.map(mat => (
                    <React.Fragment key={mat}>
                      <td />
                      <td style={{ textAlign: 'right', fontSize: 10, color: '#888' }}>
                        {allFloorData.filter(f => f.mats.find(m => m.mat === mat)?.cost > 0).map(f => (
                          <div key={f.floor}>{f.floor}：{formatNTD(f.mats.find(m => m.mat === mat)?.cost || 0)}</div>
                        ))}
                      </td>
                    </React.Fragment>
                  ))}
                  <td style={{ textAlign: 'right', fontSize: 11 }}>
                    {allFloorData.filter(f => f.total > 0).map(f => (
                      <div key={f.floor} style={{ fontWeight: 600 }}>{f.floor}：{formatNTD(f.total)}</div>
                    ))}
                    {grandTotal > 0 && (
                      <div style={{ fontWeight: 700, color: '#E65100', borderTop: '1px solid #FFB74D', marginTop: 2, paddingTop: 2 }}>
                        全部：{formatNTD(grandTotal)}
                      </div>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn-yellow" onClick={handleExport}>📤 匯出搬運費</button>
          <button className="btn-blue" onClick={handleAddToQuote} disabled={grandTotal === 0}>
            ✓ 新增搬運費到估價單（{allFloorData.filter(f => f.total > 0).length} 個樓層）
          </button>
          <button className="btn-gray" onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  )
}
