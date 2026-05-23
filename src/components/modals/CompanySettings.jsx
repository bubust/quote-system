import React, { useState, useEffect } from 'react'
import { getCompanySettings, updateCompanySettings } from '../../lib/supabase.js'

const LS_KEY = 'qs_company_settings'
const DEFAULT_FORM = {
  company_name: '優昇國際資產管理有限公司',
  owner_name: '陳庚溥',
  phone: '0911940368',
  tax_id: '42917139',
  address: '',
  quote_validity_days: 30,
}

function loadLocalCompany() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || null } catch { return null }
}
function saveLocalCompany(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data))
}

export default function CompanySettings({ onClose, onUpdate }) {
  const [form, setForm] = useState(DEFAULT_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: 'ok' })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const data = await getCompanySettings()
      if (data) setForm(data)
    } catch {
      // Supabase 失敗，從 localStorage 載入
      const local = loadLocalCompany()
      if (local) setForm(local)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      company_name: form.company_name,
      owner_name: form.owner_name,
      phone: form.phone,
      tax_id: form.tax_id,
      address: form.address,
      quote_validity_days: parseInt(form.quote_validity_days) || 30,
    }
    try {
      const updated = await updateCompanySettings(payload)
      saveLocalCompany(payload)
      setMsg({ text: '儲存成功 ✓', type: 'ok' })
      onUpdate && onUpdate(updated)
      setTimeout(() => { setMsg({ text: '', type: 'ok' }); onClose() }, 1200)
    } catch {
      // Supabase 失敗，存本機
      saveLocalCompany(payload)
      setMsg({ text: '已儲存到本機（Supabase 未連線）', type: 'warn' })
      onUpdate && onUpdate(payload)
      setTimeout(() => { setMsg({ text: '', type: 'ok' }); onClose() }, 1500)
    } finally {
      setSaving(false)
    }
  }

  const field = (label, key, type = 'text', extra = {}) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
      <span style={{ fontWeight: 600, fontSize: 13 }}>{label}</span>
      <input
        type={type}
        value={form[key] || ''}
        onChange={e => setForm({ ...form, [key]: e.target.value })}
        style={{ width: extra.width || '100%' }}
        {...extra}
      />
    </label>
  )

  const msgColor = msg.type === 'ok' ? '#C8E6C9' : '#FFF3E0'
  const msgTextColor = msg.type === 'ok' ? '#2e7d32' : '#E65100'

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ width: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 17, color: '#1565C0' }}>公司設定</h2>
          <button className="btn-gray" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#888' }}>載入中...</div>
        ) : (
          <>
            {msg.text && (
              <div style={{ background: msgColor, padding: '6px 10px', borderRadius: 4, marginBottom: 10, fontSize: 13, color: msgTextColor }}>
                {msg.text}
              </div>
            )}
            {field('公司名稱', 'company_name')}
            {field('負責人', 'owner_name')}
            {field('聯絡電話', 'phone')}
            {field('統一編號', 'tax_id')}
            {field('公司地址', 'address')}
            {field('報價有效期限（天）', 'quote_validity_days', 'number', { width: 100, min: 1 })}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn-blue" onClick={handleSave} disabled={saving}>
                {saving ? '儲存中...' : '💾 儲存'}
              </button>
              <button className="btn-gray" onClick={onClose}>取消</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
