import React, { useState } from 'react'
import { exportExcel, exportPDF, exportWord } from '../../lib/exportUtils.js'

export default function ExportModal({ quoteData, items, companyInfo, onClose }) {
  const [docType, setDocType] = useState('quote')
  const [format, setFormat] = useState('excel')
  const [exporting, setExporting] = useState(false)
  const [msg, setMsg] = useState('')

  const handleExport = async () => {
    if (!items || items.length === 0) {
      setMsg('估價單沒有任何項目，請先新增施工項目')
      return
    }
    setExporting(true)
    setMsg('')
    try {
      if (format === 'excel') {
        exportExcel(quoteData, items, companyInfo, docType)
        setMsg('Excel 匯出成功，請查看下載資料夾')
      } else if (format === 'pdf') {
        exportPDF(quoteData, items, companyInfo, docType)
        setMsg('PDF 匯出成功（注意：PDF 中文需安裝字型，建議使用 Word 或 Excel）')
      } else if (format === 'word') {
        await exportWord(quoteData, items, companyInfo, docType)
        setMsg('Word 匯出成功，請查看下載資料夾')
      }
    } catch (e) {
      console.error(e)
      setMsg('匯出失敗：' + e.message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ width: 400 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 17, color: '#1565C0' }}>匯出設定</h2>
          <button className="btn-gray" onClick={onClose}>✕</button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>文件類型</div>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { val: 'quote', label: '📋 報價單（估價單）' },
              { val: 'contract', label: '📝 合約書' },
            ].map(opt => (
              <label key={opt.val} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                <input
                  type="radio"
                  name="docType"
                  value={opt.val}
                  checked={docType === opt.val}
                  onChange={() => setDocType(opt.val)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>匯出格式</div>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { val: 'excel', label: '📊 EXCEL' },
              { val: 'word', label: '📄 WORD' },
              { val: 'pdf', label: '🖨️ PDF' },
            ].map(opt => (
              <label key={opt.val} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                <input
                  type="radio"
                  name="format"
                  value={opt.val}
                  checked={format === opt.val}
                  onChange={() => setFormat(opt.val)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {format === 'pdf' && (
          <div style={{ background: '#FFF8E1', border: '1px solid #F9A825', borderRadius: 4, padding: '6px 10px', marginBottom: 12, fontSize: 12, color: '#795548' }}>
            ⚠️ PDF 匯出使用內建字型，中文字可能顯示為方塊。建議使用 Word 或 Excel 格式以正確顯示中文。
          </div>
        )}

        <div style={{ background: '#F5F5F5', borderRadius: 4, padding: 10, marginBottom: 16, fontSize: 13 }}>
          <div><strong>案名：</strong>{quoteData?.project_name || '（未命名）'}</div>
          <div><strong>地址：</strong>{quoteData?.address || '—'}</div>
          <div><strong>項目數：</strong>{items?.length || 0} 筆</div>
          <div><strong>公司：</strong>{companyInfo?.company_name || '—'}</div>
        </div>

        {msg && (
          <div style={{
            background: msg.includes('失敗') ? '#FFEBEE' : '#E8F5E9',
            padding: '6px 10px', borderRadius: 4, marginBottom: 10, fontSize: 13
          }}>
            {msg}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn-blue" onClick={handleExport} disabled={exporting} style={{ fontSize: 14, padding: '6px 20px' }}>
            {exporting ? '匯出中...' : '📤 開始匯出'}
          </button>
          <button className="btn-gray" onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  )
}
