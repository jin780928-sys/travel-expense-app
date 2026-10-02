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

type CreditCard = {
  id: number;
  name: string;
};

const categoryOptions: Record<string, string[]> = {
  餐飲: ["早餐", "午餐", "晚餐", "飲料", "咖啡", "零食", "小吃／夜市"],
  交通: ["加油", "Uber／計程車", "大眾運輸", "停車", "租車", "e-tag", "停車費"],
  住宿: ["飯店", "民宿", "Resort Fee"],
  購物: ["衣物", "3C", "紀念品", "日用品", "賣場", "線上購物"],
  "娛樂／旅遊": ["門票", "樂園", "Tour", "郵輪"],
  居家: ["房租", "水電", "網路", "家用品"],
  汽車: ["車貸／Lease", "保險", "維修保養", "洗車"],
  其他: ["醫療", "禮物／伴手禮", "手續費", "其他"],
  信用卡: ["回饋金"],
  轉帳: ["信用卡繳費", "其他轉帳"],
};

export default function NewExpensePage() {
  const [date, setDate] = useState("");
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");

  const [majorCategory, setMajorCategory] = useState("");
  const [category, setCategory] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("");
  const [cardName, setCardName] = useState("");

  const [currency, setCurrency] = useState("USD");
  const [expenseScope, setExpenseScope] = useState("daily");

  const [tripId, setTripId] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [splitType, setSplitType] = useState("equal");
  const [notes, setNotes] = useState("");

  const [trips, setTrips] = useState<Trip[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);

  const [selectedPeople, setSelectedPeople] = useState<number[]>([]);
  const [customAmounts, setCustomAmounts] = useState<
    Record<number, string>
  >({});

  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tripFromUrl = params.get("trip_id");

    if (tripFromUrl) {
      setTripId(tripFromUrl);
      setExpenseScope("travel");
    }

    loadInitialData();
  }, []);

  async function loadInitialData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("請先登入");
      return;
    }

    const { data: tripData, error: tripError } = await supabase
      .from("Trips")
      .select("id,name")
      .eq("user_id", user.id)
      .order("start_date", { ascending: false });

    if (tripError) {
      setMessage(tripError.message);
      return;
    }

    setTrips(tripData || []);

    const { data: peopleData, error: peopleError } = await supabase
      .from("People")
      .select("id,name")
      .eq("user_id", user.id)
      .order("name");

    if (peopleError) {
      setMessage(peopleError.message);
      return;
    }

    setPeople(peopleData || []);

    const { data: cardData, error: cardError } = await supabase
      .from("CreditCards")
      .select("id,name")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("name");

    if (cardError) {
      setMessage(cardError.message);
      return;
    }

    setCreditCards(cardData || []);
  }

  function togglePerson(personId: number) {
    setSelectedPeople((current) => {
      if (current.includes(personId)) {
        return current.filter((id) => id !== personId);
      }

      return [...current, personId];
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");

    if (!item.trim()) {
      setMessage("請輸入花費項目");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setMessage("請輸入正確金額");
      return;
    }

    if (!majorCategory) {
      setMessage("請選擇大分類");
      return;
    }

    if (!category) {
      setMessage("請選擇小分類");
      return;
    }

    if (!paymentMethod) {
      setMessage("請選擇付款方式");
      return;
    }

    if (paymentMethod === "credit_card" && !cardName) {
      setMessage("請選擇信用卡");
      return;
    }

    const totalAmount = Number(amount);

    if (splitType === "custom" && selectedPeople.length > 0) {
      const customTotal = selectedPeople.reduce((sum, personId) => {
        return sum + Number(customAmounts[personId] || 0);
      }, 0);

      if (Math.abs(customTotal - totalAmount) > 0.01) {
        setMessage("自訂分攤金額加總必須等於花費金額");
        return;
      }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("請先登入");
      return;
    }

    const { data: expenseData, error: expenseError } = await supabase
      .from("Expenses")
      .insert({
        date: date || null,
        item: item.trim(),
        amount: totalAmount,
        major_category: majorCategory || null,
        category: category || null,
        payment_method: paymentMethod,
        card_name:
          paymentMethod === "credit_card"
            ? cardName || null
            : null,
        currency,
        expense_scope: expenseScope,
        trip_id:
          expenseScope === "travel" && tripId
            ? Number(tripId)
            : null,
        paid_by: paidBy ? Number(paidBy) : null,
        split_type: splitType,
        notes: notes.trim() || null,
        user_id: user.id,
      })
      .select("id")
      .single();

    if (expenseError) {
      setMessage(expenseError.message);
      return;
    }

    if (selectedPeople.length > 0 && expenseData) {
      const splitRows = selectedPeople.map((personId) => {
        let shareAmount = 0;

        if (splitType === "equal") {
          shareAmount = totalAmount / selectedPeople.length;
        } else {
          shareAmount = Number(customAmounts[personId] || 0);
        }

        return {
          expense_id: expenseData.id,
          person_id: personId,
          share_amount: shareAmount,
          user_id: user.id,
        };
      });

      const { error: splitError } = await supabase
        .from("ExpenseSplits")
        .insert(splitRows);

      if (splitError) {
        setMessage(
          `花費已新增，但分攤資料失敗：${splitError.message}`
        );
        return;
      }
    }

    setDate("");
    setItem("");
    setAmount("");

    setMajorCategory("");
    setCategory("");

    setPaymentMethod("");
    setCardName("");

    setCurrency("USD");
    setExpenseScope("daily");

    setTripId("");
    setPaidBy("");
    setSplitType("equal");
    setNotes("");

    setSelectedPeople([]);
    setCustomAmounts({});

    setMessage("新增成功");
  }

  return (
    <main
      style={{
        maxWidth: 700,
        margin: "0 auto",
        padding: 24,
      }}
    >
      <h1>新增花費</h1>

      <form onSubmit={handleSubmit}>
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

        <label>花費項目</label>
        <input
          type="text"
          placeholder="例如：晚餐"
          value={item}
          onChange={(e) => setItem(e.target.value)}
          style={{
            width: "100%",
            padding: 10,
            marginBottom: 12,
          }}
        />

        <label>金額</label>
        <input
          type="number"
          step="0.01"
          placeholder="0"
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
          <option value="">請選擇小分類</option>

          {majorCategory &&
            categoryOptions[majorCategory].map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
        </select>

        <label>付款方式</label>
        <select
          value={paymentMethod}
          onChange={(e) => {
            const value = e.target.value;
            setPaymentMethod(value);

            if (value !== "credit_card") {
              setCardName("");
            }
          }}
          style={{
            width: "100%",
            padding: 10,
            marginBottom: 12,
          }}
        >
          <option value="">請選擇付款方式</option>
          <option value="cash">現金</option>
          <option value="credit_card">信用卡</option>
          <option value="debit_card">簽帳金融卡</option>
          <option value="bank_transfer">銀行轉帳</option>
          <option value="apple_pay">Apple Pay</option>
          <option value="google_pay">Google Pay</option>
          <option value="other">其他</option>
        </select>

        {paymentMethod === "credit_card" && (
          <>
            <label>信用卡</label>

            <select
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              style={{
                width: "100%",
                padding: 10,
                marginBottom: 12,
              }}
            >
              <option value="">請選擇信用卡</option>

              {creditCards.map((card) => (
                <option key={card.id} value={card.name}>
                  {card.name}
                </option>
              ))}
            </select>
          </>
        )}

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

        {expenseScope === "travel" && (
          <>
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
              <option value="">請選擇旅程</option>

              {trips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.name}
                </option>
              ))}
            </select>
          </>
        )}

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
          <option value="">未指定</option>

          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>

        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 6 }}>分攤人員</div>

          {people.length === 0 && (
            <p>目前尚未建立人員資料</p>
          )}

          {people.map((person) => (
            <label
              key={person.id}
              style={{
                display: "block",
                marginBottom: 6,
              }}
            >
              <input
                type="checkbox"
                checked={selectedPeople.includes(person.id)}
                onChange={() => togglePerson(person.id)}
              />

              <span style={{ marginLeft: 8 }}>
                {person.name}
              </span>
            </label>
          ))}
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
            <div style={{ marginBottom: 12 }}>
              <div style={{ marginBottom: 8 }}>
                自訂分攤金額
              </div>

              {selectedPeople.map((personId) => {
                const person = people.find(
                  (p) => p.id === personId
                );

                return (
                  <div
                    key={personId}
                    style={{
                      marginBottom: 8,
                    }}
                  >
                    <label>
                      {person?.name || `人員 ${personId}`}
                    </label>

                    <input
                      type="number"
                      step="0.01"
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
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}

        <label>備註</label>
        <textarea
          placeholder="備註"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          style={{
            width: "100%",
            padding: 10,
            marginBottom: 12,
          }}
        />

        <button
          type="submit"
          style={{
            padding: "10px 16px",
          }}
        >
          新增花費
        </button>
      </form>

      {message && (
        <p style={{ marginTop: 16 }}>{message}</p>
      )}
    </main>
  );
}
