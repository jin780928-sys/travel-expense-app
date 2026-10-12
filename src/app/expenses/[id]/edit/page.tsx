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
        expenseResult.data as ExpenseData;

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

      <form
        onSubmit={handleSave}
      >
        {/* 基本資料 */}
        <section style={cardStyle}>
          <h2
            style={{
              marginTop: 0,
              marginBottom: 16,
              fontSize: 20,
              fontWeight: 700,
              color: "#111827",
            }}
            >
            基本資料
          </h2>

          <div style={fieldStyle}>
            <label
              style={labelStyle}
            >
              項目
            </label>

            <input
              type="text"
              value={item}
              onChange={(e) =>
                setItem(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
            }}
          >

            <div style={fieldStyle}>
              <label
                style={labelStyle}
              >
                金額
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) =>
                  setAmount(
                    e.target.value
                  )
                }
                style={inputStyle}
              />
            </div>

            <div style={fieldStyle}>
              <label
                style={labelStyle}
              >
                幣別
              </label>

              <select
                value={currency}
                onChange={(e) =>
                  setCurrency(
                    e.target.value
                  )
                }
                style={inputStyle}
              >

                <option value="USD">
                  USD
                </option>

                <option value="TWD">
                  TWD
                </option>

                <option value="JPY">
                  JPY
                </option>

                <option value="EUR">
                  EUR
                </option>


                <option value="KRW">
                  KRW
                </option>
              </select>
            </div>

            <div style={fieldStyle}>
              <label
                style={labelStyle}
              >
                日期
              </label>

              <input
                type="date"
                value={date}
                onChange={(e) =>
                  setDate(
                    e.target.value
                  )
                }
                style={inputStyle}
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
            }}
          >

            <div style={fieldStyle}>
              <label
                style={labelStyle}
              >
                大分類
              </label>

              <input
                type="text"
                value={
                  majorCategory
                }
                onChange={(e) =>
                  setMajorCategory(
                    e.target.value
                  )
                }
                style={inputStyle}
              />
            </div>

            <div style={fieldStyle}>
              <label
                style={labelStyle}
              >
                小分類
              </label>

              <input
                type="text"
                value={category}
                onChange={(e) =>
                  setCategory(
                    e.target.value
                  )
                  }
                style={inputStyle}
              />
            </div>
          </div>
        </section>

        {/* 付款資料 */}
        <section style={cardStyle}>
          <h2
            style={{
              marginTop: 0,
              marginBottom: 16,
              fontSize: 20,
              fontWeight: 700,
              color: "#111827",
              }}
          >
            付款資料
          </h2>

          <div style={fieldStyle}>
            <label
              style={labelStyle}
            >
              付款方式
            </label>

            <select
              value={paymentMethod}
              onChange={(e) => {
                const value =
                  e.target.value;

                setPaymentMethod(
                  value
                );

                if (
                  value !==
                  "credit_card"
                ) {
                  setCardName("");
                  }
              }}
              style={inputStyle}
            >
              <option value="">
                請選擇
              </option>

              <option value="cash">
                現金
              </option>

              <option value="credit_card">
                信用卡
              </option>

              <option value="debit_card">
                簽帳金融卡
              </option>

              <option value="bank_transfer">
                銀行轉帳
              </option>

              <option value="apple_pay">
                Apple Pay
              </option>

              <option value="google_pay">
                Google Pay
              </option>

              <option value="other">
                其他
              </option>
            </select>
          </div>

          {paymentMethod ===
            "credit_card" && (
            <div style={fieldStyle}>
              <label
                style={labelStyle}
              >
                信用卡
              </label>

              <select
                value={cardName}
                onChange={(e) =>
                  setCardName(
                    e.target.value
                  )
                }
                style={inputStyle}
              >
                <option value="">
                  請選擇信用卡
                </option>

                {creditCards.map(
                  (card) => (
                    <option
                      key={card.id}
                      value={
                        card.name
                      }
                    >
                      {card.name}
                    </option>
                  )
                )}
              </select>
            </div>
          )}

           <div style={fieldStyle}>
            <label
              style={labelStyle}
            >
              付款人
            </label>

            <select
              value={paidBy}
              onChange={(e) =>
                setPaidBy(
                  e.target.value
                )
              }
              style={inputStyle}
            >
              <option value="">
                未指定
              </option>

              {people.map(
                (person) => (
                  <option
                    key={person.id}
                    value={String(
                      person.id
                      )}
                  >
                    {getPersonName(
                      person
                    )}
                  </option>
                  )
              )}
            </select>
          </div>
        </section>

        {/* 支出類型 */}
        <section style={cardStyle}>
          <h2
            style={{
              marginTop: 0,
              marginBottom: 16,
              fontSize: 20,
              fontWeight: 700,
              color: "#111827",
            }}
          >
            支出類型
          </h2>

          <div style={fieldStyle}>
            <label
              style={labelStyle}
            >
              類型
            </label>

            <select
              value={expenseScope}
              onChange={(e) =>
                setExpenseScope(
                  e.target.value
                )
              }
              style={inputStyle}
            >
              <option value="daily">
                日常花費
              </option>
              <option value="travel">
                旅遊花費
              </option>
            </select>
          </div>

          {expenseScope ===
            "travel" && (
            <div style={fieldStyle}>
              <label
                style={labelStyle}
              >
                所屬旅程
              </label>


              <select
                value={tripId}
                onChange={(e) =>
                  setTripId(
                    e.target.value
                  )
                }
                style={inputStyle}
              >
                <option value="">
                  無
                </option>

                {trips.map(
                  (trip) => (
                    <option
                      key={trip.id}
                      value={String(
                        trip.id
                      )}
                    >
                      {getTripName(
                        trip
                      )}
                    </option>
                    )
                )}
              </select>
            </div>
          )}
        </section>

        {/* 分攤設定 */}
        <section style={cardStyle}>
          <h2
            style={{
              marginTop: 0,
              marginBottom: 16,
              fontSize: 20,
              fontWeight: 700,
              color: "#111827",
            }}
            >
            分攤設定
          </h2>

          <div style={fieldStyle}>
            <label
              style={labelStyle}
            >
              分攤方式
            </label>

            <select
              value={splitType}
              onChange={(e) =>
                setSplitType(
                  e.target.value
                )
              }
              style={inputStyle}
            >
              <option value="equal">
                平均分攤
              </option>

              <option value="custom">
                自訂金額
              </option>
            </select>
          </div>

          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#374151",
              marginBottom: 8,
            }}
          >
            分攤人
          </div>

          {people.length === 0 ? (
            <div
              style={{
                color: "#6b7280",
                fontSize: 14,
              }}
            >
              目前沒有可選人員
              </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 8,
              }}
            >
              {people.map(
                (person) => {
                  const personId =
                    String(
                      person.id
                    );

              const checked =
                    selectedPeople.includes(
                      personId
                    );

                  return (
                    <div
                      key={
                        person.id
                      }
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap: 10,
                        padding:
                          "10px 12px",
                        border:
                          "1px solid #e5e7eb",
                        borderRadius:
                          10,
                        background:
                          checked
                            ? "#f9fafb"
                            : "#ffffff",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={
                          checked
                        }
                        onChange={() =>
                          togglePerson(
                            personId
                          )
                        }
                      />

                      <div
                        style={{
                          flex:
                            "1 1 auto",
                          minWidth: 0,
                          fontSize: 14,
                          color:
                            "#111827",
                          fontWeight:
                            checked
                              ? 600
                              : 400,
                        }}
                      >
                        {getPersonName(
                          person
                        )}
                      </div>

                      {checked &&
                        splitType ===
                          "equal" && (

                        <div
                            style={{
                              fontSize:
                                14,
                              fontWeight:
                                600,
                              color:
                                "#374151",
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                          {currency}{" "}
                            {getEqualShare().toFixed(
                              2
                            )}
                          </div>
                        )}
                      {checked &&
                        splitType ===
                          "custom" && (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              customShares[
                                personId
                              ] ?? ""
                            }
                            onChange={(
                              e
                            ) =>
                              setCustomShares(
                                (
                                  prev
                                ) => ({
                                  ...prev,

                                  [personId]:
                                    Number(
                                      e
                                        .target
                                        .value
                                      ),
                                })
                              )
                            }
                            placeholder="金額"
                            style={{
                              width:
                                120,
                              height:
                                38,
                              padding:
                                "0 10px",
                              border:
                                "1px solid #d1d5db",
                              borderRadius:
                                8,
                              boxSizing:
                                "border-box",
                              fontSize:
                                14,
                            }}
                          />
                        )}
                      </div>
                  );
                }
              )}
            </div>
          )}

          {selectedPeople.length >
            0 && (
            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop:
                  "1px solid #e5e7eb",
                fontSize: 14,
                color: "#4b5563",
              }}
            >
              已選{" "}
              {
                selectedPeople.length
              }{" "}
              人

              {splitType ===
                "custom" && (
                <span>
                  {" "}
                  ｜分攤總額：
                  {currency}{" "}
                  {customTotal.toFixed(
                  2
                  )}
                </span>
              )}
            </div>
          )}
        </section>

        {/* 備註 */}
        <section style={cardStyle}>
          <h2
            style={{
              marginTop: 0,
              marginBottom: 16,
              fontSize: 20,
              fontWeight: 700,
              color: "#111827",
            }}
          >
            備註
          </h2>
          <textarea
            value={notes}
            onChange={(e) =>
              setNotes(
                e.target.value
              )
              }
            rows={5}
            placeholder="備註"
            style={{
              width: "100%",
              padding: 12,
              border:
                "1px solid #d1d5db",
              borderRadius: 10,
              background:
                "#ffffff",
              color: "#111827",
              fontSize: 14,
              lineHeight: 1.5,
              resize: "vertical",
              boxSizing:
                "border-box",
              outline: "none",
            }}
          />
        </section>

        {/* 儲存 */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            paddingBottom: 30,
          }}
        >
          <button
            type="submit"
            disabled={saving}
            style={{
              height: 42,
              padding: "0 18px",
              background:
                saving
                  ? "#9ca3af"
                  : "#111827",
              color: "#ffffff",
              border: "none",
              borderRadius: 10,
              cursor:
                saving
              ? "not-allowed"
                  : "pointer",
              fontSize: 14,
              fontWeight: 700,
              whiteSpace:
                "nowrap",
            }}
          >
            {saving
              ? "儲存中..."
              : "儲存修改"}
          </button>

          <Link
            href={`/expenses/${id}`}
            style={{
              height: 42,
              padding: "0 18px",
              display:
                "inline-flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              background:
                "#ffffff",
              color: "#374151",
              border:
                "1px solid #d1d5db",
              borderRadius: 10,
              textDecoration:
                "none",
              fontSize: 14,
              fontWeight: 600,
              whiteSpace:
                "nowrap",
            }}
          >
            取消
          </Link>
        </div>
      </form>
    </main>
  );
}
