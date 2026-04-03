# =============================================================================
# update_prices.py - V01
# =============================================================================
# Revision Change List:
# V01 - 初始版本
#     - 從 Firestore 讀取所有持股代號
#     - 用 yfinance 抓取台股收盤價
#     - 更新 Firestore holdings 的 current_price
#     - 新增一筆 history 記錄（總市值快照）
# =============================================================================

import yfinance as yf
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import date
import os
import json

def initialize_firebase():
    """初始化 Firebase Admin SDK"""
    try:
        service_account_info = json.loads(os.environ["FIREBASE_SERVICE_ACCOUNT"])
        cred = credentials.Certificate(service_account_info)
        firebase_admin.initialize_app(cred)
        print("Firebase 初始化成功")
    except Exception as e:
        print(f"Firebase 初始化失敗：{e}")
        raise

def get_taiwan_stock_price(code):
    """用 yfinance 抓台股現價，代號格式為 2330.TW"""
    try:
        ticker = yf.Ticker(f"{code}.TW")
        hist = ticker.history(period="1d")
        if hist.empty:
            print(f"[警告] {code} 無法取得股價，嘗試 .TWO")
            ticker = yf.Ticker(f"{code}.TWO")
            hist = ticker.history(period="1d")
        if hist.empty:
            print(f"[錯誤] {code} 無法取得股價")
            return None
        price = round(float(hist["Close"].iloc[-1]), 2)
        print(f"{code} 現價：{price}")
        return price
    except Exception as e:
        print(f"[錯誤] 抓取 {code} 股價失敗：{e}")
        return None

def update_prices():
    """主流程：更新所有持股現價並記錄歷史"""
    db = firestore.client()
    today = date.today().isoformat()

    # 讀取所有 holdings
    try:
        holdings_ref = db.collection("holdings")
        holdings = holdings_ref.stream()
        holdings_list = [
            {"id": doc.id, **doc.to_dict()} for doc in holdings
        ]
        print(f"共 {len(holdings_list)} 筆持股")
    except Exception as e:
        print(f"[錯誤] 讀取持股失敗：{e}")
        raise

    # 抓每個代號的股價（同代號只抓一次）
    price_cache = {}
    for holding in holdings_list:
        code = holding.get("code")
        if code and code not in price_cache:
            price = get_taiwan_stock_price(code)
            price_cache[code] = price

    # 更新每筆 holding 的 current_price
    for holding in holdings_list:
        code = holding.get("code")
        price = price_cache.get(code)
        if price is None:
            continue
        try:
            holdings_ref.document(holding["id"]).update({
                "current_price": price
            })
            print(f"更新 {code} current_price -> {price}")
        except Exception as e:
            print(f"[錯誤] 更新 {holding['id']} 失敗：{e}")

    # 依 user_id 分組計算總市值，寫入 history
    user_totals = {}
    for holding in holdings_list:
        uid = holding.get("user_id")
        code = holding.get("code")
        shares = holding.get("shares", 0)
        avg_cost = holding.get("avg_cost", 0)
        price = price_cache.get(code) or avg_cost

        if uid not in user_totals:
            user_totals[uid] = {"total_value": 0, "total_cost": 0}

        user_totals[uid]["total_value"] += price * shares
        user_totals[uid]["total_cost"] += avg_cost * shares

    # 寫入 history
    history_ref = db.collection("history")
    for uid, totals in user_totals.items():
        try:
            history_ref.add({
                "user_id": uid,
                "date": today,
                "total_value": round(totals["total_value"], 2),
                "total_cost": round(totals["total_cost"], 2),
            })
            print(f"寫入 history：user={uid}, date={today}, total_value={totals['total_value']:.2f}")
        except Exception as e:
            print(f"[錯誤] 寫入 history 失敗：{e}")

    print("全部更新完成！")

if __name__ == "__main__":
    initialize_firebase()
    update_prices()