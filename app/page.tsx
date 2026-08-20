"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#06154f] text-white">
      {/* Background Glow */}
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="absolute -left-40 top-20 h-[500px] w-[500px] rounded-full bg-blue-500/20 blur-[140px]" />
        <div className="absolute right-[-150px] top-[300px] h-[600px] w-[600px] rounded-full bg-cyan-400/10 blur-[160px]" />
        <div className="absolute bottom-[-200px] left-[30%] h-[500px] w-[700px] rounded-full bg-indigo-500/20 blur-[160px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-blue-300/20 bg-[#07164d]/90 shadow-[0_0_30px_rgba(0,100,255,0.15)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <div className="text-sm font-black tracking-[0.35em] text-cyan-300">
              EMPLOYEE TRAINING
            </div>

            <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">
              🎮 TRAINING ARENA
            </h1>
          </div>

          <Link
            href="/register"
            className="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-3 font-black text-white shadow-[0_0_25px_rgba(0,200,255,0.35)] transition hover:scale-105 hover:shadow-[0_0_35px_rgba(0,200,255,0.55)]"
          >
            🚀 เข้าสอบ
          </Link>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-8">
        {/* Hero */}
        <section className="relative mb-8 overflow-hidden rounded-[30px] border border-cyan-400/30 bg-gradient-to-br from-[#082878] via-[#08205f] to-[#11175c] p-8 shadow-[0_0_60px_rgba(0,120,255,0.18)] md:p-10">
          {/* Hero Glow */}
          <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-cyan-400/20 blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-40 left-20 h-80 w-80 rounded-full bg-blue-500/20 blur-[100px]" />

          <div className="relative grid gap-8 lg:grid-cols-2 lg:items-center">
            {/* Left */}
            <div>
              <div className="mb-5 inline-flex rounded-full border border-cyan-300/40 bg-cyan-400/10 px-5 py-2 text-sm font-black text-cyan-300 shadow-[0_0_20px_rgba(0,220,255,0.12)]">
                ⚡ LIVE TRAINING SYSTEM
              </div>

              <h2 className="text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
                พร้อมลุย
                <br />
                <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-400 bg-clip-text text-transparent">
                  สนามสอบ
                </span>{" "}
                หรือยัง?
              </h2>

              <p className="mt-5 max-w-xl text-base leading-7 text-blue-100/70">
                ระบบแบบทดสอบสำหรับอบรมพนักงาน
                <br />
                แข่งขันคะแนนแบบเรียลไทม์ พร้อมจัดอันดับผู้เข้าสอบ
              </p>

              <Link
                href="/register"
                className="mt-7 inline-flex rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-8 py-4 text-lg font-black text-white shadow-[0_0_30px_rgba(0,200,255,0.35)] transition hover:scale-105 hover:from-cyan-300 hover:to-blue-400 hover:shadow-[0_0_45px_rgba(0,200,255,0.55)]"
              >
                🎮 เริ่มทำแบบทดสอบ
              </Link>
            </div>

            {/* Exam Info */}
            <div className="grid grid-cols-2 gap-4">
              <InfoCard
                icon="📝"
                title="ข้อสอบ"
                value="15"
                detail="ข้อ"
              />

              <InfoCard
                icon="⏱️"
                title="เวลา"
                value="15"
                detail="นาที"
              />

              <InfoCard
                icon="🏆"
                title="Ranking"
                value="LIVE"
                detail="Real-time"
              />

              <InfoCard
                icon="🛡️"
                title="ระบบ"
                value="AUTO"
                detail="บันทึกอัตโนมัติ"
              />
            </div>
          </div>
        </section>

        {/* Dashboard */}
        <section>
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-sm font-black tracking-wide text-cyan-300">
                LIVE DASHBOARD
              </p>

              <h2 className="mt-1 text-2xl font-black">
                ภาพรวมผู้เข้าสอบ
              </h2>
            </div>

            <div className="flex items-center gap-2 text-sm font-bold text-green-400">
              <span className="h-3 w-3 animate-pulse rounded-full bg-green-400 shadow-[0_0_15px_rgba(0,255,120,0.8)]" />
              LIVE
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon="👥"
              title="ผู้เข้าสอบทั้งหมด"
              value="0"
            />

            <StatCard
              icon="🟢"
              title="กำลังสอบ"
              value="0"
            />

            <StatCard
              icon="🏁"
              title="สอบเสร็จแล้ว"
              value="0"
            />

            <StatCard
              icon="⚡"
              title="คะแนนสูงสุด"
              value="0"
            />
          </div>
        </section>

        {/* Leaderboard */}
        <section className="mt-8">
          <div className="mb-5">
            <p className="text-sm font-black tracking-wide text-purple-300">
              REAL-TIME RANKING
            </p>

            <h2 className="mt-1 text-2xl font-black">
              🏆 อันดับผู้เข้าสอบ
            </h2>
          </div>

          <div className="overflow-hidden rounded-3xl border border-blue-300/20 bg-gradient-to-br from-[#09236b] to-[#071a55] shadow-[0_0_40px_rgba(0,80,255,0.15)]">
            {/* Table Header */}
            <div className="grid grid-cols-[80px_1fr_160px_160px] border-b border-blue-300/20 bg-blue-500/10 px-6 py-4 text-sm font-black text-blue-100/70">
              <div>อันดับ</div>
              <div>ผู้เข้าสอบ</div>
              <div>สถานะ</div>
              <div className="text-right">คะแนน</div>
            </div>

            {/* Empty */}
            <div className="px-6 py-14 text-center">
              <div className="text-5xl opacity-60">📭</div>

              <div className="mt-4 font-bold text-blue-100/50">
                ยังไม่มีผู้เข้าสอบ
              </div>

              <div className="mt-1 text-sm text-blue-200/30">
                เมื่อมีผู้เข้าสอบ อันดับจะแสดงแบบ Real-time
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

/* ==========================================
   INFO CARD
========================================== */

function InfoCard({
  icon,
  title,
  value,
  detail,
}: {
  icon: string;
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="group rounded-2xl border border-blue-300/20 bg-[#07194f]/70 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur transition hover:-translate-y-1 hover:border-cyan-300/40 hover:bg-[#0a246c]/80 hover:shadow-[0_0_30px_rgba(0,180,255,0.15)]">
      <div className="text-3xl transition group-hover:scale-110">
        {icon}
      </div>

      <div className="mt-4 text-sm font-medium text-blue-100/50">
        {title}
      </div>

      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-3xl font-black text-white">
          {value}
        </span>

        <span className="text-sm font-medium text-blue-100/40">
          {detail}
        </span>
      </div>
    </div>
  );
}

/* ==========================================
   STAT CARD
========================================== */

function StatCard({
  icon,
  title,
  value,
}: {
  icon: string;
  title: string;
  value: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-blue-300/20 bg-gradient-to-br from-[#09256d] to-[#07194d] p-5 shadow-[0_0_25px_rgba(0,70,255,0.08)] transition hover:-translate-y-1 hover:border-cyan-300/40 hover:shadow-[0_0_30px_rgba(0,180,255,0.18)]">
      {/* Glow */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-cyan-400/10 blur-2xl transition group-hover:bg-cyan-400/20" />

      <div className="relative flex items-center justify-between">
        <div className="text-3xl transition group-hover:scale-110">
          {icon}
        </div>

        <div className="h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_15px_rgba(0,220,255,0.9)]" />
      </div>

      <div className="relative mt-5 text-sm font-medium text-blue-100/50">
        {title}
      </div>

      <div className="relative mt-1 text-3xl font-black text-white">
        {value}
      </div>
    </div>
  );
}