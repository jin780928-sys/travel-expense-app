"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Expense = {
  id: number | string;
  date: string;
  item: string;
  amount: number;
  major_category: string | null;
  category: string | null;
  currency: string | null;
  card_name: string | null;
};

type CreditCard = {
  id: number;
  name: string;
  statement_day: number | null;
  due_day: number | null;
};

type CreditCardStatement = {
  id: number | string;
  card_id: number;
  period_start: string;
  period_end: string;
  is_paid: boolean;
  paid_date: string | null;
};

type CurrentCardStatement = CreditCard & {
  periodStart: string | null;
  periodEnd: string | null;
  totals: Record<string, number>;
  statementStatusId: number | string | null;
  isPaid: boolean;
  paidDate: string | null;
};

export default function DashboardPage() {
  const today = new Date();

  const [selectedYear, setSelectedYear] = useState(
    today.getFullYear()
  );

  const [selectedMonth, setSelectedMonth] = useState(
    today.getMonth() + 1
  );

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [statementExpenses, setStatementExpenses] = useState<
    Expense[]
  >([]);

  const [creditCards, setCreditCards] = useState<
    CreditCard[]
  >([]);

  const [cardStatements, setCardStatements] = useState<
    CreditCardStatement[]
  >([]);

  const [message, setMessage] = useState("");

  const [selectedCard, setSelectedCard] = useState<
    string | null
  >(null);

  const [
    selectedStatementCard,
    setSelectedStatementCard,
  ] = useState<string | null>(null);

  const [
    editingPaidStatementId,
    setEditingPaidStatementId,
  ] = useState<number | string | null>(null);

  const [editingPaidDate, setEditingPaidDate] =
    useState("");

  useEffect(() => {
    loadDashboardData();
  }, [selectedYear, selectedMonth]);

  function dateToString(date: Date) {
    const year = date.getFullYear();
    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function createSafeDate(
    year: number,
    monthIndex: number,
    day: number
  ) {
    const lastDay = new Date(
      year,
      monthIndex + 1,
      0
    ).getDate();

    return new Date(
      year,
      monthIndex,
      Math.min(day, lastDay)
    );
  }

  async function loadDashboardData() {
    setMessage("載入中...");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("請先登入");
      return;
    }

    const monthStart = new Date(
      selectedYear,
      selectedMonth - 1,
      1
    );

    const monthEnd = new Date(
      selectedYear,
      selectedMonth,
      0
    );

    const previousMonthStart = new Date(
      selectedYear,
      selectedMonth - 2,
      1
    );

    const [
      monthlyExpenseResult,
      statementExpenseResult,
      cardResult,
      statementResult,
    ] = await Promise.all([
      supabase
        .from("Expenses")
        .select(
          `
          id,
          date,
          item,
          amount,
          major_category,
          category,
          currency,
          card_name
        `
        )
        .eq("expense_scope", "daily")
        .gte(
          "date",
          dateToString(monthStart)
        )
        .lte(
          "date",
          dateToString(monthEnd)
        )
        .order("date", {
          ascending: false,
        }),

      supabase
        .from("Expenses")
        .select(
          `
          id,
          date,
          item,
          amount,
          major_category,
          category,
          currency,
          card_name
        `
        )
        .eq("expense_scope", "daily")
        .gte(
          "date",
          dateToString(previousMonthStart)
        )
        .lte(
          "date",
          dateToString(monthEnd)
        )
        .order("date", {
          ascending: false,
        }),

      supabase
        .from("CreditCards")
        .select(
          `
          id,
          name,
          statement_day,
          due_day
        `
        )
        .eq("is_active", true)
        .order("name"),

      supabase
        .from("CreditCardStatements")
        .select(
          `
          id,
          card_id,
          period_start,
          period_end,
          is_paid,
          paid_date
        `
        ),
    ]);

    if (monthlyExpenseResult.error) {
      setMessage(
        monthlyExpenseResult.error.message
      );
      return;
    }

    if (statementExpenseResult.error) {
      setMessage(
        statementExpenseResult.error.message
      );
      return;
    }

    if (cardResult.error) {
      setMessage(
        cardResult.error.message
      );
      return;
    }

    if (statementResult.error) {
      setMessage(
        statementResult.error.message
      );
      return;
    }

    setExpenses(
      (monthlyExpenseResult.data ||
        []) as Expense[]
    );

    setStatementExpenses(
      (statementExpenseResult.data ||
        []) as Expense[]
    );

    setCreditCards(
      (cardResult.data ||
        []) as CreditCard[]
    );

    setCardStatements(
      (statementResult.data ||
        []) as CreditCardStatement[]
    );

    setMessage("");
  }

  const totalsByCurrency = useMemo(() => {
    const totals: Record<string, number> = {};

    for (const expense of expenses) {
      const currency =
        expense.currency || "USD";

      totals[currency] =
        (totals[currency] || 0) +
        Number(expense.amount || 0);
    }

    return totals;
  }, [expenses]);

  const totalsByCategory = useMemo(() => {
    const totals: Record<
      string,
      Record<string, number>
    > = {};

    for (const expense of expenses) {
      const category =
        expense.major_category || "未分類";

      const currency =
        expense.currency || "USD";

      if (!totals[category]) {
        totals[category] = {};
      }

      totals[category][currency] =
        (totals[category][currency] || 0) +
        Number(expense.amount || 0);
    }

    return totals;
  }, [expenses]);

  const totalsByCard = useMemo(() => {
    const totals: Record<
      string,
      Record<string, number>
    > = {};

    for (const expense of expenses) {
      if (!expense.card_name) {
        continue;
      }

      const cardName =
        expense.card_name;

      const currency =
        expense.currency || "USD";

      if (!totals[cardName]) {
        totals[cardName] = {};
      }

      totals[cardName][currency] =
        (totals[cardName][currency] || 0) +
        Number(expense.amount || 0);
    }

    return totals;
  }, [expenses]);

  const filteredCardExpenses =
    useMemo(() => {
      if (!selectedCard) {
        return [];
      }

      return expenses.filter(
        (expense) =>
          expense.card_name ===
          selectedCard
      );
    }, [expenses, selectedCard]);

  function formatDate(
    dateString: string
  ) {
    if (!dateString) {
      return "";
    }

    const [year, month, day] =
      dateString.split("-");

    return `${year}/${month}/${day}`;
  }

  function getDueDateText(
  dueDay: number | null
) {
  if (!dueDay) {
    return "未設定";
  }

  const dueDate = createSafeDate(
    selectedYear,
    selectedMonth - 1,
    dueDay
  );

  return `${dueDate.getFullYear()}/${String(
    dueDate.getMonth() + 1
  ).padStart(2, "0")}/${String(
    dueDate.getDate()
  ).padStart(2, "0")}`;
}
  
  function getDueStatus(
    dueDay: number | null,
    isPaid: boolean
  ) {
    if (isPaid) {
      return "✅ 已完成繳款";
    }

    if (!dueDay) {
      return "未設定繳款日";
    }

    const now = new Date();

    const todayOnly = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const dueDate = createSafeDate(
      selectedYear,
      selectedMonth - 1,
      dueDay
    );

    const diffMs =
      dueDate.getTime() -
      todayOnly.getTime();

    const diffDays = Math.ceil(
      diffMs /
        (1000 * 60 * 60 * 24)
    );

    if (diffDays > 0) {
      return `距離繳款日還有 ${diffDays} 天`;
    }

    if (diffDays === 0) {
      return "⚠️ 今天到期";
    }

    return `⚠️ 已逾期 ${Math.abs(
      diffDays
    )} 天`;
  }

  function getDueLevel(
    dueDay: number | null,
    isPaid: boolean
  ) {
    if (isPaid || !dueDay) {
      return "normal";
    }

    const now = new Date();

    const todayOnly = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const dueDate = createSafeDate(
      selectedYear,
      selectedMonth - 1,
      dueDay
    );

    const diffMs =
      dueDate.getTime() -
      todayOnly.getTime();

    const diffDays = Math.ceil(
      diffMs /
        (1000 * 60 * 60 * 24)
    );

    if (diffDays < 0) {
      return "overdue";
    }

    if (diffDays === 0) {
      return "today";
    }

    return "soon";
  }

  function getStatementBadge(
    dueDay: number | null,
    isPaid: boolean
  ) {
    if (isPaid) {
      return "已繳";
    }

    if (!dueDay) {
      return "未設定";
    }

    const now = new Date();

    const todayOnly = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const dueDate = createSafeDate(
      selectedYear,
      selectedMonth - 1,
      dueDay
    );

    const diffMs =
      dueDate.getTime() -
      todayOnly.getTime();

    const diffDays = Math.ceil(
      diffMs /
        (1000 * 60 * 60 * 24)
    );

    if (diffDays < 0) {
      return "已逾期";
    }

    if (diffDays === 0) {
      return "今天到期";
    }

    return "未繳";
  }

  const currentCardStatements =
    useMemo<CurrentCardStatement[]>(() => {
      return creditCards.map((card) => {
        if (!card.statement_day) {
          return {
            ...card,
            periodStart: null,
            periodEnd: null,
            totals: {},
            statementStatusId: null,
            isPaid: false,
            paidDate: null,
          };
        }

        const endDate = createSafeDate(
          selectedYear,
          selectedMonth - 1,
          card.statement_day
        );

        const previousEndDate =
          createSafeDate(
            selectedYear,
            selectedMonth - 2,
            card.statement_day
          );

        const startDate = new Date(
          previousEndDate
        );

        startDate.setDate(
          startDate.getDate() + 1
        );

        const periodStart =
          dateToString(startDate);

        const periodEnd =
          dateToString(endDate);

        const totals: Record<
          string,
          number
        > = {};

        for (
          const expense of statementExpenses
        ) {
          if (
            expense.card_name !==
            card.name
          ) {
            continue;
          }

          if (
            expense.date < periodStart ||
            expense.date > periodEnd
          ) {
            continue;
          }

          const currency =
            expense.currency || "USD";

          totals[currency] =
            (totals[currency] || 0) +
            Number(
              expense.amount || 0
            );
        }

        const statementStatus =
          cardStatements.find(
            (statement) =>
              Number(
                statement.card_id
              ) ===
                Number(card.id) &&
              statement.period_start ===
                periodStart &&
              statement.period_end ===
                periodEnd
          );

        return {
          ...card,
          periodStart,
          periodEnd,
          totals,
          statementStatusId:
            statementStatus?.id ??
            null,
          isPaid:
            statementStatus?.is_paid ??
            false,
          paidDate:
            statementStatus?.paid_date ??
            null,
        };
      });
    }, [
      creditCards,
      cardStatements,
      statementExpenses,
      selectedYear,
      selectedMonth,
    ]);

  const sortedCardStatements = useMemo(() => {
  return [...currentCardStatements].sort(
    (a, b) => {
      if (a.isPaid !== b.isPaid) {
        return a.isPaid ? 1 : -1;
      }

      const aDue = a.due_day ?? 99;
      const bDue = b.due_day ?? 99;

      return aDue - bDue;
    }
  );
}, [currentCardStatements]);

  const unpaidStatements =
    useMemo(() => {
      const now = new Date();

      const todayOnly = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

      return currentCardStatements
        .filter((card) => {
          if (
            card.isPaid ||
            !card.due_day
          ) {
            return false;
          }

          const hasAmount = Object.values(
  card.totals
).some((total) => total > 0);

if (!hasAmount) {
  return false;
}
          const dueDate =
            createSafeDate(
              selectedYear,
              selectedMonth - 1,
              card.due_day
            );

          const diffMs =
            dueDate.getTime() -
            todayOnly.getTime();

          const diffDays =
            Math.ceil(
              diffMs /
                (1000 *
                  60 *
                  60 *
                  24)
            );

          return diffDays <= 7;
        })
        .sort((a, b) => {
          const aDate =
            createSafeDate(
              selectedYear,
              selectedMonth - 1,
              a.due_day || 1
            );

          const bDate =
            createSafeDate(
              selectedYear,
              selectedMonth - 1,
              b.due_day || 1
            );

          return (
            aDate.getTime() -
            bDate.getTime()
          );
        });
    }, [
      currentCardStatements,
      selectedYear,
      selectedMonth,
    ]);

  const unpaidTotalsByCurrency = useMemo(() => {
  const totals: Record<string, number> = {};

  for (const card of unpaidStatements) {
    for (const [currency, total] of Object.entries(
      card.totals
    )) {
      totals[currency] =
        (totals[currency] || 0) + total;
    }
  }

  return totals;
}, [unpaidStatements]);
  
  const selectedStatement =
    useMemo(() => {
      if (!selectedStatementCard) {
        return null;
      }

      return (
        currentCardStatements.find(
          (card) =>
            card.name ===
            selectedStatementCard
        ) || null
      );
    }, [
      currentCardStatements,
      selectedStatementCard,
    ]);

  const selectedStatementExpenses =
    useMemo(() => {
      if (
        !selectedStatement ||
        !selectedStatement.periodStart ||
        !selectedStatement.periodEnd
      ) {
        return [];
      }

      return statementExpenses.filter(
        (expense) =>
          expense.card_name ===
            selectedStatement.name &&
          expense.date >=
            selectedStatement.periodStart! &&
          expense.date <=
            selectedStatement.periodEnd!
      );
    }, [
      selectedStatement,
      statementExpenses,
    ]);

  async function togglePaidStatus(
    card: CurrentCardStatement
  ) {
    if (
      !card.periodStart ||
      !card.periodEnd
    ) {
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("請先登入");
      return;
    }

    const newPaidStatus =
      !card.isPaid;

    const paidDate = newPaidStatus
      ? dateToString(new Date())
      : null;

    if (
      card.statementStatusId !== null
    ) {
      const { error } =
        await supabase
          .from(
            "CreditCardStatements"
          )
          .update({
            is_paid:
              newPaidStatus,
            paid_date: paidDate,
          })
          .eq(
            "id",
            card.statementStatusId
          );

      if (error) {
        setMessage(error.message);
        return;
      }
    } else {
      const { error } =
        await supabase
          .from(
            "CreditCardStatements"
          )
          .insert({
            card_id: card.id,
            period_start:
              card.periodStart,
            period_end:
              card.periodEnd,
            is_paid: true,
            paid_date: paidDate,
            user_id: user.id,
          });

      if (error) {
        setMessage(error.message);
        return;
      }
    }

    setEditingPaidStatementId(
      null
    );

    setEditingPaidDate("");

    await loadDashboardData();
  }

  async function savePaidDate(
    statementId: number | string
  ) {
    if (!editingPaidDate) {
      setMessage(
        "請選擇繳款日期"
      );
      return;
    }

    const { error } =
      await supabase
        .from(
          "CreditCardStatements"
        )
        .update({
          paid_date:
            editingPaidDate,
        })
        .eq("id", statementId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setEditingPaidStatementId(
      null
    );

    setEditingPaidDate("");

    await loadDashboardData();
  }

  const years: number[] = [];

  for (
    let year =
      today.getFullYear() - 2;
    year <=
    today.getFullYear() + 2;
    year++
  ) {
    years.push(year);
  }

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: 20,
      }}
    >
      <h1>
        📊 記帳 Dashboard
      </h1>

      <p>
        <Link href="/">
          ← 回首頁
        </Link>
      </p>

      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <select
          value={selectedYear}
          onChange={(e) =>
            setSelectedYear(
              Number(
                e.target.value
              )
            )
          }
        >
          {years.map((year) => (
            <option
              key={year}
              value={year}
            >
              {year} 年
            </option>
          ))}
        </select>

        <select
          value={selectedMonth}
          onChange={(e) =>
            setSelectedMonth(
              Number(
                e.target.value
              )
            )
          }
        >
          {Array.from(
            { length: 12 },
            (_, index) =>
              index + 1
          ).map((month) => (
            <option
              key={month}
              value={month}
            >
              {month} 月
            </option>
          ))}
        </select>
      </div>

      <p>
        目前查看：
        <strong>
          {selectedYear} 年{" "}
          {selectedMonth} 月
        </strong>
      </p>

      {message && (
        <p>{message}</p>
      )}

      {unpaidStatements.length >
        0 && (
        <section
          style={{
            marginTop: 20,
            marginBottom: 30,
            padding: 16,
            border:
              "1px solid #ddd",
            borderRadius: 10,
          }}
        >
          <h2>
  ⚠️ 未繳帳單提醒（{unpaidStatements.length} 張）
</h2>

          <div
  style={{
    marginBottom: 12,
    fontWeight: "bold",
  }}
>
  未繳總額：
  {Object.keys(unpaidTotalsByCurrency).length === 0 ? (
    <span>0</span>
  ) : (
    Object.entries(unpaidTotalsByCurrency).map(
      ([currency, total], index) => (
        <span key={currency}>
          {index > 0 ? " / " : " "}
          {currency} {total.toFixed(2)}
        </span>
      )
    )
  )}
</div>
          
          {unpaidStatements.map(
            (card) => (
              <div
                key={card.id}
                style={{
                  marginBottom: 10,
                  padding: 10,
                  borderRadius: 8,
                  background:
                    getDueLevel(
                      card.due_day,
                      card.isPaid
                    ) ===
                    "overdue"
                      ? "#ffe5e5"
                      : getDueLevel(
                          card.due_day,
                          card.isPaid
                        ) ===
                        "today"
                      ? "#fff1d6"
                      : "#fffbe6",
                }}
              >
                <button
                  onClick={() => {
                    setSelectedStatementCard(
                      card.name
                    );

                    setTimeout(
                      () => {
                        document
                          .getElementById(
                            "card-statements"
                          )
                          ?.scrollIntoView(
                            {
                              behavior:
                                "smooth",
                            }
                          );
                      },
                      50
                    );
                  }}
                  style={{
                    fontWeight:
                      "bold",
                    cursor:
                      "pointer",
                    background:
                      "none",
                    border: "none",
                    padding: 0,
                    textDecoration:
                      "underline",
                  }}
                >
                  {card.name}
                </button>

                <div
                  style={{
                    marginTop: 4,
                  }}
                >
                  {getDueStatus(
                    card.due_day,
                    card.isPaid
                  )}
                </div>

                <div
                  style={{
                    marginTop: 4,
                  }}
                >
                  {Object.keys(
                    card.totals
                  ).length === 0 ? (
                    <span>
                      本期金額：0
                    </span>
                  ) : (
                    Object.entries(
                      card.totals
                    ).map(
                      ([
                        currency,
                        total,
                      ]) => (
                        <div
                          key={
                            currency
                          }
                        >
                          本期金額：
                          {
                            currency
                          }{" "}
                          {total.toFixed(
                            2
                          )}
                        </div>
                      )
                    )
                  )}
                </div>

                <button
                  onClick={() =>
                    togglePaidStatus(
                      card
                    )
                  }
                  style={{
                    marginTop: 8,
                    padding:
                      "6px 10px",
                  }}
                >
                  標記已繳
                </button>
              </div>
            )
          )}
        </section>
      )}

      <section
        style={{
          marginBottom: 30,
        }}
      >
        <h2>
          本月支出總額
        </h2>

        {Object.keys(
          totalsByCurrency
        ).length === 0 ? (
          <p>
            本月沒有支出
          </p>
        ) : (
          Object.entries(
            totalsByCurrency
          ).map(
            ([
              currency,
              total,
            ]) => (
              <div
                key={currency}
                style={{
                  fontSize: 20,
                  fontWeight:
                    "bold",
                  marginBottom: 6,
                }}
              >
                {currency}{" "}
                {total.toFixed(2)}
              </div>
            )
          )
        )}
      </section>

      <section
        style={{
          marginBottom: 30,
        }}
      >
        <h2>支出分類</h2>

        {Object.keys(
          totalsByCategory
        ).length === 0 ? (
          <p>沒有資料</p>
        ) : (
          Object.entries(
            totalsByCategory
          ).map(
            ([
              category,
              currencies,
            ]) => (
              <div
                key={category}
                style={{
                  marginBottom: 12,
                  padding: 10,
                  border:
                    "1px solid #ddd",
                  borderRadius: 8,
                }}
              >
                <strong>
                  {category}
                </strong>

                {Object.entries(
                  currencies
                ).map(
                  ([
                    currency,
                    total,
                  ]) => (
                    <div
                      key={
                        currency
                      }
                    >
                      {currency}:{" "}
                      {total.toFixed(
                        2
                      )}
                    </div>
                  )
                )}
              </div>
            )
          )
        )}
      </section>

      <section
        style={{
          marginBottom: 30,
        }}
      >
        <h2>
          信用卡支出
        </h2>

        {Object.keys(
          totalsByCard
        ).length === 0 ? (
          <p>
            本月沒有信用卡支出
          </p>
        ) : (
          Object.entries(
            totalsByCard
          ).map(
            ([
              cardName,
              currencies,
            ]) => (
              <div
                key={cardName}
                style={{
                  marginBottom: 12,
                  padding: 10,
                  border:
                    "1px solid #ddd",
                  borderRadius: 8,
                }}
              >
                <button
                  onClick={() =>
                    setSelectedCard(
                      selectedCard ===
                        cardName
                        ? null
                        : cardName
                    )
                  }
                  style={{
                    fontWeight:
                      "bold",
                    cursor:
                      "pointer",
                  }}
                >
                  {cardName}
                </button>

                {Object.entries(
                  currencies
                ).map(
                  ([
                    currency,
                    total,
                  ]) => (
                    <div
                      key={
                        currency
                      }
                    >
                      {currency}:{" "}
                      {total.toFixed(
                        2
                      )}
                    </div>
                  )
                )}

                {selectedCard ===
                  cardName && (
                  <div
                    style={{
                      marginTop: 10,
                    }}
                  >
                    {filteredCardExpenses.map(
                      (
                        expense
                      ) => (
                        <div
                          key={
                            expense.id
                          }
                          style={{
                            padding:
                              "6px 0",
                            borderTop:
                              "1px solid #eee",
                          }}
                        >
                          <Link
                            href={`/expenses/${expense.id}`}
                          >
                            {
                              expense.date
                            }{" "}
                            {
                              expense.item
                            }
                          </Link>{" "}
                          —{" "}
                          {expense.currency ||
                            "USD"}{" "}
                          {Number(
                            expense.amount
                          ).toFixed(
                            2
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )
          )
        )}
      </section>

      <section
        id="card-statements"
        style={{
          marginBottom: 30,
        }}
      >
        <h2>
          💳 信用卡本期帳單
        </h2>

        <p
  style={{
    marginTop: 0,
    marginBottom: 12,
  }}
>
  目前帳單月份：
  <strong>
    {selectedYear} 年 {selectedMonth} 月
  </strong>
</p>

        {sortedCardStatements.length ===
0 ? (
          <p>
            尚未設定信用卡
          </p>
        ) : (
          sortedCardStatements.map(
  (card) => (
              <div
                key={card.id}
                style={{
                  marginBottom: 16,
                  padding: 14,
                  border:
                    selectedStatementCard ===
                    card.name
                      ? "2px solid #777"
                      : "1px solid #ddd",
                  borderRadius: 10,
                }}
              >
                <div>
                  <button
                    onClick={() =>
                      setSelectedStatementCard(
                        selectedStatementCard ===
                          card.name
                          ? null
                          : card.name
                      )
                    }
                    style={{
                      fontSize: 17,
                      fontWeight:
                        "bold",
                      cursor:
                        "pointer",
                    }}
                  >
                    {card.name}
                  </button>

                  <span
                    style={{
                      marginLeft: 8,
                      padding:
                        "3px 8px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight:
                        "bold",
                      background:
                        card.isPaid
                          ? "#e7f7ed"
                          : getDueLevel(
                              card.due_day,
                              card.isPaid
                            ) ===
                            "overdue"
                          ? "#ffe5e5"
                          : getDueLevel(
                              card.due_day,
                              card.isPaid
                            ) ===
                            "today"
                          ? "#fff1d6"
                          : "#fffbe6",
                    }}
                  >
                    {getStatementBadge(
                      card.due_day,
                      card.isPaid
                    )}
                  </span>
                </div>

                <div
                  style={{
                    marginTop: 8,
                    marginBottom: 8,
                    fontSize: 18,
                    fontWeight:
                      "bold",
                  }}
                >
                  {Object.keys(
                    card.totals
                  ).length === 0 ? (
                    <span>
                      本期金額：0
                    </span>
                  ) : (
                    Object.entries(
                      card.totals
                    ).map(
                      ([
                        currency,
                        total,
                      ]) => (
                        <div
                          key={
                            currency
                          }
                        >
                          本期金額：
                          {
                            currency
                          }{" "}
                          {total.toFixed(
                            2
                          )}
                        </div>
                      )
                    )
                  )}
                </div>

                <div>
                  結帳日：
                  {card.statement_day
                    ? `每月 ${card.statement_day} 日`
                    : "未設定"}
                </div>

                <div>
                  繳款日：
                  {card.due_day
                    ? `每月 ${card.due_day} 日`
                    : "未設定"}
                </div>

                <div>
  繳款截止：
  {getDueDateText(card.due_day)}
</div>

                <div>
                  本期區間：
                  {card.periodStart &&
                  card.periodEnd
                    ? `${formatDate(
                        card.periodStart
                      )} ～ ${formatDate(
                        card.periodEnd
                      )}`
                    : "未設定"}
                </div>

                <div
                  style={{
                    marginTop: 6,
                  }}
                >
                  狀態：
                  {card.isPaid
                    ? "✅ 已繳"
                    : "⏳ 未繳"}
                </div>

                <div>
                  {getDueStatus(
                    card.due_day,
                    card.isPaid
                  )}
                </div>

                {card.isPaid && (
                  <div
                    style={{
                      marginTop: 8,
                    }}
                  >
                    <div>
                      實際繳款日：
                      {card.paidDate ||
                        "未記錄"}
                    </div>

                    {card.statementStatusId !==
                      null && (
                      <button
                        onClick={() => {
                          setEditingPaidStatementId(
                            card.statementStatusId
                          );

                          setEditingPaidDate(
                            card.paidDate ||
                              ""
                          );
                        }}
                        style={{
                          padding:
                            "6px 10px",
                          marginTop: 6,
                          marginBottom: 8,
                        }}
                      >
                        修改繳款日
                      </button>
                    )}
                  </div>
                )}

                <button
                  onClick={() =>
                    togglePaidStatus(
                      card
                    )
                  }
                  disabled={
                    !card.periodStart ||
                    !card.periodEnd
                  }
                  style={{
                    padding:
                      "6px 10px",
                    marginTop: 8,
                    marginBottom: 8,
                  }}
                >
                  {card.isPaid
                    ? "標記未繳"
                    : "標記已繳"}
                </button>

                {card.statementStatusId !==
                  null &&
                  editingPaidStatementId ===
                    card.statementStatusId && (
                    <div
                      style={{
                        marginTop: 8,
                      }}
                    >
                      <input
                        type="date"
                        value={
                          editingPaidDate
                        }
                        onChange={(e) =>
                          setEditingPaidDate(
                            e.target
                              .value
                          )
                        }
                      />

                      <button
                        onClick={() =>
                          savePaidDate(
                            card.statementStatusId!
                          )
                        }
                        style={{
                          marginLeft: 8,
                          padding:
                            "6px 10px",
                        }}
                      >
                        儲存
                      </button>

                      <button
                        onClick={() => {
                          setEditingPaidStatementId(
                            null
                          );

                          setEditingPaidDate(
                            ""
                          );
                        }}
                        style={{
                          marginLeft: 6,
                          padding:
                            "6px 10px",
                        }}
                      >
                        取消
                      </button>
                    </div>
                  )}

                {selectedStatementCard ===
                  card.name && (
                  <div
                    style={{
                      marginTop: 14,
                      paddingTop: 10,
                      borderTop:
                        "1px solid #ddd",
                    }}
                  >
                    <strong>
                      本期消費明細
                    </strong>

                    {selectedStatementExpenses.length ===
                    0 ? (
                      <p>
                        本期沒有消費
                      </p>
                    ) : (
                      selectedStatementExpenses.map(
                        (
                          expense
                        ) => (
                          <div
                            key={
                              expense.id
                            }
                            style={{
                              padding:
                                "8px 0",
                              borderBottom:
                                "1px solid #eee",
                            }}
                          >
                            <Link
                              href={`/expenses/${expense.id}`}
                            >
                              {
                                expense.date
                              }{" "}
                              {
                                expense.item
                              }
                            </Link>

                            <div>
                              {expense.currency ||
                                "USD"}{" "}
                              {Number(
                                expense.amount
                              ).toFixed(
                                2
                              )}
                            </div>
                          </div>
                        )
                      )
                    )}
                  </div>
                )}
              </div>
            )
          )
        )}
      </section>

      <section>
        <h2>
          本月支出明細
        </h2>

        {expenses.length === 0 ? (
          <p>沒有資料</p>
        ) : (
          expenses.map(
            (expense) => (
              <div
                key={expense.id}
                style={{
                  padding:
                    "10px 0",
                  borderBottom:
                    "1px solid #ddd",
                }}
              >
                <Link
                  href={`/expenses/${expense.id}`}
                >
                  <strong>
                    {expense.date}{" "}
                    {expense.item}
                  </strong>
                </Link>

                <div>
                  {expense.major_category ||
                    "未分類"}

                  {expense.category
                    ? ` / ${expense.category}`
                    : ""}
                </div>

                <div>
                  {expense.currency ||
                    "USD"}{" "}
                  {Number(
                    expense.amount
                  ).toFixed(2)}
                </div>

                {expense.card_name && (
                  <div>
                    💳{" "}
                    {
                      expense.card_name
                    }
                  </div>
                )}
              </div>
            )
          )
        )}
      </section>
    </main>
  );
}
