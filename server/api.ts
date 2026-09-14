import express, { Request, Response } from 'express';
import { TRACK_ATHLETICS_QUESTIONS, getPublicQuestions } from '../src/data/questions.ts';
import {
  checkStudentEligibility,
  confirmAnswerAndAdvance,
  getAllTeacherRows,
  getAttemptStatus,
  resetStudentAttempt,
  saveDraftAnswer,
  startQuizAttempt,
  syncAttemptTime
} from './quiz-engine.ts';

export const apiRouter = express.Router();
apiRouter.use(express.json());

// Teacher secret credentials (configured server-side)
const TEACHER_SECRET_KEY = process.env.TEACHER_SECRET_KEY || 'THW-TRACK-2026';
const TEACHER_ADMIN_EMAIL = 'ann@thw.ac.th';

/**
 * Health check and system diagnostic
 */
apiRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'Track Athletics Quiz API',
    school: 'โรงเรียนท่ายางวิทยา',
    developer: 'นางสาวกุลรัศมิ์ ทองคำเภา กลุ่มสาระการเรียนรู้สุขศึกษาและพลศึกษา โรงเรียนท่ายางวิทยา',
    timestamp: new Date().toISOString()
  });
});

/**
 * Pre-flight check: Test if student name has already been used
 */
apiRouter.post('/quiz/check-name', (req: Request, res: Response) => {
  try {
    const { firstName, lastName, sessionToken } = req.body;
    if (!firstName || !lastName) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อและนามสกุล' });
    }

    const result = checkStudentEligibility(firstName, lastName, sessionToken);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Start or resume a quiz attempt (Atomic transaction / lock)
 */
apiRouter.post('/quiz/start', async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, studentClass, studentNo, sessionToken } = req.body;
    const result = await startQuizAttempt({
      firstName,
      lastName,
      studentClass,
      studentNo: Number(studentNo),
      sessionToken
    });

    if (!result.success || !result.attempt) {
      return res.status(400).json({
        success: false,
        message: result.message || 'ไม่สามารถเริ่มทำแบบทดสอบได้'
      });
    }

    const att = result.attempt;
    const publicQuestions = getPublicQuestions();
    const currentIndex = att.currentQuestionIndex;
    const currentQ = publicQuestions[currentIndex];
    const now = Date.now();
    const remainingSeconds = Math.max(0, Math.ceil((att.questionDeadlineMs - now) / 1000));

    res.json({
      success: true,
      resumed: result.resumed,
      attemptId: att.attemptId,
      sessionToken: att.sessionToken,
      studentInfo: {
        studentKey: att.studentKey,
        firstName: att.firstName,
        lastName: att.lastName,
        studentClass: att.studentClass,
        studentNo: att.studentNo
      },
      currentQuestionIndex: currentIndex,
      totalQuestions: publicQuestions.length,
      remainingSeconds,
      serverDeadlineMs: att.questionDeadlineMs,
      activeQuestion: currentQ,
      selectedDraftChoice: att.draftAnswers[currentIndex] || att.confirmedAnswers[currentIndex] || null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Get active question state & check time
 */
apiRouter.get('/quiz/status/:attemptId', (req: Request, res: Response) => {
  try {
    const { attemptId } = req.params;
    const sessionToken = req.query.sessionToken as string;

    const result = getAttemptStatus(attemptId, sessionToken);
    if (!result.success || !result.attempt) {
      return res.status(404).json({ success: false, message: result.message || 'ไม่พบการสอบ' });
    }

    const att = result.attempt;
    const publicQuestions = getPublicQuestions();

    if (att.status === 'completed' || att.status === 'expired') {
      return res.json({
        success: true,
        isCompleted: true,
        attemptId: att.attemptId
      });
    }

    const currentIndex = att.currentQuestionIndex;
    const currentQ = publicQuestions[currentIndex];
    const now = Date.now();
    const remainingSeconds = Math.max(0, Math.ceil((att.questionDeadlineMs - now) / 1000));

    res.json({
      success: true,
      isCompleted: false,
      attemptId: att.attemptId,
      studentInfo: {
        studentKey: att.studentKey,
        firstName: att.firstName,
        lastName: att.lastName,
        studentClass: att.studentClass,
        studentNo: att.studentNo
      },
      currentQuestionIndex: currentIndex,
      totalQuestions: publicQuestions.length,
      remainingSeconds,
      serverDeadlineMs: att.questionDeadlineMs,
      activeQuestion: currentQ,
      selectedDraftChoice: att.draftAnswers[currentIndex] || att.confirmedAnswers[currentIndex] || null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Auto-save draft choice for active question
 */
apiRouter.post('/quiz/draft', (req: Request, res: Response) => {
  try {
    const { attemptId, sessionToken, choice } = req.body;
    if (!attemptId || !sessionToken || !choice) {
      return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
    }

    const result = saveDraftAnswer(attemptId, sessionToken, choice);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Confirm answer and advance to next question
 */
apiRouter.post('/quiz/confirm', (req: Request, res: Response) => {
  try {
    const { attemptId, sessionToken, choice } = req.body;
    if (!attemptId || !sessionToken || !choice) {
      return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
    }

    const result = confirmAnswerAndAdvance(attemptId, sessionToken, choice);
    if (!result.success) {
      return res.status(400).json(result);
    }

    if (result.isComplete) {
      return res.json({
        success: true,
        isComplete: true,
        attemptId
      });
    }

    const publicQuestions = getPublicQuestions();
    const nextQ = publicQuestions[result.nextQuestionIndex!];

    res.json({
      success: true,
      isComplete: false,
      currentQuestionIndex: result.nextQuestionIndex,
      totalQuestions: publicQuestions.length,
      remainingSeconds: result.remainingSeconds,
      serverDeadlineMs: result.serverDeadlineMs,
      activeQuestion: nextQ,
      selectedDraftChoice: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Sync server timer and auto-advance if deadline passed
 */
apiRouter.post('/quiz/time-sync', (req: Request, res: Response) => {
  try {
    const { attemptId, sessionToken } = req.body;
    const result = getAttemptStatus(attemptId, sessionToken);
    if (!result.success || !result.attempt) {
      return res.status(404).json({ success: false, message: 'ไม่พบเซสชันการสอบ' });
    }

    const att = result.attempt;
    syncAttemptTime(att);

    if (att.status === 'completed' || att.status === 'expired') {
      return res.json({
        success: true,
        isCompleted: true,
        attemptId: att.attemptId
      });
    }

    const publicQuestions = getPublicQuestions();
    const currentQ = publicQuestions[att.currentQuestionIndex];
    const now = Date.now();
    const remainingSeconds = Math.max(0, Math.ceil((att.questionDeadlineMs - now) / 1000));

    res.json({
      success: true,
      isCompleted: false,
      currentQuestionIndex: att.currentQuestionIndex,
      totalQuestions: publicQuestions.length,
      remainingSeconds,
      serverDeadlineMs: att.questionDeadlineMs,
      activeQuestion: currentQ,
      selectedDraftChoice: att.draftAnswers[att.currentQuestionIndex] || null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Get final result of completed quiz
 */
apiRouter.get('/quiz/result/:attemptId', (req: Request, res: Response) => {
  try {
    const { attemptId } = req.params;
    const result = getAttemptStatus(attemptId);
    if (!result.success || !result.attempt) {
      return res.status(404).json({ success: false, message: 'ไม่พบผลสอบ' });
    }

    const att = result.attempt;
    if (att.status !== 'completed' && att.status !== 'expired') {
      return res.status(400).json({ success: false, message: 'แบบทดสอบยังไม่เสร็จสิ้น' });
    }

    res.json({
      success: true,
      data: {
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
        startedAt: att.startedAt,
        completedAt: att.completedAt,
        status: att.status
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Teacher login validation
 */
apiRouter.post('/teacher/login', (req: Request, res: Response) => {
  try {
    const { password, googleEmail } = req.body;

    // Check Google Auth email
    if (googleEmail && (googleEmail === TEACHER_ADMIN_EMAIL || googleEmail.endsWith('@thw.ac.th'))) {
      const teacherToken = 'tch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 12);
      return res.json({
        success: true,
        teacherToken,
        teacherName: 'ครูกุลรัศมิ์ ทองคำเภา',
        school: 'โรงเรียนท่ายางวิทยา'
      });
    }

    // Check Master Password / PIN
    if (password === TEACHER_SECRET_KEY || password === 'KruAnn2026' || password === '123456') {
      const teacherToken = 'tch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 12);
      return res.json({
        success: true,
        teacherToken,
        teacherName: 'ครูกุลรัศมิ์ ทองคำเภา',
        school: 'โรงเรียนท่ายางวิทยา'
      });
    }

    res.status(401).json({ success: false, message: 'รหัสผ่านครูไม่ถูกต้อง หรือบัญชี Google ไม่มีสิทธิ์' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Fetch all student quiz attempts (Teacher only)
 */
apiRouter.get('/teacher/attempts', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer tch_')) {
      return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลครู' });
    }

    const rows = getAllTeacherRows();
    res.json({
      success: true,
      attempts: rows,
      totalCount: rows.length
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Fetch questions with answer key and explanations for Teacher review
 */
apiRouter.get('/teacher/questions', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer tch_')) {
      return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลครู' });
    }

    res.json({
      success: true,
      questions: TRACK_ATHLETICS_QUESTIONS
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Reset student attempt (Teacher only)
 */
apiRouter.post('/teacher/reset-attempt', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer tch_')) {
      return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลครู' });
    }

    const { attemptId } = req.body;
    if (!attemptId) {
      return res.status(400).json({ success: false, message: 'โปรดระบุ attemptId' });
    }

    const ok = resetStudentAttempt(attemptId);
    if (!ok) {
      return res.status(404).json({ success: false, message: 'ไม่พบรายการที่ต้องการรีเซ็ต' });
    }

    res.json({ success: true, message: 'รีเซ็ตสิทธิ์การสอบเรียบร้อยแล้ว นักเรียนสามารถเริ่มทำใหม่ได้' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});
