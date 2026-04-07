"use client";

import { useState, useRef, useEffect } from "react";
import STOCK_LIST from "@/lib/stockList";

function toHalfWidth(str) {
  return str
    .replace(/[\uff01-\uff5e]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
    )
    .replace(/\u3000/g, " ");
}

function searchStocks(keyword) {
  if (!keyword || keyword.trim() === "") return [];
  const kw = toHalfWidth(keyword.trim()).toLowerCase();
  const results = [];
  for (const [code, name] of Object.entries(STOCK_LIST)) {
    if (
      toHalfWidth(code).toLowerCase().includes(kw) ||
      name.toLowerCase().includes(kw)
    ) {
      results.push({ code, name });
      if (results.length >= 10) break;
    }
  }
  return results;
}

function StockSearchInput({ codeValue, nameValue, onSelect }) {
  const [keyword, setKeyword] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!codeValue && !nameValue) {
      setKeyword("");
      setIsSelected(false);
    }
  }, [codeValue, nameValue]);

  const handleChange = (e) => {
    const val = e.target.value;
    setKeyword(val);
    setIsSelected(false);

    const normalized = toHalfWidth(val.trim());

    if (normalized === "") {
      setSuggestions([]);
      setShowDropdown(false);
      onSelect("", "");
      return;
    }

    if (STOCK_LIST[normalized]) {
      onSelect(normalized, STOCK_LIST[normalized]);
      setIsSelected(true);
      setShowDropdown(false);
      setSuggestions([]);
      return;
    }

    const matchByName = Object.entries(STOCK_LIST).find(
      ([, name]) => name === normalized
    );
    if (matchByName) {
      onSelect(matchByName[0], matchByName[1]);
      setIsSelected(true);
      setShowDropdown(false);
      setSuggestions([]);
      return;
    }

    const results = searchStocks(val);
    if (results.length === 1) {
      onSelect(results[0].code, results[0].name);
      setKeyword(`${results[0].code} ${results[0].name}`);
      setIsSelected(true);
      setShowDropdown(false);
      setSuggestions([]);
    } else {
      setSuggestions(results);
      setShowDropdown(results.length > 0);
      onSelect("", "");
    }
  };

  const handleSelect = (code, name) => {
    setKeyword(`${code} ${name}`);
    setIsSelected(true);
    setShowDropdown(false);
    setSuggestions([]);
    onSelect(code, name);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={keyword}
          onChange={handleChange}
          onFocus={() => {
            if (suggestions.length > 0 && !isSelected) setShowDropdown(true);
          }}
          placeholder="輸入代號或名稱（全形半形皆可）"
          className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 pr-20"
        />
        {isSelected && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400 text-xs">
            ✓ 已選取
          </span>
        )}
      </div>
      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
          {suggestions.map((s) => (
            <button
              key={s.code}
              type="button"
              onClick={() => handleSelect(s.code, s.name)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-700 transition-colors text-left"
            >
              <span className="text-zinc-400 text-xs font-mono w-14 shrink-0">
                {s.code}
              </span>
              <span className="text-white text-sm">{s.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AddStockModal({ onClose, onAdd, accounts, defaultAccount }) {
  const [txForm, setTxForm] = useState({
    code: "",
    name: "",
    action: "買入",
    shares: "",
    price: "",
    date: new Date().toISOString().split("T")[0],
    note: "",
    account: defaultAccount || "預設帳戶",
  });
  const [dateInputType, setDateInputType] = useState("date");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const inputClass =
    "w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500";

  const handleSubmit = async () => {
    setError("");
    if (!txForm.code || !txForm.name) {
      setError("請從下拉選單選取股票，或輸入完整代號/名稱。");
      return;
    }
    if (!txForm.shares || isNaN(txForm.shares) || Number(txForm.shares) <= 0) {
      setError("股數請輸入正確數字。");
      return;
    }
    if (!txForm.price || isNaN(txForm.price) || Number(txForm.price) <= 0) {
      setError("成交價請輸入正確數字。");
      return;
    }
    if (!txForm.date) {
      setError("請選擇交易日期。");
      return;
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(txForm.date)) {
      setError("日期格式請輸入 YYYY-MM-DD，例如：2026-04-05");
      return;
    }
    if (!txForm.account) {
      setError("請選擇帳戶。");
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
        account: txForm.account,
        has_transaction_history: true,
      });
      onClose();
    } catch (err) {
      setError(err.message || "新增失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-md bg-zinc-900 rounded-2xl p-6 shadow-xl border border-zinc-800">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-white font-bold text-lg">新增交易紀錄</h2>
            <p className="text-zinc-500 text-xs mt-0.5">
              記錄每一筆實際買賣交易
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors text-xl"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-zinc-400 text-xs mb-1 block">帳戶 *</label>
            <select
              value={txForm.account}
              onChange={(e) => setTxForm({ ...txForm, account: e.target.value })}
              className={inputClass}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-zinc-400 text-xs mb-1 block">搜尋股票 *</label>
            <StockSearchInput
              codeValue={txForm.code}
              nameValue={txForm.name}
              onSelect={(code, name) =>
                setTxForm((prev) => ({ ...prev, code, name }))
              }
            />
            {txForm.code && txForm.name && (
              <p className="text-zinc-500 text-xs mt-1">
                已選取：{txForm.code} {txForm.name}
              </p>
            )}
          </div>

          <div>
            <label className="text-zinc-400 text-xs mb-1 block">買賣方向 *</label>
            <select
              value={txForm.action}
              onChange={(e) => setTxForm({ ...txForm, action: e.target.value })}
              className={inputClass}
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
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-zinc-400 text-xs mb-1 block">
              成交價（元/股）*
            </label>
            <input
              type="number"
              value={txForm.price}
              onChange={(e) => setTxForm({ ...txForm, price: e.target.value })}
              placeholder="例：580"
              className={inputClass}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-zinc-400 text-xs">交易日期 *</label>
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
              value={txForm.date}
              onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
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
              value={txForm.note}
              onChange={(e) => setTxForm({ ...txForm, note: e.target.value })}
              placeholder="選填"
              className={inputClass}
            />
          </div>
        </div>

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
            onClick={handleSubmit}
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