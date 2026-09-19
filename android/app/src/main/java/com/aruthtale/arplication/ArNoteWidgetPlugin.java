// ArNoteWidgetPlugin.java (Capacitor Plugin untuk Sinkronisasi Notes ke Android Widget & Deep Navigation)

package com.aruthtale.arplication;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ArNoteWidgetPlugin")
public class ArNoteWidgetPlugin extends Plugin {
    private static final String TAG = "ArNoteWidgetPlugin";
    private static final String PREFS_NAME = "ArNoteWidgetPrefs";
    private static final String KEY_WIDGET_DATA = "widgetDataJson";

    private static String pendingAction = null;
    private static String pendingNoteId = null;

    public static void setPendingNavigation(String action, String noteId) {
        pendingAction = action;
        pendingNoteId = noteId;
    }

    @PluginMethod
    public void syncWidgetData(PluginCall call) {
        try {
            String jsonString = call.getString("jsonPayload");
            if (jsonString == null || jsonString.isEmpty()) {
                call.reject("Missing jsonPayload");
                return;
            }

            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            editor.putString(KEY_WIDGET_DATA, jsonString);
            editor.apply();

            StickyNoteWidget.refreshAllWidgets(context);
            NoteListWidget.refreshAllWidgets(context);

            Log.i(TAG, "Widget data synced successfully and widgets refreshed");
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Error syncing widget data", e);
            call.reject("Failed to sync widget data: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getLaunchIntent(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("action", pendingAction != null ? pendingAction : "");
        ret.put("noteId", pendingNoteId != null ? pendingNoteId : "");

        // Consume once so it doesn't trigger repeatedly on re-render
        pendingAction = null;
        pendingNoteId = null;

        call.resolve(ret);
    }

    public static String getWidgetDataFromPrefs(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getString(KEY_WIDGET_DATA, null);
    }
}
