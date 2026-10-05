package com.aruthtale.arplication;

import android.accessibilityservice.AccessibilityService;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.provider.Settings;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.WindowManager;
import android.view.accessibility.AccessibilityEvent;
import android.widget.TextView;

/**
 * Ardoro Focus Lock — deteksi aplikasi terblokir secara real-time.
 *
 * Saat sesi fokus Ardoro berjalan, service ini memantau aplikasi yang dibuka.
 * Bila aplikasi masuk daftar blokir (atau tidak ada di whitelist), service
 * menampilkan overlay peringatan bertema Ardoro, lalu mengembalikan user ke Home.
 *
 * Izin: Settings → Accessibility → Arplication Fokus.
 */
public class AppBlockerAccessibilityService extends AccessibilityService {
    private static final String TAG = "ArdoroBlocker";
    private static final long DEBOUNCE_MS = 900;
    private static final long OVERLAY_DURATION_MS = 1900;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private WindowManager windowManager;
    private View overlayView;
    private String lastBlockedPkg = null;
    private long lastBlockTime = 0;

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        windowManager = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
        Log.i(TAG, "Service terhubung | enabled=" + AppBlockerStore.isEnabled(this)
                + " auto=" + AppBlockerStore.isAuto(this)
                + " mode=" + AppBlockerStore.getMode(this)
                + " packages=" + AppBlockerStore.getPackages(this).toString());
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null) return;
        if (event.getEventType() != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return;

        CharSequence pkgCs = event.getPackageName();
        if (pkgCs == null) return;
        String pkg = pkgCs.toString();
        if (pkg.isEmpty()) return;

        boolean enabled = AppBlockerStore.isEnabled(this);
        boolean always = isAlwaysAllowed(pkg);
        boolean shouldBlk = shouldBlock(pkg);

        if (overlayView != null) return;              // overlay sedang tampil
        if (!enabled) return;                          // fitur nonaktif
        if (always) return;
        if (!shouldBlk) return;

        long now = SystemClock.elapsedRealtime();
        if (pkg.equals(lastBlockedPkg) && now - lastBlockTime < DEBOUNCE_MS) return;
        lastBlockedPkg = pkg;
        lastBlockTime = now;

        blockApp(pkg);
    }

    private boolean shouldBlock(String pkg) {
        boolean listed = AppBlockerStore.isListed(this, pkg);
        if ("whitelist".equals(AppBlockerStore.getMode(this))) {
            // Whitelist hanya berlaku untuk aplikasi yang bisa diluncurkan user,
            // sehingga keyboard / system UI / layanan latar tidak ikut terblokir.
            if (!hasLauncher(pkg)) return false;
            // Daftar kosong = jangan blokir apa pun (mencegah terkunci total).
            if (AppBlockerStore.getPackages(this).length() == 0) return false;
            return !listed;
        }
        return listed;
    }

    private boolean hasLauncher(String pkg) {
        try {
            return getPackageManager().getLaunchIntentForPackage(pkg) != null;
        } catch (Exception e) {
            return false;
        }
    }

    /** Aplikasi yang tidak pernah diblokir agar user tidak terkunci dari sistem. */
    private boolean isAlwaysAllowed(String pkg) {
        if (pkg.equals(getPackageName())) return true;
        if ("com.android.systemui".equals(pkg)) return true;
        if ("android".equals(pkg)) return true;
        if ("com.android.settings".equals(pkg)) return true;
        return isDefaultHome(pkg);
    }

    private boolean isDefaultHome(String pkg) {
        try {
            Intent home = new Intent(Intent.ACTION_MAIN);
            home.addCategory(Intent.CATEGORY_HOME);
            ResolveInfo ri = getPackageManager().resolveActivity(home, PackageManager.MATCH_DEFAULT_ONLY);
            return ri != null && ri.activityInfo != null && pkg.equals(ri.activityInfo.packageName);
        } catch (Exception e) {
            return false;
        }
    }

    private String appLabel(String pkg) {
        try {
            return getPackageManager()
                    .getApplicationLabel(getPackageManager().getApplicationInfo(pkg, 0))
                    .toString();
        } catch (Exception e) {
            return pkg;
        }
    }

    private void blockApp(String pkg) {
        boolean canOverlay = Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(this);
        if (!canOverlay) {
            // Tanpa izin overlay: tetap blokir dengan langsung kembali ke Home.
            goHome();
            return;
        }
        try {
            overlayView = LayoutInflater.from(this).inflate(R.layout.block_overlay, null);
            TextView label = overlayView.findViewById(R.id.block_app_label);
            if (label != null) {
                label.setText(appLabel(pkg) + " diblokir selama sesi fokus.");
            }
            overlayView.setOnClickListener(v -> dismissOverlay(true));

            int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                    ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                    : WindowManager.LayoutParams.TYPE_PHONE;

            WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.MATCH_PARENT,
                    type,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                            | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                    PixelFormat.TRANSLUCENT);

            windowManager.addView(overlayView, params);
            handler.postDelayed(() -> dismissOverlay(true), OVERLAY_DURATION_MS);
        } catch (Exception e) {
            Log.e(TAG, "Gagal menampilkan overlay blokir", e);
            dismissOverlay(false);
            goHome();
        }
    }

    private void dismissOverlay(boolean goHomeAfter) {
        handler.removeCallbacksAndMessages(null);
        if (overlayView != null && windowManager != null) {
            try {
                windowManager.removeView(overlayView);
            } catch (Exception ignored) {}
        }
        overlayView = null;
        if (goHomeAfter) goHome();
    }

    private void goHome() {
        try {
            performGlobalAction(GLOBAL_ACTION_HOME);
        } catch (Exception e) {
            Log.e(TAG, "GLOBAL_ACTION_HOME gagal", e);
        }
    }

    @Override
    public void onInterrupt() {}

    @Override
    public void onDestroy() {
        dismissOverlay(false);
        super.onDestroy();
    }
}
