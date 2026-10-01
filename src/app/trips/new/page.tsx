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

  return (
    <main style={{ maxWidth: 600, margin: "40px auto", padding: 20 }}>
      <h1>新增旅程</h1>

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
