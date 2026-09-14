import React from 'react';
import { X, BookOpen, ShieldAlert, FileSpreadsheet, Download, Info, CheckCircle2 } from 'lucide-react';

interface TeacherGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TeacherGuideModal: React.FC<TeacherGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-3xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                คู่มือการใช้งานและคำแนะนำสำหรับครูผู้สอน
              </h3>
              <p className="text-xs text-slate-500">
                วิชาพลศึกษา เรื่อง กรีฑาประเภทลู่ • โรงเรียนท่ายางวิทยา
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700 leading-relaxed">
          {/* Important Limitation Notice (Mandated in Requirement 3) */}
          <div className="bg-amber-50 border-2 border-amber-300/80 rounded-2xl p-5">
            <div className="flex items-start space-x-3">
              <ShieldAlert className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-900 text-base mb-1">
                  ข้อจำกัดของระบบป้องกันการทำซ้ำและการยืนยันตัวตน
                </h4>
                <p className="text-amber-800 text-sm">
                  ระบบนี้ใช้การ <strong>ตรวจชื่อและนามสกุลที่จัดรูปแบบมาตรฐาน (Normalized Name Key)</strong> ร่วมกับ <strong>ฐานข้อมูลกลางแบบ Atomic Transaction</strong> เพื่อป้องกันไม่ให้นักเรียนคนเดิมทำซ้ำ และป้องกันการรีเฟรชหรือสลับอุปกรณ์
                </p>
                <div className="mt-3 p-3 bg-white/80 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1.5">
                  <p className="font-semibold">ข้อจำกัดที่ครูควรทราบ:</p>
                  <p>
                    1. การตรวจชื่อช่วยป้องกันการใช้ชื่อเดิมซ้ำได้อย่างมีประสิทธิภาพ แต่<strong>ไม่สามารถยืนยันตัวบุคคลที่อยู่หลังแป้นพิมพ์ หรือป้องกันการกรอกชื่อและนามสกุลปลอม</strong>ได้ทั้งหมด
                  </p>
                  <p>
                    2. <strong>แนวทางเพิ่มความเข้มงวดในอนาคต:</strong> หากต้องการความรัดกุมสูงสุดในการสอบเก็บคะแนนปลายภาค เสนอให้เพิ่มระบบ <em>"ผูกกับรายชื่อนักเรียนและรหัสผ่านรายบุคคล (Student PIN / Token)"</em> โดยยังคงช่องกรอกข้อมูลทั้ง 4 ช่อง (ชื่อ, นามสกุล, ชั้น, เลขที่) ควบคู่กับรหัสผ่านเฉพาะตัว
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Export to Google Sheets and Excel Guide */}
          <div>
            <h4 className="font-bold text-slate-900 text-base mb-2 flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span>การส่งออกคะแนนไปยัง Google Sheets และ Excel</span>
            </h4>
            <div className="space-y-2 text-slate-600 pl-7">
              <p>
                • <strong>ส่งออก Google Sheets:</strong> คลิกปุ่ม <em>"ส่งออกไปยัง Google Sheets"</em> ระบบจะใช้สิทธิ์ Google Workspace สร้างชีตใหม่ใน Google Drive ของครูโดยตรง พร้อมลิงก์เปิดดูทันที
              </p>
              <p>
                • <strong>ส่งออกไฟล์ Excel (CSV ภาษาไทย):</strong> ระบบแทรก <em>UTF-8 BOM (\uFEFF)</em> ทำให้เปิดไฟล์บน Microsoft Excel ได้ทันทีโดยที่ตัวอักษรภาษาไทยไม่เป็นภาษาต่างดาว
              </p>
            </div>
          </div>

          {/* Time System & Anti-cheat */}
          <div>
            <h4 className="font-bold text-slate-900 text-base mb-2 flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              <span>ระบบเวลาและการป้องกันการโกง</span>
            </h4>
            <ul className="list-disc pl-11 space-y-1.5 text-slate-600">
              <li>เวลานับถอยหลัง 30 วินาทีต่อข้อ ถูกควบคุมโดยเวลาจริงของเซิร์ฟเวอร์ (Server-Authoritative Deadline)</li>
              <li>การรีเฟรชหน้าจอ การกด F5 หรือการปิดเบราว์เซอร์จะไม่ทำให้เวลารีเซ็ต</li>
              <li>หากนักเรียนปิดหน้าเว็บไปนานเกินเวลาข้อนั้น ระบบจะล็อกคำตอบร่างล่าสุดและข้ามข้อให้อัตโนมัติ</li>
              <li>ระบบจะบันทึกตัวเลือกที่คลิก (Auto-Save) ไปยังเซิร์ฟเวอร์แบบเรียลไทม์</li>
            </ul>
          </div>

          {/* Reset Attempt Feature */}
          <div>
            <h4 className="font-bold text-slate-900 text-base mb-2 flex items-center space-x-2">
              <Info className="w-5 h-5 text-orange-600" />
              <span>การรีเซ็ตสิทธิ์การสอบให้นักเรียน</span>
            </h4>
            <p className="text-slate-600 pl-7">
              หากนักเรียนพบปัญหาทางเทคนิคระหว่างสอบ (เช่น สัญญาณอินเทอร์เน็ตขาดหาย ไฟฟ้าดับ) ครูผู้สอนสามารถกดปุ่ม <strong>"รีเซ็ตสิทธิ์"</strong> ในตารางผลสอบเพื่อให้นักเรียนคนดังกล่าวเริ่มทำแบบทดสอบใหม่ได้
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50 rounded-b-3xl">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition"
          >
            เข้าใจแล้ว ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
