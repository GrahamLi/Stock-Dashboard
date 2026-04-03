"use client";

import { useState } from "react";

export default function AddStockModal({ onClose, onAdd }) {
  const [tab, setTab] = useState("quick");

  // 快速建倉
  const [quickForm, setQuickForm] = useState({
    code: "",
    name: "",
    shares: "",
    avg_cost: "",
  });

  // 交易紀錄
  const [txForm, setTxForm] = useState({
    code: "",
    name: "",
    action: "買入",
    shares: "",
    price: "",
    date: new Date().toISOString().split("T")[0],
    note: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleQuickSubmit = async () => {
    setError("");
    if (!quickForm.code || !quickForm.name || !quickForm.shares || !quickForm.avg_cost) {
      setError("請填寫所有必填欄位。");
      return;
    }
    if (isNaN(quickForm.shares) || Number(quickForm.shares) <= 0) {
      setError("持有股數請輸入正確數字。");
      return;
    }
    if (isNaN(quickForm.avg_cost) || Number(quickForm.avg_cost) <= 0) {
      setError("平均成本請輸入正確數字。");
      return;
    }
    setLoading(true);
    try {
      await onAdd({
        type: "quick",
        code: quickForm.code.trim(),
        name: quickForm.name.trim(),
        shares: Number(quickForm.shares),
        avg_cost: Number(quickForm.avg_cost),
        has_transaction_history: false,
      });
      onClose();
    } catch (err) {
      setError("新增失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  const handleTxSubmit = async () => {
    setError("");
    if (!txForm.code || !txForm.name || !txForm.shares || !txForm.price || !txForm.date) {
      setError("請填寫所有必填欄位。");
      return;
    }
    if (isNaN(txForm.shares) || Number(txForm.shares) <= 0) {
      setError("股數請輸入正確數字。");
      return;
    }
    if (isNaN(txForm.price) || Number(txForm.price) <= 0) {
      setError("成交價請輸入正確數字。");
      return;
    }
    setLoading(true);
    try {
      await onAdd({
        type: "transaction",
        code: txForm.code.trim(),
        name: txForm.name.trim(),
        action: txForm.action,
        shares: Number(txForm.shares),
        price: Number(txForm.price),
        date: txForm.date,
        note: txForm.note.trim(),
        has_transaction_history: true,
      });
      onClose();
    } catch (err) {
      setError("新增失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-md bg-zinc-900 rounded-2xl p-6 shadow-xl border border-zinc-800">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold text-lg">新增持股</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors text-xl"
          >
            ✕
          </button>
        </div>

        {/* Tab 切換 */}
        <div className="flex bg-zinc-800 rounded-lg p-1 mb-5">
          <button
            onClick={() => setTab("quick")}
            className={`flex-1 text-sm py-2 rounded-md transition-colors ${
              tab === "quick"
                ? "bg-zinc-700 text-white font-medium"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            快速建倉
          </button>
          <button
            onClick={() => setTab("transaction")}
            className={`flex-1 text-sm py-2 rounded-md transition-colors ${
              tab === "transaction"
                ? "bg-zinc-700 text-white font-medium"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            輸入交易紀錄
          </button>
        </div>

        {/* 快速建倉 */}
        {tab === "quick" && (
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">股票代號 *</label>
              <input
                type="text"
                value={quickForm.code}
                onChange={(e) => setQuickForm({ ...quickForm, code: e.target.value })}
                placeholder="例：2330"
                className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">股票名稱 *</label>
              <input
                type="text"
                value={quickForm.name}
                onChange={(e) => setQuickForm({ ...quickForm, name: e.target.value })}
                placeholder="例：台積電"
                className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">持有股數 *</label>
              <input
                type="number"
                value={quickForm.shares}
                onChange={(e) => setQuickForm({ ...quickForm, shares: e.target.value })}
                placeholder="例：1000（1張）"
                className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">平均成本（元/股）*</label>
              <input
                type="number"
                value={quickForm.avg_cost}
                onChange={(e) => setQuickForm({ ...quickForm, avg_cost: e.target.value })}
                placeholder="例：580"
                className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* 交易紀錄 */}
        {tab === "transaction" && (
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">股票代號 *</label>
              <input
                type="text"
                value={txForm.code}
                onChange={(e) => setTxForm({ ...txForm, code: e.target.value })}
                placeholder="例：2330"
                className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">股票名稱 *</label>
              <input
                type="text"
                value={txForm.name}
                onChange={(e) => setTxForm({ ...txForm, name: e.target.value })}
                placeholder="例：台積電"
                className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">買賣方向 *</label>
              <select
                value={txForm.action}
                onChange={(e) => setTxForm({ ...txForm, action: e.target.value })}
                className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="買入">買入</option>
                <option value="賣出">賣出</option>
              </select>
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">股數 *</label>
              <input
                type="number"
                value={txForm.shares}
                onChange={(e) => setTxForm({ ...txForm, shares: e.target.value })}
                placeholder="例：1000"
                className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">成交價（元/股）*</label>
              <input
                type="number"
                value={txForm.price}
                onChange={(e) => setTxForm({ ...txForm, price: e.target.value })}
                placeholder="例：580"
                className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">交易日期 *</label>
              <input
                type="date"
                value={txForm.date}
                onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">備註（選填）</label>
              <input
                type="text"
                value={txForm.note}
                onChange={(e) => setTxForm({ ...txForm, note: e.target.value })}
                placeholder="選填"
                className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {error && (
          <p className="text-red-400 text-xs text-center mt-3">{error}</p>
        )}

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-sm py-2.5 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={tab === "quick" ? handleQuickSubmit : handleTxSubmit}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm py-2.5 rounded-lg transition-colors font-medium"
          >
            {loading ? "新增中..." : "確認新增"}
          </button>
        </div>
      </div>
    </div>
  );
}