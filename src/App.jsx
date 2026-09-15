import React, { useState } from 'react';
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import HomeHub from './components/modules/HomeHub';
import ArloaderModule from './components/modules/arloader/ArloaderModule';
import ArdoroModule from './components/modules/ardoro/ArdoroModule';
import ArNoteModule from './components/modules/arnote/ArNoteModule';
import ArMusicModule from './components/modules/armusic/ArMusicModule';
import AruthtaleInfo from './components/modules/AruthtaleInfo';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div className="min-h-screen bg-[#F8F5EE] text-[#121212] flex flex-col selection:bg-[#FFE600] selection:text-[#121212]">
      {/* Top Neubrutalist Header */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main View Area with comfortable safe margins from screen edge */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 pt-3.5 sm:pt-6 pb-28">
        {activeTab === 'home' && <HomeHub setActiveTab={setActiveTab} />}
        {activeTab === 'arloader' && <ArloaderModule setActiveTab={setActiveTab} />}
        {activeTab === 'ardoro' && <ArdoroModule setActiveTab={setActiveTab} />}
        {activeTab === 'arnote' && <ArNoteModule setActiveTab={setActiveTab} />}
        {activeTab === 'armusic' && <ArMusicModule setActiveTab={setActiveTab} />}
        {activeTab === 'aruthtale' && <AruthtaleInfo setActiveTab={setActiveTab} />}
      </main>

      {/* Bottom Neubrutalist Navigation */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
