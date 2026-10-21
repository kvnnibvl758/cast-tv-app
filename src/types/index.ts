export interface MediaItem {
  id: string;
  title: string;
  subtitle?: string;
  thumbnailUrl: string;
  streamUrl: string;
  mimeType: 'video/mp4' | 'application/x-mpegURL'; // mp4 ou HLS
  durationSeconds?: number;
}

export type CastProtocol = 'chromecast' | 'airplay' | 'none';

export interface CastState {
  protocol: CastProtocol;
  isConnected: boolean;
  deviceName?: string;
  currentMedia?: MediaItem;
  isPlaying: boolean;
  positionSeconds: number;
}
