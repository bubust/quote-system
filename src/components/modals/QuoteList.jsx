import React, { useState, useEffect } from 'react'
import { listQuotes, renameQuote, deleteQuote, listLocalQuotes, loadLocalQuote, deleteLocalQuote, saveQuote } from '../../lib/supabase.js'
import { getRecentFileProjects, removeRecentFile, loadProjectFromFile } from '../../lib/fileStorage.js'

export default function QuoteList({ onClose, onOpen, onOpenFileData }) {
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [renamingId, setRenamingId] = useState(null)
  const [renameVal, setRenameVal] = useState('')
  const [msg, setMsg] = useState('')
  const [isLocal, setIsLocal] = useState(false)
  const [localQuotes, setLocalQuotes] = useState([])
  const [recentFiles, setRecentFiles] = useState([])
  const [activeTab, setActiveTab] = useState('cloud') // 'cloud' | 'file'
  const [uploading, setUploading] = useState({})

  useEffect(() => {
    loadList()
    setRecentFiles(getRecentFileProjects())
    setLocalQuotes(listLocalQuotes())
  }, [])

  const loadList = async () => {
    setLoading(true)
    try {
      const data = await listQuotes()
      setQuotes(data || [])
      setIsLocal(false)
    } catch (e) {
      // fallback 到 localStorage
      try {
        const localData = listLocalQuotes()
        setQuotes(localData || [])
        setIsLocal(true)
        if (localData.length === 0) {
          setMsg('（雲端連線失敗，顯示本機儲存案件）')
        } else {
          setMsg('雲端連線失敗，顯示本機儲存案件')
        }
      } catch (e2) {
        setMsg('載入失敗：' + e.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleUploadToCloud = async (localId) => {
    setUploading(prev => ({ ...prev, [localId]: true }))
    try {
      const entry = loadLocalQuote(localId)
      if (!entry) throw new Error('找不到本機資料')
      const { quote, items } = entry
      // 上傳到雲端（不帶原本的 local_ id，讓 Supabase 產生新 uuid）
      const { id: _drop, ...quoteData } = quote
      await saveQuote(quoteData, items.map(({ id: _i, quote_id: _q, ...rest }) => rest))
      // 刪除本機
      deleteLocalQuote(localId)
      setLocalQuotes(listLocalQuotes())
      loadList()
      setMsg(`「${quote.project_name || '未命名'}」已上傳到雲端並從本機移除`)
    } catch (e) {
      setMsg('上傳失敗：' + e.message)
    } finally {
      setUploading(prev => ({ ...prev, [localId]: false }))
    }
  }

  const handleRename = async (id) => {
    if (!renameVal.trim()) return
    if (isLocal) {
      // 本地模式：直接修改 localStorage
      setMsg('本機模式不支援重新命名，請開啟案件後另存')
      setRenamingId(null)
      return
    }
    try {
      await renameQuote(id, renameVal.trim())
      setRenamingId(null)
      setRenameVal('')
      loadList()
      setMsg('重命名成功')
    } catch (e) {
      setMsg('失敗：' + e.message)
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`確定刪除「${name}」？此操作無法復原！`)) return
    if (isLocal) {
      setMsg('本機模式不支援刪除，請至瀏覽器 localStorage 手動清除')
      return
    }
    try {
      await deleteQuote(id)
      loadList()
      setMsg('已刪除')
    } catch (e) {
      setMsg('刪除失敗：' + e.message)
    }
  }

  const fmtDate = (d) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('zh-TW', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const handleOpenFile = async (fileName) => {
    try {
      const data = await loadProjectFromFile()
      if (!data) return
      onOpenFileData(data)
      onClose()
    } catch (e) {
      setMsg('載入失敗：' + e.message)
    }
  }

  const handleRemoveRecentFile = (fileName, e) => {
    e.stopPropagation()
    removeRecentFile(fileName)
    setRecentFiles(getRecentFileProjects())
  }

  const TAB_STYLE = (active) => ({
    padding: '5px 16px',
    color: active ? '#1565C0' : '#666',
    fontWeight: active ? 700 : 400,
    cursor: 'pointer',
    fontSize: 13,
    background: 'none',
    border: 'none',
    borderBottom: active ? '2px solid #1565C0' : '2px solid transparent',
  })

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ width: 720 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 17, color: '#1565C0' }}>
            專案清單
            {isLocal && <span style={{ fontSize: 12, color: '#E65100', marginLeft: 8 }}>（本機模式）</span>}
          </h2>
          <button className="btn-gray" onClick={onClose}>✕ 關閉</button>
        </div>

        {/* 分頁標籤 */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0', marginBottom: 12, gap: 0 }}>
          <button style={TAB_STYLE(activeTab === 'cloud')} onClick={() => setActiveTab('cloud')}>
            💾 雲端 / 本機儲存 ({quotes.length})
          </button>
          <button style={TAB_STYLE(activeTab === 'file')} onClick={() => setActiveTab('file')}>
            📁 檔案紀錄 ({recentFiles.length})
          </button>
        </div>

        {msg && (
          <div style={{ background: '#FFF3E0', padding: '4px 10px', borderRadius: 4, marginBottom: 8, fontSize: 13, color: '#E65100' }}>
            {msg}
          </div>
        )}

        {/* 雲端/本機清單 */}
        {activeTab === 'cloud' && (
          loading ? (
            <div style={{ textAlign: 'center', padding: 30, color: '#888' }}>載入中...</div>
          ) : quotes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, color: '#888' }}>尚無儲存的案件</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>案名</th>
                  <th>翻修類型</th>
                  <th>地址</th>
                  <th>最後更新</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map(q => (
                  <tr key={q.id}>
                    <td>
                      {renamingId === q.id ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <input
                            autoFocus
                            value={renameVal}
                            onChange={e => setRenameVal(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleRename(q.id) }}
                            style={{ flex: 1 }}
                          />
                          <button className="btn-blue" onClick={() => handleRename(q.id)} style={{ fontSize: 11 }}>✓</button>
                          <button className="btn-gray" onClick={() => setRenamingId(null)} style={{ fontSize: 11 }}>✕</button>
                        </div>
                      ) : (
                        <span style={{ fontWeight: 600, color: '#1565C0', cursor: 'pointer' }}
                              onClick={() => { onOpen(q.id); onClose() }}>
                          {q.project_name || '（未命名）'}
                        </span>
                      )}
                    </td>
                    <td>{q.renovation_type || '—'}</td>
                    <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>{q.address || '—'}</td>
                    <td style={{ fontSize: 12, color: '#666' }}>{fmtDate(q.updated_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-blue" onClick={() => { onOpen(q.id); onClose() }} style={{ fontSize: 11 }}>開啟</button>
                        {!isLocal && (
                          <>
                            <button className="btn-yellow" onClick={() => { setRenamingId(q.id); setRenameVal(q.project_name || '') }} style={{ fontSize: 11 }}>改名</button>
                            <button className="btn-red" onClick={() => handleDelete(q.id, q.project_name || '未命名')} style={{ fontSize: 11 }}>刪除</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {/* 本機存檔區塊（雲端連線正常時顯示，供上傳用） */}
        {activeTab === 'cloud' && !isLocal && localQuotes.length > 0 && (
          <div style={{ marginTop: 16, border: '1px solid #FFB74D', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ background: '#FFF3E0', padding: '6px 12px', fontSize: 13, fontWeight: 700, color: '#E65100', display: 'flex', alignItems: 'center', gap: 6 }}>
              📦 本機存檔（尚未上傳至雲端）
              <span style={{ fontSize: 11, fontWeight: 400, color: '#888', marginLeft: 4 }}>點「上傳」可同步到雲端</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>案名</th>
                  <th>最後更新</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {localQuotes.map(q => (
                  <tr key={q.id}>
                    <td style={{ fontWeight: 600 }}>{q.project_name || '（未命名）'}</td>
                    <td style={{ fontSize: 12, color: '#666' }}>{fmtDate(q.updated_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="btn-blue"
                          onClick={() => handleUploadToCloud(q.id)}
                          disabled={uploading[q.id]}
                          style={{ fontSize: 11 }}
                        >
                          {uploading[q.id] ? '上傳中...' : '☁️ 上傳到雲端'}
                        </button>
                        <button
                          className="btn-red"
                          onClick={() => {
                            if (!window.confirm(`確定刪除本機「${q.project_name || '未命名'}」？`)) return
                            deleteLocalQuote(q.id)
                            setLocalQuotes(listLocalQuotes())
                          }}
                          style={{ fontSize: 11 }}
                        >
                          刪除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 檔案紀錄清單 */}
        {activeTab === 'file' && (
          recentFiles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, color: '#888' }}>
              <div style={{ marginBottom: 8 }}>尚無檔案存取紀錄</div>
              <div style={{ fontSize: 12, color: '#aaa' }}>使用「存到檔案」功能後，這裡會顯示最近存取的檔案</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>案名</th>
                  <th>檔案名稱</th>
                  <th>最後儲存</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {recentFiles.map((f, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, color: '#1565C0' }}>{f.name || '（未命名）'}</td>
                    <td style={{ fontSize: 11, color: '#666', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.fileName}</td>
                    <td style={{ fontSize: 12, color: '#666' }}>{fmtDate(f.savedAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-green" onClick={() => handleOpenFile(f.fileName)} style={{ fontSize: 11 }}>
                          📂 選擇檔案開啟
                        </button>
                        <button className="btn-red" onClick={(e) => handleRemoveRecentFile(f.fileName, e)} style={{ fontSize: 11 }}>移除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  )
}
