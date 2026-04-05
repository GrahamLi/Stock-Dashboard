"use client";

import { useState, useEffect, useRef } from "react";

export default function UpdateButton({ onRefresh }) {
  const [status, setStatus] = useState("idle"); // idle | confirming | triggering | polling | success | error
  const [showConfirm, setShowConfirm] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const pollRef = useRef(null);

  const OWNER = process.env.NEXT_PUBLIC_GITHUB_OWNER;
  const REPO = process.env.NEXT_PUBLIC_GITHUB_REPO;
  const WORKFLOW = process.env.NEXT_PUBLIC_GITHUB_WORKFLOW;
  const PAT = process.env.NEXT_PUBLIC_GITHUB_PAT;

  const isBeforeMarketClose = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    return hours < 14 || (hours === 14 && minutes < 30);
  };

  const handleClickUpdate = () => {
    if (isBeforeMarketClose()) {
      setShowConfirm(true);
    } else {
      triggerUpdate();
    }
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopPolling();
  }, []);

  const getLatestRunId = async () => {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW}/runs?per_page=1`,
        {
          headers: {
            Authorization: `Bearer ${PAT}`,
            Accept: "application/vnd.github+json",
          },
        }
      );
      const data = await res.json();
      if (data.workflow_runs && data.workflow_runs.length > 0) {
        return data.workflow_runs[0].id;
      }
      return null;
    } catch (err) {
      console.error("取得 run ID 失敗：", err);
      return null;
    }
  };

  const checkRunStatus = async (runId) => {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${OWNER}/${REPO}/actions/runs/${runId}`,
        {
          headers: {
            Authorization: `Bearer ${PAT}`,
            Accept: "application/vnd.github+json",
          },
        }
      );
      const data = await res.json();
      return {
        status: data.status,
        conclusion: data.conclusion,
      };
    } catch (err) {
      console.error("檢查狀態失敗：", err);
      return null;
    }
  };

  const triggerUpdate = async () => {
    setShowConfirm(false);
    setStatus("triggering");
    setPollCount(0);

    try {
      // 觸發 Actions
      const response = await fetch(
        `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW}/dispatches`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${PAT}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ref: "main" }),
        }
      );

      if (response.status !== 204) {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 5000);
        return;
      }

      // 等待 3 秒讓 GitHub 建立 run
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // 取得最新 run ID
      const runId = await getLatestRunId();
      if (!runId) {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 5000);
        return;
      }

      // 開始輪詢
      setStatus("polling");
      let count = 0;

      pollRef.current = setInterval(async () => {
        count += 1;
        setPollCount(count);

        const result = await checkRunStatus(runId);

        if (!result) return;

        if (result.status === "completed") {
          stopPolling();
          if (result.conclusion === "success") {
            setStatus("success");
            // 重新讀取資料
            if (onRefresh) await onRefresh();
            setTimeout(() => setStatus("idle"), 3000);
          } else {
            setStatus("error");
            setTimeout(() => setStatus("idle"), 5000);
          }
        }

        // 最多等 5 分鐘（60 次 × 5 秒）
        if (count >= 60) {
          stopPolling();
          setStatus("error");
          setTimeout(() => setStatus("idle"), 5000);
        }
      }, 5000);
    } catch (err) {
      console.error("觸發更新失敗：", err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 5000);
    }
  };

  const elapsedSeconds = pollCount * 5;

  return (
    <>
      {/* 更新按鈕 */}
      <button
        onClick={handleClickUpdate}
        disabled={status !== "idle"}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-lg"
      >
        {status === "idle" && "↻ 更新股價"}
        {status === "triggering" && "觸發中..."}
        {status === "polling" && "更新中..."}
        {status === "success" && "✓ 更新完成"}
        {status === "error" && "✗ 更新失敗"}
      </button>

      {/* 大型提示覆蓋層 */}
      {(status === "triggering" || status === "polling") && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl px-10 py-8 shadow-2xl flex flex-col items-center gap-4 max-w-sm w-full mx-4">
            {/* 旋轉動畫 */}
            <div className="w-12 h-12 border-4 border-zinc-600 border-t-blue-500 rounded-full animate-spin" />

            <p className="text-white text-xl font-bold text-center">
              股價更新中
            </p>
            <p className="text-zinc-400 text-sm text-center">
              約需 30 秒，請稍候...
            </p>

            {status === "polling" && elapsedSeconds > 0 && (
              <p className="text-zinc-500 text-xs text-center">
                已等待 {elapsedSeconds} 秒
              </p>
            )}

            <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-2">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.min((elapsedSeconds / 40) * 100, 95)}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 成功提示 */}
      {status === "success" && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-green-700 rounded-2xl px-10 py-8 shadow-2xl flex flex-col items-center gap-4 max-w-sm w-full mx-4">
            <p className="text-green-400 text-5xl">✓</p>
            <p className="text-white text-xl font-bold text-center">
              股價更新完成！
            </p>
            <p className="text-zinc-400 text-sm text-center">
              畫面數字已更新為最新收盤價
            </p>
          </div>
        </div>
      )}

      {/* 失敗提示 */}
      {status === "error" && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-red-700 rounded-2xl px-10 py-8 shadow-2xl flex flex-col items-center gap-4 max-w-sm w-full mx-4">
            <p className="text-red-400 text-5xl">✗</p>
            <p className="text-white text-xl font-bold text-center">
              更新失敗
            </p>
            <p className="text-zinc-400 text-sm text-center">
              請稍後再試，或至 GitHub Actions 手動觸發
            </p>
          </div>
        </div>
      )}

      {/* 14:30 前確認彈窗 */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="w-full max-w-sm bg-zinc-900 rounded-2xl p-6 shadow-xl border border-zinc-800">
            <h2 className="text-white font-bold text-lg mb-2">注意</h2>
            <p className="text-zinc-400 text-sm mb-2">
              現在是下午 2:30 以前，台股尚未收盤。
            </p>
            <p className="text-yellow-400 text-xs mb-6">
              ⚠️ 更新後顯示的將會是
              <span className="font-bold">前一個工作天的收盤價</span>
              ，不是今日最新價格。
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