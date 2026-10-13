"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

type Expense = {
  id: number;
  date: string | null;
  item: string;
  amount: number | null;
  currency: string | null;
  category: string | null;
};

type ItineraryItem = {
  id: number;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  title: string;
  location: string | null;
  transportation: string | null;
  notes: string | null;
};

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [itineraryItems, setItineraryItems] = useState<ItineraryItem[]>([]);
  const [message, setMessage] = useState("讀取中...");
  // =========================================================
// 旅程詳細頁分頁
// itinerary = 行程
// expenses  = 支出
// stats     = 統計
// =========================================================
  const [
  activeTab,
  setActiveTab,
] = useState<
  "itinerary" | "expenses" | "stats"
>("itinerary");

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

      const { data: expenseData, error: expenseError } = await supabase
        .from("Expenses")
        .select("id,date,item,amount,currency,category")
        .eq("trip_id", id)
        .order("date", { ascending: false });

      const { data: itineraryData, error: itineraryError } = await supabase
        .from("ItineraryItems")
        .select(
          "id,date,start_time,end_time,title,location,transportation,notes"
        )
        .eq("trip_id", id)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) {
        setMessage("讀取旅程失敗：" + error.message);
        return;
      }

      if (expenseError) {
        setMessage("讀取花費失敗：" + expenseError.message);
        return;
      }

      if (itineraryError) {
        setMessage("讀取每日行程失敗：" + itineraryError.message);
        return;
      }

      setTrip(data);
      setExpenses(expenseData ?? []);
      setItineraryItems(itineraryData ?? []);
      setMessage("");
    }

    if (id) {
      loadTrip();
    }
  }, [id]);

  const totalsByCurrency = expenses.reduce<Record<string, number>>(
  (totals, expense) => {
    const currency = expense.currency || "USD";
    const amount = Number(expense.amount || 0);

    totals[currency] = (totals[currency] || 0) + amount;

    return totals;
  },
  {}
);

  const groupedItinerary = itineraryItems.reduce<
    Record<string, ItineraryItem[]>
  >((groups, item) => {
    const dateKey = item.date || "未設定日期";

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }

    groups[dateKey].push(item);

    return groups;
  }, {});

  function formatDateWithWeekday(date: string) {
    if (date === "未設定日期") return date;

    const weekdays = [
      "週日",
      "週一",
      "週二",
      "週三",
      "週四",
      "週五",
      "週六",
    ];

    const parsedDate = new Date(`${date}T00:00:00`);

    return `${date}（${weekdays[parsedDate.getDay()]}）`;
  }

  async function handleDeleteTrip() {
    if (expenses.length > 0) {
      window.alert(
        "這個旅程還有花費紀錄，請先刪除花費後再刪除旅程。"
      );
      return;
    }

    const confirmed = window.confirm("確定要刪除這個旅程嗎？");

    if (!confirmed) return;

    const { error } = await supabase
      .from("Trips")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage("刪除旅程失敗：" + error.message);
      return;
    }

    router.push("/trips");
  }

  async function handleDeleteItinerary(itemId: number) {
    const confirmed = window.confirm("確定要刪除這筆每日行程嗎？");

    if (!confirmed) return;

    const { error } = await supabase
      .from("ItineraryItems")
      .delete()
      .eq("id", itemId)
      .eq("trip_id", id);

    if (error) {
      setMessage("刪除每日行程失敗：" + error.message);
      return;
    }

    setItineraryItems((current) =>
      current.filter((item) => item.id !== itemId)
    );
  }

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
        返回我的旅程
       ========================================================= */}
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
    
    

      {message && <p>{message}</p>}

     {trip && (
  <>
    {/* =========================================================
        旅程基本資料卡片
        - 白底
        - 灰色邊框
        - 圓角 14
        - 顯示名稱、地點、日期、備註
       ========================================================= */}
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        padding: 18,
        marginBottom: 18,
        boxSizing: "border-box",
      }}
    >

      {/* =========================================================
    旅程功能分頁
    - 行程
    - 支出
    - 統計
   ========================================================= */}
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
      setActiveTab("itinerary")
    }
    style={{
      height: 40,
      padding: "0 16px",
      borderRadius: 10,
      border:
        activeTab === "itinerary"
          ? "1px solid #2563eb"
          : "1px solid #d1d5db",
      background:
        activeTab === "itinerary"
          ? "#2563eb"
          : "#ffffff",
      color:
        activeTab === "itinerary"
        ? "#ffffff"
          : "#374151",
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
    }}
  >
    行程
  </button>

        <button
    type="button"
    onClick={() =>
      setActiveTab("expenses")
    }
    style={{
      height: 40,
      padding: "0 16px",
      borderRadius: 10,
      border:
        activeTab === "expenses"
          ? "1px solid #2563eb"
          : "1px solid #d1d5db",
      background:
        activeTab === "expenses"
          ? "#2563eb"
          : "#ffffff",
      color:
        activeTab === "expenses"
          ? "#ffffff"
          : "#374151",
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
    }}
  >
    支出
  </button>

        <button
    type="button"
    onClick={() =>
      setActiveTab("stats")
    }
    style={{
      height: 40,
      padding: "0 16px",
      borderRadius: 10,
      border:
        activeTab === "stats"
          ? "1px solid #2563eb"
          : "1px solid #d1d5db",
      background:
        activeTab === "stats"
          ? "#2563eb"
          : "#ffffff",
      color:
        activeTab === "stats"
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

  {/* =========================================================
    分頁內容區
   ========================================================= */}

{/* 行程 */}
      {activeTab === "itinerary" && (
  <div
    style={{
      background: "#ffffff",
      border: "1px solid #e5e7eb",
      borderRadius: 14,
      padding: 18,
      marginBottom: 18,
      boxSizing: "border-box",
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
      行程
    </h2>

    <div
      style={{
        marginTop: 12,
        fontSize: 14,
        color: "#6b7280",
      }}
    >
      行程內容會放在這裡
    </div>
  </div>
)}

{/* =========================================================
    支出分頁內容
   ========================================================= */}
{activeTab === "expenses" && (
  <>
    <h2>支出</h2>
    
{/* =========================================================
    統計分頁內容
   ========================================================= */}
{activeTab === "stats" && (
  <>
    <h2>統計</h2>
     


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
        {trip.location || "未設定"}
      </div>


      <div
        style={{
          marginTop: 8,
          fontSize: 15,
          color: "#374151",
        }}
      >
        日期：
        {trip.start_date || "未設定"}
        {" ～ "}
        {trip.end_date || "未設定"}
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

          <p style={{ marginTop: 20 }}>
            <Link href={`/trips/${id}/edit`}>
              ✏️ 編輯旅程
            </Link>
          </p>

          <p>
            <Link href={`/trips/${id}/itinerary/new`}>
              ➕ 新增每日行程
            </Link>
          </p>

          <button
            onClick={handleDeleteTrip}
            style={{
              padding: "10px 16px",
              marginTop: 12,
            }}
          >
            刪除這個旅程
          </button>

          <hr style={{ margin: "30px 0" }} />

          <h2>每日行程</h2>

          {itineraryItems.length === 0 ? (
            <p>目前還沒有每日行程。</p>
          ) : (
            Object.entries(groupedItinerary).map(([date, items]) => (
              <section key={date} style={{ marginBottom: 32 }}>
                <h3>{formatDateWithWeekday(date)}</h3>

                {items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      border: "1px solid #ccc",
                      padding: 14,
                      borderRadius: 8,
                      marginBottom: 10,
                    }}
                  >
                    <strong>{item.title}</strong>

                    <p>
                      時間：{item.start_time || "未設定"}
                      {" ～ "}
                      {item.end_time || "未設定"}
                    </p>

                    {item.location && (
                      <p>地點：{item.location}</p>
                    )}

                    {item.transportation && (
                      <p>交通：{item.transportation}</p>
                    )}

                    {item.notes && (
                      <p>備註：{item.notes}</p>
                    )}

                    <p style={{ marginTop: 12 }}>
                      <Link
                        href={`/trips/${id}/itinerary/${item.id}/edit`}
                      >
                        ✏️ 編輯這筆行程
                      </Link>
                    </p>

                    <button
                      onClick={() =>
                        handleDeleteItinerary(item.id)
                      }
                      style={{
                        padding: "8px 12px",
                        marginTop: 4,
                      }}
                    >
                      刪除這筆行程
                    </button>
                  </div>
                ))}
              </section>
            ))
          )}

          <hr style={{ margin: "30px 0" }} />

          <p>
            <Link href={`/expenses/new?trip_id=${trip.id}`}>
              ➕ 新增這趟旅程的花費
            </Link>
          </p>

          <h2>這趟旅程的花費</h2>

          <div>
  <strong>總花費：</strong>

  {Object.keys(totalsByCurrency).length === 0 ? (
    <span>目前沒有花費</span>
  ) : (
    Object.entries(totalsByCurrency).map(([currency, total]) => (
      <p key={currency}>
        {currency} {total.toFixed(2)}
      </p>
    ))
  )}
</div>

          {expenses.length === 0 ? (
            <p>目前還沒有花費紀錄。</p>
          ) : (
            expenses.map((expense) => (
              <div
                key={expense.id}
                style={{
                  border: "1px solid #ccc",
                  padding: 14,
                  borderRadius: 8,
                  marginBottom: 10,
                }}
              >
                <strong>{expense.item}</strong>

                <p>
                  金額：{expense.currency || "USD"}{" "}
                  {expense.amount ?? 0}
                </p>

                <p>
                  日期：{expense.date || "未設定"}
                </p>

                {expense.category && (
                  <p>分類：{expense.category}</p>
                )}
              </div>
            ))
          )}
        </>
      )}
    </main>
  );
}
