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

  const [showZeroBalanceCards, setShowZeroBalanceCards] =
  useState(false);
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
  const [historyVisibleCount, setHistoryVisibleCount] =
  useState(20);

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

  useEffect(() => {
  setHistoryVisibleCount(20);
}, [
  historyMonthFilter,
  historyCardFilter,
  historyStatusFilter,
  historySort,
  historySearch,
]);

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

  const visibleCardStatements = useMemo(() => {
  if (showZeroBalanceCards) {
    return sortedCardStatements;
  }

  return sortedCardStatements.filter((card) =>
    Object.values(card.totals).some(
      (total) => total > 0
    )
  );
}, [
  sortedCardStatements,
  showZeroBalanceCards,
]);

  const statementSummary = useMemo(() => {
  const cardsWithAmount = sortedCardStatements.filter(
    (card) =>
      Object.values(card.totals).some(
        (total) => total > 0
      )
  );

  return {
    total: cardsWithAmount.length,
    unpaid: cardsWithAmount.filter(
      (card) => !card.isPaid
    ).length,
    paid: cardsWithAmount.filter(
      (card) => card.isPaid
    ).length,
  };
}, [sortedCardStatements]);

  const paidProgress =
  statementSummary.total === 0
    ? 0
    : Math.round(
        (statementSummary.paid /
          statementSummary.total) *
          100
      );
  
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
const nextDueStatement =
  unpaidStatements.length > 0
    ? unpaidStatements[0]
    : null;
  
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

  const paidTotalsByCurrency = useMemo(() => {
  const totals: Record<string, number> = {};

  for (const card of sortedCardStatements) {
    if (!card.isPaid) {
      continue;
    }

    for (const [currency, total] of Object.entries(
      card.totals
    )) {
      totals[currency] =
        (totals[currency] || 0) + total;
    }
  }

  return totals;
}, [sortedCardStatements]);

  const statementTotalsByCurrency = useMemo(() => {
  const totals: Record<string, number> = {};

  for (const card of sortedCardStatements) {
    for (const [currency, total] of Object.entries(
      card.totals
    )) {
      totals[currency] =
        (totals[currency] || 0) + total;
    }
  }

  return totals;
}, [sortedCardStatements]);

  const statementHistory = useMemo(() => {
  return [...cardStatements].sort((a, b) => {
    if (a.period_end === b.period_end) {
      return Number(b.id) - Number(a.id);
    }

    return b.period_end.localeCompare(a.period_end);
  });
}, [cardStatements]);

  const historyMonthOptions = useMemo(() => {
  const months = new Set<string>();

  for (const statement of statementHistory) {
    months.add(statement.period_end.slice(0, 7));
  }

  return Array.from(months).sort((a, b) =>
    b.localeCompare(a)
  );
}, [statementHistory]);

  const filteredStatementHistory = useMemo(() => {
  const keyword = historySearch.trim().toLowerCase();

  const filtered = statementHistory.filter((statement) => {
    const monthMatches =
      historyMonthFilter === "all" ||
      statement.period_end.slice(0, 7) ===
        historyMonthFilter;

    const cardMatches =
      historyCardFilter === "all" ||
      String(statement.card_id) ===
        historyCardFilter;

    const statusMatches =
      historyStatusFilter === "all" ||
      (historyStatusFilter === "paid" &&
        statement.is_paid) ||
      (historyStatusFilter === "unpaid" &&
        !statement.is_paid);

    const card = creditCards.find(
      (item) =>
        Number(item.id) ===
        Number(statement.card_id)
    );

    const expensesForStatement =
      statementExpenses.filter((expense) => {
        if (!card) {
          return false;
        }

        return (
          expense.card_name === card.name &&
          expense.date >= statement.period_start &&
          expense.date <= statement.period_end
        );
      });

    const searchMatches =
      keyword === "" ||
      (card?.name || "")
        .toLowerCase()
        .includes(keyword) ||
      expensesForStatement.some((expense) =>
        expense.item
          .toLowerCase()
          .includes(keyword)
      );

    return (
      monthMatches &&
      cardMatches &&
      statusMatches &&
      searchMatches
    );
  });

  return [...filtered].sort((a, b) => {
    if (historySort === "oldest") {
      return a.period_end.localeCompare(
        b.period_end
      );
    }

    if (historySort === "amount_desc") {
      const aTotals =
        getHistoricalStatementTotals(a);

      const bTotals =
        getHistoricalStatementTotals(b);

      const aAmount = Object.values(
        aTotals
      ).reduce(
        (sum, total) => sum + total,
        0
      );

      const bAmount = Object.values(
        bTotals
      ).reduce(
        (sum, total) => sum + total,
        0
      );

      return bAmount - aAmount;
    }

    return b.period_end.localeCompare(
      a.period_end
    );
  });
}, [
  statementHistory,
  historyMonthFilter,
  historyCardFilter,
  historyStatusFilter,
  historySort,
  historySearch,
  statementExpenses,
  creditCards,
]);

  const visibleStatementHistory = useMemo(() => {
  return filteredStatementHistory.slice(
    0,
    historyVisibleCount
  );
}, [
  filteredStatementHistory,
  historyVisibleCount,
]);

  const filteredHistoryTotals = useMemo(() => {
  const totals: Record<string, number> = {};

  for (const statement of filteredStatementHistory) {
    const statementTotals =
      getHistoricalStatementTotals(statement);

    for (const [currency, total] of Object.entries(
      statementTotals
    )) {
      totals[currency] =
        (totals[currency] || 0) + total;
    }
  }

  return totals;
}, [
  filteredStatementHistory,
  statementExpenses,
  creditCards,
]);

  const filteredHistorySummary = useMemo(() => {
  return {
    total: filteredStatementHistory.length,
    paid: filteredStatementHistory.filter(
      (statement) => statement.is_paid
    ).length,
    unpaid: filteredStatementHistory.filter(
      (statement) => !statement.is_paid
    ).length,
  };
}, [filteredStatementHistory]);
  
  function getHistoricalStatementTotals(
  statement: CreditCardStatement
) {
  const card = creditCards.find(
    (item) =>
      Number(item.id) ===
      Number(statement.card_id)
  );

  if (!card) {
    return {};
  }

  const totals: Record<string, number> = {};

  for (const expense of statementExpenses) {
    if (expense.card_name !== card.name) {
      continue;
    }

    if (
      expense.date < statement.period_start ||
      expense.date > statement.period_end
    ) {
      continue;
    }

    const currency =
      expense.currency || "USD";

    totals[currency] =
      (totals[currency] || 0) +
      Number(expense.amount || 0);
  }

  return totals;
}

  function exportHistoryCsv() {
  const rows = [
  [
    "信用卡",
    "帳單開始日",
    "帳單結束日",
    "狀態",
    "實際繳款日",
    "消費日期",
    "消費項目",
    "大分類",
    "小分類",
    "幣別",
    "消費金額",
  ],
];

    let exportedExpenseCount = 0;
    
  for (const statement of filteredStatementHistory) {
  const card = creditCards.find(
    (item) =>
      Number(item.id) ===
      Number(statement.card_id)
  );

  const expensesForStatement =
    statementExpenses.filter((expense) => {
      if (!card) {
        return false;
      }

      return (
        expense.card_name === card.name &&
        expense.date >= statement.period_start &&
        expense.date <= statement.period_end
      );
    });

  if (expensesForStatement.length === 0) {
    rows.push([
      card?.name || "未知信用卡",
      statement.period_start,
      statement.period_end,
      statement.is_paid ? "已繳" : "未繳",
      statement.paid_date || "",
      "",
      "",
      "",
      "",
      "",
      "0",
    ]);
  } else {
    
    
    for (const expense of expensesForStatement) {
      exportedExpenseCount += 1;
      rows.push([
        card?.name || "未知信用卡",
        statement.period_start,
        statement.period_end,
        statement.is_paid ? "已繳" : "未繳",
        statement.paid_date || "",
        expense.date,
        expense.item,
        expense.major_category || "",
        expense.category || "",
        expense.currency || "USD",
        Number(expense.amount).toFixed(2),
      ]);
    }
  }
}

    const csvTotals: Record<string, number> = {};
    const csvPaidTotals: Record<string, number> = {};
const csvUnpaidTotals: Record<string, number> = {};
const csvExpenseCounts: Record<string, number> = {};
    
for (const statement of filteredStatementHistory) {
  const card = creditCards.find(
    (item) =>
      Number(item.id) ===
      Number(statement.card_id)
  );

  if (!card) {
    continue;
  }

  const expensesForStatement =
    statementExpenses.filter((expense) => {
      return (
        expense.card_name === card.name &&
        expense.date >= statement.period_start &&
        expense.date <= statement.period_end
      );
    });

  for (const expense of expensesForStatement) {
  const currency =
    expense.currency || "USD";

  const amount =
    Number(expense.amount || 0);

  csvTotals[currency] =
    (csvTotals[currency] || 0) +
    amount;

    csvExpenseCounts[currency] =
  (csvExpenseCounts[currency] || 0) + 1;

  if (statement.is_paid) {
    csvPaidTotals[currency] =
      (csvPaidTotals[currency] || 0) +
      amount;
  } else {
    csvUnpaidTotals[currency] =
      (csvUnpaidTotals[currency] || 0) +
      amount;
  }
}
  
}

rows.push([
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
]);

for (const [currency, total] of Object.entries(
  csvPaidTotals
)) {
  rows.push([
    "已繳總計",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    currency,
    total.toFixed(2),
  ]);
}

for (const [currency, total] of Object.entries(
  csvUnpaidTotals
)) {
  rows.push([
    "未繳總計",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    currency,
    total.toFixed(2),
  ]);
}

for (const [currency, total] of Object.entries(
  csvTotals
)) {
  rows.push([
    "總計",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    currency,
    total.toFixed(2),
  ]);
}

    for (const [currency, total] of Object.entries(
  csvTotals
)) {
  const count =
    csvExpenseCounts[currency] || 0;

  const average =
    count === 0 ? 0 : total / count;

  rows.push([
    "平均每筆消費",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    currency,
    average.toFixed(2),
  ]);
}
    const exportCardName =
  historyCardFilter === "all"
    ? "全部信用卡"
    : creditCards.find(
        (card) =>
          String(card.id) === historyCardFilter
      )?.name || "未知信用卡";

const exportMonth =
  historyMonthFilter === "all"
    ? "全部月份"
    : historyMonthFilter;

const exportStatus =
  historyStatusFilter === "all"
    ? "全部狀態"
    : historyStatusFilter === "paid"
    ? "已繳"
    : "未繳";

const exportSearch =
  historySearch.trim() === ""
    ? "無"
    : historySearch.trim();

    const exportSort =
  historySort === "newest"
    ? "最新帳單優先"
    : historySort === "oldest"
    ? "最舊帳單優先"
    : "金額高到低";

    rows.push([
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
]);

rows.push([
  "篩選條件",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
]);

rows.push([
  "月份",
  exportMonth,
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
]);

rows.push([
  "信用卡",
  exportCardName,
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
]);

rows.push([
  "狀態",
  exportStatus,
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
]);

rows.push([
  "搜尋",
  exportSearch,
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
]);

    rows.push([
  "排序",
  exportSort,
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
]);

    rows.push([
  "匯出筆數",
  `${filteredStatementHistory.length} 筆帳單`,
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
]);

    rows.push([
  "消費明細筆數",
  `${exportedExpenseCount} 筆`,
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
]);
    
    const exportTime = new Date();

const exportTimeText =
  `${exportTime.getFullYear()}/${String(
    exportTime.getMonth() + 1
  ).padStart(2, "0")}/${String(
    exportTime.getDate()
  ).padStart(2, "0")} ${String(
    exportTime.getHours()
  ).padStart(2, "0")}:${String(
    exportTime.getMinutes()
  ).padStart(2, "0")}`;

rows.push([
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
]);

rows.push([
  "匯出時間",
  exportTimeText,
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
]);
    
  const csv = rows
    .map((row) =>
      row
        .map((value) =>
          `"${String(value).replace(/"/g, '""')}"`
        )
        .join(",")
    )
    .join("\n");

  const blob = new Blob(
    ["\uFEFF" + csv],
    {
      type: "text/csv;charset=utf-8;",
    }
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  const selectedCardName =
  historyCardFilter === "all"
    ? "all-cards"
    : creditCards.find(
        (card) =>
          String(card.id) === historyCardFilter
      )?.name || "card";

const fileMonth =
  historyMonthFilter === "all"
    ? "all-months"
    : historyMonthFilter;

const fileStatus =
  historyStatusFilter === "all"
    ? "all-status"
    : historyStatusFilter;

const safeCardName = selectedCardName.replace(
  /[\\/:*?"<>|]/g,
  "-"
);

link.download =
  `statement-history-${fileMonth}-${safeCardName}-${fileStatus}.csv`;

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
  
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

          {nextDueStatement && (
  <div
    style={{
      marginBottom: 10,
      fontWeight: "bold",
    }}
  >
    最近要繳：
    {nextDueStatement.name}
    {" ｜ "}
    {getDueDateText(nextDueStatement.due_day)}
  </div>
)}
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
  繳款截止：
  {getDueDateText(card.due_day)}
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

        <button
  onClick={() =>
    setShowZeroBalanceCards(
      !showZeroBalanceCards
    )
  }
  style={{
    marginBottom: 10,
    padding: "6px 10px",
  }}
>
  {showZeroBalanceCards
    ? "隱藏 0 元帳單"
    : "顯示 0 元帳單"}
</button>

        <button
  onClick={() =>
    setShowStatementHistory(
      !showStatementHistory
    )
  }
  style={{
    marginLeft: 8,
    marginBottom: 10,
    padding: "6px 10px",
  }}
>
  {showStatementHistory
    ? "隱藏歷史帳單"
    : "顯示歷史帳單"}
</button>
        
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

        <div
  style={{
    marginBottom: 12,
    fontWeight: "bold",
    lineHeight: 1.8,
  }}
>
  <div>
  本期有消費：{statementSummary.total} 張
  {" ｜ "}
  未繳：{statementSummary.unpaid} 張
  {" ｜ "}
  已繳：{statementSummary.paid} 張
  {" ｜ "}
  已繳進度：{statementSummary.paid} / {statementSummary.total} 張（{paidProgress}%）
</div>

          <div
  style={{
    marginTop: 8,
    height: 12,
    background: "#eee",
    borderRadius: 999,
    overflow: "hidden",
  }}
>
  <div
    style={{
      width: `${paidProgress}%`,
      height: "100%",
      background: "#b7dfc3",
      transition: "width 0.3s ease",
    }}
  />
</div>

  <div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 10,
    marginTop: 8,
  }}
>
  <div
  style={{
    padding: 12,
    border: "1px solid #f0d98a",
    borderRadius: 10,
    background: "#fffbe6",
  }}
>
    <div>⏳ 未繳總額</div>

    <div
      style={{
        fontSize: 18,
        fontWeight: "bold",
        marginTop: 4,
      }}
    >
      {Object.keys(unpaidTotalsByCurrency).length === 0 ? (
        <span>0</span>
      ) : (
        Object.entries(unpaidTotalsByCurrency).map(
          ([currency, total], index) => (
            <span key={currency}>
              {index > 0 ? " / " : ""}
              {currency} {total.toFixed(2)}
            </span>
          )
        )
      )}
    </div>
  </div>

 <div
  style={{
    padding: 12,
    border: "1px solid #b7dfc3",
    borderRadius: 10,
    background: "#eef9f1",
  }}
>
    <div>✅ 已繳總額</div>

    <div
      style={{
        fontSize: 18,
        fontWeight: "bold",
        marginTop: 4,
      }}
    >
      {Object.keys(paidTotalsByCurrency).length === 0 ? (
        <span>0</span>
      ) : (
        Object.entries(paidTotalsByCurrency).map(
          ([currency, total], index) => (
            <span key={currency}>
              {index > 0 ? " / " : ""}
              {currency} {total.toFixed(2)}
            </span>
          )
        )
      )}
    </div>
  </div>

 <div
  style={{
    padding: 12,
    border: "1px solid #b8d7f0",
    borderRadius: 10,
    background: "#eef7ff",
  }}
>
    <div>💳 本期總額</div>

    <div
      style={{
        fontSize: 18,
        fontWeight: "bold",
        marginTop: 4,
      }}
    >
      {Object.keys(statementTotalsByCurrency).length === 0 ? (
        <span>0</span>
      ) : (
        Object.entries(statementTotalsByCurrency).map(
          ([currency, total], index) => (
            <span key={currency}>
              {index > 0 ? " / " : ""}
              {currency} {total.toFixed(2)}
            </span>
          )
        )
      )}
    </div>
  </div>
</div>
</div>
        
        {visibleCardStatements.length ===
0 ? (
          <p>
            尚未設定信用卡
          </p>
        ) : (
          visibleCardStatements.map(
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

      {showStatementHistory && (
  <section
    id="statement-history"
    style={{
      marginBottom: 30,
    }}
  >
    <h2>
  📚 歷史帳單（{filteredStatementHistory.length} 筆）
</h2>
    <div
  style={{
    marginBottom: 12,
    fontSize: 14,
  }}
>
  目前顯示 {visibleStatementHistory.length} /{" "}
  {filteredStatementHistory.length} 筆
</div>

    <div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 10,
    marginBottom: 12,
  }}
>
  <div
    style={{
      padding: 12,
      border: "1px solid #ddd",
      borderRadius: 10,
    }}
  >
    <div>📚 總筆數</div>
    <div
      style={{
        marginTop: 4,
        fontSize: 18,
        fontWeight: "bold",
      }}
    >
      {filteredHistorySummary.total} 筆
    </div>
  </div>

  <div
    style={{
      padding: 12,
      border: "1px solid #b7dfc3",
      borderRadius: 10,
      background: "#eef9f1",
    }}
  >
    <div>✅ 已繳</div>
    <div
      style={{
        marginTop: 4,
        fontSize: 18,
        fontWeight: "bold",
      }}
    >
      {filteredHistorySummary.paid} 筆
    </div>
  </div>

  <div
    style={{
      padding: 12,
      border: "1px solid #f0d98a",
      borderRadius: 10,
      background: "#fffbe6",
    }}
  >
    <div>⏳ 未繳</div>
    <div
      style={{
        marginTop: 4,
        fontSize: 18,
        fontWeight: "bold",
      }}
    >
      {filteredHistorySummary.unpaid} 筆
    </div>
  </div>

  <div
    style={{
      padding: 12,
      border: "1px solid #b8d7f0",
      borderRadius: 10,
      background: "#eef7ff",
    }}
  >
    <div>💰 總額</div>

    <div
      style={{
        marginTop: 4,
        fontSize: 18,
        fontWeight: "bold",
      }}
    >
      {Object.keys(filteredHistoryTotals).length === 0 ? (
        <span>0</span>
      ) : (
        Object.entries(filteredHistoryTotals).map(
          ([currency, total], index) => (
            <span key={currency}>
              {index > 0 ? " / " : ""}
              {currency} {total.toFixed(2)}
            </span>
          )
        )
      )}
    </div>
  </div>
</div>

    <input
  type="text"
  value={historySearch}
  onChange={(e) =>
    setHistorySearch(e.target.value)
  }
  placeholder="搜尋信用卡名稱或消費項目"
  style={{
    width: "100%",
    maxWidth: 360,
    marginBottom: 12,
    padding: "8px 10px",
  }}
/>

    {historySearch.trim() !== "" && (
  <div
    style={{
      marginBottom: 12,
      fontSize: 14,
    }}
  >
    搜尋：
    <strong>{historySearch}</strong>
    {" ｜ "}
    結果 {filteredStatementHistory.length} 筆
  </div>
)}
    
<div
  style={{
    marginBottom: 12,
    fontWeight: "bold",
  }}
>
  篩選總額：
  {Object.keys(filteredHistoryTotals).length === 0 ? (
    <span>0</span>
  ) : (
    Object.entries(filteredHistoryTotals).map(
      ([currency, total], index) => (
        <span key={currency}>
          {index > 0 ? " / " : " "}
          {currency} {total.toFixed(2)}
        </span>
      )
    )
  )}
</div>
    
    <select
  value={historyMonthFilter}
  onChange={(e) =>
    setHistoryMonthFilter(e.target.value)
  }
  style={{
    marginBottom: 12,
    padding: "6px 8px",
  }}
>
  <option value="all">全部月份</option>

  {historyMonthOptions.map((month) => {
    const [year, monthNumber] = month.split("-");

    return (
      <option
        key={month}
        value={month}
      >
        {year} 年 {Number(monthNumber)} 月
      </option>
    );
  })}
</select>

    <select
  value={historyCardFilter}
  onChange={(e) =>
    setHistoryCardFilter(e.target.value)
  }
  style={{
    marginLeft: 8,
    marginBottom: 12,
    padding: "6px 8px",
  }}
>
  <option value="all">全部信用卡</option>

  {creditCards.map((card) => (
    <option
      key={card.id}
      value={String(card.id)}
    >
      {card.name}
    </option>
  ))}
</select>

    <select
  value={historyStatusFilter}
  onChange={(e) =>
    setHistoryStatusFilter(e.target.value)
  }
  style={{
    marginLeft: 8,
    marginBottom: 12,
    padding: "6px 8px",
  }}
>
  <option value="all">全部狀態</option>
  <option value="unpaid">未繳</option>
  <option value="paid">已繳</option>
</select>

    <select
  value={historySort}
  onChange={(e) =>
    setHistorySort(e.target.value)
  }
  style={{
    marginLeft: 8,
    marginBottom: 12,
    padding: "6px 8px",
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
</select>

    <button
 onClick={() => {
  setHistoryMonthFilter("all");
  setHistoryCardFilter("all");
  setHistoryStatusFilter("all");
  setHistorySort("newest");
  setHistorySearch("");
}}
  style={{
    marginLeft: 8,
    marginBottom: 12,
    padding: "6px 10px",
  }}
>
  清除篩選
</button>

    <button
  onClick={() =>
    setExpandedHistoryIds(
      filteredStatementHistory.map(
        (statement) => statement.id
      )
    )
  }
  style={{
    marginLeft: 8,
    marginBottom: 12,
    padding: "6px 10px",
  }}
>
  全部展開
</button>

    <button
  onClick={() =>
    setExpandedHistoryIds([])
  }
  style={{
    marginLeft: 8,
    marginBottom: 12,
    padding: "6px 10px",
  }}
>
  全部收合
</button>

    <button
  onClick={exportHistoryCsv}
  style={{
    marginLeft: 8,
    marginBottom: 12,
    padding: "6px 10px",
  }}
>
  匯出 CSV
</button>

    <button
  onClick={() =>
    document
      .getElementById("statement-history-bottom")
      ?.scrollIntoView({
        behavior: "smooth",
      })
  }
  style={{
    marginLeft: 8,
    marginBottom: 12,
    padding: "6px 10px",
  }}
>
  ⬇️ 跳到歷史帳單底部
</button>

    {filteredStatementHistory.length === 0 ? (
  <p>
    找不到符合目前搜尋／篩選條件的歷史帳單
  </p>
) : (
      visibleStatementHistory.map((statement) => {
        const card = creditCards.find(
          (item) =>
            Number(item.id) ===
            Number(statement.card_id)
        );

        return (
          <div
            key={statement.id}
            style={{
              marginBottom: 12,
              padding: 12,
              border: "1px solid #ddd",
              borderRadius: 8,
            }}
          >
            <button
  onClick={() =>
  setExpandedHistoryIds((current) =>
    current.includes(statement.id)
      ? current.filter(
          (id) => id !== statement.id
        )
      : [...current, statement.id]
  )
}
  style={{
    fontWeight: "bold",
    cursor: "pointer",
    background: "none",
    border: "none",
    padding: 0,
    textDecoration: "underline",
  }}
>
  {card?.name || "未知信用卡"}
</button>

            <div>
              帳單期間：
              {formatDate(statement.period_start)}
              {" ～ "}
              {formatDate(statement.period_end)}
            </div>

            {(() => {
  const totals =
    getHistoricalStatementTotals(statement);

  return (
    <div>
      帳單金額：
      {Object.keys(totals).length === 0 ? (
        <span>0</span>
      ) : (
        Object.entries(totals).map(
          ([currency, total], index) => (
            <span key={currency}>
              {index > 0 ? " / " : " "}
              {currency} {total.toFixed(2)}
            </span>
          )
        )
      )}
    </div>
  );
})()}

            <div>
              狀態：
              {statement.is_paid
                ? "✅ 已繳"
                : "⏳ 未繳"}
            </div>

            <div>
              實際繳款日：
              {statement.paid_date
                ? formatDate(statement.paid_date)
                : "未記錄"}
            </div>

            {expandedHistoryIds.includes(statement.id) && (
  <div
    style={{
      marginTop: 10,
      paddingTop: 10,
      borderTop: "1px solid #eee",
    }}
  >
    <strong>消費明細</strong>

    {statementExpenses.filter((expense) => {
      if (!card) {
        return false;
      }

      return (
        expense.card_name === card.name &&
        expense.date >= statement.period_start &&
        expense.date <= statement.period_end
      );
    }).length === 0 ? (
      <p>本期沒有消費</p>
    ) : (
      statementExpenses
        .filter((expense) => {
          if (!card) {
            return false;
          }

          return (
            expense.card_name === card.name &&
            expense.date >= statement.period_start &&
            expense.date <= statement.period_end
          );
        })
        .map((expense) => (
          <div
            key={expense.id}
            style={{
              padding: "8px 0",
              borderBottom: "1px solid #eee",
            }}
          >
            <Link
              href={`/expenses/${expense.id}`}
            >
              {expense.date} {expense.item}
            </Link>

            <div>
              {expense.currency || "USD"}{" "}
              {Number(expense.amount).toFixed(2)}
            </div>
          </div>
        ))
    )}
  </div>
)}
            
          </div>
        );
      })
    )}

    {historyVisibleCount <
  filteredStatementHistory.length && (
  <button
    onClick={() =>
      setHistoryVisibleCount(
        (count) => count + 20
      )
    }
    style={{
      marginTop: 12,
      padding: "8px 12px",
    }}
  >
    載入更多
  </button>
)}

    <button
  onClick={() =>
    document
      .getElementById("statement-history")
      ?.scrollIntoView({
        behavior: "smooth",
      })
  }
  style={{
    marginTop: 12,
    marginLeft: 8,
    padding: "8px 12px",
  }}
>

      <div id="statement-history-bottom" />
      
  ⬆️ 回到歷史帳單頂部
</button>
  </section>
)}
      
    </main>
  );
}
