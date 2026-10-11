import { useEffect, useState } from "react";
import { api, post, type Answer, type Job, type Material } from "./api";
import { ErrorNotice, Form, Notice, field, useLoad } from "./components";

const labels: Record<string, string> = {
  queued: "처리 대기",
  running: "처리 중",
  ready: "검색 준비 완료",
  failed: "처리 실패",
  needs_review: "텍스트 확인 필요",
};
function materialState(m: Material) {
  if (m.version?.status === "failed") return { text: "자료 처리 실패", tone: "failed", hint: "파일 내용을 읽지 못했어요. 더보기에서 텍스트를 확인하거나 수정본을 올려주세요." };
  if (m.version?.status === "needs_review") return { text: "텍스트 확인 필요", tone: "failed", hint: "추출한 내용을 확인해야 준비를 이어갈 수 있어요." };
  if (m.version?.status !== "ready") return { text: "자료 준비 중", tone: "pending", hint: "" };
  if (m.visibility !== "public") return { text: "비공개 보관", tone: "neutral", hint: "" };
  if (["past_exam", "answer", "transcript"].includes(m.kind)) return { text: "참고 자료", tone: "neutral", hint: "" };
  if (m.learning_status === "ready") return { text: "학습 가능", tone: "ready", hint: "" };
  if (m.learning_status === "failed") return { text: "학습 준비 실패", tone: "failed", hint: "자동 생성을 완료하지 못했어요. 다시 시도해 주세요." };
  return { text: "학습 준비 중", tone: "pending", hint: "" };
}
export function Materials({
  courseId,
  teacher = false,
}: {
  courseId: string;
  teacher?: boolean;
}) {
  const list = useLoad<{ items: Material[] }>(
    "/courses/" + courseId + "/materials",
  );
  const [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const [editing, setEditing] = useState<{
    id: string;
    text: string;
    revision: number;
  } | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [kind, setKind] = useState("lecture"),
    [visibility, setVisibility] = useState("public");
  useEffect(() => {
    if (!list.data?.items.some(m => ["queued","running"].includes(m.version?.status || "") || m.learning_status === "generating")) return;
    const timer = setInterval(list.reload, 5000);
    return () => clearInterval(timer);
  }, [list.data]);
  const run = async (fn: () => Promise<void>) => {
    setError("");
    try {
      await fn();
      list.reload();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <div className={teacher ? "materials-manager teacher-materials" : "materials-manager"}>
      <div className="row materials-heading">
        <div><h2>강의 자료 {list.data && <span className="materials-count">{list.data.items.length}</span>}</h2><p>{teacher ? "자료를 올리면 개념과 이론 문항을 자동으로 준비해요." : "우리 수업의 자료를 확인하세요."}</p></div>
        {teacher ? <button className="materials-add" aria-expanded={uploadOpen} aria-controls="material-upload" onClick={() => setUploadOpen(!uploadOpen)}>{uploadOpen ? "업로드 닫기" : "+ 자료 올리기"}</button> : <button onClick={list.reload}>상태 새로고침</button>}
      </div>
      <ErrorNotice text={error || list.error} />
      {message && <Notice>{message}</Notice>}
      <div className="materials">
        {!list.data && !list.error && <Notice>자료를 불러오는 중이에요…</Notice>}
        {list.data?.items.length === 0 && <div className="materials-empty"><span aria-hidden="true">▤</span><h3>아직 등록된 자료가 없어요.</h3><p>{teacher ? "수업 자료를 올리면 이곳에서 공개 여부와 처리 상태를 확인할 수 있어요." : "공개된 수업 자료가 이곳에 표시돼요."}</p></div>}
        {list.data?.items.map((m) => (
          <article className="material" key={m.id}>
            <div>
              <small className="material-meta">
                {m.week}주차 ·{" "}
                {m.visibility === "public" ? "수강생 공개" : "비공개"}
              </small>
              <h3>{m.title}</h3>
              {!teacher && <span className={`material-processing material-processing-${m.version?.status || "unknown"}`}>{labels[m.version?.status || ""] || "처리 중"}</span>}
            </div>
            {teacher && <div className="material-state"><span className={`material-processing material-state-${materialState(m).tone}`}>{materialState(m).text}</span>{materialState(m).hint && <p>{materialState(m).hint}</p>}{m.learning_status === "failed" && m.version?.status === "ready" && m.visibility === "public" && ["lecture", "example", "assignment"].includes(m.kind) && <button onClick={() => void run(async () => { await api(`/materials/${m.id}/learning`, post({})); })}>다시 시도</button>}</div>}
            <details className={teacher ? "material-more" : "material-student-download"} open={teacher ? undefined : true}>
              {teacher && <summary aria-label={`${m.title} 더보기`}>더보기 <span aria-hidden="true">⌄</span></summary>}
            <div className="actions">
              <a href={"/api/v1/materials/" + m.id + "/file"}>원본 받기</a>
              {teacher && (
                <>
                  <button
                    onClick={() =>
                      void run(async () => {
                        await api("/materials/" + m.id + "/access", {
                          method: "PATCH",
                          headers: { "If-Match": String(m.revision) },
                          body: JSON.stringify({
                            visibility:
                              m.visibility === "public" ? "private" : "public",
                            internal_use: m.internal_use,
                          }),
                        });
                      })
                    }
                  >
                    {m.visibility === "public" ? "비공개로 전환" : "공개하기"}
                  </button>
                  <button
                    onClick={() =>
                      void run(async () => {
                        const r = await api<{ text: string; revision: number }>(
                          "/materials/" + m.id + "/transcript",
                        );
                        setEditing({ id: m.id, ...r });
                      })
                    }
                  >
                    추출 텍스트 확인
                  </button>
                  <label className="file-replace">
                    수정본 업로드
                    <input
                      type="file"
                      accept=".pdf,.pptx,.docx,.txt,.md,.c,.java,.py"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file)
                          void run(async () => {
                            const f = new FormData();
                            f.append("file", file);
                            await api("/materials/" + m.id + "/versions", {
                              method: "POST",
                              headers: { "If-Match": String(m.revision) },
                              body: f,
                            });
                          });
                      }}
                    />
                  </label>
                </>
              )}
            </div>
            </details>
          </article>
        ))}
      </div>
      {editing && (
        <section className="panel materials-editor">
          <h2>추출 텍스트 수정</h2>
          <Form
            label="새 버전으로 저장"
            onSubmit={async (f) => {
              await api("/materials/" + editing.id + "/transcript", {
                method: "PUT",
                headers: { "If-Match": String(editing.revision) },
                body: JSON.stringify({ text: field(f, "text") }),
              });
              setEditing(null);
              list.reload();
            }}
          >
            <label>
              텍스트
              <textarea
                name="text"
                rows={12}
                defaultValue={editing.text}
                required
              />
            </label>
          </Form>
          <button onClick={() => setEditing(null)}>닫기</button>
        </section>
      )}
      {teacher && uploadOpen && (
        <section id="material-upload" className="panel materials-upload">
          <h2>강의 자료 올리기</h2><p className="materials-upload-intro">파일과 주차만 확인하세요. 기본 설정은 수강생 공개입니다.</p>
          <Form
            label="자료 올리기"
            onSubmit={async (f) => {
              await api("/courses/" + courseId + "/materials", {
                method: "POST",
                body: f,
              });
              setMessage(
                "자료를 저장했어요. 공개된 강의 자료는 개념 추출과 학습 문항 생성이 자동으로 이어집니다.",
              );
              setUploadOpen(false);
              list.reload();
            }}
          >
            <label>
              파일
              <input
                type="file"
                name="file"
                accept=".pdf,.pptx,.docx,.txt,.md,.c,.java,.py"
                required
              />
            </label>
              <label>
                주차
                <input
                  type="number"
                  name="week"
                  min="1"
                  max="52"
                  defaultValue="1"
                  required
                />
              </label>
            <details className="material-upload-options"><summary>자료 종류·공개 범위 설정</summary>
            <div className="columns">
              <label>
                자료 종류
                <select
                  name="kind"
                  value={kind}
                  onChange={(e) => {
                    const v = e.target.value;
                    setKind(v);
                    setVisibility(
                      ["answer", "transcript", "past_exam"].includes(v)
                        ? "private"
                        : "public",
                    );
                  }}
                >
                  {[
                    ["lecture", "강의 자료"],
                    ["example", "예제 코드"],
                    ["assignment", "과제 안내"],
                    ["transcript", "녹취록"],
                    ["past_exam", "기출"],
                    ["answer", "정답·해설"],
                  ].map(([id, t]) => (
                    <option key={id} value={id}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                학생 공개
                <select
                  name="visibility"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                >
                  <option value="public">수강생에게 공개</option>
                  <option value="private">비공개</option>
                </select>
              </label>
              <label>
                내부 AI 활용
                <select name="internal_use">
                  <option value="none">사용하지 않음</option>
                  <option value="validation_grading">
                    검증·채점 기준 전용
                  </option>
                </select>
              </label>
            </div>
            </details>
            <p className="muted">
              음성·스캔 문서는 전사/OCR 연결 전입니다. 텍스트 문서로 변환해
              주세요. 정답·해설은 공개 범위를 확인해 주세요.
            </p>
          </Form>
        </section>
      )}
    </div>
  );
}

export function Chat({ sectionId }: { sectionId: string }) {
  const [historyLoading, setHistoryLoading] = useState(true);
  const [thread, setThread] = useState<string>(),
    [job, setJob] = useState<string>();
  const [items, setItems] = useState<
    { question: string; answer?: Answer; error?: string }[]
  >([]);
  useEffect(() => {
    let active = true;
    setHistoryLoading(true);
    setItems([]);
    setThread(undefined);
    setJob(undefined);
    api<{
      thread_id: string | null;
      job_id: string | null;
      items: { question: string; answer?: Answer; error?: string }[];
    }>(`/sections/${sectionId}/chat/history`)
      .then((r) => {
        if (active) {
          setItems(r.items);
          setThread(r.thread_id || undefined);
          setJob(r.job_id || undefined);
        }
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      })
      .catch((e) => {
        if (active)
          setItems([{ question: "대화 기록 불러오기", error: e.message }]);
      });
    return () => {
      active = false;
    };
  }, [sectionId]);
  useEffect(() => {
    if (!job) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const r = await api<Job>("/jobs/" + job);
        if (stopped) return;
        if (["succeeded", "failed", "cancelled"].includes(r.status)) {
          setItems((old) =>
            old.map((x, i) =>
              i === old.length - 1
                ? {
                    ...x,
                    answer: r.result || undefined,
                    error: r.error
                      ? "답변 처리에 실패했어요. 다시 질문해 주세요."
                      : r.status === "cancelled"
                        ? "취소됐어요."
                        : undefined,
                  }
                : x,
            ),
          );
          setJob(undefined);
        } else timer = setTimeout(poll, 2000);
      } catch (e) {
        if (!stopped) {
          setItems((old) =>
            old.map((x, i) =>
              i === old.length - 1 ? { ...x, error: (e as Error).message } : x,
            ),
          );
          setJob(undefined);
        }
      }
    };
    void poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [job]);
  return (
    <section className="panel chat">
      <span className="eyebrow">수업 자료에 물어보기</span>
      <h2>어떤 부분이 궁금한가요?</h2>
      <button
        type="button"
        disabled={!!job}
        onClick={() => {
          setItems([]);
          setThread(undefined);
        }}
      >
        새 대화
      </button>
      <p className="muted">
        현재는 공개 자료의 확인된 원문을 찾아 답합니다. 자료 밖 지식을 덧붙이지
        않아요.
      </p>
      <div className="chat-messages" aria-live="polite">
        {historyLoading && (
          <p className="chat-loading" role="status">
            이전 대화를 불러오는 중이에요…
          </p>
        )}
        {!historyLoading && items.length === 0 && (
          <div className="chat-welcome">
            <span className="chat-welcome-icon" aria-hidden="true">
              ?
            </span>
            <h3>이해는 질문에서 시작돼요.</h3>
            <p>
              궁금한 개념이나 이해되지 않는 부분을 적어 주세요.
              <br />
              공개된 강의 자료에서 답변의 근거를 찾아볼게요.
            </p>
            <span className="chat-source-note">
              강의 자료 기반 답변 · 출처 함께 확인
            </span>
          </div>
        )}
        {items.map((item, i) => (
          <article key={i} className="conversation">
            <strong>나 · {item.question}</strong>
            {item.answer ? (
              <>
                <p className="answer">{item.answer.answer}</p>
                {item.answer.citations?.map((c, n) => (
                  <a
                    key={n}
                    href={
                      "/api/v1/materials/" +
                      c.material_id +
                      "/file?version_id=" +
                      c.version_id
                    }
                  >
                    {c.title} ·{" "}
                    {Object.entries(c.locator)
                      .map(([k, v]) => `${k} ${v}`)
                      .join(" / ")}
                  </a>
                ))}
              </>
            ) : item.error ? (
              <ErrorNotice text={item.error} />
            ) : (
              <p>공개 자료에서 근거를 확인하고 있어요…</p>
            )}
          </article>
        ))}
      </div>
      <Form
        label="질문하기"
        onSubmit={async (f) => {
          if (job) throw new Error("이전 답변을 기다려 주세요.");
          const question = field(f, "message");
          const r = await api<{ job_id: string; thread_id: string }>(
            "/sections/" + sectionId + "/chat/messages",
            {
              ...post({ thread_id: thread, message: question }),
              headers: { "Idempotency-Key": crypto.randomUUID() },
            },
          );
          setThread(r.thread_id);
          setItems((v) => [...v, { question }]);
          setJob(r.job_id);
        }}
      >
        <label>
          질문
          <textarea
            name="message"
            placeholder="수업에서 어떤 부분이 궁금했나요?"
            rows={3}
            maxLength={4000}
            required
            disabled={!!job}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
        </label>
      </Form>
    </section>
  );
}
