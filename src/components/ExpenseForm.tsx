"use client";

import {
  useEffect,
  useState,
} from "react";

import type {
  CSSProperties,
} from "react";

import { supabase } from "../lib/supabase";

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

// =========================================
// PaymentMethods 資料表型別
// =========================================
type ManagedPaymentMethod = {
  id: number;
  name: string;
  payment_type: string;
  linked_type: string | null;
  linked_id: string | null;
  is_active: boolean;
};

export type Trip = {
  id: number | string;
  name?: string | null;
  title?: string | null;
  trip_name?: string | null;
};



type ExpenseFormProps = {
  // =========================================================
  // 旅程頁面進入狀態
  // true：從旅程頁進入，隱藏類型並鎖定旅程
  // false：一般新增／編輯花費
  // =========================================================
  openedFromTrip?: boolean;

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

  paymentMethodId: string;
setPaymentMethodId: (
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
  // =========================================================
  // 是否從旅程頁面進入
  // =========================================================
  openedFromTrip = false,

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

  paymentMethodId,
setPaymentMethodId,

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
  // =========================================
// 01. 讀取金融卡與電子支付
// =========================================
  const [
  managedMethods,
  setManagedMethods,
] = useState<ManagedPaymentMethod[]>([]);


  const [
  paymentLoading,
  setPaymentLoading,
] = useState(true);

useEffect(() => {
  let active = true;

  async function loadPaymentMethods() {
    setPaymentLoading(true);

    const { data: auth } =
      await supabase.auth.getUser();

    if (!auth.user) {
      if (active) setPaymentLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("PaymentMethods")
      .select(
        "id, name, payment_type, linked_type, linked_id, is_active"
        )
      .eq("user_id", auth.user.id)
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error(
        "讀取付款工具失敗:",
        error
      );
    }

     if (active) {
      setManagedMethods(
        (data ?? []) as ManagedPaymentMethod[]
      );
      setPaymentLoading(false);
    }
  }

  void loadPaymentMethods();

  return () => {
    active = false;
  };
}, []);

// 根據付款方式取得已建立的工具
const availableMethods = managedMethods.filter(
  (method) => {
    if (paymentMethod === "金融卡") {
      return method.payment_type === "debit_card";
    }

    if (paymentMethod === "Apple Pay") {
      return method.payment_type === "apple_pay";
    }

    if (paymentMethod === "Google Pay") {
      return method.payment_type === "google_pay";
    }
    return false;
  }
);

// 選擇電子支付後，取得實際扣款卡片
function selectManagedMethod(value: string) {
  setPaymentMethodId(value);

  const selected = managedMethods.find(
    (method) => String(method.id) === value
  );

  if (
    selected?.linked_type === "credit_card" &&
    selected.linked_id
  ) {
    const card = creditCards.find(

      (card) =>
        String(card.id) === selected.linked_id
    );

    setCardName(card?.name ?? "");
  } else {
    // 金融卡不能歸入信用卡帳單
    setCardName("");
  }
}
  
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

    // =========================================
// 05. 付款工具驗證
// =========================================

// 信用卡必須選擇卡別
    if (
  paymentMethod === "信用卡" &&
  !cardName
) {
  e.preventDefault();
  alert("請選擇信用卡");
  return;
}

    // 金融卡及電子支付必須選擇已建立工具
if (
  ["金融卡", "Apple Pay", "Google Pay"].includes(
    paymentMethod
  ) &&
  !paymentMethodId
) {
  e.preventDefault();
  alert("請選擇已建立的付款工具");
  return;
}

    // 確認綁定的信用卡存在
const selectedManagedMethod =
  managedMethods.find(
    (method) =>
      String(method.id) === paymentMethodId
  );

    if (
  selectedManagedMethod?.linked_type ===
    "credit_card" &&
  !cardName
) {
  e.preventDefault();
  alert("找不到綁定的信用卡，請檢查付款方式管理");
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

        {/* =========================================
    02. 付款方式
    ========================================= */}
        <div style={fieldStyle}>
  <label style={labelStyle}>
    付款方式
  </label>

  <select
    value={paymentMethod}
    onChange={(e) => {
      const value = e.target.value;

      setPaymentMethod(value);
      setPaymentMethodId("");
      setCardName("");
    }}
    style={inputStyle}
  >
    <option value="">
      請選擇付款方式
    </option>

    {/* 保留舊資料相容性 */}
    {paymentMethod &&
      ![
        ...PAYMENT_METHODS,
        "信用卡",
        "金融卡",
        "Apple Pay",
        "Google Pay",
        "現金",
        "其他",
      ].includes(paymentMethod) && (
        <option value={paymentMethod}>
          {paymentMethod}（原資料）
        </option>
        )}

    {Array.from(
      new Set([
        ...PAYMENT_METHODS,
        "信用卡",
        "金融卡",
        "Apple Pay",
        "Google Pay",
        "現金",
        "其他",
      ])
    ).map((method) => (
    <option
        key={method}
        value={method}
      >
        {method}
      </option>
    ))}
  </select>
</div>

      {/* =========================================
    信用卡選擇
    編輯時保留原本信用卡
   ========================================= */}

{paymentMethod === "信用卡" && (
  <div style={fieldStyle}>
    <label style={labelStyle}>
      選擇信用卡
    </label>

    <select
      value={cardName || ""}
      onChange={(e) => {
        setCardName(e.target.value);
      }}
      style={inputStyle}
    >
      <option value="">
        請選擇信用卡
      </option>

      {/* 保留舊信用卡名稱 */}
      {cardName &&
        !creditCards.some(
          (card) =>
            card.name.trim() === cardName.trim()
        ) && (
          <option value={cardName}>
            {cardName}（原資料）
          </option>
        )}

      {/* 已建立的信用卡 */}
      {creditCards.map((card) => (
        <option
          key={String(card.id)}
          value={card.name}
        >
          {card.name}
        </option>
      ))}
    </select>
  </div>
)}
        

        {/* =========================================
    04. 金融卡 / Apple Pay / Google Pay
    ========================================= */}

        {[
  "金融卡",
  "Apple Pay",
  "Google Pay",
].includes(paymentMethod) && (
  <div style={fieldStyle}>
    <label style={labelStyle}>
      {paymentMethod === "金融卡"
        ? "選擇金融卡"
        : `選擇 ${paymentMethod} 付款工具`}
    </label>

    <select
      value={paymentMethodId}
      onChange={(e) =>
        selectManagedMethod(e.target.value)
      }
      style={inputStyle}
      disabled={paymentLoading}
    >
       <option value="">
        {paymentLoading
          ? "正在載入..."
          : "請選擇已建立的付款工具"}
      </option>

      {availableMethods.map((method) => (
        <option
          key={method.id}
          value={String(method.id)}
        >
          {method.name}
        </option>
      ))}
    </select>

    {!paymentLoading &&
      availableMethods.length === 0 && (
        <p
          style={{
            fontSize: 12,
            color: "#b45309",
            marginTop: 7,
          }}
        >
          尚未建立此類付款工具，請先至
          「付款方式管理」新增。
        </p>
      )}

    {/* 顯示實際扣款卡片 */}
    {paymentMethodId &&
      cardName && (
        <p
          style={{
            fontSize: 12,
            color: "#047857",
            marginTop: 8,
          }}
        >
          ✓ 實際扣款信用卡：{cardName}
          </p>
      )}

    {paymentMethodId &&
      !cardName && (
        <p
          style={{
            fontSize: 12,
            color: "#64748b",
            marginTop: 8,
            }}
        >
          此付款工具沒有指定信用卡，
          不會歸入信用卡帳單。
        </p>
      )}
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

{/* =========================================================
    支出類型
    - 一般新增花費時顯示
    - 從旅程頁進來時隱藏
   ========================================================= */}
     {!openedFromTrip && (
  <div
    style={{
      marginBottom: 16,
    }}
  >
    <div
      style={{
        marginBottom: 6,
        fontSize: 14,
        fontWeight: 600,
        color: "#374151",
      }}
    >
      類型
    </div>

    <select
      value={expenseScope}
      onChange={(e) =>
        setExpenseScope(
          e.target.value
        )
      }
      style={{
        width: "100%",
        height: 42,
        padding: "0 12px",
        border:
          "1px solid #d1d5db",
        borderRadius: 10,
        background: "#ffffff",
        color: "#111827",
        boxSizing: "border-box",
      }}
    >
      <option value="daily">
        日常
        </option>

      <option value="trip">
        旅程
      </option>
    </select>
  </div>
)}

     {/* =========================================================
    所屬旅程
    - 旅程支出時顯示
    - 從旅程頁進來時鎖定
   ========================================================= */}
     {expenseScope === "trip" && (
  <div
    style={{
      marginBottom: 16,
    }}
  >
    <div
      style={{
        marginBottom: 6,
        fontSize: 14,
        fontWeight: 600,
        color: "#374151",
        }}
    >
      所屬旅程
    </div>

    <select
      value={tripId}
      onChange={(e) =>
        setTripId(e.target.value)
      }
      disabled={openedFromTrip}
      style={{
        width: "100%",
        height: 42,
        padding: "0 12px",
        border:
          "1px solid #d1d5db",
        borderRadius: 10,
        background:
          openedFromTrip
            ? "#f9fafb"
            : "#ffffff",
        color: "#111827",
        boxSizing: "border-box",
        cursor:
          openedFromTrip
            ? "not-allowed"
            : "pointer",
      }}
    >
      <option value="">
        請選擇旅程
        </option>

      {trips.map((trip) => (
        <option
          key={trip.id}
          value={trip.id}
        >
          {trip.name}
        </option>
      ))}
    </select>
  </div>
)}

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
