package com.aruthtale.arplication;

import android.content.Intent;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Capacitor Plugin untuk kontrol Ardoro Timer Foreground Service.
 */
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
