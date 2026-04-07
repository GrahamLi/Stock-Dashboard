"use client";

// =============================================================================
// AccountSwitcher.js
// =============================================================================
// Revision Change List:
// V01 - 初始版本，帳戶切換器 + 管理帳戶彈窗
// V02 - 管理帳戶彈窗支援 ESC 鍵關閉
// V03 - 移除「預設帳戶」不能刪除的限制
//       帳戶列表空白時顯示「尚無帳戶，請先建立帳戶」引導提示
// =============================================================================

import { useState, useEffect } from "react";
import { addAccount, updateAccount, deleteAccount } from "@/lib/firestore";

export default function AccountSwitcher({
  accounts, selectedAccount, onSelect, onAccountsChange, uid,
}) {
  const [showManage, setShowManage] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ESC 鍵關閉
  useEffect(() => {
    if (!showManage) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") { setShowManage(false); setError(""); setEditingId(null); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showManage]);

  const handleAddAccount = async () => {
    setError("");
    if (!newAccountName.trim()) { setError("請輸入帳戶名稱。"); return; }
    if (accounts.find((a) => a.name === newAccountName.trim())) { setError("此帳戶名稱已存在。"); return; }
    setLoading(true);
    try {
      await addAccount(uid, newAccountName.trim());
      setNewAccountName("");
      await onAccountsChange();
    } catch (err) {
      setError(err.message || "新增失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAccount = async (accountId) => {
    setError("");
    if (!editingName.trim()) { setError("請輸入帳戶名稱。"); return; }
    if (accounts.find((a) => a.name === editingName.trim() && a.id !== accountId)) { setError("此帳戶名稱已存在。"); return; }
    setLoading(true);
    try {
      await updateAccount(accountId, editingName.trim());
      setEditingId(null); setEditingName("");
      await onAccountsChange();
    } catch (err) {
      setError(err.message || "更新失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (accountId, accountName) => {
    setError("");
    setLoading(true);
    try {
      await deleteAccount(uid, accountId, accountName);
      if (selectedAccount === accountName) onSelect("全部帳戶");
      await onAccountsChange();
    } catch (err) {
      setError(err.message || "刪除失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "bg-zinc-800 text-white rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">

        {/* 帳戶列表空白時的引導提示 */}
        {accounts.length === 0 ? (
          <div className="flex items-center gap-3">
            <span className="text-zinc-500 text-xs">尚無帳戶，請先建立帳戶</span>
            <button
              onClick={() => { setShowManage(true); setError(""); }}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              ＋ 建立帳戶
            </button>
          </div>
        ) : (
          <>
            {/* 全部帳戶 */}
            <button
              onClick={() => onSelect("全部帳戶")}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors border ${
                selectedAccount === "全部帳戶"
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white"
              }`}
            >
              全部帳戶
            </button>

            {/* 各帳戶按鈕 */}
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => onSelect(account.name)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors border ${
                  selectedAccount === account.name
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white"
                }`}
              >
                {account.name}
              </button>
            ))}

            {/* 管理帳戶按鈕 */}
            <button
              onClick={() => { setShowManage(true); setError(""); }}
              className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white transition-colors"
            >
              ⚙ 管理帳戶
            </button>
          </>
        )}
      </div>

      {/* 管理帳戶彈窗 */}
      {showManage && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="w-full max-w-md bg-zinc-900 rounded-2xl p-6 shadow-xl border border-zinc-800">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-bold text-lg">管理帳戶</h2>
              <button
                onClick={() => { setShowManage(false); setError(""); setEditingId(null); }}
                className="text-zinc-400 hover:text-white transition-colors text-xl"
              >
                ✕
              </button>
            </div>

            {/* 現有帳戶列表 */}
            {accounts.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-4">尚無帳戶，請在下方新增</p>
            ) : (
              <div className="flex flex-col gap-2 mb-5">
                {accounts.map((account) => (
                  <div key={account.id} className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2">
                    {editingId === account.id ? (
                      <>
                        <input
                          type="text" value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className={`flex-1 ${inputClass}`} autoFocus
                        />
                        <button onClick={() => handleUpdateAccount(account.id)} disabled={loading} className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">儲存</button>
                        <button onClick={() => { setEditingId(null); setEditingName(""); setError(""); }} className="text-xs px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded transition-colors">取消</button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-white text-sm">{account.name}</span>
                        <button
                          onClick={() => { setEditingId(account.id); setEditingName(account.name); setError(""); }}
                          className="text-zinc-400 hover:text-blue-400 transition-colors text-xs px-2 py-1 rounded border border-zinc-700 hover:border-blue-500"
                        >
                          改名
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(account.id, account.name)}
                          disabled={loading}
                          className="text-zinc-400 hover:text-red-400 transition-colors text-xs px-2 py-1 rounded border border-zinc-700 hover:border-red-500"
                        >
                          刪除
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 新增帳戶 */}
            <div className="border-t border-zinc-800 pt-4">
              <p className="text-zinc-400 text-xs mb-2">新增帳戶</p>
              <div className="flex gap-2">
                <input
                  type="text" value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddAccount()}
                  placeholder="例：永豐、富邦、國泰"
                  className={`flex-1 ${inputClass}`}
                />
                <button onClick={handleAddAccount} disabled={loading} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm px-4 py-1.5 rounded-lg transition-colors">新增</button>
              </div>
            </div>

            {error && <p className="text-red-400 text-xs text-center mt-3">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}
