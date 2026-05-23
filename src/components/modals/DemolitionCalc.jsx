import React, { useState } from 'react'
import { formatNTD, toNumber } from '../../lib/calculations.js'

const DEMOLITION_RATES = [
  { id: 'd1', type_name: '打石工', unit: '天', unit_price: 3300, group: 'labor' },
  { id: 'd2', type_name: '粗工', unit: '天', unit_price: 2200, group: 'labor' },
  { id: 'd3', type_name: '垃圾車 6.2T', unit: '車', unit_price: 19000, group: 'vehicle' },
  { id: 'd4', type_name: '垃圾車 9.2T', unit: '車', unit_price: 23000, group: 'vehicle' },
  { id: 'd5', type_name: '垃圾車 11T', unit: '車', unit_price: 27000, group: 'vehicle' },
  { id: 'd6', type_name: '土尿車 6.2T', unit: '車', unit_price: 12000, group: 'vehicle' },
  { id: 'd7', type_name: '土尿車 9.2T', unit: '車', unit_price: 16000, group: 'vehicle' },
  { id: 'd8', type_name: '土尿車 11T', unit: '車', unit_price: 20000, group: 'vehicle' },
]

export default function DemolitionCalc({ onClose, onAddToQuote }) {
  const [rates, setRates] = useState(DEMOLITION_RATES.map(r => ({ ...r })))
  const [quantities, setQuantities] = useState(
    Object.fromEntries(DEMOLITION_RATES.map(r => [r.id, '']))
  )

  const updatePrice = (id, price) => {
    setRates(prev => prev.map(r => r.id === id ? { ...r, unit_price: price } : r))
  }
  const updateQty = (id, qty) => {
    setQuantities(prev => ({ ...prev, [id]: qty }))
  }

  const getSubtotal = (r) => toNumber(r.unit_price) * toNumber(quantities[r.id] || 0)
  const grandTotal = rates.reduce((sum, r) => sum + getSubtotal(r), 0)

  const handleSaveAndAdd = () => {
    // 人工類（打石工、粗工）→ 打除
    const laborItems = rates.filter(r => r.group === 'labor' && toNumber(quantities[r.id]) > 0)
    // 車輛類（垃圾車、土尿車）→ 廢棄物清運
    const vehicleItems = rates.filter(r => r.group === 'vehicle' && toNumber(quantities[r.id]) > 0)

    const items = []

    if (laborItems.length > 0) {
      const laborTotal = laborItems.reduce((s, r) => s + getSubtotal(r), 0)
      const laborNotes = laborItems.map(r => `${r.type_name}：${quantities[r.id]}${r.unit}`).join('\n')
      items.push({
        work_type: '拆除保護工程',
        item_name: '打除',
        unit_price: null,
        quantity: 1,
        unit: '式',
        total_price: laborTotal,
        notes: laborNotes,
        floor_location: '',
      })
    }

    if (vehicleItems.length > 0) {
      const vehicleTotal = vehicleItems.reduce((s, r) => s + getSubtotal(r), 0)
      const vehicleNotes = vehicleItems.map(r => `${r.type_name}：${quantities[r.id]}${r.unit}`).join('\n')
      items.push({
        work_type: '拆除保護工程',
        item_name: '廢棄物清運',
        unit_price: null,
        quantity: 1,
        unit: '式',
        total_price: vehicleTotal,
        notes: vehicleNotes,
        floor_location: '',
      })
    }

    if (items.length > 0) {
      onAddToQuote(items)
    }

    onClose()
  }

  const laborRates = rates.filter(r => r.group === 'labor')
  const vehicleRates = rates.filter(r => r.group === 'vehicle')

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ width: 560 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 17, color: '#1565C0' }}>🔨 拆除費計算</h2>
          <button className="btn-gray" onClick={onClose}>✕ 關閉</button>
        </div>

        <table style={{ marginBottom: 4 }}>
          <thead>
            <tr>
              <th>項目</th>
              <th>單位</th>
              <th>單價（元）</th>
              <th>數量</th>
              <th>小計</th>
            </tr>
          </thead>
          <tbody>
            {/* 人工 */}
            <tr>
              <td colSpan={5} style={{ background: '#FFF9C4', fontWeight: 700, fontSize: 12, paddingLeft: 8, color: '#E65100' }}>
                人工（→ 新增為「打除」項目）
              </td>
            </tr>
            {laborRates.map(r => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.type_name}</td>
                <td style={{ textAlign: 'center', color: '#555' }}>{r.unit}</td>
                <td>
                  <input type="number" value={r.unit_price || ''} onChange={e => updatePrice(r.id, e.target.value)}
                    style={{ width: 90, textAlign: 'right' }} min={0} />
                </td>
                <td>
                  <input type="number" value={quantities[r.id] || ''} onChange={e => updateQty(r.id, e.target.value)}
                    style={{ width: 70, textAlign: 'right' }} min={0} />
                </td>
                <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatNTD(getSubtotal(r))}</td>
              </tr>
            ))}

            {/* 車輛 */}
            <tr>
              <td colSpan={5} style={{ background: '#FFF9C4', fontWeight: 700, fontSize: 12, paddingLeft: 8, color: '#1565C0', borderTop: '2px solid #F9A825' }}>
                車輛（→ 新增為「廢棄物清運」項目）
              </td>
            </tr>
            {vehicleRates.map(r => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.type_name}</td>
                <td style={{ textAlign: 'center', color: '#555' }}>{r.unit}</td>
                <td>
                  <input type="number" value={r.unit_price || ''} onChange={e => updatePrice(r.id, e.target.value)}
                    style={{ width: 90, textAlign: 'right' }} min={0} />
                </td>
                <td>
                  <input type="number" value={quantities[r.id] || ''} onChange={e => updateQty(r.id, e.target.value)}
                    style={{ width: 70, textAlign: 'right' }} min={0} />
                </td>
                <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatNTD(getSubtotal(r))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#FFF3E0' }}>
              <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700, paddingRight: 8 }}>合計拆除費</td>
              <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 15, color: '#E65100' }}>{formatNTD(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>

        <div style={{ fontSize: 11, color: '#888', marginBottom: 12, lineHeight: 1.6 }}>
          ※ 人工（打石工、粗工）合併新增為「打除」，車輛（垃圾車、土尿車）合併新增為「廢棄物清運」<br />
          ※ 備考欄自動顯示各項目數量明細
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn-blue" onClick={handleSaveAndAdd} disabled={grandTotal === 0}>
            ✓ 新增到估價單
          </button>
          <button className="btn-gray" onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  )
}
