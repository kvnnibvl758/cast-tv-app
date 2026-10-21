import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen } from './src/screens/HomeScreen';
import { MirrorScreen } from './src/screens/MirrorScreen';

// Chromecast : react-native-google-cast se configure côté natif (voir
// setup-project.js). Sans identifiant de récepteur personnalisé, Android
// utilise le récepteur média par défaut de Google, suffisant pour un usage
// personnel.

type Tab = 'mirror' | 'videos';

export default function App() {
  const [tab, setTab] = useState<Tab>('mirror');

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <View style={styles.screen}>
          {tab === 'mirror' ? <MirrorScreen /> : <HomeScreen />}
        </View>
        <View style={styles.tabBar}>
          <TabButton
            label="Écran"
            active={tab === 'mirror'}
            onPress={() => setTab('mirror')}
          />
          <TabButton
            label="Vidéos"
            active={tab === 'videos'}
            onPress={() => setTab('videos')}
          />
        </View>
      </View>
    </SafeAreaProvider>
  );
}

function TabButton(props: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.tab} onPress={props.onPress}>
      <Text style={[styles.tabText, props.active && styles.tabTextActive]}>
        {props.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  screen: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ccc',
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabText: { fontSize: 15, color: '#777' },
  tabTextActive: { color: '#111', fontWeight: '700' },
});
