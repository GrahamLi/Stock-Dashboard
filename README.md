# 股票儀表板 / MyFintrack Dashboard

> V05 更新：多帳戶支援、各帳戶獨立 FIFO、報酬率計算、當月/當年/區間損益 Tab

個人股票投資組合追蹤系統，支援多人使用（邀請制），每日自動更新台股收盤價。

---

## 線上網址

**https://myfintrack-dashboard.vercel.app**

---

## 相關網站總覽

| 網站 | 網址 | 用途 |
|------|------|------|
| 儀表板（線上版） | https://myfintrack-dashboard.vercel.app | 使用者每天看股票用 |
| GitHub 專案 | https://github.com/GrahamLi/Stock-Dashboard | 存放程式碼 |
| Vercel | https://vercel.com/grahamlis-projects/stock-dashboard | 前端部署 |
| Firebase Console | https://console.firebase.google.com/project/stock-dashboard-e0cb4 | 資料庫後台 |
| Firebase Auth | https://console.firebase.google.com/project/stock-dashboard-e0cb4/authentication/users | 帳號管理 |
| Firebase Firestore | https://console.firebase.google.com/project/stock-dashboard-e0cb4/firestore | 資料庫 |
| Firebase Rules | https://console.firebase.google.com/project/stock-dashboard-e0cb4/firestore/rules | 安全規則 |
| GitHub Actions | https://github.com/GrahamLi/Stock-Dashboard/actions | 股價更新 |
| GitHub Secrets | https://github.com/GrahamLi/Stock-Dashboard/settings/secrets/actions | 環境變數 |
| Vercel 環境變數 | https://vercel.com/grahamlis-projects/stock-dashboard/settings/environment-variables | 環境變數 |
| GitHub Token | https://github.com/settings/tokens | Personal Access Token |

---

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | Next.js 16 + Tailwind CSS + ECharts |
| 資料庫 / 帳號 | Firebase Firestore + Firebase Auth |
| 股價更新 | GitHub Actions + Python yfinance |
| 部署 | Vercel |

---

## 功能說明

### 帳戶管理

支援多個證券帳戶，每個帳戶獨立計算 FIFO 和報酬率：

| 功能 | 說明 |
|------|------|
| 新增帳戶 | 自訂名稱（如永豐、富邦、國泰） |
| 改名 | 可以 |
| 刪除 | 需先賣出所有持股才能刪除 |
| 全部帳戶 | 各帳戶合計，含已刪除帳戶歷史 |
| 預設帳戶 | 不能刪除，舊資料自動歸類 |

### 儀表板主頁

| 區塊 | 說明 |
|------|------|
| 上方三張卡片 | 股票總成本、總市值、未實現損益（依帳戶篩選） |
| 持股佔比圓餅圖 | 各股市值佔比（依帳戶篩選） |
| 總資產走勢曲線圖 | 每天收盤後記錄（依帳戶篩選） |
| 持股清單 | 含帳戶欄位，點整行開個股詳情 |
| 庫存變動歷史紀錄 | 6個Tab（依帳戶篩選） |

### 庫存變動歷史紀錄 6 個 Tab

| Tab | 說明 |
|-----|------|
| 交易紀錄 | 含日期篩選、成本價、報酬率 |
| 每日持股快照 | 每天總市值/總成本/損益 |
| 當天已實現損益 | 含成本價、報酬率、合計 |
| 當月已實現損益 | 含成本價、報酬率、合計 |
| 當年已實現損益 | 含成本價、報酬率、合計 |
| 損益區間查詢 | 自訂日期區間，含報酬率 |

### 所有操作入口

| 功能 | 入口 |
|------|------|
| 帳戶切換 | 持股清單上方帳戶切換器 |
| 帳戶管理 | 帳戶切換器旁「⚙ 管理帳戶」 |
| 快速建倉 | 持股清單標題旁「＋ 快速建倉」 |
| 新增交易紀錄 | 右下角「＋ 新增交易」浮動按鈕 |
| 個股詳情 | 點持股清單任一行 |
| 編輯/刪除交易紀錄 | 個股詳情彈窗內每筆右側 |
| 手動更新股價 | 頂部「↻ 更新股價」按鈕 |

---

## 核心計算邏輯

### FIFO 計算（每個帳戶獨立）

```
同一股票在不同帳戶：各自獨立 FIFO，不互相影響

快速建倉 T0：2000 股 @$1,300（t0_avg_cost = 1300）
買入 T+1：  100 股  @$800
賣出 T+2：  500 股  @$1,800

FIFO：先賣 T0 的 500 股 @$1,300
已實現損益 = (1800-1300) × 500 = $250,000
成本價 = $1,300
報酬率 = $250,000 ÷ ($1,300 × 500) × 100% = 38.46%
```

### 多次快速建倉合併

```
第一次建倉：1000 股 @$1,000 → t0_avg_cost = $1,000
第二次建倉：1000 股 @$1,400

合併後 T0：
  股數 = 2000 股
  t0_avg_cost = (1000×1000 + 1000×1400) ÷ 2000 = $1,200
```

### 全部帳戶合計報酬率

```
全部報酬率 = 全部已實現損益合計 ÷ 全部投入成本合計 × 100%
```

---

## Firebase 資料結構

### holdings（持股）

| 欄位 | 型別 | 說明 |
|------|------|------|
| user_id | string | 對應使用者 UID |
| code | string | 股票代號 |
| name | string | 股票名稱 |
| account | string | 帳戶名稱（預設「預設帳戶」） |
| shares | number | 持有股數（由 FIFO 計算） |
| initial_shares | number | 快速建倉總股數 |
| t0_avg_cost | number | 快速建倉平均成本（獨立） |
| avg_cost | number | 整體平均成本（FIFO計算） |
| current_price | number | 最新收盤價 |
| has_transaction_history | boolean | 是否有交易紀錄 |
| has_quick_holding | boolean | 是否有快速建倉 |
| created_at | timestamp | 建立時間 |

### transactions（交易紀錄）

| 欄位 | 型別 | 說明 |
|------|------|------|
| user_id | string | 對應使用者 UID |
| code | string | 股票代號 |
| name | string | 股票名稱 |
| account | string | 帳戶名稱 |
| action | string | 買入 / 賣出 |
| shares | number | 股數 |
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

### accounts（帳戶）- 新

| 欄位 | 型別 | 說明 |
|------|------|------|
| user_id | string | 對應使用者 UID |
| name | string | 帳戶名稱（自訂） |
| created_at | timestamp | 建立時間 |

---

## 帳號系統

| 操作 | 說明 |
|------|------|
| 註冊 | 需要邀請碼：`wayne2026` |
| 登入 | Email + 密碼 |
| 忘記密碼 | 輸入 Email，系統寄送重設連結 |

---

## 股價自動更新

每個交易日（週一至週五）台灣時間 **14:30** 自動執行。

手動更新：點頂部「↻ 更新股價」→ 顯示更新進度 → 自動刷新。

---

## 本機開發

```bash
cd "F:\Investment and Finance\Stock DashBoard\stock-dashboard"
npm run dev
```

推送程式碼（自動部署）：

```bash
git add .
git commit -m "說明改了什麼"
git push
```

---

## 安全注意事項

| 項目 | 注意事項 |
|------|---------|
| `.env.local` | 絕對不能上傳到 GitHub |
| Firebase Service Account JSON | 只存在本機和 GitHub Secrets |
| GitHub Token | 外洩時立即到 GitHub Settings 撤銷 |

---

## 版本紀錄

| 版本 | 日期 | 內容 |
|------|------|------|
| V01 | 2026-04-04 | 初始版本 |
| V02 | 2026-04-05 | 完整使用說明 |
| V03 | 2026-04-05 | 個股詳情彈窗、FIFO計算、手動更新股價輪詢 |
| V04 | 2026-04-06 | t0_avg_cost 欄位、庫存變動日期篩選、修正刪除建倉問題 |
| V05 | 2026-04-07 | 多帳戶支援、各帳戶獨立FIFO、報酬率計算、當月/當年/區間損益Tab、成本價欄位 |
