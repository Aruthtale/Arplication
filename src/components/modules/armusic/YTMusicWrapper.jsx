import React, { useState, useEffect } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { loadAuthState } from '../../../services/youtubeMusicAuth.js';
import YTMusicSearchView from './YTMusicSearchView.jsx';
import YTMusicAuthenticatedView from './YTMusicAuthenticatedView.jsx';

/**
 * YouTube Music Wrapper dengan mode toggle:
 * - Guest mode (default): Public search via Piped/Innertube
 * - Authenticated mode: Personal library, liked songs, recommendations
 */
export default function YTMusicWrapper(props) {
  const [mode, setMode] = useState('guest'); // 'guest' | 'authenticated'
  const [authState, setAuthState] = useState(null);

  useEffect(() => {
    // DISABLED: Paksa guest mode untuk sementara
    // Check apakah user sudah login sebelumnya
    // const savedAuth = loadAuthState();
    // if (savedAuth) {
    //   setAuthState(savedAuth);
    //   setMode('authenticated');
    // }
  }, []);

  const handleModeToggle = () => {
    if (mode === 'guest') {
      // Switch ke authenticated → YTMusicAuthenticatedView akan handle login
      setMode('authenticated');
    } else {
      // Switch ke guest
      setMode('guest');
    }
  };

  return (
    <div className="space-y-3">
      {/* Mode toggle header - HIDDEN untuk sementara, langsung guest mode */}
      {false && (
      <div className="flex items-center justify-between p-2 rounded-lg bg-[#F8F5EE] border border-black">
        <div className="flex items-center gap-2">
          {mode === 'guest' ? (
            <>
              <Unlock className="w-4 h-4 text-[#121212]" />
              <span className="text-xs font-bold text-[#121212]">Mode: Guest (Tanpa Login)</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 text-[#38E54D]" />
              <span className="text-xs font-bold text-[#121212]">Mode: Authenticated</span>
            </>
          )}
        </div>
        <button
          onClick={handleModeToggle}
          className="px-2 py-1 rounded-lg bg-white hover:bg-[#FFE600] border border-black text-[10px] font-mono-code font-black uppercase"
        >
          {mode === 'guest' ? '🔐 Login' : '🔓 Guest Mode'}
        </button>
      </div>
      )}

      {/* Render appropriate view */}
      {mode === 'guest' ? (
        <YTMusicSearchView {...props} />
      ) : (
        <YTMusicAuthenticatedView {...props} />
      )}
    </div>
  );
}
