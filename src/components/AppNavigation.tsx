
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";


const navigationItems = [
  {
    label: "🏠 回首頁",
    href: "/",
  },
  {
    label: "🧳 我的旅程",
    href: "/trips",
  },
  {
    label: "＋ 新增花費",
    href: "/expenses/new",
  },
  {
    label: "💰 花費紀錄",
    href: "/expenses",
  },
  {
    label: "💳 信用卡管理",
    href: "/cards",
  },
];


export default function AppNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="主要導覽"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: 10,
        width: "100%",
        boxSizing: "border-box",
        padding: "14px 12px",
        marginBottom: 24,
        background: "#faf7f2",
        border: "1px solid #e6dcd0",
        borderRadius: 14,
      }}
    >
      {navigationItems.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 42,
              padding: "0 16px",
              boxSizing: "border-box",
              background: isActive ? "#826349" : "#ffffff",
              color: isActive ? "#ffffff" : "#674b39",
              border: "1px solid #d8c6b4",
              borderRadius: 11,
              fontSize: 14,
              fontWeight: 700,
              textDecoration: "none",
              whiteSpace: "nowrap",
              cursor: "pointer",
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
