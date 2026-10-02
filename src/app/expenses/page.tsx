"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Expense = {
  id: number;
  date: string | null;
  item: string;
  amount: number | null;
  major_category: string | null;
  category: string | null;
  payment_method: string | null;
  card_name: string | null;
  currency: string | null;
  expense_scope: string | null;
  notes: string | null;
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [message, setMessage] = useState("讀取中...");

  useEffect(() => {
    async function loadExpenses() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("尚未登入，登入後才能查看花費。");
        return;
      }

      const { data, error } = await supabase
        .from("Expenses")
        .select(
  "id,date,item,amount,major_category,category,payment_method,card_name,currency,expense_scope,notes"
)
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

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 20 }}>
      <h1>花費紀錄</h1>

      <p>
        <Link href="/expenses/new">＋ 新增花費</Link>
      </p>

      {message && <p>{message}</p>}

      {!message && expenses.length === 0 && <p>目前還沒有花費紀錄。</p>}

      {expenses.map((expense) => (
        <div
          key={expense.id}
          style={{
            border: "1px solid #ccc",
            padding: 16,
            marginBottom: 12,
            borderRadius: 8,
          }}
        >
          <h2>
  <Link href={`/expenses/${expense.id}`}>
    {expense.item}
  </Link>
</h2>

          <p>
            金額：{expense.currency || "USD"}{" "}
            {expense.amount ?? 0}
          </p>

          <p>日期：{expense.date || "未設定"}</p>

          {(expense.major_category || expense.category) && (
  <p>
    分類：
    {expense.major_category || "未分類"}
    {expense.category ? ` → ${expense.category}` : ""}
  </p>
)}

          {expense.payment_method && (
  <p>
  付款方式：
  {expense.payment_method === "cash"
    ? "現金"
    : expense.payment_method === "credit_card"
    ? "信用卡"
    : expense.payment_method === "debit_card"
    ? "簽帳金融卡"
    : expense.payment_method === "bank_transfer"
    ? "銀行轉帳"
    : expense.payment_method === "apple_pay"
    ? "Apple Pay"
    : expense.payment_method === "google_pay"
    ? "Google Pay"
    : expense.payment_method === "other"
    ? "其他"
    : expense.payment_method}
</p>
)}

{expense.payment_method === "credit_card" && (
  <p>信用卡：{expense.card_name || "-"}</p>
)}

          <p>
            類型：
            {expense.expense_scope === "travel"
              ? "旅遊花費"
              : "日常花費"}
          </p>

          {expense.notes && (
            <p>備註：{expense.notes}</p>
          )}
        </div>
      ))}
    </main>
  );
}
