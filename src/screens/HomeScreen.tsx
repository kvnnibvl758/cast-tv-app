import React, { useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Video, { VideoRef } from 'react-native-video';
import { useRemoteMediaClient } from 'react-native-google-cast';
import { UnifiedCastControls } from '../components/UnifiedCastControls';
import { castMedia } from '../services/ChromecastService';
import { useCastState } from '../hooks/useCastState';
import type { MediaItem } from '../types';

// Contenu de démo — à remplacer par un appel à ton backend/catalogue.
const SAMPLE_MEDIA: MediaItem[] = [
  {
    id: '1',
    title: 'Big Buck Bunny',
    subtitle: 'Court-métrage open source',
    thumbnailUrl: 'https://peach.blender.org/wp-content/uploads/title_anouncement.jpg',
    streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    mimeType: 'video/mp4',
    durationSeconds: 596,
  },
];

export function HomeScreen() {
  const videoRef = useRef<VideoRef>(null);
  const client = useRemoteMediaClient();
  const castState = useCastState();
  const [selected, setSelected] = useState<MediaItem>(SAMPLE_MEDIA[0]);

  async function handleSelect(item: MediaItem) {
    setSelected(item);
    if (castState.isConnected && client) {
      await castMedia(client, item);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ma vidéothèque</Text>
        <UnifiedCastControls />
      </View>

      {castState.isConnected && (
        <View style={styles.castBanner}>
          <Text style={styles.castBannerText}>
            En cast sur {castState.deviceName ?? 'l’appareil connecté'}
          </Text>
        </View>
      )}

      <Video
        ref={videoRef}
        source={{ uri: selected.streamUrl }}
        style={styles.player}
        controls
        resizeMode="contain"
        // Sur iOS, permet à AirPlay de prendre le relais nativement.
        allowsExternalPlayback
      />

      <FlatList
        data={SAMPLE_MEDIA}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => handleSelect(item)}>
            <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} />
            <View style={styles.rowText}>
              <Text style={styles.title}>{item.title}</Text>
              {item.subtitle && <Text style={styles.subtitle}>{item.subtitle}</Text>}
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  castBanner: { backgroundColor: '#111', paddingVertical: 6, paddingHorizontal: 16 },
  castBannerText: { color: '#fff', fontSize: 13 },
  player: { width: '100%', height: 220, backgroundColor: '#000' },
  list: { padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 80, height: 45, borderRadius: 6, backgroundColor: '#eee' },
  rowText: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 2 },
});
