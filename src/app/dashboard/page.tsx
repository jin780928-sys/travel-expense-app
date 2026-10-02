"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Expense = {
  id: number;
  date: string | null;
  item: string;
  amount: number | null;
  major_category: string | null;
  category: string | null;
  currency: string | null;
};

export default function DashboardPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [message, setMessage] = useState("讀取中...");

  const now = new Date();

const [selectedYear, setSelectedYear] = useState(
  now.getFullYear()
);

const [selectedMonth, setSelectedMonth] = useState(
  now.getMonth() + 1
);

  useEffect(() => {
    async function loadExpenses() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("尚未登入，登入後才能查看統計。");
        return;
      }

      const month = String(selectedMonth).padStart(2, "0");

const startDate = `${selectedYear}-${month}-01`;

const nextMonthDate = new Date(
  selectedYear,
  selectedMonth,
  1
);

const nextYear = nextMonthDate.getFullYear();

const nextMonthText = String(
  nextMonthDate.getMonth() + 1
).padStart(2, "0");

const endDate = `${nextYear}-${nextMonthText}-01`;

      const { data, error } = await supabase
        .from("Expenses")
        .select(
  "id,date,item,amount,major_category,category,currency"
)
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
  }, [selectedYear, selectedMonth]);

  const totalsByCurrency = useMemo(() => {
    return expenses.reduce<Record<string, number>>(
      (totals, expense) => {
        const currency = expense.currency || "USD";
        const amount = Number(expense.amount || 0);

        totals[currency] =
          (totals[currency] || 0) + amount;

        return totals;
      },
      {}
    );
  }, [expenses]);

  const totalsByCategory = useMemo(() => {
    return expenses.reduce<
      Record<
        string,
        Record<string, Record<string, number>>
      >
    >((totals, expense) => {
      const majorCategory =
        expense.major_category || "未分類";

      const category =
        expense.category || "未分類";

      const currency =
        expense.currency || "USD";

      const amount =
        Number(expense.amount || 0);

      if (!totals[majorCategory]) {
        totals[majorCategory] = {};
      }

      if (!totals[majorCategory][category]) {
        totals[majorCategory][category] = {};
      }

      totals[majorCategory][category][currency] =
        (totals[majorCategory][category][currency] || 0) +
        amount;

      return totals;
    }, {});
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

      <div
  style={{
    display: "flex",
    gap: 12,
    marginBottom: 20,
  }}
>
  <select
    value={selectedYear}
    onChange={(e) => setSelectedYear(Number(e.target.value))}
    style={{
      padding: 10,
    }}
  >
    {[2025, 2026, 2027, 2028, 2029, 2030].map((year) => (
      <option key={year} value={year}>
        {year} 年
      </option>
    ))}
  </select>

  <select
    value={selectedMonth}
    onChange={(e) => setSelectedMonth(Number(e.target.value))}
    style={{
      padding: 10,
    }}
  >
    {Array.from({ length: 12 }, (_, index) => index + 1).map(
      (month) => (
        <option key={month} value={month}>
          {month} 月
        </option>
      )
    )}
  </select>
</div>

<p>
  {selectedYear} 年 {selectedMonth} 月日常花費
</p>

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
              ([majorCategory, subCategories]) => (
                <div
                  key={majorCategory}
                  style={{
                    border: "1px solid #ccc",
                    borderRadius: 8,
                    padding: 14,
                    marginBottom: 16,
                  }}
                >
                  <h3>{majorCategory}</h3>

                  {Object.entries(subCategories).map(
                    ([category, currencies]) => (
                      <div
                        key={category}
                        style={{
                          marginLeft: 16,
                          marginBottom: 12,
                        }}
                      >
                        <strong>{category}</strong>

                        {Object.entries(currencies).map(
                          ([currency, total]) => (
                            <p
                              key={currency}
                              style={{ marginLeft: 16 }}
                            >
                              {currency}{" "}
                              {total.toFixed(2)}
                            </p>
                          )
                        )}

                        <hr style={{ margin: "30px 0" }} />

<h2>本月花費明細</h2>

{expenses.length === 0 ? (
  <p>這個月份目前沒有花費紀錄。</p>
) : (
  expenses.map((expense) => (
    <div
      key={expense.id}
      style={{
        border: "1px solid #ccc",
        borderRadius: 8,
        padding: 14,
        marginBottom: 12,
      }}
    >
      <strong>{expense.item}</strong>

      <p>日期：{expense.date || "未設定"}</p>

      <p>
        分類：
        {expense.major_category || "未分類"}
        {expense.category ? ` → ${expense.category}` : ""}
      </p>

      <p>
        金額：{expense.currency || "USD"}{" "}
        {Number(expense.amount || 0).toFixed(2)}
      </p>
    </div>
  ))
)}
                      </div>
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
