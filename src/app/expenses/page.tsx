"use client";

// ============================================================
// 花費紀錄｜精簡清單版
// 檔案：src/app/expenses/page.tsx
//
// 01. 套件與資料型別
// 02. 格式化工具
// 03. 頁面狀態
// 04. Supabase 資料讀取
// 05. 搜尋、篩選與排序
// 06. 金額統計與分頁
// 07. 頁首
// 08. 搜尋與篩選區
// 09. 統計區
// 10. 花費清單
// 11. 分頁控制
// 12. 響應式排版樣式
// ============================================================

// ============================================================
// 01. 套件與資料型別
// ============================================================

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../../lib/supabase";

type Expense = {
  id: string | number;
  user_id?: string | null;
  item?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  date?: string | null;

  major_category?: string | null;
  category?: string | null;
  sub_category?: string | null;

  payment_method?: string | null;
  card_name?: string | null;

  expense_scope?: string | null;
  scope?: string | null;
  trip_id?: string | number | null;
  trip_name?: string | null;

  note?: string | null;
};


type Trip = {
  id: string | number;
  name?: string | null;
  title?: string | null;
};

type ExpenseFilter = "all" | "daily" | "trip";

type SortOption =
  | "newest"
  | "oldest"
  | "amount_desc"
  | "amount_asc";

const PAGE_SIZE = 20;

// ============================================================
// 02. 格式化工具
// ============================================================

// 金額格式：固定小數點兩位
function formatAmount(
  value: number | string | null | undefined
  ) {
  const amount = Number(value ?? 0);

  return (
    Number.isFinite(amount) ? amount : 0
  ).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// 日期格式
function formatDate(value?: string | null) {
  if (!value) return "未設定日期";

  return value.slice(0, 10).replace(/-/g, "/");
}


// 大分類與小分類
function formatCategory(expense: Expense) {
  const major = expense.major_category?.trim();

  const minor = (
    expense.sub_category ||
    expense.category
  )?.trim();

if (major && minor && major !== minor) {
    return `${major} · ${minor}`;
  }

  return major || minor || "未分類";
}

// 判斷是否為旅程花費
function isTripExpense(expense: Expense) {
  const value = String(
    expense.expense_scope ||
    expense.scope ||
    ""
  ).toLowerCase();

  return (
    value === "trip" ||
    value === "travel" ||
    value === "旅程" ||
    value === "旅遊" ||
    (
      expense.trip_id !== null &&
      expense.trip_id !== undefined &&
      String(expense.trip_id) !== ""
    )
  );
}

// 月份文字
function formatMonth(value: string) {
  const [year, month] = value.split("-");

  return `${year} 年 ${Number(month)} 月`;
}

// ============================================================
// 03. 頁面狀態
// ============================================================

export default function ExpensesPage() {

  // 花費資料
const [expenses, setExpenses] =
    useState<Expense[]>([]);

  // 旅程名稱對照
  const [tripNames, setTripNames] =
    useState<Record<string, string>>({});

  // 載入狀態
  const [loading, setLoading] =
    useState(true);

const [errorMessage, setErrorMessage] =
    useState("");

  // 搜尋
  const [search, setSearch] =
    useState("");

  // 月份
  const [month, setMonth] =
    useState("all");

 // 花費類型
  const [scope, setScope] =
    useState<ExpenseFilter>("all");

  // 指定旅程
  const [selectedTrip, setSelectedTrip] =
    useState("all");

  // 排序
  const [sort, setSort] =
    useState<SortOption>("newest");

// 頁碼
  const [page, setPage] =
    useState(1);


// ============================================================
// 04. Supabase 資料讀取
// 同時取得日常與旅程花費
// ============================================================

useEffect(() => {

    let active = true;

    async function loadData() {

      setLoading(true);
      setErrorMessage("");

      try {

      // 取得登入使用者
        const {
          data: authData,
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

      const user = authData.user;

        if (!user) {
          throw new Error("請先登入");
        }

      // ----------------------------------------
        // 讀取全部花費
        // 不限制 daily 或 trip
        // 分批取得，避免超過 Supabase 單次筆數限制
        // ----------------------------------------

      const allExpenses: Expense[] = [];
        const batchSize = 1000;

        for (let from = 0; ; from += batchSize) {

          const { data, error } = await supabase
            .from("Expenses")
          .select("*")
            .eq("user_id", user.id)
            .order("date", {
              ascending: false,
            })
            .order("id", {
              ascending: false,
            })
            .range(from, from + batchSize - 1);

         if (error) {
            throw error;
          }

          const batch = (data ?? []) as Expense[];

          allExpenses.push(...batch);

          if (batch.length < batchSize) {
            break;
          }
        }

      if (!active) return;

        setExpenses(allExpenses);

      // ----------------------------------------
        // 讀取旅程名稱
        // 如果無法取得，不影響花費清單
        // ----------------------------------------

      const { data: tripsData, error: tripsError } =
          await supabase
            .from("Trips")
            .select("*")
            .eq("user_id", user.id);

      if (!tripsError && tripsData && active) {

          const names: Record<string, string> = {};

          (tripsData as Trip[]).forEach((trip) => {

            names[String(trip.id)] =
              trip.name ||
              trip.title ||
              `旅程 #${trip.id}`;

          });

        setTripNames(names);
        }

      } catch (error) {

        console.error(
          "載入花費紀錄失敗:",
          error
        );

      if (active) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "讀取花費紀錄失敗"
          );
        }


      } finally {

        if (active) {
          setLoading(false);
        }

      }
    }

          void loadData();

    return () => {
      active = false;
    };

  }, []);

// ============================================================
// 05. 搜尋、篩選與排序
// ============================================================


// 取得旅程名稱
  function getTripName(expense: Expense) {

    if (expense.trip_name) {
      return expense.trip_name;
    }

  if (
      expense.trip_id === null ||
      expense.trip_id === undefined
    ) {
      return "未指定旅程";
    }

  return (
      tripNames[String(expense.trip_id)] ||
      `旅程 #${expense.trip_id}`
    );
  }

  // 自動產生月份選單
  const monthOptions = useMemo(() => {

                               return Array.from(
      new Set(
        expenses
          .map((expense) =>
            expense.date?.slice(0, 7)
          )
          .filter(
            (value): value is string =>
              Boolean(value)
            )
      )
    ).sort((a, b) => b.localeCompare(a));

  }, [expenses]);

  // 自動產生旅程選單
  const tripOptions = useMemo(() => {

                              const result = new Map<string, string>();

    expenses.forEach((expense) => {

      if (!isTripExpense(expense)) return;

      const id = expense.trip_id;


                     if (id === null || id === undefined) {
        return;
      }

      const key = String(id);

      result.set(
        key,
        expense.trip_name ||
          tripNames[key] ||
          `旅程 #${key}`
      );

    });

                              return Array.from(result.entries())
      .sort((a, b) =>
        a[1].localeCompare(b[1])
      );

  }, [expenses, tripNames]);

  // 篩選後的所有紀錄
const filteredExpenses = useMemo(() => {

    const keyword = search
      .trim()
      .toLowerCase();

    return expenses
      .filter((expense) => {


              // 月份
        if (
          month !== "all" &&
          expense.date?.slice(0, 7) !== month
        ) {
          return false;
        }

              // 日常 / 旅程
        const trip = isTripExpense(expense);

        if (scope === "daily" && trip) {
          return false;
        }

        if (scope === "trip" && !trip) {
          return false;
        }

              // 指定旅程
        if (
          selectedTrip !== "all" &&
          String(expense.trip_id ?? "") !==
            selectedTrip
        ) {
          return false;
        }


              // 搜尋
        if (keyword) {

          const searchFields = [
            expense.item,
            expense.date,
            expense.major_category,
            expense.category,
            expense.sub_category,
            expense.payment_method,
            expense.card_name,
            expense.trip_name,
            expense.note,
            expense.trip_id != null
              ? tripNames[String(expense.trip_id)]
              : "",
          ];

          const matched = searchFields.some(
            (value) =>
              String(value ?? "")
                .toLowerCase()
                .includes(keyword)
          );


        if (!matched) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {

            const amountA = Number(a.amount ?? 0);
        const amountB = Number(b.amount ?? 0);

        if (sort === "amount_desc") {
          return amountB - amountA;
          }

        if (sort === "amount_asc") {
          return amountA - amountB;
        }

        const dateA = a.date || "";
        const dateB = b.date || "";

            const dateResult =
          sort === "oldest"
            ? dateA.localeCompare(dateB)
            : dateB.localeCompare(dateA);

        if (dateResult !== 0) {
          return dateResult;
        }

            return String(b.id).localeCompare(
          String(a.id)
        );
      });

  }, [
    expenses,
    search,
    month,
    scope,
    selectedTrip,
    sort,
    tripNames,
  ]);


// ============================================================
// 06. 金額統計與分頁
// ============================================================

const totalCount = filteredExpenses.length;

  // 幣別分開加總
  const totalsByCurrency = useMemo(() => {

    const result: Record<string, number> = {};

                                   filteredExpenses.forEach((expense) => {

      const currency = expense.currency || "USD";
      const amount = Number(expense.amount ?? 0);

      result[currency] =
        (result[currency] || 0) +
        (Number.isFinite(amount) ? amount : 0);

                                                            });

    return Object.entries(result).sort(
      (a, b) => a[0].localeCompare(b[0])
    );

  }, [filteredExpenses]);

// 總頁數
  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / PAGE_SIZE)
  );

  const currentPage = Math.min(
    page,
    totalPages
  );

// 當頁紀錄
  const pagedExpenses = filteredExpenses.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // 更換篩選時回第一頁
  function resetPage() {
    setPage(1);
  }

  // 清除全部篩選
  function clearFilters() {


  setSearch("");
    setMonth("all");
    setScope("all");
    setSelectedTrip("all");
    setSort("newest");
    setPage(1);

  }

// ============================================================
// 07. 頁首
// ============================================================

return (

    <main className="expensesPage">

      <div className="topNavigation">
        <Link href="/">
          ← 返回首頁
        </Link>
      </div>

      <header className="pageHeader">

        <div>
          <h1>花費紀錄</h1>

          <p>
            查看日常與所有旅程的單筆花費紀錄
          </p>
        </div>


        <Link
          href="/expenses/new"
          className="addButton"
        >
          ＋ 新增花費
        </Link>

      </header>

      {/* ============================================================
    08. 搜尋與篩選區
============================================================ */}


      <section className="filterPanel">

        <div className="filterRow">

          {/* 搜尋 */}
          <label className="field searchField">


            <span>搜尋花費</span>

            <input
              type="search"
              value={search}
              placeholder="品項、分類、旅程、信用卡、備註"
              onChange={(event) => {
                setSearch(event.target.value);
                resetPage();
              }}
            />

          </label>

          {/* 月份 */}
          <label className="field">

            <span>月份</span>

            <select
              value={month}
              onChange={(event) => {
                setMonth(event.target.value);
                resetPage();
              }}
            >
              <option value="all">
                全部月份
                </option>

              {monthOptions.map((value) => (

                <option key={value} value={value}>
                  {formatMonth(value)}
                </option>

                ))}

            </select>

          </label>

          {/* 旅程 */}
          <label className="field">

            <span>旅程</span>

            <select
              value={selectedTrip}
              onChange={(event) => {

                setSelectedTrip(event.target.value);

                if (event.target.value !== "all") {
                  setScope("trip");
                }

                resetPage();
              }}
            >
              <option value="all">
                全部旅程
              </option>

              {tripOptions.map(([id, name]) => (

                <option key={id} value={id}>
                  {name}
                </option>

              ))}

            </select>

            </label>

        </div>

        <div className="filterBottom">

          {/* 花費類型 */}
          <div className="typeTabs">


            {([
              ["all", "全部花費"],
              ["daily", "日常花費"],
              ["trip", "旅程花費"],
            ] as const).map(([value, label]) => (

              <button
                key={value}
                type="button"
                className={
                  scope === value
                    ? "typeButton selected"
                    : "typeButton"
                }
                onClick={() => {

                  setScope(value);

                  if (value === "daily") {
                    setSelectedTrip("all");
                  }

                  resetPage();
                }}
              >
                {label}
              </button>

                            ))}

          </div>

          {/* 排序 */}
          <select
            className="sortSelect"
            aria-label="排序方式"
            value={sort}
            
            
