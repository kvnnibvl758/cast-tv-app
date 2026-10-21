package com.casttvapp.screenmirror

import android.content.ComponentName
import android.content.Intent
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Ouvre l'écran de recopie d'écran natif d'Android.
 *
 * Android n'expose pas d'API publique pour lancer soi-même la recopie
 * vers une TV (Miracast / Google Cast), c'est le système qui s'en charge.
 * Ce module se contente donc d'ouvrir le bon écran système, en essayant
 * plusieurs chemins selon la marque du téléphone.
 *
 * Résolution de la promesse : "cast_settings", "smart_view" ou "settings".
 */
class ScreenMirrorModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ScreenMirror"

    @ReactMethod
    fun openCastSettings(promise: Promise) {
        val context = reactApplicationContext
        val pm = context.packageManager

        // Ordre : écran Cast standard (Android 5+, Pixel et la plupart des
        // marques), puis Smart View (Samsung), puis réglages généraux.
        val candidates = listOf(
            "cast_settings" to Intent(Settings.ACTION_CAST_SETTINGS),
            "smart_view" to Intent().setComponent(
                ComponentName(
                    "com.samsung.android.smartmirroring",
                    "com.samsung.android.smartmirroring.SmartMirroringActivity"
                )
            ),
            "settings" to Intent(Settings.ACTION_SETTINGS),
        )

        for ((label, intent) in candidates) {
            if (intent.resolveActivity(pm) == null) continue
            try {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                val activity = currentActivity
                if (activity != null) {
                    activity.startActivity(intent)
                } else {
                    context.startActivity(intent)
                }
                promise.resolve(label)
                return
            } catch (e: Exception) {
                // On essaie le chemin suivant.
            }
        }

        promise.reject(
            "E_NO_SCREEN_MIRROR",
            "Aucun écran de recopie d'écran trouvé sur cet appareil"
        )
    }
}
