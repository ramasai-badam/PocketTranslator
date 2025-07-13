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
import { Mic, Volume2, RotateCcw, Settings } from 'lucide-react-native';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { router } from 'expo-router';
import LanguageSelector from '@/components/LanguageSelector';
import RecordingIndicator from '@/components/RecordingIndicator';
import TranslationDisplay from '@/components/TranslationDisplay';
import { useTranslation } from '@/hooks/useTranslation';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { LanguagePackManager } from '@/utils/LanguagePackManager';
import { getLanguageDisplayName } from '@/utils/LanguageConfig';

const { height, width } = Dimensions.get('window');

export default function TranslatorScreen() {
  const [topLanguage, setTopLanguage] = useState('en');
  const [bottomLanguage, setBottomLanguage] = useState('es');
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [isTopRecording, setIsTopRecording] = useState(false);
  const [isBottomRecording, setIsBottomRecording] = useState(false);

  const { translateText, isTranslating } = useTranslation();
  const { startRecording, stopRecording, isRecording, isInitialized, error: audioError, cleanup } = useAudioRecording();
  const { transcribeWav, isTranscribing, error: whisperError } = useSpeechToText();
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);

  // Models are ready when hooks are loaded (lazy loading)
  const modelsReady = true;

  const handleStartRecording = async (isTop: boolean) => {
    try {
      // Check if audio recording is initialized
      if (!isInitialized) {
        Alert.alert('Audio Error', 'Audio recording is not ready. Please try again.');
        return;
      }

      // Check if already recording
      if (isRecording) {
        Alert.alert('Recording Error', 'Already recording. Please stop the current recording first.');
        return;
      }

      // Check if models are ready
      if (!modelsReady) {
        Alert.alert('Models Loading', 'AI models are still loading. Please wait a moment.');
        return;
      }

      // Check if language pack is available for speech recognition
      const languageCode = isTop ? topLanguage : bottomLanguage;
      const isLanguageAvailable = await LanguagePackManager.canRecognizeSpeech(languageCode);
      
      if (!isLanguageAvailable) {
        const languageName = getLanguageDisplayName(languageCode);
        Alert.alert(
          'Language Pack Required',
          `Speech recognition for ${languageName} requires an offline language pack. Would you like to download it?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Download',
              onPress: () => router.push('/settings')
            }
          ]
        );
        return;
      }

      if (audioError) {
        Alert.alert('Audio Error', audioError);
        return;
      }

      if (isTop) {
        setIsTopRecording(true);
      } else {
        setIsBottomRecording(true);
      }
      
      await startRecording();
    } catch (error) {
      Alert.alert('Recording Error', 'Failed to start recording');
      setIsTopRecording(false);
      setIsBottomRecording(false);
    }
  };

  const handleStopRecording = async (isTop: boolean) => {
    setTranscriptionError(null);
    try {
      const audioUri = await stopRecording();
      if (audioUri) {
        const fromLang = isTop ? topLanguage : bottomLanguage;
        const toLang = isTop ? bottomLanguage : topLanguage;
        
        console.log('🎯 RECORDING COMPLETE:');
        console.log('  - Side pressed:', isTop ? 'TOP' : 'BOTTOM');
        console.log('  - From language (speech input):', fromLang);
        console.log('  - To language (translation target):', toLang);
        
        let speechText = '';
        let errorMsg = null;
        
        // Always try to transcribe - the transcribeWav function handles initialization
        try {
          console.log('🎯 CALLING TRANSCRIPTION with language:', fromLang);
          speechText = await transcribeWav(audioUri, fromLang) || '';
          if (!speechText) {
            errorMsg = 'Transcription failed or returned empty.';
            setTranscriptionError(errorMsg);
          }
        } catch (error) {
          errorMsg = 'Transcription error occurred.';
          setTranscriptionError(errorMsg);
          console.error('Transcription error:', error);
        }
        
        console.log('🎯 CALLING TRANSLATION:');
        console.log('  - Speech text:', speechText);
        console.log('  - From language:', fromLang);
        console.log('  - To language:', toLang);
        
        const translatedText = await translateText(speechText, fromLang, toLang);
        console.log('🎯 TRANSLATION RESULT:', translatedText);
        
        if (isTop) {
          setTopText(errorMsg ? errorMsg : speechText);
          setBottomText(errorMsg ? '' : translatedText);
        } else {
          setBottomText(errorMsg ? errorMsg : speechText);
          setTopText(errorMsg ? '' : translatedText);
        }
        // Ensure only the transcribed text or error is shown on the side that pressed record,
        // and only the translation (never the transcription) is shown on the other side.
        if (!errorMsg) {
          if (isTop) {
            setTopText(speechText);
            setBottomText(translatedText);
          } else {
            setBottomText(speechText);
            setTopText(translatedText);
          }
        }
      }
    } catch (error) {
      setTranscriptionError('Failed to translate speech.');
      if (isTop) {
        setTopText('Failed to translate speech.');
        setBottomText('');
      } else {
        setBottomText('Failed to translate speech.');
        setTopText('');
      }
      Alert.alert('Translation Error', 'Failed to translate speech');
    } finally {
      setIsTopRecording(false);
      setIsBottomRecording(false);
    }
  };

  const handleSpeak = (text: string, language: string) => {
    if (text) {
      Speech.speak(text, {
        language: language,
        pitch: 1.0,
        rate: 0.8,
      });
    }
  };

  const swapLanguages = () => {
    setTopLanguage(bottomLanguage);
    setBottomLanguage(topLanguage);
    setTopText(bottomText);
    setBottomText(topText);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header with Settings Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push('/settings')}
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
      
      {/* Top Section (Rotated 180 degrees) */}
      <View style={[styles.section, styles.topSection]}>
        <View style={styles.rotatedContent}>
          <LanguageSelector
            selectedLanguage={topLanguage}
            onLanguageChange={setTopLanguage}
            isRotated={true}
          />
          <TranslationDisplay
            text={topText}
            isRotated={true}
          />
          <View style={styles.controls}>
            <TouchableOpacity
              style={[
                styles.micButton, 
                isTopRecording && styles.recordingButton,
                !modelsReady && styles.disabledButton
              ]}
              onPressIn={() => handleStartRecording(true)}
              onPressOut={() => handleStopRecording(true)}
              disabled={isBottomRecording || !modelsReady}
            >
              <Mic size={32} color={modelsReady ? "white" : "#666"} />
              {isTopRecording && <RecordingIndicator />}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.speakerButton}
              onPress={() => handleSpeak(topText, topLanguage)}
              disabled={!topText}
            >
              <Volume2 size={28} color={topText ? "white" : "#666"} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {/* Center Divider with Swap Button */}
      <View style={styles.divider}>
        <TouchableOpacity style={styles.swapButton} onPress={swapLanguages}>
          <RotateCcw size={24} color="white" />
        </TouchableOpacity>
      </View>
      {/* Bottom Section */}
      <View style={[styles.section, styles.bottomSection]}>
        <LanguageSelector
          selectedLanguage={bottomLanguage}
          onLanguageChange={setBottomLanguage}
          isRotated={false}
        />
        <TranslationDisplay
          text={bottomText}
          isRotated={false}
        />
        <View style={styles.controls}>
          <TouchableOpacity
            style={[
              styles.micButton, 
              isBottomRecording && styles.recordingButton,
              !modelsReady && styles.disabledButton
            ]}
            onPressIn={() => handleStartRecording(false)}
            onPressOut={() => handleStopRecording(false)}
            disabled={isTopRecording || !modelsReady}
          >
            <Mic size={32} color={modelsReady ? "white" : "#666"} />
            {isBottomRecording && <RecordingIndicator />}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.speakerButton}
            onPress={() => handleSpeak(bottomText, bottomLanguage)}
            disabled={!bottomText}
          >
            <Volume2 size={28} color={bottomText ? "white" : "#666"} />
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
    top: 50,
    right: 20,
    zIndex: 1000,
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
  },
  modelStatusContainer: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  modelStatusText: {
    color: '#fbbf24',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  section: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  topSection: {
    backgroundColor: '#2563eb',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  bottomSection: {
    backgroundColor: '#dc2626',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  rotatedContent: {
    flex: 1,
    transform: [{ rotate: '180deg' }],
    justifyContent: 'space-between',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 40,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    position: 'relative',
  },
  recordingButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderColor: 'white',
  },
  disabledButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  speakerButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  divider: {
    height: 60,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swapButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
});