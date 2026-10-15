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

{/* =========================================
    返回首頁按鈕
    與「我的旅程」相同樣式
   ========================================= */}

<div
  style={{
    marginBottom: 28,
  }}
>
  <Link
    href="/"
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "12px 20px",
      backgroundColor: "#eff6ff",
      color: "#2563eb",
      border: "1px solid #bfdbfe",
      borderRadius: 12,
      fontSize: 16,
      fontWeight: 700,
      textDecoration: "none",
    }}
  >
    ← 回首頁
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
            onChange={(event) => {
              setSort(
                event.target.value as SortOption
              );
              resetPage();
            }}
          >
            <option value="newest">
              日期：最新優先
            </option>

            <option value="oldest">
              日期：最舊優先
            </option>
            
            <option value="amount_desc">
              金額：高到低
            </option>

            <option value="amount_asc">
              金額：低到高
            </option>
          </select>

          </div>

      </section>


{/* ============================================================
      09. 統計區
    ============================================================ */}

      {!loading && !errorMessage && (

        <section className="summaryPanel">

          <div className="summaryCount">

            <span>符合條件</span>

            <strong>
              {totalCount} 筆
            </strong>

          </div>


          <div className="summaryTotals">

            {totalsByCurrency.map(
              ([currency, amount]) => (

                <div
                  className="currencyTotal"
                  key={currency}
                >

                  <span>{currency}</span>

                  <strong>
                    {formatAmount(amount)}
                  </strong>

                  </div>

              )
            )}

          </div>

        </section>

      )}

     
{/* ============================================================
    10. 花費清單｜
============================================================ */}

<section className="listPanel">

{/* =========================================
      清單表頭
    ========================================= */}

  <div className="listHeader">
  <div>花費資訊</div>
  <div className="amountHeader">金額</div>
</div>
 

  {/* 載入中 */}
  {loading && (
    <div className="statusMessage">
      正在載入花費紀錄...
    </div>
  )}

  {/* 載入錯誤 */}
  {!loading && errorMessage && (
    <div className="statusMessage error">
      {errorMessage}
    </div>
  )}

  {/* 無紀錄 */}
  {!loading &&
    !errorMessage &&
    pagedExpenses.length === 0 && (
      <div className="emptyState">

        <div className="emptyIcon">🧾</div>

        <strong>沒有符合條件的花費</strong>

        <p>請調整搜尋或篩選條件</p>

        <button
          type="button"
          onClick={clearFilters}
        >
          清除篩選
        </button>

      </div>
    )}

{/* =========================================
      單筆花費
    ========================================= */}

  {!loading &&
    !errorMessage &&
    pagedExpenses.map((expense) => {

      const trip = isTripExpense(expense);

      return (
        <Link
  key={String(expense.id)}
  href={`/expenses/${encodeURIComponent(
    String(expense.id)
  )}`}
  className="expenseRow"
  style={{
    display: "block",
    boxSizing: "border-box",
    width: "100%",
    padding: "24px 40px",
    marginBottom: 14,
    backgroundColor: "#ffffff",
    border: "1px solid #eee3d7",
    borderRadius: 14,
    color: "#49392f",
    textDecoration: "none",
  }}
>
  <div className="mainColumn">

    {/* 日期 */}
    <span className="itemDate">
      {formatDate(expense.date)}
    </span>

    {/* 品項 + 金額同一排 */}
    <div className="titleLine">
      <strong className="itemName">
        {expense.item || "未命名花費"}
      </strong>

      <div className="amountColumn">
        <span className="currency">
          {expense.currency || "USD"}
        </span>

        <strong className="amount">
          {formatAmount(expense.amount)}
        </strong>

        <span className="rowArrow">›</span>
      </div>
    </div>

    {/* 分類 / 付款 / 來源 */}
    <div className="detailColumn">

      <div className="categoryName">
        {formatCategory(expense)}
      </div>

      <div className="paymentName">
        {expense.payment_method === "Debit Card" ||
         expense.payment_method === "debit_card"
          ? "金融卡"
          : expense.payment_method || "未設定付款方式"}

        {expense.card_name && (
          <span className="cardName">
            {" · "}
            {expense.card_name}
          </span>
        )}
      </div>

      <div className="scopeLine">
        <span
          className={
            trip
              ? "scopeLabel trip"
              : "scopeLabel daily"
          }
        >
          {trip ? "旅程" : "日常"}
        </span>

        {trip && (
          <span className="tripName">
            {getTripName(expense)}
          </span>
        )}
      </div>

    </div>
  </div>
</Link>
      );
    })}

</section>

{/* ============================================================
    11. 分頁控制 - 每頁最多顯示 20 筆
    ============================================================ */}

      {!loading &&
        !errorMessage &&
        totalCount > 0 && (

          <footer className="pagination">

            <div className="pageInfo">

               顯示{" "}
              {(currentPage - 1) * PAGE_SIZE + 1}
              {" - "}
              {Math.min(
                currentPage * PAGE_SIZE,
                totalCount
              )}
              {" / "}
              {totalCount} 筆

              </div>

            <div className="pageButtons">

              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => {
                  setPage(currentPage - 1);
                }}

                >
                ← 上一頁
              </button>

              <span className="pageNumber">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={
                  currentPage >= totalPages
                }
                onClick={() => {
                  setPage(currentPage + 1);
                }}
                >
                下一頁 →
              </button>

            </div>

          </footer>

        )}
{/* ============================================================
    12. 響應式排版樣式
    電腦：三欄清單
    手機：精簡排列
    ============================================================ */}

      <style jsx>{`

        .expensesPage {
        font-family:
  "Inter",
  "Noto Sans TC",
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
  max-width: 1100px;
  margin: 0 auto;
  padding: 28px 20px 70px;

  background: #FAF7F2;
  color: #49392F;

  min-height: 100vh;
  box-sizing: border-box;
}

/* =========================================
   返回首頁按鈕
   與「我的旅程」頁面一致
   ========================================= */

.topNavigation {
  margin-bottom: 28px;
}

.topNavigation .homeButton {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  padding: 12px 20px;

  background: #eff6ff;
  color: #2563eb;

  border: 1px solid #bfdbfe;
  border-radius: 12px;

  font-size: 16px;
  font-weight: 700;
  text-decoration: none;

  transition: all 0.2s ease;
}

.topNavigation .homeButton:hover {
  background: #dbeafe;
  border-color: #93c5fd;
}

        .topNavigation a:hover {
          color: #4f46e5;
        }

        /* 頁首 */
        .pageHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }

.pageHeader h1 {
          font-size: 30px;
          font-weight: 800;
          margin: 0;
        }


.pageHeader p {
          font-size: 13px;
          color: #64748b;
          margin: 8px 0 0;
        }

        .addButton {
          background: #4f46e5;
          color: #fff;
          padding: 12px 17px;
          border-radius: 11px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 700;
          white-space: nowrap;
        }

        .addButton:hover {
          background: #4338ca;
        }

        /* 篩選 */
        .filterPanel {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 17px;
          margin-bottom: 16px;
        }

        .filterRow {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 12px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 7px;
          min-width: 0;
        }

        .field span {
          font-size: 12px;
          font-weight: 700;
          color: #475569;
        }

        .field input,
        .field select,
        .sortSelect {
          width: 100%;
          min-width: 0;
          min-height: 40px;
          box-sizing: border-box;
          padding: 9px 11px;
          border: 1px solid #d9e0ea;
          border-radius: 9px;
          background: #fff;
          color: #1e293b;
          font-size: 13px;
          outline: none;
          }

        .field input:focus,
        .field select:focus,
        .sortSelect:focus {
          border-color: #6366f1;
        }

        .filterBottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-top: 14px;
        }


.typeTabs {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .typeButton {
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 9px;
          background: #f8fafc;
          color: #64748b;
          font-size: 12px;
          cursor: pointer;
        }


        .typeButton.selected {
          background: #eef2ff;
          border-color: #c7d2fe;
          color: #4338ca;
          font-weight: 700;
        }

        .sortSelect {
          width: auto;
          min-width: 145px;
        }

        /* 統計 */
        .summaryPanel {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          padding: 13px 17px;
          background: #f1f5f9;
          border-radius: 12px;
          margin-bottom: 15px;
        }


.summaryCount,
        .currencyTotal {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .summaryCount span,
        .currencyTotal span {
          font-size: 11px;
          color: #64748b;
        }

        .summaryCount strong {
          font-size: 19px;
        }

        .summaryTotals {
          display: flex;
          flex-wrap: wrap;
          gap: 18px;
        }

        .currencyTotal strong {
          font-size: 15px;
          font-variant-numeric: tabular-nums;
        }

         /* 清單 */
        .listPanel {
          overflow: hidden;
          border: 1px solid #e2e8f0;
          border-radius: 13px;
          background: #fff;
        }

        .listHeader {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 16px;
        align-items: center;
        padding: 14px 18px;
        margin-bottom: 10px;

        background: #f2ebe2;
        border: 1px solid #e6dcd0;
        border-radius: 12px;

        color: #826c5a;
        font-size: 12px;
        font-weight: 700;
      }

        .amountHeader {
          text-align: right;
        }

        .expenseRow {
          display: block;
          /* 上、右、下、左 */
          padding: 20px 40px 20px 40px;
          margin: 0 0 14px 0;

        background: #ffffff;
        border: 1px solid #eee3d7;
        border-radius: 16px;

        color: #49392f;
        text-decoration: none !important;

        transition: background 0.15s ease, transform 0.15s ease;
      }

      .expenseRow:last-child {
        margin-bottom: 0;
      }

      .expenseRow:hover {
        background: #faf7f2;
        transform: translateY(-1px);
      }

      .expenseRow,
      .expenseRow * {
        text-decoration: none !important;
      }

        .expenseRow:last-child {
          border-bottom: 0;
        }

        .expenseRow:hover {
          background: #f8faff;
        }

        .expenseRow:focus-visible {
          outline: 2px solid #6366f1;
          outline-offset: -2px;
        }

        /* 日期、品項 */
        .itemColumn {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .itemDate {
          font-size: 11px;
          color: #94a3b8;
        }

        .itemName {
          font-size: 14px;
          font-weight: 750;
          overflow-wrap: anywhere;
        }

        /* 分類、付款 */
        .detailColumn {
          display: flex;
          flex-direction: column;
          min-width: 0;
          gap: 4px;
        }

        .categoryName {
          font-size: 12px;
          color: #475569;
          overflow-wrap: anywhere;
        }

        .paymentName {
          font-size: 11px;
          color: #94a3b8;
          overflow-wrap: anywhere;
        }

        .scopeLine {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
        }

        .scopeLabel {
          display: inline-block;
          padding: 2px 7px;
          border-radius: 5px;
          font-size: 10px;
          font-weight: 700;
        }


.scopeLabel.daily {
          color: #0f766e;
          background: #ccfbf1;
        }

        .scopeLabel.trip {
          color: #6d28d9;
          background: #ede9fe;
        }

        .tripName {
          font-size: 11px;
          color: #64748b;
          overflow-wrap: anywhere;
        }

        /* 金額 */
        .amountColumn {
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
          text-align: right;
        }

        .currency {
          font-size: 11px;
          color: #64748b;
          font-weight: 700;
        }

        .amount {
          font-size: 16px;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }

        .rowArrow {
          font-size: 22px;
          font-weight: 400;
          color: #cbd5e1;
          margin-left: 3px;
        }

        /* 空狀態 */
        .statusMessage {
          text-align: center;
          padding: 42px 15px;
          color: #64748b;
          font-size: 14px;
        }

        .statusMessage.error {
          color: #dc2626;
        }

        .emptyState {
          display: flex;
          align-items: center;
          flex-direction: column;
          gap: 10px;
          padding: 45px 15px;
        }

        .emptyIcon {
          font-size: 30px;
        }

        .emptyState p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
        }

        .emptyState button {
          padding: 9px 15px;
          background: #fff;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          cursor: pointer;
        }

        /* 分頁 */
        .pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 17px;
        }

        .pageInfo {
          font-size: 12px;
          color: #64748b;
        }

        .pageButtons {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .pageButtons button {
          padding: 9px 12px;
          border: 1px solid #dce2eb;
          border-radius: 9px;
          background: white;
          color: #334155;
          cursor: pointer;
          font-size: 12px;
        }

         .pageButtons button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .pageNumber {
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }

        /* 手機版 */
        @media (max-width: 650px) {

        .expensesPage {
            padding: 19px 12px 60px;
          }

          .pageHeader {
            align-items: flex-start;
          }

          .pageHeader h1 {
            font-size: 24px;
          }


         .pageHeader p {
            font-size: 12px;
          }

          .addButton {
            padding: 10px 11px;
            font-size: 12px;
          }

          .filterPanel {
            padding: 12px;
          }

          .filterRow {
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          .searchField {
            grid-column: 1 / -1;
          }

          .filterBottom {
            flex-direction: column;
            align-items: stretch;
          }

          .sortSelect {
            width: 100%;
          }

           .summaryPanel {
            padding: 11px 12px;
          }

          .listHeader {
            display: none;
          }

          .expenseRow {
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 5px 8px;
            padding: 18px 20px;
          }

          .itemColumn {
            grid-column: 1;
            grid-row: 1;
          }

          .detailColumn {
            grid-column: 1;
            grid-row: 2;
          }

          .amountColumn {
            grid-column: 2;
            grid-row: 1 / span 2;
            align-self: center;
          }

          .itemName {
          font-size: 18px;
          font-weight: 800;
          line-height: 1.35;
          color: #49392f;
          overflow-wrap: anywhere;
          }

          .amount {
            font-size: 15px;
          }

          .categoryName {
            font-size: 11px;
          }

          .paymentName {
            font-size: 10px;
          }

          .pagination {
            justify-content: center;
          }

          .pageInfo {
          width: 100%;
            text-align: center;
          }
        }

/* =========================================
   花費紀錄｜奶油米色清單排版
   ========================================= */

.listPanel {
  background: #ffffff;
  border: 1px solid #e6dcd0;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 3px 14px rgba(103, 75, 57, 0.04);
}

/* 表頭 */
.listHeader {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px;
  align-items: center;
  padding: 14px 24px;

  background: #f2ebe2;
  border-bottom: 1px solid #e6dcd0;

  color: #826c5a;
  font-size: 12px;
  font-weight: 700;
}

.amountHeader {
  text-align: right;
}

.expenseRow {
  display: block;
  padding: 18px 24px 16px;

  background: #ffffff;
  border-bottom: 1px solid #f0e9e1;

  color: #49392f;
  text-decoration: none !important;

  transition: background 0.15s ease;
}

.expenseRow:last-child {
  border-bottom: none;
}

.expenseRow:hover {
  background: #faf7f2;
}

.expenseRow,
.expenseRow * {
  text-decoration: none !important;
}

  .mainColumn {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.itemDate {
  font-size: 14px;
  line-height: 1.4;
  color: #8c7a6b;
}

.titleLine {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;
}

.itemName {
  font-size: 18px;
  font-weight: 800;
  line-height: 1.35;
  color: #49392f;
  overflow-wrap: anywhere;
}

.detailColumn {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.categoryName {
  font-size: 13px;
  color: #674b39;
  font-weight: 600;
}

.paymentName {
  font-size: 12px;
  color: #927f70;
}

.cardName {
  color: #826349;
  font-weight: 600;
}

.scopeLine {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
}

.scopeLabel {
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
}

.scopeLabel.daily {
  background: #e9eee5;
  color: #667d5c;
}

.scopeLabel.trip {
  background: #f4e5d6;
  color: #a66d42;
}

.tripName {
  font-size: 11px;
  color: #927f70;
}

.amountColumn {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-shrink: 0;
  margin-left: 12px;
}

.currency {
  font-size: 12px;
  color: #927f70;
}

.amount {
  font-size: 19px;
  font-weight: 800;
  color: #674b39;
  white-space: nowrap;
}

.rowArrow {
  font-size: 22px;
  color: #b6a594;
  margin-left: 2px;
}

/* =========================================
   手機版
   ========================================= */

@media (max-width: 650px) {
  .expensesPage {
    padding: 22px 16px 56px;
  }

  .listHeader {
    display: none;
  }

  .listPanel {
    padding: 10px;
    border-radius: 16px;
  }

  .expenseRow {
    padding: 16px 14px 15px;
    margin-bottom: 10px;
    border-radius: 14px;
  }

  .mainColumn {
    gap: 8px;
  }

  .itemDate {
    font-size: 14px;
  }

  .titleLine {
    gap: 10px;
    align-items: flex-start;
  }

  .itemName {
    font-size: 17px;
  }

  .detailColumn {
    gap: 7px;
  }

  .amount {
    font-size: 18px;
  }

  .rowArrow {
    font-size: 20px;
  }
}


      `}</style>

    </main>
  );
}
            
            
