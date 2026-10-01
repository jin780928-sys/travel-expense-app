"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

export default function EditExpensePage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("讀取中...");

  useEffect(() => {
    async function loadExpense() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("尚未登入，登入後才能編輯花費。");
        return;
      }

      const { data, error } = await supabase
        .from("Expenses")
        .select(
          "item,amount,date,category,payment_method,currency,notes"
        )
        .eq("id", id)
        .single();

      if (error) {
        setMessage("讀取失敗：" + error.message);
        return;
      }

      setItem(data.item || "");
      setAmount(data.amount?.toString() || "");
      setDate(data.date || "");
      setCategory(data.category || "");
      setPaymentMethod(data.payment_method || "");
      setCurrency(data.currency || "USD");
      setNotes(data.notes || "");
      setMessage("");
    }

    if (id) {
      loadExpense();
    }
  }, [id]);

  async function handleSave() {
    setMessage("");

    const { error } = await supabase
      .from("Expenses")
      .update({
        item: item.trim(),
        amount: amount ? Number(amount) : null,
        date: date || null,
        category: category.trim() || null,
        payment_method: paymentMethod.trim() || null,
        currency,
        notes: notes.trim() || null,
      })
      .eq("id", id);

    if (error) {
      setMessage("儲存失敗：" + error.message);
      return;
    }

    router.push(`/expenses/${id}`);
  }

  return (
    <main
      style={{
        maxWidth: 650,
        margin: "40px auto",
        padding: 20,
      }}
    >
      <h1>編輯花費</h1>

      {message && <p>{message}</p>}

      {!message && (
        <>
          <input
            placeholder="消費項目"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              marginBottom: 12,
            }}
          />

          <input
            type="number"
            step="0.01"
            placeholder="金額"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              marginBottom: 12,
            }}
          />

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              marginBottom: 12,
            }}
          />

          <input
            placeholder="分類"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              marginBottom: 12,
            }}
          />

          <input
            placeholder="付款方式"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              marginBottom: 12,
            }}
          />

          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              marginBottom: 12,
            }}
          >
            <option value="USD">USD</option>
            <option value="TWD">TWD</option>
            <option value="JPY">JPY</option>
            <option value="EUR">EUR</option>
            <option value="PEN">PEN</option>
          </select>

          <textarea
            placeholder="備註"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              marginBottom: 12,
            }}
          />

          <button
            onClick={handleSave}
            style={{ padding: "12px 20px" }}
          >
            儲存修改
          </button>
        </>
      )}
    </main>
  );
}
