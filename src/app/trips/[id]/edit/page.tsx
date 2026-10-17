
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

/* =========================================
   編輯旅程｜統一奶油米白＋棕色版型
   ========================================= */

export default function EditTripPage() {
  const params = useParams();
  const router = useRouter();

  const id = Number(params.id);

  /* =========================================
     01. State
     ========================================= */

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  /* =========================================
     02. 載入旅程資料
     ========================================= */

  useEffect(() => {
    let active = true;

    async function loadTrip() {
      setLoading(true);
      setMessage("");

      if (!Number.isInteger(id) || id <= 0) {
        setMessage("旅程 ID 不正確。");
        setLoading(false);
        return;
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!active) return;

        if (!user) {
          setMessage("尚未登入，登入後才能編輯旅程。");
          return;
        }

        const { data, error } = await supabase
          .from("Trips")
          .select(
            "name,location,start_date,end_date,notes"
          )
          .eq("id", id)
          .eq("user_id", user.id)
          .single();

        if (!active) return;

        if (error) {
          setMessage("讀取失敗：" + error.message);
          return;
        }

        setName(data.name || "");
        setLocation(data.location || "");
        setStartDate(data.start_date || "");
        setEndDate(data.end_date || "");
        setNotes(data.notes || "");
      } catch (error) {
        if (!active) return;

        setMessage(
          error instanceof Error
            ? error.message
            : "讀取旅程時發生錯誤。"
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadTrip();

    return () => {
      active = false;
    };
  }, [id]);

  /* =========================================
     03. 儲存修改
     ========================================= */

  async function handleSave(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) return;

    setMessage("");

    if (!name.trim()) {
      setMessage("請輸入旅程名稱。");
      return;
    }

    if (startDate && endDate && endDate < startDate) {
      setMessage("結束日期不能早於開始日期。");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("請先登入後再儲存。");
        return;
      }

      const { error } = await supabase
        .from("Trips")
        .update({
          name: name.trim(),
          location: location.trim() || null,
          start_date: startDate || null,
          end_date: endDate || null,
          notes: notes.trim() || null,
        })
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id")
        .single();

      if (error) {
        setMessage("儲存失敗：" + error.message);
        return;
      }

      router.push(`/trips/${id}`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? "儲存失敗：" + error.message
          : "儲存旅程時發生錯誤。"
      );
    } finally {
      setSaving(false);
    }
  }

  /* =========================================
     04. 共用樣式
     ========================================= */

  const pageStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 1100,
    minHeight: "100vh",
    margin: "0 auto",
    padding: "20px clamp(12px, 3vw, 24px)",
    background: "#f8f6f3",
    color: "#49392f",
    boxSizing: "border-box",
  };

  const cardStyle: React.CSSProperties = {
    width: "100%",
    padding: "24px clamp(16px, 3vw, 28px)",
    background: "#faf7f2",
    border: "1px solid #e6dcd0",
    borderRadius: 16,
    boxSizing: "border-box",
    marginBottom: 20,
  };

  const labelStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minWidth: 0,
    color: "#674b39",
    fontSize: 14,
    fontWeight: 600,
  };

  const inputStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    minWidth: 0,
    height: 44,
    padding: "10px 12px",
    background: "#ffffff",
    border: "1px solid #d8c6b4",
    borderRadius: 10,
    color: "#49392f",
    fontSize: 16,
    fontFamily: "inherit",
    boxSizing: "border-box",
    outlineColor: "#b89b80",
  };

  const secondaryButton: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    padding: "0 20px",
    border: "1px solid #d8c6b4",
    borderRadius: 10,
    background: "#ffffff",
    color: "#674b39",
    fontSize: 14,
    fontWeight: 700,
    textDecoration: "none",
    cursor: "pointer",
    boxSizing: "border-box",
  };

  const primaryButton: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    padding: "0 24px",
    background: "#826349",
    border: "1px solid #826349",
    borderRadius: 10,
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 700,
    cursor: saving ? "wait" : "pointer",
    opacity: saving ? 0.65 : 1,
    boxSizing: "border-box",
  };

  /* =========================================
     05. JSX
     ========================================= */

  return (
    <main style={pageStyle}>

      {/* 頁面標題 */}

      <header style={cardStyle}>
        <h1
          style={{
            margin: 0,
            fontSize: "clamp(24px, 4vw, 30px)",
            fontWeight: 800,
            lineHeight: 1.3,
            color: "#49392f",
          }}
        >
          編輯旅程
        </h1>

        <p
          style={{
            margin: "8px 0 0",
            fontSize: 14,
            lineHeight: 1.6,
            color: "#927f70",
          }}
        >
          修改旅程名稱、地點、旅行日期及備註
        </p>
      </header>

      {/* 提示訊息 */}

      {message && (
        <div
          role="alert"
          style={{
            background: "#fff4e8",
            border: "1px solid #e8cbb0",
            color: "#996139",
            borderRadius: 12,
            padding: "12px 16px",
            marginBottom: 20,
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          {message}
        </div>
      )}

      {/* 載入中 */}

      {loading ? (
        <section style={cardStyle}>
          <p
            style={{
              color: "#927f70",
              margin: 0,
            }}
          >
            正在載入旅程資料...
          </p>
        </section>
      ) : (
        <form onSubmit={handleSave}>

          <section style={cardStyle}>

            <h2
              style={{
                margin: "0 0 24px",
                fontSize: 20,
                fontWeight: 800,
                color: "#49392f",
              }}
            >
              基本資料
            </h2>

            <div
              style={{
                display: "grid",
                gap: 20,
              }}
            >

              {/* 旅程名稱 */}

              <label style={labelStyle}>
                旅程名稱
                <input
                  type="text"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  placeholder="例如：Disney"
                  maxLength={200}
                  required
                  style={inputStyle}
                />
              </label>

              {/* 地點 */}

              <label style={labelStyle}>
                地點
                <input
                  type="text"
                  value={location}
                  onChange={(e) =>
                    setLocation(e.target.value)
                  }
                  placeholder="例如：Orlando、MCO"
                  style={inputStyle}
                />
              </label>

              {/* 日期 */}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
                  gap: 16,
                  minWidth: 0,
                }}
              >
                <label style={labelStyle}>
                  開始日期
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) =>
                      setStartDate(e.target.value)
                    }
                    style={inputStyle}
                  />
                </label>

                <label style={labelStyle}>
                  結束日期
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(e) =>
                      setEndDate(e.target.value)
                    }
                    style={inputStyle}
                  />
                </label>
              </div>

              {/* 備註 */}

              <label style={labelStyle}>
                備註（選填）
                <textarea
                  value={notes}
                  onChange={(e) =>
                    setNotes(e.target.value)
                  }
                  placeholder="輸入旅程備註..."
                  rows={4}
                  style={{
                    ...inputStyle,
                    height: "auto",
                    minHeight: 100,
                    resize: "vertical",
                    lineHeight: 1.6,
                  }}
                />
              </label>
            </div>

            {/* 操作按鈕 */}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                flexWrap: "wrap",
                gap: 12,
                paddingTop: 20,
                marginTop: 24,
                borderTop: "1px solid #e6dcd0",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  router.push(`/trips/${id}`)
                }
                style={secondaryButton}
              >
                取消
              </button>

              <button
                type="submit"
                disabled={saving}
                style={primaryButton}
              >
                {saving ? "儲存中..." : "儲存修改"}
              </button>
            </div>
          </section>
        </form>
      )}
    </main>
  );
}
