package com.aruthtale.arplication;

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
 * Opens the Android package installer for a downloaded APK.
 * Handles file:// paths, absolute/relative paths, and content:// URIs.
 * On Android 8+, redirects to "Install unknown apps" settings when permission
 * has not been granted yet.
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
            android.content.Context ctx = getContext();
            Uri apkUri;

            if (path.startsWith("content://")) {
                apkUri = Uri.parse(path);
            } else {
                String clean = path.startsWith("file://")
                        ? Uri.parse(path).getPath()
                        : path;
                File f;
                if (clean.startsWith("/")) {
                    f = new File(clean);
                } else {
                    // Capacitor Filesystem may return a relative path like
                    // "Download/Arloader/Arplication/xxx.apk"
                    f = new File(Environment.getExternalStorageDirectory(), clean);
                }
                if (!f.exists()) {
                    call.reject("FILE_NOT_FOUND: " + f.getAbsolutePath());
                    return;
                }
                apkUri = FileProvider.getUriForFile(
                        ctx, ctx.getPackageName() + ".fileprovider", f);
            }

            // Android 8+: need "Install unknown apps" permission first.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (!ctx.getPackageManager().canRequestPackageInstalls()) {
                    Intent settings = new Intent(
                            Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                            Uri.parse("package:" + ctx.getPackageName()));
                    settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getActivity().startActivity(settings);
                    JSObject ret = new JSObject();
                    ret.put("openedSettings", true);
                    call.resolve(ret);
                    return;
                }
            }

            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("opened", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("INSTALL_FAILED: " + e.getMessage());
        }
    }

    @Override
    public void load() {
        // No-op: plugin is ready as soon as the bridge loads it.
    }
}
