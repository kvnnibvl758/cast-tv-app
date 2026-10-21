import React, { useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AirPlayButton } from '../components/AirPlayButton';
import { openScreenMirroring } from '../services/ScreenMirrorService';

const STEPS_ANDROID = [
  'Allume ta TV et connecte-la au même Wi-Fi que ton téléphone.',
  'Appuie sur « Caster mon écran » ci-dessous.',
  'Choisis ta TV dans la liste qui s’affiche.',
  'Pour arrêter, rouvre ce menu et déconnecte-toi.',
];

const STEPS_IOS = [
  'Allume ta TV (Apple TV, ou TV compatible AirPlay) sur le même Wi-Fi.',
  'Ouvre le Centre de contrôle (glisse depuis le coin haut droit).',
  'Appuie sur « Recopie de l’écran » puis choisis ta TV.',
  'Pour arrêter, rouvre « Recopie de l’écran » et choisis « Arrêter ».',
];

export function MirrorScreen() {
  const [message, setMessage] = useState<string | null>(null);
  const steps = Platform.OS === 'ios' ? STEPS_IOS : STEPS_ANDROID;

  async function handlePress() {
    setMessage(null);
    try {
      const result = await openScreenMirroring();
      if (result === 'settings') {
        setMessage(
          'Ton téléphone n’a pas d’écran Cast dédié : cherche « Cast », « Smart View » ou « Miroir d’écran » dans les réglages.',
        );
      }
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : 'Impossible d’ouvrir la recopie d’écran.',
      );
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Illustration de présentation : remplace src/assets/cast-hero.png par ta propre image si tu veux. */}
        <Image
          source={require('../assets/cast-hero.png')}
          style={styles.hero}
          resizeMode="cover"
          accessibilityLabel="Un téléphone qui diffuse son écran vers une télévision"
        />
        <Text style={styles.title}>Caster mon écran</Text>
        <Text style={styles.subtitle}>
          Affiche l’écran de ton téléphone sur ta télévision.
        </Text>

        {Platform.OS === 'android' ? (
          <Pressable style={styles.button} onPress={handlePress}>
            <Text style={styles.buttonText}>Caster mon écran</Text>
          </Pressable>
        ) : (
          <View style={styles.iosRow}>
            <AirPlayButton />
            <Text style={styles.iosHint}>
              Ce bouton ouvre la liste AirPlay. Si ta TV n’apparaît pas pour la
              recopie, passe par le Centre de contrôle.
            </Text>
          </View>
        )}

        {message && <Text style={styles.message}>{message}</Text>}

        <Text style={styles.stepsTitle}>Comment faire</Text>
        {steps.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <Text style={styles.stepNumber}>{i + 1}</Text>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, gap: 14 },
  hero: { width: '100%', aspectRatio: 2, borderRadius: 16, backgroundColor: '#1e1b4b' },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 15, color: '#555' },
  button: {
    backgroundColor: '#111',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  iosRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  iosHint: { flex: 1, fontSize: 13, color: '#555' },
  message: { fontSize: 14, color: '#b45309' },
  stepsTitle: { fontSize: 17, fontWeight: '600', marginTop: 16 },
  stepRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#eee',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '600',
  },
  stepText: { flex: 1, fontSize: 15, color: '#222' },
});
