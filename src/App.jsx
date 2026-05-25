import { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";

// ── Audio ──────────────────────────────────────────────────────
function beep(ctx, freq = 440, dur = 0.12, vol = 0.3, type = "sine") {
  if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.frequency.value = freq; o.type = type;
  g.gain.setValueAtTime(vol, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  o.start(ctx.currentTime); o.stop(ctx.currentTime + dur);
}
const tickSound = (ctx) => beep(ctx, 1000, 0.025, 0.08, "sine");
const clickSound = (ctx) => beep(ctx, 600, 0.07, 0.2, "triangle");
const alertSound = (ctx) => {
  if (!ctx) return;
  [0, 0.22, 0.44, 0.66].forEach((t) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = t % 0.44 === 0 ? 880 : 660; o.type = "sine";
    g.gain.setValueAtTime(0.4, ctx.currentTime + t);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18);
    o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.2);
  });
};
const taskDoneSound = (ctx) => {
  if (!ctx) return;
  [0, 0.15, 0.3].forEach((t, i) => {
    const freqs = [523, 659, 784];
    beep(ctx, freqs[i], 0.18, 0.25, "sine");
  });
  setTimeout(() => beep(ctx, 784, 0.3, 0.3, "sine"), 300);
};

// ── Color helper: pct 0-100 → green→yellow→red ────────────────
function pctColor(pct) {
  if (pct > 60) {
    const t = (100 - pct) / 40;
    return `rgb(${Math.round(t * 255)}, 220, 80)`;
  } else if (pct > 25) {
    const t = (60 - pct) / 35;
    return `rgb(255, ${Math.round((1 - t) * 180 + 40)}, 40)`;
  } else {
    return `rgb(255, ${Math.round(pct / 25 * 60)}, 30)`;
  }
}

// ── Slide digit ────────────────────────────────────────────────
function SlideDigit({ digit, color }) {
  const [shown, setShown] = useState(digit);
  const [phase, setPhase] = useState("idle");
  useEffect(() => {
    if (digit === shown) return;
    setPhase("exit");
    const t = setTimeout(() => {
      setShown(digit); setPhase("enter");
      const t2 = setTimeout(() => setPhase("idle"), 200);
      return () => clearTimeout(t2);
    }, 110);
    return () => clearTimeout(t);
  }, [digit]);
  const cls = phase === "exit" ? "di exit" : phase === "enter" ? "di enter" : "di";
  return (
    <div className="dslot">
      <span className={cls} style={color ? { color, textShadow: `0 0 20px ${color}88` } : {}}>
        {shown}
      </span>
    </div>
  );
}

// ── Time display ───────────────────────────────────────────────
function TimeDisplay({ ms, showCs = true, active, done, timerPct = null }) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  const p = (n) => String(n).padStart(2, "0");
  const col = timerPct !== null && !done ? pctColor(timerPct) : null;
  const borderStyle = col && active ? { borderColor: col + "99", boxShadow: `0 0 40px ${col}22` } : {};
  const cls = `display${active ? " active" : ""}${done ? " done" : ""}`;
  return (
    <div className={cls} style={borderStyle}>
      {h > 0 && <><div className="dgrp"><SlideDigit digit={p(h)[0]} color={col} /><SlideDigit digit={p(h)[1]} color={col} /></div><span className="dsep">:</span></>}
      <div className="dgrp"><SlideDigit digit={p(m)[0]} color={col} /><SlideDigit digit={p(m)[1]} color={col} /></div>
      <span className="dsep">:</span>
      <div className="dgrp"><SlideDigit digit={p(s)[0]} color={col} /><SlideDigit digit={p(s)[1]} color={col} /></div>
      {showCs && <span className="dcs" style={col ? { color: col + "cc" } : {}}>.{p(cs)}</span>}
    </div>
  );
}

function fmt(ms) {
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000),
    s = Math.floor((ms % 60000) / 1000), cs = Math.floor((ms % 1000) / 10);
  const p = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${p(h)}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}.${p(cs)}`;
}

// ── Analog clock ───────────────────────────────────────────────
function AnalogClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  const s = now.getSeconds(), m = now.getMinutes(), h = now.getHours() % 12;
  const sd = s * 6, md = m * 6 + s * 0.1, hd = h * 30 + m * 0.5;
  const hand = (deg, len, w, color) => {
    const r = (deg - 90) * Math.PI / 180;
    const x2 = 60 + len * Math.cos(r), y2 = 60 + len * Math.sin(r);
    return <line x1="60" y1="60" x2={x2} y2={y2} stroke={color} strokeWidth={w} strokeLinecap="round" />;
  };
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const r = (i * 6 - 90) * Math.PI / 180;
    const len = i % 5 === 0 ? 8 : 4;
    const x1 = 60 + 50 * Math.cos(r), y1 = 60 + 50 * Math.sin(r);
    const x2 = 60 + (50 - len) * Math.cos(r), y2 = 60 + (50 - len) * Math.sin(r);
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={i % 5 === 0 ? "#f5a62366" : "#f5a62322"} strokeWidth={i % 5 === 0 ? 1.5 : 0.8} />;
  });
  const nums = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n, i) => {
    const r = (i * 30 - 90) * Math.PI / 180;
    const x = 60 + 40 * Math.cos(r), y = 60 + 40 * Math.sin(r);
    return <text key={n} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="8" fill="#f5a62355" fontFamily="Orbitron,monospace" fontWeight="700">{n}</text>;
  });
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="clock-wrap">
      <svg viewBox="0 0 120 120" className="clock-svg">
        <circle cx="60" cy="60" r="58" fill="none" stroke="#ffffff0e" strokeWidth="1" />
        <circle cx="60" cy="60" r="52" fill="#f5a62306" />
        {ticks}{nums}
        {hand(hd, 28, 3.5, "#faf3e0")}
        {hand(md, 38, 2.2, "#f5a623")}
        {hand(sd, 44, 1.3, "#ff6b6b")}
        <circle cx="60" cy="60" r="3.5" fill="#ff6b6b" />
        <circle cx="60" cy="60" r="1.6" fill="#fff" />
      </svg>
      <div className="clock-digital">{timeStr}</div>
    </div>
  );
}

// ── Notification toast ─────────────────────────────────────────
function Toast({ toasts, remove }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">{t.type === "success" ? "✓" : t.type === "warning" ? "⏰" : "ℹ"}</span>
          <span className="toast-msg">{t.msg}</span>
          <button className="toast-close" onClick={() => remove(t.id)}>×</button>
        </div>
      ))}
    </div>
  );
}

// ── Task manager ───────────────────────────────────────────────
function TaskManager({ audioCtx, notify }) {
  const [tasks, setTasks] = useState([
    { id: 1, text: "Morning standup", done: false, duration: 15 },
    { id: 2, text: "Review pull requests", done: false, duration: 30 },
    { id: 3, text: "Lunch break", done: false, duration: 60 },
  ]);
  const [input, setInput] = useState("");
  const [dur, setDur] = useState("25");
  const [running, setRun] = useState(null);
  const [elapsed, setEl] = useState({});
  const rafRef = useRef({});
  const startRef = useRef({});
  const baseRef = useRef({});

  const tickTask = useCallback((id) => {
    const e = (baseRef.current[id] || 0) + (Date.now() - startRef.current[id]);
    setEl(prev => ({ ...prev, [id]: e }));
    rafRef.current[id] = requestAnimationFrame(() => tickTask(id));
  }, []);

  const startTask = (id) => {
    clickSound(audioCtx.current);
    if (running && running !== id) {
      cancelAnimationFrame(rafRef.current[running]);
      baseRef.current[running] = (baseRef.current[running] || 0) + (Date.now() - startRef.current[running]);
    }
    startRef.current[id] = Date.now();
    setRun(id);
    rafRef.current[id] = requestAnimationFrame(() => tickTask(id));
  };

  const pauseTask = (id) => {
    clickSound(audioCtx.current);
    cancelAnimationFrame(rafRef.current[id]);
    baseRef.current[id] = (baseRef.current[id] || 0) + (Date.now() - startRef.current[id]);
    setRun(null);
  };

  const completeTask = (id) => {
    cancelAnimationFrame(rafRef.current[id]);
    if (running === id) setRun(null);
    setTasks(ts => ts.map(t => t.id === id ? { ...t, done: true } : t));
    taskDoneSound(audioCtx.current);
    const task = tasks.find(t => t.id === id);
    notify(`"${task?.text}" completed! 🎉`, "success");
  };

  const addTask = () => {
    if (!input.trim()) return;
    clickSound(audioCtx.current);
    const id = Date.now();
    setTasks(ts => [...ts, { id, text: input.trim(), done: false, duration: parseInt(dur) || 25 }]);
    setInput(""); setDur("25");
    notify(`Task "${input.trim()}" added`, "info");
  };

  const deleteTask = (id) => {
    cancelAnimationFrame(rafRef.current[id]);
    if (running === id) setRun(null);
    setTasks(ts => ts.filter(t => t.id !== id));
  };

  useEffect(() => () => Object.values(rafRef.current).forEach(cancelAnimationFrame), []);

  return (
    <div className="panel">
      <div className="panel-label">Task Timer</div>
      <div className="task-add">
        <input className="task-input" placeholder="Task name…" value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addTask()} />
        <input className="task-dur-input" type="number" value={dur} min="1" max="180"
          onChange={e => setDur(e.target.value)} title="Duration (min)" />
        <button className="btn btn-add" onClick={addTask}>+ Add</button>
      </div>
      <div className="task-list">
        {tasks.length === 0 && <div className="task-empty">No tasks yet. Add one above.</div>}
        {tasks.map(t => {
          const el = elapsed[t.id] || 0;
          const total = t.duration * 60000;
          const pct = Math.min((el / total) * 100, 100);
          const over = el > total;
          const isRunning = running === t.id;
          return (
            <div key={t.id} className={`task-row${t.done ? " task-done" : ""}${isRunning ? " task-running" : ""}`}>
              <div className="task-top">
                <span className="task-text">{t.done ? "✓ " : ""}{t.text}</span>
                <span className="task-time-badge" style={{ color: over ? "#f87171" : "#7dd3fc" }}>
                  {t.duration}m
                </span>
              </div>
              {!t.done && (
                <>
                  <div className="task-bar-bg">
                    <div className="task-bar-fill" style={{
                      width: `${pct}%`,
                      background: over ? "#f87171" : `hsl(${120 - pct * 1.2}, 80%, 55%)`
                    }} />
                  </div>
                  <div className="task-meta">
                    <span className="task-elapsed" style={{ color: over ? "#f87171" : "#94a3b8" }}>
                      {fmt(el)}{over ? " (over!)" : ""} / {t.duration}:00
                    </span>
                    <div className="task-actions">
                      {isRunning
                        ? <button className="tbtn tbtn-pause" onClick={() => pauseTask(t.id)}>⏸</button>
                        : <button className="tbtn tbtn-play" onClick={() => startTask(t.id)}>▶</button>}
                      <button className="tbtn tbtn-done" onClick={() => completeTask(t.id)}>✓</button>
                      <button className="tbtn tbtn-del" onClick={() => deleteTask(t.id)}>✕</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Stopwatch ──────────────────────────────────────────────────
function Stopwatch({ audioCtx }) {
  const [elapsed, setEl] = useState(0);
  const [running, setRun] = useState(false);
  const [laps, setLaps] = useState([]);
  const startRef = useRef(null), baseRef = useRef(0), rafRef = useRef(null), secRef = useRef(-1);
  const tick = useCallback(() => {
    const e = baseRef.current + (Date.now() - startRef.current);
    setEl(e);
    const s = Math.floor(e / 1000);
    if (s !== secRef.current) { secRef.current = s; tickSound(audioCtx.current); }
    rafRef.current = requestAnimationFrame(tick);
  }, [audioCtx]);
  const start = () => { if (running) return; clickSound(audioCtx.current); startRef.current = Date.now(); setRun(true); rafRef.current = requestAnimationFrame(tick); };
  const pause = () => { if (!running) return; clickSound(audioCtx.current); cancelAnimationFrame(rafRef.current); baseRef.current += Date.now() - startRef.current; setRun(false); };
  const reset = () => { clickSound(audioCtx.current); cancelAnimationFrame(rafRef.current); baseRef.current = 0; secRef.current = -1; setEl(0); setRun(false); setLaps([]); };
  const lap = () => { if (!running) return; clickSound(audioCtx.current); setLaps(p => [{ t: elapsed, i: p.length + 1 }, ...p]); };
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);
  return (
    <div className="panel">
      <div className="panel-label">Stopwatch</div>
      <TimeDisplay ms={elapsed} active={running} showCs />
      <div className="pbar"><div className="pfill sw-fill" style={{ width: `${Math.min(((elapsed % 60000) / 60000) * 100, 100)}%` }} /></div>
      <div className="controls">
        <button className={`btn ${running ? "btn-pause" : "btn-start"}`} onClick={running ? pause : start}>{running ? "⏸ Pause" : "▶ Start"}</button>
        <button className="btn btn-ghost" onClick={lap} disabled={!running}>Lap</button>
        <button className="btn btn-ghost" onClick={reset}>Reset</button>
      </div>
      {laps.length > 0 && (
        <div className="laps">
          {laps.map(l => (
            <div key={l.i} className="lap-row">
              <span className="lap-idx">#{String(l.i).padStart(2, "0")}</span>
              <span className="lap-time">{fmt(l.t)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Timer ──────────────────────────────────────────────────────
function Timer({ audioCtx, notify }) {
  const [hh, setHh] = useState("00"), [mm, setMm] = useState("05"), [ss, setSs] = useState("00");
  const [rem, setRem] = useState(null), [running, setRun] = useState(false), [done, setDone] = useState(false);
  const startRef = useRef(null), baseRef = useRef(0), totalRef = useRef(0), rafRef = useRef(null), secRef = useRef(-1);
  const totalMs = () => (parseInt(hh || 0) * 3600 + parseInt(mm || 0) * 60 + parseInt(ss || 0)) * 1000;
  const tick = useCallback(() => {
    const el = baseRef.current + (Date.now() - startRef.current);
    const left = Math.max(totalRef.current - el, 0);
    const s = Math.floor(left / 1000);
    if (s !== secRef.current) { secRef.current = s; if (left > 0) tickSound(audioCtx.current); }
    setRem(left);
    if (left <= 0) { cancelAnimationFrame(rafRef.current); setRun(false); setDone(true); alertSound(audioCtx.current); notify("⏰ Timer finished!", "warning"); return; }
    rafRef.current = requestAnimationFrame(tick);
  }, [audioCtx, notify]);
  const start = () => {
    if (running) return;
    const total = rem !== null ? rem : totalMs();
    if (total <= 0) return;
    clickSound(audioCtx.current); setDone(false);
    if (rem === null) { totalRef.current = total; baseRef.current = 0; }
    else baseRef.current = totalRef.current - rem;
    startRef.current = Date.now(); secRef.current = -1; setRem(rem ?? total); setRun(true);
    rafRef.current = requestAnimationFrame(tick);
  };
  const pause = () => { if (!running) return; clickSound(audioCtx.current); cancelAnimationFrame(rafRef.current); baseRef.current += Date.now() - startRef.current; setRun(false); };
  const reset = () => { clickSound(audioCtx.current); cancelAnimationFrame(rafRef.current); baseRef.current = 0; secRef.current = -1; setRem(null); setRun(false); setDone(false); };
  const addTime = (extra) => {
    clickSound(audioCtx.current);
    if (rem !== null) { totalRef.current += extra; setRem(p => (p ?? 0) + extra); setDone(false); }
    else {
      const nt = totalMs() + extra;
      setHh(String(Math.floor(nt / 3600000)).padStart(2, "0"));
      setMm(String(Math.floor((nt % 3600000) / 60000)).padStart(2, "0"));
      setSs(String(Math.floor((nt % 60000) / 1000)).padStart(2, "0"));
    }
  };
  const preset = (sec) => { reset(); setHh(String(Math.floor(sec / 3600)).padStart(2, "0")); setMm(String(Math.floor((sec % 3600) / 60)).padStart(2, "0")); setSs(String(sec % 60).padStart(2, "0")); clickSound(audioCtx.current); };
  const clamp = (v, max) => Math.max(0, Math.min(parseInt(v) || 0, max));
  const display = rem !== null ? rem : totalMs();
  const total = totalRef.current || totalMs();
  const pct = total > 0 ? Math.min((display / total) * 100, 100) : 100;
  const fillColor = done ? "#f87171" : pctColor(pct);
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);
  return (
    <div className="panel">
      <div className="panel-label">Timer</div>
      {rem === null ? (
        <div className="tinputs">
          {[["hr", hh, 23, setHh], ["min", mm, 59, setMm], ["sec", ss, 59, setSs]].map(([lbl, val, max, set], i) => (
            <div key={lbl} className="tfield">
              {i > 0 && <span className="tsep">:</span>}
              <div className="tfield-inner">
                <input className="tinput" type="number" value={val} min="0" max={max}
                  onChange={e => { reset(); set(String(clamp(e.target.value, max)).padStart(2, "0")); }} />
                <span className="tlabel">{lbl}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <TimeDisplay ms={display} active={running} done={done} showCs={false} timerPct={pct} />
      )}
      <div className="pbar">
        <div className="pfill" style={{ width: `${pct}%`, background: fillColor, boxShadow: `0 0 8px ${fillColor}88`, transition: running ? "none" : "width 0.3s, background 0.8s" }} />
      </div>
      {done && <div className="done-badge">⏰ TIME'S UP!</div>}
      <div className="controls">
        <button className={`btn ${running ? "btn-pause" : "btn-start"}`} onClick={running ? pause : start} disabled={!running && totalMs() === 0 && rem === null}>{running ? "⏸ Pause" : "▶ Start"}</button>
        <button className="btn btn-ghost" onClick={reset}>Reset</button>
      </div>
      {(rem !== null || running) && (
        <div className="add-row">
          <span className="add-label">+ ADD TIME</span>
          <div className="add-btns">
            {[["+30s", 30000], ["+1m", 60000], ["+5m", 300000], ["+10m", 600000]].map(([l, ms]) => (
              <button key={l} className="add-btn" onClick={() => addTime(ms)}>{l}</button>
            ))}
          </div>
        </div>
      )}
      <div className="presets">
        {[["1m", 60], ["5m", 300], ["10m", 600], ["25m", 1500], ["1h", 3600]].map(([l, s]) => (
          <button key={l} className="preset-btn" onClick={() => preset(s)}>{l}</button>
        ))}
      </div>
    </div>
  );
}

// ── App ────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("clock");
  const [toasts, setToasts] = useState([]);
  const audioCtx = useRef(null);

  const initAudio = () => {
    if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
  };

  const notify = useCallback((msg, type = "info") => {
    const id = Date.now();
    setToasts(ts => [...ts, { id, msg, type }]);
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 4000);
  }, []);

  const removeToast = (id) => setToasts(ts => ts.filter(t => t.id !== id));

  const TABS = [
    { key: "clock", label: "Clock" },
    { key: "stopwatch", label: "Stopwatch" },
    { key: "timer", label: "Timer" },
    { key: "tasks", label: "Tasks" },
  ];

  return (
    <div className="page" onClick={initAudio}>
      <div className="particles" aria-hidden="true">
        {Array.from({ length: 20 }, (_, i) => <div key={i} className="particle" style={{
          left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 8}s`,
          animationDuration: `${6 + Math.random() * 10}s`, width: `${1 + Math.random() * 2}px`, height: `${1 + Math.random() * 2}px`
        }} />)}
      </div>
      <div className="app">
        <header className="app-header">
          <div className="brand">
            <div className="brand-main">SAVE YOUR TIME</div>
            <div className="brand-sub">Precision · Focus · Flow</div>
          </div>
          <nav className="tabs">
            {TABS.map(t => (
              <button key={t.key} className={`tab ${tab === t.key ? "tab-active" : ""}`} onClick={() => { setTab(t.key); clickSound(audioCtx.current); }}>{t.label}</button>
            ))}
          </nav>
        </header>
        <main className="app-main">
          {tab === "clock" && <div className="panel"><div className="panel-label">Clock</div><AnalogClock /></div>}
          {tab === "stopwatch" && <Stopwatch audioCtx={audioCtx} />}
          {tab === "timer" && <Timer audioCtx={audioCtx} notify={notify} />}
          {tab === "tasks" && <TaskManager audioCtx={audioCtx} notify={notify} />}
        </main>
        <footer className="app-footer">Save Your Time · Audio Clock · Task Manager</footer>
      </div>
      <Toast toasts={toasts} remove={removeToast} />
    </div>
  );
}