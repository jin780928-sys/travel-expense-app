"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type CreditCard = {
  id: number;
  name: string;
  is_active: boolean;
  statement_day: number | null;
  due_day: number | null;
  due_month_offset: number | null;
};
export default function CardsPage() {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [name, setName] = useState("");
  const [statementDay, setStatementDay] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [dueMonthOffset, setDueMonthOffset] = useState("1");
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
.select("id,name,is_active,statement_day,due_day,due_month_offset")
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
      due_month_offset:
  Number(dueMonthOffset),
  user_id: user.id,
});

  if (error) {
    setMessage(error.message);
    return;
  }

  setName("");
setStatementDay("");
setDueDay("");
  setDueMonthOffset("1");
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
  setEditingCardID(card.id);
  setName(card.name);
  setStatementDay(
    card.statement_day ? String(card.statement_day) : ""
  );
  setDueDay(
    card.due_day ? String(card.due_day) : ""
  );
    setDueMonthOffset(
  String(card.due_month_offset ?? 1)
);
  setMessage("");
}

  async function saveEditCard() {
  if (!editingCardID) return;

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
      due_month_offset:
  Number(dueMonthOffset),
    })
    .eq("id", editingCardID);

  if (error) {
    setMessage(error.message);
    return;
  }

  setEditingCardID(null);
  setName("");
  setStatementDay("");
  setDueDay("");
  setMessage("修改成功");

  await loadCards();
}

  function getCurrentDueDateText(card: CreditCard) {
  if (!card.due_day) {
    return "未設定";
  }

  const statementEndDate =
  getCurrentStatementEndDate(card);

if (!statementEndDate) {
  return "未設定";
}

const offset =
  card.due_month_offset ?? 1;

const dueDate = new Date(
  statementEndDate.getFullYear(),
  statementEndDate.getMonth() + offset,
  card.due_day
);

  return `${dueDate.getFullYear()}/${String(
    dueDate.getMonth() + 1
  ).padStart(2, "0")}/${String(
    dueDate.getDate()
  ).padStart(2, "0")}`;
}

  function getCurrentDueStatusText(card: CreditCard) {
  if (!card.due_day) {
    return "未設定繳款日";
  }

  const now = new Date();

  const todayOnly = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const statementEndDate =
  getCurrentStatementEndDate(card);

if (!statementEndDate) {
  return "未設定繳款日";
}

const offset =
  card.due_month_offset ?? 1;

const dueDate = new Date(
  statementEndDate.getFullYear(),
  statementEndDate.getMonth() + offset,
  card.due_day
);

  const diffMs =
    dueDate.getTime() -
    todayOnly.getTime();

  const diffDays = Math.ceil(
    diffMs /
      (1000 * 60 * 60 * 24)
  );

  if (diffDays > 0) {
    return `距離繳款還有 ${diffDays} 天`;
  }

  if (diffDays === 0) {
    return "⚠️ 今天到期";
  }

  return `⚠️ 已逾期 ${Math.abs(diffDays)} 天`;
}

  function getCurrentDueLevel(card: CreditCard) {
  if (!card.due_day) {
    return "normal";
  }

  const now = new Date();

  const todayOnly = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const statementEndDate =
  getCurrentStatementEndDate(card);

if (!statementEndDate) {
  return "normal";
}

const offset =
  card.due_month_offset ?? 1;

const dueDate = new Date(
  statementEndDate.getFullYear(),
  statementEndDate.getMonth() + offset,
  card.due_day
);

  const diffMs =
    dueDate.getTime() -
    todayOnly.getTime();

  const diffDays = Math.ceil(
    diffMs /
      (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) {
    return "overdue";
  }

  if (diffDays === 0) {
    return "today";
  }

  return "soon";
}

  function getCurrentStatementEndDate(card: CreditCard) {
  if (!card.statement_day) {
    return null;
  }

  const now = new Date();

  const currentMonthStatementDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    Math.min(
      card.statement_day,
      new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0
      ).getDate()
    )
  );

  // 本月結帳日已經到或已經過
  if (now >= currentMonthStatementDate) {
    return currentMonthStatementDate;
  }

  // 本月還沒到結帳日 → 目前仍屬於上個月已結帳的帳單
  return new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    Math.min(
      card.statement_day,
      new Date(
        now.getFullYear(),
        now.getMonth(),
        0
      ).getDate()
    )
  );
}


  function getNextStatementDateText(card: CreditCard) {
  if (!card.statement_day) {
    return "未設定";
  }
    const currentStatementEndDate =
    getCurrentStatementEndDate(card);

  if (!currentStatementEndDate) {
    return "未設定";
  }
    const nextStatementDate = new Date(
    currentStatementEndDate.getFullYear(),
    currentStatementEndDate.getMonth() + 1,
    Math.min(
      card.statement_day,
      new Date(
        currentStatementEndDate.getFullYear(),
        currentStatementEndDate.getMonth() + 2,
        0
      ).getDate()
    )
  );
    return `${nextStatementDate.getFullYear()}/${String(
    nextStatementDate.getMonth() + 1
  ).padStart(2, "0")}/${String(
    nextStatementDate.getDate()
  ).padStart(2, "0")}`;
}

  function getNextDueDateText(card: CreditCard) {
  if (!card.statement_day || !card.due_day) {
    return "未設定";
  }
    const currentStatementEndDate =
    getCurrentStatementEndDate(card);

  if (!currentStatementEndDate) {
    return "未設定";
  }
    const nextStatementDate = new Date(
    currentStatementEndDate.getFullYear(),
    currentStatementEndDate.getMonth() + 1,
    Math.min(
      card.statement_day,
      new Date(
        currentStatementEndDate.getFullYear(),
        currentStatementEndDate.getMonth() + 2,
        0
      ).getDate()
    )
  );

  const offset =
    card.due_month_offset ?? 1;
    const nextDueDate = new Date(
    nextStatementDate.getFullYear(),
    nextStatementDate.getMonth() + offset,
    Math.min(
      card.due_day,
      new Date(
        nextStatementDate.getFullYear(),
        nextStatementDate.getMonth() + offset + 1,
        0
      ).getDate()
    )
  );
    return `${nextDueDate.getFullYear()}/${String(
    nextDueDate.getMonth() + 1
  ).padStart(2, "0")}/${String(
    nextDueDate.getDate()
  ).padStart(2, "0")}`;
}

  function getNextStatementStatusText(card: CreditCard) {
  if (!card.statement_day) {
    return "未設定結帳日";
  }
    const currentStatementEndDate =
    getCurrentStatementEndDate(card);

  if (!currentStatementEndDate) {
    return "未設定結帳日";
  }
    const nextStatementDate = new Date(
    currentStatementEndDate.getFullYear(),
    currentStatementEndDate.getMonth() + 1,
    Math.min(
      card.statement_day,
      new Date(
        currentStatementEndDate.getFullYear(),
        currentStatementEndDate.getMonth() + 2,
        0
      ).getDate()
    )
  );
    const now = new Date();

  const todayOnly = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
    const nextDateOnly = new Date(
    nextStatementDate.getFullYear(),
    nextStatementDate.getMonth(),
    nextStatementDate.getDate()
  );
    const diffMs =
    nextDateOnly.getTime() -
    todayOnly.getTime();

  const diffDays = Math.ceil(
    diffMs /
      (1000 * 60 * 60 * 24)
  );
    if (diffDays > 0) {
    return `距離下一期結帳還有 ${diffDays} 天`;
  }

  if (diffDays === 0) {
    return "📅 今天結帳";
  }

  return "已進入下一期";
}

  function getNextStatementLevel(card: CreditCard) {
  if (!card.statement_day) {
    return "normal";
  }
const currentStatementEndDate =
    getCurrentStatementEndDate(card);

  if (!currentStatementEndDate) {
    return "normal";
  }
    const nextStatementDate = new Date(
    currentStatementEndDate.getFullYear(),
    currentStatementEndDate.getMonth() + 1,
    Math.min(
      card.statement_day,
      new Date(
        currentStatementEndDate.getFullYear(),
        currentStatementEndDate.getMonth() + 2,
        0
      ).getDate()
    )
  );

  const now = new Date();
const todayOnly = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
    const diffMs =
    nextStatementDate.getTime() -
    todayOnly.getTime();

  const diffDays = Math.ceil(
    diffMs /
      (1000 * 60 * 60 * 24)
  );
    if (diffDays === 0) {
    return "today";
  }

  if (diffDays > 0 && diffDays <= 7) {
    return "soon";
  }

  return "normal";
}
  
  function getCurrentStatementPeriodText(card: CreditCard) {
  const endDate =
    getCurrentStatementEndDate(card);

  if (!endDate || !card.statement_day) {
    return "未設定";
  }

  const previousMonthEnd = new Date(
    endDate.getFullYear(),
    endDate.getMonth() - 1,
    Math.min(
      card.statement_day,
      new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        0
      ).getDate()
    )
  );

  const startDate = new Date(previousMonthEnd);
  startDate.setDate(startDate.getDate() + 1);

  const formatDate = (date: Date) =>
    `${date.getFullYear()}/${String(
      date.getMonth() + 1
    ).padStart(2, "0")}/${String(
      date.getDate()
    ).padStart(2, "0")}`;

  return `${formatDate(startDate)} ～ ${formatDate(endDate)}`;
}

  function getCurrentStatementStatusText(card: CreditCard) {
  const statementEndDate =
    getCurrentStatementEndDate(card);

  if (!statementEndDate) {
    return "未設定結帳日";
  }

  const now = new Date();

  const todayOnly = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const endDateOnly = new Date(
    statementEndDate.getFullYear(),
    statementEndDate.getMonth(),
    statementEndDate.getDate()
  );

  if (todayOnly >= endDateOnly) {
    return "✅ 本期已結帳";
  }

  return "⏳ 本期尚未結帳";
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

      <select
  value={dueMonthOffset}
  onChange={(e) =>
    setDueMonthOffset(e.target.value)
  }
  style={{
    marginLeft: 8,
  }}
>
  <option value="0">
    結帳當月繳
  </option>
  <option value="1">
    下個月繳
  </option>
  <option value="2">
    下下個月繳
  </option>
</select>
      
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
        <div
  key={card.id}
  style={{
    marginBottom: 18,
    padding: 16,
    border:
  editingCardId === card.id
    ? "2px solid #8bbce5"
    : "1px solid #ddd",
    borderRadius: 10,
    background:
  editingCardID === card.id
    ? "#f7fbff"
    : "white",
  }}
>
          <div
  style={{
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 6,
  }}
>
  {card.name}
</div>
          <div
  style={{
    display: "inline-block",
    marginBottom: 8,
    padding: "3px 8px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "bold",
    background: card.is_active
      ? "#eef9f1"
      : "#f1f1f1",
    color: card.is_active
      ? "#2f6b3b"
      : "#666",
  }}
>
  {card.is_active ? "啟用" : "停用"}
</div>

          <div
  style={{
    marginTop: 10,
    marginBottom: 6,
    fontWeight: "bold",
  }}
>
  帳單設定
</div>
          
          <div>
  結帳日：{card.statement_day ? `${card.statement_day} 日` : "未設定"}
</div>

<div>
  繳款日：{card.due_day ? `${card.due_day} 日` : "未設定"}
</div>

          <div>
  規則：
  {card.statement_day && card.due_day
    ? card.due_month_offset === 0
      ? `每月 ${card.statement_day} 日結帳，當月 ${card.due_day} 日繳款`
      : card.due_month_offset === 2
      ? `每月 ${card.statement_day} 日結帳，下下個月 ${card.due_day} 日繳款`
      : `每月 ${card.statement_day} 日結帳，次月 ${card.due_day} 日繳款`
    : "未完整設定"}
</div>

          <div
  style={{
    marginTop: 12,
    marginBottom: 6,
    fontWeight: "bold",
  }}
>
  本期狀態
</div>
          
          <div>
  本期帳單區間：
  {getCurrentStatementPeriodText(card)}
</div>
<hr
  style={{
    marginTop: 14,
    marginBottom: 12,
    border: "none",
    borderTop: "1px solid #eee",
  }}
/>
          <div
  style={{
    marginTop: 12,
    marginBottom: 6,
    fontWeight: "bold",
  }}
>
  下一期
</div>
          <div>
  下一期結帳日：
  {getNextStatementDateText(card)}
</div>

          <div>
  下一期預計繳款日：
  {getNextDueDateText(card)}
</div>

          <div
  style={{
    display: "inline-block",
    marginTop: 6,
    padding: "4px 8px",
    borderRadius: 6,
    background:
      getNextStatementLevel(card) === "today"
        ? "#fff1d6"
        : getNextStatementLevel(card) === "soon"
        ? "#fffbe6"
        : "#eef7ff",
  }}
>
  {getNextStatementStatusText(card)}
</div>
      
      

          <div
  style={{
    display: "inline-block",
    marginTop: 6,
    padding: "4px 8px",
    borderRadius: 6,
    background:
      getCurrentStatementStatusText(card).includes("已結帳")
        ? "#eef9f1"
        : "#eef7ff",
  }}
>
  {getCurrentStatementStatusText(card)}
</div>
          
          <div>
  本期繳款日：
  {getCurrentDueDateText(card)}
</div>

          <div
  style={{
    display: "inline-block",
    marginTop: 6,
    padding: "4px 8px",
    borderRadius: 6,
    background:
      getCurrentDueLevel(card) === "overdue"
        ? "#ffe5e5"
        : getCurrentDueLevel(card) === "today"
        ? "#fff1d6"
        : getCurrentDueLevel(card) === "soon"
        ? "#fffbe6"
        : "transparent",
  }}
>
  {getCurrentDueStatusText(card)}
</div>
          
          <button
  onClick={() => toggleCard(card)}
  style={{
  padding: "6px 12px",
  marginTop: 8,
  marginLeft: 8,
  borderRadius: 8,
  fontWeight: "bold",
  cursor: "pointer",
    border: card.is_active
    ? "1px solid #efb7b7"
    : "1px solid #b7dfc3",

  background: card.is_active
    ? "#ffecec"
    : "#eef9f1",

  color: card.is_active
    ? "#a33"
    : "#2f6b3b",
}}
>
  {card.is_active ? "停用" : "啟用"}
</button>

         <button
  onClick={() => startEditCard(card)}
  style={{
    padding: "6px 12px",
    marginTop: 8,
    border: "1px solid #b8d7f0",
    borderRadius: 8,
    background: "#eef7ff",
    fontWeight: "bold",
    cursor: "pointer",
  }}
>
  ✏️ 編輯
</button>
          
        </div>
      ))}
    </main>
  );
}
