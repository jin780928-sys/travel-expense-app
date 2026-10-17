"use client";

// ==========================================
// 01. IMPORT / 匯入套件
// ==========================================

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import AppNavigation from "../../components/AppNavigation";


// ==========================================
// 02. TYPE / 資料型別
// ==========================================

type PersonType = "regular" | "travel";

type Person = {
  id: number | string;
  name: string;
  notes: string | null;
  person_type: string | null;
  trip_id: number | null;
  is_active: boolean;
};

type Trip = {
  id: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
};


// ==========================================
// 03. PAGE / 人員管理主頁面
// ==========================================

export default function PeoplePage() {

// ========================================
  // 04. STATE / 頁面狀態
  // ========================================


const [people, setPeople] = useState<Person[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

const [personType, setPersonType] =
    useState<PersonType>("regular");

  const [tripId, setTripId] = useState("");

const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [changingId, setChangingId] =
    useState<number | string | null>(null);

const [activeTab, setActiveTab] =
    useState<"active" | "inactive">("active");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

// ========================================
  // 05. AUTH / 取得目前登入者
  // ========================================

  const getCurrentUser = async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      throw new Error("請先登入後再管理人員。");
    }

    return user;
  };

// ========================================
  // 06. LOAD / 讀取人員與旅程
  // ========================================

const loadData = useCallback(async () => {

    setLoading(true);
    setErrorMessage("");

                             try {
      const user = await getCurrentUser();

      const [peopleResult, tripsResult] =
        await Promise.all([
          supabase
            .from("People")
            .select(
              "id,name,notes,person_type,trip_id,is_active"
            )
            .eq("user_id", user.id)
            .order("name", { ascending: true }),


          supabase
            .from("Trips")
            .select(
              "id,name,start_date,end_date"
            )
            .eq("user_id", user.id)
            .order("start_date", { ascending: false }),
        ]);

  if (peopleResult.error) {
        throw peopleResult.error;
      }

      if (tripsResult.error) {
        throw tripsResult.error;
      }


  setPeople(
        (peopleResult.data ?? []) as Person[]
      );

      setTrips(
        (tripsResult.data ?? []) as Trip[]
      );


  } catch (error) {
      console.error("載入資料失敗：", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "載入資料失敗"
      );

  } finally {
      setLoading(false);
    }

  }, []);

// ========================================
  // 07. EFFECT / 初次載入資料
  // ========================================

  useEffect(() => {
    void loadData();
  }, [loadData]);

// ========================================
  // 08. HELPERS / 旅程名稱與日期
  // ========================================

  const getTripName = (id: number | null) => {
    if (id === null) return "未指定旅程";


    const trip = trips.find(
      (item) => Number(item.id) === Number(id)
    );

    return trip?.name ?? "旅程已不存在";
  };

const getTripDateLabel = (trip: Trip) => {
    if (!trip.start_date && !trip.end_date) {
      return "";
    }

  return [
      trip.start_date ?? "?",
      trip.end_date ?? "?",
    ].join(" ～ ");
  };


// ========================================
  // 09. ADD PERSON / 新增人員
  // ========================================

  const handleAddPerson = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (saving) return;

    setErrorMessage("");
    setSuccessMessage("");

    const cleanName = name.trim();
    const cleanNotes = notes.trim();

    if (!cleanName) {
      setErrorMessage("請輸入姓名。");
      return;
    }

    if (personType === "travel" && !tripId) {
      setErrorMessage("請選擇所屬旅程。");
      return;
    }

    setSaving(true);

    try {
      const user = await getCurrentUser();

    // ------------------------------------
      // 09-1. 檢查是否重複
      // 同一旅程不可有同名人員
      // 常用人員不可重複同名
      // ------------------------------------

    const duplicate = people.some((person) => {

        if (
          person.name.trim().toLocaleLowerCase() !==
          cleanName.toLocaleLowerCase()
        ) {
          return false;
        }

                                  if (personType === "regular") {
          return person.person_type !== "travel";
        }

        return (
          person.person_type === "travel" &&
          Number(person.trip_id) === Number(tripId)
        );
      });

    if (duplicate) {
        setErrorMessage(
          "此人員已存在於相同用途或旅程中。"
        );
        return;
      }

    // ------------------------------------
      // 09-2. 新增到 Supabase
      // ------------------------------------

    const { error } = await supabase
        .from("People")
        .insert({
          name: cleanName,
          notes: cleanNotes || null,
          person_type: personType,
          trip_id:
            personType === "travel"
              ? Number(tripId)
              : null,
          is_active: true,
          user_id: user.id,
        });

    if (error) {
        throw error;
      }

      // ------------------------------------
      // 09-3. 新增成功，清空表單
      // ------------------------------------

    setName("");
      setNotes("");
      setPersonType("regular");
      setTripId("");

    await loadData();

      setSuccessMessage(
        `已成功新增「${cleanName}」。`
      );

      setActiveTab("active");


    } catch (error) {
      console.error("新增人員失敗：", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "新增人員失敗"
      );

    } finally {
      setSaving(false);
    }
  };

// ========================================
  // 10. STATUS / 停用與重新啟用
  // ========================================

const handleChangeStatus = async (
    person: Person
  ) => {

    if (changingId !== null) return;

    const newStatus = !person.is_active;

  const actionName = newStatus
      ? "重新啟用"
      : "停用";

    const confirmed = window.confirm(
      `確定要${actionName}「${person.name}」嗎？\n\n` +
      "此操作不會刪除歷史花費與分攤紀錄。"
    );

  if (!confirmed) return;

    setChangingId(person.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const user = await getCurrentUser();

  const { error } = await supabase
        .from("People")
        .update({
          is_active: newStatus,
        })
        .eq("id", person.id)
        .eq("user_id", user.id);


  if (error) {
        throw error;
      }

      await loadData();

      setSuccessMessage(
        `已${actionName}「${person.name}」。`
      );

  } catch (error) {
      console.error("更新人員狀態失敗：", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "更新狀態失敗"
      );

    } finally {
      setChangingId(null);
    }
  };

// ========================================
  // 11. FILTER / 分類人員
  // ========================================

  const activePeople = people.filter(
    (person) => person.is_active !== false
  );

const inactivePeople = people.filter(
    (person) => person.is_active === false
  );

  const displayedPeople =
    activeTab === "active"
      ? activePeople
      : inactivePeople;

// ========================================
  // 12. RETURN / 頁面結構
  // ========================================

  return (
    <main className="people-page">

      {/* =========================================
    共用頂部導覽列
   ========================================= */}
<AppNavigation />

      <div className="people-container">

        

{/* =========================================
    13. 人員管理：統一頁面標題區
   ========================================= */}

<header
  className="page-header"
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
      className="page-title"
      style={{
        margin: 0,
        fontSize: "clamp(24px, 4vw, 30px)",
        fontWeight: 800,
        lineHeight: 1.3,
        color: "#49392f",
      }}
    >
      人員管理
    </h1>

    <p
      className="page-description"
      style={{
        margin: "8px 0 0",
        fontSize: 14,
        lineHeight: 1.6,
        color: "#927f70",
      }}
    >
      管理日常記帳成員與旅遊同行人員
    </p>
  </div>

  {/* 右側：啟用人員數量 */}
  <div
    className="people-count"
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: "10px 16px",
      background: "#ffffff",
      border: "1px solid #e6dcd0",
      borderRadius: 12,
      boxSizing: "border-box",
      whiteSpace: "nowrap",
      flexShrink: 0,
    }}
  >
    <span
      className="count-number"
      style={{
        fontSize: 22,
        fontWeight: 800,
        color: "#49392f",
      }}
    >
      {activePeople.length}
    </span>

    <span
      className="count-label"
      style={{
        fontSize: 13,
        fontWeight: 600,
        color: "#927f70",
      }}
    >
      位啟用中
    </span>
  </div>
</header>


        {/* ==================================
            14. MESSAGE / 提示訊息
        ================================== */}

        {errorMessage && (
      <div
            className="message error-message"
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        {successMessage && (
      <div
            className="message success-message"
            role="status"
          >
            {successMessage}
          </div>
        )}


        {/* ==================================
            15. ADD CARD / 新增人員
        ================================== */}

        <section className="content-card">

          <div className="section-header">

            <h2 className="section-title">
              新增人員
            </h2>

            <p className="section-description">
              選擇常用人員或指定旅程專用成員
              </p>

          </div>

          <form
            className="person-form"
            onSubmit={handleAddPerson}
          >
            {/* ==============================
                16. NAME / 姓名
            ============================== */}

            <div className="form-group">

              <label
                htmlFor="person-name"
                className="form-label"
              >
                姓名
                <span className="required">
                  *
                </span>
              </label>

              <input
                id="person-name"
                className="form-input"
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="例如：朋友A、朋友B"
                maxLength={100}
                required
              />

            </div>

            {/* ==============================
                17. PERSON TYPE / 人員用途
            ============================== */}

            <div className="form-group">

              <label className="form-label">
                人員用途
              </label>

              <div className="type-selector">

                <label
                  className={
                    "type-option " +
                    (personType === "regular"
                      ? "selected"
                      : "")
                  }
                >
                  <input
                    type="radio"
                    name="personType"
                    value="regular"
                    checked={personType === "regular"}
                    onChange={() => {
                      setPersonType("regular");
                      setTripId("");
                    }}
                  />

                  <span>常用人員</span>
                </label>

                <label
                  className={
                    "type-option " +
                    (personType === "travel"
                      ? "selected"
                      : "")
                  }
                >
                  <input
                    type="radio"
                    name="personType"
                    value="travel"
                    checked={personType === "travel"}
                    onChange={() =>
                      setPersonType("travel")
                    }
                  />

                  <span>旅遊專用</span>
                </label>

              </div>

              <p className="field-hint">
                常用人員可長期使用；
                旅遊專用人員可指定所屬旅程。
              </p>

              </div>

            {/* ==============================
                18. TRIP / 所屬旅程
            ============================== */}

            {personType === "travel" && (

              <div className="form-group">

                <label
                  htmlFor="person-trip"
                  className="form-label"
                >
                  所屬旅程
                  <span className="required">
                    *
                  </span>
                </label>

                <select
                  id="person-trip"
                  className="form-input"
                  value={tripId}
                  onChange={(event) =>
                    setTripId(event.target.value)
                  }
                  required
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
                      {getTripDateLabel(trip)
                        ? `（${getTripDateLabel(trip)}）`
                        : ""}
                    </option>
                  ))}

                </select>

                {trips.length === 0 && (
                  <p className="field-hint">
                    尚無可選擇的旅程，
                    請先至新增旅程建立資料。
                  </p>
                )}
                </div>

            )}

            {/* ==============================
                19. NOTES / 備註
            ============================== */}

            <div className="form-group">

              <label
                htmlFor="person-notes"
                className="form-label"
              >
                備註
                <span className="optional">
                  （選填）
                </span>
              </label>

              <textarea
                id="person-notes"
                className="form-textarea"
                rows={3}
                value={notes}
                onChange={(event) =>
                  setNotes(event.target.value)
                }
                placeholder="例如：朋友、家人、同行旅伴"
                />

            </div>

            {/* ==============================
                20. SUBMIT / 新增按鈕
            ============================== */}
            <div className="form-actions">

              <button
                type="submit"
                className="primary-button"
                disabled={saving || loading}
                >
                {saving
                  ? "新增中..."
                  : "＋ 新增人員"}
              </button>

            </div>

            </form>

        </section>

        {/* ==================================
            21. LIST / 目前人員
        ================================== */}

        <section className="content-card">

          <div className="list-heading">

            <div>
              <h2 className="section-title">
                目前人員
              </h2>

              <p className="section-description">
                停用人員不會從資料庫刪除
              </p>
            </div>

            <button
              type="button"
              className="refresh-button"
              onClick={() => void loadData()}
              disabled={loading}
            >
              重新整理
            </button>

          </div>

          {/* ==============================
              22. TABS / 啟用與停用篩選
          ============================== */}

          <div className="status-tabs">

            <button
              type="button"
              className={
                "status-tab " +
                (activeTab === "active"
                  ? "active-tab"
                  : "")
                }
              onClick={() =>
                setActiveTab("active")
              }
            >
              啟用中（{activePeople.length}）
            </button>

            <button
              type="button"
              className={
                "status-tab " +
                (activeTab === "inactive"
                  ? "active-tab"
                  : "")
              }
              onClick={() =>
                setActiveTab("inactive")
              }
            >
              已停用（{inactivePeople.length}）
            </button>

          </div>

          {/* ==============================
              23. LOADING / 載入中
          ============================== */}

          {loading ? (

            <div className="empty-state">
              正在載入人員資料...
            </div>

          ) : displayedPeople.length === 0 ? (


            /* ============================
                24. EMPTY / 無人員
            ============================ */

            <div className="empty-state">
              <div className="empty-icon">
                👥
              </div>

              <p className="empty-title">
                {activeTab === "active"
                  ? "目前沒有啟用中的人員"
                  : "目前沒有已停用的人員"}
              </p>
            </div>


            ) : (

            /* ============================
                25. PERSON CARDS / 人員卡片
            ============================ */

            <div className="people-list">

              {displayedPeople.map((person) => (

                <div
                  key={person.id}
                  className="person-card"
                >

                  {/* 25-1. 人員頭像 */}

                  <div className="person-avatar">
                    {person.name
                      .trim()
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  {/* 25-2. 人員資訊 */}
                  <div className="person-info">

                    <div className="person-name">
                      {person.name}
                    </div>

                    <div className="person-meta">
                      <span
                        className={
                          "person-badge " +
                          (person.person_type === "travel"
                           ? "travel-badge"
                            : "regular-badge")
                        }
                      >
                        {person.person_type === "travel"
                          ? "旅遊專用"
                          : "常用人員"}
                      </span>

                      <span
                        className={
                          "person-badge " +
                          (person.is_active
                            ? "enabled-badge"
                            : "disabled-badge")
                          }
                      >
                        {person.is_active
                          ? "啟用中"
                          : "已停用"}
                      </span>

                      </div>

                    {person.person_type === "travel" && (
                      <div className="person-detail">
                        旅程：
                        {getTripName(person.trip_id)}
                      </div>
                    )}

                    {person.notes && (
                      <div className="person-detail">
                        備註：{person.notes}
                      </div>
                    )}

                    </div>

                  {/* ========================
                      26. STATUS BUTTON
                      停用／重新啟用
                  ======================== */}

                  <div className="person-actions">

                    <button
                      type="button"
                      className={
                        "status-button " +
                        (person.is_active
                          ? "disable-button"
                          : "enable-button")
                      }
                      onClick={() =>
                        void handleChangeStatus(person)
                      }
                      disabled={changingId !== null}
                    >
                      {changingId === person.id
                        ? "處理中..."
                        : person.is_active
                        ? "停用"
                        : "重新啟用"}
                    </button>

                    </div>

                </div>

              ))}


              </div>

          )}

        </section>

      </div>

      {/* ==================================
          27. CSS / 頁面排版
      ================================== */}

      <style jsx>{`
        /* 人員管理｜奶油米白＋棕色統一版 */
        * { box-sizing: border-box; }
        .people-page {
          min-height: 100vh;
          padding: 20px clamp(12px, 3vw, 24px) 60px;
          background: #f8f6f3;
          color: #49392f;
        }
        .people-container {
          width: 100%;
          max-width: 1100px;
          margin: 0 auto;
        }
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 24px;
        }
        .page-title { margin: 0; color: #49392f; font-weight: 800; }
        .page-description { margin: 8px 0 0; color: #927f70; line-height: 1.6; }
        .people-count { display: inline-flex; align-items: center; gap: 8px; }
        .count-number { color: #49392f; font-weight: 800; }
        .count-label { color: #927f70; font-weight: 600; }

        /* 新增人員／目前人員共用卡片 */
        .content-card {
          background: #faf7f2;
          border: 1px solid #e6dcd0;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 20px;
          box-shadow: 0 3px 14px rgba(103, 75, 57, 0.04);
          min-width: 0;
        }
        .section-header { margin-bottom: 22px; }
        .section-title {
          margin: 0 0 6px;
          font-size: 20px;
          font-weight: 750;
          color: #49392f;
        }
        .section-description {
          margin: 0;
          color: #927f70;
          font-size: 13px;
          line-height: 1.6;
        }
        .person-form { display: flex; flex-direction: column; gap: 18px; }
        .form-group { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
        .form-label { color: #674b39; font-size: 14px; font-weight: 650; }
        .required { color: #b45309; margin-left: 4px; }
        .optional { color: #927f70; font-size: 12px; font-weight: 400; }
        .form-input, .form-textarea {
          width: 100%;
          border: 1px solid #d8c6b4;
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 15px;
          font-family: inherit;
          color: #49392f;
          background: #ffffff;
          outline: none;
          box-sizing: border-box;
        }
        .form-input { min-height: 46px; }
        .form-textarea { min-height: 90px; resize: vertical; line-height: 1.6; }
        .form-input:focus, .form-textarea:focus {
          border-color: #a88a70;
          box-shadow: 0 0 0 3px rgba(130, 99, 73, 0.14);
        }
        .form-input::placeholder, .form-textarea::placeholder { color: #a99a8e; }
        .field-hint { margin: 0; font-size: 12px; line-height: 1.6; color: #927f70; }

        /* 人員用途的選取狀態 */
        .type-selector { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .type-option {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 46px;
          padding: 10px 12px;
          border: 1px solid #d8c6b4;
          border-radius: 10px;
          background: #ffffff;
          color: #674b39;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        .type-option.selected {
          background: #f2ebe2;
          border-color: #826349;
          color: #674b39;
        }
        .type-option input { accent-color: #826349; }

        /* 操作按鈕 */
        .form-actions { display: flex; flex-wrap: wrap; }
        .primary-button {
          min-height: 44px;
          padding: 0 22px;
          background: #826349;
          border: 1px solid #826349;
          border-radius: 10px;
          color: #ffffff;
          font-size: 14px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
        }
        .primary-button:hover:not(:disabled) { background: #674b39; }
        .primary-button:disabled, .refresh-button:disabled, .status-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .refresh-button {
          min-height: 38px;
          padding: 8px 14px;
          background: #ffffff;
          border: 1px solid #d8c6b4;
          border-radius: 9px;
          color: #674b39;
          font-size: 13px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
        }
        .list-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 20px;
        }
        .status-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 18px;
        }
        .status-tab {
          min-height: 40px;
          padding: 9px 16px;
          border: 1px solid #d8c6b4;
          border-radius: 10px;
          background: #ffffff;
          color: #674b39;
          font-size: 14px;
          font-weight: 650;
          font-family: inherit;
          cursor: pointer;
        }
        .active-tab { color: #ffffff; background: #826349; border-color: #826349; }

        /* 人員列表：每筆獨立奶油白卡片 */
        .people-list { display: flex; flex-direction: column; gap: 14px; }
        .person-card {
          display: flex;
          align-items: center;
          gap: 14px;
          min-height: 76px;
          padding: 16px;
          background: #faf7f2;
          border: 1px solid #e6dcd0;
          border-radius: 12px;
          min-width: 0;
        }
        .person-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          min-width: 44px;
          border-radius: 12px;
          background: #f2ebe2;
          color: #674b39;
          font-size: 18px;
          font-weight: 800;
        }
        .person-info { flex: 1; min-width: 0; }
        .person-name { color: #49392f; font-size: 16px; font-weight: 750; overflow-wrap: anywhere; }
        .person-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 7px; }
        .person-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 650;
        }
        .regular-badge { background: #eee3d7; color: #674b39; }
        .travel-badge { background: #efe5d9; color: #826349; }
        .enabled-badge { background: #edf2e6; color: #526a44; }
        .disabled-badge { background: #eee9e4; color: #7d7168; }
        .person-detail {
          margin-top: 6px;
          color: #927f70;
          font-size: 13px;
          line-height: 1.5;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }
        .person-actions { flex-shrink: 0; }
        .status-button {
          min-width: 80px;
          min-height: 34px;
          padding: 7px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 650;
          font-family: inherit;
          white-space: nowrap;
          cursor: pointer;
        }
        .disable-button { background: #ffffff; color: #674b39; border: 1px solid #d8c6b4; }
        .enable-button { background: #f2ebe2; color: #674b39; border: 1px solid #d8c6b4; }
        .empty-state { padding: 36px 16px; text-align: center; color: #927f70; font-size: 14px; }
        .empty-icon { margin-bottom: 12px; font-size: 32px; }
        .empty-title { margin: 0; font-size: 15px; font-weight: 650; color: #674b39; }
        .message {
          margin-bottom: 16px;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 14px;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }
        .error-message { background: #fff2ee; border: 1px solid #e9b4a8; color: #9d4034; }
        .success-message { background: #f0f4e9; border: 1px solid #cbd8bd; color: #526a44; }

        @media (max-width: 600px) {
          .people-page { padding: 16px 12px 40px; }
          .content-card { padding: 18px 14px; margin-bottom: 14px; border-radius: 14px; }
          .section-title { font-size: 18px; }
          .form-input, .form-textarea { font-size: 16px; }
          .primary-button { width: 100%; min-height: 46px; }
          .type-option { padding: 10px 6px; font-size: 13px; }
          .person-card { flex-wrap: wrap; padding: 12px; gap: 10px; }
          .person-avatar { width: 40px; height: 40px; min-width: 40px; font-size: 16px; }
          .person-name { font-size: 15px; }
          .person-actions { display: flex; justify-content: flex-end; width: 100%; }
          .status-tab { font-size: 13px; padding: 9px 12px; }
          .list-heading { align-items: flex-start; }
        }
      `}</style>

    </main>
  );
}
