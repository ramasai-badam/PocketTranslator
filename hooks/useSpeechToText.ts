import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import {
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorderState,
} from 'expo-audio';
import { initWhisper } from 'whisper.rn';

export function useAudioRecording() {
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const [error, setError] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [whisperContext, setWhisperContext] = useState<any>(null);
  const [whisperInitialized, setWhisperInitialized] = useState(false);

  useEffect(() => {
    const initAudio = async () => {
      try {
        // Initialize audio permissions first
        const status = await AudioModule.requestRecordingPermissionsAsync();
        if (!status.granted) {
          throw new Error('Permission to access microphone was denied');
        }

        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: true,
        });

        console.log('Audio initialized successfully');
      } catch (err) {
        console.error('Failed to initialize audio:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize audio');
      }
    };

    const initWhisperModel = async () => {
      try {
        // TODO: Download a Whisper GGUF model file and place it in assets/models/
        // Popular options:
        // - ggml-tiny.en.bin (~39MB, English only, fastest)
        // - ggml-base.en.bin (~142MB, English only, better quality)
        // - ggml-small.en.bin (~244MB, English only, even better quality)
        // - ggml-tiny.bin (~39MB, multilingual)
        // - ggml-base.bin (~142MB, multilingual)
        
        // For now, we'll skip Whisper initialization to prevent the app from crashing
        // Uncomment the lines below once you have placed a model file:
        
        /*
        const context = await initWhisper({
          filePath: 'file://assets/models/ggml-tiny.en.bin', // Update this path to your model file
        });
        setWhisperContext(context);
        setWhisperInitialized(true);
        console.log('Whisper initialized successfully');
        */
        
        console.log('Whisper initialization skipped - model file not configured');
        console.log('To enable speech-to-text:');
        console.log('1. Download a GGUF model (e.g., ggml-tiny.en.bin)');
        console.log('2. Place it in assets/models/ directory');
        console.log('3. Uncomment the initWhisper code in useSpeechToText.ts');
        
      } catch (err) {
        console.error('Failed to initialize Whisper:', err);
        console.log('Whisper model not found or failed to load');
        console.log('The app will work for audio recording, but transcription will be disabled');
      }
    };

    initAudio();
    initWhisperModel();

    // Cleanup on unmount
    return () => {
      if (whisperContext) {
        whisperContext.release();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      
      if (!recorderState.isRecording) {
        await audioRecorder.prepareToRecordAsync();
        audioRecorder.record();
        console.log('Recording started');
      }
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
    }
  };

  const stopRecording = async (language: string = 'en'): Promise<{ uri: string | null; transcription: string | null }> => {
    try {
      if (recorderState.isRecording) {
        await audioRecorder.stop();
        const uri = audioRecorder.uri;
        console.log('Recording stopped, URI:', uri);
        
        if (uri && whisperContext && whisperInitialized) {
          setIsTranscribing(true);
          try {
            console.log('Starting transcription with language:', language);
            const options = { language };
            const { stop, promise } = whisperContext.transcribe(uri, options);
            
            // Get the transcription result
            const { result } = await promise;
            console.log('Transcription result:', result);
            
            setIsTranscribing(false);
            return { uri, transcription: result };
          } catch (transcriptionError) {
            console.error('Transcription failed:', transcriptionError);
            setIsTranscribing(false);
            return { uri, transcription: null };
          }
        } else if (uri && !whisperInitialized) {
          console.log('Audio recorded but Whisper not initialized - transcription skipped');
          return { uri, transcription: 'Whisper model not configured. See console for setup instructions.' };
        }
        
        return { uri, transcription: null };
      }
      return { uri: null, transcription: null };
    } catch (err) {
      console.error('Failed to stop recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to stop recording');
      setIsTranscribing(false);
      return { uri: null, transcription: null };
    }
  };

  const cancelRecording = async () => {
    try {
      if (recorderState.isRecording) {
        await audioRecorder.stop();
        console.log('Recording cancelled');
      }
    } catch (err) {
      console.error('Failed to cancel recording:', err);
    }
  };

  return {
    isRecording: recorderState.isRecording,
    isTranscribing,
    uri: audioRecorder.uri,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    whisperReady: whisperInitialized,
  };
}