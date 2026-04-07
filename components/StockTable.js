"use client";

// =============================================================================
// StockTable.js
// =============================================================================
// Revision Change List:
// V01 - 初始版本，持股清單表格，點整行開 StockDetailModal
// V02 - 補傳 accounts / onMoveTransaction / onMoveQuickHolding 給 StockDetailModal
// =============================================================================

import { useState } from "react";
import StockDetailModal from "@/components/StockDetailModal";

export default function StockTable({
  holdings,
  transactions,
  accounts,
  onEdit,
  onDelete,
  onDeleteTransaction,
  onDeleteQuickHolding,
  onEditTransaction,
  onEditQuickHolding,
  onMoveTransaction,
  onMoveQuickHolding,
}) {
  const [detailHolding, setDetailHolding] = useState(null);

  const formatMoney = (num) =>
    Number(num).toLocaleString("zh-TW", { minimumFractionDigits: 0 });

  const formatShares = (shares) => {
    const lots = Math.floor(shares / 1000);
    const odd = shares % 1000;
    if (lots === 0) return `${odd} 股`;
    if (odd === 0) return `${lots} 張`;
    return `${lots} 張 ${odd} 股`;
  };

  const visibleHoldings = holdings.filter((h) => h.shares > 0);

  if (visibleHoldings.length === 0) {
    return (
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8 text-center">
        <p className="text-zinc-500 text-sm">
          尚無持股，點擊「＋ 快速建倉」或「＋ 新增交易」開始
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
              <th className="text-zinc-400 font-medium text-left px-5 py-3">帳戶</th>
              <th className="text-zinc-400 font-medium text-right px-5 py-3">持股數</th>
              <th className="text-zinc-400 font-medium text-right px-5 py-3">平均成本</th>
              <th className="text-zinc-400 font-medium text-right px-5 py-3">現價</th>
              <th className="text-zinc-400 font-medium text-right px-5 py-3">市值</th>
              <th className="text-zinc-400 font-medium text-right px-5 py-3">損益</th>
              <th className="text-zinc-400 font-medium text-right px-5 py-3">損益%</th>
            </tr>
          </thead>
          <tbody>
            {visibleHoldings.map((h) => {
              const currentPrice = h.current_price || h.avg_cost;
              const marketValue = currentPrice * h.shares;
              const cost = h.avg_cost * h.shares;
              const pnl = marketValue - cost;
              const pnlPercent = cost > 0 ? (pnl / cost) * 100 : 0;
              const isPositive = pnl >= 0;

              return (
                <tr
                  key={h.id}
                  onClick={() => setDetailHolding(h)}
                  className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <td className="px-5 py-3">
                    <p className="text-white font-medium">{h.code}</p>
                    <p className="text-zinc-400 text-xs">{h.name}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300">
                      {h.account || "預設帳戶"}
                    </span>
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {detailHolding && (
        <StockDetailModal
          holding={detailHolding}
          transactions={transactions}
          accounts={accounts}
          onClose={() => setDetailHolding(null)}
          onEdit={onEdit}
          onDelete={onDelete}
          onDeleteTransaction={onDeleteTransaction}
          onDeleteQuickHolding={onDeleteQuickHolding}
          onEditTransaction={onEditTransaction}
          onEditQuickHolding={onEditQuickHolding}
          onMoveTransaction={onMoveTransaction}
          onMoveQuickHolding={onMoveQuickHolding}
        />
      )}
    </>
  );
}
