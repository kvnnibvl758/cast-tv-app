import { useMemo } from 'react';
import { useCastDevice, useCastSession } from 'react-native-google-cast';
import type { CastState } from '../types';

/**
 * Expose un état de cast simplifié pour l'UI.
 * Ne couvre pour l'instant que Chromecast : le statut AirPlay
 * (isExternalPlaybackActive) se lit directement sur le player
 * react-native-video, voir HomeScreen.
 */
export function useCastState(): CastState {
  const session = useCastSession();
  // Le nom de l'appareil vient du hook useCastDevice (CastSession n'a pas de .device).
  const device = useCastDevice();

  return useMemo(
    () => ({
      protocol: session ? 'chromecast' : 'none',
      isConnected: !!session,
      deviceName: device?.friendlyName,
      isPlaying: false, // à brancher sur useMediaStatus() si besoin fin
      positionSeconds: 0,
    }),
    [session, device],
  );
}
