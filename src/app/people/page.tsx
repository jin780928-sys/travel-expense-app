"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Person = {
  id: number;
  name: string;
  notes: string | null;
};

export default function PeoplePage() {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [message, setMessage] = useState("");

  async function loadPeople() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("尚未登入，登入後才能管理人員。");
      return;
    }

    const { data, error } = await supabase
      .from("People")
      .select("id,name,notes")
      .order("name");

    if (error) {
      setMessage("讀取失敗：" + error.message);
      return;
    }

    setPeople(data ?? []);
    setMessage("");
  }

  useEffect(() => {
    loadPeople();
  }, []);

  async function handleAddPerson() {
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("尚未登入，登入後才能新增人員。");
      return;
    }

    if (!name.trim()) {
      setMessage("請輸入人員名稱。");
      return;
    }

    const { error } = await supabase.from("People").insert({
      name: name.trim(),
      notes: notes.trim() || null,
      user_id: user.id,
    });

    if (error) {
      setMessage("新增失敗：" + error.message);
      return;
    }

    setName("");
    setNotes("");
    setMessage("人員新增成功！");
    await loadPeople();
  }

  return (
    <main style={{ maxWidth: 650, margin: "40px auto", padding: 20 }}>
      <h1>人員管理</h1>

      <input
        placeholder="姓名，例如：怡靜、朋友A"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 12 }}
      />

      <textarea
        placeholder="備註（選填）"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 12 }}
      />

      <button onClick={handleAddPerson} style={{ padding: "12px 20px" }}>
        新增人員
      </button>

      {message && <p style={{ marginTop: 20 }}>{message}</p>}

      <hr style={{ margin: "30px 0" }} />

      <h2>目前人員</h2>

      {people.length === 0 ? (
        <p>目前還沒有人員資料。</p>
      ) : (
        people.map((person) => (
          <div
            key={person.id}
            style={{
              border: "1px solid #ccc",
              padding: 14,
              borderRadius: 8,
              marginBottom: 10,
            }}
          >
            <strong>{person.name}</strong>
            {person.notes && <p>{person.notes}</p>}
          </div>
        ))
      )}
    </main>
  );
}
