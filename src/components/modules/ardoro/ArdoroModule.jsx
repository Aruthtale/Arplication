import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, Play, Pause, RotateCcw, Coffee, Timer,
  CheckCircle2, Volume2, VolumeX, Flame, BarChart3, Settings2,
} from 'lucide-react';
import {
  POMODORO_PRESETS,
  formatClock, durationFor, advancePhase,
  loadArdoroSettings, saveArdoroSettings,
  loadArdoroStats, recordFocusSession, summarizeStats,
} from '../../../utils/pomodoro.js';
import { sendPomodoroPhaseNotification } from '../../../utils/notification.js';

const PHASE_META = {
  focus: { label: 'FOKUS', chip: 'DEEP FOCUS MODE', color: '#FFE600' },
  short: { label: 'ISTIRAHAT', chip: 'SHORT BREAK', color: '#C4FAF8' },
  long: { label: 'ISTIRAHAT PANJANG', chip: 'LONG BREAK', color: '#38E54D' },
};

/** Bunyi chime offline via WebAudio — tanpa file aset. */
function playChime(kind = 'end') {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes = kind === 'end' ? [523.25, 659.25, 783.99] : [392.0, 523.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.16;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1500);
  } catch {
    /* audio tidak tersedia — abaikan */
  }
}

export default function ArdoroModule({ setActiveTab }) {
  const [settings, setSettings] = useState(loadArdoroSettings);
  const [stats, setStats] = useState(loadArdoroStats);
  const [phase, setPhase] = useState('focus');
  const [focusDone, setFocusDone] = useState(0);
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(() => durationFor('focus', loadArdoroSettings()));
  const [showSettings, setShowSettings] = useState(false);

  const endAtRef = useRef(0);
  const tickRef = useRef(null);
  const stateRef = useRef({ phase, focusDone, settings, running });
  useEffect(() => {
    stateRef.current = { phase, focusDone, settings, running };
  });

  const totalFor = (p) => durationFor(p, settings);
  const summary = summarizeStats(stats);

  const stopTicker = () => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  };

  const handlePhaseComplete = useCallback(() => {
    const { phase: cur, focusDone: done, settings: s } = stateRef.current;
    if (cur === 'focus') setStats((prev) => recordFocusSession(prev, durationFor('focus', s)));
    if (s.sound) playChime('end');
    const next = advancePhase({ phase: cur, focusDone: done }, s.rounds);
    sendPomodoroPhaseNotification({ phase: cur, nextPhase: next.phase });
    setPhase(next.phase);
    setFocusDone(next.focusDone);
    setRemaining(durationFor(next.phase, s));
    if (s.autoContinue) {
      endAtRef.current = Date.now() + durationFor(next.phase, s) * 1000;
    } else {
      setRunning(false);
      stopTicker();
    }
  }, []);

  // Ticker anti-drift: hitung sisa dari timestamp, bukan decrement.
  useEffect(() => {
    if (!running) { stopTicker(); return; }
    tickRef.current = setInterval(() => {
      const left = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) handlePhaseComplete();
    }, 250);
    return stopTicker;
  }, [running, phase, handlePhaseComplete]);

  // Simpan settings tiap berubah (debounce ringan via effect).
  useEffect(() => {
    saveArdoroSettings(settings);
  }, [settings]);

  const toggleRun = () => {
    if (running) {
      setRunning(false);
    } else {
      if (remaining <= 0) setRemaining(totalFor(phase));
      endAtRef.current = Date.now() + (remaining > 0 ? remaining : totalFor(phase)) * 1000;
      setRunning(true);
    }
  };

  const resetTimer = () => {
    setRunning(false);
    stopTicker();
    setRemaining(totalFor(phase));
  };

  const switchPhase = (p) => {
    setRunning(false);
    stopTicker();
    setPhase(p);
    setRemaining(durationFor(p, settings));
  };

  const applyPreset = (key) => {
    const p = POMODORO_PRESETS[key];
    if (!p) return;
    const next = { ...settings, preset: key, focus: p.focus, short: p.short, long: p.long, rounds: p.rounds };
    setSettings(next);
    setRunning(false);
    stopTicker();
    setRemaining(durationFor(phase, next));
  };

  const setMinutes = (key, minutes) => {
    const v = Math.min(120, Math.max(1, Math.floor(Number(minutes) || 0)));
    const next = { ...settings, preset: 'kustom', [key]: v * 60 };
    setSettings(next);
    if (phase === key || (key === 'focus' && phase === 'focus')) setRemaining(v * 60);
  };

  const meta = PHASE_META[phase];
  const total = totalFor(phase);
  const progress = total > 0 ? 1 - remaining / total : 0;
  const R = 84;
  const CIRC = 2 * Math.PI * R;

  return (
    <div className="space-y-4 font-sans">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setActiveTab('home')}
          className="nb-btn px-3 py-1.5 bg-white text-xs flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4 text-[#121212]" />
          <span>Kembali ke Hub</span>
        </button>
        <span className="text-[10px] font-mono-code font-black px-2.5 py-1 rounded-full border-2 border-[#121212] bg-[#FF70A6] text-[#121212] shadow-[1.5px_1.5px_0px_#121212]">
          MODUL ARDORO
        </span>
      </div>

      {/* Main Focus Card */}
      <div className="nb-card p-5 sm:p-6 bg-[#FF70A6] space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white border-2 border-[#121212] flex items-center justify-center shadow-[2px_2px_0px_#121212] overflow-hidden p-2 shrink-0">
            <img src="/ardoro.png" alt="Ardoro Emblem" className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#121212] uppercase tracking-tight">
              Ardoro — Focus Engine
            </h2>
            <p className="text-xs font-bold text-gray-900">
              Timer Pomodoro offline-first dengan statistik sesi lokal.
            </p>
          </div>
        </div>

        {/* Phase Tabs */}
        <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Pilih fase">
          {(['focus', 'short', 'long']).map((p) => (
            <button
              key={p}
              role="tab"
              aria-selected={phase === p}
              onClick={() => switchPhase(p)}
              className={`nb-btn px-2 py-2 text-[11px] font-black uppercase tracking-wide flex items-center justify-center gap-1 ${
                phase === p ? 'bg-[#121212] text-white' : 'bg-white text-[#121212]'
              }`}
            >
              {p === 'focus' ? <Timer className="w-3.5 h-3.5" /> : <Coffee className="w-3.5 h-3.5" />}
              <span>{PHASE_META[p].label}</span>
            </button>
          ))}
        </div>

        {/* Timer Display — SVG ring (halus, tanpa reflow) */}
        <div className="nb-card p-6 bg-white flex flex-col items-center justify-center space-y-4">
          <div className="relative w-52 h-52">
            <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
              <circle cx="100" cy="100" r={R} fill={meta.color} stroke="#121212" strokeWidth="5" />
              <circle
                cx="100" cy="100" r={R - 10} fill="none" stroke="#121212"
                strokeWidth="7" strokeLinecap="round" opacity="0.18"
              />
              <circle
                cx="100" cy="100" r={R - 10} fill="none" stroke="#121212"
                strokeWidth="7" strokeLinecap="round"
                strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - progress)}
                style={{ transition: 'stroke-dashoffset 0.3s linear' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-mono-code font-black text-[#121212] tracking-wider tabular-nums" aria-live="polite">
                {formatClock(remaining)}
              </span>
              <span className="text-[10px] font-mono-code font-black bg-white text-[#121212] px-2 py-0.5 rounded border border-[#121212] mt-2 shadow-[1px_1px_0px_#121212]">
                {running ? `${meta.chip} • JALAN` : meta.chip}
              </span>
            </div>
          </div>

          {/* Session dots */}
          <div className="flex items-center gap-1.5" aria-label={`Sesi fokus selesai: ${focusDone}`}>
            {Array.from({ length: settings.rounds }).map((_, i) => (
              <span
                key={i}
                className={`w-3 h-3 rounded-full border-2 border-[#121212] ${
                  i < focusDone % settings.rounds || (focusDone > 0 && focusDone % settings.rounds === 0 && i < settings.rounds)
                    ? 'bg-[#38E54D]' : 'bg-white'
                }`}
              />
            ))}
            <span className="text-[10px] font-mono-code font-bold text-gray-600 ml-1">
              {focusDone} sesi
            </span>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={toggleRun}
              className="nb-btn px-6 py-2.5 bg-[#38E54D] text-[#121212] text-xs font-black flex items-center gap-2 min-w-[44px] min-h-[44px]"
            >
              {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{running ? 'Jeda' : remaining < total ? 'Lanjut' : 'Mulai Sesi'}</span>
            </button>
            <button
              onClick={resetTimer}
              className="nb-btn p-2.5 bg-white text-[#121212] min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Reset timer"
              aria-label="Reset timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Settings Card */}
      <div className="nb-card p-4 bg-white space-y-3">
        <button
          onClick={() => setShowSettings((v) => !v)}
          className="w-full flex items-center justify-between font-mono-code font-black text-xs text-[#121212] uppercase tracking-wider border-b-2 border-[#121212] pb-2"
          aria-expanded={showSettings}
        >
          <span className="flex items-center gap-1.5">
            <Settings2 className="w-4 h-4" /> Pengaturan Interval
          </span>
          <span className="text-[10px] bg-[#FFE600] px-2 py-0.5 rounded border border-[#121212]">
            {POMODORO_PRESETS[settings.preset]?.label || 'Kustom'}
          </span>
        </button>

        {showSettings && (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(POMODORO_PRESETS).map(([key, p]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className={`nb-btn px-2 py-2 text-[11px] font-black ${
                    settings.preset === key ? 'bg-[#FFE600] text-[#121212]' : 'bg-[#F8F5EE] text-[#121212]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              {([
                ['focus', 'Fokus (mnt)'],
                ['short', 'Istirahat (mnt)'],
                ['long', 'Pjg (mnt)'],
              ]).map(([key, label]) => (
                <label key={key} className="nb-card p-2 bg-[#F8F5EE] space-y-1">
                  <span className="text-[10px] font-black uppercase text-gray-600">{label}</span>
                  <input
                    type="number" min="1" max="120"
                    value={Math.round(settings[key] / 60)}
                    onChange={(e) => setMinutes(key, e.target.value)}
                    className="w-full bg-white border-2 border-[#121212] rounded-lg px-2 py-1.5 text-sm font-black text-[#121212] outline-none"
                  />
                </label>
              ))}
            </div>

            <label className="flex items-center gap-2 text-xs">
              <span className="font-black uppercase text-gray-600 text-[10px]">Siklus long-break tiap</span>
              <input
                type="number" min="2" max="8"
                value={settings.rounds}
                onChange={(e) => setSettings((s) => ({ ...s, preset: 'kustom', rounds: Math.min(8, Math.max(2, Number(e.target.value) || 4)) }))}
                className="w-16 bg-white border-2 border-[#121212] rounded-lg px-2 py-1.5 text-sm font-black text-[#121212] outline-none"
              />
              <span className="font-bold text-gray-600 text-[11px]">fokus</span>
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSettings((s) => ({ ...s, autoContinue: !s.autoContinue }))}
                className={`nb-btn px-3 py-1.5 text-[11px] font-black ${settings.autoContinue ? 'bg-[#38E54D]' : 'bg-white'} text-[#121212]`}
                aria-pressed={settings.autoContinue}
              >
                Auto-lanjut: {settings.autoContinue ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={() => setSettings((s) => ({ ...s, sound: !s.sound }))}
                className={`nb-btn px-3 py-1.5 text-[11px] font-black ${settings.sound ? 'bg-[#C4FAF8]' : 'bg-white'} text-[#121212] flex items-center gap-1`}
                aria-pressed={settings.sound}
              >
                {settings.sound ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                Bunyi: {settings.sound ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats Card */}
      <div className="nb-card p-4 bg-white space-y-3">
        <h3 className="font-mono-code font-black text-xs text-[#121212] uppercase tracking-wider border-b-2 border-[#121212] pb-2 flex items-center gap-1.5">
          <BarChart3 className="w-4 h-4" /> Statistik Lokal
        </h3>
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="nb-card p-3 bg-[#FFE600] flex items-start gap-2.5">
            <Flame className="w-4 h-4 text-[#121212] shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-[#121212] text-base leading-none">{summary.todaySessions} sesi</p>
              <p className="text-[11px] font-semibold text-gray-700 mt-1">Hari ini • {summary.todayMinutes} mnt fokus</p>
            </div>
          </div>
          <div className="nb-card p-3 bg-[#C4FAF8] flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#121212] shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-[#121212] text-base leading-none">{summary.totalSessions} sesi</p>
              <p className="text-[11px] font-semibold text-gray-700 mt-1">Total • {summary.totalMinutes} mnt fokus</p>
            </div>
          </div>
        </div>
        {/* 7-day bars */}
        <div className="flex items-end justify-between gap-1.5 pt-1" aria-label="Fokus 7 hari terakhir (menit)">
          {summary.last7.map((d) => {
            const max = Math.max(1, ...summary.last7.map((x) => x.minutes));
            const h = Math.max(6, Math.round((d.minutes / max) * 64));
            return (
              <div key={d.key} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] font-mono-code font-black text-[#121212]">{d.minutes > 0 ? d.minutes : ''}</span>
                <div
                  className={`w-full rounded-t-md border-2 border-[#121212] ${d.minutes > 0 ? 'bg-[#38E54D]' : 'bg-[#F1EFE9]'}`}
                  style={{ height: `${h}px` }}
                  title={`${d.label}: ${d.minutes} menit`}
                />
                <span className="text-[9px] font-mono-code font-bold text-gray-500 uppercase">{d.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
