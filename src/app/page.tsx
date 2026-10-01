import Link from "next/link";

export default function Home() {
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

        <Link href="/people">👥 人員管理</Link>

        <Link href="/login">🔐 登入</Link>
      </div>
    </main>
  );
}
