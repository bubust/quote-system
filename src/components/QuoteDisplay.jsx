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
          <span style={{ display: 'block', minHeight: 20, cursor: 'text', fontSize: 12 }}>
            {(value ?? '').replace(/\n/g, '；')}
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

// 細項清單 Modal（含編輯／刪除）
function ItemDetailModal({ item, allItems, onUpdateItem, onDeleteItem, onClose }) {
  const [editingId, setEditingId] = useState(null)
  const [editVals, setEditVals] = useState({})

  const subItems = allItems.filter(i => i.parent_id === item.id)
  const parent = allItems.find(i => i.id === item.id) || item

  const notes = parent.notes || ''
  const lines = notes.split(/[、，,\n]/).map(s => s.trim()).filter(Boolean)

  function recalcParent(updatedSubs) {
    const qty = Math.round(updatedSubs.reduce((s, i) => s + toNumber(i.quantity), 0) * 100) / 100
    const total = Math.round(updatedSubs.reduce((s, i) => s + toNumber(i.total_price), 0) * 100) / 100
    onUpdateItem(item.id, { quantity: qty, total_price: total })
  }

  function startEdit(sub, focusField = 'item_name') {
    setEditingId(sub.id)
    setEditVals({ item_name: sub.item_name, quantity: String(sub.quantity), notes: sub.notes || '', _focus: focusField })
  }

  function commitEdit(sub) {
    const qty = Math.round((parseFloat(editVals.quantity) || toNumber(sub.quantity)) * 100) / 100
    const total = Math.round(qty * toNumber(sub.unit_price) * 100) / 100
    const updates = { item_name: editVals.item_name, quantity: qty, notes: editVals.notes, total_price: total }
    onUpdateItem(sub.id, updates)
    const updated = subItems.map(s => s.id === sub.id ? { ...s, ...updates } : s)
    recalcParent(updated)
    setEditingId(null)
  }

  function handleDelete(sub) {
    if (!window.confirm('確定刪除此細項？')) return
    onDeleteItem(sub.id)
    const remaining = subItems.filter(s => s.id !== sub.id)
    recalcParent(remaining)
  }

  const inputStyle = { width: '100%', border: 'none', outline: '1px solid #1565C0', fontSize: 12, padding: '1px 3px', background: '#fff', borderRadius: 2 }
  const thStyle = { padding: '5px 6px', color: '#fff', background: '#1565C0', fontWeight: 600, whiteSpace: 'nowrap', fontSize: 12 }
  const tdStyle = { padding: '5px 6px', borderBottom: '1px solid #f0f0f0', fontSize: 13 }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 10, padding: '20px 24px', minWidth: 360, maxWidth: 640, width: '96%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>{parent.floor_location} · {parent.work_type}</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{parent.item_name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#aaa', lineHeight: 1 }}>✕</button>
        </div>

        {subItems.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: 'center', width: 28 }}>項</th>
                <th style={{ ...thStyle, textAlign: 'left' }}>尺寸</th>
                <th style={{ ...thStyle, textAlign: 'left' }}>備註</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>數量</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>單價</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>小計</th>
                <th style={{ ...thStyle, textAlign: 'center', width: 28 }}></th>
              </tr>
            </thead>
            <tbody>
              {subItems.map((sub, i) => (
                <tr key={sub.id} style={{ background: editingId === sub.id ? '#E3F2FD' : undefined }}>
                  <td style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>{i + 1}</td>

                  {editingId === sub.id ? (
                    <>
                      <td style={tdStyle}>
                        <input autoFocus={editVals._focus !== 'notes'} value={editVals.item_name} onChange={e => setEditVals(v => ({ ...v, item_name: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') commitEdit(sub); if (e.key === 'Escape') setEditingId(null) }}
                          style={{ ...inputStyle, width: 110 }} />
                      </td>
                      <td style={tdStyle}>
                        <input autoFocus={editVals._focus === 'notes'} value={editVals.notes} onChange={e => setEditVals(v => ({ ...v, notes: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') commitEdit(sub); if (e.key === 'Escape') setEditingId(null) }}
                          placeholder="備註" style={{ ...inputStyle, width: 120 }} />
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <input type="number" value={editVals.quantity} onChange={e => setEditVals(v => ({ ...v, quantity: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') commitEdit(sub); if (e.key === 'Escape') setEditingId(null) }}
                          style={{ ...inputStyle, width: 60, textAlign: 'right' }} />
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#999' }}>{formatNTD(sub.unit_price)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#1565C0', fontWeight: 600 }}>
                        {formatNTD(Math.round((parseFloat(editVals.quantity) || 0) * toNumber(sub.unit_price) * 100) / 100)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <button onClick={() => commitEdit(sub)} style={{ background: '#1565C0', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 11, padding: '2px 6px' }}>✓</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ ...tdStyle, cursor: 'text' }} onClick={() => startEdit(sub)}>{sub.item_name}</td>
                      <td style={{ ...tdStyle, cursor: 'text', color: sub.notes ? '#555' : '#bbb' }} onClick={() => startEdit(sub, 'notes')}>{sub.notes || '點擊輸入'}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', cursor: 'text' }} onClick={() => startEdit(sub)}>{sub.quantity} {sub.unit}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#999' }}>{formatNTD(sub.unit_price)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#1565C0' }}>{formatNTD(sub.total_price)}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <button onClick={() => handleDelete(sub)} title="刪除" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f44336', fontSize: 14, lineHeight: 1 }}>✕</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #ccc', fontWeight: 700 }}>
                <td colSpan={3} style={{ textAlign: 'right', padding: '6px 6px', color: '#333' }}>合計</td>
                <td style={{ textAlign: 'right', padding: '6px 6px' }}>{parent.quantity} {parent.unit}</td>
                <td />
                <td style={{ textAlign: 'right', padding: '6px 6px', color: '#E65100' }}>{formatNTD(parent.total_price)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        ) : lines.length > 0 ? (
          <ol style={{ margin: 0, paddingLeft: 22, lineHeight: 2 }}>
            {lines.map((line, i) => <li key={i} style={{ fontSize: 14, color: '#333' }}>{line}</li>)}
          </ol>
        ) : (
          <div style={{ color: '#aaa', fontSize: 13 }}>（無細項說明）</div>
        )}

        <div style={{ marginTop: 10, fontSize: 11, color: '#aaa' }}>點擊列可編輯 · Enter 確認 · Esc 取消</div>
      </div>
    </div>
  )
}

export default function QuoteDisplay({ items, onUpdateItem, onDeleteItem, onMoveItem, onMoveCategory, onDuplicateItem }) {
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [detailItem, setDetailItem] = useState(null)

  if (!items || items.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 13 }}>
        估價單尚無資料，請從上方選擇施工項目並填入輸入欄位後按確認
      </div>
    )
  }

  // 主表格只顯示非子項目（子項目僅在「細項」Modal 中顯示）
  const visibleItems = items.filter(i => !i.is_sub_item)

  // 依 work_type 分組（保持原始順序）
  const catOrder = []
  const catMap = {}
  visibleItems.forEach(item => {
    const cat = item.work_type || '其他'
    if (!catMap[cat]) {
      catMap[cat] = []
      catOrder.push(cat)
    }
    catMap[cat].push(item)
  })

  const grandTotal = visibleItems.reduce((s, i) => s + toNumber(i.total_price), 0)

  return (
    <div style={{ overflowX: 'auto', padding: '0 0 12px 0' }}>
      {detailItem && <ItemDetailModal item={detailItem} allItems={items} onUpdateItem={onUpdateItem} onDeleteItem={onDeleteItem} onClose={() => setDetailItem(null)} />}
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
                          <>
                            <button
                              onClick={() => setDetailItem(item)}
                              title="查看細項"
                              style={{
                                background: '#E3F2FD', border: '1px solid #90CAF9',
                                borderRadius: 4, cursor: 'pointer', fontSize: 11, padding: '1px 5px',
                                color: '#1565C0', marginRight: 2, lineHeight: 1.6,
                              }}
                            >細項</button>
                            <button
                              onClick={() => onDuplicateItem(item.id)}
                              title="複製此項"
                              style={{
                                background: '#F3E5F5', border: '1px solid #CE93D8',
                                borderRadius: 4, cursor: 'pointer', fontSize: 11, padding: '1px 5px',
                                color: '#6A1B9A', marginRight: 2, lineHeight: 1.6,
                              }}
                            >複製</button>
                          </>
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
