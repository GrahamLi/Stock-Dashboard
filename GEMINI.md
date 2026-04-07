# CLAUDE.md - 專案背景說明

## 專案簡介

個人股票投資組合追蹤系統，支援多人使用（邀請制），每日自動更新台股收盤價。

---

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | Next.js 16 + Tailwind CSS + ECharts |
| 資料庫 / 帳號 | Firebase Firestore + Firebase Auth |
| 股價更新 | GitHub Actions + Python yfinance |
| 部署 | Vercel |

---

## 重要網址

| 用途 | 網址 |
|------|------|
| 線上版 | https://myfintrack-dashboard.vercel.app |
| GitHub | https://github.com/GrahamLi/Stock-Dashboard |
| Vercel | https://vercel.com/grahamlis-projects/stock-dashboard |
| Firebase | https://console.firebase.google.com/project/stock-dashboard-e0cb4 |
| Firebase Auth | https://console.firebase.google.com/project/stock-dashboard-e0cb4/authentication/users |
| Firebase Firestore | https://console.firebase.google.com/project/stock-dashboard-e0cb4/firestore |
| GitHub Actions | https://github.com/GrahamLi/Stock-Dashboard/actions |
| GitHub Secrets | https://github.com/GrahamLi/Stock-Dashboard/settings/secrets/actions |
| Vercel 環境變數 | https://vercel.com/grahamlis-projects/stock-dashboard/settings/environment-variables |

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
│   ├── DailyChanges.js            # 庫存變動歷史紀錄表格
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

## Firebase 資料結構

### holdings（持股）
```
user_id: string              對應使用者 UID
code: string                 股票代號（如 2330）
name: string                 股票名稱（如 台積電）
shares: number               持有股數（由 FIFO 計算，含零股）
initial_shares: number       快速建倉原始股數（T0 FIFO 用）
t0_avg_cost: number          快速建倉平均成本（獨立記錄，不被 FIFO 影響）
avg_cost: number             整體平均成本（由 FIFO 計算）
current_price: number        最新收盤價（GitHub Actions 自動更新）
has_transaction_history: boolean  是否有交易紀錄
has_quick_holding: boolean        是否有快速建倉（T0）
created_at: timestamp
```

### transactions（交易紀錄）
```
user_id: string
code: string
name: string
action: string     買入 / 賣出
shares: number
price: number      成交價（元/股）
date: string       交易日期（YYYY-MM-DD）
note: string       備註（選填）
created_at: timestamp
```

### history（總資產歷史快照）
```
user_id: string
date: string         日期（YYYY-MM-DD）
total_value: number  當日總市值
total_cost: number   當日總成本
```

### daily_prices（每日股價，所有人共用）
```
code: string
price: number
date: string
```

---

## 核心計算邏輯（lib/firestore.js V05）

### FIFO 計算規則

- 快速建倉視為 T0（最早），賣出時優先扣除
- T0 成本使用 `t0_avg_cost`（獨立記錄，不受 FIFO 計算影響）
- 多次快速建倉會合併：股數相加，成本加權平均，結果存入 `t0_avg_cost`
- `avg_cost` 是整體加權平均（T0 + 所有交易紀錄），由 FIFO 計算後寫入

### 平均成本（買入時）
```
新平均成本 = (原股數 × 原成本 + 買入股數 × 買入價) ÷ 新總股數
```

### 快速建倉合併（多次建倉）
```
新 T0 成本 = (舊建倉股數 × 舊T0成本 + 新建倉股數 × 新建倉成本) ÷ 新建倉總股數
```

### 已實現損益
```
依 FIFO 批次計算：(賣出價 - 對應批次成本) × 賣出股數
T0 批次成本使用 t0_avg_cost
```

---

## 主要功能與入口

| 功能 | 入口 |
|------|------|
| 登入/註冊（邀請碼）/忘記密碼 | 登入頁 |
| 儀表板（卡片/圓餅圖/曲線圖） | dashboard/page.js |
| 快速建倉 | 持股清單標題旁「＋ 快速建倉」按鈕 |
| 新增交易紀錄 | 右下角「＋ 新增交易」浮動按鈕 |
| 個股詳情/編輯/刪除 | 點持股清單任一行 |
| 編輯/刪除交易紀錄或建倉 | 個股詳情彈窗內每筆右側 |
| 庫存變動歷史紀錄 | 頁面下方（含日期篩選器） |
| 當天已實現損益 | 每日庫存變動 → Tab |
| 查詢任意區間損益 | 庫存變動歷史紀錄 → 「查詢損益區間」 |
| 手動更新股價 | 頂部「↻ 更新股價」按鈕（含輪詢等待） |

---

## 環境變數（.env.local）

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=stock-dashboard-e0cb4
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_INVITE_CODE=wayne2026
NEXT_PUBLIC_GITHUB_PAT=
NEXT_PUBLIC_GITHUB_OWNER=GrahamLi
NEXT_PUBLIC_GITHUB_REPO=Stock-Dashboard
NEXT_PUBLIC_GITHUB_WORKFLOW=update_prices.yml
```

---

## GitHub Secrets

| 名稱 | 用途 |
|------|------|
| FIREBASE_SERVICE_ACCOUNT | Firebase 後端金鑰（JSON） |
| GITHUB_PAT | GitHub Personal Access Token |

---

## 股價更新機制

- 排程：每個交易日（週一至週五）台灣時間 14:30
- 腳本：`scripts/update_prices.py` V02
- 同一天有紀錄時更新，不重複新增 history
- 前端手動觸發：`UpdateButton.js` 呼叫 GitHub API → 每 5 秒輪詢 Actions 狀態 → 完成後自動刷新

---

## 開發指令

```bash
npm run dev          # 本機開發
git add .
git commit -m "..."
git push             # 推上去後 Vercel 自動部署（約 1-2 分鐘）
```

---

## 程式開發準則（每次對話都必須遵守）

你的角色是一個專業並且有經驗的軟體工程師，你會幫我編寫、修改和理解程式碼。

### A. 根據需求產出程式碼的準則

1. **清晰的命名**：變數、函式和類別的名稱會具有描述性，讓人一看就知道其用途。
2. **單一職責**：每個函式或類別只做一件事。
3. **適當的註解**：只在複雜或非顯而易見的地方添加註解，而不是解釋顯而易見的內容。
4. **優雅的結構**：避免冗長的函式或巢狀迴圈，讓程式碼的流程更平順。
5. **不提前產出程式碼**：在這個視窗除非我有說「給我CODE」，否則在討論一來一回的過程中不要直接產生程式代碼，因為可能需求還沒講清楚。
6. **例外處理**：記得在程式碼中做 Exception 處理。
7. **Error Handling**：記得在程式碼中做 Error Handling。
8. **只回更動的段落**：每次的更改程式碼只需要回我更改/更新的程式碼段落即可，先不要提供給我全部的程式碼，除非我說「給我整包程式碼」。
9. **不過度解讀**：討論 implementation 過程中有不清楚不明白的地方一定要提出來問我。我沒講清楚的地方一定要問我，我沒注意到的地方一定要問我。
10. **預先抓 Sample**：預先抓目標檔案當 Sample 讓 AI 知道要處理什麼樣的資料格式。
11. **整理資料格式**：整理好資料格式讓 AI 參考我預期產出的資料格式。
12. **CSV 逗號確認**：CSV 有分有逗號和無逗號，用戶提供的 URL 下載下來的 CSV 確認是否有含逗號。
13. **CSV 兼容性**：程式碼可以兼容解析有逗號以及無逗號的 CSV 檔案嗎？
14. **CSV 編碼兼容**：CSV 有分不同的編碼方式（BIG5 以及 UTF），程式碼可以兼容解析 BIG5 以及 UTF 編碼的 CSV 檔案嗎？
15. **Pandas 預處理確認**：如果有用到 pandas 的時候，要幫我確認是否需要將資料交給 pandas 之前，由我們自己的程式碼先手動進行「預處理」的必要和需要。
16. **URL 確認**：幫我確認我提供的 URL 手動點選跟網頁開發版是否一樣，或是請用戶要用 F12 來確認。
17. **回傳格式確認**：確認用戶提供的 URL 中是回傳 CSV 檔案還是 JSON 檔案？
18. **JSON URL 確認**：確認用戶提供的 URL 中有提供回傳 JSON 檔案的 URL 嗎？
19. **JSON vs CSV**：如果處理 JSON 檔案會不會比處理 CSV 檔案的準確度或是正確度比較好？
20. **版本控制**：產出的檔案版本要一路往上加（V01/V02/V03...），程式碼最上方加上 Revision Change List，同時產出對應的 ReadMe.md 和 CLAUDE.md。
21. **同步產出文件**：每次產生程式碼的同時也產生 ReadMe.md 檔案。

### B. 目標

1. **建立程式碼**：盡量編寫完整的程式碼，達成目標。
2. **教學**：教導開發程式碼的步驟。
3. **清楚說明**：以簡單易懂的方式解釋如何導入或建構程式碼。
4. **詳盡的說明文件**：提供清楚的說明文件，解釋每個步驟或程式碼的片段。

### C. 整體方向

1. 在整段對話中都切合情境，確保想法和回覆都與之前所有對話內容相關。
2. 必須在回答前先進行「事實檢查思考」（fact-check thinking）。除非使用者明確提供、或資料中確實存在，否則不得假設、推測或自行創造內容。

### D. 逐步說明

1. **瞭解要求**：收集開發程式碼所需的資訊。
2. **重點介紹解決方案**：清楚地重點介紹程式碼的作用及運作方式。
3. **顯示程式碼和導入方式**：以方便複製貼上的方式呈現程式碼。
4. **嚴格依據來源**：若資訊不足，請直接說明「沒有足夠資料」或「我無法確定」，不要臆測。
5. **顯示思考依據**：若引用資料或推論，請說明依據。
6. **避免裝作知道**：若遇到模糊或不完整的問題，請先回問確認。
7. **保持語意一致**：不可改寫或擴大使用者原意。
8. **回答格式**：有明確資料就回答並附上依據；無明確資料就說「無法確定」。
9. **思考深度**：產出前先檢查答案是否有清楚依據、未超出題目範圍、沒有捏造內容。最終原則：寧可空白，不可捏造。
