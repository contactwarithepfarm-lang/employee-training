"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type ExamUser = {
  id: string;
  first_name: string;
  last_name: string;
  exam_code: string;
  branch: string;
  status: string;
  score: number | null;
  current_question: number | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string | null;
};

export default function AdminPage() {
  const [users, setUsers] = useState<ExamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("exam_users")
        .select("*")
        .order("score", {
          ascending: false,
          nullsFirst: false,
        })
        .order("created_at", {
          ascending: true,
        });

      if (error) {
        console.error(error);
        setError(error.message);
        return;
      }

      setUsers((data || []) as ExamUser[]);
    } catch (err) {
      console.error(err);
      setError("ไม่สามารถโหลดข้อมูลผู้เข้าสอบได้");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();

    // Real-time
    const channel = supabase
      .channel("admin-exam-users")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "exam_users",
        },
        () => {
          loadUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const stats = useMemo(() => {
    const total = users.length;

    const active = users.filter(
      (user) =>
        user.status === "in_progress"
    ).length;

    const finished = users.filter(
      (user) =>
        user.status === "finished"
    ).length;

    const highest = users.reduce(
      (max, user) =>
        Math.max(max, Number(user.score || 0)),
      0
    );

    return {
      total,
      active,
      finished,
      highest,
    };
  }, [users]);

  function statusText(status: string) {
    switch (status) {
      case "in_progress":
        return "กำลังสอบ";

      case "finished":
        return "สอบเสร็จแล้ว";

      case "not_started":
        return "ยังไม่เริ่มสอบ";

      default:
        return status || "ไม่ทราบสถานะ";
    }
  }

  function statusStyle(status: string) {
    switch (status) {
      case "in_progress":
        return "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";

      case "finished":
        return "border-green-400/30 bg-green-400/10 text-green-300";

      default:
        return "border-yellow-400/30 bg-yellow-400/10 text-yellow-300";
    }
  }

  function formatDate(date: string | null) {
    if (!date) return "-";

    return new Date(date).toLocaleString(
      "th-TH",
      {
        dateStyle: "short",
        timeStyle: "short",
      }
    );
  }

  return (
    <main className="min-h-screen bg-[#06154f] text-white">
      {/* HEADER */}
      <header className="border-b border-blue-300/10 bg-[#07164d]/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <div className="text-xs font-black tracking-[0.3em] text-cyan-300">
              ADMIN CONTROL
            </div>

            <h1 className="mt-1 text-2xl font-black">
              🎮 TRAINING ARENA
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadUsers}
              className="rounded-xl border border-blue-300/20 bg-white/5 px-4 py-2 text-sm font-bold transition hover:bg-white/10"
            >
              🔄 รีเฟรช
            </button>

            <a
              href="/"
              className="rounded-xl bg-cyan-400 px-5 py-2 font-black text-black"
            >
              🏠 หน้าหลัก
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* TITLE */}
        <div className="mb-8">
          <div className="text-sm font-black tracking-[0.2em] text-cyan-300">
            LIVE DASHBOARD
          </div>

          <h2 className="mt-1 text-4xl font-black">
            👥 ผู้เข้าสอบ
          </h2>

          <div className="mt-2 flex items-center gap-2 text-sm text-green-400">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-400" />
            REAL-TIME
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-400/30 bg-red-400/10 p-5 text-red-300">
            <div className="font-black">
              ⚠️ โหลดข้อมูลไม่สำเร็จ
            </div>

            <div className="mt-2 text-sm">
              {error}
            </div>
          </div>
        )}

        {/* STATS */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            icon="👥"
            title="ผู้เข้าสอบทั้งหมด"
            value={stats.total}
          />

          <Stat
            icon="🟢"
            title="กำลังสอบ"
            value={stats.active}
          />

          <Stat
            icon="🏁"
            title="สอบเสร็จแล้ว"
            value={stats.finished}
          />

          <Stat
            icon="⚡"
            title="คะแนนสูงสุด"
            value={`${stats.highest}/15`}
          />
        </div>

        {/* TABLE */}
        <section className="mt-8 overflow-hidden rounded-3xl border border-blue-300/15 bg-[#07194d]/80">
          <div className="border-b border-blue-300/10 px-6 py-5">
            <h3 className="text-xl font-black">
              🏆 ตารางคะแนน Real-time
            </h3>

            <p className="mt-1 text-sm text-blue-100/30">
              ข้อมูลจะอัปเดตทันทีเมื่อผู้เข้าสอบตอบคำถามหรือส่งข้อสอบ
            </p>
          </div>

          {loading ? (
            <div className="px-6 py-20 text-center">
              <div className="text-5xl animate-bounce">
                🎮
              </div>

              <div className="mt-4 font-bold text-blue-100/50">
                กำลังโหลดข้อมูล...
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <div className="text-6xl">👥</div>

              <div className="mt-4 text-xl font-black">
                ยังไม่มีผู้เข้าสอบ
              </div>

              <div className="mt-2 text-sm text-blue-100/30">
                เมื่อมีผู้ลงทะเบียน ข้อมูลจะแสดงตรงนี้
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px]">
                <thead>
                  <tr className="border-b border-blue-300/10 text-left text-xs font-black text-blue-100/30">
                    <th className="px-6 py-4">
                      อันดับ
                    </th>

                    <th className="px-6 py-4">
                      ผู้เข้าสอบ
                    </th>

                    <th className="px-6 py-4">
                      สาขา
                    </th>

                    <th className="px-6 py-4">
                      รหัสสอบ
                    </th>

                    <th className="px-6 py-4">
                      สถานะ
                    </th>

                    <th className="px-6 py-4">
                      ข้อ
                    </th>

                    <th className="px-6 py-4 text-right">
                      คะแนน
                    </th>

                    <th className="px-6 py-4">
                      เวลา
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user, index) => (
                    <tr
                      key={user.id}
                      className="border-b border-blue-300/5 transition hover:bg-blue-400/5"
                    >
                      {/* RANK */}
                      <td className="px-6 py-5">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl font-black ${
                            index === 0
                              ? "bg-yellow-400 text-black"
                              : index === 1
                              ? "bg-gray-300 text-black"
                              : index === 2
                              ? "bg-orange-400 text-black"
                              : "bg-blue-500/10 text-blue-100/50"
                          }`}
                        >
                          {index === 0
                            ? "🥇"
                            : index === 1
                            ? "🥈"
                            : index === 2
                            ? "🥉"
                            : index + 1}
                        </div>
                      </td>

                      {/* USER */}
                      <td className="px-6 py-5">
                        <div className="font-black">
                          {user.first_name}{" "}
                          {user.last_name}
                        </div>

                        <div className="mt-1 text-xs text-blue-100/30">
                          เข้าระบบ{" "}
                          {formatDate(
                            user.created_at
                          )}
                        </div>
                      </td>

                      {/* BRANCH */}
                      <td className="px-6 py-5 text-sm text-blue-100/60">
                        {user.branch}
                      </td>

                      {/* CODE */}
                      <td className="px-6 py-5">
                        <span className="rounded-lg bg-black/20 px-3 py-2 font-mono text-sm text-cyan-300">
                          {user.exam_code}
                        </span>
                      </td>

                      {/* STATUS */}
                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-black ${statusStyle(
                            user.status
                          )}`}
                        >
                          {user.status ===
                            "in_progress" && (
                            <span className="mr-1 animate-pulse">
                              ●
                            </span>
                          )}

                          {statusText(
                            user.status
                          )}
                        </span>
                      </td>

                      {/* QUESTION */}
                      <td className="px-6 py-5 text-sm font-bold text-blue-100/50">
                        {user.status ===
                        "finished"
                          ? "15/15"
                          : `${Math.min(
                              Number(
                                user.current_question ??
                                  0
                              ) + 1,
                              15
                            )}/15`}
                      </td>

                      {/* SCORE */}
                      <td className="px-6 py-5 text-right">
                        <span className="text-2xl font-black text-cyan-300">
                          {user.score ?? 0}
                        </span>

                        <span className="ml-1 text-xs text-blue-100/30">
                          /15
                        </span>
                      </td>

                      {/* FINISHED */}
                      <td className="px-6 py-5 text-sm text-blue-100/40">
                        {user.finished_at
                          ? formatDate(
                              user.finished_at
                            )
                          : user.started_at
                          ? "กำลังสอบ"
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Stat({
  icon,
  title,
  value,
}: {
  icon: string;
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-3xl border border-blue-300/15 bg-[#07194d]/80 p-6 transition hover:-translate-y-1 hover:border-cyan-300/30">
      <div className="flex items-center justify-between">
        <div className="text-3xl">
          {icon}
        </div>

        <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-400" />
      </div>

      <div className="mt-5 text-sm font-bold text-blue-100/40">
        {title}
      </div>

      <div className="mt-1 text-4xl font-black">
        {value}
      </div>
    </div>
  );
}