import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { uploadAudio } from '../api/client';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');

  const pickAndUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/flac', 'audio/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setIsProcessing(true);
      setStatusText('Uploading audio...');

      const response = await uploadAudio(file.uri, file.name);

      setStatusText('Processing stems...');

      navigation.navigate('Player', {
        stems: response.stems,
        jobId: response.job_id,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong');
    } finally {
      setIsProcessing(false);
      setStatusText('');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleArea}>
        <Text style={styles.title}>Stemify</Text>
        <Text style={styles.tagline}>Separate. Listen. Learn.</Text>
      </View>

      <TouchableOpacity
        style={styles.uploadArea}
        onPress={pickAndUpload}
        activeOpacity={0.7}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#4ECDC4" />
            <Text style={styles.processingText}>{statusText}</Text>
          </View>
        ) : (
          <>
            <View style={styles.uploadIconContainer}>
              <Text style={styles.uploadIcon}>+</Text>
            </View>
            <Text style={styles.uploadTitle}>Upload Audio</Text>
            <Text style={styles.uploadSubtitle}>
              MP3, WAV, M4A, or FLAC
            </Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.footerText}>
        Upload a song to separate it into individual stems
      </Text>
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
  titleArea: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: '#eee',
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 16,
    color: '#4ECDC4',
    marginTop: 8,
    letterSpacing: 4,
  },
  uploadArea: {
    width: '100%',
    maxWidth: 320,
    aspectRatio: 1,
    backgroundColor: '#16213e',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#2a2a4a',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  uploadIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#4ECDC4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  uploadIcon: {
    fontSize: 36,
    color: '#fff',
    fontWeight: '300',
  },
  uploadTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#eee',
    marginBottom: 8,
  },
  uploadSubtitle: {
    fontSize: 14,
    color: '#888',
  },
  processingContainer: {
    alignItems: 'center',
  },
  processingText: {
    color: '#4ECDC4',
    fontSize: 16,
    marginTop: 16,
  },
  footerText: {
    color: '#555',
    fontSize: 13,
    marginTop: 32,
    textAlign: 'center',
  },
});
