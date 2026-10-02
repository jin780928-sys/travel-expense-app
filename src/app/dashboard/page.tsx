"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Expense = {
  id: number;
  date: string | null;
  amount: number | null;
  category: string | null;
  currency: string | null;
};

export default function DashboardPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [message, setMessage] = useState("讀取中...");

  useEffect(() => {
    async function loadExpenses() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("尚未登入，登入後才能查看統計。");
        return;
      }

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");

      const startDate = `${year}-${month}-01`;

      const nextMonth = new Date(year, now.getMonth() + 1, 1);
      const nextYear = nextMonth.getFullYear();
      const nextMonthText = String(nextMonth.getMonth() + 1).padStart(2, "0");
      const endDate = `${nextYear}-${nextMonthText}-01`;

      const { data, error } = await supabase
        .from("Expenses")
        .select("id,date,amount,category,currency")
        .eq("expense_scope", "daily")
        .gte("date", startDate)
        .lt("date", endDate)
        .order("date", { ascending: false });

      if (error) {
        setMessage("讀取失敗：" + error.message);
        return;
      }

      setExpenses(data ?? []);
      setMessage("");
    }

    loadExpenses();
  }, []);

  const totalsByCurrency = useMemo(() => {
    return expenses.reduce<Record<string, number>>((totals, expense) => {
      const currency = expense.currency || "USD";
      const amount = Number(expense.amount || 0);

      totals[currency] = (totals[currency] || 0) + amount;

      return totals;
    }, {});
  }, [expenses]);

  const totalsByCategory = useMemo(() => {
    return expenses.reduce<Record<string, Record<string, number>>>(
      (totals, expense) => {
        const category = expense.category || "未分類";
        const currency = expense.currency || "USD";
        const amount = Number(expense.amount || 0);

        if (!totals[category]) {
          totals[category] = {};
        }

        totals[category][currency] =
          (totals[category][currency] || 0) + amount;

        return totals;
      },
      {}
    );
  }, [expenses]);

  return (
    <main
      style={{
        maxWidth: 800,
        margin: "40px auto",
        padding: 20,
      }}
    >
      <h1>日常花費統計</h1>

      <p>本月日常花費</p>

      {message && <p>{message}</p>}

      {!message && (
        <>
          <h2>本月總花費</h2>

          {Object.keys(totalsByCurrency).length === 0 ? (
            <p>本月目前沒有日常花費。</p>
          ) : (
            Object.entries(totalsByCurrency).map(
              ([currency, total]) => (
                <p key={currency}>
                  {currency} {total.toFixed(2)}
                </p>
              )
            )
          )}

          <hr style={{ margin: "30px 0" }} />

          <h2>依分類統計</h2>

          {Object.keys(totalsByCategory).length === 0 ? (
            <p>目前沒有分類資料。</p>
          ) : (
            Object.entries(totalsByCategory).map(
              ([category, currencies]) => (
                <div
                  key={category}
                  style={{
                    border: "1px solid #ccc",
                    borderRadius: 8,
                    padding: 14,
                    marginBottom: 12,
                  }}
                >
                  <strong>{category}</strong>

                  {Object.entries(currencies).map(
                    ([currency, total]) => (
                      <p key={currency}>
                        {currency} {total.toFixed(2)}
                      </p>
                    )
                  )}
                </div>
              )
            )
          )}
        </>
      )}
    </main>
  );
}
