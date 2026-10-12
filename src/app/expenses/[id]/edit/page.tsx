"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import ExpenseForm from "../../../../components/ExpenseForm";

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

type ExpenseData = {
  item: string | null;
  amount: number | null;
  date: string | null;
  major_category: string | null;
  category: string | null;
  payment_method: string | null;
  card_name: string | null;
  currency: string | null;
  trip_id: number | string | null;
  notes: string | null;
  paid_by: number | string | null;
  split_type: string | null;
  expense_scope: string | null;
};

function getPersonName(person: Person) {
  return (
    person.name ||
    person.display_name ||
    person.user_name ||
    `使用者 ${person.id}`
  );
}

function getTripName(trip: Trip) {
  return (
    trip.name ||
    trip.title ||
    trip.trip_name ||
    `旅程 ${trip.id}`
  );
}


export default function EditExpensePage() {
  const params = useParams();
  const router = useRouter();

  const id = String(params.id);

  const [loading, setLoading] =
    useState(true);

const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [item, setItem] =
    useState("");

  const [amount, setAmount] =
    useState("");


const [date, setDate] =
    useState("");

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

  const [expenseScope, setExpenseScope] =
    useState("daily");

  const [tripId, setTripId] =
    useState("");

const [notes, setNotes] =
    useState("");

  const [paidBy, setPaidBy] =
    useState("");

  const [splitType, setSplitType] =
    useState("equal");


const [
    selectedPeople,
    setSelectedPeople,
  ] = useState<string[]>([]);

  const [
    customShares,
    setCustomShares,
  ] = useState<
    Record<string, number>
  >({});

const [people, setPeople] =
    useState<Person[]>([]);

  const [
    creditCards,
    setCreditCards,
  ] = useState<CreditCard[]>([]);

  const [trips, setTrips] =
    useState<Trip[]>([]);


useEffect(() => {
    if (!id) return;

    loadPage();
  }, [id]);

  async function loadPage() {
    setLoading(true);
    setMessage("");

  try {
      const [
        expenseResult,
        splitResult,
        peopleResult,
        cardsResult,
        tripsResult,
      ] = await Promise.all([
        supabase
          .from("Expenses")
          .select(
             [
              "item",
              "amount",
              "date",
              "major_category",
              "category",
              "payment_method",
              "card_name",
              "currency",
               "trip_id",
              "notes",
              "paid_by",
              "split_type",
              "expense_scope",
            ].join(",")
          )
          .eq("id", id)
          .single(),

        supabase
          .from("ExpenseSplits")
          .select(
            "person_id,share_amount"
          )
          .eq("expense_id", id),

        supabase
          .from("People")
          .select("*")
          .order("id", {
            ascending: true,
          }),

        supabase
          .from("CreditCards")
          .select("id,name")
          .eq("is_active", true)
          .order("name", {
            ascending: true,
          }),

        supabase
          .from("Trips")
          .select("*")
          .order("id", {
            ascending: false,
          }),
      ]);

    if (expenseResult.error) {
        throw expenseResult.error;
      }

                 const data =
        expenseResult.data as unknown as ExpenseData;

    setItem(data.item || "");

      setAmount(
        data.amount != null
          ? String(data.amount)
          : ""
      );

    setDate(data.date || "");

      setMajorCategory(
        data.major_category || ""
      );

      setCategory(
        data.category || ""
      );

      setPaymentMethod(
        data.payment_method || ""
      );

    setCardName(
        data.card_name || ""
      );

      setCurrency(
        data.currency || "USD"
      );

      setExpenseScope(
        data.expense_scope || "daily"
      );

    setTripId(
        data.trip_id != null
          ? String(data.trip_id)
          : ""
      );

      setNotes(
        data.notes || ""
      );

    setPaidBy(
        data.paid_by != null
          ? String(data.paid_by)
          : ""
      );

      setSplitType(
        data.split_type || "equal"
      );

    if (splitResult.error) {
        console.error(
          "讀取分攤資料失敗:",
          splitResult.error
        );
      } else {
        const splitData =
          splitResult.data || [];


    setSelectedPeople(
          splitData.map((row) =>
            String(row.person_id)
          )
        );

        setCustomShares(
          Object.fromEntries(
            splitData.map((row) => [
              String(row.person_id),
              Number(
                row.share_amount || 0
              ),
            ])
          )
        );
      }

    if (peopleResult.error) {
        console.error(
          "讀取人員失敗:",
          peopleResult.error
        );
      } else {
        setPeople(
          (peopleResult.data ||
            []) as Person[]
        );
      }

    if (cardsResult.error) {
        console.error(
          "讀取信用卡失敗:",
          cardsResult.error
        );
      } else {
        setCreditCards(
          (cardsResult.data ||
            []) as CreditCard[]
        );
      }

    if (tripsResult.error) {
        console.error(
          "讀取旅程失敗:",
          tripsResult.error
        );
      } else {
        setTrips(
          (tripsResult.data ||
            []) as Trip[]
        );
      }
    } catch (error) {
      const text =
        error instanceof Error
          ? error.message
          : String(error);

      setMessage(
        `載入資料失敗：${text}`
      );
    } finally {
      setLoading(false);
    }
  }

function togglePerson(
    personId: string
  ) {
    setSelectedPeople((prev) => {
      if (prev.includes(personId)) {
        setCustomShares(
          (current) => {
            const next = {
              ...current,
            };


          delete next[personId];

            return next;
          }
        );

        return prev.filter(
          (id) => id !== personId
        );
      }

                      return [
        ...prev,
        personId,
      ];
    });
  }

  function getEqualShare() {
  const numericAmount =
    Number(amount);

  if (
    !numericAmount ||
    selectedPeople.length === 0
  ) {
    return 0;
  }

    return (
    numericAmount /
    selectedPeople.length
  );
}

function updateCustomShare(
  personId: string,
  value: string
) {
  const enteredAmount =
    Number(value) || 0;


  const totalAmount =
    Number(amount) || 0;

  setCustomShares((prev) => {
    const next = {
      ...prev,
      [personId]: enteredAmount,
    };

    // 2 人：修改其中一人，另一人自動補差額
    if (selectedPeople.length === 2) {
      const otherPersonId =
        selectedPeople.find(
          (id) => id !== personId
        );

      if (otherPersonId) {
        next[otherPersonId] =
          Math.max(
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

    // 3 人以上：最後一位自動補足剩餘金額
    if (selectedPeople.length >= 3) {
      const autoPersonId =
        selectedPeople[
          selectedPeople.length - 1
        ];

      if (personId !== autoPersonId) {
        const usedAmount =
          selectedPeople
            .filter(
              (id) =>
                id !== autoPersonId
            )
        .reduce(
              (sum, id) =>
                sum +
                Number(
                  next[id] || 0
                ),
              0
            );
        next[autoPersonId] =
          Math.max(
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
  });
}

const customTotal =
    selectedPeople.reduce(
      (total, personId) =>
        total +
        Number(
          customShares[personId] || 0
        ),
      0
    );

async function handleSave(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (saving) return;

    setMessage("");

    const numericAmount =
      Number(amount);

  if (!item.trim()) {
      setMessage(
        "請輸入項目名稱"
      );
      return;
    }

    if (
      !Number.isFinite(
        numericAmount
      ) ||
      numericAmount <= 0
    ) {
      setMessage(
        "請輸入正確金額"
        );
      return;
    }

    if (!date) {
      setMessage(
        "請選擇日期"
      );
      return;
    }

  if (
      splitType === "custom" &&
      selectedPeople.length > 0 &&
      Math.abs(
        customTotal -
          numericAmount
      ) > 0.01
    ) {
    setMessage(
        `自訂分攤總額必須等於支出金額。目前分攤總額：${customTotal.toFixed(
          2
        )}`
      );
      return;
    }

    setSaving(true);

  try {
      const {
        data: authData,
        error: authError,
      } =
        await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

  const user =
        authData.user;

      if (!user) {
        throw new Error(
          "找不到登入使用者"
        );
      }


  const {
        error: expenseError,
      } = await supabase
        .from("Expenses")
        .update({
          item: item.trim(),
          amount:
            numericAmount,
          date,
          major_category:
            majorCategory.trim() ||
            null,
          category:
            category.trim() ||
            null,
          payment_method:
            paymentMethod ||
            null,
          card_name:
            paymentMethod ===
              "credit_card"
              ? cardName || null
              : null,
          currency:
            currency || "USD",
          expense_scope:
            expenseScope,
          trip_id:
            expenseScope ===
              "travel" &&
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
        })
        .eq("id", id);

      if (expenseError) {
        throw expenseError;
      }


  const {
        error: deleteSplitError,
      } = await supabase
        .from("ExpenseSplits")
        .delete()
        .eq(
          "expense_id",
          id
        );


  if (deleteSplitError) {
        throw deleteSplitError;
      }

      if (
        selectedPeople.length > 0
      ) {
        const equalShare =
          numericAmount /
          selectedPeople.length;

    const splitRows =
          selectedPeople.map(
            (personId) => {
              const parsedPersonId =
                Number(personId);

            const personValue =
                Number.isNaN(
                  parsedPersonId
                )
                  ? personId
                  : parsedPersonId;

            return {
                expense_id:
                  Number.isNaN(
                    Number(id)
                  )
                    ? id
                    : Number(id),


              person_id:
                  personValue,

              share_amount:
                  splitType ===
                  "custom"
                    ? Number(
                        customShares[
                          personId
                      ] || 0
                      )
                    : Number(
                        equalShare.toFixed(
                          2
                        )
                      ),

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
          throw splitError;
        }
      }

      router.push(
        `/expenses/${id}`
      );

  router.refresh();
    } catch (error) {
      const text =
        error instanceof Error
          ? error.message
          : String(error);


  setMessage(
        `儲存失敗：${text}`
      );
    } finally {
      setSaving(false);
    }
  }

const pageStyle:
    React.CSSProperties = {
    maxWidth: 760,
    margin: "0 auto",
    padding: 20,
    minHeight: "100vh",
    boxSizing: "border-box",
    width: "100%",
  };

const cardStyle:
    React.CSSProperties = {
    background: "#ffffff",
    border:
      "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
    boxShadow:
      "0 1px 3px rgba(0,0,0,0.06)",
  };

const labelStyle:
    React.CSSProperties = {
    display: "block",
    marginBottom: 6,
    fontSize: 14,
    fontWeight: 600,
    color: "#374151",
  };

const inputStyle:
    React.CSSProperties = {
    width: "100%",
    height: 42,
    padding: "0 12px",
    border:
      "1px solid #d1d5db",
  borderRadius: 10,
    background: "#ffffff",
    color: "#111827",
    fontSize: 14,
    boxSizing: "border-box",
    outline: "none",
  };

const fieldStyle:
    React.CSSProperties = {
    marginBottom: 14,
  };

if (loading) {
    return (
      <main style={pageStyle}>
        <div
          style={{
            ...cardStyle,
            color: "#6b7280",
            fontSize: 14,
          }}
        >
          載入中...
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div

        style={{
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 16,
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
          編輯支出
        </h1>

        <Link
          href={`/expenses/${id}`}
          style={{
            height: 40,
            padding: "0 14px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent:
              "center",
            border:
              "1px solid #d1d5db",
            borderRadius: 10,
            background:
              "#ffffff",
            color: "#374151",
            textDecoration:
              "none",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          返回明細
          </Link>
      </div>

      {message && (
        <div
          style={{
            marginBottom: 16,
            padding: "10px 12px",
            background:
              "#fee2e2",
            color: "#991b1b",
            borderRadius: 10,
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          {message}
        </div>
      )}

      <ExpenseForm
  item={item}
  setItem={setItem}

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
  submitText="儲存修改"

  onSubmit={handleSave}

  cancelContent={
    <Link
      href={`/expenses/${id}`}
      style={{
        height: 42,
        padding: "0 18px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
        color: "#374151",
        border: "1px solid #d1d5db",
        borderRadius: 10,
        textDecoration: "none",
        fontSize: 14,
        fontWeight: 600,
        whiteSpace: "nowrap",
        }}
    >
      取消
    </Link>
  }
/>
    </main>
  );
}
