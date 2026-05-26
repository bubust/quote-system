import React, { useState, useEffect, useCallback } from 'react'
import {
  getConstructionItems,
  seedInitialData,
  createQuote,
  saveQuote,
  loadQuote,
  addQuoteItem,
  updateQuoteItem,
  deleteQuoteItem,
  getCompanySettings,
  INITIAL_CONSTRUCTION_ITEMS,
  saveQuoteToLocal,
  listLocalQuotes,
  loadLocalQuote,
} from './lib/supabase.js'
import { saveProjectToFile, loadProjectFromFile } from './lib/fileStorage.js'
import { calculateArea, calculateWindowPrice, toNumber, formatPing } from './lib/calculations.js'

import TopBar from './components/TopBar.jsx'
import ProjectInfo from './components/ProjectInfo.jsx'
import ItemSelector, { getActiveOptions } from './components/ItemSelector.jsx'
import InputArea from './components/InputArea.jsx'
import QuoteDisplay from './components/QuoteDisplay.jsx'
import DatabaseManager from './components/modals/DatabaseManager.jsx'
import TransportCalc from './components/modals/TransportCalc.jsx'
import CompanySettings from './components/modals/CompanySettings.jsx'
import ExportModal from './components/modals/ExportModal.jsx'
import QuoteList from './components/modals/QuoteList.jsx'
import DemolitionCalc from './components/modals/DemolitionCalc.jsx'
import MaterialList from './components/modals/MaterialList.jsx'
import PlumbingCalc from './components/modals/PlumbingCalc.jsx'

const EMPTY_PROJECT = { project_name: '', address: '', renovation_type: '' }
const EMPTY_INPUT = {
  floor_location: '',
  length: '',
  width: '',
  height: '',
  quantity: '1',
  unit_price: '',
  unit: '',
  notes: '',
  extra_notes: '',
  _focusFloor: false,
}

export default function App() {
  // ── 主要狀態 ───────────────────────────────────────────────────
  const [currentQuote, setCurrentQuote] = useState(null) // { id, project_name, address, renovation_type }
  const [projectData, setProjectData] = useState(EMPTY_PROJECT)
  const [quoteItems, setQuoteItems] = useState([])
  const [constructionItems, setConstructionItems] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  const [inputData, setInputData] = useState(EMPTY_INPUT)
  const [companyInfo, setCompanyInfo] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [statusMsg, setStatusMsg] = useState('')

  // ── Modal 狀態 ─────────────────────────────────────────────────
  const [showDatabase, setShowDatabase] = useState(false)
  const [showTransport, setShowTransport] = useState(false)
  const [showCompanySettings, setShowCompanySettings] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showQuoteList, setShowQuoteList] = useState(false)
  const [showMaterialList, setShowMaterialList] = useState(false)
  const [showDemolition, setShowDemolition] = useState(false)
  const [showPlumbing, setShowPlumbing] = useState(false)

  // ── 初始化 ─────────────────────────────────────────────────────
  useEffect(() => {
    initApp()
    // Ctrl+S 儲存快捷鍵
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const initApp = async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      // 先載入公司設定
      try {
        const co = await getCompanySettings()
        setCompanyInfo(co)
      } catch (e) {
        console.warn('公司設定載入失敗（可能尚未初始化）', e.message)
      }

      // 確保初始資料存在
      try {
        await seedInitialData()
      } catch (e) {
        console.warn('初始資料 seed 失敗（可能尚未設定 Supabase）', e.message)
      }

      // 載入施工項目（Supabase 失敗則用本機備用資料）
      try {
        const items = await getConstructionItems()
        if (items && items.length > 0) {
          setConstructionItems(items)
        } else {
          // Supabase 無資料或未設定，使用本機預設資料
          setConstructionItems(INITIAL_CONSTRUCTION_ITEMS.map((item, i) => ({
            ...item, id: item.id || `local_${i}`
          })))
        }
      } catch (e) {
        console.warn('施工項目載入失敗，使用本機資料', e.message)
        setConstructionItems(INITIAL_CONSTRUCTION_ITEMS.map((item, i) => ({
          ...item, id: `local_${i}`
        })))
      }
    } catch (e) {
      setLoadError('初始化失敗：' + e.message)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshConstructionItems = async () => {
    try {
      const items = await getConstructionItems()
      setConstructionItems(items || [])
    } catch (e) {
      showStatus('施工項目重新載入失敗：' + e.message)
    }
  }

  const showStatus = (msg, timeout = 3000) => {
    setStatusMsg(msg)
    setTimeout(() => setStatusMsg(''), timeout)
  }

  // ── 新建案 ─────────────────────────────────────────────────────
  const handleNew = () => {
    if (quoteItems.length > 0 && !window.confirm('新建案將清除目前未儲存的資料，確定繼續？')) return
    setCurrentQuote(null)
    setProjectData(EMPTY_PROJECT)
    setQuoteItems([])
    setSelectedCategory('')
    setSelectedItem(null)
    setInputData(EMPTY_INPUT)
    showStatus('新建案已建立')
  }

  // ── 儲存（含 localStorage fallback）───────────────────────────
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const quote = await saveQuote(
        { ...projectData, id: currentQuote?.id },
        quoteItems
      )
      setCurrentQuote(quote)
      showStatus('儲存成功 ✓ (雲端)')
    } catch (e) {
      // 本地備用
      try {
        const localQuote = saveQuoteToLocal(
          { ...projectData, id: currentQuote?.id },
          quoteItems
        )
        setCurrentQuote(localQuote)
        showStatus('儲存成功 ✓ (本機)')
      } catch (e2) {
        showStatus('儲存失敗：' + e2.message)
      }
    } finally {
      setIsSaving(false)
    }
  }, [projectData, currentQuote, quoteItems])

  // ── 存到本機檔案 ────────────────────────────────────────────────
  const handleSaveToFile = async () => {
    setIsSaving(true)
    try {
      const result = await saveProjectToFile(
        { ...projectData, id: currentQuote?.id },
        quoteItems
      )
      if (result) showStatus(`已存到檔案：${result}`)
    } catch (e) {
      showStatus('存檔失敗：' + e.message)
    } finally {
      setIsSaving(false)
    }
  }

  // ── 從本機檔案載入 ──────────────────────────────────────────────
  const handleOpenFromFile = async () => {
    if (quoteItems.length > 0 && !window.confirm('從檔案載入將覆蓋目前未儲存的資料，確定繼續？')) return
    try {
      const data = await loadProjectFromFile()
      if (!data) return
      const q = data.quote || {}
      setCurrentQuote({ id: q.id || null })
      setProjectData({
        project_name: q.project_name || '',
        address: q.address || '',
        renovation_type: q.renovation_type || '',
      })
      setQuoteItems(data.items || [])
      setSelectedCategory('')
      setSelectedItem(null)
      setInputData(EMPTY_INPUT)
      showStatus(`已從檔案載入：${q.project_name || '未命名'}`)
    } catch (e) {
      showStatus('載入失敗：' + e.message)
    }
  }

  // ── 重新命名 ────────────────────────────────────────────────────
  const handleRename = async () => {
    const newName = window.prompt('請輸入新案名：', projectData.project_name || '')
    if (newName === null) return
    setProjectData(p => ({ ...p, project_name: newName.trim() }))
    showStatus('案名已更新（請記得儲存）')
  }

  // ── 開啟舊案（含 localStorage fallback）────────────────────────
  const handleOpenQuote = async (id) => {
    try {
      const { quote, items } = await loadQuote(id)
      setCurrentQuote(quote)
      setProjectData({
        project_name: quote.project_name,
        address: quote.address,
        renovation_type: quote.renovation_type,
      })
      setQuoteItems(items || [])
      showStatus(`已開啟：${quote.project_name || '未命名'}`)
    } catch (e) {
      // fallback 到本地
      try {
        const local = loadLocalQuote(id)
        if (local) {
          setCurrentQuote(local.quote)
          setProjectData({
            project_name: local.quote.project_name,
            address: local.quote.address,
            renovation_type: local.quote.renovation_type,
          })
          setQuoteItems(local.items || [])
          showStatus(`已開啟（本機）：${local.quote.project_name || '未命名'}`)
        } else {
          showStatus('開啟失敗：' + e.message)
        }
      } catch (e2) {
        showStatus('開啟失敗：' + e.message)
      }
    }
  }

  // ── 選擇施工項目 ────────────────────────────────────────────────
  const handleItemSelect = (item) => {
    setSelectedItem(item)
    setInputData(prev => ({
      ...prev,
      unit_price: item.unit_price != null ? String(item.unit_price) : '',
      unit: item.unit || '',
      notes: item.base_notes || '',
    }))
  }

  // ── 確認新增一筆明細 ────────────────────────────────────────────
  const handleConfirm = async (activeOptionsArg) => {
    const activeOptions = activeOptionsArg && activeOptionsArg.length > 0
      ? activeOptionsArg
      : getActiveOptions()
    if (!selectedItem) {
      alert('請先選擇施工項目')
      return
    }

    const L = toNumber(inputData.length)
    const W = toNumber(inputData.width)
    const H = toNumber(inputData.height)
    const UP = toNumber(inputData.unit_price)
    const QTY = toNumber(inputData.quantity) || 1

    // qId 必須在合併判斷前宣告（避免 TDZ 錯誤）
    let qId = currentQuote?.id

    // 備考：加上 activeOptions
    let notes = inputData.notes || ''
    if (activeOptions && activeOptions.length > 0) {
      const optStr = activeOptions.join('、')
      notes = notes ? notes + ' ' + optStr : optStr
    }

    let newItems = []

    if (selectedItem.is_window_type && L > 0 && W > 0) {
      // 窗戶類：長×寬×單價
      const totalPer = calculateWindowPrice(L, W, UP)
      newItems = [{
        work_type: selectedItem.category,
        item_name: selectedItem.item_name,
        floor_location: inputData.floor_location,
        unit_price: UP,
        quantity: QTY,
        unit: inputData.unit || selectedItem.unit || '',
        total_price: totalPer * QTY,
        notes: notes || `尺寸：${L}*${W} 公分`,
        length_cm: L,
        width_cm: W,
        height_cm: 0,
        is_sub_item: false,
        extra_notes: inputData.extra_notes || '',
      }]
    } else if (L > 0 && W > 0) {
      // 面積計算
      const areas = calculateArea(L, W, H)

      if (H > 0) {
        // 四面牆：5 行（4個面 + 1個小計），預先產生 parentId
        const parentId = crypto.randomUUID ? crypto.randomUUID() : `local_${Date.now()}_wall`
        newItems = areas.map((face) => {
          const isTotal = face.isWallTotal
          return {
            id: isTotal ? parentId : (crypto.randomUUID ? crypto.randomUUID() : `local_${Date.now()}_face`),
            work_type: selectedItem.category,
            item_name: isTotal
              ? `${selectedItem.item_name}（四面牆合計）`
              : `${selectedItem.item_name} ${face.label}`,
            floor_location: inputData.floor_location,
            unit_price: UP,
            quantity: isTotal ? formatPing(face.ping) * QTY : formatPing(face.ping),
            unit: '坪',
            total_price: isTotal ? formatPing(face.ping) * UP * QTY : formatPing(face.ping) * UP,
            notes: isTotal && QTY > 1 ? (face.note ? `${face.note} ×${QTY}間` : `×${QTY}間`) : face.note,
            length_cm: L,
            width_cm: W,
            height_cm: H,
            is_sub_item: !isTotal,
            parent_id: isTotal ? null : parentId,
            extra_notes: inputData.extra_notes || '',
          }
        })
      } else {
        // 單一面積：parent + sub-item 記錄尺寸
        const ping = formatPing(areas[0].ping)
        const parentId = crypto.randomUUID ? crypto.randomUUID() : `local_${Date.now()}_0`
        newItems = [
          {
            id: parentId,
            work_type: selectedItem.category,
            item_name: selectedItem.item_name,
            floor_location: inputData.floor_location,
            unit_price: UP,
            quantity: ping * QTY,
            unit: '坪',
            total_price: ping * UP * QTY,
            notes: notes || areas[0].note,
            length_cm: L,
            width_cm: W,
            height_cm: 0,
            is_sub_item: false,
            extra_notes: inputData.extra_notes || '',
          },
          {
            id: crypto.randomUUID ? crypto.randomUUID() : `local_${Date.now()}_1`,
            work_type: selectedItem.category,
            item_name: `長${L}×寬${W}cm`,
            floor_location: inputData.floor_location,
            unit_price: UP,
            quantity: ping,
            unit: '坪',
            total_price: ping * UP * QTY,
            notes: QTY > 1 ? `×${QTY}間` : '',
            length_cm: L,
            width_cm: W,
            height_cm: 0,
            is_sub_item: true,
            parent_id: parentId,
            extra_notes: inputData.extra_notes || '',
          },
        ]
      }
    } else {
      // 純數量
      newItems = [{
        work_type: selectedItem.category,
        item_name: selectedItem.item_name,
        floor_location: inputData.floor_location,
        unit_price: UP,
        quantity: QTY,
        unit: inputData.unit || selectedItem.unit || '',
        total_price: UP * QTY,
        notes: notes,
        length_cm: L || null,
        width_cm: W || null,
        height_cm: H || null,
        is_sub_item: false,
        extra_notes: inputData.extra_notes || '',
      }]
    }

    // 砌磚同樓層合併
    if (selectedItem.item_name?.includes('砌磚') && newItems.length > 0) {
      const ni = newItems[0]
      const existing = quoteItems.find(
        i => i.item_name === ni.item_name &&
             i.floor_location === ni.floor_location &&
             !i.is_sub_item
      )
      if (existing) {
        const newQty = Math.round((toNumber(existing.quantity) + toNumber(ni.quantity)) * 100) / 100
        const newTotal = Math.round((toNumber(existing.total_price) + toNumber(ni.total_price)) * 100) / 100
        await handleUpdateItem(existing.id, { quantity: newQty, total_price: newTotal })

        // 保留本次尺寸記錄為子項
        if (newItems.length > 1) {
          const subItem = {
            ...newItems[1],
            parent_id: existing.id,
            id: crypto.randomUUID ? crypto.randomUUID() : `local_${Date.now()}_sub`,
            quote_id: qId,
            sort_order: quoteItems.length,
          }
          setQuoteItems(prev => [...prev, subItem])
          if (qId) {
            try { await addQuoteItem({ ...subItem, quote_id: qId }) } catch (e) { console.warn('sub-item save failed:', e.message) }
          }
        }

        setInputData({
          ...EMPTY_INPUT,
          floor_location: inputData.floor_location,
          unit_price: inputData.unit_price,
          unit: inputData.unit,
          notes: selectedItem?.base_notes || '',
          _focusFloor: false,
        })
        return
      }
    }

    // 確保有 quote_id，如果沒有就先建立案件
    if (!qId) {
      try {
        const newQuote = await createQuote({
          project_name: projectData.project_name || '新案件',
          address: projectData.address || '',
          renovation_type: projectData.renovation_type || '',
        })
        setCurrentQuote(newQuote)
        qId = newQuote.id
      } catch (e) {
        console.error('建立案件失敗', e)
        // 本地模式：不強制儲存
      }
    }

    // 加入估價單（本地 + 自動儲存到 Supabase）
    const localItems = newItems.map((item, idx) => ({
      ...item,
      id: item.id || (crypto.randomUUID ? crypto.randomUUID() : `local_${Date.now()}_${idx}`),
      quote_id: qId,
      sort_order: quoteItems.length + idx,
    }))

    setQuoteItems(prev => [...prev, ...localItems])

    // 自動儲存到 Supabase
    if (qId) {
      for (const item of localItems) {
        try {
          await addQuoteItem({ ...item, quote_id: qId })
        } catch (e) {
          console.warn('Auto-save item failed:', e.message)
        }
      }
    }

    // 重置輸入
    setInputData({
      ...EMPTY_INPUT,
      floor_location: inputData.floor_location, // 保留樓層
      unit_price: inputData.unit_price, // 保留單價
      unit: inputData.unit, // 保留單位
      notes: selectedItem?.base_notes || '',
      extra_notes: '',
      _focusFloor: true,
    })
  }

  // ── 更新估價單明細 ──────────────────────────────────────────────
  const handleUpdateItem = async (id, updates) => {
    setQuoteItems(prev => prev.map(item =>
      item.id === id ? { ...item, ...updates } : item
    ))
    try {
      await updateQuoteItem(id, updates)
    } catch (e) {
      console.warn('Update item failed:', e.message)
    }
  }

  // ── 刪除估價單明細 ──────────────────────────────────────────────
  const handleDeleteItem = async (id) => {
    setQuoteItems(prev => prev.filter(item => item.id !== id))
    try {
      await deleteQuoteItem(id)
    } catch (e) {
      console.warn('Delete item failed:', e.message)
    }
  }

  // ── 複製估價單明細（含子項目） ──────────────────────────────────
  const handleDuplicateItem = async (id) => {
    const item = quoteItems.find(i => i.id === id)
    if (!item) return
    const qId = currentQuote?.id
    const newParentId = crypto.randomUUID ? crypto.randomUUID() : `local_dup_${Date.now()}`
    const subItems = quoteItems.filter(i => i.parent_id === id)
    const newParent = { ...item, id: newParentId, quote_id: qId }
    const newSubs = subItems.map((sub, idx) => ({
      ...sub,
      id: crypto.randomUUID ? crypto.randomUUID() : `local_dup_sub_${Date.now()}_${idx}`,
      parent_id: newParentId,
      quote_id: qId,
    }))
    setQuoteItems(prev => {
      const idx = prev.findIndex(i => i.id === id)
      let insertAt = idx + 1
      while (insertAt < prev.length && prev[insertAt].parent_id === id) insertAt++
      const arr = [...prev]
      arr.splice(insertAt, 0, newParent, ...newSubs)
      return arr
    })
    if (qId) {
      try { await addQuoteItem({ ...newParent, quote_id: qId }) } catch (e) { console.warn(e.message) }
      for (const sub of newSubs) {
        try { await addQuoteItem({ ...sub, quote_id: qId }) } catch (e) { console.warn(e.message) }
      }
    }
  }

  // ── 移動估價單明細 ──────────────────────────────────────────────
  const handleMoveItem = (id, direction) => {
    setQuoteItems(prev => {
      const idx = prev.findIndex(i => i.id === id)
      if (idx < 0) return prev
      const newIdx = idx + direction
      if (newIdx < 0 || newIdx >= prev.length) return prev
      const arr = [...prev]
      ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
      return arr
    })
  }

  // ── 移動整個大項目（連同所有子項一起） ──────────────────────────
  const handleMoveCategory = (cat, direction) => {
    setQuoteItems(prev => {
      const catOrder = []
      const catMap = {}
      prev.forEach(item => {
        const c = item.work_type || '其他'
        if (!catMap[c]) { catMap[c] = []; catOrder.push(c) }
        catMap[c].push(item)
      })
      const idx = catOrder.indexOf(cat)
      const newIdx = idx + direction
      if (newIdx < 0 || newIdx >= catOrder.length) return prev
      const newOrder = [...catOrder]
      ;[newOrder[idx], newOrder[newIdx]] = [newOrder[newIdx], newOrder[idx]]
      return newOrder.flatMap(c => catMap[c])
    })
  }

  // ── 搬運費/拆除費/材料費新增到估價單 ──────────────────────────
  const handleAddTransportItems = async (items) => {
    const qId = currentQuote?.id
    const localItems = items.map((item, idx) => ({
      ...item,
      id: crypto.randomUUID ? crypto.randomUUID() : `local_transport_${Date.now()}_${idx}`,
      quote_id: qId,
      sort_order: quoteItems.length + idx,
    }))
    setQuoteItems(prev => [...prev, ...localItems])

    if (qId) {
      for (const item of localItems) {
        try {
          await addQuoteItem({ ...item, quote_id: qId })
        } catch (e) {
          console.warn('Transport item save failed:', e.message)
        }
      }
    }
  }

  // ── 渲染 ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 18, color: '#1565C0', fontWeight: 600 }}>工程報價系統</div>
        <div style={{ color: '#888' }}>初始化中，請稍候...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* 功能列 */}
      <TopBar
        onNew={handleNew}
        onOpen={() => setShowQuoteList(true)}
        onSave={handleSave}
        onSaveToFile={handleSaveToFile}
        onOpenFromFile={handleOpenFromFile}
        onRename={handleRename}
        onDatabase={() => setShowDatabase(true)}
        onTransport={() => setShowTransport(true)}
        onCompanySettings={() => setShowCompanySettings(true)}
        onExport={() => setShowExport(true)}
        onMaterialList={() => setShowMaterialList(true)}
        onDemolition={() => setShowDemolition(true)}
        onPlumbing={() => setShowPlumbing(true)}
        projectName={projectData.project_name}
        isSaving={isSaving}
      />

      {/* 狀態訊息 */}
      {(statusMsg || loadError) && (
        <div style={{
          background: loadError ? '#FFEBEE' : '#E8F5E9',
          padding: '3px 12px',
          fontSize: 12,
          color: loadError ? '#c62828' : '#2e7d32',
          borderBottom: '1px solid #e0e0e0',
        }}>
          {loadError || statusMsg}
          {loadError && (
            <span style={{ marginLeft: 8, fontSize: 11, color: '#888' }}>
              （請先完成 Supabase 設定，詳見 SETUP.md）
            </span>
          )}
        </div>
      )}

      {/* 案件資訊列 */}
      <ProjectInfo projectData={projectData} onChange={setProjectData} />

      {/* 施工工程選擇 + 項目按鈕 */}
      <ItemSelector
        constructionItems={constructionItems}
        selectedCategory={selectedCategory}
        onCategoryChange={(cat) => {
          setSelectedCategory(cat)
          setSelectedItem(null)
          setInputData(EMPTY_INPUT)
        }}
        selectedItem={selectedItem}
        onItemSelect={handleItemSelect}
        quoteItems={quoteItems}
        onItemAdded={(localItem) => {
          if (localItem) {
            // Supabase 失敗，直接加到本地清單
            setConstructionItems(prev => [...prev, { ...localItem, id: 'local_' + Date.now() }])
          } else {
            refreshConstructionItems()
          }
        }}
      />

      {/* 輸入列 */}
      <InputArea
        inputData={inputData}
        onChange={setInputData}
        onConfirm={handleConfirm}
        selectedItem={selectedItem}
      />

      {/* 估價單顯示區 */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>
        <div style={{
          background: '#1565C0',
          color: 'white',
          padding: '4px 10px',
          fontSize: 13,
          fontWeight: 600,
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <span>估價單</span>
          <span style={{ fontSize: 12, opacity: 0.9 }}>
            共 {quoteItems.length} 筆 | 點擊儲存格可直接編輯
          </span>
        </div>
        <QuoteDisplay
          items={quoteItems}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
          onMoveItem={handleMoveItem}
          onMoveCategory={handleMoveCategory}
          onDuplicateItem={handleDuplicateItem}
        />
      </div>

      {/* Modals */}
      {showDatabase && (
        <DatabaseManager
          items={constructionItems}
          onClose={() => setShowDatabase(false)}
          onRefresh={refreshConstructionItems}
        />
      )}
      {showTransport && (
        <TransportCalc
          onClose={() => setShowTransport(false)}
          onAddToQuote={handleAddTransportItems}
          quoteItems={quoteItems}
        />
      )}
      {showCompanySettings && (
        <CompanySettings
          onClose={() => setShowCompanySettings(false)}
          onUpdate={(data) => setCompanyInfo(data)}
        />
      )}
      {showExport && (
        <ExportModal
          quoteData={{ ...projectData, id: currentQuote?.id }}
          items={quoteItems}
          companyInfo={companyInfo}
          onClose={() => setShowExport(false)}
        />
      )}
      {showQuoteList && (
        <QuoteList
          onClose={() => setShowQuoteList(false)}
          onOpen={handleOpenQuote}
          onOpenFileData={(data) => {
            const q = data.quote || {}
            setCurrentQuote({ id: q.id || null })
            setProjectData({
              project_name: q.project_name || '',
              address: q.address || '',
              renovation_type: q.renovation_type || '',
            })
            setQuoteItems(data.items || [])
            setSelectedCategory('')
            setSelectedItem(null)
            setInputData(EMPTY_INPUT)
            showStatus(`已載入：${q.project_name || '未命名'}`)
            setShowQuoteList(false)
          }}
        />
      )}
      {showMaterialList && (
        <MaterialList
          items={quoteItems}
          onClose={() => setShowMaterialList(false)}
          onAddToQuote={handleAddTransportItems}
        />
      )}
      {showDemolition && (
        <DemolitionCalc
          onClose={() => setShowDemolition(false)}
          onAddToQuote={handleAddTransportItems}
        />
      )}
      {showPlumbing && (
        <PlumbingCalc
          onClose={() => setShowPlumbing(false)}
          onAddToQuote={handleAddTransportItems}
        />
      )}
    </div>
  )
}
