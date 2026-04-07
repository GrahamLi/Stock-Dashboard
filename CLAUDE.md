# CLAUDE.md - 專案背景說明 V3

## 專案簡介

個人股票投資組合追蹤系統，支援多人使用（邀請制），每日自動更新台股收盤價。
支援多帳戶管理，每個帳戶獨立 FIFO 計算。

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
| Firebase Rules | https://console.firebase.google.com/project/stock-dashboard-e0cb4/firestore/rules |
| GitHub Actions | https://github.com/GrahamLi/Stock-Dashboard/actions |
| GitHub Secrets | https://github.com/GrahamLi/Stock-Dashboard/settings/secrets/actions |
| Vercel 環境變數 | https://vercel.com/grahamlis-projects/stock-dashboard/settings/environment-variables |

---

## 專案結構

```
stock-dashboard/
├── app/
│   ├── layout.js
│   ├── page.js                    # 登入頁
│   ├── register/page.js           # 註冊頁（邀請碼制）
│   ├── forgot-password/page.js
│   └── dashboard/page.js          # 儀表板主頁（核心）
├── components/
│   ├── AuthGuard.js
│   ├── Navbar.js
│   ├── SummaryCards.js            # 總成本/市值/損益卡片
│   ├── PieChart.js                # 持股佔比圓餅圖
│   ├── LineChart.js               # 總資產走勢曲線圖
│   ├── AccountSwitcher.js         # 帳戶切換器（新）
│   ├── StockTable.js              # 持股清單（點整行開彈窗）
│   ├── StockDetailModal.js        # 個股詳情彈窗
│   ├── AddStockModal.js           # 新增交易紀錄彈窗
│   ├── QuickHoldingModal.js       # 快速建倉彈窗
│   ├── DailyChanges.js            # 庫存變動歷史紀錄
│   └── UpdateButton.js            # 手動更新股價按鈕（含輪詢）
├── lib/
│   ├── firebase.js
│   ├── firestore.js               # 核心資料庫操作 V06
│   └── stockList.js               # 台股代號對照表（2262筆）
├── scripts/
│   └── update_prices.py           # GitHub Actions 抓股價腳本 V02
└── .github/
    └── workflows/
        └── update_prices.yml
```

---

## Firebase 資料結構

### holdings（持股）
```
user_id: string
code: string
name: string
account: string          帳戶名稱（預設「預設帳戶」）
shares: number           由 FIFO 計算
initial_shares: number   快速建倉原始股數（T0）
t0_avg_cost: number      快速建倉平均成本（獨立，不被 FIFO 影響）
avg_cost: number         整體平均成本（由 FIFO 計算）
current_price: number    最新收盤價
has_transaction_history: boolean
has_quick_holding: boolean
created_at: timestamp
```

### transactions（交易紀錄）
```
user_id: string
code: string
name: string
account: string          帳戶名稱
action: string           買入 / 賣出
shares: number
price: number
date: string             YYYY-MM-DD
note: string
created_at: timestamp
```

### history（總資產歷史快照）
```
user_id: string
date: string
total_value: number
total_cost: number
```

### accounts（帳戶）- 新 collection
```
user_id: string
name: string             帳戶名稱（自訂）
created_at: timestamp
```

---

## 核心計算邏輯（lib/firestore.js V06）

### FIFO 計算規則
- 每個帳戶獨立跑 FIFO，不同帳戶的同一股票互不影響
- 快速建倉視為 T0（最早），成本存入 t0_avg_cost
- 多次快速建倉合併：股數相加，成本加權平均
- avg_cost 由 FIFO 計算（T0 + 交易紀錄）

### 已實現損益計算
- 按帳戶分開計算，各帳戶分別算完再加總
- 回傳 costPrice（FIFO 成本價）和 realizedPnl

### 報酬率計算
```
單筆報酬率 = 已實現損益 ÷ (成本價 × 股數) × 100%
合計報酬率 = 合計損益 ÷ 合計投入成本 × 100%
全部帳戶報酬率 = 全部損益 ÷ 全部投入成本 × 100%
```

---

## 帳戶管理規則

| 規則 | 說明 |
|------|------|
| 新增 | 自訂名稱 |
| 改名 | 可以 |
| 刪除 | 需先賣出所有持股才能刪除 |
| 刪除後 | 帳戶從切換器消失，歷史紀錄保留 |
| 全部帳戶 | 含已刪除帳戶的歷史紀錄 |
| 預設帳戶 | 不能刪除，舊資料自動歸類 |

---

## 主要功能與入口

| 功能 | 入口 |
|------|------|
| 帳戶切換 | 持股清單上方帳戶切換器 |
| 帳戶管理 | 帳戶切換器旁「⚙ 管理帳戶」 |
| 快速建倉 | 持股清單標題旁「＋ 快速建倉」 |
| 新增交易紀錄 | 右下角「＋ 新增交易」浮動按鈕 |
| 個股詳情/編輯/刪除 | 點持股清單任一行 |
| 庫存變動歷史紀錄 | 頁面下方（6個Tab） |
| 手動更新股價 | 頂部「↻ 更新股價」按鈕 |

### 庫存變動歷史紀錄 6 個 Tab
```
交易紀錄 | 每日持股快照 | 當天已實現損益 | 當月已實現損益 | 當年已實現損益 | 損益區間查詢
```

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

## Firebase Firestore 安全規則

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /holdings/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.user_id;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.user_id;
    }
    match /transactions/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.user_id;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.user_id;
    }
    match /history/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.user_id;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.user_id;
    }
    match /accounts/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.user_id;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.user_id;
    }
  }
}
```

---

## 已知問題（待修正）

- 帳戶切換器在某些狀況下不顯示（fetchAccounts 回傳空陣列時）
- 新增交易/快速建倉的帳戶下拉選單在 accounts 為空時異常

---

## 開發指令

```bash
npm run dev
git add .
git commit -m "..."
git push
```

本機路徑：`F:\Investment and Finance\Stock DashBoard\stock-dashboard`

---

## 程式開發準則（每次對話都必須遵守）

你的角色是一個專業並且有經驗的軟體工程師，你會幫我編寫、修改和理解程式碼。

### A. 根據需求產出程式碼的準則

1. **清晰的命名**：變數、函式和類別的名稱會具有描述性。
2. **單一職責**：每個函式或類別只做一件事。
3. **適當的註解**：只在複雜或非顯而易見的地方添加註解。
4. **優雅的結構**：避免冗長的函式或巢狀迴圈。
5. **不提前產出程式碼**：除非我說「給我CODE」否則不產出程式碼。
6. **例外處理**：記得在程式碼中做 Exception 處理。
7. **Error Handling**：記得在程式碼中做 Error Handling。
8. **給完整函式**：每次給我一個完整函式，不要只給某幾行叫我更改。我一次貼一個函式直接取代，不要給片段。
9. **不過度解讀**：有不清楚的地方一定要問我。
10. **版本控制**：檔案版本一路往上加（V01/V02...），最上方加 Revision Change List。
11. **同步產出文件**：每次產生程式碼的同時也產生 ReadMe.md 和 CLAUDE.md。

### B. 目標

1. 建立完整程式碼達成目標。
2. 教學：教導開發步驟。
3. 清楚說明：簡單易懂的方式解釋。
4. 詳盡文件：清楚說明每個步驟。

### C. 整體方向

1. 切合情境，確保回覆與之前對話相關。
2. 回答前先進行「事實檢查思考」，不得假設、推測或自行創造內容。

### D. 逐步說明

1. 瞭解要求後再開始。
2. 重點介紹解決方案。
3. 以方便複製貼上的方式呈現程式碼。
4. 嚴格依據來源，資訊不足說「無法確定」。
5. 避免裝作知道，遇到模糊問題先確認。
6. 寧可空白，不可捏造。
