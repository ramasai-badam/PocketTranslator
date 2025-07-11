import { useState, useEffect } from 'react';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

export function useAudioRecording() {
  const [error, setError] = useState<string | null>(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

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
    
    // Cleanup on unmount
    return () => {
      if (recorderState.isRecording) {
        audioRecorder.stop().catch(console.error);
      }
    };
  }, [audioRecorder, recorderState.isRecording]);

  const startRecording = async () => {
    try {
      setError(null);
      await audioRecorder.prepareToRecordAsync();
      await audioRecorder.record();
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      await audioRecorder.stop();
      return audioRecorder.uri;
    } catch (err) {
      console.error('Failed to stop recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to stop recording');
      return null;
    }
  };

  const cancelRecording = async () => {
    try {
      if (recorderState.isRecording) {
        await audioRecorder.stop();
      }
    } catch (err) {
      console.error('Failed to cancel recording:', err);
    }
  };

  return {
    isRecording: recorderState.isRecording,
    uri: audioRecorder.uri,
    error,
    startRecording,
    stopRecording,
    cancelRecording
  };
}