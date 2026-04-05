// =============================================================================
// firestore.js
// =============================================================================
// Revision Change List:
// V01 - 初始版本，基本 CRUD 操作
// V02 - 修正 FIFO 計算，快速建倉加入 initial_shares 欄位
// V03 - 新增 has_quick_holding 欄位
// V04 - 修正 addQuickHolding 邏輯，新建倉為獨立 T0
// V05 - 新增 t0_avg_cost 欄位，獨立記錄建倉成本
//       避免 avg_cost 被 FIFO 影響後，再次建倉計算錯誤
// =============================================================================

import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
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

export function calcFIFO(holding, transactions) {
  let batches = [];
  let realizedPnl = 0;

  // T0 快速建倉：使用 t0_avg_cost 作為成本（獨立於整體 avg_cost）
  if (holding.has_quick_holding) {
    const t0Shares = holding.initial_shares || 0;
    const t0Cost = holding.t0_avg_cost || holding.avg_cost || 0;
    if (t0Shares > 0) {
      batches.push({ shares: t0Shares, cost: t0Cost });
    }
  }

  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

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
// 新增持股（快速建倉）
// =============================================================================

export async function addQuickHolding(uid, formData) {
  const existing = await getHoldingByCode(uid, formData.code);

  if (existing) {
    const allTx = await getTransactionsByCode(uid, formData.code);

    // 用 t0_avg_cost 計算合併後的 T0 成本（獨立於 avg_cost）
    const oldInitialShares = existing.initial_shares || 0;
    const oldT0AvgCost = existing.t0_avg_cost || 0;

    const newInitialShares = oldInitialShares + formData.shares;
    const newT0AvgCost =
      oldInitialShares > 0
        ? (oldInitialShares * oldT0AvgCost +
            formData.shares * formData.avg_cost) /
          newInitialShares
        : formData.avg_cost;

    // 用新的 T0 重新跑 FIFO
    const updatedHolding = {
      ...existing,
      has_quick_holding: true,
      initial_shares: newInitialShares,
      t0_avg_cost: Number(newT0AvgCost.toFixed(4)),
    };
    const fifoResult = calcFIFO(updatedHolding, allTx);

    await updateDoc(doc(db, "holdings", existing.id), {
      shares: fifoResult.shares,
      avg_cost: fifoResult.avg_cost,
      initial_shares: newInitialShares,
      t0_avg_cost: Number(newT0AvgCost.toFixed(4)),
      has_quick_holding: true,
    });
  } else {
    await addDoc(collection(db, "holdings"), {
      user_id: uid,
      code: formData.code,
      name: formData.name,
      shares: formData.shares,
      initial_shares: formData.shares,
      t0_avg_cost: formData.avg_cost,
      avg_cost: formData.avg_cost,
      current_price: 0,
      has_transaction_history: false,
      has_quick_holding: true,
      created_at: serverTimestamp(),
    });
  }
}

// =============================================================================
// 新增交易紀錄
// =============================================================================

export async function addTransaction(uid, formData) {
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

  const existing = await getHoldingByCode(uid, formData.code);
  const allTx = await getTransactionsByCode(uid, formData.code);

  if (existing) {
    const result = calcFIFO(existing, allTx);
    await updateDoc(doc(db, "holdings", existing.id), {
      shares: result.shares,
      avg_cost: result.avg_cost,
      has_transaction_history: true,
    });
  } else if (formData.action === "買入") {
    await addDoc(collection(db, "holdings"), {
      user_id: uid,
      code: formData.code,
      name: formData.name,
      shares: formData.shares,
      initial_shares: 0,
      t0_avg_cost: 0,
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
// 刪除建倉（T0），重新用交易紀錄計算 shares
// =============================================================================

export async function deleteQuickHolding(uid, holdingId) {
  try {
    const holdingSnap = await getDoc(doc(db, "holdings", holdingId));
    if (!holdingSnap.exists()) throw new Error("持股不存在");
    const holdingData = { id: holdingSnap.id, ...holdingSnap.data() };

    const updatedHolding = {
      ...holdingData,
      has_quick_holding: false,
      initial_shares: 0,
      t0_avg_cost: 0,
    };

    const allTx = await getTransactionsByCode(uid, holdingData.code);

    if (allTx.length === 0) {
      await updateDoc(doc(db, "holdings", holdingId), {
        has_quick_holding: false,
        initial_shares: 0,
        t0_avg_cost: 0,
        shares: 0,
        avg_cost: 0,
      });
    } else {
      const result = calcFIFO(updatedHolding, allTx);
      await updateDoc(doc(db, "holdings", holdingId), {
        has_quick_holding: false,
        initial_shares: 0,
        t0_avg_cost: 0,
        shares: result.shares,
        avg_cost: result.avg_cost,
      });
    }
  } catch (err) {
    console.error("刪除建倉失敗：", err);
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
// 編輯交易紀錄（重新計算持股）
// =============================================================================

export async function editTransaction(uid, txId, code, updatedData) {
  try {
    await updateDoc(doc(db, "transactions", txId), {
      action: updatedData.action,
      shares: updatedData.shares,
      price: updatedData.price,
      date: updatedData.date,
      note: updatedData.note,
    });

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
    const holdingSnap = await getDoc(doc(db, "holdings", holdingId));
    if (!holdingSnap.exists()) throw new Error("持股不存在");
    const holdingData = { id: holdingSnap.id, ...holdingSnap.data() };

    const updatedHolding = {
      ...holdingData,
      initial_shares: updatedData.shares,
      t0_avg_cost: updatedData.avg_cost,
    };

    const allTx = await getTransactionsByCode(uid, holdingData.code);
    const result = calcFIFO(updatedHolding, allTx);

    await updateDoc(doc(db, "holdings", holdingId), {
      initial_shares: updatedData.shares,
      t0_avg_cost: updatedData.avg_cost,
      avg_cost: result.avg_cost,
      shares: result.shares,
    });
  } catch (err) {
    console.error("編輯建倉失敗：", err);
    throw err;
  }
}

// =============================================================================
// 已實現損益計算
// =============================================================================

export function calcRealizedPnl(holdings, transactions, startDate, endDate) {
  const result = [];
  const codes = [...new Set(transactions.map((tx) => tx.code))];

  for (const code of codes) {
    const holding = holdings.find((h) => h.code === code);
    const allTx = transactions
      .filter((tx) => tx.code === code)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    let batches = [];

    // 使用 t0_avg_cost 作為 T0 成本
    if (holding && holding.has_quick_holding) {
      const t0Shares = holding.initial_shares || 0;
      const t0Cost = holding.t0_avg_cost || holding.avg_cost || 0;
      if (t0Shares > 0) {
        batches.push({ shares: t0Shares, cost: t0Cost });
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
// 輔助函式
// =============================================================================

async function getHoldingByCode(uid, code, holdingId = null) {
  if (holdingId) {
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