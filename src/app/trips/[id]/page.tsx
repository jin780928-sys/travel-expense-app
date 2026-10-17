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


/* =========================================
   每日行程整合：統一資料格式
   ========================================= */

type UnifiedItineraryItem = {
  key: string;

  source:
    | "manual"
    | "flight"
    | "hotel"
    | "carRental"
    | "booking";

  sourceId: string | number;

  date: string;
  start_time: string | null;
  end_time: string | null;

  title: string;
  location: string | null;
  transportation: string | null;
  notes: string | null;

  eventType?: string;
  timezone?: string | null;
};


/* =========================================
   每日行程整合：UTC → 指定當地時區
   適用 Supabase timestamptz
   ========================================= */

function getLocalItineraryDateTime(
  value: string | null | undefined,
  timezone: string | null | undefined
): {
  date: string;
  time: string | null;
} {
  if (!value) {
    return {
      date: "",
      time: null,
    };
  }

  // 沒有指定時區時，不擅自使用瀏覽器時區
  if (!timezone) {
    return {
      date: "",
      time: null,
    };
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      date: "",
      time: null,
    };
  }

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);

    const getPart = (type: string) =>
      parts.find((part) => part.type === type)?.value || "";

    const year = getPart("year");
    const month = getPart("month");
    const day = getPart("day");
    const hour = getPart("hour");
    const minute = getPart("minute");

    if (!year || !month || !day || !hour || !minute) {
      return {
        date: "",
        time: null,
      };
    }

    return {
      date: `${year}-${month}-${day}`,
      time: `${hour}:${minute}`,
    };
  } catch (error) {
    console.error("行程時區轉換失敗：", error);

    return {
      date: "",
      time: null,
    };
  }
}


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


/* =========================================
   Type：旅程飯店
   ========================================= */

type TripHotel = {
  id: number;
  trip_id: number;
  hotel_name: string;
  check_in: string | null;
  check_out: string | null;
  address: string | null;
  room_type: string | null;
  confirmation_number: string | null;
  booking_platform: string | null;
  amount: number | null;
  currency: string | null;
  payment_status: string | null;
  booking_url: string | null;
  notes: string | null;
};


/* =========================================
   Type：旅程機票
   ========================================= */

type TripFlight = {
  id: number;
  trip_id: number;
  airline: string | null;
  flight_number: string | null;
  departure_airport: string | null;
  arrival_airport: string | null;
  departure_at: string | null;
  arrival_at: string | null;
  departure_timezone: string | null;
  arrival_timezone: string | null;
  confirmation_number: string | null;
  cabin_class: string | null;
  baggage_allowance: string | null;
  amount: number | null;
  currency: string;
  payment_status: string;
  flight_direction: "outbound" | "return" | "other";
  booking_platform: string | null;
  booking_url: string | null;
  notes: string | null;
};


/* =========================================
   Type：旅程租車
   ========================================= */

type TripCarRental = {
  id: number;
  trip_id: number;
  user_id: string;

  rental_company: string | null;
  confirmation_number: string | null;

  vehicle_type: string | null;
  vehicle_class: string | null;

  pickup_location: string | null;
  pickup_at: string | null;
  pickup_timezone: string | null;

  dropoff_location: string | null;
  dropoff_at: string | null;
  dropoff_timezone: string | null;

  amount: number | null;
  currency: string;
  payment_status: "unpaid" | "paid" | "partial";

  booking_platform: string | null;
  booking_url: string | null;
  notes: string | null;

  created_at: string;
};


/* =========================================
   Type：旅程預約行程
   ========================================= */

type TripBooking = {
  id: number;
  trip_id: number;
  user_id: string;

  booking_type:
    | "attraction"
    | "restaurant"
    | "tour"
    | "activity"
    | "experience"
    | "other";

  name: string;
  confirmation_number: string | null;
  booking_platform: string | null;

  start_at: string | null;
  end_at: string | null;
  timezone: string | null;

  location: string | null;
  meeting_point: string | null;
  participants: number | null;

  amount: number | null;
  currency: string;
  payment_status: "unpaid" | "paid" | "partial";

  booking_url: string | null;
  notes: string | null;
  created_at: string;
};


/* =========================================
   Type：旅程行李清單
   ========================================= */

type TripPackingItem = {
  id: number;
  trip_id: number;
  user_id: string;

  name: string;
  category: string;
  quantity: number;
  notes: string | null;

  person_id: number | null;
  is_packed: boolean;
  sort_order: number;

  created_at: string;
  updated_at: string;
};


/* =========================================
   Type：旅程備註
   ========================================= */

type TripNote = {
  id: number;
  trip_id: number;
  user_id: string;

  title: string;
  category: string;
  content: string;

  is_important: boolean;
  sort_order: number;

  created_at: string;
  updated_at: string;
};


/* =========================================
   Type：行李清單使用的人員
   ========================================= */

type PackingPerson = {
  id: number;
  name: string;
};

/* =========================================
   機票航段資料型別
   ========================================= */

type TripFlightSegment = {
  id: number;
  flight_id: number;
  segment_order: number;
  airline: string | null;
  flight_number: string | null;
  departure_airport: string | null;
  arrival_airport: string | null;
  departure_at: string | null;
  arrival_at: string | null;
  departure_timezone: string | null;
  arrival_timezone: string | null;
  departure_terminal: string | null;
  arrival_terminal: string | null;
  departure_gate: string | null;
  seat_number: string | null;
  cabin_class: string | null;
  baggage_allowance: string | null;
  notes: string | null;
};



/* =========================================
   旅程分頁類型
   ========================================= */

type ActiveTab =
  | "itinerary"     // 行程
  | "expenses"      // 支出
  | "stats"         // 統計
  | "hotels"        // 飯店
  | "flights"       // 機票
  | "carRentals"    // 租車
  | "bookings"      // 預約行程
  | "packing"       // 打包清單
  | "notes";        // 備註


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
      background: "#f2ebe2",
      color: "#826349",
      border: "1px solid #e6dcd0",
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

/* =========================================
   機票：顯示機場當地日期時間
   UTC → 指定機場時區
   ========================================= */

function formatFlightDateTime(
  utcDateTime: string | null,
  timeZone: string | null
): string {
  if (!utcDateTime) {
    return "未設定";
  }

  if (!timeZone) {
    return "時區未設定";
  }

  const date = new Date(utcDateTime);

  if (Number.isNaN(date.getTime())) {
    return "日期格式錯誤";
  }

  try {
    return new Intl.DateTimeFormat("zh-TW", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(date);
  } catch {
    return "時區設定錯誤";
  }
}



/* =========================================
   計算飛行時間
   使用 UTC 時間差，避免時區影響
   ========================================= */

function formatFlightDuration(
  departureAt: string | null,
  arrivalAt: string | null
): string {
  if (!departureAt || !arrivalAt) {
    return "時間未設定";
  }

  const start = new Date(departureAt).getTime();
  const end = new Date(arrivalAt).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return "時間格式錯誤";
  }

  const totalMinutes = Math.round(
    (end - start) / 60000
  );

  if (totalMinutes <= 0) {
    return "時間設定錯誤";
  }

  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];

  if (days > 0) parts.push(`${days} 天`);
  if (hours > 0) parts.push(`${hours} 小時`);
  if (minutes > 0) parts.push(`${minutes} 分鐘`);

  return parts.join(" ") || "0 分鐘";
}

/* =========================================
   計算兩個 UTC 時間之間的時長
   可用於飛行、轉機及總旅行時間
   ========================================= */

function formatFlightTimeDifference(
  startAt: string | null,
  endAt: string | null
): string {
  if (!startAt || !endAt) {
    return "時間未設定";
  }

  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return "時間格式錯誤";
  }

  const totalMinutes = Math.round(
    (end - start) / 60000
  );

  if (totalMinutes < 0) {
    return "時間設定錯誤";
  }

  if (totalMinutes === 0) {
    return "0 分鐘";
  }

  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];

  if (days > 0) parts.push(`${days} 天`);
  if (hours > 0) parts.push(`${hours} 小時`);
  if (minutes > 0) parts.push(`${minutes} 分鐘`);

  return parts.join(" ");
}



/* =========================================================
   Trip 詳細頁
   ========================================================= */
export default function TripDetailPage() {
  
/* =========================================
   機票：機場當地時間轉換為 UTC
   支援 IANA 時區與夏令時間
   ========================================= */

function flightLocalTimeToUTC(
  localDateTime: string,
  timeZone: string
): string | null {
  if (!localDateTime) return null;

  if (!timeZone) {
    throw new Error("請選擇航班時區");
  }

  const parts = localDateTime.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/
  );

  if (!parts) {
    throw new Error("航班日期時間格式不正確");
  }

  const [, y, mo, d, h, mi] = parts;

  const target = Date.UTC(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi)
  );

  const formatter = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }
  );

  const getLocalParts = (timestamp: number) => {
    const values = Object.fromEntries(
      formatter
        .formatToParts(new Date(timestamp))
        .map((part) => [part.type, part.value])
    );

    return Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute)
    );
  };

  // 搜尋可能的 UTC 偏移，
  // 正確處理夏令時間轉換
  const matches: number[] = [];

  for (let offset = -14 * 60; offset <= 14 * 60; offset += 15) {
    const candidate =
      target - offset * 60 * 1000;

    if (getLocalParts(candidate) === target) {
      matches.push(candidate);
    }
  }

  if (matches.length === 0) {
    throw new Error(
      "此當地時間不存在，請檢查夏令時間切換日期"
    );
  }

  
/* =========================================
   夏令時間結束：重複的當地時間
   ========================================= */

if (matches.length > 1) {
  throw new Error(
    `當地時間 ${localDateTime} 在 ${timeZone} 因夏令時間結束而出現兩次，無法唯一判定 UTC 時刻。請確認正確的 UTC 偏移後再儲存。`
  );
}

return new Date(matches[0]).toISOString();

}

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

// =========================================
// 旅程分頁控制
// 支援從新增花費返回支出分頁
// =========================================

const [
  activeTab,
  setActiveTab,
] = useState<ActiveTab>(
  "itinerary"
);

  useEffect(() => {
  const params = new URLSearchParams(
    window.location.search
  );

  if (params.get("tab") === "expenses") {
    setActiveTab("expenses");
  }
}, []);

  /* =========================================
   飯店表單開關
   ========================================= */

const [showHotelForm, setShowHotelForm] =
  useState(false);


/* =========================================
   每日行程：跳轉至資料來源分頁
   ========================================= */

const goToItinerarySource = (
  source: UnifiedItineraryItem["source"]
) => {
  const tabMap: Record<
    "flight" | "hotel" | "carRental" | "booking",
    ActiveTab
  > = {
    flight: "flights",
    hotel: "hotels",
    carRental: "carRentals",
    booking: "bookings",
  };

  if (source === "manual") {
    return;
  }

  setActiveTab(tabMap[source]);

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};

/* =========================================
   已儲存的飯店列表
   ========================================= */

const [hotels, setHotels] =
  useState<TripHotel[]>([]);

const [loadingHotels, setLoadingHotels] =
  useState(false);


/* =========================================
   State：機票管理
   ========================================= */

// 已儲存的機票列表
const [flights, setFlights] =
  useState<TripFlight[]>([]);

/* =========================================
   各張機票對應的航段
   ========================================= */

const [flightSegmentsByFlight, setFlightSegmentsByFlight] =
  useState<Record<number, TripFlightSegment[]>>({});

const [loadingFlightSegments, setLoadingFlightSegments] =
  useState(false);


// 是否正在讀取機票
const [loadingFlights, setLoadingFlights] =
  useState(false);


/* =========================================
   租車管理 State
   ========================================= */

// 已建立的租車資料
const [carRentals, setCarRentals] =
  useState<TripCarRental[]>([]);


/* =========================================
   預約行程 State
   ========================================= */

const [tripBookings, setTripBookings] =
  useState<TripBooking[]>([]);


/* =========================================
   行李清單 State
   ========================================= */

const [packingItems, setPackingItems] =
  useState<TripPackingItem[]>([]);


/* =========================================
   旅程備註 State
   ========================================= */

const [tripNotes, setTripNotes] =
  useState<TripNote[]>([]);

const [loadingTripNotes, setLoadingTripNotes] =
  useState(false);

const [showTripNoteForm, setShowTripNoteForm] =
  useState(false);

const [editingTripNoteId, setEditingTripNoteId] =
  useState<number | null>(null);

const [savingTripNote, setSavingTripNote] =
  useState(false);

/* =========================================
   旅程備註表單
   ========================================= */

const [tripNoteForm, setTripNoteForm] = useState({
  title: "",
  category: "general",
  content: "",
  is_important: false,
});

const updateTripNoteField = (
  field: "title" | "category" | "content",
  value: string
) => {
  setTripNoteForm((prev) => ({
    ...prev,
    [field]: value,
  }));
};


/* =========================================
   1. 重設備註表單
   ========================================= */

const resetTripNoteForm = () => {
  setTripNoteForm({
    title: "",
    category: "general",
    content: "",
    is_important: false,
  });

  setEditingTripNoteId(null);
};

/* =========================================
   2. 編輯備註：帶入原本資料
   ========================================= */

const startEditTripNote = (note: TripNote) => {
  if (savingTripNote) return;

  setEditingTripNoteId(note.id);

  setTripNoteForm({
    title: note.title || "",
    category: note.category || "general",
    content: note.content || "",
    is_important: note.is_important,
  });

  setShowTripNoteForm(true);
};

/* =========================================
   3. 新增或更新備註
   ========================================= */

const saveTripNote = async () => {
  if (savingTripNote) return;

  const tripId = Number(id);

  if (!Number.isSafeInteger(tripId) || tripId <= 0) {
    alert("找不到有效的旅程 ID");
    return;
  }

  if (!tripNoteForm.title.trim()) {
    alert("請輸入備註標題");
    return;
  }

  setSavingTripNote(true);

  const isEditing = editingTripNoteId !== null;

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("請先登入");
    }

    const noteData = {
      title: tripNoteForm.title.trim(),
      category: tripNoteForm.category || "general",
      content: tripNoteForm.content.trim(),
      is_important: tripNoteForm.is_important,
      updated_at: new Date().toISOString(),
    };

    if (isEditing) {
      const { data, error } = await supabase
        .from("TripNotes")
        .update(noteData)
        .eq("id", editingTripNoteId)
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .select("id");

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("找不到可更新的備註資料");
      }
    } else {
      const { data, error } = await supabase
        .from("TripNotes")
        .insert({
          ...noteData,
          trip_id: tripId,
          user_id: user.id,
          sort_order: tripNotes.length,
        })
        .select("id");

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("新增備註失敗");
      }
    }

    await loadTripNotes();

    resetTripNoteForm();
    setShowTripNoteForm(false);

    alert(
      isEditing
        ? "備註更新成功！"
        : "備註新增成功！"
    );
  } catch (error) {
    console.error("儲存備註失敗：", error);

    alert(
      error instanceof Error
        ? `儲存失敗：${error.message}`
        : "儲存備註失敗"
    );
  } finally {
    setSavingTripNote(false);
  }
};

/* =========================================
   4. 刪除備註
   ========================================= */

const deleteTripNote = async (note: TripNote) => {
  if (savingTripNote) return;

  const confirmed = window.confirm(
    `確定刪除「${note.title}」嗎？\n刪除後無法復原。`
  );

  if (!confirmed) return;

  const tripId = Number(id);

  if (!Number.isSafeInteger(tripId) || tripId <= 0) {
    alert("找不到有效的旅程 ID");
    return;
  }

  setSavingTripNote(true);

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("請先登入");
    }

    const { data, error } = await supabase
      .from("TripNotes")
      .delete()
      .eq("id", note.id)
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .select("id");

    if (error) throw error;

    if (!data || data.length === 0) {
      throw new Error("找不到可刪除的備註資料");
    }

    if (editingTripNoteId === note.id) {
      resetTripNoteForm();
      setShowTripNoteForm(false);
    }

    await loadTripNotes();

    alert("備註已刪除！");
  } catch (error) {
    console.error("刪除備註失敗：", error);

    alert(
      error instanceof Error
        ? `刪除失敗：${error.message}`
        : "刪除備註失敗"
    );
  } finally {
    setSavingTripNote(false);
  }
};

/* =========================================
   5. 切換重要備註標記
   ========================================= */

const toggleTripNoteImportant = async (note: TripNote) => {
  if (savingTripNote) return;

  const tripId = Number(id);

  if (!Number.isSafeInteger(tripId) || tripId <= 0) {
    alert("找不到有效的旅程 ID");
    return;
  }

  setSavingTripNote(true);

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("請先登入");
    }

    const { data, error } = await supabase
      .from("TripNotes")
      .update({
        is_important: !note.is_important,
        updated_at: new Date().toISOString(),
      })
      .eq("id", note.id)
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .select("id");

    if (error) throw error;

    if (!data || data.length === 0) {
      throw new Error("找不到可更新的備註資料");
    }

    await loadTripNotes();
  } catch (error) {
    console.error("更新重要備註失敗：", error);

    alert(
      error instanceof Error
        ? `更新失敗：${error.message}`
        : "更新重要備註失敗"
    );
  } finally {
    setSavingTripNote(false);
  }
};


  
/* =========================================
   行李清單篩選條件
   ========================================= */

const [packingPersonFilter, setPackingPersonFilter] =
  useState("all");


/* =========================================
   打包清單：個人／共用快速篩選
   ========================================= */
const [packingScopeFilter, setPackingScopeFilter] =
  useState<"all" | "personal" | "shared">("all");


const [packingCategoryFilter, setPackingCategoryFilter] =
  useState("all");

const [packingStatusFilter, setPackingStatusFilter] =
  useState("all");


/* =========================================
   行李清單顯示方式
   ========================================= */

const [packingGroupBy, setPackingGroupBy] =
  useState<"none" | "category" | "person">("none");


/* 行李關鍵字搜尋 */
const [packingSearch, setPackingSearch] = useState("");


/* =========================================
   行李排序
   ========================================= */

const [packingSort, setPackingSort] = useState<
  "default" | "name" | "unpacked" | "packed"
>("default");



/* =========================================
   行李清單：篩選結果
   ========================================= */
const [packingPeople, setPackingPeople] =
  useState<PackingPerson[]>([]);

const [loadingPackingPeople, setLoadingPackingPeople] =
  useState(false);
  
const filteredPackingItems = packingItems.filter((item) => {
  const matchPerson =
    packingPersonFilter === "all" ||
    (packingPersonFilter === "shared"
      ? item.person_id === null
      : item.person_id === Number(packingPersonFilter));

  const matchCategory =
    packingCategoryFilter === "all" ||
    item.category === packingCategoryFilter;

  const matchStatus =
    packingStatusFilter === "all" ||
    (packingStatusFilter === "packed"
      ? item.is_packed
      : !item.is_packed);

  const keyword = packingSearch.trim().toLowerCase();

  const matchSearch =
    keyword === "" ||
    item.name.toLowerCase().includes(keyword) ||
    (item.notes || "").toLowerCase().includes(keyword);

  
const matchScope =
  packingScopeFilter === "all" ||
  (packingScopeFilter === "personal"
    ? item.person_id !== null
    : item.person_id === null);

return (
  matchScope &&
  matchPerson &&
  matchCategory &&
  matchStatus &&
  matchSearch
);

});


/* =========================================
   統一編輯 / 刪除按鈕樣式
   ========================================= */

const editActionButtonStyle = {
  width: 80,
  height: 34,
  padding: "0 8px",
  border: "1px solid #d8c6b4",
  borderRadius: 8,
  background: "#ffffff",
  color: "#674b39",
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: "nowrap" as const,
  cursor: "pointer",
};

/* =========================================
   每日行程：來源編輯按鈕專用樣式
   ========================================= */

const itinerarySourceEditButtonStyle = {
  ...editActionButtonStyle,
  width: "auto",
  minWidth: 0,
  height: 34,
  padding: "0 12px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box" as const,
  flexShrink: 0,
  whiteSpace: "nowrap" as const,
  textDecoration: "none",
};

const deleteActionButtonStyle = {
  ...editActionButtonStyle,
  border: "1px solid #e7c9c3",
  background: "#fff7f5",
  color: "#b4534b",
};

/* =========================================
   行李清單：分類名稱
   支援舊版分類與系統預設範本
   ========================================= */

const packingCategoryNames: Record<string, string> = {
  // =====================================
  // 舊版分類：保留既有資料
  // =====================================
  documents: "🪪 證件",
  clothing: "👕 衣物",
  toiletries: "🧴 盥洗用品",
  electronics: "🔌 電子產品",
  medicine: "💊 藥品",
  other: "📦 其他",

  // =====================================
  // 個人用品：9 個分類
  // =====================================
  "template:personal:personal_bag_documents":
    "💳 隨身背包－證件與財物",

  "template:personal:personal_bag_daily":
    "🪪 隨身背包－日常用品",

  "template:personal:clothing":
    "👕 衣物",

  "template:personal:shoes_accessories":
    "👟 鞋子與配件",

  "template:personal:toiletries":
    "🧴 盥洗與保養",

  "template:personal:special_items":
    "💄 特殊用品",

  "template:personal:electronics":
    "🔌 3C 電子用品",

  "template:personal:travel_items":
    "🧳 旅行用品",

  "template:personal:other":
    "📦 其他",

  // =====================================
  // 共用用品：4 個分類
  // =====================================
  "template:shared:toiletries":
    "🧴 盥洗與保養",

  "template:shared:special_items":
    "💄 特殊用品",

  "template:shared:medicine":
    "💊 藥品與保健品",

  "template:shared:other":
    "📦 其他",
};



/* =========================================
   行李清單：排序
   預設依 sort_order 排列
   ========================================= */

const sortedPackingItems = [...filteredPackingItems].sort(
  (a, b) => {
    if (packingSort === "name") {
      return a.name.localeCompare(b.name, "zh-Hant");
    }

    if (packingSort === "unpacked") {
      return (
        Number(a.is_packed) - Number(b.is_packed) ||
        a.sort_order - b.sort_order ||
        a.id - b.id
      );
    }

    if (packingSort === "packed") {
      return (
        Number(b.is_packed) - Number(a.is_packed) ||
        a.sort_order - b.sort_order ||
        a.id - b.id
      );
    }

    return (
      a.sort_order - b.sort_order ||
      a.id - b.id
    );
  }
);


/* =========================================
   行李清單：分組結果
   ========================================= */

const packingGroups = sortedPackingItems.reduce<
  Record<string, TripPackingItem[]>
>((groups, item) => {
  let groupName = "全部行李";

  
if (packingGroupBy === "category") {
  const categoryLabel =
    packingCategoryNames[item.category] ||
    item.category ||
    "📦 其他";

  if (item.category.startsWith("template:personal:")) {
    groupName = `👤 個人用品｜${categoryLabel}`;
  } else if (
    item.category.startsWith("template:shared:")
  ) {
    groupName = `👥 共用用品｜${categoryLabel}`;
  } else {
    groupName = `📂 原有分類｜${categoryLabel}`;
  }
}


  if (packingGroupBy === "person") {
    groupName =
      item.person_id === null
        ? "👥 共用行李"
        : "👤 " +
          (packingPeople.find(
            (person) => person.id === item.person_id
          )?.name || "未找到人員");
  }

  if (!groups[groupName]) {
    groups[groupName] = [];
  }

  groups[groupName].push(item);

  return groups;
}, {});



/* =========================================
   行李清單：分組排序
   依人員：個人優先，共用最後
   依分類：個人 → 共用 → 原有分類
   ========================================= */


/* =========================================
   行李清單：安全分組排序
   ========================================= */

const sortedPackingGroups = Object.entries(
  packingGroups
).sort(([groupA], [groupB]) => {
  // 依人員分組：共用行李最後
  if (packingGroupBy === "person") {
    const sharedName = "👥 共用行李";

    if (groupA === sharedName) return 1;
    if (groupB === sharedName) return -1;

    return groupA.localeCompare(groupB, "zh-Hant");
  }

  // 依分類分組：個人 → 共用 → 原有分類
  if (packingGroupBy === "category") {
    const getScopeOrder = (name: string) => {
      if (name.startsWith("👤 個人用品｜")) return 0;
      if (name.startsWith("👥 共用用品｜")) return 1;
      return 2;
    };

    const scopeDifference =
      getScopeOrder(groupA) - getScopeOrder(groupB);

    if (scopeDifference !== 0) {
      return scopeDifference;
    }

    return groupA.localeCompare(groupB, "zh-Hant");
  }

  return 0;
});






const [loadingPackingItems, setLoadingPackingItems] =
  useState(false);



const [showPackingForm, setShowPackingForm] =
  useState(false);


/* =========================================
   打包清單：預設範本匯入面板
   ========================================= */
const [showPackingImport, setShowPackingImport] =
  useState(false);


/* =========================================
   打包清單：常用物品管理面板
   ========================================= */
const [showPackingTemplateManager, setShowPackingTemplateManager] =
  useState(false);


/* =========================================
   打包清單：自訂常用物品表單
   ========================================= */
const [packingCustomForm, setPackingCustomForm] = useState({
  scope: "personal" as "personal" | "shared",
  category_code: "",
  name: "",
  quantity: "1",
  notes: "",
});

  const [savingPackingCustomItem, setSavingPackingCustomItem] =
  useState(false);


/* =========================================
   個人自訂打包範本資料
   ========================================= */
const [packingCustomItems, setPackingCustomItems] =
  useState<PackingCustomItem[]>([]);

const [loadingPackingCustomItems, setLoadingPackingCustomItems] =
  useState(false);

const [packingCustomLoadError, setPackingCustomLoadError] =
  useState("");


/* =========================================
   打包清單：匯入範圍與指定人員
   ========================================= */
const [packingImportScope, setPackingImportScope] =
  useState<"personal" | "shared">("personal");

const [packingImportPersonId, setPackingImportPersonId] =
  useState("");


/* =========================================
   打包清單：系統預設範本 State
   ========================================= */

const [packingTemplateCategories, setPackingTemplateCategories] =
  useState<PackingTemplateCategory[]>([]);

const [packingTemplateItems, setPackingTemplateItems] =
  useState<PackingTemplateItem[]>([]);

const [loadingPackingTemplates, setLoadingPackingTemplates] =
  useState(false);

const [packingTemplateLoadError, setPackingTemplateLoadError] =
  useState("");

/* =========================================
   打包清單：匯入狀態
   ========================================= */

const [importingPackingTemplates, setImportingPackingTemplates] =
  useState(false);

/* =========================================
   打包清單：讀取系統共用預設範本
   ========================================= */

const loadPackingTemplates = async () => {
  if (loadingPackingTemplates) return;

  setLoadingPackingTemplates(true);
  setPackingTemplateLoadError("");

  try {
    const [categoriesResult, itemsResult] =
      await Promise.all([
        supabase
          .from("PackingCategories")
          .select(
            "id,scope,code,name,icon,sort_order,is_active"
          )
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),

        supabase
          .from("PackingTemplates")
          .select(
            "id,category_id,name,quantity,notes,sort_order,is_active"
          )
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
      ]);

    if (categoriesResult.error) {
      throw categoriesResult.error;
    }

    if (itemsResult.error) {
      throw itemsResult.error;
    }

    setPackingTemplateCategories(
      (categoriesResult.data ?? []) as PackingTemplateCategory[]
    );

    setPackingTemplateItems(
      (itemsResult.data ?? []) as PackingTemplateItem[]
    );
  } catch (error) {
    console.error("讀取預設打包清單失敗：", error);

    setPackingTemplateLoadError(
      error instanceof Error
        ? error.message
        : "無法讀取預設打包清單"
    );
  } finally {
    setLoadingPackingTemplates(false);
  }
};


/* =========================================
   讀取目前帳號的個人自訂打包範本
   ========================================= */

const loadPackingCustomItems = async () => {
  setLoadingPackingCustomItems(true);
  setPackingCustomLoadError("");

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("請重新登入後再試");
    }

    const { data, error } = await supabase
      .from("PackingCustomItems")
      .select(
        "id,user_id,scope,category_code,name,quantity,notes,sort_order,is_active"
      )
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });

    if (error) throw error;

    setPackingCustomItems(
      (data ?? []) as PackingCustomItem[]
    );
  } catch (error) {
    console.error("讀取自訂打包範本失敗：", error);

    setPackingCustomLoadError(
      error instanceof Error
        ? error.message
        : "讀取失敗"
    );

    setPackingCustomItems([]);
  } finally {
    setLoadingPackingCustomItems(false);
  }
};


/* =========================================
   自訂常用物品：儲存到 Supabase
   ========================================= */

const savePackingCustomItem = async () => {
  if (savingPackingCustomItem) return;

  const scope = packingCustomForm.scope;
  const categoryCode = packingCustomForm.category_code;
  const name = packingCustomForm.name.trim();
  const quantity = Number(packingCustomForm.quantity);
  const notes = packingCustomForm.notes.trim();

  if (!categoryCode) {
    alert("請選擇所屬分類");
    return;
  }

  if (!name) {
    alert("請輸入物品名稱");
    return;
  }

  if (
    !Number.isSafeInteger(quantity) ||
    quantity <= 0
  ) {
    alert("數量必須是大於 0 的整數");
    return;
  }

  const validCategory = packingTemplateCategories.some(
    (category) =>
      category.scope === scope &&
      category.code === categoryCode &&
      category.is_active
  );

  if (!validCategory) {
    alert("所屬分類無效，請重新選擇");
    return;
  }

  setSavingPackingCustomItem(true);

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("請重新登入後再試");
    }

    const { data: existingItems, error: checkError } =
      await supabase
        .from("PackingCustomItems")
        .select("id,name")
        .eq("user_id", user.id)
        .eq("scope", scope)
        .eq("category_code", categoryCode);

    if (checkError) throw checkError;

    const duplicate = (existingItems ?? []).some(
      (item) =>
        String(item.name ?? "")
          .trim()
          .toLocaleLowerCase() ===
        name.toLocaleLowerCase()
    );

    if (duplicate) {
      alert("這個分類已經有相同名稱的自訂物品");
      return;
    }

    const { error: insertError } = await supabase
      .from("PackingCustomItems")
      .insert({
        user_id: user.id,
        scope,
        category_code: categoryCode,
        name,
        quantity,
        notes: notes || null,
        sort_order: 0,
        is_active: true,
      });

    if (insertError) {
      if (insertError.code === "23505") {
        alert("這個分類已經有相同名稱的物品");
        return;
      }

      throw insertError;
    }

    setPackingCustomForm({
      scope,
      category_code: categoryCode,
      name: "",
      quantity: "1",
      notes: "",
    });
await loadPackingCustomItems();
    alert("✅ 常用物品新增成功！");
  } catch (error) {
    console.error("新增自訂常用物品失敗：", error);

    alert(
      error instanceof Error
        ? error.message
        : "新增失敗，請稍後再試"
    );
  } finally {
    setSavingPackingCustomItem(false);
  }
};

/* =========================================
   打包清單：匯入系統預設物品
   ========================================= */

const importPackingTemplates = async () => {
  if (importingPackingTemplates) return;

  const tripId = Number(id);

  if (!Number.isSafeInteger(tripId) || tripId <= 0) {
    alert("找不到有效的旅程 ID");
    return;
  }

  if (loadingPackingTemplates || packingTemplateLoadError) {
    alert("預設清單尚未成功載入，請重新開啟匯入面板");
    return;
  }

  let personId: number | null = null;

  if (packingImportScope === "personal") {
    if (!packingImportPersonId) {
      alert("請先選擇要匯入的旅行成員");
      return;
    }

    personId = Number(packingImportPersonId);

    if (
      !Number.isSafeInteger(personId) ||
      !packingPeople.some((person) => person.id === personId)
    ) {
      alert("請選擇有效的旅行成員");
      return;
    }
  }

  setImportingPackingTemplates(true);

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("請先登入");
    }

    // 只取得目前選取範圍的啟用分類
    const selectedCategories =
      packingTemplateCategories.filter(
        (category) =>
          category.scope === packingImportScope &&
          category.is_active
      );

    const categoryMap = new Map(
      selectedCategories.map((category) => [
        category.id,
        category,
      ])
    );

    
/* =========================================
   預設打包物品：依分類及範本順序排列
   ========================================= */
const selectedItems = packingTemplateItems
  .filter(
    (item) =>
      item.is_active &&
      categoryMap.has(item.category_id)
  )
  .sort((a, b) => {
    const categoryA = categoryMap.get(a.category_id);
    const categoryB = categoryMap.get(b.category_id);

    const categoryOrder =
      (categoryA?.sort_order ?? 999) -
      (categoryB?.sort_order ?? 999);

    if (categoryOrder !== 0) {
      return categoryOrder;
    }

    const itemOrder = a.sort_order - b.sort_order;

    if (itemOrder !== 0) {
      return itemOrder;
    }

    return a.id - b.id;
  });

  
/* =========================================
   匯入時讀取最新的個人自訂範本
   ========================================= */

const {
  data: customItemsData,
  error: customItemsError,
} = await supabase
  .from("PackingCustomItems")
  .select(
    "id,scope,category_code,name,quantity,notes,sort_order,is_active"
  )
  .eq("user_id", user.id)
  .eq("scope", packingImportScope)
  .eq("is_active", true)
  .order("sort_order", { ascending: true })
  .order("id", { ascending: true });

if (customItemsError) {
  throw customItemsError;
}

const selectedCustomItems = (
  (customItemsData ?? []) as PackingCustomItem[]
).filter((item) =>
  selectedCategories.some(
    (category) =>
      category.scope === item.scope &&
      category.code === item.category_code
  )
);



    if (
  selectedCategories.length === 0 ||
  (selectedItems.length === 0 &&
    selectedCustomItems.length === 0)
) {
      throw new Error("找不到可匯入的預設物品");
    }

    // 讀取資料庫最新清單，避免使用過期的畫面資料
    const { data: existingItems, error: existingError } =
      await supabase
        .from("TripPackingItems")
        .select("name,category,person_id")
        .eq("trip_id", tripId)
        .eq("user_id", user.id);

    if (existingError) throw existingError;

    // 使用「範圍＋分類代碼」避免個人與共用分類混淆
    const getCategoryKey = (scope: string, code: string) =>
      `template:${scope}:${code}`;

    const normalizeName = (name: string) =>
      name.trim().toLocaleLowerCase();

    const existingKeys = new Set(
      (existingItems ?? []).map((item) =>
        JSON.stringify([
          item.person_id === null ? null : Number(item.person_id),
          item.category,
          normalizeName(item.name || ""),
        ])
      )
    );

    let nextSortOrder = packingItems.length;

    const rowsToInsert = selectedItems.flatMap((item) => {
      const category = categoryMap.get(item.category_id);

      if (!category) return [];

      const categoryKey = getCategoryKey(
        category.scope,
        category.code
      );

      const duplicateKey = JSON.stringify([
        personId,
        categoryKey,
        normalizeName(item.name),
      ]);

      if (existingKeys.has(duplicateKey)) {
        return [];
      }

      existingKeys.add(duplicateKey);

      return [
        {
          trip_id: tripId,
          user_id: user.id,
          name: item.name,
          category: categoryKey,
          quantity: item.quantity,
          person_id: personId,
          notes: item.notes,
          is_packed: false,
          sort_order: nextSortOrder++,
        },
      ];
    });

    
/* =========================================
   將自訂常用物品加入待匯入清單
   ========================================= */

for (const item of selectedCustomItems) {
  const categoryKey =
    `template:${item.scope}:${item.category_code}`;

  const duplicateKey = JSON.stringify([
    personId,
    categoryKey,
    normalizeName(item.name),
  ]);

  if (existingKeys.has(duplicateKey)) {
    continue;
  }

  existingKeys.add(duplicateKey);

  rowsToInsert.push({
    trip_id: tripId,
    user_id: user.id,
    name: item.name,
    category: categoryKey,
    quantity: item.quantity,
    person_id: personId,
    notes: item.notes,
    is_packed: false,
    sort_order: nextSortOrder++,
  });
}


    if (rowsToInsert.length === 0) {
      alert("這份預設清單已經匯入，沒有需要新增的物品");
      return;
    }

    const confirmed = window.confirm(
      `確定要匯入 ${rowsToInsert.length} 項物品嗎？\n\n` +
      (packingImportScope === "personal"
        ? "物品將指定給所選旅行成員。"
        : "物品將建立為共用用品。")
    );

    if (!confirmed) return;

    const { error: insertError } = await supabase
      .from("TripPackingItems")
      .insert(rowsToInsert);

    if (insertError) throw insertError;

    await loadPackingItems();

    setShowPackingImport(false);

    alert(`成功匯入 ${rowsToInsert.length} 項打包物品！`);
  } catch (error) {
    console.error("匯入預設清單失敗：", error);

    alert(
      error instanceof Error
        ? `匯入失敗：${error.message}`
        : "匯入預設清單失敗"
    );
  } finally {
    setImportingPackingTemplates(false);
  }
};


const [editingPackingItemId, setEditingPackingItemId] =
  useState<number | null>(null);

const [savingPackingItem, setSavingPackingItem] =
  useState(false);

/* =========================================
   行李表單
   ========================================= */

const [packingForm, setPackingForm] = useState({
  name: "",
  category: "other",
  quantity: "1",
  person_id: "",
  notes: "",
});

const updatePackingField = (
  field: keyof typeof packingForm,
  value: string
) => {
  setPackingForm((prev) => ({
    ...prev,
    [field]: value,
  }));
};


/* =========================================
   1. 重設行李表單
   ========================================= */

const resetPackingForm = () => {
  setPackingForm({
    name: "",
    category: "other",
    quantity: "1",
    person_id: "",
    notes: "",
  });

  setEditingPackingItemId(null);
};

/* =========================================
   2. 編輯行李：帶入原本資料
   ========================================= */

const startEditPackingItem = (item: TripPackingItem) => {
  if (savingPackingItem) return;

  setEditingPackingItemId(item.id);

  setPackingForm({
    name: item.name || "",
    category: item.category || "other",
    quantity: String(item.quantity),
    person_id:
      item.person_id === null
        ? ""
        : String(item.person_id),
    notes: item.notes || "",
  });

  setShowPackingForm(true);
};

/* =========================================
   3. 新增或更新行李
   ========================================= */

const savePackingItem = async () => {
  if (savingPackingItem) return;

  const tripId = Number(id);

  if (!Number.isSafeInteger(tripId) || tripId <= 0) {
    alert("找不到有效的旅程 ID");
    return;
  }

  if (!packingForm.name.trim()) {
    alert("請輸入行李名稱");
    return;
  }

  const quantity = Number(packingForm.quantity);

  if (
    !Number.isSafeInteger(quantity) ||
    quantity < 1
  ) {
    alert("數量必須是大於 0 的整數");
    return;
  }

  const personId =
    packingForm.person_id === ""
      ? null
      : Number(packingForm.person_id);

  if (
    personId !== null &&
    (!Number.isSafeInteger(personId) || personId <= 0)
  ) {
    alert("請選擇有效的人員");
    return;
  }

  if (
    personId !== null &&
    !packingPeople.some((person) => person.id === personId)
  ) {
    alert("指定的人員不在目前人員清單中");
    return;
  }

  
/* =========================================
   驗證個人用品／共用用品所屬人員
   舊版分類維持原本規則
   ========================================= */

if (
  packingForm.category.startsWith("template:personal:") &&
  personId === null
) {
  alert("個人用品必須選擇所屬人員");
  return;
}

if (
  packingForm.category.startsWith("template:shared:") &&
  personId !== null
) {
  alert("共用用品不可指定個別人員，請選擇「👥 共用行李」");
  return;
}

  setSavingPackingItem(true);

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("請先登入");
    }

    const itemData = {
      name: packingForm.name.trim(),
      category: packingForm.category || "other",
      quantity,
      person_id: personId,
      notes: packingForm.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (editingPackingItemId !== null) {
      const { data, error } = await supabase
        .from("TripPackingItems")
        .update(itemData)
        .eq("id", editingPackingItemId)
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .select("id");

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("找不到可更新的行李資料");
      }
    } else {
      const { data, error } = await supabase
        .from("TripPackingItems")
        .insert({
          ...itemData,
          trip_id: tripId,
          user_id: user.id,
          is_packed: false,
          sort_order: packingItems.length,
        })
        .select("id");

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("新增行李資料失敗");
      }
    }

    await loadPackingItems();

    resetPackingForm();
    setShowPackingForm(false);

    alert(
      editingPackingItemId !== null
        ? "行李更新成功！"
        : "行李新增成功！"
    );
  } catch (error) {
    console.error("儲存行李失敗：", error);

    alert(
      error instanceof Error
        ? `儲存失敗：${error.message}`
        : "儲存行李失敗"
    );
  } finally {
    setSavingPackingItem(false);
  }
};

/* =========================================
   4. 刪除行李
   ========================================= */

const deletePackingItem = async (item: TripPackingItem) => {
  if (savingPackingItem) return;

  const confirmed = window.confirm(
    `確定刪除「${item.name}」嗎？\n刪除後無法復原。`
  );

  if (!confirmed) return;

  const tripId = Number(id);

  if (!Number.isSafeInteger(tripId) || tripId <= 0) {
    alert("找不到有效的旅程 ID");
    return;
  }

  setSavingPackingItem(true);

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("請先登入");
    }

    const { data, error } = await supabase
      .from("TripPackingItems")
      .delete()
      .eq("id", item.id)
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .select("id");

    if (error) throw error;

    if (!data || data.length === 0) {
      throw new Error("找不到可刪除的行李資料");
    }

    if (editingPackingItemId === item.id) {
      resetPackingForm();
      setShowPackingForm(false);
    }

    await loadPackingItems();

    alert("行李已刪除！");
  } catch (error) {
    console.error("刪除行李失敗：", error);

    alert(
      error instanceof Error
        ? `刪除失敗：${error.message}`
        : "刪除行李失敗"
    );
  } finally {
    setSavingPackingItem(false);
  }
};

/* =========================================
   5. 切換已打包／未打包
   ========================================= */

const togglePackingItem = async (item: TripPackingItem) => {
  const tripId = Number(id);

  if (!Number.isSafeInteger(tripId) || tripId <= 0) {
    alert("找不到有效的旅程 ID");
    return;
  }

  const nextPacked = !item.is_packed;

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("請先登入");
    }

    const { data, error } = await supabase
      .from("TripPackingItems")
      .update({
        is_packed: nextPacked,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .select("id");

    if (error) throw error;

    if (!data || data.length === 0) {
      throw new Error("找不到可更新的行李資料");
    }

    setPackingItems((prev) =>
      prev.map((existing) =>
        existing.id === item.id
          ? { ...existing, is_packed: nextPacked }
          : existing
      )
    );
  } catch (error) {
    console.error("更新打包狀態失敗：", error);

    alert(
      error instanceof Error
        ? `更新失敗：${error.message}`
        : "更新打包狀態失敗"
    );
  }
};



const [loadingTripBookings, setLoadingTripBookings] =
  useState(false);

const [showTripBookingForm, setShowTripBookingForm] =
  useState(false);

const [editingTripBookingId, setEditingTripBookingId] =
  useState<number | null>(null);

const [savingTripBooking, setSavingTripBooking] =
  useState(false);

// 預約行程表單
const [tripBookingForm, setTripBookingForm] = useState({
  booking_type: "other",
  name: "",
  confirmation_number: "",
  booking_platform: "",

  start_at: "",
  end_at: "",
  timezone: "",

  location: "",
  meeting_point: "",
  participants: "",

  amount: "",
  currency: "USD",
  payment_status: "unpaid",

  booking_url: "",
  notes: "",
});

// 更新單一欄位
const updateTripBookingField = (
  field: keyof typeof tripBookingForm,
  value: string
) => {
  setTripBookingForm((prev) => ({
    ...prev,
    [field]: value,
  }));
};


/* =========================================
   重設預約行程表單
   ========================================= */

const resetTripBookingForm = () => {
  setTripBookingForm({
    booking_type: "other",
    name: "",
    confirmation_number: "",
    booking_platform: "",
    start_at: "",
    end_at: "",
    timezone: "",
    location: "",
    meeting_point: "",
    participants: "",
    amount: "",
    currency: "USD",
    payment_status: "unpaid",
    booking_url: "",
    notes: "",
  });

  setEditingTripBookingId(null);
};

/* =========================================
   編輯預約行程：帶入原本資料
   ========================================= */

const startEditTripBooking = (booking: TripBooking) => {
  if (savingTripBooking) return;

  setEditingTripBookingId(booking.id);

  setTripBookingForm({
    booking_type: booking.booking_type,
    name: booking.name || "",
    confirmation_number:
      booking.confirmation_number || "",
    booking_platform: booking.booking_platform || "",

    start_at: flightUTCToLocalInput(
      booking.start_at,
      booking.timezone
    ),

    end_at: flightUTCToLocalInput(
      booking.end_at,
      booking.timezone
    ),

    timezone: booking.timezone || "",
    location: booking.location || "",
    meeting_point: booking.meeting_point || "",
    participants:
      booking.participants === null
        ? ""
        : String(booking.participants),

    amount:
      booking.amount === null
        ? ""
        : String(booking.amount),

    currency: booking.currency || "USD",
    payment_status: booking.payment_status || "unpaid",
    booking_url: booking.booking_url || "",
    notes: booking.notes || "",
  });

  setShowTripBookingForm(true);
};


/* =========================================
   每日行程：直接編輯指定預約
   ========================================= */

const editTripBookingFromItinerary = (
  sourceId: string | number
) => {
  const booking = tripBookings.find(
    (item) => String(item.id) === String(sourceId)
  );

  if (!booking) {
    alert("找不到對應的預約資料，請重新整理頁面");
    return;
  }

  // 切換至預約管理分頁
  setActiveTab("bookings");

  // 帶入指定預約紀錄
  startEditTripBooking(booking);

  // 捲動至頁面上方
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};


/* =========================================
   新增／編輯預約行程
   ========================================= */

const saveTripBooking = async () => {
  if (savingTripBooking) return;

  if (!id || !Number.isSafeInteger(Number(id))) {
    alert("找不到有效的旅程 ID");
    return;
  }

  if (!tripBookingForm.name.trim()) {
    alert("請輸入預約名稱");
    return;
  }

  if (
    (tripBookingForm.start_at || tripBookingForm.end_at) &&
    !tripBookingForm.timezone
  ) {
    alert("請選擇預約當地時區");
    return;
  }

  const participantsText =
    tripBookingForm.participants.trim();

  const participants =
    participantsText === ""
      ? null
      : Number(participantsText);

  if (
    participants !== null &&
    (!Number.isSafeInteger(participants) || participants < 1)
  ) {
    alert("預約人數必須是大於 0 的整數");
    return;
  }

  const amountText = tripBookingForm.amount.trim();

  const amount =
    amountText === ""
      ? null
      : Number(amountText);

  if (
    amount !== null &&
    (!Number.isFinite(amount) || amount < 0)
  ) {
    alert("請輸入有效的預約金額");
    return;
  }

  
/* =========================================
   預約行程：安全轉換當地時間為 UTC
   ========================================= */

let startUTC: string | null = null;
let endUTC: string | null = null;

try {
  startUTC = tripBookingForm.start_at
    ? flightLocalTimeToUTC(
        tripBookingForm.start_at,
        tripBookingForm.timezone
      )
    : null;

  endUTC = tripBookingForm.end_at
    ? flightLocalTimeToUTC(
        tripBookingForm.end_at,
        tripBookingForm.timezone
      )
    : null;
} catch (error) {
  alert(
    error instanceof Error
      ? `預約時間錯誤：${error.message}`
      : "預約日期或時區轉換失敗"
  );
  return;
}

if (tripBookingForm.start_at && !startUTC) {
  alert("開始日期或時區無法轉換");
  return;
}

if (tripBookingForm.end_at && !endUTC) {
  alert("結束日期或時區無法轉換");
  return;
}

if (
  startUTC &&
  endUTC &&
  new Date(endUTC).getTime() <
    new Date(startUTC).getTime()
) {
  alert("結束時間不能早於開始時間");
  return;
}


  setSavingTripBooking(true);

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("請先登入");
    }

    const bookingData = {
      booking_type: tripBookingForm.booking_type,
      name: tripBookingForm.name.trim(),
      confirmation_number:
        tripBookingForm.confirmation_number.trim() || null,
      booking_platform:
        tripBookingForm.booking_platform.trim() || null,

      start_at: startUTC,
      end_at: endUTC,
      timezone: tripBookingForm.timezone || null,

      location: tripBookingForm.location.trim() || null,
      meeting_point:
        tripBookingForm.meeting_point.trim() || null,

      participants,
      amount,
      currency: tripBookingForm.currency.trim() || "USD",
      payment_status: tripBookingForm.payment_status,

      booking_url: tripBookingForm.booking_url.trim() || null,
      notes: tripBookingForm.notes.trim() || null,
    };

    if (editingTripBookingId !== null) {
      const { data, error } = await supabase
        .from("TripBookings")
        .update(bookingData)
        .eq("id", editingTripBookingId)
        .eq("trip_id", Number(id))
        .eq("user_id", user.id)
        .select("id");

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("找不到可更新的預約資料");
      }
    } else {
      const { data, error } = await supabase
        .from("TripBookings")
        .insert({
          ...bookingData,
          trip_id: Number(id),
          user_id: user.id,
        })
        .select("id");

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("新增預約資料失敗");
      }
    }

    await loadTripBookings();

    alert(
      editingTripBookingId !== null
        ? "預約行程更新成功！"
        : "預約行程新增成功！"
    );

    resetTripBookingForm();
    setShowTripBookingForm(false);
  } catch (error) {
    console.error("儲存預約行程失敗：", error);

    alert(
      error instanceof Error
        ? `儲存失敗：${error.message}`
        : "儲存預約行程失敗"
    );
  } finally {
    setSavingTripBooking(false);
  }
};


/* =========================================
   刪除預約行程
   ========================================= */

const deleteTripBooking = async (booking: TripBooking) => {
  if (savingTripBooking) return;

  const confirmed = window.confirm(
    `確定要刪除「${booking.name}」嗎？\n\n刪除後無法復原。`
  );

  if (!confirmed) return;

  if (!id) {
    alert("找不到旅程 ID");
    return;
  }

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("請先登入");
    }

    const { data, error } = await supabase
      .from("TripBookings")
      .delete()
      .eq("id", booking.id)
      .eq("trip_id", Number(id))
      .eq("user_id", user.id)
      .select("id");

    if (error) throw error;

    if (!data || data.length === 0) {
      throw new Error("找不到可刪除的預約資料");
    }

    if (editingTripBookingId === booking.id) {
      resetTripBookingForm();
      setShowTripBookingForm(false);
    }

    await loadTripBookings();

    alert("預約行程已刪除！");
  } catch (error) {
    console.error("刪除預約行程失敗：", error);

    alert(
      error instanceof Error
        ? `刪除失敗：${error.message}`
        : "刪除預約行程失敗"
    );
  }
};


// 載入狀態
const [loadingCarRentals, setLoadingCarRentals] =
  useState(false);

// 是否顯示新增／編輯表單
const [showCarRentalForm, setShowCarRentalForm] =
  useState(false);

// 正在編輯的租車 ID
const [editingCarRentalId, setEditingCarRentalId] =
  useState<number | null>(null);

// 儲存中
const [savingCarRental, setSavingCarRental] =
  useState(false);

// 租車表單
const [carRentalForm, setCarRentalForm] = useState({
  rental_company: "",
  confirmation_number: "",

  vehicle_type: "",
  vehicle_class: "",

  pickup_location: "",
  pickup_at: "",
  pickup_timezone: "",

  dropoff_location: "",
  dropoff_at: "",
  dropoff_timezone: "",

  amount: "",
  currency: "USD",
  payment_status: "unpaid",

  booking_platform: "",
  booking_url: "",
  notes: "",
});

// 更新單一表單欄位
const updateCarRentalField = (
  field: keyof typeof carRentalForm,
  value: string
) => {
  setCarRentalForm((prev) => ({
    ...prev,
    [field]: value,
  }));
};


/* =========================================
   重設租車表單
   ========================================= */

const resetCarRentalForm = () => {
  setCarRentalForm({
    rental_company: "",
    confirmation_number: "",
    vehicle_type: "",
    vehicle_class: "",
    pickup_location: "",
    pickup_at: "",
    pickup_timezone: "",
    dropoff_location: "",
    dropoff_at: "",
    dropoff_timezone: "",
    amount: "",
    currency: "USD",
    payment_status: "unpaid",
    booking_platform: "",
    booking_url: "",
    notes: "",
  });

  setEditingCarRentalId(null);
};

  
/* =========================================
   編輯租車：帶入既有資料
   ========================================= */

const startEditCarRental = (rental: TripCarRental) => {
  if (savingCarRental) return;

  setEditingCarRentalId(rental.id);

  setCarRentalForm({
    rental_company: rental.rental_company || "",
    confirmation_number:
      rental.confirmation_number || "",
    vehicle_type: rental.vehicle_type || "",
    vehicle_class: rental.vehicle_class || "",
    pickup_location: rental.pickup_location || "",

    pickup_at: flightUTCToLocalInput(
      rental.pickup_at,
      rental.pickup_timezone
    ),

    pickup_timezone: rental.pickup_timezone || "",
    dropoff_location: rental.dropoff_location || "",

    dropoff_at: flightUTCToLocalInput(
      rental.dropoff_at,
      rental.dropoff_timezone
    ),

    dropoff_timezone: rental.dropoff_timezone || "",
    amount:
      rental.amount === null ? "" : String(rental.amount),
    currency: rental.currency || "USD",
    payment_status: rental.payment_status || "unpaid",
    booking_platform: rental.booking_platform || "",
    booking_url: rental.booking_url || "",
    notes: rental.notes || "",
  });

  setShowCarRentalForm(true);
};


/* =========================================
   每日行程：直接編輯指定租車
   ========================================= */

const editCarRentalFromItinerary = (
  sourceId: string | number
) => {
  const rental = carRentals.find(
    (item) => String(item.id) === String(sourceId)
  );

  if (!rental) {
    alert("找不到對應的租車資料，請重新整理頁面");
    return;
  }

  // 切換至租車管理分頁
  setActiveTab("carRentals");

  // 帶入指定租車紀錄
  startEditCarRental(rental);

  // 捲動至頁面上方
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};


  
/* =========================================
   新增／編輯租車
   ========================================= */

const saveCarRental = async () => {
  if (savingCarRental) return;

  if (!id || !Number.isSafeInteger(Number(id))) {
    alert("找不到有效的旅程 ID");
    return;
  }

  if (!carRentalForm.rental_company.trim()) {
    alert("請輸入租車公司");
    return;
  }

  if (
    !carRentalForm.pickup_location.trim() ||
    !carRentalForm.dropoff_location.trim()
  ) {
    alert("請輸入取車與還車地點");
    return;
  }

  if (
    !carRentalForm.pickup_at ||
    !carRentalForm.dropoff_at
  ) {
    alert("請填寫取車與還車日期時間");
    return;
  }

  if (
    !carRentalForm.pickup_timezone ||
    !carRentalForm.dropoff_timezone
  ) {
    alert("請選擇取車與還車時區");
    return;
  }

  const amountText = carRentalForm.amount.trim();
  const amount = amountText === "" ? null : Number(amountText);

  if (
    amount !== null &&
    (!Number.isFinite(amount) || amount < 0)
  ) {
    alert("請輸入有效的租車金額");
    return;
  }

  
/* =========================================
   租車：安全轉換當地時間為 UTC
   ========================================= */

let pickupUTC: string | null = null;
let dropoffUTC: string | null = null;

try {
  pickupUTC = flightLocalTimeToUTC(
    carRentalForm.pickup_at,
    carRentalForm.pickup_timezone
  );

  dropoffUTC = flightLocalTimeToUTC(
    carRentalForm.dropoff_at,
    carRentalForm.dropoff_timezone
  );
} catch (error) {
  alert(
    error instanceof Error
      ? `租車時間錯誤：${error.message}`
      : "租車日期或時區轉換失敗"
  );
  return;
}

if (!pickupUTC || !dropoffUTC) {
  alert("取還車日期或時區有誤，請重新確認");
  return;
}

if (
  new Date(dropoffUTC).getTime() <=
  new Date(pickupUTC).getTime()
) {
  alert("還車時間必須晚於取車時間");
  return;
}


  setSavingCarRental(true);

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("請先登入");
    }

    const rentalData = {
      rental_company:
        carRentalForm.rental_company.trim(),
      confirmation_number:
        carRentalForm.confirmation_number.trim() || null,
      vehicle_type:
        carRentalForm.vehicle_type.trim() || null,
      vehicle_class:
        carRentalForm.vehicle_class.trim() || null,
      pickup_location:
        carRentalForm.pickup_location.trim(),
      pickup_at: pickupUTC,
      pickup_timezone: carRentalForm.pickup_timezone,
      dropoff_location:
        carRentalForm.dropoff_location.trim(),
      dropoff_at: dropoffUTC,
      dropoff_timezone: carRentalForm.dropoff_timezone,
      amount,
      currency: carRentalForm.currency.trim() || "USD",
      payment_status: carRentalForm.payment_status,
      booking_platform:
        carRentalForm.booking_platform.trim() || null,
      booking_url:
        carRentalForm.booking_url.trim() || null,
      notes: carRentalForm.notes.trim() || null,
    };

    if (editingCarRentalId !== null) {
      const { data, error } = await supabase
        .from("TripCarRentals")
        .update(rentalData)
        .eq("id", editingCarRentalId)
        .eq("trip_id", Number(id))
        .eq("user_id", user.id)
        .select("id");

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("找不到可更新的租車資料");
      }
    } else {
      const { data, error } = await supabase
        .from("TripCarRentals")
        .insert({
          ...rentalData,
          trip_id: Number(id),
          user_id: user.id,
        })
        .select("id");

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("新增租車資料失敗");
      }
    }

    await loadCarRentals();

    alert(
      editingCarRentalId !== null
        ? "租車資料更新成功！"
        : "租車資料新增成功！"
    );

    resetCarRentalForm();
    setShowCarRentalForm(false);
  } catch (error) {
    console.error("儲存租車失敗：", error);

    alert(
      error instanceof Error
        ? `儲存失敗：${error.message}`
        : "儲存租車失敗"
    );
  } finally {
    setSavingCarRental(false);
  }
};

  
/* =========================================
   刪除租車
   ========================================= */

const deleteCarRental = async (rental: TripCarRental) => {
  if (savingCarRental) return;

  const confirmed = window.confirm(
    `確定要刪除「${rental.rental_company || "租車紀錄"}」嗎？\n\n刪除後無法復原。`
  );

  if (!confirmed) return;

  if (!id) {
    alert("找不到旅程 ID");
    return;
  }

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("請先登入");
    }

    const { data, error } = await supabase
      .from("TripCarRentals")
      .delete()
      .eq("id", rental.id)
      .eq("trip_id", Number(id))
      .eq("user_id", user.id)
      .select("id");

    if (error) throw error;

    if (!data || data.length === 0) {
      throw new Error("找不到可刪除的租車資料");
    }

    if (editingCarRentalId === rental.id) {
      resetCarRentalForm();
      setShowCarRentalForm(false);
    }

    await loadCarRentals();

    alert("租車資料已刪除！");
  } catch (error) {
    console.error("刪除租車失敗：", error);

    alert(
      error instanceof Error
        ? `刪除失敗：${error.message}`
        : "刪除租車失敗"
    );
  }
};

// 新增 / 編輯機票表單開關
const [showFlightForm, setShowFlightForm] =
  useState(false);

// 目前編輯中的機票 ID
// null 代表新增
const [editingFlightId, setEditingFlightId] =
  useState<number | null>(null);

// 是否正在儲存
const [savingFlight, setSavingFlight] =
  useState(false);

// 機票表單資料
const [flightForm, setFlightForm] = useState({
  airline: "",
  flight_number: "",
  departure_airport: "",
  arrival_airport: "",
  departure_at: "",
  arrival_at: "",
  departure_timezone: "",
  arrival_timezone: "",
  confirmation_number: "",
  cabin_class: "",
  baggage_allowance: "",
  amount: "",
  currency: "USD",
  payment_status: "unpaid",
  flight_direction: "other",
  booking_platform: "",
  booking_url: "",
  notes: "",
});



/* =========================================
   機票多航段資料
   ========================================= */

type FlightSegmentForm = {
  localId: number;

  airline: string;
  flight_number: string;

  departure_airport: string;
  arrival_airport: string;

  departure_at: string;
  arrival_at: string;

  departure_timezone: string;
  arrival_timezone: string;

  // 航廈、登機門、座位
  departure_terminal: string;
  arrival_terminal: string;
  departure_gate: string;
  seat_number: string;

  cabin_class: string;
  baggage_allowance: string;
  notes: string;
};


/* =========================================
   打包清單：系統預設範本資料型別
   ========================================= */

type PackingTemplateCategory = {
  id: number;
  scope: "personal" | "shared";
  code: string;
  name: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
};

type PackingTemplateItem = {
  id: number;
  category_id: number;
  name: string;
  quantity: number;
  notes: string | null;
  sort_order: number;
  is_active: boolean;
};


/* =========================================
   個人自訂打包範本 Type
   ========================================= */

type PackingCustomItem = {
  id: number;
  user_id: string;
  scope: "personal" | "shared";
  category_code: string;
  name: string;
  quantity: number;
  notes: string | null;
  sort_order: number;
  is_active: boolean;
};


const createFlightSegment = (
  localId: number
): FlightSegmentForm => ({
  localId,
  airline: "",
  flight_number: "",
  departure_airport: "",
  arrival_airport: "",
  departure_at: "",
  arrival_at: "",
  departure_timezone: "",
  arrival_timezone: "",

  departure_terminal: "",
  arrival_terminal: "",
  departure_gate: "",
  seat_number: "",

  cabin_class: "",
  baggage_allowance: "",
  notes: "",
});

const [flightSegments, setFlightSegments] = useState<
  FlightSegmentForm[]
>([createFlightSegment(1)]);


const addFlightSegment = () => {
  setFlightSegments((prev) => {
    const lastSegment = prev[prev.length - 1];

    const nextId =
      Math.max(0, ...prev.map((s) => s.localId)) + 1;

    return [
      ...prev,
      {
        ...createFlightSegment(nextId),

        // 自動帶入上一段的抵達機場
        departure_airport:
          lastSegment?.arrival_airport || "",

        // 同一家航空公司時減少重複輸入
        airline: lastSegment?.airline || "",
      },
    ];
  });
};


const removeFlightSegment = (localId: number) => {
  setFlightSegments((prev) =>
    prev.length > 1
      ? prev.filter((s) => s.localId !== localId)
      : prev
  );
};

const updateFlightSegment = (
  localId: number,
  field: keyof Omit<FlightSegmentForm, "localId">,
  value: string
) => {
  setFlightSegments((prev) =>
    prev.map((segment) =>
      segment.localId === localId
        ? { ...segment, [field]: value }
        : segment
    )
  );
};


// 更新機票表單欄位
const updateFlightField = (
  field: keyof typeof flightForm,
  value: string
) => {
  setFlightForm((prev) => ({
    ...prev,
    [field]: value,
  }));
};


/* =========================================
   UTC 轉換成機場當地時間
   用於 datetime-local 編輯表單
   ========================================= */

function flightUTCToLocalInput(
  utcDateTime: string | null,
  timeZone: string | null
): string {
  if (!utcDateTime || !timeZone) return "";

  const date = new Date(utcDateTime);

  if (Number.isNaN(date.getTime())) return "";

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);

    const values: Record<string, string> = {};

    parts.forEach((part) => {
      values[part.type] = part.value;
    });

    return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
  } catch {
    return "";
  }
}



/* =========================================
   編輯機票：讀取主機票與所有航段
   支援去程 / 回程、航廈、登機門、座位
   ========================================= */

const startEditFlight = async (flight: TripFlight) => {
  if (savingFlight) return;

  setEditingFlightId(flight.id);

  // 1. 帶入機票訂單資料
  setFlightForm({
    airline: flight.airline || "",
    flight_number: flight.flight_number || "",
    departure_airport: flight.departure_airport || "",
    arrival_airport: flight.arrival_airport || "",

    departure_at: flightUTCToLocalInput(
      flight.departure_at,
      flight.departure_timezone
    ),

    arrival_at: flightUTCToLocalInput(
      flight.arrival_at,
      flight.arrival_timezone
    ),

    departure_timezone: flight.departure_timezone || "",
    arrival_timezone: flight.arrival_timezone || "",

    confirmation_number: flight.confirmation_number || "",
    cabin_class: flight.cabin_class || "",
    baggage_allowance: flight.baggage_allowance || "",

    amount:
      flight.amount === null
        ? ""
        : String(flight.amount),

    currency: flight.currency || "USD",
    payment_status: flight.payment_status || "unpaid",
    flight_direction: flight.flight_direction || "other",

    booking_platform: flight.booking_platform || "",
    booking_url: flight.booking_url || "",
    notes: flight.notes || "",
  });

  // 2. 舊版機票相容
  // 若沒有航段紀錄，使用原本單段航班資料
  const legacySegment: FlightSegmentForm = {
    localId: 1,

    airline: flight.airline || "",
    flight_number: flight.flight_number || "",
    departure_airport: flight.departure_airport || "",
    arrival_airport: flight.arrival_airport || "",

    departure_at: flightUTCToLocalInput(
      flight.departure_at,
      flight.departure_timezone
    ),

    arrival_at: flightUTCToLocalInput(
      flight.arrival_at,
      flight.arrival_timezone
    ),

    departure_timezone: flight.departure_timezone || "",
    arrival_timezone: flight.arrival_timezone || "",

    departure_terminal: "",
    arrival_terminal: "",
    departure_gate: "",
    seat_number: "",

    cabin_class: flight.cabin_class || "",
    baggage_allowance: flight.baggage_allowance || "",
    notes: "",
  };

  setFlightSegments([legacySegment]);

  try {
    // 3. 讀取目前機票所有航段
    const { data, error } = await supabase
      .from("TripFlightSegments")
      .select(`
        id,
        segment_order,
        airline,
        flight_number,
        departure_airport,
        arrival_airport,
        departure_at,
        arrival_at,
        departure_timezone,
        arrival_timezone,
        departure_terminal,
        arrival_terminal,
        departure_gate,
        seat_number,
        cabin_class,
        baggage_allowance,
        notes
      `)
      .eq("flight_id", flight.id)
      .order("segment_order", { ascending: true });

    if (error) throw error;

    if (data && data.length > 0) {
      const loadedSegments: FlightSegmentForm[] =
        data.map((segment, index) => ({
          localId: index + 1,

          airline: segment.airline || "",
          flight_number: segment.flight_number || "",
          departure_airport:
            segment.departure_airport || "",
          arrival_airport:
            segment.arrival_airport || "",

          departure_at: flightUTCToLocalInput(
            segment.departure_at,
            segment.departure_timezone
          ),

          arrival_at: flightUTCToLocalInput(
            segment.arrival_at,
            segment.arrival_timezone
          ),

          departure_timezone:
            segment.departure_timezone || "",
          arrival_timezone:
            segment.arrival_timezone || "",

          departure_terminal:
            segment.departure_terminal || "",
          arrival_terminal:
            segment.arrival_terminal || "",
          departure_gate:
            segment.departure_gate || "",
          seat_number:
            segment.seat_number || "",

          cabin_class: segment.cabin_class || "",
          baggage_allowance:
            segment.baggage_allowance || "",
          notes: segment.notes || "",
        }));

      setFlightSegments(loadedSegments);
    }

    // 讀取完成後才打開編輯表單
    setShowFlightForm(true);
  } catch (error) {
    console.error("載入機票航段失敗：", error);

    alert(
      error instanceof Error
        ? `無法載入機票航段：${error.message}`
        : "無法載入機票航段"
    );

    setEditingFlightId(null);
    setShowFlightForm(false);
  }
};


/* =========================================
   每日行程：直接編輯指定機票
   ========================================= */

const editFlightFromItinerary = async (
  sourceId: string | number
) => {
  const flight = flights.find(
    (item) => String(item.id) === String(sourceId)
  );

  if (!flight) {
    alert("找不到對應的機票資料，請重新整理頁面");
    return;
  }

  // 切換到機票分頁
  setActiveTab("flights");

  // 開啟指定機票，並載入所有航段
  await startEditFlight(flight);

  // 捲動到頁面上方
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};





/* =========================================
   刪除機票
   ========================================= */

const deleteFlight = async (flight: TripFlight) => {
  const confirmed = window.confirm(
    `確定要刪除航班「${flight.flight_number || "未命名航班"}」嗎？\n\n刪除後無法復原。`
  );

  if (!confirmed) return;

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("請先登入");
    }

    if (!id) {
      throw new Error("找不到旅程 ID");
    }

    const { data, error } = await supabase
      .from("TripFlights")
      .delete()
      .eq("id", flight.id)
      .eq("trip_id", Number(id))
      .eq("user_id", user.id)
      .select("id");

    if (error) throw error;

    if (!data || data.length === 0) {
      throw new Error("找不到可刪除的機票資料，請確認權限");
    }

    if (editingFlightId === flight.id) {
      setEditingFlightId(null);
      setShowFlightForm(false);
    }

    await loadFlights();

    alert("機票已成功刪除！");
  } catch (error) {
    console.error("刪除機票失敗：", error);

    alert(
      error instanceof Error
        ? `刪除失敗：${error.message}`
        : "刪除機票失敗"
    );
  }
};


/* =========================================
   新增 / 編輯機票與轉機航段
   TripFlights + TripFlightSegments
   ========================================= */

const saveFlight = async () => {
  if (savingFlight) return;

  // 1. 檢查旅程 ID
  if (!id || !Number.isSafeInteger(Number(id))) {
    alert("找不到有效的旅程 ID");
    return;
  }

  // 2. 檢查航段
  if (flightSegments.length === 0) {
    alert("請至少新增一段航班");
    return;
  }

  const segmentRows: {
    segment_order: number;
    airline: string;
    flight_number: string;
    departure_airport: string | null;
    arrival_airport: string | null;
    departure_at: string | null;
    arrival_at: string | null;
    
    departure_timezone: string | null;
    arrival_timezone: string | null;

    departure_terminal: string | null;
    arrival_terminal: string | null;
    departure_gate: string | null;
    seat_number: string | null;

    cabin_class: string | null;

    baggage_allowance: string | null;
    notes: string | null;
  }[] = [];

  try {
    // 3. 驗證並轉換各航段時間
    for (
      let index = 0;
      index < flightSegments.length;
      index++
    ) {
      const segment = flightSegments[index];
      const segmentNumber = index + 1;

      if (!segment.airline.trim()) {
        throw new Error(
          `第 ${segmentNumber} 段：請輸入航空公司`
        );
      }

      if (!segment.flight_number.trim()) {
        throw new Error(
          `第 ${segmentNumber} 段：請輸入航班編號`
        );
      }

      if (
        !segment.departure_airport.trim() ||
        !segment.arrival_airport.trim()
      ) {
        throw new Error(
          `第 ${segmentNumber} 段：請輸入出發與抵達機場`
        );
      }

      if (
        !segment.departure_at ||
        !segment.arrival_at
      ) {
        throw new Error(
          `第 ${segmentNumber} 段：請輸入出發與抵達時間`
        );
      }

      if (
        !segment.departure_timezone ||
        !segment.arrival_timezone
      ) {
        throw new Error(
          `第 ${segmentNumber} 段：請選擇出發與抵達時區`
        );
      }

      const departureUTC =
        flightLocalTimeToUTC(
          segment.departure_at,
          segment.departure_timezone
        );

      const arrivalUTC =
        flightLocalTimeToUTC(
          segment.arrival_at,
          segment.arrival_timezone
        );

      if (!departureUTC || !arrivalUTC) {
        throw new Error(
          `第 ${segmentNumber} 段：日期或時區無法轉換，請重新確認`
        );
      }

      const departureMs =
        new Date(departureUTC).getTime();

      const arrivalMs =
        new Date(arrivalUTC).getTime();

      if (arrivalMs <= departureMs) {
        throw new Error(
          `第 ${segmentNumber} 段：抵達時間必須晚於出發時間`
        );
      }

      // 驗證前後航段順序與轉機地點
      if (index > 0) {
        const previous = segmentRows[index - 1];

        if (
          previous.arrival_airport?.trim().toUpperCase() !==
          segment.departure_airport.trim().toUpperCase()
        ) {
          throw new Error(
            `第 ${segmentNumber - 1} 段抵達機場與第 ${segmentNumber} 段出發機場不同，請確認轉機地點`
          );
        }

        if (
          previous.arrival_at &&
          departureMs <
            new Date(previous.arrival_at).getTime()
        ) {
          throw new Error(
            `第 ${segmentNumber} 段：出發時間早於上一段抵達時間`
          );
        }
      }

      segmentRows.push({
        segment_order: segmentNumber,
        airline: segment.airline.trim(),
        flight_number:
          segment.flight_number.trim(),
        departure_airport:
          segment.departure_airport.trim(),
        arrival_airport:
          segment.arrival_airport.trim(),
        departure_at: departureUTC,
        arrival_at: arrivalUTC,
        
        departure_timezone:
          segment.departure_timezone,
        arrival_timezone:
          segment.arrival_timezone,

        departure_terminal:
          segment.departure_terminal.trim() || null,
        arrival_terminal:
          segment.arrival_terminal.trim() || null,
        departure_gate:
          segment.departure_gate.trim() || null,
        seat_number:
          segment.seat_number.trim() || null,

        cabin_class:
          segment.cabin_class.trim() || null,
        baggage_allowance:
          segment.baggage_allowance.trim() || null,
        notes: segment.notes.trim() || null,
      });
    }

    // 4. 檢查機票金額
    const amountText = flightForm.amount.trim();

    const amount =
      amountText === ""
        ? null
        : Number(amountText);

    if (
      amount !== null &&
      (!Number.isFinite(amount) || amount < 0)
    ) {
      throw new Error("請輸入有效的機票金額");
    }

    setSavingFlight(true);

    // 5. 確認登入
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("請先登入");
    }

    // 6. 將首段與末段摘要同步到 TripFlights
    // 保持舊版機票列表可以正常顯示
    const first = segmentRows[0];
    const last = segmentRows[segmentRows.length - 1];

    const flightData = {
      airline: first.airline,
      flight_number: first.flight_number,

      departure_airport:
        first.departure_airport,

      arrival_airport:
        last.arrival_airport,

      departure_at:
        first.departure_at,

      arrival_at:
        last.arrival_at,

      departure_timezone:
        first.departure_timezone,

      arrival_timezone:
        last.arrival_timezone,

      confirmation_number:
        flightForm.confirmation_number.trim() ||
        null,

      cabin_class:
        first.cabin_class,

      baggage_allowance:
        first.baggage_allowance,

      amount,
      currency:
        flightForm.currency.trim() || "USD",

      
      payment_status:
        flightForm.payment_status,

      flight_direction:
        flightForm.flight_direction,

      booking_platform:

        flightForm.booking_platform.trim() ||
        null,

      booking_url:
        flightForm.booking_url.trim() || null,

      notes:
        flightForm.notes.trim() || null,
    };

    let savedFlightId: number;

    // 7. 儲存主機票
    if (editingFlightId !== null) {
      const { data, error } = await supabase
        .from("TripFlights")
        .update(flightData)
        .eq("id", editingFlightId)
        .eq("trip_id", Number(id))
        .eq("user_id", user.id)
        .select("id")
        .single();

      if (error) throw error;

      if (!data) {
        throw new Error("更新機票失敗");
      }

      savedFlightId = Number(data.id);
    } else {
      const { data, error } = await supabase
        .from("TripFlights")
        .insert({
          ...flightData,
          trip_id: Number(id),
          user_id: user.id,
        })
        .select("id")
        .single();

      if (error) throw error;

      if (!data) {
        throw new Error("新增機票失敗");
      }

      savedFlightId = Number(data.id);
    }

    // 8. 儲存所有航段
    // 相同 flight_id + segment_order 更新原紀錄
    const segmentsToSave = segmentRows.map(
      (segment) => ({
        ...segment,
        flight_id: savedFlightId,
      })
    );

    const { error: segmentError } = await supabase
      .from("TripFlightSegments")
      .upsert(segmentsToSave, {
        onConflict: "flight_id,segment_order",
      });

    if (segmentError) {
      throw segmentError;
    }

    // 9. 若編輯時移除了航段，刪除多餘紀錄
    const { error: cleanupError } = await supabase
      .from("TripFlightSegments")
      .delete()
      .eq("flight_id", savedFlightId)
      .gt("segment_order", segmentRows.length);

    if (cleanupError) {
      throw cleanupError;
    }

    // 10. 更新列表
    await loadFlights();

    alert(
      editingFlightId !== null
        ? "機票與轉機航段更新成功！"
        : "機票與轉機航段新增成功！"
    );

    // 11. 清空表單
    setFlightForm({
      airline: "",
      flight_number: "",
      departure_airport: "",
      arrival_airport: "",
      departure_at: "",
      arrival_at: "",
      departure_timezone: "",
      arrival_timezone: "",
      confirmation_number: "",
      cabin_class: "",
      baggage_allowance: "",
      amount: "",
      currency: "USD",
      payment_status: "unpaid",
      flight_direction: "other",
      booking_platform: "",

      booking_url: "",
      notes: "",
    });

    setFlightSegments([
      createFlightSegment(1),
    ]);

    setEditingFlightId(null);
    setShowFlightForm(false);
  } catch (error) {
    console.error("儲存機票失敗：", error);

    alert(
      error instanceof Error
        ? `儲存失敗：${error.message}`
        : "儲存機票失敗"
    );
  } finally {
    setSavingFlight(false);
  }
};



  
/* =========================================
   飯店表單資料 State
   ========================================= */

const [hotelForm, setHotelForm] = useState({
  hotel_name: "",
  check_in: "",
  check_out: "",
  address: "",
  room_type: "",
  confirmation_number: "",
  booking_platform: "",
  amount: "",
  currency: "USD",
  payment_status: "unpaid",
  booking_url: "",
  notes: "",
});

/* =========================================
   飯店儲存狀態
   ========================================= */

const [savingHotel, setSavingHotel] =
  useState(false);

  /* =========================================
   目前正在編輯的飯店 ID
   null = 新增飯店
   數字 = 編輯現有飯店
   ========================================= */

const [editingHotelId, setEditingHotelId] =
  useState<number | null>(null);
/* =========================================
   更新飯店表單欄位
   ========================================= */

const updateHotelField = (
  field: keyof typeof hotelForm,
  value: string
) => {
  setHotelForm((prev) => ({
    ...prev,
    [field]: value,
  }));
};



/* =========================================
   開始編輯飯店
   自動帶入現有住宿資料
   ========================================= */

const startEditHotel = (hotel: TripHotel) => {
  setEditingHotelId(hotel.id);

  setHotelForm({
    hotel_name: hotel.hotel_name || "",
    check_in: hotel.check_in || "",
    check_out: hotel.check_out || "",
    address: hotel.address || "",
    room_type: hotel.room_type || "",
    confirmation_number:
      hotel.confirmation_number || "",
    booking_platform:
      hotel.booking_platform || "",
    amount:
      hotel.amount === null
        ? ""
        : String(hotel.amount),
    currency: hotel.currency || "USD",
    payment_status:
      hotel.payment_status || "unpaid",
    booking_url: hotel.booking_url || "",
    notes: hotel.notes || "",
  });

  setShowHotelForm(true);
};


/* =========================================
   每日行程：直接編輯指定飯店
   ========================================= */

const editHotelFromItinerary = (
  sourceId: string | number
) => {
  const hotel = hotels.find(
    (item) => String(item.id) === String(sourceId)
  );

  if (!hotel) {
    alert("找不到對應的飯店資料，請重新整理頁面");
    return;
  }

  // 切換至飯店分頁
  setActiveTab("hotels");

  // 帶入指定飯店的編輯資料
  startEditHotel(hotel);

  // 捲動至頁面上方
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};

  
/* =========================================
   儲存飯店資料到 Supabase
   ========================================= */

const saveHotel = async () => {
  if (savingHotel) return;

  // 1. 確認旅程 ID
  if (!id || !Number.isSafeInteger(Number(id))) {
    alert("找不到有效的旅程 ID");
    return;
  }

  // 2. 必填欄位
  if (!hotelForm.hotel_name.trim()) {
    alert("請輸入飯店名稱");
    return;
  }

  // 3. 日期檢查
  if (
    hotelForm.check_in &&
    hotelForm.check_out &&
    hotelForm.check_out <= hotelForm.check_in
  ) {
    alert("退房日期必須晚於入住日期");
    return;
  }

  // 4. 金額檢查
  const amountText = hotelForm.amount.trim();

  const amount =
    amountText === "" ? null : Number(amountText);

  if (
    amount !== null &&
    (!Number.isFinite(amount) || amount < 0)
  ) {
    alert("請輸入有效的住宿金額");
    return;
  }

  setSavingHotel(true);

  try {
    // 5. 取得目前登入的使用者
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("請先登入後再儲存飯店");
    }

    
    // 6. 整理飯店資料
    const hotelData = {
      hotel_name: hotelForm.hotel_name.trim(),
      check_in: hotelForm.check_in || null,
      check_out: hotelForm.check_out || null,
      address: hotelForm.address.trim() || null,
      room_type: hotelForm.room_type.trim() || null,
      confirmation_number:
        hotelForm.confirmation_number.trim() || null,
      booking_platform:
        hotelForm.booking_platform.trim() || null,
      amount,
      currency: hotelForm.currency.trim() || "USD",
      payment_status: hotelForm.payment_status,
      booking_url: hotelForm.booking_url.trim() || null,
      notes: hotelForm.notes.trim() || null,
    };

    if (editingHotelId !== null) {
      // 編輯：更新原本飯店
      const { data, error } = await supabase
        .from("TripHotels")
        .update(hotelData)
        .eq("id", editingHotelId)
        .eq("trip_id", Number(id))
        .eq("user_id", user.id)
        .select("id");

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("沒有更新到飯店資料，請確認權限");
      }
    } else {
      // 新增：建立新飯店
      const { error } = await supabase
        .from("TripHotels")
        .insert({
          ...hotelData,
          trip_id: Number(id),
          user_id: user.id,
        });

      if (error) throw error;
    }


    
    // 7. 儲存成功後重新讀取飯店列表
    await loadHotels();

alert(
  editingHotelId !== null
    ? "飯店資料更新成功！"
    : "飯店資料儲存成功！"
);

// 8. 清空表單
setHotelForm({
      hotel_name: "",
      check_in: "",
      check_out: "",
      address: "",
      room_type: "",
      confirmation_number: "",
      booking_platform: "",
      amount: "",
      currency: "USD",
      payment_status: "unpaid",
      booking_url: "",
      notes: "",
    });

    setShowHotelForm(false);
setEditingHotelId(null);

} catch (error) {
    console.error("儲存飯店失敗：", error);

    alert(
      error instanceof Error
        ? `儲存失敗：${error.message}`
        : "儲存失敗，請稍後再試"
    );
  } finally {
    setSavingHotel(false);
  }
};

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
   支出分頁篩選
   - category = 大分類
   - payment  = 付款方式
   ========================================================= */
  const [
  expenseCategoryFilter,
  setExpenseCategoryFilter,
] = useState("all");

const [
  expensePaymentFilter,
  setExpensePaymentFilter,
] = useState("all");

  
/* =========================================
   載入目前旅程的飯店資料
   ========================================= */

async function loadHotels() {
  if (!id) return;

  setLoadingHotels(true);

  try {
    const { data, error } = await supabase
      .from("TripHotels")
      .select(`
        id,
        trip_id,
        hotel_name,
        check_in,
        check_out,
        address,
        room_type,
        confirmation_number,
        booking_platform,
        amount,
        currency,
        payment_status,
        booking_url,
        notes
      `)
      .eq("trip_id", id)
      .order("check_in", {
        ascending: true,
        nullsFirst: false,
      });

    
if (error) {
  throw error;
}

// 診斷：確認 Supabase 實際讀取結果
console.log("TripHotels 目前旅程 ID：", id);
console.log("TripHotels 查詢資料：", data);
console.log("TripHotels 資料筆數：", data?.length ?? 0);

setHotels((data ?? []) as TripHotel[]);

  } catch (error) {
    console.error("載入飯店失敗：", error);

    setMessage(
      error instanceof Error
        ? `載入飯店失敗：${error.message}`
        : "無法載入飯店資料"
    );
  } finally {
    setLoadingHotels(false);
  }
}


/* =========================================
   載入目前旅程的機票資料
   ========================================= */

async function loadFlights() {
  if (!id) return;

  setLoadingFlights(true);

  try {
    const { data, error } = await supabase
      .from("TripFlights")
      .select(`
        id,
        trip_id,
        airline,
        flight_number,
        departure_airport,
        arrival_airport,
        departure_at,
        arrival_at,
        departure_timezone,
        arrival_timezone,
        confirmation_number,
        cabin_class,
        baggage_allowance,
        amount,
        currency,
        payment_status,
        flight_direction,
        booking_platform,
        booking_url,
        notes
      `)
        .eq("trip_id", id)
        .order("departure_at", {
          ascending: true,
          nullsFirst: false,
        })
        .order("id", {
          ascending: true,
        });


    if (error) {
      throw error;
    }

    setFlights((data ?? []) as TripFlight[]);
  } catch (error) {
    console.error("載入機票失敗：", error);

    setMessage(
      error instanceof Error
        ? `載入機票失敗：${error.message}`
        : "無法載入機票資料"
    );
  } finally {
    setLoadingFlights(false);
  }
}


/* =========================================
   載入目前旅程的租車資料
   ========================================= */

async function loadCarRentals() {
  if (!id) return;

  setLoadingCarRentals(true);

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("請先登入");
    }

    const { data, error } = await supabase
      .from("TripCarRentals")
      .select(`
        id,
        trip_id,
        user_id,
        rental_company,
        confirmation_number,
        vehicle_type,
        vehicle_class,
        pickup_location,
        pickup_at,
        pickup_timezone,
        dropoff_location,
        dropoff_at,
        dropoff_timezone,
        amount,
        currency,
        payment_status,
        booking_platform,
        booking_url,
        notes,
        created_at
      `)
      .eq("trip_id", Number(id))
      .eq("user_id", user.id)
      .order("pickup_at", {
        ascending: true,
        nullsFirst: false,
      });

    if (error) throw error;

    setCarRentals((data ?? []) as TripCarRental[]);
  } catch (error) {
    console.error("載入租車資料失敗：", error);

    setMessage(
      error instanceof Error
        ? `載入租車資料失敗：${error.message}`
        : "無法載入租車資料"
    );
  } finally {
    setLoadingCarRentals(false);
  }
}


/* =========================================
   載入目前旅程的預約行程
   ========================================= */

async function loadTripBookings() {
  if (!id) return;

  setLoadingTripBookings(true);

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("請先登入");
    }

    const { data, error } = await supabase
      .from("TripBookings")
      .select(`
        id,
        trip_id,
        user_id,
        booking_type,
        name,
        confirmation_number,
        booking_platform,
        start_at,
        end_at,
        timezone,
        location,
        meeting_point,
        participants,
        amount,
        currency,
        payment_status,
        booking_url,
        notes,
        created_at
      `)
      .eq("trip_id", Number(id))
      .eq("user_id", user.id)
      .order("start_at", {
        ascending: true,
        nullsFirst: false,
      });

    if (error) throw error;

    setTripBookings((data ?? []) as TripBooking[]);
  } catch (error) {
    console.error("載入預約行程失敗：", error);

    setMessage(
      error instanceof Error
        ? `載入預約行程失敗：${error.message}`
        : "無法載入預約行程"
    );
  } finally {
    setLoadingTripBookings(false);
  }
}


/* =========================================
   載入目前旅程的行李清單
   ========================================= */

async function loadPackingItems() {
  if (!id) return;

  setLoadingPackingItems(true);

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("請先登入");
    }

    const { data, error } = await supabase
      .from("TripPackingItems")
      .select("*")
      .eq("trip_id", Number(id))
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;

    setPackingItems((data ?? []) as TripPackingItem[]);
  } catch (error) {
    console.error("載入行李清單失敗：", error);

    alert(
      error instanceof Error
        ? `載入行李清單失敗：${error.message}`
        : "無法載入行李清單"
    );
  } finally {
    setLoadingPackingItems(false);
  }
}


/* =========================================
   載入目前旅程的備註
   ========================================= */

async function loadTripNotes() {
  const tripId = Number(id);

  if (!Number.isSafeInteger(tripId) || tripId <= 0) {
    return;
  }

  setLoadingTripNotes(true);

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("請先登入");
    }

    const { data, error } = await supabase
      .from("TripNotes")
      .select(`
        id,
        trip_id,
        user_id,
        title,
        category,
        content,
        is_important,
        sort_order,
        created_at,
        updated_at
      `)
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .order("is_important", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) throw error;

    setTripNotes((data ?? []) as TripNote[]);
  } catch (error) {
    console.error("載入旅程備註失敗：", error);

    alert(
      error instanceof Error
        ? `載入備註失敗：${error.message}`
        : "無法載入旅程備註"
    );
  } finally {
    setLoadingTripNotes(false);
  }
}


/* =========================================
   載入人員管理資料
   ========================================= */

async function loadPackingPeople() {
  setLoadingPackingPeople(true);

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("請先登入");
    }

    const { data, error } = await supabase
      .from("People")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name", { ascending: true });

    if (error) throw error;

    setPackingPeople((data ?? []) as PackingPerson[]);
  } catch (error) {
    console.error("載入行李使用人員失敗：", error);
    setPackingPeople([]);
  } finally {
    setLoadingPackingPeople(false);
  }
}


  
/* =========================================
   機票分類與日期排序
   ========================================= */

const groupedFlights = {
  outbound: flights
    .filter((flight) => flight.flight_direction === "outbound")
    .sort((a, b) =>
      (a.departure_at
        ? new Date(a.departure_at).getTime()
        : Infinity) -
      (b.departure_at
        ? new Date(b.departure_at).getTime()
        : Infinity)
    ),

  return: flights
    .filter((flight) => flight.flight_direction === "return")
    .sort((a, b) =>
      (a.departure_at
        ? new Date(a.departure_at).getTime()
        : Infinity) -
      (b.departure_at
        ? new Date(b.departure_at).getTime()
        : Infinity)
    ),

  other: flights
    .filter(
      (flight) =>
        flight.flight_direction !== "outbound" &&
        flight.flight_direction !== "return"
    )
    .sort((a, b) =>
      (a.departure_at
        ? new Date(a.departure_at).getTime()
        : Infinity) -
      (b.departure_at
        ? new Date(b.departure_at).getTime()
        : Infinity)
    ),
};



/* =========================================
   自動載入各張機票的轉機航段
   ========================================= */

useEffect(() => {
  let cancelled = false;

  const fetchFlightSegments = async () => {
    if (flights.length === 0) {
      setFlightSegmentsByFlight({});
      setLoadingFlightSegments(false);
      return;
    }

    setLoadingFlightSegments(true);

    try {
      const flightIds = flights.map((flight) => flight.id);

      const { data, error } = await supabase
        
.from("TripFlightSegments")
.select(`
  id,
  flight_id,
  segment_order,
  airline,
  flight_number,
  departure_airport,
  arrival_airport,
  departure_at,
  arrival_at,
  departure_timezone,
  arrival_timezone,
  departure_terminal,
  arrival_terminal,
  departure_gate,
  seat_number,
  cabin_class,
  baggage_allowance,
  notes
`)

        .in("flight_id", flightIds)
        .order("segment_order", { ascending: true });

      if (error) throw error;

      const grouped: Record<number, TripFlightSegment[]> = {};

      for (const segment of (data ?? []) as TripFlightSegment[]) {
        if (!grouped[segment.flight_id]) {
          grouped[segment.flight_id] = [];
        }

        grouped[segment.flight_id].push(segment);
      }

      if (!cancelled) {
        setFlightSegmentsByFlight(grouped);
      }
    } catch (error) {
      console.error("載入轉機航段失敗：", error);

      if (!cancelled) {
        setFlightSegmentsByFlight({});
      }
    } finally {
      if (!cancelled) {
        setLoadingFlightSegments(false);
      }
    }
  };

  void fetchFlightSegments();

  return () => {
    cancelled = true;
  };
}, [flights]);




/* =========================================
   刪除飯店
   ========================================= */

const deleteHotel = async (hotel: TripHotel) => {
  const confirmed = window.confirm(
    `確定要刪除「${hotel.hotel_name}」嗎？\n\n刪除後無法復原。`
  );

  if (!confirmed) return;

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("請先登入");
    }

    const { data, error } = await supabase
      .from("TripHotels")
      .delete()
      .eq("id", hotel.id)
      .eq("trip_id", hotel.trip_id)
      .eq("user_id", user.id)
      .select("id");

    if (error) throw error;

    if (!data || data.length === 0) {
      throw new Error("找不到可刪除的飯店資料，請確認權限");
    }

    // 如果正在編輯被刪除的飯店，關閉表單
    if (editingHotelId === hotel.id) {
      setEditingHotelId(null);
      setShowHotelForm(false);
    }

    await loadHotels();

    alert("飯店已成功刪除！");
  } catch (error) {
    console.error("刪除飯店失敗：", error);

    alert(
      error instanceof Error
        ? `刪除失敗：${error.message}`
        : "刪除飯店失敗"
    );
  }
};

  
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
        loadHotels(),
        loadFlights(),
        loadCarRentals(),
        loadTripBookings(),
        loadPackingItems(),
        loadPackingPeople(),
        loadTripNotes(),

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

  
/* =========================================
   每日行程整合：轉換手動行程
   ========================================= */

const manualUnifiedItems: UnifiedItineraryItem[] =
  itineraryItems.map((item) => ({
    key: `manual-${item.id}`,
    source: "manual",
    sourceId: item.id,

    date: item.date || "",
    start_time: item.start_time || null,
    end_time: item.end_time || null,

    title: item.title || "未命名行程",
    location: item.location || null,
    transportation: item.transportation || null,
    notes: item.notes || null,

    eventType: "manual",
    timezone: null,
  }));

  
/* =========================================
   每日行程整合：飯店入住與退房
   ========================================= */

const hotelUnifiedItems: UnifiedItineraryItem[] =
  hotels.flatMap((hotel) => {
    const items: UnifiedItineraryItem[] = [];

    // 飯店入住（原本只有日期，沒有時間）
    if (hotel.check_in) {
      const checkInDate = String(hotel.check_in).slice(0, 10);

      items.push({
        key: `hotel-checkin-${hotel.id}`,
        source: "hotel",
        sourceId: hotel.id,

        date: checkInDate,
        start_time: null,
        end_time: null,

        title: `🏨 入住：${hotel.hotel_name || "飯店"}`,
        location: hotel.address || null,
        transportation: null,
        notes: hotel.notes || null,

        eventType: "checkin",
        timezone: null,
      });
    }

    // 飯店退房
    if (hotel.check_out) {
      const checkOutDate = String(hotel.check_out).slice(0, 10);

      items.push({
        key: `hotel-checkout-${hotel.id}`,
        source: "hotel",
        sourceId: hotel.id,

        date: checkOutDate,
        start_time: null,
        end_time: null,

        title: `🏨 退房：${hotel.hotel_name || "飯店"}`,
        location: hotel.address || null,
        transportation: null,
        notes: hotel.notes || null,

        eventType: "checkout",
        timezone: null,
      });
    }

    return items;
  });

  
/* =========================================
   每日行程整合：航班起飛與抵達
   - 支援多段航班
   - 使用各航段原本儲存的當地日期時間
   ========================================= */

const flightUnifiedItems: UnifiedItineraryItem[] =
  flights.flatMap((flight) => {
    const items: UnifiedItineraryItem[] = [];

    const savedSegments =
      flightSegmentsByFlight[flight.id] || [];

    // 如果沒有航段資料，使用原本機票欄位
    const segments = savedSegments.length > 0
      ? savedSegments
      : [
          {
            id: flight.id,
            flight_id: flight.id,
            segment_order: 1,
            airline: flight.airline,
            flight_number: flight.flight_number,
            departure_airport: flight.departure_airport,
            arrival_airport: flight.arrival_airport,
            departure_at: flight.departure_at,
            arrival_at: flight.arrival_at,
            departure_timezone: flight.departure_timezone,
            arrival_timezone: flight.arrival_timezone,
            departure_terminal: null,
            arrival_terminal: null,
            departure_gate: null,
            seat_number: null,
            cabin_class: flight.cabin_class,
            baggage_allowance: flight.baggage_allowance,
            notes: flight.notes,
          },
        ];

    segments.forEach((segment, index) => {
  const departureLocal = getLocalItineraryDateTime(
    segment.departure_at,
    segment.departure_timezone
  );

  const arrivalLocal = getLocalItineraryDateTime(
    segment.arrival_at,
    segment.arrival_timezone
  );

  const airline = segment.airline || "航空公司";
      const flightNumber = segment.flight_number || "";
      const flightName =
        `${airline} ${flightNumber}`.trim();

      // 起飛紀錄
      if (segment.departure_at) {
        

        items.push({
          key: `flight-departure-${flight.id}-${index}`,
          source: "flight",
          sourceId: flight.id,

          date: departureLocal.date,
start_time: departureLocal.time,
end_time: null,

          title: `🛫 起飛：${flightName}`,
          location: segment.departure_airport || null,
          transportation: null,
          notes: [
            segment.arrival_airport
              ? `目的地：${segment.arrival_airport}`
              : "",
            segment.departure_terminal
              ? `出發航廈：${segment.departure_terminal}`
              : "",
            segment.departure_gate
              ? `登機門：${segment.departure_gate}`
              : "",
            segment.seat_number
              ? `座位：${segment.seat_number}`
              : "",
          ].filter(Boolean).join("\n") || null,

          eventType: "departure",
          timezone: segment.departure_timezone,
        });
      }

      // 抵達紀錄
      if (segment.arrival_at) {
      

        items.push({
          key: `flight-arrival-${flight.id}-${index}`,
          source: "flight",
          sourceId: flight.id,

          date: arrivalLocal.date,
start_time: arrivalLocal.time,
end_time: null,

          title: `🛬 抵達：${flightName}`,
          location: segment.arrival_airport || null,
          transportation: null,
          notes: [
            segment.departure_airport
              ? `出發地：${segment.departure_airport}`
              : "",
            segment.arrival_terminal
              ? `抵達航廈：${segment.arrival_terminal}`
              : "",
          ].filter(Boolean).join("\n") || null,

          eventType: "arrival",
          timezone: segment.arrival_timezone,
        });
      }
    });

    return items;
  });

  
/* =========================================
   每日行程整合：租車取車與還車
   ========================================= */

const carRentalUnifiedItems: UnifiedItineraryItem[] =
  carRentals.flatMap((rental) => {
    const items: UnifiedItineraryItem[] = [];

    const company =
      rental.rental_company || "租車公司";

    // 取車事件
    if (rental.pickup_at) {
  const pickupLocal = getLocalItineraryDateTime(
    rental.pickup_at,
    rental.pickup_timezone
  );

      items.push({
        key: `car-pickup-${rental.id}`,
        source: "carRental",
        sourceId: rental.id,

        date: pickupLocal.date,
start_time: pickupLocal.time,
end_time: null,

        title: `🚗 取車：${company}`,
        location: rental.pickup_location || null,
        transportation: null,

        notes:
          [
            rental.vehicle_type
              ? `車型：${rental.vehicle_type}`
              : "",
            rental.confirmation_number
              ? `訂單編號：${rental.confirmation_number}`
              : "",
            rental.notes || "",
          ]
            .filter(Boolean)
            .join("\n") || null,

        eventType: "pickup",
        timezone: rental.pickup_timezone || null,
      });
    }

    // 還車事件
    if (rental.dropoff_at) {
  const dropoffLocal = getLocalItineraryDateTime(
    rental.dropoff_at,
    rental.dropoff_timezone
  );

      items.push({
        key: `car-dropoff-${rental.id}`,
        source: "carRental",
        sourceId: rental.id,

        date: dropoffLocal.date,
start_time: dropoffLocal.time,
end_time: null,

        title: `🚙 還車：${company}`,
        location: rental.dropoff_location || null,
        transportation: null,

        notes:
          [
            rental.confirmation_number
              ? `訂單編號：${rental.confirmation_number}`
              : "",
            rental.notes || "",
          ]
            .filter(Boolean)
            .join("\n") || null,

        eventType: "dropoff",
        timezone: rental.dropoff_timezone || null,
      });
    }

    return items;
  });

  
/* =========================================
   每日行程整合：預約行程
   - 景點門票
   - 餐廳
   - 導覽
   - 活動
   - 體驗
   ========================================= */

const bookingUnifiedItems: UnifiedItineraryItem[] =
  tripBookings.flatMap((booking) => {
    const items: UnifiedItineraryItem[] = [];

    // 沒有設定開始日期的預約，暫時不加入每日行程
    if (!booking.start_at) {
      return items;
    }

    const startLocal = getLocalItineraryDateTime(
  booking.start_at,
  booking.timezone
);

const endLocal = getLocalItineraryDateTime(
  booking.end_at,
  booking.timezone
);

    const bookingTypeIcons: Record<string, string> = {
      attraction: "🎫",
      restaurant: "🍽️",
      tour: "🧭",
      activity: "🎭",
      experience: "✨",
      other: "📋",
    };

    const icon =
      bookingTypeIcons[booking.booking_type] || "📋";

    // 有相同日期才將結束時間放在同一筆行程
    const endTime =
        endLocal.date &&
        endLocal.date === startLocal.date
    ? endLocal.time
    : null;

    items.push({
      key: `booking-${booking.id}`,
      source: "booking",
      sourceId: booking.id,

      date: startLocal.date,
      start_time: startLocal.time,
      end_time: endTime,

      title: `${icon} ${booking.name || "未命名預約"}`,
      location:
        booking.location ||
        booking.meeting_point ||
        null,

      transportation: null,

      notes:
        [
          booking.meeting_point
            ? `集合地點：${booking.meeting_point}`
            : "",
          booking.confirmation_number
            ? `預約編號：${booking.confirmation_number}`
            : "",
          booking.participants != null
            ? `預約人數：${booking.participants} 人`
            : "",
          booking.notes || "",
        ]
          .filter(Boolean)
          .join("\n") || null,

      eventType: booking.booking_type || "other",
      timezone: booking.timezone || null,
    });

    return items;
  });


/* =========================================
   每日行程整合：合併所有來源
   ========================================= */

const allUnifiedItineraryItems: UnifiedItineraryItem[] = [
  ...manualUnifiedItems,
  ...hotelUnifiedItems,
  ...flightUnifiedItems,
  ...carRentalUnifiedItems,
  ...bookingUnifiedItems,
];

/* =========================================
   每日行程整合：依日期分組
   ========================================= */

const groupedUnifiedItineraryItems =
  allUnifiedItineraryItems.reduce<
    Record<string, UnifiedItineraryItem[]>
  >((result, item) => {
    const dateKey = item.date || "日期未設定";

    if (!result[dateKey]) {
      result[dateKey] = [];
    }

    result[dateKey].push(item);

    return result;
  }, {});

/* =========================================
   每日行程整合：各日期內依時間排序
   ========================================= */

Object.values(groupedUnifiedItineraryItems).forEach(
  (items) => {
    items.sort((a, b) => {
      const timeA = a.start_time || "99:99:99";
      const timeB = b.start_time || "99:99:99";

      const timeComparison = timeA.localeCompare(timeB);

      if (timeComparison !== 0) {
        return timeComparison;
      }

      return a.key.localeCompare(b.key);
    });
  }
);



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
        background: "#f8f6f3",
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
          color: "#826349",
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
            background: "#faf7f2",
            border:
              "1px solid #e6dcd0",
            borderRadius: 14,
            padding: 18,
            color: "#927f70",
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
              background: "#faf7f2",
              border:
                "1px solid #e6dcd0",
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
                    color: "#49392f",
                  }}
                >
                  {trip.name}
                </h1>

                <div
                  style={{
                    marginTop: 10,
                    fontSize: 15,
                    color: "#674b39",
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
    color: "#674b39",
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
        "1px solid #d8c6b4",
      borderRadius: 10,
      background: "#ffffff",
      color: "#674b39",
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
{Object.keys(totalsByCurrency).length > 0 && (
  <div
    style={{
      marginTop: 12,
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap",
    }}
  >
    <span
      style={{
        fontSize: 14,
        fontWeight: 600,
        color: "#927f70",
      }}
    >
      總支出：
    </span>

    {Object.entries(totalsByCurrency).map(
      ([currency, amount]) => (
        <span
          key={currency}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            background: "#f2ebe2",
            border: "1px solid #e6dcd0",
            borderRadius: 10,
            color: "#49392f",
            fontSize: 14,
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          {currency} {formatAmount(amount)}
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
                    "1px solid #e6dcd0",
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: "#927f70",
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
          
{/* =========================================
    旅程分頁導覽
    原本 3 個 + 新增 6 個
    奶油米色系 / 自動換行
   ========================================= */}

{(
  [
    { key: "itinerary", label: "行程", icon: "📅" },
    { key: "expenses", label: "支出", icon: "💰" },
    { key: "stats", label: "統計", icon: "📊" },
    { key: "hotels", label: "飯店", icon: "🏨" },
    { key: "flights", label: "機票", icon: "✈️" },
    { key: "carRentals", label: "租車", icon: "🚗" },
    { key: "bookings", label: "預約行程", icon: "🎟️" },
    { key: "packing", label: "打包清單", icon: "🧳" },
    { key: "notes", label: "備註", icon: "📝" },
  ] as const
).map((tab) => {
  const selected = activeTab === tab.key;

  return (
    <button
      key={tab.key}
      type="button"
      onClick={() => setActiveTab(tab.key)}
      style={{
        height: 44,
        padding: "0 17px",
        borderRadius: 12,
        border: selected
          ? "1px solid #826349"
          : "1px solid #e6dcd0",
        background: selected
          ? "#826349"
          : "#ffffff",
        color: selected
          ? "#ffffff"
          : "#674b39",
        fontSize: 14,
        fontWeight: selected ? 700 : 600,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        whiteSpace: "nowrap",
        transition: "all 0.15s ease",
      }}
    >
      <span>{tab.icon}</span>
      <span>{tab.label}</span>
    </button>
  );
})}

          </div>

          {/* =================================================
              行程分頁
             ================================================= */}
          {activeTab ===
            "itinerary" && (
            <section
              style={{
                background: "#faf7f2",
                border:
                  "1px solid #e6dcd0",
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
                    color: "#49392f",
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
                      "#826349",
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
              {allUnifiedItineraryItems.length === 0 ? (
                <div
                  style={{
                    padding:
                      "24px 0",
                    textAlign:
                      "center",
                    color:
                      "#927f70",
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
  groupedUnifiedItineraryItems
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
                          "1px solid #e6dcd0",
                          }}
                          >
                       {getTripDayNumber(
  date,
  trip.start_date
) !== null && (
  <div
    style={{
      padding: "4px 9px",
      background: "#f2ebe2",
      color: "#826349",
      border: "1px solid #d8c6b4",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
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
      color: "#49392f",
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
  key={item.key}
  style={{
    padding: "16px",
    marginBottom: 12,
    background: "#faf7f2",
    border: "1px solid #e6dcd0",
    borderLeft: "4px solid #826349",
    borderRadius: 12,
    boxShadow: "0 2px 6px rgba(73,57,47,0.05)",
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

  
{/* =========================================
    每日行程：開始／結束時間
   ========================================= */}


<div
  style={{
    width: 76,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: 4,
  }}
>

  <div
    style={{
      fontSize: 15,
      fontWeight: 800,
      color: "#826349",
      fontVariantNumeric: "tabular-nums",
      whiteSpace: "nowrap",
    }}
  >
    {formatItineraryTime(item.start_time) || "未設定"}
  </div>

  {item.end_time && (
    <div
      style={{
        fontSize: 12,
        fontWeight: 500,
        color: "#8b8178",
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
      }}
    >
      ～ {formatItineraryTime(item.end_time)}
    </div>
  )}

  <div
    style={{
      fontSize: 10,
      color: "#9b8b7e",
      marginTop: 2,
    }}
  >
    當地時間
  </div>

  
{/* 行程類型標籤：放在時間下方 */}
<span
  style={{
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px 8px",
    marginTop: 6,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 700,
    whiteSpace: "nowrap",
    background:
      item.source === "flight"
        ? "#edf3ff"
        : item.source === "hotel"
          ? "#eaf5ef"
          : item.source === "carRental"
            ? "#fff1e5"
            : item.source === "booking"
              ? "#f3eefe"
              : "#f4eee8",
    color:
      item.source === "flight"
        ? "#285ea8"
        : item.source === "hotel"
          ? "#287a52"
          : item.source === "carRental"
            ? "#a35a21"
            : item.source === "booking"
              ? "#7253a5"
              : "#826349",
  }}
>
  {item.source === "flight"
    ? "✈️ 機票"
    : item.source === "hotel"
      ? "🏨 飯店"
      : item.source === "carRental"
        ? "🚗 租車"
        : item.source === "booking"
          ? "🎟️ 預約"
          : "📝 手動"}
</span>

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

     
{/* =========================================
    每日行程：來源標籤與標題
   ========================================= */}

<div
  style={{
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  }}
>
  

  <div
    style={{
      minWidth: 0,
      flex: "1 1 180px",
      fontSize: 16,
      fontWeight: 700,
      color: "#49392f",
      overflowWrap: "anywhere",
    }}
  >
    {item.title}
  </div>
</div>

     {/* =========================
     地點
      ========================= */}
                                  {item.location && (
                                    <div
                                      style={{
                                        marginTop: 6,
                                        fontSize: 14,
                                        color: "#674b39",
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
                                        color: "#674b39",
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
                                        color: "#927f70",
                                        whiteSpace: "pre-wrap",
                                        }}
                                    >
                                      備註：
                                      {item.notes}
                                    </div>
    )}
                                </div>

                              
                                
{/* =========================================
    每日行程操作：依資料來源顯示
   ========================================= */}

<div
  style={{
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  }}
>
  {item.source === "manual" ? (
    <>
      
<Link
  href={`/trips/${trip.id}/itinerary/${item.sourceId}/edit`}
  style={{
    ...editActionButtonStyle,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    flexShrink: 0,
    textDecoration: "none",
  }}
>
  ✏️ 編輯
</Link>


      <button
        type="button"
        onClick={() =>
          handleDeleteItinerary(item.sourceId)
        }
        style={deleteActionButtonStyle}
      >
        🗑️ 刪除
      </button>
    </>
  
) : (
  <button
    type="button"
    


onClick={() => {
  if (item.source === "flight") {
    void editFlightFromItinerary(item.sourceId);
  } else if (item.source === "hotel") {
    editHotelFromItinerary(item.sourceId);
  } else if (item.source === "carRental") {
    editCarRentalFromItinerary(item.sourceId);
  } else if (item.source === "booking") {
    editTripBookingFromItinerary(item.sourceId);
  } else {
    goToItinerarySource(item.source);
  }
}}
style={itinerarySourceEditButtonStyle}
  >
    {item.source === "flight"
  ? "✈️ 編輯機票"
  : item.source === "hotel"
  ? "🏨 編輯飯店"
    : item.source === "carRental"
  ? "🚗 編輯租車"
      : "🎟️ 編輯預約"}
    <span aria-hidden="true">→</span>
  </button>
)}

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
                background: "#faf7f2",
                border:
                  "1px solid #e6dcd0",
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
                    color: "#49392f",
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
                       "#826349",
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
                    background: "#f2ebe2",
                    border:
                      "1px solid #e6dcd0",
                    borderRadius: 10,
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#927f70",
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
                          color: "#49392f",
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
                      "#927f70",
                    fontSize: 14,
                  }}
                  >
                  目前沒有旅程支出
                </div>
              ) : (

                
      
<div>
  {Object.entries(groupedExpenses).map(
    ([date, dayExpenses]) => (
      <div
        key={date}
        style={{
          marginBottom: 20,
          padding: "20px 24px",
          background: "#faf7f2",
          border: "1px solid #e6dcd0",
          borderRadius: 16,
          boxSizing: "border-box",
          width: "100%",
          minWidth: 0,
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
      "1px solid #e6dcd0",
  }}
  >
  {/* 日期 */}
  <div
    style={{
      fontSize: 15,
      fontWeight: 700,
      color: "#49392f",
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
            color: "#674b39",
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
  borderBottom: "1px solid #e6dcd0",
  textDecoration: "none",
  color: "#49392f",
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
                      color: "#49392f",
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
                        color: "#927f70",
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
        color: "#927f70",
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
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#49392f",
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
                  background: "#faf7f2",
                  border:
                    "1px solid #e6dcd0",
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
                    color: "#49392f",
                  }}
                  >
                  統計
                </h2>

                

                {Object.keys(
                  totalsByCurrency
                ).length === 0 ? (
                  <div
                    style={{
                      marginTop: 8,
                      color:
                        "#927f70",
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
                    
{Object.entries(totalsByCurrency).map(
  ([currency, amount]) => (
    <div
      key={currency}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        width: "100%",
        padding: "14px 16px",
        background: "#f2ebe2",
        border: "1px solid #e6dcd0",
        borderRadius: 10,
        boxSizing: "border-box",
      }}
    >
      <span
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "#927f70",
        }}
      >
        總支出
      </span>

      <span
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "#49392f",
          whiteSpace: "nowrap",
        }}
      >
        {currency} {formatAmount(amount)}
      </span>
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
          ? "1px solid #826349"
          : "1px solid #d8c6b4",
      background:
        statsView === "category"
          ? "#826349"
          : "#ffffff",
      color:
        statsView === "category"
          ? "#ffffff"
          : "#674b39",
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
          ? "1px solid #826349"
          : "1px solid #d8c6b4",
      background:
        statsView === "payment"
          ? "#826349"
          : "#ffffff",
      color:
        statsView === "payment"
          ? "#ffffff"
          : "#674b39",
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
                  background: "#faf7f2",
                  border:
                     "1px solid #e6dcd0",
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
                    color: "#49392f",
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
                        "#927f70",
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
                              "1px solid #e6dcd0",
                          }}
                        >
                          <div
                            style={{
                              fontSize:
                                14,
                              fontWeight:
                                600,
                              color:
                                "#674b39",
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
                                      "#49392f",
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
                    background: "#faf7f2",
                    border:
                      "1px solid #e6dcd0",
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
                      color: "#49392f",
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
                          "#927f70",
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
                                "1px solid #e6dcd0",
                            }}
                            >
                            <div
                              style={{
                                fontSize:
                                  14,
                                fontWeight:
                                  600,
                                color:
                                  "#674b39",
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
                                        "#49392f",
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

          {/* =========================================
              飯店分頁
              奶油米色系列
             ========================================= */}

          {activeTab === "hotels" && (
            <section
              style={{
                background: "#fffdf9",
                border: "1px solid #e6dcd0",
                borderRadius: 16,
                padding: 22,
                marginBottom: 20,
              }}
            >
              {/* 標題 */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 22,
                      fontWeight: 800,
                      color: "#49392f",
                    }}
                  >
                    🏨 飯店管理
                  </h2>

                  <p
                    style={{
                      margin: "7px 0 0",
                      fontSize: 13,
                      color: "#927f70",
                    }}
                  >
                    集中管理這趟旅程的住宿資訊
                  </p>
                </div>
                
<button
  type="button"
  
onClick={() => {
  if (showHotelForm) {
    setShowHotelForm(false);
    setEditingHotelId(null);
  } else {
    setEditingHotelId(null);

    setHotelForm({
      hotel_name: "",
      check_in: "",
      check_out: "",
      address: "",
      room_type: "",
      confirmation_number: "",
      booking_platform: "",
      amount: "",
      currency: "USD",
      payment_status: "unpaid",
      booking_url: "",
      notes: "",
    });

    setShowHotelForm(true);
  }
}}

  style={{
    padding: "11px 18px",
    borderRadius: 12,
    border: "1px solid #826349",
    background: "#826349",
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  }}
>
  {showHotelForm ? "取消新增" : "＋ 新增飯店"}
</button>

              </div>

              
{showHotelForm && (
  <div
    style={{
      padding: 20,
      marginBottom: 20,
      background: "#faf7f2",
      border: "1px solid #e6dcd0",
      borderRadius: 14,
      color: "#49392f",
    }}
  >
    <h3
      style={{
        margin: "0 0 20px",
        fontSize: 18,
        fontWeight: 700,
      }}
    >
      新增住宿資料
    </h3>

    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fit, minmax(min(100%, 230px), 1fr))",
        gap: 16,
      }}
    >
      
{(
  [
    ["飯店名稱", "hotel_name", "text", "例如：Marriott Orlando"],
    ["入住日期", "check_in", "date", ""],
    ["退房日期", "check_out", "date", ""],
    ["地址", "address", "text", "飯店完整地址"],
    ["房型", "room_type", "text", "例如：KING / TWIN"],
    ["訂房編號", "confirmation_number", "text", "Confirmation Number"],
    ["訂房平台", "booking_platform", "text", "例如：Marriott / Booking"],
    ["住宿總金額", "amount", "number", "0.00"],
    ["幣別", "currency", "text", "USD / TWD / EUR"],
    ["訂房網址", "booking_url", "url", "https://"],
  ] as const
).map(([label, field, type, placeholder]) => (

        <label
          key={label}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 7,
            fontSize: 13,
            fontWeight: 600,
            color: "#674b39",
          }}
        >
          {label}

          
<input
  type={type}
  placeholder={placeholder}
  value={hotelForm[field]}
  onChange={(e) =>
    updateHotelField(field, e.target.value)
  }
  min={type === "number" ? "0" : undefined}
  step={type === "number" ? "0.01" : undefined}

            style={{
              width: "100%",
              minWidth: 0,
              boxSizing: "border-box",
              height: 42,
              padding: "0 12px",
              border: "1px solid #d8c6b4",
              borderRadius: 10,
              background: "#ffffff",
              color: "#49392f",
              fontSize: 14,
            }}
          />
        </label>
      ))}
    </div>

    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 7,
        marginTop: 16,
        fontSize: 13,
        fontWeight: 600,
        color: "#674b39",
      }}
    >
      付款狀態

      <select
  value={hotelForm.payment_status}
  onChange={(e) =>
    updateHotelField(
      "payment_status",
      e.target.value
    )
  }
  style={{
          height: 42,
          padding: "0 12px",
          border: "1px solid #d8c6b4",
          borderRadius: 10,
          background: "#ffffff",
          color: "#49392f",
        }}
      >
        <option value="unpaid">未付款</option>
        <option value="paid">已付款</option>
        <option value="partial">部分付款</option>
      </select>
    </label>

    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 7,
        marginTop: 16,
        fontSize: 13,
        fontWeight: 600,
        color: "#674b39",
      }}
    >
      備註

      <textarea
  rows={4}
  placeholder="例如：含早餐、免費停車、機場接駁、入住注意事項……"
  value={hotelForm.notes}
  onChange={(e) =>
    updateHotelField(
      "notes",
      e.target.value
    )
  }
  style={{
          width: "100%",
          boxSizing: "border-box",
          padding: 12,
          border: "1px solid #d8c6b4",
          borderRadius: 10,
          background: "#ffffff",
          color: "#49392f",
          fontSize: 14,
          resize: "vertical",
        }}
      />
    </label>

    
{/* =========================================
    飯店表單：儲存 / 取消按鈕
   ========================================= */}

<div
  style={{
    display: "flex",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 24,
    paddingTop: 18,
    borderTop: "1px solid #e6dcd0",
  }}
>
  <button
    type="button"
    onClick={() => setShowHotelForm(false)}
    disabled={savingHotel}
    style={{
      padding: "12px 20px",
      border: "1px solid #d8c6b4",
      borderRadius: 10,
      background: "#ffffff",
      color: "#674b39",
      fontSize: 14,
      fontWeight: 600,
      cursor: savingHotel ? "not-allowed" : "pointer",
    }}
  >
    取消
  </button>

  <button
    type="button"
    onClick={saveHotel}
    disabled={savingHotel}
    style={{
      padding: "12px 24px",
      border: "1px solid #826349",
      borderRadius: 10,
      background: savingHotel ? "#b6a08e" : "#826349",
      color: "#ffffff",
      fontSize: 14,
      fontWeight: 700,
      cursor: savingHotel ? "not-allowed" : "pointer",
    }}
  >
    {savingHotel ? "儲存中..." : "儲存飯店"}
  </button>
</div>

  </div>
)}

              
{/* =========================================
    飯店列表
   ========================================= */}

{loadingHotels ? (
  <div
    style={{
      padding: 28,
      textAlign: "center",
      color: "#927f70",
    }}
  >
    載入飯店資料中...
  </div>
) : hotels.length === 0 ? (
  <div
    style={{
      border: "1px dashed #d8c6b4",
      background: "#faf7f2",
      borderRadius: 14,
      padding: "35px 18px",
      textAlign: "center",
    }}
  >
    <div style={{ fontSize: 32, marginBottom: 12 }}>
      🏨
    </div>

    <div
      style={{
        fontSize: 16,
        fontWeight: 700,
        color: "#674b39",
      }}
    >
      尚未新增飯店
    </div>

    <p
      style={{
        fontSize: 13,
        color: "#927f70",
        marginTop: 10,
      }}
    >
      點擊「＋新增飯店」開始記錄住宿資訊。
    </p>
  </div>
) : (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 14,
    }}
  >
    {hotels.map((hotel) => (
      <div
        key={hotel.id}
        style={{
          background: "#ffffff",
          border: "1px solid #e6dcd0",
          borderRadius: 14,
          padding: "20px 22px",
          boxShadow: "0 2px 8px rgba(103,75,57,0.04)",
        }}
      >
        {/* 飯店名稱與付款狀態 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 800,
              color: "#49392f",
            }}
          >
            🏨 {hotel.hotel_name}
          </h3>

          <span
            style={{
              background:
                hotel.payment_status === "paid"
                  ? "#e8f0e5"
                  : hotel.payment_status === "partial"
                    ? "#fff0d9"
                    : "#f2ebe2",
              color:
                hotel.payment_status === "paid"
                  ? "#55704e"
                  : "#826349",
              padding: "5px 11px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {hotel.payment_status === "paid"
              ? "已付款"
              : hotel.payment_status === "partial"
                ? "部分付款"
                : "未付款"}
          </span>
          
          {/* 編輯 / 刪除按鈕群組 */}
<div
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    marginLeft: "auto",
  }}
>
  {/* 編輯飯店按鈕 */}
  <button
    type="button"
    onClick={() => startEditHotel(hotel)}
            style={editActionButtonStyle}
          >
            ✏️ 編輯
          </button>

          
{/* =========================================
    刪除飯店按鈕
   ========================================= */}

<button
  type="button"
  onClick={() => deleteHotel(hotel)}
  style={deleteActionButtonStyle}
>
    🗑️ 刪除
</button>
</div>


        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 210px), 1fr))",
            gap: 14,
            fontSize: 14,
            color: "#674b39",
            lineHeight: 1.6,
          }}
        >
          <div>
            <strong>入住日期：</strong>
            {hotel.check_in || "未設定"}
          </div>

          <div>
            <strong>退房日期：</strong>
            {hotel.check_out || "未設定"}
          </div>

          {hotel.room_type && (
            <div>
              <strong>房型：</strong>
              {hotel.room_type}
            </div>
          )}

          {hotel.booking_platform && (
            <div>
              <strong>訂房平台：</strong>
              {hotel.booking_platform}
            </div>
          )}

          {hotel.confirmation_number && (
            <div>
              <strong>訂房編號：</strong>
              {hotel.confirmation_number}
            </div>
          )}

          {hotel.amount !== null && (
            <div>
              <strong>住宿金額：</strong>
              {hotel.currency || "USD"}{" "}
              {formatAmount(hotel.amount)}
            </div>
          )}
        </div>

        {hotel.address && (
          <div
            style={{
              marginTop: 14,
              color: "#674b39",
              fontSize: 14,
              overflowWrap: "anywhere",
            }}
          >
            <strong>地址：</strong>
            {hotel.address}
          </div>
        )}

        {hotel.notes && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              background: "#faf7f2",
              borderRadius: 10,
              color: "#927f70",
              fontSize: 13,
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
            }}
          >
            {hotel.notes}
          </div>
        )}

        {hotel.booking_url && (
          <a
            href={hotel.booking_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              marginTop: 14,
              color: "#826349",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            查看訂房網址 ↗
          </a>
        )}
      
      </div>
    ))}
  </div>
)}

            </section>
          )}

{/* =========================================
    機票管理分頁
    ========================================= */}

{activeTab === "flights" && (
  <section
    style={{
      background: "#fffdf9",
      border: "1px solid #e6dcd0",
      borderRadius: 16,
      padding: 22,
      marginBottom: 20,
    }}
  >
    {/* 機票標題與新增按鈕 */}
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 20,
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 800,
            color: "#49392f",
          }}
        >
          ✈️ 機票管理
        </h2>

        <p
          style={{
            margin: "7px 0 0",
            fontSize: 13,
            color: "#927f70",
          }}
        >
          集中管理這趟旅程的航班與訂票資訊
        </p>
      </div>

      <button
        type="button"
        
onClick={() => {
  if (showFlightForm) {
    setShowFlightForm(false);
    setEditingFlightId(null);
  } else {
  setEditingFlightId(null);
  setFlightForm({
    airline: "",
    flight_number: "",
      departure_airport: "",
      arrival_airport: "",
      departure_at: "",
      arrival_at: "",
      departure_timezone: "",
      arrival_timezone: "",
      confirmation_number: "",
      cabin_class: "",
      baggage_allowance: "",
      amount: "",
      currency: "USD",
      payment_status: "unpaid",
      flight_direction: "other",
      booking_platform: "",
      booking_url: "",
      notes: "",
    });

    setShowFlightForm(true);
  }
}}

        style={{
          padding: "11px 18px",
          borderRadius: 12,
          border: "1px solid #826349",
          background: "#826349",
          color: "#ffffff",
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {showFlightForm
          ? "取消新增"
          : "＋ 新增機票"}
      </button>
    </div>

    
    
{/* =========================================
    機票新增／編輯表單
   ========================================= */}

{showFlightForm && (
  <div
    style={{
      background: "#faf7f2",
      border: "1px solid #e6dcd0",
      borderRadius: 14,
      padding: 20,
      marginBottom: 18,
      color: "#49392f",
    }}
  >
    <h3
      style={{
        margin: "0 0 20px",
        fontSize: 18,
        fontWeight: 700,
      }}
    >
      {editingFlightId !== null
        ? "編輯機票資料"
        : "新增機票資料"}
    </h3>

    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fit, minmax(min(100%, 230px), 1fr))",
        gap: 16,
      }}
    >
      {(
        [
          ["訂位代碼", "confirmation_number", "text", "Booking Reference"],
          ["機票總金額", "amount", "number", "0.00"],
          ["幣別", "currency", "text", "USD / TWD / EUR"],
          ["訂票平台", "booking_platform", "text", "例如：航空公司官網"],
          ["訂票網址", "booking_url", "url", "https://"],
        ] as const
      ).map(([label, field, type, placeholder]) => (
        <label
          key={field}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 7,
            fontSize: 13,
            fontWeight: 600,
            color: "#674b39",
          }}
        >
          {label}

          <input
            type={type}
            placeholder={placeholder}
            value={flightForm[field]}
            onChange={(e) =>
              updateFlightField(field, e.target.value)
            }
            min={type === "number" ? "0" : undefined}
            step={type === "number" ? "0.01" : undefined}
            style={{
              width: "100%",
              minWidth: 0,
              boxSizing: "border-box",
              height: 42,
              padding: "0 12px",
              border: "1px solid #d8c6b4",
              borderRadius: 10,
              background: "#ffffff",
              color: "#49392f",
              fontSize: 14,
            }}
          />
        </label>
      ))}
    </div>

    
{/* =========================================
    機票方向：去程 / 回程 / 其他
   ========================================= */}

<label
  style={{
    display: "flex",
    flexDirection: "column",
    gap: 7,
    marginTop: 16,
    fontSize: 13,
    fontWeight: 600,
    color: "#674b39",
  }}
>
  機票分類

  <select
    value={flightForm.flight_direction}
    onChange={(e) =>
      updateFlightField(
        "flight_direction",
        e.target.value
      )
    }
    style={{
      height: 42,
      padding: "0 12px",
      border: "1px solid #d8c6b4",
      borderRadius: 10,
      background: "#ffffff",
      color: "#49392f",
      width: "100%",
    }}
  >
    <option value="other">其他</option>
    <option value="outbound">去程</option>
    <option value="return">回程</option>
  </select>
</label>

    {/* 付款狀態 */}
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 7,
        marginTop: 16,
        fontSize: 13,
        fontWeight: 600,
        color: "#674b39",
      }}
    >
      付款狀態

      <select
        value={flightForm.payment_status}
        onChange={(e) =>
          updateFlightField(
            "payment_status",
            e.target.value
          )
        }
        style={{
          height: 42,
          padding: "0 12px",
          border: "1px solid #d8c6b4",
          borderRadius: 10,
          background: "#ffffff",
          color: "#49392f",
        }}
      >
        <option value="unpaid">未付款</option>
        <option value="paid">已付款</option>
        <option value="partial">部分付款</option>
      </select>
    </label>

    {/* 備註 */}
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 7,
        marginTop: 16,
        fontSize: 13,
        fontWeight: 600,
        color: "#674b39",
      }}
    >
      備註

      <textarea
        rows={4}
        placeholder="例如：轉機資訊、航廈、選位、特殊餐點、登機注意事項……"
        value={flightForm.notes}
        onChange={(e) =>
          updateFlightField("notes", e.target.value)
        }
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: 12,
          border: "1px solid #d8c6b4",
          borderRadius: 10,
          background: "#ffffff",
          color: "#49392f",
          fontSize: 14,
          resize: "vertical",
        }}
      />
    </label>

    
{/* =========================================
    多段航班 / 轉機設定
   ========================================= */}

<div
  style={{
    marginTop: 24,
    padding: 18,
    borderRadius: 14,
    border: "1px solid #e6dcd0",
    background: "#faf7f2",
  }}
>
  <div style={{ marginBottom: 16 }}>
    <h3
      style={{
        margin: 0,
        fontSize: 17,
        color: "#49392f",
      }}
    >
      ✈️ 航班路線 / 轉機
    </h3>
    <p
      style={{
        margin: "6px 0 0",
        fontSize: 12,
        color: "#927f70",
      }}
    >
      每段航班可以設定不同的航空公司、時間與時區。
    </p>
  </div>

  {/* 是否轉機：一段航班為否，兩段以上為是 */}
  <label
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 8,
      marginBottom: 16,
      fontSize: 14,
      fontWeight: 700,
      color: "#674b39",
    }}
  >
    是否新增轉機航段？
    <select
      value={flightSegments.length > 1 ? "yes" : "no"}
      disabled={savingFlight}
      onChange={(e) => {
        if (e.target.value === "yes") {
          if (flightSegments.length === 1) addFlightSegment();
        } else if (
          flightSegments.length === 2 ||
          window.confirm("將移除所有轉機航段，確定要改成直飛嗎？")
        ) {
          setFlightSegments((prev) => prev.slice(0, 1));
        }
      }}
      style={{
        width: "100%",
        padding: 11,
        border: "1px solid #d8c6b4",
        borderRadius: 9,
        background: "#ffffff",
        color: "#49392f",
      }}
    >
      <option value="no">否，只有一段航班</option>
      <option value="yes">是，需要轉機</option>
    </select>
  </label>

  {flightSegments.map((segment, index) => (
    <div
      key={segment.localId}
      style={{
        background: "#ffffff",
        border: "1px solid #e6dcd0",
        borderRadius: 12,
        padding: 16,
        marginBottom: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <strong style={{ color: "#49392f" }}>
          第 {index + 1} 段航班
        </strong>

        {flightSegments.length > 1 && (
          <button
            type="button"
            onClick={() =>
              removeFlightSegment(segment.localId)
            }
            style={{
              border: "none",
              background: "transparent",
              color: "#b4534b",
              cursor: "pointer",
            }}
          >
            🗑️ 移除
          </button>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
          gap: 12,
        }}
      >
        {([
          ["airline", "航空公司"],
          ["flight_number", "航班編號"],
          ["departure_airport", "出發機場"],
          ["arrival_airport", "抵達機場"],
          ["cabin_class", "艙等"],
          ["baggage_allowance", "行李額度"],
          ["departure_terminal", "出發航廈 Terminal"],
          ["arrival_terminal", "抵達航廈 Terminal"],
          ["departure_gate", "出發登機門 Gate"],
          ["seat_number", "座位號碼 Seat"],
          ] as const).map(([field, label]) => (

          <label key={field}>
            <div style={{ marginBottom: 5, fontSize: 13 }}>
              {label}
            </div>
            <input
              type="text"
              value={segment[field]}
              onChange={(e) =>
                updateFlightSegment(
                  segment.localId,
                  field,
                  e.target.value
                )
              }
              style={{
                width: "100%",
                padding: 10,
                border: "1px solid #d8c6b4",
                borderRadius: 9,
                boxSizing: "border-box",
              }}
            />
          </label>
        ))}

        {([
          ["departure_at", "出發日期時間"],
          ["arrival_at", "抵達日期時間"],
        ] as const).map(([field, label]) => (
          <label key={field}>
            <div style={{ marginBottom: 5, fontSize: 13 }}>
              {label}
            </div>
            <input
              type="datetime-local"
              value={segment[field]}
              onChange={(e) =>
                updateFlightSegment(
                  segment.localId,
                  field,
                  e.target.value
                )
              }
              style={{
                width: "100%",
                padding: 10,
                border: "1px solid #d8c6b4",
                borderRadius: 9,
                boxSizing: "border-box",
              }}
            />
          </label>
        ))}

        {([
          ["departure_timezone", "出發時區"],
          ["arrival_timezone", "抵達時區"],
        ] as const).map(([field, label]) => (
          <label key={field}>
            <div style={{ marginBottom: 5, fontSize: 13 }}>
              {label}
            </div>

            <select
              value={segment[field]}
              onChange={(e) =>
                updateFlightSegment(
                  segment.localId,
                  field,
                  e.target.value
                )
              }
              style={{
                width: "100%",
                padding: 10,
                border: "1px solid #d8c6b4",
                borderRadius: 9,
              }}
            >
              <option value="">選擇時區</option>
              <option value="America/Phoenix">Phoenix</option>
              <option value="America/Los_Angeles">Los Angeles</option>
              <option value="America/Chicago">Chicago</option>
              <option value="America/New_York">New York / Miami</option>
              <option value="America/Lima">Lima</option>
              <option value="Asia/Taipei">Taipei</option>
              <option value="Asia/Tokyo">Tokyo</option>
              <option value="Asia/Seoul">Seoul</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris</option>
            </select>
          </label>
        ))}
      </div>

      <label
        style={{
          display: "block",
          marginTop: 12,
          fontSize: 13,
        }}
      >
        航段備註
        <textarea
          value={segment.notes}
          onChange={(e) =>
            updateFlightSegment(
              segment.localId,
              "notes",
              e.target.value
            )
          }
          rows={2}
          style={{
            display: "block",
            width: "100%",
            boxSizing: "border-box",
            marginTop: 5,
            padding: 10,
            border: "1px solid #d8c6b4",
            borderRadius: 9,
          }}
        />
      </label>
    </div>
  ))}

  {flightSegments.length > 1 && (
  <button
    type="button"
    onClick={addFlightSegment}
    style={{
      width: "100%",
      padding: "12px 16px",
      background: "#ffffff",
      border: "1px dashed #b89b80",
      borderRadius: 10,
      color: "#826349",
      fontWeight: 700,
      cursor: "pointer",
    }}
  >
    ＋ 新增轉機航段
  </button>
  )}
</div>

{/* =========================================
    機票表單：取消／儲存按鈕
   ========================================= */}

<div
  style={{
    display: "flex",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 24,
    paddingTop: 18,
    borderTop: "1px solid #e6dcd0",
  }}
>
  {/* 取消 */}
  <button
    type="button"
    onClick={() => {
      setShowFlightForm(false);
      setEditingFlightId(null);
    }}
    disabled={savingFlight}
    style={{
      padding: "12px 20px",
      border: "1px solid #d8c6b4",
      borderRadius: 10,
      background: "#ffffff",
      color: "#674b39",
      fontSize: 14,
      fontWeight: 600,
      cursor: savingFlight ? "not-allowed" : "pointer",
    }}
  >
    取消
  </button>

  {/* 儲存 */}
  <button
    type="button"
    onClick={saveFlight}
    disabled={savingFlight}
    style={{
      padding: "12px 24px",
      border: "1px solid #826349",
      borderRadius: 10,
      background: savingFlight ? "#b6a08e" : "#826349",
      color: "#ffffff",
      fontSize: 14,
      fontWeight: 700,
      cursor: savingFlight ? "not-allowed" : "pointer",
    }}
  >
    {savingFlight
      ? "儲存中..."
      : editingFlightId !== null
        ? "更新機票"
        : "儲存機票"}
  </button>
</div>

  </div>
)}


    
{/* =========================================
    機票列表
   ========================================= */}

{loadingFlights ? (
  <div
    style={{
      padding: 28,
      textAlign: "center",
      color: "#927f70",
    }}
  >
    載入機票資料中...
  </div>
) : flights.length === 0 ? (
  <div
    style={{
      border: "1px dashed #d8c6b4",
      background: "#faf7f2",
      borderRadius: 14,
      padding: "35px 18px",
      textAlign: "center",
    }}
  >
    <div style={{ fontSize: 32, marginBottom: 12 }}>
      ✈️
    </div>

    <div
      style={{
        fontSize: 16,
        fontWeight: 700,
        color: "#674b39",
      }}
    >
      尚未新增機票
    </div>

    <p
      style={{
        margin: "10px 0 0",
        fontSize: 13,
        color: "#927f70",
      }}
    >
      點擊「＋新增機票」開始記錄航班資訊。
    </p>
  </div>
) : (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 14,
    }}
  >
    
{([
  ["outbound", "🛫 去程"],
  ["return", "🛬 回程"],
  ["other", "✈️ 其他"],
] as const).map(([direction, title]) => {
  const group = groupedFlights[direction];

  if (group.length === 0) return null;

  return (
    <div
      key={direction}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        marginBottom: 22,
      }}
    >
      <h3
        style={{
          margin: "6px 0 2px",
          fontSize: 22,
          fontWeight: 800,
          color: "#49392f",
        }}
      >
        {title}
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "#927f70",
            marginLeft: 10,
          }}
        >
          {group.length} 筆
        </span>
      </h3>

      
{group.map((flight) => (

  <div
    key={flight.id}
    style={{
      background: "#faf7f2",
      border: "1px solid #e6dcd0",
      borderRadius: 14,
      padding: "clamp(12px, 3vw, 22px)",
      boxShadow: "0 2px 8px rgba(103,75,57,0.04)",
    }}
  >

        {/* 航空公司、航班編號、付款狀態 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                color: "#927f70",
                marginBottom: 5,
              }}
            >
              {flight.airline || "航空公司未設定"}
              {flightSegmentsByFlight[flight.id]?.length > 1
                ? ` · ${flightSegmentsByFlight[flight.id].length} 段航班`
                : " · 單段航班"}
            </div>

            <h3
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 800,
                color: "#49392f",
              }}
            >
              ✈️ {(() => {
                const route = flightSegmentsByFlight[flight.id] || [];
                const departure = route[0]?.departure_airport || flight.departure_airport || "—";
                const arrival = route.length > 0
                  ? route[route.length - 1]?.arrival_airport || flight.arrival_airport || "—"
                  : flight.arrival_airport || "—";
                return `${departure} → ${arrival}`;
              })()}
            </h3>
            <div style={{ marginTop: 6, fontSize: 12, color: "#927f70" }}>
              首段航班：{flight.flight_number || "未設定"}
            </div>
          </div>

          
<span
  style={{
    display: "inline-block",
    padding: "8px 18px",
    borderRadius: 999,
    background:
      flight.flight_direction === "outbound"
        ? "#e8f0e5"
        : flight.flight_direction === "return"
          ? "#e9edf5"
          : "#f2ebe2",
    color:
      flight.flight_direction === "outbound"
        ? "#55704e"
        : flight.flight_direction === "return"
          ? "#526684"
          : "#826349",
    fontSize: 20,
    fontWeight: 800,
  }}
>
  {flight.flight_direction === "outbound"
    ? "去程"
    : flight.flight_direction === "return"
      ? "回程"
      : "其他"}
</span>

          <span
            style={{
              padding: "5px 11px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              background:
                flight.payment_status === "paid"
                  ? "#e8f0e5"
                  : flight.payment_status === "partial"
                    ? "#fff0d9"
                    : "#f2ebe2",
              color:
                flight.payment_status === "paid"
                  ? "#55704e"
                  : "#826349",
            }}
          >
            {flight.payment_status === "paid"
              ? "已付款"
              : flight.payment_status === "partial"
                ? "部分付款"
                : "未付款"}
          </span>
        </div>

        
{/* =========================================
    多段航班 / 轉機路線
   ========================================= */}

{loadingFlightSegments ? (
  <div
    style={{
      padding: 20,
      textAlign: "center",
      color: "#927f70",
    }}
  >
    載入航段資料中...
  </div>
) : (
  <>
    {(() => {
      const savedSegments =
        flightSegmentsByFlight[flight.id] || [];

      // 舊版單段機票相容
      const segments =
        savedSegments.length > 0
          ? savedSegments
          : [
              {
                id: flight.id,
                flight_id: flight.id,
                segment_order: 1,
                airline: flight.airline,
                flight_number: flight.flight_number,
                departure_airport:
                  flight.departure_airport,
                arrival_airport:
                  flight.arrival_airport,
                departure_at: flight.departure_at,
                arrival_at: flight.arrival_at,
                departure_timezone:
                  flight.departure_timezone,
                arrival_timezone:
                  flight.arrival_timezone,
                cabin_class: flight.cabin_class,
                baggage_allowance:
                  flight.baggage_allowance,
                notes: null,
              },
            ];

      const firstSegment = segments[0];
      const lastSegment =
        segments[segments.length - 1];

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {segments.map((segment, index) => (
            <div key={`${flight.id}-${index}`}>
              
{/* =========================================
    轉機時間與不足提醒
   ========================================= */}

{index > 0 &&
  (() => {
    const previousArrival =
      segments[index - 1].arrival_at;

    const nextDeparture =
      segment.departure_at;

    const connectionMinutes =
      previousArrival && nextDeparture
        ? Math.round(
            (new Date(nextDeparture).getTime() -
              new Date(previousArrival).getTime()) /
              60000
          )
        : null;

    const isShortConnection =
      connectionMinutes !== null &&
      connectionMinutes >= 0 &&
      connectionMinutes < 60;

    const isInvalidConnection =
      connectionMinutes !== null &&
      connectionMinutes < 0;

    return (
      <div
        style={{
          textAlign: "center",
          padding: "12px 16px",
          margin: "8px 0 12px",
          background: isInvalidConnection
            ? "#fce8e6"
            : isShortConnection
              ? "#fff3df"
              : "#f2ebe2",
          border: `1px solid ${
            isInvalidConnection
              ? "#e7aaa4"
              : isShortConnection
                ? "#edc989"
                : "#e6dcd0"
          }`,
          borderRadius: 10,
          fontSize: 12,
          color: isInvalidConnection
            ? "#b4534b"
            : "#674b39",
          lineHeight: 1.8,
        }}
      >
        <div style={{ fontWeight: 700 }}>
          🕒{" "}
          {segments[index - 1]
            .arrival_airport || "轉機機場"}
          {" 轉機 · 等候 "}
          {formatFlightTimeDifference(
            previousArrival,
            nextDeparture
          )}
        </div>

        {isInvalidConnection && (
          <div style={{ fontWeight: 700 }}>
            ❌ 轉機時間設定錯誤：下一段航班早於上一段抵達
          </div>
        )}

        {isShortConnection && (
          <div
            style={{
              marginTop: 4,
              fontWeight: 700,
              color: "#a66b20",
            }}
          >
            ⚠️ 轉機時間少於 60 分鐘，請確認是否足夠
          </div>
        )}
      </div>
    );
  })()}


              {/* 每段航班 */}
              <div
                style={{
                  background: "#faf7f2",
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    marginBottom: 14,
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#674b39",
                  }}
                >
                  ✈️ 第 {index + 1} 段 ·{" "}
                  {segment.airline || "航空公司"}{" "}
                  {segment.flight_number || ""}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
  "minmax(0, 1fr) minmax(64px, auto) minmax(0, 1fr)",
gap: "clamp(4px, 2vw, 12px)",
alignItems: "center",
                  }}
                >
                  {/* 出發 */}
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: "#49392f",
                      }}
                    >
                      {segment.departure_airport ||
                        "—"}
                    </div>

                    <div
                      style={{
                        marginTop: 7,
                        fontSize: 12,
                        color: "#674b39",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {formatFlightDateTime(
                        segment.departure_at,
                        segment.departure_timezone
                      )}
                    </div>
                    
                  </div>

                  {/* 飛行時間 */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 5,
                      minWidth: 64,
                      maxWidth: 130,
                      textAlign: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 24,
                        color: "#826349",
                      }}
                    >
                      →
                    </span>

                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#674b39",
                        whiteSpace: "normal",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {formatFlightTimeDifference(
                        segment.departure_at,
                        segment.arrival_at
                      )}
                    </span>

                    <span
                      style={{
                        fontSize: 11,
                        color: "#927f70",
                      }}
                    >
                      飛行時間
                    </span>
                  </div>

                  {/* 抵達 */}
                  <div
                    style={{
                      minWidth: 0,
                      textAlign: "right",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: "#49392f",
                      }}
                    >
                      {segment.arrival_airport ||
                        "—"}
                    </div>

                    <div
                      style={{
                        marginTop: 7,
                        fontSize: 12,
                        color: "#674b39",
                        overflowWrap: "anywhere",
                      }}
                    >
                      
                      {formatFlightDateTime(
                        segment.arrival_at,
                        segment.arrival_timezone
                      )}
                    </div>
                  </div>
                </div>

                {/* =========================================
                    航廈 / 登機門 / 座位資訊
                   ========================================= */}

                {(
                  segment.departure_terminal ||
                  segment.arrival_terminal ||
                  segment.departure_gate ||
                  segment.seat_number
                ) && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(min(100%, 120px), 1fr))",
                      gap: 10,
                      marginTop: 14,
                      paddingTop: 12,
                      borderTop: "1px solid #e6dcd0",
                      fontSize: 12,
                      color: "#674b39",
                    }}
                  >
                    {segment.departure_terminal && (
                      <div>
                        <strong>出發航廈：</strong>
                        {segment.departure_terminal}
                      </div>
                    )}

                    {segment.arrival_terminal && (
                      <div>
                        <strong>抵達航廈：</strong>
                        {segment.arrival_terminal}
                      </div>
                    )}

                    {segment.departure_gate && (
                      <div>
                        <strong>登機門：</strong>
                        {segment.departure_gate}
                      </div>
                    )}

                    {segment.seat_number && (
                      <div>
                        <strong>座位：</strong>
                        {segment.seat_number}
                      </div>
                    )}
                  </div>
                )}


                {(segment.cabin_class || segment.baggage_allowance || segment.notes) && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "6px 18px",
                      marginTop: 14,
                      paddingTop: 12,
                      borderTop: "1px solid #e6dcd0",
                      color: "#674b39",
                      fontSize: 12,
                    }}
                  >
                    {segment.cabin_class && (
                      <span>艙等：{segment.cabin_class}</span>
                    )}
                    {segment.baggage_allowance && (
                      <span>行李額度：{segment.baggage_allowance}</span>
                    )}
                    {segment.notes && (
                      <span style={{ whiteSpace: "pre-wrap", width: "100%" }}>
                        航段備註：{segment.notes}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* 整趟旅行時間 */}
          {segments.length > 1 && (
            <div
              style={{
                background: "#f2ebe2",
                border: "1px solid #e6dcd0",
                borderRadius: 10,
                padding: "12px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                columnGap: 16,
                rowGap: 8,
              }}
            >
              <span
                style={{
                  color: "#674b39",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                🕒 整趟旅行時間（含轉機）
              </span>

              <strong
                style={{
                  color: "#49392f",
                  fontSize: 14,
                }}
              >
                {formatFlightTimeDifference(
                  firstSegment.departure_at,
                  lastSegment.arrival_at
                )}
              </strong>
            </div>
          )}
        </div>
      );
    })()}
  </>
)}


        {/* 訂票資訊：共用於整筆機票，不重複計算各段票價 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 145px), 1fr))",
            gap: 12,
            marginTop: 16,
            padding: 14,
            border: "1px solid #e6dcd0",
            borderRadius: 12,
            background: "#fffdf9",
            fontSize: 13,
            lineHeight: 1.7,
            color: "#674b39",
          }}
        >
          {flight.confirmation_number && (
            <div>
              <strong>訂位代碼：</strong>
              {flight.confirmation_number}
            </div>
          )}

          {flight.booking_platform && (
            <div>
              <strong>訂票平台：</strong>
              {flight.booking_platform}
            </div>
          )}

          {flight.amount !== null && (
            <div>
              <strong>機票金額：</strong>
              {flight.currency || "USD"}{" "}
              {formatAmount(flight.amount)}
            </div>
          )}
        </div>

        {/* 備註 */}
        {flight.notes && (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              background: "#faf7f2",
              borderRadius: 10,
              fontSize: 13,
              color: "#927f70",
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
            }}
          >
            {flight.notes}
          </div>
        )}

        {/* 訂票網址 */}
        {flight.booking_url && (
          <a
            href={flight.booking_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              marginTop: 14,
              color: "#826349",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            查看訂票網址 ↗
          </a>
        )}
      

    
{/* =========================================
    機票操作：編輯 / 刪除
   ========================================= */}

<div
  style={{
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 18,
    paddingTop: 16,
    borderTop: "1px solid #e6dcd0",
  }}
>
  <button
    type="button"
    onClick={() => startEditFlight(flight)}
    style={editActionButtonStyle}
  >
    ✏️ 編輯
  </button>

  <button
    type="button"
    onClick={() => deleteFlight(flight)}
    style={deleteActionButtonStyle}
    >
    🗑️ 刪除
  </button>
</div>

</div>
      ))}
    </div>
  );
})}

  </div>
)}

  </section>
)}


{/* =========================================
    租車管理畫面
   ========================================= */}

{activeTab === "carRentals" && (
  <section
    style={{
      width: "100%",
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      gap: 18,
    }}
  >
    {/* 標題與新增按鈕 */}
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: 26,
            fontWeight: 800,
            color: "#49392f",
          }}
        >
          🚗 租車管理
        </h2>

        <p
          style={{
            margin: "10px 0 0",
            fontSize: 14,
            color: "#927f70",
          }}
        >
          集中管理這趟旅程的租車與取還車資訊
        </p>
      </div>

      <button
        type="button"
        onClick={() => {
          if (showCarRentalForm) {
            setShowCarRentalForm(false);
            resetCarRentalForm();
          } else {
            resetCarRentalForm();
            setShowCarRentalForm(true);
          }
        }}
        style={{
          padding: "12px 20px",
          background: "#826349",
          border: "1px solid #826349",
          color: "#ffffff",
          borderRadius: 12,
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {showCarRentalForm ? "取消新增" : "＋ 新增租車"}
      </button>
    </div>

   
{/* =========================================
    租車新增／編輯表單
   ========================================= */}

{showCarRentalForm && (
  <div
    style={{
      background: "#faf7f2",
      border: "1px solid #e6dcd0",
      borderRadius: 14,
      padding: "20px 16px",
      color: "#49392f",
    }}
  >
    <h3
      style={{
        margin: "0 0 18px",
        fontSize: 19,
        fontWeight: 800,
      }}
    >
      {editingCarRentalId !== null
        ? "✏️ 編輯租車資料"
        : "🚗 新增租車資料"}
    </h3>

    {/* 租車基本資料 */}
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
        gap: 16,
      }}
    >
      {([
        ["租車公司", "rental_company", "text", "Hertz / Alamo"],
        ["訂單編號", "confirmation_number", "text", "預約確認碼"],
        ["車型", "vehicle_type", "text", "Toyota RAV4"],
        ["車輛等級", "vehicle_class", "text", "SUV / Economy"],
        ["取車地點", "pickup_location", "text", "LAX Airport"],
        ["取車日期時間", "pickup_at", "datetime-local", ""],
        ["還車地點", "dropoff_location", "text", "SFO Airport"],
        ["還車日期時間", "dropoff_at", "datetime-local", ""],
        ["租車總金額", "amount", "number", "0.00"],
        ["幣別", "currency", "text", "USD / TWD / EUR"],
        ["訂車平台", "booking_platform", "text", "Rentalcars"],
        ["訂單網址", "booking_url", "url", "https://"],
      ] as const).map(([label, field, type, placeholder]) => (
        <label
          key={field}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 7,
            fontSize: 13,
            fontWeight: 600,
            color: "#674b39",
          }}
        >
          {label}
          <input
            type={type}
            placeholder={placeholder}
            value={carRentalForm[field]}
            onChange={(e) =>
              updateCarRentalField(field, e.target.value)
            }
            min={type === "number" ? "0" : undefined}
            step={type === "number" ? "0.01" : undefined}
            style={{
              width: "100%",
              minWidth: 0,
              boxSizing: "border-box",
              height: 44,
              padding: "0 12px",
              border: "1px solid #d8c6b4",
              borderRadius: 10,
              background: "#ffffff",
              color: "#49392f",
              fontSize: 14,
            }}
          />
        </label>
      ))}
    </div>

    {/* 取車與還車時區 */}
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
        gap: 16,
        marginTop: 16,
      }}
    >
      {([
        ["取車時區", "pickup_timezone"],
        ["還車時區", "dropoff_timezone"],
      ] as const).map(([label, field]) => (
        <label
          key={field}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 7,
            fontSize: 13,
            fontWeight: 600,
            color: "#674b39",
          }}
        >
          {label}
          <select
            value={carRentalForm[field]}
            onChange={(e) =>
              updateCarRentalField(field, e.target.value)
            }
            style={{
              width: "100%",
              height: 44,
              padding: "0 12px",
              border: "1px solid #d8c6b4",
              borderRadius: 10,
              background: "#ffffff",
              color: "#49392f",
            }}
          >
            <option value="">請選擇時區</option>
            <option value="America/Phoenix">Phoenix</option>
            <option value="America/Los_Angeles">Los Angeles / San Francisco</option>
            <option value="America/Denver">Denver</option>
            <option value="America/Chicago">Chicago</option>
            <option value="America/New_York">New York / Orlando / Miami</option>
            <option value="Pacific/Honolulu">Honolulu</option>
            <option value="America/Lima">Lima</option>
            <option value="Europe/London">London</option>
            <option value="Europe/Paris">Paris</option>
            <option value="Europe/Zurich">Zurich</option>
            <option value="Asia/Taipei">Taipei</option>
            <option value="Asia/Tokyo">Tokyo</option>
            <option value="Asia/Seoul">Seoul</option>
          </select>
        </label>
      ))}
    </div>

    {/* 付款狀態 */}
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 7,
        marginTop: 16,
        fontSize: 13,
        fontWeight: 600,
        color: "#674b39",
      }}
    >
      付款狀態
      <select
        value={carRentalForm.payment_status}
        onChange={(e) =>
          updateCarRentalField(
            "payment_status",
            e.target.value
          )
        }
        style={{
          height: 44,
          padding: "0 12px",
          border: "1px solid #d8c6b4",
          borderRadius: 10,
          background: "#ffffff",
          color: "#49392f",
        }}
      >
        <option value="unpaid">未付款</option>
        <option value="paid">已付款</option>
        <option value="partial">部分付款</option>
      </select>
    </label>

    {/* 備註 */}
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 7,
        marginTop: 16,
        fontSize: 13,
        fontWeight: 600,
        color: "#674b39",
      }}
    >
      備註
      <textarea
        rows={4}
        placeholder="保險內容、免費里程、額外駕駛、押金、取車注意事項等"
        value={carRentalForm.notes}
        onChange={(e) =>
          updateCarRentalField("notes", e.target.value)
        }
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: 12,
          border: "1px solid #d8c6b4",
          borderRadius: 10,
          background: "#ffffff",
          color: "#49392f",
          fontSize: 14,
          resize: "vertical",
        }}
      />
    </label>

    {/* 取消與儲存 */}
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        flexWrap: "wrap",
        gap: 10,
        marginTop: 24,
        paddingTop: 18,
        borderTop: "1px solid #e6dcd0",
      }}
    >
      <button
        type="button"
        onClick={() => {
          resetCarRentalForm();
          setShowCarRentalForm(false);
        }}
        disabled={savingCarRental}
        style={{
          padding: "11px 18px",
          border: "1px solid #d8c6b4",
          borderRadius: 10,
          background: "#ffffff",
          color: "#674b39",
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        取消
      </button>

      <button
        type="button"
        onClick={saveCarRental}
        disabled={savingCarRental}
        style={{
          padding: "11px 22px",
          border: "1px solid #826349",
          borderRadius: 10,
          background: savingCarRental ? "#b6a08e" : "#826349",
          color: "#ffffff",
          fontSize: 14,
          fontWeight: 700,
          cursor: savingCarRental ? "not-allowed" : "pointer",
        }}
      >
        {savingCarRental
          ? "儲存中..."
          : editingCarRentalId !== null
            ? "更新租車"
            : "儲存租車"}
      </button>
    </div>
  </div>
)}

    {/* 租車資料列表 */}
    {loadingCarRentals ? (
      <div
        style={{
          padding: 28,
          textAlign: "center",
          color: "#927f70",
        }}
      >
        載入租車資料中...
      </div>
    ) : carRentals.length === 0 ? (
      <div
        style={{
          padding: "36px 18px",
          textAlign: "center",
          border: "1px dashed #d8c6b4",
          background: "#faf7f2",
          borderRadius: 14,
          color: "#927f70",
        }}
      >
        <div style={{ fontSize: 30, marginBottom: 10 }}>
          🚙
        </div>
        尚未新增租車資料
        <p style={{ margin: "8px 0 0", fontSize: 13 }}>
          點擊「＋ 新增租車」開始記錄取還車資訊。
        </p>
      </div>
    ) : (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        
{carRentals.map((rental) => {
  const pickupTime = rental.pickup_at
    ? new Date(rental.pickup_at).getTime()
    : NaN;

  const dropoffTime = rental.dropoff_at
    ? new Date(rental.dropoff_at).getTime()
    : NaN;

  const durationMinutes =
    Number.isFinite(pickupTime) &&
    Number.isFinite(dropoffTime) &&
    dropoffTime > pickupTime
      ? Math.round((dropoffTime - pickupTime) / 60000)
      : null;

  const durationDays =
    durationMinutes !== null
      ? Math.floor(durationMinutes / 1440)
      : 0;

  const durationHours =
    durationMinutes !== null
      ? Math.floor((durationMinutes % 1440) / 60)
      : 0;

  const durationMins =
    durationMinutes !== null
      ? durationMinutes % 60
      : 0;

  const rentalDuration =
    durationMinutes === null
      ? "未設定"
      : [
          durationDays > 0 ? `${durationDays} 天` : "",
          durationHours > 0 ? `${durationHours} 小時` : "",
          durationMins > 0 ? `${durationMins} 分鐘` : "",
        ]
          .filter(Boolean)
          .join(" ") || "0 分鐘";

  return (
    <div
      key={rental.id}
      style={{
        padding: "clamp(14px, 3vw, 22px)",
        border: "1px solid #e6dcd0",
        borderRadius: 14,
        background: "#faf7f2",
        boxShadow: "0 2px 8px rgba(103,75,57,0.04)",
        minWidth: 0,
      }}
    >
      {/* 租車公司與付款狀態 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 800,
              color: "#49392f",
            }}
          >
            🚗 {rental.rental_company || "租車公司未設定"}
          </h3>

          {(rental.vehicle_type || rental.vehicle_class) && (
            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                color: "#927f70",
              }}
            >
              {[rental.vehicle_type, rental.vehicle_class]
                .filter(Boolean)
                .join(" · ")}
            </div>
          )}
        </div>

        <span
          style={{
            padding: "6px 12px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            background:
              rental.payment_status === "paid"
                ? "#e8f0e5"
                : rental.payment_status === "partial"
                  ? "#fff0d9"
                  : "#f2ebe2",
            color:
              rental.payment_status === "paid"
                ? "#55704e"
                : "#826349",
          }}
        >
          {rental.payment_status === "paid"
            ? "已付款"
            : rental.payment_status === "partial"
              ? "部分付款"
              : "未付款"}
        </span>
      </div>

      {/* 取車與還車資訊 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 210px), 1fr))",
          gap: 12,
        }}
      >
        <div
          style={{
            padding: 16,
            background: "#faf7f2",
            borderRadius: 12,
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#826349",
              marginBottom: 10,
            }}
          >
            📍 取車
          </div>

          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "#49392f",
              overflowWrap: "anywhere",
            }}
          >
            {rental.pickup_location || "未設定"}
          </div>

          <div
            style={{
              marginTop: 8,
              fontSize: 13,
              color: "#674b39",
            }}
          >
            {formatFlightDateTime(
              rental.pickup_at,
              rental.pickup_timezone
            )}
          </div>
        </div>

        <div
          style={{
            padding: 16,
            background: "#faf7f2",
            borderRadius: 12,
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#826349",
              marginBottom: 10,
            }}
          >
            📍 還車
          </div>

          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "#49392f",
              overflowWrap: "anywhere",
            }}
          >
            {rental.dropoff_location || "未設定"}
          </div>

          <div
            style={{
              marginTop: 8,
              fontSize: 13,
              color: "#674b39",
            }}
          >
            {formatFlightDateTime(
              rental.dropoff_at,
              rental.dropoff_timezone
            )}
          </div>
        </div>
      </div>

      {/* 租車總時長 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 12,
          padding: "12px 16px",
          borderRadius: 10,
          background: "#f2ebe2",
          color: "#674b39",
          fontSize: 13,
        }}
      >
        <span style={{ fontWeight: 700 }}>
          🕒 租車總時長
        </span>

        <strong>{rentalDuration}</strong>
      </div>

      {/* 訂單與費用資訊 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 160px), 1fr))",
          gap: 12,
          marginTop: 16,
          fontSize: 13,
          color: "#674b39",
          lineHeight: 1.7,
        }}
      >
        {rental.confirmation_number && (
          <div>
            <strong>訂單編號：</strong>
            {rental.confirmation_number}
          </div>
        )}

        {rental.booking_platform && (
          <div>
            <strong>訂車平台：</strong>
            {rental.booking_platform}
          </div>
        )}

        {rental.amount !== null && (
          <div>
            <strong>租車總金額：</strong>
            {rental.currency || "USD"}{" "}
            {Number(rental.amount).toFixed(2)}
          </div>
        )}
      </div>

      {/* 備註 */}
      {rental.notes && (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            background: "#faf7f2",
            borderRadius: 10,
            color: "#674b39",
            fontSize: 13,
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
          }}
        >
          {rental.notes}
        </div>
      )}

      {/* 訂單網址 */}
      {rental.booking_url && (
        <a
          href={rental.booking_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            marginTop: 14,
            color: "#826349",
            fontWeight: 700,
            fontSize: 13,
            overflowWrap: "anywhere",
          }}
        >
          查看租車訂單 ↗
        </a>
      )}

      {/* 編輯與刪除 */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          flexWrap: "wrap",
          gap: 10,
          marginTop: 18,
          paddingTop: 16,
          borderTop: "1px solid #e6dcd0",
        }}
      >
        <button
          type="button"
          onClick={() => startEditCarRental(rental)}
          style={editActionButtonStyle}
        >
          ✏️ 編輯
        </button>

        <button
          type="button"
          onClick={() => deleteCarRental(rental)}
          style={deleteActionButtonStyle}
        >
          🗑️ 刪除
        </button>
      </div>
    </div>
  );
})}

      </div>
    )}

  </section>
)}

          
{/* =========================================
    預約行程管理畫面
   ========================================= */}

{activeTab === "bookings" && (
  <section
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 18,
      marginTop: 20,
      minWidth: 0,
    }}
  >
    {/* 標題與新增按鈕 */}
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 800,
            color: "#49392f",
          }}
        >
          🎟️ 預約行程管理
        </h2>

        <p
          style={{
            margin: "6px 0 0",
            fontSize: 13,
            color: "#927f70",
          }}
        >
          管理景點門票、餐廳、導覽、活動與體驗預約
        </p>
      </div>

      <button
        type="button"
        onClick={() => {
          if (showTripBookingForm) {
            resetTripBookingForm();
            setShowTripBookingForm(false);
          } else {
            resetTripBookingForm();
            setShowTripBookingForm(true);
          }
        }}
        style={{
          padding: "11px 18px",
          border: "none",
          borderRadius: 10,
          background: "#826349",
          color: "#ffffff",
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {showTripBookingForm ? "取消新增" : "＋ 新增預約"}
      </button>
    </div>

    
{/* =========================================
    新增／編輯預約行程表單
   ========================================= */}

{showTripBookingForm && (
  <div
    style={{
      padding: "20px 16px",
      background: "#faf7f2",
      border: "1px solid #e6dcd0",
      borderRadius: 14,
      color: "#49392f",
      minWidth: 0,
    }}
  >
    <h3
      style={{
        margin: "0 0 18px",
        fontSize: 19,
        fontWeight: 800,
      }}
    >
      {editingTripBookingId !== null
        ? "✏️ 編輯預約行程"
        : "🎟️ 新增預約行程"}
    </h3>

    {/* 預約類型 */}
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 7,
        fontSize: 13,
        fontWeight: 700,
        marginBottom: 16,
      }}
    >
      預約類型
      <select
        value={tripBookingForm.booking_type}
        onChange={(e) =>
          updateTripBookingField(
            "booking_type",
            e.target.value
          )
        }
        style={{
          width: "100%",
          height: 44,
          padding: "0 12px",
          border: "1px solid #d8c6b4",
          borderRadius: 10,
          background: "#ffffff",
          color: "#49392f",
        }}
      >
        <option value="attraction">🎫 景點門票</option>
        <option value="restaurant">🍽️ 餐廳</option>
        <option value="tour">🧭 導覽</option>
        <option value="activity">🎭 活動</option>
        <option value="experience">✨ 體驗</option>
        <option value="other">📋 其他</option>
      </select>
    </label>

    {/* 基本資料 */}
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
        gap: 16,
      }}
    >
      {([
        ["預約名稱", "name", "text", "例如：環球影城門票"],
        [
          "預約編號",
          "confirmation_number",
          "text",
          "預約確認碼",
        ],
        [
          "預約平台",
          "booking_platform",
          "text",
          "例如：Klook / KKday / 官網",
        ],
        ["開始日期時間", "start_at", "datetime-local", ""],
        ["結束日期時間", "end_at", "datetime-local", ""],
        ["活動地點", "location", "text", "地址或景點名稱"],
        [
          "集合地點",
          "meeting_point",
          "text",
          "例如：飯店大廳／售票處",
        ],
        ["預約人數", "participants", "number", "例如：2"],
        ["總金額", "amount", "number", "0.00"],
        ["幣別", "currency", "text", "USD / TWD / EUR"],
        [
          "預約網址",
          "booking_url",
          "url",
          "https://",
        ],
      ] as const).map(([label, field, type, placeholder]) => (
        <label
          key={field}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 7,
            fontSize: 13,
            fontWeight: 600,
            color: "#674b39",
            minWidth: 0,
          }}
        >
          {label}
          <input
            type={type}
            placeholder={placeholder}
            value={tripBookingForm[field]}
            onChange={(e) =>
              updateTripBookingField(field, e.target.value)
            }
            min={
              field === "participants"
                ? "1"
                : field === "amount"
                  ? "0"
                  : undefined
            }
            step={
              field === "participants"
                ? "1"
                : field === "amount"
                  ? "0.01"
                  : undefined
            }
            style={{
              width: "100%",
              boxSizing: "border-box",
              height: 44,
              minWidth: 0,
              padding: "0 12px",
              border: "1px solid #d8c6b4",
              borderRadius: 10,
              background: "#ffffff",
              color: "#49392f",
              fontSize: 14,
            }}
          />
        </label>
      ))}
    </div>

    {/* 當地時區 */}
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 7,
        marginTop: 16,
        fontSize: 13,
        fontWeight: 600,
        color: "#674b39",
      }}
    >
      預約當地時區
      <select
        value={tripBookingForm.timezone}
        onChange={(e) =>
          updateTripBookingField("timezone", e.target.value)
        }
        style={{
          width: "100%",
          height: 44,
          padding: "0 12px",
          border: "1px solid #d8c6b4",
          borderRadius: 10,
          background: "#ffffff",
          color: "#49392f",
        }}
      >
        <option value="">請選擇時區</option>
        <option value="America/Phoenix">Phoenix</option>
        <option value="America/Los_Angeles">
          Los Angeles / San Francisco
        </option>
        <option value="America/Denver">Denver</option>
        <option value="America/Chicago">Chicago</option>
        <option value="America/New_York">
          New York / Orlando / Miami
        </option>
        <option value="Pacific/Honolulu">Honolulu</option>
        <option value="America/Lima">Lima</option>
        <option value="Europe/London">London</option>
        <option value="Europe/Paris">Paris</option>
        <option value="Europe/Zurich">Zurich</option>
        <option value="Asia/Taipei">Taipei</option>
        <option value="Asia/Tokyo">Tokyo</option>
        <option value="Asia/Seoul">Seoul</option>
      </select>
    </label>

    {/* 付款狀態 */}
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 7,
        marginTop: 16,
        fontSize: 13,
        fontWeight: 600,
        color: "#674b39",
      }}
    >
      付款狀態
      <select
        value={tripBookingForm.payment_status}
        onChange={(e) =>
          updateTripBookingField(
            "payment_status",
            e.target.value
          )
        }
        style={{
          height: 44,
          padding: "0 12px",
          border: "1px solid #d8c6b4",
          borderRadius: 10,
          background: "#ffffff",
          color: "#49392f",
        }}
      >
        <option value="unpaid">未付款</option>
        <option value="paid">已付款</option>
        <option value="partial">部分付款</option>
      </select>
    </label>

    {/* 備註 */}
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 7,
        marginTop: 16,
        fontSize: 13,
        fontWeight: 600,
        color: "#674b39",
      }}
    >
      備註
      <textarea
        rows={4}
        placeholder="報到時間、入場方式、取消政策、攜帶物品等"
        value={tripBookingForm.notes}
        onChange={(e) =>
          updateTripBookingField("notes", e.target.value)
        }
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: 12,
          border: "1px solid #d8c6b4",
          borderRadius: 10,
          background: "#ffffff",
          color: "#49392f",
          fontSize: 14,
          resize: "vertical",
        }}
      />
    </label>

    {/* 操作按鈕 */}
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        flexWrap: "wrap",
        gap: 10,
        marginTop: 24,
        paddingTop: 18,
        borderTop: "1px solid #e6dcd0",
      }}
    >
      <button
        type="button"
        onClick={() => {
          resetTripBookingForm();
          setShowTripBookingForm(false);
        }}
        disabled={savingTripBooking}
        style={{
          padding: "11px 18px",
          border: "1px solid #d8c6b4",
          borderRadius: 10,
          background: "#ffffff",
          color: "#674b39",
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        取消
      </button>

      <button
        type="button"
        onClick={saveTripBooking}
        disabled={savingTripBooking}
        style={{
          padding: "11px 22px",
          border: "none",
          borderRadius: 10,
          background: savingTripBooking
            ? "#b6a08e"
            : "#826349",
          color: "#ffffff",
          fontSize: 14,
          fontWeight: 700,
          cursor: savingTripBooking
            ? "not-allowed"
            : "pointer",
        }}
      >
        {savingTripBooking
          ? "儲存中..."
          : editingTripBookingId !== null
            ? "更新預約"
            : "儲存預約"}
      </button>
    </div>
  </div>
)}


    {/* 預約行程列表 */}
    {loadingTripBookings ? (
      <p style={{ color: "#927f70", fontSize: 14 }}>
        正在載入預約資料...
      </p>
    ) : tripBookings.length === 0 ? (
      <div
        style={{
          padding: 28,
          textAlign: "center",
          background: "#faf7f2",
          border: "1px dashed #d8c6b4",
          borderRadius: 14,
          color: "#927f70",
          fontSize: 14,
        }}
      >
        目前還沒有預約行程，點擊「＋ 新增預約」開始建立。
      </div>
    ) : (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        
{tripBookings.map((booking) => {
  const typeInfo: Record<
    string,
    { icon: string; label: string }
  > = {
    attraction: { icon: "🎫", label: "景點門票" },
    restaurant: { icon: "🍽️", label: "餐廳預約" },
    tour: { icon: "🧭", label: "導覽行程" },
    activity: { icon: "🎭", label: "活動預約" },
    experience: { icon: "✨", label: "體驗行程" },
    other: { icon: "📋", label: "其他預約" },
  };

  const type = typeInfo[booking.booking_type] || typeInfo.other;

  const status =
    booking.payment_status === "paid"
      ? "已付款"
      : booking.payment_status === "partial"
        ? "部分付款"
        : "未付款";

  return (
    <div
      key={booking.id}
      style={{
        padding: "clamp(14px, 3vw, 20px)",
        border: "1px solid #e6dcd0",
        borderRadius: 14,
        background: "#ffffff",
        boxShadow: "0 2px 8px rgba(103,75,57,0.04)",
        minWidth: 0,
      }}
    >
      {/* 標題與付款狀態 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#826349",
              marginBottom: 8,
            }}
          >
            {type.icon} {type.label}
          </div>

          <h3
            style={{
              margin: 0,
              fontSize: 19,
              fontWeight: 800,
              color: "#49392f",
              overflowWrap: "anywhere",
            }}
          >
            {booking.name}
          </h3>
        </div>

        <span
          style={{
            padding: "6px 12px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            background:
              booking.payment_status === "paid"
                ? "#e8f0e5"
                : booking.payment_status === "partial"
                  ? "#fff0d9"
                  : "#f2ebe2",
            color:
              booking.payment_status === "paid"
                ? "#55704e"
                : "#826349",
          }}
        >
          {status}
        </span>
      </div>

      {/* 預約日期與時間 */}
      {(booking.start_at || booking.end_at) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
            gap: 12,
            marginTop: 16,
          }}
        >
          {booking.start_at && (
            <div
              style={{
                padding: 14,
                background: "#faf7f2",
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#826349",
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                🗓️ 開始時間
              </div>

              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#49392f",
                }}
              >
                {formatFlightDateTime(
                  booking.start_at,
                  booking.timezone
                )}
              </div>
            </div>
          )}

          {booking.end_at && (
            <div
              style={{
                padding: 14,
                background: "#faf7f2",
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#826349",
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                🕒 結束時間
              </div>

              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#49392f",
                }}
              >
                {formatFlightDateTime(
                  booking.end_at,
                  booking.timezone
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 地點與訂單資料 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
          gap: 12,
          marginTop: 16,
          fontSize: 13,
          color: "#674b39",
          lineHeight: 1.7,
          overflowWrap: "anywhere",
        }}
      >
        {booking.location && (
          <div>
            <strong>📍 地點</strong>
            <div>{booking.location}</div>
          </div>
        )}

        {booking.meeting_point && (
          <div>
            <strong>🚩 集合地點</strong>
            <div>{booking.meeting_point}</div>
          </div>
        )}

        {booking.participants !== null && (
          <div>
            <strong>👥 預約人數</strong>
            <div>{booking.participants} 人</div>
          </div>
        )}

        {booking.confirmation_number && (
          <div>
            <strong>📋 預約編號</strong>
            <div>{booking.confirmation_number}</div>
          </div>
        )}

        {booking.booking_platform && (
          <div>
            <strong>🌐 預約平台</strong>
            <div>{booking.booking_platform}</div>
          </div>
        )}

        {booking.amount !== null && (
          <div>
            <strong>💵 預約總金額</strong>
            <div>
              {booking.currency}{" "}
              {Number(booking.amount).toFixed(2)}
            </div>
          </div>
        )}
      </div>

      {/* 備註 */}
      {booking.notes && (
        <div
          style={{
            padding: 14,
            marginTop: 16,
            background: "#faf7f2",
            borderRadius: 10,
            color: "#674b39",
            fontSize: 13,
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
          }}
        >
          📝 {booking.notes}
        </div>
      )}

      {/* 預約連結 */}
      {booking.booking_url && (
        <a
          href={booking.booking_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            marginTop: 14,
            color: "#826349",
            fontSize: 13,
            fontWeight: 700,
            overflowWrap: "anywhere",
          }}
        >
          🔗 查看預約資料 ↗
        </a>
      )}

      {/* 編輯與刪除 */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          flexWrap: "wrap",
          gap: 10,
          marginTop: 18,
          paddingTop: 16,
          borderTop: "1px solid #e6dcd0",
        }}
      >
        <button
          type="button"
          onClick={() => startEditTripBooking(booking)}
          style={editActionButtonStyle}
        >
          ✏️ 編輯
        </button>

        <button
          type="button"
          onClick={() => deleteTripBooking(booking)}
          style={deleteActionButtonStyle}
        >
          🗑️ 刪除
        </button>
      </div>
    </div>
  );
})}

      </div>
    )}
  </section>
)}

        
{/* =========================================
    行李清單管理畫面
   ========================================= */}

{activeTab === "packing" && (
  <section
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 18,
      marginTop: 20,
      minWidth: 0,
    }}
  >
    {/* 標題與新增按鈕 */}
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 800,
            color: "#49392f",
          }}
        >
          🎒 行李清單管理
        </h2>

        <p
          style={{
            margin: "6px 0 0",
            fontSize: 13,
            color: "#927f70",
          }}
        >
          分類整理行李，追蹤每位旅伴的打包進度
        </p>
      </div>

      <div
  style={{
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  }}
>
      <button
        type="button"
        onClick={() => {
          if (showPackingForm) {
            resetPackingForm();
            setShowPackingForm(false);
          } else {
            resetPackingForm();
            setShowPackingForm(true);
          }
        }}
        style={{
          padding: "11px 18px",
          border: "none",
          borderRadius: 10,
          background: "#826349",
          color: "#ffffff",
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {showPackingForm ? "取消新增" : "＋ 新增行李"}
      </button>

        
{/* =========================================
    匯入預設打包清單按鈕
   ========================================= */}

<button
  type="button"
  onClick={() => {
  if (showPackingImport) {
    setShowPackingImport(false);
  } else {
    setShowPackingImport(true);
    void loadPackingTemplates();
  }
}}
  style={{
    padding: "11px 18px",
    border: "1px solid #d8c6b4",
    borderRadius: 10,
    background: "#ffffff",
    color: "#826349",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  }}
>
  {showPackingImport
    ? "取消匯入"
    : "📋 匯入預設清單"}
</button>
</div>

    </div>

    
{/* =========================================
    匯入預設打包清單面板
   ========================================= */}

{showPackingImport && (
  <div
    style={{
      padding: "20px 16px",
      background: "#faf7f2",
      border: "1px solid #e6dcd0",
      borderRadius: 14,
      display: "grid",
      gap: 16,
    }}
  >
    <div>
      <h3
        style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 800,
          color: "#49392f",
        }}
      >
        📋 匯入預設打包清單
      </h3>

      
{/* =========================================
    常用物品管理入口
   ========================================= */}

<button
  type="button"
  onClick={() => {
  if (!showPackingTemplateManager) {
    void loadPackingCustomItems();
  }

  setShowPackingTemplateManager((prev) => !prev);
}}
  style={{
    marginTop: 12,
    padding: "9px 14px",
    border: "1px solid #d8c6b4",
    borderRadius: 9,
    background: "#ffffff",
    color: "#826349",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  }}
>
  {showPackingTemplateManager
    ? "關閉常用物品管理"
    : "⚙️ 管理常用物品"}
</button>


      <p
        style={{
          margin: "6px 0 0",
          fontSize: 13,
          color: "#927f70",
          lineHeight: 1.6,
        }}
      >
        從系統預設範本建立這趟旅行的打包清單。
        匯入後可以自由修改物品及數量。
      </p>
    </div>

    
{/* =========================================
    常用物品管理面板
   ========================================= */}

{showPackingTemplateManager && (
  <div
    style={{
      padding: 16,
      background: "#ffffff",
      border: "1px solid #e6dcd0",
      borderRadius: 12,
      display: "grid",
      gap: 8,
    }}
  >
    <h4
      style={{
        margin: 0,
        fontSize: 16,
        fontWeight: 800,
        color: "#49392f",
      }}
    >
      ⚙️ 常用物品管理
    </h4>

    <div
      style={{
        fontSize: 13,
        color: "#927f70",
        lineHeight: 1.7,
      }}
    >
      這裡將可以新增、修改及停用自己的常用打包物品。
      系統原本的預設清單不會被修改。
    </div>


{/* =========================================
    已建立的自訂常用物品
   ========================================= */}

<div
  style={{
    borderTop: "1px solid #e6dcd0",
    paddingTop: 14,
    marginTop: 8,
    display: "grid",
    gap: 10,
  }}
>
  <div
    style={{
      fontSize: 15,
      fontWeight: 800,
      color: "#49392f",
    }}
  >
    📋 我的常用物品（{packingCustomItems.length} 項）
  </div>

  {loadingPackingCustomItems ? (
    <div style={{ fontSize: 13, color: "#927f70" }}>
      讀取中...
    </div>
  ) : packingCustomLoadError ? (
    <div style={{ fontSize: 13, color: "#b91c1c" }}>
      讀取失敗：{packingCustomLoadError}
    </div>
  ) : packingCustomItems.length === 0 ? (
    <div style={{ fontSize: 13, color: "#927f70" }}>
      尚未建立自訂常用物品
    </div>
  ) : (
    packingCustomItems.map((item) => {
      const category = packingTemplateCategories.find(
        (entry) =>
          entry.scope === item.scope &&
          entry.code === item.category_code
      );

      return (
        <div
          key={item.id}
          style={{
            padding: 12,
            border: "1px solid #e6dcd0",
            borderRadius: 10,
            background: "#faf7f2",
            display: "grid",
            gap: 5,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              color: "#49392f",
            }}
          >
            {item.name} × {item.quantity}
          </div>

          <div
            style={{
              fontSize: 12,
              color: "#826349",
            }}
          >
            {item.scope === "personal"
              ? "👤 個人用品"
              : "👥 共用用品"}
            {" · "}
            {category
              ? `${category.icon} ${category.name}`
              : item.category_code}
            {!item.is_active && " · 已停用"}
          </div>

          {item.notes && (
            <div
              style={{
                fontSize: 12,
                color: "#927f70",
              }}
            >
              備註：{item.notes}
            </div>
          )}
        </div>
      );
    })
  )}
</div>
  
{/* =========================================
    自訂常用物品：新增表單
   ========================================= */}

<div
  style={{
    display: "grid",
    gap: 14,
    marginTop: 12,
  }}
>
  <label
    style={{
      display: "grid",
      gap: 7,
      fontSize: 13,
      fontWeight: 700,
      color: "#674b39",
    }}
  >
    用品類型
    <select
      value={packingCustomForm.scope}
      onChange={(e) =>
        setPackingCustomForm((prev) => ({
          ...prev,
          scope: e.target.value as "personal" | "shared",
          category_code: "",
        }))
      }
      style={{
        height: 44,
        padding: "0 12px",
        border: "1px solid #d8c6b4",
        borderRadius: 10,
        background: "#ffffff",
      }}
    >
      <option value="personal">👤 個人用品</option>
      <option value="shared">👥 共用用品</option>
    </select>
  </label>

  <label
    style={{
      display: "grid",
      gap: 7,
      fontSize: 13,
      fontWeight: 700,
      color: "#674b39",
    }}
  >
    所屬分類 *
    <select
      value={packingCustomForm.category_code}
      onChange={(e) =>
        setPackingCustomForm((prev) => ({
          ...prev,
          category_code: e.target.value,
        }))
      }
      style={{
        height: 44,
        padding: "0 12px",
        border: "1px solid #d8c6b4",
        borderRadius: 10,
        background: "#ffffff",
      }}
    >
      <option value="">請選擇分類</option>
      {packingTemplateCategories
        .filter(
          (category) =>
            category.scope === packingCustomForm.scope &&
            category.is_active
        )
        .map((category) => (
          <option key={category.id} value={category.code}>
            {category.icon} {category.name}
          </option>
        ))}
    </select>
  </label>

  <label
    style={{
      display: "grid",
      gap: 7,
      fontSize: 13,
      fontWeight: 700,
      color: "#674b39",
    }}
  >
    物品名稱 *
    <input
      type="text"
      value={packingCustomForm.name}
      onChange={(e) =>
        setPackingCustomForm((prev) => ({
          ...prev,
          name: e.target.value,
        }))
      }
      placeholder="例如：電動牙刷、郵輪房卡套"
      style={{
        height: 44,
        padding: "0 12px",
        border: "1px solid #d8c6b4",
        borderRadius: 10,
      }}
    />
  </label>

  <label
    style={{
      display: "grid",
      gap: 7,
      fontSize: 13,
      fontWeight: 700,
      color: "#674b39",
    }}
  >
    預設數量
    <input
      type="number"
      min="1"
      step="1"
      value={packingCustomForm.quantity}
      onChange={(e) =>
        setPackingCustomForm((prev) => ({
          ...prev,
          quantity: e.target.value,
        }))
      }
      style={{
        height: 44,
        padding: "0 12px",
        border: "1px solid #d8c6b4",
        borderRadius: 10,
      }}
    />
  </label>

  <label
    style={{
      display: "grid",
      gap: 7,
      fontSize: 13,
      fontWeight: 700,
      color: "#674b39",
    }}
  >
    備註
    <textarea
      rows={3}
      value={packingCustomForm.notes}
      onChange={(e) =>
        setPackingCustomForm((prev) => ({
          ...prev,
          notes: e.target.value,
        }))
      }
      placeholder="例如：放隨身背包、準備備用份"
      style={{
        padding: 12,
        border: "1px solid #d8c6b4",
        borderRadius: 10,
        resize: "vertical",
      }}
    />
  </label>

  <div
    style={{
      display: "flex",
      justifyContent: "flex-end",
    }}
  >
    <button
  type="button"
  onClick={savePackingCustomItem}
  disabled={savingPackingCustomItem}
      style={{
        padding: "11px 18px",
        background: "#826349",
        color: "#ffffff",
        border: "none",
        borderRadius: 10,
        fontWeight: 700,
        opacity: savingPackingCustomItem ? 0.5 : 1,
cursor: savingPackingCustomItem ? "wait" : "pointer",
      }}
    >
      {savingPackingCustomItem
  ? "儲存中..."
  : "＋ 新增常用物品"}
    </button>
  </div>
</div>

  </div>
)}

    {/* 個人／共用選擇 */}
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(2, minmax(0, 1fr))",
        gap: 10,
      }}
    >
      {(
        [
          { value: "personal", label: "👤 個人用品" },
          { value: "shared", label: "👥 共用用品" },
        ] as const
      ).map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() =>
            setPackingImportScope(option.value)
          }
          aria-pressed={
            packingImportScope === option.value
          }
          style={{
            padding: "12px 8px",
            borderRadius: 10,
            border:
              packingImportScope === option.value
                ? "2px solid #826349"
                : "1px solid #d8c6b4",
            background:
              packingImportScope === option.value
                ? "#eee5db"
                : "#ffffff",
            color: "#49392f",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          {option.label}
        </button>
      ))}
    </div>

    {/* 個人用品：必須選擇所屬人員 */}
    {packingImportScope === "personal" ? (
      <label
        style={{
          display: "grid",
          gap: 8,
          color: "#674b39",
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        選擇要匯入的旅行成員 *
        <select
          value={packingImportPersonId}
          onChange={(e) =>
            setPackingImportPersonId(e.target.value)
          }
          disabled={loadingPackingPeople}
          style={{
            height: 44,
            padding: "0 12px",
            border: "1px solid #d8c6b4",
            borderRadius: 10,
            background: "#ffffff",
            color: "#49392f",
          }}
        >
          <option value="">請選擇人員</option>
          {packingPeople.map((person) => (
            <option
              key={person.id}
              value={String(person.id)}
            >
              {person.name}
            </option>
          ))}
        </select>
      </label>
    ) : (
      <div
        style={{
          padding: 12,
          background: "#ffffff",
          border: "1px solid #e6dcd0",
          borderRadius: 10,
          color: "#674b39",
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        👥 共用用品只需匯入一份，不指定個人。
      </div>
    )}

    <div
      style={{
        padding: 12,
        background: "#ffffff",
        borderRadius: 10,
        border: "1px solid #e6dcd0",
        color: "#674b39",
        fontSize: 13,
        lineHeight: 1.7,
      }}
    >
     
{loadingPackingTemplates ? (
  "正在讀取預設清單..."
) : packingTemplateLoadError ? (
  `讀取失敗：${packingTemplateLoadError}`
) : (
  <>
    📦 {packingImportScope === "personal"
      ? "個人用品"
      : "共用用品"}：
    {" "}
    {packingTemplateCategories.filter(
      (category) => category.scope === packingImportScope
    ).length}
    {" 個分類、"}
    {packingTemplateItems.filter((item) =>
      packingTemplateCategories.some(
        (category) =>
          category.id === item.category_id &&
          category.scope === packingImportScope
      )
    ).length}
    {" 項預設物品"}
  </>
)}

    </div>

    {/* 下一步才連接實際匯入函式 */}
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: 10,
        flexWrap: "wrap",
      }}
    >
      <button
        type="button"
        onClick={() => setShowPackingImport(false)}
        style={{
          padding: "11px 16px",
          border: "1px solid #d8c6b4",
          borderRadius: 10,
          background: "#ffffff",
          color: "#674b39",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        取消
      </button>

      
{/* =========================================
    確認匯入預設打包清單
   ========================================= */}

<button
  type="button"
  onClick={() => void importPackingTemplates()}
  disabled={
    importingPackingTemplates ||
    loadingPackingTemplates ||
    !!packingTemplateLoadError ||
    packingTemplateCategories.length === 0 ||
    packingTemplateItems.length === 0 ||
    (
      packingImportScope === "personal" &&
      !packingImportPersonId
    )
  }
  style={{
    padding: "11px 18px",
    border: "none",
    borderRadius: 10,
    background: "#826349",
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 700,
    opacity:
      importingPackingTemplates ||
      loadingPackingTemplates ||
      !!packingTemplateLoadError ||
      packingTemplateCategories.length === 0 ||
      packingTemplateItems.length === 0 ||
      (
        packingImportScope === "personal" &&
        !packingImportPersonId
      )
        ? 0.5
        : 1,
    cursor:
      importingPackingTemplates
        ? "wait"
        : "pointer",
  }}
>
  {importingPackingTemplates
    ? "匯入中..."
    : "📋 確認匯入"}
</button>

    </div>
  </div>
)}

    {/* 打包進度 */}
    {(() => {
      const total = packingItems.length;
      const packed = packingItems.filter(
        (item) => item.is_packed
      ).length;
      const percentage =
        total > 0 ? Math.round((packed / total) * 100) : 0;

      return (
        <div
          style={{
            padding: 18,
            background: "#faf7f2",
            border: "1px solid #e6dcd0",
            borderRadius: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
              color: "#49392f",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            <span>📦 打包進度</span>
            <span>
              {packed} / {total} 項（{percentage}%）
            </span>
          </div>

          <div
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{
              height: 12,
              marginTop: 12,
              borderRadius: 999,
              background: "#e6dcd0",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${percentage}%`,
                height: "100%",
                borderRadius: 999,
                background: "#826349",
                transition: "width 0.2s ease",
              }}
            />
          </div>
        </div>
      );
    })()}

    {/* 新增／編輯行李表單 */}
    {showPackingForm && (
      <div
        style={{
          padding: "20px 16px",
          background: "#faf7f2",
          border: "1px solid #e6dcd0",
          borderRadius: 14,
        }}
      >
        <h3
          style={{
            margin: "0 0 18px",
            fontSize: 19,
            fontWeight: 800,
            color: "#49392f",
          }}
        >
          {editingPackingItemId !== null
            ? "✏️ 編輯行李"
            : "🎒 新增行李"}
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
            gap: 16,
          }}
        >
          <label style={{ display: "grid", gap: 7, color: "#674b39", fontSize: 13, fontWeight: 700 }}>
            行李名稱 *
            <input
              type="text"
              value={packingForm.name}
              onChange={(e) =>
                updatePackingField("name", e.target.value)
              }
              placeholder="例如：護照、充電線、外套"
              style={{
                width: "100%",
                boxSizing: "border-box",
                height: 44,
                padding: "0 12px",
                border: "1px solid #d8c6b4",
                borderRadius: 10,
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 7, color: "#674b39", fontSize: 13, fontWeight: 700 }}>
            分類
            <select
              value={packingForm.category}
              
onChange={(e) => {
  const nextCategory = e.target.value;

  setPackingForm((prev) => ({
    ...prev,
    category: nextCategory,

    // 共用分類：自動清除所屬人員
    person_id: nextCategory.startsWith("template:shared:")
      ? ""
      : prev.person_id,
  }));
}}

              style={{
                height: 44,
                padding: "0 12px",
                border: "1px solid #d8c6b4",
                borderRadius: 10,
                background: "#ffffff",
              }}
            >
              
{/* =========================================
    舊版分類：保留既有行李資料
   ========================================= */}
<optgroup label="原有分類">
  <option value="documents">🪪 證件</option>
  <option value="clothing">👕 衣物</option>
  <option value="toiletries">🧴 盥洗用品</option>
  <option value="electronics">🔌 電子產品</option>
  <option value="medicine">💊 藥品</option>
  <option value="other">📦 其他</option>
</optgroup>

{/* =========================================
    個人用品：9 個預設分類
   ========================================= */}
<optgroup label="👤 個人用品">
  <option value="template:personal:personal_bag_documents">
    💳 隨身背包－證件與財物
  </option>
  <option value="template:personal:personal_bag_daily">
    🪪 隨身背包－日常用品
  </option>
  <option value="template:personal:clothing">
    👕 衣物
  </option>
  <option value="template:personal:shoes_accessories">
    👟 鞋子與配件
  </option>
  <option value="template:personal:toiletries">
    🧴 盥洗與保養
  </option>
  <option value="template:personal:special_items">
    💄 特殊用品
  </option>
  <option value="template:personal:electronics">
    🔌 3C 電子用品
  </option>
  <option value="template:personal:travel_items">
    🧳 旅行用品
  </option>
  <option value="template:personal:other">
    📦 其他
  </option>
</optgroup>

{/* =========================================
    共用用品：4 個預設分類
   ========================================= */}
<optgroup label="👥 共用用品">
  <option value="template:shared:toiletries">
    🧴 盥洗與保養
  </option>
  <option value="template:shared:special_items">
    💄 特殊用品
  </option>
  <option value="template:shared:medicine">
    💊 藥品與保健品
  </option>
  <option value="template:shared:other">
    📦 其他
  </option>
</optgroup>

            </select>
          </label>

          <label style={{ display: "grid", gap: 7, color: "#674b39", fontSize: 13, fontWeight: 700 }}>
            數量
            <input
              type="number"
              min="1"
              step="1"
              value={packingForm.quantity}
              onChange={(e) =>
                updatePackingField("quantity", e.target.value)
              }
              style={{
                height: 44,
                padding: "0 12px",
                border: "1px solid #d8c6b4",
                borderRadius: 10,
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 7, color: "#674b39", fontSize: 13, fontWeight: 700 }}>
            所屬人員
            
<select
  value={packingForm.person_id}
  onChange={(e) =>
    updatePackingField("person_id", e.target.value)
  }
  disabled={
    loadingPackingPeople ||
    packingForm.category.startsWith("template:shared:")
  }
  style={{
    height: 44,
    padding: "0 12px",
    border: "1px solid #d8c6b4",
    borderRadius: 10,
    background:
      packingForm.category.startsWith("template:shared:")
        ? "#f2ebe2"
        : "#ffffff",
    color: "#49392f",
    opacity: 1,
  }}
>
  {packingForm.category.startsWith("template:personal:") ? (
    <option value="">請選擇旅行成員</option>
  ) : (
    <option value="">👥 共用行李</option>
  )}

  {!packingForm.category.startsWith("template:shared:") &&
    packingPeople.map((person) => (
      <option
        key={person.id}
        value={String(person.id)}
      >
        {person.name}
      </option>
    ))}
</select>

          </label>
        </div>

        <label
          style={{
            display: "grid",
            gap: 7,
            marginTop: 16,
            color: "#674b39",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          備註
          <textarea
            rows={3}
            value={packingForm.notes}
            onChange={(e) =>
              updatePackingField("notes", e.target.value)
            }
            placeholder="例如：隨身攜帶、放托運行李、準備兩份"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: 12,
              border: "1px solid #d8c6b4",
              borderRadius: 10,
              resize: "vertical",
            }}
          />
        </label>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            flexWrap: "wrap",
            gap: 10,
            marginTop: 22,
          }}
        >
          <button
            type="button"
            onClick={() => {
              resetPackingForm();
              setShowPackingForm(false);
            }}
            disabled={savingPackingItem}
            style={{
              padding: "11px 18px",
              border: "1px solid #d8c6b4",
              borderRadius: 10,
              background: "#ffffff",
              color: "#674b39",
              fontWeight: 700,
            }}
          >
            取消
          </button>

          <button
            type="button"
            onClick={savePackingItem}
            disabled={savingPackingItem}
            style={{
              padding: "11px 20px",
              border: "none",
              borderRadius: 10,
              background: "#826349",
              color: "#ffffff",
              fontWeight: 700,
            }}
          >
            {savingPackingItem
              ? "儲存中..."
              : editingPackingItemId !== null
                ? "更新行李"
                : "儲存行李"}
          </button>
        </div>
      </div>
    )}

  
{/* 行李關鍵字搜尋 */}
<div
  style={{
    padding: 16,
    background: "#faf7f2",
    border: "1px solid #e6dcd0",
    borderRadius: 14,
  }}
>
  <input
    type="search"
    value={packingSearch}
    onChange={(e) => setPackingSearch(e.target.value)}
    placeholder="🔍 搜尋行李名稱或備註..."
    aria-label="搜尋行李"
    style={{
      width: "100%",
      boxSizing: "border-box",
      height: 44,
      padding: "0 14px",
      border: "1px solid #d8c6b4",
      borderRadius: 10,
      background: "#ffffff",
      color: "#49392f",
      fontSize: 14,
    }}
  />
</div>

    
{/* =========================================
    行李清單篩選
   ========================================= */}

<div
  style={{
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
    gap: 12,
    padding: 16,
    background: "#faf7f2",
    border: "1px solid #e6dcd0",
    borderRadius: 14,
  }}
>

{/* =========================================
    打包清單：個人／共用快速切換
   ========================================= */}

<div
  style={{
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    gridColumn: "1 / -1",
  }}
>
  {(
    [
      { value: "all", label: "📦 全部行李" },
      { value: "personal", label: "👤 個人用品" },
      { value: "shared", label: "👥 共用用品" },
    ] as const
  ).map((option) => (
    <button
      key={option.value}
      type="button"
      onClick={() => {
        setPackingScopeFilter(option.value);
        setPackingPersonFilter("all");
        setPackingCategoryFilter("all");
      }}
      aria-pressed={packingScopeFilter === option.value}
      style={{
        padding: "9px 14px",
        borderRadius: 9,
        border:
          packingScopeFilter === option.value
            ? "1px solid #826349"
            : "1px solid #d8c6b4",
        background:
          packingScopeFilter === option.value
            ? "#826349"
            : "#ffffff",
        color:
          packingScopeFilter === option.value
            ? "#ffffff"
            : "#674b39",
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {option.label}
    </button>
  ))}
</div>

  
  <label style={{ display: "grid", gap: 7, fontSize: 13, color: "#674b39" }}>
    所屬人員
    <select
      value={packingPersonFilter}
      onChange={(e) => setPackingPersonFilter(e.target.value)}
      style={{
        height: 42,
        border: "1px solid #d8c6b4",
        borderRadius: 9,
        padding: "0 10px",
        background: "#ffffff",
      }}
    >
      <option value="all">全部人員</option>
      <option value="shared">👥 共用行李</option>
      {packingPeople.map((person) => (
        <option key={person.id} value={String(person.id)}>
          {person.name}
        </option>
      ))}
    </select>
  </label>

  <label style={{ display: "grid", gap: 7, fontSize: 13, color: "#674b39" }}>
    行李分類
    <select
      value={packingCategoryFilter}
      onChange={(e) => setPackingCategoryFilter(e.target.value)}
      style={{
        height: 42,
        border: "1px solid #d8c6b4",
        borderRadius: 9,
        padding: "0 10px",
        background: "#ffffff",
      }}
    >
      
<option value="all">全部分類</option>

{/* =========================================
    原有分類：保留舊資料
   ========================================= */}
<optgroup label="原有分類">
  <option value="documents">🪪 證件</option>
  <option value="clothing">👕 衣物</option>
  <option value="toiletries">🧴 盥洗用品</option>
  <option value="electronics">🔌 電子產品</option>
  <option value="medicine">💊 藥品</option>
  <option value="other">📦 其他</option>
</optgroup>

{/* =========================================
    個人用品：9 類
   ========================================= */}
<optgroup label="👤 個人用品">
  <option value="template:personal:personal_bag_documents">
    💳 隨身背包－證件與財物
  </option>
  <option value="template:personal:personal_bag_daily">
    🪪 隨身背包－日常用品
  </option>
  <option value="template:personal:clothing">
    👕 衣物
  </option>
  <option value="template:personal:shoes_accessories">
    👟 鞋子與配件
  </option>
  <option value="template:personal:toiletries">
    🧴 盥洗與保養
  </option>
  <option value="template:personal:special_items">
    💄 特殊用品
  </option>
  <option value="template:personal:electronics">
    🔌 3C 電子用品
  </option>
  <option value="template:personal:travel_items">
    🧳 旅行用品
  </option>
  <option value="template:personal:other">
    📦 其他
  </option>
</optgroup>

{/* =========================================
    共用用品：4 類
   ========================================= */}
<optgroup label="👥 共用用品">
  <option value="template:shared:toiletries">
    🧴 盥洗與保養
  </option>
  <option value="template:shared:special_items">
    💄 特殊用品
  </option>
  <option value="template:shared:medicine">
    💊 藥品與保健品
  </option>
  <option value="template:shared:other">
    📦 其他
  </option>
</optgroup>

    </select>
  </label>

  <label style={{ display: "grid", gap: 7, fontSize: 13, color: "#674b39" }}>
    打包狀態
    <select
      value={packingStatusFilter}
      onChange={(e) => setPackingStatusFilter(e.target.value)}
      style={{
        height: 42,
        border: "1px solid #d8c6b4",
        borderRadius: 9,
        padding: "0 10px",
        background: "#ffffff",
      }}
    >
      <option value="all">全部狀態</option>
      <option value="unpacked">⬜ 未打包</option>
      <option value="packed">✅ 已打包</option>
    </select>
  </label>
</div>

<div style={{ fontSize: 13, color: "#927f70" }}>
  顯示 {filteredPackingItems.length} / {packingItems.length} 項行李
</div>

    
{/* 行李清單顯示方式 */}
<div
  style={{
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    padding: "12px 16px",
    background: "#faf7f2",
    border: "1px solid #e6dcd0",
    borderRadius: 12,
  }}
>
  <span
    style={{
      fontSize: 13,
      fontWeight: 700,
      color: "#674b39",
    }}
  >
    📂 清單顯示方式
  </span>

  <select
    value={packingGroupBy}
    onChange={(e) =>
      setPackingGroupBy(
        e.target.value as "none" | "category" | "person"
      )
    }
    style={{
      height: 42,
      minWidth: 150,
      padding: "0 12px",
      border: "1px solid #d8c6b4",
      borderRadius: 10,
      background: "#ffffff",
      color: "#49392f",
      fontSize: 13,
    }}
  >
    <option value="none">一般清單</option>
    <option value="category">依分類分組</option>
    <option value="person">依人員分組</option>
  </select>

  
{/* =========================================
    排序方式：與清單顯示方式同一排
   ========================================= */}

<label
  style={{
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    fontSize: 13,
    fontWeight: 700,
    color: "#674b39",
  }}
>
  ↕️ 排序方式

  <select
    value={packingSort}
    onChange={(e) =>
      setPackingSort(
        e.target.value as
          | "default"
          | "name"
          | "unpacked"
          | "packed"
      )
    }
    style={{
      height: 42,
      padding: "0 12px",
      border: "1px solid #d8c6b4",
      borderRadius: 10,
      background: "#ffffff",
      color: "#49392f",
      fontSize: 13,
    }}
  >
    <option value="default">預設順序</option>
    <option value="name">名稱 A → Z</option>
    <option value="unpacked">未打包優先</option>
    <option value="packed">已打包優先</option>
  </select>
</label>

{/* =========================================
    未打包快速篩選：右側按鈕
   ========================================= */}

<div
  style={{
    marginLeft: "auto",
    display: "flex",
    alignItems: "center",
  }}
>
  <button
    type="button"
    onClick={() =>
      setPackingStatusFilter((prev) =>
        prev === "unpacked" ? "all" : "unpacked"
      )
    }
    style={{
      padding: "11px 16px",
      border: "1px solid #826349",
      borderRadius: 10,
      background:
        packingStatusFilter === "unpacked"
          ? "#826349"
          : "#ffffff",
      color:
        packingStatusFilter === "unpacked"
          ? "#ffffff"
          : "#826349",
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer",
    }}
  >
    {packingStatusFilter === "unpacked"
      ? "✅ 顯示全部狀態"
      : "⬜ 只看未打包"}
  </button>
</div>

</div>

  

  

  


    {/* 行李資料列表 */}
    {loadingPackingItems ? (
      <p style={{ color: "#927f70" }}>正在載入行李清單...</p>
    ) : packingItems.length === 0 ? (
      <div
        style={{
          padding: 28,
          textAlign: "center",
          border: "1px dashed #d8c6b4",
          borderRadius: 14,
          color: "#927f70",
        }}
      >
        目前還沒有行李，點擊「＋ 新增行李」開始建立。
      </div>
    ) : (
      
<div
  style={{
    display: "flex",
    flexDirection: "column",
    gap: 16,
  }}
>
  {sortedPackingGroups.map(([groupName, groupItems]) => {
    const groupPacked = groupItems.filter(
      (item) => item.is_packed
    ).length;

    return (
      <div
        key={groupName}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {/* 分組標題與完成統計 */}
        {packingGroupBy !== "none" && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
              padding: "12px 16px",
              background: "#f2ebe2",
              borderRadius: 12,
              color: "#49392f",
            }}
          >
            <strong style={{ fontSize: 15 }}>
              {groupName}
            </strong>

            <span
              style={{
                fontSize: 12,
                color: "#826349",
                fontWeight: 700,
              }}
            >
              ✅ {groupPacked} / {groupItems.length} 項已打包
            
            </span>
          </div>
        )}

        {/* =========================================
            各分組打包進度條
           ========================================= */}
        {packingGroupBy !== "none" && (
          <div
            role="progressbar"
            aria-label={`${groupName} 打包進度`}
            aria-valuenow={
              groupItems.length > 0
                ? Math.round(
                    (groupPacked / groupItems.length) * 100
                  )
                : 0
            }
            aria-valuemin={0}
            aria-valuemax={100}
            style={{
              height: 8,
              background: "#e6dcd0",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${
                  groupItems.length > 0
                    ? (groupPacked / groupItems.length) * 100
                    : 0
                }%`,
                background: "#826349",
                borderRadius: 999,
                transition: "width 0.2s ease",
              }}
            />
          </div>
        )}

        {/* 此群組的行李卡片 */}
        {groupItems.map((item) => {


          

          const personName =
            item.person_id === null
              ? "共用行李"
              : packingPeople.find(
                  (person) => person.id === item.person_id
                )?.name || "未找到人員";

          return (
            <div
              key={item.id}
              style={{
                padding: 16,
                background: item.is_packed ? "#f1f5ed" : "#ffffff",
                border: "1px solid #e6dcd0",
                borderRadius: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  flex: "1 1 220px",
                  cursor: "pointer",
                  minWidth: 0,
                }}
              >
                <input
                  type="checkbox"
                  checked={item.is_packed}
                  onChange={() => togglePackingItem(item)}
                  style={{
                    width: 19,
                    height: 19,
                    marginTop: 3,
                    accentColor: "#826349",
                  }}
                />

                <span style={{ minWidth: 0 }}>
                  <span
                    style={{
                      display: "block",
                      color: "#49392f",
                      fontWeight: 800,
                      textDecoration: item.is_packed
                        ? "line-through"
                        : "none",
                    }}
                  >
                    {item.name} × {item.quantity}
                  </span>

                  <span
                    style={{
                      display: "block",
                      marginTop: 5,
                      fontSize: 12,
                      color: "#927f70",
                    }}
                  >
                    {packingCategoryNames[item.category] || item.category || "📦 其他"}
                    {" · "}
                    👤 {personName}
                  </span>

                  {item.notes && (
                    <span
                      style={{
                        display: "block",
                        marginTop: 6,
                        fontSize: 12,
                        color: "#674b39",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {item.notes}
                    </span>
                  )}
                </span>
              </label>

              <div style={{ display: "flex", gap: 8 }}>
                    
<button
  type="button"
  onClick={() => startEditPackingItem(item)}
  style={editActionButtonStyle}
>
  ✏️ 編輯
</button>

<button
  type="button"
  onClick={() => deletePackingItem(item)}
  style={deleteActionButtonStyle}
>
  🗑️ 刪除
</button>

              </div>
            </div>
         
          );
        })}

      </div>
    );
  })}
</div>
    )}
  </section>
)}


{/* =========================================
    旅程備註管理畫面
   ========================================= */}

{activeTab === "notes" && (
  <section
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 18,
      marginTop: 20,
      minWidth: 0,
    }}
  >
    {/* 標題與新增按鈕 */}
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 800,
            color: "#49392f",
          }}
        >
          📝 旅程備註管理
        </h2>
        <p
          style={{
            margin: "6px 0 0",
            fontSize: 13,
            color: "#927f70",
          }}
        >
          集中管理旅程重要資訊、注意事項與備忘錄
        </p>
      </div>

      <button
        type="button"
        onClick={() => {
          resetTripNoteForm();
          setShowTripNoteForm(!showTripNoteForm);
        }}
        style={{
          padding: "11px 18px",
          border: "none",
          borderRadius: 10,
          background: "#826349",
          color: "#ffffff",
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {showTripNoteForm ? "取消新增" : "＋ 新增備註"}
      </button>
    </div>

    {/* 新增／編輯表單 */}
    {showTripNoteForm && (
      <div
        style={{
          padding: "20px 16px",
          background: "#faf7f2",
          border: "1px solid #e6dcd0",
          borderRadius: 14,
          color: "#49392f",
        }}
      >
        <h3
          style={{
            margin: "0 0 18px",
            fontSize: 19,
            fontWeight: 800,
          }}
        >
          {editingTripNoteId !== null
            ? "✏️ 編輯備註"
            : "📝 新增備註"}
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
            gap: 16,
          }}
        >
          <label
            style={{
              display: "grid",
              gap: 7,
              fontSize: 13,
              fontWeight: 700,
              color: "#674b39",
            }}
          >
            備註標題 *
            <input
              type="text"
              value={tripNoteForm.title}
              onChange={(e) =>
                updateTripNoteField("title", e.target.value)
              }
              placeholder="例如：機場交通、入境注意事項"
              style={{
                width: "100%",
                boxSizing: "border-box",
                height: 44,
                padding: "0 12px",
                border: "1px solid #d8c6b4",
                borderRadius: 10,
                background: "#ffffff",
              }}
            />
          </label>

          <label
            style={{
              display: "grid",
              gap: 7,
              fontSize: 13,
              fontWeight: 700,
              color: "#674b39",
            }}
          >
            備註分類
            <select
              value={tripNoteForm.category}
              onChange={(e) =>
                updateTripNoteField("category", e.target.value)
              }
              style={{
                height: 44,
                padding: "0 12px",
                border: "1px solid #d8c6b4",
                borderRadius: 10,
                background: "#ffffff",
              }}
            >
              <option value="general">📋 一般</option>
              <option value="transport">🚗 交通</option>
              <option value="food">🍽️ 餐飲</option>
              <option value="shopping">🛍️ 購物</option>
              <option value="important">⚠️ 重要資訊</option>
              <option value="other">📌 其他</option>
            </select>
          </label>
        </div>

        <label
          style={{
            display: "grid",
            gap: 7,
            marginTop: 16,
            fontSize: 13,
            fontWeight: 700,
            color: "#674b39",
          }}
        >
          備註內容
          <textarea
            rows={6}
            value={tripNoteForm.content}
            onChange={(e) =>
              updateTripNoteField("content", e.target.value)
            }
            placeholder="輸入旅程備註、注意事項、聯絡方式等..."
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: 12,
              border: "1px solid #d8c6b4",
              borderRadius: 10,
              background: "#ffffff",
              color: "#49392f",
              fontSize: 14,
              lineHeight: 1.7,
              resize: "vertical",
            }}
          />
        </label>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            marginTop: 16,
            color: "#674b39",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={tripNoteForm.is_important}
            onChange={(e) =>
              setTripNoteForm((prev) => ({
                ...prev,
                is_important: e.target.checked,
              }))
            }
            style={{
              width: 18,
              height: 18,
              accentColor: "#826349",
            }}
          />
          ⭐ 標記為重要備註
        </label>

        {/* 儲存按鈕 */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            flexWrap: "wrap",
            gap: 10,
            marginTop: 24,
            paddingTop: 18,
            borderTop: "1px solid #e6dcd0",
          }}
        >
          <button
            type="button"
            onClick={() => {
              resetTripNoteForm();
              setShowTripNoteForm(false);
            }}
            disabled={savingTripNote}
            style={{
              padding: "11px 18px",
              border: "1px solid #d8c6b4",
              borderRadius: 10,
              background: "#ffffff",
              color: "#674b39",
              fontWeight: 700,
            }}
          >
            取消
          </button>

          <button
            type="button"
            onClick={saveTripNote}
            disabled={savingTripNote}
            style={{
              padding: "11px 22px",
              border: "none",
              borderRadius: 10,
              background: "#826349",
              color: "#ffffff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {savingTripNote
              ? "儲存中..."
              : editingTripNoteId !== null
                ? "更新備註"
                : "儲存備註"}
          </button>
        </div>
      </div>
    )}

    {/* 備註資料列表 */}
    {loadingTripNotes ? (
      <p style={{ color: "#927f70", fontSize: 14 }}>
        正在載入旅程備註...
      </p>
    ) : tripNotes.length === 0 ? (
      <div
        style={{
          padding: 28,
          textAlign: "center",
          border: "1px dashed #d8c6b4",
          borderRadius: 14,
          background: "#faf7f2",
          color: "#927f70",
          fontSize: 14,
        }}
      >
        目前還沒有備註，點擊「＋ 新增備註」開始建立。
      </div>
    ) : (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {tripNotes.map((note) => {
          const categoryLabels: Record<string, string> = {
            general: "📋 一般",
            transport: "🚗 交通",
            food: "🍽️ 餐飲",
            shopping: "🛍️ 購物",
            important: "⚠️ 重要資訊",
            other: "📌 其他",
          };

          return (
            <div
              key={note.id}
              style={{
                padding: 18,
                border: note.is_important
                  ? "1px solid #d4aa69"
                  : "1px solid #e6dcd0",
                borderRadius: 14,
                background: note.is_important
                  ? "#fffaf0"
                  : "#ffffff",
              }}
            >
              {/* 備註標題 */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#826349",
                      marginBottom: 7,
                    }}
                  >
                    {categoryLabels[note.category] || "📌 其他"}
                  </div>

                  <h3
                    style={{
                      margin: 0,
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#49392f",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {note.title}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => toggleTripNoteImportant(note)}
                  disabled={savingTripNote}
                  title={
                    note.is_important
                      ? "取消重要標記"
                      : "標記為重要"
                  }
                  style={{
                    border: "none",
                    background: "transparent",
                    fontSize: 22,
                    cursor: "pointer",
                  }}
                >
                  {note.is_important ? "⭐" : "☆"}
                </button>
              </div>

              {/* 備註內容 */}
              {note.content && (
                <div
                  style={{
                    marginTop: 14,
                    fontSize: 14,
                    lineHeight: 1.8,
                    color: "#674b39",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                  }}
                >
                  {note.content}
                </div>
              )}

              {/* 編輯與刪除 */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  flexWrap: "wrap",
                  gap: 10,
                  marginTop: 18,
                  paddingTop: 14,
                  borderTop: "1px solid #e6dcd0",
                }}
              >
                <button
                  type="button"
                  onClick={() => startEditTripNote(note)}
                  style={editActionButtonStyle}
                >
                  ✏️ 編輯
                </button>

                <button
                  type="button"
                  onClick={() => deleteTripNote(note)}
                  style={deleteActionButtonStyle}
                >
                  🗑️ 刪除
                </button>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </section>
)}

          

        </>
      )}
    </main>
  );
}

