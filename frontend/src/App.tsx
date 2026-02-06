// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
// import './App.css'

// function App() {
//   const [count, setCount] = useState(0)

//   return (
//     <>
//       <div>
//         <a href="https://vite.dev" target="_blank">
//           <img src={viteLogo} className="logo" alt="Vite logo" />
//         </a>
//         <a href="https://react.dev" target="_blank">
//           <img src={reactLogo} className="logo react" alt="React logo" />
//         </a>
//       </div>
//       <h1>Vite + React</h1>
//       <div className="card">
//         <button onClick={() => setCount((count) => count + 1)}>
//           count is {count}
//         </button>
//         <p>
//           Edit <code>src/App.tsx</code> and save to test HMR
//         </p>
//       </div>
//       <p className="read-the-docs">
//         Click on the Vite and React logos to learn more
//       </p>
//     </>
//   )
// }

// export default App

import { useMemo, useState } from "react";
import "./App.css";
import { SAMPLE_LOW, SAMPLE_MED, SAMPLE_HIGH } from "./sample.ts";

type AnalyzeResponse = {
  summary?: {
    risk_score: number;
    risk_level: "LOW" | "MED" | "HIGH";
    decision: "ALLOW" | "REVIEW" | "ESCALATE";
  };
  signals?: Array<{
    id?: string;
    name?: string;
    description?: string;
    severity?: string;
    value?: unknown;
  }>;
  recommended_actions?: Array<{
    id?: string;
    title?: string;
    description?: string;
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

export default function App() {
  const [input, setInput] = useState<string>(SAMPLE_LOW);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [resp, setResp] = useState<AnalyzeResponse | null>(null);

  const onSample = (which: "low" | "med" | "high") => {
    setError("");
    setResp(null);
    if (which === "low") setInput(SAMPLE_LOW);
    if (which === "med") setInput(SAMPLE_MED);
    if (which === "high") setInput(SAMPLE_HIGH);
  };

  const onAnalyze = async () => {
    setError("");
    setResp(null);

    let payload: unknown;
    try {
      payload = JSON.parse(input);
    } catch (e) {
      setError("JSON 파싱 실패: 입력 JSON 형식을 확인해줘.");
      return;
    }

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
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto" }}>
      <h1 style={{ margin: 0 }}>LogWatch AI</h1>
      <p style={{ marginTop: 6, color: "#555" }}>
        JSON 로그를 분석해 <b>risk</b> / <b>decision</b>과 <b>정책 근거(evidence)</b>를 반환합니다.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
        <button onClick={() => onSample("low")}>샘플 LOW</button>
        <button onClick={() => onSample("med")}>샘플 MED</button>
        <button onClick={() => onSample("high")}>샘플 HIGH</button>

        <div style={{ flex: 1 }} />

        <button onClick={onAnalyze} disabled={loading} style={{ fontWeight: 700 }}>
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 16, marginTop: 16 }}>
        {/* Input */}
        <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 12, background: "#fff" }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Input JSON</div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            style={{
              width: "100%",
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

      {/* Signals / Actions / Evidence */}
      {resp && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
          <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 12, background: "#fff" }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Signals ({signals.length})</div>
            {signals.length === 0 ? (
              <div style={{ color: "#666" }}>(none)</div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {signals.map((s, i) => (
                  <li key={i} style={{ marginBottom: 8 }}>
                    <div><b>{s.name ?? s.id ?? `signal-${i}`}</b></div>
                    {s.description && <div style={{ color: "#555" }}>{s.description}</div>}
                    {s.severity && <div style={{ fontSize: 12, color: "#777" }}>severity: {s.severity}</div>}
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
                    <div><b>{a.title ?? a.id ?? `action-${i}`}</b></div>
                    {a.description && <div style={{ color: "#555" }}>{a.description}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {resp && (
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

      <div style={{ marginTop: 18, fontSize: 12, color: "#777" }}>
        Endpoint: <code>POST http://127.0.0.1:8000/api/analyze</code>
      </div>
    </div>
  );
}
