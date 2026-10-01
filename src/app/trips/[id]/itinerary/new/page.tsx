"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../../lib/supabase";

export default function NewItineraryItemPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = Number(params.id);

  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [transportation, setTransportation] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit() {
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("尚未登入，登入後才能新增行程。");
      return;
    }

    if (!title.trim()) {
      setMessage("請輸入活動名稱。");
      return;
    }

    const { error } = await supabase
      .from("ItineraryItems")
      .insert({
        trip_id: tripId,
        date: date || null,
        start_time: startTime || null,
        end_time: endTime || null,
        title: title.trim(),
        location: location.trim() || null,
        transportation: transportation.trim() || null,
        notes: notes.trim() || null,
        user_id: user.id,
      });

    if (error) {
      setMessage("新增失敗：" + error.message);
      return;
    }

    router.push(`/trips/${tripId}`);
  }

  return (
    <main
      style={{
        maxWidth: 650,
        margin: "40px auto",
        padding: 20,
      }}
    >
      <h1>新增每日行程</h1>

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

      <label>開始時間</label>
      <input
        type="time"
        value={startTime}
        onChange={(e) => setStartTime(e.target.value)}
        style={{
          width: "100%",
          padding: 10,
          marginBottom: 12,
        }}
      />

      <label>結束時間</label>
      <input
        type="time"
        value={endTime}
        onChange={(e) => setEndTime(e.target.value)}
        style={{
          width: "100%",
          padding: 10,
          marginBottom: 12,
        }}
      />

      <input
        placeholder="活動名稱，例如：迪士尼、晚餐、飯店 Check-in"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
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

      <input
        placeholder="交通方式，例如：Uber、地鐵、步行"
        value={transportation}
        onChange={(e) => setTransportation(e.target.value)}
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
        onClick={handleSubmit}
        style={{ padding: "12px 20px" }}
      >
        儲存行程
      </button>

      {message && (
        <p style={{ marginTop: 20 }}>{message}</p>
      )}
    </main>
  );
}
