"use client";

import {useEffect,  useState,} from "react";
import { useRouter } from "next/navigation";
import ExpenseForm from "../../../components/ExpenseForm";
import { supabase } from "../../../lib/supabase";

type Person = {
  id: number | string;
  name?: string | null;
  display_name?: string | null;
  user_name?: string | null;
};

type CreditCard = {
  id: number | string;
  name: string;
};

type Trip = {
  id: number | string;
  name?: string | null;
  title?: string | null;
  trip_name?: string | null;
};

export default function NewExpensePage() {
  const router = useRouter();
  
  // =========================================================
  // 基本資料
  // =========================================================
  const [item, setItem] =
    useState("");

  const [amount, setAmount] =
    useState("");

  const [date, setDate] =
    useState(
      new Date()
        .toISOString()
        .slice(0, 10)
    );

  // =========================================
// 付款工具 ID
// =========================================

const [
  paymentMethodId,
  setPaymentMethodId,
] = useState<string>("");
  
  const [
    majorCategory,
    setMajorCategory,
  ] = useState("");

  const [category, setCategory] =
    useState("");

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState("");

  const [cardName, setCardName] =
    useState("");

  const [currency, setCurrency] =
    useState("USD");

  const [
    expenseScope,
    setExpenseScope,
  ] = useState("daily");

  const [
  tripId,
  setTripId,
] = useState("");

const [
  openedFromTrip,
  setOpenedFromTrip,
] = useState(false);

  const [notes, setNotes] =
    useState("");

  // =========================================================
  // 分攤
  // =========================================================
  const [paidBy, setPaidBy] =
    useState("");

  const [
    splitType,
    setSplitType,
  ] = useState("equal");

  const [
    selectedPeople,
    setSelectedPeople,
  ] = useState<number[]>([]);

  const [
    customShares,
    setCustomShares,
  ] = useState<
    Record<number, number>
  >({});

  // =========================================================
  // 選單資料
  // =========================================================
  const [people, setPeople] =
    useState<Person[]>([]);

  const [
    creditCards,
    setCreditCards,
  ] = useState<CreditCard[]>([]);

  const [trips, setTrips] =
    useState<Trip[]>([]);

  // =========================================================
  // 頁面狀態
  // =========================================================
  const [saving, setSaving] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

 /* =========================================================
   從旅程頁進入新增花費
   - 讀取網址 ?trip_id=
   - 自動切換成旅程支出
   - 自動帶入旅程 ID
   ========================================================= */
  useEffect(() => {
  const params =
    new URLSearchParams(
      window.location.search
    );

    const tripIdFromUrl =
    params.get("trip_id");

  if (!tripIdFromUrl) {
  return;
}

setOpenedFromTrip(true);
setExpenseScope("trip");
setTripId(tripIdFromUrl);
}, []);
  
  
  // =========================================================
  // 載入付款人、信用卡、旅程
  // =========================================================
  useEffect(() => {
    async function loadPage() {
      setLoading(true);
      setMessage("");

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        setMessage("請先登入");
        setLoading(false);
        return;
      }

      const [
        peopleResult,
        creditCardResult,
        tripResult,
      ] = await Promise.all([
        supabase
          .from("People")
          .select("*")
          .eq("user_id", user.id)
          .order("id", {
            ascending: true,
          }),

        supabase
          .from("CreditCards")
          .select("id,name")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("name", {
            ascending: true,
          }),

        supabase
          .from("Trips")
          .select("id,name")
          .eq("user_id", user.id)
          .order("start_date", {
            ascending: false,
          }),
      ]);

      if (peopleResult.error) {
        setMessage(
          peopleResult.error.message
        );
        setLoading(false);
        return;
      }

      if (creditCardResult.error) {
        setMessage(
          creditCardResult.error.message
        );
        setLoading(false);
        return;
      }

      if (tripResult.error) {
        setMessage(
          tripResult.error.message
        );
        setLoading(false);
        return;
      }

      setPeople(
        (peopleResult.data ||
          []) as Person[]
      );

      setCreditCards(
        (creditCardResult.data ||
          []) as CreditCard[]
      );

      setTrips(
        (tripResult.data ||
          []) as Trip[]
      );

      setLoading(false);
    }

    loadPage();
  }, []);

  // =========================================================
  // 選擇 / 取消分攤人
  // =========================================================
  function togglePerson(
    personId: number
  ) {
    setSelectedPeople(
      (current) => {
        if (
          current.includes(
            personId
          )
        ) {
          setCustomShares(
            (currentShares) => {
              const next = {
                ...currentShares,
              };

              delete next[
                personId
              ];

              return next;
            }
          );

          return current.filter(
            (id) =>
              id !== personId
          );
        }

        return [
          ...current,
          personId,
        ];
      }
    );
  }

  // =========================================================
  // 自訂分攤
  // 2 人：輸入其中一人，另一人自動補足
  // 3 人以上：最後選取的人自動補差額
  // =========================================================
  function updateCustomShare(
    personId: number,
    value: string
  ) {
    const enteredAmount =
      Number(value) || 0;

    const totalAmount =
      Number(amount) || 0;

    setCustomShares(
      (prev) => {
        const next = {
          ...prev,
          [personId]:
            enteredAmount,
        };

        if (
          selectedPeople.length ===
          2
        ) {
          const otherPersonId =
            selectedPeople.find(
              (id) =>
                id !==
                personId
            );

          if (
            otherPersonId !==
            undefined
          ) {
            next[
              otherPersonId
            ] = Math.max(
              0,
              Number(
                (
                  totalAmount -
                  enteredAmount
                ).toFixed(2)
              )
            );
          }

          return next;
        }

        if (
          selectedPeople.length >=
          3
        ) {
          const autoPersonId =
            selectedPeople[
              selectedPeople.length -
                1
            ];

          if (
            personId !==
            autoPersonId
          ) {
            const usedAmount =
              selectedPeople
                .filter(
                  (id) =>
                    id !==
                    autoPersonId
                )
                .reduce(
                  (
                    sum,
                    id
                  ) =>
                    sum +
                    Number(
                      next[id] ||
                        0
                    ),
                  0
                );

            next[
              autoPersonId
            ] = Math.max(
              0,
              Number(
                (
                  totalAmount -
                  usedAmount
                ).toFixed(2)
              )
            );
          }
        }

        return next;
      }
    );
  }

  // =========================================================
  // 自訂分攤總額
  // =========================================================
  const customTotal =
    selectedPeople.reduce(
      (
        total,
        personId
      ) =>
        total +
        Number(
          customShares[
            personId
          ] || 0
        ),
      0
    );

  // =========================================================
  // 平均分攤金額
  // =========================================================
  function getEqualShare() {
    const totalAmount =
      Number(amount) || 0;

    if (
      selectedPeople.length ===
      0
    ) {
      return 0;
    }

    return Number(
      (
        totalAmount /
        selectedPeople.length
      ).toFixed(2)
    );
  }

  // =========================================================
  // 新增支出
  // =========================================================
  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (saving) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        alert("請先登入");
        return;
      }

// =========================================
// 信用卡付款驗證
// 避免 card_name 儲存為 NULL
// =========================================

if (
  paymentMethod === "信用卡" &&
  !cardName.trim()
) {
  alert("請先選擇信用卡");
  return;
}
      
      // =====================================================
      // 先新增 Expenses
      // =====================================================
      const {
        data: expenseData,
        error: expenseError,
      } = await supabase
        .from("Expenses")
        .insert({
          date,
          item:
            item.trim(),

          amount:
            Number(amount),

          major_category:
            majorCategory,

          category,

          // =========================================
// 付款方式
// =========================================

payment_method:
  paymentMethod === "Debit Card"
    ? "金融卡"
    : paymentMethod,

// =========================================
// 實際扣款信用卡
// =========================================

card_name:
  (
    paymentMethod === "信用卡" ||
    paymentMethod === "Apple Pay" ||
    paymentMethod === "Google Pay"
  ) && cardName.trim()
    ? cardName.trim()
    : null,

// =========================================
// 付款工具 ID
// 金融卡 / Apple Pay / Google Pay
// =========================================

payment_method_id:
  paymentMethodId
    ? Number(paymentMethodId)
    : null,

          currency,

          expense_scope:
            expenseScope,

          trip_id:
            expenseScope ===
              "trip" &&
            tripId
              ? Number(tripId)
              : null,

          notes:
            notes.trim() ||
            null,

          paid_by:
            paidBy
              ? Number(paidBy)
              : null,

          split_type:
            splitType,

          user_id:
            user.id,
        })
        .select("id")
        .single();

      if (expenseError) {
        console.error(
          "新增支出失敗:",
          expenseError
        );

        alert(
          "新增支出失敗：" +
            expenseError.message
        );

        return;
      }

      // =====================================================
      // 建立分攤資料
      // =====================================================
      if (
        selectedPeople.length >
        0
      ) {
        const splitRows =
          selectedPeople.map(
            (
              personId,
              index
            ) => {
              let shareAmount =
                0;

              if (
                splitType ===
                "equal"
              ) {
                const totalAmount =
                  Number(amount);

                const peopleCount =
                  selectedPeople.length;

                const normalShare =
                  Number(
                    (
                      totalAmount /
                      peopleCount
                    ).toFixed(
                      2
                    )
                  );

                if (
                  index ===
                  peopleCount -
                    1
                ) {
                  shareAmount =
                    Number(
                      (
                        totalAmount -
                        normalShare *
                          (peopleCount -
                            1)
                      ).toFixed(
                        2
                      )
                    );
                } else {
                  shareAmount =
                    normalShare;
                }
              }

              if (
                splitType ===
                "custom"
              ) {
                shareAmount =
                  Number(
                    customShares[
                      personId
                    ] || 0
                  );
              }

              return {
                expense_id:
                  expenseData.id,

                person_id:
                  personId,

                share_amount:
                  shareAmount,

                user_id:
                  user.id,
              };
            }
          );

        const {
          error: splitError,
        } = await supabase
          .from(
            "ExpenseSplits"
          )
          .insert(splitRows);

        if (splitError) {
          console.error(
            "新增分攤資料失敗:",
            splitError
          );

          alert(
            "新增分攤資料失敗：" +
              splitError.message
          );

          return;
        }
      }

    // =========================================
// 儲存成功後，自動返回對應頁面
// =========================================

if (expenseScope === "trip" && tripId) {
  router.push(`/trips/${tripId}?tab=expenses`);
} else {
  router.push("/dashboard");
}

      } catch (error) {
  console.error(
    "新增支出失敗:",
    error
  );

  alert("新增支出時發生錯誤");

} finally {
  setSaving(false);
}
}

  // =========================================================
  // Loading
  // =========================================================
  if (loading) {
    return (
      <main
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: 20,
          minHeight:
            "100vh",
          boxSizing:
            "border-box",
          width: "100%",
        }}
      >
        載入中...
      </main>
    );
  }

  // =========================================================
  // 頁面：奶油米白＋棕色統一版型
  // 只調整顯示樣式，保留既有 ExpenseForm 與所有事件處理
  // =========================================================
  return (
    <main
      className="expense-new-page"
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "20px clamp(12px, 3vw, 24px) 48px",
        minHeight: "100vh",
        boxSizing: "border-box",
        width: "100%",
        background: "#f8f6f3",
        color: "#49392f",
      }}
    >
      {/* 只套用於新增支出頁，不修改共用元件功能 */}
      <style jsx global>{`
        .expense-new-page, .expense-new-page * {
          box-sizing: border-box;
        }
        .expense-new-page h1,
        .expense-new-page h2,
        .expense-new-page h3 {
          color: #49392f !important;
        }
        .expense-new-page form > section,
        .expense-new-page form > fieldset,
        .expense-new-page form > div:has(> h2),
        .expense-new-page form > div:has(> h3) {
          background: #faf7f2 !important;
          border: 1px solid #e6dcd0 !important;
          border-radius: 16px !important;
          box-shadow: 0 3px 12px rgba(103, 75, 57, .04);
        }
        .expense-new-page form label {
          color: #674b39 !important;
        }
        .expense-new-page form input:not([type="checkbox"]):not([type="radio"]),
        .expense-new-page form select,
        .expense-new-page form textarea {
          background-color: #fff !important;
          border-color: #d8c6b4 !important;
          color: #49392f !important;
          border-radius: 10px !important;
          min-width: 0;
          max-width: 100%;
        }
        .expense-new-page form input:not([type="checkbox"]):not([type="radio"]),
        .expense-new-page form select {
          min-height: 44px;
        }
        .expense-new-page form textarea {
          min-height: 80px;
        }
        .expense-new-page form input:focus-visible,
        .expense-new-page form select:focus-visible,
        .expense-new-page form textarea:focus-visible {
          outline: 2px solid #b89b80;
          outline-offset: 1px;
        }
        .expense-new-page form :is(input, select, textarea):disabled {
          background-color: #f2ebe2 !important;
        }
        .expense-new-page form input[type="checkbox"],
        .expense-new-page form input[type="radio"] {
          accent-color: #826349;
        }
        .expense-new-page form button[type="submit"] {
          background: #826349 !important;
          border-color: #826349 !important;
          color: #fff !important;
          border-radius: 10px !important;
          min-height: 44px;
        }
        @media (max-width: 600px) {
          .expense-new-page form > section,
          .expense-new-page form > fieldset {
            padding: 16px !important;
          }
        }
      `}</style>

      {/* 頁面標題 */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 24,
          padding: "20px 24px",
          background: "#faf7f2",
          border: "1px solid #e6dcd0",
          borderRadius: 16,
          width: "100%",
        }}
      >
        <div style={{ flex: "1 1 220px", minWidth: 0 }}>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(24px, 4vw, 30px)",
              fontWeight: 800,
              lineHeight: 1.3,
              color: "#49392f",
            }}
          >
            新增支出
          </h1>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 14,
              lineHeight: 1.6,
              color: "#927f70",
            }}
          >
            記錄日常與旅程花費，管理每一筆支出
          </p>
        </div>
      </header>

      {/* 共用支出表單：完整保留資料與事件綁定 */}
      <ExpenseForm
        openedFromTrip={openedFromTrip}
        item={item}
        setItem={setItem}
        paymentMethodId={paymentMethodId}
        setPaymentMethodId={setPaymentMethodId}
        amount={amount}
        setAmount={setAmount}
        date={date}
        setDate={setDate}
        majorCategory={majorCategory}
        setMajorCategory={setMajorCategory}
        category={category}
        setCategory={setCategory}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        cardName={cardName}
        setCardName={setCardName}
        currency={currency}
        setCurrency={setCurrency}
        expenseScope={expenseScope}
        setExpenseScope={setExpenseScope}
        tripId={tripId}
        setTripId={setTripId}
        notes={notes}
        setNotes={setNotes}
        paidBy={paidBy}
        setPaidBy={setPaidBy}
        splitType={splitType}
        setSplitType={setSplitType}
        selectedPeople={selectedPeople}
        togglePerson={togglePerson}
        customShares={customShares}
        updateCustomShare={updateCustomShare}
        people={people}
        creditCards={creditCards}
        trips={trips}
        customTotal={customTotal}
        getEqualShare={getEqualShare}
        saving={saving}
        submitText="新增支出"
        onSubmit={handleSubmit}
        cancelContent={
          <a
            href="/dashboard"
            style={{
              minHeight: 44,
              padding: "0 20px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#ffffff",
              color: "#674b39",
              border: "1px solid #d8c6b4",
              borderRadius: 10,
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            取消
          </a>
        }
      />

      {message && (
        <p
          role="alert"
          style={{
            marginTop: 16,
            color: "#b91c1c",
            padding: "12px 16px",
            border: "1px solid #f4c7c3",
            borderRadius: 10,
            background: "#fff7f5",
          }}
        >
          {message}
        </p>
      )}
    </main>
  );
}
