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
    <div className="min-h-screen bg-[#F8F5EE] text-[#121212] flex flex-col selection:bg-[#FFE600] selection:text-[#121212]">
      {/* Top Neubrutalist Header */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main View Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-4 pt-3 sm:pt-5 pb-24">
        {activeTab === 'home' && <HomeHub setActiveTab={setActiveTab} />}
        {activeTab === 'arloader' && <ArloaderModule setActiveTab={setActiveTab} />}
        {activeTab === 'ardoro' && <ArdoroPlaceholder setActiveTab={setActiveTab} />}
        {activeTab === 'arnote' && <ArNotePlaceholder setActiveTab={setActiveTab} />}
        {activeTab === 'aruthtale' && <AruthtaleInfo setActiveTab={setActiveTab} />}
      </main>

      {/* Bottom Neubrutalist Navigation */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
