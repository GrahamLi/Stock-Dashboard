"use client";

import { useState } from "react";
import { calcRealizedPnl } from "@/lib/firestore";

export default function DailyChanges({
  transactions,
  history,
  holdings,
}) {
  const [tab, setTab] = useState("transactions");
  const [showPnlModal, setShowPnlModal] = useState(false);
  const [pnlStartDate, setPnlStartDate] = useState("");
  const [pnlEndDate, setPnlEndDate] = useState("");
  const [pnlResult, setPnlResult] = useState(null);

  // 交易紀錄篩選
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");
  const [appliedStart, setAppliedStart] = useState("");
  const [appliedEnd, setAppliedEnd] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const todayPnl = calcRealizedPnl(holdings, transactions, today, today);
  const todayTotalPnl = todayPnl.reduce((sum, r) => sum + r.realizedPnl, 0);

  const formatMoney = (num) =>
    Number(num).toLocaleString("zh-TW", { minimumFractionDigits: 0 });

  const formatShares = (shares) => {
    const lots = Math.floor(shares / 1000);
    const odd = shares % 1000;
    if (lots === 0) return `${odd} 股`;
    if (odd === 0) return `${lots} 張`;
    return `${lots} 張 ${odd} 股`;
  };

  const handleCalcPnl = () => {
    if (!pnlStartDate || !pnlEndDate) return;
    const result = calcRealizedPnl(holdings, transactions, pnlStartDate, pnlEndDate);
    setPnlResult(result);
  };

  const handleFilterApply = () => {
    setAppliedStart(filterStart);
    setAppliedEnd(filterEnd);
  };

  const handleFilterClear = () => {
    setFilterStart("");
    setFilterEnd("");
    setAppliedStart("");
    setAppliedEnd("");
  };

  // 篩選交易紀錄
  const filteredTransactions = transactions.filter((tx) => {
    if (appliedStart && tx.date < appliedStart) return false;
    if (appliedEnd && tx.date > appliedEnd) return false;
    return true;
  });

  const sortedTransactions = filteredTransactions
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <>
      <div className="bg-zinc-900 rounded-xl border border-zinc-800">
        {/* Tab 列 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <p className="text-zinc-400 text-sm">庫存變動歷史紀錄</p>
            {todayPnl.length > 0 && (
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                todayTotalPnl >= 0
                  ? "bg-green-400/10 text-green-400"
                  : "bg-red-400/10 text-red-400"
              }`}>
                今日已實現損益：{todayTotalPnl >= 0 ? "+" : ""}${formatMoney(todayTotalPnl)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowPnlModal(true);
                setPnlResult(null);
                setPnlStartDate("");
                setPnlEndDate("");
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            >
              查詢損益區間
            </button>
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
              <button
                onClick={() => setTab("realized")}
                className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                  tab === "realized"
                    ? "bg-zinc-700 text-white font-medium"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                當天已實現損益
              </button>
            </div>
          </div>
        </div>

        {/* 交易紀錄 Tab */}
        {tab === "transactions" && (
          <>
            {/* 日期篩選器 */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-800 flex-wrap">
              <span className="text-zinc-500 text-xs shrink-0">篩選日期：</span>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="date"
                  value={filterStart}
                  onChange={(e) => setFilterStart(e.target.value)}
                  className="bg-zinc-800 text-white text-xs rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-zinc-500 text-xs">～</span>
                <input
                  type="date"
                  value={filterEnd}
                  onChange={(e) => setFilterEnd(e.target.value)}
                  className="bg-zinc-800 text-white text-xs rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleFilterApply}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                >
                  查詢
                </button>
                <button
                  onClick={handleFilterClear}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3 py-1.5 rounded-lg transition-colors"
                >
                  清除
                </button>
                {(appliedStart || appliedEnd) && (
                  <span className="text-zinc-500 text-xs">
                    顯示 {appliedStart || "最早"} ～ {appliedEnd || "最新"}，共 {sortedTransactions.length} 筆
                  </span>
                )}
                {!appliedStart && !appliedEnd && (
                  <span className="text-zinc-500 text-xs">
                    全部，共 {sortedTransactions.length} 筆
                  </span>
                )}
              </div>
            </div>

            {sortedTransactions.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-zinc-500 text-sm">
                  {appliedStart || appliedEnd ? "此區間無交易紀錄" : "尚無交易紀錄"}
                </p>
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
                    {sortedTransactions.map((tx) => (
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

        {/* 當天已實現損益 Tab */}
        {tab === "realized" && (
          <>
            {todayPnl.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-zinc-500 text-sm">今日尚無已實現損益</p>
              </div>
            ) : (
              <>
                <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
                  <p className="text-zinc-400 text-xs">今日日期：{today}</p>
                  <p className={`text-sm font-bold ${todayTotalPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                    今日合計：{todayTotalPnl >= 0 ? "+" : ""}${formatMoney(todayTotalPnl)}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-zinc-400 font-medium text-left px-5 py-3">日期</th>
                        <th className="text-zinc-400 font-medium text-left px-5 py-3">股票</th>
                        <th className="text-zinc-400 font-medium text-right px-5 py-3">賣出股數</th>
                        <th className="text-zinc-400 font-medium text-right px-5 py-3">賣出價</th>
                        <th className="text-zinc-400 font-medium text-right px-5 py-3">已實現損益</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayPnl.map((r, i) => (
                        <tr
                          key={i}
                          className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800 transition-colors"
                        >
                          <td className="px-5 py-3 text-zinc-300">{r.date}</td>
                          <td className="px-5 py-3">
                            <p className="text-white font-medium">{r.code}</p>
                            <p className="text-zinc-400 text-xs">{r.name}</p>
                          </td>
                          <td className="px-5 py-3 text-right text-zinc-300">
                            {formatShares(r.shares)}
                          </td>
                          <td className="px-5 py-3 text-right text-zinc-300">
                            ${formatMoney(r.sellPrice)}
                          </td>
                          <td className={`px-5 py-3 text-right font-medium ${r.realizedPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {r.realizedPnl >= 0 ? "+" : ""}${formatMoney(r.realizedPnl)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* 任意區間損益彈窗 */}
      {showPnlModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="w-full max-w-lg bg-zinc-900 rounded-2xl p-6 shadow-xl border border-zinc-800">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-bold text-lg">查詢已實現損益</h2>
              <button
                onClick={() => setShowPnlModal(false)}
                className="text-zinc-400 hover:text-white transition-colors text-xl"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <label className="text-zinc-400 text-xs mb-1 block">開始日期</label>
                <input
                  type="date"
                  value={pnlStartDate}
                  onChange={(e) => setPnlStartDate(e.target.value)}
                  className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-zinc-400 text-xs mb-1 block">結束日期</label>
                <input
                  type="date"
                  value={pnlEndDate}
                  onChange={(e) => setPnlEndDate(e.target.value)}
                  className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              onClick={handleCalcPnl}
              disabled={!pnlStartDate || !pnlEndDate}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm py-2.5 rounded-lg transition-colors font-medium mb-4"
            >
              查詢
            </button>

            {pnlResult !== null && (
              <>
                {pnlResult.length === 0 ? (
                  <p className="text-zinc-500 text-sm text-center py-4">
                    此區間內無已實現損益紀錄
                  </p>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-zinc-400 text-xs">
                        {pnlStartDate} ～ {pnlEndDate}
                      </p>
                      <p className={`text-sm font-bold ${
                        pnlResult.reduce((s, r) => s + r.realizedPnl, 0) >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}>
                        合計：{pnlResult.reduce((s, r) => s + r.realizedPnl, 0) >= 0 ? "+" : ""}
                        ${formatMoney(pnlResult.reduce((s, r) => s + r.realizedPnl, 0))}
                      </p>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-zinc-800">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-zinc-800 bg-zinc-800">
                            <th className="text-zinc-400 font-medium text-left px-4 py-2">日期</th>
                            <th className="text-zinc-400 font-medium text-left px-4 py-2">股票</th>
                            <th className="text-zinc-400 font-medium text-right px-4 py-2">股數</th>
                            <th className="text-zinc-400 font-medium text-right px-4 py-2">賣出價</th>
                            <th className="text-zinc-400 font-medium text-right px-4 py-2">已實現損益</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pnlResult.map((r, i) => (
                            <tr key={i} className="border-b border-zinc-800 last:border-0">
                              <td className="px-4 py-2 text-zinc-300 text-xs">{r.date}</td>
                              <td className="px-4 py-2">
                                <p className="text-white text-xs font-medium">{r.code}</p>
                                <p className="text-zinc-400 text-xs">{r.name}</p>
                              </td>
                              <td className="px-4 py-2 text-right text-zinc-300 text-xs">
                                {formatShares(r.shares)}
                              </td>
                              <td className="px-4 py-2 text-right text-zinc-300 text-xs">
                                ${formatMoney(r.sellPrice)}
                              </td>
                              <td className={`px-4 py-2 text-right font-medium text-xs ${r.realizedPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                                {r.realizedPnl >= 0 ? "+" : ""}${formatMoney(r.realizedPnl)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}