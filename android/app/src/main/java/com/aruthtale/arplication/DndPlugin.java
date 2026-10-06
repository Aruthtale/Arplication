package com.aruthtale.arplication;

import android.content.Context;
import android.content.Intent;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Bridge Capacitor untuk mode Jangan Ganggu (Do Not Disturb) Android.
 *
 * Dipakai Ardoro: saat sesi fokus berjalan, otomatis menyalakan DND (hening)
 * lalu mengembalikannya ke kondisi semula saat jeda/selesai.
 *
 * PENTING — izin khusus:
 * Android mewajibkan "akses Jangan Ganggu" (Notification Policy Access) yang
 * TIDAK bisa diminta lewat popup runtime. User harus mengaktifkannya manual di
 * Settings → Notifikasi → Jangan Ganggu → Akses. Plugin ini menyediakan
 * `openSettings()` untuk membuka halaman tsb.
 *
 * PENTING — satu sumber kebenaran:
 * Semua logika & penyimpanan ada di DndStore, yang juga dipakai oleh
 * ArdoroTimerService. Jangan duplikasi logika di sini — kalau tidak, plugin
 * dan service bisa membaca preferensi/filter yang berbeda (bug nyata).
 */
@CapacitorPlugin(name = "Dnd")
public class DndPlugin extends Plugin {

    private JSObject buildState() {
        Context ctx = getContext();
        JSObject ret = new JSObject();
        ret.put("supported", DndStore.isSupported());
        ret.put("granted", DndStore.isGranted(ctx));
        ret.put("active", DndStore.isActive(ctx));
        ret.put("auto", DndStore.isAuto(ctx));
        return ret;
    }

    @PluginMethod
    public void getState(PluginCall call) {
        call.resolve(buildState());
    }

    /** Buka halaman pengaturan akses Jangan Ganggu. */
    @PluginMethod
    public void openSettings(PluginCall call) {
        if (!DndStore.isSupported()) {
            call.reject("UNSUPPORTED");
            return;
        }
        try {
            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("CANNOT_OPEN_SETTINGS: " + e.getMessage());
        }
    }

    /** Simpan preferensi "DND otomatis saat fokus" (auto ON/OFF). */
    @PluginMethod
    public void setAuto(PluginCall call) {
        Boolean auto = call.getBoolean("auto");
        if (auto == null) {
            call.reject("Missing 'auto'");
            return;
        }
        DndStore.setAuto(getContext(), auto);
        call.resolve(buildState());
    }

    /**
     * Nyalakan/matikan DND manual. Saat menyalakan, filter SEBELUMNYA diingat
     * agar bisa dipulihkan persis saat dimatikan.
     */
    @PluginMethod
    public void setEnabled(PluginCall call) {
        Boolean enabled = call.getBoolean("enabled");
        if (enabled == null) {
            call.reject("Missing 'enabled'");
            return;
        }
        if (!DndStore.isSupported()) {
            call.reject("UNSUPPORTED");
            return;
        }
        if (!DndStore.isGranted(getContext())) {
            JSObject ret = buildState();
            ret.put("needsPermission", true);
            call.resolve(ret);
            return;
        }
        try {
            // Gunakan status hasil yang diniatkan, BUKAN baca-ulang filter:
            // sebagian OEM (MIUI) memperbarui getCurrentInterruptionFilter
            // dengan lag sehingga laporan status bisa basi/terbalik.
            boolean expectedActive;
            if (enabled) expectedActive = DndStore.enable(getContext());
            else expectedActive = DndStore.restore(getContext());
            JSObject ret = buildState();
            ret.put("active", expectedActive);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("SET_DND_FAILED: " + e.getMessage());
        }
    }
}
