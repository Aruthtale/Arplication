package com.aruthtale.arplication;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Capacitor bridge untuk ArMusicService (ExoPlayer native).
 *
 * Playback control:
 *  - play({ queueJson, index, positionMs, repeatOne }) — queue = JSON array
 *    [{ uri, title, artist, album }]; uri = file:// / content:// / http(s)://
 *  - pause() / resume() / toggle() / next() / prev()
 *  - seek({ positionMs }) | stop() | updateQueue({ queueJson, index, repeatOne })
 *  - show({ title, artist, album, playing }) — legacy meta-only
 *  - dismiss()
 *
 * Event "mediaControl" (extras -> JSObject):
 *  toggle | next | prev | stop | advanced(index,title,artist,album,uri) |
 *  queue-ended | error(message)
 *
 * Web fallback: panggil reject agar JS otomatis pakai <audio> WebView.
 */
@CapacitorPlugin(name = "ArMusic")
public class ArMusicPlugin extends Plugin {
    private BroadcastReceiver controlReceiver;

    @Override
    public void load() {
        controlReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (ArMusicService.CONTROL_BROADCAST.equals(intent.getAction())) {
                    JSObject ret = new JSObject();
                    ret.put("action", intent.getStringExtra("action"));
                    if (intent.hasExtra("index")) ret.put("index", intent.getIntExtra("index", -1));
                    if (intent.hasExtra("title")) ret.put("title", intent.getStringExtra("title"));
                    if (intent.hasExtra("artist")) ret.put("artist", intent.getStringExtra("artist"));
                    if (intent.hasExtra("album")) ret.put("album", intent.getStringExtra("album"));
                    if (intent.hasExtra("uri")) ret.put("uri", intent.getStringExtra("uri"));
                    if (intent.hasExtra("message")) ret.put("message", intent.getStringExtra("message"));
                    notifyListeners("mediaControl", ret);
                }
            }
        };
        IntentFilter f = new IntentFilter(ArMusicService.CONTROL_BROADCAST);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(controlReceiver, f, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(controlReceiver, f);
        }
    }

    private void startSvc(Intent i) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(i);
        } else {
            getContext().startService(i);
        }
    }

    private Intent svcIntent(String action) {
        Intent i = new Intent(getContext(), ArMusicService.class);
        i.setAction(action);
        return i;
    }

    @PluginMethod
    public void play(PluginCall call) {
        String queueJson = call.getString("queueJson", "");
        if (queueJson == null || queueJson.isEmpty()) {
            call.reject("queueJson kosong");
            return;
        }
        // Validasi ringan: minimal 1 item ber-uri.
        try {
            JSONArray arr = new JSONArray(queueJson);
            boolean ok = false;
            for (int k = 0; k < arr.length(); k++) {
                JSONObject o = arr.optJSONObject(k);
                if (o != null && !o.optString("uri", "").isEmpty()) { ok = true; break; }
            }
            if (!ok) { call.reject("queueJson tidak berisi uri valid"); return; }
        } catch (Exception e) {
            call.reject("queueJson bukan JSON array valid");
            return;
        }
        Intent i = svcIntent("PLAY");
        i.putExtra("queueJson", queueJson);
        // CATATAN: jangan pakai call.getInt/getLong — Capacitor mengirim angka JS
        // sebagai Integer/Double via org.json, sehingga getLong() selalu gagal
        // instanceof dan mengembalikan default (seek mental ke 0). optInt/optLong
        // menangani semua tipe Number.
        i.putExtra("index", call.getData().optInt("index", 0));
        i.putExtra("positionMs", call.getData().optLong("positionMs", 0L));
        i.putExtra("repeatOne", Boolean.TRUE.equals(call.getBoolean("repeatOne", false)));
        startSvc(i);
        call.resolve();
    }

    @PluginMethod
    public void updateQueue(PluginCall call) {
        Intent i = svcIntent("UPDATE_QUEUE");
        i.putExtra("queueJson", call.getString("queueJson", ""));
        i.putExtra("index", call.getData().optInt("index", -1));
        i.putExtra("repeatOne", Boolean.TRUE.equals(call.getBoolean("repeatOne", false)));
        startSvc(i);
        call.resolve();
    }

    @PluginMethod
    public void pause(PluginCall call) {
        startSvc(svcIntent("PAUSE"));
        call.resolve();
    }

    @PluginMethod
    public void resume(PluginCall call) {
        startSvc(svcIntent("RESUME"));
        call.resolve();
    }

    @PluginMethod
    public void toggle(PluginCall call) {
        startSvc(svcIntent("TOGGLE"));
        call.resolve();
    }

    @PluginMethod
    public void next(PluginCall call) {
        startSvc(svcIntent("NEXT"));
        call.resolve();
    }

    @PluginMethod
    public void prev(PluginCall call) {
        startSvc(svcIntent("PREV"));
        call.resolve();
    }

    @PluginMethod
    public void seek(PluginCall call) {
        Intent i = svcIntent("SEEK");
        i.putExtra("positionMs", call.getData().optLong("positionMs", 0L));
        startSvc(i);
        call.resolve();
    }

    /**
     * Baca posisi/index terakhir dari snapshot service.
     * Posisi diekstrapolasi: snapshot + (now - stamp) bila playing.
     * Aman dipanggil tiap 500-1000ms dari JS untuk sinkron UI.
     */
    @PluginMethod
    public void getState(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("playing", ArMusicService.lastPlaying);
        ret.put("index", ArMusicService.lastIndex);
        ret.put("queueSize", ArMusicService.lastQueueSize);
        ret.put("durationMs", ArMusicService.lastDurationMs);
        long pos = ArMusicService.lastPositionMs;
        if (ArMusicService.lastPlaying && ArMusicService.lastStampMs > 0) {
            long dt = android.os.SystemClock.elapsedRealtime() - ArMusicService.lastStampMs;
            if (dt > 0) pos += dt;
        }
        long dur = ArMusicService.lastDurationMs;
        if (dur > 0 && pos > dur) pos = dur;
        ret.put("positionMs", Math.max(0, pos));
        call.resolve(ret);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        try {
            getContext().stopService(svcIntent("STOP"));
        } catch (Exception ignored) {}
        call.resolve();
    }

    @PluginMethod
    public void show(PluginCall call) {
        Intent i = svcIntent("SHOW");
        i.putExtra("title", call.getString("title", "Tanpa Judul"));
        i.putExtra("artist", call.getString("artist", "Artis Tidak Dikenal"));
        i.putExtra("album", call.getString("album", "ArMusic"));
        i.putExtra("playing", Boolean.TRUE.equals(call.getBoolean("playing", true)));
        startSvc(i);
        call.resolve();
    }

    @PluginMethod
    public void update(PluginCall call) {
        // Sama seperti show — service menimpa notif yang ada.
        show(call);
    }

    @PluginMethod
    public void dismiss(PluginCall call) {
        // Stop langsung tanpa onStartCommand — lebih bersih & tanpa risiko
        // IllegalStateException startService saat app di background (API 26+).
        Intent i = new Intent(getContext(), ArMusicService.class);
        getContext().stopService(i);
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        try {
            if (controlReceiver != null) getContext().unregisterReceiver(controlReceiver);
        } catch (Exception ignored) {}
    }
}
