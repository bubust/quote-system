import React, { useState, useMemo } from 'react'
import { formatNTD, toNumber, cm2ToPing } from '../../lib/calculations.js'

// 磁磚規格：每箱幾片、每坪幾片
const TILE_SPECS = {
  磁磚_3060: { label: '30*60', pcsPerBox: 8,  pcsPerPing: 21 },
  磁磚_2545: { label: '25*45', pcsPerBox: 10, pcsPerPing: 34 },
  磁磚_3030: { label: '30*30', pcsPerBox: 15, pcsPerPing: 41 },
  磁磚_2020: { label: '20*20', pcsPerBox: 30, pcsPerPing: 92 },
  磁磚_6060: { label: '60*60', pcsPerBox: 4,  pcsPerPing: 10 },
  磁磚_8080: { label: '80*80', pcsPerBox: 3,  pcsPerPing: 6  },
}
const WALL_TILE_OPTIONS  = ['磁磚_3060', '磁磚_2545']
const FLOOR_TILE_OPTIONS = ['磁磚_3030', '磁磚_2020']

const MATERIAL_RULES = {
  '砌磚':           { 磚頭: 840, 水泥: 2.5, 沙: 0.1 },
  '30*60地磚':      { 磁磚_3060: 21, 水泥: 1.5, 沙: 0.05, 黏著劑: 1 },
  '30*30地磚':      { 磁磚_3030: 41, 水泥: 1.5, 沙: 0.05, 黏著劑: 1 },
  '60*60拋光石英磚': { 磁磚_6060: 10, 黏著劑: 2 },
  '80*80拋光石英磚': { 磁磚_8080: 6,  黏著劑: 2 },
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

// 材料定義（含磁磚）
const MAT_KEYS = ['磁磚_3060','磁磚_2545','磁磚_3030','磁磚_2020','磁磚_6060','磁磚_8080','磚頭','水泥','沙','黏著劑']
const MAT_LABEL = {
  磁磚_3060:'磁磚（30*60）', 磁磚_2545:'磁磚（25*45）',
  磁磚_3030:'磁磚（30*30）', 磁磚_2020:'磁磚（20*20）',
  磁磚_6060:'磁磚（60*60）', 磁磚_8080:'磁磚（80*80）',
  磚頭:'紅磚', 水泥:'水泥', 沙:'沙', 黏著劑:'黏著劑',
}
const MAT_UNIT = {
  磁磚_3060:'箱', 磁磚_2545:'箱', 磁磚_3030:'箱', 磁磚_2020:'箱',
  磁磚_6060:'箱', 磁磚_8080:'箱', 磚頭:'個', 水泥:'包', 沙:'m³', 黏著劑:'包',
}
const MAT_PRICE_DEFAULT = {
  磁磚_3060:800, 磁磚_2545:700, 磁磚_3030:600, 磁磚_2020:500,
  磁磚_6060:1200, 磁磚_8080:1500, 磚頭:6, 水泥:300, 沙:1200, 黏著劑:400,
}
const MAT_PPB = {
  磁磚_3060:8, 磁磚_2545:10, 磁磚_3030:15, 磁磚_2020:30,
  磁磚_6060:4, 磁磚_8080:3, 磚頭:1, 水泥:1, 沙:1, 黏著劑:1,
}

const emptyTotals = () => Object.fromEntries(MAT_KEYS.map(k => [k, 0]))

function getBoxes(totals, key) {
  const val = totals[key]
  if (!val) return 0
  const ppb = MAT_PPB[key]
  return ppb > 1 ? Math.ceil(val / ppb) : parseFloat(val.toFixed(key === '沙' ? 2 : 1))
}

function calcBathroomMaterials(b) {
  const t = emptyTotals()
  if (!b.enabled) return t
  const L = toNumber(b.length), W = toNumber(b.width), H = toNumber(b.height)
  if (L <= 0 || W <= 0 || H <= 0) return t

  const floorSpec = TILE_SPECS[b.floorTile] || TILE_SPECS.磁磚_3030
  const wallSpec  = TILE_SPECS[b.wallTile]  || TILE_SPECS.磁磚_3060

  // 壁磚：只算兩面長牆
  const wallPing = Math.max(0, 2 * (L / 100) * (H / 100) * 0.3025 - 0.5)
  // 地磚
  const floorPing = (L / 100) * (W / 100) * 0.3025
  // 戶定：兩條條狀（寬度方向 + 90cm）
  const tileSizeNum = floorSpec.label.includes('20') ? 20 : 30
  const doorPcs = Math.ceil(W / tileSizeNum) + Math.ceil(90 / tileSizeNum)
  const doorPing = doorPcs * (tileSizeNum * tileSizeNum) / 10000 * 0.3025

  // 壁磚
  t[b.wallTile] += wallPing * wallSpec.pcsPerPing
  t.黏著劑 += wallPing
  // 地磚（含戶定片數）
  t[b.floorTile] += floorPing * floorSpec.pcsPerPing + doorPcs
  t.黏著劑 += floorPing + doorPing

  return t
}

function getBathroomDetail(b) {
  const L = toNumber(b.length), W = toNumber(b.width), H = toNumber(b.height)
  if (L <= 0 || W <= 0 || H <= 0) return null
  const wallSpec = TILE_SPECS[b.wallTile] || TILE_SPECS.磁磚_3060
  const floorSpec = TILE_SPECS[b.floorTile] || TILE_SPECS.磁磚_3030
  const wallPing = Math.max(0, 2 * (L / 100) * (H / 100) * 0.3025 - 0.5)
  const floorPing = (L / 100) * (W / 100) * 0.3025
  const tileSizeNum = floorSpec.label.includes('20') ? 20 : 30
  const doorStrip1 = Math.ceil(W / tileSizeNum)
  const doorStrip2 = Math.ceil(90 / tileSizeNum)
  const doorPcs = doorStrip1 + doorStrip2
  const doorPing = doorPcs * (tileSizeNum * tileSizeNum) / 10000 * 0.3025
  const wallPcs = wallPing * wallSpec.pcsPerPing
  const floorPcs = floorPing * floorSpec.pcsPerPing + doorPcs
  const wallBoxes = Math.ceil(wallPcs / wallSpec.pcsPerBox)
  const floorBoxes = Math.ceil(floorPcs / floorSpec.pcsPerBox)
  const glue = wallPing + floorPing + doorPing
  return { wallPing, floorPing, doorPcs, doorStrip1, doorStrip2, wallPcs, floorPcs, wallBoxes, floorBoxes, glue, wallSpec, floorSpec }
}

function initBathroom(item, indexInFloor) {
  const m = item.notes?.match(/(\d+)\s*[*×x]\s*(\d+)/i)
  return {
    id: item.id || `b_${item.floor_location}_${indexInFloor}`,
    floor: item.floor_location || '',
    index: indexInFloor,
    enabled: true,
    length: m ? m[1] : '',
    width: m ? m[2] : '',
    height: '270',
    wallTile: '磁磚_3060',
    floorTile: '磁磚_3030',
  }
}

// ── 材料彙整表（共用）──────────────────────────────────────────────
function MatSummaryTable({ totals, prices, onPriceChange, title, color }) {
  const hasAny = MAT_KEYS.some(k => totals[k] > 0)
  if (!hasAny) return null
  const subtotal = MAT_KEYS.reduce((s, k) => s + getBoxes(totals, k) * (prices[k] || 0), 0)
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 13, color, marginBottom: 6, borderLeft: `3px solid ${color}`, paddingLeft: 8 }}>
        {title}
      </div>
      <table style={{ fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ width: 130 }}>材料名稱</th>
            <th style={{ textAlign: 'right', width: 100 }}>總用量（片/包/個）</th>
            <th style={{ textAlign: 'right', width: 80 }}>訂購數量</th>
            <th style={{ textAlign: 'right', width: 100 }}>單價（元）</th>
            <th style={{ textAlign: 'right', width: 90 }}>費用小計</th>
          </tr>
        </thead>
        <tbody>
          {MAT_KEYS.map(key => {
            const raw = totals[key]
            if (!raw) return null
            const boxes = getBoxes(totals, key)
            const ppb = MAT_PPB[key]
            const rawDisplay = ppb > 1 ? `${Math.round(raw)} 片`
              : key === '沙' ? `${raw.toFixed(2)} m³`
              : `${raw.toFixed(1)} ${MAT_UNIT[key]}`
            const cost = boxes * (prices[key] || 0)
            return (
              <tr key={key}>
                <td style={{ fontWeight: 600 }}>{MAT_LABEL[key]}</td>
                <td style={{ textAlign: 'right', fontSize: 11, color: '#666' }}>{rawDisplay}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{boxes} {MAT_UNIT[key]}</td>
                <td>
                  <input type="number" value={prices[key] || ''} min={0}
                    onChange={e => onPriceChange(key, e.target.value)}
                    style={{ width: 80, textAlign: 'right' }} />
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: '#1565C0' }}>{formatNTD(cost)}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr style={{ background: '#E3F2FD' }}>
            <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700, paddingRight: 8 }}>小計</td>
            <td style={{ textAlign: 'right', fontWeight: 700, color: '#1565C0' }}>{formatNTD(subtotal)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export default function MaterialList({ items, onClose }) {
  const [prices, setPrices] = useState({ ...MAT_PRICE_DEFAULT })
  const onPriceChange = (key, val) => setPrices(prev => ({ ...prev, [key]: toNumber(val) }))

  const rawBathroomItems = useMemo(() =>
    items.filter(i => i.item_name?.includes('翻修廁所')), [items])

  const [bathrooms, setBathrooms] = useState(() => {
    const floorCounts = {}
    return rawBathroomItems.map(item => {
      const fl = item.floor_location || ''
      floorCounts[fl] = (floorCounts[fl] || 0) + 1
      return initBathroom(item, floorCounts[fl])
    })
  })

  const updateBathroom = (id, key, val) =>
    setBathrooms(prev => prev.map(b => b.id === id ? { ...b, [key]: val } : b))

  // 各樓層廁所分組
  const bathroomsByFloor = useMemo(() => {
    const grouped = {}
    const order = []
    bathrooms.forEach(b => {
      const fl = b.floor || '未指定'
      if (!grouped[fl]) { grouped[fl] = []; order.push(fl) }
      grouped[fl].push(b)
    })
    return { grouped, order }
  }, [bathrooms])

  // 一般泥作材料（排除廁所）
  const baseMaterials = useMemo(() => {
    const t = emptyTotals()
    items.forEach(item => {
      if (!item.item_name || item.item_name.includes('翻修廁所')) return
      const rule = matchRule(item.item_name)
      if (!rule || !MATERIAL_RULES[rule]) return
      const qty = toNumber(item.quantity) || 0
      Object.entries(MATERIAL_RULES[rule]).forEach(([mat, per]) => {
        if (mat in t) t[mat] += qty * per
      })
    })
    return t
  }, [items])

  // 廁所材料合計
  const bathroomMaterials = useMemo(() => {
    const t = emptyTotals()
    bathrooms.forEach(b => {
      const bm = calcBathroomMaterials(b)
      MAT_KEYS.forEach(k => { t[k] += bm[k] || 0 })
    })
    return t
  }, [bathrooms])

  // 全部合計
  const grandTotals = useMemo(() => {
    const t = emptyTotals()
    MAT_KEYS.forEach(k => { t[k] = (baseMaterials[k] || 0) + (bathroomMaterials[k] || 0) })
    return t
  }, [baseMaterials, bathroomMaterials])

  const grandCost = MAT_KEYS.reduce((s, k) => s + getBoxes(grandTotals, k) * (prices[k] || 0), 0)
  const hasAny = MAT_KEYS.some(k => grandTotals[k] > 0)

  // 門窗清單
  const windowItems = useMemo(() =>
    items.filter(i => i.work_type === '門窗工程' || i.is_window_type), [items])

  // 詳細清單
  const detailedItems = useMemo(() =>
    items
      .map((item, idx) => ({ ...item, seq: idx + 1, rule: matchRule(item.item_name) }))
      .filter(item => item.rule || item.item_name?.includes('翻修廁所')),
    [items])

  // ── Excel 匯出 ──────────────────────────────────────────────────
  const handleExport = () => {
    const dateStr = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })

    const bathroomRows = bathrooms.filter(b => b.enabled).map(b => {
      const bm = calcBathroomMaterials(b)
      const matStr = MAT_KEYS.filter(k => bm[k] > 0).map(k => {
        const boxes = getBoxes(bm, k)
        return `${MAT_LABEL[k]}：${MAT_PPB[k] > 1 ? Math.round(bm[k]) + '片→' : ''}${boxes}${MAT_UNIT[k]}`
      }).join('，')
      return `<tr>
        <td>${b.floor ? b.floor + ' ' : ''}第${b.index}間</td>
        <td>${b.length}</td><td>${b.width}</td><td>${b.height}</td>
        <td>${TILE_SPECS[b.wallTile]?.label || b.wallTile}</td>
        <td>${TILE_SPECS[b.floorTile]?.label || b.floorTile}</td>
        <td style="font-size:10px">${matStr}</td>
      </tr>`
    }).join('')

    const matRows = (totals, label) => MAT_KEYS.map(key => {
      const raw = totals[key]
      if (!raw) return ''
      const boxes = getBoxes(totals, key)
      const ppb = MAT_PPB[key]
      const rawStr = ppb > 1 ? `${Math.round(raw)} 片` : key === '沙' ? `${raw.toFixed(2)} m³` : `${raw.toFixed(1)} ${MAT_UNIT[key]}`
      const cost = boxes * (prices[key] || 0)
      return `<tr>
        <td>${label}</td>
        <td style="font-weight:600">${MAT_LABEL[key]}</td>
        <td style="text-align:right">${rawStr}</td>
        <td style="text-align:right;font-weight:600">${boxes} ${MAT_UNIT[key]}</td>
        <td style="text-align:right">${prices[key] || 0}</td>
        <td style="text-align:right;font-weight:600;color:#1565C0">${formatNTD(cost)}</td>
      </tr>`
    }).filter(Boolean).join('')

    const winRows = windowItems.map(item => `<tr>
      <td>${item.floor_location || '—'}</td>
      <td style="font-weight:600">${item.item_name}</td>
      <td style="text-align:right">${item.quantity != null ? toNumber(item.quantity) : '—'}</td>
      <td style="text-align:center">${item.unit || '—'}</td>
      <td style="text-align:right">${item.total_price ? formatNTD(item.total_price) : '—'}</td>
      <td style="font-size:10px;white-space:pre-wrap">${(item.notes || '—').replace(/\n/g, '<br/>')}</td>
    </tr>`).join('')

    const extraNotesItems = items.filter(i => i.extra_notes)
    const extraRows = extraNotesItems.map(i => `<tr>
      <td>${i.floor_location || '—'}</td>
      <td style="font-weight:600">${i.item_name || ''}</td>
      <td style="white-space:pre-wrap">${(i.extra_notes || '').replace(/</g,'&lt;')}</td>
    </tr>`).join('')

    const html = `<html><head><meta charset="UTF-8"><style>
body{font-family:Microsoft JhengHei,微軟正黑體,sans-serif;font-size:12px}
h2{font-size:13px;color:#1565C0;margin-top:18px;border-bottom:2px solid #1565C0;padding-bottom:3px}
table{border-collapse:collapse;width:100%;margin:6px 0}
th{background:#1565C0;color:white;padding:4px 6px;border:1px solid #0d47a1;font-size:11px}
td{border:1px solid #ccc;padding:3px 5px;vertical-align:top;font-size:11px}
tr:nth-child(even){background:#f9f9f9}
.total-row td{background:#BBDEFB;font-weight:700}
</style></head><body>
<h1 style="font-size:15px;color:#1565C0">材料清單報表</h1>
<p style="font-size:11px;color:#555">報表日期：${dateStr}</p>

${rawBathroomItems.length > 0 && bathroomRows ? `
<h2>廁所磁磚設定</h2>
<table>
  <thead><tr><th>樓層/間次</th><th>長(cm)</th><th>寬(cm)</th><th>高(cm)</th><th>牆壁磁磚</th><th>地板磁磚</th><th>材料用量</th></tr></thead>
  <tbody>${bathroomRows}</tbody>
</table>` : ''}

<h2>廁所磁磚材料用量</h2>
<table>
  <thead><tr><th>來源</th><th>材料名稱</th><th>總用量</th><th>訂購數量</th><th>單價(元)</th><th>費用小計</th></tr></thead>
  <tbody>
    ${matRows(bathroomMaterials, '廁所')}
    <tr class="total-row"><td colspan="5" style="text-align:right">廁所材料費小計</td><td style="text-align:right">${formatNTD(MAT_KEYS.reduce((s,k) => s + getBoxes(bathroomMaterials,k)*(prices[k]||0),0))}</td></tr>
  </tbody>
</table>

<h2>一般泥作材料用量（砌磚/地磚等）</h2>
<table>
  <thead><tr><th>來源</th><th>材料名稱</th><th>總用量</th><th>訂購數量</th><th>單價(元)</th><th>費用小計</th></tr></thead>
  <tbody>
    ${matRows(baseMaterials, '泥作')}
    <tr class="total-row"><td colspan="5" style="text-align:right">一般泥作材料費小計</td><td style="text-align:right">${formatNTD(MAT_KEYS.reduce((s,k) => s + getBoxes(baseMaterials,k)*(prices[k]||0),0))}</td></tr>
  </tbody>
</table>

<h2>材料費總計</h2>
<table>
  <thead><tr><th>材料名稱</th><th>總用量</th><th>訂購數量</th><th>單價(元)</th><th>費用小計</th></tr></thead>
  <tbody>
    ${MAT_KEYS.map(key => {
      const raw = grandTotals[key]; if (!raw) return ''
      const boxes = getBoxes(grandTotals, key)
      const ppb = MAT_PPB[key]
      const rawStr = ppb > 1 ? `${Math.round(raw)} 片` : key === '沙' ? `${raw.toFixed(2)} m³` : `${raw.toFixed(1)} ${MAT_UNIT[key]}`
      return `<tr><td style="font-weight:600">${MAT_LABEL[key]}</td><td style="text-align:right">${rawStr}</td><td style="text-align:right;font-weight:600">${boxes} ${MAT_UNIT[key]}</td><td style="text-align:right">${prices[key]||0}</td><td style="text-align:right;font-weight:600;color:#1565C0">${formatNTD(boxes*(prices[key]||0))}</td></tr>`
    }).filter(Boolean).join('')}
    <tr class="total-row"><td colspan="4" style="text-align:right">材料費總計</td><td style="text-align:right">${formatNTD(grandCost)}</td></tr>
  </tbody>
</table>

${windowItems.length > 0 ? `
<h2>鋁門窗清單</h2>
<table>
  <thead><tr><th>施工位置</th><th>施工項目</th><th>數量</th><th>單位</th><th>總價</th><th>備考</th></tr></thead>
  <tbody>${winRows}</tbody>
</table>` : ''}

${extraNotesItems.length > 0 ? `
<h2>材料備注</h2>
<table>
  <thead><tr><th>施工位置</th><th>施工項目</th><th>備注</th></tr></thead>
  <tbody>${extraRows}</tbody>
</table>` : ''}
</body></html>`

    const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `材料清單_${dateStr}.xls`
    document.body.appendChild(a); a.click()
    setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a) }, 100)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ width: 860, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 17, color: '#1565C0' }}>📦 材料清單</h2>
          <button className="btn-gray" onClick={onClose}>✕ 關閉</button>
        </div>

        {/* ═══ 廁所磁磚設定（獨立區域）═══ */}
        {rawBathroomItems.length > 0 && (
          <div style={{ background: '#FFF3E0', border: '2px solid #FFB74D', borderRadius: 6, padding: '10px 14px', marginBottom: 20 }}>
            <div style={{ fontWeight: 700, color: '#E65100', fontSize: 14, marginBottom: 12 }}>
              🚿 廁所磁磚設定（共 {bathrooms.length} 間）
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ fontSize: 12, width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#FFE0B2' }}>
                    <th style={{ padding: '5px 8px', textAlign: 'left', whiteSpace: 'nowrap' }}>樓層／第幾間</th>
                    <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>長度(cm)</th>
                    <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>寬度(cm)</th>
                    <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>高度(cm)</th>
                    <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      牆壁磁磚<br/><span style={{ fontWeight: 400, color: '#888', fontSize: 10 }}>30*60、25*45</span>
                    </th>
                    <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      地板磁磚<br/><span style={{ fontWeight: 400, color: '#888', fontSize: 10 }}>30*30、20*20</span>
                    </th>
                    <th style={{ textAlign: 'center' }}>納入計算</th>
                  </tr>
                </thead>
                <tbody>
                  {bathroomsByFloor.order.map(floor => (
                    <React.Fragment key={floor}>
                      {bathroomsByFloor.order.length > 1 && (
                        <tr>
                          <td colSpan={7} style={{ background: '#FFF9C4', fontWeight: 700, color: '#E65100', padding: '3px 8px', fontSize: 12 }}>
                            ── {floor} ──
                          </td>
                        </tr>
                      )}
                      {bathroomsByFloor.grouped[floor].map(b => (
                        <React.Fragment key={b.id}>
                        <tr style={{ borderTop: '1px solid #FFD54F', background: b.enabled ? '#FFFDE7' : '#f5f5f5', opacity: b.enabled ? 1 : 0.6 }}>
                          <td style={{ fontWeight: 700, color: '#1565C0', padding: '5px 8px', whiteSpace: 'nowrap' }}>
                            {b.floor ? `${b.floor} ` : ''}第{b.index}間廁所
                          </td>
                          {['length', 'width', 'height'].map(key => (
                            <td key={key} style={{ padding: '3px 4px', textAlign: 'right' }}>
                              <input type="number" value={b[key] || ''} min={0}
                                disabled={!b.enabled}
                                onChange={e => updateBathroom(b.id, key, e.target.value)}
                                style={{ width: 70, textAlign: 'right' }} />
                            </td>
                          ))}
                          <td style={{ padding: '3px 4px', textAlign: 'center' }}>
                            <select value={b.wallTile} disabled={!b.enabled}
                              onChange={e => updateBathroom(b.id, 'wallTile', e.target.value)}
                              style={{ width: 80 }}>
                              {WALL_TILE_OPTIONS.map(o =>
                                <option key={o} value={o}>{TILE_SPECS[o].label}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '3px 4px', textAlign: 'center' }}>
                            <select value={b.floorTile} disabled={!b.enabled}
                              onChange={e => updateBathroom(b.id, 'floorTile', e.target.value)}
                              style={{ width: 80 }}>
                              {FLOOR_TILE_OPTIONS.map(o =>
                                <option key={o} value={o}>{TILE_SPECS[o].label}</option>)}
                            </select>
                          </td>
                          <td style={{ textAlign: 'center', padding: '3px' }}>
                            <input type="checkbox" checked={b.enabled}
                              onChange={e => updateBathroom(b.id, 'enabled', e.target.checked)} />
                          </td>
                        </tr>
                        {b.enabled && (() => {
                          const d = getBathroomDetail(b)
                          if (!d) return null
                          return (
                            <tr key={`${b.id}_detail`} style={{ background: '#FFFDE7' }}>
                              <td colSpan={7} style={{ padding: '3px 12px', fontSize: 11, color: '#555', lineHeight: 2 }}>
                                <span style={{ color: '#1565C0', fontWeight: 700 }}>壁磚 {d.wallSpec.label}：</span>
                                牆面積 {d.wallPing.toFixed(2)}坪 × {d.wallSpec.pcsPerPing}片/坪
                                = {Math.round(d.wallPcs)}片 → <b>{d.wallBoxes}箱</b>
                                &emsp;｜&emsp;
                                <span style={{ color: '#2e7d32', fontWeight: 700 }}>地磚 {d.floorSpec.label}：</span>
                                地面 {d.floorPing.toFixed(2)}坪 + 戶定 {d.doorPcs}片（{d.doorStrip1}+{d.doorStrip2}片）
                                = {Math.round(d.floorPcs)}片 → <b>{d.floorBoxes}箱</b>
                                &emsp;｜&emsp;
                                <span style={{ color: '#E65100', fontWeight: 700 }}>黏著劑：{d.glue.toFixed(1)}包</span>
                              </td>
                            </tr>
                          )
                        })()}
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ 廁所材料用量（獨立區域）═══ */}
        {MAT_KEYS.some(k => bathroomMaterials[k] > 0) && (
          <div style={{ background: '#FFF8E1', border: '1px solid #FFD54F', borderRadius: 6, padding: '10px 14px', marginBottom: 16 }}>
            <MatSummaryTable
              totals={bathroomMaterials}
              prices={prices}
              onPriceChange={onPriceChange}
              title="🚿 廁所磁磚材料用量（含牆磚、地磚、黏著劑及戶定）"
              color="#E65100"
            />
          </div>
        )}

        {/* ═══ 一般泥作材料（獨立區域）═══ */}
        {MAT_KEYS.some(k => baseMaterials[k] > 0) && (
          <div style={{ background: '#F1F8E9', border: '1px solid #A5D6A7', borderRadius: 6, padding: '10px 14px', marginBottom: 16 }}>
            <MatSummaryTable
              totals={baseMaterials}
              prices={prices}
              onPriceChange={onPriceChange}
              title="🧱 一般泥作材料用量（砌磚、地磚、抹牆等）"
              color="#2e7d32"
            />
          </div>
        )}

        {/* ═══ 材料費總計 ═══ */}
        {hasAny && (
          <div style={{ background: '#E3F2FD', border: '1px solid #90CAF9', borderRadius: 6, padding: '8px 14px', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1565C0', marginBottom: 8 }}>
              📊 材料費總計（廁所＋泥作合計）
            </div>
            <table style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ width: 130 }}>材料名稱</th>
                  <th style={{ textAlign: 'right', width: 100 }}>總用量</th>
                  <th style={{ textAlign: 'right', width: 80 }}>訂購數量</th>
                  <th style={{ textAlign: 'right', width: 90 }}>費用小計</th>
                </tr>
              </thead>
              <tbody>
                {MAT_KEYS.map(key => {
                  const raw = grandTotals[key]
                  if (!raw) return null
                  const boxes = getBoxes(grandTotals, key)
                  const ppb = MAT_PPB[key]
                  const rawDisplay = ppb > 1 ? `${Math.round(raw)} 片`
                    : key === '沙' ? `${raw.toFixed(2)} m³`
                    : `${raw.toFixed(1)} ${MAT_UNIT[key]}`
                  const cost = boxes * (prices[key] || 0)
                  return (
                    <tr key={key}>
                      <td style={{ fontWeight: 600 }}>{MAT_LABEL[key]}</td>
                      <td style={{ textAlign: 'right', color: '#666', fontSize: 11 }}>{rawDisplay}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{boxes} {MAT_UNIT[key]}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#1565C0' }}>{formatNTD(cost)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#1565C0' }}>
                  <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700, color: '#fff', paddingRight: 8, fontSize: 14 }}>
                    材料費總計
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#fff', fontSize: 15 }}>
                    {formatNTD(grandCost)}
                  </td>
                </tr>
              </tfoot>
            </table>
            <div style={{ fontSize: 11, color: '#888', marginTop: 6, lineHeight: 1.7 }}>
              ※ 磁磚含損耗取整箱（30*60: 8片/箱；25*45: 10片/箱；30*30: 15片/箱；20*20: 30片/箱；60*60: 4片/箱；80*80: 3片/箱）
            </div>
          </div>
        )}

        {/* ═══ 門窗清單 ═══ */}
        {windowItems.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1565C0', marginBottom: 8, borderLeft: '3px solid #1565C0', paddingLeft: 8 }}>
              🪟 鋁門窗清單（門窗工程項目）
            </div>
            <table>
              <thead>
                <tr>
                  <th>施工位置</th><th>施工項目</th>
                  <th style={{ textAlign: 'right' }}>數量</th>
                  <th style={{ textAlign: 'center' }}>單位</th>
                  <th style={{ textAlign: 'right' }}>總價</th>
                  <th>備考</th>
                </tr>
              </thead>
              <tbody>
                {windowItems.map((item, i) => (
                  <tr key={item.id || i}>
                    <td>{item.floor_location || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{item.item_name}</td>
                    <td style={{ textAlign: 'right' }}>{item.quantity != null ? toNumber(item.quantity) : '—'}</td>
                    <td style={{ textAlign: 'center' }}>{item.unit || '—'}</td>
                    <td style={{ textAlign: 'right' }}>{item.total_price ? formatNTD(item.total_price) : '—'}</td>
                    <td style={{ fontSize: 11, color: '#555', whiteSpace: 'pre-wrap' }}>{item.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid #e0e0e0', paddingTop: 12 }}>
          <button className="btn-blue" onClick={handleExport}>
            📤 匯出材料清單（Excel）
          </button>
          <button className="btn-gray" onClick={onClose}>關閉</button>
        </div>
      </div>
    </div>
  )
}
