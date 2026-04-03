"use client";

export default function SummaryCards({ holdings }) {
  const totalCost = holdings.reduce(
    (sum, h) => sum + h.avg_cost * h.shares,
    0
  );

  const totalValue = holdings.reduce(
    (sum, h) => sum + (h.current_price || h.avg_cost) * h.shares,
    0
  );

  const totalPnl = totalValue - totalCost;
  const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const isPositive = totalPnl >= 0;

  const formatMoney = (num) =>
    num.toLocaleString("zh-TW", { minimumFractionDigits: 0 });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-6 py-4">
      <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
        <p className="text-zinc-400 text-sm mb-1">股票總成本</p>
        <p className="text-white text-2xl font-bold">
          ${formatMoney(totalCost)}
        </p>
      </div>

      <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
        <p className="text-zinc-400 text-sm mb-1">股票總市值</p>
        <p className="text-white text-2xl font-bold">
          ${formatMoney(totalValue)}
        </p>
      </div>

      <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
        <p className="text-zinc-400 text-sm mb-1">未實現損益</p>
        <p
          className={`text-2xl font-bold ${
            isPositive ? "text-green-400" : "text-red-400"
          }`}
        >
          {isPositive ? "+" : ""}${formatMoney(totalPnl)}
          <span className="text-base ml-2">
            ({isPositive ? "+" : ""}
            {totalPnlPercent.toFixed(2)}%)
          </span>
        </p>
      </div>
    </div>
  );
}