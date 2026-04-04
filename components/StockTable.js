"use client";

import { useState } from "react";
import EditStockModal from "@/components/EditStockModal";

export default function StockTable({ holdings, onEdit, onDelete }) {
  const [editingHolding, setEditingHolding] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const formatMoney = (num) =>
    Number(num).toLocaleString("zh-TW", { minimumFractionDigits: 0 });

  const formatShares = (shares) => {
    const lots = Math.floor(shares / 1000);
    const odd = shares % 1000;
    if (lots === 0) return `${odd} 股`;
    if (odd === 0) return `${lots} 張`;
    return `${lots} 張 ${odd} 股`;
  };

  const handleDeleteConfirm = async (id) => {
    try {
      await onDelete(id);
    } catch (err) {
      console.error("刪除失敗：", err);
    } finally {
      setDeletingId(null);
    }
  };

  if (holdings.length === 0) {
    return (
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8 text-center">
        <p className="text-zinc-500 text-sm">
          尚無持股，點擊右下角「＋ 新增持股」開始
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-zinc-400 font-medium text-left px-5 py-3">股票</th>
              <th className="text-zinc-400 font-medium text-right px-5 py-3">持股數</th>
              <th className="text-zinc-400 font-medium text-right px-5 py-3">平均成本</th>
              <th className="text-zinc-400 font-medium text-right px-5 py-3">現價</th>
              <th className="text-zinc-400 font-medium text-right px-5 py-3">市值</th>
              <th className="text-zinc-400 font-medium text-right px-5 py-3">損益</th>
              <th className="text-zinc-400 font-medium text-right px-5 py-3">損益%</th>
              <th className="text-zinc-400 font-medium text-center px-5 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => {
              const currentPrice = h.current_price || h.avg_cost;
              const marketValue = currentPrice * h.shares;
              const cost = h.avg_cost * h.shares;
              const pnl = marketValue - cost;
              const pnlPercent = cost > 0 ? (pnl / cost) * 100 : 0;
              const isPositive = pnl >= 0;

              return (
                <tr
                  key={h.id}
                  className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800 transition-colors"
                >
                  <td className="px-5 py-3">
                    <p className="text-white font-medium">{h.code}</p>
                    <p className="text-zinc-400 text-xs">{h.name}</p>
                  </td>
                  <td className="px-5 py-3 text-right text-zinc-300">
                    {formatShares(h.shares)}
                  </td>
                  <td className="px-5 py-3 text-right text-zinc-300">
                    ${formatMoney(h.avg_cost)}
                  </td>
                  <td className="px-5 py-3 text-right text-zinc-300">
                    ${formatMoney(currentPrice)}
                  </td>
                  <td className="px-5 py-3 text-right text-zinc-300">
                    ${formatMoney(marketValue)}
                  </td>
                  <td className={`px-5 py-3 text-right font-medium ${isPositive ? "text-green-400" : "text-red-400"}`}>
                    {isPositive ? "+" : ""}${formatMoney(pnl)}
                  </td>
                  <td className={`px-5 py-3 text-right font-medium ${isPositive ? "text-green-400" : "text-red-400"}`}>
                    {isPositive ? "+" : ""}{pnlPercent.toFixed(2)}%
                  </td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setEditingHolding(h)}
                        className="text-zinc-400 hover:text-blue-400 transition-colors text-xs px-2 py-1 rounded border border-zinc-700 hover:border-blue-500"
                      >
                        編輯
                      </button>
                      <button
                        onClick={() => setDeletingId(h.id)}
                        className="text-zinc-400 hover:text-red-400 transition-colors text-xs px-2 py-1 rounded border border-zinc-700 hover:border-red-500"
                      >
                        刪除
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 編輯彈窗 */}
      {editingHolding && (
        <EditStockModal
          holding={editingHolding}
          onClose={() => setEditingHolding(null)}
          onSave={onEdit}
        />
      )}

      {/* 刪除確認彈窗 */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="w-full max-w-sm bg-zinc-900 rounded-2xl p-6 shadow-xl border border-zinc-800">
            <h2 className="text-white font-bold text-lg mb-2">確認刪除</h2>
            <p className="text-zinc-400 text-sm mb-6">
              確定要刪除這筆持股嗎？此操作無法復原。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-sm py-2.5 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleDeleteConfirm(deletingId)}
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