"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Choice = "A" | "B" | "C" | "D";

type Question = {
  id: number;
  question: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_answer: Choice;
  score: number;
  question_order: number;
};

type ExamUser = {
  id: string;
  firstName: string;
  lastName: string;
  examCode: string;
  branch: string;
  status: string;
};

type AnswerMap = Record<number, Choice>;

const EXAM_DURATION = 15 * 60;

export default function ExamPage() {
  const router = useRouter();

  const [user, setUser] = useState<ExamUser | null>(null);

  const [questions, setQuestions] = useState<Question[]>([]);

  const [answers, setAnswers] = useState<AnswerMap>({});

  const [currentQuestion, setCurrentQuestion] = useState(0);

  const [expiresAt, setExpiresAt] = useState<number | null>(null);

  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [starting, setStarting] = useState(false);

  const [finished, setFinished] = useState(false);

  const [error, setError] = useState("");

  /* ==========================================
     LOAD EXAM
  ========================================== */

  useEffect(() => {
    loadExam();
  }, []);

  async function loadExam() {
    try {
      setLoading(true);
      setError("");

      const savedUser = localStorage.getItem("exam_user");

      if (!savedUser) {
        router.replace("/register");
        return;
      }

      const parsedUser = JSON.parse(savedUser) as ExamUser;

      if (!parsedUser.id) {
        router.replace("/register");
        return;
      }

      setUser(parsedUser);

      /* ----------------------------------------
         LOAD QUESTIONS
      ---------------------------------------- */

      const { data: questionData, error: questionError } =
        await supabase
          .from("questions")
          .select(
            `
            id,
            question,
            choice_a,
            choice_b,
            choice_c,
            choice_d,
            correct_answer,
            score,
            question_order
          `
          )
          .order("question_order", {
            ascending: true,
          });

      if (questionError) {
        console.error(questionError);
        setError(
          `โหลดข้อสอบไม่สำเร็จ: ${questionError.message}`
        );
        return;
      }

      const loadedQuestions =
        (questionData || []) as Question[];

      setQuestions(loadedQuestions);

      /* ----------------------------------------
         LOAD USER
      ---------------------------------------- */

      const { data: userData, error: userError } =
        await supabase
          .from("exam_users")
          .select(
            `
            id,
            first_name,
            last_name,
            exam_code,
            branch,
            status,
            current_question,
            expires_at,
            finished_at
          `
          )
          .eq("id", parsedUser.id)
          .single();

      if (userError) {
        console.error(userError);

        setError(
          `โหลดข้อมูลผู้เข้าสอบไม่สำเร็จ: ${userError.message}`
        );

        return;
      }

      /* ----------------------------------------
         CHECK FINISHED
      ---------------------------------------- */

      if (userData.status === "finished") {
        setFinished(true);

        setUser({
          id: userData.id,
          firstName: userData.first_name,
          lastName: userData.last_name,
          examCode: userData.exam_code,
          branch: userData.branch,
          status: userData.status,
        });

        return;
      }

      /* ----------------------------------------
         LOAD SAVED ANSWERS
      ---------------------------------------- */

      const { data: answerData, error: answerError } =
        await supabase
          .from("exam_answers")
          .select(
            `
            question_id,
            selected_answer
          `
          )
          .eq("user_id", parsedUser.id);

      if (answerError) {
        console.error(answerError);

        setError(
          `โหลดคำตอบเดิมไม่สำเร็จ: ${answerError.message}`
        );

        return;
      }

      const answerObject: AnswerMap = {};

      (answerData || []).forEach((item) => {
        answerObject[item.question_id] =
          item.selected_answer as Choice;
      });

      setAnswers(answerObject);

      /* ----------------------------------------
         CURRENT QUESTION
      ---------------------------------------- */

      const savedQuestion =
        Number(userData.current_question ?? 0);

      const safeQuestion = Math.min(
        Math.max(savedQuestion, 0),
        Math.max(loadedQuestions.length - 1, 0)
      );

      setCurrentQuestion(safeQuestion);

      /* ----------------------------------------
         EXISTING TIMER
      ---------------------------------------- */

      if (userData.expires_at) {
        const expireTime = new Date(
          userData.expires_at
        ).getTime();

        setExpiresAt(expireTime);

        const remaining = Math.max(
          0,
          Math.floor(
            (expireTime - Date.now()) / 1000
          )
        );

        setTimeLeft(remaining);

        if (remaining <= 0) {
          await finishExamFromDatabase(
            parsedUser.id,
            loadedQuestions,
            answerObject
          );
        }
      }
    } catch (err) {
      console.error(err);

      setError(
        "เกิดข้อผิดพลาดในการโหลดระบบสอบ"
      );
    } finally {
      setLoading(false);
    }
  }

  /* ==========================================
     START EXAM
  ========================================== */

  async function startExam() {
    if (!user) return;

    try {
      setStarting(true);
      setError("");

      const expireTime =
        Date.now() + EXAM_DURATION * 1000;

      const isoExpireTime =
        new Date(expireTime).toISOString();

      const { error: updateError } =
        await supabase
          .from("exam_users")
          .update({
            status: "in_progress",
            current_question: 0,
            started_at: new Date().toISOString(),
            expires_at: isoExpireTime,
          })
          .eq("id", user.id);

      if (updateError) {
        console.error(updateError);

        setError(
          `เริ่มสอบไม่สำเร็จ: ${updateError.message}`
        );

        return;
      }

      setUser({
        ...user,
        status: "in_progress",
      });

      setCurrentQuestion(0);

      setExpiresAt(expireTime);

      setTimeLeft(EXAM_DURATION);
    } finally {
      setStarting(false);
    }
  }

  /* ==========================================
     TIMER
  ========================================== */

  useEffect(() => {
    if (!expiresAt || finished) return;

    const updateTimer = async () => {
      const remaining = Math.max(
        0,
        Math.floor(
          (expiresAt - Date.now()) / 1000
        )
      );

      setTimeLeft(remaining);

      if (remaining <= 0) {
        await finishExam();
      }
    };

    updateTimer();

    const timer = setInterval(
      updateTimer,
      1000
    );

    return () => clearInterval(timer);
  }, [expiresAt, finished]);

  /* ==========================================
     SELECT ANSWER
  ========================================== */

  async function selectAnswer(answer: Choice) {
    if (!user || !question) return;

    setAnswers((previous) => ({
      ...previous,
      [question.id]: answer,
    }));

    setSaving(true);

    try {
      const isCorrect =
        answer === question.correct_answer;

      const earnedScore = isCorrect
        ? question.score
        : 0;

      const { error: answerError } =
        await supabase
          .from("exam_answers")
          .upsert(
            {
              user_id: user.id,
              question_id: question.id,
              selected_answer: answer,
              is_correct: isCorrect,
              score: earnedScore,
              answered_at: new Date().toISOString(),
            },
            {
              onConflict:
                "user_id,question_id",
            }
          );

      if (answerError) {
        console.error(answerError);

        setError(
          `บันทึกคำตอบไม่สำเร็จ: ${answerError.message}`
        );

        return;
      }

      /* บันทึกข้อปัจจุบัน */
      await supabase
        .from("exam_users")
        .update({
          current_question: currentQuestion,
        })
        .eq("id", user.id);
    } finally {
      setSaving(false);
    }
  }

  /* ==========================================
     NEXT
  ========================================== */

  async function nextQuestion() {
    if (!user || !question) return;

    const selected = answers[question.id];

    if (!selected) {
      return;
    }

    if (
      currentQuestion <
      questions.length - 1
    ) {
      const nextIndex =
        currentQuestion + 1;

      setCurrentQuestion(nextIndex);

      await supabase
        .from("exam_users")
        .update({
          current_question: nextIndex,
        })
        .eq("id", user.id);
    } else {
      await finishExam();
    }
  }

  /* ==========================================
     PREVIOUS
  ========================================== */

  async function previousQuestion() {
    if (!user) return;

    if (currentQuestion <= 0) return;

    const previousIndex =
      currentQuestion - 1;

    setCurrentQuestion(previousIndex);

    await supabase
      .from("exam_users")
      .update({
        current_question: previousIndex,
      })
      .eq("id", user.id);
  }

  /* ==========================================
     GO QUESTION
  ========================================== */

  async function goToQuestion(index: number) {
    if (!user) return;

    if (index < 0 || index >= questions.length) {
      return;
    }

    const previousAnswers =
      questions
        .slice(0, index)
        .every((item) => !!answers[item.id]);

    const alreadyAnswered =
      !!answers[questions[index]?.id];

    /*
      อนุญาตให้กลับไปข้อที่ตอบแล้ว
      หรือไปข้อที่อยู่ถัดจากข้อปัจจุบัน
    */

    if (
      alreadyAnswered ||
      index <= currentQuestion ||
      previousAnswers
    ) {
      setCurrentQuestion(index);

      await supabase
        .from("exam_users")
        .update({
          current_question: index,
        })
        .eq("id", user.id);
    }
  }

  /* ==========================================
     FINISH EXAM
  ========================================== */

  const finishExam = useCallback(async () => {
    if (!user || finished) return;

    try {
      setSaving(true);

      /*
        ดึงคำตอบล่าสุดจาก DB
        เพื่อป้องกันคะแนนจาก state ไม่ทัน
      */

      const { data: answerData } =
        await supabase
          .from("exam_answers")
          .select(
            `
            question_id,
            selected_answer
          `
          )
          .eq("user_id", user.id);

      const latestAnswers: AnswerMap = {};

      (answerData || []).forEach((item) => {
        latestAnswers[item.question_id] =
          item.selected_answer as Choice;
      });

      /*
        รวมคะแนน
      */

      let totalScore = 0;

      questions.forEach((item) => {
        if (
          latestAnswers[item.id] ===
          item.correct_answer
        ) {
          totalScore += item.score;
        }
      });

      const { error: finishError } =
        await supabase
          .from("exam_users")
          .update({
            status: "finished",
            score: totalScore,
            finished_at:
              new Date().toISOString(),
            expires_at:
              expiresAt
                ? new Date(
                    expiresAt
                  ).toISOString()
                : new Date().toISOString(),
          })
          .eq("id", user.id);

      if (finishError) {
        console.error(finishError);

        setError(
          `ส่งข้อสอบไม่สำเร็จ: ${finishError.message}`
        );

        return;
      }

      setFinished(true);
    } finally {
      setSaving(false);
    }
  }, [
    user,
    finished,
    questions,
    expiresAt,
  ]);

  /* ==========================================
     FINISH FROM EXPIRED SESSION
  ========================================== */

  async function finishExamFromDatabase(
    userId: string,
    loadedQuestions: Question[],
    loadedAnswers: AnswerMap
  ) {
    let totalScore = 0;

    loadedQuestions.forEach((item) => {
      if (
        loadedAnswers[item.id] ===
        item.correct_answer
      ) {
        totalScore += item.score;
      }
    });

    await supabase
      .from("exam_users")
      .update({
        status: "finished",
        score: totalScore,
        finished_at:
          new Date().toISOString(),
      })
      .eq("id", userId);

    setFinished(true);
  }

  /* ==========================================
     FORMAT TIME
  ========================================== */

  function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);

    const secs = seconds % 60;

    return `${String(minutes).padStart(
      2,
      "0"
    )}:${String(secs).padStart(2, "0")}`;
  }

  /* ==========================================
     SCORE
  ========================================== */

  const currentScore = useMemo(() => {
    return questions.reduce((total, item) => {
      if (
        answers[item.id] ===
        item.correct_answer
      ) {
        return total + item.score;
      }

      return total;
    }, 0);
  }, [answers, questions]);

  /* ==========================================
     LOADING
  ========================================== */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#06154f] text-white">
        <div className="text-center">
          <div className="text-6xl animate-bounce">
            🎮
          </div>

          <div className="mt-5 text-lg font-black">
            กำลังโหลดสนามสอบ...
          </div>

          <div className="mt-2 text-sm text-blue-100/40">
            กำลังเชื่อมต่อระบบ
          </div>
        </div>
      </main>
    );
  }

  /* ==========================================
     ERROR
  ========================================== */

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#06154f] px-6 text-white">
        <div className="w-full max-w-xl rounded-3xl border border-red-400/20 bg-red-400/5 p-8 text-center">
          <div className="text-6xl">⚠️</div>

          <h1 className="mt-5 text-2xl font-black">
            เกิดข้อผิดพลาด
          </h1>

          <p className="mt-4 whitespace-pre-line text-sm text-red-200/60">
            {error}
          </p>

          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-cyan-400 px-6 py-3 font-black text-black"
          >
            🔄 ลองใหม่
          </button>
        </div>
      </main>
    );
  }

  /* ==========================================
     NO QUESTIONS
  ========================================== */

  if (questions.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#06154f] px-6 text-white">
        <div className="w-full max-w-xl rounded-3xl border border-yellow-400/20 bg-yellow-400/5 p-8 text-center">
          <div className="text-6xl">📝</div>

          <h1 className="mt-5 text-2xl font-black">
            ยังไม่มีข้อสอบ
          </h1>

          <p className="mt-3 text-sm text-blue-100/40">
            กรุณาให้ Admin เพิ่มข้อสอบก่อน
          </p>

          <button
            onClick={() => router.push("/")}
            className="mt-6 rounded-xl bg-cyan-400 px-6 py-3 font-black text-black"
          >
            ← กลับหน้าหลัก
          </button>
        </div>
      </main>
    );
  }

  /* ==========================================
     FINISHED
  ========================================== */

  if (finished) {
    return (
      <FinishedScreen
        user={user}
        score={currentScore}
        total={questions.reduce(
          (sum, item) => sum + item.score,
          0
        )}
        router={router}
      />
    );
  }

  /* ==========================================
     START SCREEN
  ========================================== */

  if (
    !expiresAt &&
    user?.status !== "in_progress"
  ) {
    return (
   <StartScreen
  user={user!}
  starting={starting}
  onStart={startExam}
  router={router}
/>
    );
  }

  /* ==========================================
     CURRENT QUESTION
  ========================================== */

  const question =
    questions[currentQuestion];

  if (!question) {
    return null;
  }

  const selectedAnswer =
    answers[question.id];

  const progress =
    ((currentQuestion + 1) /
      questions.length) *
    100;

  const isDanger = timeLeft <= 60;

  const isWarning = timeLeft <= 300;

  return (
    <main className="min-h-screen bg-[#06154f] text-white">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-blue-300/20 bg-[#07164d]/95 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-4 py-4 md:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-black tracking-[0.2em] text-cyan-300">
                TRAINING ARENA
              </div>

              <div className="mt-1 text-sm font-bold text-white/80">
                {user?.firstName}{" "}
                {user?.lastName}
              </div>
            </div>

            {/* TIMER */}
            <div
              className={`rounded-2xl border px-5 py-3 text-center ${
                isDanger
                  ? "animate-pulse border-red-400/50 bg-red-400/10 text-red-300"
                  : isWarning
                  ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-300"
                  : "border-cyan-300/30 bg-cyan-400/10 text-cyan-300"
              }`}
            >
              <div className="text-[10px] font-black tracking-widest">
                TIME LEFT
              </div>

              <div className="text-2xl font-black tabular-nums md:text-3xl">
                ⏱️ {formatTime(timeLeft)}
              </div>
            </div>
          </div>

          {/* PROGRESS */}
          <div className="mt-4">
            <div className="mb-2 flex justify-between text-xs font-bold text-blue-100/40">
              <span>
                ข้อ {currentQuestion + 1} /{" "}
                {questions.length}
              </span>

              <span>
                {Math.round(progress)}%
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-blue-950">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        {/* QUESTION HEADER */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-black tracking-[0.25em] text-cyan-300">
              QUESTION
            </div>

            <div className="mt-1 text-3xl font-black">
              {String(
                currentQuestion + 1
              ).padStart(2, "0")}

              <span className="ml-2 text-lg text-blue-100/30">
                /{" "}
                {questions.length}
              </span>
            </div>
          </div>

          {selectedAnswer && (
            <div className="rounded-full border border-green-400/30 bg-green-400/10 px-4 py-2 text-sm font-bold text-green-300">
              ✓ เลือกคำตอบแล้ว
            </div>
          )}
        </div>

        {/* QUESTION CARD */}
        <section className="rounded-[30px] border border-blue-300/20 bg-gradient-to-br from-[#09276f] to-[#07194d] p-6 shadow-[0_0_50px_rgba(0,100,255,0.12)] md:p-8">
          <h1 className="text-xl font-black leading-8 md:text-2xl md:leading-9">
            {question.question}
          </h1>

          {/* CHOICES */}
          <div className="mt-7 grid gap-4">
            {(
              ["A", "B", "C", "D"] as Choice[]
            ).map((letter) => {
              const selected =
                selectedAnswer === letter;

              const text =
                letter === "A"
                  ? question.choice_a
                  : letter === "B"
                  ? question.choice_b
                  : letter === "C"
                  ? question.choice_c
                  : question.choice_d;

              return (
                <button
                  key={letter}
                  onClick={() =>
                    selectAnswer(letter)
                  }
                  disabled={saving}
                  className={`group w-full rounded-2xl border p-5 text-left transition ${
                    selected
                      ? "border-cyan-300 bg-cyan-400/15 shadow-[0_0_30px_rgba(0,220,255,0.18)]"
                      : "border-blue-300/15 bg-[#050f38]/70 hover:border-cyan-300/40 hover:bg-blue-500/10"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-black transition ${
                        selected
                          ? "bg-gradient-to-br from-cyan-300 to-blue-500 text-black shadow-[0_0_20px_rgba(0,220,255,0.4)]"
                          : "bg-blue-500/15 text-cyan-300 group-hover:bg-cyan-400/20"
                      }`}
                    >
                      {letter}
                    </div>

                    <div
                      className={`flex-1 text-base font-bold ${
                        selected
                          ? "text-white"
                          : "text-blue-50/70"
                      }`}
                    >
                      {text}
                    </div>

                    {selected && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-300 text-sm font-black text-black">
                        ✓
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* SAVING */}
          {saving && (
            <div className="mt-4 text-center text-xs font-bold text-cyan-300">
              💾 กำลังบันทึก...
            </div>
          )}

          {/* NAVIGATION */}
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-blue-300/10 pt-6 sm:flex-row sm:justify-between">
            <button
              onClick={previousQuestion}
              disabled={
                currentQuestion === 0 ||
                saving
              }
              className="rounded-xl border border-blue-300/15 bg-white/5 px-6 py-3 font-bold text-white/50 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
            >
              ← ย้อนกลับ
            </button>

            <button
              onClick={nextQuestion}
              disabled={!selectedAnswer || saving}
              className={`rounded-xl px-7 py-3 font-black transition ${
                selectedAnswer && !saving
                  ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-[0_0_25px_rgba(0,200,255,0.25)] hover:scale-[1.02]"
                  : "cursor-not-allowed bg-white/10 text-white/20"
              }`}
            >
              {currentQuestion ===
              questions.length - 1
                ? "🏁 ส่งข้อสอบ"
                : "ข้อถัดไป →"}
            </button>
          </div>
        </section>

        {/* QUESTION NAVIGATOR */}
        <section className="mt-6 rounded-3xl border border-blue-300/15 bg-[#07194d]/70 p-5">
          <div className="mb-4 text-sm font-black text-blue-100/50">
            📋 รายการข้อสอบ
          </div>

          <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
            {questions.map((item, index) => {
              const answered =
                !!answers[item.id];

              const active =
                currentQuestion === index;

              return (
                <button
                  key={item.id}
                  onClick={() =>
                    goToQuestion(index)
                  }
                  className={`h-11 rounded-xl text-sm font-black transition ${
                    active
                      ? "bg-cyan-400 text-black shadow-[0_0_20px_rgba(0,220,255,0.3)]"
                      : answered
                      ? "border border-green-400/30 bg-green-400/10 text-green-300"
                      : "border border-blue-300/10 bg-blue-500/5 text-blue-100/30"
                  }`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </section>

        {/* WARNING */}
        {isWarning && (
          <div
            className={`mt-5 rounded-2xl border p-4 text-center text-sm font-bold ${
              isDanger
                ? "border-red-400/30 bg-red-400/10 text-red-300"
                : "border-yellow-400/20 bg-yellow-400/5 text-yellow-300"
            }`}
          >
            {isDanger
              ? "🚨 เหลือเวลาน้อยกว่า 1 นาที!"
              : "⚠️ เหลือเวลาน้อยกว่า 5 นาที"}
          </div>
        )}
      </div>
    </main>
  );
}

/* ==========================================
   START SCREEN
========================================== */

function StartScreen({
  user,
  starting,
  onStart,
  router,
}: {
  user: ExamUser;
  starting: boolean;
  onStart: () => void;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#06154f] px-6 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-10 h-[500px] w-[500px] rounded-full bg-blue-500/20 blur-[140px]" />

        <div className="absolute right-[-150px] bottom-0 h-[600px] w-[600px] rounded-full bg-cyan-400/10 blur-[150px]" />
      </div>

      <div className="relative w-full max-w-2xl rounded-[32px] border border-cyan-300/20 bg-gradient-to-br from-[#09276f] to-[#07194d] p-8 text-center shadow-[0_0_70px_rgba(0,100,255,0.18)] md:p-12">
        <div className="text-7xl">🎮</div>

        <div className="mt-5 text-sm font-black tracking-[0.3em] text-cyan-300">
          TRAINING ARENA
        </div>

        <h1 className="mt-3 text-4xl font-black md:text-5xl">
          พร้อมเริ่มสอบหรือยัง?
        </h1>

        <div className="mt-8 grid grid-cols-3 gap-3">
          <ExamInfo
            icon="📝"
            value="15"
            label="ข้อ"
          />

          <ExamInfo
            icon="⏱️"
            value="15"
            label="นาที"
          />

          <ExamInfo
            icon="🏆"
            value="LIVE"
            label="Ranking"
          />
        </div>

        <div className="mt-7 rounded-2xl border border-blue-300/10 bg-black/10 p-5 text-left">
          <div className="font-black">
            👤 ผู้เข้าสอบ
          </div>

          <div className="mt-3 text-blue-100/60">
            {user.firstName}{" "}
            {user.lastName}
          </div>

          <div className="mt-1 text-sm text-blue-100/30">
            สาขา: {user.branch}
          </div>

          <div className="mt-1 text-sm text-blue-100/30">
            รหัสสอบ: {user.examCode}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-4 text-left text-sm leading-6 text-yellow-200/70">
          ⚠️ เมื่อเริ่มสอบ ระบบจะเริ่มนับเวลา 15 นาที
          <br />
          🔒 ต้องเลือกคำตอบก่อนจึงจะไปข้อถัดไปได้
          <br />
          💾 คำตอบและเวลาจะถูกบันทึกลงระบบ
          <br />
          🔄 หากหลุดหรือ Refresh สามารถกลับมาทำต่อได้
        </div>

        <button
          onClick={onStart}
          disabled={starting}
          className="mt-7 w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 py-5 text-lg font-black shadow-[0_0_35px_rgba(0,200,255,0.3)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {starting
            ? "⏳ กำลังเริ่มสอบ..."
            : "🚀 เริ่มทำข้อสอบ"}
        </button>

        <button
          onClick={() => router.push("/")}
          className="mt-3 text-sm text-blue-100/30 hover:text-white"
        >
          ← กลับหน้าหลัก
        </button>
      </div>
    </main>
  );
}

/* ==========================================
   FINISHED SCREEN
========================================== */

function FinishedScreen({
  user,
  score,
  total,
  router,
}: {
  user: ExamUser | null;
  score: number;
  total: number;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#06154f] px-6 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-[130px]" />
      </div>

      <div className="relative w-full max-w-xl rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-[#09276f] to-[#07194d] p-8 text-center shadow-[0_0_70px_rgba(0,150,255,0.2)]">
        <div className="text-7xl">🏆</div>

        <div className="mt-5 text-sm font-black tracking-[0.3em] text-cyan-300">
          EXAM COMPLETED
        </div>

        <h1 className="mt-3 text-4xl font-black">
          สอบเสร็จแล้ว!
        </h1>

        {user && (
          <p className="mt-3 text-blue-100/50">
            {user.firstName}{" "}
            {user.lastName}
          </p>
        )}

        <div className="mt-8 rounded-3xl border border-cyan-300/20 bg-black/20 p-7">
          <div className="text-sm text-blue-100/40">
            คะแนนของคุณ
          </div>

          <div className="mt-2 text-6xl font-black text-cyan-300">
            {score}
            <span className="ml-2 text-2xl text-blue-100/40">
              / {total}
            </span>
          </div>
        </div>

        <button
          onClick={() => router.push("/")}
          className="mt-7 w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 py-4 font-black shadow-[0_0_30px_rgba(0,200,255,0.25)] transition hover:scale-[1.02]"
        >
          🏠 กลับหน้าหลัก
        </button>
      </div>
    </main>
  );
}

/* ==========================================
   EXAM INFO
========================================== */

function ExamInfo({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-blue-300/15 bg-black/10 p-4">
      <div className="text-2xl">{icon}</div>

      <div className="mt-2 text-xl font-black text-cyan-300">
        {value}
      </div>

      <div className="text-xs text-blue-100/40">
        {label}
      </div>
    </div>
  );
}