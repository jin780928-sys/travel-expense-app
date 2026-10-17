"use client";

/* =========================================
   01. Import
   ========================================= */

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

/* =========================================
   02. 路由設定
   如果既有頁面路徑不同，只要修改這裡
   ========================================= */

const ROUTES = {
  trips: "/trips",
  newTrip: "/trips/new",
  expenses: "/expenses",
  newExpense: "/expenses/new",
  dashboard: "/dashboard",
  people: "/people",
  creditCards: "/cards",
  login: "/login",
};

/* =========================================
   03. 首頁卡片設定
   ========================================= */

type MenuItem = {
  title: string;
  description: string;
  icon: string;
  href: string;
  theme: "blue" | "purple" | "green" | "orange" | "gray";
};

const travelMenus: MenuItem[] = [
  {
    title: "我的旅程",
    description: "查看行程與旅費",
    icon: "🧳",
    href: ROUTES.trips,
    theme: "blue",
  },
  {
    title: "新增旅程",
    description: "開始規劃新旅行",
    icon: "✈️",
    href: ROUTES.newTrip,
    theme: "purple",
  },
];

const expenseMenus: MenuItem[] = [
  {
    title: "花費紀錄",
    description: "查看與管理所有花費",
    icon: "🧾",
    href: ROUTES.expenses,
    theme: "green",
  },
  {
    title: "新增花費",
    description: "快速記錄每筆支出",
    icon: "💰",
    href: ROUTES.newExpense,
    theme: "orange",
  },
  {
    title: "財務總覽",
    description: "日常花費統計與信用卡帳單",
    icon: "📊",
    href: ROUTES.dashboard,
    theme: "blue",
  },
];

const settingMenus: MenuItem[] = [
  {
    title: "人員管理",
    description: "新增人員與管理分攤",
    icon: "👥",
    href: ROUTES.people,
    theme: "purple",
  },
  {
    title: "信用卡管理",
    description: "管理信用卡及結帳日",
    icon: "💳",
    href: ROUTES.creditCards,
    theme: "gray",
  },
];

/* =========================================
   04. 功能卡片元件
   ========================================= */

function MenuCard({ item }: { item: MenuItem }) {
  return (
    <Link href={item.href} className="menu-card">
      <div className={`menu-icon theme-${item.theme}`}>
        {item.icon}
      </div>

      <div className="menu-content">
        <div className="menu-title">{item.title}</div>
        <div className="menu-description">
          {item.description}
        </div>
      </div>

      <span className="menu-arrow">↗</span>
    </Link>
  );
}


/* =========================================
   05. 分類區塊元件
   ========================================= */

function MenuSection({
  icon,
  title,
  subtitle,
  items,
}: {
  icon: string;
  title: string;
  subtitle: string;
  items: MenuItem[];
}) {
  return (
    <section className="menu-section">
      <div className="section-heading">
        <div className="section-left">
          <span className="section-icon">{icon}</span>

          <h2>{title}</h2>
        </div>

        <span className="section-subtitle">
          {subtitle}
        </span>
      </div>

      <div className="menu-grid">
        {items.map((item) => (
          <MenuCard key={item.href} item={item} />
        ))}
      </div>
    </section>
  );
}

/* =========================================
   06. 首頁主程式
   ========================================= */

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

/* =========================================
     07. Supabase 登入資訊
     ========================================= */

useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      setLoading(false);
      return;
    }

          const supabase = createClient(url, key);
    let active = true;

    async function loadUser() {
      const { data } = await supabase.auth.getUser();

      if (!active) return;

  setEmail(data.user?.email ?? "");
      setLoading(false);
    }

    void loadUser();

    const { data: listener } =
      supabase.auth.onAuthStateChange((_event, session) => {
        if (!active) return;
        setEmail(session?.user?.email ?? "");
        setLoading(false);
      });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

/* =========================================
     08. 登出
     ========================================= */

async function handleLogout() {
    if (loggingOut) return;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      alert("找不到 Supabase 環境變數");
      return;
    }

    setLoggingOut(true);

    const supabase = createClient(url, key);
    const { error } = await supabase.auth.signOut();

  if (error) {
      alert(`登出失敗：${error.message}`);
      setLoggingOut(false);
      return;
    }

    window.location.assign(ROUTES.login);
  }

/* =========================================
     09. 首頁 JSX
     ========================================= */

return (
    <main className="home-page">
      <div className="home-container">

        {/* =================================
            A. 上方標題 / 使用者資訊
           ================================= */}

        <header className="header">
          <div className="brand">
            <div className="brand-logo">💼</div>

            <div>
              <div className="brand-title">
                Travel Expense
              </div>
              <div className="brand-subtitle">
                行程規劃 ＋ 旅遊／日常記帳
              </div>
            </div>
          </div>

          {email && (
            <button
              type="button"
              className="logout-button"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              <span>↪</span>
              {loggingOut ? "登出中..." : "登出"}
            </button>
          )}
        </header>

        {/* =================================
            B. 登入中
           ================================= */}

        {loading ? (
          <div className="status-panel">
            正在讀取登入資訊...
            </div>
        ) : !email ? (

          /* =============================
             C. 尚未登入
             ============================= */

          <div className="status-panel">
            <div className="status-icon">🔒</div>
            <h2>請先登入</h2>
            <p>登入後即可管理旅程與花費。</p>
            <Link href={ROUTES.login} className="login-link">
              前往登入
            </Link>
            </div>

        ) : (
          <>
            {/* =============================
                D. 歡迎區塊
               ============================= */}

            <section className="welcome-card">
              <div className="welcome-decoration">
                ✈
              </div>

              <div className="welcome-content">
                <div className="welcome-eyebrow">
                  YOUR PERSONAL DASHBOARD
                </div>

                <h1>
                  歡迎回來 👋
                  <br />
                  管理旅行與每一天的花費
                </h1>

                <p>
                  從旅程規劃、日常記帳到信用卡管理，
                  一個地方輕鬆掌握。
                  </p>

                <div className="user-chip">
                  <span>👤</span>
                  <span>{email}</span>
                </div>
              </div>
            </section>

            {/* =============================
                E. 旅程管理
               ============================= */}

            <MenuSection
              icon="✈️"
              title="旅程管理"
              subtitle="TRAVEL"
              items={travelMenus}
            />

            {/* =============================
                F. 花費管理
               ============================= */}

            <MenuSection
              icon="💰"
              title="花費管理"
              subtitle="EXPENSES"
              items={expenseMenus}
            />

            {/* =============================
                G. 管理設定
               ============================= */}

            <MenuSection
              icon="⚙️"
              title="管理設定"
              subtitle="SETTINGS"
              items={settingMenus}
            />
          </>
        )}

        {/* =================================
            H. 頁尾
           ================================= */}
        <footer className="footer">
          Travel Expense App
          <span> · </span>
          Travel smarter, spend wiser.
        </footer>
      </div>

      {/* =====================================
          10. 全部首頁 CSS
         ===================================== */}
      <style jsx global>{`
        .home-page {
          min-height: 100vh;
          background: #f8f6f3;
          color: #49392f;
          padding: 24px clamp(12px, 3vw, 28px) 64px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC", sans-serif;
        }
        .home-page, .home-page * { box-sizing: border-box; }
        .home-page .home-container { width: 100%; max-width: 1100px; margin: 0 auto; }

        /* A. 品牌與登出 */
        .home-page .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          padding: 16px 20px;
          margin-bottom: 22px;
          background: #faf7f2;
          border: 1px solid #e6dcd0;
          border-radius: 16px;
        }
        .home-page .brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .home-page .brand-logo {
          display: flex; align-items: center; justify-content: center;
          width: 48px; height: 48px; flex-shrink: 0;
          border: 1px solid #e6dcd0;
          border-radius: 14px; background: #f2ebe2; font-size: 24px;
        }
        .home-page .brand-title { font-size: 22px; font-weight: 800; color: #49392f; letter-spacing: -0.4px; }
        .home-page .brand-subtitle { margin-top: 3px; font-size: 13px; color: #927f70; line-height: 1.5; }
        .home-page .logout-button {
          display: inline-flex; align-items: center; justify-content: center;
          gap: 8px; min-height: 42px; padding: 0 16px;
          background: #fff; border: 1px solid #d8c6b4;
          border-radius: 10px; color: #674b39;
          font-size: 14px; font-weight: 700; cursor: pointer;
        }
        .home-page .logout-button:hover { background: #f2ebe2; }
        .home-page .logout-button:disabled { opacity: 0.6; cursor: wait; }

        /* B. 歡迎區 */
        .home-page .welcome-card {
          position: relative; overflow: hidden;
          border: 1px solid #e6dcd0; border-radius: 20px;
          background: #faf7f2; color: #49392f;
          padding: clamp(24px, 4vw, 40px);
          margin-bottom: 32px;
          box-shadow: 0 3px 14px rgba(103, 75, 57, 0.04);
        }
        .home-page .welcome-content { position: relative; z-index: 1; }
        .home-page .welcome-eyebrow {
          color: #927f70; font-size: 11px; font-weight: 800;
          letter-spacing: 1.8px; margin-bottom: 14px;
        }
        .home-page .welcome-card h1 {
          margin: 0; max-width: 760px;
          font-size: clamp(25px, 4vw, 36px);
          line-height: 1.45; font-weight: 800;
          letter-spacing: -0.5px; color: #49392f;
        }
        .home-page .welcome-card p {
          margin: 15px 0 20px; max-width: 660px;
          color: #927f70; font-size: 14px; line-height: 1.8;
        }
        .home-page .welcome-decoration {
          position: absolute; right: 36px; top: 12px;
          font-size: 155px; transform: rotate(-18deg);
          opacity: 0.075; color: #826349; pointer-events: none;
        }
        .home-page .user-chip {
          display: inline-flex; align-items: center; gap: 9px;
          max-width: 100%; overflow-wrap: anywhere;
          padding: 10px 14px; border: 1px solid #e6dcd0;
          border-radius: 12px; background: #fff; color: #674b39;
          font-size: 13px;
        }

        /* C. 功能分類 */
        .home-page .menu-section { margin-bottom: 30px; }
        .home-page .section-heading {
          display: flex; justify-content: space-between; align-items: center;
          flex-wrap: wrap; gap: 10px; margin-bottom: 14px;
          padding: 0 2px;
        }
        .home-page .section-left { display: flex; align-items: center; gap: 9px; }
        .home-page .section-icon { font-size: 21px; }
        .home-page .section-heading h2 {
          margin: 0; color: #49392f;
          font-size: 20px; font-weight: 800;
        }
        .home-page .section-subtitle {
          color: #927f70; font-size: 11px;
          font-weight: 700; letter-spacing: 1.5px;
        }

        /* D. 選單卡片 */
        .home-page .menu-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
        .home-page .menu-card {
          position: relative; display: flex; flex-direction: column;
          align-items: flex-start; gap: 12px; min-width: 0;
          padding: 22px; min-height: 166px;
          text-decoration: none; border: 1px solid #e6dcd0;
          border-radius: 16px; background: #faf7f2;
          transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
        }
        .home-page .menu-card:hover {
          transform: translateY(-2px); border-color: #cdb79f;
          box-shadow: 0 8px 20px rgba(103, 75, 57, .10);
        }
        .home-page .menu-card:focus-visible, .home-page .logout-button:focus-visible, .home-page .login-link:focus-visible {
          outline: 3px solid #b89b80; outline-offset: 3px;
        }
        .home-page .menu-icon {
          width: 48px; height: 48px; border: 1px solid #e6dcd0;
          border-radius: 13px; display: flex; align-items: center;
          justify-content: center; font-size: 24px;
          background: #f2ebe2;
        }
        .home-page .theme-blue, .home-page .theme-purple, .home-page .theme-green, .home-page .theme-orange, .home-page .theme-gray {
          background: #f2ebe2;
        }
        .home-page .menu-content { width: 100%; min-width: 0; padding-right: 18px; }
        .home-page .menu-title { font-size: 17px; font-weight: 750; color: #49392f; margin-bottom: 7px; }
        .home-page .menu-description { font-size: 13px; line-height: 1.6; color: #927f70; }
        .home-page .menu-arrow {
          position: absolute; right: 20px; bottom: 20px;
          color: #826349; font-size: 19px;
        }

        /* E. 登入狀態 */
        .home-page .status-panel {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; text-align: center;
          min-height: 260px; padding: 32px 18px;
          border: 1px solid #e6dcd0; border-radius: 16px;
          background: #faf7f2; color: #927f70;
        }
        .home-page .status-icon { font-size: 32px; }
        .home-page .status-panel h2 { color: #49392f; }
        .home-page .login-link {
          display: inline-flex; align-items: center; justify-content: center;
          min-height: 44px; margin-top: 12px; padding: 0 20px;
          border-radius: 10px; background: #826349; color: #fff;
          text-decoration: none; font-weight: 700;
        }
        .home-page .login-link:hover { background: #674b39; }

        /* F. 頁尾 */
        .home-page .footer { margin-top: 32px; text-align: center; color: #927f70; font-size: 12px; }

        /* G. 平板 */
        @media (max-width: 800px) {
          .home-page .menu-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .home-page .welcome-decoration { right: -8px; opacity: .05; }
        }

        /* H. 手機 */
        @media (max-width: 480px) {
          .home-page { padding: 12px 12px 40px; }
          .home-page .header { padding: 14px; gap: 10px; }
          .home-page .brand { gap: 9px; }
          .home-page .brand-logo { width: 42px; height: 42px; font-size: 21px; }
          .home-page .brand-title { font-size: 18px; }
          .home-page .brand-subtitle { font-size: 11px; }
          .home-page .logout-button { min-height: 38px; padding: 0 12px; font-size: 12px; }
          .home-page .welcome-card { padding: 23px 18px; margin-bottom: 27px; border-radius: 16px; }
          .home-page .welcome-card h1 { font-size: 23px; }
          .home-page .welcome-card p { font-size: 13px; }
          .home-page .welcome-decoration { font-size: 105px; top: 16px; }
          .home-page .section-heading h2 { font-size: 18px; }
          .home-page .menu-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
          .home-page .menu-card { min-height: 150px; padding: 15px 13px; gap: 10px; border-radius: 14px; }
          .home-page .menu-icon { width: 41px; height: 41px; font-size: 21px; }
          .home-page .menu-title { font-size: 15px; }
          .home-page .menu-description { font-size: 12px; }
          .home-page .menu-arrow { right: 12px; bottom: 12px; font-size: 16px; }
          .home-page .section-subtitle { font-size: 10px; }
          .home-page .user-chip { font-size: 12px; }
        }
        @media (max-width: 340px) {
          .home-page .menu-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </main>
  );
}
