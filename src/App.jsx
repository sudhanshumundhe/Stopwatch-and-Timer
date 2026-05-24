import { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";

// ── Audio ──────────────────────────────────────────────────────
function beep(ctx, freq = 880, dur = 0.1, vol = 0.3, type = "sine") {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = freq;
  osc.type = type;
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + dur);
}
const tickSound = (ctx) => beep(ctx, 900, 0.03, 0.1, "sine");
const clickSound = (ctx) => beep(ctx, 500, 0.07, 0.25, "triangle");
const alertSound = (ctx) => {
  [0, 0.2, 0.4].forEach((t) => {
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 520; o.type = "sine";
    g.gain.setValueAtTime(0.4, ctx.currentTime + t);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18);
    o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.18);
  });
};

// ── Sliding digit component ────────────────────────────────────
function SlideDigit({ digit }) {
  const [displayed, setDisplayed] = useState(digit);
  const [next, setNext] = useState(null);
  const [phase, setPhase] = useState("idle"); // idle | exit | enter

  useEffect(() => {
    if (digit === displayed && phase === "idle") return;
    if (digit === displayed) return;
    setNext(digit);
    setPhase("exit");
    const t1 = setTimeout(() => {
      setDisplayed(digit);
      setPhase("enter");
      const t2 = setTimeout(() => setPhase("idle"), 220);
      return () => clearTimeout(t2);
    }, 120);
    return () => clearTimeout(t1);
  }, [digit]);

  const cls =
    phase === "exit" ? "digit-inner slide-exit" :
      phase === "enter" ? "digit-inner slide-enter" :
        "digit-inner";

  return (
    <div className="digit-slot">
      <span className={cls}>{displayed}</span>
    </div>
  );
}

// ── Multi-digit display ────────────────────────────────────────
function TimeDisplay({ ms, showCs = true, done = false, active = false }) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);

  const pad = (n) => String(n).padStart(2, "0");
  const mm = pad(m);
  const ss = pad(s);
  const hh = pad(h);
  const cc = pad(cs);

  const cls = `display${active ? " active" : ""}${done ? " display-done" : ""}`;

  return (
    <div className={cls}>
      {h > 0 && (
        <>
          <div className="digit-group">
            <SlideDigit digit={hh[0]} />
            <SlideDigit digit={hh[1]} />
          </div>
          <span className="digit-sep">:</span>
        </>
      )}
      <div className="digit-group">
        <SlideDigit digit={mm[0]} />
        <SlideDigit digit={mm[1]} />
      </div>
      <span className="digit-sep">:</span>
      <div className="digit-group">
        <SlideDigit digit={ss[0]} />
        <SlideDigit digit={ss[1]} />
      </div>
      {showCs && (
        <span className="digit-cs">.{cc}</span>
      )}
    </div>
  );
}

function fmt(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  const p = (n) => String(n).padStart(2, "0");
  return h > 0
    ? `${p(h)}:${p(m)}:${p(s)}`
    : `${p(m)}:${p(s)}.${p(cs)}`;
}

// ── Stopwatch ──────────────────────────────────────────────────
function Stopwatch({ audioCtx }) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState([]);
  const startRef = useRef(null);
  const baseRef = useRef(0);
  const rafRef = useRef(null);
  const lastSecRef = useRef(-1);

  const tick = useCallback(() => {
    const e = baseRef.current + (Date.now() - startRef.current);
    setElapsed(e);
    const sec = Math.floor(e / 1000);
    if (sec !== lastSecRef.current) {
      lastSecRef.current = sec;
      tickSound(audioCtx.current);
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [audioCtx]);

  const start = () => {
    if (running) return;
    clickSound(audioCtx.current);
    startRef.current = Date.now();
    setRunning(true);
    rafRef.current = requestAnimationFrame(tick);
  };

  const pause = () => {
    if (!running) return;
    clickSound(audioCtx.current);
    cancelAnimationFrame(rafRef.current);
    baseRef.current += Date.now() - startRef.current;
    setRunning(false);
  };

  const reset = () => {
    clickSound(audioCtx.current);
    cancelAnimationFrame(rafRef.current);
    baseRef.current = 0;
    lastSecRef.current = -1;
    setElapsed(0);
    setRunning(false);
    setLaps([]);
  };

  const lap = () => {
    if (!running) return;
    clickSound(audioCtx.current);
    setLaps((prev) => [{ time: elapsed, idx: prev.length + 1 }, ...prev]);
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return (
    <div className="panel">
      <div className="panel-label">Stopwatch</div>

      <TimeDisplay ms={elapsed} active={running} showCs />

      <div className="progress-bar">
        <div
          className="progress-fill sw-fill"
          style={{ width: `${Math.min(((elapsed % 60000) / 60000) * 100, 100)}%` }}
        />
      </div>

      <div className="controls">
        <button className={`btn ${running ? "btn-pause" : "btn-start"}`} onClick={running ? pause : start}>
          {running ? "Pause" : "Start"}
        </button>
        <button className="btn btn-ghost" onClick={lap} disabled={!running}>Lap</button>
        <button className="btn btn-ghost" onClick={reset}>Reset</button>
      </div>

      {laps.length > 0 && (
        <div className="laps">
          {laps.map((l) => (
            <div key={l.idx} className="lap-row">
              <span className="lap-idx">#{String(l.idx).padStart(2, "0")}</span>
              <span className="lap-time">{fmt(l.time)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Timer ──────────────────────────────────────────────────────
function Timer({ audioCtx }) {
  const [hh, setHh] = useState("00");
  const [mm, setMm] = useState("05");
  const [ss, setSs] = useState("00");
  const [remaining, setRem] = useState(null);
  const [running, setRun] = useState(false);
  const [done, setDone] = useState(false);
  const startRef = useRef(null);
  const baseRef = useRef(0);
  const totalRef = useRef(0);
  const rafRef = useRef(null);
  const lastSecRef = useRef(-1);

  const totalMs = () =>
    (parseInt(hh || 0) * 3600 + parseInt(mm || 0) * 60 + parseInt(ss || 0)) * 1000;

  const tick = useCallback(() => {
    const elapsed = baseRef.current + (Date.now() - startRef.current);
    const left = Math.max(totalRef.current - elapsed, 0);
    const sec = Math.floor(left / 1000);
    if (sec !== lastSecRef.current) {
      lastSecRef.current = sec;
      if (left > 0) tickSound(audioCtx.current);
    }
    setRem(left);
    if (left <= 0) {
      cancelAnimationFrame(rafRef.current);
      setRun(false);
      setDone(true);
      alertSound(audioCtx.current);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [audioCtx]);

  const start = () => {
    if (running) return;
    const total = remaining !== null ? remaining : totalMs();
    if (total <= 0) return;
    clickSound(audioCtx.current);
    setDone(false);
    if (remaining === null) {
      totalRef.current = total;
      baseRef.current = 0;
    } else {
      baseRef.current = totalRef.current - remaining;
    }
    startRef.current = Date.now();
    lastSecRef.current = -1;
    setRem(remaining ?? total);
    setRun(true);
    rafRef.current = requestAnimationFrame(tick);
  };

  const pause = () => {
    if (!running) return;
    clickSound(audioCtx.current);
    cancelAnimationFrame(rafRef.current);
    baseRef.current += Date.now() - startRef.current;
    setRun(false);
  };

  const reset = () => {
    clickSound(audioCtx.current);
    cancelAnimationFrame(rafRef.current);
    baseRef.current = 0;
    lastSecRef.current = -1;
    setRem(null);
    setRun(false);
    setDone(false);
  };

  const applyPreset = (sec) => {
    reset();
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    setHh(String(h).padStart(2, "0"));
    setMm(String(m).padStart(2, "0"));
    setSs(String(s).padStart(2, "0"));
    clickSound(audioCtx.current);
  };

  const clamp = (v, max) => Math.max(0, Math.min(parseInt(v) || 0, max));
  const onH = (v) => { reset(); setHh(String(clamp(v, 23)).padStart(2, "0")); };
  const onM = (v) => { reset(); setMm(String(clamp(v, 59)).padStart(2, "0")); };
  const onS = (v) => { reset(); setSs(String(clamp(v, 59)).padStart(2, "0")); };

  const display = remaining !== null ? remaining : totalMs();
  const total = totalRef.current || totalMs();
  const pct = total > 0 ? Math.min((display / total) * 100, 100) : 100;

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return (
    <div className="panel">
      <div className="panel-label">Timer</div>

      {remaining === null ? (
        <div className="time-inputs">
          <div className="time-field">
            <input className="t-input" type="number" value={hh} min="0" max="23"
              onChange={(e) => onH(e.target.value)} />
            <span className="t-label">hr</span>
          </div>
          <span className="t-sep">:</span>
          <div className="time-field">
            <input className="t-input" type="number" value={mm} min="0" max="59"
              onChange={(e) => onM(e.target.value)} />
            <span className="t-label">min</span>
          </div>
          <span className="t-sep">:</span>
          <div className="time-field">
            <input className="t-input" type="number" value={ss} min="0" max="59"
              onChange={(e) => onS(e.target.value)} />
            <span className="t-label">sec</span>
          </div>
        </div>
      ) : (
        <TimeDisplay ms={display} active={running} done={done} showCs={false} />
      )}

      <div className="progress-bar">
        <div
          className={`progress-fill ${done ? "done-fill" : "timer-fill"}`}
          style={{ width: `${pct}%`, transition: running ? "none" : "width 0.3s" }}
        />
      </div>

      {done && <div className="done-badge">⏰ Time's up!</div>}

      <div className="controls">
        <button
          className={`btn ${running ? "btn-pause" : "btn-start"}`}
          onClick={running ? pause : start}
          disabled={!running && totalMs() === 0 && remaining === null}
        >
          {running ? "Pause" : "Start"}
        </button>
        <button className="btn btn-ghost" onClick={reset}>Reset</button>
      </div>

      <div className="presets">
        {[["1 min", 60], ["5 min", 300], ["10 min", 600], ["25 min", 1500], ["1 hr", 3600]].map(
          ([label, sec]) => (
            <button key={label} className="preset-btn" onClick={() => applyPreset(sec)}>
              {label}
            </button>
          )
        )}
      </div>
    </div>
  );
}

// ── App ────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("stopwatch");
  const audioCtx = useRef(null);

  const initAudio = () => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    }
  };

  return (
    <div className="page" onClick={initAudio}>
      <div className="app">
        <header className="app-header">
          <div className="brand">CHRONO<span className="brand-dot">◆</span>LAB</div>
          <div className="tabs">
            <button className={`tab ${tab === "stopwatch" ? "tab-active" : ""}`}
              onClick={() => setTab("stopwatch")}>Stopwatch</button>
            <button className={`tab ${tab === "timer" ? "tab-active" : ""}`}
              onClick={() => setTab("timer")}>Timer</button>
          </div>
        </header>

        <main className="app-main">
          {tab === "stopwatch" ? <Stopwatch audioCtx={audioCtx} /> : <Timer audioCtx={audioCtx} />}
        </main>

        <footer className="app-footer">AUDIO CLOCK · PRECISION TIMING</footer>
      </div>
    </div>
  );
}