"use client";

import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";

export default function Navbar() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setEmail(user.email);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (err) {
      console.error("登出失敗：", err);
    }
  };

  return (
    <nav className="w-full bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
      <h1 className="text-white font-bold text-lg">📈 股票儀表板</h1>
      <div className="flex items-center gap-4">
        <span className="text-zinc-400 text-sm">{email}</span>
        <button
          onClick={handleLogout}
          className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
        >
          登出
        </button>
      </div>
    </nav>
  );
} 
