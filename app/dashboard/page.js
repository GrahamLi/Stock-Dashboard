"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import SummaryCards from "@/components/SummaryCards";
import PieChart from "@/components/PieChart";
import LineChart from "@/components/LineChart";
import StockTable from "@/components/StockTable";
import AddStockModal from "@/components/AddStockModal";

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [history, setHistory] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchHoldings();
      fetchHistory();
    }
  }, [user]);

  const fetchHoldings = async () => {
    try {
      const q = query(
        collection(db, "holdings"),
        where("user_id", "==", user.uid)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setHoldings(data);
    } catch (err) {
      console.error("讀取持股失敗：", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const q = query(
        collection(db, "history"),
        where("user_id", "==", user.uid)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      setHistory(data);
    } catch (err) {
      console.error("讀取歷史失敗：", err);
    }
  };

  const handleAddStock = async (formData) => {
    if (formData.type === "quick") {
      // 檢查是否已有此股票
      const existing = holdings.find((h) => h.code === formData.code);

      if (existing) {
        // 已有此股票 → 加權平均更新
        const newShares = existing.shares + formData.shares;
        const newAvgCost =
          (existing.shares * existing.avg_cost +
            formData.shares * formData.avg_cost) /
          newShares;

        const ref = doc(db, "holdings", existing.id);
        await updateDoc(ref, {
          shares: newShares,
          avg_cost: Number(newAvgCost.toFixed(4)),
        });
      } else {
        // 新股票 → 新增
        await addDoc(collection(db, "holdings"), {
          user_id: user.uid,
          code: formData.code,
          name: formData.name,
          shares: formData.shares,
          avg_cost: formData.avg_cost,
          current_price: 0,
          has_transaction_history: false,
          created_at: serverTimestamp(),
        });
      }
    } else {
      // 交易紀錄模式
      await addDoc(collection(db, "transactions"), {
        user_id: user.uid,
        code: formData.code,
        name: formData.name,
        action: formData.action,
        shares: formData.shares,
        price: formData.price,
        date: formData.date,
        note: formData.note,
        created_at: serverTimestamp(),
      });

      // 更新 holdings
      const existing = holdings.find((h) => h.code === formData.code);

      if (formData.action === "買入") {
        if (existing) {
          const newShares = existing.shares + formData.shares;
          const newAvgCost =
            (existing.shares * existing.avg_cost +
              formData.shares * formData.price) /
            newShares;
          const ref = doc(db, "holdings", existing.id);
          await updateDoc(ref, {
            shares: newShares,
            avg_cost: Number(newAvgCost.toFixed(4)),
            has_transaction_history: true,
          });
        } else {
          await addDoc(collection(db, "holdings"), {
            user_id: user.uid,
            code: formData.code,
            name: formData.name,
            shares: formData.shares,
            avg_cost: formData.price,
            current_price: 0,
            has_transaction_history: true,
            created_at: serverTimestamp(),
          });
        }
      } else if (formData.action === "賣出" && existing) {
        const newShares = existing.shares - formData.shares;
        const ref = doc(db, "holdings", existing.id);
        if (newShares <= 0) {
          await updateDoc(ref, { shares: 0 });
        } else {
          await updateDoc(ref, { shares: newShares });
        }
      }
    }

    await fetchHoldings();
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-black">
        <Navbar />

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <p className="text-zinc-400 text-sm">載入中...</p>
          </div>
        ) : (
          <>
            <SummaryCards holdings={holdings} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-6 pb-4">
              <PieChart holdings={holdings} />
              <LineChart history={history} />
            </div>

            <div className="px-6 pb-6">
              <p className="text-zinc-400 text-sm mb-3">持股清單</p>
              <StockTable holdings={holdings} />
            </div>
          </>
        )}

        {/* 新增持股浮動按鈕 */}
        <button
          onClick={() => setShowModal(true)}
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-3 rounded-full shadow-lg transition-colors z-40"
        >
          ＋ 新增持股
        </button>

        {showModal && (
          <AddStockModal
            onClose={() => setShowModal(false)}
            onAdd={handleAddStock}
          />
        )}
      </div>
    </AuthGuard>
  );
}