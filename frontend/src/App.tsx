import { useMemo, useState } from "react";
import "./App.css";
import { SAMPLE_LOW, SAMPLE_MED, SAMPLE_HIGH } from "./sample.ts";

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
              { view === "signals" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
                  <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 12, background: "#fff" }}>
                    <div style={{ fontWeight: 800, marginBottom: 8 }}>Signals ({signals.length})</div>
                    {signals.length === 0 ? (
                      <div style={{ color: "#666" }}>(none)</div>
                    ) : (
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {signals.map((s, i) => (
                          <li key={i} style={{ marginBottom: 8 }}>
                            <div><b>{s.key ?? `signal-${i}`}</b></div>
                            {s.reason && <div style={{ color: "#555" }}>{s.reason}</div>}
                            {s.weight && <div style={{ fontSize: 12, color: "#777" }}>severity: {s.weight}</div>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 12, background: "#fff" }}>
                    <div style={{ fontWeight: 800, marginBottom: 8 }}>Recommended Actions ({actions.length})</div>
                    {actions.length === 0 ? (
                      <div style={{ color: "#666" }}>(none)</div>
                    ) : (
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {actions.map((a, i) => (
                          <li key={i} style={{ marginBottom: 8 }}>
                            <div><b>{a.action ?? `action-${i}`}</b></div>
                            {a.priority && <div style={{ color: "#555" }}>{a.priority}</div>}
                            {a.why && <div style={{ fontSize: 12, color: "#777" }}>description: {a.why}</div>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

                {/* Evidence */}
              {view === "evidence" && (
                <div style={{ marginTop: 16, border: "1px solid #e5e5e5", borderRadius: 12, padding: 12, background: "#fff" }}>
                  <div style={{ fontWeight: 800, marginBottom: 8 }}>Evidence ({evidence.length})</div>
                  {evidence.length === 0 ? (
                    <div style={{ color: "#666" }}>
                      (none) — guardrail 정책상 근거가 없으면 추측 기반 ESCALATE는 금지될 수 있습니다.
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: 12 }}>
                      {evidence.map((ev, i) => (
                        <div key={i} style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                            <div style={{ fontWeight: 800 }}>{ev.title ?? ev.doc_id ?? `doc-${i}`}</div>
                            <div style={{ fontSize: 12, color: "#666" }}>
                              distance: {typeof ev.distance === "number" ? ev.distance.toFixed(4) : "-"}
                            </div>
                          </div>

                          <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>
                            section: {ev.section ?? "-"} | page: {ev.page ?? "-"} | chunk_id: {ev.chunk_id ?? "-"}
                          </div>

                          <div style={{ marginTop: 10 }}>
                            <CollapsibleQuote quote={ev.quote} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
