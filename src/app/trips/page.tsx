"use client";

import {useEffect,  useState,} from "react";
import Link from "next/link";
import AppNavigation from "../../components/AppNavigation";
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

// =========================================================
// 旅程狀態標籤樣式
// upcoming = 藍色
// active   = 綠色
// ended    = 灰色
// =========================================================
function getTripStatusStyle(
  status:
    | "upcoming"
    | "active"
    | "ended"
) {
  if (status === "upcoming") {
    return {
      background: "#eff6ff",
      color: "#1d4ed8",
      border:
        "1px solid #bfdbfe",
    };
  }

  if (status === "active") {
    return {
      background: "#ecfdf5",
      color: "#047857",
      border:
        "1px solid #a7f3d0",
    };
  }

  return {
    background: "#f3f4f6",
    color: "#6b7280",
    border:
      "1px solid #e5e7eb",
  };
}

// =========================================================
// 旅程狀態中文名稱
// =========================================================
function getTripStatusLabel(
  status:
    | "upcoming"
    | "active"
    | "ended"
) {
  if (status === "upcoming") {
    return "即將出發";
  }

  if (status === "active") {
    return "進行中";
  }

  return "已結束";
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

  // =========================================================
// 旅程排序
// - 未結束旅程：開始日期較近的排前面
// - 已結束旅程：最近結束的排前面
// - 已結束旅程排在未來 / 進行中旅程後面
// =========================================================
const sortedTrips = [
  ...filteredTrips,
].sort((a, b) => {
  const aStatus =
    getTripStatus(
      a.start_date,
      a.end_date
    );

  const bStatus =
    getTripStatus(
      b.start_date,
      b.end_date
    );


   if (
    aStatus === "ended" &&
    bStatus === "ended"
  ) {
    return b.end_date.localeCompare(
      a.end_date
    );
  }

  if (aStatus === "ended") {
    return 1;
  }

  if (bStatus === "ended") {
    return -1;
  }

  return a.start_date.localeCompare(
    b.start_date
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

    {/* =========================================
    共用頂部導覽列
   ========================================= */}
<AppNavigation />

    
    
{/* =========================================
    我的旅程：統一標題與新增按鈕
   ========================================= */}

<div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 24,
    padding: "20px 24px",
    background: "#faf7f2",
    border: "1px solid #e6dcd0",
    borderRadius: 16,
    boxSizing: "border-box",
    width: "100%",
  }}
>
  {/* 左側：標題與說明 */}
  <div
    style={{
      flex: "1 1 220px",
      minWidth: 0,
    }}
  >
    <h1
      style={{
        margin: 0,
        fontSize: "clamp(24px, 4vw, 30px)",
        fontWeight: 800,
        lineHeight: 1.3,
        color: "#49392f",
      }}
    >
      我的旅程
    </h1>

    <div
      style={{
        marginTop: 8,
        fontSize: 14,
        lineHeight: 1.6,
        color: "#927f70",
      }}
    >
      管理旅程與旅遊支出
    </div>
  </div>

  {/* 右側：新增旅程 */}
  <Link
    href="/trips/new"
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      height: 44,
      padding: "0 20px",
      boxSizing: "border-box",
      background: "#826349",
      color: "#ffffff",
      border: "1px solid #826349",
      borderRadius: 12,
      textDecoration: "none",
      fontSize: 14,
      fontWeight: 700,
      whiteSpace: "nowrap",
      flexShrink: 0,
      cursor: "pointer",
    }}
  >
    ＋ 新增旅程
  </Link>
</div>



    {/* =====================================================
        旅程狀態篩選區
       ===================================================== */}
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 18,
      }}
    >
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

{/* =========================================================
    旅程卡片清單
    - 每一筆旅程使用相同卡片版型
    - 白底、灰色邊框、圓角 14
    - 顯示名稱、地點、日期、備註
   ========================================================= */}     

    {/* =========================================================
        沒有旅程
       ========================================================= */}
      {!message &&
      sortedTrips.length === 0 && (
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: 24,
            color: "#6b7280",
            fontSize: 14,
            textAlign: "center",
          }}
        >
          {tripStatusFilter === "all"
            ? "目前沒有旅程"
            : "這個分類目前沒有旅程"}
        </div>
      )}

     {/* =========================================================
        旅程卡片
       ========================================================= */}


{sortedTrips.map((trip) => {
      const status =
        getTripStatus(
          trip.start_date,
          trip.end_date
        );

  const statusStyle =
        getTripStatusStyle(status);

      return (
        <div
          key={trip.id}
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: 18,
            marginBottom: 14,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems:
                "flex-start",
              gap: 12,
              flexWrap: "wrap",
              }}
          >
            {/* 左側資料 */}
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
                地點：
                {trip.location ||
                  "未設定"}
              </div>

              <div
                style={{
                  marginTop: 8,
                  fontSize: 15,
                  color: "#374151",
                }}
              >
                日期：
                {trip.start_date} ～{" "}
                {trip.end_date}
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
                  備註：{trip.notes}
                </div>
              )}
            </div>


            {/* 右側狀態 */}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 30,
                padding: "0 10px",
                borderRadius: 999,
                background:
                  statusStyle.background,
                color:
                  statusStyle.color,
                border:
                  statusStyle.border,
                fontSize: 13,
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {getTripStatusLabel(
              status
              )}
            </span>
          </div>

          {/* 查看旅程 */}
          <div
            style={{
              marginTop: 16,
              paddingTop: 14,
              borderTop:
                "1px solid #f3f4f6",
              display: "flex",
              justifyContent:
                "flex-end",
              }}
          >
            <Link
              href={`/trips/${trip.id}`}
              style={{
                color: "#2563eb",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              查看旅程 →
              </Link>
          </div>
        </div>
      );
    })}
  </main>
);
}
