import React, { useState } from 'react';
import { X, CheckCircle, HelpCircle, Layers, Award } from 'lucide-react';
import { TRACK_ATHLETICS_QUESTIONS } from '../data/questions';

interface QuestionsReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuestionsReviewModal: React.FC<QuestionsReviewModalProps> = ({ isOpen, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (!isOpen) return null;

  const categories = Array.from(new Set(TRACK_ATHLETICS_QUESTIONS.map(q => q.category)));

  const filteredQuestions = selectedCategory === 'all'
    ? TRACK_ATHLETICS_QUESTIONS
    : TRACK_ATHLETICS_QUESTIONS.filter(q => q.category === selectedCategory);

  // Statistics on correct answer distribution
  const counts = {
    ก: TRACK_ATHLETICS_QUESTIONS.filter(q => q.correctAnswer === 'ก').length,
    ข: TRACK_ATHLETICS_QUESTIONS.filter(q => q.correctAnswer === 'ข').length,
    ค: TRACK_ATHLETICS_QUESTIONS.filter(q => q.correctAnswer === 'ค').length,
    ง: TRACK_ATHLETICS_QUESTIONS.filter(q => q.correctAnswer === 'ง').length,
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-3xl">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <span>รายการข้อสอบ 20 ข้อ และเฉลยพร้อมคำอธิบาย</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ตรวจทานเนื้อหาตามมาตรฐานหลักสูตรกรีฑาประเภทลู่ มัธยมศึกษาตอนต้น
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Answer Balance Info Ribbon */}
        <div className="bg-blue-50 px-6 py-3 border-b border-blue-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="font-semibold text-blue-900">
            การกระจายตัวเลือกถูก (สมดุล 100%):
          </span>
          <div className="flex items-center space-x-4">
            <span className="bg-white px-2 py-1 rounded border border-blue-200 font-bold text-slate-800">
              ข้อ ก: {counts.ก} ข้อ (25%)
            </span>
            <span className="bg-white px-2 py-1 rounded border border-blue-200 font-bold text-slate-800">
              ข้อ ข: {counts.ข} ข้อ (25%)
            </span>
            <span className="bg-white px-2 py-1 rounded border border-blue-200 font-bold text-slate-800">
              ข้อ ค: {counts.ค} ข้อ (25%)
            </span>
            <span className="bg-white px-2 py-1 rounded border border-blue-200 font-bold text-slate-800">
              ข้อ ง: {counts.ง} ข้อ (25%)
            </span>
          </div>
        </div>

        {/* Filter by category */}
        <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-2 overflow-x-auto text-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            ทั้งหมด (20 ข้อ)
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Question Cards List */}
        <div className="p-6 overflow-y-auto space-y-6">
          {filteredQuestions.map((q) => (
            <div key={q.id} className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="font-extrabold text-blue-800 text-sm">
                  ข้อที่ {q.questionNumber}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-700">
                  {q.category}
                </span>
              </div>

              <h4 className="font-bold text-slate-900 text-base mb-4">
                {q.question}
              </h4>

              {/* Choices */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                {q.options.map(opt => {
                  const isCorrect = opt.key === q.correctAnswer;
                  return (
                    <div
                      key={opt.key}
                      className={`p-3 rounded-xl text-xs flex items-start space-x-2 border ${
                        isCorrect
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded flex items-center justify-center shrink-0 font-bold ${
                        isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {opt.key}
                      </span>
                      <span className="pt-0.5">{opt.text}</span>
                      {isCorrect && (
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 ml-auto" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Explanation */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs text-slate-600">
                <span className="font-bold text-blue-900 block mb-1">
                  คำอธิบายเฉลย (ข้อ {q.correctAnswer}):
                </span>
                {q.explanation}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50 rounded-b-3xl">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-sm transition"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
