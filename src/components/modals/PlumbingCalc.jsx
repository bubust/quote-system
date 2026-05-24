import React, { useState, useMemo, useEffect } from 'react'
import { formatNTD } from '../../lib/calculations.js'

const LS_KEY = 'qs_plumbing_prices'

const DEFAULT_ITEMS = [
  { id: 'elec',  name: '配置主要電力管線', unit: '層', defaultPrice: 60000 },
  { id: 'weak',  name: '配置弱電管線',     unit: '層', defaultPrice: 15000 },
  { id: 'pipe',  name: '配置冷、熱、污、排管線', unit: '套/區', defaultPrice: 43000 },
]

function loadSavedPrices() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch { return {} }
}

function clamp(val) {
  const n = parseFloat(val)
  return isNaN(n) || n < 0 ? 0 : n
}

export default function PlumbingCalc({ onClose, onAddToQuote }) {
  const saved = loadSavedPrices()

  const [rows, setRows] = useState(
    DEFAULT_ITEMS.map(d => ({
      ...d,
      price: saved[d.id] ?? d.defaultPrice,
      qty: 0,
    }))
  )
  const [profit, setProfit] = useState(20)

  // 儲存單價到 localStorage
  useEffect(() => {
    const map = {}
    rows.forEach(r => { map[r.id] = r.price })
    localStorage.setItem(LS_KEY, JSON.stringify(map))
  }, [rows])

  const totalCost = useMemo(
    () => rows.reduce((sum, r) => sum + clamp(r.price) * clamp(r.qty), 0),
    [rows]
  )
  const profitAmt = useMemo(() => totalCost * clamp(profit) / 100, [totalCost, profit])
  const finalQuote = useMemo(() => totalCost + profitAmt, [totalCost, profitAmt])

  const setRowField = (id, field, val) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r))
  }

  const handleNumInput = (id, field, val) => {
    // 允許暫時保留空字串及小數點，讓使用者輸入中
    if (val === '' || val === '.' || /^\d*\.?\d*$/.test(val)) {
      setRowField(id, field, val)
    }
  }

  const handleAddToQuote = () => {
    const items = rows
      .filter(r => clamp(r.qty) > 0)
      .map(r => ({
        work_type: '水電工程',
        item_name: r.name,
        floor_location: '',
        unit_price: clamp(r.price),
        quantity: clamp(r.qty),
        unit: r.unit,
        total_price: clamp(r.price) * clamp(r.qty),
        notes: '',
        is_sub_item: false,
      }))
    if (items.length === 0) { alert('請至少輸入一項數量'); return }
    onAddToQuote(items)
    onClose()
  }

  const thStyle = { background: '#1565C0', color: '#fff', padding: '7px 10px', fontSize: 13, fontWeight: 600, textAlign: 'center' }
  const tdStyle = { padding: '7px 8px', fontSize: 13, borderBottom: '1px solid #e0e0e0' }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ width: 680 }}>

        {/* 標題 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 17, color: '#1565C0' }}>⚡ 水電施工費用計算</h2>
          <button className="btn-gray" onClick={onClose}>✕ 關閉</button>
        </div>

        {/* 區塊 1：施工項目 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#555', marginBottom: 6 }}>▌ 設定與輸入區</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: 'left', width: '36%' }}>施工項目</th>
                <th style={{ ...thStyle, width: '20%' }}>單價（元）</th>
                <th style={{ ...thStyle, width: '14%' }}>數量</th>
                <th style={{ ...thStyle, width: '10%' }}>單位</th>
                <th style={{ ...thStyle, width: '20%' }}>小計</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const sub = clamp(r.price) * clamp(r.qty)
                return (
                  <tr key={r.id} style={{ background: clamp(r.qty) > 0 ? '#F3F8FF' : '#fff' }}>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{r.name}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={r.price}
                        onChange={e => handleNumInput(r.id, 'price', e.target.value)}
                        onBlur={e => setRowField(r.id, 'price', clamp(e.target.value) || 0)}
                        style={{ width: '100%', textAlign: 'right', border: '1px solid #90CAF9', borderRadius: 4, padding: '3px 6px', fontSize: 13 }}
                      />
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={r.qty}
                        onChange={e => handleNumInput(r.id, 'qty', e.target.value)}
                        onBlur={e => setRowField(r.id, 'qty', clamp(e.target.value) || 0)}
                        style={{ width: '100%', textAlign: 'center', border: '1px solid #90CAF9', borderRadius: 4, padding: '3px 6px', fontSize: 13 }}
                      />
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', color: '#666' }}>{r.unit}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: sub > 0 ? '#1565C0' : '#bbb' }}>
                      {sub > 0 ? formatNTD(sub) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* 區塊 2：利潤設定 */}
        <div style={{ marginBottom: 20, background: '#FFFDE7', border: '1px solid #F9A825', borderRadius: 6, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#555' }}>▌ 利潤設定區</div>
          <label style={{ fontSize: 13, fontWeight: 600, marginLeft: 12 }}>預期利潤（%）</label>
          <input
            type="text"
            inputMode="decimal"
            value={profit}
            onChange={e => {
              const v = e.target.value
              if (v === '' || /^\d*\.?\d*$/.test(v)) setProfit(v)
            }}
            onBlur={e => setProfit(clamp(e.target.value))}
            style={{ width: 80, textAlign: 'center', border: '1px solid #F9A825', borderRadius: 4, padding: '4px 8px', fontSize: 14, fontWeight: 700 }}
          />
          <span style={{ fontSize: 13, color: '#888' }}>（輸入數字，例如 20 代表 20%）</span>
        </div>

        {/* 區塊 3：統計總結 */}
        <div style={{ background: '#E3F2FD', border: '1px solid #90CAF9', borderRadius: 6, padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#555', marginBottom: 10 }}>▌ 統計總結</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, background: '#fff', borderRadius: 6, padding: '10px 14px', textAlign: 'center', border: '1px solid #BBDEFB' }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>工程總成本</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1565C0' }}>{formatNTD(totalCost)}</div>
            </div>
            <div style={{ flex: 1, background: '#fff', borderRadius: 6, padding: '10px 14px', textAlign: 'center', border: '1px solid #BBDEFB' }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>預估利潤額（{clamp(profit)}%）</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#E65100' }}>{formatNTD(profitAmt)}</div>
            </div>
            <div style={{ flex: 1, background: '#1565C0', borderRadius: 6, padding: '10px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#B3D1FF', marginBottom: 4 }}>對外總報價</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{formatNTD(finalQuote)}</div>
            </div>
          </div>
        </div>

        {/* 操作按鈕 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn-gray" onClick={onClose}>關閉</button>
          <button className="btn-green" onClick={handleAddToQuote}>
            ＋ 加入估價單
          </button>
        </div>
      </div>
    </div>
  )
}
