import React, { useState } from 'react'
import { formatNTD, toNumber } from '../lib/calculations.js'

// 單個可編輯儲存格（獨立元件，合法使用 useState）
function EditableCell({ item, field, value, align = 'left', type = 'text', style = {}, onSave }) {
  const [editing, setEditing] = useState(false)
  const [localVal, setLocalVal] = useState('')

  const startEdit = () => {
    setLocalVal(value ?? '')
    setEditing(true)
  }

  const commitEdit = () => {
    setEditing(false)
    let updates = { [field]: localVal }
    if (field === 'unit_price') {
      updates.total_price = toNumber(localVal) * toNumber(item.quantity)
    } else if (field === 'quantity') {
      updates.total_price = toNumber(item.unit_price) * toNumber(localVal)
    } else if (field === 'total_price') {
      updates.total_price = toNumber(localVal)
    }
    onSave(item.id, updates)
  }

  const display = () => {
    if (field === 'unit_price' || field === 'total_price') return formatNTD(value)
    return value ?? ''
  }

  if (field === 'notes') {
    return (
      <td style={{ textAlign: align, ...style }} onClick={startEdit}>
        {editing ? (
          <textarea
            autoFocus
            value={localVal}
            onChange={e => setLocalVal(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) e.target.blur() }}
            style={{
              width: '100%',
              minHeight: 48,
              border: 'none',
              background: 'transparent',
              outline: '1px solid #1565C0',
              fontSize: 12,
              padding: '2px',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        ) : (
          <span style={{ display: 'block', minHeight: 20, cursor: 'text', whiteSpace: 'pre-wrap', fontSize: 12 }}>
            {display()}
          </span>
        )}
      </td>
    )
  }

  return (
    <td style={{ textAlign: align, ...style }} onClick={startEdit}>
      {editing ? (
        <input
          autoFocus
          type={type}
          value={localVal}
          onChange={e => setLocalVal(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
          style={{ width: '100%', border: 'none', background: 'transparent', outline: '1px solid #1565C0', fontSize: 13, padding: '0 2px' }}
        />
      ) : (
        <span style={{ display: 'block', minHeight: 20, cursor: 'text' }}>
          {display()}
        </span>
      )}
    </td>
  )
}

// 細項清單 Modal
function ItemDetailModal({ item, onClose }) {
  const notes = item.notes || ''
  // 以頓號、逗號、換行分割
  const lines = notes.split(/[、，,\n]/).map(s => s.trim()).filter(Boolean)

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 10, padding: '24px 28px',
          minWidth: 280, maxWidth: 420, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>{item.floor_location} · {item.work_type}</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{item.item_name}</div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#aaa', lineHeight: 1 }}
          >✕</button>
        </div>

        {lines.length === 0 ? (
          <div style={{ color: '#aaa', fontSize: 13 }}>（無細項說明）</div>
        ) : (
          <ol style={{ margin: 0, paddingLeft: 22, lineHeight: 2 }}>
            {lines.map((line, i) => (
              <li key={i} style={{ fontSize: 14, color: '#333' }}>{line}</li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

export default function QuoteDisplay({ items, onUpdateItem, onDeleteItem, onMoveItem, onMoveCategory }) {
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [detailItem, setDetailItem] = useState(null)

  if (!items || items.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 13 }}>
        估價單尚無資料，請從上方選擇施工項目並填入輸入欄位後按確認
      </div>
    )
  }

  // 依 work_type 分組（保持原始順序）
  const catOrder = []
  const catMap = {}
  items.forEach(item => {
    const cat = item.work_type || '其他'
    if (!catMap[cat]) {
      catMap[cat] = []
      catOrder.push(cat)
    }
    catMap[cat].push(item)
  })

  const grandTotal = items.reduce((s, i) => s + toNumber(i.total_price), 0)

  return (
    <div style={{ overflowX: 'auto', padding: '0 0 12px 0' }}>
      {detailItem && <ItemDetailModal item={detailItem} onClose={() => setDetailItem(null)} />}
      <table style={{ minWidth: 900 }}>
        <thead>
          <tr>
            <th style={{ width: 40 }}>項次</th>
            <th style={{ width: 80 }}>施工位置</th>
            <th style={{ width: 90 }}>工種</th>
            <th style={{ width: 160 }}>施工項目</th>
            <th style={{ width: 90 }}>單價</th>
            <th style={{ width: 70 }}>數量</th>
            <th style={{ width: 50 }}>單位</th>
            <th style={{ width: 100 }}>總價</th>
            <th>備考</th>
            <th style={{ width: 70 }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {catOrder.map(cat => {
            const catItems = catMap[cat]
            const catTotal = catItems.reduce((s, i) => s + toNumber(i.total_price), 0)
            let catSeq = 1

            return (
              <React.Fragment key={cat}>
                <tr className="category-row">
                  <td colSpan={9} style={{ paddingLeft: 10 }}>▶ {cat}</td>
                  <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <button
                      onClick={() => onMoveCategory(cat, -1)}
                      title="大項上移"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '0 2px', color: '#1565C0', fontWeight: 700 }}
                    >▲</button>
                    <button
                      onClick={() => onMoveCategory(cat, 1)}
                      title="大項下移"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '0 2px', color: '#1565C0', fontWeight: 700 }}
                    >▼</button>
                  </td>
                </tr>

                {catItems.map((item, idx) => {
                  const seq = item.is_sub_item ? null : catSeq++
                  return (
                    <tr key={item.id || idx} style={{ background: item.is_sub_item ? '#fafafa' : undefined }}>
                      <td style={{ textAlign: 'center', color: item.is_sub_item ? '#bbb' : undefined }}>
                        {seq || ''}
                      </td>
                      <EditableCell item={item} field="floor_location" value={item.floor_location} onSave={onUpdateItem} />
                      <EditableCell item={item} field="work_type" value={item.work_type} onSave={onUpdateItem} />
                      <EditableCell
                        item={item} field="item_name" value={item.item_name} onSave={onUpdateItem}
                        style={{ fontWeight: item.is_sub_item ? 400 : 500 }}
                      />
                      <EditableCell item={item} field="unit_price" value={item.unit_price} align="right" type="number" onSave={onUpdateItem} />
                      <EditableCell item={item} field="quantity" value={item.quantity} align="right" type="number" onSave={onUpdateItem} />
                      <EditableCell item={item} field="unit" value={item.unit} align="center" onSave={onUpdateItem} />
                      <EditableCell item={item} field="total_price" value={item.total_price} align="right" type="number" onSave={onUpdateItem} />
                      <EditableCell item={item} field="notes" value={item.notes} onSave={onUpdateItem} />
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {!item.is_sub_item && (
                          <button
                            onClick={() => setDetailItem(item)}
                            title="查看細項"
                            style={{
                              background: '#E3F2FD', border: '1px solid #90CAF9',
                              borderRadius: 4, cursor: 'pointer', fontSize: 11, padding: '1px 5px',
                              color: '#1565C0', marginRight: 3, lineHeight: 1.6,
                            }}
                          >細項</button>
                        )}
                        <button
                          onClick={() => onMoveItem(item.id, -1)}
                          title="上移"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '0 2px', color: '#555' }}
                        >▲</button>
                        <button
                          onClick={() => onMoveItem(item.id, 1)}
                          title="下移"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '0 2px', color: '#555' }}
                        >▼</button>
                        {deleteConfirm === item.id ? (
                          <>
                            <button
                              onClick={() => { onDeleteItem(item.id); setDeleteConfirm(null) }}
                              title="確定刪除"
                              style={{ background: '#f44336', border: 'none', cursor: 'pointer', fontSize: 11, padding: '1px 4px', color: '#fff', borderRadius: 2 }}>
                              確定
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              title="取消"
                              style={{ background: 'none', border: '1px solid #ccc', cursor: 'pointer', fontSize: 11, padding: '1px 4px', borderRadius: 2 }}>
                              取消
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(item.id)}
                            title="刪除"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '0 2px', color: '#f44336' }}>
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}

                <tr className="subtotal-row">
                  <td colSpan={7} style={{ textAlign: 'right', paddingRight: 8 }}>
                    {cat} 小計
                  </td>
                  <td style={{ textAlign: 'right' }}>{formatNTD(catTotal)}</td>
                  <td colSpan={2} />
                </tr>
              </React.Fragment>
            )
          })}

          <tr className="total-row">
            <td colSpan={7} style={{ textAlign: 'right', paddingRight: 8, fontWeight: 700, fontSize: 15 }}>
              總計
            </td>
            <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 15 }}>
              {formatNTD(grandTotal)}
            </td>
            <td colSpan={2} />
          </tr>
        </tbody>
      </table>
    </div>
  )
}
