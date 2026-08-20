"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const branches = [
  "วารีเทพ สำนักงานใหญ่",
  "วารีเทพ คำเขื่อนแก้ว",
  "วารีเทพ เขื่องใน",
  "วารีเทพ มหาชนะชัย",
  "วารีเทพ ศรีสะเกษ",
  "วารีเทพ สังขะ",
  "วารีเทพ นางรอง",
  "วารีเทพ สว่างแดนดิน",
  "วารีเทพ จักราช",
  "วารีเทพ บางละมุง",
  "วารีเทพ มหานคร",
  "วารีเทพ สกลนคร",
  "วารีเทพ ปราสาท",
  "วารีเทพ อุดรธานี",
  "วารีเทพ กาญจนบุรี",
  "วารีเทพ ครบุรี",
  "วารีเทพ บ้านม่วง",
  "วารีเทพ สุรินทร์",
  "วารีเทพ เชียงใหม่",
  "วารีเทพ บุรีรัมย์",
  "วารีเทพ บ้านผือ",
  "วารีเทพ เพชรบูรณ์",
  "วารีเทพ ทองผาภูมิ",
  "วารีเทพ ลำปาง",
  "วารีเทพ ชุมแสง",
  "วารีเทพ ยางชุมน้อย",
  "วารีเทพ นครพนม",
  "วารีเทพ ศรีราชา",
  "วารีเทพ ขุขันธ์",
  "วารีเทพ คลองขลุง",
  "วารีเทพ อุตรดิตถ์",
  "วารีเทพ ภูเรือ",
  "วารีเทพ หนองบัวลำภู",
  "วารีเทพ จอมพระ",
  "วารีเทพ อู่ทอง",
  "วารีเทพ วังทอง",
  "วารีเทพ มุกดาหาร",
  "วารีเทพ สุโขทัย",
  "วารีเทพ โพธิ์ทอง",
  "วารีเทพ แก้งคร้อ",
  "วารีเทพ เพ็ญ",
  "วารีเทพ เชียงแสน",
  "วารีเทพ กุฉินารายณ์",
  "วารีเทพ ชัยนาท",
  "วารีเทพ ยางตลาด",
  "วารีเทพ เชียงราย",
  "วารีเทพ พัทยา",
  "วารีเทพบัวใหญ่",
  "วารีเทพ ขอนแก่น",
  "วารีเทพกันทรลักษ์",
  "วารีเทพร้อยเอ็ด",
  "วารีเทพลพบุรี",
  "วารีเทพบ้านดุง",
  "วารีเทพ ประจวบคีรีขันธ์",
  "วารีเทพ ทับสะแก",
  "วารีเทพกำแพงเพชร",
];

export default function RegisterPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [examCode, setExamCode] = useState("");
  const [branch, setBranch] = useState("");

  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanExamCode = examCode.trim();
    const cleanBranch = branch.trim();

    if (
      !cleanFirstName ||
      !cleanLastName ||
      !cleanExamCode ||
      !cleanBranch
    ) {
      alert("กรุณากรอกข้อมูลให้ครบ");
      return;
    }

    if (loading) return;

    try {
      setLoading(true);

      // ==========================================
      // CHECK DUPLICATE EXAM CODE
      // ==========================================

      const { data: existingUser, error: checkError } =
        await supabase
          .from("exam_users")
          .select("id, first_name, last_name, status")
          .eq("exam_code", cleanExamCode)
          .maybeSingle();

      if (checkError) {
        console.error(checkError);

        alert(
          "ไม่สามารถตรวจสอบรหัสเข้าสอบได้\n\n" +
            checkError.message
        );

        return;
      }

      // ==========================================
      // CODE ALREADY EXISTS
      // ==========================================

      if (existingUser) {
        alert(
          "รหัสเข้าสอบนี้ถูกใช้งานแล้ว\n\n" +
            "กรุณาสร้างรหัสใหม่"
        );

        return;
      }

      // ==========================================
      // CREATE USER
      // ==========================================

      const { data: newUser, error: insertError } =
        await supabase
          .from("exam_users")
          .insert({
            first_name: cleanFirstName,
            last_name: cleanLastName,
            exam_code: cleanExamCode,
            branch: cleanBranch,
            status: "not_started",
            score: 0,
            current_question: 0,
          })
          .select(
            "id, first_name, last_name, exam_code, branch, status"
          )
          .single();

      if (insertError) {
        console.error(insertError);

        alert(
          "ไม่สามารถลงทะเบียนได้\n\n" +
            insertError.message
        );

        return;
      }

      if (!newUser) {
        alert("ไม่สามารถสร้างผู้เข้าสอบได้");
        return;
      }

      // ==========================================
      // SAVE USER ID FOR EXAM
      // ==========================================

      localStorage.setItem(
        "exam_user",
        JSON.stringify({
          id: newUser.id,
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          examCode: newUser.exam_code,
          branch: newUser.branch,
          status: newUser.status,
        })
      );

      // ล้าง Session เก่าของรหัสนี้
      localStorage.removeItem(
        `exam_session_${newUser.exam_code}`
      );

      // ==========================================
      // GO TO EXAM
      // ==========================================

      router.push("/exam");
    } catch (error) {
      console.error(error);

      alert(
        "เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#06154f] px-6 py-10 text-white">
      {/* BACKGROUND GLOW */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-40 top-10 h-[500px] w-[500px] rounded-full bg-blue-500/20 blur-[140px]" />

        <div className="absolute right-[-150px] bottom-0 h-[600px] w-[600px] rounded-full bg-cyan-400/10 blur-[150px]" />

        <div className="absolute left-[40%] top-[30%] h-[400px] w-[400px] rounded-full bg-indigo-500/10 blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-xl">
        {/* HEADER */}
        <div className="mb-8 text-center">
          <div className="text-sm font-black tracking-[0.3em] text-cyan-300">
            EMPLOYEE TRAINING
          </div>

          <h1 className="mt-3 text-4xl font-black md:text-5xl">
            🎮 ลงทะเบียนเข้าสอบ
          </h1>

          <p className="mt-3 text-blue-100/50">
            กรอกข้อมูลเพื่อเข้าสู่ Training Arena
          </p>
        </div>

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="rounded-[30px] border border-cyan-300/20 bg-gradient-to-br from-[#09276f] to-[#07194d] p-7 shadow-[0_0_60px_rgba(0,120,255,0.15)] md:p-8"
        >
          <div className="space-y-5">
            {/* FIRST NAME */}
            <Input
              label="ชื่อ"
              placeholder="กรอกชื่อภาษาไทย"
              value={firstName}
              onChange={setFirstName}
            />

            {/* LAST NAME */}
            <Input
              label="นามสกุล"
              placeholder="กรอกนามสกุลภาษาไทย"
              value={lastName}
              onChange={setLastName}
            />

            {/* EXAM CODE */}
            <div>
              <label className="mb-2 block text-sm font-bold text-blue-100/70">
                รหัสเข้าสอบ
              </label>

              <input
                value={examCode}
                onChange={(e) =>
                  setExamCode(e.target.value)
                }
                placeholder="สร้างรหัสของคุณเอง"
                autoComplete="off"
                className="w-full rounded-xl border border-blue-300/15 bg-[#050f38] px-4 py-4 text-white outline-none transition placeholder:text-blue-100/20 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/10"
              />

              <p className="mt-2 text-xs text-blue-100/30">
                🔐 ใช้รหัสนี้สำหรับกลับเข้ามาทำข้อสอบต่อ
              </p>
            </div>

            {/* BRANCH */}
            <div>
              <label className="mb-2 block text-sm font-bold text-blue-100/70">
                สาขา
              </label>

              <select
                value={branch}
                onChange={(e) =>
                  setBranch(e.target.value)
                }
                className="w-full rounded-xl border border-blue-300/15 bg-[#050f38] px-4 py-4 text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/10"
              >
                <option value="">
                  -- เลือกสาขา --
                </option>

                {branches.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* INFO */}
          <div className="mt-6 rounded-2xl border border-cyan-300/10 bg-cyan-400/5 p-4">
            <div className="text-sm font-black text-cyan-300">
              🎯 ข้อมูลการสอบ
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-black/10 p-3">
                <div className="text-blue-100/40">
                  ข้อสอบ
                </div>

                <div className="mt-1 font-black">
                  📝 15 ข้อ
                </div>
              </div>

              <div className="rounded-xl bg-black/10 p-3">
                <div className="text-blue-100/40">
                  เวลา
                </div>

                <div className="mt-1 font-black">
                  ⏱️ 15 นาที
                </div>
              </div>
            </div>
          </div>

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={loading}
            className={`mt-7 w-full rounded-2xl py-4 text-lg font-black transition ${
              loading
                ? "cursor-not-allowed bg-white/10 text-white/30"
                : "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-[0_0_30px_rgba(0,200,255,0.3)] hover:scale-[1.02] hover:shadow-[0_0_45px_rgba(0,200,255,0.45)]"
            }`}
          >
            {loading
              ? "⏳ กำลังลงทะเบียน..."
              : "🚀 ยืนยันและเข้าสอบ"}
          </button>
        </form>
      </div>
    </main>
  );
}

/* ==========================================
   INPUT
========================================== */

function Input({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-blue-100/70">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        className="w-full rounded-xl border border-blue-300/15 bg-[#050f38] px-4 py-4 text-white outline-none transition placeholder:text-blue-100/20 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/10"
      />
    </div>
  );
}