# 工程報價系統 - 設定說明

## 1. Supabase 資料庫設定

### 步驟一：建立 Supabase 專案
1. 前往 https://supabase.com 登入
2. 建立新專案（New Project）
3. 記下以下兩個值：
   - Project URL（Settings > API > Project URL）
   - anon/public key（Settings > API > Project API keys > anon public）

### 步驟二：執行 SQL 腳本
1. 進入 Supabase Dashboard > SQL Editor
2. 開啟 `src/lib/supabase.js` 檔案
3. 複製最頂部 `/* ... */` 裡面的所有 SQL 語句
4. 貼到 SQL Editor 執行

### 步驟三：確認資料表建立成功
確認以下5個資料表已建立：
- `construction_items` — 施工項目
- `quotes` — 報價案件
- `quote_items` — 估價單明細
- `transport_settings` — 搬運費設定
- `company_settings` — 公司設定

---

## 2. 本地開發環境設定

### 步驟一：複製環境變數檔案
```bash
cp .env.example .env
```

### 步驟二：填入 Supabase 設定
編輯 `.env` 檔案：
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 步驟三：安裝依賴並啟動
```bash
npm install
npm run dev
```

瀏覽器開啟 http://localhost:5173/quote-system/

---

## 3. GitHub Pages 部署設定

### 步驟一：建立 GitHub 儲存庫
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的帳號/quote-system.git
git push -u origin main
```

### 步驟二：設定 GitHub Secrets
在 GitHub repo > Settings > Secrets and variables > Actions > New repository secret：
- `VITE_SUPABASE_URL` = 你的 Supabase Project URL
- `VITE_SUPABASE_ANON_KEY` = 你的 Supabase anon key

### 步驟三：啟用 GitHub Pages
GitHub repo > Settings > Pages：
- Source: GitHub Actions

### 步驟四：觸發部署
推送任何 commit 到 main 分支，GitHub Actions 會自動建置並部署。

部署完成後網址為：
`https://你的帳號.github.io/quote-system/`

---

## 4. 使用說明

### 基本操作流程
1. **選擇翻修類型** → 填寫案名與地址
2. **選擇施工工程類別** → 出現對應項目按鈕
3. **點擊項目按鈕** → 自動填入單價與備考
4. **填寫尺寸與數量** → 系統自動計算面積（坪）
5. **按 Enter 或確認** → 加入估價單（自動儲存）
6. **估價單可直接點擊編輯** 任何欄位

### 面積計算規則
- 只輸入長+寬 → 計算單一面積（坪 = 長cm × 寬cm / 30250）
- 輸入長+寬+高 → 自動計算四面牆，各別列出

### 窗戶類項目（標有 📐 圖示）
- 乾式/濕式施工窗戶、落地窗
- 總價 = 長 × 寬 × 單價（直接相乘，不轉坪）

### 匯出功能
- 支援 Excel、Word、PDF 三種格式
- 可選擇匯出「報價單」或「合約書」
- 注意：PDF 格式中文字型需手動設定，建議使用 Word 或 Excel
