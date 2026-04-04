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
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import SummaryCards from "@/components/SummaryCards";
import PieChart from "@/components/PieChart";
import LineChart from "@/components/LineChart";
import StockTable from "@/components/StockTable";
import AddStockModal from "@/components/AddStockModal";
import DailyChanges from "@/components/DailyChanges";

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [history, setHistory] = useState([]);
  const [transactions, setTransactions] = useState([]);
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
      fetchAll();
    }
  }, [user]);

  const fetchAll = async () => {
    await Promise.all([
      fetchHoldings(),
      fetchHistory(),
      fetchTransactions(),
    ]);
    setLoading(false);
  };

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

  const fetchTransactions = async () => {
    try {
      const q = query(
        collection(db, "transactions"),
        where("user_id", "==", user.uid)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTransactions(data);
    } catch (err) {
      console.error("讀取交易紀錄失敗：", err);
    }
  };

  const handleAddStock = async (formData) => {
    if (formData.type === "quick") {
      const existing = holdings.find((h) => h.code === formData.code);
      if (existing) {
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
        await updateDoc(ref, { shares: newShares <= 0 ? 0 : newShares });
      }
    }
    await fetchAll();
  };

  const handleEditStock = async (id, updatedData) => {
    try {
      const ref = doc(db, "holdings", id);
      await updateDoc(ref, {
        code: updatedData.code,
        name: updatedData.name,
        shares: updatedData.shares,
        avg_cost: updatedData.avg_cost,
      });
      await fetchHoldings();
    } catch (err) {
      console.error("編輯持股失敗：", err);
      throw err;
    }
  };

  const handleDeleteStock = async (id) => {
    try {
      await deleteDoc(doc(db, "holdings", id));
      await fetchHoldings();
    } catch (err) {
      console.error("刪除持股失敗：", err);
      throw err;
    }
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

            <div className="px-6 pb-4">
              <p className="text-zinc-400 text-sm mb-3">持股清單</p>
              <StockTable
                holdings={holdings}
                onEdit={handleEditStock}
                onDelete={handleDeleteStock}
              />
            </div>

            <div className="px-6 pb-24">
              <DailyChanges
                transactions={transactions}
                history={history}
                holdings={holdings}
              />
            </div>
          </>
        )}

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