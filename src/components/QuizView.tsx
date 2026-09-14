import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Clock, CheckCircle2, AlertTriangle, ArrowRight, User, Hash, School, Send } from 'lucide-react';
import { ChoiceKey, QuizQuestionPublic, StudentInfo } from '../types';

interface QuizViewProps {
  question: QuizQuestionPublic;
  currentQuestionIndex: number;
  totalQuestions: number;
  serverDeadlineMs: number;
  initialRemainingSeconds: number;
  studentInfo: StudentInfo;
  selectedDraft: ChoiceKey | null;
  onDraftChange: (choice: ChoiceKey) => Promise<void>;
  onConfirmAnswer: (choice: ChoiceKey) => Promise<void>;
  onTimeExpired: () => Promise<void>;
}

export const QuizView: React.FC<QuizViewProps> = ({
  question,
  currentQuestionIndex,
  totalQuestions,
  serverDeadlineMs,
  initialRemainingSeconds,
  studentInfo,
  selectedDraft,
  onDraftChange,
  onConfirmAnswer,
  onTimeExpired
}) => {
  const [selectedChoice, setSelectedChoice] = useState<ChoiceKey | null>(selectedDraft);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(initialRemainingSeconds);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasExpiredRef = useRef(false);

  // Sync draft choice when question changes
  useEffect(() => {
    setSelectedChoice(selectedDraft);
    setSaveStatus(selectedDraft ? 'saved' : 'idle');
    hasExpiredRef.current = false;
    setIsSubmitting(false);
  }, [question.id, selectedDraft]);

  // Server-synchronized Countdown Timer
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const diffMs = serverDeadlineMs - now;
      const secs = Math.max(0, Math.ceil(diffMs / 1000));
      setRemainingSeconds(secs);

      if (secs <= 0 && !hasExpiredRef.current && !isSubmitting) {
        hasExpiredRef.current = true;
        onTimeExpired();
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 250);

    return () => clearInterval(interval);
  }, [serverDeadlineMs, onTimeExpired, isSubmitting]);

  // Handle choice selection with auto-save
  const handleSelectChoice = async (choice: ChoiceKey) => {
    if (isSubmitting || remainingSeconds <= 0) return;
    setSelectedChoice(choice);
    setSaveStatus('saving');
    try {
      await onDraftChange(choice);
      setSaveStatus('saved');
    } catch {
      setSaveStatus('idle');
    }
  };

  // Handle confirmation
  const handleConfirm = useCallback(async () => {
    if (!selectedChoice || isSubmitting || remainingSeconds <= 0) return;
    setIsSubmitting(true);
    try {
      await onConfirmAnswer(selectedChoice);
    } catch (err) {
      console.error('Confirm error:', err);
      setIsSubmitting(false);
    }
  }, [selectedChoice, isSubmitting, remainingSeconds, onConfirmAnswer]);

  // Keyboard Navigation: 1-4 or ก-ง, and Enter to submit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid triggering when user focuses an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      const key = e.key;
      if (key === '1' || key === 'ก') handleSelectChoice('ก');
      else if (key === '2' || key === 'ข') handleSelectChoice('ข');
      else if (key === '3' || key === 'ค') handleSelectChoice('ค');
      else if (key === '4' || key === 'ง') handleSelectChoice('ง');
      else if (key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleConfirm]);

  const isUrgent = remainingSeconds <= 10;
  const progressPercent = Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100);

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6">
      {/* Student Meta & Header Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg mb-6 border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white shadow-inner">
              <User className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-100 text-sm sm:text-base">
                {studentInfo.firstName} {studentInfo.lastName}
              </span>
              <div className="flex items-center space-x-2 text-slate-400 text-xs mt-0.5">
                <span>ชั้น {studentInfo.studentClass}</span>
                <span>•</span>
                <span>เลขที่ {studentInfo.studentNo}</span>
              </div>
            </div>
          </div>

          {/* Question Index Badge */}
          <div className="flex items-center space-x-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
            <span className="text-slate-400 text-xs">ข้อที่</span>
            <span className="text-base font-extrabold text-blue-400">
              {currentQuestionIndex + 1}
            </span>
            <span className="text-slate-400 text-xs">/ {totalQuestions}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
            <div
              className="bg-gradient-to-r from-blue-500 to-orange-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1.5">
            <span>ความคืบหน้า</span>
            <span>{progressPercent}%</span>
          </div>
        </div>
      </div>

      {/* Main Question Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 relative overflow-hidden">
        {/* Top bar inside card: Category & Timer */}
        <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            {question.category}
          </span>

          {/* 30-Second Timer Display */}
          <div
            id="quiz-timer"
            className={`flex items-center space-x-2 px-4 py-2 rounded-2xl border transition-all duration-300 ${
              isUrgent
                ? 'bg-red-500 text-white border-red-600 shadow-md shadow-red-500/30 animate-pulse'
                : 'bg-slate-100 text-slate-800 border-slate-200'
            }`}
          >
            <Clock className={`w-5 h-5 ${isUrgent ? 'text-white' : 'text-orange-600'}`} />
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-black tabular-nums tracking-tight">
                {remainingSeconds}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider">
                วินาที
              </span>
            </div>
          </div>
        </div>

        {/* Question Text */}
        <div className="mb-5 sm:mb-8">
          <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 leading-snug sm:leading-relaxed">
            {question.question}
          </h2>
        </div>

        {/* 4 Choices: ก, ข, ค, ง with touch-optimized sizing & responsive typography */}
        <div className="flex flex-col gap-3 sm:gap-3.5 mb-6 sm:mb-8" role="radiogroup">
          {question.options.map((opt) => {
            const isSelected = selectedChoice === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                id={`choice-${opt.key}`}
                onClick={() => handleSelectChoice(opt.key)}
                disabled={isSubmitting || remainingSeconds <= 0}
                className={`w-full text-left min-h-[54px] sm:min-h-[60px] p-3.5 sm:p-4 md:p-5 rounded-2xl border-2 transition-all flex items-center space-x-3 sm:space-x-4 group cursor-pointer touch-manipulation active:scale-[0.99] select-none ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/90 text-blue-950 shadow-md ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/80 text-slate-800'
                }`}
              >
                {/* Option Key Badge with responsive size and typography */}
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-sm sm:text-base shrink-0 transition-colors shadow-xs ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'
                  }`}
                >
                  {opt.key}
                </div>

                {/* Option Text with responsive typography & touch comfort */}
                <span className="text-sm sm:text-base font-medium leading-normal sm:leading-relaxed text-slate-800 grow pt-0.5 sm:pt-0">
                  {opt.text}
                </span>

                {/* Selected Checkmark Icon */}
                {isSelected && (
                  <div className="shrink-0 pl-1">
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer Actions: Auto-save status & Confirm button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
          {/* Auto-save status indicator */}
          <div className="flex items-center space-x-2 text-xs order-2 sm:order-1">
            {saveStatus === 'saved' && (
              <span className="text-emerald-700 flex items-center font-medium bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                บันทึกตัวเลือก {selectedChoice} แล้ว
              </span>
            )}
            {saveStatus === 'saving' && (
              <span className="text-amber-700 flex items-center font-medium bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping mr-1.5"></span>
                กำลังบันทึกตัวเลือก...
              </span>
            )}
            {saveStatus === 'idle' && !selectedChoice && (
              <span className="text-slate-400">
                แตะเลือกคำตอบ 1 ตัวเลือกเพื่อเปิดปุ่มยืนยัน
              </span>
            )}
          </div>

          {/* Confirm Button with touch-optimized min height */}
          <button
            id="confirm-next-btn"
            type="button"
            onClick={handleConfirm}
            disabled={!selectedChoice || isSubmitting || remainingSeconds <= 0}
            className={`w-full sm:w-auto min-h-[48px] px-6 sm:px-7 py-3 sm:py-3.5 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center space-x-2 shadow transition-all touch-manipulation order-1 sm:order-2 ${
              selectedChoice && !isSubmitting && remainingSeconds > 0
                ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-blue-600/30 active:scale-[0.98]'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            {isSubmitting ? (
              <span>กำลังบันทึก...</span>
            ) : (
              <>
                <span>
                  {currentQuestionIndex + 1 === totalQuestions
                    ? 'ยืนยันคำตอบและส่งข้อสอบ'
                    : 'ยืนยันคำตอบและไปข้อถัดไป'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Keyboard Shortcut Tips */}
      <div className="mt-4 text-center text-xs text-slate-400 hidden sm:block">
        💡 เคล็ดลับ: สามารถกดแป้นพิมพ์ <strong>1, 2, 3, 4</strong> (หรือ <strong>ก, ข, ค, ง</strong>) เพื่อเลือก และกด <strong>Enter</strong> เพื่อยืนยันคำตอบ
      </div>
    </div>
  );
};
