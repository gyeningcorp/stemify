import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Stem } from '../api/client';
import { RootStackParamList } from '../navigation/AppNavigator';
import StemCard from '../components/StemCard';
import TransportControls from '../components/TransportControls';

type Props = NativeStackScreenProps<RootStackParamList, 'Player'>;

const STEM_COLORS: Record<string, string> = {
  vocals: '#FF6B6B',
  drums: '#4ECDC4',
  bass: '#45B7D1',
  other: '#96CEB4',
};

function getStemColor(name: string): string {
  const lower = name.toLowerCase();
  return STEM_COLORS[lower] || '#96CEB4';
}

interface StemState {
  sound: Audio.Sound | null;
  isMuted: boolean;
  isSoloed: boolean;
  volume: number;
}

export default function PlayerScreen({ route, navigation }: Props) {
  const { stems } = route.params;
  const [stemStates, setStemStates] = useState<StemState[]>(
    stems.map(() => ({ sound: null, isMuted: false, isSoloed: false, volume: 1 }))
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const soundRefs = useRef<(Audio.Sound | null)[]>(stems.map(() => null));
  const isSeeking = useRef(false);

  useEffect(() => {
    const loadSounds = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
        });

        const newSounds = await Promise.all(
          stems.map(async (stem) => {
            const { sound } = await Audio.Sound.createAsync(
              { uri: stem.audio_url },
              { shouldPlay: false, volume: 1 }
            );
            return sound;
          })
        );

        soundRefs.current = newSounds;
        setStemStates((prev) =>
          prev.map((s, i) => ({ ...s, sound: newSounds[i] }))
        );

        // Get duration from first sound
        const status = await newSounds[0]?.getStatusAsync();
        if (status?.isLoaded && status.durationMillis) {
          setDurationMillis(status.durationMillis);
        }

        // Set up playback status update on first sound
        newSounds[0]?.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
          if (status.isLoaded && !isSeeking.current) {
            setPositionMillis(status.positionMillis);
            if (status.durationMillis) {
              setDurationMillis(status.durationMillis);
            }
            if (status.didJustFinish) {
              setIsPlaying(false);
            }
          }
        });
      } catch (error: any) {
        Alert.alert('Error', 'Failed to load audio stems');
      }
    };

    loadSounds();

    return () => {
      soundRefs.current.forEach((sound) => {
        sound?.unloadAsync();
      });
    };
  }, [stems]);

  // Update effective volumes when solo/mute state changes
  useEffect(() => {
    const anySoloed = stemStates.some((s) => s.isSoloed);

    stemStates.forEach((state, index) => {
      const sound = soundRefs.current[index];
      if (!sound) return;

      let effectiveVolume = state.volume;

      if (state.isMuted) {
        effectiveVolume = 0;
      } else if (anySoloed && !state.isSoloed) {
        effectiveVolume = 0;
      }

      sound.setVolumeAsync(effectiveVolume).catch(() => {});
    });
  }, [stemStates]);

  const handlePlayPause = useCallback(async () => {
    const sounds = soundRefs.current.filter(Boolean) as Audio.Sound[];
    if (sounds.length === 0) return;

    if (isPlaying) {
      await Promise.all(sounds.map((s) => s.pauseAsync()));
      setIsPlaying(false);
    } else {
      await Promise.all(sounds.map((s) => s.playAsync()));
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleStop = useCallback(async () => {
    const sounds = soundRefs.current.filter(Boolean) as Audio.Sound[];
    await Promise.all(sounds.map((s) => s.stopAsync()));
    await Promise.all(sounds.map((s) => s.setPositionAsync(0)));
    setIsPlaying(false);
    setPositionMillis(0);
  }, []);

  const handleSeek = useCallback(
    async (position: number) => {
      isSeeking.current = true;
      const sounds = soundRefs.current.filter(Boolean) as Audio.Sound[];
      await Promise.all(sounds.map((s) => s.setPositionAsync(position)));
      setPositionMillis(position);
      isSeeking.current = false;
    },
    []
  );

  const toggleMute = useCallback((index: number) => {
    setStemStates((prev) =>
      prev.map((s, i) => (i === index ? { ...s, isMuted: !s.isMuted } : s))
    );
  }, []);

  const toggleSolo = useCallback((index: number) => {
    setStemStates((prev) =>
      prev.map((s, i) => (i === index ? { ...s, isSoloed: !s.isSoloed } : s))
    );
  }, []);

  const changeVolume = useCallback((index: number, volume: number) => {
    setStemStates((prev) =>
      prev.map((s, i) => (i === index ? { ...s, volume } : s))
    );
  }, []);

  return (
    <View style={styles.container}>
      <TransportControls
        isPlaying={isPlaying}
        positionMillis={positionMillis}
        durationMillis={durationMillis}
        onPlayPause={handlePlayPause}
        onStop={handleStop}
        onSeek={handleSeek}
      />

      <ScrollView
        style={styles.stemList}
        contentContainerStyle={styles.stemListContent}
        showsVerticalScrollIndicator={false}
      >
        {stems.map((stem, index) => (
          <StemCard
            key={stem.name}
            name={stem.name}
            color={getStemColor(stem.name)}
            isMuted={stemStates[index].isMuted}
            isSoloed={stemStates[index].isSoloed}
            volume={stemStates[index].volume}
            onToggleMute={() => toggleMute(index)}
            onToggleSolo={() => toggleSolo(index)}
            onVolumeChange={(v) => changeVolume(index, v)}
            onViewNotation={() =>
              navigation.navigate('Notation', {
                stemName: stem.name,
                midiUrl: stem.midi_url,
              })
            }
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 16,
  },
  stemList: {
    flex: 1,
  },
  stemListContent: {
    paddingBottom: 24,
  },
});
