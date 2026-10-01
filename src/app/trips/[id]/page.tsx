"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

type Trip = {
  id: number;
  name: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
};

type Expense = {
  id: number;
  date: string | null;
  item: string;
  amount: number | null;
  currency: string | null;
  category: string | null;
};

export default function TripDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [message, setMessage] = useState("讀取中...");
  const totalAmount = expenses.reduce(
  (sum, expense) => sum + Number(expense.amount || 0),
  0
);

  useEffect(() => {
    async function loadTrip() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("尚未登入，登入後才能查看旅程。");
        return;
      }

      const { data, error } = await supabase
        .from("Trips")
        .select("id,name,location,start_date,end_date,notes")
        .eq("id", id)
        .single();
      const { data: expenseData, error: expenseError } = await supabase
  .from("Expenses")
  .select("id,date,item,amount,currency,category")
  .eq("trip_id", id)
  .order("date", { ascending: false });
      

      if (error) {
  setMessage("讀取旅程失敗：" + error.message);
  return;
}

if (expenseError) {
  setMessage("讀取花費失敗：" + expenseError.message);
  return;
}

setTrip(data);
setExpenses(expenseData ?? []);
setMessage("");
    }

    if (id) {
      loadTrip();
    }
  }, [id]);

  return (
    <main style={{ maxWidth: 800, margin: "40px auto", padding: 20 }}>
      <p>
        <Link href="/trips">← 回到我的旅程</Link>
      </p>

      {message && <p>{message}</p>}

      {trip && (
        <>
          <h1>{trip.name}</h1>

          {trip.location && <p>地點：{trip.location}</p>}

          <p>
            日期：{trip.start_date || "未設定"}
            {" ～ "}
            {trip.end_date || "未設定"}
          </p>

          {trip.notes && <p>備註：{trip.notes}</p>}

          <p style={{ marginTop: 20 }}>
  <Link href={`/trips/${id}/edit`}>
    ✏️ 編輯旅程
  </Link>
</p>
          

          <p style={{ marginTop: 30 }}>
            <Link href={`/expenses/new?trip_id=${trip.id}`}>
              ＋ 新增這趟旅程的花費
            </Link>
          </p>
          <hr style={{ margin: "30px 0" }} />

<h2>這趟旅程的花費</h2>
<p>
  總花費：{totalAmount.toFixed(2)}
</p>
{expenses.length === 0 ? (
  <p>目前還沒有花費紀錄。</p>
) : (
  expenses.map((expense) => (
    <div
      key={expense.id}
      style={{
        border: "1px solid #ccc",
        padding: 14,
        borderRadius: 8,
        marginBottom: 10,
      }}
    >
      <strong>{expense.item}</strong>

      <p>
        金額：{expense.currency || "USD"} {expense.amount ?? 0}
      </p>

      <p>日期：{expense.date || "未設定"}</p>

      {expense.category && (
        <p>分類：{expense.category}</p>
      )}
    </div>
  ))
)}
        </>
      )}
    </main>
  );
}
