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
  const [majorCategory, setMajorCategory] = useState("");
  const [category, setCategory] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [cardName, setCardName] = useState("");
  const [creditCards, setCreditCards] = useState<
  { id: number; name: string }[]
>([]);
  const [currency, setCurrency] = useState("USD");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("讀取中...");
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
  購物: ["衣物", "3C", "紀念品", "日用品", "賣場", "線上購物"],
  "娛樂／旅遊": ["門票", "樂園", "Tour", "郵輪"],
  居家: ["房租", "水電", "網路", "家用品"],
  汽車: ["車貸／Lease", "保險", "維修保養", "洗車"],
  其他: ["醫療", "禮物／伴手禮", "手續費", "其他"],
  信用卡: ["回饋金"],
  轉帳: ["信用卡繳費", "其他轉帳"],
};
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
  "item,amount,date,major_category,category,payment_method,card_name,currency,notes"
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
      setMajorCategory(data.major_category || "");
      setCategory(data.category || "");
      setPaymentMethod(data.payment_method || "");
      setCardName(data.card_name || "");
      setCurrency(data.currency || "USD");
      setNotes(data.notes || "");
      setMessage("");
    }

    if (id) {
      loadExpense();
      loadCreditCards();
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
        major_category: majorCategory || null,
        category: category.trim() || null,
        payment_method: paymentMethod.trim() || null,
        card_name: paymentMethod === "credit_card" ? cardName || null : null,
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
async function loadCreditCards() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data, error } = await supabase
    .from("CreditCards")
    .select("id,name")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("name");

  if (error) {
    return;
  }

  setCreditCards(data || []);
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
    categoryOptions[majorCategory]?.map((sub) => (
      <option key={sub} value={sub}>
        {sub}
      </option>
    ))}
</select>

         <label>付款方式</label>
<select
  value={paymentMethod}
  onChange={(e) => setPaymentMethod(e.target.value)}
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
