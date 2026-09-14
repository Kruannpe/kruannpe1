import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { StudentForm } from './components/StudentForm';
import { QuizView } from './components/QuizView';
import { ResultView } from './components/ResultView';
import { TeacherDashboard } from './components/TeacherDashboard';
import {
  ChoiceKey,
  QuizQuestionPublic,
  QuizResultData,
  StudentInfo,
  StudentRegistrationInput
} from './types';

export default function App() {
  const [currentView, setCurrentView] = useState<'student' | 'teacher'>('student');
  const [studentFlowState, setStudentFlowState] = useState<'form' | 'quiz' | 'result'>('form');

  // Active quiz session state
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<QuizQuestionPublic | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [totalQuestions, setTotalQuestions] = useState<number>(20);
  const [serverDeadlineMs, setServerDeadlineMs] = useState<number>(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(30);
  const [selectedDraftChoice, setSelectedDraftChoice] = useState<ChoiceKey | null>(null);

  // Result state
  const [resultData, setResultData] = useState<QuizResultData | null>(null);

  // Status & Error handling
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Check if there is an active session on page reload
  useEffect(() => {
    const savedAttemptId = sessionStorage.getItem('thw_attempt_id');
    const savedSessionToken = sessionStorage.getItem('thw_session_token');

    if (savedAttemptId && savedSessionToken) {
      checkAndResumeSession(savedAttemptId, savedSessionToken);
    }
  }, []);

  const checkAndResumeSession = async (attId: string, tok: string) => {
    try {
      const res = await fetch(`/api/quiz/status/${attId}?sessionToken=${tok}`);
      if (!res.ok) {
        sessionStorage.removeItem('thw_attempt_id');
        sessionStorage.removeItem('thw_session_token');
        return;
      }

      const data = await res.json();
      if (data.success) {
        if (data.isCompleted) {
          // Quiz was already completed
          await fetchResult(attId);
        } else if (data.activeQuestion) {
          // Resume quiz
          setAttemptId(attId);
          setSessionToken(tok);
          setStudentInfo(data.studentInfo);
          setActiveQuestion(data.activeQuestion);
          setCurrentQuestionIndex(data.currentQuestionIndex);
          setTotalQuestions(data.totalQuestions || 20);
          setServerDeadlineMs(data.serverDeadlineMs);
          setRemainingSeconds(data.remainingSeconds);
          setSelectedDraftChoice(data.selectedDraftChoice || null);
          setStudentFlowState('quiz');
        }
      }
    } catch (err) {
      console.warn('Could not resume session:', err);
    }
  };

  // Fetch final quiz result
  const fetchResult = async (attId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/quiz/result/${attId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setResultData(data.data);
        setStudentFlowState('result');
      }
    } catch (err) {
      console.error('Error fetching result:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Start new quiz attempt (Atomic transaction with anti-duplication verification)
  const handleStartQuiz = async (input: StudentRegistrationInput) => {
    setIsLoading(true);
    setFormError(null);

    try {
      const res = await fetch('/api/quiz/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: input.firstName,
          lastName: input.lastName,
          studentClass: input.studentClass,
          studentNo: input.studentNo,
          sessionToken: sessionToken || undefined
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.message || 'ไม่สามารถเริ่มทำแบบทดสอบได้ โปรดตรวจสอบข้อมูล');
        return;
      }

      // Save credentials in session storage for refresh recovery
      sessionStorage.setItem('thw_attempt_id', data.attemptId);
      sessionStorage.setItem('thw_session_token', data.sessionToken);

      setAttemptId(data.attemptId);
      setSessionToken(data.sessionToken);
      setStudentInfo(data.studentInfo);
      setActiveQuestion(data.activeQuestion);
      setCurrentQuestionIndex(data.currentQuestionIndex);
      setTotalQuestions(data.totalQuestions || 20);
      setServerDeadlineMs(data.serverDeadlineMs);
      setRemainingSeconds(data.remainingSeconds);
      setSelectedDraftChoice(data.selectedDraftChoice || null);
      setStudentFlowState('quiz');
    } catch {
      setFormError('ไม่สามารถเชื่อมต่อฐานข้อมูลส่วนกลางได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่');
    } finally {
      setIsLoading(false);
    }
  };

  // Save draft choice to backend in real-time
  const handleDraftChange = async (choice: ChoiceKey) => {
    if (!attemptId || !sessionToken) return;
    setSelectedDraftChoice(choice);

    try {
      await fetch('/api/quiz/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          sessionToken,
          choice
        })
      });
    } catch (err) {
      console.warn('Draft auto-save warning:', err);
    }
  };

  // Confirm choice and advance to next question
  const handleConfirmAnswer = async (choice: ChoiceKey) => {
    if (!attemptId || !sessionToken) return;

    try {
      const res = await fetch('/api/quiz/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          sessionToken,
          choice
        })
      });

      const data = await res.json();
      if (!data.success) {
        alert(data.message || 'เกิดข้อผิดพลาดในการยืนยันคำตอบ');
        return;
      }

      if (data.isComplete) {
        // Quiz completed!
        await fetchResult(attemptId);
      } else if (data.activeQuestion) {
        setActiveQuestion(data.activeQuestion);
        setCurrentQuestionIndex(data.currentQuestionIndex);
        setServerDeadlineMs(data.serverDeadlineMs);
        setRemainingSeconds(data.remainingSeconds);
        setSelectedDraftChoice(null);
      }
    } catch (err) {
      console.error('Error confirming answer:', err);
    }
  };

  // Timer expired callback (Authoritative server sync)
  const handleTimeExpired = useCallback(async () => {
    if (!attemptId || !sessionToken) return;

    try {
      const res = await fetch('/api/quiz/time-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          sessionToken
        })
      });

      const data = await res.json();
      if (data.success) {
        if (data.isCompleted) {
          await fetchResult(attemptId);
        } else if (data.activeQuestion) {
          setActiveQuestion(data.activeQuestion);
          setCurrentQuestionIndex(data.currentQuestionIndex);
          setServerDeadlineMs(data.serverDeadlineMs);
          setRemainingSeconds(data.remainingSeconds);
          setSelectedDraftChoice(data.selectedDraftChoice || null);
        }
      }
    } catch (err) {
      console.warn('Time sync error:', err);
    }
  }, [attemptId, sessionToken]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900 font-sans selection:bg-orange-500 selection:text-white">
      {/* Navigation Bar */}
      <Navbar
        currentView={currentView}
        onViewChange={(v) => {
          if (studentFlowState === 'quiz') {
            if (!confirm('คุณกำลังอยู่ระหว่างการทำข้อสอบ หากสลับหน้าจอเวลาจะไม่หยุดเดิน ต้องการสลับหน้าจอหรือไม่?')) {
              return;
            }
          }
          setCurrentView(v);
        }}
        isQuizActive={studentFlowState === 'quiz'}
      />

      {/* Main Content Area */}
      <main className="grow">
        {currentView === 'teacher' ? (
          <TeacherDashboard onBackToStudentView={() => setCurrentView('student')} />
        ) : (
          <>
            {studentFlowState === 'form' && (
              <StudentForm
                onStartQuiz={handleStartQuiz}
                isLoading={isLoading}
                errorMessage={formError}
              />
            )}

            {studentFlowState === 'quiz' && activeQuestion && studentInfo && (
              <QuizView
                question={activeQuestion}
                currentQuestionIndex={currentQuestionIndex}
                totalQuestions={totalQuestions}
                serverDeadlineMs={serverDeadlineMs}
                initialRemainingSeconds={remainingSeconds}
                studentInfo={studentInfo}
                selectedDraft={selectedDraftChoice}
                onDraftChange={handleDraftChange}
                onConfirmAnswer={handleConfirmAnswer}
                onTimeExpired={handleTimeExpired}
              />
            )}

            {studentFlowState === 'result' && resultData && (
              <ResultView result={resultData} />
            )}
          </>
        )}
      </main>

      {/* Footer Credit */}
      <Footer />
    </div>
  );
}
