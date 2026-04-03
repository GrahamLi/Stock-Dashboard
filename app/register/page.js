 "use client";

import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError("");

    if (password !== confirmPassword) {
      setError("兩次密碼輸入不一致。");
      return;
    }

    if (password.length < 6) {
      setError("密碼長度至少需要 6 個字元。");
      return;
    }

    if (inviteCode !== process.env.NEXT_PUBLIC_INVITE_CODE) {
      setError("邀請碼無效，請確認後重新輸入。");
      return;
    }

    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("此電子郵件已被註冊。");
      } else if (err.code === "auth/invalid-email") {
        setError("電子郵件格式不正確。");
      } else {
        setError("註冊失敗，請稍後再試。");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-zinc-900 rounded-2xl p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-white text-center mb-2">
          建立帳號
        </h1>
        <p className="text-zinc-400 text-center text-sm mb-8">
          請輸入邀請碼完成註冊
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

          <div>
            <label className="text-zinc-400 text-sm mb-1 block">密碼</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 個字元"
              className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-zinc-400 text-sm mb-1 block">確認密碼</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="請再次輸入密碼"
              className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-zinc-400 text-sm mb-1 block">邀請碼</label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="請輸入邀請碼"
              className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold rounded-lg py-3 text-sm transition-colors"
          >
            {loading ? "註冊中..." : "註冊"}
          </button>

          <div className="text-center text-sm">
            <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
              已有帳號？登入
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
