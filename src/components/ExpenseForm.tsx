"use client";

import type {
  CSSProperties,
} from "react";

import {
  CATEGORY_OPTIONS,
} from "../lib/categories";

import {
  PAYMENT_METHODS,
  CARD_PAYMENT_METHODS,
} from "../lib/paymentMethods";

import {
  CURRENCIES,
} from "../lib/currencies";

export type Person = {
  id: number | string;
  name?: string | null;
  display_name?: string | null;
  user_name?: string | null;
};

export type CreditCard = {
  id: number | string;
  name: string;
};

export type Trip = {
  id: number | string;
  name?: string | null;
  title?: string | null;
  trip_name?: string | null;
};



type ExpenseFormProps = {
  item: string;
  setItem: (value: string) => void;

  amount: string;
  setAmount: (value: string) => void;

  date: string;
  setDate: (value: string) => void;

  majorCategory: string;
  setMajorCategory: (
    value: string
  ) => void;

  category: string;
  setCategory: (
    value: string
  ) => void;

  paymentMethod: string;
  setPaymentMethod: (
    value: string
  ) => void;

  cardName: string;
  setCardName: (
    value: string
  ) => void;

  currency: string;
  setCurrency: (
    value: string
  ) => void;

  expenseScope: string;
  setExpenseScope: (
    value: string
  ) => void;

  tripId: string;
  setTripId: (
    value: string
  ) => void;

  notes: string;
  setNotes: (
    value: string
  ) => void;

  paidBy: string;
  setPaidBy: (
    value: string
  ) => void;

  splitType: string;
  setSplitType: (
    value: string
  ) => void;

  selectedPeople: number[];

togglePerson: (
  personId: number
) => void;

customShares: Record<
  number,
  number
>;

  updateCustomShare: (
  personId: number,
  value: string
) => void;

  people: Person[];
  creditCards: CreditCard[];
  trips: Trip[];

  customTotal: number;

  getEqualShare: () => number;

  saving?: boolean;

  submitText?: string;

  onSubmit: (
    e: React.FormEvent
  ) => void;

  cancelContent?: React.ReactNode;
};

function getPersonName(
  person: Person
) {
  return (
    person.name ||
    person.display_name ||
    person.user_name ||
    `使用者 ${person.id}`
  );
}

function getTripName(
  trip: Trip
) {
  return (
    trip.name ||
    trip.title ||
    trip.trip_name ||
    `旅程 ${trip.id}`
  );
}

export default function ExpenseForm({
  item,
  setItem,

  amount,
  setAmount,

  date,
  setDate,

  majorCategory,
  setMajorCategory,

  category,
  setCategory,

  paymentMethod,
  setPaymentMethod,

  cardName,
  setCardName,

  currency,
  setCurrency,

expenseScope,
  setExpenseScope,

  tripId,
  setTripId,

  notes,
  setNotes,

  paidBy,
  setPaidBy,

  splitType,
  setSplitType,

  selectedPeople,
  togglePerson,

  customShares,
  updateCustomShare,

  people,
  creditCards,
  trips,

  customTotal,

  getEqualShare,

  saving = false,

  submitText = "儲存",

  onSubmit,

  cancelContent,
}: ExpenseFormProps) {
  const cardStyle: CSSProperties = {
    background: "#ffffff",
    border:
      "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
    boxShadow:
      "0 1px 3px rgba(0,0,0,0.06)",
  };

const labelStyle: CSSProperties = {
    display: "block",
    marginBottom: 6,
    fontSize: 14,
    fontWeight: 600,
    color: "#374151",
  };

const inputStyle: CSSProperties = {
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

const fieldStyle: CSSProperties = {
    marginBottom: 14,
  };

  return (
   <form
  onSubmit={(e) => {

    if (!item.trim()) {
  e.preventDefault();

  alert("請輸入支出項目");

  return;
}

if (
  !amount ||
  Number(amount) <= 0
) {
  e.preventDefault();

  alert(
    "請輸入大於 0 的支出金額"
  );

  return;
}

if (!date) {
  e.preventDefault();

  alert("請選擇日期");

  return;
}

    if (!majorCategory) {
  e.preventDefault();

  alert("請選擇大分類");

  return;
}

if (!category) {
  e.preventDefault();

  alert("請選擇小分類");

  return;
}

    if (!paymentMethod) {
  e.preventDefault();

  alert("請選擇付款方式");

  return;
}
    if (
      expenseScope === "trip" &&
      !tripId
    ) {
      e.preventDefault();

      alert(
        "旅遊支出請先選擇所屬旅程"
      );


      return;
    }

    if (
  CARD_PAYMENT_METHODS.includes(
    paymentMethod
  ) &&
  !cardName
) {
  e.preventDefault();

  alert(
    "這個付款方式請先選擇卡別"
  );

  return;
}

    if (
  selectedPeople.length > 0 &&
  !paidBy
) {
  e.preventDefault();

  alert(
    "有分攤時，請先選擇付款人"
  );

  return;
}

    if (
  selectedPeople.length === 0
) {
  e.preventDefault();

  alert(
    "請至少選擇一位分攤人"
  );

  return;
}

    if (
      splitType === "custom" &&
      Math.abs(
        Number(customTotal) -
          Number(amount)
      ) > 0.01
    ) {
      e.preventDefault();

      alert(
        `自訂分攤總額必須等於支出金額\n目前分攤：${Number(
          customTotal
        ).toFixed(2)}\n支出金額：${Number(
          amount
        ).toFixed(2)}`
      );

      return;
    }

    onSubmit(e);
  }}
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
  onChange={(e) => {
    const value =
      e.target.value;

    if (
      /^\d*(\.\d{0,2})?$/.test(
        value
      )
    ) {
      setAmount(value);
    }
  }}
  onBlur={() => {
    if (
      amount &&
      Number(amount) > 0
      ) {
      setAmount(
        Number(amount).toFixed(2)
      );
    }
  }}
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
    {currency &&
      !CURRENCIES.includes(
        currency
      ) && (
        <option value={currency}>
          {currency}（原資料）
        </option>
      )}

    {CURRENCIES.map(
      (currencyOption) => (
        <option
          key={currencyOption}
          value={currencyOption}
        >
          {currencyOption}
        </option>
      )
    )}
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

  <select
    value={majorCategory}
    onChange={(e) => {
      const newMajorCategory =
        e.target.value;

      setMajorCategory(
        newMajorCategory
      );

      setCategory("");
    }}
    style={inputStyle}
  >
    <option value="">
      請選擇大分類
    </option>

    {majorCategory &&
      !Object.prototype.hasOwnProperty.call(
        CATEGORY_OPTIONS,
        majorCategory
      ) && (
        <option value={majorCategory}>
          {majorCategory}（原資料）
        </option>
      )}

    {Object.keys(
      CATEGORY_OPTIONS
    ).map((major) => (
      <option
        key={major}
        value={major}
      >
        {major}
      </option>
    ))}
  </select>
</div>

          <div style={fieldStyle}>
  <label
    style={labelStyle}
  >
    小分類
  </label>

  <select
    value={category}
    onChange={(e) =>
      setCategory(
        e.target.value
      )
    }
    disabled={!majorCategory}
    style={{
      ...inputStyle,
      background:
        majorCategory
          ? "#ffffff"
          : "#f3f4f6",
      cursor:
        majorCategory
          ? "pointer"
          : "not-allowed",
    }}
    >
    <option value="">
      {majorCategory
        ? "請選擇小分類"
        : "請先選擇大分類"}
    </option>

    {category &&
      !(
        CATEGORY_OPTIONS[
          majorCategory
        ] ?? []
      ).includes(category) && (
        <option value={category}>
          {category}（原資料）
        </option>
      )}

    {(
      CATEGORY_OPTIONS[
        majorCategory
      ] ?? []
    ).map((subCategory) => (
      <option
        key={subCategory}
        value={subCategory}
      >
        {subCategory}
      </option>
    ))}
  </select>
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
    const newPaymentMethod =
      e.target.value;

    setPaymentMethod(
      newPaymentMethod
    );

    if (
      !CARD_PAYMENT_METHODS.includes(
        newPaymentMethod
      )
    ) {
      setCardName("");
    }
  }}
  style={inputStyle}
>
            <option value="">
    請選擇付款方式
  </option>

  {paymentMethod &&
    !PAYMENT_METHODS.includes(
      paymentMethod
    ) && (
      <option
        value={paymentMethod}
      >
        {paymentMethod}（原資料）
      </option>
    )}

            {PAYMENT_METHODS.map(
    (method) => (
      <option
        key={method}
        value={method}
      >
        {method}
      </option>
    )
  )}
</select>
        </div>

       {CARD_PAYMENT_METHODS.includes(
  paymentMethod
) && (
  <div style={fieldStyle}>
    <label style={labelStyle}>
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
  onChange={(e) => {
    const newScope =
      e.target.value;

    setExpenseScope(
      newScope
    );

    if (
      newScope !== "trip"
    ) {
      setTripId("");
    }
  }}
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

      
          {expenseScope === "trip" && (
  <div style={fieldStyle}>
    <label style={labelStyle}>
      所屬旅程
    </label>

    <select
      value={tripId}
      onChange={(e) =>
        setTripId(e.target.value)
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
  <label style={labelStyle}>
    分攤方式
  </label>

  <select
    value={splitType}
    onChange={(e) => {
      const newSplitType =
        e.target.value;
      setSplitType(
        newSplitType
      );
    }}
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
    marginTop: 16,
    marginBottom: 10,
    fontSize: 14,
    fontWeight: 600,
    color: "#374151",
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
          {people.map((person) => {
                const personId =
  Number(person.id);

const checked =
  selectedPeople.includes(
    personId
  );

                const isAutoSharePerson =
                  splitType ===
                    "custom" &&
                  selectedPeople.length >=
                    3 &&
                  personId ===
                    selectedPeople[
                      selectedPeople.length -
                  1
                    ];

                return (
                  <div
                    key={person.id}
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
                          max={
                            Number(
                              amount
                            ) ||
                            undefined
                          }
                          step="0.01"
                          value={
                            customShares[
                              personId
                            ] ?? ""
                          }
                          readOnly={
                            isAutoSharePerson
                            }
                          onChange={(e) => {
  const value =
    e.target.value;

  if (
    !isAutoSharePerson &&
    /^\d*(\.\d{0,2})?$/.test(
      value
    )
  ) {
    updateCustomShare(
      personId,
      value
       );
  }
}}
                          placeholder={
                            isAutoSharePerson
                              ? "自動計算"
                              : "金額"
                            }
                          style={{
                            width: 120,
                            height: 38,
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
                            background:
                              isAutoSharePerson
                                ? "#f3f4f6"
                                : "#ffffff",
                            color:
                              "#111827",
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
            : submitText}
        </button>

        {cancelContent}
      </div>
    </form>
  );
}
