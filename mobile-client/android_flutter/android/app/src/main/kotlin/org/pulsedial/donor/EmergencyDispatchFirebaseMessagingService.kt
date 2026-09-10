package org.pulsedial.donor

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/**
 * Pulse Dial: High-Priority Emergency Background Message Receiver
 * Bypasses Android Doze mode via data-message payload, acquires WakeLock,
 * and launches Full-Screen Emergency Interruption Intent with custom siren.
 */
class EmergencyDispatchFirebaseMessagingService : FirebaseMessagingService() {

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)

        val data = remoteMessage.data
        val isEmergency = data["urgency"] in listOf("CRITICAL", "URGENT")

        if (isEmergency) {
            wakeDeviceAndTriggerSos(data)
        }
    }

    private fun wakeDeviceAndTriggerSos(data: Map<String, String>) {
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        val wakeLock = powerManager.newWakeLock(
            PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
            "PulseDial:EmergencyWakeLock"
        )
        wakeLock.acquire(30000) // 30 seconds hold

        val channelId = "pulse_dial_critical_sos_channel"
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            val audioAttributes = AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_ALARM)
                .build()

            val channel = NotificationChannel(
                channelId,
                "Pulse Dial Critical SOS Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Critical geofenced emergency blood dispatch notifications"
                setSound(soundUri, audioAttributes)
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 500, 200, 500, 200, 800)
                setBypassDnd(true)
            }
            notificationManager.createNotificationChannel(channel)
        }

        // Full Screen Intent
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("requestId", data["requestId"])
            putExtra("hospitalName", data["hospitalName"])
            putExtra("bloodType", data["bloodType"])
            putExtra("distanceKm", data["distanceKm"])
            putExtra("urgency", data["urgency"])
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            1001,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("🚨 CRITICAL BLOOD DISPATCH: ${data["bloodType"]}")
            .setContentText("Emergency at ${data["hospitalName"]} (${data["distanceKm"]} km away)")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setFullScreenIntent(pendingIntent, true)
            .setAutoCancel(true)
            .build()

        notificationManager.notify(1001, notification)
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        // Upload updated FCM token to Pulse Dial backend
    }
}
