import React, { useRef, useEffect, useState } from 'react'
import { calculateArea, calculateWindowPrice, formatNTD, formatPing, toNumber } from '../lib/calculations.js'

const UNITS = ['個', '坪', '式', '樘', '座', '口', '套', '組', '支', '台', '件', '批']
const FLOOR_OPTIONS = ['一樓', '二樓', '三樓', '四樓', '五樓', '六樓', '屋頂', '全屋']

export default function InputArea({
  inputData,
  onChange,
  onConfirm,
  selectedItem,
}) {
  const floorRef = useRef(null)
  const lengthRef = useRef(null)
  const widthRef = useRef(null)
  const heightRef = useRef(null)
  const [activeOptions, setActiveOptions] = useState([])

  // 當選中項目改變時，清除 activeOptions
  useEffect(() => {
    setActiveOptions([])
  }, [selectedItem?.id])

  // 選取新施工項目後，自動 focus 到長度欄
  useEffect(() => {
    if (selectedItem) {
      setTimeout(() => lengthRef.current?.focus(), 50)
    }
  }, [selectedItem?.id])

  // 焦點回到樓層
  useEffect(() => {
    if (inputData._focusFloor) {
      floorRef.current?.focus()
      onChange({ ...inputData, _focusFloor: false })
    }
  }, [inputData._focusFloor])

  // 全域 Tab：不在互動元件時直接跳至長度欄
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Tab') {
        const tag = document.activeElement?.tagName?.toLowerCase()
        if (!['input', 'textarea', 'select', 'button'].includes(tag)) {
          e.preventDefault()
          lengthRef.current?.focus()
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const L = toNumber(inputData.length)
  const W = toNumber(inputData.width)
  const H = toNumber(inputData.height)
  const UP = toNumber(inputData.unit_price)
  const QTY = toNumber(inputData.quantity) || 1

  // 預覽計算
  const areaPreview = (L > 0 && W > 0 && !selectedItem?.is_window_type)
    ? calculateArea(L, W, H > 0 ? H : 0)
    : []

  const windowTotal = (selectedItem?.is_window_type && L > 0 && W > 0 && UP > 0)
    ? calculateWindowPrice(L, W, UP)
    : null

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onConfirm(activeOptions)
    }
  }

  const handleFloorKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      lengthRef.current?.focus()
    }
  }

  const toggleOption = (opt) => {
    setActiveOptions(prev =>
      prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]
    )
  }

  const field = (label, key, type = 'text', extra = {}) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 11, color: '#555', fontWeight: 600 }}>{label}</span>
      <input
        type={type}
        value={inputData[key] || ''}
        onChange={e => onChange({ ...inputData, [key]: e.target.value })}
        onKeyDown={handleKeyDown}
        style={{ width: extra.width || 70, textAlign: type === 'number' ? 'right' : 'left' }}
        placeholder={extra.placeholder || ''}
        ref={extra.ref || undefined}
        tabIndex={extra.tabIndex}
        step={extra.step}
        min={extra.min}
      />
    </label>
  )

  return (
    <div style={{ background: '#fff8e1', border: '1px solid #F9A825', borderLeft: 'none', borderRight: 'none', padding: '8px 10px' }}>
      {/* 選中項目名稱 */}
      {selectedItem && (
        <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#1565C0' }}>
          已選：{selectedItem.item_name}
          {selectedItem.is_window_type && <span style={{ color: '#E65100', marginLeft: 6, fontSize: 12 }}>（窗戶類：長×寬×單價）</span>}
        </div>
      )}

      {/* 輸入列 */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        {/* 施工位置/樓層 改為 select 下拉 */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 11, color: '#555', fontWeight: 600 }}>施工位置/樓層</span>
          <select
            ref={floorRef}
            value={inputData.floor_location || ''}
            onChange={e => onChange({ ...inputData, floor_location: e.target.value })}
            onKeyDown={handleFloorKeyDown}
            style={{ width: 90 }}
          >
            <option value=""></option>
            {FLOOR_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 11, color: '#555', fontWeight: 600 }}>長度(cm)</span>
          <input
            type="number"
            value={inputData.length || ''}
            onChange={e => onChange({ ...inputData, length: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onConfirm(activeOptions) } }}
            ref={lengthRef}
            tabIndex={2}
            style={{ width: 80, textAlign: 'right' }}
            min={0}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 11, color: '#555', fontWeight: 600 }}>寬度(cm)</span>
          <input
            type="number"
            value={inputData.width || ''}
            onChange={e => onChange({ ...inputData, width: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onConfirm(activeOptions) } }}
            ref={widthRef}
            tabIndex={3}
            style={{ width: 80, textAlign: 'right' }}
            min={0}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 11, color: '#555', fontWeight: 600 }}>高度(cm)</span>
          <input
            type="number"
            value={inputData.height || ''}
            onChange={e => onChange({ ...inputData, height: e.target.value })}
            onKeyDown={handleKeyDown}
            ref={heightRef}
            tabIndex={4}
            style={{ width: 80, textAlign: 'right' }}
            placeholder="可不填"
            min={0}
          />
        </label>

        {field('數量', 'quantity', 'number', { width: 60, min: 0, tabIndex: 5 })}
        {field('單價', 'unit_price', 'number', { width: 90, min: 0, tabIndex: 6 })}

        <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 11, color: '#555', fontWeight: 600 }}>單位</span>
          <select
            value={inputData.unit || ''}
            onChange={e => onChange({ ...inputData, unit: e.target.value })}
            onKeyDown={handleKeyDown}
            style={{ width: 60 }}
          >
            <option value="">--</option>
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          <span style={{ fontSize: 11, color: '#555', fontWeight: 600 }}>備考</span>
          <input
            type="text"
            value={inputData.notes || ''}
            onChange={e => onChange({ ...inputData, notes: e.target.value })}
            onKeyDown={handleKeyDown}
            style={{ minWidth: 80, maxWidth: 200 }}
            placeholder="備考說明"
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 11, color: '#888', fontWeight: 600 }}>材料備注</span>
          <input
            type="text"
            value={inputData.extra_notes || ''}
            onChange={e => onChange({ ...inputData, extra_notes: e.target.value })}
            onKeyDown={handleKeyDown}
            style={{ minWidth: 80, maxWidth: 160 }}
            placeholder="材料清單用"
          />
        </label>

        <button
          className="btn-blue"
          onClick={() => onConfirm(activeOptions)}
          style={{ padding: '6px 18px', alignSelf: 'flex-end', fontSize: 14 }}
        >
          ✓ 確認 (Enter)
        </button>
      </div>

      {/* 可點選備考選項 */}
      {selectedItem?.clickable_options && selectedItem.clickable_options.length > 0 && (
        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
          <span style={{ fontSize: 11, color: '#888', marginRight: 4 }}>備考選項（點選追加）：</span>
          {selectedItem.clickable_options.map(opt => (
            <button
              key={opt}
              className={`option-chip ${activeOptions.includes(opt) ? 'active' : ''}`}
              onClick={() => toggleOption(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* 預覽計算 */}
      {areaPreview.length > 0 && (
        <div style={{ marginTop: 6, background: '#E3F2FD', borderRadius: 4, padding: '4px 8px', fontSize: 12 }}>
          {H > 0 ? (
            <>
              <span style={{ fontWeight: 600, color: '#1565C0' }}>四面牆預覽：</span>
              {areaPreview.map((f, i) => (
                <span key={i} style={{ marginLeft: 8, color: f.isWallTotal ? '#E65100' : '#333', fontWeight: f.isWallTotal ? 700 : 400 }}>
                  {f.label}：{formatPing(f.isWallTotal ? f.ping * QTY : f.ping)} 坪
                  {i < areaPreview.length - 1 && !f.isWallTotal && ' |'}
                </span>
              ))}
              {QTY > 1 && <span style={{ marginLeft: 8, color: '#888' }}>×{QTY} 間</span>}
            </>
          ) : (
            <span>
              <span style={{ fontWeight: 600, color: '#1565C0' }}>面積：</span>
              {formatPing(areaPreview[0].ping)} 坪
              {QTY > 1 && <span style={{ color: '#888' }}> ×{QTY} = {formatPing(areaPreview[0].ping * QTY)} 坪</span>}
              {UP > 0 && <span style={{ marginLeft: 8, color: '#E65100' }}>小計：{formatNTD(areaPreview[0].ping * QTY * UP)} 元</span>}
            </span>
          )}
        </div>
      )}

      {windowTotal !== null && (
        <div style={{ marginTop: 6, background: '#FFF3E0', borderRadius: 4, padding: '4px 8px', fontSize: 12 }}>
          <span style={{ fontWeight: 600, color: '#E65100' }}>窗戶總價：</span>
          {L} × {W} × {UP} = <strong>{formatNTD(windowTotal)}</strong> 元
          {QTY > 1 && <span style={{ marginLeft: 8, color: '#888' }}>×{QTY} = <strong>{formatNTD(windowTotal * QTY)}</strong> 元（合計）</span>}
        </div>
      )}
    </div>
  )
}
