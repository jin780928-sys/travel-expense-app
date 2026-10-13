"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import { useParams } from "next/navigation";

import { supabase } from "../../../lib/supabase";

/* =========================================================
   Type：Trip
   ========================================================= */
type Trip = {
  id: number | string;
  name: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
};

/* =========================================================
   Type：ItineraryItem
   ========================================================= */
type ItineraryItem = {
  id: number | string;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
   title: string;
  location: string | null;
  transportation: string | null;
  notes: string | null;
};

  /* =========================================================
   Type：Expense
   ========================================================= */
type Expense = {
  id: number | string;
  date: string;
  item: string;
  amount: number;
  major_category: string | null;
  category: string | null;
  payment_method: string | null;
  card_name: string | null;
  currency: string | null;
  trip_id: number | string | null;
  notes: string | null;
};

/* =========================================================
   分頁類型
   ========================================================= */
type ActiveTab =
  | "itinerary"
  | "expenses"
  | "stats";

/* =========================================================
   共用格式
   ========================================================= */
function formatAmount(
  amount: number
) {
  return Number(amount || 0).toLocaleString(
    undefined,
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
}

/* =========================================================
   日期顯示格式
   例如：2026-11-04 → 11/04（三）
   ========================================================= */
function formatTripDate(
  dateString: string
) {
  if (dateString === "日期未設定") {
    return dateString;
  }

  const date = new Date(
    `${dateString}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  const weekdays = [
    "日",
    "一",
    "二",
    "三",
    "四",
    "五",
    "六",
  ];

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");


  const weekday =
    weekdays[date.getDay()];

  return `${month}/${day}（${weekday}）`;
}


/* =========================================================
   行程時間顯示格式
   - 09:00:00 → 09:00
   - 09:30:00 → 09:30
   ========================================================= */
function formatItineraryTime(
  timeString: string | null
) {
  if (!timeString) {
    return null;
  }

  return timeString.slice(0, 5);
}

/* =========================================================
   計算旅程天數
   - 起訖日都算一天
   - 例如 11/04 ～ 11/14 = 11 天
   ========================================================= */
function getTripDayCount(
  startDate: string | null,
  endDate: string | null
) {
  if (!startDate || !endDate) {
    return null;
  }

  const start = new Date(
    `${startDate}T00:00:00`
  );

  const end = new Date(
    `${endDate}T00:00:00`
  );


  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end < start
  ) {
    return null;
  }

  const millisecondsPerDay =
    1000 * 60 * 60 * 24;

  const difference =
    end.getTime() - start.getTime();

  return (
    Math.floor(
      difference /
        millisecondsPerDay
    ) + 1
  );
}

/* =========================================================
   計算某日期是旅程 Day 幾
   - 依旅程開始日期計算
   - 例如 11/04 開始：
     11/04 = Day 1
     11/05 = Day 2
     11/06 = Day 3
   ========================================================= */
function getTripDayNumber(
  dateString: string,
  tripStartDate: string | null
) {
  if (
    dateString === "日期未設定" ||
    !tripStartDate
    ) {
    return null;
  }

  const start = new Date(
    `${tripStartDate}T00:00:00`
  );

  const current = new Date(
    `${dateString}T00:00:00`
  );
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(current.getTime())
  ) {
    return null;
  }

  const millisecondsPerDay =
    1000 * 60 * 60 * 24;

  const difference =
    current.getTime() -
    start.getTime();

  const dayNumber =
    Math.floor(
      difference /
        millisecondsPerDay
    ) + 1;

  if (dayNumber < 1) {
    return null;
  }
  return dayNumber;
}

/* =========================================================
   旅程狀態
   - upcoming = 即將出發
   - active   = 進行中
   - ended    = 已結束
   - unknown  = 日期未設定
   ========================================================= */
function getTripStatus(
  startDate: string | null,
  endDate: string | null
) {
  if (!startDate || !endDate) {
    return "unknown";
  }

  const today = new Date();

  const year = today.getFullYear();

  const month = String(
    today.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    today.getDate()
  ).padStart(2, "0");

  const todayString =
    `${year}-${month}-${day}`;

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

/* =========================================================
   旅程狀態文字
   ========================================================= */
function getTripStatusLabel(
  status: string
) {
  if (status === "upcoming") {
    return "即將出發";
  }

  if (status === "active") {
    return "進行中";
  }

  if (status === "ended") {
    return "已結束";
  }

  return "日期未設定";
}

/* =========================================================
   旅程狀態顏色
   ========================================================= */
function getTripStatusStyle(
  status: string
) {
  if (status === "upcoming") {
    return {
      background: "#eff6ff",
      color: "#1d4ed8",
      border: "1px solid #bfdbfe",
    };
  }

  if (status === "active") {
    return {
      background: "#ecfdf5",
      color: "#047857",
      border: "1px solid #a7f3d0",
    };
  }

  if (status === "ended") {
    return {
      background: "#f3f4f6",
      color: "#6b7280",
      border: "1px solid #e5e7eb",
    };
  }

  return {
    background: "#f9fafb",
    color: "#6b7280",
    border: "1px solid #e5e7eb",
  };
}
/* =========================================================
   Trip 詳細頁
   ========================================================= */
export default function TripDetailPage() {
  const params = useParams();

  const rawId = params?.id;

  const id = Array.isArray(rawId)
    ? rawId[0]
    : rawId;

/* =========================================================
     State：旅程
     ========================================================= */
const [
    trip,
    setTrip,
  ] = useState<Trip | null>(null);

/* =========================================================
     State：每日行程
     ========================================================= */
const [
    itineraryItems,
    setItineraryItems,
  ] = useState<ItineraryItem[]>([]);

  /* =========================================================
     State：支出
     ========================================================= */
const [
    expenses,
    setExpenses,
  ] = useState<Expense[]>([]);

/* =========================================================
     State：頁面訊息
     ========================================================= */
const [
    message,
    setMessage,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

/* =========================================================
     State：目前分頁
     ========================================================= */
const [
    activeTab,
    setActiveTab,
  ] = useState<ActiveTab>(
    "itinerary"
  );

  /* =========================================================
   統計分頁內部切換
   - category = 大分類統計
   - payment  = 付款方式統計
   ========================================================= */
  const [
  statsView,
  setStatsView,
] = useState<
  "category" | "payment"
>("category");


  
/* =========================================================
     載入 Trip 詳細資料
     ========================================================= */
async function loadTrip() {
    if (!id) {
      return;
    }

    const {
      data,
      error,
    } = await supabase
      .from("Trips")
      .select(
        `
        id,
        name,
        location,
        start_date,
        end_date,
        notes
        `
      )
      .eq("id", id)
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setTrip(data as Trip);
  }

/* =========================================================
     載入每日行程
     ========================================================= */
 async function loadItinerary() {
    if (!id) {
      return;
    }

    const {
      data,
      error,
    } = await supabase
      .from("ItineraryItems")
      .select(
         `
        id,
        date,
        start_time,
        end_time,
        title,
        location,
        transportation,
        notes
        `
      )
   .eq("trip_id", id)
      .order("date", {
        ascending: true,
      })
      .order("start_time", {
        ascending: true,
      });

    if (error) {
      setMessage(error.message);
      return;
    }

  setItineraryItems(
      (data || []) as ItineraryItem[]
    );
  }


/* =========================================================
     載入旅程支出
     ========================================================= */
async function loadExpenses() {
    if (!id) {
      return;
    }

    const {
      data,
      error,
      } = await supabase
      .from("Expenses")
      .select(
        `
        id,
        date,
        item,
        amount,
        major_category,
        category,
        payment_method,
        card_name,
        currency,
        trip_id,
        notes
        `
      )
      .eq("trip_id", id)
      .order("date", {
        ascending: false,
      });

  if (error) {
      setMessage(error.message);
      return;
    }

    setExpenses(
      (data || []) as Expense[]
    );
  }

 /* =========================================================
     頁面初始化
     ========================================================= */
useEffect(() => {
    if (!id) {
      return;
    }

    async function loadPage() {
      setLoading(true);
      setMessage("");

      await Promise.all([
        loadTrip(),
        loadItinerary(),
        loadExpenses(),
      ]);

      setLoading(false);
    }

    loadPage();
  }, [id]);

/* =========================================================
     刪除每日行程
     ========================================================= */
async function handleDeleteItinerary(
    itineraryId: number | string
  ) {
    const confirmed =
      window.confirm(
        "確定要刪除這筆行程嗎？"
      );

  if (!confirmed) {
      return;
    }

    setMessage("");

    const {
      error,
    } = await supabase
  .from("ItineraryItems")
      .delete()
      .eq("id", itineraryId);

    if (error) {
      setMessage(error.message);
      return;
    }

  setItineraryItems(
      (currentItems) =>
        currentItems.filter(
          (item) =>
            item.id !== itineraryId
        )
    );
  }

 /* =========================================================
     統計：依幣別計算總支出
     ========================================================= */
const totalsByCurrency =
    expenses.reduce<
      Record<string, number>
    >((result, expense) => {
      const currency =
        expense.currency || "USD";

      result[currency] =
        (result[currency] || 0) +
        Number(expense.amount || 0);

      return result;
    }, {});

/* =========================================================
     統計：依分類＋幣別
     ========================================================= */
const categoryTotals =
    expenses.reduce<
      Record<
        string,
        Record<string, number>
      >
    >((result, expense) => {
      const category =
        expense.major_category ||
        expense.category ||
        "其他";

      const currency =
        expense.currency || "USD";

      if (!result[category]) {
        result[category] = {};
      }

      result[category][currency] =
        (result[category][currency] ||
          0) +
        Number(expense.amount || 0);

      return result;
    }, {});

  /* =========================================================
     統計：依付款方式＋幣別
     ========================================================= */
  const paymentMethodTotals =
    expenses.reduce<
      Record<
        string,
        Record<string, number>
      >
    >((result, expense) => {
      const paymentMethod =
          expense.card_name ||
          expense.payment_method ||
          "未設定";

      const currency =
        expense.currency || "USD";

      if (!result[paymentMethod]) {
        result[paymentMethod] = {};
      }
      result[paymentMethod][currency] =
        (result[paymentMethod][currency] ||
          0) +
        Number(expense.amount || 0);

      return result;
    }, {});
  
/* =========================================================
     每日行程：依日期分組
     - 相同日期的行程放在同一組
     - 沒有日期時歸類為「日期未設定」
     ========================================================= */
  const groupedItineraryItems =
    itineraryItems.reduce<
      Record<string, ItineraryItem[]>
    >((result, item) => {
      const dateKey =
        item.date || "日期未設定";

       if (!result[dateKey]) {
        result[dateKey] = [];
      }

      result[dateKey].push(item);

      return result;
      }, {});

   /* =========================================================
     旅程支出：依日期分組
     - 相同日期的支出放在同一組
     ========================================================= */
  const groupedExpenses =
    expenses.reduce<
      Record<string, Expense[]>
    >((result, expense) => {
      const dateKey =
        expense.date || "日期未設定";

      if (!result[dateKey]) {
        result[dateKey] = [];
      }

      result[dateKey].push(expense);

      return result;
    }, {});

  /* =========================================================
     計算單日支出小計
     - 不同幣別分開計算
     ========================================================= */
  function getDailyExpenseTotals(
    dayExpenses: Expense[]
  ) {
    return dayExpenses.reduce<
      Record<string, number>
    >((result, expense) => {
      const currency =
        expense.currency || "USD";

      result[currency] =
        (result[currency] || 0) +
        Number(expense.amount || 0);

      return result;
    }, {});
  }
  
/* =========================================================
     Loading
     ========================================================= */
if (loading) {
    return (
      <main
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: 20,
        }}
      >
        載入中...
      </main>
    );
  }

/* =========================================================
     頁面
     ========================================================= */
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

        {/* =====================================================
          返回我的旅程
         ===================================================== */}

    <Link
        href="/trips"
        style={{
          display: "inline-flex",
          alignItems: "center",
          marginBottom: 16,
          color: "#2563eb",
          fontSize: 14,
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        ← 我的旅程
      </Link>

      {/* =====================================================
          錯誤／提示訊息
         ===================================================== */}
      {message && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            background: "#ffffff",
            border:
              "1px solid #fecaca",
            borderRadius: 10,
            color: "#b91c1c",
            fontSize: 14,
          }}
        >
          {message}
        </div>
      )}

      {/* =====================================================
          找不到 Trip
         ===================================================== */}
      {!trip && (
        <div
          style={{
            background: "#ffffff",
            border:
              "1px solid #e5e7eb",
            borderRadius: 14,
            padding: 18,
            color: "#6b7280",
          }}
        >
          找不到旅程資料
        </div>
      )}

      {/* =====================================================
          Trip 存在
         ===================================================== */}
      {trip && (
        <>

          {/* =================================================
              旅程基本資料卡片
             ================================================= */}
          <div
            style={{
              background: "#ffffff",
              border:
                "1px solid #e5e7eb",
              borderRadius: 14,
              padding: 18,
              marginBottom: 18,
              boxSizing:
                "border-box",
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
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 28,
                    fontWeight: 700,
                    color: "#111827",
                  }}
                >
                  {trip.name}
                </h1>

                <div
                  style={{
                    marginTop: 10,
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
                  {trip.start_date ||
    "未設定"}
  {" ～ "}
  {trip.end_date ||
    "未設定"}

  {getTripDayCount(
    trip.start_date,
    trip.end_date
  ) !== null && (
  <>
      {" · "}
      {getTripDayCount(
        trip.start_date,
        trip.end_date
      )}{" "}
      天
    </>
  )}
</div>
              </div>

{/* =============================================
    右側：旅程狀態 + 編輯
   ============================================= */}
<div
  style={{
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  }}
  >
  {/* ===========================================
      旅程狀態
     =========================================== */}
  <span
    style={{
      ...getTripStatusStyle(
        getTripStatus(
          trip.start_date,
          trip.end_date
        )
      ),
      minHeight: 32,
      padding: "0 10px",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 999,
      fontSize: 13,
      fontWeight: 700,
      whiteSpace: "nowrap",
      boxSizing: "border-box",
    }}
    >
    {getTripStatusLabel(
      getTripStatus(
        trip.start_date,
        trip.end_date
      )
    )}
  </span>

   {/* ===========================================
      編輯旅程
     =========================================== */}
  <Link
    href={`/trips/${trip.id}/edit`}
    style={{
      height: 40,
      padding: "0 14px",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      border:
        "1px solid #d1d5db",
      borderRadius: 10,
      background: "#ffffff",
      color: "#374151",
      textDecoration: "none",
      fontSize: 14,
      fontWeight: 600,
      whiteSpace: "nowrap",
    }}
  >
    編輯旅程
  </Link>
</div>
            </div>
{/* =============================================
    旅程總支出摘要
   ============================================= */}
            {Object.keys(
  totalsByCurrency
).length > 0 && (
  <div
    style={{
      marginTop: 10,
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      alignItems: "center",
    }}
  >
    <span
      style={{
        fontSize: 14,
        color: "#6b7280",
      }}
    >
      總支出：
    </span>

    {Object.entries(
      totalsByCurrency
    ).map(
      ([
        currency,
        amount,
      ]) => (
        <span
          key={currency}
          style={{
            padding: "4px 9px",
            background: "#f9fafb",
            border:
              "1px solid #e5e7eb",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 700,
            color: "#111827",
            whiteSpace: "nowrap",
          }}
        >
          {currency}{" "}
          {formatAmount(
            amount
          )}
        </span>
      )
    )}
  </div>
)}
            {trip.notes && (
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop:
                    "1px solid #f3f4f6",
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: "#6b7280",
                  whiteSpace:
                    "pre-wrap",
                }}
              >
                備註：{trip.notes}
              </div>
            )}
          </div>

          {/* =================================================
              旅程功能分頁
              - 行程
              - 支出
              - 統計
             ================================================= */}
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 18,
            }}
            >
            {/* 行程 */}
            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  "itinerary"
                )
                }
              style={{
                height: 40,
                padding: "0 16px",
                borderRadius: 10,
                border:
                  activeTab ===
                  "itinerary"
                    ? "1px solid #2563eb"
                    : "1px solid #d1d5db",
                background:
                  activeTab ===
                  "itinerary"
                ? "#2563eb"
                    : "#ffffff",
                color:
                  activeTab ===
                  "itinerary"
                    ? "#ffffff"
                    : "#374151",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              行程
            </button>

            {/* 支出 */}
            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  "expenses"
                )
              }
              style={{
                height: 40,
                padding: "0 16px",
                borderRadius: 10,
                border:
                  activeTab ===
                  "expenses"
                 ? "1px solid #2563eb"
                    : "1px solid #d1d5db",
                background:
                  activeTab ===
                  "expenses"
                    ? "#2563eb"
                    : "#ffffff",
                color:
                  activeTab ===
                  "expenses"
                    ? "#ffffff"
                    : "#374151",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
              >
              支出
            </button>

            {/* 統計 */}
            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  "stats"
                )
              }
              style={{
                height: 40,
                padding: "0 16px",
                borderRadius: 10,
                border:
                  activeTab ===
                  "stats"
                    ? "1px solid #2563eb"
                    : "1px solid #d1d5db",
                background:
                  activeTab ===
                  "stats"
                    ? "#2563eb"
                    : "#ffffff",
                color:
                  activeTab ===
                  "stats"
                    ? "#ffffff"
                    : "#374151",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                }}
            >
              統計
            </button>
          </div>

          {/* =================================================
              行程分頁
             ================================================= */}
          {activeTab ===
            "itinerary" && (
            <section
              style={{
                background:
                  "#ffffff",
                border:
                  "1px solid #e5e7eb",
                borderRadius: 14,
                padding: 18,
                marginBottom: 18,
              }}
            >

              {/* =============================================
                  行程標題
                 ============================================= */}
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 16,
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: 20,
                    fontWeight: 700,
                    color: "#111827",
                  }}
                >
                  每日行程
                </h2>

                <Link
                  href={`/trips/${trip.id}/itinerary/new`}
                  style={{
                    height: 40,
                    padding:
                      "0 14px",
                    display:
                      "inline-flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    background:
                      "#2563eb",
                    color:
                      "#ffffff",
                    borderRadius: 10,
                    textDecoration:
                      "none",
                    fontSize: 14,
                    fontWeight: 600,
                    whiteSpace:
                      "nowrap",
                  }}
                >
                  ＋ 新增每日行程
                </Link>
              </div>

              {/* =============================================
                  沒有每日行程
                 ============================================= */}
              {itineraryItems.length ===
              0 ? (
                <div
                  style={{
                    padding:
                      "24px 0",
                    textAlign:
                      "center",
                    color:
                      "#6b7280",
                    fontSize: 14,
                  }}
                >
                  尚未新增每日行程
                </div>
            ) : (
                /* ===========================================
                   每日行程列表：依日期分組
                   =========================================== */
                <div>
                  {Object.entries(
  groupedItineraryItems
)
  .sort(([dateA], [dateB]) => {
  if (dateA === "日期未設定") {
    return 1;
  }

  if (dateB === "日期未設定") {
    return -1;
  }

  return dateA.localeCompare(dateB);
})
                    .map(
  ([
    date,
    items,
  ]) => (
                      <div
                        key={date}
                        style={{
                          marginBottom: 22,
                        }}
                      >
{/* ===================================
    日期標題
    - Day 1 / Day 2
    - 日期
   =================================== */}
                        <div
                          style={{
                          display: "flex",
                           alignItems: "center",
                              gap: 10,
                          flexWrap: "wrap",
                           marginBottom: 12,
                          paddingBottom: 10,
                          borderBottom:
                          "1px solid #e5e7eb",
                          }}
                          >
                       {getTripDayNumber(
  date,
  trip.start_date
) !== null && (
  <div
    style={{
      padding: "4px 9px",
      background: "#eff6ff",
      border:
        "1px solid #bfdbfe",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
      color: "#1d4ed8",
      whiteSpace: "nowrap",
    }}
    >
    Day{" "}
    {getTripDayNumber(
      date,
      trip.start_date
    )}
  </div>
)}

  <div
    style={{
      fontSize: 16,
      fontWeight: 700,
      color: "#111827",
    }}
  >
    {formatTripDate(date)}
  </div>
</div>

                        {/* ===================================
    該日期的行程
    - 依開始時間由早到晚
   =================================== */}
{[...items]
  .sort((a, b) => {
    const timeA =
      a.start_time || "99:99:99";

    const timeB =
      b.start_time || "99:99:99";

    return timeA.localeCompare(
      timeB
    );
  })
  .map(
    (item) => (
      <div
        key={item.id}
        
                              style={{
                                padding:
                                  "14px 0",
                                borderBottom:
                                  "1px solid #f3f4f6",
                              }}
                            >
                              <div
  style={{
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
    flexWrap: "wrap",
  }}
>

  {/* =========================
      左側時間
      ========================= */}
                                <div
    style={{
      width: 90,
      flexShrink: 0,
      fontSize: 14,
      fontWeight: 700,
      color: "#2563eb",
      lineHeight: 1.5,
    }}
                                  >
   {formatItineraryTime(
  item.start_time
) || "未設定"}

    {item.end_time && (
      <>
        <br />
        <span
          style={{
            color: "#6b7280",
            fontWeight: 500,
          }}
        >
           ～{" "}
      {formatItineraryTime(
        item.end_time
      )}
        </span>
      </>
    )}
  </div>

     {/* =========================
      右側行程內容
     ========================= */}
  <div
    style={{
      minWidth: 0,
      flex: "1 1 260px",
    }}
  >

     {/* =========================
        行程標題
       ========================= */}
    <div
      style={{
        fontSize: 16,
        fontWeight: 700,
        color: "#111827",
      }}
      >
      {item.title}
    </div>

{/* =========================
    地點
   ========================= */}
{item.location && (
  <div
    style={{
      marginTop: 6,
      fontSize: 14,
      color: "#374151",
    }}
  >
    地點：
    {item.location}
  </div>
)}

{/* =========================
    交通
   ========================= */}
{item.transportation && (
  <div
    style={{
      marginTop: 6,
      fontSize: 14,
      color: "#374151",
    }}
  >
    交通：
    {item.transportation}
  </div>
)}

{/* =========================
    備註
   ========================= */}
{item.notes && (
  <div
    style={{
      marginTop: 6,
      fontSize: 14,
      lineHeight: 1.6,
      color: "#6b7280",
      whiteSpace: "pre-wrap",
    }}
  >
    備註：
    {item.notes}
  </div>
)}

                                {/* ===========================
                                    編輯 / 刪除
                                   =========================== */}
                                <div
                                  style={{
                                    display:
                                      "flex",
                                    gap: 8,
                                    flexWrap:
                                      "wrap",
                                  }}
                                >
                                  <Link
                                    href={`/trips/${trip.id}/itinerary/${item.id}/edit`}
                                    style={{
                                      height:
                                        36,
                                      padding:
                                        "0 12px",
                                      display:
                                        "inline-flex",
                                      alignItems:
                                        "center",
                                      justifyContent:
                                        "center",
                                      border:
                                        "1px solid #d1d5db",
                                      borderRadius:
                                        8,
                                      background:
                                        "#ffffff",
                                      color:
                                        "#374151",
                                      textDecoration:
                                        "none",
                                      fontSize:
                                        13,
                                      fontWeight:
                                        600,
                                      }}
                                  >
                                    編輯
                                  </Link>


                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteItinerary(
                                        item.id
                                         )
                                    }
                                    style={{
                                      height:
                                        36,
                                      padding:
                                        "0 12px",
                                      border:
                                        "1px solid #fecaca",
                                      borderRadius:
                                        8,
                                      background:
                                        "#ffffff",
                                      color:
                                        "#dc2626",
                                      fontSize:
                                        13,
                                      fontWeight:
                                        600,
                                      cursor:
                                        "pointer",
                                    }}
                                  >
                                    刪除
                                  </button>
                                  </div>
                              </div>
                            </div>
                          )
                        )}
        </div>
                    )
                  )}
                </div>
              )}
            </section>
          )}
                                    
                      
          

           {/* =================================================
              支出分頁
             ================================================= */}
          {activeTab ===
            "expenses" && (
            <section
              style={{
                background:
                  "#ffffff",
                border:
                  "1px solid #e5e7eb",
                borderRadius: 14,
                padding: 18,
                marginBottom: 18,
              }}
            >

              {/* =============================================
                  支出標題
                 ============================================= */}
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 16,
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: 20,
                    fontWeight: 700,
                    color: "#111827",
                  }}
                >
                  支出
                </h2>

                <Link
                  href={`/expenses/new?trip_id=${trip.id}`}
                  style={{
                    height: 40,
                    padding:
                      "0 14px",
                    display:
                      "inline-flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    background:
                       "#2563eb",
                    color:
                      "#ffffff",
                    borderRadius: 10,
                    textDecoration:
                      "none",
                    fontSize: 14,
                    fontWeight: 600,
                    whiteSpace:
                      "nowrap",
                  }}
                >
                  ＋ 新增花費
                </Link>
              </div>

              {/* =============================================
                  旅程支出小計
                 ============================================= */}
              {Object.keys(
              totalsByCurrency
              ).length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "center",
                    marginBottom: 16,
                    padding: 12,
                    background: "#f9fafb",
                    border:
                      "1px solid #e5e7eb",
                    borderRadius: 10,
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#6b7280",
                    }}
                  >
                    支出小計
                  </span>

                  {Object.entries(
                    totalsByCurrency
                  ).map(
                    ([
                      currency,
                      amount,
                    ]) => (
                      <span
                        key={currency}
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "#111827",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {currency}{" "}
                        {formatAmount(
                          amount
                        )}
                        </span>
                    )
                  )}
                </div>
              )}
              
              {/* =============================================
                  沒有支出
                 ============================================= */}
              {expenses.length ===
              0 ? (
                <div
                  style={{
                    padding:
                      "24px 0",
                    textAlign:
                      "center",
                    color:
                      "#6b7280",
                    fontSize: 14,
                  }}
                  >
                  目前沒有旅程支出
                </div>
              ) : (

                /* ===========================================
                   支出列表
                   =========================================== */
                <div>
  {Object.entries(
    groupedExpenses
  ).map(
    ([
      date,
      dayExpenses,
    ]) => (
      <div
        key={date}
        style={{
          marginBottom: 20,
          }}
      >
       {/* ===================================
    支出日期 + 當日小計
   =================================== */}
<div
  style={{
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 8,
    paddingBottom: 8,
    borderBottom:
      "1px solid #e5e7eb",
  }}
  >
  {/* 日期 */}
  <div
    style={{
      fontSize: 15,
      fontWeight: 700,
      color: "#111827",
    }}
  >
    {formatTripDate(date)}
  </div>
  {/* 當日小計 */}
  <div
    style={{
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      justifyContent: "flex-end",
    }}
  >
    {Object.entries(
      getDailyExpenseTotals(
        dayExpenses
      )
    ).map(
      ([
        currency,
        amount,
      ]) => (
        <span
          key={currency}
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#374151",
            whiteSpace: "nowrap",
          }}
        >
          {currency}{" "}
          {formatAmount(amount)}
        </span>
      )
    )}
  </div>
</div>

        {/* ===================================
            當日支出
           =================================== */}
        {dayExpenses.map(
          (expense) => (
            <Link
              key={expense.id}
              href={`/expenses/${expense.id}`}
              style={{
                display: "block",
                padding: "13px 0",
                borderBottom:
                  "1px solid #f3f4f6",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    minWidth: 0,
                    flex: "1 1 220px",
                  }}
                  >
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: "#111827",
                      }}
                  >
                    {expense.item}
                  </div>

                  {(expense.major_category ||
                    expense.category) && (
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 13,
                        color: "#6b7280",
                      }}
                    >
                      分類：
                      {expense.major_category ||
                        expense.category}
                    </div>
                  )}
                  <div
  style={{
    minWidth: 0,
    flex: "1 1 220px",
  }}
>
  <div
    style={{
      fontSize: 15,
      fontWeight: 600,
      color: "#111827",
    }}
  >
    {expense.item}
  </div>

  {(expense.major_category ||
    expense.category) && (
    <div
      style={{
        marginTop: 4,
        fontSize: 13,
        color: "#6b7280",
      }}
      >
      分類：
      {expense.major_category ||
        expense.category}
    </div>
  )}


                    {/* =========================================
      付款方式 / 信用卡
     ========================================= */}
                    {(expense.payment_method ||
    expense.card_name) && (
    <div
      style={{
        marginTop: 4,
        fontSize: 13,
        color: "#6b7280",
      }}
      >
      付款：
      {expense.payment_method ||
        "未設定"}

      {expense.card_name && (
        <>
          {" · "}
          {expense.card_name}
        </>
        )}
    </div>
  )}
</div>


                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#111827",
                    whiteSpace: "nowrap",
                  }}
                  >
                  {expense.currency ||
                    "USD"}{" "}
                  {formatAmount(
                    expense.amount
                  )}
                  </div>
              </div>
            </Link>
          )
        )}
      </div>
    )
  )}
</div>
                         
              )}
            </section>
          )}

          {/* =================================================
              統計分頁
             ================================================= */}
          {activeTab ===
            "stats" && (
            <>

              {/* =============================================
                  總支出
                 ============================================= */}
              <section
                style={{
                  background:
                    "#ffffff",
                  border:
                    "1px solid #e5e7eb",
                  borderRadius: 14,
                  padding: 18,
                  marginBottom: 18,
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: 20,
                    fontWeight: 700,
                    color: "#111827",
                  }}
                  >
                  統計
                </h2>

                <div
                  style={{
                    marginTop: 16,
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#6b7280",
                  }}
                >
                  總支出
                </div>

                {Object.keys(
                  totalsByCurrency
                ).length === 0 ? (
                  <div
                    style={{
                      marginTop: 8,
                      color:
                        "#6b7280",
                      fontSize: 14,
                    }}
                  >
                    尚無支出資料
                    </div>
                ) : (
                  <div
                    style={{
                      marginTop: 8,
                      display:
                        "flex",
                      gap: 12,
                      flexWrap:
                        "wrap",
                    }}
                  >
                    {Object.entries(
                      totalsByCurrency
                    ).map(
                      ([
                        currency,
                        amount,
                        ]) => (
                        <div
                          key={
                            currency
                          }
                          style={{
                             padding:
                              "12px 16px",
                            background:
                              "#f9fafb",
                            border:
                              "1px solid #e5e7eb",
                            borderRadius:
                              10,
                          }}
                        >
                          <div
                            style={{
                              fontSize:
                                12,
                              color:
                                "#6b7280",
                            }}
                          >
                            {
                              currency
                            }
                          </div>

                          <div
                            style={{
                              marginTop:
                                3,
                              fontSize:
                                20,
                              fontWeight:
                                700,
                              color:
                                "#111827",
                            }}
                          >
                            {formatAmount(
                              amount
                            )}
                          </div>
                        </div>
                        )
                    )}
                  </div>
                )}
              </section>

{/* =============================================
    統計類型切換
    - 大分類統計
    - 付款方式統計
   ============================================= */}
              <div
  style={{
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 18,
  }}
>
                <button
    type="button"
    onClick={() =>
      setStatsView("category")
    }
    style={{
      height: 40,
      padding: "0 16px",
      borderRadius: 10,
      border:
        statsView === "category"
          ? "1px solid #2563eb"
          : "1px solid #d1d5db",
      background:
        statsView === "category"
          ? "#2563eb"
          : "#ffffff",
      color:
        statsView === "category"
          ? "#ffffff"
          : "#374151",
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
    }}
  >
    大分類統計
                  </button>

  <button
    type="button"
    onClick={() =>
      setStatsView("payment")
    }
    style={{
      height: 40,
      padding: "0 16px",
      borderRadius: 10,
      border:
        statsView === "payment"
          ? "1px solid #2563eb"
          : "1px solid #d1d5db",
      background:
        statsView === "payment"
          ? "#2563eb"
          : "#ffffff",
      color:
        statsView === "payment"
          ? "#ffffff"
          : "#374151",
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
      }}
  >
    付款方式統計
  </button>
</div>
              {/* =============================================
                  分類統計
                 ============================================= */}
              {statsView === "category" && (
              <section
                style={{
                  background:
                    "#ffffff",
                  border:
                     "1px solid #e5e7eb",
                  borderRadius: 14,
                  padding: 18,
                  marginBottom: 18,
                }}
              >
                <h2
                  style={{
                    margin:
                      "0 0 14px",
                    fontSize: 20,
                    fontWeight: 700,
                    color: "#111827",
                  }}
                  >
                  大分類統計
                </h2>

                {Object.keys(
                  categoryTotals
                ).length === 0 ? (
                <div
                    style={{
                      color:
                        "#6b7280",
                      fontSize: 14,
                    }}
                  >
                  尚無分類資料
                  </div>
                ) : (
                  <div>
                    {Object.entries(
                      categoryTotals
                    ).map(
                    ([
                        category,
                        currencyTotals,
                      ]) => (
                        <div
                          key={
                            category
                          }
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "space-between",
                            alignItems:
                              "flex-start",
                            gap: 12,
                            padding:
                              "11px 0",
                            borderBottom:
                              "1px solid #e5e7eb",
                          }}
                        >
                          <div
                            style={{
                              fontSize:
                                14,
                              fontWeight:
                                600,
                              color:
                                "#374151",
                            }}
                          >
                            {
                              category
                            }
                          </div>

                          <div
                            style={{
                              textAlign:
                                "right",
                            }}
                          >
                            {Object.entries(
                            currencyTotals
                            ).map(
                              ([
                                currency,
                                amount,
                              ]) => (
                                <div
                                  key={
                                    currency
                                  }
                                  style={{
                                    fontSize:
                                      14,
                                    fontWeight:
                                      700,
                                    color:
                                      "#111827",
                                    marginBottom:
                                      3,
                                  }}
                                >
                                  {
                                    currency
                                  }{" "}
                                  {formatAmount(
                                    amount
                                  )}
                                  </div>
                              )
                            )}
                          </div>
                        </div>
                      )
                    )}
                    </div>
                )}
              </section>
              )}
            
              
              {/* =============================================
                  付款方式統計
                 ============================================= */}
          {statsView === "payment" && (
                <section
                  style={{
                    background:
                      "#ffffff",
                    border:
                      "1px solid #e5e7eb",
                    borderRadius: 14,
                    padding: 18,
                    marginBottom: 18,
                  }}
                >
                  <h2
                    style={{
                      margin:
                        "0 0 14px",
                      fontSize: 20,
                      fontWeight: 700,
                      color: "#111827",
                    }}
                  >
                    付款方式統計
                  </h2>

                  {Object.keys(
                    paymentMethodTotals
                  ).length === 0 ? (
                    <div
                      style={{
                        color:
                          "#6b7280",
                        fontSize: 14,
                      }}
                    >
                      尚無付款方式資料
                    </div>
                  ) : (
                  <div>
                      {Object.entries(
                        paymentMethodTotals
                      ).map(
                        ([
                          paymentMethod,
                          currencyTotals,
                        ]) => (
                          <div
                            key={
                              paymentMethod
                            }
                            style={{
                              display:
                                "flex",
                              justifyContent:
                                "space-between",
                              alignItems:
                                "flex-start",
                              gap: 12,
                              padding:
                                "11px 0",
                              borderBottom:
                                "1px solid #e5e7eb",
                            }}
                            >
                            <div
                              style={{
                                fontSize:
                                  14,
                                fontWeight:
                                  600,
                                color:
                                  "#374151",
                              }}
                            >
                              {
                                paymentMethod
                                }
                            </div>

                            <div
                              style={{
                                textAlign:
                                  "right",
                              }}
                              >
                              {Object.entries(
                                currencyTotals
                              ).map(
                                ([
                                  currency,
                                  amount,
                                ]) => (
                                  <div
                                    key={
                                      currency
                                    }
                                    style={{
                                      fontSize:
                                        14,
                                      fontWeight:
                                        700,
                                      color:
                                        "#111827",
                                      marginBottom:
                                        3,
                                      }}
                                  >
                                    {
                                      currency
                                    }{" "}
                                    {formatAmount(
                                      amount
                                    )}
                                  </div>
                                )
                                )}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </section>
  
              )}
              </>
          )}
        </>
      )}
    </main>
  );
}
