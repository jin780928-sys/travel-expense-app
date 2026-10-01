"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function handleLogin() {
    setMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setMessage("登入連結寄送失敗：" + error.message);
      return;
    }

    setMessage("登入連結已寄到你的 Email，請到信箱點連結登入。");
  }

  return (
    <main style={{ maxWidth: 420, margin: "60px auto", padding: 20 }}>
      <h1>登入</h1>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          width: "100%",
          padding: 12,
          marginTop: 20,
          marginBottom: 12,
        }}
      />

      <button onClick={handleLogin} style={{ padding: "12px 20px" }}>
        寄送登入連結
      </button>

      {message && <p style={{ marginTop: 20 }}>{message}</p>}
    </main>
  );
}
