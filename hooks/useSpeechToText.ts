import { useState, useRef } from 'react';
import * as FileSystem from 'expo-file-system';
import { initWhisper } from 'whisper.rn';

export function useSpeechToText() {
  const [error, setError] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [whisperInitialized, setWhisperInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const whisperContextRef = useRef<any>(null);

  const initializeWhisper = async () => {
    if (whisperContextRef.current || isInitializing) {
      return; // Already initialized or initializing
    }

    setIsInitializing(true);
    try {
      console.log('Initializing Whisper model...');
      const modelPath = FileSystem.documentDirectory + 'whisper-tiny.bin';

      // Check if model file exists
      const fileInfo = await FileSystem.getInfoAsync(modelPath);
      if (!fileInfo.exists) {
        throw new Error('Whisper model file not found. Please download models first.');
      }

      const context = await initWhisper({ filePath: modelPath });
      whisperContextRef.current = context;
      setWhisperInitialized(true);
      setError(null);
      console.log('Whisper model initialized successfully');
    } catch (err) {
      console.error('Failed to initialize Whisper:', err);
      setError(`Failed to initialize Whisper: ${err}`);
    } finally {
      setIsInitializing(false);
    }
  };

  // Accepts a WAV file path and transcribes it
  const transcribeWav = async (wavFilePath: string, language: string = 'en'): Promise<string | null> => {
    console.log('transcribeWav called:', { wavFilePath, language });

    if (!whisperContextRef.current) {
      console.log('Whisper not initialized, initializing now...');
      await initializeWhisper();
    }

    // Check again after initialization attempt
    if (!whisperContextRef.current) {
      const errorMsg = 'Whisper initialization failed';
      setError(errorMsg);
      console.error(errorMsg);
      return null;
    }

    setIsTranscribing(true);
    try {
      console.log('Starting transcription...');
      const options = { language };
      const { stop, promise } = whisperContextRef.current.transcribe(wavFilePath, options);
      const { result } = await promise;
      
      console.log('Transcription result:', result);
      setIsTranscribing(false);
      return result;
    } catch (err) {
      console.error('Transcription failed:', err);
      setError('Transcription failed');
      setIsTranscribing(false);
      return null;
    }
  };

  const cleanup = () => {
    if (whisperContextRef.current) {
      whisperContextRef.current.release();
      whisperContextRef.current = null;
      setWhisperInitialized(false);
    }
  };

  return {
    isTranscribing,
    error,
    whisperReady: whisperInitialized,
    transcribeWav,
    isInitializing,
    initializeWhisper,
    cleanup,
  };
}