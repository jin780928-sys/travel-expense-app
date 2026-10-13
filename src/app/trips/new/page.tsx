"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function NewTripPage() {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit() {
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("尚未登入，之後完成登入後才能儲存旅程。");
      return;
    }

    const { error } = await supabase.from("Trips").insert({
      name,
      location,
      start_date: startDate || null,
      end_date: endDate || null,
      notes,
      user_id: user.id,
    });

    if (error) {
      setMessage("新增失敗：" + error.message);
      return;
    }

    setMessage("旅程新增成功！");
    setName("");
    setLocation("");
    setStartDate("");
    setEndDate("");
    setNotes("");
  }

  // =========================================================
// 表單欄位固定樣式
// =========================================================
  const fieldStyle = {
  marginBottom: 16,
};

const labelStyle = {
  display: "block",
  marginBottom: 6,
  fontSize: 14,
  fontWeight: 600,
  color: "#374151",
};


  const inputStyle = {
  width: "100%",
  minHeight: 42,
  padding: "0 12px",
  border: "1px solid #d1d5db",
  borderRadius: 10,
  background: "#ffffff",
  color: "#111827",
    fontSize: 14,
  boxSizing:
    "border-box" as const,
  outline: "none",
};

const textareaStyle = {
  ...inputStyle,
  minHeight: 100,
  padding: 12,
  resize:
    "vertical" as const,
};
  return (
   <main
    style={{
    maxWidth: 760,
    margin: "0 auto",
    padding: 20,
    background: "#f7f7f8",
    minHeight: "100vh",
    boxSizing: "border-box",
    width: "100%",
    }}
  >
     {/* =========================================================
    新增旅程頁面標題區
    - 與「我的旅程」及其他表單頁面維持相同版型
    - 主標題：新增旅程
    - 次要文字：建立旅程基本資料
   ========================================================= */}
<div
  style={{
    marginBottom: 18,
  }}
>
  <h1
    style={{
      margin: 0,
      fontSize: 28,
      fontWeight: 700,
      color: "#111827",
    }}
  >
    新增旅程
  </h1>

  <div
    style={{
      marginTop: 6,
      fontSize: 14,
      color: "#6b7280",
    }}
  >
    建立旅程基本資料
  </div>
</div>

      <input
        placeholder="旅程名稱"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 12 }}
      />

      <input
        placeholder="地點"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 12 }}
      />

      <label>開始日期</label>
      <input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 12 }}
      />

      <label>結束日期</label>
      <input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 12 }}
      />

      <textarea
        placeholder="備註"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 12 }}
      />

      <button onClick={handleSubmit} style={{ padding: "12px 20px" }}>
        儲存旅程
      </button>

      {message && <p style={{ marginTop: 20 }}>{message}</p>}
    </main>
  );
}
