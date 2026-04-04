// =============================================================================
// firestore.js
// =============================================================================
// 核心資料庫操作函式
// 包含：FIFO 成本計算、持股更新、交易紀錄管理、已實現損益計算
// =============================================================================
// Revision Change List:
// V01 - 初始版本，基本 CRUD 操作
// V02 - 修正 FIFO 計算，快速建倉加入 initial_shares 欄位
//       解決賣光後已實現損益顯示 $0 的問題
// V03 - 新增 has_quick_holding 欄位
//       解決快速建倉後再用交易紀錄買入，建倉資料消失的問題
// =============================================================================

import { db } from "@/lib/firebase";
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

// =============================================================================
// FIFO 計算核心
// =============================================================================

/**
 * 根據交易紀錄和快速建倉，用 FIFO 計算目前持股狀態
 * 快速建倉視為 T0（最早），賣出時優先從這裡扣除
 * 使用 initial_shares 保留原始建倉股數，避免賣光後 T0 消失
 */
export function calcFIFO(holding, transactions) {
  let batches = [];
  let realizedPnl = 0;

  // Step 1：快速建倉視為 T0，使用 initial_shares 還原原始股數
  if (holding.has_quick_holding) {
    const t0Shares = holding.initial_shares || holding.shares;
    if (t0Shares > 0) {
      batches.push({ shares: t0Shares, cost: holding.avg_cost });
    }
  }

  // Step 2：依照日期排序交易紀錄（舊到新）
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  // Step 3：逐筆處理交易
  for (const tx of sorted) {
    if (tx.action === "買入") {
      batches.push({ shares: tx.shares, cost: tx.price });
    } else if (tx.action === "賣出") {
      let remainingToSell = tx.shares;

      while (remainingToSell > 0 && batches.length > 0) {
        const oldest = batches[0];

        if (oldest.shares <= remainingToSell) {
          realizedPnl += (tx.price - oldest.cost) * oldest.shares;
          remainingToSell -= oldest.shares;
          batches.shift();
        } else {
          realizedPnl += (tx.price - oldest.cost) * remainingToSell;
          oldest.shares -= remainingToSell;
          remainingToSell = 0;
        }
      }
    }
  }

  // Step 4：計算剩餘持股和平均成本
  const totalShares = batches.reduce((sum, b) => sum + b.shares, 0);
  const totalCost = batches.reduce((sum, b) => sum + b.shares * b.cost, 0);
  const avgCost = totalShares > 0 ? totalCost / totalShares : 0;

  return {
    shares: totalShares,
    avg_cost: Number(avgCost.toFixed(4)),
    realizedPnl: Number(realizedPnl.toFixed(2)),
  };
}

// =============================================================================
// 讀取資料
// =============================================================================

export async function fetchHoldings(uid) {
  try {
    const q = query(
      collection(db, "holdings"),
      where("user_id", "==", uid)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("讀取持股失敗：", err);
    throw err;
  }
}

export async function fetchTransactions(uid) {
  try {
    const q = query(
      collection(db, "transactions"),
      where("user_id", "==", uid)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("讀取交易紀錄失敗：", err);
    throw err;
  }
}

export async function fetchHistory(uid) {
  try {
    const q = query(
      collection(db, "history"),
      where("user_id", "==", uid)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  } catch (err) {
    console.error("讀取歷史失敗：", err);
    throw err;
  }
}

// =============================================================================
// 新增持股
// =============================================================================

export async function addQuickHolding(uid, formData) {
  const existing = await getHoldingByCode(uid, formData.code);

  if (existing) {
    // 加權平均更新
    const newShares = existing.shares + formData.shares;
    const newAvgCost =
      (existing.shares * existing.avg_cost +
        formData.shares * formData.avg_cost) /
      newShares;
    const newInitialShares =
      (existing.initial_shares || existing.shares) + formData.shares;

    await updateDoc(doc(db, "holdings", existing.id), {
      shares: newShares,
      avg_cost: Number(newAvgCost.toFixed(4)),
      initial_shares: newInitialShares,
      has_quick_holding: true,
    });
  } else {
    await addDoc(collection(db, "holdings"), {
      user_id: uid,
      code: formData.code,
      name: formData.name,
      shares: formData.shares,
      initial_shares: formData.shares,
      avg_cost: formData.avg_cost,
      current_price: 0,
      has_transaction_history: false,
      has_quick_holding: true,
      created_at: serverTimestamp(),
    });
  }
}

export async function addTransaction(uid, formData) {
  // 新增交易紀錄
  await addDoc(collection(db, "transactions"), {
    user_id: uid,
    code: formData.code,
    name: formData.name,
    action: formData.action,
    shares: formData.shares,
    price: formData.price,
    date: formData.date,
    note: formData.note,
    created_at: serverTimestamp(),
  });

  // 取得該股所有交易紀錄，重新用 FIFO 計算
  const existing = await getHoldingByCode(uid, formData.code);
  const allTx = await getTransactionsByCode(uid, formData.code);

  if (existing) {
    const result = calcFIFO(existing, allTx);
    await updateDoc(doc(db, "holdings", existing.id), {
      shares: result.shares,
      avg_cost: result.avg_cost,
      has_transaction_history: true,
      // has_quick_holding 不動，保留原本的值
    });
  } else if (formData.action === "買入") {
    await addDoc(collection(db, "holdings"), {
      user_id: uid,
      code: formData.code,
      name: formData.name,
      shares: formData.shares,
      initial_shares: formData.shares,
      avg_cost: formData.price,
      current_price: 0,
      has_transaction_history: true,
      has_quick_holding: false,
      created_at: serverTimestamp(),
    });
  }
}

// =============================================================================
// 刪除交易紀錄（重新計算持股）
// =============================================================================

export async function deleteTransaction(uid, txId, code) {
  try {
    await deleteDoc(doc(db, "transactions", txId));

    const remaining = await getTransactionsByCode(uid, code);
    const holding = await getHoldingByCode(uid, code);

    if (!holding) return;

    const result = calcFIFO(holding, remaining);

    await updateDoc(doc(db, "holdings", holding.id), {
      shares: result.shares,
      avg_cost: result.avg_cost,
    });
  } catch (err) {
    console.error("刪除交易紀錄失敗：", err);
    throw err;
  }
}

// =============================================================================
// 刪除持股（key 錯，同時刪除 history）
// =============================================================================

export async function deleteHolding(uid, holdingId) {
  try {
    await deleteDoc(doc(db, "holdings", holdingId));

    const q = query(
      collection(db, "history"),
      where("user_id", "==", uid)
    );
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map((d) =>
      deleteDoc(doc(db, "history", d.id))
    );
    await Promise.all(deletePromises);
  } catch (err) {
    console.error("刪除持股失敗：", err);
    throw err;
  }
}

// =============================================================================
// 編輯持股
// =============================================================================

export async function editHolding(holdingId, updatedData) {
  try {
    await updateDoc(doc(db, "holdings", holdingId), {
      code: updatedData.code,
      name: updatedData.name,
      shares: updatedData.shares,
      initial_shares: updatedData.shares,
      avg_cost: updatedData.avg_cost,
    });
  } catch (err) {
    console.error("編輯持股失敗：", err);
    throw err;
  }
}

// =============================================================================
// 已實現損益計算
// =============================================================================

/**
 * 計算指定日期範圍內的已實現損益
 */
export function calcRealizedPnl(holdings, transactions, startDate, endDate) {
  const result = [];

  const codes = [...new Set(transactions.map((tx) => tx.code))];

  for (const code of codes) {
    const holding = holdings.find((h) => h.code === code);
    const allTx = transactions
      .filter((tx) => tx.code === code)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // 建立 FIFO 批次，使用 has_quick_holding 判斷是否有 T0
    let batches = [];

    if (holding && holding.has_quick_holding) {
      const t0Shares = holding.initial_shares || holding.shares;
      if (t0Shares > 0) {
        batches.push({ shares: t0Shares, cost: holding.avg_cost });
      }
    }

    for (const tx of allTx) {
      if (tx.action === "買入") {
        batches.push({ shares: tx.shares, cost: tx.price });
      } else if (tx.action === "賣出") {
        if (tx.date >= startDate && tx.date <= endDate) {
          let remainingToSell = tx.shares;
          let pnl = 0;
          let tempBatches = batches.map((b) => ({ ...b }));

          while (remainingToSell > 0 && tempBatches.length > 0) {
            const oldest = tempBatches[0];
            if (oldest.shares <= remainingToSell) {
              pnl += (tx.price - oldest.cost) * oldest.shares;
              remainingToSell -= oldest.shares;
              tempBatches.shift();
            } else {
              pnl += (tx.price - oldest.cost) * remainingToSell;
              oldest.shares -= remainingToSell;
              remainingToSell = 0;
            }
          }

          result.push({
            date: tx.date,
            code,
            name: tx.name,
            shares: tx.shares,
            sellPrice: tx.price,
            realizedPnl: Number(pnl.toFixed(2)),
          });
        }

        // 更新批次
        let remainingToSell = tx.shares;
        while (remainingToSell > 0 && batches.length > 0) {
          const oldest = batches[0];
          if (oldest.shares <= remainingToSell) {
            remainingToSell -= oldest.shares;
            batches.shift();
          } else {
            oldest.shares -= remainingToSell;
            remainingToSell = 0;
          }
        }
      }
    }
  }

  return result.sort((a, b) => new Date(b.date) - new Date(a.date));
}


// =============================================================================
// 編輯交易紀錄（重新計算持股）
// =============================================================================

export async function editTransaction(uid, txId, code, updatedData) {
  try {
    const { doc, updateDoc } = await import("firebase/firestore");
    await updateDoc(doc(db, "transactions", txId), {
      action: updatedData.action,
      shares: updatedData.shares,
      price: updatedData.price,
      date: updatedData.date,
      note: updatedData.note,
    });

    // 重新計算持股
    const remaining = await getTransactionsByCode(uid, code);
    const holding = await getHoldingByCode(uid, code);
    if (!holding) return;

    const result = calcFIFO(holding, remaining);
    await updateDoc(doc(db, "holdings", holding.id), {
      shares: result.shares,
      avg_cost: result.avg_cost,
    });
  } catch (err) {
    console.error("編輯交易紀錄失敗：", err);
    throw err;
  }
}

// =============================================================================
// 編輯建倉（T0）
// =============================================================================

export async function editQuickHolding(uid, holdingId, updatedData) {
  try {
    const { doc, updateDoc } = await import("firebase/firestore");
    await updateDoc(doc(db, "holdings", holdingId), {
      initial_shares: updatedData.shares,
      avg_cost: updatedData.avg_cost,
    });

    // 重新計算持股
    const holding = await getHoldingByCode(uid, null, holdingId);
    const allTx = holding
      ? await getTransactionsByCode(uid, holding.code)
      : [];

    if (holding) {
      const updatedHolding = {
        ...holding,
        initial_shares: updatedData.shares,
        avg_cost: updatedData.avg_cost,
      };
      const result = calcFIFO(updatedHolding, allTx);
      await updateDoc(doc(db, "holdings", holdingId), {
        shares: result.shares,
        avg_cost: result.avg_cost,
      });
    }
  } catch (err) {
    console.error("編輯建倉失敗：", err);
    throw err;
  }
}

// =============================================================================
// 輔助函式
// =============================================================================


async function getHoldingByCode(uid, code, holdingId = null) {
  if (holdingId) {
    const { doc, getDoc } = await import("firebase/firestore");
    const snapshot = await getDoc(doc(db, "holdings", holdingId));
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() };
  }
  const q = query(
    collection(db, "holdings"),
    where("user_id", "==", uid),
    where("code", "==", code)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
}

async function getTransactionsByCode(uid, code) {
  const q = query(
    collection(db, "transactions"),
    where("user_id", "==", uid),
    where("code", "==", code)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}