import { useState, useEffect } from 'react';
import { Audio } from 'expo-av';

export function useAudioRecording() {
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [uri, setUri] = useState<string | null>(null);

  // Initialize audio on mount
  useEffect(() => {
    const initAudio = async () => {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (!status.granted) {
          throw new Error('Permission to access microphone was denied');
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
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
      
      if (!isRecording) {
        const { recording: newRecording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(newRecording);
        setIsRecording(true);
      }
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      if (isRecording && recording) {
        await recording.stopAndUnloadAsync();
        const recordingUri = recording.getURI();
        setUri(recordingUri);
        setIsRecording(false);
        setRecording(null);
        
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
      if (isRecording && recording) {
        await recording.stopAndUnloadAsync();
        setRecording(null);
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