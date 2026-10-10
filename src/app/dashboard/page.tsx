  "use client";

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
  due_month_offset: number | null;
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

function formatNumber(value: number) {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateString: string | null) {
  if (!dateString) return "-";

  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getSafeDate(
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

  const [creditCards, setCreditCards] = useState<CreditCard[]>(
    []
  );

  const [cardStatements, setCardStatements] = useState<
    CreditCardStatement[]
  >([]);

  const [message, setMessage] = useState("");

  const [selectedCard, setSelectedCard] = useState<
    string | null
  >(null);

  const [showZeroBalanceCards, setShowZeroBalanceCards] =
    useState(false);

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

  const [showStatementHistory, setShowStatementHistory] =
    useState(false);

  const [expandedHistoryIds, setExpandedHistoryIds] =
    useState<Array<number | string>>([]);

  const [historyMonthFilter, setHistoryMonthFilter] =
    useState("all");

  const [historyCardFilter, setHistoryCardFilter] =
    useState("all");

  const [historyStatusFilter, setHistoryStatusFilter] =
    useState("all");

  const [historySort, setHistorySort] =
    useState("newest");

  const [historySearch, setHistorySearch] =
    useState("");

  const [
    historyVisibleCount,
    setHistoryVisibleCount,
  ] = useState(20);

  const [
    monthlyExpenseSearch,
    setMonthlyExpenseSearch,
  ] = useState("");

  const [
    monthlyExpenseCategoryFilter,
    setMonthlyExpenseCategoryFilter,
  ] = useState("all");

  const [
    monthlyExpenseCardFilter,
    setMonthlyExpenseCardFilter,
  ] = useState("all");

  const [
    monthlyExpenseStartDate,
    setMonthlyExpenseStartDate,
  ] = useState("");

  const [
    monthlyExpenseEndDate,
    setMonthlyExpenseEndDate,
  ] = useState("");

  const [monthlyExpenseSort, setMonthlyExpenseSort] =
    useState("date_desc");

  const [
    monthlyExpenseVisibleCount,
    setMonthlyExpenseVisibleCount,
  ] = useState(20);

  async function loadDashboardData() {
    setMessage("");

    const monthStart = `${selectedYear}-${String(
      selectedMonth
    ).padStart(2, "0")}-01`;

    const monthEndDate = new Date(
      selectedYear,
      selectedMonth,
      0
    );

    const monthEnd = toDateString(monthEndDate);

    const [
      monthlyExpenseResult,
      statementExpenseResult,
      creditCardResult,
      statementResult,
    ] = await Promise.all([
      supabase
        .from("Expenses")
        .select(
          "id,date,item,amount,major_category,category,currency,card_name"
        )
        .eq("expense_scope", "daily")
        .gte("date", monthStart)
        .lte("date", monthEnd)
        .order("date", {
          ascending: false,
        }),

      supabase
        .from("Expenses")
        .select(
          "id,date,item,amount,major_category,category,currency,card_name"
        )
        .eq("expense_scope", "daily")
        .order("date", {
          ascending: false,
        }),

      supabase
        .from("CreditCards")
        .select(
          "id,name,statement_day,due_day,due_month_offset"
        )
        .eq("is_active", true)
        .order("name", {
          ascending: true,
        }),

      supabase
        .from("CreditCardStatements")
        .select(
          "id,card_id,period_start,period_end,is_paid,paid_date"
        )
        .order("period_end", {
          ascending: false,
        }),
    ]);

    if (monthlyExpenseResult.error) {
      setMessage(monthlyExpenseResult.error.message);
      return;
    }

    if (statementExpenseResult.error) {
      setMessage(statementExpenseResult.error.message);
      return;
    }

    if (creditCardResult.error) {
      setMessage(creditCardResult.error.message);
      return;
    }

    if (statementResult.error) {
      setMessage(statementResult.error.message);
      return;
    }

    setExpenses(
      (monthlyExpenseResult.data || []) as Expense[]
    );

    setStatementExpenses(
      (statementExpenseResult.data || []) as Expense[]
    );

    setCreditCards(
      (creditCardResult.data || []) as CreditCard[]
    );

    setCardStatements(
      (statementResult.data ||
        []) as CreditCardStatement[]
    );
  }

  useEffect(() => {
    loadDashboardData();
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    setHistoryVisibleCount(20);
  }, [
    historyMonthFilter,
    historyCardFilter,
    historyStatusFilter,
    historySort,
    historySearch,
  ]);

  useEffect(() => {
    setMonthlyExpenseVisibleCount(20);
  }, [
    monthlyExpenseSearch,
    monthlyExpenseCategoryFilter,
    monthlyExpenseCardFilter,
    monthlyExpenseStartDate,
    monthlyExpenseEndDate,
    monthlyExpenseSort,
    selectedMonth,
  ]);

  const totalsByCurrency = useMemo(() => {
    const totals: Record<string, number> = {};

    expenses.forEach((expense) => {
      const currency = expense.currency || "USD";

      totals[currency] =
        (totals[currency] || 0) +
        Number(expense.amount || 0);
    });

    return totals;
  }, [expenses]);

  const categoryTotals = useMemo(() => {
    const result: Record<
      string,
      Record<string, number>
    > = {};

    expenses.forEach((expense) => {
      const category =
        expense.major_category ||
        expense.category ||
        "其他";

      const currency = expense.currency || "USD";

      if (!result[category]) {
        result[category] = {};
      }

      result[category][currency] =
        (result[category][currency] || 0) +
        Number(expense.amount || 0);
    });

    return result;
  }, [expenses]);

  const cardTotals = useMemo(() => {
    const result: Record<
      string,
      Record<string, number>
    > = {};

    expenses.forEach((expense) => {
      if (!expense.card_name) return;

      const currency = expense.currency || "USD";

      if (!result[expense.card_name]) {
        result[expense.card_name] = {};
      }

      result[expense.card_name][currency] =
        (result[expense.card_name][currency] || 0) +
        Number(expense.amount || 0);
    });

    return result;
  }, [expenses]);

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

        const statementEndDate = getSafeDate(
          selectedYear,
          selectedMonth - 1,
          card.statement_day
        );

        const previousStatementEndDate = getSafeDate(
          statementEndDate.getFullYear(),
          statementEndDate.getMonth() - 1,
          card.statement_day
        );

        const statementStartDate = new Date(
          previousStatementEndDate
        );

        statementStartDate.setDate(
          statementStartDate.getDate() + 1
        );

        const periodStart =
          toDateString(statementStartDate);

        const periodEnd =
          toDateString(statementEndDate);

        const totals: Record<string, number> = {};

        statementExpenses.forEach((expense) => {
          if (
            expense.card_name !== card.name ||
            expense.date < periodStart ||
            expense.date > periodEnd
          ) {
            return;
          }

          const currency =
            expense.currency || "USD";

          totals[currency] =
            (totals[currency] || 0) +
            Number(expense.amount || 0);
        });

        const statementStatus =
          cardStatements.find(
            (statement) =>
              Number(statement.card_id) ===
                Number(card.id) &&
              statement.period_start === periodStart &&
              statement.period_end === periodEnd
          );

        return {
          ...card,
          periodStart,
          periodEnd,
          totals,
          statementStatusId:
            statementStatus?.id ?? null,
          isPaid:
            statementStatus?.is_paid ?? false,
          paidDate:
            statementStatus?.paid_date ?? null,
        };
      });
    }, [
      creditCards,
      cardStatements,
      statementExpenses,
      selectedYear,
      selectedMonth,
    ]);

  function getCurrentDueDate(
    card: CurrentCardStatement
  ) {
    if (
      !card.periodEnd ||
      !card.due_day
    ) {
      return null;
    }

    const statementDate = new Date(
      `${card.periodEnd}T00:00:00`
    );

    const offset =
      card.due_month_offset ?? 1;

    return getSafeDate(
      statementDate.getFullYear(),
      statementDate.getMonth() + offset,
      card.due_day
    );
  }

  function getDueDateText(
    card: CurrentCardStatement
  ) {
    const dueDate = getCurrentDueDate(card);

    if (!dueDate) return "-";

    return dueDate.toLocaleDateString("zh-TW");
  }

  function getDueMonthText(
    card: CurrentCardStatement
  ) {
    const dueDate = getCurrentDueDate(card);

    if (!dueDate) return "-";

    return `${dueDate.getFullYear()} 年 ${
      dueDate.getMonth() + 1
    } 月`;
  }

  function getDueStatus(
    card: CurrentCardStatement
  ) {
    if (card.isPaid) {
      return "已繳";
    }

    const dueDate = getCurrentDueDate(card);

    if (!dueDate) {
      return "未繳";
    }

    const current = new Date();
    current.setHours(0, 0, 0, 0);

    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil(
      (due.getTime() - current.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (diffDays < 0) {
      return `逾期 ${Math.abs(diffDays)} 天`;
    }

    if (diffDays === 0) {
      return "今天到期";
    }

    if (diffDays <= 7) {
      return `${diffDays} 天後到期`;
    }

    return "未繳";
  }

  function getStatementBadge(
    card: CurrentCardStatement
  ) {
    return card.isPaid ? "✅ 已繳" : "🔴 未繳";
  }

  function hasStatementAmount(
    card: CurrentCardStatement
  ) {
    return Object.values(card.totals).some(
      (amount) => Number(amount) > 0
    );
  }

  const sortedCardStatements = useMemo(() => {
    return [...currentCardStatements].sort(
      (a, b) => {
        if (a.isPaid !== b.isPaid) {
          return a.isPaid ? 1 : -1;
        }

        const aDue = getCurrentDueDate(a);
        const bDue = getCurrentDueDate(b);

        if (!aDue && !bDue) return 0;
        if (!aDue) return 1;
        if (!bDue) return -1;

        return (
          aDue.getTime() -
          bDue.getTime()
        );
      }
    );
  }, [currentCardStatements]);

  const visibleCardStatements = useMemo(() => {
    if (showZeroBalanceCards) {
      return sortedCardStatements;
    }

    return sortedCardStatements.filter(
      hasStatementAmount
    );
  }, [
    sortedCardStatements,
    showZeroBalanceCards,
  ]);

  const statementSummary = useMemo(() => {
    const cardsWithAmount =
      currentCardStatements.filter(
        hasStatementAmount
      );

    return {
      total: cardsWithAmount.length,
      paid: cardsWithAmount.filter(
        (card) => card.isPaid
      ).length,
      unpaid: cardsWithAmount.filter(
        (card) => !card.isPaid
      ).length,
    };
  }, [currentCardStatements]);

  const unpaidStatements = useMemo(() => {
    const current = new Date();
    current.setHours(0, 0, 0, 0);

    return currentCardStatements.filter(
      (card) => {
        if (
          card.isPaid ||
          !hasStatementAmount(card)
        ) {
          return false;
        }

        const dueDate =
          getCurrentDueDate(card);

        if (!dueDate) {
          return false;
        }

        const due = new Date(dueDate);
        due.setHours(0, 0, 0, 0);

        const diffDays = Math.ceil(
          (due.getTime() -
            current.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        return diffDays <= 7;
      }
    );
  }, [currentCardStatements]);

  const allUnpaidStatements = useMemo(() => {
    return currentCardStatements.filter(
      (card) =>
        !card.isPaid &&
        hasStatementAmount(card)
    );
  }, [currentCardStatements]);

  const allUnpaidTotalsByCurrency =
    useMemo(() => {
      const totals: Record<string, number> =
        {};

      allUnpaidStatements.forEach(
        (card) => {
          Object.entries(
            card.totals
          ).forEach(
            ([currency, amount]) => {
              totals[currency] =
                (totals[currency] || 0) +
                Number(amount);
            }
          );
        }
      );

      return totals;
    }, [allUnpaidStatements]);

  const nextDueStatement = useMemo(() => {
    const sorted = [
      ...allUnpaidStatements,
    ].sort((a, b) => {
      const aDue =
        getCurrentDueDate(a);

      const bDue =
        getCurrentDueDate(b);

      if (!aDue && !bDue) return 0;
      if (!aDue) return 1;
      if (!bDue) return -1;

      return (
        aDue.getTime() -
        bDue.getTime()
      );
    });

    return sorted[0] ?? null;
  }, [allUnpaidStatements]);

  const statementTotalsByCurrency =
    useMemo(() => {
      const totals: Record<string, number> =
        {};

      currentCardStatements.forEach(
        (card) => {
          Object.entries(
            card.totals
          ).forEach(
            ([currency, amount]) => {
              totals[currency] =
                (totals[currency] || 0) +
                Number(amount);
            }
          );
        }
      );

      return totals;
    }, [currentCardStatements]);

  const paidTotalsByCurrency = useMemo(() => {
    const totals: Record<string, number> =
      {};

    currentCardStatements
      .filter((card) => card.isPaid)
      .forEach((card) => {
        Object.entries(
          card.totals
        ).forEach(
          ([currency, amount]) => {
            totals[currency] =
              (totals[currency] || 0) +
              Number(amount);
          }
        );
      });

    return totals;
  }, [currentCardStatements]);

  async function togglePaidStatus(
    card: CurrentCardStatement
  ) {
    if (
      !card.periodStart ||
      !card.periodEnd
    ) {
      return;
    }

    const newPaidStatus = !card.isPaid;

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
          is_paid: newPaidStatus,
          paid_date: newPaidStatus
            ? toDateString(new Date())
            : null,
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
      const { error } = await supabase
        .from("CreditCardStatements")
        .insert({
          user_id: user.id,
          card_id: card.id,
          period_start:
            card.periodStart,
          period_end: card.periodEnd,
          is_paid: newPaidStatus,
          paid_date: newPaidStatus
            ? toDateString(new Date())
            : null,
        });

      if (error) {
        setMessage(error.message);
        return;
      }
    }

    await loadDashboardData();
  }

  async function savePaidDate(
    statementId: number | string
  ) {
    const { error } = await supabase
      .from("CreditCardStatements")
      .update({
        paid_date:
          editingPaidDate || null,
      })
      .eq("id", statementId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setEditingPaidStatementId(null);
    setEditingPaidDate("");

    await loadDashboardData();
  }

  const statementHistory = useMemo(() => {
    return [...cardStatements].sort(
      (a, b) =>
        b.period_end.localeCompare(
          a.period_end
        )
    );
  }, [cardStatements]);

  function getCardById(cardId: number) {
    return creditCards.find(
      (card) =>
        Number(card.id) ===
        Number(cardId)
    );
  }

  function getHistoricalStatementTotals(
    statement: CreditCardStatement
  ) {
    const card = getCardById(
      statement.card_id
    );

    if (!card) {
      return {} as Record<
        string,
        number
      >;
    }

    const totals: Record<
      string,
      number
    > = {};

    statementExpenses.forEach(
      (expense) => {
        if (
          expense.card_name !==
            card.name ||
          expense.date <
            statement.period_start ||
          expense.date >
            statement.period_end
        ) {
          return;
        }

        const currency =
          expense.currency || "USD";

        totals[currency] =
          (totals[currency] || 0) +
          Number(expense.amount || 0);
      }
    );

    return totals;
  }

  function getHistoricalExpenses(
    statement: CreditCardStatement
  ) {
    const card = getCardById(
      statement.card_id
    );

    if (!card) return [];

    return statementExpenses.filter(
      (expense) =>
        expense.card_name ===
          card.name &&
        expense.date >=
          statement.period_start &&
        expense.date <=
          statement.period_end
    );
  }

  const historyMonthOptions =
    useMemo(() => {
      const months = new Set<string>();

      statementHistory.forEach(
        (statement) => {
          months.add(
            statement.period_end.slice(
              0,
              7
            )
          );
        }
      );

      return Array.from(months).sort(
        (a, b) =>
          b.localeCompare(a)
      );
    }, [statementHistory]);

  const filteredHistoryBase =
    useMemo(() => {
      const search =
        historySearch
          .trim()
          .toLowerCase();

      return statementHistory.filter(
        (statement) => {
          const card = getCardById(
            statement.card_id
          );

          const cardName =
            card?.name ||
            "未知信用卡";

          const month =
            statement.period_end.slice(
              0,
              7
            );

          if (
            historyMonthFilter !==
              "all" &&
            month !==
              historyMonthFilter
          ) {
            return false;
          }

          if (
            historyCardFilter !==
              "all" &&
            String(
              statement.card_id
            ) !==
              historyCardFilter
          ) {
            return false;
          }

          if (
            historyStatusFilter ===
              "paid" &&
            !statement.is_paid
          ) {
            return false;
          }

          if (
            historyStatusFilter ===
              "unpaid" &&
            statement.is_paid
          ) {
            return false;
          }

          if (
            search &&
            !cardName
              .toLowerCase()
              .includes(search)
          ) {
            return false;
          }

          return true;
        }
      );
    }, [
      statementHistory,
      creditCards,
      historyMonthFilter,
      historyCardFilter,
      historyStatusFilter,
      historySearch,
    ]);

  const filteredStatementHistory =
    useMemo(() => {
      const list = [
        ...filteredHistoryBase,
      ];

      list.sort((a, b) => {
        if (
          historySort === "oldest"
        ) {
          return a.period_end.localeCompare(
            b.period_end
          );
        }

        if (
          historySort ===
          "amount_desc"
        ) {
          const aTotals =
            getHistoricalStatementTotals(
              a
            );

          const bTotals =
            getHistoricalStatementTotals(
              b
            );

          const aAmount =
            Object.values(
              aTotals
            ).reduce(
              (sum, value) =>
                sum +
                Number(value),
              0
            );

          const bAmount =
            Object.values(
              bTotals
            ).reduce(
              (sum, value) =>
                sum +
                Number(value),
              0
            );

          return (
            bAmount - aAmount
          );
        }

        if (
          historySort ===
          "amount_asc"
        ) {
          const aTotals =
            getHistoricalStatementTotals(
              a
            );

          const bTotals =
            getHistoricalStatementTotals(
              b
            );

          const aAmount =
            Object.values(
              aTotals
            ).reduce(
              (sum, value) =>
                sum +
                Number(value),
              0
            );

          const bAmount =
            Object.values(
              bTotals
            ).reduce(
              (sum, value) =>
                sum +
                Number(value),
              0
            );

          return (
            aAmount - bAmount
          );
        }

        return b.period_end.localeCompare(
          a.period_end
        );
      });

      return list;
    }, [
      filteredHistoryBase,
      historySort,
      statementExpenses,
      creditCards,
    ]);

  const visibleStatementHistory =
    useMemo(() => {
      return filteredStatementHistory.slice(
        0,
        historyVisibleCount
      );
    }, [
      filteredStatementHistory,
      historyVisibleCount,
    ]);

  const historySummary = useMemo(() => {
    return {
      total:
        filteredStatementHistory.length,

      paid:
        filteredStatementHistory.filter(
          (statement) =>
            statement.is_paid
        ).length,

      unpaid:
        filteredStatementHistory.filter(
          (statement) =>
            !statement.is_paid
        ).length,
    };
  }, [filteredStatementHistory]);

  const historyTotals = useMemo(() => {
    const totals: Record<string, number> =
      {};

    filteredStatementHistory.forEach(
      (statement) => {
        const statementTotals =
          getHistoricalStatementTotals(
            statement
          );

        Object.entries(
          statementTotals
        ).forEach(
          ([currency, amount]) => {
            totals[currency] =
              (totals[currency] ||
                0) +
              Number(amount);
          }
        );
      }
    );

    return totals;
  }, [
    filteredStatementHistory,
    statementExpenses,
    creditCards,
  ]);

  const historyCountByCard =
    useMemo(() => {
      const result: Record<
        string,
        number
      > = {};

      creditCards.forEach(
        (card) => {
          result[
            String(card.id)
          ] = statementHistory.filter(
            (statement) => {
              const month =
                statement.period_end.slice(
                  0,
                  7
                );

              const cardName =
                getCardById(
                  statement.card_id
                )?.name || "";

              const search =
                historySearch
                  .trim()
                  .toLowerCase();

              if (
                Number(
                  statement.card_id
                ) !==
                Number(card.id)
              ) {
                return false;
              }

              if (
                historyMonthFilter !==
                  "all" &&
                month !==
                  historyMonthFilter
              ) {
                return false;
              }

              if (
                historyStatusFilter ===
                  "paid" &&
                !statement.is_paid
              ) {
                return false;
              }

              if (
                historyStatusFilter ===
                  "unpaid" &&
                statement.is_paid
              ) {
                return false;
              }

              if (
                search &&
                !cardName
                  .toLowerCase()
                  .includes(search)
              ) {
                return false;
              }

              return true;
            }
          ).length;
        }
      );

      return result;
    }, [
      creditCards,
      statementHistory,
      historyMonthFilter,
      historyStatusFilter,
      historySearch,
    ]);

  useEffect(() => {
    if (
      historyCardFilter !== "all" &&
      historyCountByCard[
        historyCardFilter
      ] === 0
    ) {
      setHistoryCardFilter("all");
    }
  }, [
    historyCardFilter,
    historyCountByCard,
  ]);

  const filteredMonthlyExpenses =
    useMemo(() => {
      const search =
        monthlyExpenseSearch
          .trim()
          .toLowerCase();

      const list =
        expenses.filter(
          (expense) => {
            if (search) {
              const text = [
                expense.item,
                expense.major_category,
                expense.category,
                expense.card_name,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

              if (
                !text.includes(search)
              ) {
                return false;
              }
            }

            if (
              monthlyExpenseCategoryFilter !==
                "all" &&
              expense.major_category !==
                monthlyExpenseCategoryFilter
            ) {
              return false;
            }

            if (
              monthlyExpenseCardFilter ===
              "non-card"
            ) {
              if (
                expense.card_name
              ) {
                return false;
              }
            } else if (
              monthlyExpenseCardFilter !==
                "all" &&
              expense.card_name !==
                monthlyExpenseCardFilter
            ) {
              return false;
            }

            if (
              monthlyExpenseStartDate &&
              expense.date <
                monthlyExpenseStartDate
            ) {
              return false;
            }

            if (
              monthlyExpenseEndDate &&
              expense.date >
                monthlyExpenseEndDate
            ) {
              return false;
            }

            return true;
          }
        );

      list.sort((a, b) => {
        if (
          monthlyExpenseSort ===
          "date_asc"
        ) {
          return a.date.localeCompare(
            b.date
          );
        }

        if (
          monthlyExpenseSort ===
          "amount_desc"
        ) {
          return (
            Number(b.amount) -
            Number(a.amount)
          );
        }

        if (
          monthlyExpenseSort ===
          "amount_asc"
        ) {
          return (
            Number(a.amount) -
            Number(b.amount)
          );
        }

        return b.date.localeCompare(
          a.date
        );
      });

      return list;
    }, [
      expenses,
      monthlyExpenseSearch,
      monthlyExpenseCategoryFilter,
      monthlyExpenseCardFilter,
      monthlyExpenseStartDate,
      monthlyExpenseEndDate,
      monthlyExpenseSort,
    ]);

  const filteredMonthlyTotals =
    useMemo(() => {
      const totals: Record<
        string,
        number
      > = {};

      filteredMonthlyExpenses.forEach(
        (expense) => {
          const currency =
            expense.currency || "USD";

          totals[currency] =
            (totals[currency] || 0) +
            Number(expense.amount || 0);
        }
      );

      return totals;
    }, [filteredMonthlyExpenses]);

  const visibleMonthlyExpenses =
    useMemo(() => {
      return filteredMonthlyExpenses.slice(
        0,
        monthlyExpenseVisibleCount
      );
    }, [
      filteredMonthlyExpenses,
      monthlyExpenseVisibleCount,
    ]);

  function exportMonthlyExpensesCsv() {
    const rows = [
      [
        "日期",
        "項目",
        "大分類",
        "小分類",
        "付款信用卡",
        "幣別",
        "金額",
      ],
      ...filteredMonthlyExpenses.map(
        (expense) => [
          expense.date,
          expense.item,
          expense.major_category || "",
          expense.category || "",
          expense.card_name || "",
          expense.currency || "USD",
          Number(
            expense.amount
          ).toFixed(2),
        ]
      ),
      [],
      ["篩選後總額"],
      ...Object.entries(
        filteredMonthlyTotals
      ).map(
        ([currency, amount]) => [
          currency,
          Number(amount).toFixed(2),
        ]
      ),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((cell) => {
            const text =
              String(cell ?? "");

            return `"${text.replace(
              /"/g,
              '""'
            )}"`;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob(
      ["\uFEFF" + csv],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download = `monthly-expenses-${selectedYear}-${String(
      selectedMonth
    ).padStart(2, "0")}.csv`;

    link.click();

    URL.revokeObjectURL(url);
  }

  function exportHistoryCsv() {
    const rows = [
      [
        "信用卡",
        "帳單期間",
        "帳單月份",
        "狀態",
        "實際繳款日",
        "幣別",
        "金額",
      ],
    ];

    filteredStatementHistory.forEach(
      (statement) => {
        const card = getCardById(
          statement.card_id
        );

        const totals =
          getHistoricalStatementTotals(
            statement
          );

        const month =
          statement.period_end.slice(
            0,
            7
          );

        const entries =
          Object.entries(totals);

        if (entries.length === 0) {
          rows.push([
            card?.name ||
              "未知信用卡",
            `${statement.period_start} ~ ${statement.period_end}`,
            month,
            statement.is_paid
              ? "已繳"
              : "未繳",
            statement.paid_date ||
              "",
            "",
            "0.00",
          ]);

          return;
        }

        entries.forEach(
          ([currency, amount]) => {
            rows.push([
              card?.name ||
                "未知信用卡",
              `${statement.period_start} ~ ${statement.period_end}`,
              month,
              statement.is_paid
                ? "已繳"
                : "未繳",
              statement.paid_date ||
                "",
              currency,
              Number(
                amount
              ).toFixed(2),
            ]);
          }
        );
      }
    );

    const csv = rows
      .map((row) =>
        row
          .map((cell) => {
            const text =
              String(cell ?? "");

            return `"${text.replace(
              /"/g,
              '""'
            )}"`;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob(
      ["\uFEFF" + csv],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      "credit-card-statement-history.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  function scrollToSection(
    id: string
  ) {
    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: "smooth",
      });
  }

  const sectionStyle = {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
  };

  const summaryCardStyle = {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 16,
    minWidth: 160,
    minHeight: 92,
    flex: "1 1 180px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  } as const;

  return (
    <main
      id="dashboard-top"
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: 20,
        background: "#f7f7f8",
        minHeight: "100vh",
      }}
    >
      <h1
  style={{
    marginBottom: 14,
    fontSize: 32,
    fontWeight: 700,
    color: "#111827",
    letterSpacing: "-0.02em",
  }}
>
  Dashboard
</h1>
      {message && (
        <div
          style={{
            marginBottom: 14,
            padding: 10,
            background: "#fee2e2",
            borderRadius: 8,
          }}
        >
          {message}
        </div>
      )}

      <div
        style={{
          ...sectionStyle,
          padding: 14,
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
          justifyContent: "flex-start",
        }}
      >
        <span
  style={{
    fontSize: 14,
    fontWeight: 600,
    color: "#374151",
  }}
>
  統計月份
</span>
        <select
          value={selectedYear}
          onChange={(e) =>
            setSelectedYear(
              Number(e.target.value)
            )
          }
          style={{
  height: 40,
  padding: "0 12px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  background: "#ffffff",
  color: "#111827",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
            width: 120,
}}
        >
          {Array.from(
            { length: 7 },
            (_, index) =>
              today.getFullYear() -
              3 +
              index
          ).map((year) => (
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
          style={{
  height: 40,
  padding: "0 12px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  background: "#ffffff",
  color: "#111827",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
            width: 120,
}}
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

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 14,
          marginBottom: 18,
          alignItems: "stretch",
        }}
      >
        <div style={summaryCardStyle}>
          <div
  style={{
    color: "#6b7280",
    fontSize: 14,
    fontWeight: 500,
  }}
>
  本月交易筆數
</div>

          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              marginTop: 6,
              color: "#111827",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
            }}
          >
            {expenses.length} 筆
          </div>
        </div>

        <div style={summaryCardStyle}>
          <div
            style={{
  color: "#6b7280",
  fontSize: 14,
  fontWeight: 500,
}}
          >
            未繳信用卡
          </div>

          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              marginTop: 6,
              color: "#111827",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
            }}
          >
            {allUnpaidStatements.length} 張
          </div>
        </div>

        <div style={summaryCardStyle}>
          <div
            style={{
  color: "#6b7280",
  fontSize: 14,
  fontWeight: 500,
}}
          >
            本月總支出
          </div>

          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              marginTop: 6,
              color: "#111827",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
            }}
          >
            {Object.entries(
              totalsByCurrency
            ).length === 0 ? (
              <span>0</span>
            ) : (
              Object.entries(
                totalsByCurrency
              ).map(
                ([currency, amount]) => (
                  <div key={currency}>
                    {currency}{" "}
                    {formatNumber(
                      amount
                    )}
                  </div>
                )
              )
            )}
          </div>
        </div>

        <div style={summaryCardStyle}>
          <div
            style={{
  color: "#6b7280",
  fontSize: 14,
  fontWeight: 500,
}}
          >
            最近繳款日
          </div>

          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              marginTop: 6,
              color: "#111827",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
            }}
          >
            {nextDueStatement
              ? `${nextDueStatement.name}｜${getDueDateText(
                  nextDueStatement
                )}`
              : "-"}
          </div>
        </div>
      </div>

      <div
        style={{
          ...sectionStyle,
          padding: 14,
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
        }}
      >
        <button
          onClick={() =>
            scrollToSection(
              "card-statements"
            )
          }
          style={{
  height: 40,
  padding: "0 14px",
  background: "#ffffff",
  color: "#374151",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
}}
        >
          💳 本期帳單
        </button>

        <button
          onClick={() => {
            setShowStatementHistory(
              true
            );

            setTimeout(() => {
              scrollToSection(
                "statement-history"
              );
            }, 50);
          }}
         style={{
  height: 40,
  padding: "0 14px",
  background: "#ffffff",
  color: "#374151",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
}}
        >
          📚 歷史帳單
        </button>

        <button
          onClick={() =>
            scrollToSection(
              "monthly-expenses"
            )
          }
          style={{
  height: 40,
  padding: "0 14px",
  background: "#ffffff",
  color: "#374151",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
}}
        >
          🧾 本月支出明細
        </button>
      </div>

      {unpaidStatements.length > 0 && (
        <section
          style={{
            ...sectionStyle,
            background: "#fff7ed",
            border:"1px solid #fed7aa",
            padding: 16,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            marginBottom: 16,
          }}
        >
          <h2
  style={{
    fontSize: 22,
    fontWeight: 700,
    color: "#111827",
    marginTop: 0,
    marginBottom: 10,
  }}
>
  ⚠️ 信用卡繳款提醒
</h2>

          {unpaidStatements.map(
            (card, index) => (
              <div
                key={card.id}
                style={{
                marginBottom:
  index === unpaidStatements.length - 1
    ? 0
    : 8,
                padding: "10px 12px",
                background: "#ffffff",
                border: "1px solid #fed7aa",
                borderRadius: 8,
              }}
              >
                <div
  style={{
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  }}
>
  <strong
    style={{
      fontSize: 15,
      color: "#111827",
    }}
  >
    {card.name}
  </strong>

  <span
    style={{
      color: "#7c2d12",
      fontSize: 14,
    }}
  >
    {getDueStatus(card)}
    {"｜"}
    截止日{" "}
    {getDueDateText(card)}
  </span>
</div>
            )
          )}
        </section>
      )}

      <section
  style={{
    ...sectionStyle,
    padding: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    marginBottom: 16,
  }}
>
        <h2
  style={{
    fontSize: 22,
    fontWeight: 700,
    color: "#111827",
    marginTop: 0,
    marginBottom: 10,
  }}
>
  本月支出總額
</h2>

        {Object.entries(
          totalsByCurrency
        ).length === 0 ? (
          <div
  style={{
    color: "#6b7280",
    fontSize: 14,
    padding: "4px 0",
  }}
>
  本月目前沒有支出
</div>
        ) : (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 4,
    }}
  >
    {Object.entries(
      totalsByCurrency
    ).map(
      ([currency, amount]) => (
        
              <div
                key={currency}
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#111827",
                  whiteSpace: "nowrap",
                  lineHeight: 1.2,
                }}
              >
                {currency}{" "}
                {formatNumber(amount)}
              </div>
            )
          
        )}
  </div>
      )}
      </section>

     <section
  style={{
    ...sectionStyle,
    padding: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    marginBottom: 16,
  }}
>
  <h2
    style={{
      fontSize: 22,
      fontWeight: 700,
      color: "#111827",
      marginTop: 0,
      marginBottom: 10,
    }}
  >
    支出分類
  </h2>

  {Object.entries(categoryTotals).length === 0 ? (
    <div
  style={{
    color: "#6b7280",
    fontSize: 14,
    padding: "4px 0",
  }}
>
  沒有資料
</div>
  ) : (
    Object.entries(categoryTotals).map(
      ([category, totals], index) => (
        <div
          key={category}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            padding: "8px 0",
            borderBottom:
  index === Object.entries(categoryTotals).length - 1
    ? "none"
    : "1px solid #eee",
          }}
        >
          <strong
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#111827",
            }}
          >
            {category}
          </strong>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              color: "#374151",
            }}
          >
            {Object.entries(totals).map(
              ([currency, amount]) => (
                <span
                  key={currency}
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#111827",
                    whiteSpace: "nowrap",
                    lineHeight: 1.4,
                  }}
                >
                  {currency}{" "}
                  {formatNumber(amount)}
                </span>
              )
            )}
          </div>
        </div>
      )
    )
  )}
</section>

      <section
  style={{
    ...sectionStyle,
    padding: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    marginBottom: 16,
  }}
>
  <h2
    style={{
      fontSize: 22,
      fontWeight: 700,
      color: "#111827",
      marginTop: 0,
      marginBottom: 10,
    }}
  >
    信用卡支出
  </h2>

        {Object.entries(cardTotals)
          .length === 0 ? (
          <div
  style={{
    color: "#6b7280",
    fontSize: 14,
    padding: "4px 0",
  }}
>
  本月沒有信用卡支出
</div>
        ) : (
          Object.entries(cardTotals).map(
            ([cardName, totals]) => {
              const isOpen =
                selectedCard ===
                cardName;

              const cardExpenses =
                expenses.filter(
                  (expense) =>
                    expense.card_name ===
                    cardName
                );

              return (
                <div
                  key={cardName}
                  style={{
                    marginBottom: 10,
                    border: isOpen
                      ? "2px solid #111827"
                      : "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 14,
                    background: isOpen ? "#f9fafb" : "#ffffff",
                    boxShadow: isOpen
                      ? "0 2px 8px rgba(0,0,0,0.10)"
                      : "0 1px 3px rgba(0,0,0,0.06)",
                  }}
                >
                  <button
                    onClick={() =>
                      setSelectedCard(
                        isOpen
                          ? null
                          : cardName
                      )
                    }
                    style={{
                      width: "100%",
                      textAlign: "left",
                      background: "#ffffff",
                      border: "none",
                      padding: "2px 0",
                      cursor: "pointer",
                      font: "inherit",
                      color: "inherit",
                      outline: "none",
                    }}
                  >
                    <div
  style={{
    display: "flex",
    alignItems: "center",
    marginBottom: 4,
    minWidth: 0,
  }}
>
                    <strong
  style={{
    fontSize: 16,
    fontWeight: 700,
    color: "#111827",
    overflow: "hidden",
textOverflow: "ellipsis",
whiteSpace: "nowrap",
    minWidth: 0,
    flex: "1 1 auto",
  }}
>
  {cardName}
</strong>
                    <span
  style={{
    marginLeft: 8,
    color: "#6b7280",
    fontSize: 14,
    flexShrink: 0,
    maxWidth: "100%",
    width: "100%",
  }}
>
  {isOpen ? "▲" : "▼"}
</span>
</div>

<div
  style={{
    marginTop: 8,
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
                       alignItems: "center",
}}
                    >
                      {Object.entries(
                        totals
                      ).map(
                        ([
                          currency,
                          amount,
                        ]) => (
                          <span
                            key={currency}
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: "#111827",
                              whiteSpace: "nowrap",
}}
                          >
                            {currency}{" "}
                            {formatNumber(
                              amount
                            )}
                          </span>
                        )
                      )}
                    </div>
                  </button>

                  {isOpen && (
  <div
    style={{
      marginTop: 12,
      padding: 12,
      background: "#f8fafc",
      borderRadius: 10,
      border: "1px solid #e5e7eb",
      overflow: "hidden",
    }}
  >
    {cardExpenses.map(
      (expense, index) => (
                          <div
                            key={
                              expense.id
                            }
                            style={{
                              display:"flex",
                              justifyContent:"space-between",
                              alignItems: "center",
                              alignContent: "center",
                              flexWrap: "wrap",
                              gap: 8,
                              width: "100%",
                              padding:"7px 0",
                              borderBottom:
  index === cardExpenses.length - 1
    ? "none"
    : "1px solid #e5e7eb",
                            }}
                          >
                            <span
  style={{
    minWidth: 0,
    flex: "1 1 160px",
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: "#4b5563",
    fontSize: 14,
    lineHeight: 1.4,
  }}
>
  {expense.date}{" "}
  {expense.item}
</span>

                            <span
  style={{
  fontSize: 14,
  fontWeight: 700,
  color: "#111827",
  whiteSpace: "nowrap",
    textAlign: "right",
    minWidth: 80,
    lineHeight: 1.4,
}}
>
  {expense.currency || "USD"}{" "}
  {formatNumber(
    Number(expense.amount)
  )}
</span>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              );
            }
          )
        )}
      </section>

      <section
        id="card-statements"
        style={sectionStyle}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <h2
            style={{
  margin: 0,
  fontSize: 22,
  fontWeight: 700,
  color: "#111827",
}}
          >
            💳 信用卡本期帳單
            （共{" "}
            {statementSummary.total} 張
            ｜未繳{" "}
            {statementSummary.unpaid} 張）
          </h2>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <button
              onClick={() =>
                setShowZeroBalanceCards(
                  (value) =>!value
                )
              }
              style={{
  height: 36,
  padding: "0 12px",
  background: "#ffffff",
  color: "#374151",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
}}
            >
              {showZeroBalanceCards
                ? "隱藏 0 元帳單"
                : "顯示 0 元帳單"}
            </button>

            <button
              onClick={() =>
                setShowStatementHistory(
                  (value) =>
                    !value
                )
              }
              style={{
  height: 36,
  padding: "0 12px",
  background: "#ffffff",
  color: "#374151",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
}}
            >
              {showStatementHistory
                ? "隱藏歷史帳單"
                : "查看歷史帳單"}
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 10,
            marginTop: 16,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              border:
                "1px solid #eee",
              borderRadius: 10,
              padding: 12,
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                color: "#666",
              }}
            >
              本期帳單總額
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 20,
                fontWeight: 700,
                color: "#111827",
              }}
            >
              {Object.entries(
                statementTotalsByCurrency
              ).length === 0 ? (
                <span>0</span>
              ) : (
                Object.entries(
                  statementTotalsByCurrency
                ).map(
                  ([
                    currency,
                    amount,
                  ]) => (
                    <div
                      key={currency}
                    >
                      {currency}{" "}
                      {formatNumber(
                        amount
                      )}
                    </div>
                  )
                )
              )}
            </div>
          </div>

          <div
            style={{
              border:
                "1px solid #eee",
              borderRadius: 10,
              padding: 12,
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                color: "#666",
              }}
            >
              已繳總額
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 20,
                fontWeight: 700,
                color: "#111827",
              }}
            >
              {Object.entries(
                paidTotalsByCurrency
              ).length === 0 ? (
                <span>0</span>
              ) : (
                Object.entries(
                  paidTotalsByCurrency
                ).map(
                  ([
                    currency,
                    amount,
                  ]) => (
                    <div
                      key={currency}
                    >
                      {currency}{" "}
                      {formatNumber(
                        amount
                      )}
                    </div>
                  )
                )
              )}
            </div>
          </div>

          <div
            style={{
              border:
                "1px solid #fecaca",
              borderRadius: 10,
              padding: 12,
              background: "#fff7f7",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                color: "#666",
              }}
            >
              未繳總額
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 20,
                fontWeight: 700,
                color: "#111827",
              }}
            >
              {Object.entries(
                allUnpaidTotalsByCurrency
              ).length === 0 ? (
                <span>0</span>
              ) : (
                Object.entries(
                  allUnpaidTotalsByCurrency
                ).map(
                  ([
                    currency,
                    amount,
                  ]) => (
                    <div
                      key={currency}
                    >
                      {currency}{" "}
                      {formatNumber(
                        amount
                      )}
                    </div>
                  )
                )
              )}
            </div>
          </div>
        </div>

        {visibleCardStatements.length ===
        0 ? (
          <div>目前沒有帳單資料</div>
        ) : (
          visibleCardStatements.map(
            (card) => {
              const isOpen =
                selectedStatementCard ===
                card.name;

              const cardStatementExpenses =
                card.periodStart &&
                card.periodEnd
                  ? statementExpenses.filter(
                      (expense) =>
                        expense.card_name ===
                          card.name &&
                        expense.date >=
                          card.periodStart! &&
                        expense.date <=
                          card.periodEnd!
                    )
                  : [];

              return (
                <div
                  key={card.id}
                  style={{
                    border: isOpen
                      ? "2px solid #444"
                      : card.isPaid
                      ? "1px solid #ddd"
                      : "1px solid #fecaca",

                    background:
                      card.isPaid
                        ? "#fff"
                        : "#fff7f7",

                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 12,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  }}
                >
                  <div
                    onClick={() =>
                      setSelectedStatementCard(
                        isOpen
                          ? null
                          : card.name
                      )
                    }
                    style={{
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "center",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <strong
  style={{
    fontSize: 16,
    color: "#111827",
  }}
>
  {card.name}
</strong>

                      <span
  style={{
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
    background: card.isPaid ? "#ecfdf5" : "#fef2f2",
    color: card.isPaid ? "#047857" : "#b91c1c",
    whiteSpace: "nowrap",
  }}
>
  {getStatementBadge(card)}
</span>
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 20,
                        fontWeight: 700,
                      }}
                    >
                      {Object.entries(
                        card.totals
                      ).length === 0 ? (
                        <span>0</span>
                      ) : (
                        Object.entries(
                          card.totals
                        ).map(
                          ([
                            currency,
                            amount,
                          ]) => (
                            <div
  key={currency}
  style={{
    fontWeight: 700,
    color: "#111827",
    fontSize: 15,
    whiteSpace: "nowrap",
  }}
>
  {currency}{" "}
  {formatNumber(amount)}
</div>
                          )
                        )
                      )}
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 14,
                        color: "#4b5563",
                      }}
                    >
                      繳款截止：
                      {getDueDateText(
                        card
                      )}
                    </div>
                  </div>

                  {isOpen && (
                    <div
                      style={{
                        marginTop: 14,
                      }}
                    >
                      <div
                        style={{
                          background:
                            "#f3f4f6",
                          padding: 12,
                          borderRadius: 8,
                          marginBottom: 10,
                        }}
                      >
                        <div>
                          結帳日：
                          {card.statement_day ||
                            "-"}
                          日
                        </div>

                        <div>
                          繳款日：
                          {card.due_day ||
                            "-"}
                          日
                        </div>

                        <div>
                          帳單月份：
                          {selectedYear} 年{" "}
                          {selectedMonth} 月
                        </div>

                        <div>
                          繳款月份：
                          {getDueMonthText(
                            card
                          )}
                        </div>

                        <div>
                          帳單期間：
                          {formatDate(
                            card.periodStart
                          )}{" "}
                          ～{" "}
                          {formatDate(
                            card.periodEnd
                          )}
                        </div>
                      </div>

                      <div
                        style={{
                          background:
                            "#f3f4f6",
                          padding: 12,
                          borderRadius: 8,
                          marginBottom: 10,
                        }}
                      >
                        <div>
                          狀態：
                          {getDueStatus(
                            card
                          )}
                        </div>

                        {card.isPaid && (
                          <>
                            <div
                              style={{
                                marginTop: 5,
                              }}
                            >
                              實際繳款日：
                              {formatDate(
                                card.paidDate
                              )}
                            </div>

                            {card.statementStatusId &&
                              (editingPaidStatementId ===
                              card.statementStatusId ? (
                                <div
                                  style={{
                                    display:
                                      "flex",
                                    flexWrap:
                                      "wrap",
                                    gap: 8,
                                    marginTop: 8,
                                  }}
                                >
                                 <input
  type="date"
  value={editingPaidDate}
  onChange={(e) =>
    setEditingPaidDate(e.target.value)
  }
  style={{
    height: 36,
    padding: "0 10px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    background: "#ffffff",
    color: "#111827",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  }}
                                   
/>

                                  <button
                                    onClick={() =>
                                      savePaidDate(
                                        card.statementStatusId!
                                      )
                                    }
                                    style={{
  height: 36,
  padding: "0 12px",
  background: "#2563eb",
  color: "#ffffff",
  border: "1px solid #2563eb",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
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
  height: 36,
  padding: "0 12px",
  background: "#ffffff",
  color: "#374151",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
}}
                                  >
                                    取消
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingPaidStatementId(
                                      card.statementStatusId!
                                    );

                                    setEditingPaidDate(
                                      card.paidDate ||
                                        ""
                                    );
                                  }}
                                  style={{
  marginTop: 8,
  height: 36,
  padding: "0 12px",
  background: "#ffffff",
  color: "#374151",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
}}
                                >
                                  修改繳款日
                                </button>
                              ))}
                          </>
                        )}
                      </div>

                      <h4
  style={{
    marginTop: 16,
    marginBottom: 8,
    fontSize: 15,
    fontWeight: 700,
    color: "#111827",
  }}
>
  帳單明細
</h4>

                      {cardStatementExpenses.length ===
                      0 ? (
                       <div
  style={{
    padding: "12px 0",
    color: "#6b7280",
    fontSize: 14,
  }}
>
  沒有支出明細
</div>
                      ) : (
                        cardStatementExpenses.map(
                          (expense) => (
                            <div
                              key={
                                expense.id
                              }
                              style={{
                                display:"flex",
                                justifyContent:"space-between",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: 10,
                                padding: "6px 0",
                                borderBottom: "1px solid #eee",
                              }}
                            >
                             <span
  style={{
    minWidth: 0,
    flex: "1 1 180px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: "#374151",
  }}
>
                                {expense.date}{" "}
                                {expense.item}
                              </span>

                             <span
  style={{
    fontWeight: 700,
    color: "#111827",
    whiteSpace: "nowrap",
  }}
>
                                {expense.currency ||
                                  "USD"}{" "}
                                {formatNumber(
                                  Number(
                                    expense.amount
                                  )
                                )}
                              </span>
                            </div>
                          )
                        )
                      )}
                    </div>
                  )}

                  <button
                    onClick={() =>
                      togglePaidStatus(card)
                    }
                   style={{
  marginTop: 12,
  height: 36,
  padding: "0 12px",
  background: card.isPaid ? "#ecfdf5" : "#fef2f2",
  color: card.isPaid ? "#047857" : "#b91c1c",
  border: card.isPaid
    ? "1px solid #a7f3d0"
    : "1px solid #fecaca",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
}}
                  >
                    {card.isPaid
                      ? "標記未繳"
                      : "標記已繳"}
                  </button>
                </div>
              );
            }
          )
        )}
      </section>

      {showStatementHistory && (
        <section
          id="statement-history"
          style={sectionStyle}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <h2
  style={{
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: "#111827",
  }}
>
  📚 歷史帳單
</h2>

            <button
  onClick={exportHistoryCsv}
  style={{
    height: 40,
    padding: "0 12px",
    background: "#2563eb",
    color: "#ffffff",
    border: "1px solid #2563eb",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
  }}
>
  匯出 CSV
</button>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 14,
              marginBottom: 14,
              alignItems: "center",
            }}
          >
            <input
              type="text"
              value={historySearch}
              onChange={(e) =>
                setHistorySearch(
                  e.target.value
                )
              }
              placeholder="搜尋信用卡"
              style={{
  height: 40,
  padding: "0 12px",
  width: 220,
  border: "1px solid #d1d5db",
  borderRadius: 8,
  background: "#ffffff",
  color: "#111827",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
}}
            />

            <select
              value={
                historyMonthFilter
              }
              onChange={(e) =>
                setHistoryMonthFilter(
                  e.target.value
                )
              }
              style={{
  height: 40,
  padding: "0 12px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  background: "#ffffff",
  color: "#111827",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
}}
            >
              <option value="all">
                全部月份
              </option>

              {historyMonthOptions.map(
                (month) => (
                  <option
                    key={month}
                    value={month}
                  >
                    {month}
                  </option>
                )
              )}
            </select>

            <select
              value={
                historyCardFilter
              }
              onChange={(e) =>
                setHistoryCardFilter(
                  e.target.value
                )
              }
              style={{
  height: 40,
  padding: "0 12px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  background: "#ffffff",
  color: "#111827",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
}}
            >
              <option value="all">
                全部信用卡
              </option>

              {creditCards.map(
                (card) => (
                  <option
                    key={card.id}
                    value={String(
                      card.id
                    )}
                    disabled={
                      (historyCountByCard[
                        String(
                          card.id
                        )
                      ] || 0) === 0
                    }
                  >
                    {card.name} (
                    {historyCountByCard[
                      String(
                        card.id
                      )
                    ] || 0}
                    )
                  </option>
                )
              )}
            </select>

            <select
              value={
                historyStatusFilter
              }
              onChange={(e) =>
                setHistoryStatusFilter(
                  e.target.value
                )
              }
              style={{
  height: 40,
  padding: "0 12px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  background: "#ffffff",
  color: "#111827",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
}}
            >
              <option value="all">
                全部狀態
              </option>

              <option value="paid">
                已繳
              </option>

              <option value="unpaid">
                未繳
              </option>
            </select>

            <select
              value={historySort}
              onChange={(e) =>
                setHistorySort(
                  e.target.value
                )
              }
              style={{
  height: 40,
  padding: "0 12px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  background: "#ffffff",
  color: "#111827",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
}}
            >
              <option value="newest">
                最新帳單優先
              </option>

              <option value="oldest">
                最舊帳單優先
              </option>

              <option value="amount_desc">
                金額高到低
              </option>

              <option value="amount_asc">
                金額低到高
              </option>
            </select>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                border:
                  "1px solid #eee",
                borderRadius: 8,
                padding: 10,
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              共{" "}
              <strong
  style={{
    fontSize: 20,
    color: "#111827",
  }}
>
  {historySummary.total}
</strong>
              {" "}
              筆
            </div>

            <div
              style={{
                border:
                  "1px solid #eee",
                borderRadius: 8,
                padding: 10,
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              已繳{" "}
              <strong
  style={{
    fontSize: 20,
    color: "#111827",
  }}
>
  {historySummary.paid}
</strong>
              {" "}
              筆
            </div>

            <div
              style={{
                border:
                  "1px solid #fecaca",
                background:
                  "#fff7f7",
                borderRadius: 8,
                padding: 10,
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              未繳{" "}
              <strong
  style={{
    fontSize: 20,
    color: "#111827",
  }}
>
  {historySummary.unpaid}
</strong>
              {" "}
              筆
            </div>

            <div
              style={{
                border:
                  "1px solid #eee",
                borderRadius: 8,
                padding: 10,
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              {Object.entries(
                historyTotals
              ).length === 0 ? (
                <span
  style={{
    fontSize: 20,
    fontWeight: 700,
    color: "#111827",
  }}
>
  總額 0
</span>
              ) : (
                Object.entries(
                  historyTotals
                ).map(
                  ([
                    currency,
                    amount,
                  ]) => (
                    <div
  key={currency}
  style={{
    fontSize: 20,
    fontWeight: 700,
    color: "#111827",
    whiteSpace: "nowrap",
  }}
>
                      {currency}{" "}
                      {formatNumber(
                        amount
                      )}
                    </div>
                  )
                )
              )}
            </div>
          </div>

          {visibleStatementHistory.map(
            (statement) => {
              const card = getCardById(
                statement.card_id
              );

              const totals =
                getHistoricalStatementTotals(
                  statement
                );

              const expensesInStatement =
                getHistoricalExpenses(
                  statement
                );

              const isExpanded =
                expandedHistoryIds.includes(
                  statement.id
                );

              const monthDate =
                new Date(
                  `${statement.period_end}T00:00:00`
                );

              return (
                <div
                  key={
                    statement.id
                  }
                  style={{
                    border:
                      statement.is_paid
                        ? "1px solid #ddd"
                        : "1px solid #fecaca",

                    background:
                      statement.is_paid
                        ? "#fff"
                        : "#fff7f7",

                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 10,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  }}
                >
                  <div
                    onClick={() =>
                      setExpandedHistoryIds(
                        (current) =>
                          current.includes(
                            statement.id
                          )
                            ? current.filter(
                                (id) =>
                                  id !==
                                  statement.id
                              )
                            : [
                                ...current,
                                statement.id,
                              ]
                      )
                    }
                    style={{
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        gap: 10,
                        flexWrap:
                          "wrap",
                      }}
                    >
                     <strong
  style={{
    fontSize: 16,
    color: "#111827",
    minWidth: 0,
    flex: "1 1 220px",
    overflow: "hidden",
    textOverflow: "ellipsis",
whiteSpace: "nowrap",
  }}
>
  {isExpanded ? "▼" : "▶"}{" "}
  {card?.name || "未知信用卡"}{" "}
  ·{" "}
  {monthDate.getFullYear()} 年{" "}
  {monthDate.getMonth() + 1} 月
</strong>

                      <span
  style={{
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
    background: statement.is_paid ? "#ecfdf5" : "#fef2f2",
    color: statement.is_paid ? "#047857" : "#b91c1c",
    whiteSpace: "nowrap",
  }}
>
  {statement.is_paid
    ? "✅ 已繳"
    : "🔴 未繳"}
</span>
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 20,
                        fontWeight: 700,
                      }}
                    >
                      {Object.entries(
                        totals
                      ).length === 0 ? (
                        <span>0</span>
                      ) : (
                        Object.entries(
                          totals
                        ).map(
                          ([
                            currency,
                            amount,
                          ]) => (
                            <div
  key={currency}
  style={{
    fontWeight: 700,
    color: "#111827",
    fontSize: 15,
    whiteSpace: "nowrap",
  }}
>
                              {currency}{" "}
                              {formatNumber(
                                amount
                              )}
                            </div>
                          )
                        )
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div
                      style={{
  marginTop: 12,
  padding: 12,
  background: "#f9fafb",
  borderRadius: 8,
                        border: "1px solid #e5e7eb",
}}
                    >
                      <div
  style={{
    fontSize: 14,
    color: "#4b5563",
  }}
>
  帳單期間：
  {formatDate(statement.period_start)} ～{" "}
  {formatDate(statement.period_end)}
</div>

                      {statement.is_paid && (
  <div
    style={{
      marginTop: 5,
      fontSize: 14,
      color: "#4b5563",
    }}
  >
    實際繳款日：
    {formatDate(statement.paid_date)}
  </div>
)}

                      <div
  style={{
    marginTop: 16,
    marginBottom: 8,
    fontSize: 15,
    fontWeight: 700,
    color: "#111827",
  }}
>
  支出明細
</div>

                      {expensesInStatement.length ===
                      0 ? (
                        <div
                          style={{
  marginTop: 6,
  padding: "10px 0",
  color: "#6b7280",
  fontSize: 14,
}}
                        >
                          沒有支出明細
                        </div>
                      ) : (
                        expensesInStatement.map(
                          (expense) => (
                            <div
                              key={
                                expense.id
                              }
                              style={{
                                display:"flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                flexWrap:"wrap",
                                gap: 10,
                                padding:"7px 0",
                                borderBottom: "1px solid #eee",
                              }}
                            >
                              <span
  style={{
    minWidth: 0,
    flex: "1 1 180px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: "#374151",
  }}
>
  {expense.date}{" "}
  {expense.item}
</span>

                             <span
  style={{
    fontWeight: 700,
    color: "#111827",
    whiteSpace: "nowrap",
  }}
>
  {expense.currency || "USD"}{" "}
  {formatNumber(
    Number(expense.amount)
  )}
</span>
                            </div>
                          )
                        )
                      )}
                    </div>
                  )}
                </div>
              );
            }
          )}

          {historyVisibleCount <
            filteredStatementHistory.length && (
            <button
              onClick={() =>
                setHistoryVisibleCount(
                  (count) =>
                    count + 20
                )
              }
            style={{
  marginTop: 14,
  height: 40,
  padding: "0 14px",
  background: "#f3f4f6",
  color: "#374151",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
}}
            >
              載入更多
            </button>
          )}
        </section>
      )}

      <section
        id="monthly-expenses"
        style={sectionStyle}
      >
        <h2 
          style={{
    fontSize: 22,
    fontWeight: 700,
    color: "#111827",
    marginBottom: 14,
          
  }}
>
          🧾 本月支出明細</h2>

        <div
  style={{
    marginBottom: 16,
  }}
>
  <input
    type="text"
    value={monthlyExpenseSearch}
    onChange={(e) =>
      setMonthlyExpenseSearch(e.target.value)
    }
    placeholder="搜尋項目、分類或信用卡"
    style={{
  padding: "0px 12px",
      width: 320,
  border: "1px solid #d1d5db",
  borderRadius: 8,
  background: "#ffffff",
  color: "#111827",
  fontSize: 14,
  outline: "none",
  minHeight: 38,
}}
  />
          <div
    style={{
      display: "grid",
      gridTemplateColumns:
        "repeat(auto-fit, minmax(180px, 1fr))",
      gap: 10,
      marginBottom: 12,
      alignItems: "end",
      
    }}
            >
    <label
  style={{
    display: "flex",
    flexDirection: "column",
    minWidth: 180,
    flex: "1 1 220px",
  }}
>
              <div
                style={{
                  fontSize: 14,
                  color: "#666",
                  marginBottom: 5,
                }}
              >
                分類

      </div>

      <select
        value={monthlyExpenseCategoryFilter}
        onChange={(e) =>
          setMonthlyExpenseCategoryFilter(
            e.target.value
          )
        }
      style={{
        width: "100%",
  height: 40,
  padding: "0 12px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  background: "#ffffff",
  color: "#111827",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
}}
      >
        <option value="餐飲">餐飲</option>
        <option value="交通">交通</option>
        <option value="住宿">住宿</option>
        <option value="購物">購物</option>
        <option value="娛樂旅遊">娛樂旅遊</option>
        <option value="居家">居家</option>
        <option value="汽車">汽車</option>
        <option value="其他">其他</option>
      </select>
    </label>

   <label
  style={{
    display: "flex",
    flexDirection: "column",
    minWidth: 180,
    flex: "1 1 220px",
  }}
>
      <div
        style={{
          fontSize: 14,
          color: "#666",
          marginBottom: 5,
        }}
      >
        付款方式
        </div>

      <select
        value={monthlyExpenseCardFilter}
        onChange={(e) =>
          setMonthlyExpenseCardFilter(
            e.target.value
          )
        }
       style={{
         width: "100%",
  height: 40,
  padding: "0 12px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  background: "#ffffff",
  color: "#111827",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
}}
      >
        <option value="all">
          全部付款方式
        </option>
        <option value="non-card">
          非信用卡支出
        </option>

        {creditCards.map((card) => (
          <option
            key={card.id}
            value={card.name}
          >
            {card.name}
          </option>
        ))}
      </select>
    </label>

   <label
  style={{
    display: "flex",
    flexDirection: "column",
    minWidth: 180,
    flex: "1 1 220px",
  }}
>
      <div
        style={{
          fontSize: 14,
          color: "#666",
          marginBottom: 5,
        }}
      >
        開始日期
      </div>

      <input
        type="date"
        value={monthlyExpenseStartDate}
        onChange={(e) =>
          setMonthlyExpenseStartDate(
            e.target.value
          )
        }
       style={{
         width: "100%",
  height: 40,
  padding: "0 12px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  background: "#ffffff",
  color: "#111827",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
}}
      />
    </label>
           <label
  style={{
    display: "flex",
    flexDirection: "column",
    minWidth: 180,
    flex: "1 1 220px",
  }}
>
      <div
        style={{
          fontSize: 14,
          color: "#666",
          marginBottom: 5,
        }}
      >
        結束日期
        </div>

      <input
        type="date"
        value={monthlyExpenseEndDate}
        onChange={(e) =>
          setMonthlyExpenseEndDate(
            e.target.value
          )
          }
       style={{
         width: "100%",
  height: 40,
  padding: "0 12px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  background: "#ffffff",
  color: "#111827",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
}}
      />
    </label>
  </div>
          <div
    style={{
      display: "flex",
      flexWrap: "wrap",
      gap: 10,
      alignItems: "flex-end",
    }}
  >
            <select
      value={monthlyExpenseSort}
      onChange={(e) =>
        setMonthlyExpenseSort(e.target.value)
      }
      style={{
  height: 40,
  padding: "0 12px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  background: "#ffffff",
  color: "#111827",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  width: 150,
}}
    >
              <option value="date_desc">
        日期新到舊
      </option>
      <option value="date_asc">
        日期舊到新
      </option>
      <option value="amount_desc">
        金額高到低
      </option>
      <option value="amount_asc">
        金額低到高
        </option>
    </select>

    <button
      onClick={() => {
        setMonthlyExpenseSearch("");
        setMonthlyExpenseCategoryFilter("all");
        setMonthlyExpenseCardFilter("all");
        setMonthlyExpenseStartDate("");
        setMonthlyExpenseEndDate("");
        setMonthlyExpenseSort("date_desc");
        setMonthlyExpenseVisibleCount(20);
      }}
      style={{
        height: 40,
  padding: "8px 12px",
  background: "#ffffff",
  color: "#374151",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
}}
    >
      清除篩選
    </button>

    <button
      onClick={exportMonthlyExpensesCsv}
     style={{
       height: 40,
  padding: "8px 12px",
  background: "#2563eb",
  color: "#ffffff",
  border: "1px solid #2563eb",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
}}
    >
      匯出 CSV
    </button>
  </div>
</div>

        <div
          style={{
            marginBottom: 10,
          }}
        >
          目前顯示：
         <strong>
  {visibleMonthlyExpenses.length} / {filteredMonthlyExpenses.length}
</strong>{" "}
筆
        </div>

        <div
          style={{
            marginBottom: 14,
            fontWeight: 700,
          }}
        >
          篩選後總額：

          {Object.entries(
            filteredMonthlyTotals
          ).length === 0 ? (
            <span
              style={{
                marginLeft: 6,
              }}
            >
              0
            </span>
          ) : (
            Object.entries(
              filteredMonthlyTotals
            ).map(
              ([currency, amount]) => (
                <span
                  key={currency}
                  style={{
                    marginLeft: 10,
                  }}
                >
                  {currency}{" "}
                  {formatNumber(
                    amount
                  )}
                </span>
              )
            )
          )}
        </div>

        {visibleMonthlyExpenses.length ===
        0 ? (
          <div>
            沒有符合條件的支出
          </div>
        ) : (
          visibleMonthlyExpenses.map(
            (expense) => (
              <div
                key={expense.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "82px 1fr auto",
                  gap: 10,
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: "1px solid #eee",
                }}
              >
          <div
  style={{
    fontSize: 13,
    color: "#6b7280",
  }}
>
  {expense.date}
</div>
             

                <div
  style={{
    minWidth: 0,
  }}
>
                <div
  style={{
    fontSize: 14,
    color: "#111827",
    overflow: "hidden",
textOverflow: "ellipsis",
whiteSpace: "nowrap",
  }}
>
  <strong>
    {expense.item}
  </strong>
</div>

           <div
  style={{
    fontSize: 13,
    color: "#6b7280",
    marginTop: 3,
    overflow: "hidden",
textOverflow: "ellipsis",
whiteSpace: "nowrap",
  }}
>
 {expense.major_category || "其他"}
{expense.category ? ` / ${expense.category}` : ""}
{expense.card_name ? ` / ${expense.card_name}` : ""}
                  </div>
                </div>

                <div
                style={{
  fontWeight: 700,
  textAlign: "right",
  color: "#111827",
  whiteSpace: "nowrap",
}}
                >
                  {expense.currency ||
                    "USD"}{" "}
                  {formatNumber(
                    Number(
                      expense.amount
                    )
                  )}
                </div>
              </div>
            )
          )
        )}

        {monthlyExpenseVisibleCount <
          filteredMonthlyExpenses.length && (
          <button
            onClick={() =>
              setMonthlyExpenseVisibleCount(
                (count) =>
                  count + 20
              )
            }
            style={{
  marginTop: 14,
  padding: "8px 14px",
  background: "#f3f4f6",
  color: "#374151",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
}}
          >
            載入更多
          </button>
        )}
      </section>

      <button
        onClick={() =>
          scrollToSection(
            "dashboard-top"
          )
        }
        style={{
          position: "fixed",
          right: 24,
          bottom: 24,
          width: 44,
          height: 44,
          borderRadius: "50%",
          border:
            "1px solid #ccc",
          background: "#fff",
          cursor: "pointer",
          fontSize: 20,
          boxShadow:
            "0 2px 8px rgba(0,0,0,0.15)",
        }}
        aria-label="回到頂端"
      >
        ↑
      </button>
    </main>
  );
}
