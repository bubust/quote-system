import React from 'react'

export default function TopBar({
  onNew,
  onOpen,
  onSave,
  onSaveToFile,
  onOpenFromFile,
  onRename,
  onDatabase,
  onTransport,
  onCompanySettings,
  onExport,
  onMaterialList,
  onDemolition,
  projectName,
  isSaving,
}) {
  return (
    <div style={{ background: '#FFF176', borderBottom: '2px solid #F9A825', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
      <span style={{ fontWeight: 700, fontSize: 16, color: '#1565C0', marginRight: 8 }}>
        工程報價系統
      </span>

      <button className="btn-yellow" onClick={onNew}>
        📄 新建案
      </button>
      <button className="btn-yellow" onClick={onOpen}>
        📋 專案清單
      </button>
      <button className="btn-blue" onClick={onSave} disabled={isSaving} title="Ctrl+S">
        {isSaving ? '儲存中...' : '💾 儲存'}
      </button>
      <button className="btn-green" onClick={onSaveToFile} disabled={isSaving} title="存到指定位置的 JSON 檔">
        📁 存到檔案
      </button>
      <button className="btn-green" onClick={onOpenFromFile} title="從本機 JSON 檔載入">
        📂 從檔案開啟
      </button>
      <button className="btn-yellow" onClick={onRename}>
        ✏️ 重新命名
      </button>

      <div style={{ width: 1, height: 24, background: '#F9A825', margin: '0 4px' }} />

      <button className="btn-yellow" onClick={onMaterialList}>
        📦 材料清單
      </button>
      <button className="btn-yellow" onClick={onDemolition}>
        🔨 拆除計算
      </button>
      <button className="btn-yellow" onClick={onTransport}>
        🚛 搬運費計算
      </button>

      <div style={{ width: 1, height: 24, background: '#F9A825', margin: '0 4px' }} />

      <button className="btn-blue" onClick={onExport}>
        📤 匯出
      </button>

      <div style={{ width: 1, height: 24, background: '#F9A825', margin: '0 4px' }} />

      <button className="btn-yellow" onClick={onDatabase}>
        🗄️ 資料庫管理
      </button>
      <button className="btn-yellow" onClick={onCompanySettings}>
        🏢 公司設定
      </button>

      {projectName && (
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#555', fontStyle: 'italic' }}>
          目前案件：<strong style={{ color: '#1565C0' }}>{projectName}</strong>
        </span>
      )}
    </div>
  )
}
