"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

type Trip = {
  id: number;
  name: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
};

export default function TripDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [message, setMessage] = useState("讀取中...");

  useEffect(() => {
    async function loadTrip() {
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
        .eq("id", id)
        .single();

      if (error) {
        setMessage("讀取失敗：" + error.message);
        return;
      }

      setTrip(data);
      setMessage("");
    }

    if (id) {
      loadTrip();
    }
  }, [id]);

  return (
    <main style={{ maxWidth: 800, margin: "40px auto", padding: 20 }}>
      <p>
        <Link href="/trips">← 回到我的旅程</Link>
      </p>

      {message && <p>{message}</p>}

      {trip && (
        <>
          <h1>{trip.name}</h1>

          {trip.location && <p>地點：{trip.location}</p>}

          <p>
            日期：{trip.start_date || "未設定"}
            {" ～ "}
            {trip.end_date || "未設定"}
          </p>

          {trip.notes && <p>備註：{trip.notes}</p>}

          <p style={{ marginTop: 30 }}>
            <Link href={`/expenses/new?trip_id=${trip.id}`}>
              ＋ 新增這趟旅程的花費
            </Link>
          </p>
        </>
      )}
    </main>
  );
}
