import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Slider from '@react-native-community/slider';

interface StemCardProps {
  name: string;
  color: string;
  isMuted: boolean;
  isSoloed: boolean;
  volume: number;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onVolumeChange: (value: number) => void;
  onViewNotation: () => void;
}

export default function StemCard({
  name,
  color,
  isMuted,
  isSoloed,
  volume,
  onToggleMute,
  onToggleSolo,
  onVolumeChange,
  onViewNotation,
}: StemCardProps) {
  return (
    <View style={[styles.card, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <View style={styles.header}>
        <View style={[styles.colorDot, { backgroundColor: color }]} />
        <Text style={styles.name}>{name}</Text>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={[
              styles.controlBtn,
              isSoloed && { backgroundColor: color },
            ]}
            onPress={onToggleSolo}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.controlBtnText,
                isSoloed && styles.controlBtnTextActive,
              ]}
            >
              S
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.controlBtn,
              isMuted && { backgroundColor: '#e74c3c' },
            ]}
            onPress={onToggleMute}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.controlBtnText,
                isMuted && styles.controlBtnTextActive,
              ]}
            >
              M
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sliderRow}>
        <Text style={styles.volumeLabel}>Vol</Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={1}
          value={volume}
          onValueChange={onVolumeChange}
          minimumTrackTintColor={color}
          maximumTrackTintColor="#444"
          thumbTintColor={color}
        />
        <Text style={styles.volumeValue}>{Math.round(volume * 100)}%</Text>
      </View>

      <TouchableOpacity
        style={[styles.notationBtn, { borderColor: color }]}
        onPress={onViewNotation}
        activeOpacity={0.7}
      >
        <Text style={[styles.notationBtnText, { color }]}>Notation</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  name: {
    color: '#eee',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
  },
  controlBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '700',
  },
  controlBtnTextActive: {
    color: '#fff',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  volumeLabel: {
    color: '#888',
    fontSize: 12,
    width: 28,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  volumeValue: {
    color: '#888',
    fontSize: 12,
    width: 40,
    textAlign: 'right',
  },
  notationBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  notationBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
