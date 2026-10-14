"use client";

// =====================================================
// 付款方式獨立明細頁
// src/app/cards/[cardKey]/page.tsx
//
// 01. 套件與型別
// 02. 頁面狀態
// 03. Supabase 資料讀取
// 04. 頁首與付款工具資訊
// 05. 三分頁切換
// 06. 消費紀錄
// 07. 歷史帳單
// 08. 統計分析
// 09. 響應式排版
// =====================================================

// ==================== 01. 套件 ====================
import Link from "next/link";

import { useParams } from "next/navigation";

import {
  useEffect,
  useState,
} from "react";

import {
  supabase,
} from "../../../lib/supabase";

type TabType =
  | "expenses"
  | "statements"
  | "analytics";

type CreditCard = {
  id: number;
  name: string;
  statement_day: number | null;
  due_day: number | null;
  is_active: boolean;
};

type PaymentMethod = {
  id: number;
  name: string;
  payment_type: string;
  bank_name: string | null;
  currency: string | null;
  linked_type: string | null;
  linked_id: string | null;
  is_active: boolean;
};

type DetailItem = {
  id: number;
  name: string;
  type: string;
  statementDay: number | null;
  dueDay: number | null;
  description: string;
};

// ==================== 02. 頁面狀態 ====================

export default function CardDetailPage() {

  const params = useParams();

  const cardKey = String(
    params.cardKey ?? ""
  );


const [activeTab, setActiveTab] =
    useState<TabType>("expenses");

  const [detail, setDetail] =
    useState<DetailItem | null>(null);

  const [loading, setLoading] =
    useState(true);

const [errorMessage, setErrorMessage] =
    useState("");

// ==================== 03. Supabase 資料讀取 ====================

useEffect(() => {

    let active = true;

    async function loadDetail() {

      setLoading(true);
      setErrorMessage("");

  try {

        const { data: auth, error: authError } =
          await supabase.auth.getUser();

        if (authError) throw authError;

        if (!auth.user) {
          throw new Error("請先登入");
        }

        const isCredit = cardKey.startsWith(
          "credit-"
        );

        const isMethod = cardKey.startsWith(
          "method-"
        );

      if (!isCredit && !isMethod) {
          throw new Error("付款工具網址不正確");
        }

        const id = Number(
          cardKey.replace(
            isCredit ? "credit-" : "method-",
            ""
          )
        );

      if (!Number.isInteger(id) || id <= 0) {
          throw new Error("付款工具 ID 不正確");
        }

        if (isCredit) {

          const { data, error } =
            await supabase
              .from("CreditCards")
          .select(
                "id,name,statement_day,due_day,is_active"
              )
              .eq("id", id)
              .eq("user_id", auth.user.id)
              .single();


    if (error) throw error;

          const card = data as CreditCard;

          if (!active) return;

          setDetail({
            id: card.id,
            name: card.name,
            type: "信用卡",
            statementDay: card.statement_day,
            dueDay: card.due_day,
            description: "信用卡帳單管理",
          });

        } else {

    const { data, error } =
            await supabase
              .from("PaymentMethods")
              .select(
                "id,name,payment_type,bank_name,currency,linked_type,linked_id,is_active"
              )
          .eq("id", id)
              .eq("user_id", auth.user.id)
              .single();

          if (error) throw error;


    const method = data as PaymentMethod;

          const names: Record<string, string> = {
            debit_card: "金融卡",
            apple_pay: "Apple Pay",
            google_pay: "Google Pay",
            other: "其他付款方式",
            };

          if (!active) return;

          setDetail({
            id: method.id,
            name: method.name,
            type:
              names[method.payment_type] ||
              "其他付款方式",
            statementDay: null,
            dueDay: null,
            description:
              method.bank_name ||
              method.currency ||
              "付款工具明細",
            });
        }

      } catch (error) {

  console.error(
    "讀取付款工具失敗:",
    error
  );

  if (active) {
    const errorText =
      error instanceof Error
        ? error.message
        : JSON.stringify(error, null, 2);

    setErrorMessage(
      `讀取付款工具失敗：${errorText}`
    );
  }

} finally {

        if (active) {
          setLoading(false);
        }

      }
    }

          void loadDetail();

    return () => {
      active = false;
    };

  }, [cardKey]);

// ==================== 04. 頁面 ====================

  return (


    <main className="page">

      <Link
        href="/cards"
        className="backLink"
      >
        ← 返回付款方式管理
      </Link>

      {loading ? (

        <div className="status">
          正在載入付款工具...
        </div>

      ) : errorMessage ? (

        <div className="status error">
          {errorMessage}
        </div>

        ) : detail ? (

        <>

          <header className="header">

            <div>
              <h1>{detail.name}</h1>

              <div className="detailMeta">

                <span className="typeBadge">
                  {detail.type}
                </span>

                <span>

                  {detail.description}
                </span>

              </div>

              {detail.type === "信用卡" && (

                <div className="billingInfo">

                  <span>
                    結帳日：
                    {detail.statementDay
                      ? `每月 ${detail.statementDay} 日`
                      : "未設定"}
                  </span>

                  <span>
                    繳款日：
                    {detail.dueDay
                      ? `每月 ${detail.dueDay} 日`
                      : "未設定"}
                  </span>

                  </div>

              )}

            </div>

          </header>

          {/* ==================== 05. 三分頁 ==================== */}

          <nav className="tabs">

            <button
              type="button"
              className={
                activeTab === "expenses"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab("expenses")
              }
            >
              消費紀錄
            </button>
            <button
              type="button"
              className={
                activeTab === "statements"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab("statements")
              }
            >
              歷史帳單
            </button>

            <button
              type="button"
              className={
                activeTab === "analytics"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab("analytics")
              }
              >
              統計分析
            </button>

          </nav>

          {/* ==================== 06. 消費紀錄 ==================== */}

          {activeTab === "expenses" && (

            <section className="panel">

              <h2>消費紀錄</h2>

              <p>
                將顯示這個付款工具的所有日常與
                旅程花費，支援月份篩選、
                搜尋及每頁 20 筆。
                </p>

              <div className="placeholder">
                下一步串接 Expenses 單筆消費資料
              </div>

            </section>

            )}


{/* ==================== 07. 歷史帳單 ==================== */}

          {activeTab === "statements" && (

            <section className="panel">

              <h2>
                {detail.type === "信用卡"
                  ? "信用卡歷史帳單"
                  : "歷史消費彙總"}

                </h2>

              <p>
                {detail.type === "信用卡"
                  ? "依照這張信用卡設定的結帳日，計算每期帳單金額、繳款狀態及歷史明細。"
                  : "非信用卡付款工具將依自然月份彙總消費，不產生信用卡繳款帳單。"}

                </p>

              <div className="placeholder">
                下一步串接歷史帳單與結帳週期
              </div>

            </section>

          )}

          {/* ==================== 08. 統計分析 ==================== */}

          {activeTab === "analytics" && (

            <section className="panel">

              <h2>統計分析</h2>

              <p>
                將提供每月支出趨勢、消費分類、
                日常與旅程占比，以及各幣別統計。
              </p>

              <div className="placeholder">
                下一步串接統計圖表
              </div>

            </section>

          )}

          </>

      ) : null}


{/* ==================== 09. 排版 ==================== */}

      <style jsx>{`

        .page {
          max-width: 1100px;
          margin: 0 auto;
          padding: 28px 18px 70px;
          color: #172033;
        }


.backLink {
          display: inline-block;
          color: #64748b;
          text-decoration: none;
          font-size: 14px;
          margin-bottom: 25px;
        }

        .header {
          margin-bottom: 24px;
        }

        h1 {
          font-size: 30px;
          font-weight: 800;
          margin: 0;
        }

        .detailMeta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 11px;
          font-size: 13px;
          color: #64748b;
        }

        .typeBadge {
          background: #eef2ff;
          color: #4338ca;
          padding: 5px 10px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
        }

        .billingInfo {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-top: 14px;
          font-size: 13px;
          color: #475569;
        }

        .tabs {
          display: flex;
          gap: 8px;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 20px;
          padding-bottom: 10px;
        }

        .tabs button {
          border: 0;
          border-radius: 9px;
          padding: 11px 17px;
          background: #f1f5f9;
          color: #64748b;
          font-size: 14px;
          cursor: pointer;
        }

        .tabs button.active {
          background: #4f46e5;
          color: #fff;
          font-weight: 700;
        }

        .panel {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 23px;
          background: #fff;
          min-height: 240px;
        }

        .panel h2 {
          font-size: 20px;
          margin: 0 0 12px;
        }

        .panel p {
          font-size: 13px;
          color: #64748b;
          line-height: 1.8;
        }

        .placeholder {
          margin-top: 23px;
          padding: 32px 15px;
          border: 1px dashed #cbd5e1;
          border-radius: 11px;
          text-align: center;
          color: #94a3b8;
          font-size: 13px;
          background: #f8fafc;
        }

        .status {
          padding: 45px 15px;
          text-align: center;
          color: #64748b;
        }

        .status.error {
          color: #dc2626;
        }

        @media(max-width:600px) {

          .page {
            padding: 20px 12px 55px;
            }

          h1 {
            font-size: 24px;
          }

          .tabs {
            gap: 5px;
          }

          .tabs button {
            flex: 1;
            padding: 10px 5px;
            font-size: 12px;
          }


.panel {
            padding: 16px;
          }

        }

      `}</style>

    </main>

  );
}
