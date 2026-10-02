"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type CreditCard = {
  id: number;
  name: string;
  is_active: boolean;
  statement_day: number | null;
  due_day: number | null;
};
export default function CardsPage() {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [name, setName] = useState("");
  const [statementDay, setStatementDay] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [message, setMessage] = useState("讀取中...");
  const [editingCardId, setEditingCardId] = useState<number | null>(null);

  useEffect(() => {
    loadCards();
  }, []);

  async function loadCards() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("請先登入");
      return;
    }

    const { data, error } = await supabase
      .from("CreditCards")
.select("id,name,is_active,statement_day,due_day")
      .eq("user_id", user.id)
      .order("name");

    if (error) {
      setMessage(error.message);
      return;
    }

    setCards(data || []);
    setMessage("");
  }
async function addCard() {
  if (!name.trim()) {
    setMessage("請輸入信用卡名稱");
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    setMessage("請先登入");
    return;
  }

  const { error } = await supabase
    .from("CreditCards")
    .insert({
  name: name.trim(),
  is_active: true,
  statement_day: statementDay ? Number(statementDay) : null,
  due_day: dueDay ? Number(dueDay) : null,
  user_id: user.id,
});

  if (error) {
    setMessage(error.message);
    return;
  }

  setName("");
setStatementDay("");
setDueDay("");
setMessage("新增成功");
await loadCards();
}
  async function toggleCard(card: CreditCard) {
  const { error } = await supabase
    .from("CreditCards")
    .update({
      is_active: !card.is_active,
    })
    .eq("id", card.id);

  if (error) {
    setMessage(error.message);
    return;
  }

  await loadCards();
}

  function startEditCard(card: CreditCard) {
  setEditingCardId(card.id);
  setName(card.name);
  setStatementDay(
    card.statement_day ? String(card.statement_day) : ""
  );
  setDueDay(
    card.due_day ? String(card.due_day) : ""
  );
  setMessage("");
}

  async function saveEditCard() {
  if (!editingCardId) return;

  if (!name.trim()) {
    setMessage("請輸入信用卡名稱");
    return;
  }

  const { error } = await supabase
    .from("CreditCards")
    .update({
      name: name.trim(),
      statement_day: statementDay ? Number(statementDay) : null,
      due_day: dueDay ? Number(dueDay) : null,
    })
    .eq("id", editingCardId);

  if (error) {
    setMessage(error.message);
    return;
  }

  setEditingCardId(null);
  setName("");
  setStatementDay("");
  setDueDay("");
  setMessage("修改成功");

  await loadCards();
}
  
  
  return (
    <main style={{ padding: 24 }}>
      <h1>信用卡管理</h1>

      <input
  type="text"
  placeholder="信用卡名稱"
  value={name}
  onChange={(e) => setName(e.target.value)}
  style={{
    width: "100%",
    padding: 10,
    marginBottom: 8,
  }}
/>

      <input
  type="number"
  min="1"
  max="31"
  placeholder="結帳日，例如 18"
  value={statementDay}
  onChange={(e) => setStatementDay(e.target.value)}
  style={{
    width: "100%",
    padding: 10,
    marginBottom: 8,
  }}
/>

      <input
  type="number"
  min="1"
  max="31"
  placeholder="繳款日，例如 25"
  value={dueDay}
  onChange={(e) => setDueDay(e.target.value)}
  style={{
    width: "100%",
    padding: 10,
    marginBottom: 8,
  }}
/>
      
<button
  onClick={editingCardId ? saveEditCard : addCard}
  style={{
    padding: "10px 16px",
    marginBottom: 20,
  }}
>
  {editingCardId ? "儲存修改" : "新增信用卡"}
</button>

      {editingCardId && (
  <button
    onClick={() => {
      setEditingCardId(null);
      setName("");
      setStatementDay("");
      setDueDay("");
      setMessage("");
    }}
    style={{
      padding: "10px 16px",
      marginLeft: 8,
      marginBottom: 20,
    }}
  >
    取消編輯
  </button>
)}
      
      {message && <p>{message}</p>}

      {cards.map((card) => (
        <div key={card.id} style={{ marginBottom: 12 }}>
          <strong>{card.name}</strong>
          <div>{card.is_active ? "啟用" : "停用"}</div>
          <div>
  結帳日：{card.statement_day ? `${card.statement_day} 日` : "未設定"}
</div>

<div>
  繳款日：{card.due_day ? `${card.due_day} 日` : "未設定"}
</div>
          <button
  onClick={() => toggleCard(card)}
  style={{
    padding: "6px 12px",
    marginTop: 6,
  }}
>
  {card.is_active ? "停用" : "啟用"}
</button>

          <button
  onClick={() => startEditCard(card)}
  style={{
    padding: "6px 12px",
    marginTop: 6,
    marginLeft: 8,
  }}
>
  編輯
</button>
          
        </div>
      ))}
    </main>
  );
}
