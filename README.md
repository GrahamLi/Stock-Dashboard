# 股票儀表板 Stock Dashboard

個人股票投資組合追蹤系統，支援多人使用（邀請制），每日自動更新台股收盤價。

---

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | Next.js + Tailwind CSS + ECharts |
| 資料庫 / 帳號 | Firebase Firestore + Firebase Auth |
| 股價更新 | GitHub Actions + Python yfinance |
| 部署 | Vercel |

---

## 專案結構

```
stock-dashboard/
├── app/
│   ├── page.js                  # 登入頁
│   ├── register/page.js         # 註冊頁（邀請碼制）
│   ├── forgot-password/page.js  # 忘記密碼頁
│   └── dashboard/page.js        # 儀表板主頁
├── components/
│   ├── Navbar.js                # 頂部導覽列
│   ├── SummaryCards.js          # 總成本/市值/損益卡片
│   ├── PieChart.js              # 持股佔比圓餅圖
│   ├── LineChart.js             # 總資產走勢曲線圖
│   ├── StockTable.js            # 持股清單（含編輯/刪除）
│   ├── AddStockModal.js         # 新增持股彈窗
│   ├── EditStockModal.js        # 編輯持股彈窗
│   └── DailyChanges.js         # 每日庫存變動表格
├── lib/
│   ├── firebase.js              # Firebase 初始化
│   └── firestore.js             # Firestore 操作函式
├── scripts/
│   └── update_prices.py         # 自動抓股價腳本
└── .github/
    └── workflows/
        └── update_prices.yml    # GitHub Actions 排程設定
```

---

## 本機開發

### 安裝依賴套件

```bash
npm install
```

### 設定環境變數

複製以下內容建立 `.env.local`：

```env
NEXT_PUBLIC_FIREBASE_API_KEY=你的值
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=你的值
NEXT_PUBLIC_FIREBASE_PROJECT_ID=你的值
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=你的值
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=你的值
NEXT_PUBLIC_FIREBASE_APP_ID=你的值
NEXT_PUBLIC_INVITE_CODE=你的邀請碼
```

### 啟動開發伺服器

```bash
npm run dev
```

打開瀏覽器輸入：`http://localhost:3000`

### 建置正式版本

```bash
npm run build
npm run start
```

---

## 部署流程

### 上傳到 GitHub

```bash
git add .
git commit -m "your commit message"
git push
```

> 推送到 GitHub 後，Vercel 會自動重新部署。

### 手動觸發股價更新

```bash
# 本機測試（需設定 FIREBASE_SERVICE_ACCOUNT 環境變數）
python scripts/update_prices.py
```

---

## 核心計算邏輯

### 平均成本計算（加權平均）

每次**買進**時重新計算平均成本：

```
新平均成本 = (原持股數 × 原平均成本 + 本次買入股數 × 本次買入價)
             ÷ (原持股數 + 本次買入股數)
```

**範例：**

```
第一次買進：1000 股 × $580 = $580,000
第二次買進：500 股 × $620 = $310,000

新平均成本 = ($580,000 + $310,000) ÷ (1000 + 500)
           = $890,000 ÷ 1500
           = $593.33
```

每次**賣出**時：
- 有完整交易紀錄（has_transaction_history = true）→ 使用 FIFO 先進先出
- 只有平均成本（has_transaction_history = false）→ 平均成本不變，只減少股數

### 未實現損益計算

```
未實現損益 = (現價 - 平均成本) × 持股數
損益% = (現價 - 平均成本) ÷ 平均成本 × 100%
```

### 總市值計算

```
個股市值 = 現價 × 持股數
總市值 = Σ 所有持股市值
```

### 股數單位換算

```
1 張 = 1000 股
零股 = 不足 1000 股的部分

顯示範例：
1500 股 → 1 張 500 股
1000 股 → 1 張
500 股  → 500 股
```

---

## 股價自動更新

### 排程時間

GitHub Actions 設定為**每個交易日（週一至週五）台灣時間 14:30** 執行。

> 台股收盤時間為 13:30，腳本在收盤後 1 小時執行，確保取得當日收盤價。

### 股價來源

使用 `yfinance` 套件抓取台股資料：

| 市場 | 代號格式 | 範例 |
|------|---------|------|
| 上市（TWSE） | `代號.TW` | `2330.TW` |
| 上櫃（TPEX） | `代號.TWO` | `6547.TWO` |

腳本會先嘗試 `.TW`，若無資料則自動改試 `.TWO`。

### 盤中/收盤前查看

| 時間 | 顯示的股價 |
|------|-----------|
| 盤後（14:30 後） | ✅ 今日收盤價 |
| 盤中（09:00–13:30） | ⚠️ 昨日收盤價 |
| 收盤前（13:30–14:30） | ⚠️ 昨日收盤價 |

頁面上會顯示「資料更新時間」，讓你確認資料是否為最新。

---

## Firebase 資料結構

### holdings（持股）

| 欄位 | 型別 | 說明 |
|------|------|------|
| user_id | string | 對應使用者 UID |
| code | string | 股票代號（如 2330） |
| name | string | 股票名稱（如 台積電） |
| shares | number | 持有股數（含零股） |
| avg_cost | number | 平均成本（元/股） |
| current_price | number | 最新收盤價（自動更新） |
| has_transaction_history | boolean | 是否有完整交易紀錄 |
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

### daily_prices（每日股價）

| 欄位 | 型別 | 說明 |
|------|------|------|
| code | string | 股票代號 |
| price | number | 收盤價 |
| date | string | 日期（YYYY-MM-DD） |

### history（總資產歷史）

| 欄位 | 型別 | 說明 |
|------|------|------|
| user_id | string | 對應使用者 UID |
| date | string | 日期（YYYY-MM-DD） |
| total_value | number | 當日總市值 |
| total_cost | number | 當日總成本 |

---

## 帳號系統

### 註冊

- 開放註冊，但需要**邀請碼**才能完成註冊
- 邀請碼設定在 `.env.local` 的 `NEXT_PUBLIC_INVITE_CODE`
- 更換邀請碼只需修改 `.env.local` 並重新部署

### 資料隔離

- 每位使用者只能看到自己的持股和交易紀錄
- 透過 Firebase Firestore RLS（Row Level Security）規則保護

---

## 注意事項

### 安全性

- ⚠️ `.env.local` 絕對不能上傳到 GitHub
- ⚠️ Firebase Service Account JSON 金鑰只存在 GitHub Secrets，不存在程式碼中
- ⚠️ 邀請碼外流時，請立即更換並重新部署

### 費用

| 服務 | 免費額度 | 超過後 |
|------|---------|--------|
| Vercel | 免費方案 | 付費升級 |
| Firebase Firestore | 50,000 次讀取/天 | 按量計費 |
| Firebase Auth | 10,000 次/月 | 免費 |
| GitHub Actions | 2,000 分鐘/月 | 免費額度非常夠用 |

> 小團體使用幾乎不會超過免費額度。

### 已知限制

- 股價每天只更新一次（收盤後），非即時
- yfinance 為非官方 API，若 Yahoo Finance 改版可能暫時失效
- ETF 與一般股票都支援，但少數冷門股可能無法取得股價

---

## 常見問題

**Q：股價沒有更新怎麼辦？**
A：去 GitHub → Actions → Update Stock Prices → Run workflow 手動觸發。

**Q：新增了持股但沒有出現？**
A：重新整理頁面，或確認 Firestore 規則是否正確設定。

**Q：忘記邀請碼怎麼辦？**
A：查看 `.env.local` 檔案中的 `NEXT_PUBLIC_INVITE_CODE`。

**Q：想新增朋友使用怎麼辦？**
A：把網址和邀請碼給他，讓他自己在註冊頁面完成註冊。

---

## 版本紀錄

| 版本 | 日期 | 內容 |
|------|------|------|
| V01 | 2026-04-04 | 初始版本，完成登入/儀表板/自動股價更新/Vercel 部署 |
