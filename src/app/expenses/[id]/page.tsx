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
  card_name: string | null;
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
// =========================================
// 金融卡 / 電子支付工具名稱
// =========================================

const [
  paymentToolName,
  setPaymentToolName,
] = useState("");
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
  .select(`
    id,
    date,
    item,
    amount,
    major_category,
    category,
    payment_method,
    card_name,
    currency,
    expense_scope,
    trip_id,
    notes,
    paid_by,
    split_type
  `)
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

  // =========================================
// 讀取實際付款工具名稱
// =========================================

useEffect(() => {
  let active = true;

  async function loadPaymentTool() {
    setPaymentToolName("");

    if (!expense?.payment_method_id) {
      return;
    }

    const { data, error } = await supabase
      .from("PaymentMethods")
      .select("name")
      .eq("id", expense.payment_method_id)
      .eq("user_id", expense.user_id)
      .maybeSingle();

    if (error) {
      console.error(
        "讀取付款工具名稱失敗:",
        error
      );
      return;
    }

    if (active) {
      setPaymentToolName(data?.name || "");
    }
  }

  void loadPaymentTool();

  return () => {
    active = false;
  };
}, [
  expense?.payment_method_id,
  expense?.user_id,
]);
  
  return (
    <main
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: 20,
        minHeight: "100vh",
        boxSizing: "border-box",
        width: "100%",
        }}
    >
      <p>
        <Link href="/expenses">← 回到花費紀錄</Link>
      </p>

      {message && <p>{message}</p>}

      {expense && (
        <>
          <div
  style={{
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 18,
    marginTop: 16,
    marginBottom: 18,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  }}
>
  <div
    style={{
      fontSize: 24,
      fontWeight: 700,
      color: "#111827",
      lineHeight: 1.25,
      marginBottom: 10,
      wordBreak: "break-word",
    }}
  >
    {expense.item}
  </div>

  <div
    style={{
      fontSize: 20,
      fontWeight: 700,
      color: "#111827",
      lineHeight: 1.3,
    }}
  >
    {expense.currency} {Number(expense.amount).toFixed(2)}
  </div>
</div>

         <div
  style={{
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  }}
>
  <div
    style={{
      display: "grid",
      gap: 12,
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <span style={{ color: "#6b7280", fontSize: 14 }}>日期</span>
      <span style={{ color: "#111827", fontSize: 14, fontWeight: 600 }}>
        {expense.date || "未設定"}
      </span>
    </div>

    {(expense.major_category || expense.category) && (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <span style={{ color: "#6b7280", fontSize: 14 }}>分類</span>
        <span
          style={{
            color: "#111827",
            fontSize: 14,
            fontWeight: 600,
            textAlign: "right",
          }}
        >
          {expense.major_category || "未分類"}
          {expense.category ? ` → ${expense.category}` : ""}
        </span>
      </div>
    )}

    
{/* =========================================
    付款方式顯示
    信用卡 / 金融卡 / Apple Pay / Google Pay
   ========================================= */}

{expense.payment_method && (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      gap: 16,
      flexWrap: "wrap",
    }}
  >
    <span
      style={{
        color: "#6b7280",
        fontSize: 14,
      }}
    >
      付款方式
    </span>

    <span
      style={{
        color: "#111827",
        fontSize: 14,
        fontWeight: 600,
        textAlign: "right",
      }}
    >
      {(() => {
        const method = expense.payment_method;

        const methodLabel =
          method === "cash" || method === "現金"
            ? "現金"
            : method === "credit_card" ||
              method === "信用卡"
            ? "信用卡"
            : method === "debit_card" ||
              method === "Debit Card" ||
              method === "金融卡"
            ? "金融卡"
            : method === "bank_transfer" ||
              method === "轉帳"
            ? "銀行轉帳"
            : method === "apple_pay" ||
              method === "Apple Pay"
            ? "Apple Pay"
            : method === "google_pay" ||
              method === "Google Pay"
            ? "Google Pay"
            : method === "other" ||
              method === "其他"
            ? "其他"
            : method;

        return (
          <>
            {methodLabel}

            {expense.card_name && (
              <span
                style={{
                  marginLeft: 6,
                  color: "#4f46e5",
                }}
              >
                · {expense.card_name}
              </span>
            )}
          </>
        );
      })()}
    </span>
  </div>
)}


    {expense.payment_method === "credit_card" && (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <span style={{ color: "#6b7280", fontSize: 14 }}>信用卡</span>
        <span style={{ color: "#111827", fontSize: 14, fontWeight: 600 }}>
          {expense.card_name || "-"}
        </span>
      </div>
    )}

    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <span style={{ color: "#6b7280", fontSize: 14 }}>類型</span>
      <span style={{ color: "#111827", fontSize: 14, fontWeight: 600 }}>
        {expense.expense_scope === "travel"
          ? "旅遊花費"
          : "日常花費"}
      </span>
    </div>

    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <span style={{ color: "#6b7280", fontSize: 14 }}>所屬旅程</span>
      <span style={{ color: "#111827", fontSize: 14, fontWeight: 600 }}>
        {tripName || "無"}
      </span>
    </div>

    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <span style={{ color: "#6b7280", fontSize: 14 }}>付款人</span>
      <span style={{ color: "#111827", fontSize: 14, fontWeight: 600 }}>
        {payerName || "未指定"}
      </span>
    </div>

    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <span style={{ color: "#6b7280", fontSize: 14 }}>分攤方式</span>
      <span style={{ color: "#111827", fontSize: 14, fontWeight: 600 }}>
        {expense.split_type === "custom"
          ? "自訂金額"
          : "平均分攤"}
      </span>
    </div>

    {expense.notes && (
      <div
        style={{
          paddingTop: 12,
          borderTop: "1px solid #e5e7eb",
        }}
      >
        <div
          style={{
            color: "#6b7280",
            fontSize: 14,
            marginBottom: 6,
          }}
        >
          備註
        </div>

        <div
          style={{
            color: "#111827",
            fontSize: 14,
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {expense.notes}
        </div>
      </div>
    )}
  </div>
</div>
          
          <div
  style={{
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 20,
    marginBottom: 24,
  }}
>
            <Link
    href={`/expenses/${id}/edit`}
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      height: 40,
      padding: "0 14px",
      background: "#ffffff",
      color: "#374151",
      border: "1px solid #d1d5db",
      borderRadius: 10,
      textDecoration: "none",
      fontWeight: 600,
      fontSize: 14,
      whiteSpace: "nowrap",
    }}
  >
              📝 編輯這筆花費
  </Link>

  <button
    type="button"
    onClick={handleDelete}
    style={{
      height: 40,
      padding: "0 14px",
      background: "#fef2f2",
      color: "#b91c1c",
      border: "1px solid #fecaca",
      borderRadius: 10,
      cursor: "pointer",
      fontWeight: 600,
      fontSize: 14,
      whiteSpace: "nowrap",
    }}
  >
    刪除這筆花費
  </button>
</div>
          

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
