"use client";

import { useState } from "react";

export default function UpdateButton() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // "success" | "error" | null
  const [showConfirm, setShowConfirm] = useState(false);

  const isBeforeMarketClose = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    // 14:30 以前
    return hours < 14 || (hours === 14 && minutes < 30);
  };

  const handleClickUpdate = () => {
    if (isBeforeMarketClose()) {
      setShowConfirm(true);
    } else {
      triggerUpdate();
    }
  };

  const triggerUpdate = async () => {
    setShowConfirm(false);
    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch(
        `https://api.github.com/repos/${process.env.NEXT_PUBLIC_GITHUB_OWNER}/${process.env.NEXT_PUBLIC_GITHUB_REPO}/actions/workflows/${process.env.NEXT_PUBLIC_GITHUB_WORKFLOW}/dispatches`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_GITHUB_PAT}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ref: "main" }),
        }
      );

      if (response.status === 204) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch (err) {
      console.error("觸發更新失敗：", err);
      setStatus("error");
    } finally {
      setLoading(false);
      // 5 秒後清除狀態
      setTimeout(() => setStatus(null), 5000);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={handleClickUpdate}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-lg"
        >
          {loading ? (
            <>
              <span className="animate-spin">⟳</span>
              更新中...
            </>
          ) : (
            <>
              ↻ 更新股價
            </>
          )}
        </button>

        {status === "success" && (
          <span className="text-green-400 text-xs">
            ✓ 已觸發更新，約 30 秒後完成
          </span>
        )}
        {status === "error" && (
          <span className="text-red-400 text-xs">
            ✗ 觸發失敗，請稍後再試
          </span>
        )}
      </div>

      {/* 14:30 前的確認彈窗 */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="w-full max-w-sm bg-zinc-900 rounded-2xl p-6 shadow-xl border border-zinc-800">
            <h2 className="text-white font-bold text-lg mb-2">注意</h2>
            <p className="text-zinc-400 text-sm mb-2">
              現在是下午 2:30 以前，台股尚未收盤。
            </p>
            <p className="text-yellow-400 text-xs mb-6">
              ⚠️ 更新後顯示的將會是<span className="font-bold">前一個工作天的收盤價</span>，不是今日最新價格。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-sm py-2.5 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={triggerUpdate}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2.5 rounded-lg transition-colors font-medium"
              >
                確認更新
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}