import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Travel Expense App",
  description: "行程規劃＋旅遊／日常記帳",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
