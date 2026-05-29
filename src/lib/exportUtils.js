import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType, TextRun, BorderStyle, HeadingLevel } from 'docx'
import ExcelJS from 'exceljs'
import { formatNTD, calculateCategorySubtotals, calculateGrandTotal, toNumber } from './calculations.js'

// ─── 整理估價單資料（分組加小計）────────────────────────────────────
function groupItemsWithSubtotals(items) {
  const categories = []
  const catOrder = []
  const catMap = {}

  items.forEach(item => {
    const cat = item.work_type || '其他'
    if (!catMap[cat]) {
      catMap[cat] = []
      catOrder.push(cat)
    }
    catMap[cat].push(item)
  })

  catOrder.forEach(cat => {
    categories.push({ category: cat, items: catMap[cat] })
  })
  return categories
}

// ─── 取得今天日期 ────────────────────────────────────────────────
function today() {
  return new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

// ─── EXCEL 匯出（ExcelJS，支援列群組折疊）──────────────────────
export async function exportExcel(quoteData, items, companyInfo, type = 'quote') {
  const groups = groupItemsWithSubtotals(items)
  const grand = calculateGrandTotal(items)
  const dateStr = today()

  const wb = new ExcelJS.Workbook()
  wb.creator = companyInfo?.company_name || ''
  const ws = wb.addWorksheet('估價單', {
    properties: { outlineLevelRow: 1, summaryBelow: false },
    views: [{ showGridLines: true }],
  })

  // 欄寬
  ws.columns = [
    { width: 6 },   // 項次
    { width: 10 },  // 施工位置
    { width: 12 },  // 工種
    { width: 22 },  // 施工項目
    { width: 12 },  // 單價
    { width: 8 },   // 數量
    { width: 6 },   // 單位
    { width: 12 },  // 總價
    { width: 30 },  // 備考
  ]

  const COLS = 9

  const cellStyle = (fill, font = {}, alignment = {}, border = true) => ({
    fill: fill ? { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } } : undefined,
    font: { name: '微軟正黑體', size: 10, ...font },
    alignment: { vertical: 'middle', wrapText: true, ...alignment },
    border: border ? {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    } : undefined,
  })

  const applyStyle = (row, style) => {
    row.eachCell({ includeEmpty: true }, cell => {
      if (style.fill) cell.fill = style.fill
      if (style.font) cell.font = style.font
      if (style.alignment) cell.alignment = style.alignment
      if (style.border) cell.border = style.border
    })
  }

  // 標題
  ws.mergeCells(1, 1, 1, COLS)
  const titleRow = ws.getRow(1)
  titleRow.getCell(1).value = companyInfo?.company_name || '優昇國際資產管理有限公司'
  titleRow.getCell(1).style = { font: { name: '微軟正黑體', size: 16, bold: true, color: { argb: 'FF1565C0' } }, alignment: { horizontal: 'center', vertical: 'middle' } }
  titleRow.height = 28

  ws.mergeCells(2, 1, 2, COLS)
  const subtitleRow = ws.getRow(2)
  subtitleRow.getCell(1).value = type === 'contract' ? '室內設計裝修工程承攬合約書' : '整建工程估價單'
  subtitleRow.getCell(1).style = { font: { name: '微軟正黑體', size: 12 }, alignment: { horizontal: 'center', vertical: 'middle' } }
  subtitleRow.height = 20

  ws.mergeCells(3, 1, 3, 5)
  ws.getRow(3).getCell(1).value = `案名：${quoteData.project_name || ''}　翻修類型：${quoteData.renovation_type || ''}`
  ws.getRow(3).getCell(1).font = { name: '微軟正黑體', size: 10 }
  ws.mergeCells(3, 6, 3, COLS)
  ws.getRow(3).getCell(6).value = `報價日期：${dateStr}　有效期限：${companyInfo?.quote_validity_days || 30} 天`
  ws.getRow(3).getCell(6).style = { font: { name: '微軟正黑體', size: 10 }, alignment: { horizontal: 'right' } }

  ws.mergeCells(4, 1, 4, COLS)
  ws.getRow(4).getCell(1).value = `地址：${quoteData.address || ''}`
  ws.getRow(4).getCell(1).font = { name: '微軟正黑體', size: 10 }

  // 表頭
  const headers = ['項次', '施工位置', '工種', '施工項目', '單價', '數量', '單位', '總價', '備考']
  const hdrRow = ws.getRow(5)
  hdrRow.height = 18
  headers.forEach((h, i) => {
    hdrRow.getCell(i + 1).value = h
    hdrRow.getCell(i + 1).style = {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } },
      font: { name: '微軟正黑體', size: 10, bold: true, color: { argb: 'FFFFFFFF' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: { top: { style: 'thin', color: { argb: 'FF0d47a1' } }, bottom: { style: 'thin', color: { argb: 'FF0d47a1' } }, left: { style: 'thin', color: { argb: 'FF0d47a1' } }, right: { style: 'thin', color: { argb: 'FF0d47a1' } } },
    }
  })

  let rowIdx = 6
  let seq = 1

  groups.forEach(({ category, items: catItems }) => {
    const sub = catItems.filter(i => !i.is_sub_item).reduce((s, i) => s + toNumber(i.total_price), 0)

    // 類別標題列（不折疊，作為展開按鈕所在行）
    ws.mergeCells(rowIdx, 1, rowIdx, COLS)
    const catRow = ws.getRow(rowIdx)
    catRow.getCell(1).value = `【${category}】`
    catRow.getCell(1).style = {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } },
      font: { name: '微軟正黑體', size: 10, bold: true },
      alignment: { vertical: 'middle' },
      border: { top: { style: 'thin', color: { argb: 'FFCCCCCC' } }, bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } }, left: { style: 'thin', color: { argb: 'FFCCCCCC' } }, right: { style: 'thin', color: { argb: 'FFCCCCCC' } } },
    }
    catRow.height = 16
    rowIdx++

    // 明細列（預設折疊）
    catItems.forEach(item => {
      const detailRow = ws.getRow(rowIdx)
      detailRow.outlineLevel = 1
      detailRow.hidden = true
      detailRow.height = 16

      const vals = [
        item.is_sub_item ? '' : seq++,
        item.floor_location || '',
        item.work_type || '',
        item.item_name || '',
        item.unit_price != null ? toNumber(item.unit_price) : '',
        item.quantity != null ? toNumber(item.quantity) : '',
        item.unit || '',
        toNumber(item.total_price),
        item.notes || '',
      ]
      vals.forEach((v, i) => {
        detailRow.getCell(i + 1).value = v
        detailRow.getCell(i + 1).style = {
          font: { name: '微軟正黑體', size: 10, bold: i === 3 || i === 7 },
          alignment: {
            horizontal: [0].includes(i) ? 'center' : [4, 5, 6, 7].includes(i) ? 'right' : 'left',
            vertical: 'middle', wrapText: true,
          },
          border: { top: { style: 'thin', color: { argb: 'FFCCCCCC' } }, bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } }, left: { style: 'thin', color: { argb: 'FFCCCCCC' } }, right: { style: 'thin', color: { argb: 'FFCCCCCC' } } },
        }
        if (i === 4 || i === 7) {
          detailRow.getCell(i + 1).numFmt = '#,##0'
        }
      })
      rowIdx++
    })

    // 小計列
    const subRow = ws.getRow(rowIdx)
    ws.mergeCells(rowIdx, 1, rowIdx, 7)
    subRow.getCell(1).value = `${category} 小計`
    subRow.getCell(1).style = { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEEFF' } }, font: { name: '微軟正黑體', size: 10, bold: true }, alignment: { horizontal: 'right', vertical: 'middle' }, border: { top: { style: 'thin', color: { argb: 'FFCCCCCC' } }, bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } }, left: { style: 'thin', color: { argb: 'FFCCCCCC' } }, right: { style: 'thin', color: { argb: 'FFCCCCCC' } } } }
    subRow.getCell(8).value = sub
    subRow.getCell(8).style = { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEEFF' } }, font: { name: '微軟正黑體', size: 10, bold: true }, alignment: { horizontal: 'right', vertical: 'middle' }, numFmt: '#,##0', border: { top: { style: 'thin', color: { argb: 'FFCCCCCC' } }, bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } }, left: { style: 'thin', color: { argb: 'FFCCCCCC' } }, right: { style: 'thin', color: { argb: 'FFCCCCCC' } } } }
    subRow.getCell(9).style = { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEEFF' } }, border: { top: { style: 'thin', color: { argb: 'FFCCCCCC' } }, bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } }, left: { style: 'thin', color: { argb: 'FFCCCCCC' } }, right: { style: 'thin', color: { argb: 'FFCCCCCC' } } } }
    subRow.height = 16
    rowIdx++
  })

  // 合計列
  ws.mergeCells(rowIdx, 1, rowIdx, 7)
  const totalRow = ws.getRow(rowIdx)
  totalRow.getCell(1).value = '合計'
  totalRow.getCell(1).style = { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } }, font: { name: '微軟正黑體', size: 12, bold: true, color: { argb: 'FFFFFFFF' } }, alignment: { horizontal: 'right', vertical: 'middle' }, border: { top: { style: 'thin', color: { argb: 'FF0d47a1' } }, bottom: { style: 'thin', color: { argb: 'FF0d47a1' } }, left: { style: 'thin', color: { argb: 'FF0d47a1' } }, right: { style: 'thin', color: { argb: 'FF0d47a1' } } } }
  totalRow.getCell(8).value = grand
  totalRow.getCell(8).style = { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } }, font: { name: '微軟正黑體', size: 12, bold: true, color: { argb: 'FFFFFFFF' } }, alignment: { horizontal: 'right', vertical: 'middle' }, numFmt: '#,##0', border: { top: { style: 'thin', color: { argb: 'FF0d47a1' } }, bottom: { style: 'thin', color: { argb: 'FF0d47a1' } }, left: { style: 'thin', color: { argb: 'FF0d47a1' } }, right: { style: 'thin', color: { argb: 'FF0d47a1' } } } }
  totalRow.getCell(9).style = { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } }, border: { top: { style: 'thin', color: { argb: 'FF0d47a1' } }, bottom: { style: 'thin', color: { argb: 'FF0d47a1' } }, left: { style: 'thin', color: { argb: 'FF0d47a1' } }, right: { style: 'thin', color: { argb: 'FF0d47a1' } } } }
  totalRow.height = 20
  rowIdx += 2

  // 公司資訊
  ws.mergeCells(rowIdx, 6, rowIdx, COLS)
  ws.getRow(rowIdx).getCell(6).value = `${companyInfo?.company_name || ''} ｜ 統一編號：${companyInfo?.tax_id || ''} ｜ 電話：${companyInfo?.phone || ''}`
  ws.getRow(rowIdx).getCell(6).style = { font: { name: '微軟正黑體', size: 9, color: { argb: 'FF555555' } }, alignment: { horizontal: 'right' } }

  // 下載
  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${quoteData.project_name || '報價單'}_${dateStr}_${type === 'contract' ? '合約書' : '估價單'}.xlsx`
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a) }, 100)
}

// ─── PDF 匯出（瀏覽器列印，完整支援中文）────────────────────────
export function exportPDF(quoteData, items, companyInfo, type = 'quote') {
  const groups = groupItemsWithSubtotals(items)
  const grand = calculateGrandTotal(items)
  let seq = 1

  // 將 is_sub_item 的金額合併到前一個主項目，不顯示細項
  const mergeSubItems = (catItems) => {
    const merged = []
    catItems.forEach(item => {
      if (!item.is_sub_item) {
        merged.push({ ...item, _total: toNumber(item.total_price) })
      } else if (merged.length > 0) {
        merged[merged.length - 1]._total += toNumber(item.total_price)
      }
    })
    return merged
  }

  const rowsHtml = groups.map(({ category, items: catItems }) => {
    const merged = mergeSubItems(catItems)
    const sub = merged.reduce((s, i) => s + i._total, 0)
    const itemRows = merged.map(item => `
      <tr>
        <td style="text-align:center">${seq++}</td>
        <td>${item.floor_location || ''}</td>
        <td>${item.work_type || ''}</td>
        <td>${item.item_name || ''}</td>
        <td style="text-align:right">${item.unit_price != null ? formatNTD(item.unit_price) : ''}</td>
        <td style="text-align:center">${item.quantity != null ? toNumber(item.quantity) : ''}</td>
        <td style="text-align:center">${item.unit || ''}</td>
        <td style="text-align:right">${formatNTD(item._total)}</td>
        <td style="font-size:10px;white-space:pre-wrap">${(item.notes || '').replace(/\n/g,'<br/>')}</td>
      </tr>`).join('')
    return `
      <tr style="background:#FFF9C4">
        <td colspan="9" style="font-weight:700;padding:4px 6px">【${category}】</td>
      </tr>
      ${itemRows}
      <tr style="background:#E3F2FD">
        <td colspan="7" style="text-align:right;font-weight:700">小計</td>
        <td style="text-align:right;font-weight:700">${formatNTD(sub)}</td>
        <td></td>
      </tr>`
  }).join('')

  const contractSection = type === 'contract' ? `
    <div style="margin-top:30px">
      <h3 style="border-bottom:2px solid #333;padding-bottom:4px">付款條款</h3>
      <table style="width:100%;border-collapse:collapse;margin-top:8px">
        <tr><td style="padding:4px 0">第一期：簽約時付 30%</td><td style="text-align:right">金額：${formatNTD(grand * 0.3)} 元</td></tr>
        <tr><td style="padding:4px 0">第二期：工程進行中付 40%</td><td style="text-align:right">金額：${formatNTD(grand * 0.4)} 元</td></tr>
        <tr><td style="padding:4px 0">第三期：完工驗收付 30%</td><td style="text-align:right">金額：${formatNTD(grand * 0.3)} 元</td></tr>
      </table>
      <div style="margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div>
          <div style="font-weight:700;margin-bottom:12px">甲方（業主）</div>
          <div style="border-bottom:1px solid #333;height:30px;margin-bottom:10px"></div>
          <div>簽名：</div>
          <div style="border-bottom:1px solid #333;height:30px;margin-top:20px;margin-bottom:10px"></div>
          <div>日期：</div>
        </div>
        <div>
          <div style="font-weight:700;margin-bottom:12px">乙方（承包商）</div>
          <div style="margin-bottom:8px">公司名稱：${companyInfo?.company_name || ''}</div>
          <div style="margin-bottom:8px">統一編號：${companyInfo?.tax_id || ''}</div>
          <div style="margin-bottom:8px">負責人：${companyInfo?.owner_name || ''}</div>
          <div>電話：${companyInfo?.phone || ''}</div>
        </div>
      </div>
    </div>` : ''

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<title>${type === 'contract' ? '室內設計裝修工程承攬合約書' : '整建工程估價單'}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Microsoft JhengHei', '微軟正黑體', 'Noto Sans TC', sans-serif; font-size: 12px; color: #111; margin: 0; padding: 0; }
  h1 { text-align: center; font-size: 18px; margin: 0 0 4px; }
  h2 { text-align: center; font-size: 14px; margin: 0 0 10px; font-weight: 400; }
  .meta { margin-bottom: 8px; line-height: 1.8; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #1565C0; color: #fff; padding: 5px 4px; font-size: 11px; }
  td { border: 1px solid #ccc; padding: 3px 4px; font-size: 11px; vertical-align: top; }
  tr:nth-child(even) { background: #F9F9F9; }
  .total-row { background: #BBDEFB; font-weight: 700; font-size: 13px; }
  .footer { margin-top: 10px; text-align: center; color: #666; font-size: 10px; border-top: 1px solid #ddd; padding-top: 6px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<h1>${companyInfo?.company_name || '優昇國際資產管理有限公司'}</h1>
<h2>${type === 'contract' ? '室內設計裝修工程承攬合約書' : '整建工程估價單'}</h2>
<div class="meta">
  <span>案名：<b>${quoteData.project_name || ''}</b></span>&emsp;
  <span>翻修類型：${quoteData.renovation_type || ''}</span>&emsp;
  <span>報價日期：${today()}</span>&emsp;
  <span>有效期限：${companyInfo?.quote_validity_days || 30} 天</span>
</div>
<div class="meta">地址：${quoteData.address || ''}</div>
<table>
  <thead>
    <tr>
      <th style="width:4%">項次</th>
      <th style="width:7%">施工位置</th>
      <th style="width:9%">工種</th>
      <th style="width:16%">施工項目</th>
      <th style="width:8%">單價</th>
      <th style="width:6%">數量</th>
      <th style="width:5%">單位</th>
      <th style="width:9%">總價</th>
      <th>備考</th>
    </tr>
  </thead>
  <tbody>
    ${rowsHtml}
    <tr class="total-row">
      <td colspan="7" style="text-align:right;border:1px solid #90CAF9">合計</td>
      <td style="text-align:right;border:1px solid #90CAF9">${formatNTD(grand)}</td>
      <td style="border:1px solid #90CAF9"></td>
    </tr>
  </tbody>
</table>
${contractSection}
<div class="footer">
  ${companyInfo?.company_name || ''} ｜ 統一編號：${companyInfo?.tax_id || ''} ｜ 電話：${companyInfo?.phone || ''}
</div>
<script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`

  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
}

// ─── WORD 匯出 ───────────────────────────────────────────────────
export async function exportWord(quoteData, items, companyInfo, type = 'quote') {
  const groups = groupItemsWithSubtotals(items)
  const grand = calculateGrandTotal(items)

  const makeBorder = () => ({
    top: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
    left: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
    right: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
  })

  const makeCell = (text, opts = {}) => new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text: String(text ?? ''), size: opts.size || 18, bold: opts.bold || false, color: opts.color || '000000' })],
      alignment: opts.align || AlignmentType.LEFT,
    })],
    borders: makeBorder(),
    shading: opts.shade ? { fill: opts.shade } : undefined,
    columnSpan: opts.colSpan,
  })

  const headerRow = new TableRow({
    children: ['項次','施工位置','工種','施工項目','單價','數量','單位','總價','備考'].map(h =>
      makeCell(h, { bold: true, shade: '1565C0', color: 'FFFFFF', align: AlignmentType.CENTER })
    ),
  })

  const dataRows = []
  let seq = 1

  groups.forEach(({ category, items: catItems }) => {
    dataRows.push(new TableRow({
      children: [makeCell(`【${category}】`, { bold: true, shade: 'FFF9C4', colSpan: 9 })],
    }))
    catItems.forEach(item => {
      dataRows.push(new TableRow({
        children: [
          makeCell(item.is_sub_item ? '' : seq++, { align: AlignmentType.CENTER }),
          makeCell(item.floor_location || ''),
          makeCell(item.work_type || ''),
          makeCell(item.item_name || ''),
          makeCell(item.unit_price != null ? formatNTD(item.unit_price) : '', { align: AlignmentType.RIGHT }),
          makeCell(item.quantity != null ? String(toNumber(item.quantity)) : '', { align: AlignmentType.CENTER }),
          makeCell(item.unit || '', { align: AlignmentType.CENTER }),
          makeCell(formatNTD(item.total_price), { align: AlignmentType.RIGHT }),
          new TableCell({
            children: (item.notes || '').split('\n').map((line, li) =>
              new Paragraph({
                children: [new TextRun({ text: line, size: 18 })],
                alignment: AlignmentType.LEFT,
              })
            ),
            borders: makeBorder(),
          }),
        ],
      }))
    })
    const sub = catItems.filter(i => !i.is_sub_item).reduce((s, i) => s + toNumber(i.total_price), 0)
    dataRows.push(new TableRow({
      children: [
        makeCell(`${category} 小計`, { bold: true, shade: 'E3F2FD', colSpan: 7, align: AlignmentType.RIGHT }),
        makeCell(formatNTD(sub), { bold: true, shade: 'E3F2FD', align: AlignmentType.RIGHT }),
        makeCell('', { shade: 'E3F2FD' }),
      ],
    }))
  })

  dataRows.push(new TableRow({
    children: [
      makeCell('總計', { bold: true, shade: 'BBDEFB', colSpan: 7, align: AlignmentType.RIGHT }),
      makeCell(formatNTD(grand), { bold: true, shade: 'BBDEFB', align: AlignmentType.RIGHT }),
      makeCell('', { shade: 'BBDEFB' }),
    ],
  }))

  const mainTable = new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  })

  const children = [
    new Paragraph({
      children: [new TextRun({ text: companyInfo?.company_name || '', bold: true, size: 32 })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: type === 'contract' ? '室內設計裝修工程承攬合約書' : '整建工程估價單', bold: true, size: 28 })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ children: [new TextRun({ text: '' })] }),
    new Paragraph({
      children: [
        new TextRun({ text: `案名：${quoteData.project_name || ''}    `, size: 20 }),
        new TextRun({ text: `翻修類型：${quoteData.renovation_type || ''}    `, size: 20 }),
        new TextRun({ text: `報價日期：${today()}`, size: 20 }),
      ],
    }),
    new Paragraph({
      children: [new TextRun({ text: `施工地址：${quoteData.address || ''}`, size: 20 })],
    }),
    new Paragraph({ children: [new TextRun({ text: '' })] }),
    mainTable,
  ]

  if (type === 'contract') {
    children.push(new Paragraph({ children: [new TextRun({ text: '' })] }))
    children.push(new Paragraph({ children: [new TextRun({ text: '付款條款', bold: true, size: 24 })] }))
    children.push(new Paragraph({ children: [new TextRun({ text: `第一期：簽約時付 30%    金額：${formatNTD(grand * 0.3)} 元`, size: 20 })] }))
    children.push(new Paragraph({ children: [new TextRun({ text: `第二期：工程進行中付 40%    金額：${formatNTD(grand * 0.4)} 元`, size: 20 })] }))
    children.push(new Paragraph({ children: [new TextRun({ text: `第三期：完工驗收付 30%    金額：${formatNTD(grand * 0.3)} 元`, size: 20 })] }))
    children.push(new Paragraph({ children: [new TextRun({ text: '' })] }))

    const sigTable = new Table({
      rows: [
        new TableRow({
          children: [
            makeCell('甲方（業主）'),
            makeCell('乙方（承包商）'),
          ],
        }),
        new TableRow({
          children: [
            makeCell('簽名：___________________________'),
            makeCell(`公司名稱：${companyInfo?.company_name || ''}`),
          ],
        }),
        new TableRow({
          children: [
            makeCell('日期：___________________________'),
            makeCell(`負責人：${companyInfo?.owner_name || ''}  電話：${companyInfo?.phone || ''}`),
          ],
        }),
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
    })
    children.push(sigTable)
  }

  children.push(new Paragraph({ children: [new TextRun({ text: '' })] }))
  children.push(new Paragraph({
    children: [new TextRun({
      text: `${companyInfo?.company_name || ''} | 統一編號：${companyInfo?.tax_id || ''} | 電話：${companyInfo?.phone || ''}`,
      size: 16, color: '666666',
    })],
    alignment: AlignmentType.CENTER,
  }))

  const doc = new Document({ sections: [{ children }] })
  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${quoteData.project_name || '報價單'}_${today()}_${type === 'contract' ? '合約書' : '估價單'}.docx`
  a.click()
  URL.revokeObjectURL(url)
}
