"use client";

// ======================================================
// 付款方式管理
// src/app/cards/page.tsx
//
// 01. Imports / Types
// 02. 設定與樣式
// 03. 狀態與資料讀取
// 04. 新增 / 修改 / 停用
// 05. 分類與清單
// 06. 新增編輯表單
// 07. 頁面樣式
// ======================================================

// ==================== 01. Imports ====================

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import AppNavigation from "../../components/AppNavigation";

type MethodType =
  | "credit_card"
  | "debit_card"
  | "apple_pay"
  | "google_pay"
  | "other";

type CreditCard = {
  id: number;
  user_id: string;
  name: string;
  statement_day: number | null;
  due_day: number | null;
  is_active: boolean;
};

type PaymentMethod = {
  id: number;
  user_id: string;
  name: string;
  payment_type: Exclude<MethodType, "credit_card">;
  bank_name: string | null;
  currency: string | null;
  last_four: string | null;
  linked_type: string | null;
  linked_id: string | null;
  notes: string | null;
  is_active: boolean;
};

type DisplayItem = {
  key: string;
  id: number;
  type: MethodType;
  name: string;
  description: string;
  is_active: boolean;
};


const LABELS: Record<MethodType, string> = {
  credit_card: "信用卡",
  debit_card: "金融卡",
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  other: "其他",
};

const TYPES: MethodType[] = [
  "credit_card",
  "debit_card",
  "apple_pay",
  "google_pay",
  "other",
];

// ==================== 02. 樣式 ====================

const inputStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  padding: "11px 12px",
  border: "1px solid #dbe2ea",
  borderRadius: 10,
  background: "#fff",
  color: "#172033",
  fontSize: 14,
};

const primaryButton: React.CSSProperties = {
  border: 0,
  borderRadius: 11,
  padding: "11px 18px",
  background: "#4f46e5",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};


const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 7,
  fontSize: 13,
  fontWeight: 600,
  color: "#475569",
};

function blankForm(type: MethodType = "credit_card") {
  return {
    type,
    name: "",
    statement_day: "",
    due_day: "",
    bank_name: "",
    currency: "USD",
    last_four: "",
    linked_type: "",
    linked_id: "",
    notes: "",
  };
}

// ==================== 03. 狀態與資料讀取 ====================

export default function CardsPage() {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

const [filter, setFilter] =
    useState<"all" | MethodType>("all");

  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [showForm, setShowForm] = useState(false);

const [editing, setEditing] = useState<{
    id: number;
    type: MethodType;
  } | null>(null);

  const [form, setForm] = useState(blankForm());


const loadData = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const { data: auth, error: authError } =
        await supabase.auth.getUser();

  if (authError) throw authError;
      if (!auth.user) throw new Error("請先登入");

      const uid = auth.user.id;
      setUserId(uid);

      const [cardResult, methodResult] = await Promise.all([
        supabase
          .from("CreditCards")
          .select("*")
          .eq("user_id", uid)
          .order("name"),

        supabase
          .from("PaymentMethods")
          .select("*")
          .eq("user_id", uid)
          .order("name"),
      ]);

  if (cardResult.error) throw cardResult.error;
      if (methodResult.error) throw methodResult.error;

      setCards((cardResult.data ?? []) as CreditCard[]);
      setMethods(
        (methodResult.data ?? []) as PaymentMethod[]
        );
    } catch (error) {
  console.error(
    "付款方式讀取錯誤：",
    error
  );

  const errorText =
    error instanceof Error
      ? error.message
      : JSON.stringify(error, null, 2);

  setMessage(
    `讀取付款方式失敗：${errorText}`
  );

} finally {
  setLoading(false);
}
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

// ==================== 04. 新增 / 修改 / 停用 ====================

function openNew() {
    setEditing(null);
    setForm(blankForm());
    setShowForm(true);
    setMessage("");
  }


function openEdit(item: DisplayItem) {
    setEditing({ id: item.id, type: item.type });

    if (item.type === "credit_card") {
      const card = cards.find(c => c.id === item.id);
      if (!card) return;

  setForm({
        ...blankForm("credit_card"),
        name: card.name,
        statement_day: String(card.statement_day ?? ""),
        due_day: String(card.due_day ?? ""),
      });
    } else {
      const method = methods.find(m => m.id === item.id);
      if (!method) return;

      setForm({
        type: method.payment_type,
        name: method.name,
        statement_day: "",
        due_day: "",
        bank_name: method.bank_name ?? "",
        currency: method.currency ?? "USD",
        last_four: method.last_four ?? "",
        linked_type: method.linked_type ?? "",
        linked_id: method.linked_id ?? "",
        notes: method.notes ?? "",
      });
    }

    setShowForm(true);
  }

async function save() {
    if (saving) return;

    if (!form.name.trim()) {
      alert("請輸入名稱");
      return;
    }

    if (!userId) {
      alert("請先登入");
      return;
    }


  // 電子支付必須選擇實際扣款卡片
    if (
      (form.type === "apple_pay" ||
        form.type === "google_pay") &&
      !form.linked_id
    ) {
      alert("請選擇綁定的信用卡或金融卡");
      return;
    }

  const day = (value: string) =>
      value === "" ? null : Number(value);

    if (form.type === "credit_card") {
      for (const value of [
        form.statement_day,
        form.due_day,
      ]) {
        if (
          value !== "" &&
          (!Number.isInteger(Number(value)) ||
            Number(value) < 1 ||
            Number(value) > 31)
        ) {
          alert("日期請填入 1～31");
          return;
        }
      }
    }

  if (
      form.last_four &&
      !/^\d{4}$/.test(form.last_four)
    ) {
      alert("卡片末四碼請輸入四位數字");
      return;
    }

    setSaving(true);

  try {
      if (form.type === "credit_card") {
        const payload = {
          name: form.name.trim(),
          statement_day: day(form.statement_day),
          due_day: day(form.due_day),
        };

    const result = editing
          ? await supabase
              .from("CreditCards")
              .update(payload)
              .eq("id", editing.id)
              .eq("user_id", userId)
          : await supabase
        .from("CreditCards")
              .insert({
                ...payload,
                user_id: userId,
                is_active: true,
              });


    if (result.error) throw result.error;
      } else {
        const payload = {
          name: form.name.trim(),
          payment_type: form.type,
          bank_name: form.bank_name.trim() || null,
          currency: form.currency || "USD",
          last_four: form.last_four || null,
          linked_type: form.linked_type || null,
          linked_id: form.linked_id || null,
          notes: form.notes.trim() || null,
        };

    const result = editing
          ? await supabase
              .from("PaymentMethods")
              .update(payload)
              .eq("id", editing.id)
              .eq("user_id", userId)
      : await supabase
              .from("PaymentMethods")
              .insert({
                ...payload,
                user_id: userId,
                is_active: true,
              });


    if (result.error) throw result.error;
      }

      setShowForm(false);
      setEditing(null);
      await loadData();
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "儲存失敗"
        );
    } finally {
      setSaving(false);
    }
  }

async function toggleActive(item: DisplayItem) {
    if (!userId) return;

    const table =
      item.type === "credit_card"
        ? "CreditCards"
        : "PaymentMethods";

  const { error } = await supabase
      .from(table)
      .update({ is_active: !item.is_active })
      .eq("id", item.id)
      .eq("user_id", userId);

  if (error) {
      alert(error.message);
      return;
    }

    await loadData();
  }

// ==================== 05. 分類與清單 ====================

const items = useMemo<DisplayItem[]>(() => {
    const creditItems: DisplayItem[] = cards.map(card => ({
      key: `credit-${card.id}`,
      id: card.id,
      type: "credit_card",
      name: card.name,
      description:
        `結帳日 ${card.statement_day ?? "未設定"} · ` +
        `繳款日 ${card.due_day ?? "未設定"}`,
      is_active: card.is_active !== false,
    }));

                                     const methodItems: DisplayItem[] = methods.map(m => {
      let description = [
        m.bank_name,
        m.currency,
        m.last_four ? `末四碼 ${m.last_four}` : "",
      ].filter(Boolean).join(" · ");

                                                                                    if (
        (m.payment_type === "apple_pay" ||
          m.payment_type === "google_pay") &&
        m.linked_id
      ) {
        const linkedName =
          m.linked_type === "credit_card"
            ? cards.find(c =>
                String(c.id) === m.linked_id
              )?.name
            : methods.find(c =>
              String(c.id) === m.linked_id &&
                c.payment_type === "debit_card"
              )?.name;

        description = `綁定 ${linkedName ?? "原始卡片"}`;
      }

                                                                                    return {
        key: `method-${m.id}`,
        id: m.id,
        type: m.payment_type,
        name: m.name,
        description: description || "未設定詳細資訊",
                                                                                      is_active: m.is_active !== false,
      };
    });

    return [...creditItems, ...methodItems];
  }, [cards, methods]);

const filteredItems = items.filter(item => {
    if (filter !== "all" && item.type !== filter) {
      return false;
    }

    if (!showInactive && !item.is_active) {
      return false;
      }

    const keyword = search.trim().toLowerCase();

    return (
      !keyword ||
      `${item.name} ${item.description} ${LABELS[item.type]}`
        .toLowerCase()
        .includes(keyword)
      );
  });

  const linkedOptions = [
    ...cards.filter(c => c.is_active !== false).map(c => ({
      value: `credit_card:${c.id}`,
      label: `信用卡 · ${c.name}`,
      })),
    ...methods
      .filter(m =>
        m.payment_type === "debit_card" &&
        m.is_active !== false
      )
     .map(m => ({
        value: `debit_card:${m.id}`,
        label: `金融卡 · ${m.name}`,
      })),
  ];

// ==================== 06. 頁面介面 ====================


return (
  <main className="page">

    <AppNavigation />   

    
{/* =========================================
    付款方式管理：統一頁面標題區
   ========================================= */}

<header
  className="header"
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
    boxSizing: "border-box",
    width: "100%",
  }}
>
  {/* 左側：標題與說明 */}
  <div
    style={{
      flex: "1 1 220px",
      minWidth: 0,
    }}
  >
    <h1
      style={{
        margin: 0,
        fontSize: "clamp(24px, 4vw, 30px)",
        fontWeight: 800,
        lineHeight: 1.3,
        color: "#49392f",
      }}
    >
      付款方式管理
    </h1>

    <p
      style={{
        margin: "8px 0 0",
        fontSize: 14,
        lineHeight: 1.6,
        color: "#927f70",
      }}
    >
      信用卡、金融卡與電子支付集中管理
    </p>
  </div>

  {/* 右側：新增付款方式 */}
  <button
    type="button"
    onClick={openNew}
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      height: 44,
      padding: "0 20px",
      boxSizing: "border-box",
      background: "#826349",
      color: "#ffffff",
      border: "1px solid #826349",
      borderRadius: 12,
      fontSize: 14,
      fontWeight: 700,
      whiteSpace: "nowrap",
      flexShrink: 0,
      cursor: "pointer",
    }}
  >
    ＋ 新增付款方式
  </button>
</header>


      
{/* =========================================
    付款方式管理：統計摘要區
    統一米白＋棕色主題
   ========================================= */}

<section
  className="overview"
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 16,
    padding: "20px 24px",
    marginBottom: 24,
    background: "#f2ebe2",
    border: "1px solid #e6dcd0",
    borderRadius: 16,
    boxSizing: "border-box",
    width: "100%",
  }}
>
  {/* 付款工具總數 */}
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 8,
      minWidth: 0,
    }}
  >
    <span
      style={{
        fontSize: 13,
        fontWeight: 600,
        color: "#927f70",
      }}
    >
      付款工具
    </span>

    <strong
      style={{
        fontSize: 24,
        fontWeight: 800,
        color: "#49392f",
      }}
    >
      {items.length}
    </strong>
  </div>

  {/* 啟用中的付款工具 */}
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 8,
      minWidth: 0,
    }}
  >
    <span
      style={{
        fontSize: 13,
        fontWeight: 600,
        color: "#927f70",
      }}
    >
      啟用中
    </span>

    <strong
      style={{
        fontSize: 24,
        fontWeight: 800,
        color: "#49392f",
      }}
    >
      {items.filter((i) => i.is_active).length}
    </strong>
  </div>

  {/* 已停用的付款工具 */}
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 8,
      minWidth: 0,
    }}
  >
    <span
      style={{
        fontSize: 13,
        fontWeight: 600,
        color: "#927f70",
      }}
    >
      已停用
    </span>

    <strong
      style={{
        fontSize: 24,
        fontWeight: 800,
        color: "#49392f",
      }}
    >
      {items.filter((i) => !i.is_active).length}
    </strong>
  </div>
</section>


      
{/* =========================================
    付款方式管理：分類與搜尋篩選
    統一米白＋棕色主題
   ========================================= */}

<section
  className="toolbar"
  style={{
    display: "grid",
    gap: 16,
    padding: "20px 24px",
    marginBottom: 24,
    background: "#faf7f2",
    border: "1px solid #e6dcd0",
    borderRadius: 16,
    boxSizing: "border-box",
    width: "100%",
  }}
>
  {/* 分類篩選 */}
  <nav
    className="tabs"
    style={{
      display: "flex",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 10,
    }}
  >
    {(["all", ...TYPES] as const).map((type) => {
      const selected = filter === type;

      return (
        <button
          key={type}
          type="button"
          className={selected ? "active" : ""}
          aria-pressed={selected}
          onClick={() => setFilter(type)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 40,
            padding: "0 16px",
            background: selected ? "#826349" : "#ffffff",
            color: selected ? "#ffffff" : "#674b39",
            border: selected
              ? "1px solid #826349"
              : "1px solid #d8c6b4",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 700,
            whiteSpace: "nowrap",
            cursor: "pointer",
            boxSizing: "border-box",
          }}
        >
          {type === "all" ? "全部" : LABELS[type]}
        </button>
      );
    })}
  </nav>

  {/* 搜尋及顯示停用 */}
  <div
    className="searchRow"
    style={{
      display: "flex",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 14,
    }}
  >
    <input
      type="search"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="搜尋名稱、銀行、末四碼…"
      style={{
        ...inputStyle,
        flex: "1 1 240px",
        minWidth: 0,
        width: "100%",
        height: 44,
        padding: "0 14px",
        border: "1px solid #d8c6b4",
        borderRadius: 10,
        background: "#ffffff",
        color: "#49392f",
        fontSize: 14,
        boxSizing: "border-box",
      }}
    />

    <label
      className="inactiveToggle"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        color: "#674b39",
        fontSize: 14,
        fontWeight: 600,
        whiteSpace: "nowrap",
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={showInactive}
        onChange={(e) => setShowInactive(e.target.checked)}
        style={{
          width: 17,
          height: 17,
          accentColor: "#826349",
          cursor: "pointer",
        }}
      />
      顯示停用
    </label>
  </div>
</section>


      <section className="list">
        {loading ? (
          <div className="empty">正在載入…</div>
        ) : message ? (
          <div className="empty">{message}</div>
      ) : filteredItems.length === 0 ? (
          <div className="empty">目前沒有符合條件的付款方式</div>
        ) : (
          filteredItems.map(item => (
            <div className="item" key={item.key}>

              <div className="itemIcon">
                {item.type === "credit_card" ? "💳" :
                 item.type === "debit_card" ? "🏦" :
                  item.type === "apple_pay" ? "📱" :
                 item.type === "google_pay" ? "📲" : "💰"}
              </div>

              <div className="itemInfo">
  {/* =====================================
      點擊付款工具名稱 → 獨立明細頁
     ===================================== */}

  <Link
    href={
      item.type === "credit_card"
        ? `/cards/credit-${item.id}`
        : `/cards/method-${item.id}`
    }
    style={{
  color: "#49392f",
  textDecoration: "none",
  fontSize: 14,
  fontWeight: 700,
}}
  >
    {item.name} ↗
  </Link>

  <span>
    {LABELS[item.type]} · {item.description}
  </span>
                
                {!item.is_active && (
              <small>已停用</small>
                )}
              </div>

              
<div
  className="itemActions"
  style={{
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  }}
>
  <button
    type="button"
    onClick={() => openEdit(item)}
    style={{
      width: 80,
      height: 34,
      padding: "0 8px",
      border: "1px solid #d8c6b4",
      borderRadius: 8,
      background: "#ffffff",
      color: "#674b39",
      fontSize: 12,
      fontWeight: 600,
      whiteSpace: "nowrap",
      boxSizing: "border-box",
      cursor: "pointer",
    }}
  >
    編輯
  </button>

  <button
    type="button"
    onClick={() => void toggleActive(item)}
    style={{
      width: 80,
      height: 34,
      padding: "0 8px",
      border: "1px solid #d8c6b4",
      borderRadius: 8,
      background: item.is_active
        ? "#f2ebe2"
        : "#ffffff",
      color: "#674b39",
      fontSize: 12,
      fontWeight: 600,
      whiteSpace: "nowrap",
      boxSizing: "border-box",
      cursor: "pointer",
    }}
  >
    {item.is_active ? "停用" : "啟用"}
  </button>
</div>

            </div>
          ))
        )}
      </section>

      {/* 新增 / 編輯表單 */}
      {showForm && (
        <div className="modalBackdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="付款方式編輯"
          >
            <div className="modalHeader">
              <h2>
                {editing ? "編輯付款方式" : "新增付款方式"}
              </h2>
              <button onClick={() => setShowForm(false)}>
                ✕
              </button>
            </div>
            <div className="formFields">

              <label style={labelStyle}>
                類型
                <select
                  style={inputStyle}
                  value={form.type}
                  disabled={Boolean(editing)}
                  onChange={e => setForm(
                    blankForm(e.target.value as MethodType)
                  )}
                  >
                  {TYPES.map(type => (
                    <option key={type} value={type}>
                      {LABELS[type]}
                    </option>
                  ))}
                </select>
              </label>

              <label style={labelStyle}>
                名稱
                <input
                  style={inputStyle}
                  value={form.name}
                  onChange={e => setForm({
                    ...form,
                    name: e.target.value,
                  })}
                  placeholder="例如 Chase Sapphire Preferred"
                />
              </label>

              {form.type === "credit_card" && (
                <div className="twoColumns">
                  <label style={labelStyle}>
                    結帳日（1～31）
                    <input
                      type="number"
                      min="1"
                      max="31"
                      style={inputStyle}
                      value={form.statement_day}
                      onChange={e => setForm({
                        ...form,
                        statement_day: e.target.value,
                      })}
                    />
                  </label>

                  <label style={labelStyle}>
                    繳款日（1～31）
                    <input
                      type="number"
                      min="1"
                      max="31"
                      style={inputStyle}
                      value={form.due_day}
                      onChange={e => setForm({
                        ...form,
                        due_day: e.target.value,
                      })}
                    />
                  </label>
                  </div>
              )}

              {form.type === "debit_card" && (
                <>
                  <label style={labelStyle}>
                    銀行名稱
                    <input
                      style={inputStyle}
                      value={form.bank_name}
                      onChange={e => setForm({
                        ...form,
                        bank_name: e.target.value,
                      })}
                    />
                  </label>

                  <div className="twoColumns">
                    <label style={labelStyle}>
                      幣別
                      <select
                        style={inputStyle}
                        value={form.currency}
                        onChange={e => setForm({
                          ...form,
                          currency: e.target.value,
                        })}
                      >
                        {["USD", "TWD", "JPY", "EUR", "KRW",
                          "GBP", "CAD", "其他"].map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </label>

                    <label style={labelStyle}>
                      卡片末四碼
                      <input
                        style={inputStyle}
                        maxLength={4}
                        value={form.last_four}
                        onChange={e => setForm({
                          ...form,
                          last_four: e.target.value.replace(/\D/g, ""),
                        })}
                      />
                    </label>
                  </div>
                </>
              )}

            {(form.type === "apple_pay" ||
                form.type === "google_pay") && (
                <label style={labelStyle}>
                  綁定實際扣款卡片
                  <select
                    style={inputStyle}
                    value={
                      form.linked_type && form.linked_id
                        ? `${form.linked_type}:${form.linked_id}`
                        : ""
                    }
                    onChange={e => {
                      const [linkedType, linkedId] =
                        e.target.value.split(":");

                      setForm({
                        ...form,
                        linked_type: linkedType || "",
                        linked_id: linkedId || "",
                      });
                    }}
                  >
              <option value="">請選擇</option>
                    {linkedOptions.map(option => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
          <label style={labelStyle}>
                備註（選填）
                <textarea
                  style={{ ...inputStyle, minHeight: 72 }}
                  value={form.notes}
                  onChange={e => setForm({
                    ...form,
                    notes: e.target.value,
                  })}
                />
              </label>

          </div>

            <div className="formActions">
              <button
                className="cancelButton"
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                取消
              </button>

              <button
                style={primaryButton}
                disabled={saving}
                onClick={() => void save()}
      >
                {saving ? "儲存中…" : "儲存"}
              </button>
            </div>

          </section>
        </div>
      )}

{/* ==================== 07. 排版 ==================== */}

<style jsx>{`
        .page {
          max-width: 1050px;
          margin: 0 auto;
          padding: 26px 18px 65px;
          color: #172033;
        }
        .homeLink {
          display: inline-block;
          margin-bottom: 22px;
          text-decoration: none;
          color: #64748b;
          font-size: 14px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          margin-bottom: 22px;
        }
        h1 {
          font-size: 28px;
          margin: 0;
        }
        .header p {
          color: #64748b;
          margin: 7px 0 0;
          font-size: 13px;
        }
        .overview {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          background: #f1f5f9;
          padding: 17px;
          border-radius: 13px;
          gap: 15px;
          margin-bottom: 18px;
        }
        .overview div {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .overview span {
          font-size: 12px;
          color: #64748b;
        }
        .overview strong {
          font-size: 22px;
        }
        .toolbar {
          margin-bottom: 16px;
        }
        .tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 14px;
        }
        .tabs button {
          border: 1px solid #dbe2ea;
          background: #fff;
          padding: 9px 13px;
          border-radius: 9px;
          color: #475569;
          cursor: pointer;
        }
        .tabs button.active {
          color: #4338ca;
          background: #eef2ff;
          border-color: #c7d2fe;
          font-weight: 700;
        }
        .searchRow {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .inactiveToggle {
          white-space: nowrap;
          font-size: 13px;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .list {
          border: 1px solid #e2e8f0;
          border-radius: 13px;
          overflow: hidden;
          background: #fff;
        }
        .item {
          padding: 13px 15px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid #eef2f6;
        }
        .item:last-child {
          border-bottom: 0;
        }
        .itemIcon {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: #f1f5f9;
          flex-shrink: 0;
        }
        .itemInfo {
          display: flex;
          flex-direction: column;
          gap: 5px;
          flex: 1;
          min-width: 0;
        }
        .itemInfo strong {
          font-size: 14px;
          overflow-wrap: anywhere;
        }
        .itemInfo span {
          font-size: 12px;
          color: #64748b;
        }
        .itemInfo small {
          color: #dc2626;
        }
        .itemActions {
          display: flex;
          gap: 7px;
        }
        .itemActions button, .cancelButton {
          border: 1px solid #dbe2ea;
          border-radius: 8px;
          background: #fff;
          padding: 8px 11px;
          color: #475569;
          cursor: pointer;
        }
        .empty {
          padding: 48px 15px;
          text-align: center;
          color: #64748b;
          }
        .modalBackdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(15,23,42,.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 15px;
        }
        .modal {
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          padding: 22px;
          border-radius: 16px;
          background: #fff;
          box-sizing: border-box;
        }
        .modalHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 22px;
        }
        .modalHeader h2 {
          margin: 0;
          font-size: 20px;
        }
        .modalHeader button {
          border: 0;
          background: transparent;
          font-size: 20px;
          cursor: pointer;
        }
        .formFields {
          display: grid;
          gap: 16px;
        }
        .twoColumns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .formActions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 24px;
        }
        @media(max-width:600px) {
          .page { padding: 18px 12px 60px; }
          h1 { font-size: 23px; }
          .overview { padding: 12px; }
          .item { padding: 12px 10px; gap: 8px; }
          .itemActions { flex-direction: column; }
          .itemActions button { font-size: 12px; }
          .itemIcon { width: 32px; height: 32px; }
          .searchRow { flex-wrap: wrap; }
          .modal { padding: 17px; }
          }
      `}</style>
    </main>
  );
}
