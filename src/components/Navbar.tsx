import React from 'react';
import { ShieldCheck, UserCheck, BookOpen, GraduationCap } from 'lucide-react';

interface NavbarProps {
  currentView: 'student' | 'teacher';
  onViewChange: (view: 'student' | 'teacher') => void;
  isQuizActive: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onViewChange, isQuizActive }) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & School info */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white font-bold shadow-inner ring-2 ring-orange-400/30">
            <span className="text-xl">🏃</span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base sm:text-lg tracking-tight text-white">
                แบบทดสอบกรีฑาประเภทลู่
              </span>
              <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-900/80 text-blue-200 border border-blue-700">
                มัธยมศึกษาตอนต้น
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              กลุ่มสาระการเรียนรู้สุขศึกษาและพลศึกษา โรงเรียนท่ายางวิทยา
            </p>
          </div>
        </div>

        {/* View Switcher Tabs (Disabled while quiz is running) */}
        {!isQuizActive && (
          <nav className="flex items-center space-x-2 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            <button
              id="nav-student-btn"
              onClick={() => onViewChange('student')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                currentView === 'student'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>ห้องสอบนักเรียน</span>
            </button>
            <button
              id="nav-teacher-btn"
              onClick={() => onViewChange('teacher')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                currentView === 'teacher'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>ระบบสำหรับครู</span>
            </button>
          </nav>
        )}

        {isQuizActive && (
          <div className="flex items-center space-x-2 bg-amber-500/20 text-amber-300 px-3 py-1 rounded-lg border border-amber-500/30 text-xs sm:text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>กำลังทำการทดสอบ</span>
          </div>
        )}
      </div>
    </header>
  );
};
