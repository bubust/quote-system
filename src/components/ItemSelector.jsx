import React, { useMemo, useState } from 'react'
import { addConstructionItem } from '../lib/supabase.js'

// 固定的類別順序
const CATEGORY_ORDER = [
  '拆除保護工程', '水電工程', '泥作工程', '門窗工程', '輕隔間工程',
  '鐵工工程', '油漆工程', '系統櫃工程', '鷹架工程', '其他工程',
]
const CAT_COLORS = {
  '拆除保護工程': '#c62828',
  '水電工程':     '#1565c0',
  '泥作工程':     '#e65100',
  '門窗工程':     '#2e7d32',
  '輕隔間工程':   '#6a1b9a',
  '鐵工工程':     '#4e342e',
  '油漆工程':     '#00838f',
  '系統櫃工程':   '#f57f17',
  '鷹架工程':     '#37474f',
  '其他工程':     '#558b2f',
}

const UNITS = ['', '坪', '式', '個', '樘', '座', '套', '支', '台', '件', '批', '包']

const EMPTY_NEW = { item_name: '', unit_price: '', unit: '', base_notes: '', is_window_type: false }

export default function ItemSelector({
  constructionItems,
  selectedCategory,
  onCategoryChange,
  selectedItem,
  onItemSelect,
  quoteItems,
  onItemAdded,   // 新增完畢後通知父層重新載入
}) {
  const [activeOptions, setActiveOptions] = useState([])
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [newItem, setNewItem] = useState(EMPTY_NEW)
  const [saving, setSaving] = useState(false)
  const [addMsg, setAddMsg] = useState('')

  const categories = useMemo(() => {
    const existing = [...new Set(constructionItems.map(i => i.category))]
    const ordered = CATEGORY_ORDER.filter(c => existing.includes(c))
    const extra = existing.filter(c => !CATEGORY_ORDER.includes(c))
    return [...ordered, ...extra]
  }, [constructionItems])

  const WINDOW_FIRST = ['乾式施工窗戶', '乾式施工落地窗', '濕式施工窗戶', '濕式施工落地窗']

  const itemsInCategory = useMemo(() => {
    if (!selectedCategory) return []
    const all = constructionItems.filter(i => i.category === selectedCategory)
    if (selectedCategory === '門窗工程') {
      const front = WINDOW_FIRST.map(n => all.find(i => i.item_name === n)).filter(Boolean)
      const rest = all.filter(i => !WINDOW_FIRST.includes(i.item_name))
      return [...front, ...rest]
    }
    return all
  }, [constructionItems, selectedCategory])

  const handleItemSelect = (item) => {
    setActiveOptions([])
    onItemSelect(item)
  }

  const toggleOption = (opt) => {
    setActiveOptions(prev =>
      prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]
    )
  }

  const optionsStr = activeOptions.join('、')

  const handleQuickAdd = async () => {
    if (!newItem.item_name.trim()) {
      setAddMsg('請填寫項目名稱')
      return
    }
    setSaving(true)
    setAddMsg('')
    const itemData = {
      category: selectedCategory,
      item_name: newItem.item_name.trim(),
      unit_price: newItem.unit_price !== '' ? parseFloat(newItem.unit_price) || null : null,
      unit: newItem.unit || null,
      base_notes: newItem.base_notes || null,
      is_window_type: newItem.is_window_type,
      clickable_options: null,
    }
    try {
      await addConstructionItem(itemData)
      setAddMsg('新增成功！')
      setNewItem(EMPTY_NEW)
      if (onItemAdded) onItemAdded()
      setTimeout(() => { setAddMsg(''); setShowQuickAdd(false) }, 1200)
    } catch (e) {
      // Supabase 失敗時直接通知父層加到本地
      if (onItemAdded) onItemAdded(itemData)
      setAddMsg('已加入本地清單')
      setNewItem(EMPTY_NEW)
      setTimeout(() => { setAddMsg(''); setShowQuickAdd(false) }, 1200)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #bbb' }}>

      {/* === 施工工程類別按鈕區 === */}
      <div style={{ display: 'flex', borderBottom: '1px solid #ddd' }}>
        <div style={{
          background: '#FFF9C4', border: '1px solid #F9A825',
          padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 14, color: '#333', whiteSpace: 'nowrap', minWidth: 64,
        }}>
          施工<br />工程
        </div>
        <div style={{
          flex: 1, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '4px', padding: '6px 8px', background: '#FFFDE7',
        }}>
          {categories.map(cat => (
            <button key={cat}
              onClick={() => {
                onCategoryChange(cat === selectedCategory ? '' : cat)
                setShowQuickAdd(false)
                setNewItem(EMPTY_NEW)
              }}
              style={{
                padding: '5px 4px', fontSize: 13,
                fontWeight: selectedCategory === cat ? 700 : 500,
                color: selectedCategory === cat ? '#fff' : (CAT_COLORS[cat] || '#333'),
                background: selectedCategory === cat ? (CAT_COLORS[cat] || '#1565c0') : '#fff',
                border: `1.5px solid ${CAT_COLORS[cat] || '#999'}`,
                borderRadius: 4, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* === 即時顯示區（選中項目資訊）=== */}
      {selectedItem && (
        <div style={{
          padding: '4px 12px', background: '#E3F2FD', borderBottom: '1px solid #90CAF9',
          fontSize: 12, color: '#1565C0', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
        }}>
          <span style={{ fontWeight: 700 }}>{selectedItem.item_name}</span>
          {selectedItem.unit_price != null && <span>單價：<b>{selectedItem.unit_price}</b></span>}
          {selectedItem.unit && <span>單位：<b>{selectedItem.unit}</b></span>}
          {selectedItem.base_notes && (
            <span style={{ color: '#555', fontSize: 11 }}>備考：{selectedItem.base_notes.replace(/\n/g, ' ')}</span>
          )}
          {activeOptions.length > 0 && (
            <span style={{ color: '#e65100', fontSize: 11 }}>已選：{optionsStr}</span>
          )}
        </div>
      )}

      {/* === 施工項目按鈕區 === */}
      {selectedCategory && (
        <div style={{ borderBottom: '1px solid #ddd' }}>
          <div style={{
            padding: '6px 10px', display: 'flex', flexWrap: 'wrap', gap: '5px',
            maxHeight: 120, overflowY: 'auto', background: '#FAFAFA',
          }}>
            {itemsInCategory.length === 0 ? (
              <span style={{ color: '#999', fontSize: 12 }}>此類別無項目</span>
            ) : (
              itemsInCategory.map(item => (
                <button key={item.id} onClick={() => handleItemSelect(item)}
                  style={{
                    padding: '4px 10px', fontSize: 13,
                    fontWeight: selectedItem?.id === item.id ? 700 : 400,
                    color: selectedItem?.id === item.id ? '#fff' : '#1565C0',
                    background: selectedItem?.id === item.id ? '#1565C0' : '#E3F2FD',
                    border: '1.5px solid #90CAF9', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                  title={item.base_notes || ''}
                >
                  {item.item_name}
                  {item.is_window_type && <span style={{ fontSize: 10, marginLeft: 3 }}>📐</span>}
                </button>
              ))
            )}

            {/* ＋ 新增項目按鈕 */}
            <button
              onClick={() => { setShowQuickAdd(v => !v); setAddMsg('') }}
              style={{
                padding: '4px 10px', fontSize: 13,
                color: showQuickAdd ? '#fff' : '#2e7d32',
                background: showQuickAdd ? '#2e7d32' : '#E8F5E9',
                border: '1.5px dashed #4caf50', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              ＋ 新增項目
            </button>
          </div>

          {/* 快速新增表單 */}
          {showQuickAdd && (
            <div style={{ background: '#F1F8E9', borderTop: '1px solid #A5D6A7', padding: '8px 12px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#2e7d32', marginBottom: 6 }}>
                快速新增項目到「{selectedCategory}」
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12 }}>
                  <span style={{ fontWeight: 600 }}>項目名稱 *</span>
                  <input value={newItem.item_name}
                    onChange={e => setNewItem(p => ({ ...p, item_name: e.target.value }))}
                    style={{ width: 140 }} placeholder="必填" />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12 }}>
                  <span style={{ fontWeight: 600 }}>單價</span>
                  <input type="number" value={newItem.unit_price}
                    onChange={e => setNewItem(p => ({ ...p, unit_price: e.target.value }))}
                    style={{ width: 90, textAlign: 'right' }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12 }}>
                  <span style={{ fontWeight: 600 }}>單位</span>
                  <select value={newItem.unit}
                    onChange={e => setNewItem(p => ({ ...p, unit: e.target.value }))}
                    style={{ width: 70 }}>
                    {UNITS.map(u => <option key={u} value={u}>{u || '—'}</option>)}
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12, flex: 1, minWidth: 120 }}>
                  <span style={{ fontWeight: 600 }}>備考預設值</span>
                  <input value={newItem.base_notes}
                    onChange={e => setNewItem(p => ({ ...p, base_notes: e.target.value }))}
                    style={{ minWidth: 120 }} placeholder="選填" />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, alignSelf: 'flex-end', paddingBottom: 2 }}>
                  <input type="checkbox" checked={newItem.is_window_type}
                    onChange={e => setNewItem(p => ({ ...p, is_window_type: e.target.checked }))} />
                  窗戶類
                </label>
                <button className="btn-blue" onClick={handleQuickAdd} disabled={saving}
                  style={{ alignSelf: 'flex-end', fontSize: 13 }}>
                  {saving ? '...' : '✓ 確認新增'}
                </button>
                <button className="btn-gray" onClick={() => { setShowQuickAdd(false); setNewItem(EMPTY_NEW) }}
                  style={{ alignSelf: 'flex-end', fontSize: 13 }}>
                  取消
                </button>
              </div>
              {addMsg && (
                <div style={{ marginTop: 6, fontSize: 12, color: addMsg.includes('成功') || addMsg.includes('本地') ? '#2e7d32' : '#c62828', fontWeight: 600 }}>
                  {addMsg}
                </div>
              )}
            </div>
          )}

          {/* 可點選選項 */}
          {selectedItem?.clickable_options?.length > 0 && (
            <div style={{
              padding: '4px 10px 6px', display: 'flex', flexWrap: 'wrap', gap: '4px',
              background: '#FFF8E1', borderTop: '1px dashed #FFD54F',
            }}>
              <span style={{ fontSize: 11, color: '#888', alignSelf: 'center', marginRight: 4 }}>點選加入備考：</span>
              {selectedItem.clickable_options.map(opt => (
                <button key={opt} onClick={() => toggleOption(opt)}
                  style={{
                    padding: '2px 8px', fontSize: 12,
                    color: activeOptions.includes(opt) ? '#fff' : '#e65100',
                    background: activeOptions.includes(opt) ? '#e65100' : '#FFF3E0',
                    border: '1px solid #FFB74D', borderRadius: 10, cursor: 'pointer',
                  }}>
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <input type="hidden" id="activeOptionsValue" value={optionsStr} />
    </div>
  )
}

export function getActiveOptions() {
  const el = document.getElementById('activeOptionsValue')
  if (!el || !el.value) return []
  return el.value.split('、').filter(Boolean)
}
