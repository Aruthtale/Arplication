package com.aruthtale.arplication;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;

/**
 * Opens the Android package installer directly for a downloaded APK.
 * When user taps Update inside Settings, this plugin triggers the native
 * installer dialog so the user just taps "Update/Install" and the app restarts.
 */
@CapacitorPlugin(name = "ApkInstaller")
public class ApkInstallerPlugin extends Plugin {

    @PluginMethod
    public void installApk(PluginCall call) {
        String path = call.getString("path");
        if (path == null || path.isEmpty()) {
            call.reject("PATH_MISSING");
            return;
        }

        try {
            Context ctx = getContext();

            // Android 8+: verify "Install unknown apps" permission first
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (!ctx.getPackageManager().canRequestPackageInstalls()) {
                    Intent settings = new Intent(
                            Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                            Uri.parse("package:" + ctx.getPackageName()));
                    settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getActivity().startActivity(settings);

                    JSObject ret = new JSObject();
                    ret.put("openedSettings", true);
                    ret.put("message", "Izinkan instalasi dari sumber ini sekali saja, lalu kembali dan ketuk Update lagi.");
                    call.resolve(ret);
                    return;
                }
            }

            File apkFile = resolveFile(path);
            if (apkFile == null || !apkFile.exists()) {
                call.reject("FILE_NOT_FOUND: " + (apkFile != null ? apkFile.getAbsolutePath() : path));
                return;
            }

            Uri apkUri = FileProvider.getUriForFile(
                    ctx, ctx.getPackageName() + ".fileprovider", apkFile);

            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);

            // Grant read URI permission explicitly to system package installer
            // (termasuk varian MIUI/Xiaomi — Redmi Note 8 pakai com.miui.packageinstaller)
            ctx.grantUriPermission("com.google.android.packageinstaller", apkUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
            ctx.grantUriPermission("com.android.packageinstaller", apkUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
            ctx.grantUriPermission("com.miui.packageinstaller", apkUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);

            if (getActivity() != null) {
                getActivity().startActivity(intent);
            } else {
                ctx.startActivity(intent);
            }

            JSObject ret = new JSObject();
            ret.put("opened", true);
            ret.put("path", apkFile.getAbsolutePath());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("INSTALL_FAILED: " + e.getMessage());
        }
    }

    private File resolveFile(String path) {
        if (path == null) return null;
        String clean = path;
        if (clean.startsWith("file://")) {
            clean = Uri.parse(clean).getPath();
        }

        File f = new File(clean);
        if (f.exists()) return f;

        // Try relative to external storage (/storage/emulated/0)
        File ext = Environment.getExternalStorageDirectory();
        File fExt = new File(ext, clean.startsWith("/") ? clean.substring(1) : clean);
        if (fExt.exists()) return fExt;

        // Try inside Download folder
        File dl = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        File fDl = new File(dl, f.getName());
        if (fDl.exists()) return fDl;

        return f;
    }

    @Override
    public void load() {}
}
