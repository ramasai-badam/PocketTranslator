import { useState, useEffect } from 'react';
import AudioRecord from 'react-native-audio-record';

export function useAudioRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeAudioRecord();
  }, []);

  const initializeAudioRecord = async () => {
    try {
      const options = {
        sampleRate: 16000,
        channels: 1,
        bitsPerSample: 16,
        audioSource: 6, // VOICE_RECOGNITION
        wavFile: 'audio.wav'
      };
      
      console.log('Initializing AudioRecord with options:', options);
      AudioRecord.init(options);
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
      return;
    }

    if (isRecording) {
      console.log('Already recording, ignoring start request');
      return;
    }

    try {
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