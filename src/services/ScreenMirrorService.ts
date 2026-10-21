import { NativeModules, Platform } from 'react-native';

/**
 * Recopie d'écran du téléphone vers la TV.
 *
 * - Android : le module natif ScreenMirror ouvre l'écran système
 *   (Cast / Smart View / Miracast).
 * - iOS : aucune API ne permet de lancer la recopie depuis une app,
 *   l'utilisateur passe par le Centre de contrôle. On renvoie donc
 *   'manual' et l'écran affiche les étapes.
 */

export type MirrorResult =
  | 'cast_settings'
  | 'smart_view'
  | 'settings'
  | 'manual';

type ScreenMirrorNative = {
  openCastSettings(): Promise<MirrorResult>;
};

const native: ScreenMirrorNative | undefined = NativeModules.ScreenMirror;

export async function openScreenMirroring(): Promise<MirrorResult> {
  if (Platform.OS === 'android') {
    if (!native) {
      throw new Error(
        'Module ScreenMirror introuvable : vérifie que le package est enregistré dans MainApplication.',
      );
    }
    return native.openCastSettings();
  }

  return 'manual';
}
