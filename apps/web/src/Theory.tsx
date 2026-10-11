import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, post, type Concept } from "./api";
import { ErrorNotice, Form, Notice, field, useLoad } from "./components";

type Attempt = {
  id: string;
  status: string;
  score: number | null;
  correct: boolean | null;
  appealed: boolean;
  feedback: {
    message: string;
    criteria?: { criterion: string; score: number }[];
  } | null;
};
type Question = {
  id: string;
  kind: string;
  prompt: string;
  options: string[];
  revision: number;
  status: string;
  attempt?: Attempt | null;
  explanation?: string;
  submitted_answer?: string;
  correct_option?: string;
  sources_current?: boolean;
  solution?: { explanation: string };
};
export type Daily = {
  id: string;
  section_id: string;
  day: string;
  items: Question[];
  shortage: number;
};
type AsyncJob = { id: string; status: string; error: { code: string } | null };

export function Theory({ sectionId }: { sectionId: string }) {
  const [data, setData] = useState<Daily>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async () => {
    setBusy(true);
    setError("");
    try {
      setData(await api<Daily>(`/sections/${sectionId}/daily`, post({})));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (!data?.items.some((q) => q.attempt?.status === "pending")) return;
    const timer = setInterval(() => {
      void api<Daily>(`/sections/${sectionId}/daily`, post({}))
        .then(setData)
        .catch((e) => setError(e.message));
    }, 3000);
    return () => clearInterval(timer);
  }, [data, sectionId]);
  return (
    <section className="panel">
      <span className="eyebrow">작은 학습, 꾸준한 이해</span>
      <h2>오늘의 이론 3문항</h2>
      <p>객관식 2문항과 서술형 1문항으로 복습해요. 성적에는 반영되지 않아요.</p>
      <button disabled={busy} onClick={() => void load()}>
        {data ? "제출·채점 상태 새로고침" : "오늘의 학습 시작·이어하기"}
      </button>
      <ErrorNotice text={error} />
      {!!data?.shortage && (
        <Notice>
          현재 준비된 문항이 부족해 {data.items.length}문항을 제공해요. 없는
          문제를 임의로 채우지 않아요.
        </Notice>
      )}
      {data?.items.map((q, index) => (
        <article className="quiz-card" key={q.id}>
          <small>
            {index + 1} / {data.items.length} ·{" "}
            {q.kind === "essay" ? "서술형" : "객관식"}
          </small>
          <h3>{q.prompt}</h3>
          {q.status !== "unavailable" && !q.attempt && (
            <Form
              label="답안 제출"
              onSubmit={async (f) => {
                await api(
                  `/learning-sessions/${data.id}/questions/${q.id}/submit`,
                  {
                    ...post({ answer: field(f, "answer") }),
                    headers: { "Idempotency-Key": `${data.id}:${q.id}` },
                  },
                );
                await load();
              }}
            >
              {q.kind === "mcq" ? (
                q.options.map((option, i) => (
                  <label className="check" key={i}>
                    <input type="radio" name="answer" value={i} required />
                    {option}
                  </label>
                ))
              ) : (
                <label>
                  내 설명
                  <textarea name="answer" maxLength={4000} required rows={4} />
                </label>
              )}
            </Form>
          )}
          {q.attempt && (
            <>
              <Notice>
                {q.attempt.status === "pending"
                  ? "로컬 AI가 채점 중이에요. 페이지를 나가도 기록은 남아요."
                  : q.attempt.feedback?.message || "검토 보류 중이에요."}
                {q.attempt.score !== null && ` (${q.attempt.score}점)`}
              </Notice>
              {q.attempt.feedback?.criteria?.map((c, i) => (
                <p key={i}>
                  {c.criterion} · {c.score}점
                </p>
              ))}
              {q.explanation && (
                <details>
                  <summary>해설 확인</summary>
                  <p>{q.explanation}</p>
                </details>
              )}
              {q.kind === "essay" &&
                q.attempt.status !== "pending" &&
                !q.attempt.appealed && (
                  <Form
                    label="자동 재검토 요청"
                    actionRole="secondary"
                    onSubmit={async () => {
                      await api(`/attempts/${q.attempt!.id}/appeal`, post({}));
                      await load();
                    }}
                  >
                    <small>답안당 한 번 재검토할 수 있어요.</small>
                  </Form>
                )}
            </>
          )}
        </article>
      ))}
      <MyLearning
        sectionId={sectionId}
        key={JSON.stringify(data?.items.map((q) => q.attempt?.status))}
      />
      <Notice>
        실습은 C·Java·Python을 지원할 예정이에요. 현재 PC의 격리 실행 환경 설정
        전까지 코드 제출·실행은 비활성화되어 있어요.
      </Notice>
    </section>
  );
}

export function MyLearning({ sectionId }: { sectionId: string }) {
  const r = useLoad<{
    items: {
      concept: string;
      valid_recent: number;
      correct_recent: number;
      mastered: boolean;
      review_due: string | null;
      review_session_id: string | null;
      review_question_id: string | null;
    }[];
  }>(`/sections/${sectionId}/my-learning`);
  return (
    <>
      <h3>개념별 이해와 복습</h3>
      {!r.data && !r.error && <Notice>개념별 기록을 불러오는 중이에요…</Notice>}
      {r.data?.items.length === 0 && <Notice>아직 등록된 개념이 없어요.</Notice>}
      <ErrorNotice text={r.error} />
      {r.data?.items.map((c) => (
        <div className="roster concept-learning-row" key={c.concept}>
          <strong>{c.concept}</strong>
          <span>
            {c.mastered
              ? "기준 충족"
              : c.valid_recent
                ? "학습 중"
                : "아직 학습 전"}
          </span>
          <span>
            독립 답안 {c.valid_recent}건 · 정답 {c.correct_recent}건
          </span>
          {c.review_due && <small>복습 권장 {c.review_due}</small>}
          {c.review_session_id && <Link className="concept-review-link" to={`/quiz/results/${c.review_session_id}#question-${c.review_question_id}`}>답안·해설 복습 ↗</Link>}
        </div>
      ))}
    </>
  );
}

export function QuestionBank({
  courseId,
  concepts,
}: {
  courseId: string;
  concepts: Concept[];
}) {
  const bank = useLoad<{ items: Question[] }>(`/courses/${courseId}/questions`);
  const [job, setJob] = useState<AsyncJob>();
  const [error, setError] = useState("");
  useEffect(() => {
    if (!job || !["queued", "running"].includes(job.status)) return;
    const timer = setInterval(() => {
      void api<AsyncJob>(`/jobs/${job.id}`)
        .then((j) => {
          setJob(j);
          if (j.status === "succeeded") bank.reload();
        })
        .catch((e) => setError(e.message));
    }, 3000);
    return () => clearInterval(timer);
  }, [job]);
  return (
    <section className="panel teacher-question-bank">
      <h2>이론 문항 관리</h2>
      <p>
        현재 공개된 자료로 객관식 2개·서술형 1개를 생성하고 근거와 정답을 다시
        검증해요.
      </p>
      <div className="teacher-question-create"><span className="student-eyebrow">GENERATE QUESTIONS</span><h3>수업 자료로 문항 만들기</h3><p>학습 개념을 선택하면 객관식 2개와 서술형 1개를 생성합니다.</p>
      <Form
        label="문항 3개 생성"
        onSubmit={async (f) => {
          const result = await api<{ job_id: string }>(
            `/courses/${courseId}/questions/generate`,
            {
              ...post({ concept_id: field(f, "concept") }),
              headers: { "Idempotency-Key": crypto.randomUUID() },
            },
          );
          setJob({ id: result.job_id, status: "queued", error: null });
        }}
      >
        <label>
          개념
          <select name="concept" required>
            <option value="">개념 선택</option>
            {concepts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </Form>
      </div>
      {job && (
        <Notice>
          {job.status === "succeeded"
            ? "문항 생성·검증 완료"
            : job.status === "failed"
              ? `문항을 공개하지 못했어요: ${job.error?.code}`
              : "자료를 읽고 문항을 생성·검증 중이에요."}
        </Notice>
      )}
      <ErrorNotice text={error || bank.error} />
      <div className="teacher-question-list-heading"><h3>등록된 문항 {bank.data && <small>{bank.data.items.length}개</small>}</h3><button onClick={bank.reload}>목록 새로고침</button></div>
      {!bank.data && !bank.error && <Notice>문항을 불러오는 중이에요…</Notice>}
      {bank.data?.items.length === 0 && <Notice>아직 등록된 문항이 없어요. 공개된 자료와 학습 개념을 준비하고 문항을 생성해 주세요.</Notice>}
      {bank.data?.items.map((q) => (
        <article className="quiz-card" key={q.id}>
          <small>
            {q.kind === "mcq" ? "객관식" : "서술형"} · {q.status === "active" ? "사용 중" : q.status === "stopped" ? "사용 중지" : q.status} ·{" "}
            {q.sources_current ? "현재 자료 근거" : "근거 갱신 필요"}
          </small>
          <h3>{q.prompt}</h3>
          {q.options.map((o, i) => (
            <p key={i}>
              {i + 1}. {o}
            </p>
          ))}
          <details>
            <summary>해설</summary>
            <p>{q.solution?.explanation}</p>
          </details>
          <Form
            label={q.status === "active" ? "문항 사용 중지" : "문항 다시 사용"}
            actionRole="secondary"
            onSubmit={async () => {
              await api(`/questions/${q.id}`, {
                method: "PATCH",
                headers: { "If-Match": String(q.revision) },
                body: JSON.stringify({
                  status: q.status === "active" ? "stopped" : "active",
                }),
              });
              bank.reload();
            }}
          >
            <span />
          </Form>
        </article>
      ))}
    </section>
  );
}

type Counts = {
  participation: number;
  valid: number;
  correct: number;
  accuracy: number | null;
  pending: number;
};
export function Analytics({ sectionId }: { sectionId: string }) {
  const [student, setStudent] = useState<string>();
  const r = useLoad<{
    summary: Counts;
    concepts: (Counts & { id: string; name: string })[];
    students: (Counts & { id: string; name: string })[];
  }>(`/sections/${sectionId}/analytics`);
  return (
    <section className="panel teacher-analytics-panel">
      <div className="teacher-analysis-toolbar"><span>선택한 분반의 이론 퀴즈 기록</span><div><button onClick={r.reload}>새로고침</button><a className="link-button" href={`/api/v1/sections/${sectionId}/analytics.csv`}>CSV 내려받기</a></div></div>
      <ErrorNotice text={r.error} />
      {!r.data && !r.error && <Notice>학습 분석을 불러오는 중이에요…</Notice>}
      {r.data && (
        <>
          <div className="teacher-analysis-metrics">{[["제출 답안", r.data.summary.participation, "건"], ["정답률 집계 답안", r.data.summary.valid, "건"], ["정답률", r.data.summary.accuracy ?? "—", "%"]].map(([label,value,unit]) => <div key={label}><span>{label}</span><strong>{value}<small>{unit}</small></strong></div>)}</div>
          {r.data.summary.participation === 0 && <Notice>아직 이론 퀴즈 참여 기록이 없어요. 학생들이 퀴즈를 제출하면 참여와 개념별 정답률이 표시됩니다.</Notice>}
          {r.data.summary.participation > 0 && <>
          <div className="teacher-review-priority"><h3>다음 수업에서 짚어볼 개념</h3><p>정답률 70% 미만인 개념을 낮은 순서로 보여드립니다. 답안 수와 함께 살펴보세요.</p>{r.data.concepts.filter(c=>c.valid>0 && c.accuracy!==null && c.accuracy<70).sort((a,b)=>a.accuracy!-b.accuracy!).slice(0,3).map(c=><div key={c.id}><strong>{c.name}</strong><span>{c.valid}개 답안 기준</span><b>{c.accuracy}%</b></div>)}{!r.data.concepts.some(c=>c.valid>0 && c.accuracy!==null && c.accuracy<70)&&<p>현재 기준에 해당하는 개념이 없습니다.</p>}</div>
          <h3>개념별 이해도</h3>
          <div className="teacher-concept-stats">{r.data.concepts.map(c=><div key={c.id}><strong>{c.name}</strong><span>정답 {c.correct} / 집계 {c.valid}</span><b>{c.accuracy === null ? "집계 전" : `${c.accuracy}%`}</b></div>)}</div>
          {r.data.concepts.length === 0 && <p className="teacher-panel-description">등록된 학습 개념이 없어요.</p>}
          <h3>학생별 학습 기록</h3>
          {r.data.students.length === 0 && <p className="teacher-panel-description">아직 분석할 학생 기록이 없어요.</p>}
          {r.data.students.length > 0 && <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>학생</th>
                  <th>제출 답안 (건)</th>
                  <th>정답률 집계 (건)</th>
                  <th>정답률</th>
                  <th>대기·보류 (건)</th>
                </tr>
              </thead>
              <tbody>
                {r.data.students.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <button onClick={() => setStudent(s.id)}>{s.name}</button>
                    </td>
                    <td>{s.participation}</td>
                    <td>{s.valid}</td>
                    <td>{s.accuracy ?? "—"}%</td>
                    <td>{s.pending}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
          <small>
            분반 이동 전 제출은 원래 분반에 남아요. 대기·보류와 동일 문항
            재학습은 정답률 분모에서 제외돼요.
          </small>
          </>}
        </>
      )}
      {student && <StudentDetail sectionId={sectionId} studentId={student} />}
    </section>
  );
}

function StudentDetail({
  sectionId,
  studentId,
}: {
  sectionId: string;
  studentId: string;
}) {
  const r = useLoad<{
    items: (Attempt & { question: string; answer: string; concept: string })[];
  }>(`/sections/${sectionId}/students/${studentId}/learning`);
  return (
    <section>
      <h3>학생 답안 상세</h3>
      <ErrorNotice text={r.error} />
      {r.data?.items.map((a) => (
        <article className="quiz-card" key={a.id}>
          <small>
            {a.concept} ·{" "}
            {a.status === "graded"
              ? "채점 완료"
              : a.status === "pending"
                ? "채점 대기"
                : "검토 보류"}
          </small>
          <h4>{a.question}</h4>
          <p>{a.answer}</p>
          <p>{a.feedback?.message}</p>
        </article>
      ))}
    </section>
  );
}

export function HeldAttempts({ courseId }: { courseId: string }) {
  const r = useLoad<{
    items: {
      id: string;
      student: string;
      question: string;
      answer: string;
      criteria: string[];
    }[];
  }>(`/courses/${courseId}/held-attempts`);
  return (
    <section className="panel">
      <h2>서술형 검토 보류</h2>
      <p>
        자동 채점이 불확실한 답안만 표시해요. 보류는 오답으로 집계하지 않아요.
      </p>
      <button onClick={r.reload}>보류 목록 새로고침</button>
      <ErrorNotice text={r.error} />
      {r.data?.items.length === 0 && (
        <Notice>검토를 기다리는 답안이 없어요.</Notice>
      )}
      {r.data?.items.map((a) => (
        <article className="quiz-card" key={a.id}>
          <h3>
            {a.student} · {a.question}
          </h3>
          <blockquote>{a.answer}</blockquote>
          <Form
            label="검토 결과 반영"
            onSubmit={async (f) => {
              await api(
                `/attempts/${a.id}/resolve`,
                post({
                  scores: a.criteria.map((_, i) =>
                    Number(field(f, "score" + i)),
                  ),
                  reason: field(f, "reason"),
                }),
              );
              r.reload();
            }}
          >
            {a.criteria.map((criterion, i) => (
              <label key={i}>
                {criterion}
                <select name={"score" + i} required>
                  <option value="">판정 선택</option>
                  <option value="100">완전 충족</option>
                  <option value="50">부분 충족</option>
                  <option value="0">미충족</option>
                </select>
              </label>
            ))}
            <label>
              검토 사유
              <textarea name="reason" minLength={5} maxLength={1000} required />
            </label>
          </Form>
        </article>
      ))}
    </section>
  );
}
