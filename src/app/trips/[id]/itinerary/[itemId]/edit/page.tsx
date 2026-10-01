"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../../../../lib/supabase";

export default function EditItineraryItemPage() {
  const params = useParams();
  const router = useRouter();

  const tripId = Number(params.id);
  const itemId = Number(params.itemId);

  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [transportation, setTransportation] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("讀取中...");

  useEffect(() => {
    async function loadItem() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("尚未登入，登入後才能編輯行程。");
        return;
      }

      const { data, error } = await supabase
        .from("ItineraryItems")
        .select(
          "date,start_time,end_time,title,location,transportation,notes"
        )
        .eq("id", itemId)
        .eq("trip_id", tripId)
        .single();

      if (error) {
        setMessage("讀取失敗：" + error.message);
        return;
      }

      setDate(data.date || "");
      setStartTime(data.start_time || "");
      setEndTime(data.end_time || "");
      setTitle(data.title || "");
      setLocation(data.location || "");
      setTransportation(data.transportation || "");
      setNotes(data.notes || "");
      setMessage("");
    }

    if (tripId && itemId) {
      loadItem();
    }
  }, [tripId, itemId]);

  async function handleSave() {
    setMessage("");

    if (!title.trim()) {
      setMessage("請輸入活動名稱。");
      return;
    }

    const { error } = await supabase
      .from("ItineraryItems")
      .update({
        date: date || null,
        start_time: startTime || null,
        end_time: endTime || null,
        title: title.trim(),
        location: location.trim() || null,
        transportation: transportation.trim() || null,
        notes: notes.trim() || null,
      })
      .eq("id", itemId)
      .eq("trip_id", tripId);

    if (error) {
      setMessage("儲存失敗：" + error.message);
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
      <h1>編輯每日行程</h1>

      {message && <p>{message}</p>}

      {!message && (
        <>
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
            placeholder="活動名稱"
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
            placeholder="交通方式"
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
