import { useState } from 'react';
import { AudioRecorder, AudioPlayer } from 'expo-audio';

export function useAudioRecording() {
  const [recorder, setRecorder] = useState<AudioRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = async () => {
    try {
      // Request permissions
      const { granted } = await AudioRecorder.requestPermissionsAsync();
      if (!granted) {
        throw new Error('Permission to access microphone is required!');
      }

      // Create and start recording
      const newRecorder = AudioRecorder.createRecorder('recording.m4a', {
        android: {
          extension: '.m4a',
          outputFormat: 'mpeg4',
          audioEncoder: 'aac',
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: 'mpeg4aac',
          audioQuality: 'high',
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });

      await newRecorder.record();
      setRecorder(newRecorder);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  };

  const stopRecording = async (): Promise<string | null> => {
    if (!recorder) return null;

    try {
      setIsRecording(false);
      const uri = await recorder.stop();
      setRecorder(null);
      
      return uri;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      return null;
    }
  };

  const playAudio = async (uri: string) => {
    try {
      const player = AudioPlayer.createPlayer(uri);
      await player.play();
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  };

  return {
    startRecording,
    stopRecording,
    playAudio,
    isRecording,
  };
}