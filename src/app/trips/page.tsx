"use client";

import {
  useEffect,
  useState,
} from "react";
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

// =========================================================
// 旅程狀態判斷
// upcoming = 即將出發
// active   = 進行中
// ended    = 已結束
// =========================================================
function getTripStatus(
  startDate: string,
  endDate: string
) {
  const today = new Date();

  const todayString =
    today.toISOString().slice(0, 10);
  if (todayString < startDate) {
    return "upcoming";
  }

  if (
    todayString >= startDate &&
    todayString <= endDate
  ) {
    return "active";
  }

  return "ended";
}

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [message, setMessage] = useState("讀取中...");

  // =========================================================
// 旅程狀態篩選
// all      = 全部
// upcoming = 即將出發
// active   = 進行中
// ended    = 已結束
// =========================================================
  const [
  tripStatusFilter,
  setTripStatusFilter,
] = useState<
  "all" | "upcoming" | "active" | "ended"
>("all");

  // =========================================================
// 依照目前選取的旅程狀態篩選
// =========================================================
  const filteredTrips =
  trips.filter((trip) => {
    if (
      tripStatusFilter === "all"
    ) {
      return true;
    }
     const status = getTripStatus(
      trip.start_date,
      trip.end_date
    );

    return (
      status === tripStatusFilter
    );
  });

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
  {/* =========================================================
    我的旅程頁面標題區
    - 左側：頁面標題 + 說明文字
    - 右側：新增旅程按鈕
    - 桌機版左右排列
    - 手機版空間不足時自動換行
   ========================================================= */}
     <div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 18,
  }}
>
{/* 左側：標題與頁面說明 */}
       <div>
    <h1
      style={{
        margin: 0,
        fontSize: 28,
        fontWeight: 700,
        color: "#111827",
      }}
    >
      我的旅程
    </h1>
         <div
      style={{
        marginTop: 6,
        fontSize: 14,
        color: "#6b7280",
      }}
    >
      管理旅程與旅遊支出
    </div>
  </div>

{/* 右側：新增旅程按鈕 */}
       <a
    href="/trips/new"
    style={{
      height: 42,
      padding: "0 16px",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#2563eb",
      color: "#ffffff",
      border: "1px solid #2563eb",
      borderRadius: 10,
      textDecoration: "none",
      fontSize: 14,
      fontWeight: 600,
      whiteSpace: "nowrap",
      boxSizing: "border-box",
    }}
  >
    ＋ 新增旅程
  </a>
</div>


      {/* =========================================================
    旅程狀態篩選區
    - 全部
    - 即將出發
    - 進行中
    - 已結束
    - 使用膠囊式按鈕
    - 選中的狀態使用藍色
    - 手機版可自動換行
   ========================================================= */}
      <div
  style={{
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  }}
>
  {/* 全部 */}
        <button
    type="button"
    onClick={() =>
      setTripStatusFilter("all")
    }
    style={{
      height: 38,
      padding: "0 14px",
      borderRadius: 999,
      border:
        tripStatusFilter === "all"
          ? "1px solid #2563eb"
          : "1px solid #d1d5db",
      background:
        tripStatusFilter === "all"
          ? "#2563eb"
          : "#ffffff",
      color:
        tripStatusFilter === "all"
          ? "#ffffff"
          : "#374151",
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
      whiteSpace: "nowrap",
    }}
  >
    全部
          </button>

  {/* 即將出發 */}
  <button
    type="button"
    onClick={() =>
      setTripStatusFilter("upcoming")
    }
    style={{
      height: 38,
      padding: "0 14px",
      borderRadius: 999,
      border:
        tripStatusFilter === "upcoming"
          ? "1px solid #2563eb"
          : "1px solid #d1d5db",
      background:
        tripStatusFilter === "upcoming"
          ? "#2563eb"
          : "#ffffff",
      color:
        tripStatusFilter === "upcoming"
          ? "#ffffff"
          : "#374151",
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
      whiteSpace: "nowrap",
    }}
  >
    即將出發
  </button>
        {/* 進行中 */}
  <button
    type="button"
    onClick={() =>
      setTripStatusFilter("active")
    }
    style={{
      height: 38,
      padding: "0 14px",
      borderRadius: 999,
      border:
        tripStatusFilter === "active"
          ? "1px solid #2563eb"
          : "1px solid #d1d5db",
      background:
        tripStatusFilter === "active"
          ? "#2563eb"
          : "#ffffff",
      color:
        tripStatusFilter === "active"
          ? "#ffffff"
          : "#374151",
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
      whiteSpace: "nowrap",
    }}
    >
    進行中
  </button>

  {/* 已結束 */}
  <button
    type="button"
    onClick={() =>
      setTripStatusFilter("ended")
    }
     style={{
      height: 38,
      padding: "0 14px",
      borderRadius: 999,
      border:
        tripStatusFilter === "ended"
          ? "1px solid #2563eb"
          : "1px solid #d1d5db",
      background:
        tripStatusFilter === "ended"
          ? "#2563eb"
          : "#ffffff",
      color:
        tripStatusFilter === "ended"
          ? "#ffffff"
          : "#374151",
      fontSize: 14,
      fontWeight: 600,
       cursor: "pointer",
      whiteSpace: "nowrap",
    }}
  >
    已結束
  </button>
</div>

     

      {message && <p>{message}</p>}

      {!message && trips.length === 0 && <p>目前還沒有旅程。</p>}

      {trips.map((trip) => (
{/* =========================================================
    單一旅程卡片
    - 白底
    - 灰色邊框
    - 圓角 14
    - 卡片間距固定
   ========================================================= */}
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      gap: 12,
      alignItems: "flex-start",
      flexWrap: "wrap",
    }}
  >
    <div
      style={{
        minWidth: 0,
        flex: "1 1 260px",
      }}
    >
      <Link
        href={`/trips/${trip.id}`}
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#111827",
          textDecoration: "none",
        }}
      >
        {trip.name}
      </Link>

      <div
        style={{
          marginTop: 12,
          fontSize: 15,
          color: "#374151",
        }}
      >
        地點：{trip.location || "未設定"}
      </div>

      <div
        style={{
          marginTop: 8,
          fontSize: 15,
          color: "#374151",
        }}
      >
        日期：{trip.start_date} ～ {trip.end_date}
      </div>

      {trip.notes && (
        <div
          style={{
            marginTop: 10,
            fontSize: 14,
            lineHeight: 1.6,
            color: "#6b7280",
            whiteSpace: "pre-wrap",
          }}
        >
          {trip.notes}
        </div>
      )}
    </div>

    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          height: 30,
          padding: "0 10px",
          borderRadius: 999,
          background: "#f3f4f6",
          color: "#374151",
          fontSize: 13,
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        旅程
      </span>
    </div>
  </div>
</div>

          {trip.notes && <p>備註：{trip.notes}</p>}
        </div>
      ))}
    </main>
  );
}
