"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Question = {
  id: number;
  question: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_answer: "A" | "B" | "C" | "D";
  score: number;
  question_order: number;
};

const emptyForm = {
  question: "",
  choice_a: "",
  choice_b: "",
  choice_c: "",
  choice_d: "",
  correct_answer: "A" as "A" | "B" | "C" | "D",
  score: 1,
  question_order: 1,
};

export default function QuestionsAdminPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [form, setForm] = useState(emptyForm);

  const [search, setSearch] = useState("");

  const [message, setMessage] = useState("");

  const [error, setError] = useState("");

  useEffect(() => {
    loadQuestions();

    const channel = supabase
      .channel("admin-questions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "questions",
        },
        () => {
          loadQuestions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadQuestions() {
    try {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .order("question_order", {
          ascending: true,
        });

      if (error) {
        setError(error.message);
        return;
      }

      setQuestions((data || []) as Question[]);
    } catch {
      setError("ไม่สามารถโหลดข้อสอบได้");
    } finally {
      setLoading(false);
    }
  }

  function openAddForm() {
    setEditingId(null);

    setForm({
      ...emptyForm,
      question_order:
        questions.length + 1,
    });

    setMessage("");
    setError("");
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function openEditForm(question: Question) {
    setEditingId(question.id);

    setForm({
      question: question.question,
      choice_a: question.choice_a,
      choice_b: question.choice_b,
      choice_c: question.choice_c,
      choice_d: question.choice_d,
      correct_answer:
        question.correct_answer,
      score: question.score,
      question_order:
        question.question_order,
    });

    setMessage("");
    setError("");
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function updateField(
    field: keyof typeof emptyForm,
    value: string | number
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function saveQuestion(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setMessage("");
    setError("");

    if (
      !form.question.trim() ||
      !form.choice_a.trim() ||
      !form.choice_b.trim() ||
      !form.choice_c.trim() ||
      !form.choice_d.trim()
    ) {
      setError(
        "กรุณากรอกคำถามและตัวเลือกให้ครบทุกช่อง"
      );

      return;
    }

    if (form.score <= 0) {
      setError("คะแนนต้องมากกว่า 0");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        question: form.question.trim(),
        choice_a: form.choice_a.trim(),
        choice_b: form.choice_b.trim(),
        choice_c: form.choice_c.trim(),
        choice_d: form.choice_d.trim(),
        correct_answer:
          form.correct_answer,
        score: Number(form.score),
        question_order:
          Number(form.question_order),
      };

      if (editingId !== null) {
        const { error } = await supabase
          .from("questions")
          .update(payload)
          .eq("id", editingId);

        if (error) {
          setError(error.message);
          return;
        }

        setMessage(
          "✅ แก้ไขข้อสอบเรียบร้อยแล้ว"
        );
      } else {
        const { error } = await supabase
          .from("questions")
          .insert(payload);

        if (error) {
          setError(error.message);
          return;
        }

        setMessage(
          "✅ เพิ่มข้อสอบเรียบร้อยแล้ว"
        );
      }

      await loadQuestions();

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch {
      setError(
        "เกิดข้อผิดพลาดในการบันทึกข้อสอบ"
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteQuestion(
    question: Question
  ) {
    const confirmed = window.confirm(
      `ต้องการลบข้อ ${question.question_order} ใช่หรือไม่?\n\n${question.question}`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("questions")
        .delete()
        .eq("id", question.id);

      if (error) {
        setError(error.message);
        return;
      }

      setMessage(
        "🗑️ ลบข้อสอบเรียบร้อยแล้ว"
      );

      await loadQuestions();
    } catch {
      setError("ลบข้อสอบไม่สำเร็จ");
    }
  }

  async function duplicateQuestion(
    question: Question
  ) {
    try {
      const { error } = await supabase
        .from("questions")
        .insert({
          question:
            question.question +
            " (สำเนา)",
          choice_a: question.choice_a,
          choice_b: question.choice_b,
          choice_c: question.choice_c,
          choice_d: question.choice_d,
          correct_answer:
            question.correct_answer,
          score: question.score,
          question_order:
            questions.length + 1,
        });

      if (error) {
        setError(error.message);
        return;
      }

      setMessage(
        "📋 คัดลอกข้อสอบเรียบร้อยแล้ว"
      );

      await loadQuestions();
    } catch {
      setError("คัดลอกข้อสอบไม่สำเร็จ");
    }
  }

  const filteredQuestions =
    questions.filter((item) => {
      const text = `
        ${item.question}
        ${item.choice_a}
        ${item.choice_b}
        ${item.choice_c}
        ${item.choice_d}
      `.toLowerCase();

      return text.includes(
        search.toLowerCase()
      );
    });

  const totalScore = questions.reduce(
    (sum, item) =>
      sum + Number(item.score || 0),
    0
  );

  return (
    <main className="min-h-screen bg-[#06154f] text-white">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-blue-300/10 bg-[#07164d]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-xs font-black tracking-[0.3em] text-cyan-300">
              ADMIN CONTROL
            </div>

            <h1 className="mt-1 text-2xl font-black">
              📝 จัดการข้อสอบ
            </h1>
          </div>

          <div className="flex gap-2">
            <a
              href="/admin"
              className="rounded-xl border border-blue-300/15 bg-white/5 px-4 py-2 text-sm font-bold transition hover:bg-white/10"
            >
              📊 Dashboard
            </a>

            <a
              href="/"
              className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-black text-black"
            >
              🏠 หน้าหลัก
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* TITLE */}
        <div className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="text-sm font-black tracking-[0.2em] text-cyan-300">
              QUESTION MANAGEMENT
            </div>

            <h2 className="mt-1 text-4xl font-black">
              🎮 คลังข้อสอบ
            </h2>

            <p className="mt-2 text-sm text-blue-100/40">
              เพิ่ม แก้ไข ลบ และจัดการข้อสอบ
            </p>
          </div>

          <button
            onClick={openAddForm}
            className="rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-4 font-black text-white shadow-[0_0_30px_rgba(0,200,255,0.2)] transition hover:scale-[1.02]"
          >
            ＋ เพิ่มข้อสอบ
          </button>
        </div>

        {/* MESSAGE */}
        {message && (
          <div className="mb-5 rounded-2xl border border-green-400/20 bg-green-400/10 px-5 py-4 text-sm font-bold text-green-300">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-sm font-bold text-red-300">
            ⚠️ {error}
          </div>
        )}

        {/* FORM */}
        {showForm && (
          <section className="mb-8 rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-[#09276f] to-[#07194d] p-6 shadow-[0_0_50px_rgba(0,100,255,0.12)] md:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="text-xs font-black tracking-[0.2em] text-cyan-300">
                  {editingId !== null
                    ? "EDIT QUESTION"
                    : "NEW QUESTION"}
                </div>

                <h3 className="mt-1 text-2xl font-black">
                  {editingId !== null
                    ? "✏️ แก้ไขข้อสอบ"
                    : "➕ เพิ่มข้อสอบ"}
                </h3>
              </div>

              <button
                onClick={closeForm}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white/50 hover:text-white"
              >
                ✕ ปิด
              </button>
            </div>

            <form
              onSubmit={saveQuestion}
              className="space-y-5"
            >
              {/* QUESTION */}
              <div>
                <label className="mb-2 block text-sm font-black text-blue-100/70">
                  คำถาม
                </label>

                <textarea
                  value={form.question}
                  onChange={(e) =>
                    updateField(
                      "question",
                      e.target.value
                    )
                  }
                  rows={4}
                  placeholder="พิมพ์คำถาม..."
                  className="w-full resize-none rounded-2xl border border-blue-300/15 bg-[#040d35] px-5 py-4 text-white outline-none placeholder:text-white/20 focus:border-cyan-300"
                />
              </div>

              {/* CHOICES */}
              <div className="grid gap-4 md:grid-cols-2">
                <ChoiceInput
                  letter="A"
                  value={form.choice_a}
                  onChange={(value) =>
                    updateField(
                      "choice_a",
                      value
                    )
                  }
                />

                <ChoiceInput
                  letter="B"
                  value={form.choice_b}
                  onChange={(value) =>
                    updateField(
                      "choice_b",
                      value
                    )
                  }
                />

                <ChoiceInput
                  letter="C"
                  value={form.choice_c}
                  onChange={(value) =>
                    updateField(
                      "choice_c",
                      value
                    )
                  }
                />

                <ChoiceInput
                  letter="D"
                  value={form.choice_d}
                  onChange={(value) =>
                    updateField(
                      "choice_d",
                      value
                    )
                  }
                />
              </div>

              {/* SETTINGS */}
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-black text-blue-100/70">
                    เฉลย
                  </label>

                  <select
                    value={form.correct_answer}
                    onChange={(e) =>
                      updateField(
                        "correct_answer",
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-blue-300/15 bg-[#040d35] px-4 py-3 text-white outline-none focus:border-cyan-300"
                  >
                    <option value="A">
                      ก. A
                    </option>

                    <option value="B">
                      ข. B
                    </option>

                    <option value="C">
                      ค. C
                    </option>

                    <option value="D">
                      ง. D
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-blue-100/70">
                    คะแนน
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={form.score}
                    onChange={(e) =>
                      updateField(
                        "score",
                        Number(
                          e.target.value
                        )
                      )
                    }
                    className="w-full rounded-xl border border-blue-300/15 bg-[#040d35] px-4 py-3 text-white outline-none focus:border-cyan-300"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-blue-100/70">
                    ลำดับข้อ
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={
                      form.question_order
                    }
                    onChange={(e) =>
                      updateField(
                        "question_order",
                        Number(
                          e.target.value
                        )
                      )
                    }
                    className="w-full rounded-xl border border-blue-300/15 bg-[#040d35] px-4 py-3 text-white outline-none focus:border-cyan-300"
                  />
                </div>
              </div>

              {/* SAVE */}
              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 py-4 font-black transition hover:scale-[1.01] disabled:opacity-50"
                >
                  {saving
                    ? "⏳ กำลังบันทึก..."
                    : editingId !== null
                    ? "💾 บันทึกการแก้ไข"
                    : "💾 เพิ่มข้อสอบ"}
                </button>

                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-2xl border border-white/10 bg-white/5 px-7 py-4 font-bold text-white/60 hover:text-white"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </section>
        )}

        {/* SUMMARY */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Summary
            icon="📝"
            title="จำนวนข้อ"
            value={`${questions.length} ข้อ`}
          />

          <Summary
            icon="🎯"
            title="คะแนนเต็ม"
            value={`${totalScore} คะแนน`}
          />

          <Summary
            icon="⚡"
            title="สถานะ"
            value="LIVE"
          />
        </div>

        {/* SEARCH */}
        <div className="mb-5 flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2">
              🔍
            </span>

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="ค้นหาข้อสอบ..."
              className="w-full rounded-2xl border border-blue-300/15 bg-[#07194d]/80 py-4 pl-11 pr-5 text-white outline-none placeholder:text-white/20 focus:border-cyan-300"
            />
          </div>

          <button
            onClick={loadQuestions}
            className="rounded-2xl border border-blue-300/15 bg-[#07194d]/80 px-6 py-4 font-bold hover:bg-blue-500/10"
          >
            🔄 รีเฟรช
          </button>
        </div>

        {/* QUESTIONS */}
        <section className="space-y-4">
          {loading ? (
            <div className="rounded-3xl border border-blue-300/10 bg-[#07194d]/80 px-6 py-20 text-center">
              <div className="text-6xl animate-bounce">
                🎮
              </div>

              <div className="mt-4 font-bold text-blue-100/40">
                กำลังโหลดข้อสอบ...
              </div>
            </div>
          ) : filteredQuestions.length ===
            0 ? (
            <div className="rounded-3xl border border-blue-300/10 bg-[#07194d]/80 px-6 py-20 text-center">
              <div className="text-6xl">
                📝
              </div>

              <div className="mt-4 text-xl font-black">
                ไม่พบข้อสอบ
              </div>

              <button
                onClick={openAddForm}
                className="mt-5 rounded-xl bg-cyan-400 px-5 py-3 font-black text-black"
              >
                ＋ เพิ่มข้อสอบ
              </button>
            </div>
          ) : (
            filteredQuestions.map(
              (question, index) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  index={index}
                  onEdit={() =>
                    openEditForm(
                      question
                    )
                  }
                  onDelete={() =>
                    deleteQuestion(
                      question
                    )
                  }
                  onDuplicate={() =>
                    duplicateQuestion(
                      question
                    )
                  }
                />
              )
            )
          )}
        </section>
      </div>
    </main>
  );
}

/* ==========================================
   CHOICE INPUT
========================================== */

function ChoiceInput({
  letter,
  value,
  onChange,
}: {
  letter: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-sm font-black text-blue-100/70">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
          {letter}
        </span>

        ตัวเลือก {letter}
      </label>

      <textarea
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        rows={3}
        placeholder={`ตัวเลือก ${letter}...`}
        className="w-full resize-none rounded-2xl border border-blue-300/15 bg-[#040d35] px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-cyan-300"
      />
    </div>
  );
}

/* ==========================================
   QUESTION CARD
========================================== */

function QuestionCard({
  question,
  index,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  question: Question;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const choices = [
    {
      letter: "A",
      text: question.choice_a,
    },
    {
      letter: "B",
      text: question.choice_b,
    },
    {
      letter: "C",
      text: question.choice_c,
    },
    {
      letter: "D",
      text: question.choice_d,
    },
  ];

  return (
    <article className="overflow-hidden rounded-3xl border border-blue-300/10 bg-[#07194d]/80 transition hover:border-cyan-300/25">
      {/* CARD HEADER */}
      <div className="flex flex-col gap-4 border-b border-blue-300/10 px-6 py-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 text-lg font-black text-black">
            {question.question_order}
          </div>

          <div>
            <div className="text-xs font-black tracking-widest text-cyan-300">
              QUESTION {question.question_order}
            </div>

            <div className="mt-1 text-xs text-blue-100/30">
              คะแนน {question.score} คะแนน
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onEdit}
            className="rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-sm font-black text-cyan-300 hover:bg-cyan-400/20"
          >
            ✏️ แก้ไข
          </button>

          <button
            onClick={onDuplicate}
            className="rounded-xl border border-blue-300/15 bg-white/5 px-4 py-2 text-sm font-bold text-blue-100/60 hover:text-white"
          >
            📋 คัดลอก
          </button>

          <button
            onClick={onDelete}
            className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-2 text-sm font-black text-red-300 hover:bg-red-400/10"
          >
            🗑️ ลบ
          </button>
        </div>
      </div>

      {/* QUESTION */}
      <div className="px-6 py-6">
        <h3 className="text-lg font-black leading-8 text-white">
          {question.question}
        </h3>

        {/* CHOICES */}
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {choices.map((choice) => {
            const correct =
              choice.letter ===
              question.correct_answer;

            return (
              <div
                key={choice.letter}
                className={`rounded-2xl border p-4 ${
                  correct
                    ? "border-green-400/30 bg-green-400/10"
                    : "border-blue-300/10 bg-[#040d35]/50"
                }`}
              >
                <div className="flex gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-black ${
                      correct
                        ? "bg-green-400 text-black"
                        : "bg-blue-500/10 text-cyan-300"
                    }`}
                  >
                    {choice.letter}
                  </div>

                  <div className="flex-1 text-sm leading-6 text-blue-50/70">
                    {choice.text}
                  </div>

                  {correct && (
                    <div className="text-sm font-black text-green-300">
                      ✓ เฉลย
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}

/* ==========================================
   SUMMARY
========================================== */

function Summary({
  icon,
  title,
  value,
}: {
  icon: string;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-blue-300/10 bg-[#07194d]/80 p-5">
      <div className="text-3xl">
        {icon}
      </div>

      <div className="mt-4 text-sm font-bold text-blue-100/30">
        {title}
      </div>

      <div className="mt-1 text-2xl font-black text-white">
        {value}
      </div>
    </div>
  );
}