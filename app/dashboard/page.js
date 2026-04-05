"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  fetchHoldings,
  fetchTransactions,
  fetchHistory,
  addQuickHolding,
  addTransaction,
  editHolding,
  deleteHolding,
  deleteTransaction,
  editTransaction,
  editQuickHolding,
  deleteQuickHolding,
} from "@/lib/firestore";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import SummaryCards from "@/components/SummaryCards";
import PieChart from "@/components/PieChart";
import LineChart from "@/components/LineChart";
import StockTable from "@/components/StockTable";
import AddStockModal from "@/components/AddStockModal";
import QuickHoldingModal from "@/components/QuickHoldingModal";
import DailyChanges from "@/components/DailyChanges";
import UpdateButton from "@/components/UpdateButton";

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [history, setHistory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) fetchAll();
  }, [user]);

  const fetchAll = async () => {
    try {
      const [h, tx, hist] = await Promise.all([
        fetchHoldings(user.uid),
        fetchTransactions(user.uid),
        fetchHistory(user.uid),
      ]);
      setHoldings(h);
      setTransactions(tx);
      setHistory(hist);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("讀取資料失敗：", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async (formData) => {
    try {
      if (formData.type === "quick") {
        await addQuickHolding(user.uid, formData);
      } else {
        await addTransaction(user.uid, formData);
      }
      await fetchAll();
    } catch (err) {
      console.error("新增失敗：", err);
      throw err;
    }
  };

  const handleEditStock = async (id, updatedData) => {
    try {
      await editHolding(id, updatedData);
      await fetchAll();
    } catch (err) {
      console.error("編輯失敗：", err);
      throw err;
    }
  };

  const handleDeleteStock = async (id) => {
    try {
      await deleteHolding(user.uid, id);
      await fetchAll();
    } catch (err) {
      console.error("刪除持股失敗：", err);
      throw err;
    }
  };

  const handleDeleteTransaction = async (txId, code) => {
    try {
      await deleteTransaction(user.uid, txId, code);
      await fetchAll();
    } catch (err) {
      console.error("刪除交易紀錄失敗：", err);
      throw err;
    }
  };

  const handleEditTransaction = async (txId, code, updatedData) => {
    try {
      await editTransaction(user.uid, txId, code, updatedData);
      await fetchAll();
    } catch (err) {
      console.error("編輯交易紀錄失敗：", err);
      throw err;
    }
  };

  const handleEditQuickHolding = async (holdingId, updatedData) => {
    try {
      await editQuickHolding(user.uid, holdingId, updatedData);
      await fetchAll();
    } catch (err) {
      console.error("編輯建倉失敗：", err);
      throw err;
    }
  };

  const handleDeleteQuickHolding = async (holdingId) => {
    try {
      await deleteQuickHolding(user.uid, holdingId);
      await fetchAll();
    } catch (err) {
      console.error("刪除建倉失敗：", err);
      throw err;
    }
  };

  const formatLastUpdated = (date) => {
    if (!date) return "";
    return date.toLocaleString("zh-TW", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
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
            {/* 頂部資訊列 */}
            <div className="flex items-center justify-between px-6 py-3">
              <p className="text-zinc-500 text-xs">
                {lastUpdated && `資料讀取時間：${formatLastUpdated(lastUpdated)}`}
              </p>
              <UpdateButton onRefresh={fetchAll} />
            </div>

            <SummaryCards holdings={holdings} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-6 pb-4">
              <PieChart holdings={holdings} />
              <LineChart history={history} />
            </div>

            {/* 持股清單標題列 + 快速建倉按鈕 */}
            <div className="px-6 pb-3 flex items-center justify-between">
              <p className="text-zinc-400 text-sm">持股清單</p>
              <button
                onClick={() => setShowQuickModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-3 rounded-full shadow-lg transition-colors"
              >
                ＋ 快速建倉
              </button>
            </div>

            <div className="px-6 pb-4">
              <StockTable
                holdings={holdings}
                transactions={transactions}
                onEdit={handleEditStock}
                onDelete={handleDeleteStock}
                onDeleteTransaction={handleDeleteTransaction}
                onDeleteQuickHolding={handleDeleteQuickHolding}
                onEditTransaction={handleEditTransaction}
                onEditQuickHolding={handleEditQuickHolding}
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

        {/* 新增交易紀錄浮動按鈕 */}
        <button
          onClick={() => setShowAddModal(true)}
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-3 rounded-full shadow-lg transition-colors z-40"
        >
          ＋ 新增交易
        </button>

        {/* 快速建倉彈窗 */}
        {showQuickModal && (
          <QuickHoldingModal
            onClose={() => setShowQuickModal(false)}
            onAdd={handleAddStock}
          />
        )}

        {/* 新增交易紀錄彈窗 */}
        {showAddModal && (
          <AddStockModal
            onClose={() => setShowAddModal(false)}
            onAdd={handleAddStock}
          />
        )}
      </div>
    </AuthGuard>
  );
}