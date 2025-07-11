import { useState, useEffect } from 'react';
import AudioRecord from 'react-native-audio-record';

export function useAudioRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);

  useEffect(() => {
    const options = {
      sampleRate: 16000,
      channels: 1,
      bitsPerSample: 16,
      wavFile: 'audio.wav'
    };
    AudioRecord.init(options);
  }, []);

  const startRecording = () => {
    setIsRecording(true);
    setAudioUri(null);
    AudioRecord.start();
  };

  const stopRecording = async (): Promise<string | null> => {
    if (!isRecording) return null;
    setIsRecording(false);
    const filePath = await AudioRecord.stop();
    setAudioUri(filePath);
    return filePath;
  };

  return {
    startRecording,
    stopRecording,
    isRecording,
    audioUri
  };
}