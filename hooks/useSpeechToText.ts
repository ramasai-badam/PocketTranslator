import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import {
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorderState,
} from 'expo-audio';

export function useAudioRecording() {
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const [error, setError] = useState<string | null>(null);

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
      
      if (!recorderState.isRecording) {
        await audioRecorder.prepareToRecordAsync();
        audioRecorder.record();
      }
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      if (recorderState.isRecording) {
        await audioRecorder.stop();
        // The recording will be available on audioRecorder.uri
        return audioRecorder.uri;
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