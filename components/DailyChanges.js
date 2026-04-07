"use client";

import { useState } from "react";
import { calcRealizedPnl } from "@/lib/firestore";

function calcSellCostPrice(tx, allTx, holdings) {
  if (tx.action !== "賣出") return null;

  const holding = holdings.find(
    (h) =>
      h.code === tx.code &&
      (h.account || "預設帳戶") === (tx.account || "預設帳戶")
  );
  if (!holding) return null;

  const codeTx = allTx
    .filter(
      (t) =>
        t.code === tx.code &&
        (t.account || "預設帳戶") === (tx.account || "預設帳戶") &&
        t.id !== tx.id
    )
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  let batches = [];

  if (holding.has_quick_holding) {
    const t0Shares = holding.initial_shares || 0;
    const t0Cost = holding.t0_avg_cost || holding.avg_cost || 0;
    if (t0Shares > 0) batches.push({ shares: t0Shares, cost: t0Cost });
  }

  for (const t of codeTx) {
    if (new Date(t.date) > new Date(tx.date)) break;
    if (t.action === "買入") {
      batches.push({ shares: t.shares, cost: t.price });
    } else if (t.action === "賣出") {
      let rem = t.shares;
      while (rem > 0 && batches.length > 0) {
        if (batches[0].shares <= rem) {
          rem -= batches[0].shares;
          batches.shift();
        } else {
          batches[0].shares -= rem;
          rem = 0;
        }
      }
    }
  }

  let rem = tx.shares;
  let totalCost = 0;
  let tempBatches = batches.map((b) => ({ ...b }));

  while (rem > 0 && tempBatches.length > 0) {
    if (tempBatches[0].shares <= rem) {
      totalCost += tempBatches[0].cost * tempBatches[0].shares;
      rem -= tempBatches[0].shares;
      tempBatches.shift();
    } else {
      totalCost += tempBatches[0].cost * rem;
      rem = 0;
    }
  }

  return tx.shares > 0 ? totalCost / tx.shares : null;
}

function calcReturnRate(pnl, costPrice, shares) {
  const invested = costPrice * shares;
  if (!invested || invested === 0) return null;
  return (pnl / invested) * 100;
}

function calcTotalReturnRate(results) {
  const totalPnl = results.reduce((s, r) => s + r.realizedPnl, 0);
  const totalCost = results.reduce(
    (s, r) => s + (r.costPrice || 0) * r.shares,
    0
  );
  if (totalCost === 0) return null;
  return (totalPnl / totalCost) * 100;
}

function PnlTable({ data, emptyMsg, showTotal, totalLabel, formatMoney, formatShares, formatRate }) {
  const totalPnl = data.reduce((s, r) => s + r.realizedPnl, 0);
  const totalRate = calcTotalReturnRate(data);

  return (
    <>
      {data.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-zinc-500 text-sm">{emptyMsg}</p>
        </div>
      ) : (
        <>
          {showTotal && (
            <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
              <p className="text-zinc-400 text-xs">{totalLabel}</p>
              <div className="flex items-center gap-4">
                <span className="text-zinc-400 text-xs">
                  報酬率：
                  <span className={`font-medium ${totalRate !== null && totalRate >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {formatRate(totalRate)}
                  </span>
                </span>
                <span className={`text-sm font-bold ${totalPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                  合計：{totalPnl >= 0 ? "+" : ""}${formatMoney(totalPnl)}
                </span>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-zinc-400 font-medium text-left px-5 py-3">日期</th>
                  <th className="text-zinc-400 font-medium text-left px-5 py-3">股票</th>
                  <th className="text-zinc-400 font-medium text-left px-5 py-3">帳戶</th>
                  <th className="text-zinc-400 font-medium text-right px-5 py-3">賣出股數</th>
                  <th className="text-zinc-400 font-medium text-right px-5 py-3">賣出價</th>
                  <th className="text-zinc-400 font-medium text-right px-5 py-3">成本價</th>
                  <th className="text-zinc-400 font-medium text-right px-5 py-3">已實現損益</th>
                  <th className="text-zinc-400 font-medium text-right px-5 py-3">報酬率</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r, i) => {
                  const rate = r.costPrice != null
                    ? calcReturnRate(r.realizedPnl, r.costPrice, r.shares)
                    : null;
                  return (
                    <tr key={i} className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800 transition-colors">
                      <td className="px-5 py-3 text-zinc-300">{r.date}</td>
                      <td className="px-5 py-3">
                        <p className="text-white font-medium">{r.code}</p>
                        <p className="text-zinc-400 text-xs">{r.name}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400">
                          {r.account || "預設帳戶"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-zinc-300">
                        {formatShares(r.shares)}
                      </td>
                      <td className="px-5 py-3 text-right text-zinc-300">
                        ${formatMoney(r.sellPrice)}
                      </td>
                      <td className="px-5 py-3 text-right text-xs">
                        {r.costPrice != null ? (
                          <span className={r.sellPrice >= r.costPrice ? "text-green-400" : "text-red-400"}>
                            ${formatMoney(r.costPrice)}
                          </span>
                        ) : (
                          <span className="text-zinc-600">-</span>
                        )}
                      </td>
                      <td className={`px-5 py-3 text-right font-medium ${r.realizedPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {r.realizedPnl >= 0 ? "+" : ""}${formatMoney(r.realizedPnl)}
                      </td>
                      <td className={`px-5 py-3 text-right text-xs font-medium ${rate !== null && rate >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {formatRate(rate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

export default function DailyChanges({ transactions, history, holdings }) {
  const [tab, setTab] = useState("transactions");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");
  const [appliedStart, setAppliedStart] = useState("");
  const [appliedEnd, setAppliedEnd] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [rangeResult, setRangeResult] = useState(null);

  const today = new Date().toISOString().split("T")[0];
  const thisMonth = today.slice(0, 7);
  const thisYear = today.slice(0, 4);

  const todayPnl = calcRealizedPnl(holdings, transactions, today, today);
  const monthPnl = calcRealizedPnl(holdings, transactions, `${thisMonth}-01`, today);
  const yearPnl = calcRealizedPnl(holdings, transactions, `${thisYear}-01-01`, today);

  const todayTotalPnl = todayPnl.reduce((s, r) => s + r.realizedPnl, 0);

  const formatMoney = (num) =>
    Number(num).toLocaleString("zh-TW", { minimumFractionDigits: 0 });

  const formatShares = (shares) => {
    const lots = Math.floor(shares / 1000);
    const odd = shares % 1000;
    if (lots === 0) return `${odd} 股`;
    if (odd === 0) return `${lots} 張`;
    return `${lots} 張 ${odd} 股`;
  };

  const formatRate = (rate) => {
    if (rate === null || rate === undefined || isNaN(rate)) return "-";
    return `${rate >= 0 ? "+" : ""}${rate.toFixed(2)}%`;
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

  const handleRangeQuery = () => {
    if (!rangeStart || !rangeEnd) return;
    const result = calcRealizedPnl(holdings, transactions, rangeStart, rangeEnd);
    setRangeResult(result);
  };

  const filteredTransactions = transactions
    .filter((tx) => {
      if (appliedStart && tx.date < appliedStart) return false;
      if (appliedEnd && tx.date > appliedEnd) return false;
      return true;
    })
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const TABS = [
    { key: "transactions", label: "交易紀錄" },
    { key: "snapshot", label: "每日持股快照" },
    { key: "today", label: "當天已實現損益" },
    { key: "month", label: "當月已實現損益" },
    { key: "year", label: "當年已實現損益" },
    { key: "range", label: "損益區間查詢" },
  ];

  const pnlTableProps = { formatMoney, formatShares, formatRate };

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800">
      {/* Tab 列 */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <p className="text-zinc-400 text-sm">庫存變動歷史紀錄</p>
          {todayPnl.length > 0 && (
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              todayTotalPnl >= 0 ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"
            }`}>
              今日已實現損益：{todayTotalPnl >= 0 ? "+" : ""}${formatMoney(todayTotalPnl)}
            </span>
          )}
        </div>
        <div className="flex bg-zinc-800 rounded-lg p-1 flex-wrap gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                tab === t.key
                  ? "bg-zinc-700 text-white font-medium"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 交易紀錄 Tab */}
      {tab === "transactions" && (
        <>
          <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-800 flex-wrap">
            <span className="text-white text-sm font-medium shrink-0">篩選日期：</span>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={filterStart}
                onChange={(e) => setFilterStart(e.target.value)}
                className="bg-zinc-800 text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-white text-sm">～</span>
              <input
                type="date"
                value={filterEnd}
                onChange={(e) => setFilterEnd(e.target.value)}
                className="bg-zinc-800 text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleFilterApply}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
              >
                查詢
              </button>
              <button
                onClick={handleFilterClear}
                className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
              >
                清除
              </button>
              <span className="text-zinc-400 text-sm">
                {appliedStart || appliedEnd
                  ? `${appliedStart || "最早"} ～ ${appliedEnd || "最新"}，共 ${filteredTransactions.length} 筆`
                  : `全部，共 ${filteredTransactions.length} 筆`}
              </span>
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
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
                    <th className="text-zinc-400 font-medium text-left px-5 py-3">帳戶</th>
                    <th className="text-zinc-400 font-medium text-center px-5 py-3">買賣</th>
                    <th className="text-zinc-400 font-medium text-right px-5 py-3">股數</th>
                    <th className="text-zinc-400 font-medium text-right px-5 py-3">成交價</th>
                    <th className="text-zinc-400 font-medium text-right px-5 py-3">成本價</th>
                    <th className="text-zinc-400 font-medium text-right px-5 py-3">總金額</th>
                    <th className="text-zinc-400 font-medium text-right px-5 py-3">報酬率</th>
                    <th className="text-zinc-400 font-medium text-left px-5 py-3">備註</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx) => {
                    const costPrice = calcSellCostPrice(tx, transactions, holdings);
                    const isProfit = costPrice !== null && tx.price >= costPrice;
                    const pnl = costPrice !== null
                      ? (tx.price - costPrice) * tx.shares
                      : null;
                    const rate = pnl !== null && costPrice !== null
                      ? calcReturnRate(pnl, costPrice, tx.shares)
                      : null;
                    return (
                      <tr key={tx.id} className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800 transition-colors">
                        <td className="px-5 py-3 text-zinc-300">{tx.date}</td>
                        <td className="px-5 py-3">
                          <p className="text-white font-medium">{tx.code}</p>
                          <p className="text-zinc-400 text-xs">{tx.name}</p>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400">
                            {tx.account || "預設帳戶"}
                          </span>
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
                        <td className="px-5 py-3 text-right text-xs">
                          {tx.action === "賣出" && costPrice !== null ? (
                            <span className={isProfit ? "text-green-400" : "text-red-400"}>
                              ${formatMoney(costPrice)}
                            </span>
                          ) : (
                            <span className="text-zinc-600">-</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right text-zinc-300">
                          ${formatMoney(tx.shares * tx.price)}
                        </td>
                        <td className="px-5 py-3 text-right text-xs">
                          {tx.action === "賣出" && rate !== null ? (
                            <span className={rate >= 0 ? "text-green-400" : "text-red-400"}>
                              {formatRate(rate)}
                            </span>
                          ) : (
                            <span className="text-zinc-600">-</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-zinc-400 text-xs">
                          {tx.note || "-"}
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
                        <tr key={h.id} className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800 transition-colors">
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
      {tab === "today" && (
        <PnlTable
          data={todayPnl}
          emptyMsg="今日尚無已實現損益"
          showTotal={todayPnl.length > 0}
          totalLabel={`今日日期：${today}`}
          {...pnlTableProps}
        />
      )}

      {/* 當月已實現損益 Tab */}
      {tab === "month" && (
        <PnlTable
          data={monthPnl}
          emptyMsg="本月尚無已實現損益"
          showTotal={monthPnl.length > 0}
          totalLabel={`本月：${thisMonth}`}
          {...pnlTableProps}
        />
      )}

      {/* 當年已實現損益 Tab */}
      {tab === "year" && (
        <PnlTable
          data={yearPnl}
          emptyMsg="今年尚無已實現損益"
          showTotal={yearPnl.length > 0}
          totalLabel={`今年：${thisYear}`}
          {...pnlTableProps}
        />
      )}

      {/* 損益區間查詢 Tab */}
      {tab === "range" && (
        <>
          <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800 flex-wrap">
            <span className="text-white text-sm font-medium shrink-0">查詢區間：</span>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                className="bg-zinc-800 text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-white text-sm">～</span>
              <input
                type="date"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                className="bg-zinc-800 text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleRangeQuery}
                disabled={!rangeStart || !rangeEnd}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm px-4 py-1.5 rounded-lg transition-colors"
              >
                查詢
              </button>
            </div>
          </div>

          {rangeResult === null ? (
            <div className="p-8 text-center">
              <p className="text-zinc-500 text-sm">請選擇日期區間後點查詢</p>
            </div>
          ) : (
            <PnlTable
              data={rangeResult}
              emptyMsg="此區間內無已實現損益紀錄"
              showTotal={rangeResult.length > 0}
              totalLabel={`${rangeStart} ～ ${rangeEnd}`}
              {...pnlTableProps}
            />
          )}
        </>
      )}
    </div>
  );
}