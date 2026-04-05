"use client";

import { useState } from "react";

function toHalfWidth(str) {
  return str
    .replace(/[\uff01-\uff5e]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
    )
    .replace(/\u3000/g, " ");
}

export default function StockDetailModal({
  holding,
  transactions,
  onClose,
  onDeleteTransaction,
  onDeleteQuickHolding,
  onEditTransaction,
  onEditQuickHolding,
}) {
  if (!holding) return null;

  const [deletingTxId, setDeletingTxId] = useState(null);
  const [showDeleteQuick, setShowDeleteQuick] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [showEditQuick, setShowEditQuick] = useState(false);

  const [txEditForm, setTxEditForm] = useState({
    shares: "",
    price: "",
    date: "",
    note: "",
    action: "",
  });

  const [quickEditForm, setQuickEditForm] = useState({
    shares: "",
    avg_cost: "",
  });

  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [dateInputType, setDateInputType] = useState("date");

  const currentPrice = holding.current_price || holding.avg_cost;
  const marketValue = currentPrice * holding.shares;
  const cost = holding.avg_cost * holding.shares;
  const pnl = marketValue - cost;
  const pnlPercent = cost > 0 ? (pnl / cost) * 100 : 0;
  const isPositive = pnl >= 0;

  const formatMoney = (num) =>
    Number(num).toLocaleString("zh-TW", { minimumFractionDigits: 0 });

  const formatShares = (shares) => {
    const lots = Math.floor(shares / 1000);
    const odd = shares % 1000;
    if (lots === 0) return `${odd} 股`;
    if (odd === 0) return `${lots} 張`;
    return `${lots} 張 ${odd} 股`;
  };

  const stockTx = transactions
    .filter((tx) => tx.code === holding.code)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const hasQuickHolding = holding.has_quick_holding === true;

  const handleDeleteTx = async (txId) => {
    try {
      await onDeleteTransaction(txId, holding.code);
      setDeletingTxId(null);
      onClose();
    } catch (err) {
      console.error("刪除交易紀錄失敗：", err);
    }
  };

  const handleDeleteQuick = async () => {
    try {
      await onDeleteQuickHolding(holding.id);
      setShowDeleteQuick(false);
      onClose();
    } catch (err) {
      console.error("刪除建倉失敗：", err);
    }
  };

  const openEditTx = (tx) => {
    setEditingTx(tx);
    setTxEditForm({
      shares: tx.shares,
      price: tx.price,
      date: tx.date,
      note: tx.note || "",
      action: tx.action,
    });
    setDateInputType("date");
    setEditError("");
  };

  const openEditQuick = () => {
    setQuickEditForm({
      shares: holding.initial_shares || holding.shares,
      avg_cost: holding.avg_cost,
    });
    setShowEditQuick(true);
    setEditError("");
  };

  const handleSaveTx = async () => {
    setEditError("");
    const normalizedShares = toHalfWidth(String(txEditForm.shares));
    const normalizedPrice = toHalfWidth(String(txEditForm.price));

    if (!normalizedShares || isNaN(normalizedShares) || Number(normalizedShares) <= 0) {
      setEditError("股數請輸入正確數字。");
      return;
    }
    if (!normalizedPrice || isNaN(normalizedPrice) || Number(normalizedPrice) <= 0) {
      setEditError("成交價請輸入正確數字。");
      return;
    }
    if (!txEditForm.date) {
      setEditError("請選擇交易日期。");
      return;
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(txEditForm.date)) {
      setEditError("日期格式請輸入 YYYY-MM-DD，例如：2026-04-05");
      return;
    }
    setEditLoading(true);
    try {
      await onEditTransaction(editingTx.id, holding.code, {
        shares: Number(normalizedShares),
        price: Number(normalizedPrice),
        date: txEditForm.date,
        note: txEditForm.note,
        action: txEditForm.action,
      });
      setEditingTx(null);
      onClose();
    } catch (err) {
      setEditError("儲存失敗，請稍後再試。");
    } finally {
      setEditLoading(false);
    }
  };

  const handleSaveQuick = async () => {
    setEditError("");
    const normalizedShares = toHalfWidth(String(quickEditForm.shares));
    const normalizedCost = toHalfWidth(String(quickEditForm.avg_cost));

    if (!normalizedShares || isNaN(normalizedShares) || Number(normalizedShares) <= 0) {
      setEditError("股數請輸入正確數字。");
      return;
    }
    if (!normalizedCost || isNaN(normalizedCost) || Number(normalizedCost) <= 0) {
      setEditError("平均成本請輸入正確數字。");
      return;
    }
    setEditLoading(true);
    try {
      await onEditQuickHolding(holding.id, {
        shares: Number(normalizedShares),
        avg_cost: Number(normalizedCost),
      });
      setShowEditQuick(false);
      onClose();
    } catch (err) {
      setEditError("儲存失敗，請稍後再試。");
    } finally {
      setEditLoading(false);
    }
  };

  const inputClass =
    "w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <>
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
        <div className="w-full max-w-2xl bg-zinc-900 rounded-2xl shadow-xl border border-zinc-800 flex flex-col max-h-[85vh]">

          {/* Header */}
          <div className="p-6 border-b border-zinc-800 shrink-0">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-white font-bold text-xl">{holding.code}</h2>
                  <span className="text-zinc-400 text-sm">{holding.name}</span>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="text-zinc-400">
                    持股：<span className="text-white">{formatShares(holding.shares)}</span>
                  </span>
                  <span className="text-zinc-400">
                    均成本：<span className="text-white">${formatMoney(holding.avg_cost)}</span>
                  </span>
                  <span className="text-zinc-400">
                    現價：<span className="text-white">${formatMoney(currentPrice)}</span>
                  </span>
                  <span className="text-zinc-400">
                    未實現損益：
                    <span className={`font-medium ${isPositive ? "text-green-400" : "text-red-400"}`}>
                      {isPositive ? "+" : ""}${formatMoney(pnl)}（{isPositive ? "+" : ""}{pnlPercent.toFixed(2)}%）
                    </span>
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-zinc-400 hover:text-white transition-colors text-xl ml-4 shrink-0"
              >
                ✕
              </button>
            </div>
          </div>

          {/* 交易紀錄列表 */}
          <div className="overflow-y-auto flex-1">
            {stockTx.length === 0 && !hasQuickHolding ? (
              <div className="p-8 text-center">
                <p className="text-zinc-500 text-sm">尚無交易紀錄</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-zinc-900">
                  <tr className="border-b border-zinc-800">
                    <th className="text-zinc-400 font-medium text-left px-5 py-3">日期</th>
                    <th className="text-zinc-400 font-medium text-center px-5 py-3">類型</th>
                    <th className="text-zinc-400 font-medium text-right px-5 py-3">股數</th>
                    <th className="text-zinc-400 font-medium text-right px-5 py-3">價格</th>
                    <th className="text-zinc-400 font-medium text-right px-5 py-3">總金額</th>
                    <th className="text-zinc-400 font-medium text-left px-5 py-3">備註</th>
                    <th className="text-zinc-400 font-medium text-center px-5 py-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {stockTx.map((tx) => (
                    <tr
                      key={tx.id}
                      className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800 transition-colors"
                    >
                      <td className="px-5 py-3 text-zinc-300 text-xs">{tx.date}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          tx.action === "買入"
                            ? "bg-green-400/10 text-green-400"
                            : "bg-red-400/10 text-red-400"
                        }`}>
                          {tx.action}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-zinc-300">
                        {formatShares(tx.shares)}
                      </td>
                      <td className="px-5 py-3 text-right text-zinc-300">
                        ${formatMoney(tx.price)}
                      </td>
                      <td className="px-5 py-3 text-right text-zinc-300">
                        ${formatMoney(tx.shares * tx.price)}
                      </td>
                      <td className="px-5 py-3 text-zinc-400 text-xs">
                        {tx.note || "-"}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditTx(tx)}
                            className="text-zinc-500 hover:text-blue-400 transition-colors text-xs px-2 py-1 rounded border border-zinc-700 hover:border-blue-500"
                          >
                            編輯
                          </button>
                          <button
                            onClick={() => setDeletingTxId(tx.id)}
                            className="text-zinc-500 hover:text-red-400 transition-colors text-xs px-2 py-1 rounded border border-zinc-700 hover:border-red-500"
                          >
                            刪除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {/* T0 快速建倉 */}
                  {hasQuickHolding && (
                    <tr className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800 transition-colors bg-zinc-800/30">
                      <td className="px-5 py-3 text-zinc-500 text-xs">－</td>
                      <td className="px-5 py-3 text-center">
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-400/10 text-blue-400">
                          建倉
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-zinc-400">
                        {formatShares(holding.initial_shares || holding.shares)}
                      </td>
                      <td className="px-5 py-3 text-right text-zinc-400">
                        ${formatMoney(holding.avg_cost)}
                      </td>
                      <td className="px-5 py-3 text-right text-zinc-400">
                        ${formatMoney((holding.initial_shares || holding.shares) * holding.avg_cost)}
                      </td>
                      <td className="px-5 py-3 text-zinc-500 text-xs">
                        快速建倉
                      </td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={openEditQuick}
                            className="text-zinc-500 hover:text-blue-400 transition-colors text-xs px-2 py-1 rounded border border-zinc-700 hover:border-blue-500"
                          >
                            編輯
                          </button>
                          <button
                            onClick={() => setShowDeleteQuick(true)}
                            className="text-zinc-500 hover:text-red-400 transition-colors text-xs px-2 py-1 rounded border border-zinc-700 hover:border-red-500"
                          >
                            刪除
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* 編輯交易紀錄彈窗 */}
      {editingTx && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] px-4">
          <div className="w-full max-w-sm bg-zinc-900 rounded-2xl p-6 shadow-xl border border-zinc-800">
            <h2 className="text-white font-bold text-lg mb-4">編輯交易紀錄</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">買賣方向</label>
                <select
                  value={txEditForm.action}
                  onChange={(e) => setTxEditForm({ ...txEditForm, action: e.target.value })}
                  className={inputClass}
                >
                  <option value="買入">買入</option>
                  <option value="賣出">賣出</option>
                </select>
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">股數</label>
                <input
                  type="number"
                  value={txEditForm.shares}
                  onChange={(e) => setTxEditForm({ ...txEditForm, shares: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">成交價（元/股）</label>
                <input
                  type="number"
                  value={txEditForm.price}
                  onChange={(e) => setTxEditForm({ ...txEditForm, price: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-zinc-400 text-xs">交易日期</label>
                  <button
                    type="button"
                    onClick={() =>
                      setDateInputType(dateInputType === "date" ? "text" : "date")
                    }
                    className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
                  >
                    {dateInputType === "date" ? "切換手動輸入" : "切換日曆選擇"}
                  </button>
                </div>
                <input
                  type={dateInputType}
                  value={txEditForm.date}
                  onChange={(e) => setTxEditForm({ ...txEditForm, date: e.target.value })}
                  placeholder="YYYY-MM-DD，例如：2026-04-05"
                  className={inputClass}
                />
                {dateInputType === "text" && (
                  <p className="text-zinc-600 text-xs mt-1">
                    格式：YYYY-MM-DD，例如：2026-04-05
                  </p>
                )}
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">備註（選填）</label>
                <input
                  type="text"
                  value={txEditForm.note}
                  onChange={(e) => setTxEditForm({ ...txEditForm, note: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
            {editError && (
              <p className="text-red-400 text-xs text-center mt-3">{editError}</p>
            )}
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setEditingTx(null); setEditError(""); }}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-sm py-2.5 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveTx}
                disabled={editLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm py-2.5 rounded-lg transition-colors font-medium"
              >
                {editLoading ? "儲存中..." : "儲存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 編輯建倉彈窗 */}
      {showEditQuick && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] px-4">
          <div className="w-full max-w-sm bg-zinc-900 rounded-2xl p-6 shadow-xl border border-zinc-800">
            <h2 className="text-white font-bold text-lg mb-4">編輯建倉</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">建倉股數</label>
                <input
                  type="number"
                  value={quickEditForm.shares}
                  onChange={(e) => setQuickEditForm({ ...quickEditForm, shares: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">平均成本（元/股）</label>
                <input
                  type="number"
                  value={quickEditForm.avg_cost}
                  onChange={(e) => setQuickEditForm({ ...quickEditForm, avg_cost: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
            {editError && (
              <p className="text-red-400 text-xs text-center mt-3">{editError}</p>
            )}
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setShowEditQuick(false); setEditError(""); }}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-sm py-2.5 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveQuick}
                disabled={editLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm py-2.5 rounded-lg transition-colors font-medium"
              >
                {editLoading ? "儲存中..." : "儲存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 刪除交易紀錄確認彈窗 */}
      {deletingTxId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] px-4">
          <div className="w-full max-w-sm bg-zinc-900 rounded-2xl p-6 shadow-xl border border-zinc-800">
            <h2 className="text-white font-bold text-lg mb-2">確認刪除交易紀錄</h2>
            <p className="text-zinc-400 text-sm mb-2">
              刪除後系統將重新計算此股票的持股數量和平均成本。
            </p>
            <p className="text-yellow-400 text-xs mb-6">
              ⚠️ 此操作無法復原，請確認後再執行。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingTxId(null)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-sm py-2.5 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleDeleteTx(deletingTxId)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm py-2.5 rounded-lg transition-colors font-medium"
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 刪除建倉確認彈窗 */}
      {showDeleteQuick && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] px-4">
          <div className="w-full max-w-sm bg-zinc-900 rounded-2xl p-6 shadow-xl border border-zinc-800">
            <h2 className="text-white font-bold text-lg mb-2">確認刪除建倉</h2>
            <p className="text-zinc-400 text-sm mb-2">
              刪除建倉後，此股票的 T0 成本將被移除。
            </p>
            <p className="text-yellow-400 text-xs mb-6">
              ⚠️ 此操作無法復原，請確認後再執行。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteQuick(false)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-sm py-2.5 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDeleteQuick}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm py-2.5 rounded-lg transition-colors font-medium"
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}