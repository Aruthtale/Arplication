import React from 'react';
import { Timer, Play, RotateCcw, Coffee, Bell, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function ArdoroPlaceholder({ setActiveTab }) {
  return (
    <div className="space-y-6 pb-20 pt-2">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setActiveTab('home')}
          className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg bg-[#111319] border border-[#262B3B] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Hub</span>
        </button>

        <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full border bg-[#FF525E]/10 text-[#FF525E] border-[#FF525E]/30">
          Module Ardoro
        </span>
      </div>

      {/* Header */}
      <div className="rounded-2xl border border-[#262B3B] bg-[#111319] p-6 text-center relative overflow-hidden">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FF525E]/15 border border-[#FF525E]/30 flex items-center justify-center mb-4">
          <Timer className="w-8 h-8 text-[#FF525E]" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Ardoro — Focus Engine</h2>
        <p className="text-xs text-gray-400 max-w-md mx-auto">
          Minimalist, distraction-free Pomodoro technique companion designed to cultivate flow states without interruptions.
        </p>

        {/* Conceptual Timer Display */}
        <div className="my-8 flex flex-col items-center justify-center">
          <div className="w-48 h-48 rounded-full border-4 border-[#262B3B] border-t-[#FF525E] flex flex-col items-center justify-center bg-[#0C0E13]">
            <span className="text-4xl font-mono font-bold text-white tracking-wider">25:00</span>
            <span className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-mono">Focus Mode</span>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <button
              disabled
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF525E]/80 text-white font-medium text-xs opacity-60 cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
              Start Session
            </button>
            <button
              disabled
              className="p-2.5 rounded-xl bg-[#181B24] border border-[#262B3B] text-gray-400 opacity-60 cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Roadmap List */}
      <div className="rounded-xl border border-[#262B3B] bg-[#111319] p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Planned Capabilities</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-300">
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#181B24]/60 border border-[#262B3B]/60">
            <CheckCircle2 className="w-4 h-4 text-[#05C46B] shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-white">Custom Interval Loops</p>
              <p className="text-gray-400 text-[11px]">25/5 Classic, 50/10 Deep, or user-defined cycles.</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#181B24]/60 border border-[#262B3B]/60">
            <Coffee className="w-4 h-4 text-[#FF525E] shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-white">Ambient Sound Generator</p>
              <p className="text-gray-400 text-[11px]">White noise, rainfall, and binaural soundscapes.</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#181B24]/60 border border-[#262B3B]/60">
            <Bell className="w-4 h-4 text-[#0FB9B1] shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-white">System Notifications</p>
              <p className="text-gray-400 text-[11px]">Subtle chime and native mobile vibration alerts.</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#181B24]/60 border border-[#262B3B]/60">
            <CheckCircle2 className="w-4 h-4 text-[#05C46B] shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-white">Session Analytics</p>
              <p className="text-gray-400 text-[11px]">Daily focus hours logged locally without telemetry.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
