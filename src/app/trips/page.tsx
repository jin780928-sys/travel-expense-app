"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Trip = {
  id: number;
  name: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
};

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [message, setMessage] = useState("讀取中...");

  useEffect(() => {
    async function loadTrips() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("尚未登入，登入後才能查看旅程。");
        return;
      }

      const { data, error } = await supabase
        .from("Trips")
        .select("id,name,location,start_date,end_date,notes")
        .order("start_date", { ascending: true });

      if (error) {
        setMessage("讀取失敗：" + error.message);
        return;
      }

      setTrips(data ?? []);
      setMessage("");
    }

    loadTrips();
  }, []);

  return (
    <main
  style={{
    maxWidth: 1100,
    margin: "0 auto",
    padding: 20,
    background: "#f7f7f8",
    minHeight: "100vh",
    boxSizing: "border-box",
    width: "100%",
    }}
    >
      <h1>我的旅程</h1>

      <p>
        <Link href="/trips/new">＋ 新增旅程</Link>
      </p>

      {message && <p>{message}</p>}

      {!message && trips.length === 0 && <p>目前還沒有旅程。</p>}

      {trips.map((trip) => (
        <div
          key={trip.id}
          style={{
            border: "1px solid #ccc",
            padding: 16,
            marginBottom: 12,
            borderRadius: 8,
          }}
        >
          <h2>
  <Link href={`/trips/${trip.id}`}>
    {trip.name}
  </Link>
</h2>

          {trip.location && <p>地點：{trip.location}</p>}

          <p>
            日期：{trip.start_date || "未設定"}
            {" ～ "}
            {trip.end_date || "未設定"}
          </p>

          {trip.notes && <p>備註：{trip.notes}</p>}
        </div>
      ))}
    </main>
  );
}
