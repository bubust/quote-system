import React from 'react'

const RENOVATION_TYPES = ['電梯大樓', '透天', '公寓', '華廈']

export default function ProjectInfo({ projectData, onChange }) {
  return (
    <div style={{
      background: '#E3F2FD',
      borderBottom: '1px solid #90CAF9',
      padding: '6px 10px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flexWrap: 'wrap',
    }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, fontSize: 13 }}>
        翻修類型：
        <select
          value={projectData.renovation_type || ''}
          onChange={e => onChange({ ...projectData, renovation_type: e.target.value })}
          style={{ minWidth: 90 }}
        >
          <option value="">-- 選擇 --</option>
          {RENOVATION_TYPES.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </label>

      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, fontSize: 13 }}>
        案名：
        <input
          type="text"
          value={projectData.project_name || ''}
          onChange={e => onChange({ ...projectData, project_name: e.target.value })}
          placeholder="請輸入案名"
          style={{ width: 180 }}
        />
      </label>

      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, fontSize: 13, flex: 1 }}>
        地址：
        <input
          type="text"
          value={projectData.address || ''}
          onChange={e => onChange({ ...projectData, address: e.target.value })}
          placeholder="請輸入施工地址"
          style={{ flex: 1, minWidth: 200 }}
        />
      </label>
    </div>
  )
}
