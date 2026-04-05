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
│   ├── EditStockModal.js          # 編輯持股彈窗（已棄用）
│   ├── DailyChanges.js            # 每日庫存變動表格
│   └── UpdateButton.js            # 手動更新股價按鈕
├── lib/
│   ├── firebase.js                # Firebase 初始化
│   ├── firestore.js               # 核心資料庫操作（含FIFO計算）
│   └── stockList.js               # 台股代號對照表（2262筆）
├── scripts/
│   └── update_prices.py           # GitHub Actions 抓股價腳本
└── .github/
    └── workflows/
        └── update_prices.yml      # GitHub Actions 排程（每天14:30）
```

---

## Firebase 資料結構

### holdings（持股）
```
user_id: string          對應使用者 UID
code: string             股票代號（如 2330）
name: string             股票名稱（如 台積電）
shares: number           持有股數（含零股，numeric）
initial_shares: number   快速建倉原始股數（T0 FIFO 用）
avg_cost: number         平均成本（元/股）
current_price: number    最新收盤價（GitHub Actions 自動更新）
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
date: string       日期（YYYY-MM-DD）
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

## 核心計算邏輯（lib/firestore.js）

### FIFO 計算
- 快速建倉視為 T0（最早），賣出時優先扣除
- 使用 `initial_shares` 保留原始建倉股數（避免賣光後 T0 消失）
- 有完整交易紀錄 → FIFO
- 只有快速建倉 → 加權平均

### 平均成本（買入時）
```
新平均成本 = (原股數 × 原成本 + 買入股數 × 買入價) ÷ 新總股數
```

### 已實現損益
```
依 FIFO 批次計算：(賣出價 - 對應批次成本) × 賣出股數
```

---

## 主要功能

| 功能 | 入口 |
|------|------|
| 登入/註冊（邀請碼）/忘記密碼 | 登入頁 |
| 儀表板（卡片/圓餅圖/曲線圖） | dashboard/page.js |
| 快速建倉 | 持股清單標題旁按鈕 |
| 新增交易紀錄 | 右下角浮動按鈕 |
| 個股詳情/編輯/刪除 | 點持股清單任一行 |
| 刪除交易紀錄/建倉 | 個股詳情彈窗內 |
| 每日庫存變動 | 頁面下方（交易紀錄/快照/損益 Tab） |
| 手動更新股價 | 頂部「更新股價」按鈕 |
| 查詢任意區間損益 | 每日庫存變動→「查詢損益區間」 |

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
- 腳本：`scripts/update_prices.py`
- 同一天有紀錄時更新，不重複新增 history
- 前端手動觸發：`UpdateButton.js` 呼叫 GitHub API → 輪詢 Actions 狀態 → 完成後自動刷新

---

## 開發指令

```bash
npm run dev          # 本機開發
git add .
git commit -m "..."
git push             # 推上去後 Vercel 自動部署
```

---

## 程式碼規則

1. 每次產出完整程式碼（不要部分片段）
2. 加上版本 Revision Change List 註解
3. 一定要有 Exception / Error Handling
4. 沒講清楚的地方一定要問
5. 除非說「給我CODE」否則不產出程式碼
