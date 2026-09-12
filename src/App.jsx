import React, { useState } from 'react';
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import HomeHub from './components/modules/HomeHub';
import ArloaderModule from './components/modules/arloader/ArloaderModule';
import ArdoroPlaceholder from './components/modules/ArdoroPlaceholder';
import ArNotePlaceholder from './components/modules/ArNotePlaceholder';
import AruthtaleInfo from './components/modules/AruthtaleInfo';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div className="min-h-screen bg-[#0C0E13] text-[#F3F4F6] flex flex-col selection:bg-[#05C46B]/30 selection:text-white">
      {/* Top Header */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main View Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 pt-4">
        {activeTab === 'home' && <HomeHub setActiveTab={setActiveTab} />}
        {activeTab === 'arloader' && <ArloaderModule setActiveTab={setActiveTab} />}
        {activeTab === 'ardoro' && <ArdoroPlaceholder setActiveTab={setActiveTab} />}
        {activeTab === 'arnote' && <ArNotePlaceholder setActiveTab={setActiveTab} />}
        {activeTab === 'aruthtale' && <AruthtaleInfo setActiveTab={setActiveTab} />}
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
