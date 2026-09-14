/**
 * Data structures for Track Athletics Online Quiz
 * พลศึกษา เรื่อง กรีฑาประเภทลู่ (มัธยมศึกษาตอนต้น)
 * โรงเรียนท่ายางวิทยา
 */

export type ChoiceKey = 'ก' | 'ข' | 'ค' | 'ง';

export interface QuizOption {
  key: ChoiceKey;
  text: string;
}

export interface QuizQuestionPublic {
  id: number;
  questionNumber: number;
  category: string;
  question: string;
  options: QuizOption[];
  timeLimitSeconds: number;
}

export interface QuizQuestionFull extends QuizQuestionPublic {
  correctAnswer: ChoiceKey;
  explanation: string;
}

export interface StudentRegistrationInput {
  firstName: string;
  lastName: string;
  studentClass: string;
  studentNo: string;
  agreeRules: boolean;
}

export interface StudentInfo {
  studentKey: string;
  firstName: string;
  lastName: string;
  studentClass: string;
  studentNo: number;
}

export interface ActiveQuestionPayload {
  question: QuizQuestionPublic;
  currentQuestionIndex: number;
  totalQuestions: number;
  remainingSeconds: number;
  serverDeadlineMs: number;
  selectedDraftChoice: ChoiceKey | null;
  studentInfo: StudentInfo;
}

export interface QuizResultData {
  attemptId: string;
  studentKey: string;
  firstName: string;
  lastName: string;
  studentClass: string;
  studentNo: number;
  score: number;
  totalQuestions: number;
  percentage: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  startedAt: string;
  completedAt: string;
  status: 'completed' | 'expired';
}

export interface TeacherStudentRow {
  attemptId: string;
  studentKey: string;
  firstName: string;
  lastName: string;
  studentClass: string;
  studentNo: number;
  score: number;
  totalQuestions: number;
  percentage: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  status: 'completed' | 'in_progress' | 'expired';
  startedAt: string;
  completedAt?: string;
  currentQuestionIndex?: number;
}

export interface DatabaseStatus {
  connected: boolean;
  firestoreConfigured: boolean;
  activeStorage: 'firestore' | 'server_memory';
  message: string;
  firestoreConsoleUrl?: string;
}
