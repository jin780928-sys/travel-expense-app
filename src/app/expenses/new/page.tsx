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
  const [majorCategory, setMajorCategory] = useState("");
  const [category, setCategory] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [expenseScope, setExpenseScope] = useState("daily");
  const [tripId, setTripId] = useState("");
  const categoryOptions: Record<string, string[]> = {
  餐飲: [
    "早餐",
    "午餐",
    "晚餐",
    "飲料",
    "咖啡",
    "零食",
    "小吃／夜市",
  ],
  交通: [
    "加油",
    "Uber／計程車",
    "大眾運輸",
    "停車",
    "租車",
    "e-tag",
    "停車費",
  ],
  住宿: ["飯店", "民宿", "Resort Fee"],
  購物: [
    "衣物",
    "3C",
    "紀念品",
    "日用品",
    "賣場",
    "線上購物",
  ],
  "娛樂／旅遊": ["門票", "樂園", "Tour", "郵輪"],
  居家: ["房租", "水電", "網路", "家用品"],
  汽車: ["車貸／Lease", "保險", "維修保養", "洗車"],
  其他: ["醫療", "禮物／伴手禮", "手續費", "其他"],
  信用卡: ["回饋金"],
  轉帳: ["信用卡繳費", "其他轉帳"],
};
  useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const tripFromUrl = params.get("trip_id");

  if (tripFromUrl) {
    setTripId(tripFromUrl);
    setExpenseScope("travel");
  }
}, []);
  
  const [paidBy, setPaidBy] = useState("");
  const [splitType, setSplitType] = useState("equal");
  const [notes, setNotes] = useState("");

  const [trips, setTrips] = useState<Trip[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<number[]>([]);
  const [customAmounts, setCustomAmounts] = useState<
    Record<number, string>
  >({});
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

  function togglePerson(personId: number) {
    setSelectedPeople((current) =>
      current.includes(personId)
        ? current.filter((id) => id !== personId)
        : [...current, personId]
    );
  }

  async function handleSubmit() {
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("尚未登入，登入後才能儲存花費。");
      return;
    }

    if (!item.trim()) {
      setMessage("請輸入消費項目。");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setMessage("請輸入正確金額。");
      return;
    }

    if (splitType === "custom") {
      const customTotal = selectedPeople.reduce(
        (sum, personId) =>
          sum + Number(customAmounts[personId] || 0),
        0
      );

      if (
        selectedPeople.length > 0 &&
        Math.abs(customTotal - Number(amount)) > 0.01
      ) {
        setMessage("自訂分攤金額加總必須等於消費金額。");
        return;
      }
    }

    const { data: expenseData, error } = await supabase
      .from("Expenses")
      .insert({
        date: date || null,
        item: item.trim(),
        amount: Number(amount),
        major_category: majorCategory || null,
        category: category.trim() || null,
        payment_method: paymentMethod.trim() || null,
        currency,
        expense_scope: expenseScope,
        trip_id: tripId ? Number(tripId) : null,
        paid_by: paidBy ? Number(paidBy) : null,
        split_type: splitType,
        notes: notes.trim() || null,
        user_id: user.id,
      })
      .select("id")
      .single();

    if (error) {
      setMessage("新增失敗：" + error.message);
      return;
    }

    if (selectedPeople.length > 0 && expenseData) {
      const totalAmount = Number(amount);

      const splitRows = selectedPeople.map((personId) => ({
        expense_id: expenseData.id,
        person_id: personId,
        share_amount:
          splitType === "equal"
            ? totalAmount / selectedPeople.length
            : Number(customAmounts[personId] || 0),
        user_id: user.id,
      }));

      const { error: splitError } = await supabase
        .from("ExpenseSplits")
        .insert(splitRows);

      if (splitError) {
        setMessage(
          "花費已新增，但分攤資料新增失敗：" +
            splitError.message
        );
        return;
      }
    }

    setMessage("花費新增成功！");

    setDate("");
    setItem("");
    setAmount("");
    setMajorCategory("");
    setCategory("");
    setPaymentMethod("");
    setCurrency("USD");
    setExpenseScope("daily");
    setTripId("");
    setPaidBy("");
    setSplitType("equal");
    setNotes("");
    setSelectedPeople([]);
    setCustomAmounts({});
  }

  return (
    <main
      style={{
        maxWidth: 650,
        margin: "40px auto",
        padding: 20,
      }}
    >
      <h1>新增花費</h1>

      <label>日期</label>
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

      <label>大分類</label>
<select
  value={majorCategory}
  onChange={(e) => {
    setMajorCategory(e.target.value);
    setCategory("");
  }}
  style={{
    width: "100%",
    padding: 10,
    marginBottom: 12,
  }}
>
  <option value="">請選擇大分類</option>

  {Object.keys(categoryOptions).map((major) => (
    <option key={major} value={major}>
      {major}
    </option>
  ))}
</select>

<label>小分類</label>
<select
  value={category}
  onChange={(e) => setCategory(e.target.value)}
  disabled={!majorCategory}
  style={{
    width: "100%",
    padding: 10,
    marginBottom: 12,
  }}
>
  <option value="">
    {majorCategory ? "請選擇小分類" : "請先選擇大分類"}
  </option>

  {majorCategory &&
    categoryOptions[majorCategory].map((sub) => (
      <option key={sub} value={sub}>
        {sub}
      </option>
    ))}
</select>

      <input
        placeholder="付款方式，例如：信用卡、現金"
        value={paymentMethod}
        onChange={(e) => setPaymentMethod(e.target.value)}
        style={{
          width: "100%",
          padding: 10,
          marginBottom: 12,
        }}
      />

      <label>幣別</label>
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

      <label>花費類型</label>
      <select
        value={expenseScope}
        onChange={(e) => setExpenseScope(e.target.value)}
        style={{
          width: "100%",
          padding: 10,
          marginBottom: 12,
        }}
      >
        <option value="daily">日常花費</option>
        <option value="travel">旅遊花費</option>
      </select>

      <label>旅程</label>
      <select
        value={tripId}
        onChange={(e) => setTripId(e.target.value)}
        style={{
          width: "100%",
          padding: 10,
          marginBottom: 12,
        }}
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
        style={{
          width: "100%",
          padding: 10,
          marginBottom: 12,
        }}
      >
        <option value="">尚未指定</option>

        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.name}
          </option>
        ))}
      </select>

      <label>分攤者</label>

      <div style={{ marginBottom: 16 }}>
        {people.length === 0 ? (
          <p>目前還沒有人員資料。</p>
        ) : (
          people.map((person) => (
            <label
              key={person.id}
              style={{
                display: "block",
                marginBottom: 8,
              }}
            >
              <input
                type="checkbox"
                checked={selectedPeople.includes(person.id)}
                onChange={() => togglePerson(person.id)}
                style={{ marginRight: 8 }}
              />

              {person.name}
            </label>
          ))
        )}
      </div>

      <label>分攤方式</label>
      <select
        value={splitType}
        onChange={(e) => setSplitType(e.target.value)}
        style={{
          width: "100%",
          padding: 10,
          marginBottom: 12,
        }}
      >
        <option value="equal">平均分攤</option>
        <option value="custom">自訂金額</option>
      </select>

      {splitType === "custom" &&
        selectedPeople.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p>自訂分攤金額</p>

            {selectedPeople.map((personId) => {
              const person = people.find(
                (p) => p.id === personId
              );

              return (
                <div
                  key={personId}
                  style={{ marginBottom: 10 }}
                >
                  <label>
                    {person?.name || "未命名"}
                  </label>

                  <input
                    type="number"
                    step="0.01"
                    placeholder="分攤金額"
                    value={
                      customAmounts[personId] || ""
                    }
                    onChange={(e) =>
                      setCustomAmounts((current) => ({
                        ...current,
                        [personId]: e.target.value,
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: 10,
                      marginTop: 4,
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}

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
        onClick={handleSubmit}
        style={{ padding: "12px 20px" }}
      >
        儲存花費
      </button>

      {message && (
        <p style={{ marginTop: 20 }}>{message}</p>
      )}
    </main>
  );
}
