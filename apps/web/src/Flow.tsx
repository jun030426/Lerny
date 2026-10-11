import { useContext, useEffect, useState, type ReactNode } from "react";
import {
  Link,
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Auth } from "./Auth";
import { api, post, type Classroom, type Course, type Section, type Enrollment, type Term } from "./api";
import { ErrorNotice, Notice, useLoad } from "./components";
import { Chat, Materials } from "./Learning";
import { MyLearning, type Daily } from "./Theory";

type Record = {
  id: string;
  section_id: string;
  day: string;
  total: number;
  submitted: number;
  pending: number;
  valid: number;
  correct: number;
};
const kstDay = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(
    new Date(),
  );
export function RoleHome() {
  const { user } = useContext(Auth);
  return (
    <Navigate
      to={
        user?.role === "student"
          ? "/student"
          : user?.role === "teacher"
            ? "/professor"
            : "/classrooms"
      }
      replace
    />
  );
}
export function StudentOnly({ children }: { children: ReactNode }) {
  const { user } = useContext(Auth);
  return user?.role === "student" ? (
    children
  ) : (
    <Notice>
      학생 계정에서 사용할 수 있어요. <Link to="/home">내 홈으로</Link>
    </Notice>
  );
}
export function StudentToday() {
  const { user } = useContext(Auth);
  const rooms = useLoad<{ items: Classroom[] }>("/classrooms");
  const history = useLoad<{ items: Record[] }>("/my/learning-sessions");
  const today = history.data?.items.filter((s) => s.day === kstDay()) || [];
  const submitted = today.reduce((sum, s) => sum + s.submitted, 0);
  const pending = today.reduce((sum, s) => sum + s.pending, 0);
  const active = rooms.data?.items.filter((r) => r.status === "active") || [];
  const date = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
  return (
    <div className="student-home">
      <div className="student-greeting">
        <div>
          <span className="student-eyebrow">MY LEARNING SPACE</span>
          <h1>
            {user?.display_name}님,
            <br className="student-mobile-break" /> 오늘도 한 걸음씩.
          </h1>
          <p>작은 질문 하나가, 더 깊은 이해의 시작이 되도록.</p>
        </div>
        <span className="student-date">{date}</span>
      </div>
      <ErrorNotice text={rooms.error || history.error} />
      <div className="student-top-grid">
        <section className="student-focus">
          <div className="student-focus-copy">
            <span className="student-eyebrow">TODAY’S NEXT STEP</span>
            <h2>
              오늘의 이해를
              <br />
              <span>한 걸음 더.</span>
            </h2>
            <p>
              강의별 오늘의 이론을 풀고,
              <br />
              헷갈렸던 개념을 다시 연결해 보세요.
            </p>
            <Link to="/quiz" className="ln-cta">
              퀴즈 풀기·이어하기
            </Link>
          </div>
          <div className="student-focus-art" aria-hidden="true">
            <div className="student-art-circle" />
            <div className="student-art-note">
              <span>CONNECT THE DOTS</span>
              <b>
                배운 것을,
                <br />
                나의 것으로.
              </b>
              <div>
                <i />
                <i />
                <i />
              </div>
            </div>
            <span className="student-art-check">✓</span>
            <span className="student-art-star">✦</span>
          </div>
        </section>
        <section className="student-summary">
          <div className="student-card-heading">
            <h2>오늘의 학습 기록</h2>
            <span>제출 기준</span>
          </div>
          {history.data ? (
            <>
              <div className="student-count">
                <strong>{submitted}</strong>
                <span>문항 제출</span>
              </div>
              <p>
                {submitted
                  ? "오늘 남긴 답안이에요. 결과에서 이해를 확인해 보세요."
                  : "아직 오늘 제출한 답안이 없어요. 첫 문항부터 시작해 볼까요?"}
              </p>
              {pending > 0 && (
                <div className="student-pending">
                  채점 대기 {pending}문항 · 결과가 나오면 확인해 주세요.
                </div>
              )}
            </>
          ) : (
            <p role="status">
              {history.error
                ? "학습 기록을 불러오지 못했어요."
                : "오늘의 기록을 불러오는 중이에요…"}
            </p>
          )}
          <Link to="/attendance" className="student-card-link">
            내 학습 기록 보기 <span>↗</span>
          </Link>
        </section>
      </div>
      <section className="student-courses">
        <div className="student-section-heading">
          <div>
            <span className="student-eyebrow">YOUR CLASSROOMS</span>
            <h2>내 강의</h2>
          </div>
          <Link to="/courses">
            전체 강의·수강 신청 <span>↗</span>
          </Link>
        </div>
        {!rooms.data ? (
          <p className="student-empty" role="status">
            {rooms.error
              ? "강의 목록을 불러오지 못했어요."
              : "내 강의를 불러오는 중이에요…"}
          </p>
        ) : active.length ? (
          <div
            className={`student-course-grid student-course-count-${Math.min(active.length, 4)}`}
          >
            {active.slice(0, 4).map((room, i) => (
              <Link
                className={`student-course student-course-${i % 3}`}
                key={room.section.id}
                to={`/classrooms/${room.section.id}`}
              >
                <div className="student-course-top">
                  <span>CLASSROOM / 0{i + 1}</span>
                  <b>↗</b>
                </div>
                <div className="student-course-symbol" aria-hidden="true">
                  {["▤", "◇", "⌘"][i % 3]}
                </div>
                <h3>{room.course.title}</h3>
                <p>{room.section.title}</p>
                <span className="student-course-bottom">
                  강의실 들어가기 <i>→</i>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="student-empty">
            <strong>첫 강의와 연결해 보세요.</strong>
            <p>
              수강 중인 강의가 아직 없어요. 수강 코드로 참여를 신청할 수 있어요.
            </p>
            <Link to="/courses">수강 신청하기 ↗</Link>
          </div>
        )}
      </section>
      <section className="student-question">
        <span className="student-question-icon" aria-hidden="true">
          ?
        </span>
        <div>
          <span className="student-eyebrow">A QUESTION IS A GOOD START</span>
          <h2>수업에서 놓친 연결고리가 있나요?</h2>
          <p>강의 자료를 바탕으로 질문하고, 이전 대화에서 이어가세요.</p>
        </div>
        <Link to="/ai">
          AI 질문 열기 <span>↗</span>
        </Link>
      </section>
      <div className="student-learning-path" aria-label="학습 흐름">
        {["질문하기", "개념 확인", "퀴즈 풀기", "결과 확인", "다시 복습"].map(
          (s, i) => (
            <span key={s}>
              <small>0{i + 1}</small>
              {s}
              {i < 4 && <i aria-hidden="true">→</i>}
            </span>
          ),
        )}
      </div>
    </div>
  );
}
export function QuizCatalog() {
  const [criteriaOpen, setCriteriaOpen] = useState(false);
  const streak = useLoad<{ today_completed: boolean; current_streak: number; total_days: number }>("/my/learning-streak");
  const rooms = useLoad<{ items: Classroom[] }>("/classrooms");
  const history = useLoad<{ items: Record[] }>("/my/learning-sessions");
  const [params, setParams] = useSearchParams();
  const selected = params.get("section") || "";
  const active = rooms.data?.items.filter((r) => r.status === "active") || [];
  const filtered = selected
    ? active.filter((r) => r.section.id === selected)
    : active;
  const records = (history.data?.items || []).filter(
    (s) => !selected || s.section_id === selected,
  );
  return (
    <section className="student-home quiz-catalog">
      <span className="student-eyebrow">MY QUIZ</span>
      <h1>퀴즈</h1>
      <p className="quiz-description">이론으로 이해하고, 실습으로 연결해 보세요. 강의별 학습과 복습을 한곳에서 이어가세요.</p>
      <div className="quiz-streak-summary">
        <div><span className="student-eyebrow">KEEP LEARNING</span><strong>{streak.data ? `${streak.data.current_streak}일 연속 학습` : "연속 학습"}</strong></div>
        <p>{streak.error ? "연속 학습 기록을 불러오지 못했어요." : !streak.data ? "학습 기록을 확인하고 있어요…" : streak.data.today_completed ? "오늘의 학습 완료 · 내일도 이어가 보세요." : "이론 또는 실습을 완료하면 오늘의 학습으로 인정돼요."}</p>
        <button type="button" className="quiz-criteria-toggle" aria-expanded={criteriaOpen} aria-controls="quiz-criteria" onClick={() => setCriteriaOpen(!criteriaOpen)}>인정 기준 <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg></button>
        <div id="quiz-criteria" className="quiz-criteria-body" hidden={!criteriaOpen}>
          <p>이론 또는 실습의 하루 묶음을 최종 제출하면 정답 여부와 관계없이 인정돼요.</p>
          <p>한국 시간 기준 하루 1회 · 풀이 시작, 부분 제출, 코드 실행만으로는 인정되지 않아요.</p>
        </div>
      </div>
      <ErrorNotice text={rooms.error || history.error} />
      <div className="tabs quiz-filters" aria-label="강의별 필터">
        <button
          aria-pressed={!selected}
          className={!selected ? "selected" : ""}
          onClick={() => setParams({})}
        >
          전체
        </button>
        {active.map((r) => (
          <button
            aria-pressed={selected === r.section.id}
            className={selected === r.section.id ? "selected" : ""}
            key={r.section.id}
            onClick={() => setParams({ section: r.section.id })}
          >
            {r.course.title} · {r.section.title}
          </button>
        ))}
      </div>
      <div className="quiz-section-heading"><div><span className="student-eyebrow">TODAY’S LEARNING</span><h2>오늘의 학습</h2></div><span>한 문항씩, 차근차근.</span></div>
      {!active.length && rooms.data && (
        <Notice>
          먼저 강의에 참여해 주세요. <Link to="/courses">내 강의로</Link>
        </Notice>
      )}
      <div className="quiz-course-groups">
        {filtered.map((r) => {
          const record = records.find(
            (s) => s.section_id === r.section.id && s.day === kstDay(),
          );
          const done = record && record.submitted === record.total;
          return (
            <section className="quiz-course-group" key={r.section.id}>
              <header className="quiz-course-heading">
                <h3>{r.course.title.split(/\s+[—–]\s+/)[0]}</h3>
                <span>{r.section.title}</span>
                {r.course.title.split(/\s+[—–]\s+/).length > 1 && <p>{r.course.title.split(/\s+[—–]\s+/).slice(1).join(" — ")}</p>}
              </header>
              <div className="quiz-mode-grid">
                <article className="quiz-mode-card">
                  <div className="quiz-mode-top"><span className="student-eyebrow">01 / THEORY</span><span className="quiz-mode-tag">이론</span></div>
                  <h4>배운 개념을 확인해요.</h4>
                  <p className="quiz-mode-description">객관식 2문항과 서술형 1문항으로<br />이해한 내용을 차근차근 짚어 보세요.</p>
                  <div className="quiz-mode-footer">
                    <p className="quiz-progress-status">{record
                      ? `${record.submitted}/${record.total}문항 제출${record.pending ? ` · 채점·검토 대기 ${record.pending}건` : ""}`
                      : "아직 시작하지 않았어요."}</p>
                    <Link className="ln-cta" to={done ? `/quiz/results/${record.id}` : `/quiz/${r.section.id}`}>
                      {done ? "이론 결과·해설 보기" : record ? "이론 이어서 풀기" : "이론 풀기"} ↗
                    </Link>
                  </div>
                </article>
                <article className="quiz-mode-card quiz-practice-card">
                  <div className="quiz-mode-top"><span className="student-eyebrow">02 / PRACTICE</span><span className="quiz-mode-tag">실습</span></div>
                  <h4>직접 풀며 연결해요.</h4>
                  <p className="quiz-mode-description">실행 결과 예측 · 코드 빈칸 · 직접 구현<br />세 가지 방식으로 개념을 적용하는 학습이에요.</p>
                  <div className="quiz-language-list" aria-label="수업 언어"><span>{({ python: "Python", java: "Java", c: "C" } as { [key: string]: string })[r.course.teaching_language.toLowerCase()] || r.course.teaching_language}</span></div>
                  <div className="quiz-mode-footer">
                    <p>실습 3문제 · 수업에서 배운 내용을 적용해 보세요.</p>
                    <Link className="ln-cta" to={`/classrooms/${r.section.id}/practice`}>실습 풀기 ↗</Link>
                  </div>
                </article>
              </div>
            </section>
          );
        })}
      </div>
      <div className="quiz-section-heading quiz-history-heading"><div><span className="student-eyebrow">YOUR LEARNING TRAIL</span><h2>이론 제출·복습 기록</h2></div></div>
      {!history.data && !history.error && <Notice>학습 기록을 불러오는 중이에요…</Notice>}
      {history.data && records.length === 0 && <div className="quiz-empty"><strong>첫 번째 학습 기록을 남겨 보세요.</strong><p>퀴즈를 제출하면 결과와 해설을 여기에서 다시 확인할 수 있어요.</p></div>}
      {records.map((s) => (
        <div className="roster" key={s.id}>
          <span>
            {s.day} ·{" "}
            {active.find((r) => r.section.id === s.section_id)?.course.title}
          </span>
          <span>
            {s.submitted}/{s.total} 제출
          </span>
          <Link to={`/quiz/results/${s.id}`}>결과·해설 보기</Link>
        </div>
      ))}
    </section>
  );
}

function draftKey(userId: string, sessionId: string) {
  return `lerny-quiz:${userId}:${sessionId}`;
}
export function QuizTakeFlow() {
  const { sectionId = "" } = useParams();
  const { user } = useContext(Auth);
  const navigate = useNavigate();
  const [daily, setDaily] = useState<Daily>();
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setDaily(undefined);
    setError("");
    setIndex(0);
    setAnswers({});
    api<Daily>(`/sections/${sectionId}/daily`, post({}))
      .then((d) => {
        if (!active) return;
        setDaily(d);
        try {
          const position = Number(
            sessionStorage.getItem(draftKey(user!.id, d.id) + ":position") ||
              "0",
          );
          if (
            Number.isInteger(position) &&
            position >= 0 &&
            position < d.items.length
          )
            setIndex(position);
          const saved = JSON.parse(
            sessionStorage.getItem(draftKey(user!.id, d.id)) || "{}",
          );
          if (saved && typeof saved === "object" && !Array.isArray(saved))
            setAnswers(
              Object.fromEntries(
                Object.entries(saved).filter(
                  ([key, value]) =>
                    d.items.some((q) => q.id === key) &&
                    typeof value === "string" &&
                    value.length <= 4000,
                ),
              ) as { [key: string]: string },
            );
        } catch {
          /* Empty draft on unavailable storage. */
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [sectionId, user?.id]);
  const choose = (value: string) => {
    if (!daily) return;
    const next = { ...answers, [daily.items[index].id]: value };
    setAnswers(next);
    try {
      sessionStorage.setItem(
        draftKey(user!.id, daily.id),
        JSON.stringify(next),
      );
    } catch {
      /* Form still works without browser storage. */
    }
  };
  const move = (next: number) => {
    setIndex(next);
    if (daily)
      try {
        sessionStorage.setItem(
          draftKey(user!.id, daily.id) + ":position",
          String(next),
        );
      } catch {
        /* Optional storage. */
      }
  };
  const submit = async () => {
    if (!daily) return;
    setError("");
    setBusy(true);
    try {
      const fresh = await api<Daily>(`/learning-sessions/${daily.id}`);
      setDaily(fresh);
      const remaining = fresh.items.filter(
        (q) => !q.attempt && q.status !== "unavailable",
      );
      if (remaining.some((q) => !answers[q.id]?.trim()))
        throw new Error(
          "아직 답하지 않은 문항이 있어요. 문항 번호를 눌러 확인해 주세요.",
        );
      for (const q of remaining)
        await api(`/learning-sessions/${daily.id}/questions/${q.id}/submit`, {
          ...post({ answer: answers[q.id] }),
          headers: { "Idempotency-Key": `${daily.id}:${q.id}` },
        });
      try {
        sessionStorage.removeItem(draftKey(user!.id, daily.id));
        sessionStorage.removeItem(draftKey(user!.id, daily.id) + ":position");
      } catch {
        /* Submission already persisted. */
      }
      navigate(`/quiz/results/${daily.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (!daily)
    return (
      <section className="student-home quiz-flow theory-workspace">
        <Link to={`/quiz?section=${sectionId}`}>← 퀴즈 목록</Link>
        <h1>오늘의 퀴즈</h1>
        {error ? (
          <ErrorNotice text={error} />
        ) : (
          <Notice>문항을 준비하고 있어요…</Notice>
        )}
      </section>
    );
  const q = daily.items[index];
  const complete = daily.items.every(
    (q) => q.attempt || q.status === "unavailable",
  );
  return (
    <section className="student-home quiz-flow theory-workspace">
      <Link to={`/quiz?section=${sectionId}`}>← 퀴즈 목록</Link>
      <span className="student-eyebrow theory-eyebrow">CONNECT THROUGH PRACTICE</span>
      <div className="theory-title-row"><h1>오늘의 이론</h1><span>{daily.items.filter(item => item.attempt || answers[item.id]?.trim()).length} / {daily.items.length}문항 작성</span></div>
      <p>
        한 문항씩 풀고 마지막에 제출하세요. 해설은 결과 화면에서 확인할 수
        있어요.
      </p>
      {daily.shortage > 0 && (
        <Notice>현재 준비된 {daily.items.length}문항으로 진행해요.</Notice>
      )}
      <nav className="question-steps" aria-label="문항 이동">
        {daily.items.map((item, i) => (
          <button
            key={item.id}
            disabled={busy}
            aria-current={index === i ? "step" : undefined}
            className={index === i ? "selected" : ""}
            onClick={() => move(i)}
          >
            {i + 1}번{" "}
            {item.attempt ? "제출됨" : answers[item.id] ? "작성됨" : ""}
          </button>
        ))}
      </nav>
      {q && (
        <article className="panel theory-question">
          <small>
            {index + 1} / {daily.items.length} ·{" "}
            {q.kind === "essay" ? "서술형" : "객관식"}
          </small>
          <h2>{q.prompt}</h2>
          {q.attempt ? (
            <Notice>
              이미 제출한 답안이에요. 결과 화면에서 채점을 확인하세요.
            </Notice>
          ) : q.status === "unavailable" ? (
            <Notice>이 문항은 변경되어 제출할 수 없어요.</Notice>
          ) : (
            <fieldset disabled={busy}>
              <legend className="theory-answer-legend">{q.kind === "mcq" ? "정답이라고 생각하는 보기 하나를 선택해 주세요." : "배운 내용을 자신의 말로 설명해 주세요."}</legend>
              {q.kind === "mcq" ? (
                q.options.map((option, i) => (
                  <label className={`answer-option ${answers[q.id] === String(i) ? "is-chosen" : ""}`} key={i}>
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === String(i)}
                      onChange={() => choose(String(i))}
                    />
                    <span className="theory-option-number" aria-hidden="true">{i + 1}</span><span>{option}</span>
                  </label>
                ))
              ) : (
                <label>
                  내 설명
                  <textarea
                    value={answers[q.id] || ""}
                    onChange={(e) => choose(e.target.value)}
                    rows={7}
                    maxLength={4000}
                    placeholder="핵심 개념과 그 이유를 차근차근 적어 주세요."
                  />
                </label>
              )}
            </fieldset>
          )}
          <ErrorNotice text={error} />
          <div className="flow-actions">
            <button
              disabled={index === 0 || busy}
              onClick={() => move(index - 1)}
            >
              이전 문항
            </button>
            {index < daily.items.length - 1 ? (
              <button
                className="primary"
                disabled={busy}
                onClick={() => move(index + 1)}
              >
                다음 문항 →
              </button>
            ) : complete ? (
              <Link
                className="primary link-button"
                to={`/quiz/results/${daily.id}`}
              >
                결과·해설 보기 →
              </Link>
            ) : (
              <button
                className="primary"
                disabled={busy}
                onClick={() => void submit()}
              >
                {busy ? "제출 중…" : "답안 제출"}
              </button>
            )}
          </div>
        </article>
      )}
    </section>
  );
}

export function QuizResults() {
  const [actionError, setActionError] = useState("");
  const { learningId = "" } = useParams();
  const r = useLoad<Daily>(`/learning-sessions/${learningId}`);
  useEffect(() => {
    if (!r.data?.items.some((q) => q.attempt?.status === "pending")) return;
    const timer = setTimeout(r.reload, 3000);
    return () => clearTimeout(timer);
  }, [r.data]);
  const submitted = r.data?.items.filter((q) => q.attempt) || [];
  const graded = submitted.filter((q) => q.attempt?.status === "graded");
  return (
    <section className="student-home quiz-results">
      <Link to={r.data ? `/quiz?section=${r.data.section_id}` : "/quiz"}>
        ← 퀴즈 목록
      </Link>
      <span className="student-eyebrow result-eyebrow">TURN ANSWERS INTO UNDERSTANDING</span>
      <h1>결과와 복습</h1>
      <p className="result-intro">맞힌 이유도, 헷갈린 부분도. 해설과 함께 이해를 한 걸음 넓혀 보세요.</p>
      <ErrorNotice text={r.error} />
      {!r.data && !r.error && <Notice>결과를 불러오는 중…</Notice>}
      {r.data && (
        <>
          <div className="result-overview">
            <div className="result-overview-title"><div><span className="student-eyebrow">YOUR PRACTICE</span><h2>{submitted.length}/{r.data.items.length}문항 제출</h2></div><button onClick={r.reload}>채점 상태 새로고침 ↻</button></div>
            <div className="result-stats">
              <div><span>채점 완료</span><strong>{graded.length}<small>문항</small></strong></div>
              <div><span>정답</span><strong>{graded.filter(q => q.attempt?.correct).length}<small>문항</small></strong></div>
              <div><span>대기·보류</span><strong>{submitted.length - graded.length}<small>문항</small></strong></div>
            </div>
            <p>성적에 반영되지 않는 학습 기록이에요. 대기·보류 문항은 오답으로 세지 않아요.</p>
          </div>
          <h2 className="result-section-title">문항별 답안과 해설</h2>
          {r.data.items.map((q, i) => (
            <article className={`panel result-question ${q.attempt?.status === "graded" ? (q.attempt.correct ? "result-correct" : "result-review") : "result-pending"}`} key={q.id}>
              <div className="result-question-meta"><small>
                {i + 1}번 · {q.kind === "essay" ? "서술형" : "객관식"}
              </small><span className={`result-status ${q.attempt?.status === "graded" ? (q.attempt.correct ? "is-correct" : "is-review") : "is-pending"}`}>{q.attempt?.status === "graded" ? (q.attempt.correct ? "정답" : "복습해 보세요") : q.attempt?.status === "pending" ? "채점 중" : q.attempt ? "검토 보류" : "미제출"}</span></div>
              <h2>{q.prompt}</h2>
              {q.submitted_answer && (
                <p className="result-answer">
                  <strong>내 답안</strong> · {q.submitted_answer}
                </p>
              )}
              {q.correct_option && (
                <p className="result-answer result-correct-answer">
                  <strong>정답</strong> · {q.correct_option}
                </p>
              )}
              <Notice>
                {q.attempt?.status === "pending"
                  ? "채점 중이에요."
                  : q.attempt?.feedback?.message ||
                    (q.attempt
                      ? "검토 보류 중이에요."
                      : "제출하지 않은 문항이에요.")}
              </Notice>
              {q.attempt?.feedback?.criteria?.map((c, j) => (
                <p key={j}>
                  {c.criterion} · {c.score}점
                </p>
              ))}
              {q.explanation && (
                <details open>
                  <summary>해설</summary>
                  <p>{q.explanation}</p>
                </details>
              )}
              {q.kind === "essay" &&
                q.attempt &&
                !q.attempt.appealed &&
                q.attempt.status !== "pending" && (
                  <button
                    onClick={async () => {
                      try {
                        await api(
                          `/attempts/${q.attempt!.id}/appeal`,
                          post({}),
                        );
                        r.reload();
                      } catch (e) {
                        setActionError((e as Error).message);
                      }
                    }}
                  >
                    채점 재검토 요청
                  </button>
                )}
            </article>
          ))}
          <div className="flow-actions">
            <Link to="/quiz">다른 강의 퀴즈 보기</Link>
            <Link
              className="primary link-button"
              to={`/attendance?section=${r.data.section_id}`}
            >
              내 복습 현황 →
            </Link>
            <Link to={`/ai?section=${r.data.section_id}`}>
              이 강의에 질문하기
            </Link>
            {submitted.length < r.data.items.length && (
              <Link to={`/quiz/${r.data.section_id}`}>
                남은 문항 이어서 풀기 →
              </Link>
            )}
            <Link to="/student">홈으로</Link>
          </div>
        </>
      )}
      <ErrorNotice text={actionError} />
    </section>
  );
}

export function CourseWorkspace({ mode }: { mode: "chat" | "progress" }) {
  const rooms = useLoad<{ items: Classroom[] }>("/classrooms");
  const [params, setParams] = useSearchParams();
  const domain = params.get("domain") === "practice" ? "practice" : "theory";
  const active = rooms.data?.items.filter((r) => r.status === "active") || [];
  const room = active.find((r) => r.section.id === params.get("section"));
  const history = useLoad<{ items: Record[] }>("/my/learning-sessions");
  return (
    <section className={mode === "chat" ? "student-home ai-page" : "student-home progress-page ai-page"}>
      <span className={"student-eyebrow"}>
        {mode === "chat" ? "CONNECT THROUGH QUESTIONS" : "MY LEARNING"}
      </span>
      <h1>{mode === "chat" ? "AI 질문" : "학습 기록과 복습"}</h1>
      {mode === "chat" && (
        <p className="ai-page-description">
          작은 질문도 괜찮아요. 우리 수업의 자료에서 이해의 연결고리를
          찾아보세요.
        </p>
      )}
      <ErrorNotice text={rooms.error} />
      {mode === "progress" && (
        <p>
          배운 만큼 쌓이는 나의 이해. 개념별 학습과 복습할 내용을 확인해 보세요.
        </p>
      )}
      <div className={"workspace ai-workspace"}>
        <aside className="course-rail">
          <h2>내 강의</h2>
          {active.map((r) => {
            const [subject, ...details] = r.course.title.split(/\s+[—–]\s+/);
            return (
              <button
                aria-pressed={room?.section.id === r.section.id}
                className={room?.section.id === r.section.id ? "selected" : ""}
                key={r.section.id}
                onClick={() => setParams(mode === "progress" ? { section: r.section.id, domain,  } : { section: r.section.id })}
              >
                <span className="course-rail-subject">{subject}</span>
                {details.length > 0 && (
                  <span className="course-rail-detail">{details.join(" — ")}</span>
                )}
                <small>{r.section.title}</small>
              </button>
            );
          })}
          <Link to="/courses">강의·수강 관리 →</Link>
        </aside>
        <div>
          {room ? (
            mode === "chat" ? (
              <Chat key={room.section.id} sectionId={room.section.id} />
            ) : (
              <section className="panel progress-panel">
                <span className="student-eyebrow">MY UNDERSTANDING</span>
                <h2>{room.course.title.split(/\s+[—–]\s+/)[0]}</h2>
                <p className="progress-caption">{room.section.title} · {domain === "theory" ? "이론" : "실습"} 학습 기록</p>
                <div className="progress-domain-tabs" aria-label="학습 유형">{(["theory", "practice"] as const).map(d => <button key={d} aria-pressed={domain === d} onClick={() => setParams({ section: room.section.id, domain: d })}>{d === "theory" ? "이론" : "실습"}</button>)}</div>
                {domain === "theory" ? <>

                <MyLearning key={room.section.id} sectionId={room.section.id} />
                <h3 className="progress-history-title">최근 제출 기록</h3>
                <ErrorNotice text={history.error} />
                {history.data?.items
                  .filter((s) => s.section_id === room.section.id)
                  .map((s) => (
                    <div className="progress-history-row" key={s.id}>
                      <span>{s.day}</span><span>{s.submitted}/{s.total}문항 제출</span>{" "}
                      <Link to={`/quiz/results/${s.id}`}>결과·해설 ↗</Link>
                    </div>
                  ))}
                {history.data && !history.data.items.some(s => s.section_id === room.section.id) && <Notice>아직 제출 기록이 없어요. 첫 학습부터 시작해 보세요.</Notice>}
                </> : <>
                  <div className="progress-practice-heading"><div><h3>개념별 실습과 복습</h3><p>수업에서 배운 개념을 적용한 기록과 다시 살펴볼 내용을 확인해요.</p></div><span className="progress-course-language">수업 언어 · {({ python: "Python", java: "Java", c: "C" } as { [key: string]: string })[room.course.teaching_language.toLowerCase()] || room.course.teaching_language}</span></div>
                  <div className="progress-practice-metrics"><div><span>제출한 문제</span><strong>—</strong></div><div><span>검증 완료</span><strong>—</strong></div><div><span>복습할 개념</span><strong>—</strong></div></div>
                  <div className="progress-practice-empty"><span aria-hidden="true">&lt;/&gt;</span><h3>실습 기록이 쌓일 공간이에요.</h3><p>문제 유형별 제출 결과와 오류 유형, 개념별 복습 상태를 확인할 수 있어요.</p><Link className="ln-cta" to={`/classrooms/${room.section.id}/practice`}>실습 시작하기 ↗</Link><small>실습 기록 API 연결 전 · 현재 표시할 기록 없음</small></div>
                  <div className="progress-practice-bottom"><h3>최근 실습 제출</h3><p>실습을 제출하면 개념과 문제 유형별로 기록을 확인할 수 있어요.</p></div>
                </>}
                <div className="progress-actions"><p>학습 기록은 학교의 공식 출결과 별개예요.</p><Link className="ln-cta" to={domain === "practice" ? `/classrooms/${room.section.id}/practice` : `/quiz?section=${room.section.id}`}>{domain === "practice" ? "실습 이어가기" : "퀴즈로 학습 이어가기"} ↗</Link></div>
              </section>
            )
          ) : (
            <Notice>
              {rooms.data
                ? active.length
                  ? "학습할 강의를 선택해 주세요."
                  : "수강 중인 강의를 등록하면 사용할 수 있어요."
                : "강의를 불러오는 중…"}
            </Notice>
          )}
        </div>
      </div>
    </section>
  );
}

export function Profile() {
  const { user, refresh } = useContext(Auth);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const saveProfile = async (payload: { major?: string; student_number?: string; avatar?: string | null }) => {
    setBusy(true); setError(""); setFeedback("");
    try {
      await api("/me/profile", { method: "PATCH", body: JSON.stringify(payload) });
      await refresh(); setEditing(false); setFeedback("프로필을 저장했어요.");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const role = user?.role === "student" ? "학생" : user?.role === "teacher" ? "교수" : "운영 담당자";
  return (
    <section className="student-home profile-page">
      <span className="student-eyebrow">YOUR LERNY ACCOUNT</span>
      <h1>내 정보</h1>
      <p className="profile-intro">나의 계정 정보를 확인하고 안전하게 관리하세요.</p>
      <ErrorNotice text={error} />
      {feedback && <p role="status" className="profile-feedback">{feedback}</p>}
      <div className="profile-grid">
        <section className="profile-identity">
          <div className="profile-avatar" aria-hidden="true">{user?.avatar ? <img src={user.avatar} alt="" /> : user?.display_name?.trim().slice(0, 1) || "L"}</div>
          <label className="profile-photo-control">{busy ? "저장 중…" : "사진 변경"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={async e => {
            const file = e.target.files?.[0]; e.target.value = "";
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) { setError("2MB 이하의 사진을 선택해 주세요."); return; }
            const reader = new FileReader();
            reader.onload = () => { void saveProfile({ avatar: String(reader.result) }); };
            reader.onerror = () => setError("사진을 읽지 못했어요. 다시 선택해 주세요.");
            reader.readAsDataURL(file);
          }} /></label>
          {user?.avatar && <button className="profile-photo-remove" disabled={busy} onClick={() => void saveProfile({ avatar: null })}>사진 삭제</button>}
          <p className="profile-photo-hint">JPG · PNG · WebP / 최대 2MB</p>
          <span className="profile-role">{role}</span>
          <h2>{user?.display_name}</h2>
          <p>Lerny에서 쌓아가는<br />나만의 배움과 이해.</p>
          <Link to="/home">내 홈으로 ↗</Link>
        </section>
        <div className="profile-details">
          <section className="profile-card">
            <span className="student-eyebrow">ACCOUNT DETAILS</span>
            <div className="profile-card-heading"><h2>계정 정보</h2><button className={editing ? "action-secondary" : "primary"} disabled={busy} onClick={() => setEditing(!editing)}>{editing ? "취소" : "정보 수정"}</button></div>
            <dl><div><dt>이름</dt><dd>{user?.display_name}</dd></div><div><dt>아이디</dt><dd>{user?.login_id}</dd></div><div><dt>계정 유형</dt><dd>{role}</dd></div><div><dt>전공</dt><dd>{user?.major || "미등록"}</dd></div><div><dt>학번</dt><dd>{user?.student_number || "미등록"}</dd></div></dl>
            {editing && <form className="profile-edit-form" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void saveProfile({ major: String(f.get("major") || ""), student_number: String(f.get("student_number") || "") }); }}>
              <label>전공<input name="major" defaultValue={user?.major || ""} maxLength={100} placeholder="예: 컴퓨터공학과" disabled={busy} /></label>
              <label>학번<input name="student_number" defaultValue={user?.student_number || ""} maxLength={40} placeholder="학번을 입력해 주세요" disabled={busy} /></label>
              <button className="ln-cta" disabled={busy}>{busy ? "저장 중…" : "변경 사항 저장"}</button>
            </form>}
          </section>
          <section className="profile-card profile-security">
            <div><span className="student-eyebrow">SECURITY</span><h2>비밀번호 관리</h2><p>계정을 보호할 새로운 비밀번호로 변경할 수 있어요.</p></div>
            <Link className="ln-cta" to="/change-password">비밀번호 변경 ↗</Link>
          </section>
        </div>
      </div>
    </section>
  );
}

export function ProfessorWorkspace({
  mode,
}: {
  mode: "materials" | "students";
}) {
  const courses = useLoad<{ items: Course[] }>("/courses");
  const terms = useLoad<{ items: Term[] }>("/terms");
  const [params, setParams] = useSearchParams();
  const selected =
    courses.data?.items.find((c) => c.id === params.get("course")) ||
    courses.data?.items[0];
  if (mode === "materials") return <section className="professor-material-hub">
    <Link to="/professor" className="teacher-course-back">← 담당 강의</Link>
    <header className="material-hub-heading"><span className="student-eyebrow">YOUR CLASS MATERIALS</span><h1>강의 자료 관리</h1><p>담당 강의의 자료를 확인하고, 새로운 수업 자료를 올리세요.</p></header>
    <ErrorNotice text={courses.error || terms.error} />
    {!courses.data && !courses.error && <Notice>담당 강의를 불러오고 있어요…</Notice>}
    {courses.data?.items.length === 0 && <div className="material-hub-empty"><h2>먼저 강의를 만들어 주세요.</h2><p>강의를 등록하면 이곳에서 수업 자료를 관리할 수 있어요.</p><Link to="/professor#create-course">강의 만들기 →</Link></div>}
    {selected && <>
      <div className="material-hub-course"><label>자료를 관리할 수업<select aria-label="자료를 관리할 수업" value={selected.id} onChange={e => setParams({ course: e.target.value })}>{courses.data?.items.map(c => <option key={c.id} value={c.id}>{c.title} · {terms.data?.items.find(t => t.id === c.term_id)?.name || (terms.error ? "학기 확인 불가" : terms.data ? "학기 미등록" : "학기 확인 중…")}</option>)}</select></label><Link to={`/professor/courses/${selected.id}?tab=materials`}>이 강의실로 이동 ↗</Link></div>
      <Materials key={selected.id} courseId={selected.id} teacher />
    </>}
  </section>;
  return <section className="professor-material-hub professor-student-hub">
    <Link to="/professor" className="teacher-course-back">← 담당 강의</Link>
    <header className="material-hub-heading"><span className="student-eyebrow">YOUR STUDENTS</span><h1>수강생 관리</h1><p>수업을 선택하면 아래에 해당 수업의 분반별 수강생이 표시됩니다.</p></header>
    <ErrorNotice text={courses.error || terms.error} />
    {!courses.data && !courses.error && <Notice>담당 강의를 불러오고 있어요…</Notice>}
    {courses.data?.items.length === 0 && <div className="material-hub-empty"><h2>아직 담당 강의가 없어요.</h2><p>강의를 만들고 분반을 등록하면 수강생을 확인할 수 있어요.</p><Link to="/professor#create-course">강의 만들기 →</Link></div>}
    {selected && <><div className="material-hub-course"><label>수강생을 확인할 수업<select aria-label="수강생을 확인할 수업" value={selected.id} onChange={e => setParams({course:e.target.value})}>{courses.data?.items.map(c => <option key={c.id} value={c.id}>{c.title} · {terms.data?.items.find(t => t.id === c.term_id)?.name || (terms.error ? "학기 확인 불가" : terms.data ? "학기 미등록" : "학기 확인 중…")}</option>)}</select></label><Link to={`/professor/courses/${selected.id}?tab=overview`}>이 강의실로 이동 ↗</Link></div><CourseStudentOverview key={selected.id} courseId={selected.id} /></>}
  </section>;
}
function CourseStudentOverview({courseId}:{courseId:string}) {
  const sections=useLoad<{items:Section[]}>(`/courses/${courseId}/sections`);
  return <div className="student-hub-sections"><div className="teacher-tab-heading"><div><h2>분반별 수강생</h2><p>승인과 분반 이동은 분반 관리에서 진행할 수 있어요.</p></div><Link to={`/professor/courses/${courseId}?tab=sections`}>분반 관리 →</Link></div><ErrorNotice text={sections.error}/>{!sections.data&&!sections.error&&<Notice>분반을 불러오는 중이에요…</Notice>}{sections.data?.items.length===0&&<div className="material-hub-empty"><h2>첫 분반을 만들어 주세요.</h2><p>분반을 등록하고 수강 코드를 안내하면 학생들이 참여할 수 있어요.</p><Link to={`/professor/courses/${courseId}?tab=sections`}>분반 등록하기 →</Link></div>}{sections.data?.items.map(section=><StudentRosterPreview key={section.id} section={section} courseId={courseId}/>)}</div>;
}
function StudentRosterPreview({section,courseId}:{section:Section;courseId:string}) {
  const roster=useLoad<{items:Enrollment[]}>(`/sections/${section.id}/enrollments`);
  const [search,setSearch]=useState("");
  const [status,setStatus]=useState("all");
  const items=roster.data?.items || [];
  const filtered=items.filter(e=>e.display_name.toLowerCase().includes(search.toLowerCase())&&(status==="all"||e.status===status));
  const statusName=(value:string)=>({active:"수강 중",pending:"승인 대기",transferred:"분반 이동",cancelled:"수강 취소"}[value]||value);
  return <section className="student-hub-roster"><div className="student-hub-roster-heading"><div><h3>{section.title}</h3><p>수강 중 <strong>{roster.data?items.filter(e=>e.status==="active").length:"—"}</strong>명<span>승인 대기 <strong>{roster.data?items.filter(e=>e.status==="pending").length:"—"}</strong>명</span></p></div><button onClick={roster.reload}>새로고침</button></div><ErrorNotice text={roster.error}/>{!roster.data&&!roster.error&&<Notice>수강생을 불러오는 중이에요…</Notice>}{roster.data&&<><div className="student-hub-roster-tools"><label>이름 검색<input type="search" placeholder="학생 이름으로 검색" value={search} onChange={e=>setSearch(e.target.value)}/></label><label>수강 상태<select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">전체</option><option value="active">수강 중</option><option value="pending">승인 대기</option><option value="transferred">분반 이동</option><option value="cancelled">수강 취소</option></select></label></div>{!items.length?<p className="student-hub-roster-empty">아직 참여한 학생이 없어요. 분반 관리에서 수강 코드를 발급해 안내하세요.</p>:!filtered.length?<p className="student-hub-roster-empty">조건에 맞는 학생이 없어요.</p>:<ul className="student-hub-roster-list">{filtered.map(e=><li key={e.id}><strong>{e.display_name}</strong><span className={e.status==="pending"?"is-pending":""}>{statusName(e.status)}</span></li>)}</ul>}<div className="student-hub-roster-footer"><span>{filtered.length}명 표시</span><Link to={`/professor/courses/${courseId}?tab=sections`}>수강 승인·분반 이동 →</Link></div></>}</section>;
}
