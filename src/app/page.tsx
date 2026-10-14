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
  creditCards: "/credit-cards",
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
    title: "日常花費統計",
    description: "分析分類與信用卡帳單",
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
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
        }

        .home-page {
          min-height: 100vh;
          background: #f6f8fc;
          color: #172033;
          font-family:
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            "Noto Sans TC",
            sans-serif;
          padding: 28px 18px 60px;
        }

        .home-container {
          width: 100%;
          max-width: 1040px;
          margin: 0 auto;
        }

        /* =================================
           A. Header
           ================================= */

           .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          background: #2563eb;
          color: white;
          border-radius: 15px;
          font-size: 25px;
          flex-shrink: 0;
        }

        .brand-title {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .brand-subtitle {
          font-size: 13px;
          margin-top: 3px;
          color: #64748b;
        }

        .logout-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 10px 16px;
          border-radius: 12px;
          background: white;
          border: 1px solid #e2e8f0;
          color: #475569;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          flex-shrink: 0;
        }

        .logout-button:hover {
          background: #f1f5f9;
        }

.logout-button:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        /* =================================
           B. Welcome card
           ================================= */

           .welcome-card {
          position: relative;
          overflow: hidden;
          border-radius: 24px;
          padding: 35px 32px;
          background:
          linear-gradient(
              115deg,
              #1d4ed8 0%,
              #2563eb 54%,
              #60a5fa 100%
            );
          color: white;
          margin-bottom: 34px;
        }


.welcome-content {
          position: relative;
          z-index: 1;
        }

        .welcome-eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 2px;
          color: #dbeafe;
          margin-bottom: 12px;
        }

        .welcome-card h1 {
          margin: 0;
          font-size: clamp(24px, 3vw, 34px);
          line-height: 1.45;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .welcome-card p {
          margin: 15px 0 20px;
          max-width: 520px;
          color: #e0edff;
          font-size: 14px;
          line-height: 1.8;
        }

        .welcome-decoration {
          position: absolute;
          right: 45px;
          top: 4px;
          font-size: 165px;
          transform: rotate(-18deg);
          opacity: 0.13;
          pointer-events: none;
        }

        .user-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 13px;
          border-radius: 12px;
          background: rgba(255,255,255,0.16);
          border: 1px solid rgba(255,255,255,0.2);
          font-size: 13px;
          max-width: 100%;
          overflow-wrap: anywhere;
        }

        /* =================================
           C. Section
           ================================= */

           .menu-section {
          margin-bottom: 32px;
        }

        .section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .section-left {
          display: flex;
          align-items: center;
          gap: 9px;
        }


.section-icon {
          font-size: 22px;
        }

        .section-heading h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 800;
        }

        .section-subtitle {
          color: #94a3b8;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.5px;
        }

        /* =================================
           D. Menu cards
           ================================= */

           .menu-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 15px;
        }

        .menu-card {
          position: relative;
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 14px;
          text-decoration: none;
          background: white;
          border: 1px solid #e8edf5;
          border-radius: 18px;
          padding: 22px;
          min-height: 166px;
          transition:
          transform 0.2s ease,
            box-shadow 0.2s ease,
            border-color 0.2s ease;
        }

        .menu-card:hover {
        transform: translateY(-3px);
          box-shadow:
            0 12px 25px rgba(15,23,42,0.07);
          border-color: #bfdbfe;
        }

        .menu-card:focus-visible,
        .logout-button:focus-visible,
        .login-link:focus-visible {
          outline: 3px solid #93c5fd;
          outline-offset: 3px;
        }


.menu-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }

        .theme-blue {
          background: #dbeafe;
        }

        .theme-purple {
          background: #f3e8ff;
        }

        .theme-green {
          background: #dcfce7;
        }

        .theme-orange {
          background: #ffedd5;
        }

        .theme-gray {
          background: #f1f5f9;
        }

        .menu-content {
          width: 100%;
          min-width: 0;
          padding-right: 15px;
        }

        .menu-title {
          font-size: 17px;
          font-weight: 750;
          color: #1e293b;
          margin-bottom: 7px;
        }

        .menu-description {
          font-size: 13px;
          line-height: 1.6;
          color: #64748b;
        }

        .menu-arrow {
          position: absolute;
          right: 20px;
          bottom: 23px;
          font-size: 20px;
          color: #94a3b8;
        }

        /* =================================
           E. Login states
           ================================= */

           .status-panel {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          min-height: 260px;
          padding: 32px;
          border-radius: 20px;
          background: white;
          border: 1px solid #e2e8f0;
          text-align: center;
          color: #64748b;
        }

        .status-icon {
          font-size: 32px;
        }

        .status-panel h2 {
          color: #1e293b;
        }

        .login-link {
          display: inline-block;
          margin-top: 12px;
          padding: 12px 20px;
          border-radius: 12px;
          background: #2563eb;
          color: white;
          text-decoration: none;
          font-weight: 700;
        }

        /* =================================
           F. Footer
           ================================= */

           .footer {
          margin-top: 30px;
          text-align: center;
          color: #94a3b8;
          font-size: 12px;
        }

        /* =================================
           G. Tablet
           ================================= */

           @media (max-width: 800px) {
          .menu-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .welcome-card {
            padding: 28px 25px;
          }
        }

        /* =================================
           H. Mobile
           ================================= */

           @media (max-width: 480px) {
          .home-page {
            padding: 20px 14px 40px;
          }

          .header {
            gap: 8px;
            margin-bottom: 18px;
          }

          .brand {
            gap: 8px;
            min-width: 0;
          }

          .brand-logo {
            width: 39px;
            height: 39px;
            font-size: 20px;
            border-radius: 12px;
          }

          .brand-title {
            font-size: 17px;
          }

          .brand-subtitle {
            font-size: 10px;
          }

          .logout-button {
            padding: 9px 11px;
            font-size: 12px;
          }

          .welcome-card {
            padding: 26px 20px;
            border-radius: 20px;
            margin-bottom: 28px;
          }

          .welcome-card h1 {
            font-size: 23px;
          }

          .welcome-card p {
            font-size: 12px;
            margin: 12px 0 17px;
          }

          .welcome-decoration {
            right: -8px;
            top: 15px;
            font-size: 115px;
          }

          .section-heading h2 {
            font-size: 17px;
          }


          .menu-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap: 10px;
          }


          .menu-card {
            min-height: 148px;
            padding: 16px 13px;
            gap: 12px;
            border-radius: 15px;
          }

          .menu-icon {
            width: 42px;
            height: 42px;
            font-size: 21px;
          }

          .menu-title {
            font-size: 15px;
          }

          .menu-description {
            font-size: 11px;
          }

          .menu-arrow {
            right: 12px;
            bottom: 13px;
            font-size: 16px;
          }

          .menu-section {
            margin-bottom: 27px;
          }

          .user-chip {
            font-size: 11px;
          }
        }
      `}</style>
    </main>
  );
}
