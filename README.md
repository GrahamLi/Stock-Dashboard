# 股票儀表板 / MyFintrack Dashboard

> V04 更新：新增 t0_avg_cost 欄位說明、庫存變動日期篩選器

個人股票投資組合追蹤系統，支援多人使用（邀請制），每日自動更新台股收盤價。

---

## 線上網址

**https://myfintrack-dashboard.vercel.app**

---

## 相關網站總覽

| 網站 | 網址 | 用途 |
|------|------|------|
| 儀表板（線上版） | https://myfintrack-dashboard.vercel.app | 使用者每天看股票用 |
| GitHub 專案 | https://github.com/GrahamLi/Stock-Dashboard | 存放程式碼、觸發股價更新 |
| Vercel | https://vercel.com/grahamlis-projects/stock-dashboard | 前端部署、環境變數設定 |
| Firebase Console | https://console.firebase.google.com/project/stock-dashboard-e0cb4 | 資料庫後台、帳號管理 |
| Firebase Auth | https://console.firebase.google.com/project/stock-dashboard-e0cb4/authentication/users | 查看/管理使用者帳號 |
| Firebase Firestore | https://console.firebase.google.com/project/stock-dashboard-e0cb4/firestore | 查看/管理資料庫內容 |
| Firebase Rules | https://console.firebase.google.com/project/stock-dashboard-e0cb4/firestore/rules | 資料庫安全規則 |
| Firebase Service Account | https://console.firebase.google.com/project/stock-dashboard-e0cb4/settings/serviceaccounts/adminsdk | 產生後端金鑰 |
| GitHub Actions | https://github.com/GrahamLi/Stock-Dashboard/actions | 手動/自動觸發股價更新 |
| GitHub Secrets | https://github.com/GrahamLi/Stock-Dashboard/settings/secrets/actions | 管理 GitHub 環境變數 |
| Vercel 環境變數 | https://vercel.com/grahamlis-projects/stock-dashboard/settings/environment-variables | 管理 Vercel 環境變數 |
| GitHub Token 設定 | https://github.com/settings/tokens | 產生/管理 Personal Access Token |

---

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | Next.js 16 + Tailwind CSS + ECharts |
| 資料庫 / 帳號 | Firebase Firestore + Firebase Auth |
| 股價更新 | GitHub Actions + Python yfinance |
| 部署 | Vercel |

---

## 專案結構

```
stock-dashboard/
├── app/
│   ├── layout.js                  # 全域 layout
│   ├── page.js                    # 登入頁
│   ├── register/page.js           # 註冊頁（邀請碼制）
│   ├── forgot-password/page.js    # 忘記密碼頁
│   └── dashboard/page.js          # 儀表板主頁（核心）
├── components/
│   ├── AuthGuard.js               # 登入保護元件
│   ├── Navbar.js                  # 頂部導覽列（含登出）
│   ├── SummaryCards.js            # 總成本/市值/損益卡片
│   ├── PieChart.js                # 持股佔比圓餅圖
│   ├── LineChart.js               # 總資產走勢曲線圖
│   ├── StockTable.js              # 持股清單（點整行開彈窗）
│   ├── StockDetailModal.js        # 個股詳情彈窗（編輯/刪除交易）
│   ├── AddStockModal.js           # 新增交易紀錄彈窗
│   ├── QuickHoldingModal.js       # 快速建倉彈窗
│   ├── DailyChanges.js            # 庫存變動歷史紀錄（含日期篩選）
│   └── UpdateButton.js            # 手動更新股價按鈕（含輪詢）
├── lib/
│   ├── firebase.js                # Firebase 初始化
│   ├── firestore.js               # 核心資料庫操作（含FIFO計算）V05
│   └── stockList.js               # 台股代號對照表（2262筆）
├── scripts/
│   └── update_prices.py           # GitHub Actions 抓股價腳本 V02
└── .github/
    └── workflows/
        └── update_prices.yml      # GitHub Actions 排程（每天14:30）
```

---

## 功能說明

### 儀表板主頁

| 區塊 | 說明 |
|------|------|
| 上方三張卡片 | 股票總成本、總市值、未實現損益（含百分比） |
| 持股佔比圓餅圖 | 各股市值佔總市值的百分比（0股自動隱藏） |
| 總資產走勢曲線圖 | 每天收盤後記錄一個點，累積成曲線 |
| 持股清單 | 每筆持股詳細數字，點整行開個股詳情 |
| 庫存變動歷史紀錄 | 交易紀錄（含日期篩選）/ 每日持股快照 / 當天已實現損益 |
| 查詢損益區間 | 自訂日期範圍查詢已實現損益 |

### 所有操作入口

| 功能 | 入口 |
|------|------|
| 快速建倉 | 持股清單標題旁「＋ 快速建倉」按鈕 |
| 新增交易紀錄 | 右下角「＋ 新增交易」浮動按鈕 |
| 個股詳情 | 點持股清單任一行 |
| 編輯/刪除交易紀錄 | 個股詳情彈窗內每筆右側 |
| 編輯/刪除建倉 | 個股詳情彈窗內建倉行右側 |
| 手動更新股價 | 頂部「↻ 更新股價」按鈕 |
| 查詢任意區間損益 | 庫存變動歷史紀錄→「查詢損益區間」 |
| 篩選交易紀錄 | 庫存變動歷史紀錄→交易紀錄 Tab 上方日期篩選器 |

### 股票搜尋

- 輸入代號（如 `2330`）自動帶入名稱
- 輸入名稱（如 `台積`）顯示模糊搜尋下拉選單（最多10筆）
- 支援全形/半形輸入（如 `２３３０` 和 `2330` 都可以）
- 涵蓋 2262 筆台股（上市 + 上櫃 + ETF）

---

## 帳號系統

### 使用者操作

| 操作 | 說明 |
|------|------|
| 註冊 | 需要邀請碼：`wayne2026` |
| 登入 | Email + 密碼 |
| 忘記密碼 | 輸入 Email，系統寄送重設連結 |
| 登出 | 點右上角「登出」按鈕 |

### 管理者操作

| 操作 | 說明 |
|------|------|
| 新增使用者 | Firebase Auth 後台手動新增，或給邀請碼讓對方自行註冊 |
| 停用使用者 | Firebase Auth 後台停用帳號 |
| 更換邀請碼 | 修改 Vercel 環境變數 `NEXT_PUBLIC_INVITE_CODE` 並重新部署 |

---

## 核心計算邏輯

### 持股建立方式

| 方式 | 說明 | 特性 |
|------|------|------|
| 快速建倉 | 直接輸入現有股數和平均成本 | 視為 T0（最早的持股），成本存入 `t0_avg_cost` |
| 交易紀錄 | 逐筆輸入每次買賣 | 支援完整 FIFO 計算 |

### FIFO 計算規則

快速建倉視為 T0（最早），賣出時優先從這裡扣除：

```
T0  快速建倉：300 股 @$580（t0_avg_cost = 580）
T+1 買入：   200 股 @$620
T+2 賣出：   400 股 @$700

→ 先賣 T0 的 300 股，再賣 T+1 的 100 股
→ 剩餘：T+1 的 100 股 @$620

已實現損益 = (700-580)×300 + (700-620)×100 = $44,000
```

### 多次快速建倉合併規則

```
第一次建倉：1000 股 @$1,000  → t0_avg_cost = $1,000
第二次建倉：1000 股 @$1,400

合併後 T0：
  股數 = 1000 + 1000 = 2000 股
  t0_avg_cost = (1000×1000 + 1000×1400) ÷ 2000 = $1,200
```

### 欄位說明

| 欄位 | 說明 |
|------|------|
| `t0_avg_cost` | 快速建倉的平均成本（獨立記錄，不被 FIFO 計算影響） |
| `avg_cost` | 整體加權平均成本（T0 + 所有交易紀錄，由 FIFO 計算） |
| `initial_shares` | 快速建倉總股數（T0 FIFO 用） |

### 平均成本計算（買入時，加權平均）

```
新平均成本 = (原股數 × 原成本 + 買入股數 × 買入價) ÷ 新總股數
```

### 未實現損益計算

```
未實現損益 = (現價 - 平均成本) × 持股數
損益% = (現價 - 平均成本) ÷ 平均成本 × 100%
```

### 股數換算

```
1 張 = 1000 股
1500 股 → 1 張 500 股
1000 股 → 1 張
 500 股 → 500 股（零股）
```

---

## 股價自動更新

### 排程時間

每個交易日（週一至週五）台灣時間 **14:30** 自動執行。

### 各時段查看說明

| 時間 | 顯示的股價 |
|------|-----------|
| 盤後（14:30 後） | ✅ 今日收盤價 |
| 盤中（09:00–13:30） | ⚠️ 昨日收盤價 |
| 收盤前（13:30–14:30） | ⚠️ 昨日收盤價 |

### 手動更新流程

點儀表板頂部「↻ 更新股價」按鈕：
1. 14:30 前按會提示「將顯示前一工作天收盤價」
2. 觸發 GitHub Actions
3. 顯示大型提示「股價更新中，約需 30 秒...」含進度條
4. 每 5 秒自動檢查 Actions 是否完成
5. 完成後提示消失，畫面自動刷新

---

## Firebase 資料結構

### holdings（持股）

| 欄位 | 型別 | 說明 |
|------|------|------|
| user_id | string | 對應使用者 UID |
| code | string | 股票代號（如 2330） |
| name | string | 股票名稱（如 台積電） |
| shares | number | 持有股數（由 FIFO 計算，含零股） |
| initial_shares | number | 快速建倉總股數（T0 FIFO 用） |
| t0_avg_cost | number | 快速建倉平均成本（獨立記錄，不被 FIFO 影響） |
| avg_cost | number | 整體平均成本（由 FIFO 計算） |
| current_price | number | 最新收盤價（自動更新） |
| has_transaction_history | boolean | 是否有交易紀錄 |
| has_quick_holding | boolean | 是否有快速建倉（T0） |
| created_at | timestamp | 建立時間 |

### transactions（交易紀錄）

| 欄位 | 型別 | 說明 |
|------|------|------|
| user_id | string | 對應使用者 UID |
| code | string | 股票代號 |
| name | string | 股票名稱 |
| action | string | 買入 / 賣出 |
| shares | number | 股數（含零股） |
| price | number | 成交價（元/股） |
| date | string | 交易日期（YYYY-MM-DD） |
| note | string | 備註（選填） |

### history（總資產歷史）

| 欄位 | 型別 | 說明 |
|------|------|------|
| user_id | string | 對應使用者 UID |
| date | string | 日期（YYYY-MM-DD） |
| total_value | number | 當日總市值 |
| total_cost | number | 當日總成本 |

---

## 本機開發

### 啟動開發伺服器

```bash
cd "F:\Investment and Finance\Stock DashBoard\stock-dashboard"
npm run dev
```

打開瀏覽器：`http://localhost:3000`

### 推送程式碼（自動部署）

```bash
git add .
git commit -m "說明這次改了什麼"
git push
```

推送後 Vercel 自動重新部署（約 1-2 分鐘）。

---

## 安全注意事項

| 項目 | 注意事項 |
|------|---------|
| `.env.local` | 絕對不能上傳到 GitHub |
| Firebase Service Account JSON | 只存在本機和 GitHub Secrets |
| GitHub Token | 外洩時立即到 GitHub Settings 撤銷 |
| 邀請碼外洩 | 立即修改 Vercel 環境變數並重新部署 |

---

## 費用說明

| 服務 | 免費額度 | 是否夠用 |
|------|---------|---------|
| Vercel | 免費方案 | ✅ |
| Firebase Firestore | 50,000 次讀取/天 | ✅ |
| Firebase Auth | 10,000 次/月 | ✅ |
| GitHub Actions | 2,000 分鐘/月 | ✅ |

---

## 常見問題

**Q：股價沒有更新？**
A：點儀表板頂部「↻ 更新股價」按鈕手動觸發，或去 GitHub Actions 手動執行。

**Q：新增持股沒出現？**
A：重新整理頁面。

**Q：忘記邀請碼？**
A：查看 Vercel 環境變數的 `NEXT_PUBLIC_INVITE_CODE`。

**Q：朋友忘記密碼？**
A：請他在登入頁點「忘記密碼」，系統會寄送重設連結。

**Q：想停止某人使用？**
A：到 Firebase Auth 後台停用或刪除該帳號。

**Q：每日持股快照出現重複紀錄？**
A：到 Firestore 後台手動刪除重複的 history 紀錄，只保留每天 1 筆。update_prices.py V02 已修正此問題。

**Q：Firestore 資料和畫面不一致？**
A：在個股詳情彈窗編輯任一筆交易紀錄（備註加空格再存），觸發 FIFO 重新計算。

---

## 版本紀錄

| 版本 | 日期 | 內容 |
|------|------|------|
| V01 | 2026-04-04 | 初始版本，完成登入/儀表板/自動股價更新/Vercel 部署 |
| V02 | 2026-04-05 | 新增所有網站連結、完整使用說明 |
| V03 | 2026-04-05 | 新增個股詳情彈窗、FIFO計算、股票搜尋（2262筆）、手動更新股價輪詢、修正重複history問題 |
| V04 | 2026-04-06 | 新增 t0_avg_cost 欄位解決多次快速建倉成本計算錯誤、庫存變動改名並新增日期篩選器、修正刪除建倉後shares未重算問題 |
