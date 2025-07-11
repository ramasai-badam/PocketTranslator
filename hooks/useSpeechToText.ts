import { useState, useEffect } from 'react';
import * as FileSystem from 'expo-file-system';
import { initWhisper } from 'whisper.rn';

export function useSpeechToText() {
  const [error, setError] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [whisperContext, setWhisperContext] = useState<any>(null);
  const [whisperInitialized, setWhisperInitialized] = useState(false);

  useEffect(() => {
    const initWhisperModel = async () => {
      try {
        const modelUrl = 'https://huggingface.co/ggerganov/whisper.cpp/release/main/ggml-base-q5_1.bin';
        const modelPath = FileSystem.documentDirectory + 'ggml-base-q5_1.bin';

        // Download if not already present
        const fileInfo = await FileSystem.getInfoAsync(modelPath);
        if (!fileInfo.exists) {
          await FileSystem.downloadAsync(modelUrl, modelPath);
        }

        const context = await initWhisper({ filePath: modelPath });
        setWhisperContext(context);
        setWhisperInitialized(true);
      } catch (err) {
        setError('Failed to initialize Whisper');
      }
    };

    initWhisperModel();

    return () => {
      if (whisperContext) {
        whisperContext.release();
      }
    };
  }, []);

  // Accepts a WAV file path and transcribes it
  const transcribeWav = async (wavFilePath: string, language: string = 'en'): Promise<string | null> => {
    if (!whisperContext || !whisperInitialized) {
      setError('Whisper not initialized');
      return null;
    }
    setIsTranscribing(true);
    try {
      const options = { language };
      const { stop, promise } = whisperContext.transcribe(wavFilePath, options);
      const { result } = await promise;
      setIsTranscribing(false);
      return result;
    } catch (err) {
      setError('Transcription failed');
      setIsTranscribing(false);
      return null;
    }
  };

  return {
    isTranscribing,
    error,
    whisperReady: whisperInitialized,
    transcribeWav,
  };
}