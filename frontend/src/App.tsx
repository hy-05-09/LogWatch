import { useMemo, useState } from "react";
import "./App.css";
import { SAMPLE_LOW, SAMPLE_MED, SAMPLE_HIGH } from "./sample.ts";

type SignalItem = NonNullable<AnalyzeResponse["signals"]>[number];
type ActionItem = NonNullable<AnalyzeResponse["recommended_actions"]>[number];
type EvidenceItem = NonNullable<AnalyzeResponse["evidence"]>[number];

function Chip({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "info" | "warn" | "danger";
}) {
  return <span className={`chip chip--${tone}`}>{children}</span>;
}

function Pill({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <span className="pill">
      <span className="pill__label">{label}</span>
      <span className="pill__value">{value ?? "-"}</span>
    </span>
  );
}

function EmptyState({
  title,
  desc,
}: {
  title: string;
  desc?: string;
}) {
  return (
    <div className="empty">
      <div className="empty__title">{title}</div>
      {desc && <div className="empty__desc">{desc}</div>}
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="sectionHeader">
      <div>
        <div className="sectionHeader__title">{title}</div>
        {subtitle && <div className="sectionHeader__sub">{subtitle}</div>}
      </div>
      {right && <div className="sectionHeader__right">{right}</div>}
    </div>
  );
}


function severityTone(weight?: number) {
  if (typeof weight !== "number") return "neutral";
  if (weight >= 35) return "danger"; 
  if (weight >= 20) return "warn";   
  return "info";                     
}

function SignalCard({ s, idx }: { s: SignalItem; idx: number }) {
  const key = s.key ?? `signal-${idx}`;
  const tone = severityTone(s.weight);
  return (
    <div className="itemCard">
      <div className="itemCard__top">
        <div className="itemCard__title">{key}</div>
        <div className="itemCard__meta">
          <Chip tone={tone}>
            severity {typeof s.weight === "number" ? s.weight.toFixed(2) : "—"}
          </Chip>
        </div>
      </div>
      {s.reason && <div className="itemCard__body">{s.reason}</div>}
    </div>
  );
}

function ActionCard({ a, idx }: { a: ActionItem; idx: number }) {
  const title = a.action ?? `action-${idx}`;
  const pr = (a.priority ?? "").toUpperCase();
  const tone =
    pr.includes("P0") ? "danger" : pr.includes("P1") ? "warn" : pr.includes("P2") ? "info" : "neutral";

  return (
    <div className="itemCard">
      <div className="itemCard__top">
        <div className="itemCard__title">{title}</div>
        <div className="itemCard__meta">
          <Chip tone={tone}>{a.priority ?? "priority —"}</Chip>
        </div>
      </div>
      {a.why && <div className="itemCard__body">{a.why}</div>}
    </div>
  );
}

function EvidenceCard({ ev, idx }: { ev: EvidenceItem; idx: number }) {
  const title = ev.title ?? ev.doc_id ?? `doc-${idx}`;
  const hasQuote = !!ev.quote?.trim();

  return (
    <div className="evidenceCard">
      <div className="evidenceCard__header">
        <div className="evidenceCard__title">{title}</div>
        <div className="evidenceCard__right">
          <Chip tone="neutral">
            {typeof ev.distance === "number"
              ? `Vector dist ${ev.distance.toFixed(4)}`
              : "BM25 match"}
          </Chip>
        </div>
      </div>

      <div className="evidenceCard__metaRow">
        <Pill label="section" value={ev.section ?? "-"} />
        <Pill label="page" value={ev.page ?? "-"} />
        <Pill label="chunk" value={ev.chunk_id ?? "-"} />
      </div>

      <div className="evidenceCard__quote">
        {hasQuote ? <CollapsibleQuote quote={ev.quote} /> : <span style={{ color: "#666" }}>(no quote)</span>}
      </div>
    </div>
  );
}


type AnalyzeResponse = {
  request_id?:string;
  summary?: {
    risk_score: number;
    risk_level: "LOW" | "MED" | "HIGH";
    decision: "ALLOW" | "REVIEW" | "ESCALATE";
  };
  signals?: Array<{
    key?: string;
    value?: unknown;
    weight?: number;
    reason?: string;
  }>;
  recommended_actions?: Array<{
    action?: string;
    priority?: string;
    why?: string;
  }>;
  evidence?: Array<{
    title?: string;
    doc_id?: string;
    section?: string;
    page?: number | null;
    chunk_id?: string;
    quote?: string;
    distance?: number;
  }>;
  debug?: unknown;
};

type View = "overview" | "signals" | "evidence";


// 긴 문자열 n글자까지만 잘라서 미리보기
function clampStr(s: string, n: number) {
  if (!s) return "";
  return s.length <= n ? s : s.slice(0, n) + "…";
}

function RiskBadge({ level }: { level?: string }) {
  const style = useMemo(() => {
    const base: React.CSSProperties = {
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
      border: "1px solid #ddd",
    };
    if (level === "HIGH") return { ...base, background: "#ffe8e8", borderColor: "#ffb3b3" };
    if (level === "MED") return { ...base, background: "#fff3d6", borderColor: "#ffd27a" };
    if (level === "LOW") return { ...base, background: "#e9f7ef", borderColor: "#9ad7b0" };
    return base;
  }, [level]);

  return <span style={style}>{level ?? "UNKNOWN"}</span>;
}

function CollapsibleQuote({ quote }: { quote?: string }) {
  const [open, setOpen] = useState(false);
  const text = quote ?? "";
  const short = clampStr(text, 220);

  if (!text) return <span style={{ color: "#666" }}>(no quote)</span>;

  return (
    <div>
      <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.4 }}>
        {open ? text : short}
      </div>
      {text.length > 220 && (
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            marginTop: 6,
            fontSize: 12,
            border: "none",
            background: "transparent",
            color: "#0b57d0",
            cursor: "pointer",
            padding: 0,
          }}
        >
          {open ? "접기" : "더보기"}
        </button>
      )}
    </div>
  );
}

function NavItem({
  label,
  active,
  disabled,
  onClick,
}:{
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width:"100%",
        textAlign:"left",
        padding: "10px 12px",
        marginBottom: 6,
        borderRadius:10,
        border: "1px solid #ddd",
        background: active ? "#f0f6ff" : "#fff",
        fontWeight: 80,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {label}
    </button>
  );
}

export default function App() {
  const [input, setInput] = useState<string>("로그를 입력하세요.");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [resp, setResp] = useState<AnalyzeResponse | null>(null);
  const [view, setView] = useState<View>("overview");
  const [retrievalMode, setRetrievalMode] = useState<"vector" | "hybrid">("hybrid");
  const [sigQuery, setSigQuery] = useState("");
  const [actQuery, setActQuery] = useState("");
  const [evQuery, setEvQuery] = useState("");
  const [evOnlyQuoted, setEvOnlyQuoted] = useState(false);
  const [evSort, setEvSort] = useState<"distance" | "title">("distance");



  const onSample = (which: "low" | "med" | "high") => {
    setView("overview");
    setError("");
    setResp(null);
    if (which === "low") setInput(SAMPLE_LOW);
    if (which === "med") setInput(SAMPLE_MED);
    if (which === "high") setInput(SAMPLE_HIGH);
  };

  
  const onAnalyze = async () => {
    setView("overview");
    setError("");
    setResp(null);

    let payload: any;
    try {
      payload = JSON.parse(input);
    } catch (e) {
      setError("JSON 파싱 실패: 입력 JSON 형식을 확인해주세요.");
      return;
    }

    payload = {
      ...payload,
      context: {
        ...(payload.context ?? {}),
        retrieval_mode: retrievalMode,
      },
    };

    setLoading(true);
    try {
      const r = await fetch("http://127.0.0.1:8000/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await r.text();
      if (!r.ok) {
        setError(`HTTP ${r.status}: ${text}`);
        return;
      }

      const data = JSON.parse(text) as AnalyzeResponse;
      console.log("AnalyzeResponse:", data);
      setResp(data);
    } catch (e: any) {
      setError(`요청 실패: ${e?.message ?? String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const summary = resp?.summary;
  const signals = resp?.signals ?? [];
  const actions = resp?.recommended_actions ?? [];
  const evidence = resp?.evidence ?? [];

    const filteredSignals = useMemo(() => {
    const q = sigQuery.trim().toLowerCase();
    if (!q) return signals;
    return signals.filter((s) =>
      [s.key, s.reason].some((x) => (x ? String(x).toLowerCase().includes(q) : false))
    );
  }, [signals, sigQuery]);

  const filteredActions = useMemo(() => {
    const q = actQuery.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((a) =>
      [a.action, a.priority, a.why].some((x) => (x ? String(x).toLowerCase().includes(q) : false))
    );
  }, [actions, actQuery]);

  const filteredEvidence = useMemo(() => {
    let list = evidence;
    const q = evQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((ev) =>
        [ev.title, ev.doc_id, ev.section, ev.chunk_id, ev.quote].some((x) =>
          x ? String(x).toLowerCase().includes(q) : false
        )
      );
    }
    if (evOnlyQuoted) {
      list = list.filter((ev) => (ev.quote ?? "").trim().length > 0);
    }
    if (evSort === "distance") {
      list = [...list].sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
    } else {
      list = [...list].sort((a, b) => String(a.title ?? a.doc_id ?? "").localeCompare(String(b.title ?? b.doc_id ?? "")));
    }
    return list;
  }, [evidence, evQuery, evOnlyQuoted, evSort]);


  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 5, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto" }}>
      <h1 style={{ margin: 0 }}>LogWatch AI</h1>
      <p style={{ marginTop: 12, color: "#555", fontSize: 13}}>
        사내 시스템 로그인 로그를 입력하면, 보안 정책 문서를 검색해 위험도와 권장 조치를 제안하고, <br />
        근거까지 제공하는 보안 운영 의사결정 보조 AI Agent입니다. 
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 30}}>
        <div style={{flex:1}}/>


        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button className="btn btn--sample" onClick={() => onSample("low")}>샘플 LOW</button>
          <button className="btn btn--sample" onClick={() => onSample("med")}>샘플 MED</button>
          <button className="btn btn--sample" onClick={() => onSample("high")}>샘플 HIGH</button>
        </div>

        <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn--nav" onClick={onAnalyze} disabled={loading} style={{ fontWeight: 700 }}>
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </div>
      </div>

      <div style={{display: "flex", gap:16, marginTop: 0, alignItems: "flex-start"}}>
        {/* Sidebar */}
        <aside
        style={{
          width: 200,
          position: "sticky",
          top: 16,
          alignSelf: "flex-start",
          border: "1px solid #e5e5e5",
          borderRadius: 12,
          background: "#fff",
          padding: 10,
          marginTop: 10,
        }}>
          <div style={{fontWeight: 800, fontSize: 12, color: "#666", marginBottom: 8}}>
            Sections
          </div>

          <NavItem label="Overview" active={view === "overview"} onClick={() => setView("overview")}/>
          <NavItem 
            label={`Signals & Actions${resp ? ` (${signals.length}/${actions.length})` : ""}`}
            active={view === "signals"}
            onClick={() => setView("signals")}
            disabled={!resp}
          />
          <NavItem
            label={`Evidence${resp ? ` (${evidence.length})` : ""}`}
            active={view === "evidence"}
            onClick={() => setView("evidence")}
            disabled={!resp}
          />
          <div style={{ borderTop: "1px solid #eee", marginTop: 12, paddingTop: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 12, color: "#666", marginBottom: 8 }}>
              Retrieval Mode
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
              <input
                type="radio"
                name="retrievalMode"
                checked={retrievalMode === "hybrid"}
                onChange={() => setRetrievalMode("hybrid")}
              />
              Hybrid (BM25 + Vector)
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginTop: 6 }}>
              <input
                type="radio"
                name="retrievalMode"
                checked={retrievalMode === "vector"}
                onChange={() => setRetrievalMode("vector")}
              />
              Vector only
            </label>

            {/* 선택: 현재 선택값 표시(디버깅/데모용) */}
            {/* <div style={{ marginTop: 8, fontSize: 11, color: "#888" }}>
              Current: <b>{retrievalMode}</b>
            </div> */}
          </div>
        </aside>

        {/* Content */}
        <main style={{flex:1, minWidth:0}}>
            <div style={{width: 980, maxWidth: "100%"}}>
              {view === "overview" && (
                <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 16, marginTop: 10 }}>
                  {/* Input */}
                  <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 12, background: "#fff" }}>
                    <div style={{ fontWeight: 800, marginBottom: 8 }}>Input JSON</div>
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        spellCheck={false}
                        style={{
                          width: "95%",
                          height: 420,
                          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                          fontSize: 12.5,
                          lineHeight: 1.4,
                          padding: 12,
                          borderRadius: 10,
                          border: "1px solid #ddd",
                          resize: "vertical",
                        }}
                      />
                      {error && (
                        <div style={{ marginTop: 10, padding: 10, background: "#ffe8e8", border: "1px solid #ffb3b3", borderRadius: 10 }}>
                          <b>에러</b>
                          <div style={{ whiteSpace: "pre-wrap" }}>{error}</div>
                        </div>
                      )}
                    </div>

                  {/* Summary */}
                  <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 12, background: "#fff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                      <div style={{ fontWeight: 800 }}>Summary</div>
                      <RiskBadge level={summary?.risk_level} />
                    </div>

                    {resp ? (
                      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                        <div><b>risk_score</b>: {summary?.risk_score ?? "-"}</div>
                        <div><b>risk_level</b>: {summary?.risk_level ?? "-"}</div>
                        <div><b>decision</b>: {summary?.decision ?? "-"}</div>
                      </div>
                    ) : (
                      <div style={{ marginTop: 10, color: "#666" }}>Analyze를 누르면 결과가 표시됩니다.</div>
                    )}
                  </div>
                </div>
              )}

              {/* Signals / Actions */}
              {view === "signals" && (
                <div className="tabGrid">
                  <section className="panel">
                    <SectionHeader
                      title={`Signals (${filteredSignals.length}/${signals.length})`}
                      // subtitle="리스크 판단에 사용된 신호들"
                      right={
                        <input
                          className="search"
                          value={sigQuery}
                          onChange={(e) => setSigQuery(e.target.value)}
                          placeholder="signals 검색 (key / reason)"
                        />
                      }
                    />

                    {signals.length === 0 ? (
                      <EmptyState title="Signals가 없습니다" desc="LOW 케이스거나, 아직 분석 전일 수 있어요." />
                    ) : filteredSignals.length === 0 ? (
                      <EmptyState title="검색 결과가 없습니다" desc="검색어를 지우거나 다른 키워드를 입력해보세요." />
                    ) : (
                      <div className="cardList">
                        {filteredSignals.map((s, i) => (
                          <SignalCard key={`${s.key ?? "sig"}-${i}`} s={s} idx={i} />
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="panel">
                    <SectionHeader
                      title={`Recommended Actions (${filteredActions.length}/${actions.length})`}
                      // subtitle="즉시 실행/검토 권장 조치"
                      right={
                        <input
                          className="search"
                          value={actQuery}
                          onChange={(e) => setActQuery(e.target.value)}
                          placeholder="actions 검색 (action / priority / why)"
                        />
                      }
                    />

                    {actions.length === 0 ? (
                      <EmptyState title="권장 조치가 없습니다" desc="정책 근거가 부족하거나, LOW 판단일 수 있어요." />
                    ) : filteredActions.length === 0 ? (
                      <EmptyState title="검색 결과가 없습니다" desc="검색어를 지우거나 다른 키워드를 입력해보세요." />
                    ) : (
                      <div className="cardList">
                        {filteredActions.map((a, i) => (
                          <ActionCard key={`${a.action ?? "act"}-${i}`} a={a} idx={i} />
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              )}


                {/* Evidence */}
              {view === "evidence" && (
                <section className="panel" style={{ marginTop: 16 }}>
                  <SectionHeader
                    title={`Evidence (${filteredEvidence.length}/${evidence.length})`}
                    subtitle="판단 근거로 사용된 문서 스니펫"
                    right={
                      <div className="evControls">
                        <input
                          className="search"
                          value={evQuery}
                          onChange={(e) => setEvQuery(e.target.value)}
                          placeholder="evidence 검색 (title / section / quote ...)"
                        />

                        <label className="toggle">
                          <input
                            type="checkbox"
                            checked={evOnlyQuoted}
                            onChange={(e) => setEvOnlyQuoted(e.target.checked)}
                          />
                          quote만
                        </label>

                        <select className="select" value={evSort} onChange={(e) => setEvSort(e.target.value as any)}>
                          <option value="distance">거리순</option>
                          <option value="title">제목순</option>
                        </select>
                      </div>
                    }
                  />

                  {evidence.length === 0 ? (
                    <EmptyState
                      title="Evidence가 없습니다"
                      desc="guardrail 정책상 근거가 없으면 추측 기반 ESCALATE는 금지될 수 있습니다."
                    />
                  ) : filteredEvidence.length === 0 ? (
                    <EmptyState title="검색/필터 결과가 없습니다" desc="필터를 해제하거나 검색어를 바꿔보세요." />
                  ) : (
                    <div className="evidenceList">
                      {filteredEvidence.map((ev, i) => (
                        <EvidenceCard key={`${ev.doc_id ?? ev.title ?? "ev"}-${i}`} ev={ev} idx={i} />
                      ))}
                    </div>
                  )}
                </section>
              )}


              {/* <div style={{ marginTop: 18, fontSize: 12, color: "#777" }}>
                Endpoint: <code>POST http://127.0.0.1:8000/api/analyze</code>
              </div> */}
            </div>
        </main>
      </div>
    </div>
  );
}
