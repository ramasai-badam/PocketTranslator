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

        // Initialize Whisper for speech-to-text
        // TODO: Place your GGUF model file (e.g., ggml-tiny.en.bin, ggml-base.en.bin) 
        // in assets/models/ directory and update the path below
        const context = await initWhisper({
          filePath: 'file://assets/models/ggml-tiny.en.bin', // Update this path to your model file
        });
        setWhisperContext(context);
      } catch (err) {
        console.error('Failed to initialize audio or Whisper:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize audio or Whisper');
      }
    };

    initAudio();

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
        
        if (uri && whisperContext) {
          setIsTranscribing(true);
          try {
            // Use whisper.rn transcribe method following the provided example
            const options = { language };
            const { stop, promise } = whisperContext.transcribe(uri, options);
            
            // Get the transcription result
            const { result } = await promise;
            
            setIsTranscribing(false);
            return { uri, transcription: result };
          } catch (transcriptionError) {
            console.error('Transcription failed:', transcriptionError);
            setIsTranscribing(false);
            return { uri, transcription: null };
          }
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
    whisperReady: !!whisperContext,
  };
}