package com.aruthtale.arplication;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import androidx.core.app.NotificationCompat;

/**
 * Foreground Service untuk Ardoro Timer.
 * Keeps timer alive saat app di-minimize atau background.
 */
public class ArdoroTimerService extends Service {
    private static final String CHANNEL_ID = "ardoro_timer_foreground";
    private static final String COMPLETE_CHANNEL_ID = "ardoro_timer";
    private static final int NOTIFICATION_ID = 1001;
    private static final int COMPLETE_NOTIFICATION_ID = 1002;
    
    private Handler handler;
    private Runnable tickRunnable;
    private long endTimeMillis;
    private String phase;
    
    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        createCompleteNotificationChannel();
        handler = new Handler(Looper.getMainLooper());
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }
        
        String action = intent.getAction();
        if ("STOP_TIMER".equals(action)) {
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }
        
        endTimeMillis = intent.getLongExtra("endTime", 0);
        phase = intent.getStringExtra("phase");
        
        if (endTimeMillis == 0) {
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }
        
        startForeground(NOTIFICATION_ID, buildNotification("Timer berjalan..."));
        startTicking();
        
        return START_STICKY;
    }
    
    private void startTicking() {
        if (handler != null && tickRunnable != null) {
            handler.removeCallbacks(tickRunnable);
        }
        tickRunnable = new Runnable() {
            @Override
            public void run() {
                long remaining = endTimeMillis - System.currentTimeMillis();
                
                if (remaining <= 0) {
                    // Timer selesai - tampilkan notifikasi kepala/suara & kirim broadcast
                    showCompletionNotification();
                    sendTimerCompleteIntent();
                    stopForeground(true);
                    stopSelf();
                    return;
                }
                
                // Update notification dengan waktu tersisa
                int seconds = (int) (remaining / 1000);
                int minutes = seconds / 60;
                int secs = seconds % 60;
                String time = String.format("%d:%02d", minutes, secs);
                
                updateNotification("Ardoro " + getPhaseLabel() + " — " + time);
                
                handler.postDelayed(this, 1000);
            }
        };
        
        handler.post(tickRunnable);
    }
    
    private String getPhaseLabel() {
        if ("focus".equals(phase)) return "Fokus";
        if ("short".equals(phase)) return "Istirahat";
        if ("long".equals(phase)) return "Istirahat Panjang";
        return "Timer";
    }
    
    private void sendTimerCompleteIntent() {
        Intent broadcast = new Intent("com.aruthtale.arplication.TIMER_COMPLETE");
        broadcast.setPackage(getPackageName());
        broadcast.putExtra("phase", phase);
        sendBroadcast(broadcast);
    }
    
    private void showCompletionNotification() {
        createCompleteNotificationChannel();

        String finishedLabel = "focus".equals(phase) ? "Sesi fokus selesai!" : "Waktu istirahat selesai!";
        String nextLabel = "focus".equals(phase) ? "Saatnya istirahat sebentar dulu." : "Saatnya kembali fokus.";

        Intent notificationIntent = new Intent(this, MainActivity.class);
        notificationIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, COMPLETE_CHANNEL_ID)
            .setContentTitle("🍅 Ardoro — " + finishedLabel)
            .setContentText(nextLabel)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setOngoing(false)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setSound(soundUri)
            .setVibrate(new long[]{0, 500, 250, 500})
            .setDefaults(NotificationCompat.DEFAULT_ALL);

        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify(COMPLETE_NOTIFICATION_ID, builder.build());
        }
    }
    
    @Override
    public void onDestroy() {
        if (handler != null && tickRunnable != null) {
            handler.removeCallbacks(tickRunnable);
        }
        super.onDestroy();
    }
    
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Ardoro Timer Aktif",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Notifikasi timer Ardoro sedang berjalan");
            channel.setShowBadge(false);
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void createCompleteNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                COMPLETE_CHANNEL_ID,
                "Ardoro Timer",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notifikasi fase Pomodoro selesai");
            channel.enableVibration(true);
            channel.setShowBadge(true);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
    
    private Notification buildNotification(String text) {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            PendingIntent.FLAG_IMMUTABLE
        );
        
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("🍅 Ardoro Timer")
            .setContentText(text)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }
    
    private void updateNotification(String text) {
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, buildNotification(text));
        }
    }
}
