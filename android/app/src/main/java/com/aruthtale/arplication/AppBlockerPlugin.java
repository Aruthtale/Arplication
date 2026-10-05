package com.aruthtale.arplication;

import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.text.TextUtils;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.util.List;

/**
 * Bridge Capacitor untuk Ardoro Focus Lock (App Blocker).
 * Mengelola konfigurasi, status izin, dan daftar aplikasi terinstal.
 */
@CapacitorPlugin(name = "AppBlocker")
public class AppBlockerPlugin extends Plugin {

    @PluginMethod
    public void getConfig(PluginCall call) {
        call.resolve(buildConfig());
    }

    @PluginMethod
    public void setConfig(PluginCall call) {
        Context ctx = getContext();
        Boolean enabled = call.getBoolean("enabled");
        Boolean auto = call.getBoolean("auto");
        String mode = call.getString("mode");
        JSArray packages = call.getArray("packages");
        Boolean strict = call.getBoolean("strict");
        Integer graceSeconds = call.getInt("graceSeconds");

        if (enabled != null) AppBlockerStore.setEnabled(ctx, enabled);
        if (auto != null) AppBlockerStore.setAuto(ctx, auto);
        if (mode != null) AppBlockerStore.setMode(ctx, mode);
        if (packages != null) AppBlockerStore.setPackages(ctx, packages);
        if (strict != null) AppBlockerStore.setStrict(ctx, strict);
        if (graceSeconds != null) AppBlockerStore.setGraceSeconds(ctx, graceSeconds);

        call.resolve(buildConfig());
    }

    @PluginMethod
    public void setEnabled(PluginCall call) {
        Boolean enabled = call.getBoolean("enabled");
        if (enabled != null) AppBlockerStore.setEnabled(getContext(), enabled);
        JSObject ret = new JSObject();
        ret.put("enabled", AppBlockerStore.isEnabled(getContext()));
        call.resolve(ret);
    }

    @PluginMethod
    public void isAccessibilityEnabled(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("enabled", isAccessibilityServiceOn(getContext()));
        call.resolve(ret);
    }

    @PluginMethod
    public void openAccessibilitySettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("CANNOT_OPEN_SETTINGS: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openOverlaySettings(PluginCall call) {
        Context ctx = getContext();
        try {
            Intent intent;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:" + ctx.getPackageName()));
            } else {
                intent = new Intent(Settings.ACTION_SETTINGS);
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("CANNOT_OPEN_SETTINGS: " + e.getMessage());
        }
    }

    /** Daftar aplikasi yang bisa diluncurkan user (punya launcher intent). */
    @PluginMethod
    public void getInstalledApps(PluginCall call) {
        Context ctx = getContext();
        PackageManager pm = ctx.getPackageManager();
        Intent launcher = new Intent(Intent.ACTION_MAIN);
        launcher.addCategory(Intent.CATEGORY_LAUNCHER);
        List<ResolveInfo> resolved = pm.queryIntentActivities(launcher, 0);

        JSArray apps = new JSArray();
        String self = ctx.getPackageName();

        for (ResolveInfo ri : resolved) {
            if (ri == null || ri.activityInfo == null || ri.activityInfo.applicationInfo == null) continue;
            ApplicationInfo ai = ri.activityInfo.applicationInfo;
            String pkg = ai.packageName;
            if (pkg == null || pkg.equals(self)) continue;

            JSObject app = new JSObject();
            app.put("packageName", pkg);
            app.put("label", String.valueOf(ai.loadLabel(pm)));
            app.put("system", (ai.flags & ApplicationInfo.FLAG_SYSTEM) != 0);
            String icon = iconToDataUrl(pm, ai);
            if (icon != null) app.put("icon", icon);
            apps.put(app);
        }

        JSObject ret = new JSObject();
        ret.put("apps", apps);
        call.resolve(ret);
    }

    private JSObject buildConfig() {
        Context ctx = getContext();
        JSObject ret = new JSObject();
        ret.put("enabled", AppBlockerStore.isEnabled(ctx));
        ret.put("auto", AppBlockerStore.isAuto(ctx));
        ret.put("mode", AppBlockerStore.getMode(ctx));
        ret.put("packages", AppBlockerStore.getPackages(ctx));
        ret.put("accessibilityEnabled", isAccessibilityServiceOn(ctx));
        ret.put("overlayGranted", canDrawOverlays(ctx));
        ret.put("strict", AppBlockerStore.isStrict(ctx));
        ret.put("graceSeconds", AppBlockerStore.getGraceSeconds(ctx));
        return ret;
    }

    private boolean canDrawOverlays(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true;
        return Settings.canDrawOverlays(ctx);
    }

    private boolean isAccessibilityServiceOn(Context ctx) {
        String service = ctx.getPackageName() + "/" + AppBlockerAccessibilityService.class.getName();
        try {
            String enabled = Settings.Secure.getString(
                    ctx.getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
            if (TextUtils.isEmpty(enabled)) return false;
            TextUtils.SimpleStringSplitter splitter = new TextUtils.SimpleStringSplitter(':');
            splitter.setString(enabled);
            while (splitter.hasNext()) {
                if (service.equalsIgnoreCase(splitter.next())) return true;
            }
        } catch (Exception ignored) {}
        return false;
    }

    private String iconToDataUrl(PackageManager pm, ApplicationInfo ai) {
        try {
            Drawable d = ai.loadIcon(pm);
            int size = 72;
            Bitmap bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bmp);
            d.setBounds(0, 0, size, size);
            d.draw(canvas);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            bmp.compress(Bitmap.CompressFormat.PNG, 100, out);
            return "data:image/png;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
        } catch (Exception e) {
            return null;
        }
    }
}
