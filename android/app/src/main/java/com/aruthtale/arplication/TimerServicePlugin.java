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

/**
 * Capacitor Plugin untuk kontrol Ardoro Timer Foreground Service.
 */
@CapacitorPlugin(name = "TimerService")
public class TimerServicePlugin extends Plugin {
    private BroadcastReceiver timerReceiver;

    @Override
    public void load() {
        super.load();
        timerReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if ("com.aruthtale.arplication.TIMER_COMPLETE".equals(intent.getAction())) {
                    String phase = intent.getStringExtra("phase");
                    JSObject ret = new JSObject();
                    ret.put("phase", phase);
                    notifyListeners("timerComplete", ret);
                }
            }
        };

        IntentFilter filter = new IntentFilter("com.aruthtale.arplication.TIMER_COMPLETE");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(timerReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(timerReceiver, filter);
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (timerReceiver != null) {
            try {
                getContext().unregisterReceiver(timerReceiver);
            } catch (Exception ignored) {}
            timerReceiver = null;
        }
        super.handleOnDestroy();
    }
    
    @PluginMethod
    public void startForegroundTimer(PluginCall call) {
        // Jangan pakai call.getLong: angka dari JS tiba sebagai Integer/Double
        // (org.json) sehingga getLong() gagal instanceof dan mengembalikan null.
        long endTime = call.getData().optLong("endTime", -1L);
        String phase = call.getString("phase");

        if (endTime < 0 || phase == null) {
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
