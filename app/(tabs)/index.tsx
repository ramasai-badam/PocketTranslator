import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Mic, Volume2, RotateCcw } from 'lucide-react-native';
import * as Speech from 'expo-speech';
import LanguageSelector from '@/components/LanguageSelector';
import RecordingIndicator from '@/components/RecordingIndicator';
import TranslationDisplay from '@/components/TranslationDisplay';
import { useTranslation } from '@/hooks/useTranslation';
import { useAudioRecording } from '@/hooks/useSpeechToText';

const { height, width } = Dimensions.get('window');

export default function TranslatorScreen() {
  const [topLanguage, setTopLanguage] = useState('en');
  const [bottomLanguage, setBottomLanguage] = useState('es');
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [isTopRecording, setIsTopRecording] = useState(false);
  const [isBottomRecording, setIsBottomRecording] = useState(false);

  const { translateText, isTranslating } = useTranslation();
  const { 
    isRecording, 
    startRecording, 
    stopRecording 
  } = useAudioRecording();

  const handleStartRecording = async (isTop: boolean) => {
    try {
      // Prevent starting if already recording
      if (isRecording) {
        return;
      }
      
      if (isTop) {
        setIsTopRecording(true);
      } else {
        setIsBottomRecording(true);
      }
      
      await startRecording();
    } catch (error) {
      Alert.alert('Speech Recognition Error', 'Failed to start speech recognition');
      setIsTopRecording(false);
      setIsBottomRecording(false);
    }
  };

  const handleStopRecording = async (isTop: boolean) => {
    try {
      // Only proceed if we're actually recording
      if (!isRecording) {
        setIsTopRecording(false);
        setIsBottomRecording(false);
        return;
      }
      
      const { uri: audioUri, transcription } = await stopRecording();
      
      if (transcription) {
        // Use the transcribed text
        if (isTop) {
          setTopText(transcription);
          // Translate to bottom language
          try {
            const translation = await translateText(transcription, topLanguage, bottomLanguage);
            setBottomText(translation);
          } catch (translationError) {
            console.error('Translation failed:', translationError);
          }
        } else {
          setBottomText(transcription);
          // Translate to top language
          try {
            const translation = await translateText(transcription, bottomLanguage, topLanguage);
            setTopText(translation);
          } catch (translationError) {
            console.error('Translation failed:', translationError);
          }
        }
      } else if (audioUri) {
        // Fallback if transcription failed
        const fallbackText = "Audio recorded but transcription failed";
        if (isTop) {
          setTopText(fallbackText);
        } else {
          setBottomText(fallbackText);
        }
      } else {
        Alert.alert('Recording Error', 'Failed to record audio');
      }
      
      setIsTopRecording(false);
      setIsBottomRecording(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to process speech');
      setIsTopRecording(false);
      setIsBottomRecording(false);
    }
  };

  const handleSpeak = (text: string, language: string) => {
    if (text) {
      Speech.speak(text, {
        language: language === 'zh' ? 'zh-CN' : language, // Handle Chinese language code
        pitch: 1.0,
        rate: 0.75,
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
              style={[styles.micButton, (isTopRecording || isRecording) && styles.recordingButton]}
              onPressIn={() => handleStartRecording(true)}
              onPressOut={() => handleStopRecording(true)}
              disabled={isBottomRecording}
            >
              <Mic size={32} color="white" />
              {(isTopRecording || isRecording) && <RecordingIndicator />}
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
            style={[styles.micButton, (isBottomRecording || isRecording) && styles.recordingButton]}
            onPressIn={() => handleStartRecording(false)}
            onPressOut={() => handleStopRecording(false)}
            disabled={isTopRecording}
          >
            <Mic size={32} color="white" />
            {(isBottomRecording || isRecording) && <RecordingIndicator />}
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