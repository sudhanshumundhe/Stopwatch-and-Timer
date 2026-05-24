import { useEffect, useRef, useState } from "react";
import "./App.css";

export default function App() {
  // STOPWATCH
  const [sw, setSw] = useState(0);
  const [swRunning, setSwRunning] = useState(false);
  const swRef = useRef(null);

  // TIMER
  const [min, setMin] = useState("");
  const [sec, setSec] = useState("");
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const tRef = useRef(null);

  // STOPWATCH LOGIC
  useEffect(() => {
    if (swRunning) {
      swRef.current = setInterval(() => {
        setSw((p) => p + 1);
      }, 1000);
    } else {
      clearInterval(swRef.current);
    }

    return () => clearInterval(swRef.current);
  }, [swRunning]);

  // TIMER LOGIC
  useEffect(() => {
    if (running && time > 0) {
      tRef.current = setInterval(() => {
        setTime((p) => p - 1);
      }, 1000);
    }

    if (time === 0 && running) {
      clearInterval(tRef.current);
      setRunning(false);
      alert("⏰ Time Up!");
    }

    return () => clearInterval(tRef.current);
  }, [running, time]);

  const format = (s) => {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  };

  const startTimer = () => {
    if (time === 0) {
      setTime(Number(min || 0) * 60 + Number(sec || 0));
    }
    setRunning(true);
  };

  const toggleTimer = () => {
    if (running) {
      setRunning(false);
    } else {
      startTimer();
    }
  };

  const toggleStopwatch = () => {
    setSwRunning(!swRunning);
  };

  return (
    <div className="app">
      <h1 className="title">⌚ Watch App</h1>

      <div className="wrap">

        {/* STOPWATCH */}
        <div className="watch">
          <h2>Stopwatch</h2>

          <div className="dial">
            <div className="time">{format(sw)}</div>
          </div>

          {/* ONE BUTTON */}
          <div className="controls">
            <button onClick={toggleStopwatch}>
              {swRunning ? "Pause" : "Start"}
            </button>

            <button onClick={() => setSw(0)}>Reset</button>
          </div>
        </div>

        {/* TIMER */}
        <div className="watch">
          <h2>Timer</h2>

          <div className="inputs">
            <input placeholder="MM" value={min} onChange={(e) => setMin(e.target.value)} />
            <input placeholder="SS" value={sec} onChange={(e) => setSec(e.target.value)} />
          </div>

          <div className="dial ring">
            <div className="time">{format(time)}</div>
          </div>

          {/* ONE BUTTON */}
          <div className="controls">
            <button onClick={toggleTimer}>
              {running ? "Pause" : "Start"}
            </button>

            <button onClick={() => setTime(0)}>Reset</button>
          </div>
        </div>

      </div>
    </div>
  );
}