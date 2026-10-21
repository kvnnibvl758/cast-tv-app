import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { CastButton } from 'react-native-google-cast';
import { AirPlayButton } from './AirPlayButton';

/**
 * Affiche les deux boutons de cast disponibles selon la plateforme.
 * - Android : uniquement Chromecast
 * - iOS : Chromecast + AirPlay côte à côte
 */
export function UnifiedCastControls() {
  return (
    <View style={styles.row}>
      <CastButton style={styles.icon} />
      {Platform.OS === 'ios' && <AirPlayButton />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    width: 28,
    height: 28,
    tintColor: '#111',
  },
});
