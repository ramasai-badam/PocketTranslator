import { useState, useEffect } from 'react';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import AudioRecord from 'react-native-audio-record';

export function useAudioRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeAudioRecord();
  }, []);

  const requestAudioPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'This app needs access to your microphone to record audio for translation.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        
        console.log('Audio permission result:', granted);
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Audio permission granted');
          return true;
        } else {
          console.log('Audio permission denied');
          return false;
        }
      }
      return true; // iOS or other platforms
    } catch (err) {
      console.error('Failed to request audio permission:', err);
      return false;
    }
  };

  const initializeAudioRecord = async () => {
    try {
      console.log('Initializing AudioRecord...');
      
      // Request permission first
      const hasPermission = await requestAudioPermission();
      if (!hasPermission) {
        throw new Error('Microphone permission not granted');
      }

      const options = {
        sampleRate: 16000,
        channels: 1,
        bitsPerSample: 16,
        audioSource: 6, // VOICE_RECOGNITION
        wavFile: 'audio.wav'
      };
      
      console.log('Initializing AudioRecord with options:', options);
      AudioRecord.init(options);
      
      // Add longer delay for production builds
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setIsInitialized(true);
      setError(null);
      console.log('AudioRecord initialized successfully');
    } catch (err) {
      console.error('Failed to initialize AudioRecord:', err);
      setError(`Failed to initialize audio recording: ${err}`);
      setIsInitialized(false);
    }
  };

  const startRecording = async () => {
    if (!isInitialized) {
      console.log('AudioRecord not initialized, attempting to initialize...');
      await initializeAudioRecord();
    }

    if (!isInitialized) {
      console.error('Audio recording not available after initialization attempt');
      setError('Audio recording not available');
      
      Alert.alert(
        'Recording Error',
        'Audio recording is not available. Please restart the app and try again.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (isRecording) {
      console.log('Already recording, ignoring start request');
      return;
    }

    try {
      // Check permission again before recording
      const hasPermission = await requestAudioPermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Microphone permission is required to record audio. Please enable it in settings.',
          [{ text: 'OK' }]
        );
        return;
      }

      setIsRecording(true);
      setAudioUri(null);
      setError(null);
      console.log('Starting audio recording...');
      
      AudioRecord.start();
      console.log('Recording started successfully');
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError(`Failed to start recording: ${err}`);
      setIsRecording(false);
      
      // Show user-friendly error message
      Alert.alert(
        'Recording Error',
        'Failed to start recording. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const stopRecording = async (): Promise<string | null> => {
    if (!isRecording) {
      console.log('Not recording, ignoring stop request');
      return null;
    }
    
    try {
      setIsRecording(false);
      console.log('Stopping audio recording...');
      
      const filePath = await AudioRecord.stop();
      
      if (filePath) {
        setAudioUri(filePath);
        console.log('Recording stopped, file saved at:', filePath);
        return filePath;
      }
      
      console.log('No file path returned from recording');
      return null;
    } catch (err) {
      console.error('Failed to stop recording:', err);
      setError(`Failed to stop recording: ${err}`);
      setIsRecording(false);
      return null;
    }
  };

  const cleanup = () => {
    if (isRecording) {
      AudioRecord.stop().catch(console.error);
    }
    setIsRecording(false);
    setAudioUri(null);
    setError(null);
  };

  return {
    startRecording,
    stopRecording,
    isRecording,
    audioUri,
    isInitialized,
    error,
    initializeAudioRecord,
    cleanup
  };
}