import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Mic, Volume2, RotateCcw, Settings, Users } from 'lucide-react-native';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import LanguageSelector from '@/components/LanguageSelector';
import RecordingIndicator from '@/components/RecordingIndicator';
import TranslationDisplay from '@/components/TranslationDisplay';
import { useTranslation } from '@/hooks/useTranslation';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { TTSVoiceManager } from '@/utils/LanguagePackManager';
import { getLanguageDisplayName } from '@/utils/LanguageConfig';
import { TranslationHistoryManager } from '@/utils/TranslationHistory';

const { height, width } = Dimensions.get('window');

export default function SingleTranslatorScreen() {
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('ja');
  const [sourceText, setSourceText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);

  const { translateText, isTranslating, streamingText } = useTranslation();
  const { startRecording, stopRecording, isRecording: audioRecording, isInitialized, error: audioError, cleanup } = useAudioRecording();
  const { transcribeWav, isTranscribing, error: whisperError } = useSpeechToText();

  // Models are ready when hooks are loaded
  const modelsReady = true;

  // Helper function to get display text with streaming support
  const getDisplayText = (baseText: string, isStreamingTarget: boolean) => {
    if (isTranslating && isStreamingTarget && streamingText) {
      return streamingText;
    }
    return baseText;
  };

  // Cleanup TTS on component unmount
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  // Save translation to history
  const saveToHistory = async (
    originalText: string,
    translatedText: string,
    fromLang: string,
    toLang: string,
    speaker: 'user1' | 'user2'
  ) => {
    try {
      await TranslationHistoryManager.saveTranslation(
        originalText,
        translatedText,
        fromLang,
        toLang,
        speaker
      );
      console.log('Translation saved to history successfully');
    } catch (error) {
      console.error('Failed to save translation to history:', error);
    }
  };

  const handleStartRecording = async () => {
    try {
      // Haptic feedback for mic press
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
      
      // Check if audio recording is initialized
      if (!isInitialized) {
        Alert.alert('Audio Error', 'Audio recording is not ready. Please try again.');
        return;
      }

      // Check if already recording
      if (audioRecording) {
        Alert.alert('Recording Error', 'Already recording. Please stop the current recording first.');
        return;
      }

      // Check if models are ready
      if (!modelsReady) {
        Alert.alert('Models Loading', 'AI models are still loading. Please wait a moment.');
        return;
      }

      if (audioError) {
        Alert.alert('Audio Error', audioError);
        return;
      }

      console.log('Starting recording for source language');
      setIsRecording(true);
      await startRecording();
    } catch (error) {
      console.error('Recording start error:', error);
      Alert.alert('Recording Error', 'Failed to start recording');
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    console.log('Stopping recording for source language');
    setTranscriptionError(null);
    try {
      const audioUri = await stopRecording();
      if (audioUri) {
        console.log('🎯 RECORDING COMPLETE:');
        console.log('  - From language (speech input):', sourceLanguage);
        console.log('  - To language (translation target):', targetLanguage);
        
        let speechText = '';
        let errorMsg = null;
        
        // Always try to transcribe
        try {
          console.log('🎯 CALLING TRANSCRIPTION with language:', sourceLanguage);
          speechText = await transcribeWav(audioUri, sourceLanguage) || '';
          if (!speechText) {
            errorMsg = 'Transcription failed or returned empty.';
            setTranscriptionError(errorMsg);
          }
        } catch (error) {
          errorMsg = 'Transcription error occurred.';
          setTranscriptionError(errorMsg);
          console.error('Transcription error:', error);
        }

        // Show transcribed text immediately
        setSourceText(errorMsg ? errorMsg : speechText);
        setTargetText(''); // Clear target before translation

        // Only proceed with translation if transcription was successful
        if (!errorMsg && speechText) {
          const translatedText = await translateText(speechText, sourceLanguage, targetLanguage);
          
          // Update the translation
          setTargetText(translatedText);
          
          // Save to history
          await saveToHistory(speechText, translatedText, sourceLanguage, targetLanguage, 'user1');
        }
      }
    } catch (error) {
      console.error('Recording stop error:', error);
      setTranscriptionError('Failed to translate speech.');
      setSourceText('Failed to translate speech.');
      setTargetText('');
      Alert.alert('Translation Error', 'Failed to translate speech');
    } finally {
      console.log('Cleaning up recording state');
      setIsRecording(false);
    }
  };

  const handleSpeak = async (text: string, language: string) => {
    if (!text || isSpeaking) return;
    
    // Haptic feedback for speaker press
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
    
    try {
      // Check if TTS voice is available for this language
      const isVoiceAvailable = await TTSVoiceManager.canSpeakLanguage(language);
      
      if (!isVoiceAvailable) {
        const languageName = getLanguageDisplayName(language);
        Alert.alert(
          'TTS Voice Not Available',
          `Text-to-speech voice for ${languageName} is not available. Would you like to enable it?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Enable',
              onPress: () => router.push('/settings')
            }
          ]
        );
        return;
      }

      // Stop any current speech and start new one
      await Speech.stop();
      setIsSpeaking(true);

      Speech.speak(text, {
        language: language,
        pitch: 1.0,
        rate: 0.8,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    } catch (error) {
      console.error('Failed to speak text:', error);
      setIsSpeaking(false);
      
      // Fallback to speaking without language check
      try {
        await Speech.stop();
        setIsSpeaking(true);
        
        Speech.speak(text, {
          language: language,
          pitch: 1.0,
          rate: 0.8,
          onDone: () => setIsSpeaking(false),
          onStopped: () => setIsSpeaking(false),
          onError: () => setIsSpeaking(false),
        });
      } catch (fallbackError) {
        console.error('Fallback TTS also failed:', fallbackError);
        setIsSpeaking(false);
      }
    }
  };

  const swapLanguages = () => {
    setSourceLanguage(targetLanguage);
    setTargetLanguage(sourceLanguage);
    setSourceText(targetText);
    setTargetText(sourceText);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header with Navigation Buttons */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => {
            requestAnimationFrame(() => {
              router.push('/history');
            });
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.historyButtonText}>📚</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.twoSidedButton}
          onPress={() => {
            requestAnimationFrame(() => {
              router.push('/two-sided-translator');
            });
          }}
          activeOpacity={0.7}
        >
          <Users size={24} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => {
            requestAnimationFrame(() => {
              router.push('/settings');
            });
          }}
          activeOpacity={0.7}
        >
          <Settings size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
      
      {/* Model Status Indicator */}
      {!modelsReady && (
        <View style={styles.modelStatusContainer}>
          <Text style={styles.modelStatusText}>
            {isTranslating || isTranscribing ? 'Loading AI models...' : 'AI models not ready'}
          </Text>
        </View>
      )}
      
      {/* Main Content */}
      <View style={styles.content}>
        <Text style={styles.instructionText}>Tap the mic button to start</Text>
        
        {/* Translation Display Area */}
        <View style={styles.translationArea}>
          {sourceText ? (
            <View style={styles.textDisplayContainer}>
              <Text style={styles.sourceText}>{sourceText}</Text>
              {targetText && (
                <Text style={styles.targetText}>
                  {getDisplayText(targetText, true)}
                </Text>
              )}
            </View>
          ) : null}
        </View>
        
        {/* Language Selection */}
        <View style={styles.languageContainer}>
          <TouchableOpacity style={styles.languageButton}>
            <Text style={styles.languageText}>
              {getLanguageDisplayName(sourceLanguage)}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.swapButton} onPress={swapLanguages}>
            <View style={styles.swapIcon}>
              <Text style={styles.swapText}>✦</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.languageButton}>
            <Text style={styles.languageText}>
              {getLanguageDisplayName(targetLanguage)}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Microphone Buttons */}
        <View style={styles.micContainer}>
          <TouchableOpacity
            style={[
              styles.micButton,
              isRecording && styles.recordingButton,
              (!modelsReady || audioRecording) && styles.disabledButton
            ]}
            onPressIn={handleStartRecording}
            onPressOut={handleStopRecording}
            disabled={!modelsReady || audioRecording}
          >
            <Mic size={32} color={modelsReady ? "#333" : "#666"} />
            {isRecording && <RecordingIndicator />}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.micButton,
              (!targetText || isSpeaking) && styles.disabledButton
            ]}
            onPress={() => targetText && handleSpeak(targetText, targetLanguage)}
            disabled={!targetText || isSpeaking}
          >
            <Volume2 size={32} color={targetText && !isSpeaking ? "#333" : "#666"} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  historyButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    pointerEvents: 'auto',
  },
  historyButtonText: {
    fontSize: 20,
  },
  twoSidedButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    pointerEvents: 'auto',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    pointerEvents: 'auto',
  },
  modelStatusContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    pointerEvents: 'none',
  },
  modelStatusText: {
    color: '#fbbf24',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingTop: 120,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  instructionText: {
    fontSize: 32,
    color: '#fff',
    textAlign: 'left',
    fontWeight: '300',
    lineHeight: 40,
    marginBottom: 40,
  },
  translationArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  textDisplayContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 20,
  },
  sourceText: {
    fontSize: 24,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 32,
    fontWeight: '400',
  },
  targetText: {
    fontSize: 24,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 32,
    fontWeight: '300',
  },
  languageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  languageButton: {
    backgroundColor: '#333',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 25,
    minWidth: 120,
    alignItems: 'center',
  },
  languageText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  swapButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swapIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swapText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '300',
  },
  micContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 60,
  },
  micButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f4a261',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  recordingButton: {
    backgroundColor: '#e76f51',
  },
  disabledButton: {
    backgroundColor: '#666',
    opacity: 0.5,
  },
});