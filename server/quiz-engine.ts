import fs from 'fs';
import path from 'path';
import { TRACK_ATHLETICS_QUESTIONS } from '../src/data/questions.ts';
import type { ChoiceKey, QuizResultData, TeacherStudentRow } from '../src/types.ts';

export interface InternalAttempt {
  attemptId: string;
  sessionToken: string;
  studentKey: string;
  firstName: string;
  lastName: string;
  studentClass: string;
  studentNo: number;
  status: 'in_progress' | 'completed' | 'expired';
  currentQuestionIndex: number;
  questionStartTimeMs: number;
  questionDeadlineMs: number;
  draftAnswers: Record<number, ChoiceKey | null>;
  confirmedAnswers: Record<number, ChoiceKey | null>;
  score: number;
  percentage: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  startedAt: string;
  completedAt?: string;
}

const QUESTION_DURATION_MS = 30000; // 30 seconds
const GRACE_PERIOD_MS = 1500; // 1.5s tolerance for network lag
const BACKUP_FILE = path.resolve(process.cwd(), '.quiz_data_store.json');

// In-memory registry of attempts and normalized student keys
const attemptsMap = new Map<string, InternalAttempt>();
const studentKeyToAttemptId = new Map<string, string>();
const reservationMutex = new Set<string>();

/**
 * Common Thai titles to strip when normalizing student names
 */
const THAI_TITLES = [
  'เด็กชาย', 'เด็กหญิง',
  'ด.ช.', 'ด.ญ.', 'ด.ช', 'ด.ญ', 'ดช.', 'ดญ.', 'ดช', 'ดญ',
  'นาย', 'นางสาว', 'นาง',
  'น.ส.', 'น.ส', 'นส.', 'นส'
];

/**
 * Normalizes student first and last name:
 * - NFC Unicode normalization
 * - Strips common Thai titles
 * - Trims and collapses whitespace
 * - Generates consistent key
 */
export function normalizeStudentName(firstName: string, lastName: string): {
  normalizedFirst: string;
  normalizedLast: string;
  studentKey: string;
} {
  let cleanFirst = (firstName || '').normalize('NFC').trim();
  let cleanLast = (lastName || '').normalize('NFC').trim();

  // Strip common Thai titles from first name
  for (const title of THAI_TITLES) {
    if (cleanFirst.startsWith(title)) {
      cleanFirst = cleanFirst.slice(title.length).trim();
      break;
    }
  }

  // Collapse inner spaces
  cleanFirst = cleanFirst.replace(/\s+/g, '');
  cleanLast = cleanLast.replace(/\s+/g, '');

  const studentKey = `track_quiz_2026_${cleanFirst.toLowerCase()}_${cleanLast.toLowerCase()}`;

  return {
    normalizedFirst: cleanFirst,
    normalizedLast: cleanLast,
    studentKey
  };
}

/**
 * Load persisted data on server boot
 */
function loadDataFromDisk() {
  try {
    if (fs.existsSync(BACKUP_FILE)) {
      const raw = fs.readFileSync(BACKUP_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.attempts)) {
        for (const att of data.attempts) {
          attemptsMap.set(att.attemptId, att);
          studentKeyToAttemptId.set(att.studentKey, att.attemptId);
        }
        console.log(`[QuizEngine] Loaded ${attemptsMap.size} attempts from disk.`);
      }
    }
  } catch (err) {
    console.error('[QuizEngine] Error loading backup data:', err);
  }
}

/**
 * Persist attempts to disk asynchronously
 */
function saveDataToDisk() {
  try {
    const attempts = Array.from(attemptsMap.values());
    fs.writeFileSync(BACKUP_FILE, JSON.stringify({ attempts }, null, 2), 'utf-8');
  } catch (err) {
    console.error('[QuizEngine] Error saving backup data:', err);
  }
}

// Initialize from disk
loadDataFromDisk();

/**
 * Check if a student has already completed or is currently taking the quiz
 */
export function checkStudentEligibility(firstName: string, lastName: string, sessionToken?: string): {
  eligible: boolean;
  reason?: string;
  existingAttemptId?: string;
  status?: 'completed' | 'in_progress';
} {
  const { studentKey } = normalizeStudentName(firstName, lastName);
  const existingAttemptId = studentKeyToAttemptId.get(studentKey);

  if (!existingAttemptId) {
    return { eligible: true };
  }

  const existing = attemptsMap.get(existingAttemptId);
  if (!existing) {
    return { eligible: true };
  }

  if (existing.status === 'completed' || existing.status === 'expired') {
    return {
      eligible: false,
      reason: 'ชื่อและนามสกุลนี้ใช้สิทธิ์ทำแบบทดสอบแล้ว',
      existingAttemptId,
      status: 'completed'
    };
  }

  // In progress
  if (sessionToken && existing.sessionToken === sessionToken) {
    return {
      eligible: true,
      existingAttemptId,
      status: 'in_progress'
    };
  }

  return {
    eligible: false,
    reason: 'ชื่อและนามสกุลนี้กำลังอยู่ระหว่างทำแบบทดสอบในเบราว์เซอร์อื่น หากเกิดปัญหาโปรดติดต่อคุณครู',
    existingAttemptId,
    status: 'in_progress'
  };
}

/**
 * Start a new quiz attempt or resume existing one (Atomic Lock)
 */
export async function startQuizAttempt(params: {
  firstName: string;
  lastName: string;
  studentClass: string;
  studentNo: number;
  sessionToken?: string;
}): Promise<{
  success: boolean;
  message?: string;
  attempt?: InternalAttempt;
  resumed?: boolean;
}> {
  const { firstName, lastName, studentClass, studentNo, sessionToken } = params;
  const { normalizedFirst, normalizedLast, studentKey } = normalizeStudentName(firstName, lastName);

  if (!normalizedFirst || !normalizedLast) {
    return { success: false, message: 'กรุณากรอกชื่อและนามสกุลให้ครบถ้วน' };
  }
  if (!studentClass || !studentClass.trim()) {
    return { success: false, message: 'กรุณาระบุชั้นเรียน เช่น ม.2/1' };
  }
  if (!studentNo || isNaN(studentNo) || studentNo <= 0) {
    return { success: false, message: 'กรุณากรอกเลขที่ให้ถูกต้อง (จำนวนเต็มบวก)' };
  }

  // Mutex lock per studentKey
  if (reservationMutex.has(studentKey)) {
    return { success: false, message: 'ระบบกำลังดำเนินการตรวจสอบสิทธิ์ โปรดรอสักครู่' };
  }
  reservationMutex.add(studentKey);

  try {
    const existingAttemptId = studentKeyToAttemptId.get(studentKey);
    if (existingAttemptId) {
      const existing = attemptsMap.get(existingAttemptId);
      if (existing) {
        if (existing.status === 'completed' || existing.status === 'expired') {
          return {
            success: false,
            message: 'ชื่อและนามสกุลนี้ใช้สิทธิ์ทำแบบทดสอบแล้ว'
          };
        }

        // Resume attempt
        if (sessionToken && existing.sessionToken === sessionToken) {
          syncAttemptTime(existing);
          saveDataToDisk();
          return {
            success: true,
            attempt: existing,
            resumed: true
          };
        } else {
          return {
            success: false,
            message: 'ชื่อและนามสกุลนี้กำลังอยู่ระหว่างทำแบบทดสอบในอุปกรณ์อื่นหรือแท็บอื่น'
          };
        }
      }
    }

    // Create new attempt
    const newAttemptId = 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    const newSessionToken = 'tok_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const now = Date.now();

    const attempt: InternalAttempt = {
      attemptId: newAttemptId,
      sessionToken: newSessionToken,
      studentKey,
      firstName: normalizedFirst,
      lastName: normalizedLast,
      studentClass: studentClass.trim(),
      studentNo: Number(studentNo),
      status: 'in_progress',
      currentQuestionIndex: 0,
      questionStartTimeMs: now,
      questionDeadlineMs: now + QUESTION_DURATION_MS,
      draftAnswers: {},
      confirmedAnswers: {},
      score: 0,
      percentage: 0,
      correctCount: 0,
      wrongCount: 0,
      unansweredCount: 0,
      startedAt: new Date(now).toISOString()
    };

    attemptsMap.set(newAttemptId, attempt);
    studentKeyToAttemptId.set(studentKey, newAttemptId);
    saveDataToDisk();

    return {
      success: true,
      attempt,
      resumed: false
    };
  } finally {
    reservationMutex.delete(studentKey);
  }
}

/**
 * Synchronize server-authoritative time for an attempt
 * If the user has been away or deadline passed, advances question index automatically
 */
export function syncAttemptTime(attempt: InternalAttempt): void {
  if (attempt.status !== 'in_progress') return;

  const now = Date.now();
  let currentIndex = attempt.currentQuestionIndex;

  while (currentIndex < TRACK_ATHLETICS_QUESTIONS.length && now > attempt.questionDeadlineMs) {
    // Current question expired!
    // Lock draft answer if present
    if (attempt.confirmedAnswers[currentIndex] === undefined) {
      attempt.confirmedAnswers[currentIndex] = attempt.draftAnswers[currentIndex] || null;
    }

    currentIndex++;
    if (currentIndex < TRACK_ATHLETICS_QUESTIONS.length) {
      attempt.currentQuestionIndex = currentIndex;
      attempt.questionStartTimeMs = attempt.questionDeadlineMs;
      attempt.questionDeadlineMs = attempt.questionStartTimeMs + QUESTION_DURATION_MS;
    }
  }

  if (currentIndex >= TRACK_ATHLETICS_QUESTIONS.length) {
    finalizeQuiz(attempt);
  } else {
    // If deadline is still behind now (e.g. disconnected for multiple minutes)
    if (now > attempt.questionDeadlineMs) {
      attempt.questionStartTimeMs = now;
      attempt.questionDeadlineMs = now + QUESTION_DURATION_MS;
    }
  }
}

/**
 * Save draft choice for the active question
 */
export function saveDraftAnswer(attemptId: string, sessionToken: string, choice: ChoiceKey): {
  success: boolean;
  message?: string;
  currentQuestionIndex?: number;
} {
  const attempt = attemptsMap.get(attemptId);
  if (!attempt || attempt.sessionToken !== sessionToken) {
    return { success: false, message: 'เซสชันไม่ถูกต้อง' };
  }

  syncAttemptTime(attempt);
  if (attempt.status !== 'in_progress') {
    return { success: false, message: 'แบบทดสอบสิ้นสุดแล้ว' };
  }

  const now = Date.now();
  if (now > attempt.questionDeadlineMs + GRACE_PERIOD_MS) {
    return { success: false, message: 'หมดเวลาสำหรับข้อนี้แล้ว' };
  }

  attempt.draftAnswers[attempt.currentQuestionIndex] = choice;
  saveDataToDisk();

  return {
    success: true,
    currentQuestionIndex: attempt.currentQuestionIndex
  };
}

/**
 * Confirm and advance to next question
 */
export function confirmAnswerAndAdvance(attemptId: string, sessionToken: string, choice: ChoiceKey): {
  success: boolean;
  message?: string;
  isComplete: boolean;
  nextQuestionIndex?: number;
  remainingSeconds?: number;
  serverDeadlineMs?: number;
} {
  const attempt = attemptsMap.get(attemptId);
  if (!attempt || attempt.sessionToken !== sessionToken) {
    return { success: false, message: 'เซสชันไม่ถูกต้อง', isComplete: false };
  }

  syncAttemptTime(attempt);
  if (attempt.status !== 'in_progress') {
    return { success: true, isComplete: true };
  }

  const currentIndex = attempt.currentQuestionIndex;
  const now = Date.now();

  // Validate deadline with grace period
  if (now > attempt.questionDeadlineMs + GRACE_PERIOD_MS) {
    // Deadline passed, auto lock draft
    attempt.confirmedAnswers[currentIndex] = attempt.draftAnswers[currentIndex] || null;
  } else {
    // Valid confirmation
    attempt.confirmedAnswers[currentIndex] = choice;
    attempt.draftAnswers[currentIndex] = choice;
  }

  const nextIndex = currentIndex + 1;
  if (nextIndex >= TRACK_ATHLETICS_QUESTIONS.length) {
    finalizeQuiz(attempt);
    saveDataToDisk();
    return { success: true, isComplete: true };
  } else {
    attempt.currentQuestionIndex = nextIndex;
    attempt.questionStartTimeMs = now;
    attempt.questionDeadlineMs = now + QUESTION_DURATION_MS;
    saveDataToDisk();

    return {
      success: true,
      isComplete: false,
      nextQuestionIndex: nextIndex,
      remainingSeconds: Math.ceil((attempt.questionDeadlineMs - now) / 1000),
      serverDeadlineMs: attempt.questionDeadlineMs
    };
  }
}

/**
 * Finalize quiz and compute score on backend
 */
export function finalizeQuiz(attempt: InternalAttempt): QuizResultData {
  let correct = 0;
  let wrong = 0;
  let unanswered = 0;

  for (let i = 0; i < TRACK_ATHLETICS_QUESTIONS.length; i++) {
    const q = TRACK_ATHLETICS_QUESTIONS[i];
    const studentAns = attempt.confirmedAnswers[i] ?? attempt.draftAnswers[i] ?? null;

    if (!studentAns) {
      unanswered++;
    } else if (studentAns === q.correctAnswer) {
      correct++;
    } else {
      wrong++;
    }
  }

  const total = TRACK_ATHLETICS_QUESTIONS.length;
  attempt.score = correct;
  attempt.percentage = Math.round((correct / total) * 100);
  attempt.correctCount = correct;
  attempt.wrongCount = wrong;
  attempt.unansweredCount = unanswered;
  attempt.status = 'completed';
  attempt.completedAt = new Date().toISOString();

  saveDataToDisk();

  return {
    attemptId: attempt.attemptId,
    studentKey: attempt.studentKey,
    firstName: attempt.firstName,
    lastName: attempt.lastName,
    studentClass: attempt.studentClass,
    studentNo: attempt.studentNo,
    score: attempt.score,
    totalQuestions: total,
    percentage: attempt.percentage,
    correctCount: attempt.correctCount,
    wrongCount: attempt.wrongCount,
    unansweredCount: attempt.unansweredCount,
    startedAt: attempt.startedAt,
    completedAt: attempt.completedAt,
    status: 'completed'
  };
}

/**
 * Get public status of an attempt
 */
export function getAttemptStatus(attemptId: string, sessionToken?: string): {
  success: boolean;
  message?: string;
  attempt?: InternalAttempt;
} {
  const attempt = attemptsMap.get(attemptId);
  if (!attempt) {
    return { success: false, message: 'ไม่พบข้อมูลการสอบ' };
  }

  if (sessionToken && attempt.sessionToken !== sessionToken) {
    return { success: false, message: 'เซสชันไม่ถูกต้อง' };
  }

  syncAttemptTime(attempt);
  saveDataToDisk();

  return { success: true, attempt };
}

/**
 * Get all attempts for Teacher Dashboard
 */
export function getAllTeacherRows(): TeacherStudentRow[] {
  return Array.from(attemptsMap.values()).map(att => {
    // If in progress, sync first
    syncAttemptTime(att);
    return {
      attemptId: att.attemptId,
      studentKey: att.studentKey,
      firstName: att.firstName,
      lastName: att.lastName,
      studentClass: att.studentClass,
      studentNo: att.studentNo,
      score: att.score,
      totalQuestions: TRACK_ATHLETICS_QUESTIONS.length,
      percentage: att.percentage,
      correctCount: att.correctCount,
      wrongCount: att.wrongCount,
      unansweredCount: att.unansweredCount,
      status: att.status,
      startedAt: att.startedAt,
      completedAt: att.completedAt,
      currentQuestionIndex: att.currentQuestionIndex
    };
  }).sort((a, b) => {
    // Sort by class, then student number
    if (a.studentClass !== b.studentClass) {
      return a.studentClass.localeCompare(b.studentClass, 'th');
    }
    return a.studentNo - b.studentNo;
  });
}

/**
 * Reset student attempt (Teacher feature)
 */
export function resetStudentAttempt(attemptId: string): boolean {
  const attempt = attemptsMap.get(attemptId);
  if (!attempt) return false;

  studentKeyToAttemptId.delete(attempt.studentKey);
  attemptsMap.delete(attemptId);
  saveDataToDisk();
  return true;
}
