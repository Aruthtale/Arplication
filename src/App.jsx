import React, { useState, useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import HomeHub from './components/modules/HomeHub';
import ArloaderModule from './components/modules/arloader/ArloaderModule';
import ArdoroModule from './components/modules/ardoro/ArdoroModule';
import ArNoteModule from './components/modules/arnote/ArNoteModule';
import ArMusicModule from './components/modules/armusic/ArMusicModule';
import ArToolboxModule from './components/modules/artoolbox/ArToolboxModule';
import ArgameModule from './components/modules/argame/ArgameModule';
import AruthtaleInfo from './components/modules/AruthtaleInfo';
import { ensureNotificationChannel } from './utils/notification';
import { dispatchBackEvent } from './services/backHandler';
import { getWidgetLaunchIntent } from './services/widgetBridge';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [showExitToast, setShowExitToast] = useState(false);
  const lastBackPressRef = useRef(0);
  const activeTabRef = useRef(activeTab);

  // Keep activeTabRef synchronized for event listeners
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    ensureNotificationChannel().catch(() => {});

    // Fungsi pemroses intent navigasi widget
    const routeWidgetIntent = (intent) => {
      if (!intent) return;
      const action = intent.action || '';
      if (action === 'com.aruthtale.arplication.OPEN_NOTE' || action === 'com.aruthtale.arplication.CREATE_NOTE') {
        setActiveTab('arnote');
        // Broadcast ke modul ArNote agar membuka catatan / editor modal
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('arNoteWidgetIntent', { detail: intent }));
        }, 150);
      }
    };

    // 1. Cek window.__lastArNavIntent (jika MainActivity inject via evaluateJavascript)
    if (window.__lastArNavIntent) {
      routeWidgetIntent(window.__lastArNavIntent);
      window.__lastArNavIntent = null;
    }

    // 2. Cek Intent Launch saat Cold-Start dari Plugin Native
    const checkColdStartIntent = async () => {
      const intent = await getWidgetLaunchIntent();
      if (intent && intent.action) {
        routeWidgetIntent(intent);
      }
    };
    checkColdStartIntent();
    // Retry sekali lagi setelah 350ms jika native plugin baru siap
    const retryTimer = setTimeout(checkColdStartIntent, 350);

    // 3. Listener untuk Warm-Start Navigation Intent (dari MainActivity)
    const handleNavIntent = (e) => {
      const detail = typeof e.detail === 'string' ? JSON.parse(e.detail || '{}') : (e.detail || {});
      routeWidgetIntent(detail);
    };
    window.addEventListener('arNavIntent', handleNavIntent);

    // 4. Listener untuk OAuth Deep Links (Google OAuth redirect)
    let appUrlOpenListener = null;
    try {
      CapacitorApp.addListener('appUrlOpen', (data) => {
        const url = data.url;
        
        // Cek apakah ini OAuth callback
        if (url.startsWith('com.aruthtale.arplication://oauth-callback')) {
          try {
            const urlObj = new URL(url);
            const code = urlObj.searchParams.get('code');
            const state = urlObj.searchParams.get('state');
            
            if (code && state) {
              // Dispatch custom event untuk youtubeMusicAuth.js
              window.dispatchEvent(new CustomEvent('oauth-callback', {
                detail: { code, state }
              }));
            }
          } catch (err) {
            console.error('Failed to parse OAuth callback URL:', err);
          }
        }
      }).then((handle) => {
        appUrlOpenListener = handle;
      }).catch(() => {});
    } catch (err) {
      console.log('App URL Open listener setup bypassed on web:', err);
    }

    // 5. Listener Tombol Hardware Back Android
    let backListenerHandle = null;
    try {
      CapacitorApp.addListener('backButton', () => {
        // 1. Coba delegasikan ke modal / sub-view yang sedang aktif (LIFO)
        const handledByModal = dispatchBackEvent();
        if (handledByModal) {
          return;
        }

        const currentTab = activeTabRef.current;

        // 2. Jika sedang di tab selain 'home', kembali ke tab 'home'
        if (currentTab !== 'home') {
          setActiveTab('home');
          return;
        }

        // 3. Jika sudah di 'home', jalankan sistem konfirmasi 2 kali tekan back
        const now = Date.now();
        if (now - lastBackPressRef.current < 2000) {
          CapacitorApp.exitApp();
        } else {
          lastBackPressRef.current = now;
          setShowExitToast(true);
          setTimeout(() => {
            setShowExitToast(false);
          }, 2000);
        }
      }).then((handle) => {
        backListenerHandle = handle;
      }).catch(() => {});
    } catch (err) {
      console.log('Back button listener setup bypassed on web:', err);
    }

    return () => {
      clearTimeout(retryTimer);
      window.removeEventListener('arNavIntent', handleNavIntent);
      if (backListenerHandle && typeof backListenerHandle.remove === 'function') {
        backListenerHandle.remove();
      }
      if (appUrlOpenListener && typeof appUrlOpenListener.remove === 'function') {
        appUrlOpenListener.remove();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F5EE] text-[#121212] flex flex-col selection:bg-[#FFE600] selection:text-[#121212] relative">
      {/* Top Neubrutalist Header */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main View Area with comfortable safe margins from screen edge */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 pt-3.5 sm:pt-6 pb-28">
        {activeTab === 'home' && <HomeHub setActiveTab={setActiveTab} />}
        {/* Arloader SELALU mounted (hidden saat tab lain aktif) agar state
            ekstraksi, input URL, dan progress download tidak ter-reset saat navigasi. */}
        <div className={activeTab === 'arloader' ? '' : 'hidden'}>
          <ArloaderModule setActiveTab={setActiveTab} />
        </div>
        {activeTab === 'ardoro' && <ArdoroModule setActiveTab={setActiveTab} />}
        {activeTab === 'arnote' && <ArNoteModule setActiveTab={setActiveTab} />}
        {/* ArMusic SELALU mounted (hidden saat tab lain aktif) agar audio + state
            tidak ikut unmount — pindah page tidak menghentikan lagu. */}
        <div className={activeTab === 'armusic' ? '' : 'hidden'}>
          <ArMusicModule setActiveTab={setActiveTab} />
        </div>
        {activeTab === 'artoolbox' && <ArToolboxModule setActiveTab={setActiveTab} />}
        {activeTab === 'argame' && <ArgameModule setActiveTab={setActiveTab} />}
        {activeTab === 'aruthtale' && <AruthtaleInfo setActiveTab={setActiveTab} />}
      </main>

      {/* Bottom Neubrutalist Navigation */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Neubrutalist Exit Confirmation Toast */}
      {showExitToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="px-4 py-2.5 bg-[#121212] text-white text-xs sm:text-sm font-black rounded-xl border-2 border-[#121212] shadow-[3px_3px_0px_#FFE600] flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFE600] animate-ping" />
            Tekan sekali lagi untuk keluar dari Arplication
          </div>
        </div>
      )}
    </div>
  );
}
