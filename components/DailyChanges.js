"use client";

import { useState } from "react";

export default function DailyChanges({ transactions, history, holdings }) {
  const [tab, setTab] = useState("transactions");

  const formatMoney = (num) =>
    Number(num).toLocaleString("zh-TW", { minimumFractionDigits: 0 });

  const formatShares = (shares) => {
    const lots = Math.floor(shares / 1000);
    const odd = shares % 1000;
    if (lots === 0) return `${odd} 股`;
    if (odd === 0) return `${lots} 張`;
    return `${lots} 張 ${odd} 股`;
  };

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
        <p className="text-zinc-400 text-sm">每日庫存變動</p>
        <div className="flex bg-zinc-800 rounded-lg p-1">
          <button
            onClick={() => setTab("transactions")}
            className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
              tab === "transactions"
                ? "bg-zinc-700 text-white font-medium"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            交易紀錄
          </button>
          <button
            onClick={() => setTab("snapshot")}
            className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
              tab === "snapshot"
                ? "bg-zinc-700 text-white font-medium"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            每日持股快照
          </button>
        </div>
      </div>

      {/* 交易紀錄 Tab */}
      {tab === "transactions" && (
        <>
          {transactions.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-zinc-500 text-sm">尚無交易紀錄</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-zinc-400 font-medium text-left px-5 py-3">日期</th>
                    <th className="text-zinc-400 font-medium text-left px-5 py-3">股票</th>
                    <th className="text-zinc-400 font-medium text-center px-5 py-3">買賣</th>
                    <th className="text-zinc-400 font-medium text-right px-5 py-3">股數</th>
                    <th className="text-zinc-400 font-medium text-right px-5 py-3">成交價</th>
                    <th className="text-zinc-400 font-medium text-right px-5 py-3">總金額</th>
                    <th className="text-zinc-400 font-medium text-left px-5 py-3">備註</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions
                    .slice()
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map((tx) => (
                      <tr
                        key={tx.id}
                        className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800 transition-colors"
                      >
                        <td className="px-5 py-3 text-zinc-300">{tx.date}</td>
                        <td className="px-5 py-3">
                          <p className="text-white font-medium">{tx.code}</p>
                          <p className="text-zinc-400 text-xs">{tx.name}</p>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span
                            className={`text-xs font-medium px-2 py-1 rounded-full ${
                              tx.action === "買入"
                                ? "bg-green-400/10 text-green-400"
                                : "bg-red-400/10 text-red-400"
                            }`}
                          >
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
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* 每日持股快照 Tab */}
      {tab === "snapshot" && (
        <>
          {history.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-zinc-500 text-sm">尚無歷史快照資料</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-zinc-400 font-medium text-left px-5 py-3">日期</th>
                    <th className="text-zinc-400 font-medium text-right px-5 py-3">總市值</th>
                    <th className="text-zinc-400 font-medium text-right px-5 py-3">總成本</th>
                    <th className="text-zinc-400 font-medium text-right px-5 py-3">損益</th>
                    <th className="text-zinc-400 font-medium text-right px-5 py-3">損益%</th>
                  </tr>
                </thead>
                <tbody>
                  {history
                    .slice()
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map((h) => {
                      const pnl = h.total_value - h.total_cost;
                      const pnlPercent =
                        h.total_cost > 0 ? (pnl / h.total_cost) * 100 : 0;
                      const isPositive = pnl >= 0;

                      return (
                        <tr
                          key={h.id}
                          className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800 transition-colors"
                        >
                          <td className="px-5 py-3 text-zinc-300">{h.date}</td>
                          <td className="px-5 py-3 text-right text-zinc-300">
                            ${formatMoney(h.total_value)}
                          </td>
                          <td className="px-5 py-3 text-right text-zinc-300">
                            ${formatMoney(h.total_cost)}
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
          )}
        </>
      )}
    </div>
  );
}