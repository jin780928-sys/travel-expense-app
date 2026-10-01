"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Trip = {
  id: number;
  name: string;
};

type Person = {
  id: number;
  name: string;
};

export default function NewExpensePage() {
  const [date, setDate] = useState("");
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [expenseScope, setExpenseScope] = useState("daily");
  const [tripId, setTripId] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [splitType, setSplitType] = useState("equal");
  const [notes, setNotes] = useState("");

  const [trips, setTrips] = useState<Trip[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadOptions() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: tripData } = await supabase
        .from("Trips")
        .select("id,name")
        .order("start_date");

      const { data: peopleData } = await supabase
        .from("People")
        .select("id,name")
        .order("name");

      setTrips(tripData ?? []);
      setPeople(peopleData ?? []);
    }

    loadOptions();
  }, []);

  async function handleSubmit() {
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("尚未登入，登入後才能儲存花費。");
      return;
    }

    const { error } = await supabase.from("Expenses").insert({
      date: date || null,
      item,
      amount: amount ? Number(amount) : null,
      category,
      payment_method: paymentMethod,
      currency,
      expense_scope: expenseScope,
      trip_id: tripId ? Number(tripId) : null,
      paid_by: paidBy ? Number(paidBy) : null,
      split_type: splitType,
      notes,
      user_id: user.id,
    });

    if (error) {
      setMessage("新增失敗：" + error.message);
      return;
    }

    setMessage("花費新增成功！");
  }

  return (
    <main style={{ maxWidth: 650, margin: "40px auto", padding: 20 }}>
      <h1>新增花費</h1>

      <label>日期</label>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 12 }}
      />

      <input
        placeholder="消費項目"
        value={item}
        onChange={(e) => setItem(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 12 }}
      />

      <input
        type="number"
        step="0.01"
        placeholder="金額"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 12 }}
      />

      <input
        placeholder="分類，例如：餐飲、交通、住宿"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 12 }}
      />

      <input
        placeholder="付款方式，例如：信用卡、現金"
        value={paymentMethod}
        onChange={(e) => setPaymentMethod(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 12 }}
      />

      <label>幣別</label>
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 12 }}
      >
        <option value="USD">USD</option>
        <option value="TWD">TWD</option>
        <option value="JPY">JPY</option>
        <option value="EUR">EUR</option>
        <option value="PEN">PEN</option>
      </select>

      <label>花費類型</label>
      <select
        value={expenseScope}
        onChange={(e) => setExpenseScope(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 12 }}
      >
        <option value="daily">日常花費</option>
        <option value="travel">旅遊花費</option>
      </select>

      <label>旅程</label>
      <select
        value={tripId}
        onChange={(e) => setTripId(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 12 }}
      >
        <option value="">不指定旅程</option>
        {trips.map((trip) => (
          <option key={trip.id} value={trip.id}>
            {trip.name}
          </option>
        ))}
      </select>

      <label>付款人</label>
      <select
        value={paidBy}
        onChange={(e) => setPaidBy(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 12 }}
      >
        <option value="">尚未指定</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.name}
          </option>
        ))}
      </select>

      <label>分攤方式</label>
      <select
        value={splitType}
        onChange={(e) => setSplitType(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 12 }}
      >
        <option value="equal">平均分攤</option>
        <option value="custom">自訂金額</option>
      </select>

      <textarea
        placeholder="備註"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 12 }}
      />

      <button onClick={handleSubmit} style={{ padding: "12px 20px" }}>
        儲存花費
      </button>

      {message && <p style={{ marginTop: 20 }}>{message}</p>}
    </main>
  );
}
