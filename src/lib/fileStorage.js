// ─── 檔案存取（本機檔案系統）───────────────────────────────────────
// 使用 File System Access API（Chrome/Edge 支援）+ fallback 下載

const LS_RECENT_KEY = 'qs_recent_file_projects'

/** 儲存到本機檔案，讓使用者選擇位置 */
export async function saveProjectToFile(quoteData, items) {
  const payload = {
    version: 2,
    quote: { ...quoteData },
    items: items || [],
    savedAt: new Date().toISOString(),
  }
  const json = JSON.stringify(payload, null, 2)
  const safeName = (quoteData.project_name || '未命名估價單').replace(/[\\/:*?"<>|]/g, '_')
  const date = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '')
  const fileName = `${safeName}_${date}.json`

  if (typeof window.showSaveFilePicker === 'function') {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{ description: '估價單檔案', accept: { 'application/json': ['.json'] } }],
      })
      const writable = await handle.createWritable()
      await writable.write(json)
      await writable.close()
      _addRecentFile({ name: quoteData.project_name || '未命名', fileName: handle.name, savedAt: payload.savedAt })
      return handle.name
    } catch (e) {
      if (e.name === 'AbortError') return null
      throw e
    }
  } else {
    // Fallback: 瀏覽器下載
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    _addRecentFile({ name: quoteData.project_name || '未命名', fileName, savedAt: payload.savedAt })
    return fileName
  }
}

/** 從本機檔案載入 */
export async function loadProjectFromFile() {
  if (typeof window.showOpenFilePicker === 'function') {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: '估價單檔案', accept: { 'application/json': ['.json'] } }],
        multiple: false,
      })
      const file = await handle.getFile()
      const text = await file.text()
      const data = JSON.parse(text)
      _addRecentFile({ name: data.quote?.project_name || '未命名', fileName: handle.name, savedAt: data.savedAt || new Date().toISOString() })
      return data
    } catch (e) {
      if (e.name === 'AbortError') return null
      throw e
    }
  } else {
    // Fallback: input[type=file]
    return new Promise((resolve, reject) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.onchange = async (e) => {
        try {
          const file = e.target.files[0]
          if (!file) { resolve(null); return }
          const text = await file.text()
          const data = JSON.parse(text)
          _addRecentFile({ name: data.quote?.project_name || '未命名', fileName: file.name, savedAt: data.savedAt || new Date().toISOString() })
          resolve(data)
        } catch (err) {
          reject(err)
        }
      }
      input.click()
    })
  }
}

/** 讀取最近檔案清單 */
export function getRecentFileProjects() {
  try { return JSON.parse(localStorage.getItem(LS_RECENT_KEY) || '[]') } catch { return [] }
}

function _addRecentFile(entry) {
  const list = getRecentFileProjects()
  const idx = list.findIndex(e => e.fileName === entry.fileName)
  if (idx >= 0) list.splice(idx, 1)
  list.unshift(entry)
  localStorage.setItem(LS_RECENT_KEY, JSON.stringify(list.slice(0, 30)))
}

export function removeRecentFile(fileName) {
  const list = getRecentFileProjects().filter(e => e.fileName !== fileName)
  localStorage.setItem(LS_RECENT_KEY, JSON.stringify(list))
}
