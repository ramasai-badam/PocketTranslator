import { useState, useEffect } from 'react';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  AudioRecorder,
} from 'expo-audio';

export function useAudioRecording() {
  const [error, setError] = useState<string | null>(null);
  const [audioRecorder, setAudioRecorder] = useState<AudioRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [uri, setUri] = useState<string | null>(null);

  // Initialize audio on mount
  useEffect(() => {
    const initAudio = async () => {
      try {
        const status = await AudioModule.requestRecordingPermissionsAsync();
        if (!status.granted) {
          throw new Error('Permission to access microphone was denied');
        }

        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: true,
        });
      } catch (err) {
        console.error('Failed to initialize audio:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize audio');
      }
    };

    initAudio();
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      
      // Create a new recorder instance for each recording session
      if (!isRecording) {
        const newRecorder = new AudioRecorder(RecordingPresets.HIGH_QUALITY);
        await newRecorder.prepareToRecordAsync();
        await newRecorder.record();
        setAudioRecorder(newRecorder);
        setIsRecording(true);
      }
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      if (isRecording && audioRecorder) {
        await audioRecorder.stop();
        const recordingUri = audioRecorder.uri;
        setUri(recordingUri);
        setIsRecording(false);
        
        // Release the recorder resources
        await audioRecorder.release();
        setAudioRecorder(null);
        
        return recordingUri;
      }
      return null;
    } catch (err) {
      console.error('Failed to stop recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to stop recording');
      return null;
    }
  };

  const cancelRecording = async () => {
    try {
      if (isRecording && audioRecorder) {
        await audioRecorder.stop();
        await audioRecorder.release();
        setAudioRecorder(null);
        setIsRecording(false);
        setUri(null);
      }
    } catch (err) {
      console.error('Failed to cancel recording:', err);
    }
  };

  return {
    isRecording,
    uri,
    error,
    startRecording,
    stopRecording,
    cancelRecording
  };
}