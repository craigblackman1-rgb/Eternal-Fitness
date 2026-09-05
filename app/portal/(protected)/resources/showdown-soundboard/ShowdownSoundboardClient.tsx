"use client";

import { useRef, useState, useCallback } from "react";
import Link from "next/link";
import "./showdown-soundboard.css";

interface CueDef {
  key: string;
  label: string;
  sub: string;
  freq: number;
  type: OscillatorType;
  dur: number;
  className: string;
}

const CUES: CueDef[] = [
  { key: "forehand", label: "Forehand", sub: "3 o\u2019clock", freq: 880, type: "sine", dur: 0.2, className: "sb-forehand" },
  { key: "backhand", label: "Backhand", sub: "9 o\u2019clock", freq: 550, type: "sine", dur: 0.2, className: "sb-backhand" },
  { key: "left", label: "Left defence", sub: "9 o\u2019clock", freq: 420, type: "triangle", dur: 0.25, className: "sb-left" },
  { key: "right", label: "Right defence", sub: "3 o\u2019clock", freq: 680, type: "triangle", dur: 0.25, className: "sb-right" },
  { key: "centre", label: "Central / return", sub: "12 o\u2019clock", freq: 300, type: "square", dur: 0.15, className: "sb-centre" },
];

export default function ShowdownSoundboardClient({ clientName }: { clientName: string }) {
  const actxRef = useRef<AudioContext | null>(null);
  const [volume, setVolume] = useState(0.85);
  const [feedback, setFeedback] = useState("");
  const [activeBtn, setActiveBtn] = useState<string | null>(null);

  const getCtx = useCallback(() => {
    if (!actxRef.current) {
      actxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return actxRef.current;
  }, []);

  const play = useCallback(
    (cue: CueDef) => {
      const actx = getCtx();
      if (actx.state === "suspended") actx.resume();

      const now = actx.currentTime;
      const osc = actx.createOscillator();
      const gain = actx.createGain();

      osc.connect(gain);
      gain.connect(actx.destination);

      osc.type = cue.type;
      osc.frequency.setValueAtTime(cue.freq, now);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + cue.dur);

      osc.start(now);
      osc.stop(now + cue.dur + 0.05);

      setFeedback(`${cue.label} \u2014 ${cue.sub}`);
      setActiveBtn(cue.key);
      setTimeout(() => setActiveBtn(null), 120);
    },
    [volume, getCtx],
  );

  return (
    <div className="sb-root">
      <div className="sb-header">
        <h1 className="sb-title">Showdown Soundboard</h1>
        <p className="sb-subtitle">Sam Gibbons &middot; Eternal Fitness</p>
      </div>

      <div className="sb-section-label">Cue volume</div>
      <div className="sb-vol-row">
        <label className="sb-vol-label" htmlFor="sb-vol">
          Quiet
        </label>
        <input
          id="sb-vol"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="sb-vol-slider"
        />
        <label className="sb-vol-label" htmlFor="sb-vol">
          Loud
        </label>
      </div>

      <div className="sb-section-label">Position cues &mdash; tap to sound</div>

      <div className="sb-grid-2">
        {CUES.slice(0, 2).map((cue) => (
          <button
            key={cue.key}
            className={`sb-cue-btn ${cue.className} ${activeBtn === cue.key ? "sb-cue-active" : ""}`}
            onClick={() => play(cue)}
            type="button"
          >
            {cue.label}
            <span>{cue.sub}</span>
          </button>
        ))}
      </div>

      <div className="sb-grid-2">
        {CUES.slice(2, 4).map((cue) => (
          <button
            key={cue.key}
            className={`sb-cue-btn ${cue.className} ${activeBtn === cue.key ? "sb-cue-active" : ""}`}
            onClick={() => play(cue)}
            type="button"
          >
            {cue.label}
            <span>{cue.sub}</span>
          </button>
        ))}
      </div>

      <div className="sb-grid-1">
        {CUES.slice(4).map((cue) => (
          <button
            key={cue.key}
            className={`sb-cue-btn ${cue.className} ${activeBtn === cue.key ? "sb-cue-active" : ""}`}
            onClick={() => play(cue)}
            type="button"
          >
            {cue.label}
            <span>{cue.sub}</span>
          </button>
        ))}
      </div>

      <div className="sb-feedback" aria-live="polite">
        {feedback || "\u00A0"}
      </div>

      <hr className="sb-divider" />

      <div className="sb-section-label">Background noise &mdash; opens in a new tab</div>
      <div className="sb-bg-links">
        <a
          href="https://www.youtube.com/watch?v=T4K186t4AQY"
          target="_blank"
          rel="noopener noreferrer"
          className="sb-bg-link"
        >
          Sports hall<br />ambience
        </a>
        <a
          href="https://www.youtube.com/playlist?list=PLCnngi2mdPv05q-FOj_bv_qfWplO8zR7p"
          target="_blank"
          rel="noopener noreferrer"
          className="sb-bg-link"
        >
          Indoor crowd<br />murmur
        </a>
        <a
          href="https://audio.com/sonicfableforge/audio/table-tennis"
          target="_blank"
          rel="noopener noreferrer"
          className="sb-bg-link"
        >
          Table tennis<br />venue
        </a>
      </div>
      <p className="sb-note">
        Play background on a separate device at low volume while using the cues above
      </p>

      <div className="sb-eternal">
        Eternal <span className="sb-heart">&hearts;</span> Fitness
      </div>

      <p className="sb-back">
        <Link
          href="/portal/resources"
          className="inline-flex min-h-10 items-center rounded-pill border border-input px-4 text-sm font-medium hover:bg-accent"
        >
          &larr; Back to resources
        </Link>
      </p>
    </div>
  );
}
