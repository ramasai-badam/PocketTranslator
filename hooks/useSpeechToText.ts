import { useState, useRef } from 'react';
import { initWhisper, WhisperContext } from 'whisper.rn';
import { MODEL_CONFIG } from '../utils/ModelConfig';

// Safety flag to disable loading if needed
const ENABLE_WHISPER_LOADING = true;

export function useSpeechToText() {
  const whisperContextRef = useRef<WhisperContext | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeModel = async () => {
    if (whisperContextRef.current) {
      console.log('Whisper already initialized');
      return;
    }

    try {
      console.log('Initializing Whisper with path:', MODEL_CONFIG.whisper.path);
      const context = await initWhisper({
        filePath: MODEL_CONFIG.whisper.path,
        isBundleAsset: false,
      });
      
      whisperContextRef.current = context;
      setIsInitialized(true);
      setError(null);
      console.log('Whisper initialized successfully');
    } catch (err) {
      console.error('Failed to initialize Whisper:', err);
      setError('Failed to initialize speech recognition');
      throw err;
    }
  };

  // Accepts a WAV file path and transcribes it
  const transcribeWav = async (wavFilePath: string, language: string = 'en'): Promise<string | null> => {
    console.log('transcribeWav called:', { wavFilePath, language });
    console.log('🎯 SPEECH-TO-TEXT: Using language code:', language);

    if (!wavFilePath) {
      console.error('No audio path provided');
      return null;
    }

    if (!ENABLE_WHISPER_LOADING) {
      console.log('Whisper loading disabled for safety');
      return '[Transcription disabled]';
    }

    if (!whisperContextRef.current) {
      console.log('Whisper not initialized, initializing now...');
      try {
        await initializeModel();
      } catch (initError) {
        console.error('Initialization failed in transcribeWav:', initError);
        return null;
      }
    }

    if (!whisperContextRef.current) {
      console.error('Whisper initialization failed');
      return null;
    }

    setIsTranscribing(true);
    try {
      console.log('Starting transcription with language:', language);
      const options = { language };
      console.log('Whisper transcription options:', options);
      const { stop, promise } = whisperContextRef.current.transcribe(wavFilePath, options);
      const { result } = await promise;
      
      console.log('Transcription result:', result);
      console.log('🎯 TRANSCRIPTION SUCCESS for language:', language, '→', result);
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
    }
    setIsInitialized(false);
    console.log('Speech-to-text hook cleanup called');
  };

  return {
    isTranscribing,
    isInitialized,
    error,
    transcribeWav,
    cleanup,
  };
}