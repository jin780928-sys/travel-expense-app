"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Expense = {
  id: number;
  date: string | null;
  item: string;
  amount: number | null;
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
  id: number;
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
  statementStatusId: number | null;
  isPaid: boolean;
  paidDate: string | null;
};

export default function DashboardPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [statementExpenses, setStatementExpenses] = useState<Expense[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [cardStatements, setCardStatements] = useState<
    CreditCardStatement[]
  >([]);

  const [message, setMessage] = useState("讀取中...");

  const [selectedCard, setSelectedCard] = useState("");
  const [selectedStatementCard, setSelectedStatementCard] = useState("");

  const [editingPaidStatementId, setEditingPaidStatementId] = useState<
    number | null
  >(null);

  const [editingPaidDate, setEditingPaidDate] = useState("");

  const now = new Date();

  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(
    now.getMonth() + 1
  );

  useEffect(() => {
    loadDashboardData();
  }, [selectedYear, selectedMonth]);

  async function loadDashboardData() {
    setMessage("讀取中...");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("請先登入");
      return;
    }

    const month = String(selectedMonth).padStart(2, "0");
    const startDate = `${selectedYear}-${month}-01`;

    const nextMonthDate = new Date(
      selectedYear,
      selectedMonth,
      1
    );

    const nextYear = nextMonthDate.getFullYear();

    const nextMonthText = String(
      nextMonthDate.getMonth() + 1
    ).padStart(2, "0");

    const endDate = `${nextYear}-${nextMonthText}-01`;

    const previousMonthDate = new Date(
      selectedYear,
      selectedMonth - 2,
      1
    );

    const previousYear = previousMonthDate.getFullYear();

    const previousMonthText = String(
      previousMonthDate.getMonth() + 1
    ).padStart(2, "0");

    const statementStartDate =
      `${previousYear}-${previousMonthText}-01`;

    const { data: expenseData, error: expenseError } =
      await supabase
        .from("Expenses")
        .select(`
          id,
          date,
          item,
          amount,
          major_category,
          category,
          currency,
          card_name
        `)
        .eq("user_id", user.id)
        .eq("expense_scope", "daily")
        .gte("date", startDate)
        .lt("date", endDate)
        .order("date", { ascending: false });

    if (expenseError) {
      setMessage(expenseError.message);
      return;
    }

    setExpenses(expenseData || []);

    const {
      data: statementExpenseData,
      error: statementExpenseError,
    } = await supabase
      .from("Expenses")
      .select(`
        id,
        date,
        item,
        amount,
        major_category,
        category,
        currency,
        card_name
      `)
      .eq("user_id", user.id)
      .eq("expense_scope", "daily")
      .gte("date", statementStartDate)
      .lt("date", endDate)
      .order("date", { ascending: false });

    if (statementExpenseError) {
      setMessage(statementExpenseError.message);
      return;
    }

    setStatementExpenses(statementExpenseData || []);

    const { data: cardData, error: cardError } =
      await supabase
        .from("CreditCards")
        .select(`
          id,
          name,
          statement_day,
          due_day
        `)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("name");

    if (cardError) {
      setMessage(cardError.message);
      return;
    }

    setCreditCards(cardData || []);

    const {
      data: statementStatusData,
      error: statementStatusError,
    } = await supabase
      .from("CreditCardStatements")
      .select(`
        id,
        card_id,
        period_start,
        period_end,
        is_paid,
        paid_date
      `)
      .eq("user_id", user.id);

    if (statementStatusError) {
      setMessage(statementStatusError.message);
      return;
    }

    setCardStatements(statementStatusData || []);
    setMessage("");
  }

  const totalsByCurrency = useMemo(() => {
    return expenses.reduce(
      (result, expense) => {
        const currency = expense.currency || "未指定";
        const amount = Number(expense.amount || 0);

        result[currency] =
          (result[currency] || 0) + amount;

        return result;
      },
      {} as Record<string, number>
    );
  }, [expenses]);

  const totalsByCategory = useMemo(() => {
    return expenses.reduce(
      (result, expense) => {
        const major = expense.major_category || "未分類";
        const sub = expense.category || "未分類";
        const currency = expense.currency || "未指定";
        const amount = Number(expense.amount || 0);

        if (!result[major]) {
          result[major] = {};
        }

        if (!result[major][sub]) {
          result[major][sub] = {};
        }

        result[major][sub][currency] =
          (result[major][sub][currency] || 0) + amount;

        return result;
      },
      {} as Record<
        string,
        Record<string, Record<string, number>>
      >
    );
  }, [expenses]);

  const totalsByCard = useMemo(() => {
    return expenses.reduce(
      (result, expense) => {
        if (!expense.card_name) {
          return result;
        }

        const currency = expense.currency || "未指定";
        const amount = Number(expense.amount || 0);

        if (!result[expense.card_name]) {
          result[expense.card_name] = {};
        }

        result[expense.card_name][currency] =
          (result[expense.card_name][currency] || 0) +
          amount;

        return result;
      },
      {} as Record<string, Record<string, number>>
    );
  }, [expenses]);

  const filteredCardExpenses = useMemo(() => {
    if (!selectedCard) {
      return [];
    }

    return expenses.filter(
      (expense) =>
        expense.card_name === selectedCard
    );
  }, [expenses, selectedCard]);

  function formatDate(date: Date) {
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

  function getDueStatus(
  dueDay: number | null,
  isPaid: boolean
) {
  if (isPaid) {
    return "已完成繳款";
  }

  if (!dueDay) {
    return "未設定繳款日";
  }

  const today = new Date();

  const dueDate = createSafeDate(
    selectedYear,
    selectedMonth - 1,
    dueDay
  );

  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const dueOnly = new Date(
    dueDate.getFullYear(),
    dueDate.getMonth(),
    dueDate.getDate()
  );

  const diffMs =
    dueOnly.getTime() - todayOnly.getTime();

  const diffDays =
    Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    return `距離繳款日還有 ${diffDays} 天`;
  }

  if (diffDays === 0) {
    return "今天到期";
  }

  return `已逾期 ${Math.abs(diffDays)} 天`;
}
  
  const currentCardStatements = useMemo<
    CurrentCardStatement[]
  >(() => {
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

      const periodEnd = createSafeDate(
        selectedYear,
        selectedMonth - 1,
        card.statement_day
      );

      const previousStatementDate =
        createSafeDate(
          selectedYear,
          selectedMonth - 2,
          card.statement_day
        );

      const periodStart = new Date(
        previousStatementDate
      );

      periodStart.setDate(
        periodStart.getDate() + 1
      );

      const startText =
        formatDate(periodStart);

      const endText =
        formatDate(periodEnd);

      const totals =
        statementExpenses.reduce(
          (result, expense) => {
            if (
              expense.card_name !== card.name
            ) {
              return result;
            }

            if (!expense.date) {
              return result;
            }

            if (
              expense.date < startText ||
              expense.date > endText
            ) {
              return result;
            }

            const currency =
              expense.currency || "未指定";

            const amount =
              Number(expense.amount || 0);

            result[currency] =
              (result[currency] || 0) +
              amount;

            return result;
          },
          {} as Record<string, number>
        );

      const statementStatus =
        cardStatements.find(
          (statement) =>
            statement.card_id === card.id &&
            statement.period_start === startText &&
            statement.period_end === endText
        );

      return {
        ...card,
        periodStart: startText,
        periodEnd: endText,
        totals,
        statementStatusId:
          statementStatus?.id || null,
        isPaid:
          statementStatus?.is_paid || false,
        paidDate:
          statementStatus?.paid_date || null,
      };
    });
  }, [
    creditCards,
    cardStatements,
    statementExpenses,
    selectedYear,
    selectedMonth,
  ]);

  const unpaidStatements = useMemo(() => {
  return currentCardStatements.filter(
    (card) => !card.isPaid
  );
}, [currentCardStatements]);

  const selectedStatementExpenses = useMemo(() => {
    if (!selectedStatementCard) {
      return [];
    }

    const card =
      currentCardStatements.find(
        (item) =>
          item.name === selectedStatementCard
      );

    if (
      !card ||
      !card.periodStart ||
      !card.periodEnd
    ) {
      return [];
    }

    return statementExpenses.filter(
      (expense) => {
        if (
          expense.card_name !== card.name
        ) {
          return false;
        }

        if (!expense.date) {
          return false;
        }

        return (
          expense.date >= card.periodStart &&
          expense.date <= card.periodEnd
        );
      }
    );
  }, [
    selectedStatementCard,
    currentCardStatements,
    statementExpenses,
  ]);

  async function togglePaidStatus(
    card: CurrentCardStatement
  ) {
    
    
    if (
      !card.periodStart ||
      !card.periodEnd
    ) {
      setMessage(
        "這張信用卡尚未設定結帳日"
      );
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("請先登入");
      return;
    }

    if (card.statementStatusId) {
      const { error } = await supabase
        .from("CreditCardStatements")
        .update({
          is_paid: !card.isPaid,
          paid_date: card.isPaid
            ? null
            : new Date()
                .toISOString()
                .slice(0, 10),
        })
        .eq("id", card.statementStatusId)
        .eq("user_id", user.id);

      if (error) {
        setMessage(error.message);
        alert(`新增帳單狀態失敗：${error.message}`);
        return;
      }
    } else {
      const { error } = await supabase
        .from("CreditCardStatements")
        .insert({
          card_id: card.id,
          period_start: card.periodStart,
          period_end: card.periodEnd,
          is_paid: true,
          paid_date: new Date()
            .toISOString()
            .slice(0, 10),
          user_id: user.id,
        });

      if (error) {
  setMessage(error.message);
  alert(`新增帳單狀態失敗：${error.message}`);
  return;
}
    }

    await loadDashboardData();
  }

  async function savePaidDate() {
    if (!editingPaidStatementId) {
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("請先登入");
      return;
    }

    const { error } = await supabase
      .from("CreditCardStatements")
      .update({
        paid_date:
          editingPaidDate || null,
      })
      .eq("id", editingPaidStatementId)
      .eq("user_id", user.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setEditingPaidStatementId(null);
    setEditingPaidDate("");

    await loadDashboardData();
  }

  return (
    <main
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: 24,
      }}
    >
      <h1>日常花費統計</h1>

      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <select
          value={selectedYear}
          onChange={(e) =>
            setSelectedYear(
              Number(e.target.value)
            )
          }
          style={{ padding: 10 }}
        >
          {[
            2025,
            2026,
            2027,
            2028,
            2029,
            2030,
          ].map((year) => (
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
              Number(e.target.value)
            )
          }
          style={{ padding: 10 }}
        >
          {Array.from(
            { length: 12 },
            (_, index) => index + 1
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
        {selectedYear} 年{" "}
        {selectedMonth} 月日常花費
      </p>

      {unpaidStatements.length > 0 && (
  <div
    style={{
      border: "1px solid #ddd",
      padding: 14,
      marginBottom: 20,
      borderRadius: 8,
    }}
  >
    <h2>未繳帳單提醒</h2>

    {unpaidStatements.map((card) => (
      <div
        key={card.id}
        style={{
          marginBottom: 10,
        }}
      >
       <button
  onClick={() => {
    setSelectedStatementCard(card.name);

    setTimeout(() => {
      document
        .getElementById("card-statements")
        ?.scrollIntoView({
          behavior: "smooth",
        });
    }, 0);
  }}
  style={{
    border: "none",
    background: "none",
    padding: 0,
    fontWeight: "bold",
    cursor: "pointer",
    textDecoration: "underline",
  }}
>
  {card.name}
</button>

        <div>
          {getDueStatus(card.due_day, card.isPaid)}
        </div>
      </div>
    ))}
  </div>
)}

      {message && <p>{message}</p>}

      <h2>本月總花費</h2>

      {Object.keys(
        totalsByCurrency
      ).length === 0 ? (
        <p>本月目前沒有日常花費。</p>
      ) : (
        Object.entries(
          totalsByCurrency
        ).map(
          ([currency, total]) => (
            <p key={currency}>
              {currency}{" "}
              {total.toFixed(2)}
            </p>
          )
        )
      )}

      <hr style={{ margin: "30px 0" }} />

      <h2>依分類統計</h2>

      {Object.keys(
        totalsByCategory
      ).length === 0 ? (
        <p>目前沒有分類資料。</p>
      ) : (
        Object.entries(
          totalsByCategory
        ).map(
          ([
            majorCategory,
            subCategories,
          ]) => (
            <div
              key={majorCategory}
              style={{
                border:
                  "1px solid #ccc",
                borderRadius: 8,
                padding: 14,
                marginBottom: 16,
              }}
            >
              <h3>
                {majorCategory}
              </h3>

              {Object.entries(
                subCategories
              ).map(
                ([
                  category,
                  currencies,
                ]) => (
                  <div
                    key={category}
                    style={{
                      marginLeft: 16,
                      marginBottom: 12,
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
                        <p
                          key={
                            currency
                          }
                          style={{
                            marginLeft: 16,
                          }}
                        >
                          {currency}{" "}
                          {total.toFixed(
                            2
                          )}
                        </p>
                      )
                    )}
                  </div>
                )
              )}
            </div>
          )
        )
      )}

      <hr style={{ margin: "30px 0" }} />

      <h2>信用卡支出統計</h2>

      {Object.keys(
        totalsByCard
      ).length === 0 ? (
        <p>本月沒有信用卡支出。</p>
      ) : (
        Object.entries(
          totalsByCard
        ).map(
          ([cardName, totals]) => (
            <div
              key={cardName}
              style={{
                border:
                  "1px solid #ddd",
                padding: 12,
                marginBottom: 12,
                borderRadius: 8,
              }}
            >
              <button
                onClick={() =>
                  setSelectedCard(
                    cardName
                  )
                }
                style={{
                  border: "none",
                  background: "none",
                  padding: 0,
                  fontWeight: "bold",
                  cursor: "pointer",
                  textDecoration:
                    "underline",
                }}
              >
                {cardName}
              </button>

              {Object.entries(
                totals
              ).map(
                ([
                  currency,
                  total,
                ]) => (
                  <div
                    key={currency}
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

      {selectedCard && (
        <div
          style={{
            border: "1px solid #ddd",
            padding: 12,
            marginBottom: 20,
            borderRadius: 8,
          }}
        >
          <h3>
            {selectedCard} 消費明細
          </h3>

          <button
            onClick={() =>
              setSelectedCard("")
            }
            style={{
              padding:
                "6px 10px",
              marginBottom: 12,
            }}
          >
            關閉明細
          </button>

          {filteredCardExpenses.length ===
          0 ? (
            <p>沒有消費紀錄</p>
          ) : (
            filteredCardExpenses.map(
              (expense) => (
                <div
                  key={expense.id}
                  style={{
                    padding:
                      "8px 0",
                    borderBottom:
                      "1px solid #eee",
                  }}
                >
                  <strong>
                    <Link
                      href={`/expenses/${expense.id}`}
                    >
                      {
                        expense.item
                      }
                    </Link>
                  </strong>

                  <div>
                    {expense.date ||
                      "-"}
                  </div>

                  <div>
                    {expense.major_category ||
                      "-"}
                    {expense.category
                      ? ` → ${expense.category}`
                      : ""}
                  </div>

                  <div>
                    {expense.currency ||
                      ""}{" "}
                    {Number(
                      expense.amount ||
                        0
                    ).toFixed(2)}
                  </div>
                </div>
              )
            )
          )}
        </div>
      )}

      <hr style={{ margin: "30px 0" }} />

      <h2 id="card-statements">信用卡本期帳單</h2>

      {creditCards.length === 0 ? (
        <p>
          目前沒有啟用中的信用卡。
        </p>
      ) : (
        currentCardStatements.map(
          (card) => (
            <div
              key={card.id}
              style={{
                border:
                  "1px solid #ddd",
                padding: 12,
                marginBottom: 12,
                borderRadius: 8,
              }}
            >
              <button
                onClick={() =>
                  setSelectedStatementCard(
                    card.name
                  )
                }
                style={{
                  border: "none",
                  background: "none",
                  padding: 0,
                  fontWeight: "bold",
                  cursor: "pointer",
                  textDecoration:
                    "underline",
                }}
              >
                {card.name}
              </button>

              <div>
                結帳日：
                {card.statement_day
                  ? `${card.statement_day} 日`
                  : "未設定"}
              </div>

              <div>
                繳款日：
                {card.due_day
                  ? `${card.due_day} 日`
                  : "未設定"}
              </div>

              {card.periodStart &&
                card.periodEnd && (
                  <div>
                    本期區間：
                    {
                      card.periodStart
                    }
                    {" ～ "}
                    {card.periodEnd}
                  </div>
                )}

              <div>
                繳款狀態：
                {card.isPaid
                  ? "已繳"
                  : "未繳"}
              </div>

              <div>
  {getDueStatus(card.due_day, card.isPaid)}
</div>

              {card.isPaid && (
                <div
                  style={{
                    marginTop: 6,
                  }}
                >
                  <div>
                    實際繳款日：
                    {card.paidDate ||
                      "未記錄"}
                  </div>

                  {card.statementStatusId && (
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

              {Object.keys(
                card.totals
              ).length === 0 ? (
                <div>
                  本期沒有消費
                </div>
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
                      {currency}:{" "}
                      {total.toFixed(
                        2
                      )}
                    </div>
                  )
                )
              )}

              {card.statementStatusId !== null &&
  editingPaidStatementId === card.statementStatusId && (
                <div
                  style={{
                    marginTop: 10,
                  }}
                >
                  <input
                    type="date"
                    value={
                      editingPaidDate
                    }
                    onChange={(e) =>
                      setEditingPaidDate(
                        e.target.value
                      )
                    }
                    style={{
                      padding: 8,
                      marginRight: 8,
                    }}
                  />

                  <button
                    onClick={
                      savePaidDate
                    }
                    style={{
                      padding:
                        "6px 10px",
                      marginRight: 8,
                    }}
                  >
                    儲存日期
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
                      padding:
                        "6px 10px",
                    }}
                  >
                    取消
                  </button>
                </div>
              )}
            </div>
          )
        )
      )}

      {selectedStatementCard && (
        <div
          style={{
            border: "1px solid #ddd",
            padding: 12,
            marginBottom: 20,
            borderRadius: 8,
          }}
        >
          <h3>
            {selectedStatementCard}{" "}
            本期帳單明細
          </h3>

          <button
            onClick={() =>
              setSelectedStatementCard(
                ""
              )
            }
            style={{
              padding:
                "6px 10px",
              marginBottom: 12,
            }}
          >
            關閉明細
          </button>

          {selectedStatementExpenses.length ===
          0 ? (
            <p>
              本期沒有消費紀錄
            </p>
          ) : (
            selectedStatementExpenses.map(
              (expense) => (
                <div
                  key={expense.id}
                  style={{
                    padding:
                      "8px 0",
                    borderBottom:
                      "1px solid #eee",
                  }}
                >
                  <strong>
                    <Link
                      href={`/expenses/${expense.id}`}
                    >
                      {
                        expense.item
                      }
                    </Link>
                  </strong>

                  <div>
                    {expense.date ||
                      "-"}
                  </div>

                  <div>
                    {expense.major_category ||
                      "-"}
                    {expense.category
                      ? ` → ${expense.category}`
                      : ""}
                  </div>

                  <div>
                    {expense.currency ||
                      ""}{" "}
                    {Number(
                      expense.amount ||
                        0
                    ).toFixed(2)}
                  </div>
                </div>
              )
            )
          )}
        </div>
      )}

      <hr style={{ margin: "30px 0" }} />

      <h2>本月花費明細</h2>

      {expenses.length === 0 ? (
        <p>
          這個月份目前沒有花費紀錄。
        </p>
      ) : (
        expenses.map((expense) => (
          <div
            key={expense.id}
            style={{
              border:
                "1px solid #ccc",
              borderRadius: 8,
              padding: 14,
              marginBottom: 12,
            }}
          >
            <strong>
              <Link
                href={`/expenses/${expense.id}`}
              >
                {expense.item}
              </Link>
            </strong>

            <p>
              日期：
              {expense.date ||
                "未設定"}
            </p>

            <p>
              分類：
              {expense.major_category ||
                "未分類"}
              {expense.category
                ? ` → ${expense.category}`
                : ""}
            </p>

            <p>
              金額：
              {expense.currency ||
                "USD"}{" "}
              {Number(
                expense.amount || 0
              ).toFixed(2)}
            </p>
          </div>
        ))
      )}
    </main>
  );
}
