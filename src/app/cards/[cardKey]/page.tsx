"use client";

// =====================================================
// 付款方式獨立明細頁
// src/app/cards/[cardKey]/page.tsx
//
// 01. 套件與型別
// 02. 頁面狀態
// 03. Supabase 資料讀取
// 04. 頁首與付款工具資訊
// 05. 三分頁切換
// 06. 消費紀錄
// 07. 歷史帳單
// 08. 統計分析
// 09. 響應式排版
// =====================================================

// ==================== 01. 套件 ====================
import Link from "next/link";

import { useParams } from "next/navigation";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  supabase,
} from "../../../lib/supabase";

type TabType =
  | "expenses"
  | "statements"
  | "analytics";

type CreditCard = {
  id: number;
  name: string;
  statement_day: number | null;
  due_day: number | null;
  is_active: boolean;
};

type PaymentMethod = {
  id: number;
  name: string;
  payment_type: string;
  bank_name: string | null;
  currency: string | null;
  linked_type: string | null;
  linked_id: string | null;
  is_active: boolean;
};

type DetailItem = {
  id: number;
  name: string;
  type: string;
  statementDay: number | null;
  dueDay: number | null;
  description: string;
};

// =========================================
// 10. 消費紀錄資料型別
// =========================================
type CardExpense = {
  id: number | string;
  item: string | null;
  date: string;
  amount: number;
  currency: string | null;
  major_category: string | null;
  category: string | null;
  payment_method: string | null;
  card_name: string | null;
  payment_method_id: number | null;
  expense_scope: string | null;
  trip_id: number | string | null;
};

const EXPENSE_PAGE_SIZE = 20;

// =========================================
// 16. 信用卡帳單週期計算
// =========================================

// 取得指定月份的安全結帳日
function getStatementDate(
  year: number,
  monthIndex: number,
  statementDay: number
) {
  const lastDay = new Date(
    year,
    monthIndex + 1,
    0
  ).getDate();

  return new Date(
    year,
    monthIndex,
    Math.min(statementDay, lastDay)
  );
}

// 日期轉 YYYY-MM-DD
function toDateString(date: Date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// 計算指定月份的帳單起訖日期
function getStatementPeriod(
  year: number,
  monthIndex: number,
  statementDay: number
) {
  const periodEnd = getStatementDate(
    year,
    monthIndex,
    statementDay
  );

  const previousEnd = getStatementDate(
    year,
    monthIndex - 1,
    statementDay
  );

  const periodStart = new Date(previousEnd);

  periodStart.setDate(
    periodStart.getDate() + 1
  );

  return {
    start: toDateString(periodStart),
    end: toDateString(periodEnd),
  };
}

// =========================================
// 17. 歷史帳單資料型別
// =========================================

type HistoricalStatement = {
  key: string;
  label: string;
  start: string;
  end: string;
  expenses: CardExpense[];
  totals: Record<string, number>;
};

// ==================== 02. 頁面狀態 ====================

export default function CardDetailPage() {

  const params = useParams();

  const cardKey = String(
    params.cardKey ?? ""
  );


const [activeTab, setActiveTab] =
    useState<TabType>("expenses");

  const [detail, setDetail] =
    useState<DetailItem | null>(null);

  const [loading, setLoading] =
    useState(true);

const [errorMessage, setErrorMessage] =
    useState("");

  // =========================================
// 11. 消費紀錄狀態
// =========================================

  const [cardExpenses, setCardExpenses] =
  useState<CardExpense[]>([]);

const [expenseLoading, setExpenseLoading] =
  useState(true);

const [expenseError, setExpenseError] =
  useState("");

  const [expenseSearch, setExpenseSearch] =
  useState("");

const [expenseMonth, setExpenseMonth] =
  useState("all");

const [expensePage, setExpensePage] =
  useState(1);

// =========================================
// 22. 統計分析篩選
// =========================================

const [analysisMonth, setAnalysisMonth] =
  useState("all");

const [analysisCurrency, setAnalysisCurrency] =
  useState("USD");

// =========================================
// 18. 歷史帳單展開狀態
// =========================================

const [expandedStatement, setExpandedStatement] =
  useState<string | null>(null);

// ==================== 03. Supabase 資料讀取 ====================

useEffect(() => {

    let active = true;

    async function loadDetail() {

      setLoading(true);
      setErrorMessage("");

  try {

        const { data: auth, error: authError } =
          await supabase.auth.getUser();

        if (authError) throw authError;

        if (!auth.user) {
          throw new Error("請先登入");
        }

        const isCredit = cardKey.startsWith(
          "credit-"
        );

        const isMethod = cardKey.startsWith(
          "method-"
        );

      if (!isCredit && !isMethod) {
          throw new Error("付款工具網址不正確");
        }

        const id = Number(
          cardKey.replace(
            isCredit ? "credit-" : "method-",
            ""
          )
        );

      if (!Number.isInteger(id) || id <= 0) {
          throw new Error("付款工具 ID 不正確");
        }

        if (isCredit) {

          const { data, error } =
            await supabase
              .from("CreditCards")
          .select(
                "id,name,statement_day,due_day,is_active"
              )
              .eq("id", id)
              .eq("user_id", auth.user.id)
              .single();


    if (error) throw error;

          const card = data as CreditCard;

          if (!active) return;

          setDetail({
            id: card.id,
            name: card.name,
            type: "信用卡",
            statementDay: card.statement_day,
            dueDay: card.due_day,
            description: "信用卡帳單管理",
          });

        } else {

    const { data, error } =
            await supabase
              .from("PaymentMethods")
              .select(
                "id,name,payment_type,bank_name,currency,linked_type,linked_id,is_active"
              )
          .eq("id", id)
              .eq("user_id", auth.user.id)
              .single();

          if (error) throw error;


    const method = data as PaymentMethod;

          const names: Record<string, string> = {
            debit_card: "金融卡",
            apple_pay: "Apple Pay",
            google_pay: "Google Pay",
            other: "其他付款方式",
            };

          if (!active) return;

          setDetail({
            id: method.id,
            name: method.name,
            type:
              names[method.payment_type] ||
              "其他付款方式",
            statementDay: null,
            dueDay: null,
            description:
              method.bank_name ||
              method.currency ||
              "付款工具明細",
            });
        }

      } catch (error) {

  console.error(
    "讀取付款工具失敗:",
    error
  );

  if (active) {
    const errorText =
      error instanceof Error
        ? error.message
        : JSON.stringify(error, null, 2);

    setErrorMessage(
      `讀取付款工具失敗：${errorText}`
    );
  }

} finally {

        if (active) {
          setLoading(false);
        }

      }
    }

          void loadDetail();

    return () => {
      active = false;
    };

  }, [cardKey]);

  // =========================================
// 12. 讀取付款工具的消費紀錄
// =========================================

  useEffect(() => {
  if (!detail) return;

  let active = true;

  async function loadExpenses() {
    setExpenseLoading(true);
    setExpenseError("");

    try {
      const { data: auth, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;

      if (!auth.user) {
        throw new Error("請先登入");
      }

      const isCredit = cardKey.startsWith("credit-");

      const all: CardExpense[] = [];
      const batchSize = 1000;

      for (let from = 0; ; from += batchSize) {
        let query = supabase
          .from("Expenses")
          .select(
            "id,item,date,amount,currency,major_category,category,payment_method,card_name,payment_method_id,expense_scope,trip_id"
          )
        .eq("user_id", auth.user.id);

        if (isCredit) {
          query = query.eq("card_name", detail.name);
        } else {
          query = query.eq(
            "payment_method_id",
            detail.id
          );
        }

        const { data, error } = await query
        .order("date", { ascending: false })
          .order("id", { ascending: false })
          .range(from, from + batchSize - 1);

        if (error) throw error;

        const batch = (data ?? []) as CardExpense[];

        all.push(...batch);

        if (batch.length < batchSize) break;
      }


       if (active) {
        setCardExpenses(all);
      }
    } catch (error) {
      console.error("讀取消費紀錄失敗:", error);

      if (active) {
        setExpenseError(
          error instanceof Error
            ? error.message
            : "讀取消費紀錄失敗"
        );
      }
      } finally {
      if (active) setExpenseLoading(false);
    }
  }

  void loadExpenses();


    return () => {
    active = false;
  };
}, [cardKey, detail]);


  // =========================================
// 13. 搜尋、月份與分頁
// =========================================

  const expenseMonths = Array.from(
  new Set(
    cardExpenses
      .map((e) => e.date?.slice(0, 7))
      .filter((v): v is string => Boolean(v))
  )
    ).sort((a, b) => b.localeCompare(a));

const filteredCardExpenses = cardExpenses.filter(
  (expense) => {
    if (
      expenseMonth !== "all" &&
      expense.date?.slice(0, 7) !== expenseMonth

      ) {
      return false;
    }

    const keyword = expenseSearch.trim().toLowerCase();

    if (!keyword) return true;

    return [
      expense.item,
      expense.major_category,
      expense.category,
      expense.payment_method,
      expense.card_name,
      expense.date,
    ].some((value) =>
       String(value ?? "").toLowerCase().includes(keyword)
    );
  }
);

const totalsByCurrency = filteredCardExpenses.reduce<
  Record<string, number>
>((result, expense) => {
  const currency = expense.currency || "USD";

  result[currency] =
    (result[currency] || 0) +
    Number(expense.amount || 0);

   return result;
}, {});

const totalExpensePages = Math.max(
  1,
  Math.ceil(
    filteredCardExpenses.length / EXPENSE_PAGE_SIZE
  )
);

  const currentExpensePage = Math.min(
  expensePage,
  totalExpensePages
);

  const visibleCardExpenses = filteredCardExpenses.slice(
  (currentExpensePage - 1) * EXPENSE_PAGE_SIZE,
  currentExpensePage * EXPENSE_PAGE_SIZE
);

// =========================================
// 23. 統計分析資料計算
// =========================================

// 可選月份
const analysisMonths = useMemo(() => {
  return Array.from(
    new Set(
      cardExpenses
        .map((e) => e.date?.slice(0, 7))
        .filter((v): v is string => Boolean(v))
    )
  ).sort((a, b) => b.localeCompare(a));
}, [cardExpenses]);

// 可選幣別
const analysisCurrencies = useMemo(() => {
  return Array.from(
    new Set(
      cardExpenses.map(
        (e) => e.currency || "USD"
      )
    )
  ).sort();
}, [cardExpenses]);

// 依照指定月份和幣別篩選
const analysisExpenses = useMemo(() => {
  return cardExpenses.filter((e) => {
    const matchesMonth =
      analysisMonth === "all" ||
      e.date?.slice(0, 7) === analysisMonth;

    const matchesCurrency =
      (e.currency || "USD") === analysisCurrency;

    return matchesMonth && matchesCurrency;
  });
}, [
  cardExpenses,
  analysisMonth,
  analysisCurrency,
]);

// 消費總金額
const analysisTotal = analysisExpenses.reduce(
  (total, expense) =>
    total + Number(expense.amount || 0),
  0
);

// 消費筆數
const analysisCount = analysisExpenses.length;

// 平均每筆消費
const analysisAverage =
  analysisCount > 0
    ? analysisTotal / analysisCount
    : 0;

// 大分類統計
const analysisCategories = useMemo(() => {
  const totals: Record<string, number> = {};

  analysisExpenses.forEach((e) => {
    const category =
      e.major_category || "未分類";

    totals[category] =
      (totals[category] || 0) +
      Number(e.amount || 0);
  });

  return Object.entries(totals)
    .map(([name, amount]) => ({
      name,
      amount,
      percentage:
        analysisTotal !== 0
          ? (amount / analysisTotal) * 100
          : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}, [analysisExpenses, analysisTotal]);

// 日常、旅程分別加總
const analysisScopeTotals = useMemo(() => {
  let daily = 0;
  let trip = 0;

  analysisExpenses.forEach((e) => {
    const amount = Number(e.amount || 0);

    if (
      e.expense_scope === "trip" ||
      e.trip_id != null
    ) {
      trip += amount;
    } else {
      daily += amount;
    }
  });

  return { daily, trip };
}, [analysisExpenses]);

// 每月趨勢
// 固定最近 12 個月，不包含未來月份
const analysisMonthlyTrend = useMemo(() => {
  const now = new Date();
  const result: {
    month: string;
    amount: number;
  }[] = [];

  for (let i = 11; i >= 0; i--) {
    const date = new Date(
      now.getFullYear(),
      now.getMonth() - i,
      1
    );

    const month = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
    ].join("-");

    const total = cardExpenses
      .filter(
        (e) =>
          e.date?.slice(0, 7) === month &&
          (e.currency || "USD") === analysisCurrency
      )
      .reduce(
        (sum, e) =>
          sum + Number(e.amount || 0),
        0
      );

    result.push({
      month,
      amount: total,
    });
  }

  return result;
}, [cardExpenses, analysisCurrency]);
  
// =========================================
// 19. 計算信用卡歷史帳單
// =========================================

const historicalStatements: HistoricalStatement[] = [];

if (
  detail?.type === "信用卡" &&
  detail.statementDay &&
  !expenseLoading &&
  !expenseError
) {
  const statementDay = detail.statementDay;

  // 從現有消費日期決定帳單月份
  const months = new Set<string>();

  cardExpenses.forEach((expense) => {
    if (!expense.date) return;

    const date = new Date(
      `${expense.date.slice(0, 10)}T12:00:00`
    );

    if (Number.isNaN(date.getTime())) return;

    // 當月結帳日
    const closingDate = getStatementDate(
      date.getFullYear(),
      date.getMonth(),
      statementDay
    );

    // 如果消費超過當月結帳日，
    // 就歸入下一個月的帳單
    if (date > closingDate) {
      date.setMonth(date.getMonth() + 1);
    }

    months.add(
      `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`
    );
  });

  Array.from(months)
    .sort((a, b) => b.localeCompare(a))
    .forEach((monthKey) => {
      const [year, month] = monthKey
        .split("-")
        .map(Number);

      const period = getStatementPeriod(
        year,
        month - 1,
        statementDay
      );

      const statementExpenses = cardExpenses.filter(
        (expense) =>
          expense.date >= period.start &&
          expense.date <= period.end
      );

      const totals: Record<string, number> = {};

      statementExpenses.forEach((expense) => {
        const currency = expense.currency || "USD";

        totals[currency] =
          (totals[currency] || 0) +
          Number(expense.amount || 0);
      });

      historicalStatements.push({
        key: monthKey,
        label: `${year} 年 ${month} 月帳單`,
        start: period.start,
        end: period.end,
        expenses: statementExpenses,
        totals,
      });
    });
}
  
// ==================== 04. 頁面 ====================

  return (


    <main className="page">

      <Link
        href="/cards"
        className="backLink"
      >
        ← 返回付款方式管理
      </Link>

      {loading ? (

        <div className="status">
          正在載入付款工具...
        </div>

      ) : errorMessage ? (

        <div className="status error">
          {errorMessage}
        </div>

        ) : detail ? (

        <>

          <header className="header">

            <div>
              <h1>{detail.name}</h1>

              <div className="detailMeta">

                <span className="typeBadge">
                  {detail.type}
                </span>

                <span>

                  {detail.description}
                </span>

              </div>

              {detail.type === "信用卡" && (

                <div className="billingInfo">

                  <span>
                    結帳日：
                    {detail.statementDay
                      ? `每月 ${detail.statementDay} 日`
                      : "未設定"}
                  </span>

                  <span>
                    繳款日：
                    {detail.dueDay
                      ? `每月 ${detail.dueDay} 日`
                      : "未設定"}
                  </span>

                  </div>

              )}

            </div>

          </header>

          {/* ==================== 05. 三分頁 ==================== */}

          <nav className="tabs">

            <button
              type="button"
              className={
                activeTab === "expenses"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab("expenses")
              }
            >
              消費紀錄
            </button>
            <button
              type="button"
              className={
                activeTab === "statements"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab("statements")
              }
            >
              歷史帳單
            </button>

            <button
              type="button"
              className={
                activeTab === "analytics"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab("analytics")
              }
              >
              統計分析
            </button>

          </nav>

          

         {/* =========================================
    14. 消費紀錄：完整清單
   ========================================= */}

          {activeTab === "expenses" && (
  <section className="panel">

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
      <h2 style={{ margin: 0 }}>
        消費紀錄
      </h2>

      <span style={{ fontSize: 13, color: "#64748b" }}>
        共 {filteredCardExpenses.length} 筆
      </span>
    </div>

    {/* 搜尋與月份 */}
    <div className="expenseFilters">
      <input
        type="search"
        placeholder="搜尋品項、分類、付款方式..."
        value={expenseSearch}
        onChange={(e) => {
          setExpenseSearch(e.target.value);
          setExpensePage(1);
        }}
      />

      <select
        value={expenseMonth}
        onChange={(e) => {
          setExpenseMonth(e.target.value);
          setExpensePage(1);
        }}
      >
        <option value="all">全部月份</option>

        {expenseMonths.map((month) => (
          <option key={month} value={month}>
            {month.replace("-", " 年 ")} 月
          </option>
        ))}
      </select>
    </div>

    {/* 各幣別合計 */}
    {!expenseLoading && !expenseError && (
      <div className="expenseTotals">
        {Object.entries(totalsByCurrency).map(
          ([currency, amount]) => (
            <div key={currency}>
              <span>{currency}</span>
              <strong>
                {amount.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                </strong>
            </div>
          )
        )}
      </div>
    )}

    {expenseLoading ? (
      <div className="expenseEmpty">
        正在載入消費紀錄...
      </div>
    ) : expenseError ? (
      <div className="expenseEmpty">
        {expenseError}
      </div>
    ) : visibleCardExpenses.length === 0 ? (
      <div className="expenseEmpty">
        沒有符合條件的消費紀錄
      </div>
    ) : (
      <div className="expenseList">
        {visibleCardExpenses.map((expense) => (
          <Link
            key={String(expense.id)}
            href={`/expenses/${expense.id}`}
            className="expenseItem"
          >
            <div className="expenseInfo">
              <strong>
                {expense.item || "未命名花費"}
              </strong>

              <span>
                {expense.date} ·{" "}
                {expense.major_category || "未分類"}
                {expense.category &&
                  ` / ${expense.category}`}
              </span>

              <span>
                {expense.expense_scope === "trip" ||
                expense.trip_id != null
                  ? "旅程花費"
                  : "日常花費"}
                {" · "}
                {expense.payment_method || "未設定"}
              </span>
            </div>

            <div className="expenseAmount">
              <small>{expense.currency || "USD"}</small>
              <strong>
                {Number(expense.amount || 0).toLocaleString(
                  "en-US",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}
              </strong>
              <span>›</span>
              </div>
          </Link>
        ))}
      </div>
    )}

    {/* 分頁 */}
    {!expenseLoading &&
      !expenseError &&
      filteredCardExpenses.length > 0 && (
        <div className="expensePagination">
          <span>
            第 {currentExpensePage} /{" "}
            {totalExpensePages} 頁
          </span>


          <div>
            <button
              disabled={currentExpensePage <= 1}
              onClick={() =>
                setExpensePage(currentExpensePage - 1)
              }
            >
              ← 上一頁
            </button>

            <button
              disabled={
                currentExpensePage >= totalExpensePages
              }
              onClick={() =>
                setExpensePage(currentExpensePage + 1)
              }
            >
              下一頁 →
            </button>
          </div>
        </div>
      )}
  </section>
)}


{/* =========================================
    20. 信用卡歷史帳單
   ========================================= */}

{activeTab === "statements" && (
  <section className="panel">

    <h2>
      {detail.type === "信用卡"
        ? "信用卡歷史帳單"
        : "歷史消費彙總"}
    </h2>

    {detail.type !== "信用卡" ? (
      <p>
        此付款方式沒有信用卡結帳週期。
        後續將依自然月份顯示消費彙總。
      </p>
    ) : !detail.statementDay ? (
      <p>
        這張信用卡尚未設定結帳日，
        請先至付款方式管理設定。
      </p>
    ) : expenseLoading ? (
      <div className="placeholder">
        正在載入歷史帳單...
      </div>
    ) : expenseError ? (
      <div className="placeholder">
        讀取消費資料失敗：{expenseError}
      </div>
    ) : historicalStatements.length === 0 ? (
      <div className="placeholder">
        目前沒有可計算的歷史帳單。
      </div>
    ) : (
      <div className="statementList">

        {historicalStatements.map((statement) => {
          const opened =
            expandedStatement === statement.key;

          return (
            <div
              key={statement.key}
              className="statementItem"
            >
              <button
                type="button"
                className="statementButton"
                onClick={() =>
                  setExpandedStatement(
                    opened ? null : statement.key
                  )
                }
              >
                <div className="statementInfo">
                  <strong>{statement.label}</strong>

                  <span>
                    {statement.start.replace(/-/g, "/")}
                    {" ～ "}
                    {statement.end.replace(/-/g, "/")}
                  </span>

                  <small>
                    {statement.expenses.length} 筆消費
                  </small>
                </div>

                <div className="statementAmount">
                  {Object.entries(statement.totals).map(
                    ([currency, amount]) => (
                      <strong key={currency}>
                        {currency}{" "}
                        {amount.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </strong>
                    )
                  )}

                  <span>{opened ? "▲" : "▼"}</span>
                </div>
              </button>

              {opened && (
                <div className="statementDetails">
                  {statement.expenses.map((expense) => (
                    <Link
                      key={String(expense.id)}
                      href={`/expenses/${expense.id}`}
                      className="statementExpense"
                    >
                      <div>
                        <strong>
                          {expense.item || "未命名花費"}
                        </strong>
                        <span>
                          {expense.date}
                          {" · "}
                          {expense.major_category ||
                            "未分類"}
                        </span>
                      </div>

                      <strong>
                        {expense.currency || "USD"}{" "}
                        {Number(
                          expense.amount || 0
                        ).toFixed(2)}
                      </strong>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}

      </div>
    )}

  </section>
)}

          {/* ==================== 08. 統計分析 ==================== */}

          {activeTab === "analytics" && (

            <section className="panel">

              <h2>統計分析</h2>

              <p>
                將提供每月支出趨勢、消費分類、
                日常與旅程占比，以及各幣別統計。
              </p>

              <div className="placeholder">
                下一步串接統計圖表
              </div>

            </section>

          )}

          </>

      ) : null}


{/* ==================== 09. 排版 ==================== */}

      <style jsx>{`

        .page {
          max-width: 1100px;
          margin: 0 auto;
          padding: 28px 18px 70px;
          color: #172033;
        }


.backLink {
          display: inline-block;
          color: #64748b;
          text-decoration: none;
          font-size: 14px;
          margin-bottom: 25px;
        }

        .header {
          margin-bottom: 24px;
        }

        h1 {
          font-size: 30px;
          font-weight: 800;
          margin: 0;
        }

        .detailMeta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 11px;
          font-size: 13px;
          color: #64748b;
        }

        .typeBadge {
          background: #eef2ff;
          color: #4338ca;
          padding: 5px 10px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
        }

        .billingInfo {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-top: 14px;
          font-size: 13px;
          color: #475569;
        }

        .tabs {
          display: flex;
          gap: 8px;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 20px;
          padding-bottom: 10px;
        }

        .tabs button {
          border: 0;
          border-radius: 9px;
          padding: 11px 17px;
          background: #f1f5f9;
          color: #64748b;
          font-size: 14px;
          cursor: pointer;
        }

        .tabs button.active {
          background: #4f46e5;
          color: #fff;
          font-weight: 700;
        }

        .panel {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 23px;
          background: #fff;
          min-height: 240px;
        }

        .panel h2 {
          font-size: 20px;
          margin: 0 0 12px;
        }

        .panel p {
          font-size: 13px;
          color: #64748b;
          line-height: 1.8;
        }

        .placeholder {
          margin-top: 23px;
          padding: 32px 15px;
          border: 1px dashed #cbd5e1;
          border-radius: 11px;
          text-align: center;
          color: #94a3b8;
          font-size: 13px;
          background: #f8fafc;
        }

        .status {
          padding: 45px 15px;
          text-align: center;
          color: #64748b;
        }

        .status.error {
          color: #dc2626;
        }

        @media(max-width:600px) {

          .page {
            padding: 20px 12px 55px;
            }

          h1 {
            font-size: 24px;
          }

          .tabs {
            gap: 5px;
          }

          .tabs button {
            flex: 1;
            padding: 10px 5px;
            font-size: 12px;
          }


.panel {
            padding: 16px;
          }

        }

/* =========================================
   15. 消費紀錄排版
   ========================================= */
   .expenseFilters {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 10px;
  margin-bottom: 15px;
}

.expenseFilters input,
.expenseFilters select {
  width: 100%;
  min-width: 0;
  padding: 11px 12px;
  border: 1px solid #dbe2ea;
   border-radius: 10px;
  background: white;
  font-size: 13px;
  box-sizing: border-box;
}

.expenseTotals {
display: flex;
  flex-wrap: wrap;
  gap: 18px;
  padding: 14px;
  background: #f1f5f9;
  border-radius: 10px;
  margin-bottom: 15px;
}

.expenseTotals div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.expenseTotals span {
  font-size: 11px;
  color: #64748b;
}

.expenseTotals strong {
  font-size: 17px;
}

.expenseList {
  border: 1px solid #e2e8f0;
  border-radius: 11px;
  overflow: hidden;
}

.expenseItem {
display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 13px;
  border-bottom: 1px solid #edf0f4;
  color: inherit;
  text-decoration: none;
}

.expenseItem:last-child {
  border-bottom: 0;
}

.expenseItem:hover {
  background: #f8faff;
}

.expenseInfo {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.expenseInfo strong {
  font-size: 14px;
}

.expenseInfo span {
  font-size: 11px;
  color: #64748b;
}

.expenseAmount {
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}

.expenseAmount small {
  font-size: 11px;
  color: #64748b;
}

.expenseAmount strong {
  font-size: 15px;
}

.expenseAmount > span {
  color: #94a3b8;
  font-size: 20px;
  margin-left: 4px;
}

.expenseEmpty {
  text-align: center;
  color: #64748b;
  padding: 35px 12px;
  font-size: 13px;
}

.expensePagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
  color: #64748b;
  font-size: 12px;
}

.expensePagination div {
  display: flex;
  gap: 7px;
}


.expensePagination button {
  border: 1px solid #dbe2ea;
  border-radius: 8px;
  padding: 9px 11px;
  background: white;
  cursor: pointer;
}

.expensePagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

@media (max-width: 600px) {
  .expenseFilters {
    grid-template-columns: 1fr;
  }

  .expenseItem {
    padding: 11px 9px;
  }

  .expenseAmount strong {
    font-size: 14px;
  }

  .expensePagination {
    flex-direction: column;
  }
}

/* =========================================
   21. 歷史帳單排版
   ========================================= */

.statementList {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.statementItem {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}

.statementButton {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  width: 100%;
  padding: 16px;
  border: 0;
  background: #fff;
  color: #172033;
  cursor: pointer;
  text-align: left;
}

.statementButton:hover {
  background: #f8fafc;
}

.statementInfo,
.statementAmount {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.statementInfo strong {
  font-size: 15px;
}

.statementInfo span,
.statementInfo small {
  font-size: 12px;
  color: #64748b;
}

.statementAmount {
  text-align: right;
  align-items: flex-end;
}

.statementAmount strong {
  font-size: 14px;
  white-space: nowrap;
}

.statementAmount span {
  font-size: 11px;
  color: #94a3b8;
}

.statementDetails {
  border-top: 1px solid #e2e8f0;
  padding: 0 15px;
  background: #f8fafc;
}

.statementExpense {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 13px 0;
  border-bottom: 1px solid #e2e8f0;
  text-decoration: none;
  color: inherit;
}

.statementExpense:last-child {
  border-bottom: 0;
}

.statementExpense > div {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.statementExpense strong {
  font-size: 13px;
}

.statementExpense span {
  color: #64748b;
  font-size: 11px;
}

@media (max-width: 600px) {
  .statementButton {
    padding: 13px 11px;
  }

  .statementAmount strong {
    font-size: 12px;
  }

  .statementDetails {
    padding: 0 11px;
  }
}

      `}</style>

    </main>

  );
}
