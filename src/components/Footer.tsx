import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <p className="font-semibold text-slate-800">
          แบบทดสอบออนไลน์ วิชาพลศึกษา เรื่อง “กรีฑาประเภทลู่” (ระดับมัธยมศึกษาตอนต้น)
        </p>
        <p className="mt-1 text-slate-500">
          พัฒนาโดย <span className="font-bold text-slate-700">นางสาวกุลรัศมิ์ ทองคำเภา</span> กลุ่มสาระการเรียนรู้สุขศึกษาและพลศึกษา โรงเรียนท่ายางวิทยา
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          ตามมาตรฐาน World Athletics และหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พุทธศักราช 2551
        </p>
      </div>
    </footer>
  );
};
