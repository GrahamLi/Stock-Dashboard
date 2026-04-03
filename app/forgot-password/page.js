"use client";

import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    setError("");
    setMessage("");

    if (!email) {
      setError("請輸入電子郵件。");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("重設密碼郵件已寄出，請檢查您的信箱。");
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        setError("此電子郵件尚未註冊。");
      } else if (err.code === "auth/invalid-email") {
        setError("電子郵件格式不正確。");
      } else {
        setError("發送失敗，請稍後再試。");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-zinc-900 rounded-2xl p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-white text-center mb-2">
          忘記密碼
        </h1>
        <p className="text-zinc-400 text-center text-sm mb-8">
          輸入您的電子郵件，我們將寄送重設連結
        </p>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-zinc-400 text-sm mb-1 block">電子郵件</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="請輸入電子郵件"
              className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          {message && (
            <p className="text-green-400 text-sm text-center">{message}</p>
          )}

          <button
            onClick={handleReset}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold rounded-lg py-3 text-sm transition-colors"
          >
            {loading ? "寄送中..." : "寄送重設郵件"}
          </button>

          <div className="text-center text-sm">
            <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
              返回登入
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 
