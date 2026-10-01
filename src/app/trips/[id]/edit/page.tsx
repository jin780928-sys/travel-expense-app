"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

export default function EditTripPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("讀取中...");

  useEffect(() => {
    async function loadTrip() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("尚未登入，登入後才能編輯旅程。");
        return;
      }

      const { data, error } = await supabase
        .from("Trips")
        .select("name,location,start_date,end_date,notes")
        .eq("id", id)
        .single();

      if (error) {
        setMessage("讀取失敗：" + error.message);
        return;
      }

      setName(data.name || "");
      setLocation(data.location || "");
      setStartDate(data.start_date || "");
      setEndDate(data.end_date || "");
      setNotes(data.notes || "");
      setMessage("");
    }

    if (id) {
      loadTrip();
    }
  }, [id]);

  async function handleSave() {
    setMessage("");

    if (!name.trim()) {
      setMessage("請輸入旅程名稱。");
      return;
    }

    const { error } = await supabase
      .from("Trips")
      .update({
        name: name.trim(),
        location: location.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
        notes: notes.trim() || null,
      })
      .eq("id", id);

    if (error) {
      setMessage("儲存失敗：" + error.message);
      return;
    }

    router.push(`/trips/${id}`);
  }

  return (
    <main
      style={{
        maxWidth: 650,
        margin: "40px auto",
        padding: 20,
      }}
    >
      <h1>編輯旅程</h1>

      {message && <p>{message}</p>}

      {!message && (
        <>
          <input
            placeholder="旅程名稱"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              marginBottom: 12,
            }}
          />

          <input
            placeholder="地點"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              marginBottom: 12,
            }}
          />

          <label>開始日期</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              marginBottom: 12,
            }}
          />

          <label>結束日期</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              marginBottom: 12,
            }}
          />

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
