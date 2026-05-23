import React, { useState, useMemo } from 'react'
import { addConstructionItem, updateConstructionItem, deleteConstructionItem } from '../../lib/supabase.js'

const EMPTY_ITEM = {
  category: '',
  item_name: '',
  unit_price: '',
  unit: '',
  base_notes: '',
  clickable_options: '',
  is_window_type: false,
}

export default function DatabaseManager({ items, onClose, onRefresh }) {
  const [filterCat, setFilterCat] = useState('')
  const [editingItem, setEditingItem] = useState(null)
  const [newItem, setNewItem] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const categories = useMemo(() => [...new Set(items.map(i => i.category))], [items])

  const filtered = useMemo(() => {
    if (!filterCat) return items
    return items.filter(i => i.category === filterCat)
  }, [items, filterCat])

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(''), 2500) }

  const handleSaveEdit = async () => {
    setSaving(true)
    try {
      const opts = editingItem.clickable_options_str
        ? editingItem.clickable_options_str.split(/[,，\n]/).map(s => s.trim()).filter(Boolean)
        : null
      await updateConstructionItem(editingItem.id, {
        category: editingItem.category,
        item_name: editingItem.item_name,
        unit_price: editingItem.unit_price === '' ? null : parseFloat(editingItem.unit_price),
        unit: editingItem.unit || null,
        base_notes: editingItem.base_notes || null,
        clickable_options: opts,
        is_window_type: editingItem.is_window_type || false,
      })
      setEditingItem(null)
      onRefresh()
      showMsg('儲存成功')
    } catch (e) {
      showMsg('儲存失敗：' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`確定刪除「${name}」？`)) return
    try {
      await deleteConstructionItem(id)
      onRefresh()
      showMsg('已刪除')
    } catch (e) {
      showMsg('刪除失敗：' + e.message)
    }
  }

  const handleAddNew = async () => {
    if (!newItem.category || !newItem.item_name) {
      showMsg('請填寫工程類別和項目名稱')
      return
    }
    setSaving(true)
    try {
      const opts = newItem.clickable_options
        ? newItem.clickable_options.split(/[,，\n]/).map(s => s.trim()).filter(Boolean)
        : null
      await addConstructionItem({
        category: newItem.category,
        item_name: newItem.item_name,
        unit_price: newItem.unit_price === '' ? null : parseFloat(newItem.unit_price) || null,
        unit: newItem.unit || null,
        base_notes: newItem.base_notes || null,
        clickable_options: opts,
        is_window_type: newItem.is_window_type || false,
      })
      setNewItem(null)
      onRefresh()
      showMsg('新增成功')
    } catch (e) {
      showMsg('新增失敗：' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ width: '90vw', maxWidth: 900 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 17, color: '#1565C0' }}>施工項目資料庫管理</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-blue" onClick={() => setNewItem({ ...EMPTY_ITEM })}>+ 新增項目</button>
            <button className="btn-gray" onClick={onClose}>✕ 關閉</button>
          </div>
        </div>

        {msg && <div style={{ background: '#C8E6C9', padding: '4px 10px', borderRadius: 4, marginBottom: 8, fontSize: 13 }}>{msg}</div>}

        {/* 篩選 */}
        <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>篩選類別：</label>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ minWidth: 120 }}>
            <option value="">全部</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <span style={{ fontSize: 12, color: '#888' }}>共 {filtered.length} 筆</span>
        </div>

        {/* 新增表單 */}
        {newItem && (
          <div style={{ background: '#E8F5E9', border: '1px solid #A5D6A7', borderRadius: 6, padding: 12, marginBottom: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 8, color: '#2E7D32' }}>新增施工項目</div>
            <ItemForm
              data={newItem}
              onChange={setNewItem}
              categories={categories}
              isNew
            />
            <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
              <button className="btn-blue" onClick={handleAddNew} disabled={saving}>{saving ? '新增中...' : '✓ 確認新增'}</button>
              <button className="btn-gray" onClick={() => setNewItem(null)}>取消</button>
            </div>
          </div>
        )}

        {/* 列表 */}
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: 'center' }}>項次</th>
                <th>工程類別</th>
                <th>施工項目</th>
                <th>單價</th>
                <th>單位</th>
                <th>備考</th>
                <th>窗戶類</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, index) => (
                <tr key={item.id}>
                  {editingItem?.id === item.id ? (
                    <>
                      <td style={{ textAlign: 'center', color: '#aaa' }}>{index + 1}</td>
                      <td colSpan={6}>
                        <ItemForm
                          data={editingItem}
                          onChange={setEditingItem}
                          categories={categories}
                        />
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <button className="btn-blue" onClick={handleSaveEdit} disabled={saving} style={{ fontSize: 11 }}>
                            {saving ? '...' : '儲存'}
                          </button>
                          <button className="btn-gray" onClick={() => setEditingItem(null)} style={{ fontSize: 11 }}>取消</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ textAlign: 'center', color: '#aaa' }}>{index + 1}</td>
                      <td>{item.category}</td>
                      <td style={{ fontWeight: 500 }}>{item.item_name}</td>
                      <td style={{ textAlign: 'right' }}>{item.unit_price ?? '—'}</td>
                      <td style={{ textAlign: 'center' }}>{item.unit || '—'}</td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}
                          title={item.base_notes || ''}>{item.base_notes || '—'}</td>
                      <td style={{ textAlign: 'center' }}>{item.is_window_type ? '✓' : ''}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn-yellow" onClick={() => setEditingItem({ ...item, clickable_options_str: (item.clickable_options || []).join('，') })} style={{ fontSize: 11 }}>編輯</button>
                          <button className="btn-red" onClick={() => handleDelete(item.id, item.item_name)} style={{ fontSize: 11 }}>刪除</button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ItemForm({ data, onChange, categories, isNew }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12 }}>
        <span style={{ fontWeight: 600 }}>工程類別 *</span>
        <select
          value={data.category}
          onChange={e => onChange({ ...data, category: e.target.value })}
          style={{ width: 140 }}>
          <option value="">-- 請選擇 --</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12 }}>
        <span style={{ fontWeight: 600 }}>項目名稱 *</span>
        <input value={data.item_name} onChange={e => onChange({ ...data, item_name: e.target.value })} style={{ width: 150 }} />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12 }}>
        <span style={{ fontWeight: 600 }}>單價</span>
        <input type="number" value={data.unit_price ?? ''} onChange={e => onChange({ ...data, unit_price: e.target.value })} style={{ width: 80 }} />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12 }}>
        <span style={{ fontWeight: 600 }}>單位</span>
        <input value={data.unit || ''} onChange={e => onChange({ ...data, unit: e.target.value })} style={{ width: 60 }} />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12, flex: 1, minWidth: 150 }}>
        <span style={{ fontWeight: 600 }}>備考預設值</span>
        <textarea
          value={data.base_notes || ''}
          onChange={e => onChange({ ...data, base_notes: e.target.value })}
          rows={2}
          style={{ resize: 'vertical', width: '100%' }}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12, flex: 1, minWidth: 150 }}>
        <span style={{ fontWeight: 600 }}>可點選選項（逗號分隔）</span>
        <textarea
          value={isNew ? data.clickable_options || '' : data.clickable_options_str || ''}
          onChange={e => onChange(isNew
            ? { ...data, clickable_options: e.target.value }
            : { ...data, clickable_options_str: e.target.value }
          )}
          rows={2}
          style={{ resize: 'vertical', width: '100%' }}
          placeholder="選項1，選項2，..."
        />
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, alignSelf: 'flex-end' }}>
        <input
          type="checkbox"
          checked={data.is_window_type || false}
          onChange={e => onChange({ ...data, is_window_type: e.target.checked })}
        />
        窗戶類（自動長×寬×單價）
      </label>
    </div>
  )
}
