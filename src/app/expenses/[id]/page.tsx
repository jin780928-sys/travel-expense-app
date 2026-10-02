"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

type Expense = {
  id: number;
  date: string | null;
  item: string;
  amount: number | null;
  major_category: string | null;
  category: string | null;
  payment_method: string | null;
  currency: string | null;
  expense_scope: string | null;
  trip_id: number | null;
  paid_by: number | null;
  split_type: string | null;
  notes: string | null;
};

type Split = {
  id: number;
  person_id: number;
  share_amount: number | null;
  person_name: string;
};

export default function ExpenseDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();

  const [expense, setExpense] = useState<Expense | null>(null);
  const [tripName, setTripName] = useState("");
  const [payerName, setPayerName] = useState("");
  const [splits, setSplits] = useState<Split[]>([]);
  const [message, setMessage] = useState("讀取中...");

  useEffect(() => {
    async function loadExpense() {
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
  "id,date,item,amount,major_category,category,payment_method,currency,expense_scope,trip_id,paid_by,split_type,notes"
)
        .eq("id", id)
        .single();

      if (error) {
        setMessage("讀取花費失敗：" + error.message);
        return;
      }

      setExpense(data);

      if (data.trip_id) {
        const { data: tripData } = await supabase
          .from("Trips")
          .select("name")
          .eq("id", data.trip_id)
          .single();

        if (tripData) {
          setTripName(tripData.name);
        }
      }

      if (data.paid_by) {
        const { data: payerData } = await supabase
          .from("People")
          .select("name")
          .eq("id", data.paid_by)
          .single();

        if (payerData) {
          setPayerName(payerData.name);
        }
      }

      const { data: splitData, error: splitError } = await supabase
        .from("ExpenseSplits")
        .select("id,person_id,share_amount")
        .eq("expense_id", id);

      if (splitError) {
        setMessage("讀取分攤資料失敗：" + splitError.message);
        return;
      }

      const splitList: Split[] = [];

      for (const split of splitData ?? []) {
        const { data: personData } = await supabase
          .from("People")
          .select("name")
          .eq("id", split.person_id)
          .single();

        splitList.push({
          id: split.id,
          person_id: split.person_id,
          share_amount: split.share_amount,
          person_name: personData?.name || "未命名",
        });
      }

      setSplits(splitList);
      setMessage("");
    }

    if (id) {
      loadExpense();
    }
  }, [id]);

  async function handleDelete() {
  const confirmed = window.confirm("確定要刪除這筆花費嗎？");

  if (!confirmed) return;

  const { error: splitError } = await supabase
    .from("ExpenseSplits")
    .delete()
    .eq("expense_id", id);

  if (splitError) {
    setMessage("刪除分攤資料失敗：" + splitError.message);
    return;
  }

  const { error } = await supabase
    .from("Expenses")
    .delete()
    .eq("id", id);

  if (error) {
    setMessage("刪除花費失敗：" + error.message);
    return;
  }

  router.push("/expenses");
}

  return (
    <main
      style={{
        maxWidth: 800,
        margin: "40px auto",
        padding: 20,
      }}
    >
      <p>
        <Link href="/expenses">← 回到花費紀錄</Link>
      </p>

      {message && <p>{message}</p>}

      {expense && (
        <>
          <h1>{expense.item}</h1>

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
            <p>付款方式：{expense.payment_method}</p>
          )}

          <p>
            類型：
            {expense.expense_scope === "travel"
              ? "旅遊花費"
              : "日常花費"}
          </p>

          <p>
            所屬旅程：{tripName || "無"}
          </p>

          <p>
            付款人：{payerName || "未指定"}
          </p>

          <p>
            分攤方式：
            {expense.split_type === "custom"
              ? "自訂金額"
              : "平均分攤"}
          </p>

          {expense.notes && (
            <p>備註：{expense.notes}</p>
          )}
          <p style={{ marginTop: 20 }}>
  <Link href={`/expenses/${id}/edit`}>
    ✏️ 編輯這筆花費
  </Link>
</p>
          <button
  onClick={handleDelete}
  style={{
    padding: "10px 16px",
    marginTop: 16,
  }}
>
  刪除這筆花費
</button>
          

          <hr style={{ margin: "30px 0" }} />

          <h2>分攤明細</h2>

          {splits.length === 0 ? (
            <p>沒有分攤資料。</p>
          ) : (
            splits.map((split) => (
              <div
                key={split.id}
                style={{
                  border: "1px solid #ccc",
                  padding: 12,
                  marginBottom: 10,
                  borderRadius: 8,
                }}
              >
                <strong>{split.person_name}</strong>

                <p>
                  分攤金額：{expense.currency || "USD"}{" "}
                  {Number(split.share_amount || 0).toFixed(2)}
                </p>
              </div>
            ))
          )}
        </>
      )}
    </main>
  );
}
