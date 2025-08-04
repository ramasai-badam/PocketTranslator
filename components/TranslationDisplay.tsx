import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Volume2 } from 'lucide-react-native';

interface TranslationDisplayProps {
  text: string;
  isRotated?: boolean;
  language?: string;
  onSpeak?: (text: string, language: string) => void;
  isSpeaking?: boolean;
}

export default function TranslationDisplay({
  text,
  isRotated = false,
  language,
  onSpeak,
  isSpeaking = false,
}: TranslationDisplayProps) {
  const hasText = text && text !== 'Tap and hold the microphone to start speaking...';
  
  const handleSpeak = () => {
    if (hasText && onSpeak && language && !isSpeaking) {
      onSpeak(text, language);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.textContainer}>
          <Text style={[styles.text, isRotated && styles.rotatedText]}>
            {text || 'Tap and hold the microphone to start speaking...'}
          </Text>
          {hasText && onSpeak && language && (
            <TouchableOpacity 
              style={styles.speakerButton} 
              onPress={handleSpeak}
              disabled={isSpeaking}
            >
              <Volume2 
                size={16} 
                color={isSpeaking ? "#666" : "#fff"} 
              />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 10,
    marginVertical: 20,
    minHeight: 120,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    color: 'white',
    fontSize: 18,
    lineHeight: 26,
    textAlign: 'center',
    flex: 1,
  },
  rotatedText: {
    // Text is already rotated by parent container
  },
  speakerButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
});