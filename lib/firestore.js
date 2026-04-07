// =============================================================================
// firestore.js
// =============================================================================
// Revision Change List:
// V01 - 初始版本，基本 CRUD 操作
// V02 - 修正 FIFO 計算，快速建倉加入 initial_shares 欄位
// V03 - 新增 has_quick_holding 欄位
// V04 - 修正 addQuickHolding 邏輯，新建倉為獨立 T0
// V05 - 新增 t0_avg_cost 欄位，獨立記錄建倉成本
// V06 - 新增帳戶（account）支援
//       FIFO 計算按帳戶分開
//       新增 fetchAccounts / addAccount / updateAccount / deleteAccount
// V07 - 新增 moveTransaction：將交易紀錄移到其他帳戶，重算兩邊 holding
//       新增 moveQuickHolding：將快速建倉移到其他帳戶，重算兩邊 holding
// V08 - 改動一：fetchAccounts，移除自動補預設帳戶
//       deleteAccount，移除預設帳戶不能刪除的限制
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
// 已實現損益計算
// =============================================================================

export function calcRealizedPnl(holdings, transactions, startDate, endDate) {
  const result = [];
  const codes = [...new Set(transactions.map((tx) => tx.code))];

  for (const code of codes) {
    const codeHoldings = holdings.filter((h) => h.code === code);
    const accounts = [...new Set(codeHoldings.map((h) => h.account || "預設帳戶"))];

    for (const account of accounts) {
      const holding = codeHoldings.find(
        (h) => (h.account || "預設帳戶") === account
      );
      if (!holding) continue;

      const allTx = transactions
        .filter(
          (tx) =>
            tx.code === code &&
            (tx.account || "預設帳戶") === account
        )
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      let batches = [];

      if (holding.has_quick_holding) {
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
            let totalCostForTx = 0;
            let tempBatches = batches.map((b) => ({ ...b }));

            while (remainingToSell > 0 && tempBatches.length > 0) {
              const oldest = tempBatches[0];
              if (oldest.shares <= remainingToSell) {
                pnl += (tx.price - oldest.cost) * oldest.shares;
                totalCostForTx += oldest.cost * oldest.shares;
                remainingToSell -= oldest.shares;
                tempBatches.shift();
              } else {
                pnl += (tx.price - oldest.cost) * remainingToSell;
                totalCostForTx += oldest.cost * remainingToSell;
                oldest.shares -= remainingToSell;
                remainingToSell = 0;
              }
            }

            const costPriceVal =
              tx.shares > 0 ? totalCostForTx / tx.shares : null;

            result.push({
              date: tx.date,
              code,
              name: tx.name,
              account: account,
              shares: tx.shares,
              sellPrice: tx.price,
              costPrice:
                costPriceVal !== null
                  ? Number(costPriceVal.toFixed(4))
                  : null,
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
  }

  return result.sort((a, b) => new Date(b.date) - new Date(a.date));
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
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      account: d.data().account || "預設帳戶",
    }));
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
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      account: d.data().account || "預設帳戶",
    }));
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
// 帳戶管理
// =============================================================================

export async function fetchAccounts(uid) {
  try {
    const q = query(
      collection(db, "accounts"),
      where("user_id", "==", uid)
    );
    const snapshot = await getDocs(q);
    const accounts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    return accounts;
  } catch (err) {
    console.error("讀取帳戶失敗：", err);
    throw err;
  }
}

export async function addAccount(uid, name) {
  try {
    if (!name || name.trim() === "") throw new Error("帳戶名稱不能為空");
    const docRef = await addDoc(collection(db, "accounts"), {
      user_id: uid,
      name: name.trim(),
      created_at: serverTimestamp(),
    });
    return { id: docRef.id, name: name.trim() };
  } catch (err) {
    console.error("新增帳戶失敗：", err);
    throw err;
  }
}

export async function updateAccount(accountId, name) {
  try {
    if (!name || name.trim() === "") throw new Error("帳戶名稱不能為空");
    await updateDoc(doc(db, "accounts", accountId), {
      name: name.trim(),
    });
  } catch (err) {
    console.error("更新帳戶失敗：", err);
    throw err;
  }
}

export async function deleteAccount(uid, accountId, accountName) {
  try {
    const q = query(
      collection(db, "holdings"),
      where("user_id", "==", uid),
      where("account", "==", accountName)
    );
    const snapshot = await getDocs(q);
    const activeHoldings = snapshot.docs.filter(
      (d) => (d.data().shares || 0) > 0
    );

    if (activeHoldings.length > 0) {
      throw new Error(
        `此帳戶還有 ${activeHoldings.length} 筆持股，請先賣出所有持股再刪除帳戶。`
      );
    }

    await deleteDoc(doc(db, "accounts", accountId));
  } catch (err) {
    console.error("刪除帳戶失敗：", err);
    throw err;
  }
}

// =============================================================================
// 新增持股（快速建倉）
// =============================================================================

export async function addQuickHolding(uid, formData) {
  const existing = await getHoldingByCodeAndAccount(
    uid,
    formData.code,
    formData.account
  );

  if (existing) {
    const allTx = await getTransactionsByCodeAndAccount(
      uid,
      formData.code,
      formData.account
    );

    const oldInitialShares = existing.initial_shares || 0;
    const oldT0AvgCost = existing.t0_avg_cost || 0;

    const newInitialShares = oldInitialShares + formData.shares;
    const newT0AvgCost =
      oldInitialShares > 0
        ? (oldInitialShares * oldT0AvgCost +
            formData.shares * formData.avg_cost) /
          newInitialShares
        : formData.avg_cost;

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
      account: formData.account,
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
    account: formData.account,
    action: formData.action,
    shares: formData.shares,
    price: formData.price,
    date: formData.date,
    note: formData.note,
    created_at: serverTimestamp(),
  });

  const existing = await getHoldingByCodeAndAccount(
    uid,
    formData.code,
    formData.account
  );
  const allTx = await getTransactionsByCodeAndAccount(
    uid,
    formData.code,
    formData.account
  );

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
      account: formData.account,
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

export async function deleteTransaction(uid, txId, code, account) {
  try {
    await deleteDoc(doc(db, "transactions", txId));

    const remaining = await getTransactionsByCodeAndAccount(uid, code, account);
    const holding = await getHoldingByCodeAndAccount(uid, code, account);
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
// 刪除持股
// =============================================================================

export async function deleteHolding(uid, holdingId) {
  try {
    await deleteDoc(doc(db, "holdings", holdingId));
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

    const allTx = await getTransactionsByCodeAndAccount(
      uid,
      holdingData.code,
      holdingData.account || "預設帳戶"
    );

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

export async function editTransaction(uid, txId, code, account, updatedData) {
  try {
    await updateDoc(doc(db, "transactions", txId), {
      action: updatedData.action,
      shares: updatedData.shares,
      price: updatedData.price,
      date: updatedData.date,
      note: updatedData.note,
    });

    await validateBuyQtyEnough(uid, code, account);

    const remaining = await getTransactionsByCodeAndAccount(uid, code, account);
    const holding = await getHoldingByCodeAndAccount(uid, code, account);
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

    const allTx = await getTransactionsByCodeAndAccount(
      uid,
      holdingData.code,
      holdingData.account || "預設帳戶"
    );

    await validateBuyQtyEnough(
      uid,
      holdingData.code,
      holdingData.account || "預設帳戶",
      holdingId,
      updatedData.shares
    );

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
// 移動交易紀錄到其他帳戶（重算舊帳戶與新帳戶兩邊的 holding）
// =============================================================================

export async function moveTransaction(uid, txId, code, oldAccount, newAccount) {
  try {
    if (oldAccount === newAccount) return;

    // 1. 更新交易紀錄的帳戶
    await updateDoc(doc(db, "transactions", txId), {
      account: newAccount,
    });

    // 2. 重算舊帳戶 holding
    const oldHolding = await getHoldingByCodeAndAccount(uid, code, oldAccount);
    if (oldHolding) {
      const oldTx = await getTransactionsByCodeAndAccount(uid, code, oldAccount);
      const oldResult = calcFIFO(oldHolding, oldTx);
      await updateDoc(doc(db, "holdings", oldHolding.id), {
        shares: oldResult.shares,
        avg_cost: oldResult.avg_cost,
      });
    }

    // 3. 重算新帳戶 holding（若不存在則新增）
    const newHolding = await getHoldingByCodeAndAccount(uid, code, newAccount);
    const newTx = await getTransactionsByCodeAndAccount(uid, code, newAccount);

    if (newHolding) {
      const newResult = calcFIFO(newHolding, newTx);
      await updateDoc(doc(db, "holdings", newHolding.id), {
        shares: newResult.shares,
        avg_cost: newResult.avg_cost,
        has_transaction_history: true,
      });
    } else {
      // 新帳戶沒有此股的 holding，建立一筆
      const buyTx = newTx.filter((tx) => tx.action === "買入");
      const firstPrice = buyTx.length > 0 ? buyTx[0].price : 0;
      const tempHolding = {
        has_quick_holding: false,
        initial_shares: 0,
        t0_avg_cost: 0,
      };
      const newResult = calcFIFO(tempHolding, newTx);
      // 從舊 holding 帶入 current_price
      const oldHoldingForPrice = await getHoldingByCodeAndAccount(uid, code, oldAccount);
      const inheritedPrice = oldHoldingForPrice?.current_price || 0;

      await addDoc(collection(db, "holdings"), {
        user_id: uid,
        code: code,
        name: newTx[0]?.name || "",
        account: newAccount,
        shares: newResult.shares,
        initial_shares: 0,
        t0_avg_cost: 0,
        avg_cost: newResult.avg_cost || firstPrice,
        current_price: inheritedPrice,  
        has_transaction_history: true,
        has_quick_holding: false,
        created_at: serverTimestamp(),
      });
    }
  } catch (err) {
    console.error("移動交易紀錄失敗：", err);
    throw err;
  }
}

// =============================================================================
// 移動快速建倉到其他帳戶（重算舊帳戶與新帳戶兩邊的 holding）
// =============================================================================

export async function moveQuickHolding(uid, holdingId, newAccount) {
  try {
    const holdingSnap = await getDoc(doc(db, "holdings", holdingId));
    if (!holdingSnap.exists()) throw new Error("持股不存在");
    const holdingData = { id: holdingSnap.id, ...holdingSnap.data() };
    const oldAccount = holdingData.account || "預設帳戶";
    const code = holdingData.code;

    if (oldAccount === newAccount) return;

    const initialShares = holdingData.initial_shares || 0;
    const t0AvgCost = holdingData.t0_avg_cost || 0;

    // 1. 舊帳戶：移除 T0，重算 holding
    const oldTx = await getTransactionsByCodeAndAccount(uid, code, oldAccount);
    const oldHoldingWithoutT0 = {
      ...holdingData,
      has_quick_holding: false,
      initial_shares: 0,
      t0_avg_cost: 0,
    };
    const oldResult = calcFIFO(oldHoldingWithoutT0, oldTx);
    await updateDoc(doc(db, "holdings", holdingId), {
      has_quick_holding: false,
      initial_shares: 0,
      t0_avg_cost: 0,
      shares: oldResult.shares,
      avg_cost: oldResult.avg_cost,
    });

    // 2. 新帳戶：加入 T0，重算 holding
    const newHolding = await getHoldingByCodeAndAccount(uid, code, newAccount);
    const newTx = await getTransactionsByCodeAndAccount(uid, code, newAccount);

    if (newHolding) {
      // 新帳戶已有此股：合併 T0
      const mergedInitialShares = (newHolding.initial_shares || 0) + initialShares;
      const mergedT0AvgCost =
        (newHolding.initial_shares || 0) > 0
          ? ((newHolding.initial_shares || 0) * (newHolding.t0_avg_cost || 0) +
              initialShares * t0AvgCost) /
            mergedInitialShares
          : t0AvgCost;

      const mergedHolding = {
        ...newHolding,
        has_quick_holding: true,
        initial_shares: mergedInitialShares,
        t0_avg_cost: Number(mergedT0AvgCost.toFixed(4)),
      };
      const newResult = calcFIFO(mergedHolding, newTx);
      await updateDoc(doc(db, "holdings", newHolding.id), {
        has_quick_holding: true,
        initial_shares: mergedInitialShares,
        t0_avg_cost: Number(mergedT0AvgCost.toFixed(4)),
        shares: newResult.shares,
        avg_cost: newResult.avg_cost,
      });
    } else {
      // 新帳戶沒有此股：建立一筆含 T0 的 holding
      const tempHolding = {
        has_quick_holding: true,
        initial_shares: initialShares,
        t0_avg_cost: t0AvgCost,
      };
      const newResult = calcFIFO(tempHolding, newTx);
      await addDoc(collection(db, "holdings"), {
        user_id: uid,
        code: code,
        name: holdingData.name,
        account: newAccount,
        shares: newResult.shares,
        initial_shares: initialShares,
        t0_avg_cost: t0AvgCost,
        avg_cost: newResult.avg_cost || t0AvgCost,
        current_price: holdingData.current_price || 0,
        has_transaction_history: false,
        has_quick_holding: true,
        created_at: serverTimestamp(),
      });
    }
  } catch (err) {
    console.error("移動快速建倉失敗：", err);
    throw err;
  }
}

// =============================================================================
// 驗證買入總量是否足夠
// =============================================================================

async function validateBuyQtyEnough(
  uid,
  code,
  account,
  holdingId = null,
  overrideInitialShares = null
) {
  const allTx = await getTransactionsByCodeAndAccount(uid, code, account);
  const holding = holdingId
    ? await getHoldingByCode(uid, null, holdingId)
    : await getHoldingByCodeAndAccount(uid, code, account);

  const initialShares =
    overrideInitialShares !== null
      ? overrideInitialShares
      : holding?.initial_shares || 0;

  const totalBuy =
    (holding?.has_quick_holding ? initialShares : 0) +
    allTx
      .filter((tx) => tx.action === "買入")
      .reduce((sum, tx) => sum + tx.shares, 0);

  const totalSell = allTx
    .filter((tx) => tx.action === "賣出")
    .reduce((sum, tx) => sum + tx.shares, 0);

  if (totalBuy < totalSell) {
    throw new Error(
      `買入總量（${totalBuy}股）不足以支應賣出總量（${totalSell}股），請確認交易紀錄是否正確。`
    );
  }
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

async function getHoldingByCodeAndAccount(uid, code, account) {
  const q = query(
    collection(db, "holdings"),
    where("user_id", "==", uid),
    where("code", "==", code),
    where("account", "==", account)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
}

async function getTransactionsByCodeAndAccount(uid, code, account) {
  const q = query(
    collection(db, "transactions"),
    where("user_id", "==", uid),
    where("code", "==", code),
    where("account", "==", account)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}
