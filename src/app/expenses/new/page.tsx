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

          payment_method:
            paymentMethod,

          card_name:
            cardName || null,

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

      // =====================================================
      // 新增成功
      // =====================================================
      router.push(
        "/dashboard"
      );
    } catch (error) {
      console.error(
        "新增支出失敗:",
        error
      );

      alert(
        "新增支出時發生錯誤"
      );
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
  // 頁面
  // =========================================================
  return (
    <main
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: 20,
        minHeight: "100vh",
        boxSizing:
          "border-box",
        width: "100%",
      }}
    >
      {/* =====================================================
          頁面標題
         ===================================================== */}
      <div
        style={{
          marginBottom: 18,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 700,
            color: "#111827",
          }}
        >
          新增支出
        </h1>
      </div>

      {/* =====================================================
          共用支出表單
         ===================================================== */}
      <ExpenseForm
        item={item}
        setItem={setItem}
        amount={amount}
        setAmount={setAmount}
        date={date}
        setDate={setDate}
        majorCategory={
          majorCategory
        }
        setMajorCategory={
          setMajorCategory
        }
        category={category}
        setCategory={
          setCategory
        }
        paymentMethod={
          paymentMethod
        }
        setPaymentMethod={
          setPaymentMethod
        }
        cardName={cardName}
        setCardName={
          setCardName
        }
        currency={currency}
        setCurrency={
          setCurrency
        }
        expenseScope={
          expenseScope
        }
        setExpenseScope={
          setExpenseScope
        }
        tripId={tripId}
        setTripId={setTripId}
        notes={notes}
        setNotes={setNotes}
        paidBy={paidBy}
        setPaidBy={setPaidBy}
        splitType={
          splitType
        }
        setSplitType={
          setSplitType
        }
        selectedPeople={
          selectedPeople
        }
        togglePerson={
          togglePerson
        }
        customShares={
          customShares
        }
        updateCustomShare={
          updateCustomShare
        }
        people={people}
        creditCards={
          creditCards
        }
        trips={trips}
        customTotal={
          customTotal
        }
        getEqualShare={
          getEqualShare
        }
        saving={saving}
        submitText="新增支出"
        onSubmit={
          handleSubmit
        }
        cancelContent={
          <a
            href="/dashboard"
            style={{
              height: 42,
              padding:
                "0 18px",
              display:
                "inline-flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              background:
                "#ffffff",
              color:
                "#374151",
              border:
                "1px solid #d1d5db",
              borderRadius:
                10,
              textDecoration:
                "none",
              fontSize: 14,
              fontWeight: 600,
              whiteSpace:
                "nowrap",
            }}
          >
            取消
          </a>
        }
      />

      {/* =====================================================
          錯誤訊息
         ===================================================== */}
      {message && (
        <p
          style={{
            marginTop: 16,
            color: "#b91c1c",
          }}
        >
          {message}
        </p>
      )}
    </main>
  );
}
