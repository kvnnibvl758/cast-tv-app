import React from 'react';
import { Platform, requireNativeComponent, StyleSheet, ViewProps } from 'react-native';

/**
 * AirPlay n'a pas de lib RN officielle/maintenue équivalente à
 * react-native-google-cast. On expose ici le composant natif
 * "AirPlayButton", implémenté côté iOS dans ios/AirPlayButton/ en
 * wrappant AVRoutePickerView (composant standard d'Apple).
 *
 * Sur Android ce composant ne rend rien (AirPlay est iOS only).
 */

interface NativeAirPlayButtonProps extends ViewProps {
  tintColor2?: string; // équivalent de "tintColor", renommé côté natif pour éviter le conflit avec la prop UIView existante
  activeTintColor?: string;
}

const NativeAirPlayButton =
  Platform.OS === 'ios'
    ? requireNativeComponent<NativeAirPlayButtonProps>('AirPlayButton')
    : null;

export function AirPlayButton(props: NativeAirPlayButtonProps) {
  if (Platform.OS !== 'ios' || !NativeAirPlayButton) {
    return null;
  }

  return <NativeAirPlayButton style={styles.button} {...props} />;
}

const styles = StyleSheet.create({
  button: {
    width: 32,
    height: 32,
  },
});
