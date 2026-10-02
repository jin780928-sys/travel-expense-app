"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    async function checkLogin() {
      const {
  data: { session },
} = await supabase.auth.getSession();

setLoggedIn(!!session);
setUserEmail(session?.user?.email || "");
    }

    checkLogin();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setLoggedIn(false);
  }

  return (
    <main
      style={{
        maxWidth: 700,
        margin: "40px auto",
        padding: 20,
      }}
    >
      <h1>Travel Expense App</h1>

      <p>行程規劃＋旅遊／日常記帳</p>
      {loggedIn && userEmail && (
  <p style={{ marginTop: 12 }}>
    目前登入：{userEmail}
  </p>
)}

      <div
        style={{
          display: "grid",
          gap: 12,
          marginTop: 30,
        }}
      >
        <Link href="/trips">🧳 我的旅程</Link>

        <Link href="/trips/new">➕ 新增旅程</Link>

        <Link href="/expenses">💰 花費紀錄</Link>

        <Link href="/expenses/new">➕ 新增花費</Link>

        <Link href="/dashboard">📊 日常花費統計</Link>

        <Link href="/people">👥 人員管理</Link>

        <Link href="/cards">💳 信用卡管理</Link>

        {!loggedIn ? (
          <Link href="/login">🔐 登入</Link>
        ) : (
          <button
            onClick={handleLogout}
            style={{
              width: "fit-content",
              padding: "8px 12px",
            }}
          >
            🚪 登出
          </button>
        )}
      </div>
    </main>
  );
}
