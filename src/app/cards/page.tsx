"use client";

// =========================================
// 01. Import
// =========================================

import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";

import Link from "next/link";
import { supabase } from "@/lib/supabase";

// =========================================
// 02. TypeScript 型別
// =========================================

type CreditCard = {
  id: number;
  name: string;
  is_active: boolean;
  user_id: string;
  created_at: string | null;
  statement_day: number | null;
  due_day: number | null;
  is_paid: boolean | null;
  due_month_offset: number | null;
};


type CardForm = {
  name: string;
  statement_day: string;
  due_day: string;
  due_month_offset: string;
};

type Notice = {
  type: "success" | "error";
  text: string;
};

// =========================================
// 03. 預設表單
// =========================================

const EMPTY_FORM: CardForm = {
  name: "",
  statement_day: "",
  due_day: "",
  due_month_offset: "1",
};

// =========================================
// 04. 共用顏色
// =========================================

const COLOR = {
  background: "#f5f7fb",
  white: "#ffffff",
  text: "#111827",
  muted: "#6b7280",
  border: "#e5e7eb",

  blue: "#2563eb",
  blueLight: "#eff6ff",

  green: "#15803d",
  greenLight: "#f0fdf4",
};

  // =========================================
// 05. 共用樣式
// =========================================

const panelStyle: CSSProperties = {
  background: COLOR.white,
  border: `1px solid ${COLOR.border}`,
  borderRadius: 16,
  padding: 20,
  marginBottom: 20,
  boxShadow: "0 2px 12px rgba(17,24,39,0.03)",
};

const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: 7,
  color: "#374151",
  fontSize: 13,
  fontWeight: 600,
};

const inputStyle: CSSProperties = {
  width: "100%",
  minHeight: 46,
  padding: "11px 12px",
  border: `1px solid ${COLOR.border}`,
  borderRadius: 10,
  background: COLOR.white,
  color: COLOR.text,
  fontSize: 15,
  boxSizing: "border-box",
};

const primaryButtonStyle: CSSProperties = {
  minHeight: 44,
  padding: "12px 18px",
  border: "none",
  borderRadius: 10,
  background: COLOR.blue,
  color: COLOR.white,
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  minHeight: 44,
  padding: "11px 16px",
  border: `1px solid ${COLOR.border}`,
  borderRadius: 10,
  background: COLOR.white,
  color: "#374151",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

// =========================================
// 06. 共用工具
// =========================================

// 將結帳日及繳款日轉換為數字
function parseDay(value: string) {
  return Number(value);
}

// 取得信用卡結帳資訊
function getCardDescription(card: CreditCard) {
  const statement = card.statement_day
    ? `每月 ${card.statement_day} 日結帳`
    : "尚未設定結帳日";

  let due = "尚未設定繳款日";

  if (card.due_day) {
    const offset = card.due_month_offset ?? 1;


    const monthText =
      offset === 0
        ? "當月"
        : offset === 1
        ? "次月"
        : `${offset} 個月後`;

    due = `${monthText} ${card.due_day} 日繳款`;
  }

  return `${statement} · ${due}`;
}

// =========================================
// 07. 主頁面
// =========================================

export default function CardsPage() {
  // =======================================
  // 07-1. State
  // =======================================

  const [cards, setCards] = useState<CreditCard[]>([]);

  const [userId, setUserId] = useState<string | null>(
    null
  );

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [busyCardId, setBusyCardId] = useState<
    number | null
  >(null);

  const [form, setForm] = useState<CardForm>({
    ...EMPTY_FORM,
  });

  const [editingCardId, setEditingCardId] = useState<
    number | null
  >(null);

  const [showInactiveCards, setShowInactiveCards] =
    useState(false);

  const [notice, setNotice] = useState<Notice | null>(
    null
  );

  // =======================================
  // 08. 取得登入使用者
  // =======================================

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      setLoading(true);

      const { data, error } =
        await supabase.auth.getUser();

      if (!mounted) return;

      if (error || !data.user) {
        setNotice({
          type: "error",
          text: "無法取得登入資訊，請重新登入。",
        });

        setLoading(false);
        return;
      }

      setUserId(data.user.id);
    }

    void initialize();

    return () => {
      mounted = false;
    };
  }, []);

  // =======================================
  // 09. 讀取信用卡資料
  // =======================================

  const loadCards = useCallback(async () => {
    if (!userId) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("CreditCards")
      .select(
        [
          "id",
          "name",
          "is_active",
          "user_id",
          "created_at",
          "statement_day",
          "due_day",
          "is_paid",
          "due_month_offset",
        ].join(",")
        )
      .eq("user_id", userId)
      .order("name", {
        ascending: true,
      });

    if (error) {
      setNotice({
        type: "error",
        text: `讀取信用卡失敗：${error.message}`,
      });
    } else {
      setCards((data ?? []) as CreditCard[]);
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (userId) {
      void loadCards();
    }
    }, [userId, loadCards]);

  // =======================================
  // 10. 表單管理
  // =======================================

  function updateForm(
    field: keyof CardForm,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm({ ...EMPTY_FORM });
    setEditingCardId(null);
  }

  // =======================================
  // 11. 表單驗證
  // =======================================

  function validateForm(): string | null {
    const name = form.name.trim();


    if (!name) {
      return "請輸入信用卡名稱。";
    }

    const statementDay = parseDay(
      form.statement_day
    );

    const dueDay = parseDay(form.due_day);

    if (
      !form.statement_day ||
      !Number.isInteger(statementDay) ||
      statementDay < 1 ||
      statementDay > 31
    ) {
      return "結帳日必須是 1～31 的整數。";
    }

    if (
      !form.due_day ||
      !Number.isInteger(dueDay) ||
      dueDay < 1 ||
      dueDay > 31
    ) {
      return "繳款日必須是 1～31 的整數。";
    }

    const offset = Number(form.due_month_offset);

    if (offset !== 0 && offset !== 1) {
      return "請選擇正確的繳款月份。";
    }

    const duplicate = cards.some(
      (card) =>
        card.id !== editingCardId &&
        card.name.trim().toLowerCase() ===
          name.toLowerCase()
    );

    if (duplicate) {
      return "已有相同名稱的信用卡。";
    }

    return null;
  }


  // =======================================
  // 12. 新增／編輯信用卡儲存
  // =======================================

  async function handleSave(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!userId || saving) return;

    const validationError = validateForm();

    if (validationError) {
      setNotice({
        type: "error",
        text: validationError,
      });
      return;
    }

    setSaving(true);
    setNotice(null);

    const isEditing = editingCardId !== null;

    // 僅儲存卡片基本設定
    // 不覆寫 is_paid 或 created_at

    const payload = {
      name: form.name.trim(),
      statement_day: parseDay(form.statement_day),
      due_day: parseDay(form.due_day),
      due_month_offset: Number(
        form.due_month_offset
      ),
    };

    const result = isEditing
      ? await supabase
          .from("CreditCards")
          .update(payload)
          .eq("id", editingCardId)
          .eq("user_id", userId)
          .select("id")
      : await supabase
    .from("CreditCards")
          .insert({
            ...payload,
            user_id: userId,
            is_active: true,
          })
          .select("id");


    if (result.error || !result.data?.length) {
      setNotice({
        type: "error",
        text: result.error
          ? `儲存失敗：${result.error.message}`
          : "儲存失敗，沒有新增或更新到資料。",
      });

      setSaving(false);
      return;
    }

    resetForm();

    await loadCards();

    setNotice({
      type: "success",
      text: isEditing
        ? "信用卡資料更新成功。"
        : "信用卡新增成功。",
    });

    setSaving(false);
  }

  // =======================================
  // 13. 編輯信用卡
  // =======================================

  function handleEdit(card: CreditCard) {
    setEditingCardId(card.id);

    setForm({
      name: card.name,
      statement_day: String(
        card.statement_day ?? ""
      ),
      due_day: String(card.due_day ?? ""),
      due_month_offset: String(
        card.due_month_offset ?? 1
      ),
    });

    setNotice(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // =======================================
  // 14. 啟用／停用信用卡
  // =======================================

  async function handleToggleActive(
    card: CreditCard
  ) {
    if (!userId || busyCardId !== null) return;

    const nextActive = !card.is_active;

    const confirmed = window.confirm(
      nextActive
        ? `確定重新啟用「${card.name}」嗎？`
        : `確定停用「${card.name}」嗎？\n\n停用不會刪除歷史花費及帳單紀錄。`
    );


    if (!confirmed) return;

    setBusyCardId(card.id);
    setNotice(null);

    const { data, error } = await supabase
      .from("CreditCards")
      .update({
        is_active: nextActive,
        })
      .eq("id", card.id)
      .eq("user_id", userId)
      .select("id");

    if (error || !data?.length) {
      setNotice({
        type: "error",
        text: error
          ? `更新失敗：${error.message}`
          : "更新失敗，沒有更新到信用卡。",
      });

      setBusyCardId(null);
      return;
    }

    if (
      editingCardId === card.id &&
      !nextActive
    ) {
      resetForm();
    }

    await loadCards();

    setNotice({
      type: "success",
      text: nextActive
        ? `已重新啟用「${card.name}」。`
        : `已停用「${card.name}」。`,
    });

    setBusyCardId(null);
  }

  // =======================================
  // 15. 信用卡分類
  // =======================================

  const activeCards = cards.filter(
    (card) => card.is_active
  );

  const inactiveCards = cards.filter(
    (card) => !card.is_active
  );

  // =======================================
  // 16. 信用卡卡片 UI
  // =======================================

  function renderCard(card: CreditCard) {
    const isBusy = busyCardId === card.id;

    return (
      <article
        key={card.id}
        style={{
          border: `1px solid ${COLOR.border}`,
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          background: card.is_active
            ? COLOR.white
            : "#f9fafb",
        }}
      >
        {/* 16-1. 名稱與使用狀態 */}

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 0,
              }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: COLOR.text,
                overflowWrap: "anywhere",
              }}
            >
              {card.name}
            </div>

            <div
              style={{
                marginTop: 7,
                fontSize: 13,
                lineHeight: 1.7,
                color: COLOR.muted,
              }}
            >
              {getCardDescription(card)}
            </div>
          </div>

          <span
            style={{
              flexShrink: 0,
              padding: "5px 9px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              background: card.is_active
                ? COLOR.greenLight
                : "#f3f4f6",
              color: card.is_active
                ? COLOR.green
                : COLOR.muted,
            }}
            >
            {card.is_active
              ? "使用中"
              : "已停用"}
          </span>
        </div>

        {/* 16-2. 操作按鈕 */}

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            marginTop: 16,
            paddingTop: 14,
            borderTop: `1px solid ${COLOR.border}`,
          }}
          >
          <button
            type="button"
            style={{
              ...secondaryButtonStyle,
              flex: "1 1 110px",
            }}
            onClick={() => handleEdit(card)}
            disabled={isBusy || saving}
            >
            ✏️ 編輯資料
          </button>

          <button
            type="button"
            style={{
              ...secondaryButtonStyle,
              flex: "1 1 110px",
              background: card.is_active
                ? COLOR.redLight
                : COLOR.greenLight,
              color: card.is_active
                ? COLOR.red
                : COLOR.green,
            }}
            onClick={() =>
              void handleToggleActive(card)
            }
            disabled={
              busyCardId !== null ||
              saving ||
              loading
            }
            >
            {isBusy
              ? "處理中..."
              : card.is_active
              ? "停用信用卡"
              : "重新啟用"}
          </button>
        </div>
      </article>
    );
  }

  // =======================================
  // 17. 主畫面 JSX
  // =======================================

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "24px 14px 60px",
        background: COLOR.background,
        color: COLOR.text,
      }}
    >
      <div
        style={{
          maxWidth: 800,
          margin: "0 auto",
        }}
      >
        {/* =================================
            17-1. 頁面標題
        ================================= */}

        <header
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 14,
            marginBottom: 24,
          }}
          >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 800,
              }}
              >
              💳 信用卡管理
            </h1>

            <p
              style={{
                margin: "8px 0 0",
                fontSize: 14,
                color: COLOR.muted,
              }}
            >
              管理信用卡、結帳日與繳款設定
            </p>
          </div>

          <Link
            href="/"
            style={{
              ...secondaryButtonStyle,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
            }}
          >
            ← 返回首頁
          </Link>
        </header>

        {/* =================================
            17-2. 成功／錯誤提示
        ================================= */}

        {notice && (
          <div
            role="status"
            style={{
              padding: 14,
              marginBottom: 20,
              borderRadius: 10,
              fontSize: 14,
              lineHeight: 1.6,
              overflowWrap: "anywhere",
              color:
                notice.type === "success"
                ? COLOR.green
                  : COLOR.red,
              background:
                notice.type === "success"
                  ? COLOR.greenLight
                  : COLOR.redLight,
            }}
          >
            {notice.text}
          </div>
        )}

        {/* =================================
            17-3. 信用卡新增／編輯區
        ================================= */}
        <section style={panelStyle}>
          <h2
            style={{
              margin: "0 0 18px",
              fontSize: 18,
              fontWeight: 750,
            }}
          >
            {editingCardId !== null
              ? "✏️ 編輯信用卡"
              : "＋ 新增信用卡"}
          </h2>

          <form onSubmit={handleSave}>
            {/* 信用卡名稱 */}

            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="card-name"
                style={labelStyle}
              >
                信用卡名稱
              </label>

              <input
                id="card-name"
                type="text"
                style={inputStyle}
                value={form.name}
                placeholder="例如：Chase Sapphire Preferred"
                onChange={(event) =>
                  updateForm(
                    "name",
                    event.target.value
                  )
                }
                required
                />
            </div>

            {/* 結帳日／繳款日 */}

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 14,
                marginBottom: 16,
              }}
            >
              <div>
                <label
                  htmlFor="statement-day"
                  style={labelStyle}
                >
                  結帳日（每月幾號）
                </label>

                <input
                  id="statement-day"
                  type="number"
                  min="1"
                  max="31"
                  step="1"
                  placeholder="例如：15"
                  style={inputStyle}
                  value={form.statement_day}
                  onChange={(event) =>
                    updateForm(
                      "statement_day",
                      event.target.value
                    )
                  }
                  required
                  />
              </div>

              <div>
                <label
                  htmlFor="due-day"
                  style={labelStyle}
                  >
                  繳款日（每月幾號）
                </label>

                <input
                  id="due-day"
                  type="number"
                  min="1"
                  max="31"
                  step="1"
                  placeholder="例如：10"
                  style={inputStyle}
                  value={form.due_day}
                  onChange={(event) =>
                    updateForm(
                      "due_day",
                      event.target.value
                    )
                  }
                  required
                  />
              </div>
            </div>

            {/* 繳款月份 */}

            <div style={{ marginBottom: 20 }}>
              <label
                htmlFor="due-month"
                style={labelStyle}
              >
                繳款月份
              </label>

              <select
                id="due-month"
                style={inputStyle}
                value={form.due_month_offset}
                onChange={(event) =>
                  updateForm(
                    "due_month_offset",
                    event.target.value
                  )
                }
              >
                <option value="0">
                  結帳當月繳款
                </option>

                <option value="1">
                  結帳次月繳款
                </option>
              </select>

              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 12,
                  color: COLOR.muted,
                  lineHeight: 1.7,
                }}
              >
                例如：10/15 結帳、11/10 繳款，
                請選擇「結帳次月繳款」。
              </p>
            </div>

            {/* 儲存／取消編輯 */}

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <button
                type="submit"
                style={{
                  ...primaryButtonStyle,
                  flex: "1 1 170px",
                  opacity:
                    saving || !userId ? 0.6 : 1,
                }}
                disabled={
                  saving ||
                  !userId ||
                  loading
                }
              >
                {saving
                  ? "儲存中..."
                  : editingCardId !== null
                  ? "儲存修改"
                  : "新增信用卡"}
              </button>

              {editingCardId !== null && (
                <button
                  type="button"
                  style={secondaryButtonStyle}
                  onClick={resetForm}
                  disabled={saving}
                >
                  取消編輯
                </button>
              )}
            </div>
          </form>
        </section>

        {/* =================================
            17-4. 信用卡統計區
        ================================= */}

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",
            gap: 12,
            marginBottom: 20,
            }}
        >
          {/* 使用中數量 */}

          <div
            style={{
              ...panelStyle,
              padding: 16,
              marginBottom: 0,
            }}
            >
            <div
              style={{
                marginBottom: 8,
                fontSize: 13,
                color: COLOR.muted,
              }}
            >
              使用中信用卡
            </div>

            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: COLOR.blue,
              }}
            >
              {activeCards.length}
            </div>
          </div>

          {/* 已停用數量 */}

          <div
            style={{
              ...panelStyle,
              padding: 16,
              marginBottom: 0,
            }}
          >
            <div
              style={{
                marginBottom: 8,
                fontSize: 13,
                color: COLOR.muted,
                }}
            >
              已停用信用卡
            </div>

            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: COLOR.text,
              }}
            >
              {inactiveCards.length}
            </div>
          </div>
        </section>

        {/* =================================
            17-5. 使用中的信用卡
        ================================= */}


        <section style={panelStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: 18,
            }}
            >
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 750,
              }}
            >
              💳 使用中的信用卡
            </h2>

            <button
              type="button"
              style={{
                ...secondaryButtonStyle,
                minHeight: 36,
                padding: "7px 11px",
                fontSize: 12,
              }}
              onClick={() => void loadCards()}
              disabled={loading}
            >
              重新整理
            </button>
          </div>

          {loading ? (
            <div
              style={{
                padding: 24,
                textAlign: "center",
                color: COLOR.muted,
              }}
            >
              載入信用卡資料中...
            </div>
          ) : activeCards.length === 0 ? (
            <div
              style={{
                padding: 24,
                textAlign: "center",
                borderRadius: 12,
                background: "#f9fafb",
                color: COLOR.muted,
                fontSize: 14,
              }}
            >
              尚無使用中的信用卡
              </div>
          ) : (
            activeCards.map(renderCard)
          )}
        </section>

        {/* =================================
            17-6. 已停用信用卡
        ================================= */}

        <section style={panelStyle}>
          <button
            type="button"
            onClick={() =>
              setShowInactiveCards(
                (previous) => !previous
                  )
            }
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              gap: 12,
              padding: 0,
              border: "none",
              background: "transparent",
              color: COLOR.text,
              cursor: "pointer",
            }}
            >
            <span
              style={{
                fontSize: 17,
                fontWeight: 700,
              }}
            >
              📁 已停用信用卡
              （{inactiveCards.length}）
            </span>

            <span
              style={{
                color: COLOR.muted,
                fontSize: 13,
                 }}
            >
              {showInactiveCards
                ? "收合 ▲"
                : "展開 ▼"}
            </span>
          </button>

           {showInactiveCards && (
            <div style={{ marginTop: 18 }}>
              {inactiveCards.length === 0 ? (
                <div
                  style={{
                    padding: 16,
                    textAlign: "center",
                    color: COLOR.muted,
                    fontSize: 14,
                  }}
                >
                  目前沒有已停用的信用卡
                  </div>
              ) : (
                inactiveCards.map(renderCard)
              )}
            </div>
          )}
        </section>

        {/* =================================
            17-7. 頁面底部
        ================================= */}


        <footer
          style={{
            textAlign: "center",
            padding: "10px 0 20px",
            color: "#9ca3af",
            fontSize: 12,
          }}

           >
          Travel Expense App · 信用卡管理
        </footer>
      </div>
    </main>
  );
}
  red: "#b91c1c",
  redLight: "#fef2f2",
};
