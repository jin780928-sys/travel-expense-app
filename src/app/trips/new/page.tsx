"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NewTripPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] =  useState(false);
  
  async function handleSubmit() {
  if (saving) {
    return;
  }

  setSaving(true);
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
      setSaving(false);
      return;
    }
    router.push("/trips");

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

      {/* =========================================================
    旅程名稱
   ========================================================= */}
     <div style={fieldStyle}>
  <label style={labelStyle}>
    旅程名稱
  </label>

       <input
    type="text"
    placeholder="例如：Disney Treasure"
    value={name}
    onChange={(e) =>
      setName(e.target.value)
    }
    style={inputStyle}
  />
</div>

      {/* =========================================================
    地點
   ========================================================= */}
     <div style={fieldStyle}>
  <label style={labelStyle}>
    地點
  </label>

  <input
    type="text"
    placeholder="例如：Orlando"
    value={location}
    onChange={(e) =>
      setLocation(e.target.value)
    }
    style={inputStyle}
  />
</div>

      {/* =========================================================
    開始日期 / 結束日期
   ========================================================= */}
     <div
  style={{
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
    marginBottom: 16,
  }}
>
       {/* 開始日期 */}
  <div>
    <label style={labelStyle}>
      開始日期
    </label>

    <input
      type="date"
      value={startDate}
      onChange={(e) =>
        setStartDate(
          e.target.value
        )
      }
      style={inputStyle}
    />
  </div>

       {/* 結束日期 */}
  <div>
    <label style={labelStyle}>
      結束日期
    </label>

    <input
      type="date"
      value={endDate}
      onChange={(e) =>
        setEndDate(
          e.target.value
        )
      }
      style={inputStyle}
    />
  </div>
</div>

     {/* =========================================================
    備註
   ========================================================= */}
     <div style={fieldStyle}>
  <label style={labelStyle}>
    備註
  </label>

       <textarea
    placeholder="例如：住宿、交通或行程備註"
    value={notes}
    onChange={(e) =>
      setNotes(e.target.value)
    }
    style={textareaStyle}
  />
</div>

     {/* =========================================================
    底部操作按鈕
    - 左側：取消
    - 右側：新增旅程
   ========================================================= */}
     <div
  style={{
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 18,
    flexWrap: "wrap",
  }}
>
       <Link
    href="/trips"
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
  </Link>

  
    <button
  type="button"
  onClick={handleSubmit}
  disabled={saving}
    style={{
      height: 42,
      padding: "0 18px",
      background: "#2563eb",
      color: "#ffffff",
      border: "1px solid #2563eb",
      borderRadius: 10,
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
      whiteSpace: "nowrap",
    }}
    >
    新增旅程
  </button>
</div>

      {message && <p style={{ marginTop: 20 }}>{message}</p>}
    </main>
  );
}
