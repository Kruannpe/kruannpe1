import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, FileText, Info, Play, ShieldAlert, Sparkles } from 'lucide-react';
import { StudentRegistrationInput } from '../types';

interface StudentFormProps {
  onStartQuiz: (data: StudentRegistrationInput) => Promise<void>;
  isLoading: boolean;
  errorMessage: string | null;
  resumeAttemptData?: {
    attemptId: string;
    studentName: string;
    studentClass: string;
    studentNo: number;
  } | null;
  onResumeQuiz?: () => void;
}

export const StudentForm: React.FC<StudentFormProps> = ({
  onStartQuiz,
  isLoading,
  errorMessage,
  resumeAttemptData,
  onResumeQuiz
}) => {
  const [formData, setFormData] = useState<StudentRegistrationInput>({
    firstName: '',
    lastName: '',
    studentClass: '',
    studentNo: '',
    agreeRules: false
  });

  const [titleWarning, setTitleWarning] = useState<string | null>(null);

  // Common titles to check for helpful warning
  const TITLES = ['เด็กชาย', 'เด็กหญิง', 'ด.ช.', 'ด.ญ.', 'ด.ช', 'ด.ญ', 'นาย', 'นางสาว', 'นาง', 'น.ส.'];

  const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, firstName: val }));

    const trimmed = val.trim();
    const foundTitle = TITLES.find(t => trimmed.startsWith(t));
    if (foundTitle) {
      setTitleWarning(`ตรวจพบคำนำหน้าชื่อ "${foundTitle}" ระบบจะตัดคำนำหน้าออกโดยอัตโนมัติเพื่อให้ชื่อถูกต้องตามกติกา`);
    } else {
      setTitleWarning(null);
    }
  };

  // Form validation rules
  const cleanFirst = formData.firstName.trim();
  const cleanLast = formData.lastName.trim();
  const cleanClass = formData.studentClass.trim();
  const numNo = parseInt(formData.studentNo.trim(), 10);

  const isFormValid =
    cleanFirst.length > 0 &&
    cleanLast.length > 0 &&
    cleanClass.length > 0 &&
    !isNaN(numNo) &&
    numNo > 0 &&
    Number.isInteger(numNo) &&
    formData.agreeRules;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isLoading) return;
    await onStartQuiz(formData);
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      {/* Quiz Banner Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-8 relative overflow-hidden border border-blue-700/50">
        {/* Background track lane decoration */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 border-8 border-white/5 rounded-full pointer-events-none"></div>
        <div className="absolute -right-6 -bottom-6 w-48 h-48 border-8 border-orange-500/10 rounded-full pointer-events-none"></div>

        <div className="relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 text-xs font-semibold mb-3 border border-orange-500/30">
            <span>🏁 กลุ่มสาระการเรียนรู้สุขศึกษาและพลศึกษา</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-3">
            แบบทดสอบออนไลน์ วิชาพลศึกษา เรื่อง กรีฑาประเภทลู่
          </h1>

          <div className="flex flex-wrap items-center gap-3 text-sm text-blue-100/90 font-medium">
            <span className="inline-flex items-center bg-blue-800/80 px-3 py-1 rounded-lg border border-blue-600/50">
              <FileText className="w-4 h-4 mr-1.5 text-blue-300" />
              20 ข้อ
            </span>
            <span className="inline-flex items-center bg-blue-800/80 px-3 py-1 rounded-lg border border-blue-600/50">
              <Sparkles className="w-4 h-4 mr-1.5 text-amber-300" />
              20 คะแนน
            </span>
            <span className="inline-flex items-center bg-orange-950/70 px-3 py-1 rounded-lg border border-orange-600/40 text-orange-200">
              <Clock className="w-4 h-4 mr-1.5 text-orange-400" />
              ข้อละ 30 วินาที
            </span>
          </div>
        </div>
      </div>

      {/* Resume Active Session Alert (If exists) */}
      {resumeAttemptData && onResumeQuiz && (
        <div className="mb-6 p-5 bg-amber-50 border-2 border-amber-300 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <Info className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-900 text-base">
                พบเซสชันการสอบที่ยังทำไม่เสร็จของคุณ
              </h4>
              <p className="text-sm text-amber-800 mt-0.5">
                {resumeAttemptData.studentName} ชั้น {resumeAttemptData.studentClass} เลขที่ {resumeAttemptData.studentNo} — เวลาแต่ละข้อยังคงเดินตามเซิร์ฟเวอร์
              </p>
            </div>
          </div>
          <button
            id="resume-quiz-btn"
            onClick={onResumeQuiz}
            className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-sm shadow transition-all shrink-0"
          >
            กลับเข้าทำข้อสอบต่อ
          </button>
        </div>
      )}

      {/* Error / Duplicate Warning Alert */}
      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-xl flex items-start space-x-3 text-red-800 shadow-sm animate-shake">
          <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-red-900">ไม่สามารถเริ่มทำแบบทดสอบได้</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Student Registration Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-md border border-slate-200">
          <div className="flex items-center space-x-2 pb-4 mb-6 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              ข้อมูลประจำตัวผู้เข้าสอบ
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* First Name */}
            <div>
              <label htmlFor="student-first-name" className="block text-sm font-semibold text-slate-700 mb-1.5">
                ชื่อ <span className="text-red-500">*</span>
              </label>
              <input
                id="student-first-name"
                type="text"
                value={formData.firstName}
                onChange={handleFirstNameChange}
                placeholder="เช่น กิตติศักดิ์"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 text-sm transition-all"
                disabled={isLoading}
                required
              />
              <p className="text-xs text-slate-500 mt-1.5 flex items-center">
                <Info className="w-3.5 h-3.5 mr-1 text-slate-400 inline shrink-0" />
                คำแนะนำ: ไม่ต้องกรอกคำนำหน้าชื่อ (เช่น เด็กชาย, นาย, นางสาว)
              </p>
              {titleWarning && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded-lg mt-2">
                  {titleWarning}
                </p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="student-last-name" className="block text-sm font-semibold text-slate-700 mb-1.5">
                นามสกุล <span className="text-red-500">*</span>
              </label>
              <input
                id="student-last-name"
                type="text"
                value={formData.lastName}
                onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                placeholder="เช่น ทองคำเภา"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 text-sm transition-all"
                disabled={isLoading}
                required
              />
            </div>

            {/* Class */}
            <div>
              <label htmlFor="student-class" className="block text-sm font-semibold text-slate-700 mb-1.5">
                ชั้นเรียน <span className="text-red-500">*</span>
              </label>
              <input
                id="student-class"
                type="text"
                value={formData.studentClass}
                onChange={e => setFormData(prev => ({ ...prev, studentClass: e.target.value }))}
                placeholder="เช่น ม.2/1 หรือ ม.1/3"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 text-sm transition-all"
                disabled={isLoading}
                required
              />
            </div>

            {/* Student Number */}
            <div>
              <label htmlFor="student-no" className="block text-sm font-semibold text-slate-700 mb-1.5">
                เลขที่ <span className="text-red-500">*</span>
              </label>
              <input
                id="student-no"
                type="number"
                min="1"
                step="1"
                value={formData.studentNo}
                onChange={e => setFormData(prev => ({ ...prev, studentNo: e.target.value }))}
                placeholder="เช่น 15"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 text-sm transition-all"
                disabled={isLoading}
                required
              />
              <p className="text-xs text-slate-500 mt-1.5">
                ระบุเป็นจำนวนเต็มบวก (เช่น 1, 2, 15)
              </p>
            </div>
          </div>
        </div>

        {/* Instructions Card (6 Mandated Rules) */}
        <div className="bg-slate-50 rounded-2xl p-6 sm:p-8 border border-slate-300/80 shadow-sm">
          <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-slate-200">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              คำชี้แจงและกติกาการสอบที่ต้องทราบ
            </h2>
          </div>

          <ul className="space-y-3 text-sm text-slate-700">
            <li className="flex items-start space-x-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                1
              </span>
              <span>
                <strong>สิทธิ์การสอบ:</strong> ผู้เข้าสอบชื่อและนามสกุลเดิมทำได้เพียง <strong>ครั้งเดียว</strong> สำหรับแบบทดสอบนี้
              </span>
            </li>
            <li className="flex items-start space-x-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                2
              </span>
              <span>
                <strong>การนับสิทธิ์:</strong> เมื่อกดเริ่มสอบ ระบบจะนับว่าใช้สิทธิ์แล้วทันทีในฐานข้อมูลกลาง
              </span>
            </li>
            <li className="flex items-start space-x-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                3
              </span>
              <span>
                <strong>การจับเวลา:</strong> แต่ละข้อมีเวลา <strong>30 วินาที</strong> เวลาที่เหลือไม่สะสมไปข้อถัดไป
              </span>
            </li>
            <li className="flex items-start space-x-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                4
              </span>
              <span>
                <strong>การหมดเวลา:</strong> เมื่อหมดเวลา ระบบจะบันทึกตัวเลือกที่เลือกไว้ล่าสุด หากไม่เลือกคำตอบจะได้ 0 คะแนนในข้อนั้น
              </span>
            </li>
            <li className="flex items-start space-x-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                5
              </span>
              <span>
                <strong>ห้ามย้อนกลับ:</strong> ไม่สามารถย้อนกลับไปแก้ไขข้อก่อนหน้าได้
              </span>
            </li>
            <li className="flex items-start space-x-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                6
              </span>
              <span>
                <strong>ระบบเวลามาตรฐาน:</strong> การรีเฟรช ปิดหน้าเว็บ หรือสลับแท็บ ไม่ทำให้เวลาเริ่มใหม่ เวลาจะยังคงเดินต่อไปตามเวลาของเซิร์ฟเวอร์
              </span>
            </li>
          </ul>

          {/* Agreement Checkbox */}
          <div className="mt-6 pt-4 border-t border-slate-200">
            <label className="flex items-center space-x-3 cursor-pointer select-none">
              <input
                id="agree-rules-checkbox"
                type="checkbox"
                checked={formData.agreeRules}
                onChange={e => setFormData(prev => ({ ...prev, agreeRules: e.target.checked }))}
                className="w-5 h-5 rounded border-slate-400 text-blue-600 focus:ring-blue-500 transition cursor-pointer"
                disabled={isLoading}
              />
              <span className="text-sm font-bold text-slate-800">
                ฉันอ่านและเข้าใจกติกาแล้ว พร้อมเริ่มทำแบบทดสอบ
              </span>
            </label>
          </div>
        </div>

        {/* Start Quiz Button */}
        <div className="pt-2">
          <button
            id="start-quiz-btn"
            type="submit"
            disabled={!isFormValid || isLoading}
            className={`w-full py-4 px-6 rounded-2xl font-bold text-base sm:text-lg flex items-center justify-center space-x-2 shadow-lg transition-all ${
              isFormValid && !isLoading
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white cursor-pointer active:scale-[0.99] shadow-orange-600/30'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
            }`}
          >
            {isLoading ? (
              <span className="inline-flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                กำลังตรวจสอบสิทธิ์และเริ่มการทดสอบ...
              </span>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>เริ่มทำแบบทดสอบ</span>
              </>
            )}
          </button>

          {!isFormValid && (
            <p className="text-center text-xs text-slate-500 mt-2">
              * โปรดกรอกข้อมูลให้ครบทั้ง 4 ช่อง และทำเครื่องหมายยอมรับกติกาเพื่อเปิดใช้งานปุ่ม
            </p>
          )}
        </div>
      </form>
    </div>
  );
};
