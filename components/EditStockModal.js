"use client";

// =============================================================================
// EditStockModal.js
// =============================================================================
// Revision Change List:
// V01 - 初始版本，編輯持股彈窗
// V02 - 支援 ESC 鍵關閉
// =============================================================================

import { useState, useEffect } from "react";

export default function EditStockModal({ holding, onClose, onSave }) {
  const [form, setForm] = useState({
    code: holding.code, name: holding.name,
    shares: holding.shares, avg_cost: holding.avg_cost,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ESC 鍵關閉
  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSave = async () => {
    setError("");
    if (!form.code || !form.name || !form.shares || !form.avg_cost) { setError("請填寫所有欄位。"); return; }
    if (isNaN(form.shares) || Number(form.shares) <= 0) { setError("持有股數請輸入正確數字。"); return; }
    if (isNaN(form.avg_cost) || Number(form.avg_cost) <= 0) { setError("平均成本請輸入正確數字。"); return; }
    setLoading(true);
    try {
      await onSave(holding.id, {
        code: form.code.trim(), name: form.name.trim(),
        shares: Number(form.shares), avg_cost: Number(form.avg_cost),
      });
      onClose();
    } catch (err) {
      setError("儲存失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-md bg-zinc-900 rounded-2xl p-6 shadow-xl border border-zinc-800">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold text-lg">編輯持股</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors text-xl">✕</button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-zinc-400 text-xs mb-1 block">股票代號 *</label>
            <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="text-zinc-400 text-xs mb-1 block">股票名稱 *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="text-zinc-400 text-xs mb-1 block">持有股數 *</label>
            <input type="number" value={form.shares} onChange={(e) => setForm({ ...form, shares: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="text-zinc-400 text-xs mb-1 block">平均成本（元/股）*</label>
            <input type="number" value={form.avg_cost} onChange={(e) => setForm({ ...form, avg_cost: e.target.value })} className={inputClass} />
          </div>
        </div>

        {error && <p className="text-red-400 text-xs text-center mt-3">{error}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-sm py-2.5 rounded-lg transition-colors">取消</button>
          <button onClick={handleSave} disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm py-2.5 rounded-lg transition-colors font-medium">
            {loading ? "儲存中..." : "儲存"}
          </button>
        </div>
      </div>
    </div>
  );
}
