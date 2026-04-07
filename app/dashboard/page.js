"use client";

// =============================================================================
// app/dashboard/page.js
// =============================================================================
// Revision Change List:
// V01 - 初始版本，儀表板主頁，整合所有元件與資料操作
// V02 - 新增 handleMoveTransaction / handleMoveQuickHolding handler
//       StockTable 補傳 accounts / onMoveTransaction / onMoveQuickHolding
// =============================================================================

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  fetchHoldings,
  fetchTransactions,
  fetchHistory,
  fetchAccounts,
  addQuickHolding,
  addTransaction,
  editHolding,
  deleteHolding,
  deleteTransaction,
  editTransaction,
  editQuickHolding,
  deleteQuickHolding,
  moveTransaction,
  moveQuickHolding,
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
import AccountSwitcher from "@/components/AccountSwitcher";

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [history, setHistory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("全部帳戶");
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
      const [h, tx, hist, accts] = await Promise.all([
        fetchHoldings(user.uid),
        fetchTransactions(user.uid),
        fetchHistory(user.uid),
        fetchAccounts(user.uid),
      ]);
      setHoldings(h);
      setTransactions(tx);
      setHistory(hist);
      setAccounts(accts);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("讀取資料失敗：", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountsOnly = async () => {
    try {
      const accts = await fetchAccounts(user.uid);
      setAccounts(accts);
    } catch (err) {
      console.error("讀取帳戶失敗：", err);
    }
  };

  // 依帳戶篩選資料
  const filteredHoldings =
    selectedAccount === "全部帳戶"
      ? holdings
      : holdings.filter((h) => (h.account || "預設帳戶") === selectedAccount);

  const filteredTransactions =
    selectedAccount === "全部帳戶"
      ? transactions
      : transactions.filter(
          (tx) => (tx.account || "預設帳戶") === selectedAccount
        );

  const filteredHistory =
    selectedAccount === "全部帳戶"
      ? history
      : history.filter(
          (h) => (h.account || "預設帳戶") === selectedAccount
        );

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

  const handleDeleteTransaction = async (txId, code, account) => {
    try {
      await deleteTransaction(user.uid, txId, code, account);
      await fetchAll();
    } catch (err) {
      console.error("刪除交易紀錄失敗：", err);
      throw err;
    }
  };

  const handleEditTransaction = async (txId, code, account, updatedData) => {
    try {
      await editTransaction(user.uid, txId, code, account, updatedData);
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

  const handleMoveTransaction = async (txId, code, oldAccount, newAccount) => {
    try {
      await moveTransaction(user.uid, txId, code, oldAccount, newAccount);
      await fetchAll();
    } catch (err) {
      console.error("移動交易紀錄失敗：", err);
      throw err;
    }
  };

  const handleMoveQuickHolding = async (holdingId, newAccount) => {
    try {
      await moveQuickHolding(user.uid, holdingId, newAccount);
      await fetchAll();
    } catch (err) {
      console.error("移動快速建倉失敗：", err);
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

            <SummaryCards holdings={filteredHoldings} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-6 pb-4">
              <PieChart holdings={filteredHoldings} />
              <LineChart history={filteredHistory} />
            </div>

            {/* 持股清單標題列 + 帳戶切換器 + 快速建倉 */}
            <div className="px-6 pb-3">
              <div className="flex items-center justify-between mb-3">
                <p className="text-zinc-400 text-sm">持股清單</p>
                <button
                  onClick={() => setShowQuickModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-3 rounded-full shadow-lg transition-colors"
                >
                  ＋ 快速建倉
                </button>
              </div>
              <AccountSwitcher
                accounts={accounts}
                selectedAccount={selectedAccount}
                onSelect={setSelectedAccount}
                onAccountsChange={fetchAccountsOnly}
                uid={user.uid}
              />
            </div>

            <div className="px-6 pb-4">
              <StockTable
                holdings={filteredHoldings}
                transactions={filteredTransactions}
                accounts={accounts}
                onEdit={handleEditStock}
                onDelete={handleDeleteStock}
                onDeleteTransaction={handleDeleteTransaction}
                onDeleteQuickHolding={handleDeleteQuickHolding}
                onEditTransaction={handleEditTransaction}
                onEditQuickHolding={handleEditQuickHolding}
                onMoveTransaction={handleMoveTransaction}
                onMoveQuickHolding={handleMoveQuickHolding}
              />
            </div>

            <div className="px-6 pb-24">
              <DailyChanges
                transactions={filteredTransactions}
                history={filteredHistory}
                holdings={filteredHoldings}
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
            accounts={accounts}
            defaultAccount={selectedAccount !== "全部帳戶" ? selectedAccount : "預設帳戶"}
          />
        )}

        {/* 新增交易紀錄彈窗 */}
        {showAddModal && (
          <AddStockModal
            onClose={() => setShowAddModal(false)}
            onAdd={handleAddStock}
            accounts={accounts}
            defaultAccount={selectedAccount !== "全部帳戶" ? selectedAccount : "預設帳戶"}
          />
        )}
      </div>
    </AuthGuard>
  );
}
