# Ardoro Bug Fixes — Implementation Plan

**Date:** 2026-09-14  
**Version Target:** v0.2.7  
**Bugs:** 5 critical issues

---

## 🐛 Bug Summary

| # | Bug | Root Cause | Priority | Effort |
|---|-----|------------|----------|--------|
| 1 | Notifikasi tidak bisa dicek | No UI for permission status | High | Low |
| 2 | Nada dering notifikasi tidak ada | Channel missing sound config | High | Low |
| 3 | Suara ambient tidak ada | Feature not implemented | Medium | Medium |
| 4 | Timer mati saat minimize | No foreground service | Critical | High |
| 5 | Timer reset saat pindah page | State not persisted | Critical | Medium |

---

## 📋 Phase 1: Notification Fixes (Quick Wins)

### Task 1.1: Add Notification Permission Check UI
**Files:**
- `src/components/modules/ardoro/ArdoroModule.jsx`
- `src/utils/notification.js`

**Changes:**
1. Add `checkNotificationPermission()` helper di `notification.js`
2. Add state `notifEnabled` ke `ArdoroModule`
3. Add toggle button di Settings card dengan permission checker
4. Show permission status (Granted / Denied / Not Requested)

**Implementation:**
```javascript
// notification.js
export async function checkNotificationPermission() {
  if (!isNative()) return { granted: false, canRequest: false };
  try {
    const perm = await LocalNotifications.checkPermissions();
    return {
      granted: perm.display === 'granted',
      canRequest: perm.display === 'prompt',
      denied: perm.display === 'denied',
    };
  } catch {
    return { granted: false, canRequest: false };
  }
}

export async function requestNotificationPermission() {
  if (!isNative()) return false;
  try {
    const req = await LocalNotifications.requestPermissions();
    return req.display === 'granted';
  } catch {
    return false;
  }
}
```

**UI Addition (Settings Card):**
```jsx
const [notifStatus, setNotifStatus] = useState({ granted: false, canRequest: false });

useEffect(() => {
  checkNotificationPermission().then(setNotifStatus);
}, []);

// In Settings Card JSX:
<div className="nb-card p-3 bg-[#F8F5EE] space-y-2">
  <div className="flex items-center justify-between">
    <span className="text-[11px] font-black uppercase text-gray-600">Notifikasi</span>
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border border-[#121212] ${
      notifStatus.granted ? 'bg-[#38E54D]' : 'bg-[#FFE600]'
    }`}>
      {notifStatus.granted ? 'AKTIF' : notifStatus.denied ? 'DITOLAK' : 'NONAKTIF'}
    </span>
  </div>
  {!notifStatus.granted && notifStatus.canRequest && (
    <button
      onClick={async () => {
        const ok = await requestNotificationPermission();
        if (ok) setNotifStatus(await checkNotificationPermission());
      }}
      className="nb-btn w-full px-3 py-1.5 text-[11px] font-black bg-[#38E54D] text-[#121212]"
    >
      Aktifkan Notifikasi
    </button>
  )}
  {notifStatus.denied && (
    <p className="text-[10px] text-gray-600">
      Izin ditolak. Buka Pengaturan Android → Aplikasi → Arplication → Notifikasi.
    </p>
  )}
</div>
```

**Testing:**
- [ ] Install APK fresh (permission belum diminta)
- [ ] Check status shows "NONAKTIF"
- [ ] Click "Aktifkan Notifikasi" → system dialog muncul
- [ ] Grant → status berubah "AKTIF"
- [ ] Deny → status "DITOLAK" + instruksi manual

---

### Task 1.2: Fix Notification Channel Sound
**Files:**
- `src/utils/notification.js`

**Changes:**
1. Add `sound: true` dan custom sound URI ke channel config
2. Create dedicated channel for Ardoro (separate from Arloader)

**Implementation:**
```javascript
// notification.js - line 17-26
if (!channelCreated) {
  // Arloader channel (existing)
  await LocalNotifications.createChannel({
    id: 'arloader_downloads',
    name: 'Arloader Unduhan',
    description: 'Notifikasi status penyelesaian unduhan media Arloader',
    importance: 4,
    visibility: 1,
    vibration: true,
    sound: 'default', // ADD THIS
  }).catch(() => {});
  
  // Ardoro channel (NEW)
  await LocalNotifications.createChannel({
    id: 'ardoro_timer',
    name: 'Ardoro Timer',
    description: 'Notifikasi fase Pomodoro selesai',
    importance: 5, // Max importance for heads-up
    visibility: 1,
    vibration: true,
    sound: 'default', // System default sound
  }).catch(() => {});
  
  channelCreated = true;
}
```

**Update `sendPomodoroPhaseNotification`:**
```javascript
// Line 114-116
channelId: 'ardoro_timer', // Changed from 'arloader_downloads'
sound: 'default', // Explicit sound
```

**Testing:**
- [ ] Jalankan timer sampai phase selesai
- [ ] Notifikasi muncul dengan suara (bukan silent)
- [ ] Vibration works

---

## 📋 Phase 2: Ambient Sound Feature

### Task 2.1: Implement Ambient Sound Player
**Files:**
- `src/utils/ambientSound.js` (NEW)
- `src/components/modules/ardoro/ArdoroModule.jsx`

**Implementation:**
```javascript
// src/utils/ambientSound.js (NEW FILE)
/**
 * Ambient sound player untuk focus session (offline white noise)
 * Menggunakan Web Audio API untuk generate pink/brown noise
 */

let audioContext = null;
let noiseNode = null;
let gainNode = null;
let isPlaying = false;

const NOISE_TYPES = {
  pink: { label: 'Pink Noise', color: '#FF70A6' },
  brown: { label: 'Brown Noise', color: '#8B4513' },
  white: { label: 'White Noise', color: '#FFFFFF' },
};

export function getNoiseTypes() {
  return NOISE_TYPES;
}

function createNoiseBuffer(type, duration = 2) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  
  const ctx = new Ctx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = buffer.getChannelData(0);
  
  if (type === 'white') {
    // White noise: random values
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  } else if (type === 'pink') {
    // Pink noise: 1/f spectrum (simplified)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      output[i] *= 0.11; // Adjust volume
      b6 = white * 0.115926;
    }
  } else if (type === 'brown') {
    // Brown noise: integral of white noise
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (last + (0.02 * white)) / 1.02;
      last = output[i];
      output[i] *= 3.5; // Adjust volume
    }
  }
  
  return buffer;
}

export function startAmbientSound(type = 'pink', volume = 0.3) {
  try {
    if (isPlaying) stopAmbientSound();
    
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    
    audioContext = new Ctx();
    const buffer = createNoiseBuffer(type, 2);
    if (!buffer) return false;
    
    // Loop noise buffer
    noiseNode = audioContext.createBufferSource();
    noiseNode.buffer = buffer;
    noiseNode.loop = true;
    
    // Volume control
    gainNode = audioContext.createGain();
    gainNode.gain.value = Math.max(0, Math.min(1, volume));
    
    noiseNode.connect(gainNode);
    gainNode.connect(audioContext.destination);
    noiseNode.start(0);
    
    isPlaying = true;
    return true;
  } catch (e) {
    console.warn('Failed to start ambient sound:', e);
    return false;
  }
}

export function stopAmbientSound() {
  try {
    if (noiseNode) {
      noiseNode.stop();
      noiseNode.disconnect();
      noiseNode = null;
    }
    if (gainNode) {
      gainNode.disconnect();
      gainNode = null;
    }
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
    isPlaying = false;
  } catch (e) {
    console.warn('Failed to stop ambient sound:', e);
  }
}

export function setAmbientVolume(volume) {
  if (gainNode) {
    gainNode.gain.value = Math.max(0, Math.min(1, volume));
  }
}

export function isAmbientPlaying() {
  return isPlaying;
}
```

**Add to ArdoroModule:**
```jsx
import { startAmbientSound, stopAmbientSound, setAmbientVolume, getNoiseTypes, isAmbientPlaying } from '../../../utils/ambientSound.js';

// In component state
const [ambientEnabled, setAmbientEnabled] = useState(false);
const [ambientType, setAmbientType] = useState('pink');
const [ambientVolume, setAmbientVolume] = useState(0.3);

// Hook to sync ambient with timer
useEffect(() => {
  if (running && phase === 'focus' && ambientEnabled) {
    startAmbientSound(ambientType, ambientVolume);
  } else {
    stopAmbientSound();
  }
  return () => stopAmbientSound();
}, [running, phase, ambientEnabled, ambientType, ambientVolume]);

// In Settings Card JSX (after sound toggle):
<div className="nb-card p-3 bg-[#F8F5EE] space-y-2">
  <div className="flex items-center justify-between">
    <span className="text-[11px] font-black uppercase text-gray-600">Suara Ambient (Fokus)</span>
    <button
      onClick={() => setAmbientEnabled(!ambientEnabled)}
      className={`text-[10px] font-bold px-2 py-0.5 rounded border border-[#121212] ${
        ambientEnabled ? 'bg-[#C4FAF8]' : 'bg-white'
      }`}
    >
      {ambientEnabled ? 'ON' : 'OFF'}
    </button>
  </div>
  
  {ambientEnabled && (
    <>
      <div className="flex gap-1.5">
        {Object.entries(getNoiseTypes()).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => {
              setAmbientType(key);
              if (isAmbientPlaying()) {
                stopAmbientSound();
                startAmbientSound(key, ambientVolume);
              }
            }}
            className={`nb-btn flex-1 px-2 py-1.5 text-[10px] font-black ${
              ambientType === key ? 'bg-[#C4FAF8]' : 'bg-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      
      <div className="space-y-1">
        <span className="text-[10px] font-bold text-gray-600">Volume: {Math.round(ambientVolume * 100)}%</span>
        <input
          type="range"
          min="0"
          max="100"
          value={ambientVolume * 100}
          onChange={(e) => {
            const v = Number(e.target.value) / 100;
            setAmbientVolume(v);
            setAmbientVolume(v);
          }}
          className="w-full"
        />
      </div>
    </>
  )}
</div>
```

**Testing:**
- [ ] Enable ambient sound
- [ ] Start focus timer → pink noise plays
- [ ] Switch to break → noise stops
- [ ] Test pink/brown/white noise types
- [ ] Volume slider works
- [ ] Sound stops when timer paused

---

## 📋 Phase 3: Background Timer (CRITICAL)

### Task 3.1: Persist Timer State to localStorage
**Files:**
- `src/utils/pomodoro.js`
- `src/components/modules/ardoro/ArdoroModule.jsx`

**Implementation:**
```javascript
// pomodoro.js - Add persistence functions
const TIMER_STATE_KEY = 'ardoro_timer_state_v1';

export function saveTimerState(state) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TIMER_STATE_KEY, JSON.stringify({
        ...state,
        savedAt: Date.now(),
      }));
    }
  } catch {}
}

export function loadTimerState() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(TIMER_STATE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw);
    
    // Adjust remaining time based on elapsed time since save
    if (state.running && state.endAt) {
      const elapsed = (Date.now() - state.savedAt) / 1000;
      const newRemaining = Math.max(0, state.remaining - elapsed);
      return { ...state, remaining: newRemaining };
    }
    
    return state;
  } catch {
    return null;
  }
}

export function clearTimerState() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TIMER_STATE_KEY);
    }
  } catch {}
}
```

**Update ArdoroModule to persist state:**
```jsx
// Load state on mount
useEffect(() => {
  const saved = loadTimerState();
  if (saved && saved.running) {
    setPhase(saved.phase);
    setFocusDone(saved.focusDone);
    setRemaining(saved.remaining);
    if (saved.remaining > 0) {
      endAtRef.current = Date.now() + saved.remaining * 1000;
      setRunning(true);
    }
  }
}, []);

// Save state on every change
useEffect(() => {
  if (running) {
    saveTimerState({
      phase,
      focusDone,
      remaining,
      running,
      endAt: endAtRef.current,
    });
  } else {
    clearTimerState();
  }
}, [running, phase, focusDone, remaining]);
```

**Testing:**
- [ ] Start timer
- [ ] Navigate ke ArNote → kembali ke Ardoro
- [ ] Timer masih jalan dengan waktu yang benar
- [ ] Pause timer → navigate → timer tetap paused
- [ ] Reset timer → state cleared

---

### Task 3.2: Create Android Foreground Service
**Files:**
- `android/app/src/main/java/com/aruthtale/arplication/ArdoroTimerService.java` (NEW)
- `android/app/src/main/AndroidManifest.xml`
- `src/plugins/TimerServicePlugin.java` (NEW)
- `src/services/timerService.js` (NEW)

**AndroidManifest.xml changes:**
```xml
<!-- Add permission -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<!-- Add service declaration inside <application> -->
<service
    android:name=".ArdoroTimerService"
    android:enabled="true"
    android:exported="false"
    android:foregroundServiceType="shortService" />
```

**Create `ArdoroTimerService.java`:**
```java
package com.aruthtale.arplication;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import androidx.core.app.NotificationCompat;

public class ArdoroTimerService extends Service {
    private static final String CHANNEL_ID = "ardoro_timer_foreground";
    private static final int NOTIFICATION_ID = 1001;
    
    private Handler handler;
    private Runnable tickRunnable;
    private long endTimeMillis;
    private String phase;
    
    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        handler = new Handler(Looper.getMainLooper());
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }
        
        String action = intent.getAction();
        if ("STOP_TIMER".equals(action)) {
            stopSelf();
            return START_NOT_STICKY;
        }
        
        endTimeMillis = intent.getLongExtra("endTime", 0);
        phase = intent.getStringExtra("phase");
        
        if (endTimeMillis == 0) {
            stopSelf();
            return START_NOT_STICKY;
        }
        
        startForeground(NOTIFICATION_ID, buildNotification("Timer berjalan..."));
        startTicking();
        
        return START_STICKY;
    }
    
    private void startTicking() {
        tickRunnable = new Runnable() {
            @Override
            public void run() {
                long remaining = endTimeMillis - System.currentTimeMillis();
                
                if (remaining <= 0) {
                    // Timer selesai
                    sendTimerCompleteIntent();
                    stopSelf();
                    return;
                }
                
                // Update notification
                int seconds = (int) (remaining / 1000);
                int minutes = seconds / 60;
                int secs = seconds % 60;
                String time = String.format("%d:%02d", minutes, secs);
                
                updateNotification("Ardoro " + getPhaseLabel() + " — " + time);
                
                handler.postDelayed(this, 1000);
            }
        };
        
        handler.post(tickRunnable);
    }
    
    private String getPhaseLabel() {
        if ("focus".equals(phase)) return "Fokus";
        if ("short".equals(phase)) return "Istirahat";
        if ("long".equals(phase)) return "Istirahat Panjang";
        return "Timer";
    }
    
    private void sendTimerCompleteIntent() {
        Intent broadcast = new Intent("com.aruthtale.arplication.TIMER_COMPLETE");
        broadcast.putExtra("phase", phase);
        sendBroadcast(broadcast);
    }
    
    @Override
    public void onDestroy() {
        if (handler != null && tickRunnable != null) {
            handler.removeCallbacks(tickRunnable);
        }
        super.onDestroy();
    }
    
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Ardoro Timer Aktif",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Notifikasi timer Ardoro sedang berjalan");
            channel.setShowBadge(false);
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
    
    private Notification buildNotification(String text) {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            PendingIntent.FLAG_IMMUTABLE
        );
        
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("🍅 Ardoro Timer")
            .setContentText(text)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }
    
    private void updateNotification(String text) {
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, buildNotification(text));
        }
    }
}
```

**Create Capacitor Plugin `TimerServicePlugin.java`:**
```java
package com.aruthtale.arplication;

import android.content.Intent;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "TimerService")
public class TimerServicePlugin extends Plugin {
    
    @PluginMethod
    public void startForegroundTimer(PluginCall call) {
        Long endTime = call.getLong("endTime");
        String phase = call.getString("phase");
        
        if (endTime == null || phase == null) {
            call.reject("Missing endTime or phase");
            return;
        }
        
        Intent serviceIntent = new Intent(getContext(), ArdoroTimerService.class);
        serviceIntent.putExtra("endTime", endTime);
        serviceIntent.putExtra("phase", phase);
        
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            getContext().startForegroundService(serviceIntent);
        } else {
            getContext().startService(serviceIntent);
        }
        
        call.resolve();
    }
    
    @PluginMethod
    public void stopForegroundTimer(PluginCall call) {
        Intent serviceIntent = new Intent(getContext(), ArdoroTimerService.class);
        serviceIntent.setAction("STOP_TIMER");
        getContext().stopService(serviceIntent);
        call.resolve();
    }
}
```

**Register plugin in `MainActivity.java`:**
```java
import com.aruthtale.arplication.TimerServicePlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(FileDownloaderPlugin.class);
        registerPlugin(ApkInstallerPlugin.class);
        registerPlugin(TimerServicePlugin.class); // ADD THIS
    }
}
```

**Create JS bridge `src/services/timerService.js`:**
```javascript
import { registerPlugin } from '@capacitor/core';
import { isNative } from './http.js';

const TimerService = registerPlugin('TimerService');

export async function startForegroundTimer(endTimeMillis, phase) {
  if (!isNative()) return false;
  try {
    await TimerService.startForegroundTimer({
      endTime: endTimeMillis,
      phase: phase,
    });
    return true;
  } catch (e) {
    console.warn('Failed to start foreground timer:', e);
    return false;
  }
}

export async function stopForegroundTimer() {
  if (!isNative()) return;
  try {
    await TimerService.stopForegroundTimer();
  } catch (e) {
    console.warn('Failed to stop foreground timer:', e);
  }
}
```

**Update ArdoroModule to use foreground service:**
```jsx
import { startForegroundTimer, stopForegroundTimer } from '../../../services/timerService.js';

// In toggleRun()
const toggleRun = () => {
  if (running) {
    setRunning(false);
    stopForegroundTimer(); // Stop service
  } else {
    if (remaining <= 0) setRemaining(totalFor(phase));
    const endTime = Date.now() + (remaining > 0 ? remaining : totalFor(phase)) * 1000;
    endAtRef.current = endTime;
    setRunning(true);
    startForegroundTimer(endTime, phase); // Start service
  }
};

// Listen for timer complete broadcast
useEffect(() => {
  if (!isNative()) return;
  
  const listener = (event) => {
    if (event.phase === phase) {
      handlePhaseComplete();
    }
  };
  
  // Register broadcast receiver (needs plugin enhancement)
  // For now, rely on JS interval + service notification
  
  return () => {
    // Cleanup listener
  };
}, [phase, handlePhaseComplete]);
```

**Testing:**
- [ ] Start timer → foreground notification muncul
- [ ] Minimize app → timer tetap jalan (notification update tiap detik)
- [ ] Open app lagi → timer sinkron dengan notification
- [ ] Timer selesai → notification hilang + phase notification muncul
- [ ] Pause timer → foreground notification hilang

---

## 📦 **Build & Release**

### Version Bump
**Files:**
- `package.json`: `"version": "0.2.6"` → `"0.2.7"`
- `android/app/build.gradle`: `versionCode 8` → `9`, `versionName "0.2.6"` → `"0.2.7"`
- `src/services/updater.js`: `APP_VERSION = '0.2.6'` → `'0.2.7'`

### Changelog Entry
```markdown
## [0.2.7] - 2026-09-15

### ✨ Added
- **Notification Permission UI** — Check and request notification permission di Settings
- **Ambient Sound untuk Fokus** — Pink/Brown/White noise dengan volume control
- **Background Timer** — Android Foreground Service untuk persistent timer
- **Timer State Persistence** — Timer tidak reset saat pindah page

### 🐛 Fixed
- Notification channel tanpa suara → added `sound: 'default'`
- Timer mati saat app minimize → foreground service implementation
- Timer reset saat navigasi → localStorage persistence
- Tidak ada UI untuk cek notifikasi → permission checker UI

### 🔄 Changed
- Dedicated notification channel untuk Ardoro (`ardoro_timer`)
- Timer state disimpan ke localStorage setiap perubahan

### 📦 Build
- **versionCode**: 8 → **9**
- **versionName**: "0.2.6" → **"0.2.7"**
```

### Testing Checklist
- [ ] Unit tests pass (34/34)
- [ ] ESLint 0 errors
- [ ] Notification permission UI works
- [ ] Notification sound plays
- [ ] Ambient sound (pink/brown/white) works
- [ ] Timer persists across navigation
- [ ] Foreground service keeps timer alive when minimized
- [ ] Timer completes correctly in background
- [ ] Phase transitions trigger notifications
- [ ] All settings persist (autoContinue, sound, ambient, etc)

### Deployment
```bash
cd ~/Projects/Progress/Arplication
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
adb push app/build/outputs/apk/debug/app-debug.apk /data/local/tmp/
adb shell pm install -r /data/local/tmp/app-debug.apk
```

---

**Total Effort Estimate:** 8-12 hours  
**Priority Order:** Phase 3 (Critical) → Phase 1 (High) → Phase 2 (Medium)

**Next Steps:**
1. Implement Phase 3 (background timer) FIRST — paling critical
2. Test thoroughly dengan minimize/maximize/navigation
3. Implement Phase 1 (notification fixes)
4. Implement Phase 2 (ambient sound) last (nice-to-have)
5. Build, test, release v0.2.7
