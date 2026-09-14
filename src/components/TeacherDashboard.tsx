import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Trash2,
  CheckCircle,
  Clock,
  BookOpen,
  Award,
  Users,
  LogOut,
  ExternalLink,
  Info,
  HelpCircle,
  FileText
} from 'lucide-react';
import { TeacherStudentRow } from '../types';
import { TeacherGuideModal } from './TeacherGuideModal';
import { QuestionsReviewModal } from './QuestionsReviewModal';
import { signInWithGoogle, logOutGoogle, getCachedAccessToken } from '../firebase/config';

interface TeacherDashboardProps {
  onBackToStudentView: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onBackToStudentView }) => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [teacherToken, setTeacherToken] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState<string>('ครูกุลรัศมิ์ ทองคำเภา');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Data state
  const [attempts, setAttempts] = useState<TeacherStudentRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress'>('all');

  // Modals
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);

  // Google Sheets Export status
  const [isExportingSheets, setIsExportingSheets] = useState(false);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  // Reset attempt confirmation
  const [resettingAttemptId, setResettingAttemptId] = useState<string | null>(null);

  // Check existing token in sessionStorage
  useEffect(() => {
    const savedToken = sessionStorage.getItem('thw_teacher_token');
    if (savedToken) {
      setTeacherToken(savedToken);
      setIsAuthenticated(true);
      fetchAttempts(savedToken);
    }
  }, []);

  // Fetch attempts from server
  const fetchAttempts = async (token: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/teacher/attempts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAttempts(data.attempts || []);
      } else if (res.status === 403) {
        handleLogout();
      }
    } catch (err) {
      console.error('Failed to fetch attempts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Password / PIN Login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const res = await fetch('/api/teacher/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput.trim() })
      });
      const data = await res.json();
      if (data.success && data.teacherToken) {
        sessionStorage.setItem('thw_teacher_token', data.teacherToken);
        setTeacherToken(data.teacherToken);
        setTeacherName(data.teacherName || 'ครูกุลรัศมิ์ ทองคำเภา');
        setIsAuthenticated(true);
        fetchAttempts(data.teacherToken);
      } else {
        setLoginError(data.message || 'รหัสผ่านไม่ถูกต้อง');
      }
    } catch {
      setLoginError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Google Sign-In
  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const result = await signInWithGoogle();
      if (result?.user) {
        const res = await fetch('/api/teacher/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ googleEmail: result.user.email })
        });
        const data = await res.json();
        if (data.success && data.teacherToken) {
          sessionStorage.setItem('thw_teacher_token', data.teacherToken);
          setTeacherToken(data.teacherToken);
          setTeacherName(result.user.displayName || 'ครูกุลรัศมิ์ ทองคำเภา');
          setIsAuthenticated(true);
          fetchAttempts(data.teacherToken);
        } else {
          setLoginError(data.message || 'อีเมลนี้ไม่ได้รับสิทธิ์เข้าถึงระบบครู');
        }
      }
    } catch (err: any) {
      setLoginError(err?.message || 'การลงชื่อเข้าใช้ด้วย Google ล้มเหลว');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    sessionStorage.removeItem('thw_teacher_token');
    setTeacherToken(null);
    setIsAuthenticated(false);
    try {
      await logOutGoogle();
    } catch {
      // ignore
    }
  };

  // Reset student attempt
  const handleConfirmReset = async (attemptId: string) => {
    if (!teacherToken) return;
    try {
      const res = await fetch('/api/teacher/reset-attempt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teacherToken}`
        },
        body: JSON.stringify({ attemptId })
      });
      const data = await res.json();
      if (data.success) {
        setResettingAttemptId(null);
        fetchAttempts(teacherToken);
      } else {
        alert(data.message);
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการรีเซ็ต');
    }
  };

  // Filtered student list
  const filteredAttempts = useMemo(() => {
    return attempts.filter(att => {
      const fullName = `${att.firstName} ${att.lastName}`.toLowerCase();
      const matchSearch = fullName.includes(searchTerm.toLowerCase()) || att.studentClass.includes(searchTerm);
      const matchClass = selectedClass === 'all' || att.studentClass === selectedClass;
      const matchStatus = statusFilter === 'all' || att.status === statusFilter;
      return matchSearch && matchClass && matchStatus;
    });
  }, [attempts, searchTerm, selectedClass, statusFilter]);

  // Statistics
  const completedAttempts = attempts.filter(a => a.status === 'completed');
  const avgScore = completedAttempts.length
    ? (completedAttempts.reduce((acc, curr) => acc + curr.score, 0) / completedAttempts.length).toFixed(1)
    : '0.0';
  const highestScore = completedAttempts.length
    ? Math.max(...completedAttempts.map(a => a.score))
    : 0;
  const passRate = completedAttempts.length
    ? Math.round((completedAttempts.filter(a => a.score >= 10).length / completedAttempts.length) * 100)
    : 0;

  const uniqueClasses = Array.from(new Set(attempts.map(a => a.studentClass))).sort();

  // Export to Excel CSV with UTF-8 BOM
  const handleExportCSV = () => {
    if (!filteredAttempts.length) {
      alert('ไม่มีข้อมูลสำหรับส่งออก');
      return;
    }

    const headers = [
      'ลำดับ',
      'ชื่อ',
      'นามสกุล',
      'ชั้น',
      'เลขที่',
      'คะแนน (เต็ม 20)',
      'ร้อยละ (%)',
      'ตอบถูก (ข้อ)',
      'ตอบผิด (ข้อ)',
      'ไม่ได้ตอบ (ข้อ)',
      'สถานะ',
      'วันเวลาที่เริ่มสอบ',
      'วันเวลาที่ส่งผลสอบ'
    ];

    const rows = filteredAttempts.map((att, idx) => [
      idx + 1,
      `"${att.firstName}"`,
      `"${att.lastName}"`,
      `"${att.studentClass}"`,
      att.studentNo,
      att.score,
      att.percentage,
      att.correctCount,
      att.wrongCount,
      att.unansweredCount,
      att.status === 'completed' ? 'สอบเสร็จสิ้น' : 'กำลังสอบ',
      `"${att.startedAt}"`,
      `"${att.completedAt || '-'}"`
    ]);

    // Prepend UTF-8 BOM \uFEFF for proper Thai encoding in Microsoft Excel
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const nowStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `ผลคะแนนกรีฑาประเภทลู่_ร.ร.ท่ายางวิทยา_${nowStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to Google Sheets via Google Workspace Sheets API
  const handleExportGoogleSheets = async () => {
    setIsExportingSheets(true);
    setExportMessage('กำลังเตรียมสร้าง Google Sheet...');
    setSheetUrl(null);

    try {
      // 1. Check or acquire Google OAuth access token
      let token = getCachedAccessToken();
      if (!token) {
        setExportMessage('โปรดยืนยันสิทธิ์ Google Workspace ในหน้าต่างถัดไป...');
        const authResult = await signInWithGoogle();
        token = authResult?.accessToken || getCachedAccessToken();
      }

      if (!token) {
        throw new Error('ไม่พบ Access Token สำหรับเชื่อมต่อ Google Sheets กรุณาเข้าสู่ระบบด้วย Google');
      }

      setExportMessage('กำลังสร้างไฟล์สเปรดชีตบน Google Drive...');

      // 2. Create new spreadsheet via Google Sheets REST API
      const nowStr = new Date().toLocaleDateString('th-TH');
      const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: {
            title: `ผลคะแนนสอบกรีฑาประเภทลู่ โรงเรียนท่ายางวิทยา (${nowStr})`
          }
        })
      });

      if (!createResponse.ok) {
        const errData = await createResponse.json();
        throw new Error(errData?.error?.message || 'ไม่สามารถสร้าง Google Sheet ได้');
      }

      const createdSheet = await createResponse.json();
      const spreadsheetId = createdSheet.spreadsheetId;
      const sheetLink = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

      setExportMessage('กำลังบันทึกรายชื่อและคะแนนนักเรียนลงใน Google Sheet...');

      // 3. Populate rows
      const headerRow = [
        'ลำดับ',
        'ชื่อ',
        'นามสกุล',
        'ชั้น',
        'เลขที่',
        'คะแนน (เต็ม 20)',
        'ร้อยละ',
        'ตอบถูก',
        'ตอบผิด',
        'ไม่ได้ตอบ',
        'สถานะ',
        'วันเวลาที่ส่ง'
      ];

      const dataRows = filteredAttempts.map((att, idx) => [
        idx + 1,
        att.firstName,
        att.lastName,
        att.studentClass,
        att.studentNo,
        att.score,
        `${att.percentage}%`,
        att.correctCount,
        att.wrongCount,
        att.unansweredCount,
        att.status === 'completed' ? 'สอบเสร็จสิ้น' : 'กำลังทำ',
        att.completedAt ? new Date(att.completedAt).toLocaleString('th-TH') : '-'
      ]);

      const valueRange = {
        values: [headerRow, ...dataRows]
      };

      const appendResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(valueRange)
        }
      );

      if (!appendResponse.ok) {
        throw new Error('บันทึกข้อมูลลงชีตไม่สำเร็จ');
      }

      setSheetUrl(sheetLink);
      setExportMessage('ส่งออกไปยัง Google Sheets สำเร็จเรียบร้อยแล้ว!');
    } catch (err: any) {
      console.error('Google Sheets export error:', err);
      setExportMessage(`เกิดข้อผิดพลาด: ${err?.message || 'ไม่สามารถส่งออกได้'}`);
    } finally {
      setIsExportingSheets(false);
    }
  };

  // If not authenticated, show login card
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-slate-900">
              เข้าสู่ระบบสำหรับครูผู้สอน
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              กลุ่มสาระการเรียนรู้สุขศึกษาและพลศึกษา โรงเรียนท่ายางวิทยา
            </p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {loginError}
            </div>
          )}

          {/* Google Sign-in Option */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoggingIn}
            className="w-full py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm flex items-center justify-center space-x-2 shadow-xs transition mb-4 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>เข้าสู่ระบบด้วย Google Workspace</span>
          </button>

          <div className="relative flex py-2 items-center mb-4">
            <div className="grow border-t border-slate-200"></div>
            <span className="shrink mx-3 text-slate-400 text-xs">หรือใช้รหัสผ่านครู</span>
            <div className="grow border-t border-slate-200"></div>
          </div>

          {/* Password Form */}
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                รหัสผ่านสำหรับครูผู้สอน (Master PIN)
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                placeholder="กรอกรหัสผ่านครู"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                required
              />
              <p className="text-[11px] text-slate-400 mt-1">
                รหัสเริ่มต้นสำหรับทดสอบระบบ: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">THW-TRACK-2026</code>
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow transition cursor-pointer"
            >
              {isLoggingIn ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบแดชบอร์ด'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <button
              onClick={onBackToStudentView}
              className="text-xs text-blue-600 hover:underline cursor-pointer"
            >
              ← กลับไปยังหน้าแบบทดสอบนักเรียน
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Teacher Dashboard View
  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              แดชบอร์ดครูผู้สอน
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
              วิชาพลศึกษา
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ผู้ดูแลระบบ: <strong>{teacherName}</strong> • โรงเรียนท่ายางวิทยา
          </p>
        </div>

        {/* Quick Top Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowQuestionsModal(true)}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 shadow-xs flex items-center space-x-1.5 transition cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span>ตรวจทานข้อสอบ 20 ข้อและเฉลย</span>
          </button>

          <button
            onClick={() => setShowGuideModal(true)}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 shadow-xs flex items-center space-x-1.5 transition cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-amber-600" />
            <span>คู่มือสำหรับครู</span>
          </button>

          <button
            onClick={handleLogout}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-600 text-xs font-semibold border border-slate-200 transition flex items-center space-x-1.5 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </div>

      {/* Summary Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>ผู้เข้าสอบทั้งหมด</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {attempts.length} <span className="text-sm font-normal text-slate-500">คน</span>
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 flex items-center">
            <CheckCircle className="w-3 h-3 mr-1" />
            <span>เสร็จสิ้น {completedAttempts.length} คน</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>คะแนนเฉลี่ย</span>
            <Award className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {avgScore} <span className="text-sm font-normal text-slate-500">/ 20</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            คิดเป็น {completedAttempts.length ? Math.round((Number(avgScore) / 20) * 100) : 0}%
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>คะแนนสูงสุด</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {highestScore} <span className="text-sm font-normal text-slate-500">/ 20</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            จากผู้ที่สอบเสร็จสิ้นทั้งหมด
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>อัตราการผ่านเกณฑ์</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700">
            {passRate}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            เกณฑ์ผ่าน: ได้ 10 คะแนนขึ้นไป
          </div>
        </div>
      </div>

      {/* Google Sheets Export Result Banner */}
      {exportMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-sm text-blue-900">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{exportMessage}</span>
          </div>
          {sheetUrl && (
            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition shrink-0"
            >
              <span>เปิดดู Google Sheet ในแท็บใหม่</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Controls Toolbar: Search, Filters, Export Buttons */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50">
          {/* Search & Filter by Class */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="ค้นหาชื่อ หรือ นามสกุล..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Class filter */}
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white text-slate-700"
            >
              <option value="all">ทุกระดับชั้น ({attempts.length})</option>
              {uniqueClasses.map(c => (
                <option key={c} value={c}>
                  ชั้น {c}
                </option>
              ))}
            </select>

            {/* Refresh Button */}
            <button
              onClick={() => teacherToken && fetchAttempts(teacherToken)}
              disabled={isLoading}
              title="รีเฟรชข้อมูลล่าสุด"
              className="p-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 transition"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Export Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Export to Google Sheets */}
            <button
              onClick={handleExportGoogleSheets}
              disabled={isExportingSheets || !filteredAttempts.length}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{isExportingSheets ? 'กำลังส่งออก...' : 'ส่งออกไปยัง Google Sheets'}</span>
            </button>

            {/* Export to Excel CSV */}
            <button
              onClick={handleExportCSV}
              disabled={!filteredAttempts.length}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>ส่งออกไฟล์ Excel (CSV ภาษาไทย)</span>
            </button>
          </div>
        </div>

        {/* Results Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-700">
            <thead className="bg-slate-100/75 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">ลำดับ</th>
                <th className="py-3.5 px-4">ชื่อ - นามสกุล</th>
                <th className="py-3.5 px-4">ชั้น</th>
                <th className="py-3.5 px-4">เลขที่</th>
                <th className="py-3.5 px-4 text-center">คะแนน</th>
                <th className="py-3.5 px-4 text-center">ร้อยละ</th>
                <th className="py-3.5 px-4 text-center">สถานะ</th>
                <th className="py-3.5 px-4">เวลาที่ส่ง</th>
                <th className="py-3.5 px-4 text-center">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAttempts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    {isLoading ? 'กำลังโหลดข้อมูล...' : 'ยังไม่มีข้อมูลผลสอบตามเงื่อนไขที่เลือก'}
                  </td>
                </tr>
              ) : (
                filteredAttempts.map((att, idx) => {
                  const isPass = att.score >= 10;
                  const isResetConfirming = resettingAttemptId === att.attemptId;

                  return (
                    <tr key={att.attemptId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-500">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {att.firstName} {att.lastName}
                      </td>
                      <td className="py-3 px-4 font-medium">{att.studentClass}</td>
                      <td className="py-3 px-4 font-medium">{att.studentNo}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-extrabold text-base text-slate-900">
                          {att.score}
                        </span>
                        <span className="text-slate-400 text-xs">/20</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded font-bold text-xs ${
                          isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {att.percentage}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {att.status === 'completed' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                            สอบเสร็จสิ้น
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">
                            กำลังทำข้อสอบ (ข้อ {att.currentQuestionIndex ? att.currentQuestionIndex + 1 : 1})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {att.completedAt ? new Date(att.completedAt).toLocaleString('th-TH') : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isResetConfirming ? (
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => handleConfirmReset(att.attemptId)}
                              className="px-2 py-1 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-700"
                            >
                              ยืนยันรีเซ็ต
                            </button>
                            <button
                              onClick={() => setResettingAttemptId(null)}
                              className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-xs hover:bg-slate-300"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setResettingAttemptId(att.attemptId)}
                            title="รีเซ็ตสิทธิ์การสอบให้นักเรียนคนนี้เริ่มทำใหม่"
                            className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-slate-200 transition"
                          >
                            รีเซ็ตสิทธิ์
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Stats */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <span>แสดง {filteredAttempts.length} จากทั้งหมด {attempts.length} คน</span>
          <span>ข้อมูลซิงค์ตรงกับฐานข้อมูลส่วนกลาง</span>
        </div>
      </div>

      {/* Guide and Questions Modals */}
      <TeacherGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />
      <QuestionsReviewModal
        isOpen={showQuestionsModal}
        onClose={() => setShowQuestionsModal(false)}
      />
    </div>
  );
};
