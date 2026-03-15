import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';

interface TransportControlsProps {
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
  onPlayPause: () => void;
  onStop: () => void;
  onSeek: (positionMillis: number) => void;
}

function formatTime(millis: number): string {
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function TransportControls({
  isPlaying,
  positionMillis,
  durationMillis,
  onPlayPause,
  onStop,
  onSeek,
}: TransportControlsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.buttonsRow}>
        <TouchableOpacity
          style={styles.stopBtn}
          onPress={onStop}
          activeOpacity={0.7}
        >
          <View style={styles.stopIcon} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.playBtn}
          onPress={onPlayPause}
          activeOpacity={0.7}
        >
          {isPlaying ? (
            <View style={styles.pauseIcon}>
              <View style={styles.pauseBar} />
              <View style={styles.pauseBar} />
            </View>
          ) : (
            <View style={styles.playIcon} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.seekRow}>
        <Text style={styles.timeText}>{formatTime(positionMillis)}</Text>
        <Slider
          style={styles.seekSlider}
          minimumValue={0}
          maximumValue={durationMillis || 1}
          value={positionMillis}
          onSlidingComplete={(value) => onSeek(value)}
          minimumTrackTintColor="#4ECDC4"
          maximumTrackTintColor="#444"
          thumbTintColor="#4ECDC4"
        />
        <Text style={styles.timeText}>{formatTime(durationMillis)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    marginBottom: 12,
  },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4ECDC4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    width: 0,
    height: 0,
    borderLeftWidth: 18,
    borderTopWidth: 12,
    borderBottomWidth: 12,
    borderLeftColor: '#fff',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 4,
  },
  pauseIcon: {
    flexDirection: 'row',
    gap: 6,
  },
  pauseBar: {
    width: 6,
    height: 20,
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  stopBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopIcon: {
    width: 16,
    height: 16,
    backgroundColor: '#eee',
    borderRadius: 2,
  },
  seekRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seekSlider: {
    flex: 1,
    height: 40,
  },
  timeText: {
    color: '#888',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    width: 40,
    textAlign: 'center',
  },
});
