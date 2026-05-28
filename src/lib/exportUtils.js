import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType, TextRun, BorderStyle, HeadingLevel } from 'docx'
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

// ─── EXCEL 匯出（HTML-based，格式匹配 PDF）──────────────────────
export function exportExcel(quoteData, items, companyInfo, type = 'quote') {
  const groups = groupItemsWithSubtotals(items)
  const grand = calculateGrandTotal(items)
  const dateStr = today()
  let seq = 1

  // 產生資料行 HTML
  const rowsHtml = groups.map(({ category, items: catItems }) => {
    const sub = catItems.filter(i => !i.is_sub_item).reduce((s, i) => s + toNumber(i.total_price), 0)
    const itemRows = catItems.map(item => `
      <tr>
        <td style="text-align:center;border:1px solid #ccc">${item.is_sub_item ? '' : seq++}</td>
        <td style="border:1px solid #ccc">${item.floor_location || ''}</td>
        <td style="border:1px solid #ccc">${item.work_type || ''}</td>
        <td style="font-weight:600;border:1px solid #ccc">${item.item_name || ''}</td>
        <td style="text-align:right;border:1px solid #ccc">${item.unit_price != null ? formatNTD(item.unit_price) : ''}</td>
        <td style="text-align:center;border:1px solid #ccc">${item.quantity != null ? toNumber(item.quantity) : ''}</td>
        <td style="text-align:center;border:1px solid #ccc">${item.unit || ''}</td>
        <td style="text-align:right;font-weight:600;border:1px solid #ccc">${formatNTD(item.total_price)}</td>
        <td style="border:1px solid #ccc;white-space:pre-wrap;font-size:10px;mso-wrap-text:yes;vertical-align:top">${(item.notes || '').replace(/</g,'&lt;').replace(/\n/g,'<br/>')}</td>
      </tr>`).join('')

    return `
      <tr style="background:#FFF9C4">
        <td colspan="9" style="font-weight:700;padding:4px 6px;border:1px solid #ccc;font-size:12px">【${category}】</td>
      </tr>
      ${itemRows}
      <tr style="background:#DDEEFF">
        <td colspan="7" style="text-align:right;font-weight:700;padding:3px 8px;border:1px solid #ccc">${category} 小計</td>
        <td style="text-align:right;font-weight:700;border:1px solid #ccc">${formatNTD(sub)}</td>
        <td style="border:1px solid #ccc"></td>
      </tr>`
  }).join('')

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8">
<style>
body { font-family: Microsoft JhengHei, 微軟正黑體, sans-serif; }
td { font-size:12px; padding:3px 5px; vertical-align:top; }
</style>
</head>
<body>
<table style="width:100%;border-collapse:collapse">
  <!-- 標題 -->
  <tr><td colspan="9" style="text-align:center;font-size:20px;font-weight:bold;color:#1565C0;padding:10px 0;border:none">${companyInfo?.company_name || '優昇國際資產管理有限公司'}</td></tr>
  <tr><td colspan="9" style="text-align:center;font-size:14px;padding-bottom:8px;border:none">${type === 'contract' ? '室內設計裝修工程承攬合約書' : '整建工程估價單'}</td></tr>
  <!-- 案件資訊 -->
  <tr>
    <td colspan="4" style="border:none;font-size:12px">案名：<b>${quoteData.project_name || ''}</b>&emsp;翻修類型：${quoteData.renovation_type || ''}</td>
    <td colspan="5" style="border:none;text-align:right;font-size:12px">報價日期：${dateStr}&emsp;有效期限：${companyInfo?.quote_validity_days || 30} 天</td>
  </tr>
  <tr><td colspan="9" style="border:none;font-size:12px;padding-bottom:6px">地址：${quoteData.address || ''}</td></tr>
  <!-- 表頭 -->
  <tr style="background:#1565C0;color:white">
    <th style="width:5%;border:1px solid #1565C0">項次</th>
    <th style="width:8%;border:1px solid #1565C0">施工位置</th>
    <th style="width:10%;border:1px solid #1565C0">工種</th>
    <th style="width:16%;border:1px solid #1565C0">施工項目</th>
    <th style="width:9%;border:1px solid #1565C0">單價</th>
    <th style="width:7%;border:1px solid #1565C0">數量</th>
    <th style="width:5%;border:1px solid #1565C0">單位</th>
    <th style="width:10%;border:1px solid #1565C0">總價</th>
    <th style="border:1px solid #1565C0">備考</th>
  </tr>
  ${rowsHtml}
  <!-- 合計 -->
  <tr style="background:#1565C0;color:white">
    <td colspan="7" style="text-align:right;font-weight:bold;font-size:14px;border:1px solid #0d47a1;padding:6px 8px">合計</td>
    <td style="text-align:right;font-weight:bold;font-size:14px;border:1px solid #0d47a1">${formatNTD(grand)}</td>
    <td style="border:1px solid #0d47a1"></td>
  </tr>
  <!-- 空行 -->
  <tr><td colspan="9" style="border:none;height:20px"></td></tr>
  <!-- 公司資訊在右下角 -->
  <tr>
    <td colspan="5" style="border:none"></td>
    <td colspan="4" style="border:none;text-align:right;font-size:11px;color:#555;border-top:1px solid #ddd;padding-top:6px">
      ${companyInfo?.company_name || ''} ｜ 統一編號：${companyInfo?.tax_id || ''} ｜ 電話：${companyInfo?.phone || ''}
    </td>
  </tr>
</table>
</body></html>`

  const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${quoteData.project_name || '報價單'}_${dateStr}_${type === 'contract' ? '合約書' : '估價單'}.xls`
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a) }, 100)
}

// ─── PDF 匯出（瀏覽器列印，完整支援中文）────────────────────────
export function exportPDF(quoteData, items, companyInfo, type = 'quote') {
  const groups = groupItemsWithSubtotals(items)
  const grand = calculateGrandTotal(items)
  let seq = 1

  const rowsHtml = groups.map(({ category, items: catItems }) => {
    const sub = catItems.filter(i => !i.is_sub_item).reduce((s, i) => s + toNumber(i.total_price), 0)
    const itemRows = catItems.map(item => `
      <tr>
        <td style="text-align:center">${item.is_sub_item ? '' : seq++}</td>
        <td>${item.floor_location || ''}</td>
        <td>${item.work_type || ''}</td>
        <td>${item.item_name || ''}</td>
        <td style="text-align:right">${item.unit_price != null ? formatNTD(item.unit_price) : ''}</td>
        <td style="text-align:center">${item.quantity != null ? toNumber(item.quantity) : ''}</td>
        <td style="text-align:center">${item.unit || ''}</td>
        <td style="text-align:right">${formatNTD(item.total_price)}</td>
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
