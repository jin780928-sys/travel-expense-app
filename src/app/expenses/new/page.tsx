"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import ExpenseForm from "../../../components/ExpenseForm";

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

      <ExpenseForm
  item={item}
  setItem={setItem}

  amount={amount}
  setAmount={setAmount}

  date={date}
  setDate={setDate}


        majorCategory={majorCategory}
  setMajorCategory={setMajorCategory}

  category={category}
  setCategory={setCategory}

  paymentMethod={paymentMethod}
  setPaymentMethod={setPaymentMethod}

        cardName={cardName}
  setCardName={setCardName}

  currency={currency}
  setCurrency={setCurrency}

  expenseScope={expenseScope}
  setExpenseScope={setExpenseScope}

  tripId={tripId}
  setTripId={setTripId}

        notes={notes}
  setNotes={setNotes}

  paidBy={paidBy}
  setPaidBy={setPaidBy}

  splitType={splitType}
  setSplitType={setSplitType}

  selectedPeople={selectedPeople}
  togglePerson={togglePerson}


        customShares={customShares}
  updateCustomShare={updateCustomShare}

  people={people}
  creditCards={creditCards}
  trips={trips}

  customTotal={customTotal}
  getEqualShare={getEqualShare}

  saving={saving}
  submitText="新增支出"

        onSubmit={handleSubmit}

  cancelContent={
    <a
      href="/dashboard"
      style={{
        height: 42,
        padding: "0 18px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
        color: "#374151",
        border: "1px solid #d1d5db",
        borderRadius: 10,
        textDecoration: "none",
        fontSize: 14,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      取消
    </a>
  }
/>

      {message && (
        <p style={{ marginTop: 16 }}>{message}</p>
      )}
    </main>
  );
}
