import React from 'react';
import { Download, Timer, FileText, Info, ArrowRight, Shield, Zap, Sparkles } from 'lucide-react';

export default function HomeHub({ setActiveTab }) {
  const modules = [
    {
      id: 'arloader',
      title: 'Arloader',
      subtitle: 'Universal Media Downloader',
      description: 'Download watermark-free HD videos & high-bitrate audio from TikTok and YouTube directly to your device.',
      icon: Download,
      status: 'Active',
      statusColor: 'bg-[#05C46B]/15 text-[#05C46B] border-[#05C46B]/30',
      accentColor: 'from-[#05C46B]/20 to-transparent',
      borderColor: 'hover:border-[#05C46B]/50',
      actionLabel: 'Launch Downloader',
      isReady: true,
    },
    {
      id: 'ardoro',
      title: 'Ardoro',
      subtitle: 'Focus & Productivity Timer',
      description: 'Pomodoro timer designed to maintain sustained deep work cycles with ambient sounds and task sessions.',
      icon: Timer,
      status: 'Upcoming',
      statusColor: 'bg-[#FF525E]/15 text-[#FF525E] border-[#FF525E]/30',
      accentColor: 'from-[#FF525E]/20 to-transparent',
      borderColor: 'hover:border-[#FF525E]/50',
      actionLabel: 'View Concept',
      isReady: false,
    },
    {
      id: 'arnote',
      title: 'ArNote',
      subtitle: 'Encrypted Scratchpad & Notes',
      description: 'Lightweight offline markdown notes with tag indexing, quick search, and local on-device encryption.',
      icon: FileText,
      status: 'Upcoming',
      statusColor: 'bg-[#0FB9B1]/15 text-[#0FB9B1] border-[#0FB9B1]/30',
      accentColor: 'from-[#0FB9B1]/20 to-transparent',
      borderColor: 'hover:border-[#0FB9B1]/50',
      actionLabel: 'View Concept',
      isReady: false,
    },
    {
      id: 'aruthtale',
      title: 'Aruthtale',
      subtitle: 'Information & Diagnostics',
      description: 'Architecture overview, client runtime health check, version registry, and developer ecosystem details.',
      icon: Info,
      status: 'Ready',
      statusColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
      accentColor: 'from-purple-500/20 to-transparent',
      borderColor: 'hover:border-purple-500/50',
      actionLabel: 'Explore Details',
      isReady: true,
    },
  ];

  return (
    <div className="space-y-6 pb-20 pt-2">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-[#262B3B] bg-gradient-to-b from-[#181B24] to-[#111319] p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#05C46B]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#FF525E]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0C0E13] border border-[#262B3B] text-xs text-gray-300 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#05C46B]" />
            <span>Welcome to Arplication Workspace</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
            Centralized Utility Suite
          </h1>
          <p className="text-sm sm:text-base text-gray-400 max-w-xl leading-relaxed">
            All-in-one personal toolkit running entirely client-side. Zero tracking, no ads, high-speed execution.
          </p>

          <div className="mt-6 flex flex-wrap gap-4 text-xs font-mono text-gray-400">
            <div className="flex items-center gap-1.5 bg-[#0C0E13]/60 px-3 py-1.5 rounded-lg border border-[#262B3B]">
              <Shield className="w-3.5 h-3.5 text-[#05C46B]" />
              <span>100% Client-Side</span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#0C0E13]/60 px-3 py-1.5 rounded-lg border border-[#262B3B]">
              <Zap className="w-3.5 h-3.5 text-[#FF525E]" />
              <span>Cross-Platform Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modules Grid */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-base font-semibold text-white tracking-tight">
            Application Modules
          </h2>
          <span className="text-xs text-gray-400 font-mono">4 Modules Integrated</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.id}
                onClick={() => setActiveTab(mod.id)}
                className={`group relative flex flex-col justify-between rounded-xl border border-[#262B3B] bg-[#111319] p-5 cursor-pointer transition-all duration-300 ${mod.borderColor} hover:shadow-xl hover:shadow-black/40 hover:-translate-y-0.5`}
              >
                <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${mod.accentColor} opacity-50 rounded-t-xl pointer-events-none`} />

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[#181B24] border border-[#262B3B] flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${mod.statusColor}`}>
                      {mod.status}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-white group-hover:text-[#05C46B] transition-colors">
                    {mod.title}
                  </h3>
                  <p className="text-xs font-medium text-gray-400 mb-2">
                    {mod.subtitle}
                  </p>
                  <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 mb-4">
                    {mod.description}
                  </p>
                </div>

                <div className="relative z-10 pt-3 border-t border-[#262B3B]/60 flex items-center justify-between text-xs font-medium">
                  <span className="text-gray-400 group-hover:text-white transition-colors">
                    {mod.actionLabel}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#05C46B] group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
