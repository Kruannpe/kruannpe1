import React from 'react';
import { CheckCircle, Award, Check, X, HelpCircle, Calendar, User, Printer, Lock } from 'lucide-react';
import { QuizResultData } from '../types';

interface ResultViewProps {
  result: QuizResultData;
}

export const ResultView: React.FC<ResultViewProps> = ({ result }) => {
  const formatThaiDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Grade evaluation label
  const isPass = result.score >= 10;
  const gradeLabel =
    result.score >= 16 ? 'ดีเยี่ยม' :
    result.score >= 13 ? 'ดี' :
    result.score >= 10 ? 'ผ่านเกณฑ์' : 'ไม่ผ่านเกณฑ์';

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6">
      {/* Official Status Card */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden print:shadow-none print:border-none">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 sm:p-8 text-center relative">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500 text-white mb-3 shadow-lg shadow-emerald-500/30">
            <CheckCircle className="w-10 h-10 stroke-[2.5]" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-1">
            บันทึกผลสอบเรียบร้อยแล้ว
          </h1>
          <p className="text-sm text-blue-200">
            แบบทดสอบออนไลน์ วิชาพลศึกษา เรื่อง กรีฑาประเภทลู่
          </p>
          <p className="text-xs text-blue-300 mt-1">
            โรงเรียนท่ายางวิทยา
          </p>

          <div className="mt-4 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-950/60 text-blue-200 text-xs border border-blue-700/50">
            <Lock className="w-3.5 h-3.5" />
            <span>คุณใช้สิทธิ์ทำแบบทดสอบนี้แล้ว</span>
          </div>
        </div>

        {/* Student Information */}
        <div className="p-6 sm:p-8">
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center space-x-2">
                <span className="text-slate-500">ชื่อ-นามสกุล:</span>
                <span className="font-bold text-slate-800">
                  {result.firstName} {result.lastName}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-slate-500">ระดับชั้น:</span>
                <span className="font-bold text-slate-800">
                  {result.studentClass}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-slate-500">เลขที่:</span>
                <span className="font-bold text-slate-800">
                  {result.studentNo}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-slate-500">ผลการประเมิน:</span>
                <span className={`font-bold px-2 py-0.5 rounded text-xs ${
                  isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                }`}>
                  {gradeLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Big Score Callout */}
          <div className="text-center py-6 px-4 bg-gradient-to-b from-blue-50/70 to-white rounded-3xl border border-blue-100 mb-6">
            <span className="text-xs font-bold text-blue-900 uppercase tracking-wider block mb-1">
              คะแนนรวมที่ได้
            </span>
            <div className="flex items-baseline justify-center space-x-2">
              <span className="text-5xl sm:text-6xl font-black text-blue-900 tracking-tight">
                {result.score}
              </span>
              <span className="text-xl sm:text-2xl font-bold text-slate-400">
                / {result.totalQuestions}
              </span>
            </div>

            <div className="mt-2 text-base sm:text-lg font-semibold text-slate-700">
              คิดเป็น <span className="font-extrabold text-blue-700">{result.percentage}%</span>
            </div>
          </div>

          {/* Breakdown Stats (Correct, Wrong, Unanswered) */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
              <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 mb-1">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-900">
                {result.correctCount}
              </div>
              <div className="text-xs font-semibold text-emerald-700">
                ตอบถูก
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
              <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-700 mb-1">
                <X className="w-4 h-4 stroke-[3]" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-red-900">
                {result.wrongCount}
              </div>
              <div className="text-xs font-semibold text-red-700">
                ตอบผิด
              </div>
            </div>

            <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 text-center">
              <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 text-slate-700 mb-1">
                <HelpCircle className="w-4 h-4 stroke-[3]" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-800">
                {result.unansweredCount}
              </div>
              <div className="text-xs font-semibold text-slate-600">
                ไม่ได้ตอบ
              </div>
            </div>
          </div>

          {/* Submission Timestamp */}
          <div className="flex items-center justify-center space-x-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
            <Calendar className="w-3.5 h-3.5" />
            <span>วันและเวลาที่ส่งแบบทดสอบ: {formatThaiDateTime(result.completedAt)}</span>
          </div>

          {/* Action buttons (Print receipt, no retake) */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center print:hidden">
            <button
              onClick={handlePrint}
              className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm flex items-center justify-center space-x-2 border border-slate-300 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์หรือบันทึกใบรายงานผล</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
