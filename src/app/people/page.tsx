"use client";

// ==========================================
// 01. IMPORT / 匯入套件
// ==========================================

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

// ==========================================
// 02. TYPE / 人員資料型別
// ==========================================

type Person = {
  id: number | string;
  name: string;
  notes: string | null;
};

// ==========================================
// 03. PAGE / 人員管理主頁面
// ==========================================

export default function PeoplePage() {

  // ==========================================
  // 04. STATE / 狀態管理
  // ==========================================

const [people, setPeople] = useState<Person[]>([]);

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // ==========================================
  // 05. SUPABASE / 取得登入使用者
  // ==========================================

const getCurrentUser = async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      throw new Error("請先登入後再使用人員管理。");
    }

  return user;
  };

  // ==========================================
  // 06. LOAD / 載入目前人員
  // ==========================================

const loadPeople = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const user = await getCurrentUser();

  const { data, error } = await supabase
        .from("People")
        .select("id,name,notes")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (error) {
        throw error;
      }

  setPeople((data ?? []) as Person[]);
    } catch (error) {
      console.error("載入人員失敗：", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "載入人員資料失敗"
        );
    } finally {
      setLoading(false);
    }
  }, []);


// ==========================================
  // 07. USE EFFECT / 初次載入
  // ==========================================

  useEffect(() => {
    void loadPeople();
  }, [loadPeople]);

// ==========================================
  // 08. ADD / 新增人員
  // ==========================================

  const handleAddPerson = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (saving) return;

    setErrorMessage("");
    setSuccessMessage("");

    const cleanName = name.trim();
    const cleanNotes = notes.trim();

    if (!cleanName) {
      setErrorMessage("請輸入人員姓名。");
      return;
    }

    setSaving(true);

    try {
      const user = await getCurrentUser();

    // 檢查目前使用者是否已有相同姓名
      const { data: existingPeople, error: checkError } =
        await supabase
          .from("People")
          .select("id,name")
          .eq("user_id", user.id);

      if (checkError) {
        throw checkError;
      }

    const isDuplicate = (existingPeople ?? []).some(
        (person) =>
          String(person.name).trim().toLocaleLowerCase() ===
          cleanName.toLocaleLowerCase()
      );

     if (isDuplicate) {
        setErrorMessage("這個人員名稱已經存在。");
        return;
      }

      // 寫入 Supabase People 資料表
      const { error } = await supabase
        .from("People")
      .insert({
          name: cleanName,
          notes: cleanNotes || null,
          user_id: user.id,
        });

      if (error) {
        throw error;
      }


    // 清空輸入欄位
      setName("");
      setNotes("");

      setSuccessMessage(`已成功新增「${cleanName}」。`);

    // 重新載入人員清單
      await loadPeople();
    } catch (error) {
      console.error("新增人員失敗：", error);

    setErrorMessage(
        error instanceof Error
          ? error.message
          : "新增人員失敗，請稍後再試。"
      );
    } finally {
      setSaving(false);
    }
  };

// ==========================================
  // 09. RETURN / 頁面主要結構
  // ==========================================

  return (
    <main className="people-page">

      <div className="people-container">

        {/* ======================================
            10. HEADER / 頁面標題
        ====================================== */}

        <header className="page-header">
          <div>
            <h1 className="page-title">
              人員管理
            </h1>

            <p className="page-description">
              建立與管理記帳成員，
              方便日常及旅遊花費分攤。
            </p>
          </div>

          <div className="people-count">
            <span className="count-number">
              {people.length}
            </span>
            <span className="count-label">
              位人員
            </span>
          </div>
        </header>

        {/* ======================================
            11. MESSAGE / 成功與錯誤提示
        ====================================== */}

        {errorMessage && (
          <div className="message error-message" role="alert">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="message success-message" role="status">
            {successMessage}
          </div>
        )}

        {/* ======================================
            12. ADD PERSON / 新增人員區塊
        ====================================== */}

        <section className="content-card">

          <div className="section-header">
            <h2 className="section-title">
              新增人員
            </h2>

            <p className="section-description">
              新增可以參與付款及分攤的人員。
            </p>
          </div>

          <form
            onSubmit={handleAddPerson}
            className="person-form"
          >

            {/* ==================================
                13. NAME / 姓名欄位
            ================================== */}

            <div className="form-group">
              <label
                className="form-label"
                htmlFor="person-name"
              >
                姓名
                <span className="required">
                  *
                </span>
              </label>

              <input
                id="person-name"
                type="text"
                className="form-input"
                placeholder="例如：朋友A、朋友B"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                maxLength={100}
                required
              />
            </div>

            {/* ==================================
                14. NOTES / 備註欄位
            ================================== */}

            <div className="form-group">
              <label
                className="form-label"
                htmlFor="person-notes"
              >
                備註
                <span className="optional">
                  （選填）
                </span>
              </label>

              <textarea
                id="person-notes"
                className="form-textarea"
                placeholder="例如：家人、朋友、旅遊成員"
                value={notes}
                onChange={(event) =>
                  setNotes(event.target.value)
                }
                rows={3}
              />
            </div>

            {/* ==================================
                15. SUBMIT / 新增按鈕
            ================================== */}

            <div className="form-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving
                  ? "新增中..."
                  : "＋ 新增人員"}
              </button>
            </div>

          </form>
        </section>

        {/* ======================================
            16. PEOPLE LIST / 目前人員清單
        ====================================== */}

        <section className="content-card">

          <div className="section-header list-header">
            <div>
              <h2 className="section-title">
                目前人員
              </h2>

              <p className="section-description">
                已建立的人員會顯示在這裡。
              </p>
            </div>

            <button
              type="button"
              className="refresh-button"
              onClick={() => void loadPeople()}
              disabled={loading}
            >
              重新整理
            </button>
          </div>

          {/* ==================================
              17. LOADING / 載入中
          ================================== */}

          {loading ? (
            <div className="empty-state">
              正在載入人員資料...
            </div>
          ) : people.length === 0 ? (

            /* ==================================
                18. EMPTY / 尚無人員
            ================================== */

            <div className="empty-state">
              <div className="empty-icon">
                👥
              </div>

              <p className="empty-title">
                尚未新增人員
              </p>

              <p className="empty-description">
                請使用上方表單新增第一位人員。
              </p>
            </div>

          ) : (

            /* ==================================
                19. PERSON CARDS / 人員卡片
            ================================== */

            <div className="people-list">
              {people.map((person) => (
                <div
                  key={person.id}
                  className="person-card"
                >

                  {/* 人員頭像 */}
                  <div className="person-avatar">
                    {person.name
                      .trim()
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  {/* 人員資料 */}
                  <div className="person-info">
                    <div className="person-name">
                      {person.name}
                    </div>

                    {person.notes && (
                      <div className="person-notes">
                        {person.notes}
                      </div>
                    )}
                  </div>

                  </div>
              ))}
            </div>

          )}

        </section>

      </div>

      {/* ======================================
          20. STYLE / 頁面整體排版
      ====================================== */}

      <style jsx>{`

        * {
          box-sizing: border-box;
        }

        .people-page {
          min-height: 100vh;
          background: #f8fafc;
          padding: 28px 16px 60px;
          color: #111827;
        }

        .people-container {
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
        }

        /* ====================================
           21. HEADER STYLE / 標題樣式
        ==================================== */

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }

        .page-title {
          font-size: 28px;
          font-weight: 800;
          margin: 0 0 8px;
          color: #111827;
        }

        .page-description {
          font-size: 14px;
          line-height: 1.7;
          color: #6b7280;
          margin: 0;
        }

        .people-count {
          display: flex;
          align-items: baseline;
          gap: 5px;
          background: #eff6ff;
          padding: 12px 18px;
          border-radius: 12px;
          white-space: nowrap;
        }

        .count-number {
          font-size: 24px;
          font-weight: 800;
          color: #2563eb;
        }

        .count-label {
          font-size: 13px;
          color: #2563eb;
          font-weight: 600;
        }

        /* ====================================
           22. CARD STYLE / 區塊卡片
        ==================================== */

        .content-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 24px;
          margin-bottom: 20px;
          box-shadow: 0 3px 12px rgba(0,0,0,0.035);
        }

        .section-header {
          margin-bottom: 22px;
        }

        .section-title {
          font-size: 20px;
          font-weight: 750;
          margin: 0 0 6px;
          color: #111827;
        }

        .section-description {
          font-size: 13px;
          line-height: 1.6;
          color: #6b7280;
          margin: 0;
        }

        /* ====================================
           23. FORM STYLE / 表單
        ==================================== */

        .person-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          font-size: 14px;
          font-weight: 650;
          color: #374151;
        }

        .required {
          color: #ef4444;
          margin-left: 4px;
        }

        .optional {
          color: #9ca3af;
          font-size: 12px;
          font-weight: 400;
        }

        .form-input,
        .form-textarea {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          background: #ffffff;
          color: #111827;
          font-size: 15px;
          font-family: inherit;
          padding: 12px 14px;
          outline: none;
          transition: border-color 0.2s,
                      box-shadow 0.2s;
        }

        .form-input {
          min-height: 46px;
        }

        .form-textarea {
          resize: vertical;
          min-height: 90px;
          line-height: 1.6;
        }

        .form-input:focus,
        .form-textarea:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px
            rgba(37,99,235,0.12);
        }

        .form-input::placeholder,
        .form-textarea::placeholder {
          color: #9ca3af;
        }

        /* ====================================
           24. BUTTON STYLE / 按鈕
        ==================================== */

        .form-actions {
          display: flex;
          justify-content: flex-start;
        }

        .primary-button {
          background: #2563eb;
          color: #ffffff;
          border: none;
          border-radius: 10px;
          min-height: 44px;
          padding: 0 22px;
          font-size: 14px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.2s;
        }

         .primary-button:hover:not(:disabled) {
          background: #1d4ed8;
        }

        .primary-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

         .refresh-button {
          background: #ffffff;
          border: 1px solid #d1d5db;
          border-radius: 9px;
          color: #374151;
          padding: 9px 14px;
          font-size: 13px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          white-space: nowrap;
        }

        .refresh-button:hover:not(:disabled) {
          background: #f9fafb;
        }

        .refresh-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* ====================================
           25. PERSON STYLE / 人員清單
        ==================================== */

          .list-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .people-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .person-card {
          display: flex;
          align-items: center;
          gap: 14px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 14px 16px;
          min-height: 74px;
          transition: border-color 0.2s,
                      background 0.2s;
        }

        .person-card:hover {
        border-color: #bfdbfe;
          background: #fafcff;
        }

        .person-avatar {
          width: 44px;
          height: 44px;
          min-width: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #dbeafe;
          color: #1d4ed8;
          font-size: 18px;
          font-weight: 800;
        }

        .person-info {
          flex: 1;
          min-width: 0;
        }

        .person-name {
          font-size: 16px;
          font-weight: 750;
          color: #111827;
          overflow-wrap: anywhere;
        }

        .person-notes {
          font-size: 13px;
          color: #6b7280;
          margin-top: 5px;
          line-height: 1.5;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        /* ====================================
           26. EMPTY STYLE / 無資料狀態
        ==================================== */

        .empty-state {
          text-align: center;
          padding: 36px 16px;
          color: #6b7280;
          font-size: 14px;
        }

        .empty-icon {
          font-size: 32px;
          margin-bottom: 12px;
        }

        .empty-title {
          font-size: 16px;
          font-weight: 700;
          color: #374151;
          margin: 0 0 6px;
        }


.empty-description {
          font-size: 13px;
          margin: 0;
        }

        /* ====================================
           27. MESSAGE STYLE / 提示訊息
        ==================================== */

        .message {
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 14px;
          margin-bottom: 16px;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }

        .error-message {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
        }

        .success-message {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #15803d;
        }

         /* ====================================
           28. MOBILE / 手機版 RWD
        ==================================== */

        @media (max-width: 600px) {

          .people-page {
            padding: 20px 12px 40px;
          }

          .page-header {
            align-items: flex-start;
            gap: 10px;
          }

          .page-title {
            font-size: 24px;
          }

          .page-description {
            font-size: 13px;
          }

          .people-count {
            padding: 8px 12px;
            border-radius: 10px;
          }

          .count-number {
            font-size: 20px;
          }

          .count-label {
            font-size: 12px;
          }

          .content-card {
            padding: 18px 16px;
            border-radius: 14px;
            margin-bottom: 14px;
          }

          .section-title {
            font-size: 18px;
          }

          .form-input,
          .form-textarea {
            font-size: 16px;
          }

          .form-actions {
            display: block;
          }

          .primary-button {
            width: 100%;
            min-height: 46px;
          }

          .person-card {
            padding: 12px;
            gap: 12px;
          }

          .person-avatar {
            width: 40px;
            height: 40px;
            min-width: 40px;
            font-size: 16px;
          }

          .person-name {
            font-size: 15px;
          }

        }

      `}</style>

    </main>
  );
}
