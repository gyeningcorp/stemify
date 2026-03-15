import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Notation'>;

export default function NotationScreen({ route }: Props) {
  const { stemName } = route.params;

  return (
    <View style={styles.container}>
      <View style={styles.placeholder}>
        <Text style={styles.musicIcon}>{'{ }'}</Text>
        <Text style={styles.title}>Sheet Music</Text>
        <Text style={styles.stemLabel}>{stemName}</Text>
        <View style={styles.divider} />
        <Text style={styles.comingSoon}>
          Sheet music notation coming soon
        </Text>
        <Text style={styles.subtitle}>
          This view will render interactive notation using VexFlow or OSMD
          from the generated MIDI data.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  placeholder: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  musicIcon: {
    fontSize: 48,
    color: '#4ECDC4',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#eee',
    marginBottom: 8,
  },
  stemLabel: {
    fontSize: 16,
    color: '#4ECDC4',
    fontWeight: '600',
    marginBottom: 16,
  },
  divider: {
    width: 60,
    height: 2,
    backgroundColor: '#2a2a4a',
    marginBottom: 16,
  },
  comingSoon: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
