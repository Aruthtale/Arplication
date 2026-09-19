package com.aruthtale.arplication;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSObject;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";
    private static final String ACTION_OPEN_NOTE = "com.aruthtale.arplication.OPEN_NOTE";
    private static final String ACTION_CREATE_NOTE = "com.aruthtale.arplication.CREATE_NOTE";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ApkInstallerPlugin.class);
        registerPlugin(ArNoteWidgetPlugin.class);
        registerPlugin(TimerServicePlugin.class);
        registerPlugin(ArMusicPlugin.class);
        super.onCreate(savedInstanceState);
        handleNavigationIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleNavigationIntent(intent);
    }

    /**
     * Route Intent actions (widget click, etc.) to the WebView and plugin storage.
     */
    private void handleNavigationIntent(Intent intent) {
        if (intent == null) {
            return;
        }

        String action = intent.getAction();
        Log.i(TAG, "handleNavigationIntent action: " + action);
        if (ACTION_OPEN_NOTE.equals(action) || ACTION_CREATE_NOTE.equals(action)) {
            String noteId = intent.getStringExtra("note_id");
            // Store in plugin for cold-start / direct fetch
            ArNoteWidgetPlugin.setPendingNavigation(action, noteId);
            // Also notify live webview if already running
            notifyWebViewNavigation(action, noteId);
        }
    }

    /**
     * Fires a JS event and direct variable on window that React listens for.
     */
    private void notifyWebViewNavigation(String action, String noteId) {
        Bridge bridge = getBridge();
        if (bridge == null || bridge.getWebView() == null) {
            return;
        }

        bridge.getWebView().post(() -> {
            try {
                JSObject data = new JSObject();
                data.put("action", action);
                data.put("noteId", noteId != null ? noteId : "");
                bridge.triggerJSEvent("arNavIntent", "window", data.toString());

                // Direct eval fallback in case listeners are mounting
                String js = "window.__lastArNavIntent = " + data.toString() + "; window.dispatchEvent(new CustomEvent('arNavIntent', { detail: " + data.toString() + " }));";
                bridge.getWebView().evaluateJavascript(js, null);
            } catch (Exception e) {
                e.printStackTrace();
            }
        });
    }
}
