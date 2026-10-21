import {
  CastButton,
  CastContext,
  useRemoteMediaClient,
  useCastSession,
  useDevices,
} from 'react-native-google-cast';
import type { MediaItem } from '../types';

/**
 * Encapsule les appels à react-native-google-cast pour garder
 * le reste de l'app agnostique de la lib sous-jacente.
 */

// Lance la diffusion d'un média sur le device Chromecast connecté.
export async function castMedia(
  client: ReturnType<typeof useRemoteMediaClient>,
  media: MediaItem,
) {
  if (!client) {
    throw new Error('Aucun client Chromecast connecté');
  }

  await client.loadMedia({
    mediaInfo: {
      contentUrl: media.streamUrl,
      contentType: media.mimeType,
      metadata: {
        type: 'movie',
        title: media.title,
        subtitle: media.subtitle,
        images: media.thumbnailUrl ? [{ url: media.thumbnailUrl }] : [],
      },
      streamDuration: media.durationSeconds,
    },
    startTime: 0,
    autoplay: true,
  });
}

export async function pause(client: ReturnType<typeof useRemoteMediaClient>) {
  await client?.pause();
}

export async function play(client: ReturnType<typeof useRemoteMediaClient>) {
  await client?.play();
}

export async function seek(
  client: ReturnType<typeof useRemoteMediaClient>,
  positionSeconds: number,
) {
  await client?.seek({ position: positionSeconds });
}

export async function stopCasting() {
  // endCurrentSession est une méthode du SessionManager (pas de CastContext).
  await CastContext.getSessionManager().endCurrentSession(true);
}

export { CastButton, useRemoteMediaClient, useCastSession, useDevices };
