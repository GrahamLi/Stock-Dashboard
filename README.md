# 股票儀表板 Stock Dashboard

> V02 更新：新增所有相關網站連結、使用說明、功能介紹

個人股票投資組合追蹤系統，支援多人使用（邀請制），每日自動更新台股收盤價。

---

## 相關網站總覽

| 網站 | 網址 | 用途 |
|------|------|------|
| 儀表板（線上版） | https://stock-dashboard-pink-six.vercel.app | 使用者每天看股票用 |
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
| 前端 | Next.js + Tailwind CSS + ECharts |
| 資料庫 / 帳號 | Firebase Firestore + Firebase Auth |
| 股價更新 | GitHub Actions + Python yfinance |
| 部署 | Vercel |

---

## 各網站使用說明

---

### 1. 儀表板（線上版）
**網址：** https://stock-dashboard-pink-six.vercel.app

這是所有使用者每天打開看股票的地方。

#### 功能說明

**登入頁**
- 輸入 Email + 密碼登入
- 點「忘記密碼」會寄送重設連結到信箱
- 點「還沒有帳號？註冊」前往註冊頁

**註冊頁**
- 輸入 Email + 密碼 + 確認密碼 + 邀請碼
- 邀請碼由管理者提供，沒有邀請碼無法註冊
- 目前邀請碼：`wayne2026`（可在 Vercel 環境變數修改）

**儀表板主頁**

| 區塊 | 說明 |
|------|------|
| 上方三張卡片 | 顯示股票總成本、總市值、未實現損益（含百分比） |
| 持股佔比圓餅圖 | 各股市值佔總市值的百分比 |
| 總資產走勢曲線圖 | 每天收盤後記錄一個點，隨時間累積成曲線 |
| 持股清單 | 每筆持股的詳細數字，右側有編輯/刪除按鈕 |
| 每日庫存變動 | 分為「交易紀錄」和「每日持股快照」兩個 Tab |
| 右下角浮動按鈕 | 「＋ 新增持股」 |

**新增持股彈窗（兩個 Tab）**

*快速建倉*
- 適合一開始輸入現有持股，不知道每筆交易明細
- 填入：股票代號、股票名稱、持有股數、平均成本
- 系統會將此筆視為 T0（最早的持股），賣出時優先從這裡扣除

*輸入交易紀錄*
- 適合記錄每一筆實際買賣交易
- 填入：股票代號、股票名稱、買入/賣出、股數、成交價、交易日期、備註
- 系統會依照 FIFO 計算平均成本和已實現損益

**編輯持股**
- 點持股清單右側「編輯」按鈕
- 可修改：股票代號、股票名稱、持有股數、平均成本

**刪除持股**
- 點持股清單右側「刪除」按鈕
- 適用於輸入錯誤的情況
- 刪除後會同時清除該用戶的歷史快照（history）
- ⚠️ 若是真實賣出，請用「輸入交易紀錄 → 賣出」，不要用刪除按鈕

---

### 2. GitHub
**專案網址：** https://github.com/GrahamLi/Stock-Dashboard

存放所有程式碼，並負責每天自動更新股價。

#### 手動觸發股價更新
1. 打開 https://github.com/GrahamLi/Stock-Dashboard/actions
2. 左側點「Update Stock Prices」
3. 右側點「Run workflow ▼」
4. 再點綠色「Run workflow」
5. 等待約 30 秒，出現綠色勾勾代表成功

#### 自動觸發排程
- 每個交易日（週一至週五）台灣時間 14:30 自動執行
- 不需要手動操作

#### 管理 GitHub Secrets
**網址：** https://github.com/GrahamLi/Stock-Dashboard/settings/secrets/actions

目前存放的 Secrets：

| Secret 名稱 | 用途 |
|------------|------|
| `FIREBASE_SERVICE_ACCOUNT` | Firebase 後端金鑰（JSON 格式） |
| `GITHUB_PAT` | GitHub Personal Access Token |

#### 產生新的 GitHub Token
**網址：** https://github.com/settings/tokens

1. 點「Generate new token」→「Generate new token (classic)」
2. 勾選 `workflow` 權限
3. 複製 Token 存好（只顯示一次）
4. 更新到 GitHub Secrets 和 Vercel 環境變數

#### 推送程式碼
```bash
git add .
git commit -m "說明這次改了什麼"
git push
```
推送後 Vercel 會自動重新部署（約 1-2 分鐘）。

---

### 3. Vercel
**網址：** https://vercel.com/grahamlis-projects/stock-dashboard

負責將程式碼部署成線上網頁。

#### 查看部署狀態
- 打開 Vercel 專案頁面，可以看到最新部署的狀態和時間
- 每次 `git push` 後自動重新部署

#### 管理環境變數
**網址：** https://vercel.com/grahamlis-projects/stock-dashboard/settings/environment-variables

目前存放的環境變數：

| 變數名稱 | 用途 |
|---------|------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase 前端金鑰 |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase 驗證網域 |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase 專案 ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase 儲存空間 |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase 訊息 ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase 應用程式 ID |
| `NEXT_PUBLIC_INVITE_CODE` | 邀請碼 |
| `GITHUB_PAT` | GitHub Personal Access Token |
| `NEXT_PUBLIC_GITHUB_OWNER` | GitHub 帳號名稱（GrahamLi） |
| `NEXT_PUBLIC_GITHUB_REPO` | GitHub 專案名稱（Stock-Dashboard） |
| `NEXT_PUBLIC_GITHUB_WORKFLOW` | Actions 工作流程檔名（update_prices.yml） |

#### 新增/修改環境變數
1. 點「Add New」或既有變數旁的編輯按鈕
2. 填入 Name 和 Value（值不需要加引號）
3. 勾選所有 Environment（Production / Preview / Development）
4. 點「Save」
5. ⚠️ 修改後需重新部署才會生效

#### 修改邀請碼步驟
1. 到 Vercel 環境變數找到 `NEXT_PUBLIC_INVITE_CODE`
2. 修改 Value
3. 重新部署（Deployments → 最新那筆 → Redeploy）

---

### 4. Firebase Console
**網址：** https://console.firebase.google.com/project/stock-dashboard-e0cb4

管理資料庫和使用者帳號。

---

#### 4-1. Firebase Authentication（帳號管理）
**網址：** https://console.firebase.google.com/project/stock-dashboard-e0cb4/authentication/users

| 功能 | 操作方式 |
|------|---------|
| 查看所有使用者 | 直接在列表看到 Email、建立日期、最後登入 |
| 手動新增使用者 | 點「新增使用者」，填入 Email + 密碼 |
| 停用使用者 | 點使用者右側「⋮」→「停用帳戶」|
| 刪除使用者 | 點使用者右側「⋮」→「刪除帳戶」|
| 重設密碼 | 點使用者右側「⋮」→「寄送密碼重設郵件」|

**授權網域管理**
1. 點上方「設定」Tab → 「已授權的網域」
2. 新增你的 Vercel 網址：`stock-dashboard-pink-six.vercel.app`
3. ⚠️ 沒有加入授權網域，線上版將無法登入

---

#### 4-2. Firebase Firestore（資料庫）
**網址：** https://console.firebase.google.com/project/stock-dashboard-e0cb4/firestore

**資料結構說明**

| Collection | 說明 | 誰可以看 |
|-----------|------|---------|
| `holdings` | 每位使用者的持股 | 本人才能看 |
| `transactions` | 每位使用者的交易紀錄 | 本人才能看 |
| `history` | 每位使用者的總資產歷史快照 | 本人才能看 |
| `daily_prices` | 所有股票的每日收盤價 | 所有登入者可看 |

**history 說明**
- 每天 GitHub Actions 執行後自動新增一筆
- 用來畫「總資產走勢曲線圖」
- 使用者用刪除按鈕刪除持股（key 錯）→ 同時刪除該用戶的 history
- 使用者透過交易紀錄賣出 → 保留 history

---

#### 4-3. Firebase Firestore 安全規則
**網址：** https://console.firebase.google.com/project/stock-dashboard-e0cb4/firestore/rules

```
holdings / transactions / history
→ 登入後只能讀寫自己的資料（user_id 必須符合）

daily_prices
→ 登入者可以讀取
→ 只有後端腳本可以寫入
```

修改規則後記得點「發布」才會生效。

---

#### 4-4. Firebase Service Account（後端金鑰）
**網址：** https://console.firebase.google.com/project/stock-dashboard-e0cb4/settings/serviceaccounts/adminsdk

GitHub Actions 需要用這個金鑰才能寫入 Firestore。

**產生新金鑰步驟**
1. 點「產生新的私密金鑰」→「產生金鑰」
2. 下載 JSON 檔案，妥善保存，不可上傳 GitHub
3. 將 JSON 內容全部複製
4. 到 GitHub Secrets 更新 `FIREBASE_SERVICE_ACCOUNT`

---

## 本機開發

### 啟動開發伺服器

```bash
cd "F:\Investment and Finance\Stock DashBoard\stock-dashboard"
npm run dev
```

打開瀏覽器：`http://localhost:3000`

### .env.local 完整內容

```env
NEXT_PUBLIC_FIREBASE_API_KEY=你的值
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=你的值
NEXT_PUBLIC_FIREBASE_PROJECT_ID=你的值
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=你的值
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=你的值
NEXT_PUBLIC_FIREBASE_APP_ID=你的值
NEXT_PUBLIC_INVITE_CODE=wayne2026
GITHUB_PAT=你的Token
NEXT_PUBLIC_GITHUB_OWNER=GrahamLi
NEXT_PUBLIC_GITHUB_REPO=Stock-Dashboard
NEXT_PUBLIC_GITHUB_WORKFLOW=update_prices.yml
```

---

## 核心計算邏輯

### 平均成本計算（FIFO）

快速建倉視為 T0（最早的持股），賣出時優先從這裡扣除。

**買進時（加權平均）：**
```
新平均成本 = (原持股數 × 原平均成本 + 買入股數 × 買入價) ÷ 新總股數
```

**賣出時（FIFO）：**
```
優先賣出 T0（快速建倉）→ 再賣 T+1 → 依此類推
剩餘股票重新計算平均成本
```

### 已實現損益計算

```
已實現損益 = Σ (賣出價 - 對應批次成本) × 賣出股數
```

**範例：快速建倉 300 股 + 買 200 + 賣 400**
```
T0  快速建倉：300 股 @$580
T+1 買入：   200 股 @$620
T+2 賣出：   400 股 @$700

→ 先賣 T0 的 300 股，再賣 T+1 的 100 股
→ 剩餘：T+1 的 100 股 @$620

已實現損益 = (700-580)×300 + (700-620)×100 = $44,000
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
A：去 GitHub Actions 手動觸發，或點儀表板上的「更新股價」按鈕。

**Q：新增持股沒出現？**
A：重新整理頁面。

**Q：忘記邀請碼？**
A：查看 Vercel 環境變數的 `NEXT_PUBLIC_INVITE_CODE`。

**Q：朋友忘記密碼？**
A：請他在登入頁點「忘記密碼」，系統會寄送重設連結。

**Q：想停止某人使用？**
A：到 Firebase Auth 後台停用或刪除該帳號。

**Q：Vercel 環境變數修改後沒生效？**
A：到 Vercel → Deployments → 最新那筆 → Redeploy。

---

## 版本紀錄

| 版本 | 日期 | 內容 |
|------|------|------|
| V01 | 2026-04-04 | 初始版本，完成登入/儀表板/自動股價更新/Vercel 部署 |
| V02 | 2026-04-05 | 新增所有網站連結、完整使用說明、功能介紹 |
